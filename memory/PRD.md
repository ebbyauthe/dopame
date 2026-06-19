# Dopame — Product Requirements Document

## Original Problem Statement
Dopame: an AI-powered personal operating system unifying Finance (Plaid), Fitness, Nutrition, Communication coaching, Goals, Habits, Journaling, AI Coaching, AI Insights, Gamification, and Growth Analytics into one premium, Apple-level dashboard. Per-user accounts. AI via Groq.

## Architecture
- **Backend**: FastAPI (modular routers) + MongoDB (motor). `core.py` = shared auth (JWT Bearer + httpOnly cookie), Groq text/vision helpers, Emergent object storage, XP/level/gamification. Routers: auth, tracking (habits/goals/journal), finance (Plaid), fitness, nutrition, comm, coach (dashboard/coach/reports).
- **Frontend**: React 19 + react-router v7, Tailwind, framer-motion, recharts, react-plaid-link, react-markdown, sonner, lucide-react. Outfit display font, glassmorphism, bento grids. Auth token in localStorage (`dopame_token`) + axios Bearer interceptor + withCredentials.
- **Integrations**: Plaid (sandbox), Groq text `llama-3.3-70b-versatile` + vision `meta-llama/llama-4-scout-17b-16e-instruct`, Emergent object storage for photos.

## Personas
- Ambitious self-optimizers wanting finance, body, mind and habits in one intelligent dashboard.

## Implemented (2026-06-19)
- ✅ JWT auth (Bearer + cookie), demo seed (demo@dopame.app / Dopame123!), XP/levels.
- ✅ Finance: Plaid Link (sandbox) connect/exchange/sync, accounts, transactions (Plaid + manual), categorization, net worth (assets/liabilities + bank balances), cash-flow trend, category breakdown.
- ✅ Fitness: workouts (exercises/sets/volume), bodyweight trend, PRs, recent-workouts list, AI workout analysis (Groq), progress photos w/ Groq vision analysis + object storage.
- ✅ Nutrition: manual food log, AI meal-photo macro analysis (Groq vision), macro rings vs goals, editable goals.
- ✅ Communication: Duolingo-style simulator (8 modes), AI evaluation (grammar/vocab/clarity/confidence/professionalism/tone) + corrections/tips + continuation, progress scoring & streak.
- ✅ Habits/Goals/Journal (+XP), AI Coach (data-aware Groq), Weekly/Monthly AI reports.
- ✅ Unified Dashboard: Life Score (6-area weighted), module cards, charts, achievements (12 badges), gamification.
- ✅ Verified: backend 27/27 pytest; testing agent confirmed real-browser login→dashboard (no bounce) + all module flows.

## Known Limitations / Backlog
- P1: Plaid Link iframe not browser-automation tested (sandbox login user_good/pass_good) — manual UI verify recommended; backend link-token/exchange/sync work.
- P1: Wrap Groq calls in asyncio.to_thread (currently sync → blocks event loop under concurrency); add rate limiting on AI endpoints.
- P1: Brute-force lockout on login; file size/type validation on photo uploads.
- P2: Cache Plaid balances in DB (avoid accounts_get on every /summary); Mongo aggregation for dashboard at scale; daily communication challenges; notifications/reminders; recurring transaction insights.
- Polish: silence Recharts ResponsiveContainer width/height warnings.

## Next Tasks
- Manual-verify Plaid Link sandbox connect end-to-end in browser.
- Make AI calls non-blocking + add throttling.
