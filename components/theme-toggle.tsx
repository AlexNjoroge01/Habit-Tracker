"use client";

import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { RiMoonLine, RiSunLine } from "@remixicon/react";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
    >
      {theme === "dark" ? (
        <RiSunLine className="h-4 w-4" />
      ) : (
        <RiMoonLine className="h-4 w-4" />
      )}
    </Button>
  );
}
