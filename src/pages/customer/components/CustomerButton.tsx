import { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

interface CustomerButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost";
  children: ReactNode;
}

export function CustomerButton({
  variant = "primary",
  className,
  children,
  ...props
}: CustomerButtonProps) {
  return (
    <button
      className={cn(
        "rounded-full h-14 min-h-[56px] px-6 text-[17px] font-semibold",
        "flex items-center justify-center",
        "transition-all duration-200",
        variant === "primary" && "bg-black text-white hover:bg-black/90",
        variant === "secondary" && "bg-white text-black border border-gray-300 hover:bg-gray-50",
        variant === "ghost" && "bg-transparent text-black hover:bg-gray-100",
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}

