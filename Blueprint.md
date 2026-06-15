# Habit Streak Predictor — Build Blueprint

**Stack:** Next.js (App Router) · Drizzle ORM · Neon · Better Auth · Tailwind CSS · shadcn/ui · Sonner · Zod · pnpm

---

## 0. Project Philosophy

This app does two things well:
1. **Track** — log daily habit completions with a GitHub-style activity graph.
2. **Predict** — surface a Bayesian break-probability so users know how fragile their streak really is.

The math runs on the server. The UI is reactive but never chatty. Every number shown has a formula behind it.

---

## 1. Repo & Tooling Setup

### 1.1 Initialise

```
pnpm create next-app habit-predictor --typescript --tailwind --app --src-dir
cd habit-predictor
```

### 1.2 Install all dependencies in one pass

**Core runtime**
- `drizzle-orm` `@neondatabase/serverless` `drizzle-kit`
- `better-auth`
- `zod`
- `sonner`
- `date-fns` (date arithmetic for the rolling window and calendar grid)

**shadcn/ui** — initialise with `pnpm dlx shadcn@latest init`, then add:
`card` `badge` `button` `skeleton` `dialog` `input` `label` `select` `separator` `tooltip` `progress` `tabs` `avatar` `dropdown-menu` `alert` `sheet`

**Dev**
- `drizzle-kit` `@types/node`

### 1.3 Environment variables (`.env.local`)

```
DATABASE_URL=           # Neon connection string (pooled)
BETTER_AUTH_SECRET=     # 32-char random string
BETTER_AUTH_URL=        # http://localhost:3000 in dev
```

---

## 2. Database Schema (Drizzle)

File: `src/db/schema.ts`

### Tables

#### `users`
Managed by Better Auth. Do not define manually — Better Auth migrations create this. Reference it by `id` (uuid) in foreign keys.

#### `habits`
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | default random |
| userId | uuid FK → users.id | cascade delete |
| name | varchar(120) | not null |
| description | varchar(300) | nullable |
| color | varchar(7) | hex, default `#22c55e` |
| createdAt | timestamp | default now |
| archivedAt | timestamp | nullable — soft delete |

#### `completions`
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| habitId | uuid FK → habits.id | cascade delete |
| userId | uuid FK → users.id | cascade delete |
| completedAt | timestamp | default now |
| note | varchar(280) | nullable, mood/journal |

Add a unique index on `(habitId, completedAt::date)` — one completion per habit per calendar day.

#### `habit_stats` (materialised cache)
| Column | Type | Notes |
|---|---|---|
| habitId | uuid PK FK | |
| currentStreak | int | recomputed on each write |
| longestStreak | int | |
| totalCompletions | int | |
| lastComputed | timestamp | |
| breakProbability | numeric(5,4) | 0.0000–1.0000 |
| riskLabel | varchar(6) | `low` `medium` `high` |

> **Why materialise?** Break-probability queries scan 30 days of data grouped by weekday. Doing this on every page load is wasteful. Recompute only when a completion is added or deleted.

### Drizzle config (`drizzle.config.ts`)

Point to `src/db/schema.ts`, use `@neondatabase/serverless` driver, output migrations to `src/db/migrations/`.

---

## 3. Authentication (Better Auth)

File: `src/lib/auth.ts`

- Use `betterAuth({ database: neonAdapter, emailAndPassword: { enabled: true }, session: { cookieCache: { enabled: true } } })`
- Create `src/app/api/auth/[...all]/route.ts` as the catch-all handler.
- Export a typed `auth` client from `src/lib/auth-client.ts` for use in Client Components.
- Middleware (`src/middleware.ts`): protect all routes under `/app/*`. Redirect unauthenticated users to `/login`.

### Auth pages (under `src/app/(auth)/`)

- `/login` — email + password, link to register
- `/register` — name, email, password (Zod-validated)
- Both pages: centered card layout, no nav

---

## 4. App Architecture

