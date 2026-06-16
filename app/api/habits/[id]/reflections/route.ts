import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { completions, habits } from "@/db/schema";
import { and, eq, isNotNull, desc } from "drizzle-orm";
import { addReflectionSchema } from "@/lib/validations";
import { revalidateTag } from "next/cache";
import { headers } from "next/headers";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
  const { id } = await params;
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [habit] = await db
    .select()
    .from(habits)
    .where(and(eq(habits.id, id), eq(habits.userId, session.user.id)));

  if (!habit) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const rows = await db
    .select({
      id: completions.id,
      completedAt: completions.completedAt,
      note: completions.note,
      reflection: completions.reflection,
      reflectionPrompt: completions.reflectionPrompt,
    })
    .from(completions)
    .where(and(eq(completions.habitId, id), isNotNull(completions.reflection)))
    .orderBy(desc(completions.completedAt))
    .limit(50);

  return NextResponse.json({ data: rows });
}

// POST: add or update a reflection on a specific completion
export async function POST(request: NextRequest, { params }: Params) {
  const { id } = await params;
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const parsed = addReflectionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  // Verify habit ownership
  const [habit] = await db
    .select()
    .from(habits)
    .where(and(eq(habits.id, id), eq(habits.userId, session.user.id)));

  if (!habit) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const [updated] = await db
    .update(completions)
    .set({
      reflection: parsed.data.reflection,
      reflectionPrompt: parsed.data.prompt ?? null,
    })
    .where(
      and(
        eq(completions.id, parsed.data.completionId),
        eq(completions.habitId, id),
        eq(completions.userId, session.user.id)
      )
    )
    .returning();

  if (!updated) return NextResponse.json({ error: "Completion not found" }, { status: 404 });

  revalidateTag(`reflections:${id}`, "max");

  return NextResponse.json({ data: updated });
}
