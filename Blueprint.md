# Habit Streak Predictor — Build Blueprint

**Stack:** Next.js 16 (App Router) · Drizzle ORM · Neon · Better Auth · Tailwind CSS · shadcn/ui · Sonner · Zod · pnpm

---

## 0. Project Philosophy

This app does three things well:
1. **Track** — log daily habit completions (build habits) or relapses (break habits) with a GitHub-style activity graph.
2. **Predict** — surface a Bayesian break-probability so users know how fragile their streak really is.
3. **Coach** — connect habits to life goals, capture journal observations, and let accountability partners keep you honest.

The mental model flows top-down:

> **Dream Life → Goals → Habits → Daily Action → Journal → Partner Accountability**

Everything flows from the dream life downward. Habits exist to serve goals. Goals exist to build the dream life. The math measures how your daily actions are moving you toward or away from that life.

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
- `date-fns`

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

File: `db/schema.ts`

### Tables

#### `users`
Managed by Better Auth (`db/auth-schema.ts`). Reference by `id` (text) in foreign keys.

#### `user_profile`
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | default random |
| userId | text FK → users.id | cascade delete, unique |
| dreamStatement | text | nullable — the user's dream life manifesto |
| updatedAt | timestamp | default now |

Stores the user's Dream Life Statement — a freeform narrative of the life they want to live. This anchors the entire system.

#### `user_stats` (materialised)
| Column | Type | Notes |
|---|---|---|
| userId | text PK FK → users.id | cascade delete |
| dreamScore | numeric(5,2) | 0–100, weighted avg of goal scores |
| lastComputed | timestamp | default now |

Recomputed at end of every `recomputeGoalScore` call.

#### `habits`
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | default random |
| userId | text FK → users.id | cascade delete |
| name | varchar(120) | not null |
| description | varchar(300) | nullable |
| color | varchar(7) | hex, default `#22c55e` |
| category | varchar(10) | `"build"` (default) or `"break"` |
| createdAt | timestamp | default now |
| archivedAt | timestamp | nullable — soft delete |

**Build habits** — user wants to do something every day (exercise, meditate).
**Break habits** — user wants to stop doing something (smoking, alcohol). Completions are *relapses*.

When creating a habit via `POST /api/habits`, an optional `goalId` auto-links the habit to a goal via `goal_habits` on insert.

#### `completions`
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| habitId | uuid FK → habits.id | cascade delete |
| userId | text FK → users.id | cascade delete |
| completedAt | timestamp | default now |
| note | varchar(280) | nullable |
| reflection | text | nullable — legacy, kept for data migration |
| reflectionPrompt | varchar(300) | nullable — legacy |

Unique index on `(habitId, DATE(completedAt))` — one entry per habit per calendar day.

> Note: `reflection` and `reflectionPrompt` columns are retained for backward compatibility but are no longer used by the UI. Journaling now uses the standalone `journal_entries` table.

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

> **Why materialise?** Break-probability queries scan 30 days of data grouped by weekday. Recompute only when a completion is added or deleted.

#### `habit_templates`
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| createdBy | text FK → users.id | set null on delete |
| goalTemplateId | uuid | nullable FK → goal_templates.id (app-level, bundles habits under a goal template) |
| name | varchar(120) | not null |
| description | varchar(300) | nullable |
| color | varchar(7) | default `#22c55e` |
| category | varchar(10) | `"build"` or `"break"` |
| pack | varchar(60) | group label (e.g. "Morning Routine") |
| isPublic | boolean | default true |
| installCount | int | default 0 |
| createdAt | timestamp | default now |

#### `goal_templates`
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| createdBy | text FK → users.id | set null on delete |
| title | varchar(200) | not null |
| description | text | not null |
| pack | varchar(60) | group label |
| isPublic | boolean | default true |
| installCount | int | default 0 |
| createdAt | timestamp | default now |

Installing a goal template creates the goal + all bundled `habit_templates` (those with matching `goalTemplateId`) in one action.

#### `accountability_partners`
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| userId | text FK → users.id | the habit owner |
| partnerEmail | varchar(255) | invited email address |
| partnerId | text FK → users.id | populated if invitee is registered; set null on delete |
| status | varchar(20) | `pending` / `active` / `declined` |
| invitedAt | timestamp | default now |
| acceptedAt | timestamp | nullable |

#### `partner_comments`
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| partnershipId | uuid FK → accountability_partners.id | cascade delete |
| authorId | text FK → users.id | cascade delete |
| habitId | uuid FK → habits.id | nullable, cascade delete |
| goalId | uuid FK → goals.id | nullable, cascade delete |
| body | text | not null |
| createdAt | timestamp | default now |

