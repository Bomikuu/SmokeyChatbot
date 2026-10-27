import { ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAssistantRuntime, useRuntimeSnapshot } from "@/sdk/RuntimeProvider";
import { dashboardSections } from "./DashboardNavigation";
export const sectionDescriptions = {
  overview: "Your assistant, connections, and usage at a glance.",
  assistant: "Useful answers from your authorized business records.",
  connections: "Choose the AI behind your business reports.",
  usage: "Understand AI activity and stay within your application limits.",
  reports: "Revisit the answers saved by your business.",
  appearance: "Make your assistant feel at home.",
};
export const BusinessPageHeader = () => {
  const runtime = useAssistantRuntime(),
    { route, context } = useRuntimeSnapshot();
  const title = route.reportId
    ? "Saved report"
    : dashboardSections.find((item) => item.key === route.section)?.label || "Overview";
  return (
    <div className="min-w-0">
      <nav aria-label="Smokey breadcrumb" className="flex min-w-0 items-center gap-2">
        <Button
          variant="link"
          className="h-auto shrink-0 p-0 text-sm text-muted-foreground"
          onClick={() => runtime.navigate({ section: "overview" })}
        >
          Smokey
        </Button>
        <ChevronRight className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
        <h1 className="truncate text-sm font-semibold" title={title}>
          {title}
        </h1>
      </nav>
      <p
        className="mt-1 truncate text-xs leading-5 text-muted-foreground"
        title={sectionDescriptions[route.section]}
      >
        {sectionDescriptions[route.section]}
        <span className="sr-only"> {context.organization.name}</span>
      </p>
    </div>
  );
};
