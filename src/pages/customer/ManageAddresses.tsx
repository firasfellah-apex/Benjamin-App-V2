import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Trash2, Plus, X, PenLine } from "@/lib/icons";
import { CustomerButton } from "@/pages/customer/components/CustomerButton";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { getCustomerAddresses, deleteAddress, updateAddress, formatAddress } from "@/db/api";
import type { CustomerAddress } from "@/types/types";
import { getIconByName } from "@/components/address/IconPicker";
import { AddressForm } from "@/components/address/AddressForm";
import { cn } from "@/lib/utils";
import { AddressCard } from "@/pages/customer/components/AddressCard";
import { CustomerScreen } from "@/pages/customer/components/CustomerScreen";
import { CustomerTopShell } from "@/pages/customer/components/CustomerTopShell";

export default function ManageAddresses() {
  const navigate = useNavigate();
  const [addresses, setAddresses] = useState<CustomerAddress[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingAddress, setEditingAddress] = useState<CustomerAddress | null | undefined>(undefined);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [addressToDelete, setAddressToDelete] = useState<CustomerAddress | null>(null);
  const [isClosingModal, setIsClosingModal] = useState(false);

  // Handle back navigation - always go to address selection page
  const handleBack = () => {
    navigate('/customer/request');
  };

  useEffect(() => {
    loadAddresses();
  }, []);

  const loadAddresses = async () => {
    setLoading(true);
    const data = await getCustomerAddresses();
    // Sort: default first, then by created_at
    const sorted = data.sort((a, b) => {
      if (a.is_default && !b.is_default) return -1;
      if (!a.is_default && b.is_default) return 1;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
    setAddresses(sorted);
    setLoading(false);
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
      toast.success("Address deleted");
      setAddresses(addresses.filter(a => a.id !== addressToDelete.id));
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
    // Optimistically update local state immediately
    setAddresses(prev => {
      // Check if this is a new address or an update
      const existingIndex = prev.findIndex(addr => addr.id === updatedAddress.id);
      const existingAddress = existingIndex >= 0 ? prev[existingIndex] : null;
      
      // Determine if this address is becoming default (wasn't default, now is)
      const isBecomingDefault = updatedAddress.is_default && (!existingAddress || !existingAddress.is_default);
      
      let updated: CustomerAddress[];
      
      if (existingIndex >= 0) {
        // Update existing address
        updated = prev.map(addr => {
          // Update the address that was edited
          if (addr.id === updatedAddress.id) {
            return updatedAddress;
          }
          // If the updated address became default, unset ALL other defaults
          if (isBecomingDefault && addr.is_default) {
            return { ...addr, is_default: false };
          }
          return addr;
        });
      } else {
        // Add new address
        updated = [...prev, updatedAddress].map(addr => {
          // If the new address is default, unset ALL other defaults
          if (updatedAddress.is_default && addr.is_default && addr.id !== updatedAddress.id) {
            return { ...addr, is_default: false };
          }
          return addr;
        });
      }
      
      // Sort: default first, then by created_at
      return updated.sort((a, b) => {
        if (a.is_default && !b.is_default) return -1;
        if (!a.is_default && b.is_default) return 1;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
    });
    
    // Trigger slide-down animation before closing
    setIsClosingModal(true);
    setTimeout(() => {
      setEditingAddress(undefined);
      setIsClosingModal(false);
    }, 300);
    
    // Reload from server in the background to ensure consistency
    const refreshAddresses = async () => {
      const data = await getCustomerAddresses();
      const sorted = data.sort((a, b) => {
        if (a.is_default && !b.is_default) return -1;
        if (!a.is_default && b.is_default) return 1;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
      setAddresses(sorted);
    };
    refreshAddresses();
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
        header={
          <CustomerTopShell
            title="Manage Addresses"
            subtitle="Add, edit, or delete your saved addresses"
            showBack={true}
            onBack={handleBack}
          />
        }
        map={
          <div className="flex flex-col h-full bg-[#F5F7FA]">
            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto">
              <div className="pt-4 pb-32 space-y-4">
                {addresses.length === 0 ? (
                  <div className="text-center py-16">
                    <div className="max-w-xs mx-auto">
                      <p className="text-gray-500 mb-6 text-base">No saved addresses yet</p>
                      <CustomerButton
                        onClick={handleAddNew}
                        size="md"
                        className="w-full"
                      >
                        <Plus className="h-5 w-5" />
                        Add Your First Address
                      </CustomerButton>
                    </div>
                  </div>
                ) : (
                  addresses.map((address) => {
                    const addressLabel = address.label || formatAddress(address).split(',')[0] || 'Saved address';
                    return (
                      <AddressCard
                        key={address.id}
                        mode="manage"
                        label={addressLabel}
                        addressLine={formatAddress(address)}
                        isDefault={address.is_default}
                        note={address.delivery_notes}
                        icon={(() => {
                          const IconComponent = getIconByName(address.icon || 'Home');
                          return (
                            <div className="w-10 h-10 rounded-full bg-[#F4F7FB] flex items-center justify-center text-slate-800 shrink-0">
                              <IconComponent className="w-5 h-5" />
                            </div>
                          );
                        })()}
                        onEdit={(e) => {
                          e.stopPropagation();
                          handleEdit(address);
                        }}
                        onDelete={(e) => {
                          e.stopPropagation();
                          handleDelete(address);
                        }}
                      />
                    );
                  })
                )}
              </div>
            </div>

            {/* Sticky bottom CTA */}
            {addresses.length > 0 && (
              <div className="sticky bottom-0 left-0 right-0">
                <div className="pt-3 pb-8 bg-[#F5F7FA]">
                  <CustomerButton
                    type="button"
                    onClick={handleAddNew}
                    size="lg"
                    className="w-full shadow-[0_18px_40px_rgba(15,23,42,0.26)]"
                  >
                    <Plus className="w-5 h-5" />
                    Add New Address
                  </CustomerButton>
                </div>
              </div>
            )}
          </div>
        }
      />

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
                className="text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-full p-2 transition-colors"
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
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