Both `habitId` and `goalId` are nullable — a comment can be on a habit, a goal, or the general partnership.

#### `goals`
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| userId | text FK → users.id | cascade delete |
| title | varchar(200) | not null |
| description | text | not null — plain-language life outcome |
| weight | numeric(3,2) | default 1.00 — importance toward dream life (1/2/3/5 scale) |
| targetDate | date | nullable |
| createdAt | timestamp | default now |
| archivedAt | timestamp | nullable — soft delete |

#### `goal_habits` (join table)
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| goalId | uuid FK → goals.id | cascade delete |
| habitId | uuid FK → habits.id | cascade delete |
| weight | numeric(3,2) | default 1.00 — relative importance multiplier |

Unique index on `(goalId, habitId)`.

#### `goal_scores` (materialised cache)
| Column | Type | Notes |
|---|---|---|
| goalId | uuid PK FK → goals.id | |
| score | numeric(5,2) | 0–100 |
| scoreLastWeek | numeric(5,2) | nullable — for trend calculation |
| trend | varchar(10) | `improving` / `declining` / `stable` |
| lastComputed | timestamp | default now |

#### `goal_score_history`
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| goalId | uuid FK → goals.id | cascade delete |
| score | numeric(5,2) | snapshot value |
| recordedAt | timestamp | default now |

Appended on every `recomputeGoalScore` call — used for the score history chart.

#### `journal_entries`
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| userId | text FK → users.id | cascade delete |
| body | text | not null — freeform observation |
| goalId | uuid FK → goals.id | nullable, set null on delete |
| habitId | uuid FK → habits.id | nullable, set null on delete |
| createdAt | timestamp | default now |

The standalone journal. Entries can be linked to a goal, a habit, both, or neither. They appear on the global Journal page, the relevant goal detail page, and the relevant habit detail page.

---

## 3. Authentication (Better Auth)

File: `lib/auth.ts`

- Use `betterAuth({ database: neonAdapter, emailAndPassword: { enabled: true }, session: { cookieCache: { enabled: true } } })`
- Create `app/api/auth/[...all]/route.ts` as the catch-all handler.
- Export a typed `auth` client from `lib/auth-client.ts` for Client Components.
- Middleware (`middleware.ts`): protect all routes under `/(app)/*`. Redirect unauthenticated users to `/login`.

### Auth pages (under `app/(auth)/`)

- `/login` — email + password, link to register
- `/register` — name, email, password (Zod-validated)
- Both pages: centered card layout, no nav

---

## 4. App Architecture

```
app/
├── (auth)/
│   ├── login/page.tsx
│   └── register/page.tsx
├── (app)/                          ← protected layout with sidebar
│   ├── layout.tsx
│   ├── dashboard/page.tsx
│   ├── habits/
│   │   ├── page.tsx
│   │   ├── new/page.tsx
│   │   └── [id]/page.tsx
│   ├── templates/
│   │   ├── page.tsx
│   │   └── templates-content.tsx
│   ├── partners/
│   │   ├── page.tsx
│   │   ├── partners-content.tsx
│   │   └── [id]/page.tsx           ← read-only partner dashboard
│   ├── journal/
│   │   ├── page.tsx
│   │   └── journal-content.tsx
│   ├── goals/
│   │   ├── page.tsx
│   │   ├── goals-content.tsx
│   │   └── [id]/
│   │       ├── page.tsx
│   │       └── goal-detail-content.tsx
│   └── settings/page.tsx
└── api/
    ├── auth/[...all]/route.ts
    ├── habits/
    │   ├── route.ts                      ← GET list, POST create (accepts goalId)
    │   └── [id]/
    │       ├── route.ts                  ← GET, PATCH, DELETE
    │       ├── complete/route.ts         ← POST log, DELETE undo
    │       └── reflections/
    │           └── route.ts              ← GET list, POST add/update (legacy)
    ├── stats/[habitId]/route.ts
    ├── templates/
    │   ├── route.ts                      ← GET list, POST publish
    │   └── [id]/install/route.ts         ← POST install template as habit
    ├── goal-templates/
    │   ├── route.ts                      ← GET list, POST create
    │   └── [id]/install/route.ts         ← POST install goal template (creates goal + habits)
    ├── partners/
    │   ├── route.ts                      ← GET list, POST invite
    │   └── [id]/route.ts                 ← GET dashboard, PATCH accept/decline, DELETE
    ├── journal/
    │   └── route.ts                      ← GET list (filter ?goalId= ?habitId=), POST create, DELETE
    ├── user-profile/
    │   └── route.ts                      ← GET profile, PATCH dream statement
    ├── user-stats/
    │   └── route.ts                      ← GET dream score
    └── goals/
        ├── route.ts                      ← GET list, POST create (accepts weight)
        └── [id]/
            ├── route.ts                  ← GET detail, PATCH update (accepts weight), DELETE archive
            └── habits/
                ├── route.ts              ← POST link habit to goal
                └── [habitId]/route.ts    ← DELETE unlink habit from goal

components/
├── ui/                             ← shadcn/ui primitives
├── client-sidebar.tsx              ← nav: Dashboard, Habits, Goals, Journal, Templates, Partners, Settings
├── completion-button.tsx           ← optimistic UI for habit logging
├── habit-row.tsx
├── habit-card.tsx
├── activity-graph.tsx
├── create-habit-dialog.tsx         ← accepts optional goalId + goalTitle props; shows goal context
├── template-card.tsx
├── partner-card.tsx
├── goal-card.tsx
└── goal-progress-ring.tsx          ← SVG ring showing 0–100 score with trend colour

db/
├── schema.ts
├── auth-schema.ts                  ← Better Auth tables
├── index.ts                        ← Drizzle client (singleton, @neondatabase/serverless)
└── migrations/
    ├── 0000_wealthy_polaris.sql    ← initial schema
    └── 0001_user_journey.sql       ← user_profile, user_stats, journal_entries, goal_templates,
                                       goals.weight, habit_templates.goalTemplateId, partner_comments.goalId

lib/
├── auth.ts
├── auth-client.ts
├── stats.ts                        ← streak math, break probability, goal score, dream score engine
├── data.ts                         ← all "use cache" data-fetching functions
├── validations.ts                  ← all Zod schemas
└── utils.ts
```

