export type ThemePreference = "light" | "dark" | "system";
export const themeStorageKey = "smokey-dashboard-theme";

export const readThemePreference = (storage?: Pick<Storage, "getItem">): ThemePreference => {
  try {
    const saved = storage?.getItem(themeStorageKey);
    return saved === "dark" || saved === "system" ? saved : "light";
  } catch {
    return "light";
  }
};

export const resolveTheme = (preference: ThemePreference, systemDark: boolean) =>
  preference === "system" ? (systemDark ? "dark" : "light") : preference;

export const applyTheme = (preference: ThemePreference, systemDark: boolean) => {
  const theme = resolveTheme(preference, systemDark);
  document.documentElement.classList.toggle("dark", theme === "dark");
  document.documentElement.style.colorScheme = theme;
};
