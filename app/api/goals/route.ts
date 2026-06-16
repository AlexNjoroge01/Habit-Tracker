import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { goals, goalScores } from "@/db/schema";
import { createGoalSchema } from "@/lib/validations";
import { revalidateTag } from "next/cache";
import { headers } from "next/headers";
import { getGoalsForUser } from "@/lib/data";

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const goalsList = await getGoalsForUser(session.user.id);
  return NextResponse.json({ data: goalsList });
}

export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const parsed = createGoalSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const [goal] = await db
    .insert(goals)
    .values({
      userId: session.user.id,
      title: parsed.data.title,
      description: parsed.data.description,
      targetDate: parsed.data.targetDate ?? null,
    })
    .returning();

  await db.insert(goalScores).values({ goalId: goal.id });

  revalidateTag(`goals:${session.user.id}`, "max");

  return NextResponse.json({ data: goal }, { status: 201 });
}
