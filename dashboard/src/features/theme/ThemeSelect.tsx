import { Moon, Sun, Monitor } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "./ThemeProvider";
import type { ThemePreference } from "@/lib/theme";

const themes = [
  { value: "light" as ThemePreference, label: "Light", Icon: Sun },
  { value: "dark" as ThemePreference, label: "Dark", Icon: Moon },
  { value: "system" as ThemePreference, label: "System", Icon: Monitor },
];

export const ThemeSelect = ({ compact = false }: { compact?: boolean }) => {
  const { preference, setPreference } = useTheme();
  return (
    <div
      role="group"
      aria-label="Dashboard theme"
      className={`flex gap-1 rounded-lg border border-border bg-card p-1 ${compact ? "w-fit" : ""}`}
    >
      {themes.map(({ value, label, Icon }) => (
        <Button
          key={value}
          type="button"
          size="sm"
          variant={preference === value ? "secondary" : "ghost"}
          aria-label={label + " theme"}
          title={label + " theme"}
          className={compact ? "size-9 p-0" : undefined}
          aria-pressed={preference === value}
          onClick={() => setPreference(value)}
        >
          <Icon size={14} aria-hidden="true" />
          <span className={compact ? "sr-only" : undefined}>{label}</span>
        </Button>
      ))}
    </div>
  );
};
