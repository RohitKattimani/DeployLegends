# Dystopia — Policy Simulation Platform

## Overview

Dystopia is a living digital twin simulation platform for Indian policymakers. It creates AI agent simulations of tier-1 Indian cities, generating authentic public reactions to proposed policies via subreddit-style debates. Decision-makers get powerful foresight to test policies safely before rollout.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec) — NOTE: Orval is currently broken ("Failed to resolve input"). Generated files in `lib/api-client-react/src/generated/` must be edited manually.
- **Build**: esbuild (CJS bundle)
- **Auth**: Clerk (OAuth)
- **Frontend**: React + Vite, Tailwind CSS, shadcn/ui, Recharts
- **3D visualization**: Three.js / @react-three/fiber / @react-three/drei
- **PDF parsing**: pdf-parse@1.1.1 (import from `pdf-parse/lib/pdf-parse.js` to avoid startup bug)

## Artifacts

- **dystopia** (`/`) — React+Vite frontend: landing page, consilium dashboard, simulation management, 3D city view, debate feed, analytics, threads page
- **api-server** (`/api`) — Express backend: simulations, agents, messages, analytics, consilium, risk alerts, PDF parse, vote, threads

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec (currently broken — edit generated files manually)
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

## Features

- **Consilium Dashboard** — Command center with aggregate metrics, risk alerts, sentiment trends, demographic breakdown
- **Policy Simulations** — Create, run, and analyze simulations for Mumbai, Delhi, Bengaluru, Chennai, Hyderabad
- **PDF Policy Upload** — Upload PDF policy documents in NewSimulation form; text is extracted and auto-fills the policy description field
- **AI Agent Archetypes** — 10 broader citizen archetypes: Transport Worker, Informal Trader, Student, Urban Professional, Household Manager, Small Business Owner, Civil Society, Senior Citizen, Daily Wage Worker, Salaried Professional (internal keys: transport_worker, informal_trader, student, urban_professional, household_manager, small_business_owner, civil_society, senior_citizen, daily_wage_worker, salaried_professional)
- **Real LLM-powered debates** — OpenAI GPT integration (via Replit AI Integrations) generates contextually aware messages for each archetype. Agents read the actual policy title and description and respond from their persona. Replies include the target message for cross-agent debate. Uses batchProcess with concurrency 5 for initial round and 3 for replies.
- **3D Agent Network** — Three.js force-directed graph with agent nodes colored by sentiment; labels show general display names
- **Debate Feed** — Subreddit-style message feed with typewriter animations, sentiment indicators, upvotes
- **Debate Threads Page** — Reddit-style page grouping messages by archetype; includes upvote/downvote with optimistic updates and sentiment popups
- **Upvote/Downvote** — Per-message voting with toggle behavior; stored in `message_votes` table; seed upvotes + user votes merged
- **Sentiment Distribution Bar** — Stacked bar in SimulationDetail showing breakdown of all 5 sentiment categories; click for popover detail
- **Real-time Analytics** — Sentiment over time, demographic breakdown, coalition formation, protest risk gauge, top concerns
- **Risk Alerts** — Automatic detection of high protest risk, sentiment collapse, coalition forming, viral opposition; alerts use actual simulation title
- **Dataset-Grounded Reasoning** — Agent messages optionally reference NSSO/Census/NASSCOM statistics for strongly-felt positions

## DB Schema

- `simulations` — Policy simulation runs with status, sentiment, protest risk
- `agents` — Citizen agent archetypes with bios, neighborhoods, concerns
- `debate_messages` — Agent-generated messages per simulation with upvotes, downvotes
- `message_votes` — Per-user vote records (message_id, user_id, value)
- `risk_alerts` — Auto-generated alerts for high-risk situations

## Auth

Using Clerk. Keys auto-provisioned. Manage users via the Auth pane in the workspace toolbar.

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.

## Known Issues / Notes

- `lib/api-zod/src/generated/types.ts` is an empty placeholder (orval generated this file previously; now it is a stub to prevent build errors)
- Agents are global (not per-simulation) — all simulations share the same 10 agent rows
- `pdf-parse@1.1.1` must be imported from `pdf-parse/lib/pdf-parse.js` to avoid the startup test-file read bug
