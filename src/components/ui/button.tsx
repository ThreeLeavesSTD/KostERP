import * as React from "react";
import { cn } from "@/lib/utils";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link" | "success" | "lime" | "obsidian" | "glass";
  size?: "default" | "sm" | "lg" | "icon";
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", ...props }, ref) => {
    const baseClasses =
      "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.96]";

    const variantClasses = {
      default: "bg-[#0A0A0A] text-white hover:bg-neutral-800 shadow-sm dark:bg-white dark:text-[#0A0A0A] dark:hover:bg-neutral-200",
      obsidian: "bg-[#0A0A0A] text-white hover:bg-neutral-800 shadow-sm dark:bg-white dark:text-[#0A0A0A]",
      lime: "bg-[#D9FF43] hover:bg-[#C8F902] text-[#0A0A0A] font-bold shadow-sm hover:shadow-[0_0_20px_rgba(217,255,67,0.4)]",
      destructive: "bg-rose-600 text-white hover:bg-rose-700 shadow-sm",
      outline: "border border-neutral-300/80 bg-white/80 hover:bg-white text-neutral-800 shadow-xs dark:bg-neutral-900/80 dark:border-white/10 dark:text-neutral-200 dark:hover:bg-neutral-800",
      glass: "bg-white/70 hover:bg-white/95 text-neutral-900 backdrop-blur-md border border-white/60 shadow-xs dark:bg-neutral-900/70 dark:text-white dark:border-white/10",
      secondary: "bg-neutral-100 text-neutral-900 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-100",
      ghost: "hover:bg-neutral-100 text-neutral-700 hover:text-neutral-900 dark:hover:bg-neutral-800 dark:text-neutral-300",
      link: "text-[#0A0A0A] underline-offset-4 hover:underline dark:text-white",
      success: "bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm",
    };

    const sizeClasses = {
      default: "h-10 px-5 py-2",
      sm: "h-8 px-3.5 text-xs",
      lg: "h-12 px-7 text-base font-bold",
      icon: "h-9 w-9 p-0 rounded-full",
    };

    return (
      <button
        className={cn(baseClasses, variantClasses[variant], sizeClasses[size], className)}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";
