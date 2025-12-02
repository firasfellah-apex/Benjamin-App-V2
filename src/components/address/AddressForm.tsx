/// <reference path="../../global.d.ts" />

import React, { useState, useRef, forwardRef, useImperativeHandle, useEffect, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { createAddress, updateAddress } from "@/db/api";
import type { CustomerAddress } from "@/types/types";
import { cn } from "@/lib/utils";
import { IconPicker, ALL_ICONS } from "./IconPicker";
import { addAddressCopy } from "@/lib/copy/addAddress";
import { Plus, Minus } from "lucide-react";
import { AddressAutocomplete, type NormalizedAddress } from "./AddressAutocomplete";
import { BenjaminMap } from "@/components/maps/BenjaminMap";
import { useLocation } from "@/contexts/LocationContext";
import { useInvalidateAddresses } from "@/features/address/hooks/useCustomerAddresses";
import { hasGoogleMaps } from "@/lib/env";
import { useGoogleMaps } from "@/components/maps/GoogleMapsProvider";

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
  "Gate code:",
];

export const AddressForm = forwardRef<AddressFormRef, AddressFormProps>(
  ({ address, onSave }, ref) => {
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState<FormErrors>({});
    const formRef = useRef<HTMLFormElement>(null);
    const loadingCallbackRef = useRef<((loading: boolean) => void) | null>(null);
    const invalidateAddresses = useInvalidateAddresses();
    const deliveryNotesRef = useRef<HTMLDivElement>(null);
    
    // Delivery notes section - closed by default
    const [showDeliveryNotes, setShowDeliveryNotes] = useState(false);
    // Track if address has been selected from autocomplete to show additional fields
    // If editing an existing address, show fields immediately
    const [hasSelectedAddress, setHasSelectedAddress] = useState(!!address?.line1);
    // Track if user has manually moved the pin - if so, don't overwrite with geocoded coords
    const [pinManuallyMoved, setPinManuallyMoved] = useState(false);
    const [formData, setFormData] = useState({
      icon: address?.icon || 'Home',
      label: address?.label || "",
      line1: address?.line1 || "",
      line2: address?.line2 || "",
      city: address?.city || "",
      state: address?.state || "",
      postal_code: address?.postal_code || "",
      delivery_notes: address?.delivery_notes || "",
      is_default: false, // Default logic hidden for now
      latitude: address?.latitude || null,
      longitude: address?.longitude || null,
    });

    const { location: liveLocation } = useLocation();
    const { isReady, googleMaps } = useGoogleMaps();
    const geocoderRef = useRef<google.maps.Geocoder | null>(null);
    const geocodeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Initialize geocoder when Maps is ready
    useEffect(() => {
      if (isReady && googleMaps?.maps && !geocoderRef.current) {
        geocoderRef.current = new googleMaps.maps.Geocoder();
      }
    }, [isReady, googleMaps]);

    // Geocode address when line1, city, state, or postal_code changes
    const geocodeAddress = useCallback(async () => {
      // Only geocode if we have enough address info and Maps is available
      if (!isReady || !googleMaps || !geocoderRef.current) return;
      
      const hasLine1 = formData.line1.trim().length > 0;
      const hasCity = formData.city.trim().length > 0;
      const hasState = formData.state.trim().length > 0;
      const hasPostal = formData.postal_code.trim().length > 0;
      
      // Need at least line1 to attempt geocoding
      // More fields = better accuracy, but we'll try with just line1 if it looks complete
      if (!hasLine1) {
        return;
      }

      // Build address string for geocoding
      const addressParts = [
        formData.line1.trim(),
        formData.city.trim(),
        formData.state.trim(),
        formData.postal_code.trim(),
      ].filter(Boolean);
      
      const addressString = addressParts.join(", ");

      try {
        const results = await new Promise<google.maps.GeocoderResult[]>((resolve, reject) => {
          geocoderRef.current?.geocode(
            { address: addressString },
            (results, status) => {
              if (status === "OK" && results) {
                resolve(results);
              } else {
                // Don't reject - just silently fail if geocoding doesn't work
                resolve([]);
              }
            }
          );
        });

        if (results && results.length > 0) {
          const location = results[0].geometry.location;
          const latitude = location.lat();
          const longitude = location.lng();
          
          // Only update coordinates if user hasn't manually moved the pin
          // If pin was moved, pin coordinates take precedence over geocoded coordinates
          if (!pinManuallyMoved) {
            console.log('[ADDRESS_FORM] Using geocoded coordinates', {
              latitude,
              longitude,
              address: addressString,
            });
            setFormData(prev => ({
              ...prev,
              latitude,
              longitude,
            }));
          } else {
            console.log('[ADDRESS_FORM] Skipping geocoded coordinates - pin was manually moved', {
              geocodedLat: latitude,
              geocodedLng: longitude,
              pinLat: formData.latitude,
              pinLng: formData.longitude,
            });
          }
        }
      } catch (error) {
        // Silently fail - don't show error to user, just don't update map
        console.debug("Geocoding failed:", error);
      }
    }, [isReady, googleMaps, formData.line1, formData.city, formData.state, formData.postal_code]);

    // Debounced geocoding - wait 500ms after user stops typing
    useEffect(() => {
      // Clear existing timeout
      if (geocodeTimeoutRef.current) {
        clearTimeout(geocodeTimeoutRef.current);
      }

      // Geocode when user types in address line (line1) or other address fields
      // We'll attempt geocoding with just line1, or with line1 + other fields for better accuracy
      const hasLine1 = formData.line1.trim().length > 0;
      const hasOtherFields = formData.city.trim().length > 0 || 
                            formData.state.trim().length > 0 || 
                            formData.postal_code.trim().length > 0;
      
      // Geocode if we have line1 (with or without other fields)
      // This ensures map preview updates as user types
      if (hasLine1) {
        geocodeTimeoutRef.current = setTimeout(() => {
          geocodeAddress();
        }, 500);
      }

      return () => {
        if (geocodeTimeoutRef.current) {
          clearTimeout(geocodeTimeoutRef.current);
        }
      };
    }, [formData.line1, formData.city, formData.state, formData.postal_code, geocodeAddress]);

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
      // Log coordinate source for debugging
      const coordSource = pinManuallyMoved ? 'pin' : (formData.latitude && formData.longitude ? 'geocoded' : 'none');
      console.log('[ADDRESS_FORM] Submitting address', {
        hasAddress: !!address,
        latitude: formData.latitude,
        longitude: formData.longitude,
        coordSource,
        pinManuallyMoved,
      });

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
        
        // Update address fields (default logic hidden for now)
        const success = await updateAddress(address.id, updateFields);
        if (success) {
          invalidateAddresses(); // Invalidate query cache
          toast.success("Address saved");
          const updatedAddress: CustomerAddress = { 
            ...address, 
            ...updateFields,
            is_default: false // Always false for now
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
          latitude: formData.latitude ?? undefined,
          longitude: formData.longitude ?? undefined,
          is_default: false // Default logic hidden for now
        };
        
        const result = await createAddress(addressData);
        if (result) {
          // Default logic hidden for now - always create without default
          invalidateAddresses(); // Invalidate query cache
          toast.success("Address saved");
          onSave({ ...result, is_default: false });
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
    // Only update the icon, don't auto-fill the label
    setFormData({ ...formData, icon: iconName });
  };

  const handleLabelChange = (label: string) => {
    setFormData({ ...formData, label });
  };

    const handleNoteTemplateClick = (template: string) => {
      const currentNotes = formData.delivery_notes || "";
      const newNotes = currentNotes ? `${currentNotes}, ${template}` : template;
      setFormData({ ...formData, delivery_notes: newNotes });
    };

    // Auto-scroll to bottom of scrollable container when delivery notes is expanded
    useEffect(() => {
      if (showDeliveryNotes && deliveryNotesRef.current) {
        // Wait for expansion animation to start (150ms delay)
        const scrollTimeout = setTimeout(() => {
          if (!deliveryNotesRef.current) return;
          
          // Find the scrollable container by looking for overflow-y-auto or checking computed styles
          let scrollContainer: HTMLElement | null = deliveryNotesRef.current;
          while (scrollContainer) {
            const computedStyle = window.getComputedStyle(scrollContainer);
            if (computedStyle.overflowY === 'auto' || computedStyle.overflowY === 'scroll') {
              break;
            }
            scrollContainer = scrollContainer.parentElement;
            // Stop at body to avoid going too far up
            if (scrollContainer === document.body || scrollContainer === null) {
              scrollContainer = null;
              break;
            }
          }
          
          if (scrollContainer) {
            // Scroll to the absolute maximum bottom of the scrollable container
            scrollContainer.scrollTo({
              top: scrollContainer.scrollHeight,
              behavior: 'smooth'
            });
          }
        }, 150);
        
        return () => clearTimeout(scrollTimeout);
      }
    }, [showDeliveryNotes]);

    return (
      <form ref={formRef} onSubmit={handleSubmit} className="space-y-6">
      {/* Icon and Label Section */}
      <div className="space-y-3">
        <div className="space-y-1">
          <Label className="text-sm font-semibold text-gray-900">
            Address Label
          </Label>
          <p className="text-xs text-gray-500">
            Choose an icon and enter a label — you can edit it anytime.
          </p>
        </div>

        {/* Icon Picker and Label Input - Unified button design */}
        <div className="flex items-center gap-[3px]">
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
            className="flex-1 rounded-r-[12px] rounded-tl-none rounded-bl-none border border-slate-200 placeholder:text-slate-400 placeholder:font-light focus:border-[#22C55E] focus-visible:border-[#22C55E] focus:bg-green-50 focus-visible:ring-0 focus:placeholder:opacity-0"
          />
        </div>
      </div>

      {/* Address Section */}
      <div className="space-y-4">
        <div className="space-y-4">
          <div className="space-y-2">
            <AddressAutocomplete
              id="line1"
              name="line1"
              label={addAddressCopy.streetAddress}
              value={formData.line1}
              onChange={(value) => {
                setFormData({ ...formData, line1: value });
                if (errors.line1) setErrors({ ...errors, line1: undefined });
              }}
              onAddressSelected={(normalized: NormalizedAddress) => {
                // When place is selected from autocomplete, set all fields and coordinates
                // Only update coordinates if pin hasn't been manually moved
                const shouldUpdateCoords = !pinManuallyMoved && normalized.location;
                setFormData({
                  ...formData,
                  line1: normalized.streetLine1,
                  line2: normalized.streetLine2 || formData.line2,
                  city: normalized.city || formData.city,
                  state: normalized.state || formData.state,
                  postal_code: normalized.postalCode || formData.postal_code,
                  latitude: shouldUpdateCoords ? normalized.location.lat : formData.latitude,
                  longitude: shouldUpdateCoords ? normalized.location.lng : formData.longitude,
                });
                // Show additional fields after address is selected
                setHasSelectedAddress(true);
                // Clear errors for auto-filled fields
                setErrors({
                  ...errors,
                  line1: undefined,
                  city: undefined,
                  state: undefined,
                  postal_code: undefined,
                });
              }}
              onPlaceSelect={(place) => {
                // Legacy callback for backwards compatibility
                // Only update coordinates if pin hasn't been manually moved
                const shouldUpdateCoords = !pinManuallyMoved && place.latitude && place.longitude;
                setFormData({
                  ...formData,
                  line1: place.line1,
                  city: place.city,
                  state: place.state,
                  postal_code: place.postal_code,
                  latitude: shouldUpdateCoords ? place.latitude : formData.latitude,
                  longitude: shouldUpdateCoords ? place.longitude : formData.longitude,
                });
                // Show additional fields after address is selected
                setHasSelectedAddress(true);
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
              <p className="text-xs text-[#FF5A5F] mt-1">
                {errors.line1}
              </p>
            )}
          </div>

          {/* Show additional fields only after address is selected from autocomplete */}
          {hasSelectedAddress && (
            <>
              <div className="space-y-2">
                <Label htmlFor="line2" className="text-sm font-medium text-gray-900">{addAddressCopy.apt}</Label>
                <Input
                  id="line2"
                  name="line2"
                  autoComplete="address-line2"
                  placeholder="Apt 4B (optional)"
                  value={formData.line2}
                  onChange={(e) => setFormData({ ...formData, line2: e.target.value })}
                  className="border-slate-200 focus:border-[#22C55E] focus-visible:border-[#22C55E] focus:bg-green-50 focus-visible:ring-0"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="city" className="text-sm font-medium text-gray-900">{addAddressCopy.city}</Label>
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
                      "border-slate-200 focus:border-[#22C55E] focus-visible:border-[#22C55E] focus:bg-green-50 focus-visible:ring-0",
                      errors.city && "border-[#FF5A5F] bg-[#FFF7F7] focus:border-[#FF5A5F] focus-visible:border-[#FF5A5F] focus:bg-[#FFF7F7]"
                    )}
                  />
                  {errors.city && (
                    <p className="text-xs text-[#FF5A5F] mt-1">
                      {errors.city}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="state" className="text-sm font-medium text-gray-900">{addAddressCopy.state}</Label>
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
                      "border-slate-200 focus:border-[#22C55E] focus-visible:border-[#22C55E] focus:bg-green-50 focus-visible:ring-0",
                      errors.state && "border-[#FF5A5F] bg-[#FFF7F7] focus:border-[#FF5A5F] focus-visible:border-[#FF5A5F] focus:bg-[#FFF7F7]"
                    )}
                  />
                  {errors.state && (
                    <p className="text-xs text-[#FF5A5F] mt-1">
                      {errors.state}
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="postal_code" className="text-sm font-medium text-gray-900">{addAddressCopy.zip}</Label>
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
                      "border-slate-200 focus:border-[#22C55E] focus-visible:border-[#22C55E] focus:bg-green-50 focus-visible:ring-0",
                      errors.postal_code && "border-[#FF5A5F] bg-[#FFF7F7] focus:border-[#FF5A5F] focus-visible:border-[#FF5A5F] focus:bg-[#FFF7F7]"
                    )}
                />
                {errors.postal_code && (
                  <p className="text-xs text-[#FF5A5F] mt-1">
                    {errors.postal_code}
                  </p>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Map Preview */}
      {(formData.latitude && formData.longitude) || liveLocation || formData.line1.trim().length > 0 ? (
        <div className="space-y-3">
          <div className="space-y-1">
            <Label className="text-sm font-semibold text-gray-900">
              Address Preview
            </Label>
            <p className="text-xs text-gray-500">
              Move pin to exact location
            </p>
          </div>
          <div className="rounded-xl overflow-hidden border border-gray-200" style={{ height: "200px" }}>
            <BenjaminMap
              center={
                formData.latitude && formData.longitude
                  ? { lat: formData.latitude, lng: formData.longitude }
                  : liveLocation || { lat: 25.7617, lng: -80.1918 }
              }
              zoom={20}
              className="h-full"
              marker={
                formData.latitude && formData.longitude
                  ? { lat: formData.latitude, lng: formData.longitude }
                  : null
              }
              minimal={false}
              draggable={true}
              onMarkerDrag={(position) => {
                console.log('[ADDRESS_FORM] Pin manually moved', {
                  latitude: position.lat,
                  longitude: position.lng,
                });
                setPinManuallyMoved(true);
                setFormData(prev => ({
                  ...prev,
                  latitude: position.lat,
                  longitude: position.lng,
                }));
              }}
            />
          </div>
        </div>
      ) : null}

      {/* Delivery Notes Section */}
      <div className="space-y-3">
        <button
          type="button"
          onClick={() => setShowDeliveryNotes(!showDeliveryNotes)}
          className="w-full flex items-center justify-between transition-colors touch-manipulation rounded-lg -mx-1 px-1 py-1"
          aria-label={showDeliveryNotes ? "Hide delivery notes" : "Show delivery notes"}
        >
          <div className="space-y-1 text-left">
            <Label className="text-sm font-semibold text-gray-900 cursor-pointer pointer-events-none">
              {addAddressCopy.deliveryNotesTitle}
            </Label>
            <p className="text-xs text-gray-500 pointer-events-none">
              {addAddressCopy.deliveryNotesHint}
            </p>
          </div>
          <div className="ml-4 text-gray-500 flex-shrink-0 pointer-events-none">
            {showDeliveryNotes ? (
              <Minus className="h-5 w-5" />
            ) : (
              <Plus className="h-5 w-5" />
            )}
          </div>
        </button>
        
        {formData.delivery_notes && !showDeliveryNotes && (
          <div className="px-4 py-2 bg-gray-50 rounded-lg border border-gray-200">
            <p className="text-sm text-gray-700">
              {formData.delivery_notes.length > 50 
                ? `${formData.delivery_notes.substring(0, 50)}...` 
                : formData.delivery_notes}
            </p>
          </div>
        )}
        
        <div
          ref={deliveryNotesRef}
          className={cn(
            "overflow-hidden transition-all duration-300 ease-in-out",
            showDeliveryNotes ? "max-h-[500px] opacity-100" : "max-h-0 opacity-0"
          )}
        >
          <div className="space-y-3 pt-2">
            {/* Note Templates */}
            <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1 scroll-smooth">
              {DELIVERY_NOTES_TEMPLATES.map((template) => (
                <button
                  key={template}
                  type="button"
                  onClick={() => handleNoteTemplateClick(template)}
                  className="px-3 py-1.5 text-xs font-medium rounded-full border border-gray-300 bg-white text-gray-700 hover:border-gray-400 hover:bg-gray-50 transition-colors whitespace-nowrap flex-shrink-0 touch-manipulation"
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
              className="resize-none rounded-xl border-slate-200 placeholder:text-slate-400 placeholder:font-light focus:border-[#22C55E] focus-visible:border-[#22C55E] focus:bg-green-50 focus-visible:ring-0 focus:placeholder:opacity-0"
            />
            <p className="text-xs text-gray-500">
              {addAddressCopy.deliveryNotesFooter}
            </p>
          </div>
        </div>
      </div>

      {/* Default Address Toggle - Hidden for now, logic preserved for future use */}
      {false && (
        <div className="flex items-center justify-between py-3 px-1 border-t border-gray-100">
          <div className="space-y-0.5">
            <Label htmlFor="is_default" className="text-sm font-semibold text-gray-900 cursor-pointer">
              Make this my default address
            </Label>
            <p className="text-xs text-gray-500">
              Use this address for future deliveries
            </p>
          </div>
          <Switch
            id="is_default"
            checked={formData.is_default}
            onCheckedChange={(checked) => 
              setFormData({ ...formData, is_default: checked })
            }
            className="data-[state=checked]:bg-[#22C55E]"
          />
        </div>
      )}
      </form>
    );
  }
);

AddressForm.displayName = "AddressForm";
