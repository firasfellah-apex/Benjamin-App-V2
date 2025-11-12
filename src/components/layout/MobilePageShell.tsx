import { PropsWithChildren, ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * MobilePageShell
 * Single source of truth for customer mobile pages.
 *
 * Slots:
 * - header: anything (title, actions). Fixed at top, safe-area aware.
 * - footer: sticky bottom actions (request cash, back/confirm, etc.)
 * - content: scrollable area between header and footer.
 */
export function MobilePageShell({
  header,
  footer,
  children,
  className,
}: PropsWithChildren<{
  header?: ReactNode;
  footer?: ReactNode;
  className?: string;
}>) {
  return (
    <div
      className={cn(
        "relative mx-auto w-full h-dvh max-w-[480px] bg-white text-slate-900",
        // phone frame bg that shows around rounded corners
        "rounded-[32px] overflow-hidden",
        className
      )}
    >
      {/* Header (fixed) */}
      <header
        className={cn(
          "fixed inset-x-0 top-0 z-50",
          "mx-auto max-w-[480px]",
          // translucent cap + backdrop
          "backdrop-blur supports-[backdrop-filter]:bg-white/75",
          "pt-[max(env(safe-area-inset-top),12px)]",
          "px-6 pb-4"
        )}
      >
        {header}
      </header>

      {/* Scrollable content */}
      <main
        className={cn(
          "relative z-0",
          // leave space for fixed header
          "pt-[calc(64px+max(env(safe-area-inset-top),12px)+16px)]",
          // leave space for footer
          "pb-[calc(80px+max(env(safe-area-inset-bottom),16px))]",
          // page padding
          "px-6",
          // allow inner pages to be 3-rows tall, maps, etc.
          "overflow-y-auto overscroll-y-contain",
          "min-h-[calc(100dvh-140px)]" // header+footer guard
        )}
      >
        {children}
      </main>

      {/* Sticky footer */}
      {footer && (
        <footer
          className={cn(
            "fixed inset-x-0 bottom-0 z-40",
            "mx-auto max-w-[480px]",
            "px-6 pb-[max(env(safe-area-inset-bottom),16px)] pt-3",
            // subtle top fade
            "bg-gradient-to-t from-white to-white/70 backdrop-blur"
          )}
        >
          {footer}
        </footer>
      )}
    </div>
  );
}

export default MobilePageShell;

