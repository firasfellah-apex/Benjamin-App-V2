/**
 * ATM Selection with Scoring
 * 
 * CURRENT BEHAVIOR (OLD):
 * - File: src/lib/atm/selectAtmForAddress.ts
 * - Function: selectAtmForAddress()
 * - Logic: Pure nearest-by-distance (Haversine), no scoring
 * - Called from: src/db/api.ts createOrder() function
 * - Problem: Picks closest ATM regardless of quality (e.g., Exxon gas station ATMs)
 * 
 * NEW BEHAVIOR:
 * - Uses scoring algorithm to prefer major banks over gas stations
 * - Checks cached preferences first
 * - Falls back to scored selection if no preference exists
 * - Uses regular Supabase client (RLS-safe: atm_locations is public, preferences are owner-only)
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { supabase } from '@/db/supabase';

export interface AtmCandidate {
  id: string;
  name: string | null;
  address: string | null;
  city: string | null;
  lat: number;
  lng: number;
  is_in_branch: boolean | null;
  is_in_store: boolean | null;
  open_24h: boolean | null;
  distance_m: number;
  score: number;
}

// Helper type for ATM location row from database
interface AtmLocationRow {
  id: string;
  name: string | null;
  address: string | null;
  city: string | null;
  lat: number;
  lng: number;
  is_in_branch: boolean | null;
  is_in_store: boolean | null;
  open_24h: boolean | null;
  status: string | null;
}

export interface AtmSelectionResult {
  atmId: string;
  atmName: string | null;
  atmAddress: string | null;
  atmLat: number;
  atmLng: number;
  distanceMeters: number;
  score?: number;
}

/**
 * Get Supabase client for ATM selection
 * 
 * Note: We use the regular client (not service role) because:
 * - atm_locations table has public SELECT access (RLS allows all)
 * - address_atm_preferences has owner-only RLS (users can only access their own)
 * - This is more secure than exposing service role key in client code
 */
function getSupabaseClient(): SupabaseClient {
  // Use the regular Supabase client from the app
  // This respects RLS: atm_locations is public, address_atm_preferences is owner-only
  return supabase;
}

/**
 * Select the best ATM for a delivery address using scoring algorithm
 * 
 * Scoring Philosophy:
 * - Prefer major banks (Chase, Wells Fargo, Bank of America, etc.) over gas stations
 * - Prefer ATMs in bank branches over standalone machines
 * - Avoid Bitcoin/crypto ATMs and sketchy store ATMs
 * - Balance quality with distance (closer is better, but quality matters more)
 */
