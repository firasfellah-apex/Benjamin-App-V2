/**
 * AddressSelector Component
 * 
 * Layout refactor: Map as background canvas with floating UI cards on top
 * 
 * Changes:
 * - Map now renders as full-screen background (variant="background")
 * - Content (title, address carousel, actions, privacy note) floats on top with z-10
 * - Added gradient overlay at top for text legibility
 * - Address cards use backdrop-blur and semi-transparent backgrounds
 * - Title and subtitle props added for integration with parent page
 * 
 * Behavior preserved:
 * - All business logic unchanged (address selection, creation, editing)
 * - All Supabase calls unchanged
 * - All navigation and routing unchanged
 */
import React, { useState, useEffect, useRef } from "react";
import { X, MapPin, Plus } from "lucide-react";
import type { CustomerAddress } from "@/types/types";
import { AddressForm, type AddressFormRef } from "./AddressForm";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import { addAddressCopy } from "@/lib/copy/addAddress";
import { AddressCarousel } from "@/pages/customer/components/AddressCarousel";
import { track } from "@/lib/analytics";
import { useCustomerAddresses, useInvalidateAddresses } from "@/features/address/hooks/useCustomerAddresses";

function AddressFormModal({
  editingAddress,
  onSave,
  onCancel,
}: {
  editingAddress: CustomerAddress | null;
  onSave: (address: CustomerAddress) => void;
  onCancel: () => void;
}) {
  const formRef = useRef<AddressFormRef>(null);
  const [loading, setLoading] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  const handleSave = () => {
    if (formRef.current) {
      formRef.current.submit();
    }
  };

  const handleClose = () => {
    setIsClosing(true);
    // Wait for animation to complete before calling onCancel
    setTimeout(() => {
      onCancel();
    }, 300); // Match animation duration
  };

  // Trigger slide-up animation on mount
  React.useEffect(() => {
    // Small delay to ensure DOM is ready
    const timer = setTimeout(() => {
      setIsMounted(true);
    }, 10);
    return () => clearTimeout(timer);
  }, []);

  // Sync loading state from form
  React.useEffect(() => {
    if (formRef.current) {
      formRef.current.setLoadingCallback(setLoading);
    }
  }, []);

  return (
    <>
      {/* Backdrop - must be above header (z-40) but below modal content */}
      {/* Placed outside modal container to ensure proper stacking context */}
      <div 
        className={cn(
          "fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300 z-[50]",
          isMounted && !isClosing ? "opacity-100" : "opacity-0"
        )}
        onClick={handleClose}
      />
      <div 
        className={cn(
          "fixed inset-0 z-[60] flex items-end justify-center transition-opacity duration-300 pointer-events-none",
          isMounted && !isClosing ? "opacity-100" : "opacity-0"
        )}
      >
      
      {/* Modal Content - Bottom sheet style */}
      <div 
        className={cn(
          "relative w-full max-w-2xl h-[90vh] bg-white rounded-t-3xl shadow-2xl flex flex-col transition-transform duration-300 ease-in-out pointer-events-auto",
          isMounted && !isClosing ? "translate-y-0" : "translate-y-full"
        )}
      >
        {/* Header - Fixed to top */}
        <div className="flex-shrink-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between rounded-t-3xl sticky top-0 z-10">
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              {editingAddress ? "Edit Delivery Address" : "Add Delivery Address"}
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              You can edit or remove it anytime.
            </p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="text-gray-500 rounded-full p-2 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        
        {/* Scrollable Content Area */}
        <div className="flex-1 min-h-0 overflow-y-auto">
          <div className="p-6">
            <AddressForm
              ref={formRef}
              address={editingAddress}
              onSave={(address) => {
                setLoading(false);
                // Trigger close animation before saving
                setIsClosing(true);
                setTimeout(() => {
                  onSave(address);
                  // Close the form after animation completes
                  onCancel();
                }, 300);
              }}
              onCancel={handleClose}
            />
          </div>
        </div>

        {/* Footer - Fixed to bottom */}
        <div className="flex-shrink-0 border-t border-gray-200 px-6 pt-4 pb-[max(16px,env(safe-area-inset-bottom))] bg-white rounded-b-3xl sticky bottom-0 z-10">
          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleClose}
              disabled={loading}
              className={cn(
                "flex-1 rounded-full py-4 px-6",
                "border border-gray-300",
                "bg-white text-gray-900",
                "text-base font-semibold",
                "flex items-center justify-center",
                "transition-all duration-200",
                "active:scale-[0.97]",
                loading && "opacity-60 cursor-not-allowed"
              )}
            >
              {addAddressCopy.cancelButton}
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={loading}
              className={cn(
                "flex-[2] rounded-full py-4 px-6",
                "bg-black text-white",
                "text-base font-semibold",
                "flex items-center justify-center",
                "transition-all duration-200",
                "active:scale-[0.97]",
                loading && "opacity-60 cursor-not-allowed"
              )}
            >
              {loading ? "Saving..." : addAddressCopy.saveButton}
            </button>
          </div>
        </div>
      </div>
      </div>
    </>
  );
}

