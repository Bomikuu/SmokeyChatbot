import { Button } from "@/components/ui/button";
import { BusinessMascot } from "@/features/business/BusinessFeedback";
import { useRuntimeBusiness } from "@/features/business/BusinessDashboard";
import { useAssistantRuntime, useRuntimeSnapshot, useRequestSnapshot } from "@/sdk/RuntimeProvider";
import type { MascotState } from "@/components/common/MascotStatus";
export const FloatingLauncher = ({ bottomOffset = 0 }: { bottomOffset?: number }) => {
  const runtime = useAssistantRuntime(),
    snapshot = useRuntimeSnapshot(),
    request = useRequestSnapshot(),
    business = useRuntimeBusiness();
  if (
    !snapshot.settings ||
    snapshot.opened ||
    snapshot.suppressed ||
    (snapshot.pageAttached && snapshot.route.section === "assistant")
  )
    return null;
  const state = ({ queued: "searching", succeeded: "success", failed: "error" }[
    request.generation.state
  ] || request.generation.state) as MascotState;
  const text = request.busy
    ? request.generation.state === "generating"
      ? "Writing your summary…"
      : "Checking your business records…"
    : request.interrupted
      ? "Request interrupted. Open to recover."
      : request.generation.report_id
        ? "Your report is ready."
        : "Ask Smokey";
  return (
    <Button
      variant="outline"
      className="smokey-floating h-auto min-h-12 min-w-12 whitespace-normal text-left rounded-2xl bg-card px-4 py-2 text-card-foreground shadow-md"
      style={{ "--smokey-bottom-offset": Math.max(0, bottomOffset) + "px" } as React.CSSProperties}
      aria-label="Open Smokey chat"
      aria-expanded={false}
      aria-controls="smokey-chat-drawer"
      onClick={(event) => runtime.openAssistant(event.currentTarget)}
    >
      <BusinessMascot
        business={business}
        settings={snapshot.settings}
        state={state === "idle" ? "idle" : state}
        text={text}
      />
    </Button>
  );
};
