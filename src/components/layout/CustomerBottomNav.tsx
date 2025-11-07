/**
 * CustomerBottomNav Component
 * 
 * Fixed bottom navigation for customer app with single primary CTA.
 * Features:
 * - Single full-width "Request Cash" button
 * - Fixed positioning with backdrop blur
 * - Only renders on customer routes
 */

import { useLocation, useNavigate } from 'react-router-dom';

export function CustomerBottomNav() {
  const location = useLocation();
  const navigate = useNavigate();

  // Only render on customer routes
  if (!location.pathname.startsWith('/customer')) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-white backdrop-blur-lg border-t border-black/5 safe-area-inset-bottom">
      <div className="container max-w-4xl mx-auto px-4 py-3">
        <button
          onClick={() => navigate('/customer/request')}
          className="w-full h-14 rounded-2xl bg-black text-white font-semibold text-[15px] flex items-center justify-center shadow-lg hover:bg-black/90 transition-all active:scale-95"
        >
          Request Cash
        </button>
      </div>
    </div>
  );
}

