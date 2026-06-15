import { db } from "@/db";
import { completions, habitStats } from "@/db/schema";
import { eq } from "drizzle-orm";

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
}