---

## 5. API Routes

All routes: Zod-validate input · authenticate via Better Auth · return `{ data, error }`.

### Habits

#### `GET /api/habits`
Returns all habits for the session user joined with `habit_stats`.

#### `POST /api/habits`
Body: `createHabitSchema`. Inserts habit + default `habit_stats` row. If `goalId` is provided, auto-links via `goal_habits` and calls `recomputeGoalScore`. Revalidates `habits:${userId}`.

#### `PATCH /api/habits/[id]`
Body: `updateHabitSchema` (partial). Owner-only.

#### `DELETE /api/habits/[id]`
Soft delete: `archivedAt = now()`.

#### `POST /api/habits/[id]/complete`
Body: `{ date?, note? }`. Upserts completion (idempotent via `onConflictDoNothing`). Calls `recomputeStats`. Returns `{ ...stats, completionId }`.

#### `DELETE /api/habits/[id]/complete`
Body: `{ date }`. Deletes completion. Recomputes stats.

### Journal

#### `GET /api/journal`
Returns all journal entries for session user joined with goal title + habit name/color.
Query params: `?goalId=` or `?habitId=` to filter.

#### `POST /api/journal`
Body: `addJournalEntrySchema` (`body`, optional `goalId`, optional `habitId`). Inserts into `journal_entries`. Validates ownership of goal/habit if provided.

#### `DELETE /api/journal?id=`
Deletes a journal entry owned by the session user.

### User Profile

#### `GET /api/user-profile`
Returns the session user's `user_profile` row (including `dreamStatement`).

#### `PATCH /api/user-profile`
Body: `{ dreamStatement: string }`. Upserts the user profile (creates if not exists).

### User Stats

#### `GET /api/user-stats`
Returns the session user's `user_stats` row (including `dreamScore`).

### Templates

#### `GET /api/templates`
Returns all public habit templates ordered by `installCount` desc.

#### `POST /api/templates`
Body: `publishTemplateSchema`. Creates a new public template.

#### `POST /api/templates/[id]/install`
Body: `installTemplateSchema`. Creates a habit from the template, increments `installCount`.

### Goal Templates

#### `GET /api/goal-templates`
Returns all public goal templates ordered by `installCount` desc.

#### `POST /api/goal-templates`
Body: `createGoalTemplateSchema`. Creates a new public goal template.

#### `POST /api/goal-templates/[id]/install`
Body: `installGoalTemplateSchema`. Creates a goal + all bundled habit templates in one transaction. Increments both `goalTemplates.installCount` and each bundled `habitTemplates.installCount`.

### Accountability Partners

#### `GET /api/partners`
Returns all partnerships where session user is owner or partner (any status).

#### `POST /api/partners`
Body: `invitePartnerSchema`. Creates pending partnership.

