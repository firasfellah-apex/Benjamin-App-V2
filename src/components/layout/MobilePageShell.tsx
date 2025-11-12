import { PropsWithChildren } from "react";
import { cn } from "@/lib/utils";

/**
 * MobilePageShell
 * 
 * Constrains width (max-w-[420px]), centers, and applies consistent padding.
 * Single source of truth for customer mobile page layout.
 */
export function MobilePageShell({
  children,
  className,
}: PropsWithChildren<{
  className?: string;
}>) {
  return (
    <div
      className={cn(
        "mx-auto w-full max-w-[420px]",
        "px-4 sm:px-0",
        className
      )}
    >
      {children}
    </div>
  );
}

export default MobilePageShell;
