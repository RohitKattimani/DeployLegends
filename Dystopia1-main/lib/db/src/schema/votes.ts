import { pgTable, serial, integer, text, timestamp } from "drizzle-orm/pg-core";

export const messageVotesTable = pgTable("message_votes", {
  id: serial("id").primaryKey(),
  messageId: integer("message_id").notNull(),
  userId: text("user_id").notNull(),
  value: integer("value").notNull(), // +1 upvote, -1 downvote
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type MessageVote = typeof messageVotesTable.$inferSelect;
