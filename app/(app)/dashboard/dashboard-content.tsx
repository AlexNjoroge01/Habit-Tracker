import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getHabitsForUser, getTodayCompletions, getHabitStats } from "@/lib/data";
import { HabitCard } from "@/components/habit-card";
import { CreateHabitDialog } from "@/components/create-habit-dialog";
import { format } from "date-fns";
import { HighRiskAlert } from "@/components/high-risk-alert";

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

export async function DashboardContent() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");

  const allHabits = await getHabitsForUser(session.user.id);
  const activeHabits = allHabits.filter((h) => !h.archivedAt);
  const todayCompletions = await getTodayCompletions(session.user.id);
  const todayHabitIds = new Set(todayCompletions.map((c) => c.habitId));

  const habitsWithData = await Promise.all(
    activeHabits.map(async (habit) => {
      const { completions } = await getHabitStats(habit.id);
      return {
        habit,
        completions: completions.map((c) => c.completedAt),
        isCompletedToday: todayHabitIds.has(habit.id),
      };
    })
  );

  const buildHabits = habitsWithData.filter((h) => h.habit.category !== "break");
  const breakHabits = habitsWithData.filter((h) => h.habit.category === "break");

  // For "Today" pill row: build habits not yet logged
  const buildIncomplete = buildHabits.filter((h) => !h.isCompletedToday);
  const buildAllDone = buildHabits.length > 0 && buildIncomplete.length === 0;

  // High-risk = build habits likely to be missed, or break habits with high relapse risk
  const highRisk = habitsWithData.filter(
    (h) => !h.isCompletedToday && h.habit.riskLabel === "high" && h.habit.category !== "break"
  );
  const highRelapse = habitsWithData.filter(
    (h) => h.habit.riskLabel === "high" && h.habit.category === "break"
  );

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-bold">
          {greeting()}, {session.user.name.split(" ")[0]}
        </h1>
        <p className="text-muted-foreground text-sm mt-0.5">
          {format(new Date(), "EEEE, MMMM d")}
        </p>
      </div>

      <HighRiskAlert habits={highRisk.map((h) => h.habit.name)} />

      {highRelapse.length > 0 && (
        <div className="rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/40 px-4 py-3 text-sm text-red-700 dark:text-red-300">
          ⚠ High relapse risk today: {highRelapse.map((h) => h.habit.name).join(", ")}
        </div>
      )}

      {/* Build habits section */}
      <section>
        <div className="flex items-baseline gap-2 mb-3">
          <h2 className="text-base font-semibold">Building 🌱</h2>
          <span className="text-xs text-muted-foreground">habits you&apos;re growing</span>
        </div>

        {buildHabits.length === 0 ? (
          <div className="rounded-lg border border-dashed p-8 text-center">
            <p className="text-muted-foreground text-sm">No build habits yet.</p>
          </div>
        ) : (
          <>
            {buildIncomplete.length > 0 && !buildAllDone && (
              <div className="mb-3 flex gap-2 overflow-x-auto pb-1">
                {buildIncomplete.map(({ habit }) => (
                  <div
                    key={habit.id}
                    className="shrink-0 flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium"
                    style={{ borderColor: habit.color }}
                  >
                    <div className="h-2 w-2 rounded-full" style={{ backgroundColor: habit.color }} />
                    {habit.name}
                  </div>
                ))}
              </div>
            )}
            {buildAllDone && (
              <div className="mb-3 rounded-lg border bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800 px-4 py-2 text-sm text-green-700 dark:text-green-300 font-medium">
                All build habits done today! 🎉
              </div>
            )}
            <div className="grid gap-4 sm:grid-cols-2">
              {buildHabits.map(({ habit, completions, isCompletedToday }) => (
                <HabitCard
                  key={habit.id}
                  habit={habit}
                  completions={completions}
                  isCompletedToday={isCompletedToday}
                />
              ))}
            </div>
          </>
        )}
      </section>

      {/* Break habits section */}
      <section>
        <div className="flex items-baseline gap-2 mb-3">
          <h2 className="text-base font-semibold">Breaking 🛑</h2>
          <span className="text-xs text-muted-foreground">habits you&apos;re quitting</span>
        </div>

        {breakHabits.length === 0 ? (
          <div className="rounded-lg border border-dashed p-8 text-center">
            <p className="text-muted-foreground text-sm">No break habits yet.</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {breakHabits.map(({ habit, completions, isCompletedToday }) => (
              <HabitCard
                key={habit.id}
                habit={habit}
                completions={completions}
                isCompletedToday={isCompletedToday}
              />
            ))}
          </div>
        )}
      </section>

      <CreateHabitDialog />
    </div>
  );
}
