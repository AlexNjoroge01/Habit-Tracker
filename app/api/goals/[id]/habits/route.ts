import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { goals, goalHabits } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { linkHabitSchema } from "@/lib/validations";
import { revalidateTag } from "next/cache";
import { headers } from "next/headers";
import { recomputeGoalScore } from "@/lib/stats";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: Params) {
  const { id } = await params;
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [goal] = await db
    .select()
    .from(goals)
    .where(and(eq(goals.id, id), eq(goals.userId, session.user.id)));

  if (!goal) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await request.json();
  const parsed = linkHabitSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const [link] = await db
    .insert(goalHabits)
    .values({
      goalId: id,
      habitId: parsed.data.habitId,
      weight: (parsed.data.weight ?? 1).toFixed(2),
    })
    .onConflictDoUpdate({
      target: [goalHabits.goalId, goalHabits.habitId],
      set: { weight: (parsed.data.weight ?? 1).toFixed(2) },
    })
    .returning();

  await recomputeGoalScore(id);
  revalidateTag(`goal:${id}`, "max");

  return NextResponse.json({ data: link }, { status: 201 });
}
