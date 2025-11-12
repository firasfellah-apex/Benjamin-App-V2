/**
 * ShellCard Component
 * 
 * Theme-aware card wrapper for customer and runner apps.
 * Provides consistent styling with theme-specific colors.
 * 
 * Usage:
 * - Customer: <ShellCard variant="customer">...</ShellCard>
 * - Runner: <ShellCard variant="runner">...</ShellCard>
 */

import { cn } from "@/lib/utils";

interface ShellCardProps {
  variant?: 'customer' | 'runner';
  className?: string;
  children: React.ReactNode;
  id?: string;
}

export function ShellCard({
  variant = 'customer',
  className,
  children,
  id,
}: ShellCardProps) {
  const isRunner = variant === 'runner';

  return (
    <div
      id={id}
      className={cn(
        "rounded-3xl shadow-sm border p-5 md:p-6",
        isRunner
          ? "bg-[#0B1020] border-[rgba(148,163,253,0.14)] text-[#F9FAFB]"
          : "bg-white border-[#F0F0F3] text-black",
        className
      )}
    >
      {children}
    </div>
  );
}
