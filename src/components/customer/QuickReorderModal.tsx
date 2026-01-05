/**
 * QuickReorderModal Component
 * 
 * Accordion-style modal for quick reordering with:
 * - Single-open-section accordion
 * - Reuses existing selection components
 * - Sticky "Slide to Confirm" CTA
 */

import { useState, useRef, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronDown } from "lucide-react";
import { IconButton } from "@/components/ui/icon-button";
import { cn } from "@/lib/utils";
import { SlideToConfirm } from "@/components/customer/SlideToConfirm";
import { DeliveryModeSelector, type DeliveryMode } from "@/components/customer/DeliveryModeSelector";
import CashAmountInput from "@/components/customer/CashAmountInput";
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
  const [isClosing, setIsClosing] = useState(false);

  const { addresses } = useCustomerAddresses();
  const { bankAccounts, hasAnyBank } = useBankAccounts();

  // Section refs for scrollIntoView
  const addressSectionRef = useRef<HTMLDivElement>(null);
  const accountSectionRef = useRef<HTMLDivElement>(null);
  const amountSectionRef = useRef<HTMLDivElement>(null);
  const deliverySectionRef = useRef<HTMLDivElement>(null);

  // Track closing state for pointer events
  useEffect(() => {
    if (open) {
      setIsClosing(false);
    } else {
      // When open becomes false, immediately disable pointer events
      setIsClosing(true);
    }
  }, [open]);

  // Prevent background scroll when modal is open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      // Restore scrolling immediately when modal closes
      document.body.style.overflow = "";
    }
    
    // Always restore scrolling on unmount
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  // Handler that sets closing state immediately
  const handleClose = () => {
    setIsClosing(true);
    onOpenChange(false);
  };

  // Reset and auto-populate all fields when modal opens
  useEffect(() => {
    if (!open) {
      // Reset state when modal closes
      setSelectedAddressId(null);
      setSelectedBankAccountId(null);
      setOpenSection(null);
      return;
    }

    // Reset amount and delivery mode from order when modal opens
    setAmount(order.requested_amount || 200);
    const deliveryStyle = resolveDeliveryStyleFromOrder(order);
    setDeliveryMode(deliveryStyle === 'COUNTED' ? 'count_confirm' : 'quick_handoff');
  }, [open, order.id, order.requested_amount]);

  // Auto-select address from order when addresses are loaded
  useEffect(() => {
    if (!open || addresses.length === 0) return;

    if (order.address_id) {
      const addressExists = addresses.some(a => a.id === order.address_id);
      if (addressExists) {
        setSelectedAddressId(order.address_id);
        return;
      }
    }
    
    // If order's address doesn't exist or no address_id, use first available
    setSelectedAddressId(addresses[0].id);
  }, [open, order.address_id, addresses]);

  // Auto-select first available bank account when banks are loaded
  useEffect(() => {
    if (!open || !hasAnyBank || bankAccounts.length === 0) return;
    
    setSelectedBankAccountId(bankAccounts[0].id);
  }, [open, hasAnyBank, bankAccounts]);

  const toggleSection = (section: Exclude<OpenSection, null>) => {
    setOpenSection((prev) => {
      const newSection = prev === section ? null : section;
      return newSection;
    });
  };

  // Scroll to section after animation completes (using requestAnimationFrame to wait for layout)
  useEffect(() => {
    if (!openSection) return;

    // Wait for animation to complete (0.42s duration + buffer)
    const timeoutId = setTimeout(() => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          const refs = {
            address: addressSectionRef,
            account: accountSectionRef,
            amount: amountSectionRef,
            delivery: deliverySectionRef,
          };
          const ref = refs[openSection];
          if (ref?.current) {
            ref.current.scrollIntoView({ behavior: "smooth", block: "nearest" });
          }
        });
      });
    }, 450); // Slightly after animation duration (420ms)

    return () => clearTimeout(timeoutId);
  }, [openSection]);

  const selectedAddress = addresses.find(a => a.id === selectedAddressId);
  const selectedBankAccount = bankAccounts.find(b => b.id === selectedBankAccountId);

  // Calculate pricing
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
    setOpenSection(null); // Auto-collapse
  };

  const handleBankAccountSelect = (bankId: string) => {
    setSelectedBankAccountId(bankId);
    setOpenSection(null); // Auto-collapse
  };

  const handleAmountChange = (newAmount: number) => {
    setAmount(newAmount);
    // Don't auto-collapse amount - user might want to adjust
  };

  const handleDeliveryModeChange = (mode: DeliveryMode) => {
    setDeliveryMode(mode);
    setOpenSection(null); // Auto-collapse
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

    // Validate daily limit
    if (profile && profile.daily_usage + pricing.total > profile.daily_limit) {
      toast.error(`${strings.customer.dailyLimitExceeded} $${(profile.daily_limit - profile.daily_usage).toFixed(2)}`);
      return;
    }

    setLoading(true);
    try {
      const deliveryNotes = selectedAddress.delivery_notes || "";
      const deliveryStyle = deliveryMode === 'count_confirm' ? 'COUNTED' as const : 'SPEED' as const;

      // Track order submission
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
        // Invalidate profile cache to update daily_usage immediately
        clearProfileCache();
        if (profile?.id) {
          await queryClient.invalidateQueries({ queryKey: ['profile', profile.id] });
          await queryClient.refetchQueries({ queryKey: ['profile', profile.id] });
        }

        toast.success(strings.toasts.orderPlaced);
        onOpenChange(false);
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

  // Collapsed section header component
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
      <button
        type="button"
        onClick={() => toggleSection(section)}
        className="w-full flex items-center justify-between py-3 text-left"
      >
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-slate-900">{label}:</div>
          {!hasValue && (
            <div className="mt-0.5 text-sm text-slate-400">{emptyState || `Choose ${label.toLowerCase()}`}</div>
          )}
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          {hasValue && (
            <div className={cn(
              "text-sm text-slate-600",
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
            <motion.div
              animate={{ rotate: isOpen ? 180 : 0 }}
              transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
            >
              <ChevronDown className="w-5 h-5 text-slate-900" />
            </motion.div>
          </IconButton>
        </div>
      </button>
    );
  };

  // Address section
  const AddressSection = () => {
    const isOpen = openSection === "address";

    return (
      <motion.div ref={addressSectionRef} layout>
        <SectionHeader
          label="Address"
          section="address"
          emptyState="Add address"
        >
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
              layout
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.42, ease: [0.16, 1, 0.3, 1] }}
              style={{ overflow: "hidden" }}
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
                        "w-full rounded-xl bg-white p-4 text-left border transition-all",
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
                <button
                  type="button"
                  onClick={() => {
                    // TODO: Open add address modal
                    onOpenChange(false);
                  }}
                  className="w-full text-center text-sm font-medium text-slate-900 py-2"
                >
                  Add Another Address
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    );
  };

  // Account section
  const AccountSection = () => {
    const isOpen = openSection === "account";

    return (
      <motion.div ref={accountSectionRef} layout>
        <SectionHeader
          label="Account"
          section="account"
          emptyState="Connect a bank account"
        >
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
                <h3 className="text-base font-semibold text-slate-900 truncate">
                  {selectedBankAccount.bank_institution_name || "Bank Account"}
                </h3>
                {selectedBankAccount.bank_last4 && (
                  <p className="text-sm text-slate-600">
                    **** {selectedBankAccount.bank_last4}
                  </p>
                )}
              </div>
            </div>
          ) : null}
        </SectionHeader>

        <AnimatePresence initial={false}>
          {isOpen && (
            <motion.div
              key="account-content"
              layout
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.42, ease: [0.16, 1, 0.3, 1] }}
              style={{ overflow: "hidden" }}
            >
              <div className="pt-2 pb-4 space-y-3">
                {!hasAnyBank ? (
                  <div className="text-center py-4">
                    <p className="text-sm text-slate-600 mb-3">No bank accounts connected</p>
                    <button
                      type="button"
                      onClick={() => {
                        // TODO: Open bank connection flow
                        onOpenChange(false);
                      }}
                      className="text-sm font-medium text-slate-900"
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
                            "w-full rounded-xl bg-white p-4 text-left border transition-all flex items-center gap-3",
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
                            <p className="text-sm text-slate-600">
                              **** {bank.bank_last4}
                            </p>
                          </div>
                          {isSelected && (
                            <div className="w-5 h-5 rounded-full bg-black flex items-center justify-center flex-shrink-0">
                              <div className="h-2 w-2 rounded-full bg-white" />
                            </div>
                          )}
                        </button>
                      );
                    })}
                    <button
                      type="button"
                      onClick={() => {
                        // TODO: Open add bank account flow
                        onOpenChange(false);
                      }}
                      className="w-full text-center text-sm font-medium text-slate-900 py-2"
                    >
                      Add Bank Account
                    </button>
                  </>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    );
  };

  // Amount section
  const AmountSection = () => {
    const isOpen = openSection === "amount";

    return (
      <motion.div ref={amountSectionRef} layout>
        <SectionHeader
          label="Amount"
          section="amount"
        >
          <>
            <span className="font-semibold">${amount.toLocaleString("en-US", { maximumFractionDigits: 0 })}</span>
            {pricing && (
              <span className="text-slate-500">
                {" • You'll pay $"}
                {pricing.total.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            )}
          </>
        </SectionHeader>

        <AnimatePresence initial={false}>
          {isOpen && (
            <motion.div
              key="amount-content"
              layout
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.42, ease: [0.16, 1, 0.3, 1] }}
              style={{ overflow: "hidden" }}
            >
              <div className="pt-2 pb-4 space-y-4">
                <CashAmountInput
                  value={amount}
                  onChange={handleAmountChange}
                  min={100}
                  max={1000}
                  step={20}
                  hideAmountDisplay={false}
                />
                {pricing && (
                  <div className="space-y-2 pt-2">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-slate-600">You'll Get</span>
                      <span className="font-semibold text-slate-900">
                        ${amount.toLocaleString("en-US", { maximumFractionDigits: 0 })}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-slate-600">You'll Pay</span>
                      <span className="font-semibold text-slate-900">
                        ${pricing.total.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    );
  };

  // Delivery style section
  const DeliverySection = () => {
    const isOpen = openSection === "delivery";

    return (
      <motion.div ref={deliverySectionRef} layout>
        <SectionHeader
          label="Delivery Style"
          section="delivery"
        >
          {deliveryMode === "count_confirm" ? "Counted" : "Discreet"}
        </SectionHeader>

        <AnimatePresence initial={false}>
          {isOpen && (
            <motion.div
              key="delivery-content"
              layout
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.42, ease: [0.16, 1, 0.3, 1] }}
              style={{ overflow: "hidden" }}
            >
              <div className="pt-2 pb-4">
                <DeliveryModeSelector
                  value={deliveryMode}
                  onChange={handleDeliveryModeChange}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    );
  };

  if (typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0, backdropFilter: "blur(0px)" }}
            animate={{ opacity: 1, backdropFilter: "blur(8px)" }}
            exit={{ opacity: 0, backdropFilter: "blur(0px)" }}
            transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
            className="fixed inset-0 bg-black/40 z-[80]"
            onClick={handleClose}
            style={{ pointerEvents: !isClosing && open ? "auto" : "none" }}
          />

          {/* Modal Container - Bottom Sheet */}
          <div 
            key="modal-container" 
            className="fixed inset-0 z-[90] flex items-end justify-center px-4 pt-8 pb-[max(16px,env(safe-area-inset-bottom))]"
            style={{ pointerEvents: !isClosing ? "none" : "none" }}
          >
            {/* Modal Content - Bottom Sheet */}
            <motion.div
              key="modal-content"
              drag={!isClosing ? "y" : false}
              dragConstraints={{ top: 0, bottom: 0 }}
              dragElastic={0.12}
              dragMomentum={false}
              onDragEnd={(_, info) => {
                const closeThreshold = 120;
                const velocityThreshold = 800;
                if (info.offset.y > closeThreshold || info.velocity.y > velocityThreshold) {
                  handleClose();
                }
              }}
              initial={{ y: 18, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 18, opacity: 0 }}
              transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
              className="relative w-full max-w-lg bg-white rounded-[32px] shadow-2xl flex flex-col max-h-[90vh] overflow-hidden"
              style={{ pointerEvents: !isClosing ? "auto" : "none" }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Drag Handle */}
              <div className="flex justify-center pt-3 pb-2">
                <div className="h-1 w-12 rounded-full bg-black/10" />
              </div>
              
              {/* Header */}
              <div className="flex-shrink-0 px-6 pb-4 flex items-center justify-between">
                <div className="flex-1">
                  <h2 className="text-xl font-bold text-gray-900">Quick Reorder</h2>
                  <p className="text-sm text-gray-600 mt-0.5">Confirm everything looks right.</p>
                </div>
                <IconButton
                  type="button"
                  onClick={handleClose}
                  variant="default"
                  size="lg"
                  className="flex-shrink-0"
                  aria-label="Close"
                >
                  <X className="h-5 w-5 text-slate-900" />
                </IconButton>
              </div>
              {/* Divider below header */}
              <div className="h-[6px] bg-[#F7F7F7] -mx-6" />

              {/* Scrollable Content */}
              <div className="flex-1 min-h-0 overflow-y-auto px-6 py-4">
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

              {/* Divider above footer */}
              <div className="h-[6px] bg-[#F7F7F7] -mx-6" />
              {/* Sticky Footer with CTA */}
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


