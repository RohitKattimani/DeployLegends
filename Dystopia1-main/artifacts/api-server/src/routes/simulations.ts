import { Router } from "express";
import { getAuth } from "@clerk/express";
import { db } from "@workspace/db";
import { simulationsTable, agentsTable, debateMessagesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { CreateSimulationBody, UpdateSimulationBody } from "@workspace/api-zod";
import { generateSimulationMessages } from "./simulation-engine";
import { enrichMessages } from "./messages";
import multer from "multer";
// Import from library path to avoid pdf-parse@1.x test-file-read bug at startup
import pdfParse from "pdf-parse/lib/pdf-parse.js";

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 15 * 1024 * 1024 } });

function isMeaningfulText(text: string): boolean {
  const trimmed = text.trim();
  const words = trimmed.split(/\s+/).filter((w) => w.length >= 2);
  if (words.length < 5) return false;
  const alphaChars = (trimmed.match(/[a-zA-Z]/g) || []).length;
  const alphaRatio = alphaChars / Math.max(1, trimmed.replace(/\s/g, "").length);
  if (alphaRatio < 0.55) return false;
  const uniqueChars = new Set(trimmed.toLowerCase().replace(/\s/g, "")).size;
  if (uniqueChars < 8) return false;
  return true;
}

function requireAuth(req: any, res: any, next: any) {
  const auth = getAuth(req);
  const userId = auth?.userId;
  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  req.userId = userId;
  next();
}

// POST /simulations/parse-pdf  — must come BEFORE /:id routes
router.post("/parse-pdf", upload.single("file"), async (req: any, res) => {
  try {
    const file = req.file;
    if (!file) return res.status(400).json({ error: "No file uploaded" });
    if (file.mimetype !== "application/pdf" && !file.originalname.endsWith(".pdf")) {
      return res.status(400).json({ error: "Only PDF files are accepted" });
    }

    const data = await pdfParse(file.buffer);
    const text = data.text
      .replace(/\n{3,}/g, "\n\n")
      .replace(/[ \t]{2,}/g, " ")
      .trim();

    const words = text.split(/\s+/).filter(Boolean);
    return res.json({
      text,
      pageCount: data.numpages,
      wordCount: words.length,
    });
  } catch (err) {
    req.log?.error({ err }, "Failed to parse PDF");
    return res.status(500).json({ error: "Failed to parse PDF" });
  }
});

