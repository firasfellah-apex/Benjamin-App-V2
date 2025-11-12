/**
 * AddressAutocomplete Component
 * 
 * Google Maps Places Autocomplete for street address input.
 * Automatically fills city, state, and ZIP when address is selected.
 * Geocodes the address to get lat/lng for map display.
 * 
 * NOTE: Uses deprecated google.maps.places.Autocomplete API.
 * Google recommends migrating to PlaceAutocompleteElement (web component).
 * Current API still works but is deprecated for new customers as of March 2025.
 * TODO: Migrate to PlaceAutocompleteElement when @react-google-maps/api supports it.
 */

import React, { useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { googleMapsApiKey, hasGoogleMaps } from "@/lib/env";
import { Autocomplete } from "@react-google-maps/api";

interface AddressAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onPlaceSelect: (place: {
    line1: string;
    city: string;
    state: string;
    postal_code: string;
    latitude: number;
    longitude: number;
  }) => void;
  error?: string;
  placeholder?: string;
  id?: string;
  name?: string;
  className?: string;
}

export function AddressAutocomplete({
  value,
  onChange,
  onPlaceSelect,
  error,
  placeholder = "123 Main Street",
  id = "line1",
  name = "line1",
  className,
}: AddressAutocompleteProps) {
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const geocoderRef = useRef<google.maps.Geocoder | null>(null);
  
  // Check if Maps is ready (provided by GoogleMapsProvider)
  const mapsReady = typeof window !== "undefined" && !!(window as any).google?.maps;

  const handlePlaceChanged = () => {
    const place = autocompleteRef.current?.getPlace();
    if (!place || !place.geometry) return;

    // Extract address components
    const addressComponents = place.address_components || [];
    let line1 = "";
    let city = "";
    let state = "";
    let postal_code = "";

    addressComponents.forEach((component) => {
      const types = component.types;
      
      if (types.includes("street_number")) {
        line1 = component.long_name + " ";
      }
      if (types.includes("route")) {
        line1 += component.long_name;
      }
      if (types.includes("locality")) {
        city = component.long_name;
      }
      if (types.includes("administrative_area_level_1")) {
        state = component.short_name;
      }
      if (types.includes("postal_code")) {
        postal_code = component.long_name;
      }
    });

    // Fallback to formatted_address if components are missing
    if (!line1 && place.formatted_address) {
      line1 = place.formatted_address.split(",")[0] || "";
    }

    const location = place.geometry.location;
    const latitude = location?.lat() || 0;
    const longitude = location?.lng() || 0;

    // Update form with selected place data
    onPlaceSelect({
      line1: line1.trim(),
      city,
      state,
      postal_code,
      latitude,
      longitude,
    });

    // Update the input value
    onChange(line1.trim());
  };

  const onLoad = (autocomplete: google.maps.places.Autocomplete) => {
    autocompleteRef.current = autocomplete;
    autocomplete.addListener("place_changed", handlePlaceChanged);
  };

  // Initialize geocoder when Maps is ready
  useEffect(() => {
    if (mapsReady && !geocoderRef.current) {
      geocoderRef.current = new (window as any).google.maps.Geocoder();
    }
  }, [mapsReady]);

  // If no Google Maps, fall back to regular input
  if (!hasGoogleMaps) {
    return (
      <Input
        id={id}
        name={name}
        autoComplete="street-address"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(error && "border-[#FF5A5F] bg-[#FFF7F7]", className)}
      />
    );
  }

  // If Maps not ready yet, show loading state
  if (!mapsReady) {
    return (
      <Input
        id={id}
        name={name}
        autoComplete="street-address"
        placeholder="Loading address autocomplete..."
        value={value}
        disabled
        className={cn(error && "border-[#FF5A5F] bg-[#FFF7F7]", className, "opacity-60")}
      />
    );
  }

  return (
    <Autocomplete
      onLoad={onLoad}
      options={{
        types: ["address"],
        componentRestrictions: { country: "us" },
      }}
    >
      <Input
        id={id}
        name={name}
        autoComplete="street-address"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(error && "border-[#FF5A5F] bg-[#FFF7F7]", className)}
      />
    </Autocomplete>
  );
}

