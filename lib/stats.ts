import { db } from "@/db";
import { completions, habits, habitStats, goalHabits, goalScores, goalScoreHistory, goals } from "@/db/schema";
import { eq, and, isNull, inArray } from "drizzle-orm";
import { subDays } from "date-fns";

export function computeCurrentStreak(dates: Date[]): number {
  if (dates.length === 0) return 0;

  const sorted = [...dates].sort((a, b) => b.getTime() - a.getTime());
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);

  const toDay = (d: Date) => {
    const c = new Date(d);
    c.setUTCHours(0, 0, 0, 0);
    return c.getTime();
  };

  const daySet = new Set(sorted.map((d) => toDay(d)));
  const mostRecent = sorted[0];
  const mostRecentDay = toDay(mostRecent);

  if (mostRecentDay !== toDay(today) && mostRecentDay !== toDay(yesterday)) {
    return 0;
  }

  let streak = 0;
  let cursor = mostRecentDay === toDay(today) ? toDay(today) : toDay(yesterday);

  while (daySet.has(cursor)) {
    streak++;
    cursor -= 86400000;
  }

  return streak;
}

export function computeLongestStreak(dates: Date[]): number {
  if (dates.length === 0) return 0;

  const toDay = (d: Date) => {
    const c = new Date(d);
    c.setUTCHours(0, 0, 0, 0);
    return c.getTime();
  };

  const uniqueDays = [
    ...new Set(dates.map((d) => toDay(d))),
  ].sort((a, b) => a - b);

  let longest = 1;
  let current = 1;

  for (let i = 1; i < uniqueDays.length; i++) {
    if (uniqueDays[i] - uniqueDays[i - 1] === 86400000) {
      current++;
      longest = Math.max(longest, current);
    } else {
      current = 1;
    }
  }

  return longest;
}

// For break habits: consecutive days from today with NO completion, bounded by startedAt
export function computeCleanStreak(relapseDates: Date[], startedAt: Date): number {
  const toDay = (d: Date) => {
    const c = new Date(d);
    c.setUTCHours(0, 0, 0, 0);
    return c.getTime();
  };

  const relapseDays = new Set(relapseDates.map((d) => toDay(d)));
  const startDay = toDay(startedAt);
  let streak = 0;
  let cursor = toDay(new Date());

  while (cursor >= startDay && !relapseDays.has(cursor)) {
    streak++;
    cursor -= 86400000;
  }

  return streak;
}

// For break habits: longest consecutive clean run since startedAt
export function computeLongestCleanStreak(relapseDates: Date[], startedAt: Date): number {
  const toDay = (d: Date) => {
    const c = new Date(d);
    c.setUTCHours(0, 0, 0, 0);
    return c.getTime();
  };

  const relapseDays = new Set(relapseDates.map((d) => toDay(d)));
  const startDay = toDay(startedAt);
  const todayDay = toDay(new Date());

  let longest = 0;
  let current = 0;

  for (let cursor = startDay; cursor <= todayDay; cursor += 86400000) {
    if (!relapseDays.has(cursor)) {
      current++;
      longest = Math.max(longest, current);
    } else {
      current = 0;
    }
  }

  return longest;
}

export function computeBreakProbability(
  allCompletions: Date[],
  now: Date = new Date()
): number {
  const total = allCompletions.length;
  if (total === 0) return 0.5;

  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setUTCDate(thirtyDaysAgo.getUTCDate() - 30);

  const last30 = allCompletions.filter((d) => d >= thirtyDaysAgo);
  const completionsLast30 = last30.length;
  const pComplete = completionsLast30 / 30;

  const todayDow = now.getUTCDay();

  let totalTodayDow = 0;
  let completionsOnTodayDow = 0;

  for (let i = 0; i < 30; i++) {
    const day = new Date(thirtyDaysAgo);
    day.setUTCDate(day.getUTCDate() + i);
    if (day.getUTCDay() === todayDow) {
      totalTodayDow++;
    }
  }

  if (totalTodayDow > 0) {
    completionsOnTodayDow = last30.filter(
      (d) => d.getUTCDay() === todayDow
    ).length;
  }

  const pCompleteDow =
    totalTodayDow > 0 ? completionsOnTodayDow / totalTodayDow : pComplete;

  const posterior_complete = pCompleteDow * pComplete;
  const posterior_break = (1 - pCompleteDow) * (1 - pComplete);
  const denom = posterior_complete + posterior_break;

  let pBreak: number;
  if (denom === 0) {
    pBreak = 0.5;
  } else {
    pBreak = 1 - posterior_complete / denom;
  }

  if (total < 7) {
    const blend = total / 7;
    pBreak = pBreak * blend + 0.5 * (1 - blend);
  }

  return Math.min(1, Math.max(0, pBreak));
}

export function computeRiskLabel(p: number): "low" | "medium" | "high" {
  if (p < 0.25) return "low";
  if (p < 0.6) return "medium";
  return "high";
}

