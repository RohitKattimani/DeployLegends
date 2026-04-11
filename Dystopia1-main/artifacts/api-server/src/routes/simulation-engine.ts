import { db } from "@workspace/db";
import { agentsTable, debateMessagesTable, riskAlertsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { openai } from "@workspace/integrations-openai-ai-server";

// ─── Broader Archetypes ───────────────────────────────────────────────────────

const ARCHETYPES = [
  "transport_worker",
  "informal_trader",
  "student",
  "urban_professional",
  "household_manager",
  "small_business_owner",
  "civil_society",
  "senior_citizen",
  "daily_wage_worker",
  "salaried_professional",
] as const;

type Archetype = (typeof ARCHETYPES)[number];

const OLD_ARCHETYPES = [
  "auto_driver",
  "street_vendor",
  "software_engineer",
  "homemaker",
  "activist",
  "retired_teacher",
  "construction_worker",
  "middle_class_professional",
];

// ─── Neighborhoods ────────────────────────────────────────────────────────────

const MUMBAI_NEIGHBORHOODS = ["Dharavi", "Bandra", "Andheri", "Kurla", "Dadar", "Worli", "Colaba", "Goregaon", "Thane", "Navi Mumbai"];
const DELHI_NEIGHBORHOODS = ["Chandni Chowk", "Connaught Place", "Dwarka", "Rohini", "Lajpat Nagar", "Noida", "Karol Bagh", "Saket", "Vasant Kunj", "Shahdara"];
const BENGALURU_NEIGHBORHOODS = ["Koramangala", "Whitefield", "Indiranagar", "Jayanagar", "Malleshwaram", "HSR Layout", "Electronic City", "Rajajinagar", "Yelahanka", "BTM Layout"];
const CHENNAI_NEIGHBORHOODS = ["T. Nagar", "Mylapore", "Adyar", "Velachery", "Anna Nagar", "Guindy", "Tambaram", "Porur", "Perambur", "Sholinganallur"];
const HYDERABAD_NEIGHBORHOODS = ["Banjara Hills", "Jubilee Hills", "Madhapur", "Secunderabad", "Kukatpally", "LB Nagar", "Dilsukhnagar", "Miyapur", "Gachibowli", "HITEC City"];

function getNeighborhoods(city: string): string[] {
  if (city === "Delhi") return DELHI_NEIGHBORHOODS;
  if (city === "Bengaluru") return BENGALURU_NEIGHBORHOODS;
  if (city === "Chennai") return CHENNAI_NEIGHBORHOODS;
  if (city === "Hyderabad") return HYDERABAD_NEIGHBORHOODS;
  return MUMBAI_NEIGHBORHOODS;
}

// ─── Agent Templates ──────────────────────────────────────────────────────────

const agentTemplates: Record<Archetype, {
  names: string[];
  ages: number[];
  bioTemplate: (name: string, neighborhood: string) => string;
  concerns: string[];
}> = {
  transport_worker: {
    names: ["Ramesh Kumar", "Suresh Yadav", "Mahesh Gupta", "Baldev Singh", "Ravi Shankar", "Mohan Das", "Arjun Singh"],
    ages: [35, 42, 48, 39, 44, 37, 41],
    bioTemplate: (name, neighborhood) =>
      `${name} works in the transport sector in ${neighborhood} — driving buses, cabs, auto-rickshaws, or doing last-mile delivery. Earns ₹600–1,100 per day depending on routes and seasons. Supports a family and is deeply attuned to fuel prices, traffic policy, and any mandate that changes how mobility workers earn their livelihood.`,
    concerns: ["fuel prices", "route restrictions", "daily earnings", "mobility policy", "fare regulation"],
  },
  informal_trader: {
    names: ["Fatima Bi", "Raju Sharma", "Meena Devi", "Shyam Lal", "Kalavati Bai", "Rehman Khan", "Savita Kumari"],
    ages: [38, 52, 44, 47, 40, 45, 36],
    bioTemplate: (name, neighborhood) =>
      `${name} runs a small stall or mobile shop near the ${neighborhood} market — selling vegetables, snacks, clothes, or daily essentials. Has no fixed income and no formal license. Depends entirely on foot traffic and is immediately vulnerable to any policy that disrupts public spaces, markets, or informal commerce.`,
    concerns: ["eviction threats", "municipal enforcement", "daily earnings", "informal rights", "market access"],
  },
  student: {
    names: ["Priya Nair", "Arjun Singh", "Zoya Khan", "Ankit Tiwari", "Divya Menon", "Rohan Gupta", "Simran Kaur"],
    ages: [21, 23, 19, 22, 20, 24, 21],
    bioTemplate: (name, neighborhood) =>
      `${name} is a university student in ${neighborhood} — studying engineering, social sciences, or the arts. Active on social media, part of student unions, and highly politically aware. Views every policy through the lens of youth opportunity, education costs, and what kind of city they will inherit.`,
    concerns: ["education costs", "job prospects", "public transport", "civic rights", "digital access"],
  },
  urban_professional: {
    names: ["Kiran Reddy", "Aditya Shah", "Pooja Menon", "Vikas Chatterjee", "Nisha Pillai", "Rahul Bose", "Tanvi Joshi"],
    ages: [29, 32, 27, 34, 30, 31, 28],
    bioTemplate: (name, neighborhood) =>
      `${name} is a knowledge worker based in ${neighborhood} — working in tech, consulting, finance, or media. Earns a comfortable salary but faces high rents, long commutes, and rising urban costs. Expects evidence-based governance, transparency in public spending, and infrastructure that matches their tax contribution.`,
    concerns: ["urban infrastructure", "housing costs", "governance transparency", "commute quality", "startup ecosystem"],
  },
  household_manager: {
    names: ["Sunita Verma", "Rekha Patel", "Anita Iyer", "Pushpa Kumari", "Savita Joshi", "Radha Menon", "Kamla Devi"],
    ages: [40, 45, 37, 42, 38, 43, 39],
    bioTemplate: (name, neighborhood) =>
      `${name} manages a household in ${neighborhood}. Every policy is filtered through the lens of family budget, school quality, local safety, and monthly expenses. Tracks grocery prices, school fees, and healthcare costs carefully. Represents the majority of urban households who absorb the real cost of policy changes.`,
    concerns: ["food prices", "school quality", "healthcare costs", "neighborhood safety", "household budget"],
  },
  small_business_owner: {
    names: ["Vijay Agarwal", "Santosh Jain", "Deepak Choudhary", "Sunil Bansal", "Harish Mehta", "Pramod Verma", "Girish Shah"],
    ages: [44, 51, 38, 46, 55, 49, 42],
    bioTemplate: (name, neighborhood) =>
      `${name} runs a small business in ${neighborhood} — a retail shop, local manufacturer, or service provider. Struggles with GST compliance, rising operating costs, and competition from online platforms. Cares about regulatory simplicity, credit access, and any policy that affects the cost of doing business at the ground level.`,
    concerns: ["GST compliance", "operating costs", "credit access", "regulatory burden", "e-commerce competition"],
  },
  civil_society: {
    names: ["Nandini Krishnan", "Rohit Shetty", "Shabnam Hashmi", "Medha Singh", "Teesta Mirza", "Kavita Rao", "Arif Khan"],
    ages: [33, 28, 41, 35, 44, 38, 46],
    bioTemplate: (name, neighborhood) =>
      `${name} works in civil society in ${neighborhood} — an NGO worker, journalist, community organizer, or rights activist. Evaluates every policy through its impact on marginalized groups, democratic accountability, and human rights. Mobilizes communities, files RTIs, and holds institutions accountable.`,
    concerns: ["civil liberties", "minority rights", "displacement", "environmental impact", "accountability"],
  },
  senior_citizen: {
    names: ["Prof. Krishnamurthy", "Mrs. Lata Sharma", "Mr. P.K. Das", "Smt. Sarla Devi", "Shri Mohan Rao", "Dr. Usha Iyer", "Col. Rajiv Batra"],
    ages: [65, 68, 72, 66, 70, 64, 71],
    bioTemplate: (name, neighborhood) =>
      `${name} is a retired resident of ${neighborhood} — a former teacher, government officer, doctor, or professional. Relies on a pension or savings. Brings decades of lived experience to every policy discussion. Values stability, institutional quality, and long-term thinking over quick fixes. Deeply skeptical of change without evidence.`,
    concerns: ["pension security", "healthcare access", "social stability", "inflation impact", "institutional quality"],
  },
  daily_wage_worker: {
    names: ["Birju Mistry", "Lakshman Rao", "Gopal Singh", "Ramprasad Yadav", "Chandru Nayak", "Deepak Mahar", "Ramu Bhai"],
    ages: [30, 38, 45, 33, 41, 36, 44],
    bioTemplate: (name, neighborhood) =>
      `${name} is a daily wage earner in ${neighborhood} — working in construction, domestic services, factories, or gig platforms. Earns ₹450–700 per day when work is available. No formal contract, no sick leave, no safety net. Every policy change that raises costs, restricts movement, or disrupts worksites directly threatens their survival.`,
    concerns: ["wage stability", "labor rights", "housing", "gig work conditions", "migrant protections"],
  },
  salaried_professional: {
    names: ["Dr. Kavitha Subramanian", "CA Rahul Khanna", "Deepti Joshi", "Sanjay Bhattacharya", "Leena D'Souza", "Amit Kulkarni", "Priyanka Das"],
    ages: [36, 39, 42, 44, 37, 40, 35],
    bioTemplate: (name, neighborhood) =>
      `${name} is a salaried professional in ${neighborhood} — working in government, banking, education, or the private sector. Pays income tax, manages EMIs, and makes deliberate household financial decisions. Frustrated by the gap between what is promised in policy and what is delivered in practice. Expects accountability and good governance.`,
    concerns: ["tax burden", "EMI pressure", "service quality", "inflation", "infrastructure investment"],
  },
};

// ─── India Dataset Statistics ─────────────────────────────────────────────────

const INDIA_STATS: Record<Archetype, string> = {
  transport_worker: "NSSO 2021 data: over 14 million transport workers in India's urban informal sector, with 68% earning under ₹15,000/month",
  informal_trader: "NSS 2019: 63 million street vendors and informal traders in India, 85% without formal licenses or social protection",
  student: "AISHE 2022: 43.3 million students in higher education; 53% cite financial stress as a top concern",
  urban_professional: "NASSCOM 2023: 5.4 million knowledge workers contributing 7.7% of GDP, concentrated in 6 metro cities",
  household_manager: "Census 2011: 160 million primary household managers — their spending absorbs 67% of consumer price shocks directly",
  small_business_owner: "MSME Ministry 2023: 63 million MSMEs employing 111 million people, contributing 30% of GDP",
  civil_society: "CAF India 2023: 3.3 million registered civil society organizations mobilizing 4.2 million volunteers nationwide",
  senior_citizen: "Longitudinal Ageing Study India 2020: 138 million senior citizens; 74% depend on family or pension with no secondary income",
  daily_wage_worker: "NSSO 2021: 51 million daily wage construction workers alone; 92% in the informal sector without job security or benefits",
  salaried_professional: "NCAER 2022: 122 million middle-class households contribute 35% of income tax while receiving only 12% of direct subsidies",
};

// ─── Sentiment Distribution ───────────────────────────────────────────────────

type SentimentLevel = "strongly_support" | "support" | "neutral" | "oppose" | "strongly_oppose";

function getSentimentScore(sentiment: SentimentLevel): number {
  const map: Record<SentimentLevel, number> = {
    strongly_support: 0.75 + Math.random() * 0.2,
    support: 0.3 + Math.random() * 0.25,
    neutral: -0.08 + Math.random() * 0.16,
    oppose: -0.55 + Math.random() * 0.25,
    strongly_oppose: -0.8 + Math.random() * 0.15,
  };
  return parseFloat((map[sentiment]).toFixed(3));
}

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function extractPolicyThemes(policyDescription: string) {
  const text = policyDescription.toLowerCase();
  return {
    transport: /transport|vehicle|auto|bus|metro|traffic|commute|road|rickshaw|cab|taxi|fuel|cng|ev\b|electric vehicle/i.test(text),
    tax: /tax|gst|levy|cess|duty|excise|surcharge/i.test(text),
    environment: /pollut|environ|green|electric|cng|emission|carbon|climate|waste|clean/i.test(text),
    housing: /hous|evict|demolish|slum|flat|apartment|rent|land|property|resettl/i.test(text),
    education: /education|school|college|university|student|scholarship|curriculum/i.test(text),
    health: /health|hospital|medical|medicine|clinic|doctor|insurance/i.test(text),
    digital: /digital|internet|tech|online|app|platform|cyber|software/i.test(text),
    business: /business|trade|commerce|shop|market|vendor|entrepreneur|startup/i.test(text),
    labor: /labor|labour|worker|wage|employ|job|salary|migrant|informal/i.test(text),
    isControversial: /ban|restrict|compulsory|mandatory|fine|penalty|evict|demolish|privatize|tax|levy/i.test(text),
    hasBan: /ban|prohibit|restrict|illegal/i.test(text),
    hasMandatory: /mandatory|compulsory|must\b|required|shall\b/i.test(text),
  };
}

function generateSentimentDistribution(policyDescription: string): Record<Archetype, SentimentLevel> {
  const themes = extractPolicyThemes(policyDescription);
  const highlyControversial = themes.isControversial && (themes.hasBan || themes.hasMandatory);

  const getBias = (archetype: Archetype): SentimentLevel[] => {
    if (highlyControversial) {
      const biases: Record<Archetype, SentimentLevel[]> = {
        transport_worker: ["strongly_oppose", "strongly_oppose", "oppose", "neutral"],
        informal_trader: ["strongly_oppose", "strongly_oppose", "oppose", "oppose"],
        student: ["strongly_oppose", "oppose", "oppose", "neutral", "support"],
        urban_professional: ["oppose", "oppose", "neutral", "neutral", "support"],
        household_manager: ["oppose", "oppose", "neutral", "neutral"],
        small_business_owner: ["strongly_oppose", "oppose", "oppose", "neutral"],
        civil_society: ["strongly_oppose", "strongly_oppose", "oppose", "neutral"],
        senior_citizen: ["oppose", "oppose", "neutral", "neutral"],
        daily_wage_worker: ["strongly_oppose", "oppose", "neutral"],
        salaried_professional: ["oppose", "neutral", "neutral", "support"],
      };
      return biases[archetype] ?? ["oppose", "neutral"];
    }
    const biases: Record<Archetype, SentimentLevel[]> = {
      transport_worker: themes.transport
        ? ["strongly_oppose", "oppose", "neutral"]
        : ["neutral", "support", "oppose"],
      informal_trader: themes.isControversial
        ? ["oppose", "oppose", "neutral"]
        : ["neutral", "support", "oppose"],
      student: ["support", "support", "neutral", "strongly_support", "oppose"],
      urban_professional: ["neutral", "support", "support", "oppose", "strongly_support"],
      household_manager: ["neutral", "neutral", "support", "oppose"],
      small_business_owner: themes.isControversial
        ? ["oppose", "neutral", "neutral"]
        : ["neutral", "support", "support"],
      civil_society: themes.isControversial
        ? ["strongly_oppose", "oppose", "neutral"]
        : ["oppose", "neutral", "support"],
      senior_citizen: ["neutral", "neutral", "oppose", "support"],
      daily_wage_worker: themes.isControversial
        ? ["strongly_oppose", "oppose", "neutral"]
        : ["neutral", "oppose", "support"],
      salaried_professional: ["neutral", "support", "oppose", "support"],
    };
    return biases[archetype] ?? ["neutral", "support", "oppose"];
  };

  const distribution = {} as Record<Archetype, SentimentLevel>;
  for (const archetype of ARCHETYPES) {
    distribution[archetype] = pickRandom(getBias(archetype));
  }
  return distribution;
}

// ─── LLM Message Generation ───────────────────────────────────────────────────

const SENTIMENT_INSTRUCTION: Record<SentimentLevel, string> = {
  strongly_support: "You are genuinely enthusiastic and strongly support this policy. Express clear, passionate support grounded in how it benefits people like you.",
  support: "You cautiously support this policy, seeing its benefits while acknowledging some concerns.",
  neutral: "You are genuinely uncertain or undecided about this policy. Present a balanced, thoughtful view.",
  oppose: "You have real concerns about this policy and oppose key aspects of it. Be specific about what worries you.",
  strongly_oppose: "You are strongly opposed to this policy. Express clear, direct opposition rooted in how it harms people like you. You may be angry or alarmed.",
};

async function generateLLMMessage(
  archetype: Archetype,
  agentName: string,
  neighborhood: string,
  bio: string,
  concerns: string[],
  sentiment: SentimentLevel,
  policyTitle: string,
  policyDescription: string,
  dataSnippet: string,
  replyContext?: { authorName: string; authorRole: string; content: string }
): Promise<string> {
  const systemPrompt = `You are ${agentName}, a ${archetype.replace(/_/g, " ")} living in ${neighborhood}, India.

Background: ${bio}

Your main concerns: ${concerns.join(", ")}.

Relevant ground truth: ${dataSnippet}

You are participating in a public debate about a government policy proposal. Respond as yourself — authentically, in your own voice, based on your lived experience. Do NOT be generic or formal. 

Rules:
- 2-4 sentences maximum. Be direct and specific to THIS policy.
- Reference concrete details from the policy description (amounts, timelines, actions mentioned).
- Speak from your personal situation — how does this affect YOUR daily life, income, family, or work?
- Occasionally mix Hindi words or phrases naturally if it fits your character (auto, yaar, bhai, ji, etc.).
- ${SENTIMENT_INSTRUCTION[sentiment]}
- Do NOT use placeholder text like "Policy name here" — always refer to the actual policy content.
- Do NOT be diplomatic or generic. Be real.`;

  const userContent = replyContext
    ? `The policy being debated:
Title: ${policyTitle}
Description: ${policyDescription}

You are replying to ${replyContext.authorName} (${replyContext.authorRole}) who said:
"${replyContext.content}"

Write your reply to them directly, addressing what they said while relating it to how this policy affects you personally.`
    : `Policy being debated:
Title: ${policyTitle}
Description: ${policyDescription}

Write your initial reaction to this policy from your personal perspective as a ${archetype.replace(/_/g, " ")} in ${neighborhood}.`;

  const response = await openai.chat.completions.create({
    model: "gpt-5-mini",
    max_completion_tokens: 1500,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userContent },
    ],
  });

  return response.choices[0]?.message?.content?.trim() ?? `As a ${archetype.replace(/_/g, " ")} in ${neighborhood}, I have concerns about this policy.`;
}

