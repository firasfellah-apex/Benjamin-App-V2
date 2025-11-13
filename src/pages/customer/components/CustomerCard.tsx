/**
 * CustomerCard Component
 * 
 * Standardized white rounded container for customer page content.
 * Single morphing panel per screen - no nested containers.
 */
import React from "react";

export default function CustomerCard({
  className = "",
  children,
  interactive = false,
  hoverable = false,
  onClick,
}: React.PropsWithChildren<{ 
  className?: string;
  interactive?: boolean;
  hoverable?: boolean;
  onClick?: () => void;
}>) {
  const baseClasses = "rounded-3xl bg-white shadow-xl/5 p-6 sm:p-7 " +
    "transition-[height,padding,margin] duration-300 ease-out";
  
  const interactiveClasses = interactive ? "cursor-pointer active:scale-[0.99] transition-transform" : "";
  const hoverableClasses = hoverable ? "hover:shadow-md transition-shadow" : "";
  
  return (
    <div
      className={`${baseClasses} ${interactiveClasses} ${hoverableClasses} ${className}`}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      } : undefined}
    >
      {children}
    </div>
  );
}



