import { Router } from "express";
import { db } from "@workspace/db";
import { debateMessagesTable, simulationsTable } from "@workspace/db";
import { desc } from "drizzle-orm";
import { enrichMessages } from "./messages";
import { getAuth } from "@clerk/express";

const router = Router();

const ARCHETYPE_META: Record<string, { displayName: string; description: string }> = {
  transport_worker: {
    displayName: "Transport Worker",
    description: "Earns a living driving buses, cabs, auto-rickshaws, or doing last-mile delivery. Daily income depends on fuel costs, route regulations, and competition.",
  },
  informal_trader: {
    displayName: "Informal Trader",
    description: "Operates in the informal economy as a street vendor, market seller, or kiosk operator. Vulnerable to municipal regulations, evictions, and changes in foot traffic.",
  },
  student: {
    displayName: "Student",
    description: "Represents youth voices. Engaged on social media, politically aware, focused on education costs and future job prospects.",
  },
  urban_professional: {
    displayName: "Urban Professional",
    description: "Works in tech, consulting, finance, or media. Concerned about urban infrastructure, housing costs, governance transparency, and innovation policy.",
  },
  household_manager: {
    displayName: "Household Manager",
    description: "Manages household budgets. Every policy is evaluated through the lens of family welfare, food prices, school quality, and public services.",
  },
  small_business_owner: {
    displayName: "Small Business Owner",
    description: "Runs a micro or small enterprise. Sensitive to taxation, regulatory burden, credit access, and market competition.",
  },
  civil_society: {
    displayName: "Civil Society",
    description: "NGO worker, journalist, or community organizer. Evaluates policy through a rights-based lens with focus on equity, accountability, and marginalized groups.",
  },
  senior_citizen: {
    displayName: "Senior Citizen",
    description: "Retired resident drawing on decades of lived experience. Prioritizes pension security, healthcare, civic stability, and institutional integrity.",
  },
  daily_wage_worker: {
    displayName: "Daily Wage Worker",
    description: "Works in construction, domestic services, factories, or gig platforms. Vulnerable to wage instability, unsafe conditions, and sudden policy shifts.",
  },
  salaried_professional: {
    displayName: "Salaried Professional",
    description: "Government or private sector employee. Pays taxes and expects value from public services. Balances aspirational lifestyle against rising costs and governance gaps.",
  },
  // legacy mappings
  auto_driver: {
    displayName: "Transport Worker",
    description: "Earns a living in the transport and logistics sector. Daily income depends on fuel costs, route regulations, and competition.",
  },
  street_vendor: {
    displayName: "Informal Trader",
    description: "Operates in the informal economy. Vulnerable to municipal regulations, evictions, and changes in foot traffic.",
  },
  software_engineer: {
    displayName: "Urban Professional",
    description: "Works in the knowledge economy. Concerned about urban infrastructure, housing costs, governance transparency, and innovation policy.",
  },
  homemaker: {
    displayName: "Household Manager",
    description: "Manages household budgets. Every policy is evaluated through the lens of family welfare, food prices, and public services.",
  },
  activist: {
    displayName: "Civil Society",
    description: "Advocates for marginalized communities. Evaluates policy through a rights-based lens with focus on equity and accountability.",
  },
  retired_teacher: {
    displayName: "Senior Citizen",
    description: "Draws on decades of lived experience. Prioritizes pension security, healthcare, civic stability, and institutional integrity.",
  },
  construction_worker: {
    displayName: "Daily Wage Worker",
    description: "Works in physically demanding, often informal labour. Vulnerable to wage theft, unsafe conditions, and sudden policy shifts.",
  },
  middle_class_professional: {
    displayName: "Salaried Professional",
    description: "Pays taxes and seeks value from public services. Balances aspirational lifestyle against rising costs and governance gaps.",
  },
};

// GET /api/threads
router.get("/", async (req, res) => {
  try {
    const auth = getAuth(req);
    const userId = auth?.userId ?? "anonymous";

    const allMessages = await db
      .select()
      .from(debateMessagesTable)
      .orderBy(desc(debateMessagesTable.createdAt));

    // Fetch all simulations for title lookup
    const allSims = await db.select().from(simulationsTable);
    const simTitleMap: Record<number, string> = {};
    for (const sim of allSims) {
      simTitleMap[sim.id] = sim.title;
    }

    const enriched = await enrichMessages(allMessages, userId);

    // Attach simulation title to each message
    const enrichedWithTitle = enriched.map((msg) => ({
      ...msg,
      simulationTitle: simTitleMap[msg.simulationId] ?? `Simulation #${msg.simulationId}`,
    }));

    // Normalize old archetype keys to new ones
    const ARCHETYPE_NORMALIZE: Record<string, string> = {
      auto_driver: "transport_worker",
      street_vendor: "informal_trader",
      software_engineer: "urban_professional",
      homemaker: "household_manager",
      activist: "civil_society",
      retired_teacher: "senior_citizen",
      construction_worker: "daily_wage_worker",
      middle_class_professional: "salaried_professional",
    };

    // Primary (new) archetypes — controls thread order and deduplication
    const PRIMARY_ARCHETYPES = [
      "transport_worker", "informal_trader", "student", "urban_professional",
      "household_manager", "small_business_owner", "civil_society",
      "senior_citizen", "daily_wage_worker", "salaried_professional",
    ];

    // Group by archetype (normalizing old keys)
    const byArchetype: Record<string, typeof enrichedWithTitle> = {};
    for (const msg of enrichedWithTitle) {
      const raw = msg.agentArchetype;
      const arch = ARCHETYPE_NORMALIZE[raw] ?? raw;
      if (!byArchetype[arch]) byArchetype[arch] = [];
      byArchetype[arch].push(msg);
    }

    const threads = PRIMARY_ARCHETYPES.map((archetype) => {
      const messages = byArchetype[archetype] ?? [];
      const recentMessages = messages.slice(0, 10);
      const avgSentiment =
        messages.length > 0
          ? messages.reduce((sum, m) => sum + (m.sentimentScore ?? 0), 0) / messages.length
          : 0;

      return {
        archetype,
        displayName: ARCHETYPE_META[archetype].displayName,
        description: ARCHETYPE_META[archetype].description,
        messageCount: messages.length,
        avgSentiment,
        recentMessages,
      };
    });

    // Sort by message count descending
    threads.sort((a, b) => b.messageCount - a.messageCount);

    res.json(threads);
  } catch (err) {
    req.log.error({ err }, "Failed to list threads");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
