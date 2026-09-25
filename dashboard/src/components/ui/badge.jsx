import React from "react";
import { cn } from "../../lib/utils";

export function Badge({ className, ...props }) {
  return <span className={cn("inline-flex items-center rounded-md border border-[#dce4ef] bg-[#f8fafc] px-2 py-0.5 text-xs font-medium text-[#475569]", className)} {...props} />;
}
