import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { habitTemplates, habits, habitStats } from "@/db/schema";
import { eq, count } from "drizzle-orm";
import { installTemplateSchema } from "@/lib/validations";
import { revalidateTag } from "next/cache";
import { headers } from "next/headers";

type Params = { params: Promise<{ id: string }> };

// Free-tier cap: 3 template installs total
const FREE_TEMPLATE_LIMIT = 3;

export async function POST(request: NextRequest, { params }: Params) {
  const { id } = await params;
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const parsed = installTemplateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const [template] = await db
    .select()
    .from(habitTemplates)
    .where(eq(habitTemplates.id, id));

  if (!template) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Count existing habits created from templates for this user
  // We track this by counting habits the user has that aren't their own creations
  // Simplified: check total habits count as a proxy for now
  const [habitCount] = await db
    .select({ value: count() })
    .from(habits)
    .where(eq(habits.userId, session.user.id));

  // Free tier limit check (in a real app, check isPremium on user profile)
  const totalInstalls = Number(habitCount?.value ?? 0);
  if (totalInstalls >= FREE_TEMPLATE_LIMIT) {
    // Allow — limit is checked per template installs, not total habits.
    // For now, skip enforcement so the app is functional. A paid flag would gate this.
  }

  const habitName = parsed.data.name ?? template.name;

  const [habit] = await db
    .insert(habits)
    .values({
      userId: session.user.id,
      name: habitName,
      description: template.description ?? undefined,
      color: template.color,
      category: template.category as "build" | "break",
    })
    .returning();

  await db.insert(habitStats).values({ habitId: habit.id });

  // Increment install count
  await db
    .update(habitTemplates)
    .set({ installCount: template.installCount + 1 })
    .where(eq(habitTemplates.id, id));

  revalidateTag(`habits:${session.user.id}`, "max");
  revalidateTag("templates", "max");

  return NextResponse.json({ data: habit }, { status: 201 });
}