#### `GET /api/partners/[id]`
Read-only dashboard: returns owner's active habits + goals with today's completion status.

#### `PATCH /api/partners/[id]`
Body: `{ action: "accept" | "decline" }`. Invitee-only.

#### `DELETE /api/partners/[id]`
Either participant can remove.

### Goals

#### `GET /api/goals`
Returns all non-archived goals joined with `goal_scores` (includes `weight`).

#### `POST /api/goals`
Body: `createGoalSchema` (includes optional `weight`). Inserts goal + default `goal_scores` row.

#### `GET /api/goals/[id]`
Returns `{ goal, score, history, habits }` via `getGoalDetail()`. Owner-only.

#### `PATCH /api/goals/[id]`
Body: `updateGoalSchema` (partial, includes `weight`). Owner-only.

#### `DELETE /api/goals/[id]`
Soft delete: `archivedAt = now()`.

#### `POST /api/goals/[id]/habits`
Body: `linkHabitSchema`. Links a habit to a goal with optional weight. Calls `recomputeGoalScore`.

#### `DELETE /api/goals/[id]/habits/[habitId]`
Unlinks habit. Calls `recomputeGoalScore`.

### Stats

#### `GET /api/stats/[habitId]`
Returns `habit_stats` row + last 365 days of completions.

---

## 6. Stats Engine (`lib/stats.ts`)

### 6.1 Break habits — streak semantics

For `category === "break"` habits, **completions are relapses**. Streak logic inverts:

- `currentStreak` = **clean streak** — consecutive days from today backwards with *no* completion.
- `longestStreak` = longest clean run since `createdAt`.
- `breakProbability` = relapse probability for today.

### 6.2 Build habits — streak calculation

```
currentStreak:
  Walk backwards from today. Count consecutive days until a gap.
  Streak is alive if yesterday was completed (today not yet logged).

longestStreak:
  Walk entire history ascending, track max run of consecutive days.
```

### 6.3 Break probability — the formula

```
Step 1 — Base rate (rolling 30-day window)
  P(complete) = completionsLast30 / 30

Step 2 — Day-of-week conditional
  P(complete | dow) = completionsOnTodayDow / totalTodayDow

Step 3 — Bayesian update
  posterior_complete ∝ P(complete|dow) × P(complete)
  posterior_break    ∝ (1 - P(complete|dow)) × (1 - P(complete))
  P(break) = 1 - posterior_complete / (posterior_complete + posterior_break)

Step 4 — Edge cases
  No history → P(break) = 0.5
  Fewer than 7 completions → blend toward 0.5

For break habits: P(break) = 1 - P(complete)  (relapse probability)
```

### 6.4 Risk label

```
P(break) < 0.25  → "low"    (green)
P(break) < 0.60  → "medium" (amber)
P(break) ≥ 0.60  → "high"   (red)
```

### 6.5 `recomputeStats(habitId, category, startedAt)`

Called after every completion write or delete.

1. Fetch all completions for the habit.
2. Compute streak + break probability.
3. Upsert `habit_stats`.
4. **Chain:** query `goal_habits`, call `recomputeGoalScore(goalId)` for each linked goal.

### 6.6 Goal Score Engine

#### `computeHabitContribution(habitId, category, startedAt) → 0–100`

**Build habits:**
```
completionRate = completionsInLast30Days / 30
rateScore      = completionRate × 50
streakScore    = min(currentStreak / 30, 1) × 50
score          = round(rateScore + streakScore)
```

**Break habits:**
```
streakScore   = min(cleanStreak / 100, 1) × 60
relapses      = completions (relapses) in last 30 days
relapseScore  = max(0, 1 − relapses / 10) × 40
score         = round(streakScore + relapseScore)
```

#### `recomputeGoalScore(goalId)`

1. Fetch all `goal_habits` rows with weights.
2. For each linked habit, call `computeHabitContribution`.
3. Weighted average: `score = round(Σ(contribution × weight) / Σ(weights))`.
4. Compare to `scoreLastWeek` to determine trend (±2 threshold).
5. Upsert `goal_scores`, append `goal_score_history`.
6. **Chain:** call `recomputeDreamScore(userId)`.

### 6.7 Dream Life Score Engine

#### `recomputeDreamScore(userId)`

1. Fetch all non-archived goals + their `goal_scores` for the user.
2. Weighted average: `dreamScore = round(Σ(goalScore × goalWeight) / Σ(goalWeights))`.
3. Upsert `user_stats`.

```
dreamScore = Σ(goalScore × goalWeight) / Σ(goalWeights)
```

