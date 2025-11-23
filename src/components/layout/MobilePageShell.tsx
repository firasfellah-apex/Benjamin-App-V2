import React from "react";
import { cn } from "@/lib/utils";

/**
 * MobilePageShell
 *
 * Simple, non-restrictive wrapper. No h-screen, no overflow-hidden.
 * CustomerScreen is now the viewport, so this just passes through.
 */
interface MobilePageShellProps {
  children: React.ReactNode;
  className?: string;
}

export function MobilePageShell({ children, className }: MobilePageShellProps) {
  return (
    <div 
      className={cn("w-full", className)}
      style={{
        WebkitOverflowScrolling: "touch", // important for iOS smooth scrolling
      }}
    >
      {children}
    </div>
  );
}

export default MobilePageShell;
