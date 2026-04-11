import { pgTable, serial, text, integer, real, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const messageSentimentEnum = pgEnum("message_sentiment", [
  "strongly_support",
  "support",
  "neutral",
  "oppose",
  "strongly_oppose"
]);

export const debateMessagesTable = pgTable("debate_messages", {
  id: serial("id").primaryKey(),
  simulationId: integer("simulation_id").notNull(),
  agentId: integer("agent_id").notNull(),
  agentName: text("agent_name").notNull(),
  agentArchetype: text("agent_archetype").notNull(),
  content: text("content").notNull(),
  sentiment: messageSentimentEnum("sentiment").notNull(),
  sentimentScore: real("sentiment_score").notNull().default(0),
  upvotes: integer("upvotes").notNull().default(0),
  replyToId: integer("reply_to_id"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertDebateMessageSchema = createInsertSchema(debateMessagesTable).omit({ id: true, createdAt: true });
export type InsertDebateMessage = z.infer<typeof insertDebateMessageSchema>;
export type DebateMessage = typeof debateMessagesTable.$inferSelect;
