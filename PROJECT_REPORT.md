# Dopame Project Report

Generated: 2026-06-19

## Executive Summary

Dopame is an AI-powered personal operating system for self-improvement. It combines authentication, habits, goals, journaling, finance, fitness, nutrition, communication coaching, AI chat, reports, XP, levels, achievements, and a unified dashboard.

The project is a full-stack web app:

- Backend: FastAPI, MongoDB via Motor, JWT auth, Groq AI, Plaid integration.
- Frontend: React 19, React Router, Tailwind CSS, Recharts, Framer Motion, Plaid Link, Sonner, Lucide icons.
- Testing: Backend API regression coverage exists and the latest stored pytest report shows 27/27 passing tests against a preview environment.

Overall, the codebase is feature-rich and coherent for an MVP/prototype. The biggest production-readiness gaps are synchronous AI/Plaid calls inside async endpoints, missing rate limits and upload validation, limited operational hardening, and some frontend issues noted by prior test reports.

## Project Structure

```text
dopame/
  backend/
    core.py
    server.py
    routes_auth.py
    routes_tracking.py
    routes_finance.py
    routes_fitness.py
    routes_nutrition.py
    routes_comm.py
    routes_coach.py
    requirements.txt
    tests/
  frontend/
    package.json
    craco.config.js
    tailwind.config.js
    src/
      App.js
      context/AuthContext.jsx
      lib/api.js
      components/
      pages/
      components/ui/
  memory/
    PRD.md
  test_reports/
  test_result.md
  design_guidelines.json
```

The repository contains about 113 non-dependency files and roughly 389 KB of project content, excluding `.git`, `node_modules`, build, and dist directories.

## Product Scope

The product intent is documented in `memory/PRD.md`: Dopame is meant to be a premium, Apple-like dashboard that unifies life-management domains into one account-based AI coach experience.

Implemented product areas include:

- Auth: registration, login, logout, profile, JWT bearer token and httpOnly cookie support.
- Dashboard: life score, module summaries, weekly habit momentum, achievements, level/XP.
- Finance: Plaid Link token flow, public token exchange, transaction sync, manual transactions, accounts, assets, liabilities, net worth, spending categories, cash-flow trend.
- Fitness: workouts, exercise sets, workout volume, bodyweight logs, personal records, AI workout analysis, progress photo analysis.
- Nutrition: manual food logging, macro goals, daily summary, meal photo nutrition estimation.
- Communication: role-play scenarios, AI scoring, tips, corrections, progress summary, streak.
- Habits: habit creation, daily toggle, streak computation, archive delete.
- Goals: milestones, progress calculation, completion detection.
- Journal: mood and reflection entries.
- AI Coach: data-aware chat history and weekly/monthly reports.

## Backend Architecture

The backend is organized around FastAPI routers:

- `server.py`: creates the FastAPI app, mounts routers, configures CORS, seeds the demo/admin user on startup, and creates Mongo indexes.
- `core.py`: shared Mongo client, auth helpers, JWT creation/validation, password hashing, Groq wrappers, time helpers, document cleanup, XP/level helpers.
- `routes_auth.py`: account and profile endpoints.
- `routes_tracking.py`: habits, goals, milestones, journal.
- `routes_finance.py`: Plaid, transactions, assets, finance summary.
- `routes_fitness.py`: workouts, weight logs, workout analysis, progress photos.
- `routes_nutrition.py`: food logs, photo analysis, nutrition goals/summary.
- `routes_comm.py`: communication modes, sessions, AI evaluation, progress scoring.
- `routes_coach.py`: dashboard aggregation, achievements, AI coach, reports.

The API is mostly REST-shaped and uses Mongo collections directly rather than a repository or service layer. That keeps the MVP compact, but some aggregation paths will get expensive as data grows.

## Backend API Surface

Root and auth:

