import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { TemplatesContent } from "./templates-content";

export default function TemplatesPage() {
  return (
    <Suspense fallback={<Skeleton className="h-96 w-full" />}>
      <TemplatesContent />
    </Suspense>
  );
}
