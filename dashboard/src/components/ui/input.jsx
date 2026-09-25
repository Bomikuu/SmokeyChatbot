import React from "react";
import { cn } from "../../lib/utils";

export function Input({ className, ...props }) {
  return <input className={cn("flex h-10 w-full rounded-md border border-[#cbd5e1] bg-[#f8fafc] px-3 py-2 text-sm text-[#0f172a] placeholder:text-[#64748b] focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#2f5bff] disabled:opacity-50", className)} {...props} />;
}
