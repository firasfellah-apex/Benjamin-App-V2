import { PropsWithChildren } from "react";
import { cn } from "@/lib/utils";

/**
 * MobilePageShell
 *
 * Dumb, presentational component that ONLY constrains width and centers content.
 * No layout logic, no bottom slots, no overflow handling.
 * Full screen width - no side padding.
 */
export function MobilePageShell({
  children,
  className,
}: PropsWithChildren<{ className?: string }>) {
  return (
    <div
      className={cn(
        "w-full",
        "pt-safe-top",
        className
      )}
    >
      {children}
    </div>
  );
}

export default MobilePageShell;
