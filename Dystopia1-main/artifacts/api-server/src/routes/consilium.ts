import { Router } from "express";
import { getAuth } from "@clerk/express";
import { db } from "@workspace/db";
import { simulationsTable, agentsTable, debateMessagesTable, riskAlertsTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";

const router = Router();

function requireAuth(req: any, res: any, next: any) {
  const auth = getAuth(req);
  const userId = auth?.userId;
  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  req.userId = userId;
  next();
}

router.get("/dashboard", requireAuth, async (req: any, res) => {
  try {
    const simulations = await db
      .select()
      .from(simulationsTable)
      .where(eq(simulationsTable.userId, req.userId))
      .orderBy(desc(simulationsTable.createdAt));

    const agents = await db.select().from(agentsTable);

    // Only fetch messages that belong to this user's simulations
    const userSimIds = simulations.map((s) => s.id);
    const allMessages = await db.select().from(debateMessagesTable);
    const messages = allMessages.filter((m) => userSimIds.includes(m.simulationId));

    const totalSimulations = simulations.length;
    const activeSimulations = simulations.filter((s) => s.status === "running").length;
    const totalAgents = agents.length;
    const totalMessages = messages.length;
    const avgSentiment =
      simulations.length > 0
        ? simulations.reduce((sum, s) => sum + s.overallSentiment, 0) / simulations.length
        : 0;
    const highRiskSimulations = simulations.filter((s) => s.protestRisk > 0.6).length;
    const recentSimulations = simulations.slice(0, 5).map(formatSimulation);

    // Build sentiment trend from this user's messages, sorted chronologically
    const sortedMessages = [...messages].sort(
      (a, b) => new Date(a.createdAt ?? 0).getTime() - new Date(b.createdAt ?? 0).getTime()
    );
    const sentimentTrend = sortedMessages.slice(-30).map((m, i) => ({
      timestamp: m.createdAt?.toISOString?.() ?? new Date().toISOString(),
      score: m.sentimentScore,
      messageCount: i + 1,
    }));

    res.json({
      totalSimulations,
      activeSimulations,
      totalAgents,
      totalMessages,
      avgSentiment,
      highRiskSimulations,
      recentSimulations,
      sentimentTrend,
    });
  } catch (err) {
    req.log.error({ err }, "Failed to get consilium dashboard");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/risk-alerts", requireAuth, async (req: any, res) => {
  try {
    const userSims = await db
      .select()
      .from(simulationsTable)
      .where(eq(simulationsTable.userId, req.userId));
    const simIds = userSims.map((s) => s.id);

    const allAlerts = await db
      .select()
      .from(riskAlertsTable)
      .orderBy(desc(riskAlertsTable.createdAt));

    const filtered = allAlerts.filter((a) => simIds.includes(a.simulationId));

    res.json(
      filtered.map((a) => ({
        ...a,
        createdAt: a.createdAt?.toISOString?.() ?? a.createdAt,
      }))
    );
  } catch (err) {
    req.log.error({ err }, "Failed to get risk alerts");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/demographics", requireAuth, async (req: any, res) => {
  try {
    const userSims = await db
      .select()
      .from(simulationsTable)
      .where(eq(simulationsTable.userId, req.userId));
    const userSimIds = userSims.map((s) => s.id);

    const agents = await db.select().from(agentsTable);
    const allMessages = await db.select().from(debateMessagesTable);
    const messages = allMessages.filter((m) => userSimIds.includes(m.simulationId));

    const archetypeSentiments: Record<string, number[]> = {};
    for (const msg of messages) {
      const arch = msg.agentArchetype;
      if (!archetypeSentiments[arch]) archetypeSentiments[arch] = [];
      archetypeSentiments[arch].push(msg.sentimentScore);
    }

    const agentConcerns: Record<string, string[]> = {};
    for (const agent of agents) {
      agentConcerns[agent.archetype] = agent.concerns ?? [];
    }

    const archetypes = [
      "auto_driver", "street_vendor", "student", "software_engineer", "homemaker",
      "small_business_owner", "activist", "retired_teacher", "construction_worker", "middle_class_professional"
    ];

    const result = archetypes.map((arch) => {
      const scores = archetypeSentiments[arch] ?? [0];
      const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
      const concerns = agentConcerns[arch] ?? [];
      return {
        demographic: arch.replace(/_/g, " "),
        archetype: arch,
        sentimentScore: avgScore,
        count: scores.length,
        topConcern: concerns[0] ?? "general welfare",
      };
    });

    res.json(result);
  } catch (err) {
    req.log.error({ err }, "Failed to get demographics");
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
