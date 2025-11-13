import React, { useState, useRef, forwardRef, useImperativeHandle } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { createAddress, updateAddress, setDefaultAddress } from "@/db/api";
import type { CustomerAddress } from "@/types/types";
import { cn } from "@/lib/utils";
import { IconPicker, ALL_ICONS } from "./IconPicker";
import { addAddressCopy } from "@/lib/copy/addAddress";
import { Plus, Minus } from "lucide-react";
import { AddressAutocomplete } from "./AddressAutocomplete";
import { BenjaminMap } from "@/components/map/BenjaminMap";
import { useLocation } from "@/contexts/LocationContext";
import { useInvalidateAddresses } from "@/features/address/hooks/useCustomerAddresses";

export interface AddressFormRef {
  submit: () => void;
  loading: boolean;
  setLoadingCallback: (callback: (loading: boolean) => void) => void;
}

interface AddressFormProps {
  address?: CustomerAddress | null;
  onSave: (address: CustomerAddress) => void;
  onCancel?: () => void; // Optional - cancel handled by modal footer
}

interface FormErrors {
  label?: string;
  line1?: string;
  city?: string;
  state?: string;
  postal_code?: string;
}

const DELIVERY_NOTES_TEMPLATES = [
  "Meet in lobby",
  "Ring doorbell",
  "Call when near",
  "Gate code: #1234",
];

