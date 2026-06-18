import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { journalEntries, goals, habits } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { addJournalEntrySchema } from "@/lib/validations";
import { revalidateTag } from "next/cache";
import { headers } from "next/headers";
import { getJournalEntries, getJournalEntriesForGoal, getJournalEntriesForHabit } from "@/lib/data";

export async function GET(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const goalId = searchParams.get("goalId");
  const habitId = searchParams.get("habitId");

  if (goalId) {
    const entries = await getJournalEntriesForGoal(goalId);
    return NextResponse.json({ data: entries });
  }

  if (habitId) {
    const entries = await getJournalEntriesForHabit(habitId);
    return NextResponse.json({ data: entries });
  }

  const entries = await getJournalEntries(session.user.id);
  return NextResponse.json({ data: entries });
}

export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const parsed = addJournalEntrySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { body: entryBody, goalId, habitId } = parsed.data;

  // Validate goal ownership if provided
  if (goalId) {
    const [goal] = await db
      .select({ id: goals.id })
      .from(goals)
      .where(and(eq(goals.id, goalId), eq(goals.userId, session.user.id)));
    if (!goal) return NextResponse.json({ error: "Goal not found" }, { status: 404 });
  }

  // Validate habit ownership if provided
  if (habitId) {
    const [habit] = await db
      .select({ id: habits.id })
      .from(habits)
      .where(and(eq(habits.id, habitId), eq(habits.userId, session.user.id)));
    if (!habit) return NextResponse.json({ error: "Habit not found" }, { status: 404 });
  }

  const [entry] = await db
    .insert(journalEntries)
    .values({
      userId: session.user.id,
      body: entryBody,
      goalId: goalId ?? null,
      habitId: habitId ?? null,
    })
    .returning();

  revalidateTag(`journal:${session.user.id}`, "max");
  if (goalId) revalidateTag(`journal-goal:${goalId}`, "max");
  if (habitId) revalidateTag(`journal-habit:${habitId}`, "max");

  return NextResponse.json({ data: entry }, { status: 201 });
}

export async function DELETE(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const [entry] = await db
    .select()
    .from(journalEntries)
    .where(and(eq(journalEntries.id, id), eq(journalEntries.userId, session.user.id)));

  if (!entry) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await db.delete(journalEntries).where(eq(journalEntries.id, id));

  revalidateTag(`journal:${session.user.id}`, "max");
  if (entry.goalId) revalidateTag(`journal-goal:${entry.goalId}`, "max");
  if (entry.habitId) revalidateTag(`journal-habit:${entry.habitId}`, "max");

  return NextResponse.json({ data: { success: true } });
}
