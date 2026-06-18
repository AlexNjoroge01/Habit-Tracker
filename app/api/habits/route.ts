import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { habits, habitStats, goalHabits, goals } from "@/db/schema";
import { eq, desc, and } from "drizzle-orm";
import { createHabitSchema } from "@/lib/validations";
import { revalidateTag } from "next/cache";
import { headers } from "next/headers";
import { recomputeGoalScore } from "@/lib/stats";

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rows = await db
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
    .where(eq(habits.userId, session.user.id))
    .orderBy(desc(habits.createdAt));

  return NextResponse.json({ data: rows });
}

export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = createHabitSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { goalId, ...habitData } = parsed.data;

  const [habit] = await db
    .insert(habits)
    .values({ ...habitData, userId: session.user.id })
    .returning();

  await db.insert(habitStats).values({ habitId: habit.id });

  // Auto-link to goal if provided
  if (goalId) {
    const [goal] = await db
      .select({ id: goals.id })
      .from(goals)
      .where(and(eq(goals.id, goalId), eq(goals.userId, session.user.id)));

    if (goal) {
      await db
        .insert(goalHabits)
        .values({ goalId, habitId: habit.id })
        .onConflictDoNothing();

      await recomputeGoalScore(goalId);
      revalidateTag(`goal:${goalId}`, "max");
    }
  }

  revalidateTag(`habits:${session.user.id}`, "max");

  return NextResponse.json({ data: habit }, { status: 201 });
}
