import { useCallback, useEffect, useState } from "react";

export type ThemePreference = "system" | "light" | "dark";
export type EffectiveTheme = "light" | "dark";

const STORAGE_KEY = "portfolio-rag.theme";

function readPreference(): ThemePreference {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "light" || stored === "dark") return stored;
  } catch {
    // localStorage unavailable (private mode, SSR) — fall through
  }
  return "system";
}

function systemTheme(): EffectiveTheme {
  if (typeof window === "undefined" || !window.matchMedia) return "dark";
  return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
}

function resolve(pref: ThemePreference): EffectiveTheme {
  return pref === "system" ? systemTheme() : pref;
}

function applyTheme(theme: EffectiveTheme): void {
  document.documentElement.setAttribute("data-theme", theme);
}

export function useTheme() {
  const [preference, setPreference] = useState<ThemePreference>(readPreference);
  const [effective, setEffective] = useState<EffectiveTheme>(() => resolve(readPreference()));

  useEffect(() => {
    const next = resolve(preference);
    applyTheme(next);
    setEffective(next);
    try {
      if (preference === "system") localStorage.removeItem(STORAGE_KEY);
      else localStorage.setItem(STORAGE_KEY, preference);
    } catch {
      // ignore persistence failures
    }
  }, [preference]);

  useEffect(() => {
    if (preference !== "system" || typeof window === "undefined" || !window.matchMedia) return;
    const mql = window.matchMedia("(prefers-color-scheme: light)");
    const handler = () => {
      const next = systemTheme();
      applyTheme(next);
      setEffective(next);
    };
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, [preference]);

  const cyclePreference = useCallback(() => {
    setPreference((prev) =>
      prev === "system" ? "light" : prev === "light" ? "dark" : "system",
    );
  }, []);

  return { preference, effective, setPreference, cyclePreference };
}
