import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { createAddress, updateAddress } from "@/db/api";
import type { CustomerAddress } from "@/types/types";
import { strings } from "@/lib/strings";

interface AddressFormProps {
  address?: CustomerAddress | null;
  onSave: (address: CustomerAddress) => void;
  onCancel: () => void;
}

export function AddressForm({ address, onSave, onCancel }: AddressFormProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    label: address?.label || "",
    line1: address?.line1 || "",
    line2: address?.line2 || "",
    city: address?.city || "",
    state: address?.state || "",
    postal_code: address?.postal_code || "",
    is_default: address?.is_default || false
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!formData.label.trim()) {
      toast.error("Please enter an address label");
      return;
    }
    if (!formData.line1.trim()) {
      toast.error("Please enter a street address");
      return;
    }
    if (!formData.city.trim()) {
      toast.error("Please enter a city");
      return;
    }
    if (!formData.state.trim()) {
      toast.error("Please enter a state");
      return;
    }
    if (!formData.postal_code.trim()) {
      toast.error("Please enter a ZIP code");
      return;
    }

    setLoading(true);

    try {
      if (address) {
        // Update existing address
        const success = await updateAddress(address.id, formData);
        if (success) {
          toast.success(strings.customer.addressUpdated);
          onSave({ ...address, ...formData });
        } else {
          toast.error("Failed to update address");
        }
      } else {
        // Create new address
        const newAddress = await createAddress(formData);
        if (newAddress) {
          toast.success(strings.customer.addressSaved);
          onSave(newAddress);
        } else {
          toast.error("Failed to save address");
        }
      }
    } catch (error) {
      console.error("Error saving address:", error);
      toast.error("An error occurred while saving the address");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {address ? strings.customer.addressFormEditTitle : strings.customer.addressFormTitle}
        </CardTitle>
        <CardDescription>
          {strings.customer.addressSectionDesc}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="label">{strings.customer.addressLabelField}</Label>
            <Input
              id="label"
              placeholder={strings.customer.addressLabelPlaceholder}
              value={formData.label}
              onChange={(e) => setFormData({ ...formData, label: e.target.value })}
              required
            />
            <p className="text-xs text-muted-foreground">
              {strings.customer.addressLabelHelp}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="line1">{strings.customer.addressLine1Field}</Label>
            <Input
              id="line1"
              placeholder={strings.customer.addressLine1Placeholder}
              value={formData.line1}
              onChange={(e) => setFormData({ ...formData, line1: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="line2">{strings.customer.addressLine2Field}</Label>
            <Input
              id="line2"
              placeholder={strings.customer.addressLine2Placeholder}
              value={formData.line2}
              onChange={(e) => setFormData({ ...formData, line2: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="city">{strings.customer.addressCityField}</Label>
              <Input
                id="city"
                placeholder={strings.customer.addressCityPlaceholder}
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="state">{strings.customer.addressStateField}</Label>
              <Input
                id="state"
                placeholder={strings.customer.addressStatePlaceholder}
                value={formData.state}
                onChange={(e) => setFormData({ ...formData, state: e.target.value.toUpperCase() })}
                maxLength={2}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="postal_code">{strings.customer.addressZipField}</Label>
            <Input
              id="postal_code"
              placeholder={strings.customer.addressZipPlaceholder}
              value={formData.postal_code}
              onChange={(e) => setFormData({ ...formData, postal_code: e.target.value })}
              maxLength={10}
              required
            />
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="is_default"
              checked={formData.is_default}
              onCheckedChange={(checked) => 
                setFormData({ ...formData, is_default: checked as boolean })
              }
            />
            <Label htmlFor="is_default" className="text-sm font-normal cursor-pointer">
              {strings.customer.addressDefaultCheckbox}
            </Label>
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="submit" className="flex-1" disabled={loading}>
              {loading ? strings.buttons.loading : strings.customer.addressSaveButton}
            </Button>
            <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
              {strings.customer.addressCancelButton}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
