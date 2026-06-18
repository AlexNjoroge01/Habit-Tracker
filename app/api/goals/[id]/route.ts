import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { goals } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { updateGoalSchema } from "@/lib/validations";
import { revalidateTag } from "next/cache";
import { headers } from "next/headers";
import { getGoalDetail } from "@/lib/data";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
  const { id } = await params;
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const detail = await getGoalDetail(id);
  if (!detail || detail.goal.userId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ data: detail });
}

export async function PATCH(request: NextRequest, { params }: Params) {
  const { id } = await params;
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [goal] = await db
    .select()
    .from(goals)
    .where(and(eq(goals.id, id), eq(goals.userId, session.user.id)));

  if (!goal) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await request.json();
  const parsed = updateGoalSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { weight, ...rest } = parsed.data;
  const [updated] = await db
    .update(goals)
    .set({ ...rest, ...(weight !== undefined ? { weight: weight.toString() } : {}) })
    .where(eq(goals.id, id))
    .returning();

  revalidateTag(`goals:${session.user.id}`, "max");
  revalidateTag(`goal:${id}`, "max");

  return NextResponse.json({ data: updated });
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  const { id } = await params;
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [goal] = await db
    .select()
    .from(goals)
    .where(and(eq(goals.id, id), eq(goals.userId, session.user.id)));

  if (!goal) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const [archived] = await db
    .update(goals)
    .set({ archivedAt: new Date() })
    .where(eq(goals.id, id))
    .returning();

  revalidateTag(`goals:${session.user.id}`, "max");
  revalidateTag(`goal:${id}`, "max");

  return NextResponse.json({ data: archived });
}
