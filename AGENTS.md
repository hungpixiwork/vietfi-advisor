# AGENTS.md

This file provides guidance to Codex (Codex.ai/code) when working with code in this repository.

## Project Overview

VietFi Advisor is an AI-powered personal finance app for Vietnamese users, featuring Vẹt Vàng (Golden Parrot) AI — a sarcastic Duolingo-style mascot. Built with Next.js 16 + React 19, deployed on Vercel.

---

## WDA2026 Task Delegation (Hưng vs Hoàng)

- **Hoàng (Human Dev/Night Shift):** Responsible for Data Crawling, Security enhancements, and UI refinements.
- **Hưng (AI Agent/Day Shift):** Responsible for Feature Development (Business Logic/Calculations), writing Prompts, and strictly validating all features against the WDA2026 Competition Rules (Problem 1: Centralized Debt Hub & Problem 2: AI Financial Advisor).

---

## Commands

```bash
npm run dev     # Start dev server → http://localhost:3000
npm run build   # Production build
npm run lint    # ESLint (eslint.config.mjs, ESLint 9)
npm test        # Vitest unit tests (watch mode)
npm run test:run      # Vitest unit tests (single run)
npm run test:e2e     # Playwright E2E tests
npm run test:e2e:ui  # Playwright E2E with UI mode
npm run test:e2e:headed # Playwright E2E in headed mode
npm run test:e2e:debug  # Playwright E2E debug mode
```

**Required env vars** (documented in README):
```
GEMINI_API_KEY=          # Required — Google AI API key (or VERTEX_API for Gemini on GCloud)
GEMINI_BASE_URL=         # Optional — proxy URL (e.g. Cloudflare Worker)
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
CRON_SECRET=
```

---

## Architecture

### Strategic Guidelines (WDA2026 Core Philosophy)

1. **Vercel Cron Limits & Client-Side First:** Vercel Hobby limits cron jobs to 1/day and 10s execution. Therefore, MAXIMIZE client-side processing (localStorage) and avoid heavy server-side background tasks.
2. **Generative AI Usage:** Use `gemini-batch.ts` for bulk AI processing (e.g., Morning Briefs, News summaries) to save costs and avoid timeouts. Reserve the interactive streaming `api/chat` strictly for user conversations.
3. **Mascot Persona (CRITICAL VIRAL FEATURE):** Vẹt Vàng (Golden Parrot) MUST BE the most sarcastic, street-smart, and brutally honest financial advisor in Vietnam. Do not write polite, generic AI responses. The chat is the core viral loop to build user habits.

### Vẹt Vàng Companion (see `docs/ARCHITECTURE.md`)

1. **Tier 1 — deterministic** (`src/lib/companion/intent.ts`, `amount.ts`, `transaction-parser.ts`) — logging ("phở 35k, cà phê 25k"), today/month/budget questions, edit/undo. 0 API calls, works offline.
2. **Tier 2 — LLM intent extraction** (`POST /api/companion/interpret`) — only for sentences tier 1 can't place. Receives the sentence only (no balances/history), output validated with zod.
3. **Engine** (`src/lib/companion/finance-snapshot.ts`) — every number in a reply comes from here, never from the LLM.
4. **Writes** go ONLY through `src/lib/stores/transaction-store.ts` (idempotent by id, verified after write, broadcasts `vietfi:finance-changed`). Any data change from chat is a proposal the user confirms.

`POST /api/chat`, `scripted-responses.ts` and `expense-parser.ts` are legacy (the chat route was removed in `34f06ee`).

### News System

- **Crawl source**: CafeF RSS feeds via `src/lib/news/crawler.ts`
- **Sentiment analysis**: Gemini-powered sentiment tagging per article
- **AI summaries**: `gemini-batch.ts` for cost-efficient bulk summarization
- **Cache**: Results cached to avoid redundant API calls

### Morning Brief

