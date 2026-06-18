Looking at your blueprint and your vision, the core problem is clear — the app was built feature-first, not goal-first. Here's how the flow should actually work:

---

## The Correct Mental Model

**Dream Life → Goals → Habits → Daily Action → Journal → Partner Accountability**

Everything flows from the dream life downward. Habits exist to serve goals. Goals exist to build the dream life. The math measures how your daily actions are moving you toward or away from that life.

---

## Revised User Journey

### Step 1 — Define Your Dream Life (Goals Page — First Time)

When a new user signs up and lands on the dashboard for the first time, they should be redirected to the Goals page with a full-screen onboarding prompt — not a small card, but a dedicated moment:

> *"Before anything else — describe the life you want to live."*

The user writes a rich description of their dream life. This is not a task list. It is a narrative — free text, as long as they need. Think of it as a personal manifesto. This lives at the top of the Goals page permanently as a **Dream Life Statement**, separate from individual goals.

Below the Dream Life Statement, the user creates specific goals that are chapters of that dream life — "Be alcohol-free", "Run consistently", "Sleep before midnight". Each goal is a measurable slice of the dream.

**Change needed:** Add a `dreamStatement` text field to the `users` table (or a separate `user_profile` table). The Goals page should render this statement prominently at the top, always visible, as the anchor everything else points back to.

---

### Step 2 — Create Habits Tied to Goals (not the other way around)

Right now the flow is: create habit → optionally link to goal. This should be reversed.

From inside a goal, the user should see a **"Add a habit for this goal"** button. When they create a habit, the goal is pre-selected and the user understands immediately why this habit exists. The habit creation form should show the goal name at the top — *"You're building a habit to support: Be alcohol-free"*.

Users can still create standalone habits, but the encouraged path is goal-first.

**Change needed:** Habit creation should accept an optional `goalId` parameter. If provided, the `goal_habits` link is created automatically on habit save. The dashboard should group habits under their parent goal, not as a flat list.

---

### Step 3 — Daily Loop (Dashboard)

The dashboard is where the user lives every day. It should answer one question: **"What do I need to do today to move toward my dream life?"**

Redesign the dashboard layout:

1. Dream Life Statement — one line at the very top, always. A quiet reminder of why they're here.
2. Today's actions — habits due today, grouped by goal. Not a flat list. If a goal has three habits, they appear together under the goal name.
3. Overall Dream Life Score — a single number (0–100) computed as the weighted average of all goal scores. This is the headline metric. It should be large and central.
4. Goal progress cards below — each goal card shows its score, trend, and linked habits with today's status.

---

### Step 4 — The Math (what needs to change)

The current formulas work in isolation. They need to connect upward.

**Habit score → Goal score → Dream Life score**

```
Habit contribution score (existing, keep as-is):
  Build habit: (completionRate × 50) + (streakScore × 50)
  Break habit: (cleanStreakScore × 60) + (relapseScore × 40)

Goal score (existing weighted average, keep as-is):
  goalScore = Σ(habitScore × weight) / Σ(weights)

Dream Life Score (new):
  dreamScore = Σ(goalScore × goalWeight) / Σ(goalWeights)
```

Add a `weight` field to goals (same 1/2/3/5 scale as habit weights) so users can express that "Be alcohol-free" matters more to their dream life than "Wake up early".

The Dream Life Score should show on the dashboard, on the Goals page header, and in the weekly report. It gives users a single honest number that reflects their entire system.

**Change needed:** Add `weight` to the `goals` table. Add `dreamScore` to a `user_stats` materialised table (or compute it live from `goal_scores`). Recompute it at the end of `recomputeGoalScore`.

---

### Step 5 — Journal (rethink the purpose)

Right now the journal is triggered automatically after logging a habit. That turns it into a chore — a popup that interrupts the flow. Your stated goal is different: the journal is for **observations, findings, and realisations** along the journey.

The journal should be a standalone space, not a modal. Think of it as a captain's log.

