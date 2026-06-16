import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { habitTemplates } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { publishTemplateSchema } from "@/lib/validations";
import { revalidateTag } from "next/cache";
import { headers } from "next/headers";
import { getTemplates } from "@/lib/data";

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const templates = await getTemplates();
  return NextResponse.json({ data: templates });
}

export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const parsed = publishTemplateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const [template] = await db
    .insert(habitTemplates)
    .values({
      ...parsed.data,
      createdBy: session.user.id,
      isPublic: true,
    })
    .returning();

  revalidateTag("templates", "max");

  return NextResponse.json({ data: template }, { status: 201 });
}
