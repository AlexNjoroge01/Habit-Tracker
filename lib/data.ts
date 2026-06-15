import { db } from "@/db";
import { completions, habits, habitStats } from "@/db/schema";
import { and, desc, eq, gte, isNull } from "drizzle-orm";
import { subDays } from "date-fns";
import { cacheTag } from "next/cache";

export async function getHabitsForUser(userId: string) {
  "use cache";
  cacheTag(`habits:${userId}`);

  return db
    .select({
      id: habits.id,
      userId: habits.userId,
      name: habits.name,
      description: habits.description,
      color: habits.color,
      category: habits.category,
      createdAt: habits.createdAt,
      archivedAt: habits.archivedAt,
      currentStreak: habitStats.currentStreak,
      longestStreak: habitStats.longestStreak,
      totalCompletions: habitStats.totalCompletions,
      breakProbability: habitStats.breakProbability,
      riskLabel: habitStats.riskLabel,
    })
    .from(habits)
    .leftJoin(habitStats, eq(habits.id, habitStats.habitId))
    .where(eq(habits.userId, userId))
    .orderBy(desc(habits.createdAt));
}

export async function getHabitStats(habitId: string) {
  "use cache";
  cacheTag(`stats:${habitId}`);

  const [stats] = await db
    .select()
    .from(habitStats)
    .where(eq(habitStats.habitId, habitId));

  const oneYearAgo = subDays(new Date(), 365);
  const allCompletions = await db
    .select({ completedAt: completions.completedAt })
    .from(completions)
    .where(
      and(
        eq(completions.habitId, habitId),
        gte(completions.completedAt, oneYearAgo)
      )
    )
    .orderBy(desc(completions.completedAt));

  return { stats, completions: allCompletions };
}

export async function getTodayCompletions(userId: string) {
  "use cache";
  cacheTag(`habits:${userId}`);

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  return db
    .select({ habitId: completions.habitId })
    .from(completions)
    .where(and(eq(completions.userId, userId), gte(completions.completedAt, today)));
}
