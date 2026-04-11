import { pgTable, serial, text, integer, real, boolean, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const agentArchetypeEnum = pgEnum("agent_archetype", [
  "auto_driver",
  "street_vendor",
  "student",
  "software_engineer",
  "homemaker",
  "small_business_owner",
  "activist",
  "retired_teacher",
  "construction_worker",
  "middle_class_professional",
  "transport_worker",
  "informal_trader",
  "urban_professional",
  "household_manager",
  "civil_society",
  "senior_citizen",
  "daily_wage_worker",
  "salaried_professional",
]);

export const agentSentimentEnum = pgEnum("agent_sentiment", [
  "strongly_support",
  "support",
  "neutral",
  "oppose",
  "strongly_oppose"
]);

export const agentsTable = pgTable("agents", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  archetype: agentArchetypeEnum("archetype").notNull(),
  age: integer("age").notNull(),
  neighborhood: text("neighborhood").notNull(),
  sentiment: agentSentimentEnum("sentiment").notNull().default("neutral"),
  sentimentScore: real("sentiment_score").notNull().default(0),
  bio: text("bio").notNull(),
  concerns: text("concerns").array().notNull().default([]),
  isActive: boolean("is_active").notNull().default(true),
});

export const insertAgentSchema = createInsertSchema(agentsTable).omit({ id: true });
export type InsertAgent = z.infer<typeof insertAgentSchema>;
export type Agent = typeof agentsTable.$inferSelect;
