/**
 * CustomerLayout Component
 * 
 * Wrapper for customer pages that applies MobilePageShell for consistent spacing.
 * Ensures all customer pages have unified width constraints and padding.
 */

import { MobilePageShell } from './MobilePageShell';

interface CustomerLayoutProps {
  children: React.ReactNode;
}

export function CustomerLayout({ children }: CustomerLayoutProps) {
  return (
    <div className="h-full flex flex-col bg-[#F4F5F7] overflow-hidden">
      <MobilePageShell className="h-full flex flex-col">
        {children}
      </MobilePageShell>
    </div>
  );
}
