import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { accountabilityPartners, habits, habitStats, completions } from "@/db/schema";
import { and, eq, desc, gte } from "drizzle-orm";
import { revalidateTag } from "next/cache";
import { headers } from "next/headers";

type Params = { params: Promise<{ id: string }> };

// Accept or decline a partnership invite
export async function PATCH(request: NextRequest, { params }: Params) {
  const { id } = await params;
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const action: "accept" | "decline" = body.action;

  if (!["accept", "decline"].includes(action)) {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  const [partnership] = await db
    .select()
    .from(accountabilityPartners)
    .where(eq(accountabilityPartners.id, id));

  if (!partnership) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Only the invited partner (matched by email or partnerId) can accept/decline
  const isInvitee =
    partnership.partnerEmail === session.user.email ||
    partnership.partnerId === session.user.id;

  if (!isInvitee) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const newStatus = action === "accept" ? "active" : "declined";

  const [updated] = await db
    .update(accountabilityPartners)
    .set({
      status: newStatus,
      partnerId: action === "accept" ? session.user.id : partnership.partnerId,
      acceptedAt: action === "accept" ? new Date() : null,
    })
    .where(eq(accountabilityPartners.id, id))
    .returning();

  revalidateTag(`partners:${partnership.userId}`, "max");
  revalidateTag(`partners:${session.user.id}`, "max");

  return NextResponse.json({ data: updated });
}

// Read-only dashboard: partner views the habit owner's stats
export async function GET(_request: NextRequest, { params }: Params) {
  const { id } = await params;
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [partnership] = await db
    .select()
    .from(accountabilityPartners)
    .where(and(eq(accountabilityPartners.id, id), eq(accountabilityPartners.status, "active")));

  if (!partnership) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const isParticipant =
    partnership.userId === session.user.id || partnership.partnerId === session.user.id;

  if (!isParticipant) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  // Return the habit owner's active habits with stats
  const ownerHabits = await db
    .select({
      id: habits.id,
      name: habits.name,
      color: habits.color,
      category: habits.category,
      currentStreak: habitStats.currentStreak,
      longestStreak: habitStats.longestStreak,
      totalCompletions: habitStats.totalCompletions,
      breakProbability: habitStats.breakProbability,
      riskLabel: habitStats.riskLabel,
    })
    .from(habits)
    .leftJoin(habitStats, eq(habits.id, habitStats.habitId))
    .where(eq(habits.userId, partnership.userId));

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const todayCompletions = await db
    .select({ habitId: completions.habitId })
    .from(completions)
    .where(and(eq(completions.userId, partnership.userId), gte(completions.completedAt, today)));

  const todaySet = new Set(todayCompletions.map((c) => c.habitId));

  return NextResponse.json({
    data: {
      partnership,
      habits: ownerHabits.map((h) => ({ ...h, isCompletedToday: todaySet.has(h.id) })),
    },
  });
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  const { id } = await params;
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [partnership] = await db
    .select()
    .from(accountabilityPartners)
    .where(eq(accountabilityPartners.id, id));

  if (!partnership) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const isParticipant =
    partnership.userId === session.user.id || partnership.partnerId === session.user.id;

  if (!isParticipant) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  await db
    .delete(accountabilityPartners)
    .where(eq(accountabilityPartners.id, id));

  revalidateTag(`partners:${partnership.userId}`, "max");
  if (partnership.partnerId) revalidateTag(`partners:${partnership.partnerId}`, "max");

  return NextResponse.json({ data: { success: true } });
}
