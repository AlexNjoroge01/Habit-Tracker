import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import {
  getUserProfile,
  getUserStats,
  getHabitsGroupedByGoal,
  getTodayCompletions,
  getHabitStats,
} from "@/lib/data";
import { HabitCard } from "@/components/habit-card";
import { CreateHabitDialog } from "@/components/create-habit-dialog";
import { format } from "date-fns";
import { HighRiskAlert } from "@/components/high-risk-alert";
import Link from "next/link";
import { GoalProgressRing } from "@/components/goal-progress-ring";

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

export async function DashboardContent() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");

  const [profile, stats, { grouped, ungrouped }, todayCompletions] = await Promise.all([
    getUserProfile(session.user.id),
    getUserStats(session.user.id),
    getHabitsGroupedByGoal(session.user.id),
    getTodayCompletions(session.user.id),
  ]);

  const todayHabitIds = new Set(todayCompletions.map((c) => c.habitId));
  const dreamScore = stats ? Math.round(parseFloat(stats.dreamScore as string)) : null;

  // Fetch completions for all habits (for activity graph)
  const allHabits = [
    ...grouped.flatMap((g) => g.habits),
    ...ungrouped,
  ].filter(Boolean) as NonNullable<(typeof ungrouped)[number]>[];

  const habitCompletions = await Promise.all(
    allHabits.map(async (habit) => {
      const { completions } = await getHabitStats(habit.id);
      return { habitId: habit.id, completions: completions.map((c) => c.completedAt) };
    })
  );
  const completionsMap = new Map(habitCompletions.map((h) => [h.habitId, h.completions]));

  // High-risk alerts
  const highRisk = allHabits.filter(
    (h) => !todayHabitIds.has(h.id) && h.riskLabel === "high" && h.category !== "break"
  );
  const highRelapse = allHabits.filter(
    (h) => h.riskLabel === "high" && h.category === "break"
  );

  return (
    <div className="flex flex-col gap-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">
          {greeting()}, {session.user.name.split(" ")[0]}
        </h1>
        <p className="text-muted-foreground text-sm mt-0.5">
          {format(new Date(), "EEEE, MMMM d")}
        </p>
      </div>

      {/* Dream Life Statement */}
      {profile?.dreamStatement ? (
        <div className="rounded-lg border border-primary/20 bg-primary/5 px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-primary/70 mb-1">
            Your dream life
          </p>
          <p className="text-sm text-foreground/80 italic leading-relaxed line-clamp-2">
            &ldquo;{profile.dreamStatement}&rdquo;
          </p>
        </div>
      ) : (
        <div className="rounded-lg border border-dashed px-4 py-3 flex items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">
            Define your dream life to anchor everything you do here.
          </p>
          <Link
            href="/goals"
            className="shrink-0 text-xs font-medium text-primary underline underline-offset-2"
          >
            Set it now
          </Link>
        </div>
      )}

      {/* Dream Life Score hero */}
      {dreamScore !== null && (
        <div className="flex items-center gap-6 rounded-xl border bg-card p-5">
          <div className="shrink-0">
            <GoalProgressRing score={dreamScore} trend="stable" size={80} />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-0.5">
              Dream Life Score
            </p>
            <p className="text-3xl font-bold">{dreamScore}<span className="text-base font-normal text-muted-foreground">/100</span></p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Weighted average across all your goals
            </p>
          </div>
        </div>
      )}

      <HighRiskAlert habits={highRisk.map((h) => h.name)} />

      {highRelapse.length > 0 && (
        <div className="rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/40 px-4 py-3 text-sm text-red-700 dark:text-red-300">
          High relapse risk today: {highRelapse.map((h) => h.name).join(", ")}
        </div>
      )}

      {/* Habits grouped by goal */}
      {grouped.map(({ goal, habits: goalHabits }) => {
        if (!goalHabits || goalHabits.length === 0) return null;
        const goalScore = goal.score ? Math.round(parseFloat(goal.score as string)) : 0;
        const trend = (goal.trend ?? "stable") as "improving" | "declining" | "stable";

        return (
          <section key={goal.id}>
            <div className="flex items-center gap-3 mb-3">
              <Link
                href={`/goals/${goal.id}`}
                className="flex items-center gap-2 group"
              >
                <GoalProgressRing score={goalScore} trend={trend} size={28} />
                <span className="text-sm font-semibold group-hover:text-primary transition-colors">
                  {goal.title}
                </span>
              </Link>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {goalHabits.map((habit) => {
                if (!habit) return null;
                return (
                  <HabitCard
                    key={habit.id}
                    habit={habit}
                    completions={completionsMap.get(habit.id) ?? []}
                    isCompletedToday={todayHabitIds.has(habit.id)}
                  />
                );
              })}
            </div>
          </section>
        );
      })}

      {/* Ungrouped habits */}
      {ungrouped.length > 0 && (
        <section>
          <div className="flex items-baseline gap-2 mb-3">
            <h2 className="text-base font-semibold">Other habits</h2>
            <span className="text-xs text-muted-foreground">not linked to a goal</span>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {ungrouped.map((habit) => (
              <HabitCard
                key={habit.id}
                habit={habit}
                completions={completionsMap.get(habit.id) ?? []}
                isCompletedToday={todayHabitIds.has(habit.id)}
              />
            ))}
          </div>
        </section>
      )}

      {/* Empty state */}
      {grouped.length === 0 && ungrouped.length === 0 && (
        <div className="rounded-lg border border-dashed p-12 text-center">
          <p className="text-muted-foreground text-sm mb-3">
            No habits yet. Start with a goal, then add habits to it.
          </p>
          <Link
            href="/goals"
            className="text-sm font-medium text-primary underline underline-offset-2"
          >
            Create your first goal
          </Link>
        </div>
      )}

      <CreateHabitDialog />
    </div>
  );
}
