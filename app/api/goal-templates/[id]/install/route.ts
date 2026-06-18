import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { goalTemplates, habitTemplates, goals, goalScores, goalHabits, habitStats } from "@/db/schema";
import { eq } from "drizzle-orm";
import { installGoalTemplateSchema } from "@/lib/validations";
import { revalidateTag } from "next/cache";
import { headers } from "next/headers";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: Params) {
  const { id } = await params;
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const parsed = installGoalTemplateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const [template] = await db
    .select()
    .from(goalTemplates)
    .where(eq(goalTemplates.id, id));

  if (!template || !template.isPublic) {
    return NextResponse.json({ error: "Template not found" }, { status: 404 });
  }

  // Create goal from template
  const [goal] = await db
    .insert(goals)
    .values({
      userId: session.user.id,
      title: parsed.data.title ?? template.title,
      description: template.description,
    })
    .returning();

  await db.insert(goalScores).values({ goalId: goal.id });

  // Install all bundled habit templates under this goal template
  const bundledHabitTemplates = await db
    .select()
    .from(habitTemplates)
    .where(eq(habitTemplates.goalTemplateId, id));

  for (const ht of bundledHabitTemplates) {
    const { habits } = await import("@/db/schema");
    const [habit] = await db
      .insert(habits)
      .values({
        userId: session.user.id,
        name: ht.name,
        description: ht.description ?? undefined,
        color: ht.color,
        category: ht.category as "build" | "break",
      })
      .returning();

    await db.insert(habitStats).values({ habitId: habit.id });

    await db.insert(goalHabits).values({ goalId: goal.id, habitId: habit.id }).onConflictDoNothing();

    // Increment habit template install count
    await db
      .update(habitTemplates)
      .set({ installCount: ht.installCount + 1 })
      .where(eq(habitTemplates.id, ht.id));
  }

  // Increment goal template install count
  await db
    .update(goalTemplates)
    .set({ installCount: template.installCount + 1 })
    .where(eq(goalTemplates.id, id));

  revalidateTag(`goals:${session.user.id}`, "max");
  revalidateTag(`habits:${session.user.id}`, "max");
  revalidateTag("goal-templates", "max");
  revalidateTag("templates", "max");

  return NextResponse.json({ data: { goal } }, { status: 201 });
}
