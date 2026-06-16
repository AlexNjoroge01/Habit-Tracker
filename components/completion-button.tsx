"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { format } from "date-fns";
import { RiLoader4Line, RiCloseLine } from "@remixicon/react";
import { ReflectionDialog } from "@/components/reflection-dialog";

interface CompletionButtonProps {
  habitId: string;
  habitName: string;
  isCompleted: boolean;
  streak: number;
  color: string;
  category?: string | null;
  onComplete?: () => void;
}

export function CompletionButton({
  habitId,
  habitName,
  isCompleted: initialCompleted,
  streak,
  color,
  category = "build",
  onComplete,
}: CompletionButtonProps) {
  const [completed, setCompleted] = useState(initialCompleted);
  const [loading, setLoading] = useState(false);
  const [reflectionCompletionId, setReflectionCompletionId] = useState<string | null>(null);
  const today = format(new Date(), "yyyy-MM-dd");
  const isBreak = category === "break";

  const handleLog = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/habits/${habitId}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: today }),
      });
      if (!res.ok) throw new Error("Failed to log");
      const { data } = await res.json();
      setCompleted(true);
      if (isBreak) {
        toast(`Relapse logged for ${habitName}. Tomorrow is a new day.`);
      } else {
        toast.success(`✓ Logged — ${data.currentStreak ?? streak + 1} day streak!`);
        if (data.completionId) setReflectionCompletionId(data.completionId);
      }
      onComplete?.();
    } catch {
      toast.error("Couldn't log — try again");
    } finally {
      setLoading(false);
    }
  };

  const handleUndo = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/habits/${habitId}/complete`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: today }),
      });
      if (!res.ok) throw new Error("Failed to undo");
      setCompleted(false);
      toast(isBreak ? `Undo: relapse removed for ${habitName}` : `Undo: ${habitName} completion removed`);
    } catch {
      toast.error("Couldn't undo — try again");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Button disabled size="sm" variant="outline">
        <RiLoader4Line className="h-3 w-3 animate-spin" />
      </Button>
    );
  }

  if (completed) {
    if (isBreak) {
      return (
        <div className="flex items-center gap-1">
          <Button
            size="sm"
            variant="outline"
            className="text-red-600 border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950 dark:text-red-400"
            disabled
          >
            ⚠ Relapsed
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
            onClick={handleUndo}
            title="Undo"
          >
            <RiCloseLine className="h-3 w-3" />
          </Button>
        </div>
      );
    }

    return (
      <div className="flex items-center gap-1">
        <Button
          size="sm"
          variant="outline"
          className="text-green-600 border-green-200 bg-green-50 hover:bg-green-100 dark:border-green-800 dark:bg-green-950 dark:text-green-400 dark:hover:bg-green-900"
          disabled
        >
          ✓ Done
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
          onClick={handleUndo}
          title="Undo"
        >
          <RiCloseLine className="h-3 w-3" />
        </Button>
      </div>
    );
  }

  if (isBreak) {
    return (
      <Button
        size="sm"
        onClick={handleLog}
        variant="outline"
        className="border-red-300 text-red-600 hover:bg-red-50 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-950"
      >
        Log relapse
      </Button>
    );
  }

  return (
    <>
      <Button
        size="sm"
        onClick={handleLog}
        style={{ backgroundColor: color, borderColor: color }}
        className="text-white hover:opacity-90"
      >
        Log today
      </Button>
      {reflectionCompletionId && (
        <ReflectionDialog
          habitId={habitId}
          completionId={reflectionCompletionId}
          habitName={habitName}
          open={!!reflectionCompletionId}
          onClose={() => setReflectionCompletionId(null)}
        />
      )}
    </>
  );
}