The Dream Life Score updates live on every completion via the chain:
`completion → recomputeStats → recomputeGoalScore → recomputeDreamScore`

---

## 7. Data Fetching (`lib/data.ts`)

All functions use Next.js `"use cache"` + `cacheTag()`. Writes call `revalidateTag(tag, "max")`.

| Function | Cache tag | Returns |
|---|---|---|
| `getHabitsForUser(userId)` | `habits:${userId}` | habits joined with stats |
| `getHabitStats(habitId)` | `stats:${habitId}` | stats row + last 365 days completions |
| `getTodayCompletions(userId)` | `habits:${userId}` | habitId array for today |
| `getUserProfile(userId)` | `profile:${userId}` | user_profile row (dreamStatement) |
| `getUserStats(userId)` | `user-stats:${userId}` | user_stats row (dreamScore) |
| `getTemplates()` | `"templates"` | all public habit templates |
| `getGoalTemplates()` | `"goal-templates"` | all public goal templates |
| `getPartnershipsForUser(userId)` | `partners:${userId}` | partnerships |
| `getJournalEntries(userId)` | `journal:${userId}` | all entries with goal/habit names |
| `getJournalEntriesForGoal(goalId)` | `journal-goal:${goalId}` | entries for a specific goal |
| `getJournalEntriesForHabit(habitId)` | `journal-habit:${habitId}` | entries for a specific habit |
| `getGoalsForUser(userId)` | `goals:${userId}` | goals joined with goal_scores (includes weight) |
| `getGoalDetail(goalId)` | `goal:${goalId}` | `{ goal, score, history, habits }` |
| `getHabitsGroupedByGoal(userId)` | `habits:${userId}`, `goals:${userId}` | `{ grouped, ungrouped }` for dashboard |

> **Note:** This project uses Next.js 16's `"use cache"` directive and `cacheTag()` / `revalidateTag(tag, "max")`, not the older `unstable_cache` API.

---

## 8. UI Components

### 8.1 Activity Graph (`activity-graph.tsx`)
52-week × 7-day grid. Cells coloured by habit colour when completed, `bg-muted` when not. Tooltip per cell. Month labels above. Day-of-week labels left. Mobile: last 16 weeks.

### 8.2 Risk Meter (`risk-meter.tsx`)
shadcn `Progress` with colour fill. Green < 25%, amber 25–60%, red ≥ 60%. Text label below.

### 8.3 Habit Card (`habit-card.tsx`)
Left colour accent bar · streak badge · compact activity graph · risk meter · completion button.

### 8.4 Completion Button (`completion-button.tsx`)
Manages optimistic UI (default → loading → done/undo). Break habits show "Log relapse" / "⚠ Relapsed". No automatic reflection popup — journaling is now standalone.

### 8.5 Template Card (`template-card.tsx`)
Card showing template name, description, category badge, install count. "Add" button calls install route.

### 8.6 Partner Card (`partner-card.tsx`)
Shows partner email, status badge. Accept/Decline on pending invites. "View dashboard" on active.

### 8.7 Goal Progress Ring (`goal-progress-ring.tsx`)
SVG circle ring. Stroke colour by trend: green (improving), red (declining), indigo (stable). Score centred inside. Used on dashboard (per-goal mini ring), goals page, and goal detail (large 96px).

### 8.8 Goal Card (`goal-card.tsx`)
Links to goal detail. Shows progress ring, title, description (truncated), target date.

### 8.9 Create Habit Dialog (`create-habit-dialog.tsx`)
Accepts optional `goalId` and `goalTitle` props. When a goal is provided, shows a contextual banner: *"Supporting goal: [Title]"*. Auto-links the new habit to the goal on save. Supports two trigger variants: `"fab"` (fixed bottom-right button) and `"button"` (inline button, used from goal detail page).

---

## 9. Pages

### 9.1 Dashboard (`/dashboard`)
Server Component. Layout:
1. **Dream Life Statement** — quiet one-line quote at the very top; prompts to set it if missing.
2. **Dream Life Score** — large numeric hero (0–100) with GoalProgressRing, updated live.
3. **High-risk alerts** — habits with break risk > 60%.
4. **Habits grouped by goal** — each active goal renders a mini ring + title header, then a grid of its linked `HabitCard` components.
5. **Other habits** — ungrouped habits (not linked to any goal) shown below.
6. **FAB** — floating CreateHabitDialog button.

### 9.2 Habit Detail (`/habits/[id]`)
Full-year activity graph · streak stats (3 cards) · risk analysis (meter + day-of-week breakdown) · completion history · archive button.

