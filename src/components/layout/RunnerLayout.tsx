/**
 * RunnerLayout Component
 * 
 * Wrapper layout for runner pages that includes:
 * - PageContainer with runner dark theme
 * - Consistent dark mode styling
 */

import { PageContainer } from './PageContainer';

interface RunnerLayoutProps {
  children: React.ReactNode;
}

export function RunnerLayout({ children }: RunnerLayoutProps) {
  return (
    <PageContainer variant="runner">
      {children}
    </PageContainer>
  );
}