- **Endpoint**: `POST /api/morning-brief` — AI Morning Brief (Node.js runtime)
- **Generation**: `src/lib/morning-brief.ts` with `getMorningBriefCached`
- **Sources**: `'gemini'` (full AI) or `'heuristic'` (rule-based fallback)
- **Cache**: 24-hour TTL to avoid redundant generation
- **Cron**: `POST /api/cron/morning-brief` for Vercel scheduled generation

### Stock Screener

- **Endpoint**: `GET /api/stock-screener` — VN stock screening
- **Params**: `maxPE`, `maxPB`, `minROE`, `minMarketCap`, `minRating`, `exchange`
- **Cache**: 30-minute TTL via `src/lib/market-data/stock-screener.ts`

### API Routes

- **`POST /api/companion/interpret`** — Node.js Runtime. Tier-2 intent extraction for Vẹt Vàng (message only, zod-validated, 8s timeout, 20 req/min/IP).
- **`POST /api/tts`** — Node.js Runtime. Edge TTS (Microsoft, free Vietnamese voice `vi-VN-HoaiMyNeural`). Returns audio blob.
- **`GET /api/market-data`** — Node.js Runtime. Returns live `MarketSnapshot`: VN-Index (cafef), Gold SJC (Yahoo Finance USD/oz → VND/tael), USD/VND (SBV homepage with open.er-api.com fallback). Auto-refreshes every 5 minutes.
- **`POST /api/cron/market-data`** — Node.js Runtime. CRON_SECRET Bearer auth. Same data as `/api/market-data` for Vercel cron scheduling.
- **`GET /api/market`** — *(deprecated alias, points to `/api/market-data`)*
- **`POST /api/morning-brief`** — Node.js Runtime. AI Morning Brief generation with 24h cache. Source: `'gemini'` or `'heuristic'`.
- **`GET /api/news`** — Node.js Runtime. News crawl from CafeF RSS + Gemini sentiment analysis.
- **`GET /api/stock-screener`** — Node.js Runtime. VN stock screening with 30-min cache. Params: `maxPE`, `maxPB`, `minROE`, `minMarketCap`, `minRating`, `exchange`.
- **`POST /api/cron/morning-brief`** — Node.js Runtime. CRON_SECRET Bearer auth. Triggers morning brief generation on schedule.

### Data Persistence

- **Guest users**: localStorage (budget pots, expenses, debts, gamification, onboarding state)
- **Logged-in users**: Supabase PostgreSQL (RLS-protected, migration tooling ready)
- `src/lib/supabase/client.ts` — Browser singleton Supabase client
- `src/lib/supabase/server.ts` — Server-side Supabase client (for Server Components / Route Handlers)
- `src/lib/supabase/middleware.ts` — SSR auth helper for Middleware
- `src/lib/supabase/migrate-local.ts` — One-time localStorage → Supabase migration (sets `vietfi_migrated` flag)
- `src/lib/supabase/user-data.ts` — Hybrid DAL: Supabase for logged-in users, localStorage fallback for guests

### Gamification System (`src/lib/gamification.ts`)

XP engine with 8 action types (log_expense=10, pay_debt=50, etc.), 5 mascot levels, daily quests, streak tracking, and 8 badges (bronze/silver/gold/diamond tiers). All state lives in localStorage under keys managed by this module.

### Calculation Engines (pure TypeScript, no AI calls)

| File | Purpose |
|------|---------|
| `src/lib/calculations/debt-optimizer.ts` | DTI + Snowball/Avalanche month-by-month simulation |
| `src/lib/calculations/fg-index.ts` | Fear & Greed Index for VN market (5 weighted indicators) |
| `src/lib/calculations/personal-cpi.ts` | Personal inflation vs official CPI (7 GSO categories) |
| `src/lib/calculations/risk-scoring.ts` | 5 prospect theory questions → risk profile + allocation |

### Dashboard Layout (`src/app/dashboard/`)

