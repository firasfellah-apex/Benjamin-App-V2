import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Trash2, Plus, X, PenLine, ArrowLeft } from "@/lib/icons";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { deleteAddress, formatAddress } from "@/db/api";
import type { CustomerAddress } from "@/types/types";
import { getIconByName } from "@/components/address/IconPicker";
import { AddressForm } from "@/components/address/AddressForm";
import { cn } from "@/lib/utils";
import { AddressCarousel } from "@/pages/customer/components/AddressCarousel";
import { CustomerScreen } from "@/pages/customer/components/CustomerScreen";
import { useCustomerAddresses, useInvalidateAddresses } from "@/features/address/hooks/useCustomerAddresses";

export default function ManageAddresses() {
  const navigate = useNavigate();
  const { addresses: rawAddresses, isLoading: loading } = useCustomerAddresses();
  const invalidateAddresses = useInvalidateAddresses();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingAddress, setEditingAddress] = useState<CustomerAddress | null | undefined>(undefined);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [addressToDelete, setAddressToDelete] = useState<CustomerAddress | null>(null);
  const [isClosingModal, setIsClosingModal] = useState(false);

  // Sort addresses by created_at (default logic hidden for now)
  const addresses = rawAddresses.sort((a, b) => {
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  // Handle back navigation - always go to address selection page
  const handleBack = () => {
    navigate('/customer/request');
  };

  const handleDelete = (address: CustomerAddress) => {
    setAddressToDelete(address);
    setShowDeleteDialog(true);
  };

  const confirmDelete = async () => {
    if (!addressToDelete) return;

    setDeletingId(addressToDelete.id);
    const success = await deleteAddress(addressToDelete.id);
    
    if (success) {
      invalidateAddresses(); // Invalidate query cache
      toast.success("Address deleted");
      setShowDeleteDialog(false);
      setAddressToDelete(null);
    } else {
      toast.error("Failed to delete address");
    }
    
    setDeletingId(null);
  };

  const handleEdit = (address: CustomerAddress) => {
    setEditingAddress(address);
  };

  const handleSave = async (updatedAddress: CustomerAddress) => {
    // Invalidate query cache - React Query will refetch automatically
    invalidateAddresses();
    
    // Trigger slide-down animation before closing
    setIsClosingModal(true);
    setTimeout(() => {
      setEditingAddress(undefined);
      setIsClosingModal(false);
    }, 300);
  };

  const handleCancelEdit = () => {
    setIsClosingModal(true);
    setTimeout(() => {
      setEditingAddress(undefined);
      setIsClosingModal(false);
    }, 300);
  };

  const handleAddNew = () => {
    setEditingAddress(null);
  };

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
        loading={loading}
        title="Where should we deliver?"
        subtitle="Select a location. You can save more than one."
        headerLeft={
          <button
            onClick={handleBack}
            className="p-2 rounded-full transition-colors -ml-2"
            aria-label="Go back"
          >
            <ArrowLeft className="h-5 w-5 text-gray-600" />
          </button>
        }
        map={
          <div className="flex flex-col h-full bg-[#F5F7FA]" />
        }
        topContent={
          <div className="space-y-6">
            {/* Address carousel - inside top shelf */}
            <AddressCarousel
              addresses={addresses}
              selectedAddressId={null}
              onSelectAddress={() => {}}
              onAddAddress={handleAddNew}
              onEditAddress={handleEdit}
              onDeleteAddress={handleDelete}
            />
            {/* Add Address button - below carousel */}
            <button
              onClick={handleAddNew}
              className="w-full rounded-full border border-slate-200 bg-white py-4 px-6 text-base font-semibold text-slate-900 flex items-center justify-center gap-2 shadow-sm active:scale-[0.98] active:bg-slate-50 transition-transform duration-150"
            >
              <Plus className="w-5 h-5" />
              Add Address
            </button>
          </div>
        }
      >
        {/* Main content area - empty for now */}
      </CustomerScreen>

      {/* Edit/Add Modal */}
      {editingAddress !== undefined && (
        <div 
          className={cn(
            "fixed inset-0 z-50 flex items-end justify-center transition-opacity duration-300",
            !isClosingModal ? "opacity-100" : "opacity-0"
          )}
        >
          <div 
            className={cn(
              "absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300",
              !isClosingModal ? "opacity-100" : "opacity-0"
            )}
            onClick={handleCancelEdit}
          />
          <div 
            className={cn(
              "relative w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white rounded-t-3xl shadow-2xl transition-transform duration-300 ease-in-out",
              !isClosingModal ? "translate-y-0" : "translate-y-full"
            )}
          >
            <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between rounded-t-3xl">
              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  {editingAddress ? 'Edit Delivery Address' : 'Add Delivery Address'}
                </h2>
                <p className="text-sm text-gray-600 mt-1">
                  {editingAddress ? 'Update your delivery address' : 'Choose where we should deliver your cash'}
                </p>
              </div>
              <button
                type="button"
                onClick={handleCancelEdit}
                className="text-gray-500 rounded-full p-2 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-6 pb-8">
              <AddressForm
                address={editingAddress || undefined}
                onSave={handleSave}
                onCancel={handleCancelEdit}
              />
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Address?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this address? This action cannot be undone.
              {addressToDelete && (
                <div className="mt-2 p-2 bg-gray-50 rounded-lg">
                  <p className="text-sm font-medium text-gray-900">
                    {addressToDelete.label || formatAddress(addressToDelete)}
                  </p>
                  <p className="text-xs text-gray-600 mt-1">
                    {formatAddress(addressToDelete)}
                  </p>
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-red-600 text-white"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
