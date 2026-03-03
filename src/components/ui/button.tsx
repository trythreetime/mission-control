import * as React from "react";

import { cn } from "@/lib/utils";

type ButtonVariant = "default" | "secondary" | "outline" | "ghost" | "destructive" | "success";
type ButtonSize = "default" | "sm" | "lg" | "icon";

const variantClasses: Record<ButtonVariant, string> = {
  default: "border-cyan-300/30 bg-cyan-400/15 text-cyan-100 hover:bg-cyan-400/25",
  secondary: "border-white/15 bg-white/5 text-slate-200 hover:bg-white/10",
  outline: "border-white/15 bg-transparent text-slate-200 hover:bg-white/10",
  ghost: "border-transparent bg-transparent text-slate-300 hover:bg-white/10 hover:text-slate-100",
  destructive: "border-rose-300/30 bg-rose-400/15 text-rose-100 hover:bg-rose-400/25",
  success: "border-emerald-300/30 bg-emerald-400/15 text-emerald-100 hover:bg-emerald-400/25",
};

const sizeClasses: Record<ButtonSize, string> = {
  default: "h-9 px-4 py-2 text-sm",
  sm: "h-8 px-3 text-xs",
  lg: "h-10 px-6 text-sm",
  icon: "h-9 w-9 p-0",
};

export function buttonVariants({
  variant = "default",
  size = "default",
  className,
}: {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
} = {}): string {
  return cn(
    "inline-flex items-center justify-center gap-2 rounded-md border font-medium transition-colors",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/40 focus-visible:ring-offset-0",
    "disabled:pointer-events-none disabled:opacity-60",
    variantClasses[variant],
    sizeClasses[size],
    className,
  );
}

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", type = "button", ...props }, ref) => (
    <button ref={ref} type={type} className={buttonVariants({ variant, size, className })} {...props} />
  ),
);

Button.displayName = "Button";
