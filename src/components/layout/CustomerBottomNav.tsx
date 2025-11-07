/**
 * CustomerBottomNav Component
 * 
 * Fixed bottom navigation for customer app with primary CTA.
 * Features:
 * - Home, History, Request Cash (primary), Account tabs
 * - Request Cash is center-positioned with elevated styling
 * - Active state highlighting
 * - Fixed positioning with backdrop blur
 */

import { Home, Clock, User, DollarSign } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLocation, useNavigate } from 'react-router-dom';

export function CustomerBottomNav() {
  const location = useLocation();
  const navigate = useNavigate();

  const isActive = (path: string) => location.pathname.startsWith(path);

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-lg border-t border-black/5 safe-area-inset-bottom">
      <div className="container max-w-4xl mx-auto">
        <div className="flex items-end justify-around px-4 py-2 gap-2">
          {/* Home */}
          <button
            onClick={() => navigate('/customer/home')}
            className={cn(
              'flex flex-col items-center gap-0.5 flex-1 py-2 px-2 rounded-lg transition-colors',
              isActive('/customer/home') 
                ? 'text-black font-semibold' 
                : 'text-neutral-400 hover:text-neutral-600'
            )}
          >
            <Home className={cn(
              "h-5 w-5",
              isActive('/customer/home') && "fill-current"
            )} />
            <span className="text-[10px]">Home</span>
          </button>

          {/* History */}
          <button
            onClick={() => navigate('/customer/orders')}
            className={cn(
              'flex flex-col items-center gap-0.5 flex-1 py-2 px-2 rounded-lg transition-colors',
              isActive('/customer/orders')
                ? 'text-black font-semibold'
                : 'text-neutral-400 hover:text-neutral-600'
            )}
          >
            <Clock className={cn(
              "h-5 w-5",
              isActive('/customer/orders') && "fill-current"
            )} />
            <span className="text-[10px]">History</span>
          </button>

          {/* Primary CTA - Request Cash */}
          <button
            onClick={() => navigate('/customer/request')}
            className="flex-1 -mt-4"
          >
            <div className="bg-black text-white rounded-2xl px-4 py-3 shadow-lg hover:bg-black/90 transition-all hover:scale-105 active:scale-95">
              <div className="flex flex-col items-center gap-1">
                <DollarSign className="h-6 w-6" strokeWidth={2.5} />
                <span className="text-[10px] font-semibold">Request Cash</span>
              </div>
            </div>
          </button>

          {/* Account */}
          <button
            onClick={() => navigate('/account')}
            className={cn(
              'flex flex-col items-center gap-0.5 flex-1 py-2 px-2 rounded-lg transition-colors',
              isActive('/account')
                ? 'text-black font-semibold'
                : 'text-neutral-400 hover:text-neutral-600'
            )}
          >
            <User className={cn(
              "h-5 w-5",
              isActive('/account') && "fill-current"
            )} />
            <span className="text-[10px]">Account</span>
          </button>
        </div>
      </div>
    </div>
  );
}
