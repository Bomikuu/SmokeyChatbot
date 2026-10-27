import { FloatingLauncher } from "./FloatingLauncher";
import { AssistantSurface } from "./AssistantSurface";
export const AssistantControls = ({ bottomOffset = 0 }: { bottomOffset?: number }) => (
  <>
    <FloatingLauncher bottomOffset={bottomOffset} />
    <AssistantSurface />
  </>
);
