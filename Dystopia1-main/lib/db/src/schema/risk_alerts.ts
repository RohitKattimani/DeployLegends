import { pgTable, serial, text, integer, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const alertTypeEnum = pgEnum("alert_type", [
  "high_protest_risk",
  "coalition_forming",
  "viral_opposition",
  "sentiment_collapse",
  "demographic_polarization"
]);

export const alertSeverityEnum = pgEnum("alert_severity", ["low", "medium", "high", "critical"]);

export const riskAlertsTable = pgTable("risk_alerts", {
  id: serial("id").primaryKey(),
  simulationId: integer("simulation_id").notNull(),
  simulationTitle: text("simulation_title").notNull(),
  alertType: alertTypeEnum("alert_type").notNull(),
  severity: alertSeverityEnum("severity").notNull(),
  description: text("description").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertRiskAlertSchema = createInsertSchema(riskAlertsTable).omit({ id: true, createdAt: true });
export type InsertRiskAlert = z.infer<typeof insertRiskAlertSchema>;
export type RiskAlert = typeof riskAlertsTable.$inferSelect;
