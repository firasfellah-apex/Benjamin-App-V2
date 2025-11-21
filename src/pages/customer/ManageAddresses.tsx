import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X, Pencil, Trash2 } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { deleteAddress, formatAddress } from "@/db/api";
import type { CustomerAddress } from "@/types/types";
import { getIconByName } from "@/components/address/IconPicker";
import { AddressForm, type AddressFormRef } from "@/components/address/AddressForm";
import { cn } from "@/lib/utils";
import { CustomerScreen } from "@/pages/customer/components/CustomerScreen";
import { FlowHeader } from "@/components/customer/FlowHeader";
import { CustomerMapViewport } from "@/components/customer/layout/CustomerMapViewport";
import { useCustomerAddresses, useInvalidateAddresses } from "@/features/address/hooks/useCustomerAddresses";
import { useCustomerBottomSlot } from "@/contexts/CustomerBottomSlotContext";
import { RequestFlowBottomBar } from "@/components/customer/RequestFlowBottomBar";
import AlertIllustration from "@/assets/illustrations/Alert.png";

// Spring animation for modal (matches CashRequest)
const iosSpring = {
  type: "spring",
  stiffness: 300,
  damping: 30,
  mass: 0.5,
};

export default function ManageAddresses() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { addresses: rawAddresses, isLoading: loading } = useCustomerAddresses();
  const invalidateAddresses = useInvalidateAddresses();
  const { setBottomSlot } = useCustomerBottomSlot();

  // Selected address state for expand/collapse
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const addressCardRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  // Modal state
  const [showAddAddressModal, setShowAddAddressModal] = useState(false);
  const [showEditAddressModal, setShowEditAddressModal] = useState(false);
  const [editingAddress, setEditingAddress] = useState<CustomerAddress | null>(null);
  const addAddressFormRef = useRef<AddressFormRef>(null);
  const editAddressFormRef = useRef<AddressFormRef>(null);
  const [addAddressLoading, setAddAddressLoading] = useState(false);
  const [editAddressLoading, setEditAddressLoading] = useState(false);

  // Delete dialog state
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [addressToDelete, setAddressToDelete] = useState<CustomerAddress | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Sort addresses by created_at
  const addresses = useMemo(() => {
    return rawAddresses.sort((a, b) => {
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });
  }, [rawAddresses]);

  // Handle back navigation - use return path if provided, otherwise go to home
  const handleBack = useCallback(() => {
    const returnPath = searchParams.get('return');
    if (returnPath) {
      // Decode the return path in case it was encoded
      try {
        const decoded = decodeURIComponent(returnPath);
        navigate(decoded);
      } catch {
        // If decoding fails, try navigating directly
        navigate(returnPath);
      }
    } else {
      navigate('/customer/home');
    }
  }, [navigate, searchParams]);

  // Handle address selection (expand/collapse)
  const handleAddressSelect = useCallback((addr: CustomerAddress) => {
    if (selectedAddressId === addr.id) {
      setSelectedAddressId(null);
    } else {
      setSelectedAddressId(addr.id);
    }
  }, [selectedAddressId]);

  // Scroll to selected card when selection changes
  // Smooth scrolling: when expanding a card, ensure the full expanded card is visible
  // Special handling for first card: align its top with the top of scrollable area
  useEffect(() => {
    if (selectedAddressId) {
      const cardElement = addressCardRefs.current.get(selectedAddressId);
      if (cardElement) {
        // Wait for expansion animation to start (150ms delay)
        // This gives the card time to begin expanding before we calculate scroll position
        const scrollTimeout = setTimeout(() => {
          requestAnimationFrame(() => {
            const rect = cardElement.getBoundingClientRect();
            const windowHeight = window.innerHeight;
            const viewportBottom = windowHeight - 120; // Account for bottom nav (~120px)
            
            // Expanded card height estimate: map (200px) + content (~48px) + buttons (~60px with padding) = ~308px
            const expandedCardHeight = 308;
            
            // Calculate where the bottom of the expanded card would be (using current top position)
            const expandedBottom = rect.top + expandedCardHeight;
            
            // Find the scrollable container (main element)
            const scrollContainer = cardElement.closest('main');
            if (!scrollContainer) return;
            
            const containerRect = scrollContainer.getBoundingClientRect();
            const currentScrollTop = scrollContainer.scrollTop;
            
            // Card's absolute position relative to the scroll container
            const cardOffsetTop = currentScrollTop + (rect.top - containerRect.top);
            
            // Check if the expanded card would be fully visible
            const wouldBeFullyVisible = 
              rect.top >= containerRect.top && // Top is at or below the top of scrollable area
              expandedBottom <= viewportBottom; // Bottom is at or above bottom of viewport
            
            // Only scroll if the expanded card wouldn't be fully visible
            if (!wouldBeFullyVisible) {
              // Distance from top of scrollable area to top of card (negative if card is above viewport)
              const distanceFromScrollTop = rect.top - containerRect.top;
              
              // Distance from bottom of viewport to bottom of expanded card (positive if card extends below viewport)
              const distanceFromBottom = expandedBottom - viewportBottom;
              
              // Determine if card is closer to top edge or bottom edge
              // If card is partially or fully above the scrollable area, or closer to top, align top
              // Otherwise, if card extends below viewport, align bottom
              const shouldAlignTop = 
                distanceFromScrollTop < 0 || // Card is above scrollable area
                (Math.abs(distanceFromScrollTop) < distanceFromBottom && distanceFromScrollTop <= 0); // Closer to top
              
              let targetScrollTop: number;
              
              if (shouldAlignTop) {
                // Scroll so top of card aligns with top of scrollable viewport
                // This ensures the expanded map starts just below the fixed title
                // Target: card top (cardOffsetTop) should be at 0 relative to scroll container
                targetScrollTop = cardOffsetTop;
              } else {
                // Scroll so bottom of expanded card aligns with bottom of viewport
                // Target: card bottom (cardOffsetTop + expandedCardHeight) should be at viewportBottom relative to container
                targetScrollTop = cardOffsetTop + expandedCardHeight - (viewportBottom - containerRect.top);
              }
              
              // Smoothly scroll to the calculated position
              scrollContainer.scrollTo({
                top: Math.max(0, targetScrollTop),
                behavior: 'smooth',
              });
            }
            // If card is already fully visible, no need to scroll
          });
        }, 150); // 150ms delay to let expansion animation start

        return () => clearTimeout(scrollTimeout);
      }
    }
  }, [selectedAddressId]);

  // Handle edit address
  const handleEditAddress = useCallback((address: CustomerAddress) => {
    setEditingAddress(address);
    setShowEditAddressModal(true);
  }, []);

  // Handle delete address
  const handleDeleteAddress = useCallback((address: CustomerAddress) => {
    setAddressToDelete(address);
    setShowDeleteDialog(true);
  }, []);

  // Confirm delete
  const confirmDelete = useCallback(async () => {
    if (!addressToDelete) return;

    setDeletingId(addressToDelete.id);
    const success = await deleteAddress(addressToDelete.id);
    
    if (success) {
      invalidateAddresses();
      toast.success("Address deleted");
      setShowDeleteDialog(false);
      setAddressToDelete(null);
      // If deleted address was selected, clear selection
      if (selectedAddressId === addressToDelete.id) {
        setSelectedAddressId(null);
      }
    } else {
      toast.error("Failed to delete address");
    }
    
    setDeletingId(null);
  }, [addressToDelete, invalidateAddresses, selectedAddressId]);

  // Handle save add address
  const handleSaveAddAddress = useCallback((_address: CustomerAddress) => {
    setAddAddressLoading(false);
    setShowAddAddressModal(false);
    invalidateAddresses();
  }, [invalidateAddresses]);

  // Handle save edit address
  const handleSaveEditAddress = useCallback((address: CustomerAddress) => {
    setEditAddressLoading(false);
    setShowEditAddressModal(false);
    setEditingAddress(null);
    invalidateAddresses();
    // If edited address was selected, keep it selected
    if (selectedAddressId === address.id) {
      setSelectedAddressId(address.id);
    }
  }, [invalidateAddresses, selectedAddressId]);

  // Handle close modals
  const handleCloseAddAddressModal = useCallback(() => {
    setShowAddAddressModal(false);
  }, []);

  const handleCloseEditAddressModal = useCallback(() => {
    setShowEditAddressModal(false);
    setEditingAddress(null);
  }, []);

  // Form submission handlers
  const handleSaveAddAddressForm = useCallback(() => {
    if (addAddressFormRef.current) {
      addAddressFormRef.current.submit();
    }
  }, []);

  const handleSaveEditAddressForm = useCallback(() => {
    if (editAddressFormRef.current) {
      editAddressFormRef.current.submit();
    }
  }, []);

  // Sync loading state from forms
  useEffect(() => {
    if (addAddressFormRef.current && showAddAddressModal) {
      addAddressFormRef.current.setLoadingCallback(setAddAddressLoading);
    }
  }, [showAddAddressModal]);

  useEffect(() => {
    if (editAddressFormRef.current && showEditAddressModal) {
      editAddressFormRef.current.setLoadingCallback(setEditAddressLoading);
    }
  }, [showEditAddressModal]);

  // Set bottom slot
  useEffect(() => {
    setBottomSlot(
      <RequestFlowBottomBar
        mode="address"
        onPrimary={() => setShowAddAddressModal(true)}
        primaryLabel="Add New Address"
        useFixedPosition={true}
      />
    );
    return () => setBottomSlot(null);
  }, [setBottomSlot]);

  // Flow header
  const flowHeader = useMemo(() => (
    <FlowHeader
      step={1}
      totalSteps={1}
      mode="cancel"
      onPrimaryNavClick={handleBack}
      title="Manage Addresses"
      subtitle="Edit, delete or add addresses."
      hideProgress={true}
    />
  ), [handleBack]);

  // Fixed content - divider
  const fixedContent = useMemo(() => (
    <>
      {/* Divider under title/subtitle - 24px spacing from subtitle */}
      <div className="h-[6px] bg-[#F7F7F7] -mx-6 mb-6" />
    </>
  ), []);

  // Scrollable content - address cards
  const topContent = useMemo(() => (
    <div className="space-y-3 pb-6">
      {addresses.length === 0 ? (
        <div className="w-full rounded-xl border border-dashed border-[#F0F0F0] bg-slate-50/60 px-4 py-6 flex flex-col items-center text-center gap-3">
          <div className="w-10 h-10 rounded-full bg-slate-900 text-white flex items-center justify-center text-lg">
            +
          </div>
          <div className="space-y-1">
            <p className="text-sm font-semibold text-slate-900">
              Add your first address
            </p>
            <p className="text-sm text-slate-500">
              Save a place where you'd like cash delivered. You can add more later.
            </p>
          </div>
        </div>
      ) : (
        addresses.map((addr) => {
          const isSelected = selectedAddressId === addr.id;

          // Set ref callback for this address card
          const setCardRef = (el: HTMLDivElement | null) => {
            if (el) {
              addressCardRefs.current.set(addr.id, el);
            } else {
              addressCardRefs.current.delete(addr.id);
            }
          };

          return (
            <div
              key={addr.id}
              ref={setCardRef}
              data-address-card
              className={cn(
                "w-full border bg-white overflow-hidden",
                "transition-all duration-300 ease-in-out",
                isSelected
                  ? "border border-black rounded-[24px]"
                  : "border border-[#F0F0F0] hover:border-[#E0E0E0] rounded-[24px]"
              )}
              style={{
                transform: isSelected ? "scale(1)" : "scale(0.998)",
                transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
              }}
            >
              {/* Expandable map wrapper */}
              <div
                className={cn(
                  "overflow-hidden relative",
                  isSelected 
                    ? "max-h-[220px] duration-400" 
                    : "max-h-0 duration-350"
                )}
                style={{
                  transition: "max-height 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
                }}
              >
                {/* Map container */}
                <div
                  className="w-full h-[200px] bg-slate-50 relative"
                  style={{
                    opacity: isSelected ? 1 : 0,
                    transition: isSelected
                      ? "opacity 0.35s cubic-bezier(0.4, 0, 0.2, 1) 0.05s"
                      : "opacity 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
                  }}
                >
                  <CustomerMapViewport selectedAddress={addr} />
                </div>
              </div>

              {/* Content area - clickable to expand/collapse */}
              <button
                type="button"
                onClick={() => handleAddressSelect(addr)}
                className={cn(
                  "group w-full px-4 py-3 text-left flex items-center gap-3 bg-white",
                  "transition-colors duration-200 ease-in-out",
                )}
              >
                {/* Icon from address */}
                {(() => {
                  const IconComponent = getIconByName(addr.icon || 'Home');
                  return (
                    <IconComponent className="h-5 w-5 text-slate-900 flex-shrink-0" />
                  );
                })()}
                
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-900 truncate">
                    {addr.label || "Saved address"}
                  </p>
                  <p className="mt-0.5 text-sm text-slate-600 truncate">
                    {formatAddress(addr)}
                  </p>
                  <p className="mt-0.5 text-sm text-slate-400 italic">
                    {addr.delivery_notes || "No Note Added"}
                  </p>
                </div>
              </button>

              {/* Edit/Delete buttons - shown when expanded */}
              {isSelected && (
                <div className="px-4 pb-3 flex gap-3">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteAddress(addr);
                    }}
                    disabled={deletingId === addr.id}
                    className={cn(
                      "flex-1 rounded-full border border-red-500 bg-white text-red-500",
                      "px-4 py-3 flex items-center justify-center",
                      "disabled:opacity-50 disabled:cursor-not-allowed",
                      "active:scale-[0.98] transition-transform duration-150",
                      "touch-manipulation"
                    )}
                    aria-label="Delete address"
                  >
                    <Trash2 className="h-5 w-5" />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEditAddress(addr);
                    }}
                    className={cn(
                      "flex-1 rounded-full border border-black bg-white text-black",
                      "px-4 py-3 flex items-center justify-center",
                      "active:scale-[0.98] transition-transform duration-150",
                      "touch-manipulation"
                    )}
                    aria-label="Edit address"
                  >
                    <Pencil className="h-5 w-5" />
                  </button>
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  ), [addresses, selectedAddressId, handleAddressSelect, handleEditAddress, handleDeleteAddress, deletingId]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-gray-500">Loading addresses...</div>
      </div>
    );
  }

  return (
    <>
      <CustomerScreen
        flowHeader={flowHeader}
        fixedContent={fixedContent}
        topContent={topContent}
        customBottomPadding="calc(24px + max(24px, env(safe-area-inset-bottom)) + 132px)"
      />

      {/* Add Address Modal */}
      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {showAddAddressModal && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[80]"
                onClick={handleCloseAddAddressModal}
              />
              
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="fixed inset-0 z-[90] flex flex-col pointer-events-none"
              >
                <motion.div
                  layout
                  initial={{ y: "100%", opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: "100%", opacity: 0 }}
                  transition={iosSpring}
                  className="relative w-full max-w-2xl mx-auto bg-white rounded-t-2xl shadow-2xl flex flex-col pointer-events-auto"
                  style={{
                    marginTop: '15vh',
                    height: 'calc(100vh - 15vh)',
                    maxHeight: 'calc(100vh - 15vh)'
                  }}
                >
                  <motion.div
                    layout
                    className="flex-shrink-0 bg-white border-b border-gray-200 px-6 pt-6 pb-4 flex items-center justify-between rounded-t-2xl z-10"
                  >
                    <div className="flex-1">
                      <h2 className="text-xl font-bold text-gray-900">
                        Add Delivery Address
                      </h2>
                      <p className="text-sm text-gray-600 mt-0.5">
                        You can edit or remove it anytime.
                      </p>
                    </div>
          <button
                      type="button"
                      onClick={handleCloseAddAddressModal}
                      className="w-12 h-12 p-0 inline-flex items-center justify-center rounded-full border border-[#F0F0F0] bg-white hover:bg-slate-50 active:bg-slate-100 transition-colors touch-manipulation"
                      aria-label="Close"
                    >
                      <X className="h-5 w-5 text-slate-900" />
          </button>
                  </motion.div>
                  
                  <motion.div
                    layout
                    className="flex-1 min-h-0 overflow-y-auto"
                    style={{ paddingBottom: '120px' }}
                  >
                    <div className="px-6 py-6 space-y-6">
                      <AddressForm
                        ref={addAddressFormRef}
                        address={null}
                        onSave={handleSaveAddAddress}
                        onCancel={handleCloseAddAddressModal}
                      />
                    </div>
                  </motion.div>
                </motion.div>

                <motion.div
                  layout
                  className="fixed bottom-0 left-0 right-0 flex justify-center flex-shrink-0 border-t border-gray-200 bg-white z-10 pointer-events-auto"
                >
                  <div className="w-full max-w-2xl px-6 pt-4 pb-[max(24px,env(safe-area-inset-bottom))]">
                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={handleCloseAddAddressModal}
                        disabled={addAddressLoading}
                        className={cn(
                          "flex-1 rounded-full py-4 px-6",
                          "border border-gray-300 bg-white text-gray-900",
                          "text-base font-semibold",
                          "disabled:opacity-50 disabled:cursor-not-allowed",
                          "active:scale-[0.98] transition-transform duration-150",
                          "touch-manipulation"
                        )}
                      >
                        Cancel
                      </button>
            <button
                        type="button"
                        onClick={handleSaveAddAddressForm}
                        disabled={addAddressLoading}
                        className={cn(
                          "flex-[2] rounded-full py-4 px-6",
                          "bg-black text-white",
                          "text-base font-semibold",
                          "disabled:opacity-50 disabled:cursor-not-allowed",
                          "active:scale-[0.98] transition-transform duration-150",
                          "touch-manipulation"
                        )}
                      >
                        {addAddressLoading ? "Saving..." : "Save Address"}
            </button>
          </div>
                  </div>
                </motion.div>
              </motion.div>
            </>
          )}
        </AnimatePresence>,
        document.body
      )}

      {/* Edit Address Modal */}
      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {showEditAddressModal && editingAddress && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[80]"
                onClick={handleCloseEditAddressModal}
              />
              
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="fixed inset-0 z-[90] flex flex-col pointer-events-none"
              >
                <motion.div
                  layout
                  initial={{ y: "100%", opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: "100%", opacity: 0 }}
                  transition={iosSpring}
                  className="relative w-full max-w-2xl mx-auto bg-white rounded-t-2xl shadow-2xl flex flex-col pointer-events-auto"
                  style={{
                    marginTop: '15vh',
                    height: 'calc(100vh - 15vh)',
                    maxHeight: 'calc(100vh - 15vh)'
                  }}
                >
                  <motion.div
                    layout
                    className="flex-shrink-0 bg-white border-b border-gray-200 px-6 pt-6 pb-4 flex items-center justify-between rounded-t-2xl z-10"
                  >
                    <div className="flex-1">
                <h2 className="text-xl font-bold text-gray-900">
                        Edit Delivery Address
                </h2>
                      <p className="text-sm text-gray-600 mt-0.5">
                        Update your address details.
                </p>
              </div>
              <button
                type="button"
                      onClick={handleCloseEditAddressModal}
                      className="w-12 h-12 p-0 inline-flex items-center justify-center rounded-full border border-[#F0F0F0] bg-white hover:bg-slate-50 active:bg-slate-100 transition-colors touch-manipulation"
                      aria-label="Close"
              >
                      <X className="h-5 w-5 text-slate-900" />
              </button>
                  </motion.div>
                  
                  <motion.div
                    layout
                    className="flex-1 min-h-0 overflow-y-auto"
                    style={{ paddingBottom: '120px' }}
                  >
                    <div className="px-6 py-6 space-y-6">
              <AddressForm
                        ref={editAddressFormRef}
                        address={editingAddress}
                        onSave={handleSaveEditAddress}
                        onCancel={handleCloseEditAddressModal}
              />
            </div>
                  </motion.div>
                </motion.div>

                <motion.div
                  layout
                  className="fixed bottom-0 left-0 right-0 flex justify-center flex-shrink-0 border-t border-gray-200 bg-white z-10 pointer-events-auto"
                >
                  <div className="w-full max-w-2xl px-6 pt-4 pb-[max(24px,env(safe-area-inset-bottom))]">
                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={handleCloseEditAddressModal}
                        disabled={editAddressLoading}
                        className={cn(
                          "flex-1 rounded-full py-4 px-6",
                          "border border-gray-300 bg-white text-gray-900",
                          "text-base font-semibold",
                          "disabled:opacity-50 disabled:cursor-not-allowed",
                          "active:scale-[0.98] transition-transform duration-150",
                          "touch-manipulation"
                        )}
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleSaveEditAddressForm}
                        disabled={editAddressLoading}
                        className={cn(
                          "flex-[2] rounded-full py-4 px-6",
                          "bg-black text-white",
                          "text-base font-semibold",
                          "disabled:opacity-50 disabled:cursor-not-allowed",
                          "active:scale-[0.98] transition-transform duration-150",
                          "touch-manipulation"
                        )}
                      >
                        {editAddressLoading ? "Saving..." : "Save Address"}
                      </button>
          </div>
        </div>
                </motion.div>
              </motion.div>
            </>
          )}
        </AnimatePresence>,
        document.body
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="p-0 gap-0">
          {/* Illustration */}
          <div className="h-48 flex items-center justify-center bg-[#F5F5F4] rounded-t-[24px]">
            <img
              src={AlertIllustration}
              alt="Delete confirmation"
              className="w-3/4 h-3/4 object-contain"
            />
          </div>

          <div className="px-6 py-6 space-y-4">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-xl font-semibold text-slate-900 text-center">
                Delete Address?
              </AlertDialogTitle>
              <AlertDialogDescription className="text-center text-slate-600">
                Are you sure you want to delete this address?
                <br />
                This action cannot be undone.
                {addressToDelete && (
                  <div className="mt-4 p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <p className="text-sm font-semibold text-slate-900">
                      {addressToDelete.label || "Address"}
                    </p>
                    <p className="text-xs text-slate-600 mt-1">
                      {formatAddress(addressToDelete)}
                    </p>
                  </div>
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="flex-col gap-3 sm:flex-col">
              <AlertDialogAction
                onClick={confirmDelete}
                className={cn(
                  "w-full h-12 rounded-full bg-red-600 text-white",
                  "hover:bg-red-700 active:scale-[0.98]",
                  "text-base font-semibold",
                  "transition-all duration-150 touch-manipulation"
                )}
                disabled={deletingId === addressToDelete?.id}
              >
                {deletingId === addressToDelete?.id ? "Deleting..." : "Delete"}
              </AlertDialogAction>
              <AlertDialogCancel
                className={cn(
                  "w-full h-12 rounded-full border-2 border-black bg-white text-black",
                  "hover:bg-slate-50 active:scale-[0.98]",
                  "text-base font-semibold",
                  "transition-all duration-150 touch-manipulation",
                  "mt-0"
                )}
              >
                Cancel
              </AlertDialogCancel>
            </AlertDialogFooter>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