// ─── Main Export ──────────────────────────────────────────────────────────────

export async function generateSimulationMessages(
  simulationId: number,
  policyDescription: string,
  city: string,
  simulationTitle?: string,
  policyTitle?: string
): Promise<{
  messagesGenerated: number;
  agentsActivated: number;
  sentimentScore: number;
  protestRisk: number;
  topConcerns: string[];
}> {
  const neighborhoods = getNeighborhoods(city);
  const sentimentDistribution = generateSentimentDistribution(policyDescription);
  const title = policyTitle ?? simulationTitle ?? "Policy Proposal";

  // ── Migrate old archetypes if needed ──
  const existingAgents = await db.select().from(agentsTable);
  const hasOldArchetypes = existingAgents.some((a) => OLD_ARCHETYPES.includes(a.archetype));
  if (hasOldArchetypes) {
    await db.delete(agentsTable);
  }

  // ── Seed agents (once per archetype globally) ──
  const freshAgents = await db.select().from(agentsTable);
  let agentMap: Record<string, any> = {};

  if (freshAgents.length === 0) {
    for (const archetype of ARCHETYPES) {
      const template = agentTemplates[archetype];
      const name = pickRandom(template.names);
      const neighborhood = pickRandom(neighborhoods);
      const sentiment = sentimentDistribution[archetype];
      const sentimentScore = getSentimentScore(sentiment);

      const [agent] = await db
        .insert(agentsTable)
        .values({
          name,
          archetype: archetype as any,
          age: pickRandom(template.ages),
          neighborhood,
          sentiment: sentiment as any,
          sentimentScore,
          bio: template.bioTemplate(name, neighborhood),
          concerns: template.concerns,
          isActive: true,
        })
        .returning();
      agentMap[archetype] = agent;
    }
  } else {
    for (const agent of freshAgents) {
      agentMap[agent.archetype] = agent;
    }
  }

  const allAgents = Object.values(agentMap);

  // ── Generate initial round: one LLM message per agent (batched) ──
  const selectedSentiments: number[] = [];

  const initialInputs = allAgents.map((agent) => {
    const archetype = agent.archetype as Archetype;
    const sentiment = sentimentDistribution[archetype] ?? "neutral";
    return { agent, archetype, sentiment };
  });

  const initialMessages = await Promise.allSettled(
    initialInputs.map(async ({ agent, archetype, sentiment }) => {
      const sentimentScore = getSentimentScore(sentiment as SentimentLevel);
      const content = await generateLLMMessage(
        archetype,
        agent.name,
        agent.neighborhood ?? city,
        agent.bio ?? agentTemplates[archetype]?.bioTemplate(agent.name, agent.neighborhood ?? city),
        agent.concerns ?? agentTemplates[archetype]?.concerns ?? [],
        sentiment as SentimentLevel,
        title,
        policyDescription,
        INDIA_STATS[archetype] ?? ""
      );
      return { agent, archetype, sentiment: sentiment as SentimentLevel, sentimentScore, content };
    })
  );

  const firstRoundDbRecords: Array<{ msg: any; dbRecord: any }> = [];

  for (const result of initialMessages) {
    if (result.status === "fulfilled") {
      const { agent, sentiment, sentimentScore, content } = result.value;
      selectedSentiments.push(sentimentScore);
      const record = {
        simulationId,
        agentId: agent.id,
        agentName: agent.name,
        agentArchetype: agent.archetype,
        content,
        sentiment: sentiment as any,
        sentimentScore,
        upvotes: Math.floor(Math.random() * 120),
        replyToId: null as number | null,
      };
      const [inserted] = await db.insert(debateMessagesTable).values(record).returning();
      firstRoundDbRecords.push({ msg: record, dbRecord: inserted });
    }
  }

  // ── Generate 4–5 reply messages (LLM, cross-agent debate) ──
  const replyCount = 4 + Math.floor(Math.random() * 2);

  const strongAgents = allAgents.filter((a) => {
    const s = sentimentDistribution[a.archetype as Archetype];
    return s === "strongly_oppose" || s === "strongly_support";
  });

  const strongTargets = firstRoundDbRecords.filter((m) => {
    const s = sentimentDistribution[m.msg.agentArchetype as Archetype];
    return s === "strongly_oppose" || s === "strongly_support";
  });

  if (strongAgents.length > 0 && strongTargets.length > 0) {
    const replyInputs: Array<{
      replyingAgent: any;
      targetMsg: { msg: any; dbRecord: any };
      sentiment: SentimentLevel;
    }> = [];

    for (let i = 0; i < Math.min(replyCount, strongAgents.length); i++) {
      const replyingAgent = strongAgents[i % strongAgents.length];
      const targetMsg = strongTargets[(i + 1) % strongTargets.length];
      if (!replyingAgent || !targetMsg?.dbRecord || replyingAgent.id === targetMsg.msg.agentId) continue;
      const sentiment = sentimentDistribution[replyingAgent.archetype as Archetype] ?? "neutral";
      replyInputs.push({ replyingAgent, targetMsg, sentiment: sentiment as SentimentLevel });
    }

    const replyResults = await Promise.allSettled(
      replyInputs.map(async ({ replyingAgent, targetMsg, sentiment }) => {
        const archetype = replyingAgent.archetype as Archetype;
        const targetArchetype = targetMsg.msg.agentArchetype as Archetype;
        const content = await generateLLMMessage(
          archetype,
          replyingAgent.name,
          replyingAgent.neighborhood ?? city,
          replyingAgent.bio ?? agentTemplates[archetype]?.bioTemplate(replyingAgent.name, replyingAgent.neighborhood ?? city),
          replyingAgent.concerns ?? agentTemplates[archetype]?.concerns ?? [],
          sentiment,
          title,
          policyDescription,
          INDIA_STATS[archetype] ?? "",
          {
            authorName: targetMsg.msg.agentName,
            authorRole: (targetArchetype ?? "community member").replace(/_/g, " "),
            content: targetMsg.msg.content,
          }
        );
        return { replyingAgent, targetMsg, sentiment, content };
      })
    );

    for (const result of replyResults) {
      if (result.status === "fulfilled") {
        const { replyingAgent, targetMsg, sentiment, content } = result.value;
        const sentimentScore = getSentimentScore(sentiment);
        selectedSentiments.push(sentimentScore);
        await db.insert(debateMessagesTable).values({
          simulationId,
          agentId: replyingAgent.id,
          agentName: replyingAgent.name,
          agentArchetype: replyingAgent.archetype,
          content,
          sentiment: sentiment as any,
          sentimentScore,
          upvotes: Math.floor(Math.random() * 60),
          replyToId: targetMsg.dbRecord.id,
        });
      }
    }
  }

  // ── Compute aggregates ──
  const overallSentiment = parseFloat(
    (selectedSentiments.reduce((a, b) => a + b, 0) / (selectedSentiments.length || 1)).toFixed(3)
  );
  const negativeRatio = selectedSentiments.filter((s) => s < -0.2).length / (selectedSentiments.length || 1);
  const protestRisk = parseFloat(
    Math.min(1, negativeRatio * 1.5 + (overallSentiment < -0.3 ? 0.2 : 0)).toFixed(3)
  );

  const allConcerns: string[] = allAgents.flatMap((a: any) => a.concerns ?? []);
  const concernCount: Record<string, number> = {};
  for (const c of allConcerns) concernCount[c] = (concernCount[c] ?? 0) + 1;
  const topConcerns = Object.entries(concernCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([c]) => c);

  // ── Risk alerts ──
  const alertTitle = simulationTitle ?? `Simulation #${simulationId}`;
  if (protestRisk > 0.6) {
    await db.insert(riskAlertsTable).values({
      simulationId,
      simulationTitle: alertTitle,
      alertType: "high_protest_risk",
      severity: protestRisk > 0.8 ? "critical" : "high",
      description: `High protest risk at ${Math.round(protestRisk * 100)}% for "${title}". Multiple groups show strong opposition.`,
    });
  }
  if (overallSentiment < -0.5) {
    await db.insert(riskAlertsTable).values({
      simulationId,
      simulationTitle: alertTitle,
      alertType: "sentiment_collapse",
      severity: "high",
      description: `Sentiment collapsed to ${overallSentiment.toFixed(2)} for "${title}". The policy faces broad public resistance.`,
    });
  }

  const totalMessages = firstRoundDbRecords.length + (selectedSentiments.length - firstRoundDbRecords.length);

  return {
    messagesGenerated: totalMessages,
    agentsActivated: allAgents.length,
    sentimentScore: overallSentiment,
    protestRisk,
    topConcerns,
  };
}