### 9.3 Habits List (`/habits`)
`Tabs` for Active / Archived. Each row has name, streak, risk badge, actions.

### 9.4 Create Habit (`/habits/new`)
Form: name (required), description, colour picker (8 swatches + hex), **category toggle** (Build / Break). Submit → redirect to habit detail.

### 9.5 Templates (`/templates`)
Habit templates grouped by pack. Goal templates shown first (install creates goal + habits). Each pack renders a grid of template cards.

### 9.6 Partners (`/partners`)
Email input + Invite button. Grid of `PartnerCard` components.

### 9.7 Partner Dashboard (`/partners/[id]`)
Read-only. Expanded view: Dream Life Statement · goal cards with scores · habit cards under each goal · comments on goals and habits.

### 9.8 Journal (`/journal`)
Client Component. Layout:
1. **Composer** — freeform textarea, optional goal dropdown, optional habit dropdown. Writes to `journal_entries`.
2. **Entry list** — all entries desc, each showing body, date, and optional goal/habit badges.
3. **Delete** button per entry.

No automatic popup. No connection to `completions`. The user writes when they have something to say.

### 9.9 Goals (`/goals`)
Client Component. Layout:
1. **Dream Life Statement** — editable in-place with pencil icon. Saves to `user_profile.dreamStatement`.
2. **Dream Life Score** — inline score bar showing the weighted average across all goals.
3. **Goals grid** — `GoalCard` components. Empty state prompts to create first goal.
4. **Create goal dialog** — includes title, description, weight picker (Normal/Important/Very important/Critical), target date.

### 9.10 Goal Detail (`/goals/[id]`)
Client Component. Layout:
1. **Header** — large progress ring · title · description · trend badge · weight badge (e.g. "Weight ×2 toward dream life") · target date.
2. **Linked habits** — "New habit for this goal" button (opens CreateHabitDialog with `goalId` pre-filled) + "Link existing" button. Each linked habit card shows streak, completions, weight, risk bar.
3. **Score history** — mini bar chart, oldest → latest.
4. **Journey notes** — inline journal composer (saves with `goalId`), list of entries for this goal.
5. **Archive** button.

---

## 10. Caching Strategy

| Data | Directive | Tag | Revalidation trigger |
|---|---|---|---|
| Habits list | `"use cache"` + `cacheTag` | `habits:${userId}` | Any habit or completion write |
| Habit stats | `"use cache"` + `cacheTag` | `stats:${habitId}` | Any completion write |
| User profile | `"use cache"` + `cacheTag` | `profile:${userId}` | Dream statement update |
| User stats | `"use cache"` + `cacheTag` | `user-stats:${userId}` | `recomputeDreamScore` |
| Templates | `"use cache"` + `cacheTag` | `"templates"` | Template publish or install |
| Goal templates | `"use cache"` + `cacheTag` | `"goal-templates"` | Goal template publish or install |
| Partnerships | `"use cache"` + `cacheTag` | `partners:${userId}` | Invite, accept, decline, remove |
| Journal (all) | `"use cache"` + `cacheTag` | `journal:${userId}` | Any journal write |
| Journal (goal) | `"use cache"` + `cacheTag` | `journal-goal:${goalId}` | Journal write with goalId |
| Journal (habit) | `"use cache"` + `cacheTag` | `journal-habit:${habitId}` | Journal write with habitId |
| Goals list | `"use cache"` + `cacheTag` | `goals:${userId}` | Goal create, archive, weight update |
| Goal detail | `"use cache"` + `cacheTag` | `goal:${goalId}` | Habit link/unlink, score recompute |
| Auth session | Better Auth cookie cache | — | Sign out / expiry |

All revalidation calls use `revalidateTag(tag, "max")` — required in Next.js 16.

---

## 11. Notifications (Sonner)

Mount `<Toaster />` in the root layout.

| Event | Toast |
|---|---|
| Build habit logged | `"✓ Logged — 14 day streak!"` (success) |
| Break habit relapsed | `"Relapse logged for [Habit]. Tomorrow is a new day."` |
| Logging failed | `"Couldn't log — try again"` (error) |
| Habit created | `"New habit added"` (success) |
| Template installed | `"[Name] added to your habits"` (success) |
| Partner invited | `"Invite sent to [email]"` (success) |
| Reflection saved | `"Reflection saved"` (success) |
| Goal created | `"Goal created"` (success) |
| Habit linked to goal | `"Habit linked — score updated"` (success) |
| Goal archived | `"Goal archived"` (default) |
| Dream statement saved | `"Dream life statement saved"` (success) |
| Journal entry saved | `"Entry saved"` (success) |
| Goal template installed | goal title + `"goal and habits added"` (success) |
| Streak at risk | `"⚠ High break risk today for [Habit]"` — shown on load if P(break) > 0.6 |

