import * as React from "react";

import { cn } from "@/lib/utils";

export function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "border-gray-300 placeholder:text-gray-400",
        "focus-visible:border-gray-400 focus-visible:ring-1 focus-visible:ring-gray-400 focus-visible:ring-offset-0",
        "aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
        "dark:bg-input/30 flex field-sizing-content min-h-16 w-full rounded-md border bg-white px-3 py-2 text-base text-gray-900 shadow-xs transition-[color,box-shadow] outline-none",
        "disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-gray-50 md:text-sm",
        className
      )}
      {...props}
    />
  );
}
