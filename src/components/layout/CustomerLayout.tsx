/**
 * CustomerLayout Component
 * 
 * Wrapper layout for customer pages that includes:
 * - PageContainer with customer theme
 * - Fixed bottom navigation with Request Cash CTA
 * - Proper padding to avoid content being hidden
 */

import { PageContainer } from './PageContainer';
import { CustomerBottomNav } from './CustomerBottomNav';

interface CustomerLayoutProps {
  children: React.ReactNode;
}

export function CustomerLayout({ children }: CustomerLayoutProps) {
  return (
    <>
      <PageContainer variant="customer">
        <div className="pb-24">
          {children}
        </div>
      </PageContainer>

      {/* Fixed bottom navigation */}
      <CustomerBottomNav />
    </>
  );
}
