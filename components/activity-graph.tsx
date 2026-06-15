"use client";

import { useMemo } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { format, startOfWeek, subWeeks, addDays, isSameDay } from "date-fns";

interface ActivityGraphProps {
  completions: Date[];
  color: string;
  year?: number;
  compact?: boolean;
}

export function ActivityGraph({
  completions,
  color,
  year,
  compact = false,
}: ActivityGraphProps) {
  const weeks = compact ? 16 : 53;

  const { cells, monthLabels } = useMemo(() => {
    const today = new Date();
    const endDate = today;
    const startDate = subWeeks(startOfWeek(endDate, { weekStartsOn: 0 }), weeks - 1);

    const completionSet = new Set(
      completions.map((d) => format(d, "yyyy-MM-dd"))
    );

    const cells: { date: Date; completed: boolean }[] = [];
    let cursor = startDate;
    while (cursor <= endDate) {
      cells.push({
        date: new Date(cursor),
        completed: completionSet.has(format(cursor, "yyyy-MM-dd")),
      });
      cursor = addDays(cursor, 1);
    }

    // Build month labels: find first cell of each month in the grid
    const monthLabels: { label: string; colIndex: number }[] = [];
    let lastMonth = -1;
    cells.forEach((cell, i) => {
      const col = Math.floor(i / 7);
      const month = cell.date.getMonth();
      if (month !== lastMonth) {
        monthLabels.push({ label: format(cell.date, "MMM"), colIndex: col });
        lastMonth = month;
      }
    });

    return { cells, monthLabels };
  }, [completions, weeks]);

  const totalCols = Math.ceil(cells.length / 7);
  const dayLabels = compact ? [] : ["Mon", "", "Wed", "", "Fri", "", ""];

  return (
    <div className="flex flex-col gap-1 overflow-x-auto">
      {/* Month labels */}
      <div
        className="flex text-[10px] text-muted-foreground ml-8"
        style={{ gap: "2px" }}
      >
        {Array.from({ length: totalCols }).map((_, col) => {
          const label = monthLabels.find((m) => m.colIndex === col);
          return (
            <div key={col} className="w-[10px] shrink-0">
              {label ? label.label : ""}
            </div>
          );
        })}
      </div>

      <div className="flex gap-1">
        {/* Day labels */}
        {!compact && (
          <div className="flex flex-col gap-[2px] text-[9px] text-muted-foreground mr-1 justify-between">
            {dayLabels.map((label, i) => (
              <div key={i} className="h-[10px] leading-[10px]">
                {label}
              </div>
            ))}
          </div>
        )}

        {/* Grid */}
        <TooltipProvider delay={100}>
          <div
            className="grid gap-[2px]"
            style={{
              gridTemplateRows: "repeat(7, 10px)",
              gridAutoFlow: "column",
              gridAutoColumns: "10px",
            }}
          >
            {cells.map((cell, i) => {
              const label = format(cell.date, "EEE dd MMM");
              return (
                <Tooltip key={i}>
                  <TooltipTrigger
                    className="w-[10px] h-[10px] rounded-sm cursor-default p-0 border-0 outline-none"
                    style={{
                      backgroundColor: cell.completed ? color : undefined,
                    }}
                    data-completed={cell.completed}
                  >
                    {!cell.completed && (
                      <div className="w-full h-full rounded-sm bg-muted" />
                    )}
                  </TooltipTrigger>
                  <TooltipContent side="top" className="text-xs">
                    {label} — {cell.completed ? "Completed" : "Not logged"}
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </div>
        </TooltipProvider>
      </div>
    </div>
  );
}
