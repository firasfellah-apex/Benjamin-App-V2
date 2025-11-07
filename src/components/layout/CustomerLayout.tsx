/**
 * CustomerLayout Component
 * 
 * Wrapper layout for customer pages that includes:
 * - Fixed bottom navigation
 * - Proper padding to avoid content being hidden
 */

import { CustomerBottomNav } from './CustomerBottomNav';

interface CustomerLayoutProps {
  children: React.ReactNode;
}

export function CustomerLayout({ children }: CustomerLayoutProps) {
  return (
    <>
      {children}
      <CustomerBottomNav />
    </>
  );
}
