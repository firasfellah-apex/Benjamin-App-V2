/**
 * LastDeliveryCard Component
 * 
 * Displays the most recent completed delivery in a compact card format.
 * Matches Benjamin UI design system with consistent styling.
 * Shows delivery amount, address, time, rating status, and navigation to full history.
 */

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import type { OrderWithDetails } from "@/types/types";
import { formatOrderTitle, formatOrderListTimestamp, getOrderStatusLabel, hasRunnerRating } from "@/lib/orderDisplay";
import { useProfile } from "@/hooks/useProfile";
import { useAuth } from "@/contexts/AuthContext";
import { useCustomerAddresses } from "@/features/address/hooks/useCustomerAddresses";
import { useBankAccounts } from "@/hooks/useBankAccounts";
import { validateReorderEligibility } from "@/features/orders/reorderEligibility";
import { ReorderBlockedModal } from "@/components/customer/ReorderBlockedModal";
import { QuickReorderModal } from "@/components/customer/QuickReorderModal";
import { useActiveCustomerOrder } from "@/hooks/useActiveCustomerOrder";
import { Lock } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface LastDeliveryCardProps {
  order: OrderWithDetails;
  onRateRunner?: (orderId: string) => void;
  hasIssue?: boolean;
}

export function LastDeliveryCard({ order, onRateRunner, hasIssue = false }: LastDeliveryCardProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { profile } = useProfile(user?.id);
  const { addresses } = useCustomerAddresses();
  const { bankAccounts, isLoading: bankAccountsLoading } = useBankAccounts();
  const { hasActiveOrder } = useActiveCustomerOrder();
  const [showBlockedModal, setShowBlockedModal] = useState(false);
  const [showQuickReorderModal, setShowQuickReorderModal] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const [eligibilityResult, setEligibilityResult] = useState<{ ok: boolean; reason?: 'missing_bank' | 'missing_address' | 'blocked_order' | 'runner_disabled'; message?: string } | null>(null);
  
  if (!order) return null;
  
  const isRated = hasRunnerRating(order);
  const canRate = order.status === 'Completed' && !isRated && !hasIssue;
  const isCancelled = order.status === 'Cancelled';
  
  const handleRateClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onRateRunner) {
      onRateRunner(order.id);
    } else {
      // Navigate to order detail page where rating can be done
      navigate(`/customer/deliveries/${order.id}`);
    }
  };
  
  const handleReorder = (e: React.MouseEvent) => {
    e.stopPropagation();
    
    // Block reorder if there's an active order
    if (hasActiveOrder) {
      return;
    }
    
    // Wait for bank accounts to load before checking eligibility
    if (bankAccountsLoading) {
      // Could show a loading state here, but for now just return
      return;
    }
    
    // Run reorder eligibility check
    const result = validateReorderEligibility({
      profile: profile || null,
      addresses: addresses || [],
      previousOrder: order,
      bankAccounts: bankAccounts || [],
    });
    
    if (!result.ok) {
      // Show blocked modal
      setEligibilityResult(result);
      setShowBlockedModal(true);
      return;
    }
    
    // All checks passed - show Quick Reorder modal
    setShowQuickReorderModal(true);
  };
  
  const handleStartNewRequest = () => {
    // Navigate to normal order flow (no reorder params)
    navigate('/customer/request');
  };
  
  return (
    <>
      {/* Quick Reorder Modal */}
      <QuickReorderModal
        open={showQuickReorderModal}
        onOpenChange={setShowQuickReorderModal}
        order={order}
      />

      {/* Reorder Blocked Modal */}
      {eligibilityResult && (
        <ReorderBlockedModal
          open={showBlockedModal}
          onOpenChange={setShowBlockedModal}
          eligibilityResult={eligibilityResult}
          onStartNewRequest={handleStartNewRequest}
        />
      )}
      
      {/* Standardized spacing: px-6 (24px) horizontal and vertical */}
      {/* Internal spacing: space-y-6 (24px) for grouped UI blocks */}
      <div className="rounded-2xl border border-[#F0F0F0]/70 bg-slate-50/40 px-6 py-6">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex flex-col gap-0.5 flex-1 min-w-0">
              <div className="text-[11px] font-medium uppercase tracking-[0.05em] text-slate-500">
                Latest Order
              </div>
              <div className="text-base font-semibold text-slate-900">
                {formatOrderTitle(order)}
              </div>
              <div className="text-[11px] text-slate-500">
                {formatOrderListTimestamp(order)}
              </div>
            </div>
            
            {/* Status pill */}
            <div 
              className="flex-shrink-0 px-2 py-1 rounded-full text-[10px] font-medium border"
              style={isCancelled ? {
                backgroundColor: '#FEE5E7',
                color: '#E84855',
                borderColor: '#E84855'
              } : {
                backgroundColor: '#E5FBF2',
                color: '#047857',
                borderColor: '#13F287'
              }}
            >
              {getOrderStatusLabel(order)}
            </div>
          </div>
          
          {/* Divider */}
          <div className="border-t border-slate-200" />
          
          {/* Actions */}
          <div className="flex items-center justify-between gap-4">
            {canRate ? (
              <>
                <Button
                  type="button"
                  onClick={handleRateClick}
                  className="flex-1 h-14 items-center justify-center gap-2 bg-yellow-400 hover:bg-yellow-400 active:bg-yellow-400 text-base font-semibold border-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-yellow-400 active:scale-[0.98] transition-all duration-150"
                  style={{ color: '#D97708' }}
                >
                  <span className="text-base leading-[0]" style={{ color: '#D97708' }}>★</span>
                  <span>Rate Runner</span>
                </Button>
                {hasActiveOrder ? (
                  <Tooltip open={showTooltip} onOpenChange={setShowTooltip}>
                    <TooltipTrigger asChild>
                      <div
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setShowTooltip((prev) => !prev);
                        }}
                        className="flex-1 cursor-pointer"
                      >
                        <Button
                          type="button"
                          disabled={true}
                          className="w-full h-14 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                          style={{ backgroundColor: '#D1D5DB', color: '#6B7280' }}
                        >
                          <span>Reorder</span>
                          <Lock className="w-4 h-4" style={{ color: '#6B7280' }} />
                        </Button>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent
                      side="top"
                      className="bg-black text-white text-xs rounded-lg shadow-lg w-max max-w-xs px-3 py-2.5 border-0 z-[100]"
                      onClick={() => setShowTooltip(false)}
                    >
                      <p className="leading-relaxed">
                        Cannot make a new order when one is already in motion. Please wait for your current order to complete.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                ) : (
                <Button
                  type="button"
                  onClick={handleReorder}
                    className="flex-1 h-14 bg-black text-white hover:bg-black/90 flex items-center justify-center gap-2"
                >
                    <span>Reorder</span>
                </Button>
                )}
              </>
            ) : hasIssue && !isRated ? (
              <>
                <div className="flex items-center justify-between flex-1">
                  <span className="text-xs text-slate-600">This delivery is being investigated.</span>
                </div>
                {hasActiveOrder ? (
                  <Tooltip open={showTooltip} onOpenChange={setShowTooltip}>
                    <TooltipTrigger asChild>
                      <div
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setShowTooltip(true);
                        }}
                        className="flex-shrink-0 cursor-pointer"
                      >
                        <Button
                          type="button"
                          disabled={true}
                          className="h-14 px-6 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                          style={{ backgroundColor: '#D1D5DB', color: '#6B7280' }}
                        >
                          <span>Reorder</span>
                          <Lock className="w-4 h-4" style={{ color: '#6B7280' }} />
                        </Button>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent
                      side="top"
                      className="bg-black text-white text-xs rounded-lg shadow-lg w-max max-w-xs px-3 py-2.5 border-0 z-[100]"
                      onClick={() => setShowTooltip(false)}
                    >
                      <p className="leading-relaxed">
                        Cannot make a new order when one is already in motion. Please wait for your current order to complete.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                ) : (
                <Button
                  type="button"
                  onClick={handleReorder}
                    className="flex-shrink-0 h-14 px-6 bg-black text-white hover:bg-black/90 flex items-center justify-center gap-2"
                >
                    <span>Reorder</span>
                </Button>
                )}
              </>
            ) : isRated && order.runner_rating ? (
              <>
                <div className="flex flex-col gap-3 flex-1 justify-center">
                  <span className="text-xs text-slate-600">You rated this runner:</span>
                  <div className="inline-flex items-center gap-1">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <span
                        key={i}
                        className="text-base leading-[0]"
                        style={{ color: i < Math.round(order.runner_rating || 0) ? '#F2AB58' : '#E5E7EB' }}
                      >
                        ★
                      </span>
                    ))}
                  </div>
                </div>
                {hasActiveOrder ? (
                  <Tooltip open={showTooltip} onOpenChange={setShowTooltip}>
                    <TooltipTrigger asChild>
                      <div
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setShowTooltip(true);
                        }}
                        className="flex-shrink-0 cursor-pointer"
                      >
                        <Button
                          type="button"
                          disabled={true}
                          className="h-14 px-6 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                          style={{ backgroundColor: '#D1D5DB', color: '#6B7280' }}
                        >
                          <span>Reorder</span>
                          <Lock className="w-4 h-4" style={{ color: '#6B7280' }} />
                        </Button>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent
                      side="top"
                      className="bg-black text-white text-xs rounded-lg shadow-lg w-max max-w-xs px-3 py-2.5 border-0 z-[100]"
                      onClick={() => setShowTooltip(false)}
                    >
                      <p className="leading-relaxed">
                        Cannot make a new order when one is already in motion. Please wait for your current order to complete.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                ) : (
                <Button
                  type="button"
                  onClick={handleReorder}
                    className="flex-shrink-0 h-14 px-6 bg-black text-white hover:bg-black/90 flex items-center justify-center gap-2"
                >
                    <span>Reorder</span>
                </Button>
                )}
              </>
            ) : isCancelled ? (
              <>
                <div className="text-xs text-slate-400 flex-1">
                  This order was cancelled.
                </div>
                {hasActiveOrder ? (
                  <Tooltip open={showTooltip} onOpenChange={setShowTooltip}>
                    <TooltipTrigger asChild>
                      <div
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setShowTooltip(true);
                        }}
                        className="flex-shrink-0 cursor-pointer"
                      >
                        <Button
                          type="button"
                          disabled={true}
                          className="h-14 px-6 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                          style={{ backgroundColor: '#D1D5DB', color: '#6B7280' }}
                        >
                          <span>Reorder</span>
                          <Lock className="w-4 h-4" style={{ color: '#6B7280' }} />
                        </Button>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent
                      side="top"
                      className="bg-black text-white text-xs rounded-lg shadow-lg w-max max-w-xs px-3 py-2.5 border-0 z-[100]"
                      onClick={() => setShowTooltip(false)}
                    >
                      <p className="leading-relaxed">
                        Cannot make a new order when one is already in motion. Please wait for your current order to complete.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                ) : (
                <Button
                  type="button"
                  onClick={handleReorder}
                    className="flex-shrink-0 h-14 px-6 bg-black text-white hover:bg-black/90 flex items-center justify-center gap-2"
                >
                    <span>Reorder</span>
                </Button>
                )}
              </>
            ) : (
              <>
                <div className="text-xs text-slate-400 flex-1">
                  Thank you for using Benjamin.
                </div>
                {hasActiveOrder ? (
                  <Tooltip open={showTooltip} onOpenChange={setShowTooltip}>
                    <TooltipTrigger asChild>
                      <div
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setShowTooltip(true);
                        }}
                        className="flex-shrink-0 cursor-pointer"
                      >
                        <Button
                          type="button"
                          disabled={true}
                          className="h-14 px-6 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                          style={{ backgroundColor: '#D1D5DB', color: '#6B7280' }}
                        >
                          <span>Reorder</span>
                          <Lock className="w-4 h-4" style={{ color: '#6B7280' }} />
                        </Button>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent
                      side="top"
                      className="bg-black text-white text-xs rounded-lg shadow-lg w-max max-w-xs px-3 py-2.5 border-0 z-[100]"
                      onClick={() => setShowTooltip(false)}
                    >
                      <p className="leading-relaxed">
                        Cannot make a new order when one is already in motion. Please wait for your current order to complete.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                ) : (
                <Button
                  type="button"
                  onClick={handleReorder}
                    className="flex-shrink-0 h-14 px-6 bg-black text-white hover:bg-black/90 flex items-center justify-center gap-2"
                >
                    <span>Reorder</span>
                </Button>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