export const AddressForm = forwardRef<AddressFormRef, AddressFormProps>(
  ({ address, onSave }, ref) => {
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState<FormErrors>({});
    const formRef = useRef<HTMLFormElement>(null);
    const loadingCallbackRef = useRef<((loading: boolean) => void) | null>(null);
    const invalidateAddresses = useInvalidateAddresses();
    
    // Delivery notes section - closed by default
    const [showDeliveryNotes, setShowDeliveryNotes] = useState(false);
    const [formData, setFormData] = useState({
      icon: address?.icon || 'Home',
      label: address?.label || "",
      line1: address?.line1 || "",
      line2: address?.line2 || "",
      city: address?.city || "",
      state: address?.state || "",
      postal_code: address?.postal_code || "",
      delivery_notes: address?.delivery_notes || "",
      is_default: address?.is_default || false,
      latitude: address?.latitude || null,
      longitude: address?.longitude || null,
    });

    const { location: liveLocation } = useLocation();

    const updateLoading = (newLoading: boolean) => {
      setLoading(newLoading);
      loadingCallbackRef.current?.(newLoading);
    };

    useImperativeHandle(ref, () => ({
      submit: () => {
        formRef.current?.requestSubmit();
      },
      loading,
      setLoadingCallback: (callback: (loading: boolean) => void) => {
        loadingCallbackRef.current = callback;
        callback(loading); // Immediately call with current state
      }
    }));

  const validateForm = (): boolean => {
    const nextErrors: FormErrors = {};

    // Label is optional - no validation needed
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

      updateLoading(true);

    try {
      if (address) {
        // Update existing address
        const updateFields = {
          icon: formData.icon || 'Home',
          label: formData.label?.trim() || "",
          delivery_notes: formData.delivery_notes?.trim() || null,
          line2: formData.line2?.trim() || null,
          line1: formData.line1,
          city: formData.city,
          state: formData.state,
          postal_code: formData.postal_code,
          latitude: formData.latitude || null,
          longitude: formData.longitude || null,
        };
        
        // Handle default address setting separately
        if (formData.is_default && !address.is_default) {
          const defaultSuccess = await setDefaultAddress(address.id);
          if (!defaultSuccess) {
            toast.error("Failed to set default address");
            updateLoading(false);
            return;
          }
        } else if (!formData.is_default && address.is_default) {
          // Unset default if checkbox was unchecked
          await updateAddress(address.id, { is_default: false });
        }
        
        // Update address fields
        const success = await updateAddress(address.id, updateFields);
        if (success) {
          invalidateAddresses(); // Invalidate query cache
          toast.success("Address saved");
          const updatedAddress: CustomerAddress = { 
            ...address, 
            ...updateFields,
            is_default: formData.is_default
          };
          onSave(updatedAddress);
        } else {
          toast.error("Failed to update address");
        }
      } else {
        // Create new address
        const addressData = {
          label: formData.label?.trim() || "",
          icon: formData.icon || 'Home',
          line1: formData.line1,
          line2: formData.line2?.trim() || undefined,
          city: formData.city,
          state: formData.state,
          postal_code: formData.postal_code,
          delivery_notes: formData.delivery_notes?.trim() || null,
          latitude: formData.latitude || undefined,
          longitude: formData.longitude || undefined,
          is_default: false // Always create without default first, then set if needed
        };
        
        const result = await createAddress(addressData);
        if (result) {
          // If it should be default, set it as default
          if (formData.is_default) {
            const defaultSuccess = await setDefaultAddress(result.id);
            if (defaultSuccess) {
              invalidateAddresses(); // Invalidate query cache
              toast.success("Address saved");
              onSave({ ...result, is_default: true });
            } else {
              invalidateAddresses(); // Invalidate query cache
              toast.success("Address saved, but failed to set as default");
              onSave(result);
            }
          } else {
            invalidateAddresses(); // Invalidate query cache
            toast.success("Address saved");
            onSave(result);
          }
          // Form will close via onSave callback in parent component
        } else {
          console.error("Address save error: Failed to create address");
          toast.error("Failed to save address");
        }
      }
    } catch (error) {
      console.error("Error saving address:", error);
      toast.error("An error occurred while saving the address");
      updateLoading(false);
    }
  };

  const handleIconChange = (iconName: string) => {
    // Only update the icon, don't override the label if it's already filled
    // Only auto-populate if the label is empty
    if (!formData.label || formData.label.trim() === "") {
      const iconInfo = ALL_ICONS.find(i => i.name === iconName);
      const iconLabel = iconInfo?.label || iconName;
      setFormData({ ...formData, icon: iconName, label: iconLabel });
    } else {
      // User has filled the label, just update the icon
      setFormData({ ...formData, icon: iconName });
    }
  };

  const handleLabelChange = (label: string) => {
    setFormData({ ...formData, label });
  };

  const handleNoteTemplateClick = (template: string) => {
    const currentNotes = formData.delivery_notes || "";
    const newNotes = currentNotes ? `${currentNotes}, ${template}` : template;
    setFormData({ ...formData, delivery_notes: newNotes });
  };

    return (
      <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
      {/* Icon and Label Section */}
      <div className="space-y-3">
        <div className="space-y-1">
          <Label className="text-sm font-medium text-gray-900">
            Address Label
          </Label>
          <p className="text-xs text-gray-500">
            Choose an icon and enter a label — you can edit it anytime.
          </p>
        </div>

        {/* Icon Picker and Label Input */}
        <div className="flex items-center gap-3">
          <IconPicker
            value={formData.icon}
            onChange={handleIconChange}
          />
          <Input
            id="label"
            name="label"
            autoComplete="off"
            placeholder={addAddressCopy.addressPlaceholder}
            value={formData.label}
            onChange={(e) => handleLabelChange(e.target.value)}
            className="flex-1"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="line1">{addAddressCopy.streetAddress}</Label>
        <AddressAutocomplete
          id="line1"
          name="line1"
          value={formData.line1}
          onChange={(value) => {
            setFormData({ ...formData, line1: value });
            if (errors.line1) setErrors({ ...errors, line1: undefined });
          }}
          onPlaceSelect={(place) => {
            setFormData({
              ...formData,
              line1: place.line1,
              city: place.city,
              state: place.state,
              postal_code: place.postal_code,
              latitude: place.latitude,
              longitude: place.longitude,
            });
            // Clear errors for auto-filled fields
            setErrors({
              ...errors,
              line1: undefined,
              city: undefined,
              state: undefined,
              postal_code: undefined,
            });
          }}
          error={errors.line1}
          placeholder="123 Main Street"
          className={cn(errors.line1 && "border-[#FF5A5F] bg-[#FFF7F7]")}
        />
        {errors.line1 && (
          <p className="text-[10px] text-[#FF5A5F] mt-1">
            {errors.line1}
          </p>
        )}
      </div>

      {/* Map Preview */}
      {(formData.latitude && formData.longitude) || liveLocation ? (
        <div className="space-y-2">
          <Label className="text-sm font-medium text-gray-900">
            Address Preview
          </Label>
          <div className="rounded-lg overflow-hidden border border-gray-200">
            <BenjaminMap
              center={
                formData.latitude && formData.longitude
                  ? { lat: formData.latitude, lng: formData.longitude }
                  : liveLocation || { lat: 25.7617, lng: -80.1918 }
              }
              customerPosition={liveLocation || undefined}
              zoom={15}
              height="200px"
            />
          </div>
        </div>
      ) : null}

      <div className="space-y-2">
        <Label htmlFor="line2">{addAddressCopy.apt}</Label>
        <Input
          id="line2"
          name="line2"
          autoComplete="address-line2"
          placeholder="Apt 4B"
          value={formData.line2}
          onChange={(e) => setFormData({ ...formData, line2: e.target.value })}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="city">{addAddressCopy.city}</Label>
          <Input
            id="city"
            name="city"
            autoComplete="address-level2"
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
          <Label htmlFor="state">{addAddressCopy.state}</Label>
          <Input
            id="state"
            name="state"
            autoComplete="address-level1"
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
        <Label htmlFor="postal_code">{addAddressCopy.zip}</Label>
        <Input
          id="postal_code"
          name="postal_code"
          autoComplete="postal-code"
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
        <div className="space-y-1">
          <div className="flex items-center justify-between py-2">
            <Label className="text-sm font-medium text-gray-900 cursor-pointer" onClick={() => setShowDeliveryNotes(!showDeliveryNotes)}>
              {addAddressCopy.deliveryNotesTitle}
            </Label>
            <button
              type="button"
              onClick={() => setShowDeliveryNotes(!showDeliveryNotes)}
              className="flex items-center gap-2 text-gray-500 transition-colors"
            >
              {formData.delivery_notes && !showDeliveryNotes && (
                <span className="text-xs text-gray-500">
                  {formData.delivery_notes.length > 30 
                    ? `${formData.delivery_notes.substring(0, 30)}...` 
                    : formData.delivery_notes}
                </span>
              )}
              <div className="transition-transform duration-300 ease-in-out">
                {showDeliveryNotes ? (
                  <Minus className="h-4 w-4" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
              </div>
            </button>
          </div>
          <p className="text-xs text-gray-500">
            {addAddressCopy.deliveryNotesHint}
          </p>
        </div>
        
        <div
          className={cn(
            "overflow-hidden transition-all duration-300 ease-in-out",
            showDeliveryNotes ? "max-h-[500px] opacity-100" : "max-h-0 opacity-0"
          )}
        >
          <div className="space-y-2 pt-2">
            {/* Note Templates */}
            <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1 scroll-smooth">
              {DELIVERY_NOTES_TEMPLATES.map((template) => (
                <button
                  key={template}
                  type="button"
                  onClick={() => handleNoteTemplateClick(template)}
                  className="px-3 py-1.5 text-xs font-medium rounded-full border border-gray-300 bg-white text-gray-700 transition-colors whitespace-nowrap flex-shrink-0"
                >
                  {template}
                </button>
              ))}
            </div>
            
            <Textarea
              id="delivery_notes"
              placeholder={addAddressCopy.deliveryNotesPlaceholder}
              value={formData.delivery_notes}
              onChange={(e) => setFormData({ ...formData, delivery_notes: e.target.value })}
              rows={3}
              className="resize-none"
            />
            <p className="text-xs text-gray-500">
              {addAddressCopy.deliveryNotesFooter}
            </p>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between py-2">
        <Label htmlFor="is_default" className="text-sm font-medium text-gray-900 cursor-pointer">
          Make this my default address
        </Label>
        <Switch
          id="is_default"
          checked={formData.is_default}
          onCheckedChange={(checked) => 
            setFormData({ ...formData, is_default: checked })
          }
          className="data-[state=checked]:bg-[#22C55E]"
        />
      </div>
      </form>
    );
  }
);

AddressForm.displayName = "AddressForm";
