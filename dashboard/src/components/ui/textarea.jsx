import * as React from "react";
import { cn } from "@/lib/utils";

// Adapted from the shadcn/ui new-york Textarea.
const Textarea = React.forwardRef(function Textarea({ className, ...props }, ref) {
  return <textarea data-slot="textarea" ref={ref} className={cn("flex min-h-32 w-full rounded-md border border-input bg-muted px-3 py-2 text-sm leading-6 text-foreground placeholder:text-muted-foreground focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring disabled:opacity-50", className)} {...props} />;
});

export { Textarea };
