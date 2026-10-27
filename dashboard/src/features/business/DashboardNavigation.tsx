import {
  LayoutDashboard,
  MessageSquareText,
  FileText,
  Cable,
  Paintbrush,
  ChartNoAxesCombined,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAssistantRuntime, useRuntimeSnapshot } from "@/sdk/RuntimeProvider";
import type { SmokeySection } from "@/sdk/contracts";
export const dashboardSections: { key: SmokeySection; label: string; Icon: LucideIcon }[] = [
  { key: "overview", label: "Overview", Icon: LayoutDashboard },
  { key: "assistant", label: "Ask Smokey", Icon: MessageSquareText },
  { key: "reports", label: "Reports", Icon: FileText },
  { key: "connections", label: "AI connections", Icon: Cable },
  { key: "appearance", label: "Appearance", Icon: Paintbrush },
  { key: "usage", label: "Usage & limits", Icon: ChartNoAxesCombined },
];
export const DashboardNavigation = ({ variant = "tabs" }: { variant?: "tabs" | "sidebar" }) => {
  const runtime = useAssistantRuntime(),
    { route } = useRuntimeSnapshot();
  return (
    <nav
      aria-label="Smokey sections"
      className={
        variant === "sidebar"
          ? "flex gap-1 overflow-auto lg:flex-col"
          : "flex gap-1 overflow-auto border-b pb-2"
      }
    >
      {dashboardSections.map(({ key, label, Icon }) => (
        <Button
          key={key}
          variant={route.section === key ? "secondary" : "ghost"}
          className="shrink-0 justify-start gap-2.5"
          aria-current={route.section === key ? "page" : undefined}
          onClick={() => runtime.navigate({ section: key })}
        >
          <Icon className="size-4" aria-hidden="true" />
          {label}
        </Button>
      ))}
    </nav>
  );
};
