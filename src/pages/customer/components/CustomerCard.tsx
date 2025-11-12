import * as React from "react";
import { cn } from "@/lib/utils";

export interface CustomerCardProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * Whether the card is clickable/interactive
   */
  interactive?: boolean;
  /**
   * Whether the card has a hover effect
   */
  hoverable?: boolean;
}

/**
 * CustomerCard Component
 * 
 * Standardized card component for customer pages.
 * Provides consistent styling: rounded-3xl, border, subtle shadow.
 */
export const CustomerCard = React.forwardRef<HTMLDivElement, CustomerCardProps>(
  ({ className, interactive = false, hoverable = false, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "rounded-3xl border border-gray-200 bg-white",
          "shadow-sm",
          interactive && "cursor-pointer active:scale-[0.99] transition-transform",
          hoverable && "hover:shadow-md transition-shadow",
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);

CustomerCard.displayName = "CustomerCard";

