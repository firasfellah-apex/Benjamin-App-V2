import { useState, useEffect } from "react";
import { Plus, MapPin, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { getCustomerAddresses, formatAddress } from "@/db/api";
import type { CustomerAddress } from "@/types/types";
import { AddressForm } from "./AddressForm";
import { strings } from "@/lib/strings";
import { cn } from "@/lib/utils";

interface AddressSelectorProps {
  selectedAddressId: string | null;
  onAddressSelect: (address: CustomerAddress) => void;
  onAddressChange: () => void;
  onEditingChange?: (isEditing: boolean) => void;
}

export function AddressSelector({ 
  selectedAddressId, 
  onAddressSelect, 
  onAddressChange,
  onEditingChange 
}: AddressSelectorProps) {
  const [addresses, setAddresses] = useState<CustomerAddress[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingAddress, setEditingAddress] = useState<CustomerAddress | null>(null);

  useEffect(() => {
    loadAddresses();
  }, []);

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

  const loadAddresses = async () => {
    setLoading(true);
    const data = await getCustomerAddresses();
    setAddresses(data);
    
    // Auto-select default address if no address is selected
    if (!selectedAddressId && data.length > 0) {
      const defaultAddr = data.find(a => a.is_default) || data[0];
      onAddressSelect(defaultAddr);
    }
    
    setLoading(false);
  };

  const handleAddressCreated = (newAddress: CustomerAddress) => {
    setAddresses(prev => [newAddress, ...prev]);
    onAddressSelect(newAddress); // Auto-select new address
    setShowForm(false);
    setEditingAddress(null);
    onAddressChange();
  };

  const handleAddressUpdated = (updatedAddress: CustomerAddress) => {
    setAddresses(prev => prev.map(a => a.id === updatedAddress.id ? updatedAddress : a));
    if (selectedAddressId === updatedAddress.id) {
      onAddressSelect(updatedAddress);
    }
    setShowForm(false);
    setEditingAddress(null);
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
    return (
      <Card>
        <CardHeader>
          <CardTitle>{strings.customer.addressSectionTitle}</CardTitle>
          <CardDescription>{strings.customer.addressSectionDesc}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            {strings.buttons.loading}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="bg-white border-black/5 rounded-3xl shadow-sm">
        <CardHeader>
          <CardTitle className="text-black">{strings.customer.addressSectionTitle}</CardTitle>
          <CardDescription className="text-neutral-500">Choose where we should deliver your cash</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {addresses.length === 0 ? (
            <Alert className="bg-neutral-50 border-neutral-200">
              <MapPin className="h-4 w-4 text-neutral-500" />
              <AlertDescription className="text-neutral-500">
                {strings.customer.addressRequiredError}
              </AlertDescription>
            </Alert>
          ) : (
            <RadioGroup
              value={selectedAddressId || ""}
              onValueChange={(value) => {
                const address = addresses.find(a => a.id === value);
                if (address) onAddressSelect(address);
              }}
            >
              <div className="space-y-3">
                {addresses.map((address) => {
                  const isSelected = selectedAddressId === address.id;
                  return (
                    <div
                      key={address.id}
                      className={cn(
                        "flex items-start space-x-3 rounded-2xl border p-4 transition-all cursor-pointer",
                        isSelected 
                          ? "bg-white border-black shadow-sm" 
                          : "bg-white border-neutral-200 hover:bg-neutral-50"
                      )}
                      onClick={() => onAddressSelect(address)}
                    >
                      <RadioGroupItem value={address.id} id={address.id} className="mt-1" />
                      <div className="flex-1 space-y-1">
                        <Label htmlFor={address.id} className="flex items-center gap-2 cursor-pointer">
                          <span className="font-semibold text-black">{address.label}</span>
                          {address.is_default && (
                            <span className="text-xs bg-black/5 text-black px-2 py-0.5 rounded-full font-medium">
                              Default
                            </span>
                          )}
                        </Label>
                        <p className="text-sm text-neutral-500">
                          {formatAddress(address)}
                        </p>
                        {address.delivery_notes && (
                          <p className="text-xs text-neutral-500 italic mt-1">
                            Note: {address.delivery_notes}
                          </p>
                        )}
                      </div>
                      {isSelected && (
                        <div className="flex items-center gap-2">
                          <Check className="h-5 w-5 text-black" />
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEdit(address);
                            }}
                            className="text-black hover:bg-neutral-100"
                          >
                            {strings.customer.addressEdit}
                          </Button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </RadioGroup>
          )}

          <Button
            variant="outline"
            className="w-full border-neutral-200 hover:bg-neutral-50 text-black rounded-full"
            onClick={() => {
              setEditingAddress(null);
              setShowForm(true);
            }}
          >
            <Plus className="mr-2 h-4 w-4" />
            {strings.customer.addressAddNew}
          </Button>
        </CardContent>
      </Card>

      {/* Modal Overlay */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={handleCancelForm}
          />
          
          {/* Modal Content */}
          <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white rounded-3xl shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="sticky top-0 z-10 bg-white border-b border-neutral-200 px-6 py-4 flex items-center justify-between rounded-t-3xl">
              <div>
                <h2 className="text-xl font-bold text-black">
                  {editingAddress ? 'Edit delivery address' : 'Add delivery address'}
                </h2>
                <p className="text-sm text-neutral-500 mt-1">
                  Choose where we should deliver your cash
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCancelForm}
                className="text-neutral-500 hover:text-black hover:bg-neutral-100"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="p-6">
              <AddressForm
                address={editingAddress}
                onSave={editingAddress ? handleAddressUpdated : handleAddressCreated}
                onCancel={handleCancelForm}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
