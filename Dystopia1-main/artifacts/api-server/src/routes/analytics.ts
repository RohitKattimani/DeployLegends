import { Router } from "express";
import { db } from "@workspace/db";
import { debateMessagesTable, agentsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

router.get("/simulation/:id", async (req, res) => {
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
      if (!sentimentByArchetype[arch]) {
        sentimentByArchetype[arch] = { scores: [], count: 0 };
      }
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
      const concerns = agentConcerns[arch] ?? [];
      return {
        demographic: arch.replace(/_/g, " "),
        archetype: arch,
        sentimentScore: avgScore,
        count: data.count,
        topConcern: concerns[0] ?? "general welfare",
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
      coalitionFormation.push({
        name: "Reform Coalition",
        archetypes: proArchetypes,
        stance: "pro" as const,
        strength: proArchetypes.length / ARCHETYPE_COUNT,
      });
    }
    if (antiArchetypes.length > 0) {
      coalitionFormation.push({
        name: "Opposition Block",
        archetypes: antiArchetypes,
        stance: "anti" as const,
        strength: antiArchetypes.length / ARCHETYPE_COUNT,
      });
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

const ARCHETYPE_COUNT = 10;

export default router;
