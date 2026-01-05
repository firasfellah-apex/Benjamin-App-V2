import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { IconButton } from '@/components/ui/icon-button';
import { useOrdersRealtime } from '@/hooks/useOrdersRealtime';
import { getCustomerOrders, confirmCount } from '@/db/api';
import { resolveDeliveryStyleFromOrder } from '@/lib/deliveryStyle';
import type { OrderWithDetails } from '@/types/types';
import countConfirmationIllustration from '@/assets/illustrations/CountConfirmation.png';
import { useAuth } from '@/contexts/AuthContext';

// COUNTED guardrail constants
const COUNT_GUARDRAIL_WINDOW_MS = 3 * 60 * 1000; // 3 minutes
const makeGuardrailKey = (orderId: string) => `benjamin:count-guardrail:${orderId}`;

export function GlobalCountGuardrail() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [showModal, setShowModal] = useState(false);
  const [currentOrder, setCurrentOrder] = useState<OrderWithDetails | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Check for COUNTED orders that need the guardrail
  const checkForCountGuardrail = useCallback(async () => {
    if (!user?.id) return;

    try {
      const orders = await getCustomerOrders();
      
      // Find active COUNTED orders with OTP verified
      const countedOrders = orders.filter((order) => {
        const deliveryStyle = resolveDeliveryStyleFromOrder(order);
        if (deliveryStyle !== 'COUNTED') return false;
        if (order.status === 'Cancelled' || order.cancelled_at) return false;
        
        const otpVerifiedAt = (order as any).otp_verified_at;
        const isOtpVerified = !!otpVerifiedAt && order.status === 'Pending Handoff';
        
        if (!isOtpVerified) return false;

        // Check if guardrail window is still valid
        const key = makeGuardrailKey(order.id);
        const stored = (() => {
          try {
            const raw = localStorage.getItem(key);
            if (!raw) return null;
            return JSON.parse(raw) as { dismissed?: boolean; expiresAt?: number };
          } catch {
            return null;
          }
        })();

        if (stored?.dismissed) return false;

        const windowStartTime = new Date(otpVerifiedAt).getTime();
        const expiresAt = windowStartTime + COUNT_GUARDRAIL_WINDOW_MS;
        const now = Date.now();

        if (now > expiresAt) return false;

        // Update stored window if needed
        if (!stored || !stored.expiresAt || stored.expiresAt < expiresAt) {
          try {
            localStorage.setItem(key, JSON.stringify({ dismissed: false, expiresAt }));
          } catch {
            // ignore
          }
        }

        return true;
      });

      if (countedOrders.length > 0) {
        // Show modal for the most recent order
        const orderToShow = countedOrders.sort((a, b) => 
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        )[0];
        
        // Double-check order is still in correct state before showing
        if (orderToShow.status === 'Pending Handoff' && !orderToShow.cancelled_at) {
          setCurrentOrder(orderToShow);
          setShowModal(true);
        } else {
          setShowModal(false);
          setCurrentOrder(null);
        }
      } else {
        setShowModal(false);
        setCurrentOrder(null);
      }
    } catch (error) {
      console.error('[GlobalCountGuardrail] Error checking for guardrail:', error);
    }
  }, [user?.id]);

  // Initial check on mount
  useEffect(() => {
    checkForCountGuardrail();
  }, [checkForCountGuardrail]);

  // Subscribe to realtime order updates
  useOrdersRealtime({
    filter: { mode: 'customer', customerId: user?.id || '' },
    onUpdate: (updatedOrder) => {
      // Re-check when any order is updated
      checkForCountGuardrail();
    },
    enabled: !!user?.id,
  });

  // Poll periodically to catch any missed updates
  useEffect(() => {
    if (!user?.id) return;

    const interval = setInterval(() => {
      checkForCountGuardrail();
    }, 5000); // Check every 5 seconds

    return () => clearInterval(interval);
  }, [user?.id, checkForCountGuardrail]);

  const handleDismiss = useCallback(() => {
    if (!currentOrder) return;

    setShowModal(false);
    try {
      const key = makeGuardrailKey(currentOrder.id);
      const raw = localStorage.getItem(key);
      const parsed = raw ? JSON.parse(raw) : {};
      const expiresAt = parsed?.expiresAt ?? Date.now();
      localStorage.setItem(
        key,
        JSON.stringify({ ...parsed, dismissed: true, expiresAt })
      );
    } catch (e) {
      console.warn('[GlobalCountGuardrail] Failed to persist dismissal', e);
    }
  }, [currentOrder]);

  const handleLooksCorrect = useCallback(async () => {
    if (!currentOrder || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const result = await confirmCount(currentOrder.id);
      if (result.success) {
        handleDismiss();
        // Navigate to home to refresh order state
        navigate('/customer/home', { replace: true });
      } else {
        console.error('[GlobalCountGuardrail] Failed to confirm count:', result.error);
      }
    } catch (error) {
      console.error('[GlobalCountGuardrail] Error confirming count:', error);
    } finally {
      setIsSubmitting(false);
    }
  }, [currentOrder, isSubmitting, handleDismiss, navigate]);

  const handleIncorrectAmount = useCallback(() => {
    if (!currentOrder) return;
    
    handleDismiss();
    // Navigate to order detail page with report issue sheet
    navigate(`/customer/deliveries/${currentOrder.id}?report=count`);
  }, [currentOrder, handleDismiss, navigate]);

  if (!showModal || !currentOrder) return null;

  return typeof document !== 'undefined' && createPortal(
    <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/50 px-4">
      <div className="w-full max-w-sm rounded-[24px] bg-white shadow-xl relative overflow-hidden">
        {/* Close button */}
        <div className="absolute top-4 right-4 z-10">
          <IconButton
            type="button"
            variant="default"
            size="lg"
            onClick={handleDismiss}
            aria-label="Close"
          >
            <X className="h-5 w-5 text-slate-900" />
          </IconButton>
        </div>

        {/* Illustration frame - 6px from top and sides */}
        <div className="w-full px-[6px] pt-[6px]">
          <div
            className="w-full h-[260px] flex items-center justify-center rounded-[18px]"
          >
            <div className="w-[193px] h-[193px] flex items-center justify-center overflow-hidden rounded-[18px]">
              <img
                src={countConfirmationIllustration}
                alt="Count confirmation"
                className="w-full h-full object-contain"
              />
            </div>
          </div>
        </div>

        {/* Content - with 24px padding on sides and bottom */}
        <div className="px-6 pb-6 space-y-4">
          <div className="space-y-2 text-center">
            <h3 className="text-lg font-semibold text-slate-900">
              How did the count go?
            </h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              Count your cash with the runner.
              <br />
              If anything&apos;s off, we&apos;ll handle it.
            </p>
            <p className="text-[11px] text-slate-500 mt-1.5">
              You&apos;ll have about 3 minutes to flag any issue for this delivery.
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              onClick={handleIncorrectAmount}
              disabled={isSubmitting}
              className="flex-1 h-14 text-base font-semibold text-white"
              style={{ backgroundColor: '#E84855' }}
            >
              Incorrect Amount
            </Button>
            <Button
              type="button"
              onClick={handleLooksCorrect}
              disabled={isSubmitting}
              className="flex-1 h-14 text-base font-semibold bg-black text-white hover:bg-black/90"
            >
              {isSubmitting ? 'Confirming...' : 'Looks Correct'}
            </Button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

