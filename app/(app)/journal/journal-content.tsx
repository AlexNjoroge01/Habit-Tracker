import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getHabitsForUser } from "@/lib/data";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { RiArrowRightLine, RiQuillPenLine } from "@remixicon/react";

export async function JournalContent() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");

  const habits = await getHabitsForUser(session.user.id);
  const active = habits.filter((h) => !h.archivedAt);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Journal</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Reflections are logged after each completion. Select a habit to view and analyze your patterns.
        </p>
      </div>

      {active.length === 0 ? (
        <p className="text-muted-foreground text-sm py-8 text-center">
          No habits yet.{" "}
          <Link href="/habits" className="text-primary underline underline-offset-2">
            Create a habit
          </Link>{" "}
          to start journaling.
        </p>
      ) : (
        <div className="flex flex-col divide-y border rounded-lg overflow-hidden">
          {active.map((h) => (
            <Link
              key={h.id}
              href={`/habits/${h.id}?tab=journal`}
              className="flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors group"
            >
              <div className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: h.color }} />
              <span className="flex-1 text-sm font-medium">{h.name}</span>
              <Badge variant="secondary" className="text-xs">{h.category}</Badge>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <RiQuillPenLine className="h-3.5 w-3.5" />
                <span>{h.totalCompletions ?? 0} entries</span>
              </div>
              <RiArrowRightLine className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
