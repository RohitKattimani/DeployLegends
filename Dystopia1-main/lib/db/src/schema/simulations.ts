import { pgTable, serial, text, integer, real, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const simulationStatusEnum = pgEnum("simulation_status", ["draft", "running", "completed", "paused"]);

export const simulationsTable = pgTable("simulations", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  policyDescription: text("policy_description").notNull(),
  city: text("city").notNull().default("Mumbai"),
  status: simulationStatusEnum("status").notNull().default("draft"),
  agentCount: integer("agent_count").notNull().default(0),
  messageCount: integer("message_count").notNull().default(0),
  overallSentiment: real("overall_sentiment").notNull().default(0),
  protestRisk: real("protest_risk").notNull().default(0),
  userId: text("user_id").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertSimulationSchema = createInsertSchema(simulationsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertSimulation = z.infer<typeof insertSimulationSchema>;
export type Simulation = typeof simulationsTable.$inferSelect;