**New journal model:**
- A journal entry is a freeform note with a date, a body, and optional links to a goal and/or a habit.
- The user opens the Journal page and writes when they have something to say — not when the app prompts them.
- Entries linked to a goal appear on the goal detail page in a "Journey notes" section.
- Entries linked to a habit appear on the habit detail page.
- No automatic popup after logging. Remove the `ReflectionDialog`. The `reflection` and `reflectionPrompt` columns on `completions` can be removed.

**Change needed:** Add a proper `journal_entries` table — `id`, `userId`, `body` (text), `goalId` (nullable FK), `habitId` (nullable FK), `createdAt`. Remove the `reflection` and `reflectionPrompt` columns from `completions`. Remove `ReflectionDialog`. Add a journal entry composer to the Journal page, goal detail page, and habit detail page.

---

### Step 6 — Accountability Partners (expand their view)

Partners currently only see habits. Per your vision they should see goals too — the full picture of what their friend is trying to achieve.

**Revised partner dashboard:**
- Dream Life Statement at the top (read-only)
- Goal cards with scores and trends
- Habit cards under each goal
- A comments section on both goal cards and habit cards

The comments schema is already in the blueprint (`partner_comments`). It just needs to be wired to goals as well — `goalId` is nullable on that table already, so this is mostly a UI change.

**Change needed:** Partner dashboard page should fetch goals + habits together, grouped the same way as the owner's dashboard. Comment composer should appear on both goal cards and habit cards on the partner view.

---

### Step 7 — Templates (simplify the entry point)

Templates should be the recommended path for new users who don't know where to start. After they write their Dream Life Statement, if they haven't created any goals yet, show a prompt:

> *"Not sure where to start? Browse templates for common life goals."*

Templates should exist at both the **goal level** and the **habit level**:
- Goal templates — pre-written goals like "Live alcohol-free" or "Build a consistent fitness routine", each with a description and a suggested set of habits bundled in.
- Habit templates — individual habits that can be added to any existing goal.

Installing a goal template creates the goal and all its bundled habits in one action.

**Change needed:** Add a `goalTemplateId` optional field to `habit_templates` so habits can be bundled under a goal template. Add a `goal_templates` table mirroring `habit_templates`. The templates page shows goal-level packs first, habit-level templates second.

---

## Summary of Schema Changes

| Change | Why |
|---|---|
| Add `dreamStatement` text to `user_profile` or `users` | Anchors the whole system |
| Add `weight` to `goals` table | Enables Dream Life Score calculation |
| Add `user_stats` table with `dreamScore` | Single headline metric |
| Add `goal_templates` table | Goal-level template packs |
| Add `goalTemplateId` FK to `habit_templates` | Bundle habits under goal templates |
| Add `journal_entries` table (body, goalId, habitId) | Proper freeform journal |
| Remove `reflection` + `reflectionPrompt` from `completions` | Journal is now standalone |
| Add `goalId` to habit creation flow | Goal-first habit creation |
| Add `goalId` to `partner_comments` (already nullable) | Partners comment on goals too |

---

## Revised Build Order (additions only)

After the existing step 14 in the blueprint:

15. Add `user_profile` with `dreamStatement`. Build onboarding redirect for new users.
16. Add `weight` to `goals`. Add `user_stats` with `dreamScore`. Wire `recomputeGoalScore` to update it.
17. Redesign dashboard — goal-grouped habits, Dream Life Score hero, Dream Life Statement header.
18. Goal-first habit creation — pass `goalId` into habit creation form, auto-link on save.
19. Replace `ReflectionDialog` + `completions.reflection` with `journal_entries` table and standalone journal composer.
20. Add `goal_templates` table and goal-level template packs. Update templates page.
21. Update partner dashboard to show goals + comments on both goals and habits.

---

The through-line of every change is the same: the dream life is the root, everything else is evidence of progress toward it. The math already works — it just needs to be connected top to bottom so the user always knows what their number means and why it matters.