```
src/
├── app/
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   └── register/page.tsx
│   ├── (app)/                      ← protected layout
│   │   ├── layout.tsx              ← sidebar + topbar shell
│   │   ├── dashboard/page.tsx      ← main screen
│   │   ├── habits/
│   │   │   ├── page.tsx            ← list all habits
│   │   │   ├── new/page.tsx        ← create habit
│   │   │   └── [id]/page.tsx       ← single habit detail
│   │   └── settings/page.tsx
│   └── api/
│       ├── auth/[...all]/route.ts
│       ├── habits/
│       │   ├── route.ts            ← GET list, POST create
│       │   └── [id]/
│       │       ├── route.ts        ← GET, PATCH, DELETE
│       │       └── complete/route.ts ← POST log, DELETE undo
│       └── stats/[habitId]/route.ts
├── components/
│   ├── habit-card.tsx
│   ├── activity-graph.tsx          ← GitHub-style grid
│   ├── risk-meter.tsx
│   ├── streak-badge.tsx
│   └── completion-button.tsx
├── db/
│   ├── schema.ts
│   ├── index.ts                    ← drizzle client (singleton)
│   └── migrations/
├── lib/
│   ├── auth.ts
│   ├── auth-client.ts
│   ├── stats.ts                    ← all probability math
│   ├── validations.ts              ← Zod schemas
│   └── utils.ts
└── hooks/
    ├── use-habits.ts
    └── use-today.ts
```

---

## 5. API Routes

All routes validate input with Zod. All routes authenticate via Better Auth session cookie. Return consistent shape: `{ data, error }`.

### `GET /api/habits`
- Returns all non-archived habits for the session user.
- Join with `habit_stats` to include `currentStreak`, `breakProbability`, `riskLabel`.
- Cache with `unstable_cache` keyed to `userId`, revalidate on write.

### `POST /api/habits`
- Body: `{ name, description?, color? }` — validated by Zod `createHabitSchema`.
- Insert into `habits`, insert default row into `habit_stats`.
- Revalidate cache tag `habits:${userId}`.
- Return created habit. Trigger Sonner toast from the client.

### `PATCH /api/habits/[id]`
- Body: `{ name?, description?, color?, archivedAt? }` — partial Zod schema.
- Only the owner can modify.

### `DELETE /api/habits/[id]`
- Soft delete: set `archivedAt = now()`. Hard delete is not exposed to users.

### `POST /api/habits/[id]/complete`
- Body: `{ date?: string }` — ISO date, default today.
- Upsert into `completions` (respect unique constraint — idempotent).
- After insert, call `recomputeStats(habitId)` (see §6).
- Return updated stats.

### `DELETE /api/habits/[id]/complete`
- Body: `{ date: string }`.
- Delete the completion for that date.
- Recompute stats.

### `GET /api/stats/[habitId]`
- Returns `habit_stats` row + last 365 days of completions (for graph rendering).
- Cached per `habitId`, revalidated on every completion write.

---

## 6. Stats Engine (`src/lib/stats.ts`)

This is the mathematical core. Every function here is pure and testable.

### 6.1 Streak calculation

```
currentStreak:
  Starting from today, walk backwards day-by-day through completions.
  Count consecutive days until a gap is found.
  If today is not completed, the streak may still be alive if yesterday was.

longestStreak:
  Walk the entire completion history sorted ascending.
  Track max run of consecutive days.
```

### 6.2 Break probability — the formula

```
Step 1 — Base rate (rolling 30-day window)
  completionsLast30 = count of completions in last 30 days
  P(complete) = completionsLast30 / 30

Step 2 — Day-of-week conditional
  todayDow = 0..6 (Sunday..Saturday)
  totalTodayDow = count of past Sundays/Mondays/etc in the 30-day window
  completionsOnTodayDow = completions that fell on that weekday in the window
  P(complete | dow) = completionsOnTodayDow / totalTodayDow

Step 3 — Bayesian update
  Prior: P(complete) from Step 1
  Likelihood: P(complete | dow) from Step 2
  P_prior_complete = P(complete)
  P_prior_break    = 1 - P_prior_complete
  
  Unnormalised posterior:
    P_posterior_complete ∝ P(complete|dow) × P_prior_complete
    P_posterior_break    ∝ (1 - P(complete|dow)) × P_prior_break

  Normalise:
    denom = P_posterior_complete + P_posterior_break
    P(complete | prior, dow) = P_posterior_complete / denom

Step 4 — Break probability
  P(break) = 1 - P(complete | prior, dow)

Step 5 — Edge cases
  If no history: return P(break) = 0.5 (uncertain)
  If fewer than 7 completions total: increase uncertainty toward 0.5
    blend = completionCount / 7
    P(break) = P(break) × blend + 0.5 × (1 - blend)
```

### 6.3 Risk label

```
P(break) < 0.25  → "low"    (green)
P(break) < 0.60  → "medium" (amber)
P(break) ≥ 0.60  → "high"   (red)
```

### 6.4 `recomputeStats(habitId)`

This is the single function called after every completion write or delete.

1. Fetch all completions for the habit, sorted ascending.
2. Run streak calculation.
3. Fetch last 30 days of completions.
4. Run break probability formula.
5. Upsert into `habit_stats`.

