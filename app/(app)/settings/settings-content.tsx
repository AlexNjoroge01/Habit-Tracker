import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SignOutButton } from "@/components/sign-out-button";
import { AppearanceContent } from "@/app/(app)/appearance/appearance-content";

export async function SettingsContent() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");

  return (
    <div className="flex flex-col gap-8 max-w-3xl">
      <h1 className="text-2xl font-bold">Settings</h1>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Account</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">{session.user.name}</p>
              <p className="text-xs text-muted-foreground">{session.user.email}</p>
            </div>
            <SignOutButton />
          </div>
        </CardContent>
      </Card>

      <div>
        <h2 className="text-xl font-semibold mb-1">Appearance</h2>
        <p className="text-sm text-muted-foreground mb-6">
          Choose if the app should be light or dark, or follow your system settings.
        </p>
        <AppearanceContent />
      </div>
    </div>
  );
}