---

## 12. Validation Schemas (Zod — `lib/validations.ts`)

```
createHabitSchema:       name (1–120), description? (max 300), color? (hex), category? ("build"|"break"), goalId? (uuid)
updateHabitSchema:       partial(createHabitSchema) + archivedAt?: date

logCompletionSchema:     date?: ISO date string, note?: string (max 280)
undoCompletionSchema:    date: ISO date string

addReflectionSchema:     completionId: uuid, reflection (1–2000), prompt? (max 300) — legacy

publishTemplateSchema:   name (1–120), description? (max 300), color? (hex), category, pack (1–60)
installTemplateSchema:   name?: string (1–120)

createGoalTemplateSchema: title (1–200), description (min 1), pack (1–60)
installGoalTemplateSchema: title?: string (1–200)

invitePartnerSchema:     partnerEmail: email string
addCommentSchema:        body (1–1000), habitId?: uuid, goalId?: uuid

createGoalSchema:        title (1–200), description (min 1), targetDate?: ISO date, weight?: number (0.1–5, default 1)
updateGoalSchema:        partial(createGoalSchema) + archivedAt?: date

linkHabitSchema:         habitId: uuid, weight?: number (0.1–5, default 1)

addJournalEntrySchema:   body (1–5000), goalId?: uuid, habitId?: uuid

updateDreamStatementSchema: dreamStatement: string (max 5000)

registerSchema:          name (2–60), email, password (8–100)
loginSchema:             email, password (min 1)
```

---

## 13. Feature: Habit Templates Library

Pre-built habits grouped into "packs". Habit templates can be bundled under a `goal_template` via the `goalTemplateId` FK. Installing a goal template creates the goal + all bundled habits in one action.

- Templates at `GET /api/templates` (habit-level)
- Goal templates at `GET /api/goal-templates`
- Installing a goal template creates goal + habits + goal_habits links
- Templates page shows goal-level packs first, individual habit templates second

---

## 14. Feature: Accountability Partners

Partner dashboard shows:
- Dream Life Statement (read-only)
- Goal cards with scores and trends
- Habit cards under each goal
- Comments on both goals and habits (`partner_comments.goalId` is nullable alongside `habitId`)

---

## 15. Feature: Journal

A standalone captain's log. Not triggered automatically — the user writes when they have something to say.

- Journal entries are freeform text, optionally linked to a goal and/or habit
- Entries appear on the global Journal page, the goal detail page ("Journey notes"), and the habit detail page
- The `ReflectionDialog` component and the `completions.reflection` column are deprecated and no longer used by the UI (columns retained for data migration)

---

## 16. Feature: Goals Module

### Goal Progress Score (0–100)

Computed by `recomputeGoalScore(goalId)` chained inside `recomputeStats`.

**Build habit contribution:**
```
score = round((completionsLast30 / 30) × 50 + min(currentStreak / 30, 1) × 50)
```

**Break habit contribution:**
```
score = round(min(cleanStreak / 100, 1) × 60 + max(0, 1 − relapses30d / 10) × 40)
```

**Weighted average (multiple habits):**
```
goalScore = round(Σ(habitScore × habitWeight) / Σ(habitWeights))
```

### Dream Life Score (0–100)

Computed by `recomputeDreamScore(userId)` chained at the end of `recomputeGoalScore`.

```
dreamScore = round(Σ(goalScore × goalWeight) / Σ(goalWeights))
```

Stored in `user_stats.dreamScore`. Shown on the dashboard as the headline metric.

### Habit weighting (within a goal)
When linking a habit to a goal: Normal ×1 · Important ×2 · Very important ×3 · Critical ×5.

### Goal weighting (within dream life)
When creating or updating a goal: Normal ×1 · Important ×2 · Very important ×3 · Critical ×5.

### Goal-first habit creation
Encouraged flow: create goal → "New habit for this goal" → habit is auto-linked on save.
Standalone habit creation still works; the FAB on dashboard creates ungrouped habits.

### Dream Life Statement
Stored in `user_profile.dreamStatement`. Shown prominently on:
- Goals page (top, always visible, editable inline)
- Dashboard (quiet one-liner quote at top)
- Partner dashboard (read-only)

### Score history
Every `recomputeGoalScore` call appends to `goal_score_history`. Goal detail page renders a mini bar chart.

---

## 17. Key Gotchas