This must run server-side, inside the API route handler, not in a background job (keep it simple for v1).

---

## 7. UI Components

### 7.1 Activity Graph (`activity-graph.tsx`)

Renders a 52-week × 7-day grid identical to GitHub's contribution graph.

**Algorithm:**
- Accept `completions: Date[]` and `year: number` as props.
- Build a `Set<string>` of completed ISO date strings for O(1) lookup.
- Compute the start of the grid: the Sunday on or before January 1st of the year.
- Render 371 cells (53 weeks × 7 days) in a CSS grid.
- Each cell: a 10×10px rounded square. Colour based on completion:
  - Empty: `bg-muted` (theme-aware grey)
  - Completed: use the habit's `color` prop, full opacity
- Wrap each cell in a shadcn `Tooltip` showing `"Mon 14 Apr — Completed"` or `"Not logged"`.
- Add month labels above the grid (Jan, Feb … Dec).
- Add day-of-week labels on the left (Mon, Wed, Fri).

> **Mobile:** on small screens, show last 16 weeks only (scroll would not feel right).

### 7.2 Risk Meter (`risk-meter.tsx`)

A horizontal indicator showing `P(break)` as a percentage with a colour fill.

- Use shadcn `Progress` as the base.
- Colour: green below 25%, amber 25–60%, red above 60%.
- Below the bar: text label — `"Low risk today"` / `"Watch out — medium risk"` / `"High chance of breaking today"`.
- Above the bar: show the raw percentage: `"34% chance of breaking"`.
- Animate the fill on mount with a CSS transition.

### 7.3 Habit Card (`habit-card.tsx`)

