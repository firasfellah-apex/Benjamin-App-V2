import { useState, useEffect } from "react";
import { Plus, MapPin, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { getCustomerAddresses, formatAddress } from "@/db/api";
import type { CustomerAddress } from "@/types/types";
import { AddressForm } from "./AddressForm";
import { strings } from "@/lib/strings";

interface AddressSelectorProps {
  selectedAddressId: string | null;
  onAddressSelect: (address: CustomerAddress) => void;
  onAddressChange: () => void;
}

export function AddressSelector({ selectedAddressId, onAddressSelect, onAddressChange }: AddressSelectorProps) {
  const [addresses, setAddresses] = useState<CustomerAddress[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingAddress, setEditingAddress] = useState<CustomerAddress | null>(null);

  useEffect(() => {
    loadAddresses();
  }, []);

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
    onAddressSelect(newAddress);
    setShowForm(false);
    onAddressChange();
  };

  const handleAddressUpdated = (updatedAddress: CustomerAddress) => {
    setAddresses(prev => prev.map(a => a.id === updatedAddress.id ? updatedAddress : a));
    if (selectedAddressId === updatedAddress.id) {
      onAddressSelect(updatedAddress);
    }
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

  if (showForm) {
    return (
      <AddressForm
        address={editingAddress}
        onSave={editingAddress ? handleAddressUpdated : handleAddressCreated}
        onCancel={handleCancelForm}
      />
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{strings.customer.addressSectionTitle}</CardTitle>
        <CardDescription>{strings.customer.addressSectionDesc}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {addresses.length === 0 ? (
          <Alert>
            <MapPin className="h-4 w-4" />
            <AlertDescription>
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
              {addresses.map((address) => (
                <div
                  key={address.id}
                  className="flex items-start space-x-3 rounded-lg border p-4 hover:bg-accent/50 transition-colors"
                >
                  <RadioGroupItem value={address.id} id={address.id} className="mt-1" />
                  <div className="flex-1 space-y-1">
                    <Label htmlFor={address.id} className="flex items-center gap-2 cursor-pointer">
                      <span className="font-semibold">{address.label}</span>
                      {address.is_default && (
                        <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                          Default
                        </span>
                      )}
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      {formatAddress(address)}
                    </p>
                  </div>
                  {selectedAddressId === address.id && (
                    <div className="flex items-center gap-2">
                      <Check className="h-5 w-5 text-primary" />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(address)}
                      >
                        {strings.customer.addressEdit}
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </RadioGroup>
        )}

        <Button
          variant="outline"
          className="w-full"
          onClick={() => setShowForm(true)}
        >
          <Plus className="mr-2 h-4 w-4" />
          {strings.customer.addressAddNew}
        </Button>
      </CardContent>
    </Card>
  );
}
