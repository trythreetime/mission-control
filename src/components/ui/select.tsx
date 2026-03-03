import * as React from "react";

import { cn } from "@/lib/utils";

export type SelectProps = React.SelectHTMLAttributes<HTMLSelectElement>;

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(({ className, children, ...props }, ref) => (
  <select
    ref={ref}
    className={cn(
      "flex h-9 w-full rounded-md border border-white/10 bg-black/40 px-3 py-2 text-sm text-slate-100 shadow-sm",
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/40",
      "disabled:cursor-not-allowed disabled:opacity-60",
      className,
    )}
    {...props}
  >
    {children}
  </select>
));

Select.displayName = "Select";
