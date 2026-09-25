import React from "react";
import { cn } from "../../lib/utils";

export function Textarea({ className, ...props }) {
  return <textarea className={cn("flex min-h-32 w-full rounded-md border border-[#cbd5e1] bg-[#f8fafc] px-3 py-2 text-sm leading-6 text-[#0f172a] placeholder:text-[#64748b] focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#2f5bff] disabled:opacity-50", className)} {...props} />;
}