router.get("/", requireAuth, async (req: any, res) => {
  try {
    const simulations = await db
      .select()
      .from(simulationsTable)
      .where(eq(simulationsTable.userId, req.userId))
      .orderBy(simulationsTable.createdAt);
    res.json(simulations.map(formatSimulation));
  } catch (err) {
    req.log.error({ err }, "Failed to list simulations");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/", requireAuth, async (req: any, res) => {
  const parse = CreateSimulationBody.safeParse(req.body);
  if (!parse.success) {
    return res.status(400).json({ error: "Invalid request body" });
  }
  if (!isMeaningfulText(parse.data.policyDescription)) {
    return res.status(422).json({ error: "Policy description appears to be gibberish or too vague. Please provide a clear, specific policy." });
  }
  try {
    const [sim] = await db
      .insert(simulationsTable)
      .values({
        title: parse.data.title,
        policyDescription: parse.data.policyDescription,
        city: parse.data.city ?? "Mumbai",
        userId: req.userId,
        status: "draft",
        agentCount: 0,
        messageCount: 0,
        overallSentiment: 0,
        protestRisk: 0,
      })
      .returning();
    res.status(201).json(formatSimulation(sim));
  } catch (err) {
    req.log.error({ err }, "Failed to create simulation");
    res.status(500).json({ error: "Internal server error" });
  }
});

// Nested sub-routes — must come BEFORE /:id to avoid conflict
router.get("/:id/agents", requireAuth, async (req: any, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });
  try {
    const messages = await db
      .select({ agentId: debateMessagesTable.agentId })
      .from(debateMessagesTable)
      .where(eq(debateMessagesTable.simulationId, id));
    const agentIds = [...new Set(messages.map((m) => m.agentId))];
    const allAgents = await db.select().from(agentsTable);
    const result = agentIds.length > 0 ? allAgents.filter((a) => agentIds.includes(a.id)) : allAgents;
    res.json(result.map((a) => ({ ...a, concerns: a.concerns ?? [] })));
  } catch (err) {
    req.log.error({ err }, "Failed to list simulation agents");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/:id/messages", requireAuth, async (req: any, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });
  try {
    const userId = req.userId;
    const messages = await db
      .select()
      .from(debateMessagesTable)
      .where(eq(debateMessagesTable.simulationId, id))
      .orderBy(debateMessagesTable.createdAt);
    const enriched = await enrichMessages(messages, userId);
    res.json(enriched);
  } catch (err) {
    req.log.error({ err }, "Failed to list messages");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/:id/analytics", requireAuth, async (req: any, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });
  try {
    const messages = await db
      .select()
      .from(debateMessagesTable)
      .where(eq(debateMessagesTable.simulationId, id))
      .orderBy(debateMessagesTable.createdAt);

    if (messages.length === 0) {
      return res.json({
        simulationId: id,
        overallSentiment: 0,
        protestRisk: 0,
        sentimentOverTime: [],
        sentimentByDemographic: [],
        topConcerns: [],
        coalitionFormation: [],
        messageVelocity: 0,
      });
    }

    const overallSentiment =
      messages.reduce((sum, m) => sum + m.sentimentScore, 0) / messages.length;
    const negativeRatio = messages.filter((m) => m.sentimentScore < -0.2).length / messages.length;
    const protestRisk = Math.min(1, negativeRatio * 1.5 + (overallSentiment < -0.3 ? 0.2 : 0));

    const sentimentByArchetype: Record<string, { scores: number[]; count: number }> = {};
    for (const msg of messages) {
      const arch = msg.agentArchetype;
      if (!sentimentByArchetype[arch]) sentimentByArchetype[arch] = { scores: [], count: 0 };
      sentimentByArchetype[arch].scores.push(msg.sentimentScore);
      sentimentByArchetype[arch].count++;
    }

    const allAgents = await db.select().from(agentsTable);
    const agentConcerns: Record<string, string[]> = {};
    for (const agent of allAgents) {
      agentConcerns[agent.archetype] = agent.concerns ?? [];
    }

    const sentimentByDemographic = Object.entries(sentimentByArchetype).map(([arch, data]) => {
      const avgScore = data.scores.reduce((a, b) => a + b, 0) / data.scores.length;
      return {
        demographic: arch.replace(/_/g, " "),
        archetype: arch,
        sentimentScore: avgScore,
        count: data.count,
        topConcern: (agentConcerns[arch] ?? [])[0] ?? "general welfare",
      };
    });

    const timeGroups: Record<string, number[]> = {};
    for (const msg of messages) {
      const ts = msg.createdAt ? new Date(msg.createdAt).toISOString().slice(0, 16) : "unknown";
      if (!timeGroups[ts]) timeGroups[ts] = [];
      timeGroups[ts].push(msg.sentimentScore);
    }
    const sentimentOverTime = Object.entries(timeGroups).map(([ts, scores]) => ({
      timestamp: ts,
      score: scores.reduce((a, b) => a + b, 0) / scores.length,
      messageCount: scores.length,
    }));

    const concernCount: Record<string, number> = {};
    for (const agent of allAgents) {
      for (const concern of agent.concerns ?? []) {
        concernCount[concern] = (concernCount[concern] ?? 0) + 1;
      }
    }
    const topConcerns = Object.entries(concernCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([concern, frequency]) => ({
        concern,
        frequency,
        sentimentImpact: -0.3 - Math.random() * 0.4,
      }));

    const proArchetypes = sentimentByDemographic.filter((d) => d.sentimentScore > 0.2).map((d) => d.archetype);
    const antiArchetypes = sentimentByDemographic.filter((d) => d.sentimentScore < -0.2).map((d) => d.archetype);
    const coalitionFormation = [];
    if (proArchetypes.length > 0) {
      coalitionFormation.push({ name: "Reform Coalition", archetypes: proArchetypes, stance: "pro" as const, strength: proArchetypes.length / 10 });
    }
    if (antiArchetypes.length > 0) {
      coalitionFormation.push({ name: "Opposition Block", archetypes: antiArchetypes, stance: "anti" as const, strength: antiArchetypes.length / 10 });
    }

    const messageVelocity = Math.round(messages.length / Math.max(1, sentimentOverTime.length));

    res.json({
      simulationId: id,
      overallSentiment,
      protestRisk,
      sentimentOverTime,
      sentimentByDemographic,
      topConcerns,
      coalitionFormation,
      messageVelocity,
    });
  } catch (err) {
    req.log.error({ err }, "Failed to get analytics");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/:id/run", requireAuth, async (req: any, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });
  try {
    const [sim] = await db.select().from(simulationsTable).where(eq(simulationsTable.id, id));
    if (!sim || sim.userId !== req.userId) return res.status(404).json({ error: "Not found" });

    await db.update(simulationsTable).set({ status: "running", updatedAt: new Date() }).where(eq(simulationsTable.id, id));

    const result = await generateSimulationMessages(id, sim.policyDescription, sim.city, sim.title);

    await db
      .update(simulationsTable)
      .set({
        status: "completed",
        messageCount: result.messagesGenerated,
        agentCount: result.agentsActivated,
        overallSentiment: result.sentimentScore,
        protestRisk: result.protestRisk,
        updatedAt: new Date(),
      })
      .where(eq(simulationsTable.id, id))
      .returning();

    res.json({
      simulationId: id,
      messagesGenerated: result.messagesGenerated,
      agentsActivated: result.agentsActivated,
      sentimentScore: result.sentimentScore,
      protestRisk: result.protestRisk,
      topConcerns: result.topConcerns,
    });
  } catch (err) {
    req.log.error({ err }, "Failed to run simulation");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/:id", requireAuth, async (req: any, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });
  try {
    const [sim] = await db.select().from(simulationsTable).where(eq(simulationsTable.id, id));
    if (!sim || sim.userId !== req.userId) return res.status(404).json({ error: "Not found" });
    res.json(formatSimulation(sim));
  } catch (err) {
    req.log.error({ err }, "Failed to get simulation");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/:id", requireAuth, async (req: any, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });
  const parse = UpdateSimulationBody.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ error: "Invalid request body" });
  try {
    const [existing] = await db.select().from(simulationsTable).where(eq(simulationsTable.id, id));
    if (!existing || existing.userId !== req.userId) return res.status(404).json({ error: "Not found" });
    const updates: any = { updatedAt: new Date() };
    if (parse.data.title) updates.title = parse.data.title;
    if (parse.data.status) updates.status = parse.data.status;
    const [sim] = await db.update(simulationsTable).set(updates).where(eq(simulationsTable.id, id)).returning();
    res.json(formatSimulation(sim));
  } catch (err) {
    req.log.error({ err }, "Failed to update simulation");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/:id", requireAuth, async (req: any, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });
  try {
    const [existing] = await db.select().from(simulationsTable).where(eq(simulationsTable.id, id));
    if (!existing || existing.userId !== req.userId) return res.status(404).json({ error: "Not found" });
    await db.delete(simulationsTable).where(eq(simulationsTable.id, id));
    res.status(204).send();
  } catch (err) {
    req.log.error({ err }, "Failed to delete simulation");
    res.status(500).json({ error: "Internal server error" });
  }
});

function formatSimulation(sim: any) {
  return {
    ...sim,
    createdAt: sim.createdAt?.toISOString?.() ?? sim.createdAt,
    updatedAt: sim.updatedAt?.toISOString?.() ?? sim.updatedAt,
  };
}

export default router;