export async function selectBestAtmForAddress(
  opts: {
    addressId: string;
    addressLat: number;
    addressLng: number;
  }
): Promise<AtmSelectionResult | null> {
  const { addressId, addressLat, addressLng } = opts;
  const supabase = getSupabaseClient();

  // Guard: Ensure coordinates are present and valid
  if (!addressLat || !addressLng || typeof addressLat !== 'number' || typeof addressLng !== 'number') {
    console.error('[ATM_SELECTION] Address missing coordinates', {
      addressId,
      addressLat,
      addressLng,
      latType: typeof addressLat,
      lngType: typeof addressLng,
    });
    // Throw an error so we don't silently pick a garbage ATM
    throw new Error(`Address ${addressId} is missing valid coordinates (lat: ${addressLat}, lng: ${addressLng})`);
  }

  console.log('[ATM_SELECTION] start', { 
    addressId, 
    addressLat, 
    addressLng 
  });

  // Step 1: Check for existing preference
  const { data: preference, error: prefError } = await supabase
    .from('address_atm_preferences')
    .select('atm_id')
    .eq('customer_address_id', addressId)
    .order('times_used', { ascending: false })
    .order('last_used_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!prefError && preference) {
    // Fetch the preferred ATM and verify it's still active
    const { data: atm, error: atmError } = await supabase
      .from('atm_locations')
      .select('id, name, address, city, lat, lng, is_in_branch, is_in_store, open_24h, status')
      .eq('id', preference.atm_id)
      .eq('status', 'active')
      .maybeSingle();

    if (!atmError && atm) {
      // Validate cached preference is bank-quality (reject bad cached preferences)
      const atmRow: AtmLocationRow = {
        id: atm.id,
        name: atm.name,
        address: atm.address,
        city: atm.city || null,
        lat: atm.lat,
        lng: atm.lng,
        is_in_branch: atm.is_in_branch,
        is_in_store: atm.is_in_store,
        open_24h: atm.open_24h,
        status: atm.status,
      };
      
      const isGoodAtm = isBankQuality(atmRow);
      
      if (!isGoodAtm) {
        console.warn('[ATM_SELECTION] Cached preference is not bank-quality, recomputing:', {
          addressId,
          cachedAtmId: atm.id,
          cachedAtmName: atm.name,
        });
        // Delete the bad preference so we recompute
        await supabase
          .from('address_atm_preferences')
          .delete()
          .eq('customer_address_id', addressId)
          .eq('atm_id', atm.id);
        // Fall through to recompute selection
      } else {
        // Calculate distance
        const distanceMeters = calculateDistance(addressLat, addressLng, atm.lat, atm.lng);
        
        // Update usage stats - increment times_used
        const { data: currentPref } = await supabase
          .from('address_atm_preferences')
          .select('times_used')
          .eq('customer_address_id', addressId)
          .eq('atm_id', atm.id)
          .maybeSingle();
        
        await supabase
          .from('address_atm_preferences')
          .update({
            times_used: (currentPref?.times_used || 0) + 1,
            last_used_at: new Date().toISOString(),
          })
          .eq('customer_address_id', addressId)
          .eq('atm_id', atm.id);

        console.info('[ATM_SELECTION] Using cached preference (bank-quality):', {
          addressId,
          atmId: atm.id,
          atmName: atm.name,
          distanceMeters: Math.round(distanceMeters),
        });

        return {
          atmId: atm.id,
          atmName: atm.name,
          atmAddress: atm.address,
          atmLat: atm.lat,
          atmLng: atm.lng,
          distanceMeters: Math.round(distanceMeters),
        };
      }
    }
  }

  // Step 2: Find best ATM using bank-first strategy
  // Try 4km for banks first, then expand if needed
  const MAX_BANK_RADIUS_METERS = 4000; // 4km "good bank" window
  const MAX_SEARCH_RADIUS_METERS = 10000; // 10km max search radius
  
  // Get all candidates within max search radius
  const allCandidates = await findScoredAtms(
    supabase,
    addressLat,
    addressLng,
    MAX_SEARCH_RADIUS_METERS
  );

  console.log('[ATM_SELECTION] candidates', { 
    count: allCandidates.length,
    maxRadius: MAX_SEARCH_RADIUS_METERS,
    searchCenter: { lat: addressLat, lng: addressLng },
  });
  
  // Debug: If we have very few candidates, log why
  if (allCandidates.length < 50) {
    console.warn('[ATM_SELECTION][DEBUG] Low candidate count - checking distance distribution', {
      candidateCount: allCandidates.length,
      distances: allCandidates.slice(0, 10).map(c => ({
        name: c.name,
        distance: Math.round(c.distance_m),
      })),
    });
  }

  if (allCandidates.length === 0) {
    console.warn('[ATM_SELECTION] No ATMs found within search radius');
    return null;
  }

  // Split into nearby candidates (within bank radius) and all candidates
  const nearbyCandidates = allCandidates.filter((c) => c.distance_m <= MAX_BANK_RADIUS_METERS);
  
  // Split into bank-quality vs fallback
  const nearbyBankAtms = nearbyCandidates.filter((c) => {
    const atmRow: AtmLocationRow = {
      id: c.id,
      name: c.name,
      address: c.address,
      city: c.city,
      lat: c.lat,
      lng: c.lng,
      is_in_branch: c.is_in_branch,
      is_in_store: c.is_in_store,
      open_24h: c.open_24h,
      status: 'active',
    };
    return isBankQuality(atmRow);
  });
  
  const nearbyFallbackAtms = nearbyCandidates.filter((c) => {
    const atmRow: AtmLocationRow = {
      id: c.id,
      name: c.name,
      address: c.address,
      city: c.city,
      lat: c.lat,
      lng: c.lng,
      is_in_branch: c.is_in_branch,
      is_in_store: c.is_in_store,
      open_24h: c.open_24h,
      status: 'active',
    };
    return !isBankQuality(atmRow);
  });

  console.log('[ATM_SELECTION] nearbyBankAtms', nearbyBankAtms.map(a => ({
    id: a.id,
    name: a.name,
    distance: Math.round(a.distance_m),
  })));

  console.log('[ATM_SELECTION] nearbyFallbackAtms', nearbyFallbackAtms.slice(0, 5).map(a => ({
    id: a.id,
    name: a.name,
    distance: Math.round(a.distance_m),
  })));

  // BANK-FIRST selection logic
  let chosen: AtmCandidate | null = null;

  if (nearbyBankAtms.length > 0) {
    // BANK-FIRST: pick nearest "good" ATM by distance
    nearbyBankAtms.sort((a, b) => a.distance_m - b.distance_m);
    chosen = nearbyBankAtms[0];
    console.log('[ATM_SELECTION] ✅ Selected from bank ATMs (bank-first strategy)');
  } else if (nearbyFallbackAtms.length > 0) {
    // Only if no bank ATMs nearby: fall back to existing scoring
    nearbyFallbackAtms.sort((a, b) => {
      // Sort by score DESC, then distance ASC
      if (Math.abs(a.score - b.score) > 0.1) {
        return b.score - a.score;
      }
      return a.distance_m - b.distance_m;
    });
    chosen = nearbyFallbackAtms[0];
    console.log('[ATM_SELECTION] ⚠️ No bank ATMs found, using fallback ATM');
  } else if (allCandidates.length > 0) {
    // Expand beyond 2km if no candidates in bank radius
    // Still prefer banks if available
    const allBankAtms = allCandidates.filter((c) => {
      const atmRow: AtmLocationRow = {
        id: c.id,
        name: c.name,
        address: c.address,
        city: c.city,
        lat: c.lat,
        lng: c.lng,
        is_in_branch: c.is_in_branch,
        is_in_store: c.is_in_store,
        open_24h: c.open_24h,
        status: 'active',
      };
      return isBankQuality(atmRow);
    });
    
    if (allBankAtms.length > 0) {
      allBankAtms.sort((a, b) => a.distance_m - b.distance_m);
      chosen = allBankAtms[0];
      console.log('[ATM_SELECTION] ✅ Selected bank ATM beyond 2km radius');
    } else {
      // Last resort: use scored fallback from all candidates
      allCandidates.sort((a, b) => {
        if (Math.abs(a.score - b.score) > 0.1) {
          return b.score - a.score;
        }
        return a.distance_m - b.distance_m;
      });
      chosen = allCandidates[0];
      console.log('[ATM_SELECTION] ⚠️ No bank ATMs found, using best fallback from all candidates');
    }
  }

  if (!chosen) {
    console.warn('[ATM_SELECTION] No suitable ATM found');
    return null;
  }

  // Safety guard: if chosen ATM is very far, try to pick a closer bank-quality ATM.
  // Only fall back to a non-bank ATM if there are truly no banks at all.
  const MAX_REASONABLE_DISTANCE_METERS = 4000; // 4km
  
  if (chosen.distance_m > MAX_REASONABLE_DISTANCE_METERS) {
    console.warn('[ATM_SELECTION] Chosen ATM is far, evaluating safer nearby alternatives', {
      chosenDistance: Math.round(chosen.distance_m),
      chosenName: chosen.name,
      maxReasonable: MAX_REASONABLE_DISTANCE_METERS,
    });

    // First, look for the nearest BANK-QUALITY ATM within the max reasonable distance
    const bankCandidates = allCandidates.filter((c) => {
      const atmRow: AtmLocationRow = {
        id: c.id,
        name: c.name,
        address: c.address,
        city: c.city,
        lat: c.lat,
        lng: c.lng,
        is_in_branch: c.is_in_branch,
        is_in_store: c.is_in_store,
        open_24h: c.open_24h,
        status: 'active',
      };
      return isBankQuality(atmRow);
    });

    const nearbyBankCandidates = bankCandidates
      .filter((c) => c.distance_m <= MAX_REASONABLE_DISTANCE_METERS)
      .sort((a, b) => a.distance_m - b.distance_m);

    if (nearbyBankCandidates.length > 0) {
      const nearestBank = nearbyBankCandidates[0];
      console.log('[ATM_SELECTION] Using nearest BANK ATM instead of far choice', {
        id: nearestBank.id,
        name: nearestBank.name,
        distance: Math.round(nearestBank.distance_m),
      });
      chosen = nearestBank;
    } else {
      // No bank-quality ATM within the reasonable radius.
      // As a last resort, we can still pick the absolute nearest ATM,
      // but only if it is significantly closer than the original choice.
      const nearestOverall = allCandidates.slice().sort((a, b) => a.distance_m - b.distance_m)[0];
      if (nearestOverall) {
        const nearestIsBank = isBankQuality({
          id: nearestOverall.id,
          name: nearestOverall.name,
          address: nearestOverall.address,
          city: nearestOverall.city,
          lat: nearestOverall.lat,
          lng: nearestOverall.lng,
          is_in_branch: nearestOverall.is_in_branch,
          is_in_store: nearestOverall.is_in_store,
          open_24h: nearestOverall.open_24h,
          status: 'active',
        });

        if (nearestIsBank && nearestOverall.distance_m <= MAX_REASONABLE_DISTANCE_METERS) {
          console.log('[ATM_SELECTION] Using nearest overall BANK ATM', {
            id: nearestOverall.id,
            name: nearestOverall.name,
            distance: Math.round(nearestOverall.distance_m),
          });
          chosen = nearestOverall;
        } else if (nearestOverall.distance_m < chosen.distance_m) {
          console.warn('[ATM_SELECTION] No bank ATMs nearby; using nearest non-bank ATM as last resort', {
            id: nearestOverall.id,
            name: nearestOverall.name,
            distance: Math.round(nearestOverall.distance_m),
          });
          chosen = nearestOverall;
        } else {
          console.warn('[ATM_SELECTION] Keeping original far ATM; nearest alternative is not better', {
            nearestDistance: Math.round(nearestOverall.distance_m),
            nearestName: nearestOverall.name,
          });
        }
      }
    }
  }

  // Cache the selection
  await supabase
    .from('address_atm_preferences')
    .upsert(
      {
        customer_address_id: addressId,
        atm_id: chosen.id,
        times_used: 1,
        last_used_at: new Date().toISOString(),
      },
      {
        onConflict: 'customer_address_id,atm_id',
      }
    );

  console.info('[ATM_SELECTION] chosen', {
    id: chosen.id,
    name: chosen.name,
    distance: Math.round(chosen.distance_m),
    isBank: isBankQuality({
      id: chosen.id,
      name: chosen.name,
      address: chosen.address,
      city: chosen.city,
      lat: chosen.lat,
      lng: chosen.lng,
      is_in_branch: chosen.is_in_branch,
      is_in_store: chosen.is_in_store,
      open_24h: chosen.open_24h,
      status: 'active',
    }),
  });

  return {
    atmId: chosen.id,
    atmName: chosen.name,
    atmAddress: chosen.address,
    atmLat: chosen.lat,
    atmLng: chosen.lng,
    distanceMeters: Math.round(chosen.distance_m),
    score: chosen.score,
  };
}

