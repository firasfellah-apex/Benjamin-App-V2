/**
 * PageContainer Component
 * 
 * Unified layout wrapper for customer and runner apps.
 * Applies theme-specific background and spacing.
 * 
 * Usage:
 * - Customer pages: <PageContainer variant="customer">...</PageContainer>
 * - Runner pages: <PageContainer variant="runner">...</PageContainer>
 */

import { cn } from "@/lib/utils";

interface PageContainerProps {
  variant?: 'customer' | 'runner';
  children: React.ReactNode;
  className?: string;
}

export function PageContainer({
  variant = 'customer',
  children,
  className
}: PageContainerProps) {
  const isRunner = variant === 'runner';

  return (
    <div
      className={cn(
        "min-h-screen w-full",
        isRunner ? "app-runner bg-[#020817]" : "app-customer bg-[#F5F5F7]",
        className
      )}
    >
      <div className="container max-w-4xl mx-auto py-8 px-4">
        {children}
      </div>
    </div>
  );
}
