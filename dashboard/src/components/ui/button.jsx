import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva } from "class-variance-authority";
import { cn } from "@/lib/utils";

// Adapted from the shadcn/ui new-york Button; colors follow DESIGN.md.
const buttonVariants = cva("inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-50", {
  variants: {
    variant: {
      default: "bg-primary text-primary-foreground hover:bg-[#2149dc]",
      outline: "border border-input bg-card text-card-foreground hover:bg-secondary",
      secondary: "bg-secondary text-secondary-foreground hover:bg-[#e2e8f0]",
      ghost: "text-[#475569] hover:bg-accent hover:text-accent-foreground",
      destructive: "bg-destructive text-destructive-foreground hover:bg-[#912018]",
      link: "text-primary underline-offset-4 hover:underline",
    },
    size: { default: "h-10 px-4 py-2", sm: "h-8 px-3 text-xs", lg: "h-11 px-8", icon: "size-9" },
  },
  defaultVariants: { variant: "default", size: "default" },
});

const Button = React.forwardRef(function Button({ className, variant, size, asChild = false, ...props }, ref) {
  const Comp = asChild ? Slot : "button";
  return <Comp data-slot="button" className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
});

export { Button, buttonVariants };
