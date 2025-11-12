/**
 * AdminLayout Component
 * 
 * Wrapper layout for admin pages that includes:
 * - AdminHeader (dark theme)
 * - PageContainer with admin theme
 * - Consistent dark mode styling
 */

import { PageContainer } from './PageContainer';
import { AdminHeader } from './AdminHeader';

interface AdminLayoutProps {
  children: React.ReactNode;
}

export function AdminLayout({ children }: AdminLayoutProps) {
  return (
    <div className="min-h-screen flex flex-col bg-[#1B1D21]">
      <AdminHeader />
      <PageContainer variant="admin">
        {children}
      </PageContainer>
    </div>
  );
}