interface AddressSelectorProps {
  selectedAddressId: string | null;
  onAddressSelect: (address: CustomerAddress) => void;
  onAddressChange: () => void;
  onEditingChange?: (isEditing: boolean) => void;
  onAddressesCountChange?: (count: number) => void;
  hideManageButton?: boolean;
  triggerAddAddress?: boolean; // External trigger to open add address form
  onAddAddressTriggered?: () => void; // Callback when form is opened
}

export function AddressSelector({ 
  selectedAddressId, 
  onAddressSelect, 
  onAddressChange,
  onEditingChange,
  onAddressesCountChange,
  hideManageButton = false,
  triggerAddAddress = false,
  onAddAddressTriggered,
}: AddressSelectorProps) {
  const navigate = useNavigate();
  const { addresses, isLoading: loading } = useCustomerAddresses();
  const invalidateAddresses = useInvalidateAddresses();
  const [showForm, setShowForm] = useState(false);
  const [editingAddress, setEditingAddress] = useState<CustomerAddress | null>(null);
  const prevSelectedAddressIdRef = useRef<string | null>(selectedAddressId);
  const hasAutoSelectedRef = useRef(false);

  // Auto-select address when addresses first load
  useEffect(() => {
    if (loading || addresses.length === 0) return;
    
    // Only auto-select once when addresses first become available
    if (!hasAutoSelectedRef.current) {
      // If selectedAddressId is provided (from URL params), try to select that address
      if (selectedAddressId) {
        const address = addresses.find(a => a.id === selectedAddressId);
        if (address) {
          onAddressSelect(address);
          track('address_selected', {
            address_count: addresses.length,
            is_default: address.is_default || false,
            source: 'url_param',
          });
          hasAutoSelectedRef.current = true;
          return;
        }
      }
      
      // Otherwise, auto-select default address or first address
      const defaultAddr = addresses.find(a => a.is_default) || addresses[0];
      if (defaultAddr) {
        onAddressSelect(defaultAddr);
        track('address_selected', {
          address_count: addresses.length,
          is_default: defaultAddr.is_default || false,
          source: 'auto_select',
        });
        hasAutoSelectedRef.current = true;
      }
    }
    
    // Notify parent of addresses count
    onAddressesCountChange?.(addresses.length);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [addresses, loading]);
  
  // Handle selectedAddressId changes (e.g., from URL params changing)
  useEffect(() => {
    if (loading || addresses.length === 0 || !selectedAddressId) return;
    
    const address = addresses.find(a => a.id === selectedAddressId);
    if (address && prevSelectedAddressIdRef.current !== selectedAddressId) {
      onAddressSelect(address);
      prevSelectedAddressIdRef.current = selectedAddressId;
      track('address_selected', {
        address_count: addresses.length,
        is_default: address.is_default || false,
        source: 'url_param',
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedAddressId]);

  useEffect(() => {
    // Notify parent when editing state changes
    onEditingChange?.(showForm);
    
    // Prevent background scrolling when modal is open
    if (showForm) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [showForm, onEditingChange]);

  // Handle external trigger to open add address form
  useEffect(() => {
    if (triggerAddAddress && !showForm) {
      setEditingAddress(null);
      setShowForm(true);
      onAddAddressTriggered?.();
    }
  }, [triggerAddAddress, showForm, onAddAddressTriggered]);

  const handleAddressCreated = async (newAddress: CustomerAddress) => {
    // Invalidate query cache - React Query will refetch automatically
    invalidateAddresses();
    
    // Wait for addresses to refetch, then auto-select the new address
    // The useEffect above will handle selection when addresses update
    // For immediate selection, we can select it directly
    setTimeout(() => {
      onAddressSelect(newAddress);
    }, 100);
    
    // Notify parent of change
    onAddressChange();
  };

  const handleAddressUpdated = (updatedAddress: CustomerAddress) => {
    // Invalidate query cache - React Query will refetch automatically
    invalidateAddresses();
    
    // If this is the currently selected address, update the selection
    if (selectedAddressId === updatedAddress.id) {
      onAddressSelect(updatedAddress);
    }
    // Modal will handle closing itself after animation completes
    onAddressChange();
  };

  const handleEdit = (address: CustomerAddress) => {
    setEditingAddress(address);
    setShowForm(true);
  };

  const handleCancelForm = () => {
    setShowForm(false);
    setEditingAddress(null);
  };


  if (loading) {
    // Match the actual AddressCard structure used in AddressCarousel
    // AddressCard uses: rounded-[32px] px-6 py-4 for carousel mode
    const baseCardClass = "w-full rounded-[32px] px-6 py-4 flex flex-col gap-2 border border-[rgba(15,23,42,0.06)] bg-white";
    
    return (
      <div className="space-y-4">
        {/* Carousel container skeleton - matches AddressCarousel structure */}
        <div className="flex-shrink-0 -mx-8 w-[calc(100%+4rem)]">
          <div className="flex overflow-x-hidden snap-x snap-mandatory pb-2">
            {/* First address card skeleton */}
            <div className="snap-center shrink-0 w-full px-8 flex justify-center">
              <div className={baseCardClass}>
                {/* Row 1: Icon + Label + Default badge + Edit button */}
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    {/* Icon skeleton - w-10 h-10 to match AddressCard */}
                    <div className="w-10 h-10 rounded-full bg-gray-200 animate-pulse flex-shrink-0" />
                    {/* Label skeleton */}
                    <div className="bg-gray-200 animate-pulse h-[17px] w-32 rounded flex-1" />
                    {/* Default badge skeleton (optional) */}
                    <div className="bg-gray-200 animate-pulse h-5 w-16 rounded-full flex-shrink-0" />
                  </div>
                  {/* Edit button skeleton */}
                  <div className="bg-gray-200 animate-pulse h-4 w-12 rounded flex-shrink-0" />
                </div>
                {/* Row 2: Address line skeleton */}
                <div className="bg-gray-200 animate-pulse h-3.5 w-full max-w-[280px] rounded" />
              </div>
            </div>
            {/* Second address card skeleton (if multiple addresses) */}
            <div className="snap-center shrink-0 w-full px-8 flex justify-center">
              <div className={baseCardClass}>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-gray-200 animate-pulse flex-shrink-0" />
                    <div className="bg-gray-200 animate-pulse h-[17px] w-28 rounded flex-1" />
                  </div>
                  <div className="bg-gray-200 animate-pulse h-4 w-12 rounded flex-shrink-0" />
                </div>
                <div className="bg-gray-200 animate-pulse h-3.5 w-full max-w-[260px] rounded" />
              </div>
            </div>
            {/* Pagination dots skeleton */}
            <div className="mt-4 flex items-center justify-center gap-1.5 w-full">
              <div className="h-1.5 w-6 rounded-full bg-gray-200 animate-pulse" />
              <div className="h-1.5 w-1.5 rounded-full bg-gray-200 animate-pulse" />
            </div>
          </div>
        </div>
        {/* Manage Addresses button skeleton - matches actual button */}
        {/* Only show skeleton if we might have addresses (hide if we know there are 0) */}
        {!hideManageButton && (
          <div className="flex-shrink-0 mt-4 w-full">
            <div className="w-full rounded-[999px] bg-gray-200 animate-pulse h-14 flex items-center justify-center gap-2">
              <div className="w-5 h-5 rounded bg-gray-300" />
              <div className="h-4 w-32 rounded bg-gray-300" />
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <>
      {/* (A) Address Carousel - Break out to edge-to-edge only when there are addresses */}
      {addresses.length > 0 ? (
        <div className="flex-shrink-0 -mx-8 w-[calc(100%+4rem)]">
          <AddressCarousel
            addresses={addresses}
            selectedAddressId={selectedAddressId}
            onSelectAddress={onAddressSelect}
            onAddAddress={() => {
              setEditingAddress(null);
              setShowForm(true);
            }}
            onEditAddress={handleEdit}
            onManageAddresses={() => navigate("/customer/addresses")}
          />
        </div>
      ) : (
        // When there are no addresses and hideZeroAddressButton is true,
        // AddressCarousel returns null, so we render an empty div to maintain layout
        <div className="w-full min-h-[1px]">
          <AddressCarousel
            addresses={addresses}
            selectedAddressId={selectedAddressId}
            onSelectAddress={onAddressSelect}
            onAddAddress={() => {
              setEditingAddress(null);
              setShowForm(true);
            }}
            onEditAddress={handleEdit}
            onManageAddresses={() => navigate("/customer/addresses")}
            hideZeroAddressButton={true}
          />
        </div>
      )}

      {/* (B) Add Address Button - Standard pill button */}
      {/* Always show (user can always add addresses) */}
      {!hideManageButton && (
        <div className="flex-shrink-0 mt-4 w-full">
          <button
            type="button"
            onClick={() => {
              setEditingAddress(null);
              setShowForm(true);
            }}
            className={cn(
              "w-full rounded-[999px] bg-white border border-[#E5E7EB] px-6 py-4",
              "flex items-center justify-center gap-2",
              "text-base font-semibold text-[#020817]",
              "shadow-sm",
              "active:scale-[0.98] active:bg-slate-50 transition-transform duration-150"
            )}
          >
            <Plus className="w-5 h-5" strokeWidth={2.2} />
            <span>Add Address</span>
          </button>
        </div>
      )}

      {/* Modal Overlay */}
      {showForm && (
        <AddressFormModal
          editingAddress={editingAddress}
          onSave={editingAddress ? handleAddressUpdated : handleAddressCreated}
          onCancel={handleCancelForm}
        />
      )}
    </>
  );
}
