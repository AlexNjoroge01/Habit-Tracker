import { db } from "@/db";
import {
  completions,
  habits,
  habitStats,
  habitTemplates,
  accountabilityPartners,
  goals,
  goalHabits,
  goalScores,
  goalScoreHistory,
  userProfile,
  userStats,
  journalEntries,
  goalTemplates,
} from "@/db/schema";
import { and, desc, eq, gte, or, isNull, isNotNull } from "drizzle-orm";
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

// ─── User Profile ─────────────────────────────────────────────────────────────

export async function getUserProfile(userId: string) {
  "use cache";
  cacheTag(`profile:${userId}`);

  const [profile] = await db
    .select()
    .from(userProfile)
    .where(eq(userProfile.userId, userId));

  return profile ?? null;
}

// ─── User Stats (Dream Life Score) ───────────────────────────────────────────

export async function getUserStats(userId: string) {
  "use cache";
  cacheTag(`user-stats:${userId}`);

  const [stats] = await db
    .select()
    .from(userStats)
    .where(eq(userStats.userId, userId));

  return stats ?? null;
}

// ─── Templates ────────────────────────────────────────────────────────────────

export async function getTemplates() {
  "use cache";
  cacheTag("templates");

  return db
    .select()
    .from(habitTemplates)
    .where(eq(habitTemplates.isPublic, true))
    .orderBy(desc(habitTemplates.installCount));
}

export async function getGoalTemplates() {
  "use cache";
  cacheTag("goal-templates");

  return db
    .select()
    .from(goalTemplates)
    .where(eq(goalTemplates.isPublic, true))
    .orderBy(desc(goalTemplates.installCount));
}

// ─── Accountability Partners ──────────────────────────────────────────────────

export async function getPartnershipsForUser(userId: string) {
  "use cache";
  cacheTag(`partners:${userId}`);

  return db
    .select()
    .from(accountabilityPartners)
    .where(
      or(
        eq(accountabilityPartners.userId, userId),
        eq(accountabilityPartners.partnerId, userId)
      )
    )
    .orderBy(desc(accountabilityPartners.invitedAt));
}

// ─── Reflections (legacy — kept for backwards compat) ────────────────────────

export async function getReflectionsForHabit(habitId: string) {
  "use cache";
  cacheTag(`reflections:${habitId}`);

  return db
    .select({
      id: completions.id,
      completedAt: completions.completedAt,
      reflection: completions.reflection,
      reflectionPrompt: completions.reflectionPrompt,
      note: completions.note,
    })
    .from(completions)
    .where(
      and(eq(completions.habitId, habitId), isNotNull(completions.reflection))
    )
    .orderBy(desc(completions.completedAt));
}

// ─── Journal Entries ──────────────────────────────────────────────────────────

export async function getJournalEntries(userId: string) {
  "use cache";
  cacheTag(`journal:${userId}`);

  return db
    .select({
      id: journalEntries.id,
      body: journalEntries.body,
      createdAt: journalEntries.createdAt,
      goalId: journalEntries.goalId,
      goalTitle: goals.title,
      habitId: journalEntries.habitId,
      habitName: habits.name,
      habitColor: habits.color,
    })
    .from(journalEntries)
    .leftJoin(goals, eq(journalEntries.goalId, goals.id))
    .leftJoin(habits, eq(journalEntries.habitId, habits.id))
    .where(eq(journalEntries.userId, userId))
    .orderBy(desc(journalEntries.createdAt));
}

export async function getJournalEntriesForGoal(goalId: string) {
  "use cache";
  cacheTag(`journal-goal:${goalId}`);

  return db
    .select({
      id: journalEntries.id,
      body: journalEntries.body,
      createdAt: journalEntries.createdAt,
      habitId: journalEntries.habitId,
      habitName: habits.name,
      habitColor: habits.color,
    })
    .from(journalEntries)
    .leftJoin(habits, eq(journalEntries.habitId, habits.id))
    .where(eq(journalEntries.goalId, goalId))
    .orderBy(desc(journalEntries.createdAt));
}

export async function getJournalEntriesForHabit(habitId: string) {
  "use cache";
  cacheTag(`journal-habit:${habitId}`);

  return db
    .select({
      id: journalEntries.id,
      body: journalEntries.body,
      createdAt: journalEntries.createdAt,
      goalId: journalEntries.goalId,
      goalTitle: goals.title,
    })
    .from(journalEntries)
    .leftJoin(goals, eq(journalEntries.goalId, goals.id))
    .where(eq(journalEntries.habitId, habitId))
    .orderBy(desc(journalEntries.createdAt));
}

