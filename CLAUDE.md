@AGENTS.md

# HabitIQ — Project Context for Claude

## Mental Model (read this first)

```
Dream Life → Goals → Habits → Daily Action → Journal → Partner Accountability
```

Everything flows top-down. Habits exist to serve goals. Goals exist to build the dream life. The math measures how daily actions move you toward or away from that life. This hierarchy is not cosmetic — it drives the data model, the UI layout, and the scoring chain.

The app does three things:
1. **Track** — log completions (build habits) or relapses (break habits) with a GitHub-style activity graph.
2. **Predict** — Bayesian break-probability per habit, updated on every write.
3. **Coach** — connect habits to goals, capture journal observations, accountability partner view.

---

## Stack

- **Next.js 16** (App Router, Turbopack in dev, Webpack fallback via `--webpack` flag)
- **Drizzle ORM** + **Neon** (serverless postgres — use `@neondatabase/serverless`, not `pg`)
- **Better Auth** (email + password, cookie-cached session)
- **Tailwind CSS v4** + **base-ui** (NOT Radix — `@base-ui/react`)
- **Sonner** for toasts
- **Zod v4** for validation (`lib/validations.ts`)
- **pnpm** as package manager

### Critical base-ui difference

Components use `render` prop instead of `asChild`:
```tsx
// WRONG (Radix pattern):
<DialogTrigger asChild><Button /></DialogTrigger>

// CORRECT (base-ui pattern):
<DialogTrigger render={<Button />}>Label</DialogTrigger>
```

---

## Project Structure

```
app/
├── (auth)/             — login, register (no sidebar)
├── (app)/              — protected layout: sidebar + topbar + main
│   ├── layout.tsx      — ClientSidebar (md+) + ClientTopbar (all screens)
│   ├── dashboard/
│   ├── habits/[id]/
│   ├── goals/[id]/
│   ├── journal/
│   ├── templates/
│   ├── partners/[id]/
│   └── settings/       — includes Appearance inline (no separate /appearance route)
└── api/                — all return { data, error }

components/
├── ui/                 — base-ui primitives
├── client-sidebar.tsx  — desktop nav (hidden on mobile)
├── client-topbar.tsx   — topbar with mobile hamburger sheet nav
└── ...

db/
├── schema.ts           — all tables
└── migrations/

lib/
├── stats.ts            — streak math, break probability, goal score, dream score engine
├── data.ts             — all "use cache" data-fetching functions
├── validations.ts      — all Zod schemas
└── auth.ts / auth-client.ts
```

---

## Data Model (key tables)

| Table | Purpose |
|---|---|
| `user_profile` | `dreamStatement` — user's freeform dream life narrative |
| `user_stats` | `dreamScore` (0–100) — materialised weighted avg of goal scores |
| `habits` | `category: "build" \| "break"`, soft-deleted via `archivedAt` |
| `completions` | One per habit per calendar day. `reflection`/`reflectionPrompt` columns are legacy — do not write to them |
| `habit_stats` | Materialised: `currentStreak`, `longestStreak`, `totalCompletions`, `breakProbability`, `riskLabel` |
| `goals` | `weight` (1/2/3/5) — importance toward dream life. Soft-deleted via `archivedAt` |
| `goal_habits` | Join table with per-link `weight` (habit importance within a goal) |
| `goal_scores` | Materialised: `score`, `scoreLastWeek`, `trend` |
| `goal_score_history` | Appended on every recompute — used for the bar chart |
| `journal_entries` | Freeform notes with optional `goalId` and `habitId` links |
| `habit_templates` / `goal_templates` | Community templates; `goalTemplateId` on `habit_templates` bundles habits under a goal template |
| `accountability_partners` | Pending/active/declined partnerships |
| `partner_comments` | Comments on habits or goals (both nullable) |

---

## The Stats Chain

Every completion write or delete triggers this chain (all server-side):

```
recomputeStats(habitId, category, startedAt)
  → upserts habit_stats
  → for each linked goal: recomputeGoalScore(goalId)
      → upserts goal_scores + appends goal_score_history
      → recomputeDreamScore(userId)
          → upserts user_stats.dreamScore
```

All three functions live in `lib/stats.ts`. Never call them out of order.

---

## Scoring Formulas

### Break probability (per habit)
```
P(break) = 1 - Bayesian posterior of P(complete)
  Base: completionsLast30 / 30
  DoW:  completionsOnTodayDow / totalTodayDow
  Blend toward 0.5 when < 7 completions
  For break habits: P(break) = 1 - P(complete) (relapse probability)

Risk labels: < 0.25 → "low" | < 0.60 → "medium" | ≥ 0.60 → "high"
```