- **Timezone:** Store `completedAt` as UTC. When determining "today" for streak logic, convert using the user's browser timezone or default UTC.
- **Unique constraint on completions:** `(habitId, DATE(completedAt))` — a unique index, not a regular index. Drizzle `uniqueIndex` with SQL expression.
- **Break habit streak logic:** `currentStreak` in `habit_stats` stores the *clean streak* for break habits.
- **`recomputeStats` signature:** `recomputeStats(habitId, category, startedAt)` — category and startedAt are required.
- **Goal score chaining:** `recomputeStats → recomputeGoalScore → recomputeDreamScore`. All three run server-side on every completion.
- **`revalidateTag` second argument:** In Next.js 16, `revalidateTag(tag, "max")` is required.
- **`onConflictDoNothing` + returning completionId:** The complete route inserts with `onConflictDoNothing` then queries the completion separately to return its `id`.
- **Better Auth migrations:** Run `pnpm dlx @better-auth/cli migrate` before Drizzle migrations.
- **Neon serverless driver:** Use `neon()` from `@neondatabase/serverless`. Do not use the standard `pg` driver.
- **`user_profile` upsert:** Use `onConflictDoUpdate` targeting `userId` (unique column) — not PK. The row is created on first PATCH, not on sign-up.
- **`goalTemplateId` in `habit_templates`:** Kept as a plain uuid column (not a FK constraint) to avoid circular dependency at migration time. Enforced by app logic in the install route.
- **Journal entries vs. completions.reflection:** The `journal_entries` table is the active store. `completions.reflection` is legacy — do not write to it in new code.

---

## 18. Build Order

1. Initialise repo, install deps, configure Tailwind + shadcn.
2. Database: write full schema, run migration (0000), verify on Neon.
3. Auth: wire Better Auth, create login/register pages, test session.
4. Middleware: protect `/(app)/*` routes.
5. Stats engine: write and test pure functions in `stats.ts`.
6. Core API: habits CRUD → completions → stats recompute.
7. Core components: ActivityGraph → RiskMeter → CompletionButton → HabitCard.
8. Core pages: Dashboard → HabitDetail → HabitsList → CreateHabit.
9. Caching: `"use cache"` + `cacheTag` wrappers, `revalidateTag` in routes.
10. Break habits: category column, updated streak logic, completion button UI.
11. Habit Templates: schema → API routes → TemplateCard → Templates page.
12. Accountability Partners: schema → API routes → PartnerCard → Partners page → Partner dashboard.
13. Goals module: schema → goal score engine → chain into recomputeStats → API routes → GoalProgressRing → GoalCard → Goals page → Goal Detail.
14. Sidebar: add Goals, Journal, Templates, Partners nav items.
15. **User Journey Phase — run migration 0001, then:**
16. `user_profile` with `dreamStatement` → `GET/PATCH /api/user-profile` → Goals page inline editor → Dashboard quote strip.
17. `user_stats` with `dreamScore` → extend `recomputeGoalScore` to chain `recomputeDreamScore` → `GET /api/user-stats` → Dashboard hero.
18. `goals.weight` → extend `createGoalSchema` / `updateGoalSchema` → Goals page create dialog weight picker.
19. Dashboard redesign: `getHabitsGroupedByGoal` → goal-grouped habit sections → Dream Life Score hero.
20. Goal-first habit creation: `CreateHabitDialog` props (`goalId`, `goalTitle`, `triggerVariant`) → Goal Detail "New habit for this goal" button.
21. `journal_entries` table → `GET/POST/DELETE /api/journal` → rewrite Journal page → Goal Detail "Journey notes" section.
22. `goal_templates` + `goalTemplateId` on `habit_templates` → `GET/POST /api/goal-templates` → install route → Templates page goal packs.
23. Sonner toasts: wire up from all new features.
24. Polish: loading skeletons, empty states, mobile layout.

---

## 19. Empty States

| Screen | Empty state |
|---|---|
| Dashboard, no habits | "No habits yet. Start with a goal, then add habits to it." + link to goals |
| Dashboard, all done today | Per-goal section shows completed HabitCards |
| Goals, no dream statement | Inline prompt to "Write your dream life statement" |
| Goals, no goals | "No goals yet. Each goal is a chapter of your dream life." + create button |
| Goal detail, no habits linked | Icon + "No habits linked yet" + "New habit for this goal" + "Link existing" |
| Journal, no entries | "No entries yet. Write your first one above." |
| Templates, none published | "No templates yet. Check back soon." |
| Partners, none | "No partnerships yet. Invite someone to get started." |

---

*End of blueprint.*
