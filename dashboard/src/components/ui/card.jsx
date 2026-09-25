import React from "react";
import { cn } from "../../lib/utils";

export function Card({ className, ...props }) {
  return <div className={cn("rounded-xl border border-[#dce4ef] bg-white", className)} {...props} />;
}
export function CardHeader({ className, ...props }) {
  return <div className={cn("flex flex-col gap-1 border-b border-[#edf1f5] px-6 py-5", className)} {...props} />;
}
export function CardTitle({ className, ...props }) {
  return <h2 className={cn("text-lg font-semibold tracking-[-0.025em] text-[#0f172a]", className)} {...props} />;
}
export function CardContent({ className, ...props }) {
  return <div className={cn("p-6", className)} {...props} />;
}
