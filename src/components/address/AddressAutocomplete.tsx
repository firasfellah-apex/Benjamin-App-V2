/**
 * AddressAutocomplete Component
 * 
 * Google Maps Places (New) Autocomplete for street address input.
 * Shows type-ahead suggestions dropdown while typing.
 * Uses Places AutocompleteService + PlacesService (New API).
 */

import React, { useState, useEffect, useRef, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { hasGoogleMaps } from "@/lib/env";
import { useGoogleMaps } from "@/components/maps/GoogleMapsProvider";

export interface NormalizedAddress {
  formattedAddress: string;
  streetLine1: string;
  streetLine2?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  location?: {
    lat: number;
    lng: number;
  };
}

interface AddressAutocompleteProps {
  value: string;
  onChange: (value: string) => void;          // typed text
  onAddressSelected: (addr: NormalizedAddress) => void; // called when user picks a suggestion
  onPlaceSelect?: (place: {
    line1: string;
    city: string;
    state: string;
    postal_code: string;
    latitude: number;
    longitude: number;
  }) => void; // Legacy prop for backwards compatibility
  error?: string;
  placeholder?: string;
  label?: string;
  id?: string;
  name?: string;
  className?: string;
  disabled?: boolean;
}

interface Suggestion {
  description: string;
  placeId: string;
  structuredFormatting?: {
    main_text: string;
    secondary_text?: string;
  } | {
    mainText: string;
    secondaryText?: string;
  };
}

/**
 * Normalize address components from Places API into our format
 */
function normalizeAddressComponents(
  addressComponents: any[] | undefined,
  formattedAddress: string
): NormalizedAddress {
  const normalized: NormalizedAddress = {
    formattedAddress: formattedAddress || '',
    streetLine1: '',
  };

  if (!addressComponents) {
    // Fallback: use first part of formatted address as street
    normalized.streetLine1 = formattedAddress.split(',')[0] || formattedAddress;
    return normalized;
  }

  let streetNumber = '';
  let route = '';

  addressComponents.forEach((component) => {
    const types = component.types;
    
    if (types.includes('street_number')) {
      streetNumber = component.long_name;
    }
    if (types.includes('route')) {
      route = component.long_name;
    }
    if (types.includes('locality') || types.includes('sublocality')) {
      normalized.city = component.long_name;
    }
    if (types.includes('administrative_area_level_1')) {
      normalized.state = component.short_name;
    }
    if (types.includes('postal_code')) {
      normalized.postalCode = component.long_name;
    }
    if (types.includes('country')) {
      normalized.country = component.short_name;
    }
    if (types.includes('subpremise')) {
      normalized.streetLine2 = component.long_name;
    }
  });

  // Build streetLine1: "123 Main St" or just "Main St"
  normalized.streetLine1 = [streetNumber, route].filter(Boolean).join(' ').trim();
  
  // Fallback if we couldn't build streetLine1
  if (!normalized.streetLine1) {
    normalized.streetLine1 = formattedAddress.split(',')[0] || formattedAddress;
  }

  return normalized;
}

export function AddressAutocomplete({
  value,
  onChange,
  onAddressSelected,
  onPlaceSelect, // Legacy prop
  error,
  placeholder = "123 Main Street",
  label,
  id = "line1",
  name = "line1",
  className,
  disabled = false,
}: AddressAutocompleteProps) {
  const { isReady, googleMaps } = useGoogleMaps();
  
  // Create service instances - memoized to prevent recreation
  const autocompleteServiceRef = useRef<any | null>(null);
  const placesServiceRef = useRef<any | null>(null);
  
  // Get or create AutocompleteService
  const getPlacesAutocompleteService = useCallback(() => {
    if (!isReady || !googleMaps?.maps?.places) {
      return null;
    }
    if (!autocompleteServiceRef.current) {
      autocompleteServiceRef.current = new googleMaps.maps.places.AutocompleteService();
    }
    return autocompleteServiceRef.current;
  }, [isReady, googleMaps]);

  // Get or create PlacesService
  const getPlacesDetailsService = useCallback(() => {
    if (!isReady || !googleMaps?.maps?.places) {
      return null;
    }
    if (!placesServiceRef.current) {
      // PlacesService needs a map instance, but we can create a dummy div for it
      const dummyDiv = document.createElement('div');
      placesServiceRef.current = new googleMaps.maps.places.PlacesService(dummyDiv);
    }
    return placesServiceRef.current;
  }, [isReady, googleMaps]);
  const [query, setQuery] = useState(value);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [sessionToken, setSessionToken] = useState<any | null>(null);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync query with value prop
  useEffect(() => {
    setQuery(value);
  }, [value]);

  // Create session token when component mounts
  useEffect(() => {
    if (isReady && googleMaps?.maps?.places) {
      setSessionToken(new googleMaps.maps.places.AutocompleteSessionToken());
    }
  }, [isReady, googleMaps]);

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        // Don't blur the input - let onBlur handle that
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  // Fetch suggestions with debounce
  const fetchSuggestions = useCallback((searchQuery: string) => {
    if (!isReady || !searchQuery.trim() || searchQuery.length < 3) {
      setSuggestions([]);
      setIsOpen(false);
      return;
    }

    const service = getPlacesAutocompleteService();
    if (!service) {
      return;
    }

    // Preserve focus state before async operation
    const wasFocused = document.activeElement === inputRef.current;

    setIsLoading(true);

    service.getPlacePredictions(
      {
        input: searchQuery,
        sessionToken: sessionToken || undefined,
        types: ['address'],
        componentRestrictions: { country: ['us'] },
      },
      (results: any[], status: string) => {
        setIsLoading(false);
        
        if (status === 'OK' && results) {
          const formatted: Suggestion[] = results.map((prediction: any) => ({
            description: prediction.description,
            placeId: prediction.place_id,
            structuredFormatting: prediction.structured_formatting,
          }));
          setSuggestions(formatted);
          setIsOpen(true);
          
          // Restore focus if it was focused before
          if (wasFocused && inputRef.current) {
            requestAnimationFrame(() => {
              inputRef.current?.focus();
            });
          }
        } else {
          setSuggestions([]);
          setIsOpen(false);
        }
      }
    );
  }, [isReady, getPlacesAutocompleteService, sessionToken]);

  // Debounced input handler
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setQuery(newValue);
    onChange(newValue);

    // Clear existing timeout
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    // Debounce API call
    debounceTimeoutRef.current = setTimeout(() => {
      if (isReady && hasGoogleMaps) {
        // Preserve focus before fetching suggestions
        const wasFocused = document.activeElement === inputRef.current;
        fetchSuggestions(newValue);
        // Restore focus if it was focused before
        if (wasFocused && inputRef.current) {
          // Use requestAnimationFrame to ensure DOM is updated
          requestAnimationFrame(() => {
            inputRef.current?.focus();
          });
        }
      }
    }, 300);
  };

  // Handle suggestion selection
  const handleSelectSuggestion = useCallback(async (suggestion: Suggestion) => {
    setIsOpen(false);
    setQuery(suggestion.description);
    onChange(suggestion.description);
    
    // Blur input after selection (user has chosen an address)
    if (inputRef.current) {
      inputRef.current.blur();
    }

    const detailsService = getPlacesDetailsService();
    if (!detailsService) {
      return;
    }

    setIsLoading(true);

    detailsService.getDetails(
      {
        placeId: suggestion.placeId,
        fields: [
          'formatted_address',
          'address_components',
          'geometry',
        ],
        sessionToken: sessionToken || undefined,
      },
      (place: any, status: string) => {
        setIsLoading(false);

        if (status === 'OK' && place) {
          const normalized = normalizeAddressComponents(
            place.address_components,
            place.formatted_address || ''
          );

          // Extract location
          if (place.geometry?.location) {
            const location = place.geometry.location;
            // Handle both LatLng (has methods) and LatLngLiteral (has properties) types
            let lat: number;
            let lng: number;
            
            // Check if lat is a function (LatLng object) or a number (LatLngLiteral)
            const latValue = (location as any).lat;
            const lngValue = (location as any).lng;
            
            if (typeof latValue === 'function') {
              lat = latValue();
              lng = lngValue();
            } else if (typeof latValue === 'number' && typeof lngValue === 'number') {
              lat = latValue;
              lng = lngValue;
            } else {
              // Skip if we can't extract valid coordinates
              lat = 0;
              lng = 0;
            }
            
            if (typeof lat === 'number' && typeof lng === 'number' && !isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0) {
              normalized.location = { lat, lng };
            }
          }

          // Call new callback
          onAddressSelected(normalized);

          // Call legacy callback for backwards compatibility
          if (onPlaceSelect) {
            onPlaceSelect({
              line1: normalized.streetLine1,
              city: normalized.city || '',
              state: normalized.state || '',
              postal_code: normalized.postalCode || '',
              latitude: normalized.location?.lat || 0,
              longitude: normalized.location?.lng || 0,
            });
          }

          // Create new session token for next search
          if (typeof window !== 'undefined' && (window as any).google?.maps?.places) {
            setSessionToken(new (window as any).google.maps.places.AutocompleteSessionToken());
          }
        }
      }
    );
  }, [getPlacesDetailsService, sessionToken, onChange, onAddressSelected, onPlaceSelect]);

  // If no Google Maps, fall back to regular input
  if (!hasGoogleMaps) {
    return (
      <div className="space-y-2">
        {label && <Label htmlFor={id}>{label}</Label>}
        <Input
          id={id}
          name={name}
          autoComplete="street-address"
          placeholder={placeholder}
          value={query}
          onChange={handleInputChange}
          disabled={disabled}
          className={cn("h-11 rounded-xl border-slate-200 placeholder:text-slate-400 placeholder:font-light focus:border-[#22C55E] focus-visible:border-[#22C55E] focus:bg-green-50 focus-visible:ring-0 focus:placeholder:opacity-0", error && "border-[#FF5A5F] bg-[#FFF7F7] focus:border-[#FF5A5F] focus-visible:border-[#FF5A5F] focus:bg-[#FFF7F7]", className)}
        />
      </div>
    );
  }

  // If Maps not ready yet, allow typing but show loading indicator
  if (!isReady) {
    return (
      <div className="space-y-2">
        {label && <Label htmlFor={id}>{label}</Label>}
        <Input
          id={id}
          name={name}
          autoComplete="street-address"
          placeholder={placeholder}
          value={query}
          onChange={handleInputChange}
          disabled={disabled}
          className={cn("h-11 rounded-xl border-slate-200 placeholder:text-slate-400 placeholder:font-light focus:border-[#22C55E] focus-visible:border-[#22C55E] focus:bg-green-50 focus-visible:ring-0 focus:placeholder:opacity-0", error && "border-[#FF5A5F] bg-[#FFF7F7] focus:border-[#FF5A5F] focus-visible:border-[#FF5A5F] focus:bg-[#FFF7F7]", className)}
        />
        <p className="text-xs text-gray-500">Loading address autocomplete...</p>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative space-y-2">
      {label && <Label htmlFor={id}>{label}</Label>}
      <div className="relative">
        <Input
          ref={inputRef}
          id={id}
          name={name}
          autoComplete="off"
          placeholder={placeholder}
          value={query}
          onChange={handleInputChange}
          onFocus={() => {
            // Keep input focused and show suggestions if available
            if (suggestions.length > 0) {
              setIsOpen(true);
            }
            // Also fetch suggestions if query is long enough
            if (query.length >= 3 && isReady && hasGoogleMaps) {
              fetchSuggestions(query);
            }
          }}
          onBlur={() => {
            // Only close dropdown if clicking outside the container
            // Use setTimeout to allow click events on suggestions to fire first
            setTimeout(() => {
              if (containerRef.current && !containerRef.current.contains(document.activeElement)) {
                setIsOpen(false);
              }
            }, 200);
          }}
          disabled={disabled}
              className={cn(
            "h-11 rounded-[12px] border-slate-200 placeholder:text-slate-400 placeholder:font-light focus:border-[#22C55E] focus-visible:border-[#22C55E] focus:bg-green-50 focus-visible:ring-0 focus:placeholder:opacity-0",
            error && "border-[#FF5A5F] bg-[#FFF7F7] focus:border-[#FF5A5F] focus-visible:border-[#FF5A5F] focus:bg-[#FFF7F7]",
            className
          )}
        />

        {/* Suggestions Dropdown */}
        {isOpen && (suggestions.length > 0 || isLoading) && (
          <div className="absolute z-50 w-full mt-1 bg-white rounded-lg shadow-lg border border-gray-200 max-h-60 overflow-y-auto">
            {isLoading ? (
              <div className="px-4 py-3 text-sm text-gray-500">Loading suggestions...</div>
            ) : (
              suggestions.map((suggestion, index) => (
                <button
                  key={suggestion.placeId}
                  type="button"
                  onMouseDown={(e) => {
                    // Prevent input blur before click
                    e.preventDefault();
                    handleSelectSuggestion(suggestion);
                  }}
                  className={cn(
                    "w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors",
                    index !== suggestions.length - 1 && "border-b border-gray-100"
                  )}
                >
                  <div className="font-medium text-gray-900">
                    {(suggestion.structuredFormatting && 'mainText' in suggestion.structuredFormatting 
                      ? suggestion.structuredFormatting.mainText 
                      : suggestion.description) || suggestion.description}
                  </div>
                  {suggestion.structuredFormatting && 'secondaryText' in suggestion.structuredFormatting && suggestion.structuredFormatting.secondaryText && (
                    <div className="text-sm text-gray-500 mt-0.5">
                      {suggestion.structuredFormatting.secondaryText}
                    </div>
                  )}
                </button>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