### Habit contribution score (0–100)
```
Build:  round((completionsLast30/30 × 50) + (min(streak/30, 1) × 50))
Break:  round((min(cleanStreak/100, 1) × 60) + (max(0, 1 - relapses30d/10) × 40))
```

### Goal score (0–100)
```
round( Σ(habitScore × habitWeight) / Σ(habitWeights) )
```

### Dream Life Score (0–100)
```
round( Σ(goalScore × goalWeight) / Σ(goalWeights) )
```

---

## Caching Pattern

Uses Next.js 16 `"use cache"` + `cacheTag()` — NOT the older `unstable_cache` API.

```ts
// Reading (lib/data.ts):
"use cache";
cacheTag(`habits:${userId}`);

// Writing (API routes):
revalidateTag(`habits:${userId}`, "max");  // second arg "max" is required in Next.js 16
```

Key cache tags:
- `habits:${userId}` — habit list + today completions
- `stats:${habitId}` — habit stats + 365-day completions
- `goals:${userId}` — goals list
- `goal:${goalId}` — goal detail (score, history, linked habits)
- `journal:${userId}` — all journal entries
- `journal-goal:${goalId}` — journal entries for a goal
- `profile:${userId}` — dreamStatement
- `user-stats:${userId}` — dreamScore
- `"templates"` / `"goal-templates"` — public templates

---

## API Conventions

All routes: authenticate via `auth.api.getSession({ headers: await headers() })` · Zod-validate body · return `{ data } | { error }`.

```ts
// Standard response shape
return NextResponse.json({ data: result });
return NextResponse.json({ error: "message" }, { status: 400 });
```

Key route behaviours:
- `POST /api/habits` — accepts optional `goalId`, auto-links via `goal_habits` + calls `recomputeGoalScore`
- `POST /api/habits/[id]/complete` — `onConflictDoNothing` (idempotent), then separate query to return `completionId`
- `POST /api/goal-templates/[id]/install` — creates goal + all bundled habits + `goal_habits` links in one transaction
- `PATCH /api/user-profile` — upserts (creates on first call, not on sign-up)

---

## Client vs Server Components

- **Page wrappers** (`page.tsx`): server components. Wrap client content in `<Suspense>`.
- **Content components** (`*-content.tsx`): usually client components using `useEffect` + fetch, or server components using `lib/data.ts` cached functions.
- **Client components using `useParams()`**: must be inside a `<Suspense>` boundary — this is required in Next.js 16.

Habit detail (`habits/[id]/habit-detail-content.tsx`) is a **server component** that receives `params: Promise<{ id: string }>` as a prop from the page. Goal/partner detail are **client components** using `useParams()` wrapped in Suspense.

---

## Two Habit Categories

| Category | Completions mean | Streak measures | Break probability |
|---|---|---|---|
| `"build"` | ✅ done it | consecutive done days | chance of missing today |
| `"break"` | ❌ relapsed | consecutive clean days | relapse probability |

`currentStreak` in `habit_stats` stores the **clean streak** for break habits. Always check `category` before displaying streak labels.

---

## Gotchas

- **`revalidateTag` needs second arg**: `revalidateTag(tag, "max")` — omitting `"max"` silently fails in Next.js 16.
- **Neon driver**: use `neon()` from `@neondatabase/serverless`. Never use `pg`.
- **Unique constraint on completions**: expression index on `(habitId, DATE(completedAt))` — one per habit per calendar day.
- **`user_profile` upsert**: use `onConflictDoUpdate` targeting `userId` (the unique column), not the PK.
- **`goalTemplateId` in `habit_templates`**: plain uuid column (no FK constraint) — enforced by app logic only.
- **`completions.reflection`**: legacy column, retained for migration. Do not write to it in new code.
- **Appearance is in Settings**: there is no standalone `/appearance` route — it redirects to `/settings`. Appearance controls are embedded in the settings page.
- **Sidebar nav**: Dashboard, Habits, Goals, Journal, Templates, Partners, Settings. No Appearance link.
- **Mobile nav**: hamburger Sheet in `client-topbar.tsx` — same nav items as sidebar.

---

## Environment Variables

```
DATABASE_URL=        # Neon pooled connection string
BETTER_AUTH_SECRET=  # 32-char random string
BETTER_AUTH_URL=     # http://localhost:3000 in dev / prod URL in production
```

## Dev Commands

```
pnpm dev      # Next.js dev server (webpack mode)
pnpm build    # production build
pnpm seed     # seed the database (tsx db/seed.ts)
```
