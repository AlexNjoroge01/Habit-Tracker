"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { ACCENT_STORAGE_KEY } from "@/lib/themes";

interface AccentThemeContextValue {
  accent: string;
  setAccent: (id: string) => void;
}

const AccentThemeContext = createContext<AccentThemeContextValue>({
  accent: "default",
  setAccent: () => {},
});

export function AccentThemeProvider({ children }: { children: React.ReactNode }) {
  const [accent, setAccentState] = useState("default");

  useEffect(() => {
    const stored = localStorage.getItem(ACCENT_STORAGE_KEY) ?? "default";
    setAccentState(stored);
  }, []);

  const setAccent = (id: string) => {
    setAccentState(id);
    localStorage.setItem(ACCENT_STORAGE_KEY, id);
    if (id === "default") {
      document.documentElement.removeAttribute("data-accent");
    } else {
      document.documentElement.setAttribute("data-accent", id);
    }
  };

  return (
    <AccentThemeContext.Provider value={{ accent, setAccent }}>
      {children}
    </AccentThemeContext.Provider>
  );
}

export function useAccentTheme() {
  return useContext(AccentThemeContext);
}
