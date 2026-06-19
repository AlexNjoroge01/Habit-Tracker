# HabitIQ

A habit tracking app built around one idea: your daily actions should connect to the life you want to live.

The mental model flows top-down:

> **Dream Life → Goals → Habits → Daily Action → Journal → Partner Accountability**

You write a Dream Life Statement — a freeform narrative of the life you want. You break it into Goals, each weighted by importance. You build Habits that serve those goals. Every day you log what you did. The app runs the math and gives you a single honest number: your **Dream Life Score**.

---

## Features

### Dream Life Score
A single 0–100 number reflecting your entire system. Computed as the weighted average of all goal scores, which are themselves weighted averages of habit contribution scores. Updates live on every completion.

### Habit tracking
- **Build habits** — log completions, build a streak (exercise, meditate, read).
- **Break habits** — log relapses, track clean days (alcohol, smoking, doomscrolling).
- GitHub-style 52-week activity graph per habit.
- Bayesian break-probability updated on every write.

### Goals
- Goals connect to your Dream Life Statement and carry an importance weight (×1 / ×2 / ×3 / ×5).
- Each goal has a 0–100 score driven by its linked habits.
- Score history chart on the goal detail page.
- Habits can be created directly inside a goal (auto-linked) or linked after the fact.

### Journal
A standalone captain's log — not a popup, not automatic. Write when you have something to say. Entries can be linked to a goal and/or a habit and appear in context on their detail pages.

### Templates
Pre-built habit and goal packs. Installing a goal template creates the goal and all its bundled habits in one action.

### Accountability Partners
Invite a partner by email. Their dashboard shows your Dream Life Statement, goal scores, and habit cards — they can comment on both.

### Appearance
Light/dark/system mode + accent colour themes. Accessible from Settings.

---

## Tech Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16 (App Router) |
| Database | Neon (serverless Postgres) |
| ORM | Drizzle |
| Auth | Better Auth (email + password) |
| UI | Tailwind CSS v4 + base-ui (shadcn component layer) |
| Toasts | Sonner |
| Validation | Zod v4 |
| Package manager | pnpm |

---

## Setup

### 1. Install dependencies

```bash
pnpm install
```

### 2. Environment variables

Create `.env.local`:

```
DATABASE_URL=          # Neon pooled connection string
BETTER_AUTH_SECRET=    # 32-char random string
BETTER_AUTH_URL=       # http://localhost:3000
```

### 3. Run migrations

```bash
# Better Auth tables first
pnpm dlx @better-auth/cli migrate

# Then Drizzle schema
pnpm dlx drizzle-kit migrate
```

### 4. (Optional) Seed the database

```bash
pnpm seed
```

### 5. Start the dev server

```bash
pnpm dev
```

---

## Dev Commands

```bash
pnpm dev      # dev server (webpack mode)
pnpm build    # production build
pnpm lint     # ESLint
pnpm seed     # seed db (tsx db/seed.ts)
```

---

## Architecture

### Stats computation chain

Every habit completion triggers a server-side chain:

```
log completion
  → recomputeStats(habitId)       updates habit_stats (streak, break probability)
  → recomputeGoalScore(goalId)    updates goal_scores, appends goal_score_history
  → recomputeDreamScore(userId)   updates user_stats.dreamScore
```

All three functions live in `lib/stats.ts`. The Dream Life Score is always current after every log.

### Caching

Uses Next.js 16 `"use cache"` with `cacheTag()` and `revalidateTag(tag, "max")`. All server data reads are cached by user/resource ID; writes revalidate only affected tags.

### Two habit categories

| Category | Completions mean | Streak measures |
|---|---|---|
| `build` | done it | consecutive done days |
| `break` | relapsed | consecutive clean days |

`habit_stats.currentStreak` stores the **clean streak** for break habits.

---

## Database Schema

| Table | Key columns |
|---|---|
| `user_profile` | `dreamStatement` |
| `user_stats` | `dreamScore` (materialised 0–100) |
| `habits` | `category`, `archivedAt` (soft delete) |
| `completions` | unique per `(habitId, date)` |
| `habit_stats` | `currentStreak`, `breakProbability`, `riskLabel` (materialised) |
| `goals` | `weight`, `archivedAt` (soft delete) |
| `goal_habits` | join table with per-link `weight` |
| `goal_scores` | `score`, `trend`, `scoreLastWeek` (materialised) |
| `goal_score_history` | time-series snapshots for chart |
| `journal_entries` | `body`, optional `goalId` + `habitId` |
| `habit_templates` | `pack`, `goalTemplateId` (bundles under a goal template) |
| `goal_templates` | goal-level packs |
| `accountability_partners` | `status: pending \| active \| declined` |
| `partner_comments` | nullable `habitId` and `goalId` |

Full schema: [`db/schema.ts`](db/schema.ts)

### Migrations

| File | Contents |
|---|---|
| `0000_wealthy_polaris.sql` | Initial schema |
| `0001_user_journey.sql` | user_profile, user_stats, journal_entries, goal_templates, goals.weight, habit_templates.goalTemplateId |

---

## Scoring Reference

### Break probability
Bayesian update combining 30-day base rate with day-of-week conditional. Blends toward 0.5 with fewer than 7 completions. For break habits, outputs relapse probability.

Risk labels: `< 0.25` → low · `0.25–0.60` → medium · `≥ 0.60` → high

### Habit contribution (0–100)
- Build: `(completionRate30d × 50) + (min(streak/30, 1) × 50)`
- Break: `(min(cleanStreak/100, 1) × 60) + (max(0, 1 − relapses30d/10) × 40)`

### Goal score (0–100)
`Σ(habitScore × habitWeight) / Σ(habitWeights)`

### Dream Life Score (0–100)
`Σ(goalScore × goalWeight) / Σ(goalWeights)`

---

## Further reading

- [`Blueprint.md`](Blueprint.md) — full build specification, complete schema, all API routes, caching strategy
- [`Userjourney.md`](Userjourney.md) — product vision and the reasoning behind the architecture
- [`CLAUDE.md`](CLAUDE.md) — technical notes for AI coding assistants
