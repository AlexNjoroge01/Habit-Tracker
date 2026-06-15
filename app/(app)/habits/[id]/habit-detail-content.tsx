import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { db } from "@/db";
import { habits, completions } from "@/db/schema";
import { and, eq, desc } from "drizzle-orm";
import { getHabitStats } from "@/lib/data";
import { ActivityGraph } from "@/components/activity-graph";
import { RiskMeter } from "@/components/risk-meter";
import { CompletionButton } from "@/components/completion-button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ArchiveHabitButton } from "@/components/archive-habit-button";
import { format, subDays } from "date-fns";

type Props = { params: Promise<{ id: string }> };

function getDowBreakdown(completionDates: Date[], windowDays = 30) {
  const cutoff = subDays(new Date(), windowDays);
  const recent = completionDates.filter((d) => d >= cutoff);
  const labels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return labels.map((label, dow) => {
    let total = 0;
    let completed = 0;
    for (let i = 0; i < windowDays; i++) {
      const d = subDays(new Date(), i);
      if (d.getDay() === dow) {
        total++;
        if (recent.some((c) => c.toDateString() === d.toDateString())) {
          completed++;
        }
      }
    }
    return { dow, label, rate: total > 0 ? completed / total : 0 };
  });
}

export async function HabitDetailContent({ params }: Props) {
  const { id } = await params;
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");

  const [habit] = await db
    .select()
    .from(habits)
    .where(and(eq(habits.id, id), eq(habits.userId, session.user.id)));

  if (!habit) notFound();

  const { stats, completions: completionRows } = await getHabitStats(id);
  const completionDates = completionRows.map((c) => c.completedAt);

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const isCompletedToday = completionDates.some(
    (d) => d >= today && d < new Date(today.getTime() + 86400000)
  );

  const dowBreakdown = getDowBreakdown(completionDates);
  const todayDow = new Date().getDay();

  const last30 = await db
    .select({ completedAt: completions.completedAt, note: completions.note })
    .from(completions)
    .where(eq(completions.habitId, id))
    .orderBy(desc(completions.completedAt))
    .limit(30);

  const pBreak = parseFloat(stats?.breakProbability ?? "0.5");
  const riskLabel = stats?.riskLabel ?? "medium";

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div
            className="h-4 w-4 rounded-full shrink-0"
            style={{ backgroundColor: habit.color }}
          />
          <h1 className="text-2xl font-bold">{habit.name}</h1>
        </div>
        <CompletionButton
          habitId={id}
          habitName={habit.name}
          isCompleted={isCompletedToday}
          streak={stats?.currentStreak ?? 0}
          color={habit.color}
          category={habit.category}
        />
      </div>

      {habit.description && (
        <p className="text-muted-foreground -mt-4">{habit.description}</p>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Activity — {new Date().getFullYear()}</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <ActivityGraph completions={completionDates} color={habit.color} />
        </CardContent>
      </Card>

      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6 flex flex-col items-center gap-1">
            <span className="text-3xl font-bold">{stats?.currentStreak ?? 0}</span>
            <span className="text-xs text-muted-foreground text-center">
              {habit.category === "break" ? "Days clean" : "Current streak"}
            </span>
            <span className="text-xs text-muted-foreground">days</span>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 flex flex-col items-center gap-1">
            <span className="text-3xl font-bold">{stats?.longestStreak ?? 0}</span>
            <span className="text-xs text-muted-foreground text-center">
              {habit.category === "break" ? "Best clean run" : "Longest streak"}
            </span>
            <span className="text-xs text-muted-foreground">days</span>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 flex flex-col items-center gap-1">
            <span className="text-3xl font-bold">{stats?.totalCompletions ?? 0}</span>
            <span className="text-xs text-muted-foreground text-center">
              {habit.category === "break" ? "Total relapses" : "Total completions"}
            </span>
            <span className="text-xs text-muted-foreground">all time</span>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">
            {habit.category === "break" ? "Relapse Analysis" : "Risk Analysis"}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          <RiskMeter breakProbability={pBreak} riskLabel={riskLabel} category={habit.category} />
          <Separator />
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-3">
              Completion rate by day (last 30 days)
            </p>
            <div className="flex flex-col gap-2">
              {dowBreakdown.map(({ dow, label, rate }) => (
                <div
                  key={dow}
                  className={`flex items-center gap-3 rounded px-2 py-1 ${
                    dow === todayDow ? "bg-muted" : ""
                  }`}
                >
                  <span className="text-xs w-7 text-muted-foreground">{label}</span>
                  <div className="flex-1 bg-muted rounded-full h-1.5 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${Math.round(rate * 100)}%`,
                        backgroundColor: habit.color,
                      }}
                    />
                  </div>
                  <span className="text-xs w-9 text-right text-muted-foreground">
                    {Math.round(rate * 100)}%
                  </span>
                  {dow === todayDow && (
                    <span className="text-xs text-primary font-medium">today</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {last30.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">
            {habit.category === "break" ? "Relapse log" : "Recent completions"}
          </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col divide-y">
              {last30.map((c, i) => (
                <div key={i} className="flex items-center justify-between py-2">
                  <span className="text-sm">{format(c.completedAt, "EEE, MMM d")}</span>
                  {c.note && (
                    <span className="text-xs text-muted-foreground max-w-xs truncate">
                      {c.note}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {!habit.archivedAt && (
        <Card className="border-destructive/30">
          <CardHeader>
            <CardTitle className="text-sm font-medium text-destructive">Danger zone</CardTitle>
          </CardHeader>
          <CardContent>
            <ArchiveHabitButton habitId={id} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