- `GET /api/`
- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me`
- `PUT /api/auth/profile`

Tracking:

- `GET/POST /api/habits`
- `POST /api/habits/{habit_id}/toggle`
- `DELETE /api/habits/{habit_id}`
- `GET/POST /api/goals`
- `PUT/DELETE /api/goals/{goal_id}`
- `POST /api/goals/{goal_id}/milestone/{ms_id}/toggle`
- `GET/POST /api/journal`
- `DELETE /api/journal/{entry_id}`

Finance:

- `POST /api/finance/plaid/link-token`
- `POST /api/finance/plaid/exchange`
- `POST /api/finance/sync`
- `GET /api/finance/accounts`
- `GET/POST /api/finance/transactions`
- `DELETE /api/finance/transactions/{txn_id}`
- `GET/POST /api/finance/assets`
- `DELETE /api/finance/assets/{asset_id}`
- `GET /api/finance/summary`

Fitness:

- `GET/POST /api/fitness/workouts`
- `DELETE /api/fitness/workouts/{wid}`
- `GET/POST /api/fitness/weight`
- `GET /api/fitness/summary`
- `POST /api/fitness/analyze`
- `POST /api/fitness/photos`
- `GET /api/fitness/photos`
- `DELETE /api/fitness/photos/{pid}`

Nutrition:

- `GET/POST /api/nutrition/log`
- `DELETE /api/nutrition/log/{fid}`
- `POST /api/nutrition/analyze-photo`
- `GET/POST /api/nutrition/goal`
- `GET /api/nutrition/summary`

Communication and coach:

- `GET /api/comm/modes`
- `GET /api/comm/sessions`
- `GET/DELETE /api/comm/session/{sid}`
- `POST /api/comm/session`
- `POST /api/comm/session/{sid}/reply`
- `GET /api/comm/progress`
- `GET /api/dashboard`
- `GET /api/coach/history`
- `DELETE /api/coach/history`
- `POST /api/coach/chat`
- `GET /api/reports/{period}`

## Frontend Architecture

The frontend is a single-page React app using React Router:

- Public routes: landing, login, register.
- Protected app route: `/app`, wrapped in `AppShell`.
- Feature pages: dashboard, finance, fitness, nutrition, communication, habits, goals, journal, coach, reports, profile.

Important frontend modules:

- `src/App.js`: route definitions and protected/public route gates.
- `src/context/AuthContext.jsx`: user state, login/register/logout, initial `/auth/me` check.
- `src/lib/api.js`: Axios API client, `dopame_token` localStorage key, bearer-token interceptor, error formatting.
- `src/components/AppShell.jsx`: sidebar navigation, mobile menu, profile/logout controls.
- `src/pages/*.jsx`: feature screens.
- `src/components/ui/*`: shadcn/Radix-style component primitives.

The UI style follows the included design guide: light theme, slate/white surfaces, rounded cards, glass header/sidebar effects, Outfit display font, Recharts charts, Framer Motion transitions, and lucide-react icons.

## Integrations

External integrations found in the code:

- MongoDB: required via `MONGO_URL` and `DB_NAME`.
- JWT: required via `JWT_SECRET`.
- Groq text AI: default model `llama-3.3-70b-versatile`.
- Groq vision AI: default model `meta-llama/llama-4-scout-17b-16e-instruct`.
- Plaid: `PLAID_CLIENT_ID`, `PLAID_SECRET`, optional `PLAID_ENV`, using Transactions product.
- Frontend API URL: `REACT_APP_BACKEND_URL`.

The PRD mentions object storage for photos, but the current backend progress-photo route stores AI analysis metadata only. The frontend tries to render photos using `p.storage_path` and `/api/fitness/file`, but the backend does not define that file-serving endpoint in the code I read.

## Data Model Overview

Mongo collections are used directly. The main collections implied by the code are:

- `users`
- `habits`
- `habit_logs`
- `goals`
- `journal_entries`
- `plaid_items`
- `transactions`
- `assets`
- `workouts`
- `weight_logs`
- `progress_photos`
- `food_logs`
- `nutrition_goals`
- `comm_sessions`
- `chat_messages`

Documents store `user_id` as a stringified Mongo ObjectId. Public responses generally remove `user_id` and expose `_id` as `id` through `clean()`.

## Testing Status

Existing tests:

- `backend/tests/backend_test.py`: auth, habits, goals, journal, dashboard, coach, logout.
- `backend/tests/test_modules.py`: finance, fitness, nutrition, communication, reports, dashboard keys.
- `test_reports/pytest/pytest_results.xml`: 27 tests, 0 failures, 0 errors, 0 skipped, 12.831 seconds.
- `test_reports/iteration_1.json` and `test_reports/iteration_2.json`: prior browser/API testing summaries.

Stored latest result:

- Backend: 27/27 passing against the configured preview URL.
- Frontend browser smoke: most critical flows verified in prior report.
- Known prior frontend note: fitness workout save UI did not visibly show the new workout immediately during one browser test.
- Known prior browser note: Plaid Link iframe was not automated end to end.

Local validation attempted:

```text
cd frontend
npm run build
```

Result: build could not start because local frontend dependencies are not installed. The shell reported that `craco` is not recognized, which usually means `node_modules` is missing or dependencies have not been installed.

## Strengths

- Broad feature coverage for a self-improvement dashboard MVP.
- Backend router organization is easy to follow.
- Auth flow supports both cookie and bearer token modes.
- Demo user seeding is idempotent and updates the password hash if configured credentials change.
- Tests cover many backend user flows and live AI-dependent routes.
- Frontend has a consistent visual language and clear page separation.
- Dashboard aggregation ties the product domains together instead of leaving them isolated.
- Test IDs are present across many important UI actions for automation.

## Risks And Issues

### High Priority

1. AI calls are synchronous inside async FastAPI routes.
   - `groq_chat()` and `groq_vision()` call the Groq SDK directly.
   - Routes such as coach chat, reports, fitness analysis, communication evaluation, and photo analysis can block the event loop under load.
   - Recommendation: wrap sync AI calls with `asyncio.to_thread()` or use an async client pattern.

2. No rate limiting on costly AI endpoints.
   - A user can repeatedly call chat, reports, communication evaluation, workout analysis, and vision analysis.
   - Recommendation: add per-user/IP throttling and possibly daily quota controls.

3. Upload endpoints lack file validation.
   - Nutrition and fitness photo endpoints read the full upload into memory and base64 encode it.
   - Recommendation: validate MIME type, file size, and possibly image dimensions before calling Groq vision.

4. Progress photo frontend/backend mismatch.
   - Frontend expects `storage_path` and `/api/fitness/file`.
   - Backend `upload_photo()` does not store the file or return `storage_path`, and no `/api/fitness/file` route exists.
   - Recommendation: either implement storage/file serving or remove image rendering and make the feature analysis-only.

5. Auth lacks brute-force protection.
   - Login attempts are not rate-limited or locked out.
   - Recommendation: add login throttling and audit failed attempts.

### Medium Priority

1. Plaid balance fetches happen during finance summary.
   - `/api/finance/summary` calls Plaid accounts APIs for connected items.
   - Recommendation: cache balances and refresh them during sync or a scheduled job.

2. Dashboard and summaries use broad in-memory reads.
   - Several functions pull large lists from Mongo and summarize in Python.
   - Recommendation: add aggregation pipelines or bounded queries as usage grows.

3. Cookie security is development-oriented.
   - `set_auth_cookie()` uses `secure=False`.
   - Recommendation: enable secure cookies in production and configure same-site policy intentionally.

4. Some ObjectId conversions lack defensive handling.
   - Invalid path IDs can raise conversion errors instead of returning clean 400/404 responses.
   - Recommendation: centralize ObjectId validation.

5. Nutrition page filter is ineffective.
   - `log.filter((i) => i.date === summary.today_date || true)` always returns all records.
   - Recommendation: return `today_date` from the summary or remove the dead filter.

### Low Priority / Polish

1. Mojibake characters appear in source and rendered strings.
   - Examples include broken apostrophes, bullets, dashes, emoji, and symbols in several files and reports.
   - Recommendation: normalize files to UTF-8 and replace corrupted text.

2. Recharts ResponsiveContainer warnings were reported.
   - Prior reports mention width/height warnings on Dashboard.
   - Recommendation: add explicit min heights/aspect constraints to chart containers.

3. Dependency footprint is broad.
   - Backend requirements include many packages not obviously used by the app.
   - Recommendation: trim dependencies before production deployment.

4. Root README is effectively empty.
   - Recommendation: add setup, env vars, run commands, test commands, and deployment notes.

## Suggested Next Steps

1. Install dependencies locally and run real validation.
   - Frontend: `npm install` or `yarn install`, then `npm run build`.
   - Backend: install `backend/requirements.txt`, provide env vars, run pytest.

2. Fix production blockers.
   - Make AI calls non-blocking.
   - Add rate limits.
   - Add upload validation.
   - Resolve progress-photo storage mismatch.
   - Add login throttling.

3. Improve operational readiness.
   - Add a full README.
   - Document required environment variables.
   - Define development and production cookie/CORS settings.
   - Cache Plaid balances.

4. Clean frontend quality issues.
   - Normalize corrupted text.
   - Fix nutrition today filter.
   - Confirm fitness workout save UI refresh.
   - Fix Recharts warnings.

5. Expand test confidence.
   - Add local backend tests with mocked Groq/Plaid where possible.
   - Add frontend smoke/build checks in CI.
   - Manually verify Plaid Link sandbox end to end.

## Final Assessment

Dopame is a strong prototype with a clear product direction and a surprisingly complete feature set. The backend and frontend are aligned around a unified personal-growth dashboard, and the test artifacts show meaningful regression coverage. The code is not yet production-hardened, but the main risks are identifiable and fixable without a rewrite.

The highest-value engineering work now is reliability and hardening: non-blocking external calls, rate limits, upload validation, Plaid caching, and closing the progress-photo API/UI mismatch.
