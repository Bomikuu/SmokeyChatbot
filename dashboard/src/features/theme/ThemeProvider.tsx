import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import {
  applyTheme,
  resolveTheme,
  readThemePreference,
  themeStorageKey,
  type ThemePreference,
} from "@/lib/theme";

const ThemeContext = createContext<{
  preference: ThemePreference;
  resolved: "light" | "dark";
  setPreference: (preference: ThemePreference) => void;
}>({ preference: "light", resolved: "light", setPreference: () => {} });

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const [preference, setPreference] = useState<ThemePreference>(() => {
    try {
      return readThemePreference(window.localStorage);
    } catch {
      return "light";
    }
  });
  const [resolved, setResolved] = useState<"light" | "dark">("light");
  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const update = () => {
      applyTheme(preference, media.matches);
      setResolved(resolveTheme(preference, media.matches));
    };
    update();
    try {
      localStorage.setItem(themeStorageKey, preference);
    } catch {
      /* Theme still works with storage blocked. */
    }
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, [preference]);
  return (
    <ThemeContext.Provider value={{ preference, setPreference, resolved }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
