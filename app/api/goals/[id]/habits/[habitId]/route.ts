import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { goals, goalHabits } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { revalidateTag } from "next/cache";
import { headers } from "next/headers";
import { recomputeGoalScore } from "@/lib/stats";

type Params = { params: Promise<{ id: string; habitId: string }> };

export async function DELETE(_request: NextRequest, { params }: Params) {
  const { id, habitId } = await params;
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [goal] = await db
    .select()
    .from(goals)
    .where(and(eq(goals.id, id), eq(goals.userId, session.user.id)));

  if (!goal) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await db
    .delete(goalHabits)
    .where(and(eq(goalHabits.goalId, id), eq(goalHabits.habitId, habitId)));

  await recomputeGoalScore(id);
  revalidateTag(`goal:${id}`, "max");

  return NextResponse.json({ data: { success: true } });
}
