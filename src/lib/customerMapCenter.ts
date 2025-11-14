// src/lib/customerMapCenter.ts

export type LatLngLiteral = { lat: number; lng: number };

interface AddressLike {
  location?: { lat: number; lng: number } | null;
  latitude?: number | null;
  longitude?: number | null;
}

interface MapCenterOptions {
  selectedAddress?: AddressLike | null;
  activeOrderAddress?: AddressLike | null;
  primaryAddress?: AddressLike | null;
  geoLocation?: LatLngLiteral | null;
}

export const DEFAULT_MIAMI_CENTER: LatLngLiteral = {
  lat: 25.7617,
  lng: -80.1918,
};

/**
 * Normalize address to location format
 */
function normalizeAddressLocation(address: AddressLike | null | undefined): LatLngLiteral | null {
  if (!address) return null;
  
  // Try location object first
  if (address.location?.lat && address.location?.lng) {
    return address.location;
  }
  
  // Try latitude/longitude properties
  if (address.latitude && address.longitude) {
    return {
      lat: address.latitude,
      lng: address.longitude,
    };
  }
  
  return null;
}

export function computeCustomerMapCenter(opts: MapCenterOptions): LatLngLiteral {
  const {
    selectedAddress,
    activeOrderAddress,
    primaryAddress,
    geoLocation,
  } = opts;

  // 1) Explicit selected address from UI (carousel / current step)
  const selectedLoc = normalizeAddressLocation(selectedAddress);
  if (selectedLoc) return selectedLoc;

  // 2) Active order's address (during confirm amount / tracking)
  const activeOrderLoc = normalizeAddressLocation(activeOrderAddress);
  if (activeOrderLoc) return activeOrderLoc;

  // 3) Default / primary address on file
  const primaryLoc = normalizeAddressLocation(primaryAddress);
  if (primaryLoc) return primaryLoc;

  // 4) Browser geolocation
  if (geoLocation) return geoLocation;

  // 5) Fallback to a sensible city center (Miami)
  return DEFAULT_MIAMI_CENTER;
}

