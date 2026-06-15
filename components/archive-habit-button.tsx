"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface ArchiveHabitButtonProps {
  habitId: string;
}

export function ArchiveHabitButton({ habitId }: ArchiveHabitButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleArchive = async () => {
    if (!confirm("Archive this habit? It won't appear on your dashboard but data is kept.")) return;
    setLoading(true);
    try {
      await fetch(`/api/habits/${habitId}`, { method: "DELETE" });
      toast("Habit archived");
      router.push("/habits");
    } catch {
      toast.error("Couldn't archive — try again");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-medium">Archive habit</p>
        <p className="text-xs text-muted-foreground">
          Soft-deletes. Your completion history is preserved.
        </p>
      </div>
      <Button
        variant="destructive"
        size="sm"
        onClick={handleArchive}
        disabled={loading}
      >
        {loading ? "Archiving…" : "Archive"}
      </Button>
    </div>
  );
}
