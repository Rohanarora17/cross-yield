"use client";

import React from "react";
import { cn } from "~~/lib/utils";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "outline" | "secondary" | "ghost" | "link" | "destructive";
  size?: "default" | "sm" | "lg" | "icon";
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", ...props }, ref) => {
    // const baseClasses = "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none ring-offset-background";

    const variants = {
      default: "btn btn-primary",
      outline: "btn btn-outline",
      secondary: "btn btn-secondary",
      ghost: "btn btn-ghost",
      link: "btn btn-link",
      destructive: "btn btn-error",
    };

    const sizes = {
      default: "btn-sm",
      sm: "btn-xs",
      lg: "btn-lg",
      icon: "btn-square",
    };

    return <button className={cn(variants[variant], sizes[size], className)} ref={ref} {...props} />;
  },
);

Button.displayName = "Button";

export { Button };
