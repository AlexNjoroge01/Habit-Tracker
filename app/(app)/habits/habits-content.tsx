import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getHabitsForUser } from "@/lib/data";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { HabitRow } from "@/components/habit-row";
import { CreateHabitDialog } from "@/components/create-habit-dialog";

export async function HabitsContent() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");

  const allHabits = await getHabitsForUser(session.user.id);
  const active = allHabits.filter((h) => !h.archivedAt);
  const archived = allHabits.filter((h) => h.archivedAt);

  return (
    <div className="">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Habits</h1>
      </div>

      <Tabs defaultValue="active">
        <TabsList className="mb-4">
          <TabsTrigger value="active">
            Active <Badge variant="secondary" className="ml-1.5">{active.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="archived">
            Archived <Badge variant="secondary" className="ml-1.5">{archived.length}</Badge>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active">
          {active.length === 0 ? (
            <p className="text-muted-foreground text-sm py-8 text-center">
              No habits yet. Add your first one.
            </p>
          ) : (
            <div className="flex flex-col divide-y border rounded-lg overflow-hidden">
              {active.map((habit) => (
                <HabitRow key={habit.id} habit={habit} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="archived">
          {archived.length === 0 ? (
            <p className="text-muted-foreground text-sm py-8 text-center">
              No archived habits.
            </p>
          ) : (
            <div className="flex flex-col divide-y border rounded-lg overflow-hidden">
              {archived.map((habit) => (
                <HabitRow key={habit.id} habit={habit} archived />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <CreateHabitDialog />
    </div>
  );
}
