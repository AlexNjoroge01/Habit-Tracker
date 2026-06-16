import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { accountabilityPartners } from "@/db/schema";
import { user } from "@/db/auth-schema";
import { eq } from "drizzle-orm";
import { invitePartnerSchema } from "@/lib/validations";
import { revalidateTag } from "next/cache";
import { headers } from "next/headers";
import { getPartnershipsForUser } from "@/lib/data";

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const partnerships = await getPartnershipsForUser(session.user.id);
  return NextResponse.json({ data: partnerships });
}

export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const parsed = invitePartnerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  if (parsed.data.partnerEmail === session.user.email) {
    return NextResponse.json({ error: "You cannot invite yourself" }, { status: 400 });
  }

  // Look up partner by email if they're already registered
  const [existingUser] = await db
    .select({ id: user.id })
    .from(user)
    .where(eq(user.email, parsed.data.partnerEmail));

  const [partnership] = await db
    .insert(accountabilityPartners)
    .values({
      userId: session.user.id,
      partnerEmail: parsed.data.partnerEmail,
      partnerId: existingUser?.id ?? null,
      status: "pending",
    })
    .returning();

  revalidateTag(`partners:${session.user.id}`, "max");

  return NextResponse.json({ data: partnership }, { status: 201 });
}
