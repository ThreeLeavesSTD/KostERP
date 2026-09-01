import React from "react";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: {
    value: string;
    isPositive?: boolean;
    label?: string;
  };
  variant?: "blue" | "emerald" | "amber" | "rose" | "purple";
  className?: string;
}

export function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  variant = "blue",
  className,
}: StatCardProps) {
  const variantStyles = {
    blue: {
      bg: "bg-neutral-100 text-neutral-900 dark:bg-neutral-800 dark:text-white",
      border: "border-neutral-200/80 dark:border-white/5",
      cardBg: "bg-white dark:bg-[#141416]",
    },
    emerald: {
      bg: "bg-[#D9FF43]/25 text-[#0A0A0A] dark:bg-[#D9FF43]/20 dark:text-[#D9FF43]",
      border: "border-[#D9FF43]/30 dark:border-white/5",
      cardBg: "bg-white dark:bg-[#141416]",
    },
    amber: {
      bg: "bg-amber-500/15 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300",
      border: "border-amber-200/60 dark:border-white/5",
      cardBg: "bg-white dark:bg-[#141416]",
    },
    rose: {
      bg: "bg-rose-500/15 text-rose-600 dark:bg-rose-500/20 dark:text-rose-300",
      border: "border-rose-200/60 dark:border-white/5",
      cardBg: "bg-[#0A0A0A] text-white",
      isDarkCard: true,
    },
    purple: {
      bg: "bg-purple-500/15 text-purple-700 dark:bg-purple-500/20 dark:text-purple-300",
      border: "border-purple-200/60 dark:border-white/5",
      cardBg: "bg-white dark:bg-[#141416]",
    },
  };

  const style = variantStyles[variant];
  const isDark = (style as any).isDarkCard;

  return (
    <div
      className={cn(
        "relative flex flex-col justify-between overflow-hidden rounded-3xl border p-5 transition-all duration-300 hover:shadow-spatial",
        style.cardBg,
        style.border,
        className
      )}
    >
      <div className="flex items-center justify-between">
        <p className={cn("text-[11px] font-bold uppercase tracking-wider", isDark ? "text-neutral-400" : "text-neutral-500 dark:text-neutral-400")}>
          {title}
        </p>
        <div className={cn("rounded-2xl p-2.5 transition-transform hover:scale-105", style.bg)}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <div className="mt-4">
        <h3 className={cn("text-2xl font-extrabold tracking-tight", isDark ? "text-white" : "text-neutral-900 dark:text-white")}>
          {value}
        </h3>
        {subtitle && (
          <p className={cn("mt-1 text-xs font-medium", isDark ? "text-neutral-400" : "text-neutral-500 dark:text-neutral-400")}>
            {subtitle}
          </p>
        )}
      </div>
      {trend && (
        <div className="mt-4 flex items-center gap-2 text-xs font-medium border-t border-neutral-100 dark:border-white/5 pt-3">
          <span
            className={cn(
              "rounded-full px-2.5 py-0.5 text-[10px] font-bold",
              trend.isPositive
                ? "bg-[#D9FF43]/30 text-[#244300] dark:bg-[#D9FF43]/20 dark:text-[#D9FF43]"
                : "bg-rose-500/20 text-rose-300"
            )}
          >
            {trend.value}
          </span>
          {trend.label && (
            <span className={cn("text-[11px]", isDark ? "text-neutral-400" : "text-neutral-500 dark:text-neutral-400")}>
              {trend.label}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