All dashboard pages share `dashboard/layout.tsx` which mounts: sidebar navigation, `GamificationBar`, and `VetVangFloat` mascot. New dashboard pages go here and are auto-discovered by the sidebar.

**Existing pages**: budget, debt, housing, leaderboard, learn, macro, market, news, personal-cpi, portfolio, risk-profile, screener, sentiment

### Key lib Files

| File | Purpose |
|------|---------|
| `src/lib/storage.ts` | Typed localStorage wrapper — 36 typed accessors for all 18 localStorage keys, server-safe |
| `src/lib/types/budget.ts` | Shared `BudgetPot` and `Expense` type definitions |
| `src/lib/supabase/useUserData.ts` | React hooks: `useUserBudget`, `useUserDebts`, `useUserGamification` (hybrid DAL) |
| `src/lib/gemini-batch.ts` | Gemini batch API (50% cheaper vs interactive), used for Morning Briefs & News summaries |
| `src/lib/morning-brief.ts` | Morning brief generation with 24h cache + heuristic fallback |
| `src/lib/news/crawler.ts` | News crawling from CafeF RSS feeds |
| `src/lib/market-data/stock-screener.ts` | VN stock screening logic |
| `src/lib/market-data/crawler.ts` | Market data crawling (VN-Index, Gold, USD/VND) |
| `src/lib/market-data/parser.ts` | Market data parsing & normalization |
| `src/lib/market-alert.ts` | Push notification alerts for market price movements |
| `src/lib/sounds.ts` | Sound effect management |
| `src/lib/utils.ts` | General utility functions |
| `src/lib/onboarding-state.ts` | Onboarding state management |
| `src/components/vet-vang/AnimatedParrot.tsx` | Lottie-based animated mascot component |

### Extracted Dashboard Components

| Component | Location | Purpose |
|-----------|----------|---------|
| `MarketSection` | `src/app/dashboard/components/MarketSection.tsx` | High-fidelity market grid (lg:col-span-12), side-by-side pinned element support, FG gauge, and synchronized Cyber-Technical cards. |
| `NetWorthCard` | `src/app/dashboard/page.tsx` | Signature feature: Large-scale metric display (Triệu/Tỷ VND), monthly growth bar chart with tooltips, and localized vault status. |
| `DailyQuestSection` | `src/app/dashboard/components/DailyQuestSection.tsx` | Self-contained quest polling, completion toast, confetti using the Cyber-Technical design language. |
| `NotificationBanner` | `src/app/dashboard/components/NotificationBanner.tsx` | Push notification permission banner, self-managed dismissed state. |

> `src/app/dashboard/page.tsx` — Orchestrates the master dashboard layout. Uses a logic-driven side-by-side grid for Net Worth and Market metrics. All components follow the synchronized "Cyber-Technical" aesthetic.

### Animations & Mascot

- **Framer Motion**: Component animations throughout the UI
- **Lottie**: Mascot animation parts in `public/animations/`
- `src/components/vet-vang/AnimatedParrot.tsx` — Lottie-powered animated Vẹt Vàng
- `src/app/test/lottie/page.tsx` — Test page for Lottie animation development

### PWA

- Service worker at `public/sw.js` for offline support

---

## Code Style

- **Path alias**: `@/*` maps to `./src/*` (tsconfig.json)
- **Styling**: Tailwind CSS v4 (`src/app/globals.css`). CSS custom properties + `.glass-card`, `.text-gradient`, `.bg-gradient-primary` utility classes are defined there. Do not use inline styles for these.
- **Animations**: Framer Motion for component animations. Lottie JSON parts for the mascot in `public/animations/`.
- **TypeScript**: Strict mode. Small, focused files (200–500 lines typical). Extract utilities rather than adding to large modules.
- **Vietnamese context**: All UI text, canned responses, and financial logic must use Vietnamese currency (VND), Vietnamese financial terminology, and VN-specific financial context (SJC gold, VN-Index, USD/VND, Sacombank Eximbank rates).

---
