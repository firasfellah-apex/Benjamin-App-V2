import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { createAddress, updateAddress } from "@/db/api";
import type { CustomerAddress } from "@/types/types";
import { cn } from "@/lib/utils";

interface AddressFormProps {
  address?: CustomerAddress | null;
  onSave: (address: CustomerAddress) => void;
  onCancel: () => void;
}

interface FormErrors {
  label?: string;
  line1?: string;
  city?: string;
  state?: string;
  postal_code?: string;
}

export function AddressForm({ address, onSave, onCancel }: AddressFormProps) {
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [formData, setFormData] = useState({
    label: address?.label || "",
    line1: address?.line1 || "",
    line2: address?.line2 || "",
    city: address?.city || "",
    state: address?.state || "",
    postal_code: address?.postal_code || "",
    delivery_notes: address?.delivery_notes || "",
    is_default: address?.is_default || false
  });

  const validateForm = (): boolean => {
    const nextErrors: FormErrors = {};

    if (!formData.label.trim()) {
      nextErrors.label = "Add a name for this address.";
    }
    if (!formData.line1.trim()) {
      nextErrors.line1 = "Please enter a street address.";
    }
    if (!formData.city.trim()) {
      nextErrors.city = "City is required.";
    }
    if (!formData.state.trim()) {
      nextErrors.state = "State is required.";
    }
    if (!formData.postal_code.trim()) {
      nextErrors.postal_code = "ZIP code is required.";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate all fields at once
    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      if (address) {
        // Update existing address
        const success = await updateAddress(address.id, formData);
        if (success) {
          toast.success("Address saved");
          onSave({ ...address, ...formData });
        } else {
          toast.error("Failed to update address");
        }
      } else {
        // Create new address
        const newAddress = await createAddress(formData);
        if (newAddress) {
          toast.success("Address saved");
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
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="label">Address name</Label>
        <Input
          id="label"
          placeholder="e.g., Home, Office, Mom's place"
          value={formData.label}
          onChange={(e) => {
            setFormData({ ...formData, label: e.target.value });
            if (errors.label) setErrors({ ...errors, label: undefined });
          }}
          className={cn(
            errors.label && "border-[#FF5A5F] bg-[#FFF7F7]"
          )}
        />
        {errors.label && (
          <p className="text-[10px] text-[#FF5A5F] mt-1">
            {errors.label}
          </p>
        )}
        <p className="text-xs text-muted-foreground">
          Give this address a friendly name (e.g., Home, Office)
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="line1">Street address</Label>
        <Input
          id="line1"
          placeholder="123 Main Street"
          value={formData.line1}
          onChange={(e) => {
            setFormData({ ...formData, line1: e.target.value });
            if (errors.line1) setErrors({ ...errors, line1: undefined });
          }}
          className={cn(
            errors.line1 && "border-[#FF5A5F] bg-[#FFF7F7]"
          )}
        />
        {errors.line1 && (
          <p className="text-[10px] text-[#FF5A5F] mt-1">
            {errors.line1}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="line2">Apt, suite, etc. (optional)</Label>
        <Input
          id="line2"
          placeholder="Apt 4B"
          value={formData.line2}
          onChange={(e) => setFormData({ ...formData, line2: e.target.value })}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="city">City</Label>
          <Input
            id="city"
            placeholder="San Francisco"
            value={formData.city}
            onChange={(e) => {
              setFormData({ ...formData, city: e.target.value });
              if (errors.city) setErrors({ ...errors, city: undefined });
            }}
            className={cn(
              errors.city && "border-[#FF5A5F] bg-[#FFF7F7]"
            )}
          />
          {errors.city && (
            <p className="text-[10px] text-[#FF5A5F] mt-1">
              {errors.city}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="state">State</Label>
          <Input
            id="state"
            placeholder="CA"
            value={formData.state}
            onChange={(e) => {
              setFormData({ ...formData, state: e.target.value.toUpperCase() });
              if (errors.state) setErrors({ ...errors, state: undefined });
            }}
            maxLength={2}
            className={cn(
              errors.state && "border-[#FF5A5F] bg-[#FFF7F7]"
            )}
          />
          {errors.state && (
            <p className="text-[10px] text-[#FF5A5F] mt-1">
              {errors.state}
            </p>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="postal_code">ZIP code</Label>
        <Input
          id="postal_code"
          placeholder="94102"
          value={formData.postal_code}
          onChange={(e) => {
            setFormData({ ...formData, postal_code: e.target.value });
            if (errors.postal_code) setErrors({ ...errors, postal_code: undefined });
          }}
          maxLength={10}
          className={cn(
            errors.postal_code && "border-[#FF5A5F] bg-[#FFF7F7]"
          )}
        />
        {errors.postal_code && (
          <p className="text-[10px] text-[#FF5A5F] mt-1">
            {errors.postal_code}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="delivery_notes">Delivery notes (optional)</Label>
        <Textarea
          id="delivery_notes"
          placeholder="e.g., Ring doorbell, meet in lobby, call when you arrive"
          value={formData.delivery_notes}
          onChange={(e) => setFormData({ ...formData, delivery_notes: e.target.value })}
          rows={3}
          className="resize-none"
        />
        <p className="text-xs text-muted-foreground">
          These notes will be used for all deliveries to this address
        </p>
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
          Set as default address
        </Label>
      </div>

      <div className="flex gap-3 pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={loading}
          className="text-xs px-3 py-2 rounded-lg border border-muted-foreground/30 text-muted-foreground hover:bg-muted"
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={loading}
          className="flex-1 bg-black text-white hover:bg-black/90"
        >
          {loading ? "Saving..." : "Save & Use This Address"}
        </Button>
      </div>
    </form>
  );
}
