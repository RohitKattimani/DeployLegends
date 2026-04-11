import { Router } from "express";
import { db } from "@workspace/db";
import { agentsTable, debateMessagesTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

router.get("/", async (req, res) => {
  try {
    const agents = await db.select().from(agentsTable);
    res.json(agents.map(formatAgent));
  } catch (err) {
    req.log.error({ err }, "Failed to list agents");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/simulation/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });
  try {
    const messages = await db
      .select({ agentId: debateMessagesTable.agentId })
      .from(debateMessagesTable)
      .where(eq(debateMessagesTable.simulationId, id));
    const agentIds = [...new Set(messages.map((m) => m.agentId))];
    if (agentIds.length === 0) {
      const allAgents = await db.select().from(agentsTable);
      return res.json(allAgents.map(formatAgent));
    }
    const agents = await db.select().from(agentsTable);
    const filtered = agents.filter((a) => agentIds.includes(a.id));
    res.json(filtered.map(formatAgent));
  } catch (err) {
    req.log.error({ err }, "Failed to list simulation agents");
    res.status(500).json({ error: "Internal server error" });
  }
});

function formatAgent(agent: any) {
  return {
    ...agent,
    concerns: agent.concerns ?? [],
  };
}

export default router;