// ─── Goals ────────────────────────────────────────────────────────────────────

export async function getGoalsForUser(userId: string) {
  "use cache";
  cacheTag(`goals:${userId}`);

  const rows = await db
    .select({
      id: goals.id,
      userId: goals.userId,
      title: goals.title,
      description: goals.description,
      weight: goals.weight,
      targetDate: goals.targetDate,
      createdAt: goals.createdAt,
      archivedAt: goals.archivedAt,
      score: goalScores.score,
      trend: goalScores.trend,
      scoreLastWeek: goalScores.scoreLastWeek,
    })
    .from(goals)
    .leftJoin(goalScores, eq(goals.id, goalScores.goalId))
    .where(and(eq(goals.userId, userId), isNull(goals.archivedAt)))
    .orderBy(desc(goals.createdAt));

  return rows;
}

export async function getGoalDetail(goalId: string) {
  "use cache";
  cacheTag(`goal:${goalId}`);

  const [goal] = await db.select().from(goals).where(eq(goals.id, goalId));
  if (!goal) return null;

  const [score] = await db
    .select()
    .from(goalScores)
    .where(eq(goalScores.goalId, goalId));

  const history = await db
    .select()
    .from(goalScoreHistory)
    .where(eq(goalScoreHistory.goalId, goalId))
    .orderBy(desc(goalScoreHistory.recordedAt))
    .limit(30);

  const linked = await db
    .select({
      habitId: goalHabits.habitId,
      weight: goalHabits.weight,
      name: habits.name,
      color: habits.color,
      category: habits.category,
      currentStreak: habitStats.currentStreak,
      totalCompletions: habitStats.totalCompletions,
      breakProbability: habitStats.breakProbability,
      riskLabel: habitStats.riskLabel,
    })
    .from(goalHabits)
    .innerJoin(habits, eq(goalHabits.habitId, habits.id))
    .leftJoin(habitStats, eq(habits.id, habitStats.habitId))
    .where(eq(goalHabits.goalId, goalId));

  return { goal, score, history, habits: linked };
}

// ─── Habits grouped by goal (for dashboard) ───────────────────────────────────

export async function getHabitsGroupedByGoal(userId: string) {
  "use cache";
  cacheTag(`habits:${userId}`);
  cacheTag(`goals:${userId}`);

  const activeGoals = await db
    .select({
      id: goals.id,
      title: goals.title,
      score: goalScores.score,
      trend: goalScores.trend,
    })
    .from(goals)
    .leftJoin(goalScores, eq(goals.id, goalScores.goalId))
    .where(and(eq(goals.userId, userId), isNull(goals.archivedAt)))
    .orderBy(desc(goals.createdAt));

  const goalHabitRows = await db
    .select({
      goalId: goalHabits.goalId,
      habitId: goalHabits.habitId,
    })
    .from(goalHabits)
    .innerJoin(habits, eq(goalHabits.habitId, habits.id))
    .where(eq(habits.userId, userId));

  const linkedHabitIds = new Set(goalHabitRows.map((r) => r.habitId));

  const allHabits = await db
    .select({
      id: habits.id,
      name: habits.name,
      color: habits.color,
      category: habits.category,
      archivedAt: habits.archivedAt,
      createdAt: habits.createdAt,
      currentStreak: habitStats.currentStreak,
      breakProbability: habitStats.breakProbability,
      riskLabel: habitStats.riskLabel,
      totalCompletions: habitStats.totalCompletions,
    })
    .from(habits)
    .leftJoin(habitStats, eq(habits.id, habitStats.habitId))
    .where(and(eq(habits.userId, userId), isNull(habits.archivedAt)));

  const habitMap = new Map(allHabits.map((h) => [h.id, h]));

  const grouped = activeGoals.map((g) => {
    const linkedIds = goalHabitRows.filter((r) => r.goalId === g.id).map((r) => r.habitId);
    const linkedHabits = linkedIds.map((id) => habitMap.get(id)).filter(Boolean);
    return { goal: g, habits: linkedHabits };
  });

  const ungrouped = allHabits.filter((h) => !linkedHabitIds.has(h.id));

  return { grouped, ungrouped };
}
