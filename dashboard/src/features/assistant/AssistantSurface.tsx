import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { useAssistantRuntime, useRuntimeSnapshot } from "@/sdk/RuntimeProvider";
import { SharedConversation } from "@/features/business/BusinessDashboard";
export const AssistantSurface = () => {
  const runtime = useAssistantRuntime(),
    { settings, opened, suppressed } = useRuntimeSnapshot();
  if (!settings) return null;
  const setOpen = (value: boolean) => (value ? runtime.openAssistant() : runtime.closeAssistant());
  const content = (
    <div className="flex min-h-0 flex-1 flex-col">
      {opened && !suppressed && <SharedConversation compact />}
    </div>
  );
  return settings.presentation === "modal" ? (
    <Dialog open={opened && !suppressed} onOpenChange={setOpen}>
      <DialogContent
        id="smokey-chat-drawer"
        className="flex h-dvh max-h-dvh w-full max-w-none flex-col rounded-none p-6 sm:h-[90dvh] sm:max-w-2xl sm:rounded-xl"
      >
        <DialogHeader>
          <DialogTitle>Ask Smokey</DialogTitle>
          <DialogDescription>Reports from your business records.</DialogDescription>
        </DialogHeader>
        {content}
      </DialogContent>
    </Dialog>
  ) : (
    <Sheet open={opened && !suppressed} onOpenChange={setOpen}>
      <SheetContent
        id="smokey-chat-drawer"
        className="smokey-assistant-drawer flex h-dvh w-full max-w-none flex-col gap-5 p-6 sm:max-w-md"
      >
        <SheetHeader className="p-0">
          <SheetTitle>Ask Smokey</SheetTitle>
          <SheetDescription>Reports from your business records.</SheetDescription>
        </SheetHeader>
        {content}
      </SheetContent>
    </Sheet>
  );
};
