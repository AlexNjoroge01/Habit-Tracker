import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { completions, habits, habitStats } from "@/db/schema";
import { and, eq, sql } from "drizzle-orm";
import { logCompletionSchema, undoCompletionSchema } from "@/lib/validations";
import { recomputeStats } from "@/lib/stats";
import { revalidateTag } from "next/cache";
import { headers } from "next/headers";
import { format } from "date-fns";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: Params) {
  const { id } = await params;
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const parsed = logCompletionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten() },
      { status: 400 }
    );
  }

  // Verify habit ownership
  const [habit] = await db
    .select()
    .from(habits)
    .where(and(eq(habits.id, id), eq(habits.userId, session.user.id)));

  if (!habit) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const dateStr = parsed.data.date ?? format(new Date(), "yyyy-MM-dd");
  const completedAt = new Date(`${dateStr}T00:00:00.000Z`);

  await db
    .insert(completions)
    .values({
      habitId: id,
      userId: session.user.id,
      completedAt,
      note: parsed.data.note,
    })
    .onConflictDoNothing();

  await recomputeStats(
    id,
    (habit.category as "build" | "break") ?? "build",
    habit.createdAt
  );

  revalidateTag(`stats:${id}`, "max");
  revalidateTag(`habits:${session.user.id}`, "max");

  const [stats] = await db
    .select()
    .from(habitStats)
    .where(eq(habitStats.habitId, id));

  return NextResponse.json({ data: stats });
}

export async function DELETE(request: NextRequest, { params }: Params) {
  const { id } = await params;
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = undoCompletionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const dateStr = parsed.data.date;
  const targetDate = new Date(`${dateStr}T00:00:00.000Z`);
  const nextDate = new Date(targetDate);
  nextDate.setUTCDate(nextDate.getUTCDate() + 1);

  const [habitForUndo] = await db
    .select()
    .from(habits)
    .where(and(eq(habits.id, id), eq(habits.userId, session.user.id)));

  await db
    .delete(completions)
    .where(
      and(
        eq(completions.habitId, id),
        eq(completions.userId, session.user.id),
        sql`DATE(${completions.completedAt}) = DATE(${targetDate.toISOString()})`
      )
    );

  await recomputeStats(
    id,
    (habitForUndo?.category as "build" | "break") ?? "build",
    habitForUndo?.createdAt ?? new Date()
  );

  revalidateTag(`stats:${id}`, "max");
  revalidateTag(`habits:${session.user.id}`, "max");

  return NextResponse.json({ data: { success: true } });
}
