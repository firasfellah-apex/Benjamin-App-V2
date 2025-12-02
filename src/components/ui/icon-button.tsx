/**
 * Canonical IconButton Component
 * 
 * This is the single source of truth for icon-only buttons (e.g. close X buttons).
 * 
 * IMPORTANT: Do not override border-radius in feature components.
 * All radius changes should be made here only.
 * 
 * Default radius: 12px (rounded-xl)
 * Default size: 40x40px (w-10 h-10)
 * Default background: #F7F7F7
 * 
 * This is a standalone component that does NOT wrap Button or any other component.
 */
import * as React from "react";
import { cn } from "@/lib/utils";

export interface IconButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "ghost" | "destructive";
  size?: "default" | "sm" | "lg";
}

export const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ className, variant = "default", size = "default", type = "button", ...props }, ref) => {
    const sizeClasses = {
      default: "w-10 h-10", // 40x40px
      sm: "w-8 h-8",         // 32x32px
      lg: "w-12 h-12",       // 48x48px
    };

    const variantClasses = {
      default: "bg-[#F7F7F7] text-slate-900 hover:bg-[#EDEDED] active:bg-[#E0E0E0]",
      ghost: "bg-transparent text-slate-900 hover:bg-slate-100",
      destructive: "bg-red-600 text-white hover:bg-red-700",
    };

    return (
      <button
        ref={ref}
        type={type}
        data-slot="icon-button"
        className={cn(
          "inline-flex items-center justify-center",
          "rounded-xl", // 12px radius - NEVER rounded-full
          sizeClasses[size],
          variantClasses[variant],
          "transition-colors touch-manipulation",
          "disabled:pointer-events-none disabled:opacity-50",
          "outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-black/20",
          className
        )}
        {...props}
      />
    );
  }
);

IconButton.displayName = "IconButton";

export default IconButton;
