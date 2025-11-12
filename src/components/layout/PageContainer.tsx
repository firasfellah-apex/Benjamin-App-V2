/**
 * PageContainer Component
 * 
 * Unified layout wrapper for customer, runner, and admin apps.
 * Applies theme-specific background and spacing.
 * 
 * Usage:
 * - Customer pages: <PageContainer variant="customer">...</PageContainer>
 * - Runner pages: <PageContainer variant="runner">...</PageContainer>
 * - Admin pages: <PageContainer variant="admin">...</PageContainer>
 */

import { cn } from "@/lib/utils";

export type PageVariant = 'customer' | 'runner' | 'admin';

interface PageContainerProps {
  variant?: PageVariant;
  children: React.ReactNode;
  className?: string;
}

export function PageContainer({
  variant = 'customer',
  children,
  className
}: PageContainerProps) {
  // Theme-specific styles
  const variantStyles = {
    customer: "app-customer bg-[#F9FAFB] text-[#111827]",
    runner: "app-runner bg-[#020817] text-[#E5E7EB]",
    admin: "app-admin bg-[#1B1D21] text-[#F1F3F5]", // Graphite Neutral
  };

  // Runner variant: full-width mobile layout (no container constraint)
  // Customer/Admin: use container max-w-4xl for desktop layout
  const containerClasses = variant === 'runner'
    ? "w-full h-full flex flex-col flex-1 min-h-0"
    : "container max-w-4xl mx-auto w-full h-full flex flex-col flex-1 min-h-0";

  return (
    <div
      className={cn(
        "w-full flex flex-col flex-1 min-h-0",
        variantStyles[variant],
        className
      )}
    >
      <div className={containerClasses}>
        {children}
      </div>
    </div>
  );
}
