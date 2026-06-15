"use client";

import { useEffect, useRef } from "react";
import { toast } from "sonner";

interface HighRiskAlertProps {
  habits: string[];
}

export function HighRiskAlert({ habits }: HighRiskAlertProps) {
  const shown = useRef(false);

  useEffect(() => {
    if (!shown.current && habits.length > 0) {
      shown.current = true;
      habits.forEach((name) => {
        toast.warning(`⚠ High break risk today for ${name}`);
      });
    }
  }, []);

  return null;
}
