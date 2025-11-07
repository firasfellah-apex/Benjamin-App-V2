/**
 * CustomerLayout Component
 * 
 * Wrapper layout for customer pages that includes:
 * - PageContainer with customer theme
 * - Fixed bottom CTA for requesting cash
 * - Proper padding to avoid content being hidden
 */

import { useNavigate } from 'react-router-dom';
import { PageContainer } from './PageContainer';
import { ArrowRight } from 'lucide-react';

interface CustomerLayoutProps {
  children: React.ReactNode;
}

export function CustomerLayout({ children }: CustomerLayoutProps) {
  const navigate = useNavigate();

  return (
    <>
      <PageContainer variant="customer">
        <div className="pb-24">
          {children}
        </div>
      </PageContainer>

      {/* Fixed bottom CTA */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-lg border-t border-black/5 safe-area-inset-bottom">
        <div className="container max-w-4xl mx-auto px-4 py-3">
          <button
            onClick={() => navigate('/customer/request')}
            className="w-full h-11 rounded-2xl bg-black text-white text-sm font-semibold flex items-center justify-center gap-2 shadow-lg hover:bg-black/90 transition-all active:scale-95"
          >
            <span className="text-lg">$</span>
            Request Cash Delivery
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </>
  );
}
