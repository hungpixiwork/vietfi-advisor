# VietFi Advisor Security Remediation Report

Date: 2026-04-16

## Executive Summary

The security review findings have been remediated in code. The project now has stricter auth redirects, server-side auth input validation, API payload limits, rate limiting on public/AI endpoints, safer service-worker caching, a production/development CSP split, a server-only Supabase admin boundary, an RLS migration, runtime validation for AI brief output, and a clean dependency audit.

No critical or high-severity issue remains confirmed from the local repository review. The main production follow-up is operational: apply and verify the new Supabase RLS migration in the live Supabase project, lock OAuth redirect allowlists to exact origins, and consider a durable shared rate limiter for multi-instance deployments.

## Scope And Tools

- Stack reviewed: Next.js 16, React 19, TypeScript, Supabase, Vercel route handlers, service worker/PWA, Gemini/AI SDK, Edge TTS.
- Guidance used: `security-best-practices` and Supabase/Postgres RLS best-practice checks.
- Tools used: Morph semantic search, `osgrep`, route-by-route inspection, targeted PowerShell searches, `npm audit --json`, `npm ls picomatch`, build/lint/test verification.
- Not verified locally: live Vercel headers, deployed environment variables, Supabase dashboard policies already present before migration, OAuth provider allowlists.

## Fixes Applied

### Supabase Authorization And Secret Boundaries

- Added `supabase/migrations/20260416000000_security_rls_policies.sql`.
- Enables and forces RLS for existing user-owned tables: `profiles`, `gamification`, `budget_pots`, `expenses`, and `debts`.
- Adds own-row policies using `(select auth.uid())`, including restrictive `WITH CHECK` policies for writes.
- Adds `user_id` indexes for user-owned finance tables when those tables exist.
- Added a dedicated server-only admin client in `src/lib/supabase/admin.ts`.
- Reworked `src/lib/supabase.ts` so browser and service-role concerns are no longer mixed in one helper.

### Auth Redirects And Login Input Validation

- Added canonical origin and safe redirect helpers in `src/lib/security/origin.ts`.
- Replaced Origin-header-derived OAuth callback URLs with configured canonical origins.
- Added `src/app/auth/confirm/route.ts` to exchange Supabase OAuth codes and redirect only to safe same-origin relative paths.
- Hardened `src/app/login/actions.ts` with server-side email/password validation and generic user-facing auth errors.
- Updated browser auth helpers and registration flow to use the canonical callback URL.

### API Abuse Controls

- Added `src/lib/api-security.ts` for shared request-body limits, JSON parsing, rate limiting, client identification, and safe JSON errors.
- Hardened `POST /api/chat` with a 64 KB body cap, max 12 messages, per-message and total content limits, role allowlisting/normalization, no-store headers, and rate limiting.
- Hardened `POST /api/tts` with a 4 KB body cap, max 500 text characters, bounded `rate`/`pitch` validation, no-store headers, and rate limiting.
- Added rate limits to public data endpoints: `/api/market-data`, `/api/news`, `/api/morning-brief`, and `/api/stock-screener`.
- Reworked `/api/stock-screener` to clamp numeric filters, allowlist exchanges, use bounded cache keys, and avoid unbounded parameter-driven cache misses.
- Added stock-universe caching in `src/lib/market-data/stock-screener.ts` so cheap filtering does not repeatedly amplify outbound crawler calls.
- Hardened portfolio projection/backtest APIs with rate limits, clamped capital inputs, allowlisted risk profiles, and no-store responses.

### Browser And PWA Hardening

- Reworked `next.config.ts` security headers.
- Split development and production CSP so production no longer uses `unsafe-eval` or broad WebSocket sources.
- Kept `unsafe-inline` temporarily because a nonce/hash rollout was out of scope and may affect Next hydration if done blindly.
- Rewrote `public/sw.js` to stop caching arbitrary pages and arbitrary `/api/*` responses.
- Service worker now caches only explicit public APIs and validates notification click URLs as same-origin dashboard paths.

### AI Output And Data Robustness

- Added runtime validation/normalization for Morning Brief AI output in `src/lib/morning-brief.ts`.
- Caps AI summary/takeaway lengths before rendering or caching.
- Preserves heuristic fallback behavior for malformed AI responses.

### Dependency And Build Hygiene

- Ran `npm audit fix`; `picomatch` is now patched to `2.3.2` in `package-lock.json`.
- Fixed strict TypeScript build blockers surfaced during production build.
- Restored dashboard and crawler/morning-brief tests to match current behavior while improving accessible status text and source metadata.

## Verification

- `npm audit --json`: 0 vulnerabilities.
- `npm run test:run`: 12 test files passed, 66 tests passed.
- `npm run build`: production build completed successfully.
- `npm run lint`: completed with 0 errors and 76 warnings. Warnings are existing unused imports/unused eslint-disable comments and hook dependency warnings, not new security failures.

Build note: the production build still prints existing Recharts container-size warnings during static generation. These are UI/runtime warnings, not security findings.

## Residual Production Follow-Ups

- Apply and verify `supabase/migrations/20260416000000_security_rls_policies.sql` in every Supabase environment.
- Export current Supabase dashboard schema/policies into migrations so the repository remains the source of truth.
- Lock Supabase Auth redirect URLs to exact local/staging/production origins; avoid wildcard redirect patterns.
- Replace in-memory rate limiting with a durable shared limiter such as Redis/Upstash or platform WAF rules before high-traffic production launch.
- Continue toward nonce/hash-based CSP so production can eventually remove `unsafe-inline`.
- Clean up the remaining lint warnings when convenient; they are not blocking the current security remediation.
