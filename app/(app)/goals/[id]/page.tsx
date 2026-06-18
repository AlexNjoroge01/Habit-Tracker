import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { GoalDetailContent } from "./goal-detail-content";

export default function GoalDetailPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col gap-6">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      }
    >
      <GoalDetailContent />
    </Suspense>
  );
}