export async function recomputeStats(
  habitId: string,
  category: "build" | "break" = "build",
  startedAt: Date = new Date()
): Promise<void> {
  const rows = await db
    .select({ completedAt: completions.completedAt })
    .from(completions)
    .where(eq(completions.habitId, habitId))
    .orderBy(completions.completedAt);

  const dates = rows.map((r) => r.completedAt);

  let currentStreak: number;
  let longestStreak: number;
  let probability: number;

  if (category === "break") {
    currentStreak = computeCleanStreak(dates, startedAt);
    longestStreak = computeLongestCleanStreak(dates, startedAt);
    // relapse probability = P(you complete/relapse today)
    probability = 1 - computeBreakProbability(dates);
  } else {
    currentStreak = computeCurrentStreak(dates);
    longestStreak = computeLongestStreak(dates);
    probability = computeBreakProbability(dates);
  }

  const totalCompletions = dates.length;
  const riskLabel = computeRiskLabel(probability);

  await db
    .insert(habitStats)
    .values({
      habitId,
      currentStreak,
      longestStreak,
      totalCompletions,
      breakProbability: probability.toFixed(4),
      riskLabel,
      lastComputed: new Date(),
    })
    .onConflictDoUpdate({
      target: habitStats.habitId,
      set: {
        currentStreak,
        longestStreak,
        totalCompletions,
        breakProbability: probability.toFixed(4),
        riskLabel,
        lastComputed: new Date(),
      },
    });

  // Recompute scores for all goals linked to this habit
  const linkedGoalRows = await db
    .select({ goalId: goalHabits.goalId })
    .from(goalHabits)
    .where(eq(goalHabits.habitId, habitId));

  for (const { goalId } of linkedGoalRows) {
    await recomputeGoalScore(goalId);
  }
}

// ─── Goal Score Engine ────────────────────────────────────────────────────────

/**
 * Compute 0–100 progress score for a single habit toward a goal.
 * Build habits: based on 30-day completion rate (50%) + streak strength (50%).
 * Break habits: based on clean streak ratio (60%) + low relapse rate (40%).
 */
export async function computeHabitContribution(
  habitId: string,
  category: "build" | "break",
  startedAt: Date
): Promise<number> {
  const allRows = await db
    .select({ completedAt: completions.completedAt })
    .from(completions)
    .where(eq(completions.habitId, habitId));

  const dates = allRows.map((r) => r.completedAt);
  const statsRow = await db
    .select()
    .from(habitStats)
    .where(eq(habitStats.habitId, habitId));
  const stats = statsRow[0];

  if (!stats) return 0;

  if (category === "break") {
    const daysSinceStart = Math.max(
      1,
      Math.floor((Date.now() - startedAt.getTime()) / 86400000)
    );
    const cleanStreak = stats.currentStreak;
    // Clean streak: ratio capped at 100 days for full score
    const streakScore = Math.min(cleanStreak / 100, 1) * 60;
    // Low relapse rate: count relapses in last 30 days
    const cutoff = subDays(new Date(), 30);
    const relapses = dates.filter((d) => d >= cutoff).length;
    const relapseScore = Math.max(0, 1 - relapses / 10) * 40;
    return Math.round(streakScore + relapseScore);
  } else {
    const cutoff = subDays(new Date(), 30);
    const last30 = dates.filter((d) => d >= cutoff).length;
    const completionRate = last30 / 30;
    const rateScore = completionRate * 50;
    // Streak: 30 days = full score
    const streakScore = Math.min(stats.currentStreak / 30, 1) * 50;
    return Math.round(rateScore + streakScore);
  }
}

export async function recomputeGoalScore(goalId: string): Promise<void> {
  // Fetch linked habits with their weights
  const linked = await db
    .select({
      habitId: goalHabits.habitId,
      weight: goalHabits.weight,
    })
    .from(goalHabits)
    .where(eq(goalHabits.goalId, goalId));

  if (linked.length === 0) {
    await db
      .insert(goalScores)
      .values({ goalId, score: "0", trend: "stable" })
      .onConflictDoUpdate({
        target: goalScores.goalId,
        set: { score: "0", lastComputed: new Date() },
      });
    return;
  }

  // Fetch habit metadata for category/createdAt
  const habitIds = linked.map((l) => l.habitId);
  const habitRows = await db
    .select({ id: habits.id, category: habits.category, createdAt: habits.createdAt })
    .from(habits)
    .where(inArray(habits.id, habitIds));

  const habitMeta = new Map(habitRows.map((h) => [h.id, h]));

  let weightedSum = 0;
  let totalWeight = 0;

  for (const { habitId, weight } of linked) {
    const meta = habitMeta.get(habitId);
    if (!meta) continue;
    const w = parseFloat(weight as string);
    const contribution = await computeHabitContribution(
      habitId,
      (meta.category as "build" | "break") ?? "build",
      meta.createdAt
    );
    weightedSum += contribution * w;
    totalWeight += w;
  }

  const score = totalWeight > 0 ? Math.round(weightedSum / totalWeight) : 0;

  // Determine trend vs last week's snapshot
  const existing = await db
    .select({ scoreLastWeek: goalScores.scoreLastWeek, score: goalScores.score })
    .from(goalScores)
    .where(eq(goalScores.goalId, goalId));

  let trend: "improving" | "declining" | "stable" = "stable";
  const prevScore = existing[0]?.scoreLastWeek
    ? parseFloat(existing[0].scoreLastWeek as string)
    : null;

  if (prevScore !== null) {
    if (score > prevScore + 2) trend = "improving";
    else if (score < prevScore - 2) trend = "declining";
  }

  await db
    .insert(goalScores)
    .values({
      goalId,
      score: score.toString(),
      trend,
      lastComputed: new Date(),
    })
    .onConflictDoUpdate({
      target: goalScores.goalId,
      set: { score: score.toString(), trend, lastComputed: new Date() },
    });

  // Record history point once per day (upsert by date is not needed — just append)
  await db.insert(goalScoreHistory).values({
    goalId,
    score: score.toString(),
    recordedAt: new Date(),
  });
}
