# Dopame — Product Requirements Document

## Original Problem Statement
Build **Dopame**, a premium, Apple-level personal operating system for self-improvement, growth, discipline, achievement and personal development. Visual identity blends a personal OS, fitness tracker, financial dashboard, and AI coach. Modern, minimalist, smooth animations, highly responsive.

## User Choices
- All core features: habit tracking + streaks, goals & milestones, daily journal/mood log, AI coach
- User accounts required (JWT email/password auth)
- AI coach powered by **Groq** (model: `llama-3.3-70b-versatile`), user-provided key
- Apple-style light & minimal aesthetic
- Dashboard: streak count, weekly progress chart, achievement badges, today's tasks

## Architecture
- **Backend**: FastAPI + MongoDB (motor). JWT auth via httpOnly cookie + bearer token, bcrypt hashing. Routes under `/api`.
- **Frontend**: React 19 + react-router v7, Tailwind, framer-motion, recharts, sonner, lucide-react. Outfit display font, glassmorphism, bento grids.
- **AI**: Groq SDK, context-aware coach (injects user's habits/goals), chat history persisted in Mongo.

## User Personas
- Self-improvers who want one focused space to build habits, track goals, journal, and get AI guidance.

## Core Requirements (static)
- Auth, Habits (+streaks +7-day history), Goals (+milestones +progress), Journal (+mood), AI Coach, Dashboard stats, Achievements, Profile.

## Implemented (2026-06-19)
- ✅ JWT auth: register/login/logout/me/profile, demo seed (demo@dopame.app / Dopame123!)
- ✅ Habits: create, toggle complete, streak calc, 7-day heatmap, delete
- ✅ Goals: create with milestones, toggle milestone → progress %, categories, delete
- ✅ Journal: mood selector (1–5), entries list, delete
- ✅ AI Coach: Groq live chat, context-aware, suggestions, clear history
- ✅ Dashboard: stat cards, weekly momentum area chart, goal radial, mood trend, achievements grid (8 badges)
- ✅ Landing page, responsive AppShell with sidebar/mobile drawer
- ✅ Verified by testing agent: backend 13/13, frontend 100% on critical flows

## Backlog / Next Tasks
- P1: Email reminders/notifications, brute-force lockout on login, streak freeze/protection
- P1: Real-time streaming of AI coach responses (SSE)
- P2: Habit scheduling (specific days), goal target dates surfacing, dark mode
- P2: Onboarding flow, weekly insights summary from AI, export data
- Polish: silence Recharts ResponsiveContainer console warnings
