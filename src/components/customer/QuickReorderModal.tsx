/**
 * QuickReorderModal Component
 * * Accordion-style modal for quick reordering with:
 * - Single-open-section accordion
 * - Reuses existing selection components
 * - Sticky "Slide to Confirm" CTA
 */

import { useState, useRef, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion"; // Removed LayoutGroup
import { X, ChevronDown } from "lucide-react";
import { IconButton } from "@/components/ui/icon-button";
import { cn } from "@/lib/utils";
import { SlideToConfirm } from "@/components/customer/SlideToConfirm";
import { DeliveryModeSelector, type DeliveryMode } from "@/components/customer/DeliveryModeSelector";
import { useCustomerAddresses } from "@/features/address/hooks/useCustomerAddresses";
import { useBankAccounts } from "@/hooks/useBankAccounts";
import { calculatePricing } from "@/lib/pricing";
import type { CustomerAddress } from "@/types/types";
import type { OrderWithDetails } from "@/types/types";
import { getAddressPrimaryLine, getAddressSecondaryLine, formatAddress, createOrder } from "@/db/api";
import { getIconByName } from "@/components/address/IconPicker";
import { Landmark } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useProfile } from "@/hooks/useProfile";
import { useQueryClient } from "@tanstack/react-query";
import { clearProfileCache } from "@/hooks/useProfile";
import { strings } from "@/lib/strings";
import { track } from "@/lib/analytics";
import { resolveDeliveryStyleFromOrder } from "@/lib/deliveryStyle";

type OpenSection = "address" | "account" | "amount" | "delivery" | null;

interface QuickReorderModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: OrderWithDetails;
}

// 1. Define specific, sleek animation constants
const ACCORDION_VARIANTS = {
  collapsed: { 
    height: 0, 
    opacity: 0,
    transition: { 
      height: { duration: 0.3, ease: [0.4, 0, 0.2, 1] }, // Standard Material/iOS ease
      opacity: { duration: 0.2 } // Fade out faster than collapse
    }
  },
  open: { 
    height: "auto", 
    opacity: 1,
    transition: { 
      height: { duration: 0.35, ease: [0.4, 0, 0.2, 1] },
      opacity: { duration: 0.4, delay: 0.1 } // Delay fade in slightly
    }
  }
};

