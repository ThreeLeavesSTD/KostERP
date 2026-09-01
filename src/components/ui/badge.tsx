import * as React from "react";
import { cn } from "@/lib/utils";

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "secondary" | "destructive" | "outline" | "success" | "warning" | "info" | "lime" | "obsidian" | "glass";
}

export function Badge({ className, variant = "default", ...props }: BadgeProps) {
  const variantClasses = {
    default: "bg-[#0A0A0A] text-white dark:bg-white dark:text-[#0A0A0A]",
    secondary: "bg-neutral-200/70 text-neutral-800 dark:bg-neutral-800 dark:text-neutral-200",
    obsidian: "bg-[#0A0A0A] text-white dark:bg-white dark:text-[#0A0A0A]",
    lime: "bg-[#D9FF43] text-[#0A0A0A] font-bold border border-[#C8F902]/60",
    glass: "bg-white/70 backdrop-blur-md border border-white/60 text-neutral-800 dark:bg-white/10 dark:text-white dark:border-white/10",
    destructive: "bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200/80 dark:border-rose-900",
    outline: "text-foreground border border-neutral-300 dark:border-neutral-700",
    success: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900",
    warning: "bg-amber-50 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-900",
    info: "bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-900",
  };

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold tracking-tight transition-colors focus:outline-none",
        variantClasses[variant],
        className
      )}
      {...props}
    />
  );
}
