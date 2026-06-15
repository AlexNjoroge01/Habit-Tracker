import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { HabitsContent } from "./habits-content";

export default function HabitsPage() {
  return (
    <Suspense fallback={<Skeleton className="h-96 w-full" />}>
      <HabitsContent />
    </Suspense>
  );
}