export function QuickReorderModal({
  open,
  onOpenChange,
  order,
}: QuickReorderModalProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { profile } = useProfile();
  const [openSection, setOpenSection] = useState<OpenSection>(null);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [selectedBankAccountId, setSelectedBankAccountId] = useState<string | null>(null);
  const [amount, setAmount] = useState(order.requested_amount || 200);
  const [deliveryMode, setDeliveryMode] = useState<DeliveryMode>(() => {
    const deliveryStyle = resolveDeliveryStyleFromOrder(order);
    return deliveryStyle === 'COUNTED' ? 'count_confirm' : 'quick_handoff';
  });
  const [loading, setLoading] = useState(false);

  const { addresses } = useCustomerAddresses();
  const { bankAccounts, hasAnyBank } = useBankAccounts();

  // Section refs for scrollIntoView
  const addressSectionRef = useRef<HTMLDivElement>(null);
  const accountSectionRef = useRef<HTMLDivElement>(null);
  const amountSectionRef = useRef<HTMLDivElement>(null);
  const deliverySectionRef = useRef<HTMLDivElement>(null);
  
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Prevent background scroll
  useEffect(() => {
    const body = document.body;
    body.style.pointerEvents = "";
    if (!open) {
      body.style.overflow = "";
      return;
    }
    const prevOverflow = body.style.overflow;
    body.style.overflow = "hidden";
    return () => {
      body.style.overflow = prevOverflow;
      body.style.pointerEvents = "";
    };
  }, [open]);

  const handleClose = () => {
    onOpenChange(false);
  };

  useEffect(() => {
    if (!open) return;
    setSelectedAddressId(null);
    setSelectedBankAccountId(null);
    setOpenSection(null);
    setAmount(order.requested_amount || 200);
    const deliveryStyle = resolveDeliveryStyleFromOrder(order);
    setDeliveryMode(deliveryStyle === 'COUNTED' ? 'count_confirm' : 'quick_handoff');
  }, [open, order.id, order.requested_amount]);

  useEffect(() => {
    if (!open || addresses.length === 0) return;
    if (order.address_id) {
      const addressExists = addresses.some(a => a.id === order.address_id);
      if (addressExists) {
        setSelectedAddressId(order.address_id);
        return;
      }
    }
    setSelectedAddressId(addresses[0].id);
  }, [open, order.address_id, addresses]);

  useEffect(() => {
    if (!open || !hasAnyBank || bankAccounts.length === 0) return;
    setSelectedBankAccountId(bankAccounts[0].id);
  }, [open, hasAnyBank, bankAccounts]);

  const toggleSection = (section: Exclude<OpenSection, null>) => {
    setOpenSection((prev) => (prev === section ? null : section));
  };

  // Scroll logic
  useEffect(() => {
    if (!openSection) return;

    // Reduced timeout to match new animation speed
    const timeoutId = setTimeout(() => {
      requestAnimationFrame(() => {
        const refs = {
          address: addressSectionRef,
          account: accountSectionRef,
          amount: amountSectionRef,
          delivery: deliverySectionRef,
        };
        const ref = refs[openSection];
        // Use 'nearest' to prevent jarring jumps if the element is already visible
        if (ref?.current) {
          ref.current.scrollIntoView({ behavior: "smooth", block: "nearest" });
        }
      });
    }, 360); 

    return () => clearTimeout(timeoutId);
  }, [openSection]);

  const selectedAddress = addresses.find(a => a.id === selectedAddressId);
  const selectedBankAccount = bankAccounts.find(b => b.id === selectedBankAccountId);

  const pricing = useMemo(() => {
    if (!selectedAddress) return null;
    return calculatePricing({
      amount,
      customerAddress: {
        lat: selectedAddress.latitude || 0,
        lng: selectedAddress.longitude || 0,
      },
    });
  }, [amount, selectedAddress?.id, selectedAddress?.latitude, selectedAddress?.longitude]);

  const handleAddressSelect = (address: CustomerAddress) => {
    setSelectedAddressId(address.id);
    setOpenSection(null);
  };

  const handleBankAccountSelect = (bankId: string) => {
    setSelectedBankAccountId(bankId);
    setOpenSection(null);
  };

  const handleAmountChange = (newAmount: number) => {
    setAmount(newAmount);
    const amount_range = newAmount >= 500 ? "high" : newAmount >= 300 ? "medium" : "low";
    track("cash_amount_changed", {
      amount: newAmount,
      amount_range,
      source: "quick_reorder_modal",
    });
  };

  const handleDeliveryModeChange = (mode: DeliveryMode) => {
    setDeliveryMode(mode);
    setOpenSection(null);
  };

  const handleConfirm = async () => {
    if (!selectedAddressId || !selectedBankAccountId || !pricing) {
      toast.error("Please complete all fields");
      return;
    }

    const selectedAddress = addresses.find(a => a.id === selectedAddressId);
    if (!selectedAddress) {
      toast.error("Please select an address");
      return;
    }

    if (profile && profile.daily_usage + pricing.total > profile.daily_limit) {
      toast.error(`${strings.customer.dailyLimitExceeded} $${(profile.daily_limit - profile.daily_usage).toFixed(2)}`);
      return;
    }

    setLoading(true);
    try {
      const deliveryNotes = selectedAddress.delivery_notes || "";
      const deliveryStyle = deliveryMode === 'count_confirm' ? 'COUNTED' as const : 'SPEED' as const;

      track('order_submitted', {
        amount: amount,
        total_cost: pricing.total,
        platform_fee: pricing.platformFee,
        compliance_fee: pricing.complianceFee,
        delivery_fee: pricing.deliveryFee,
        delivery_mode: deliveryMode,
        has_delivery_notes: !!selectedAddress.delivery_notes,
      });

      const newOrder = await createOrder(
        amount,
        formatAddress(selectedAddress),
        deliveryNotes,
        selectedAddressId,
        deliveryStyle
      );

      if (newOrder) {
        clearProfileCache();
        if (profile?.id) {
          await queryClient.invalidateQueries({ queryKey: ['profile', profile.id] });
          await queryClient.refetchQueries({ queryKey: ['profile', profile.id] });
        }
        toast.success(strings.toasts.orderPlaced);
        handleClose();
        navigate(`/customer/deliveries/${newOrder.id}`);
      }
    } catch (error: any) {
      console.error("Error creating order:", error);
      const errorMessage = error?.message || error?.error?.message || "Something went wrong. Please try again.";
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const canConfirm = selectedAddressId && selectedBankAccountId && pricing;

  // 2. Simplified Section Header (Removed 'layout' prop)
  const SectionHeader = ({
    label,
    section,
    children,
    emptyState,
  }: {
    label: string;
    section: Exclude<OpenSection, null>;
    children: React.ReactNode;
    emptyState?: string;
  }) => {
    const isOpen = openSection === section;
    const hasValue = children !== null;

    return (
      <div
        onClick={() => toggleSection(section)}
        className="w-full flex items-center justify-between py-3 cursor-pointer group select-none"
      >
        <div className="flex-1 min-w-0 text-left">
          <div className="text-sm font-medium text-slate-900">{label}:</div>
          {!hasValue && (
            <div className="mt-0.5 text-sm text-slate-400">{emptyState || `Choose ${label.toLowerCase()}`}</div>
          )}
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          {hasValue && (
            <div className={cn(
              "text-sm font-semibold text-slate-900 transition-opacity duration-200",
              // Optional: fade out the summary slightly when open to focus on content
              isOpen ? "opacity-50" : "opacity-100",
              section === "account" ? "" : "text-right whitespace-nowrap"
            )}>
              {children}
            </div>
          )}
          <IconButton
            type="button"
            variant="default"
            size="lg"
            onClick={(e) => {
              e.stopPropagation();
              toggleSection(section);
            }}
            aria-label={isOpen ? "Collapse" : "Expand"}
          >
            {/* 3. Smooth Chevron Rotation */}
            <motion.div
              animate={{ rotate: isOpen ? 180 : 0 }}
              transition={{ duration: 0.3, ease: "circOut" }}
            >
              <ChevronDown className="w-5 h-5 text-slate-900" />
            </motion.div>
          </IconButton>
        </div>
      </div>
    );
  };

  // 4. Address Section
  const AddressSection = () => {
    const isOpen = openSection === "address";
    return (
      <div ref={addressSectionRef}>
        <SectionHeader label="Address" section="address" emptyState="Add address">
          {selectedAddress ? (
            <span className="font-semibold">
              {selectedAddress.label || getAddressPrimaryLine(selectedAddress) || "Home"}
            </span>
          ) : null}
        </SectionHeader>
        
        <AnimatePresence initial={false}>
          {isOpen && (
            <motion.div
              key="address-content"
              variants={ACCORDION_VARIANTS}
              initial="collapsed"
              animate="open"
              exit="collapsed"
              className="overflow-hidden"
              // transform: translateZ(0) forces GPU acceleration for smoother frames
              style={{ transform: "translateZ(0)" }} 
            >
              <div className="pt-2 pb-4 space-y-3">
                {addresses.map((addr) => {
                  const IconComponent = getIconByName(addr.icon || "Home");
                  const isSelected = addr.id === selectedAddressId;
                  return (
                    <button
                      key={addr.id}
                      type="button"
                      onClick={() => handleAddressSelect(addr)}
                      className={cn(
                        "w-full rounded-xl bg-white p-4 text-left border transition-colors duration-200",
                        isSelected
                          ? "border-2 border-black"
                          : "border border-[#F0F0F0] hover:border-[#E0E0E0]"
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <IconComponent className="h-5 w-5 text-slate-900 flex-shrink-0 mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-slate-900">
                            {getAddressPrimaryLine(addr)}
                          </p>
                          <p className="mt-0.5 text-sm text-slate-600">
                            {getAddressSecondaryLine(addr)}
                          </p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  };

  // 5. Account Section
  const AccountSection = () => {
    const isOpen = openSection === "account";
    return (
      <div ref={accountSectionRef}>
        <SectionHeader label="Account" section="account" emptyState="Connect a bank account">
          {selectedBankAccount ? (
            <div className="flex items-center gap-3">
              {selectedBankAccount.bank_institution_logo_url ? (
                <div className="h-12 w-12 rounded-[12px] overflow-hidden flex-shrink-0 bg-white flex items-center justify-center">
                  <img
                    src={selectedBankAccount.bank_institution_logo_url}
                    alt={selectedBankAccount.bank_institution_name || "Bank"}
                    className="h-full w-full object-cover"
                  />
                </div>
              ) : (
                <div className="h-12 w-12 rounded-xl bg-slate-100 flex items-center justify-center flex-shrink-0">
                  <Landmark className="h-6 w-6 text-slate-400" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-semibold text-slate-900 truncate">
                  {selectedBankAccount.bank_institution_name || "Bank Account"}
                </h3>
                {selectedBankAccount.bank_last4 && (
                  <p className="text-sm text-slate-600">**** {selectedBankAccount.bank_last4}</p>
                )}
              </div>
            </div>
          ) : null}
        </SectionHeader>
        
        <AnimatePresence initial={false}>
          {isOpen && (
            <motion.div
              key="account-content"
              variants={ACCORDION_VARIANTS}
              initial="collapsed"
              animate="open"
              exit="collapsed"
              className="overflow-hidden"
              style={{ transform: "translateZ(0)" }}
            >
              <div className="pt-2 pb-4 space-y-3">
                {!hasAnyBank ? (
                  <div className="text-center py-4">
                    <p className="text-sm text-slate-600 mb-3">No bank accounts connected</p>
                    <button
                      type="button"
                      onClick={() => onOpenChange(false)}
                      className="text-sm font-medium text-slate-900 underline"
                    >
                      Add Bank Account
                    </button>
                  </div>
                ) : (
                  <>
                    {bankAccounts.map((bank) => {
                      const isSelected = bank.id === selectedBankAccountId;
                      return (
                        <button
                          key={bank.id}
                          type="button"
                          onClick={() => handleBankAccountSelect(bank.id)}
                          className={cn(
                            "w-full rounded-xl bg-white p-4 text-left border transition-colors duration-200 flex items-center gap-3",
                            isSelected
                              ? "border-2 border-black"
                              : "border border-[#F0F0F0] hover:border-[#E0E0E0]"
                          )}
                        >
                          {bank.bank_institution_logo_url ? (
                            <div className="h-12 w-12 rounded-[12px] overflow-hidden flex-shrink-0 bg-white flex items-center justify-center">
                              <img
                                src={bank.bank_institution_logo_url}
                                alt={bank.bank_institution_name || "Bank"}
                                className="h-full w-full object-cover"
                              />
                            </div>
                          ) : (
                            <div className="h-12 w-12 rounded-xl bg-slate-100 flex items-center justify-center flex-shrink-0">
                              <Landmark className="h-6 w-6 text-slate-400" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <h3 className="text-base font-semibold text-slate-900 truncate">
                              {bank.bank_institution_name || "Bank Account"}
                            </h3>
                            <p className="text-sm text-slate-600">**** {bank.bank_last4}</p>
                          </div>
                        </button>
                      );
                    })}
                  </>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  };

  // 6. Amount Section
  const AmountSection = () => {
    const isOpen = openSection === "amount";
    const [isEditing, setIsEditing] = useState(false);
    const [inputValue, setInputValue] = useState(String(amount));

    useEffect(() => {
      if (!isEditing) setInputValue(String(amount));
    }, [amount, isEditing]);

    const handleInputBlur = () => {
      const num = Number(inputValue.replace(/,/g, ""));
      if (isNaN(num) || num < 100) {
        setInputValue(String(100));
        handleAmountChange(100);
      } else if (num > 1000) {
        setInputValue(String(1000));
        handleAmountChange(1000);
      } else {
        const rounded = Math.round(num / 20) * 20;
        const clamped = Math.min(1000, Math.max(100, rounded));
        setInputValue(String(clamped));
        handleAmountChange(clamped);
      }
      setIsEditing(false);
    };

    const handleQuickPick = (amt: number) => {
      handleAmountChange(amt);
      setInputValue(String(amt));
      setIsEditing(false);
      setOpenSection(null);
    };

    return (
      <div ref={amountSectionRef}>
        <SectionHeader label="Amount" section="amount">
          <span className="inline-flex items-baseline gap-2">
            <span className="text-slate-900 font-semibold">
              ${amount.toLocaleString("en-US", { maximumFractionDigits: 0 })}
            </span>
            {pricing && (
              <span className="text-xs font-medium text-slate-500">
                • You'll pay ${pricing.total.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            )}
          </span>
        </SectionHeader>
        
        <AnimatePresence initial={false}>
          {isOpen && (
            <motion.div
              key="amount-content"
              variants={ACCORDION_VARIANTS}
              initial="collapsed"
              animate="open"
              exit="collapsed"
              className="overflow-hidden"
              style={{ transform: "translateZ(0)" }}
            >
              <div className="pt-2 pb-4 space-y-4">
                <div
                  onClick={() => {
                    if (!isEditing) {
                      setIsEditing(true);
                      setInputValue(String(amount));
                      setTimeout(() => {
                        const input = document.querySelector('input[aria-label="Cash amount"]') as HTMLInputElement;
                        input?.focus();
                        input?.select();
                      }, 0);
                    }
                  }}
                  className="bg-[#F7F7F7] px-6 py-6 flex items-center justify-center cursor-text hover:opacity-80 transition-opacity"
                  style={{ height: '96px', borderRadius: '12px' }}
                >
                  {!isEditing ? (
                    <p className="text-4xl font-semibold text-slate-900">
                      ${amount.toLocaleString("en-US", { maximumFractionDigits: 0 })}
                    </p>
                  ) : (
                    <div className="flex items-center justify-center gap-1">
                      <span className="text-4xl font-semibold text-slate-900">$</span>
                      <input
                        type="tel"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        value={inputValue.replace(/,/g, "")}
                        onChange={(e) => setInputValue(e.target.value.replace(/,/g, ""))}
                        onBlur={handleInputBlur}
                        onKeyDown={(e) => e.key === "Enter" && handleInputBlur()}
                        className="text-4xl font-semibold text-slate-900 text-center border-0 border-b-2 border-black focus:outline-none focus:ring-0 focus:border-black pb-1 bg-transparent min-w-0 flex-1"
                        style={{ maxWidth: '200px' }}
                        aria-label="Cash amount"
                        autoFocus
                      />
                    </div>
                  )}
                </div>

                <div className="flex gap-3">
                  {[100, 200, 500, 1000].map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => handleQuickPick(amt)}
                      className={cn(
                        "flex-1 h-11 rounded-full text-sm font-medium text-slate-900 flex items-center justify-center transition-colors touch-manipulation",
                        amount === amt ? "border-2 border-black bg-white" : "border-0 bg-[#F7F7F7]"
                      )}
                    >
                      ${amt.toLocaleString()}
                    </button>
                  ))}
                </div>

                {pricing && (
                  <div className="space-y-2 pt-2">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-slate-600">You'll Get</span>
                      <span className="font-semibold text-slate-900">${amount.toLocaleString("en-US")}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-slate-600">You'll Pay</span>
                      <span className="font-semibold text-slate-900">${pricing.total.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  };

  // 7. Delivery Section
  const DeliverySection = () => {
    const isOpen = openSection === "delivery";
    return (
      <div ref={deliverySectionRef}>
        <SectionHeader label="Delivery Style" section="delivery">
          {deliveryMode === "count_confirm" ? "Counted" : "Discreet"}
        </SectionHeader>
        
        <AnimatePresence initial={false}>
          {isOpen && (
            <motion.div
              key="delivery-content"
              variants={ACCORDION_VARIANTS}
              initial="collapsed"
              animate="open"
              exit="collapsed"
              className="overflow-hidden"
              style={{ transform: "translateZ(0)" }}
            >
              <div className="pt-2 pb-4">
                <DeliveryModeSelector value={deliveryMode} onChange={handleDeliveryModeChange} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  };

  if (typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="fixed inset-0 bg-black/40 z-[80]"
          />

          <div className="fixed inset-0 z-[90] flex items-end justify-center pointer-events-none">
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="relative w-full bg-white rounded-t-[28px] shadow-2xl flex flex-col max-h-[98vh] overflow-hidden pointer-events-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex-shrink-0 px-6 pt-6 pb-4 flex items-center justify-between">
                <div className="flex-1">
                  <h2 className="text-xl font-bold text-gray-900">Quick Reorder</h2>
                  <p className="text-sm text-gray-600 mt-0.5">Confirm everything looks right.</p>
                </div>
                <IconButton type="button" onClick={handleClose} variant="default" size="lg" className="flex-shrink-0" aria-label="Close">
                  <X className="h-5 w-5 text-slate-900" />
                </IconButton>
              </div>

              <div className="h-[6px] bg-[#F7F7F7] -mx-6" />

              {/* Scrollable Content */}
              <div
                ref={scrollContainerRef}
                className="flex-1 min-h-0 overflow-y-auto px-6 py-4"
                style={{
                  WebkitOverflowScrolling: 'touch',
                  touchAction: 'pan-y',
                  overscrollBehavior: 'none',
                }}
              >
                {/* 8. Removed Global LayoutGroup */}
                <div className="space-y-1">
                  <AddressSection />
                  <div className="h-[1px] bg-[#F7F7F7] my-2" />
                  <AccountSection />
                  <div className="h-[1px] bg-[#F7F7F7] my-2" />
                  <AmountSection />
                  <div className="h-[1px] bg-[#F7F7F7] my-2" />
                  <DeliverySection />
                </div>
              </div>

              <div className="border-t border-slate-200/70" />

              <div className="flex-shrink-0 bg-white px-6 pt-6 pb-[max(24px,env(safe-area-inset-bottom))]">
                <SlideToConfirm
                  onConfirm={handleConfirm}
                  disabled={!canConfirm || loading}
                  label="Slide to Confirm"
                  isLoading={loading}
                  loadingLabel="Creating order..."
                />
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>,
    document.body
  );
}
