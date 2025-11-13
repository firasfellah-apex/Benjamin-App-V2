import React from "react";

/**
 * Universal content column wrapper for customer flow.
 * 
 * Defines consistent horizontal and vertical padding that all customer
 * content containers should use. This ensures visual alignment across:
 * - Top shelf content
 * - Bottom nav content
 * - Address cards
 * - Any other customer flow containers
 * 
 * Rule: Containers own spacing. Children fill width and size by content.
 */
export function CustomerContentColumn({ 
  children,
  className = ""
}: { 
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`w-full px-5 pb-5 ${className}`}>
      {children}
    </div>
  );
}