shadcn `Card` with:
- Left colour accent bar (4px wide, habit's colour, full height of card).
- Header: habit name + shadcn `Badge` for streak count (`🔥 14 days`).
- Body: Activity graph (last 16 weeks, compact).
- Footer: Risk meter + "Log today" button.
- If already completed today: button changes to "✓ Logged" (green, disabled). Allow undo via a small × icon.

### 7.4 Streak Badge (`streak-badge.tsx`)

shadcn `Badge` variant with fire emoji and streak count. Animates (scale pulse) when a new completion is logged.

### 7.5 Completion Button (`completion-button.tsx`)

Stateful button managing optimistic UI:
- Default: `"Log today"` — primary style, habit colour.
- Loading: spinner inside.
- Completed: `"✓ Done"` with subtle green background. On hover shows `"Undo"`.
- Calls `POST /api/habits/[id]/complete` and triggers Sonner toast on success/error.

---

## 8. Pages

### 8.1 Dashboard (`/app/dashboard`)

The main screen. Server Component that fetches all habits + their stats.

Layout:
1. **Top greeting** — `"Good morning, Alex"` with today's date.
2. **Today's habits** — horizontal card strip showing only today's incomplete habits. Completing one removes it from this strip (optimistic). If all done: a green banner `"All habits logged today 🎉"`.
3. **All habits grid** — 2-column card grid (1 column on mobile), each `HabitCard`.
4. **Quick-add FAB** — floating `+` button bottom-right. Opens a shadcn `Dialog` with the create habit form.

Loading state: render shadcn `Skeleton` cards while data loads (use `loading.tsx`).

### 8.2 Habit Detail (`/app/habits/[id]`)

Full-year activity graph at the top (desktop: show full 52-week grid).

Below:
- Streak stats in 3 shadcn `Card` widgets: Current Streak / Longest Streak / Total Completions.
- Risk Analysis panel: Risk meter + breakdown table showing completion rate by day of week (Mon–Sun with a small progress bar per day — reveals which days the user historically fails).
- Completion history list: last 30 completions with date and note. Paginated.
- Danger zone: Archive habit button.

### 8.3 Habits List (`/app/habits`)

Simple table/list of all habits with name, current streak, risk badge, and actions. Uses shadcn `Tabs` to toggle between Active and Archived.

### 8.4 Create Habit (`/app/habits/new`)

Centered form card:
- Name (required)
- Description (optional)
- Colour picker — 8 preset swatches + hex input
- Submit → redirect to habit detail page

---

## 9. Caching Strategy

| Data | Cache method | Revalidation trigger |
|---|---|---|
| Habits list | `unstable_cache` with tag `habits:${userId}` | Any habit write |
| Habit stats | `unstable_cache` with tag `stats:${habitId}` | Any completion write |
| Activity graph data | Included in stats response | Same as above |
| Auth session | Better Auth cookie cache (built-in) | Sign out / expiry |

Use `revalidateTag()` in API route handlers after each write.

---

## 10. Notifications (Sonner)

Mount `<Toaster />` in the root layout.

| Event | Toast |
|---|---|
| Habit logged | `"✓ Logged — 14 day streak!"` (success) |
| Logging failed | `"Couldn't log habit — try again"` (error) |
| Habit created | `"New habit added"` (success) |
| Habit archived | `"Habit archived"` (default, with undo action) |
| Streak at risk | `"⚠ High break risk today for [Habit]"` — shown once per day on load if P(break) > 0.6 |

---

## 11. Validation Schemas (Zod — `src/lib/validations.ts`)

```
createHabitSchema:
  name: string, min 1, max 120
  description: string optional, max 300
  color: string matching /^#[0-9a-fA-F]{6}$/, optional, default "#22c55e"

updateHabitSchema:
  partial(createHabitSchema) + archivedAt: date optional

logCompletionSchema:
  date: string ISO date, optional (defaults to today server-side)
  note: string optional, max 280

undoCompletionSchema:
  date: string ISO date, required

registerSchema:
  name: string min 2, max 60
  email: string email
  password: string min 8, max 100

loginSchema:
  email: string email
  password: string min 1
```

---

## 12. Build Order (for your AI agent)

Work in this order to avoid blockers:

1. **Initialise repo, install deps, configure Tailwind + shadcn.**
2. **Database: write schema, run first migration, verify on Neon.**
3. **Auth: wire Better Auth, create login/register pages, test session.**
4. **Middleware: protect `/app/*` routes.**
5. **Stats engine: write and unit-test all pure functions in `stats.ts` with mock data before touching the DB.**
6. **API routes: habits CRUD → completions → stats recompute.**
7. **Components: ActivityGraph → RiskMeter → StreakBadge → CompletionButton → HabitCard.**
8. **Pages: Dashboard → HabitDetail → HabitsList → CreateHabit.**
9. **Caching: add `unstable_cache` wrappers and `revalidateTag` calls.**
10. **Sonner toasts: wire up from completion button and form submissions.**
11. **Polish: loading skeletons, empty states, mobile layout.**

---

## 13. Empty States

| Screen | Empty state copy |
|---|---|
| Dashboard, no habits | `"No habits yet. Add your first one."` + add button |
| Today's strip, all done | `"You're all caught up today."` with checkmark illustration |
| Activity graph, no data | Render the full grid greyed out with a tip overlay |

---

## 14. Day-of-Week Breakdown UI

Inside the Habit Detail page, render a table:

| Day | Completion rate | Bar |
|---|---|---|
| Monday | 86% | ████████░░ |
| Tuesday | 71% | ███████░░░ |
| … | | |

This is computed from the `completions` table grouped by `EXTRACT(DOW FROM completedAt)`, limited to the 30-day window. Highlight today's row so the user instantly sees their current risk context.

---

## 15. Colour System

Use Tailwind CSS variables for theming. The app should support light and dark mode via `next-themes`.

Risk colours:
- Low: `hsl(142 71% 45%)` — green
- Medium: `hsl(38 92% 50%)` — amber
- High: `hsl(0 84% 60%)` — red

Habit colours are user-defined (stored as hex). Apply as inline `style` props rather than Tailwind classes (dynamic values).

---

## 16. Key Gotchas for the Agent

- **Timezone:** Always store `completedAt` as UTC. When determining "today" for streak logic, convert using the user's browser timezone passed as a header or stored in their profile. Default to UTC if unknown.
- **Unique constraint on completions:** The `(habitId, completedAt::date)` index must be a unique index, not just a regular index. Use Drizzle's `uniqueIndex` with a SQL expression.
- **Bayesian edge case:** If `totalTodayDow` is 0 (the habit is newer than one week), skip the day-of-week conditional and use the base rate only.
- **Better Auth migrations:** Run `pnpm dlx @better-auth/cli migrate` before Drizzle migrations — Better Auth creates its own tables. Ensure the Drizzle schema's `users` table references the correct table name Better Auth uses.
- **Neon serverless driver:** Use `neon()` from `@neondatabase/serverless` with `{ ssl: true }`. Do not use the standard `pg` driver — it won't work in Next.js edge/serverless.
- **`unstable_cache` and auth:** Do not cache anything that contains raw session data. Cache only DB query results keyed to the user's ID.
- **Drizzle `onConflictDoNothing`:** Use this for the completion upsert to make the log endpoint idempotent.

---

*End of blueprint. Hand this document to your AI agent and work through §12's build order.*