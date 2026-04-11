import { Router } from "express";
import { db } from "@workspace/db";
import { debateMessagesTable, messageVotesTable } from "@workspace/db";
import { eq, and, inArray } from "drizzle-orm";
import { getAuth } from "@clerk/express";

const router = Router();

// Helper: enrich a list of messages with vote counts + caller's userVote
export async function enrichMessages(messages: any[], userId: string) {
  if (messages.length === 0) return [];

  const msgIds = messages.map((m) => m.id);
  const allVotes = await db
    .select()
    .from(messageVotesTable)
    .where(inArray(messageVotesTable.messageId, msgIds));

  const voteMap: Record<number, { up: number; down: number; userVote: number | null }> = {};
  for (const msg of messages) voteMap[msg.id] = { up: 0, down: 0, userVote: null };
  for (const vote of allVotes) {
    if (!voteMap[vote.messageId]) continue;
    if (vote.value === 1) voteMap[vote.messageId].up++;
    if (vote.value === -1) voteMap[vote.messageId].down++;
    if (vote.userId === userId) voteMap[vote.messageId].userVote = vote.value;
  }

  return messages.map((msg) => {
    const v = voteMap[msg.id] ?? { up: 0, down: 0, userVote: null };
    const seedUp = msg.upvotes ?? 0;
    const totalUp = seedUp + v.up;
    const totalDown = v.down;
    return {
      ...msg,
      upvotes: totalUp,
      downvotes: totalDown,
      netScore: totalUp - totalDown,
      userVote: v.userVote,
      createdAt: msg.createdAt?.toISOString?.() ?? msg.createdAt,
    };
  });
}

// POST /api/messages/:id/vote
router.post("/:id/vote", async (req, res) => {
  const messageId = parseInt(req.params.id);
  if (isNaN(messageId)) return res.status(400).json({ error: "Invalid message id" });

  const { value } = req.body as { value: number };
  if (![-1, 0, 1].includes(value)) {
    return res.status(400).json({ error: "value must be -1, 0, or 1" });
  }

  const auth = getAuth(req);
  const userId = auth?.userId;
  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  try {
    const existing = await db
      .select()
      .from(messageVotesTable)
      .where(and(eq(messageVotesTable.messageId, messageId), eq(messageVotesTable.userId, userId)));

    if (value === 0 || (existing.length > 0 && existing[0].value === value)) {
      // Toggle off (remove) if same vote or explicit zero
      await db
        .delete(messageVotesTable)
        .where(and(eq(messageVotesTable.messageId, messageId), eq(messageVotesTable.userId, userId)));
    } else if (existing.length > 0) {
      // Update existing vote to new value
      await db
        .update(messageVotesTable)
        .set({ value })
        .where(and(eq(messageVotesTable.messageId, messageId), eq(messageVotesTable.userId, userId)));
    } else {
      // Insert new vote
      await db.insert(messageVotesTable).values({ messageId, userId, value });
    }

    // Compute fresh counts
    const [msg] = await db.select().from(debateMessagesTable).where(eq(debateMessagesTable.id, messageId));
    if (!msg) return res.status(404).json({ error: "Message not found" });

    const votes = await db
      .select()
      .from(messageVotesTable)
      .where(eq(messageVotesTable.messageId, messageId));

    const up = votes.filter((v) => v.value === 1).length;
    const down = votes.filter((v) => v.value === -1).length;
    const userVoteRecord = votes.find((v) => v.userId === userId);
    const seedUp = msg.upvotes ?? 0;

    return res.json({
      messageId,
      upvotes: seedUp + up,
      downvotes: down,
      netScore: seedUp + up - down,
      userVote: userVoteRecord?.value ?? null,
    });
  } catch (err) {
    req.log.error({ err }, "Failed to vote on message");
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
