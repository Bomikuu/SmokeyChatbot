import * as React from "react";
import { cn } from "@/lib/utils";

// Adapted from the shadcn/ui new-york Input.
const Input = React.forwardRef(function Input({ className, type, ...props }, ref) {
  return <input data-slot="input" type={type} ref={ref} className={cn("flex h-10 w-full rounded-md border border-input bg-muted px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring disabled:opacity-50", className)} {...props} />;
});

export { Input };
