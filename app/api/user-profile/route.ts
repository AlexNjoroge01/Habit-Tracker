import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { userProfile } from "@/db/schema";
import { eq } from "drizzle-orm";
import { updateDreamStatementSchema } from "@/lib/validations";
import { revalidateTag } from "next/cache";
import { headers } from "next/headers";
import { getUserProfile } from "@/lib/data";

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const profile = await getUserProfile(session.user.id);
  return NextResponse.json({ data: profile });
}

export async function PATCH(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const parsed = updateDreamStatementSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const [profile] = await db
    .insert(userProfile)
    .values({
      userId: session.user.id,
      dreamStatement: parsed.data.dreamStatement,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: userProfile.userId,
      set: {
        dreamStatement: parsed.data.dreamStatement,
        updatedAt: new Date(),
      },
    })
    .returning();

  revalidateTag(`profile:${session.user.id}`, "max");

  return NextResponse.json({ data: profile });
}
