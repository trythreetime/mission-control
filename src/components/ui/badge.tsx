import * as React from "react";

import { cn } from "@/lib/utils";

type BadgeVariant = "default" | "secondary" | "outline" | "success" | "destructive";

const variantClasses: Record<BadgeVariant, string> = {
  default: "border-cyan-300/30 bg-cyan-400/15 text-cyan-100",
  secondary: "border-white/10 bg-white/5 text-slate-200",
  outline: "border-white/20 bg-transparent text-slate-300",
  success: "border-emerald-300/30 bg-emerald-400/15 text-emerald-100",
  destructive: "border-rose-300/30 bg-rose-400/15 text-rose-100",
};

export type BadgeProps = React.HTMLAttributes<HTMLSpanElement> & {
  variant?: BadgeVariant;
};

export function Badge({ className, variant = "secondary", ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium leading-none",
        variantClasses[variant],
        className,
      )}
      {...props}
    />
  );
}
