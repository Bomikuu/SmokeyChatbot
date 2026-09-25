import React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva } from "class-variance-authority";
import { cn } from "../../lib/utils";

const buttonVariants = cva("inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2f5bff] disabled:pointer-events-none disabled:opacity-50", {
  variants: {
    variant: {
      default: "bg-[#2f5bff] text-white hover:bg-[#2149dc]",
      outline: "border border-[#cbd5e1] bg-white text-[#0f172a] hover:bg-[#f1f5f9]",
      ghost: "text-[#475569] hover:bg-[#eaf0fa] hover:text-[#0f172a]",
      destructive: "bg-[#b42318] text-white hover:bg-[#912018]",
    },
    size: { default: "h-10 px-4 py-2", sm: "h-8 px-3 text-xs", icon: "size-9" },
  },
  defaultVariants: { variant: "default", size: "default" },
});

export function Button({ className, variant, size, asChild = false, ...props }) {
  const Comp = asChild ? Slot : "button";
  return <Comp className={cn(buttonVariants({ variant, size, className }))} {...props} />;
}
