"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { RiLoader4Line } from "@remixicon/react";

interface ReflectionDialogProps {
  habitId: string;
  completionId: string;
  habitName: string;
  open: boolean;
  onClose: () => void;
}

const PROMPTS = [
  "What made today's session easier or harder than usual?",
  "What were you feeling right before you completed this?",
  "What environment or context helped you follow through?",
  "What almost stopped you today?",
];

export function ReflectionDialog({
  habitId,
  completionId,
  habitName,
  open,
  onClose,
}: ReflectionDialogProps) {
  const prompt = PROMPTS[Math.floor(Math.random() * PROMPTS.length)];
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (!text.trim()) {
      onClose();
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/habits/${habitId}/reflections`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completionId, reflection: text.trim(), prompt }),
      });
      if (!res.ok) throw new Error("Failed to save");
      toast.success("Reflection saved");
    } catch {
      toast.error("Couldn't save reflection");
    } finally {
      setLoading(false);
      setText("");
      onClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Quick reflection — {habitName}</DialogTitle>
          <DialogDescription className="italic">{prompt}</DialogDescription>
        </DialogHeader>
        <textarea
          className="w-full rounded-md border bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring min-h-[100px]"
          placeholder="Type your reflection… (skip to close)"
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={2000}
          autoFocus
        />
        <p className="text-xs text-muted-foreground text-right">{text.length}/2000</p>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={loading}>
            Skip
          </Button>
          <Button onClick={handleSave} disabled={loading}>
            {loading ? <RiLoader4Line className="h-4 w-4 animate-spin" /> : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
