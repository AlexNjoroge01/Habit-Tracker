import Link from "next/link";
import { Card, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { GoalProgressRing } from "@/components/goal-progress-ring";
import { RiArrowRightLine, RiCalendar2Line } from "@remixicon/react";
import { format } from "date-fns";

interface GoalCardProps {
  goal: {
    id: string;
    title: string;
    description: string;
    targetDate: string | null;
    score: string | null;
    trend: string | null;
  };
}

export function GoalCard({ goal }: GoalCardProps) {
  const score = goal.score ? Math.round(parseFloat(goal.score)) : 0;
  const trend = (goal.trend ?? "stable") as "improving" | "declining" | "stable";

  return (
    <Link href={`/goals/${goal.id}`} className="block group">
      <Card className="transition-shadow group-hover:shadow-md">
        <CardHeader className="pb-2 flex-row items-start gap-4">
          <GoalProgressRing score={score} trend={trend} size={56} />
          <div className="flex-1 min-w-0">
            <CardTitle className="text-sm font-semibold leading-snug truncate">{goal.title}</CardTitle>
            <CardDescription className="text-xs mt-1 line-clamp-2">{goal.description}</CardDescription>
          </div>
        </CardHeader>
        <CardFooter className="pt-0 flex items-center justify-between">
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            {goal.targetDate && (
              <>
                <RiCalendar2Line className="h-3 w-3" />
                {format(new Date(goal.targetDate), "MMM d, yyyy")}
              </>
            )}
          </div>
          <RiArrowRightLine className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
        </CardFooter>
      </Card>
    </Link>
  );
}
