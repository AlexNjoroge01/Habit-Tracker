import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";

export async function HomeRedirect() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (session) redirect("/dashboard");
  redirect("/login");
  return null;
}
