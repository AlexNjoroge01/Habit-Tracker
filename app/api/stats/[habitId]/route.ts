import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { completions, habitStats, habits } from "@/db/schema";
import { and, eq, gte, desc } from "drizzle-orm";
import { headers } from "next/headers";
import { subDays } from "date-fns";

type Params = { params: Promise<{ habitId: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const { habitId } = await params;
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [habit] = await db
    .select()
    .from(habits)
    .where(and(eq(habits.id, habitId), eq(habits.userId, session.user.id)));

  if (!habit) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const [stats] = await db
    .select()
    .from(habitStats)
    .where(eq(habitStats.habitId, habitId));

  const oneYearAgo = subDays(new Date(), 365);
  const allCompletions = await db
    .select({ completedAt: completions.completedAt, note: completions.note })
    .from(completions)
    .where(
      and(
        eq(completions.habitId, habitId),
        gte(completions.completedAt, oneYearAgo)
      )
    )
    .orderBy(desc(completions.completedAt));

  return NextResponse.json({ data: { stats, completions: allCompletions } });
}
