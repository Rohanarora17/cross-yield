"use client";

import React from "react";
import { cn } from "~~/lib/utils";

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "secondary" | "destructive" | "outline";
}

const Badge = React.forwardRef<HTMLDivElement, BadgeProps>(({ className, variant = "default", ...props }, ref) => {
  const variants = {
    default: "badge badge-primary",
    secondary: "badge badge-secondary",
    destructive: "badge badge-error",
    outline: "badge badge-outline",
  };

  return <div ref={ref} className={cn(variants[variant], className)} {...props} />;
});
Badge.displayName = "Badge";

export { Badge };
