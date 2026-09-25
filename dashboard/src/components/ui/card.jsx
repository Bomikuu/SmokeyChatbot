import * as React from "react";
import { cn } from "@/lib/utils";

// Adapted from the shadcn/ui new-york Card; spacing follows DESIGN.md.
const Card = React.forwardRef(function Card({ className, ...props }, ref) {
  return <div data-slot="card" ref={ref} className={cn("rounded-xl border border-border bg-card text-card-foreground", className)} {...props} />;
});
const CardHeader = React.forwardRef(function CardHeader({ className, ...props }, ref) {
  return <div data-slot="card-header" ref={ref} className={cn("flex flex-col gap-1 border-b border-[#edf1f5] px-6 py-5", className)} {...props} />;
});
const CardTitle = React.forwardRef(function CardTitle({ className, ...props }, ref) {
  return <h2 data-slot="card-title" ref={ref} className={cn("text-lg font-semibold tracking-[-0.025em] text-card-foreground", className)} {...props} />;
});
const CardContent = React.forwardRef(function CardContent({ className, ...props }, ref) {
  return <div data-slot="card-content" ref={ref} className={cn("p-6", className)} {...props} />;
});

export { Card, CardHeader, CardTitle, CardContent };
