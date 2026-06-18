import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { goalTemplates } from "@/db/schema";
import { eq } from "drizzle-orm";
import { createGoalTemplateSchema } from "@/lib/validations";
import { revalidateTag } from "next/cache";
import { headers } from "next/headers";
import { getGoalTemplates } from "@/lib/data";

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const templates = await getGoalTemplates();
  return NextResponse.json({ data: templates });
}

export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const parsed = createGoalTemplateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const [template] = await db
    .insert(goalTemplates)
    .values({
      createdBy: session.user.id,
      title: parsed.data.title,
      description: parsed.data.description,
      pack: parsed.data.pack,
    })
    .returning();

  revalidateTag("goal-templates", "max");

  return NextResponse.json({ data: template }, { status: 201 });
}
