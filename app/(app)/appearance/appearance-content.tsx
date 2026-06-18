"use client";

import { useTheme } from "next-themes";
import { useAccentTheme } from "@/components/accent-theme-provider";
import { THEMES } from "@/lib/themes";
import { cn } from "@/lib/utils";
import { RiCheckLine } from "@remixicon/react";

const MODES = [
  {
    id: "system",
    name: "System preference",
    description: "Use your system's settings.",
    preview: (
      <div className="h-20 rounded-lg overflow-hidden flex border border-border">
        <div className="flex-1 bg-white p-2 flex flex-col gap-1.5">
          <div className="h-1.5 w-3/4 rounded-full bg-gray-200" />
          <div className="h-1.5 w-1/2 rounded-full bg-gray-200" />
          <div className="mt-auto h-4 w-full rounded bg-gray-900" />
        </div>
        <div className="w-px bg-border" />
        <div className="flex-1 bg-gray-900 p-2 flex flex-col gap-1.5">
          <div className="h-1.5 w-3/4 rounded-full bg-gray-700" />
          <div className="h-1.5 w-1/2 rounded-full bg-gray-700" />
          <div className="mt-auto h-4 w-full rounded bg-gray-100" />
        </div>
      </div>
    ),
  },
  {
    id: "light",
    name: "Light mode",
    description: "Light and bright for readability.",
    preview: (
      <div className="h-20 rounded-lg overflow-hidden border border-border bg-white p-2 flex flex-col gap-1.5">
        <div className="flex gap-1.5">
          <div className="h-1.5 w-2/3 rounded-full bg-gray-200" />
        </div>
        <div className="h-1.5 w-2/5 rounded-full bg-gray-200" />
        <div className="mt-auto flex gap-1.5">
          <div className="h-4 w-16 rounded bg-gray-900" />
          <div className="h-4 w-10 rounded bg-gray-200" />
        </div>
      </div>
    ),
  },
  {
    id: "dark",
    name: "Dark mode",
    description: "Reduced glare and blue light.",
    preview: (
      <div className="h-20 rounded-lg overflow-hidden border border-gray-700 bg-gray-950 p-2 flex flex-col gap-1.5">
        <div className="flex gap-1.5">
          <div className="h-1.5 w-2/3 rounded-full bg-gray-700" />
        </div>
        <div className="h-1.5 w-2/5 rounded-full bg-gray-700" />
        <div className="mt-auto flex gap-1.5">
          <div className="h-4 w-16 rounded bg-gray-100" />
          <div className="h-4 w-10 rounded bg-gray-700" />
        </div>
      </div>
    ),
  },
];

function SelectedBadge() {
  return (
    <span className="flex items-center gap-1.5 text-xs font-medium text-primary">
      <span className="flex h-4 w-4 items-center justify-center rounded-full bg-primary">
        <RiCheckLine className="h-2.5 w-2.5 text-primary-foreground" />
      </span>
      Selected
    </span>
  );
}

function SelectButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="rounded-md border border-border px-3 py-1 text-xs font-medium transition-colors hover:bg-muted"
    >
      Select
    </button>
  );
}

export function AppearanceContent() {
  const { theme, setTheme } = useTheme();
  const { accent, setAccent } = useAccentTheme();

  return (
    <div>
      {/* Mode selector */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 mb-10">
        {MODES.map((mode) => {
          const isSelected = theme === mode.id;
          return (
            <div
              key={mode.id}
              onClick={() => setTheme(mode.id)}
              className={cn(
                "flex cursor-pointer flex-col gap-3 rounded-xl border p-4 transition-colors",
                isSelected
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/40 hover:bg-muted/40"
              )}
            >
              {mode.preview}
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-medium leading-tight">{mode.name}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{mode.description}</p>
                </div>
                {isSelected ? (
                  <SelectedBadge />
                ) : (
                  <SelectButton onClick={() => setTheme(mode.id)} />
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Theme presets */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">Theme presets</h2>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Pick an accent colour that applies across the whole app.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {THEMES.map((t) => {
            const isSelected = accent === t.id;
            return (
              <div
                key={t.id}
                onClick={() => setAccent(t.id)}
                className={cn(
                  "flex cursor-pointer items-center gap-4 rounded-xl border p-4 transition-colors",
                  isSelected
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/40 hover:bg-muted/40"
                )}
              >
                {/* Gradient thumbnail */}
                <div
                  className="h-14 w-14 shrink-0 rounded-lg shadow-sm"
                  style={{ background: t.gradient }}
                />

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{t.name}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground truncate">
                    {t.description}
                  </p>
                </div>

                {/* Action */}
                {isSelected ? (
                  <SelectedBadge />
                ) : (
                  <SelectButton onClick={() => setAccent(t.id)} />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
