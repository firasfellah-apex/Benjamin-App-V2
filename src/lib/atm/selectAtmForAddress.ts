/**
 * ATM Selection Helper
 * 
 * Selects the best ATM for a given delivery address.
 * Uses cached preferences when available, otherwise finds nearest ATM.
 */

import { supabase } from '@/db/supabase';

export type AtmSelectionInput = {
  customerAddressId: string;
  addressLat: number;
  addressLng: number;
};

export type AtmSelectionResult = {
  atmId: string;
  atmName: string;
  atmAddress: string;
  atmLat: number;
  atmLng: number;
  distanceMeters: number;
};

/**
 * Calculate distance between two points using Haversine formula
 * Returns distance in meters
 */
function haversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371000; // Earth radius in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Select the best ATM for a delivery address
 */
export async function selectAtmForAddress(
  input: AtmSelectionInput
): Promise<AtmSelectionResult> {
  const { customerAddressId, addressLat, addressLng } = input;

  // Step 1: Try to use cached preference for this address
  const { data: preferences, error: prefError } = await supabase
    .from('address_atm_preferences')
    .select('atm_id, times_used, last_used_at')
    .eq('customer_address_id', customerAddressId)
    .order('times_used', { ascending: false })
    .order('last_used_at', { ascending: false });

  if (!prefError && preferences && preferences.length > 0) {
    // Fetch ATM details for each preference and find the first active one
    for (const pref of preferences) {
      const { data: atm, error: atmError } = await supabase
        .from('atm_locations')
        .select('id, name, address, lat, lng, status')
        .eq('id', pref.atm_id)
        .eq('status', 'active')
        .maybeSingle();

      if (!atmError && atm) {
        const distanceMeters = haversineDistance(
          addressLat,
          addressLng,
          atm.lat,
          atm.lng
        );

        // Update last_used_at and increment times_used
        await supabase
          .from('address_atm_preferences')
          .update({
            times_used: (pref.times_used || 0) + 1,
            last_used_at: new Date().toISOString(),
          })
          .eq('customer_address_id', customerAddressId)
          .eq('atm_id', atm.id);

        return {
          atmId: atm.id,
          atmName: atm.name,
          atmAddress: atm.address || '',
          atmLat: atm.lat,
          atmLng: atm.lng,
          distanceMeters: Math.round(distanceMeters),
        };
      }
    }
  }

  // Step 2: No active preference found, find nearest ATM
  // Query active ATMs and calculate distance
  const { data: atms, error: atmError } = await supabase
    .from('atm_locations')
    .select('id, name, address, lat, lng')
    .eq('status', 'active')
    .limit(100); // Get a reasonable sample

  if (atmError || !atms || atms.length === 0) {
    throw new Error('No active ATMs found in database. Please run the import script first.');
  }

  // Calculate distance for each ATM and sort
  const atmsWithDistance = atms
    .map(atm => ({
      ...atm,
      distanceMeters: haversineDistance(
        addressLat,
        addressLng,
        atm.lat,
        atm.lng
      ),
    }))
    .sort((a, b) => a.distanceMeters - b.distanceMeters);

  // Pick the closest ATM
  const selectedAtm = atmsWithDistance[0];

  // Step 3: Cache the choice for this address
  const { error: upsertError } = await supabase
    .from('address_atm_preferences')
    .upsert(
      {
        customer_address_id: customerAddressId,
        atm_id: selectedAtm.id,
        times_used: 1,
        last_used_at: new Date().toISOString(),
      },
      {
        onConflict: 'customer_address_id,atm_id',
      }
    );

  if (upsertError) {
    console.warn('[selectAtmForAddress] Failed to cache preference:', upsertError);
    // Don't throw - this is non-critical
  }

  return {
    atmId: selectedAtm.id,
    atmName: selectedAtm.name,
    atmAddress: selectedAtm.address || '',
    atmLat: selectedAtm.lat,
    atmLng: selectedAtm.lng,
    distanceMeters: Math.round(selectedAtm.distanceMeters),
  };
}

