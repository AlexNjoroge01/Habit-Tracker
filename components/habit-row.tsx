"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RiArchiveLine, RiArrowRightLine } from "@remixicon/react";
import { toast } from "sonner";
import { useState } from "react";

interface HabitRowProps {
  habit: {
    id: string;
    name: string;
    color: string;
    category?: string | null;
    currentStreak?: number | null;
    riskLabel?: string | null;
  };
  archived?: boolean;
}

const RISK_COLORS: Record<string, string> = {
  low: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
  medium: "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300",
  high: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
};

export function HabitRow({ habit, archived = false }: HabitRowProps) {
  const router = useRouter();
  const [archiving, setArchiving] = useState(false);

  const handleArchive = async () => {
    setArchiving(true);
    try {
      await fetch(`/api/habits/${habit.id}`, { method: "DELETE" });
      toast("Habit archived", {
        action: { label: "Undo", onClick: () => {} },
      });
      router.refresh();
    } catch {
      toast.error("Couldn't archive — try again");
    } finally {
      setArchiving(false);
    }
  };

  return (
    <div className="flex items-center gap-3 px-4 py-3 bg-background hover:bg-muted/50 transition-colors">
      <div
        className="h-3 w-3 rounded-full shrink-0"
        style={{ backgroundColor: habit.color }}
      />
      <div className="flex-1 min-w-0">
        <Link
          href={`/habits/${habit.id}`}
          className="font-medium hover:underline text-sm truncate block"
        >
          {habit.name}
        </Link>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {!archived && habit.riskLabel && (
          <span
            className={`text-xs px-2 py-0.5 rounded-full font-medium ${RISK_COLORS[habit.riskLabel] ?? ""}`}
          >
            {habit.riskLabel}
          </span>
        )}
        {habit.currentStreak != null && (
          <span className="text-xs text-muted-foreground">
            {habit.category === "break" ? "✨" : "🔥"} {habit.currentStreak}d
            {habit.category === "break" ? " clean" : ""}
          </span>
        )}
        {!archived && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
            onClick={handleArchive}
            disabled={archiving}
            title="Archive"
          >
            <RiArchiveLine className="h-3.5 w-3.5" />
          </Button>
        )}
        <Button
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0"
          render={<Link href={`/habits/${habit.id}`} />}
        >
          <RiArrowRightLine className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
