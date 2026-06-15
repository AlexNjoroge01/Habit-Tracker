import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { SettingsContent } from "./settings-content";

export default function SettingsPage() {
  return (
    <Suspense fallback={<Skeleton className="h-64 w-full max-w-lg" />}>
      <SettingsContent />
    </Suspense>
  );
}