/**
 * Find ATMs within radius and score them
 */
async function findScoredAtms(
  supabase: SupabaseClient,
  addressLat: number,
  addressLng: number,
  radiusMeters: number
): Promise<AtmCandidate[]> {
  // Get all ATMs (atm_locations has public SELECT via RLS)
  // Filter out inactive, temp_closed, and perm_closed ATMs
  // Only consider active ATMs (or null status for backward compatibility)
  const { data: allAtms, error } = await supabase
    .from('atm_locations')
    .select('id, name, address, city, lat, lng, is_in_branch, is_in_store, open_24h, status')
    .or('status.eq.active,status.is.null');
  
  // Debug: Log total ATMs and status breakdown
  if (allAtms) {
    const statusCounts = allAtms.reduce((acc, atm) => {
      const status = atm.status || 'null';
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    console.log('[ATM_SELECTION][DEBUG] Total ATMs in database:', {
      total: allAtms.length,
      statusBreakdown: statusCounts,
    });
  }

  if (error) {
    console.error('[ATM_SELECTION] Failed to fetch ATMs:', error);
    throw new Error(`Failed to fetch ATMs: ${error.message}`);
  }

  if (!allAtms || allAtms.length === 0) {
    console.warn('[ATM_SELECTION] No ATMs found in database');
    return [];
  }

  // Debug: Check if Wells Fargo exists in the dataset
  const wellsDebug = allAtms.filter(a =>
    (a.name || '').toLowerCase().includes('wells fargo')
  );
  console.log('[ATM_SELECTION][DEBUG] wellsInAllAtms', {
    count: wellsDebug.length,
    totalAtms: allAtms.length,
    wellsFargoAtms: wellsDebug.map(a => ({
      id: a.id,
      name: a.name,
      address: a.address,
      lat: a.lat,
      lng: a.lng,
      status: a.status,
    })),
  });
  
  // Debug: Check for other major banks
  const majorBanks = ['chase', 'bank of america', 'citibank', 'td bank', 'pnc', 'bankunited'];
  const bankCounts = majorBanks.map(bankName => {
    const matches = allAtms.filter(a =>
      (a.name || '').toLowerCase().includes(bankName)
    );
    return { bank: bankName, count: matches.length };
  });
  console.log('[ATM_SELECTION][DEBUG] Major bank counts in database:', bankCounts);

  // Calculate distance and score for each ATM
  // Filter out bad ATMs (gas stations, ATM services, etc.) unless they're bank-quality
  const candidates: AtmCandidate[] = allAtms
    .map(atm => {
      const distanceMeters = calculateDistance(addressLat, addressLng, atm.lat, atm.lng);
      
      // Skip if outside radius
      if (distanceMeters > radiusMeters) {
        return null;
      }

      // Build ATM row for quality checks
      const atmRow: AtmLocationRow = {
        id: atm.id,
        name: atm.name,
        address: atm.address,
        city: atm.city || null,
        lat: atm.lat,
        lng: atm.lng,
        is_in_branch: atm.is_in_branch,
        is_in_store: atm.is_in_store,
        open_24h: atm.open_24h,
        status: atm.status || 'active',
      };

      // Check if this is bank-quality
      const isBank = isBankQuality(atmRow);
      
      // If NOT bank-quality, check if it has bad keywords
      // If it has bad keywords, exclude it completely (don't even consider it)
      if (!isBank) {
        const name = normalizeName(atm.name);
        const hasBadKeyword = BAD_KEYWORDS.some((k) => name.includes(k.toLowerCase()));
        
        if (hasBadKeyword) {
          // This is a bad ATM (Exxon, D&B, etc.) and not bank-quality - exclude it
          return null;
        }
      }

      const score = calculateAtmScore(atm, distanceMeters);
      
      return {
        id: atm.id,
        name: atm.name,
        address: atm.address,
        city: atm.city,
        lat: atm.lat,
        lng: atm.lng,
        is_in_branch: atm.is_in_branch,
        is_in_store: atm.is_in_store,
        open_24h: atm.open_24h,
        distance_m: distanceMeters,
        score,
      };
    })
    .filter((c): c is AtmCandidate => c !== null)
    .sort((a, b) => {
      // Sort by score DESC, then distance ASC
      if (Math.abs(a.score - b.score) > 0.1) {
        return b.score - a.score;
      }
      return a.distance_m - b.distance_m;
    });

  // Debug: log the 5 closest candidates by distance
  const closestDebug = candidates.slice().sort((a, b) => a.distance_m - b.distance_m).slice(0, 5);
  console.log('[ATM_SELECTION] closestByDistance (debug)', closestDebug.map(c => ({
    id: c.id,
    name: c.name,
    distance: Math.round(c.distance_m),
  })));

  // Debug: Log candidate evaluation for closest 10
  const closest10 = candidates.slice().sort((a, b) => a.distance_m - b.distance_m).slice(0, 10);
  console.log('[ATM_SELECTION][DEBUG] candidateCheck', closest10.map(c => {
    const atmRow: AtmLocationRow = {
      id: c.id,
      name: c.name,
      address: c.address,
      city: c.city,
      lat: c.lat,
      lng: c.lng,
      is_in_branch: c.is_in_branch,
      is_in_store: c.is_in_store,
      open_24h: c.open_24h,
      status: 'active',
    };
    const name = normalizeName(c.name);
    return {
      id: c.id,
      name: c.name,
      distance: Math.round(c.distance_m),
      isBank: isBankQuality(atmRow),
      hasBadKeyword: BAD_KEYWORDS.some(k => name.includes(k.toLowerCase())),
      isInBranch: c.is_in_branch,
      isInStore: c.is_in_store,
    };
  }));

  return candidates;
}

/**
 * Bank-quality keywords (ATMs we prefer)
 */
const BANK_KEYWORDS = [
  'bank',
  'credit union',
  'cu',
  'chase',
  'wells fargo',
  'citibank',
  'bank of america',
  'bankunited',
  'bank united',
  'city national',
  'firstbank',
  'first bank',
  'td bank',
  'ocean bank',
  'banesco',
  'terrabank',
  'first american',
  'dade county federal',
  'space coast',
  'first horizon',
  'pnc',
  'bofa',
];

/**
 * Bad keywords (ATMs we avoid unless no banks available)
 */
const BAD_KEYWORDS = [
  'bitcoin',
  'btc',
  'crypto',
  'libertyx',
  'coinsource',
  'bitstop',
  'gas',
  'fuel',
  'exxon',
  'shell',
  'chevron',
  'texaco',
  'mobil',
  'marathon',
  'valero',
  'sunoco',
  'convenience store',
  'mart',
  'quick shop',
  '7-eleven',
  '7 eleven',
  'atm services',
  'atm svc',
  'd & b',  // D & B ATM Services
  'd&b',    // D&B ATM Services (no spaces)
];

/**
 * Normalize ATM name for keyword matching
 */
function normalizeName(name?: string | null): string {
  return (name || '').toLowerCase();
}

/**
 * Check if an ATM is bank-quality (should be preferred)
 */
function isBankQuality(atm: AtmLocationRow): boolean {
  const name = normalizeName(atm.name);
  if (!name) return false;
  
  // Exclude bad keywords first (case-insensitive check)
  const normalizedBadCheck = name.toLowerCase();
  if (BAD_KEYWORDS.some((k) => normalizedBadCheck.includes(k.toLowerCase()))) return false;
  if (normalizedBadCheck.includes('bitcoin')) return false;
  
  // Must include at least one bank keyword
  return BANK_KEYWORDS.some((k) => name.includes(k));
}

/**
 * Calculate ATM quality score (used for tiebreakers within groups)
 */
function calculateAtmScore(
  atm: {
    name: string | null;
    is_in_branch: boolean | null;
    is_in_store: boolean | null;
    open_24h: boolean | null;
  },
  distanceMeters: number
): number {
  const name = (atm.name || '').toLowerCase();
  let score = 0;

  // Penalties for undesirable ATMs
  if (name.includes('bitcoin') || name.includes('crypto')) {
    score -= 200;
  }
  
  if (
    name.includes('smoke') ||
    name.includes('liquor') ||
    name.includes('laundry') ||
    name.includes('vape') ||
    name.includes('quick shop') ||
    name.includes('gas station') ||
    name.includes('exxon') ||
    name.includes('shell') ||
    name.includes('chevron')
  ) {
    score -= 120;
  }

  // Penalty for generic "ATM Services" companies (not actual banks)
  // This includes "D & B ATM Services", "D&B ATM Services", etc.
  if (name.includes('atm services') || name.includes('atm svc') || 
      name.includes('d & b') || name.includes('d&b')) {
    score -= 200; // Increased penalty to strongly discourage these
  }

  // Major bank bonuses
  if (name.includes('chase')) score += 120;
  else if (name.includes('wells fargo')) score += 120;
  else if (name.includes('bank of america') || name.includes('bofa')) score += 120;
  else if (name.includes('citibank') || name.includes('citi bank')) score += 110;
  else if (name.includes('td bank')) score += 110;
  else if (name.includes('pnc')) score += 100;
  else if (name.includes('city national bank')) score += 100;
  else if (name.includes('bankunited') || name.includes('bank united')) score += 100;
  else if (name.includes('bank') || name.includes('credit union')) {
    score += 60; // Generic bank/credit union bonus
  }

  // Branch vs standalone
  if (atm.is_in_branch === true) {
    score += 40;
  }

  // 24/7 availability
  if (atm.open_24h === true) {
    score += 5;
  }

  // Store ATMs are less desirable
  if (atm.is_in_store === true) {
    score -= 10;
  }

  // Distance penalty (further = worse, but not as important as quality)
  // Divide by 50 to make distance matter but not dominate
  score -= distanceMeters / 50.0;

  return score;
}

/**
 * Calculate distance between two points using Haversine formula
 * Returns distance in meters
 */
function calculateDistance(
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

