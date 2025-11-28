/**
 * Miami ATM Import Script
 * 
 * Preloads ATM locations from Google Places API into Supabase.
 * Scans Miami bounding box and imports all ATMs found.
 * 
 * Usage:
 *   npm run import:miami-atms
 *   or
 *   npx tsx scripts/importMiamiAtms.ts
 * 
 * Environment variables required:
 *   - ATM_GOOGLE_PLACES_API_KEY
 *   - SUPABASE_URL
 *   - SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const GOOGLE_PLACES_API_KEY = process.env.ATM_GOOGLE_PLACES_API_KEY;
// Support both VITE_ prefixed and non-prefixed env vars
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_CUSTOMER_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!GOOGLE_PLACES_API_KEY) {
  console.error('❌ Missing ATM_GOOGLE_PLACES_API_KEY in environment');
  console.error('   Add it to your .env.local file: ATM_GOOGLE_PLACES_API_KEY=your_key_here');
  process.exit(1);
}

if (!SUPABASE_URL) {
  console.error('❌ Missing SUPABASE_URL in environment');
  console.error('   Add it to your .env.local file: SUPABASE_URL=your_url_here');
  console.error('   Or use: VITE_CUSTOMER_SUPABASE_URL');
  process.exit(1);
}

if (!SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing SUPABASE_SERVICE_ROLE_KEY in environment');
  console.error('   This is required for the import script to write to the database.');
  console.error('   Add it to your .env.local file: SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here');
  console.error('   You can find it in: Supabase Dashboard → Settings → API → service_role key');
  process.exit(1);
}

// Initialize Supabase client with service role (full access)
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// Miami-Dade County bounding box
// Covers entire county: Homestead (south) to Aventura (north), Everglades (west) to coast (east)
const MIAMI_BOUNDS = {
  minLat: 25.20,  // South: Homestead/Florida City area
  maxLat: 26.00,  // North: Aventura/North Miami Beach area
  minLng: -80.60, // West: Everglades border
  maxLng: -80.00, // East: Atlantic coast
};

// Grid step size (degrees) - coarser grid for county-wide coverage
// 0.02° ≈ 2.2km spacing, which with 2000m radius ensures overlap
const GRID_STEP_LAT = 0.02;
const GRID_STEP_LNG = 0.02;

// Search radius in meters - larger radius to ensure coverage with coarser grid
const SEARCH_RADIUS = 2000;

// Rate limiting delay between API calls (ms)
const API_DELAY = 200;

interface GooglePlaceResult {
  place_id: string;
  name: string;
  formatted_address: string;
  geometry: {
    location: {
      lat: number;
      lng: number;
    };
  };
  opening_hours?: {
    open_now?: boolean;
    weekday_text?: string[];
  };
  business_status?: string;
  address_components?: Array<{
    long_name: string;
    short_name: string;
    types: string[];
  }>;
  types?: string[]; // Place types from Google Places API
}

/**
 * Parse address components to extract city, state, postal_code, country
 */
function parseAddressComponents(
  addressComponents: Array<{ long_name: string; short_name: string; types: string[] }> | undefined,
  formattedAddress: string
): { city: string | null; state: string | null; postal_code: string | null; country: string | null } {
  if (!addressComponents) {
    return { city: null, state: null, postal_code: null, country: null };
  }

  let city: string | null = null;
  let state: string | null = null;
  let postal_code: string | null = null;
  let country: string | null = null;

  for (const component of addressComponents) {
    const types = component.types;
    if (types.includes('locality')) {
      city = component.long_name;
    } else if (types.includes('administrative_area_level_1')) {
      state = component.short_name;
    } else if (types.includes('postal_code')) {
      postal_code = component.long_name;
    } else if (types.includes('country')) {
      country = component.short_name;
    }
  }

  return { city, state, postal_code, country };
}

/**
 * Call Google Places Nearby Search API
 * Searches for both type=atm and type=bank to capture bank ATMs
 */
async function searchNearbyAtms(lat: number, lng: number): Promise<string[]> {
  const placeIdSet = new Set<string>();
  
  // Search for type=atm
  const atmUrl = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=${SEARCH_RADIUS}&type=atm&key=${GOOGLE_PLACES_API_KEY}`;
  
  try {
    const atmResponse = await fetch(atmUrl);
    const atmData = await atmResponse.json();
    
    if (atmData.status === 'OK' && atmData.results) {
      atmData.results.forEach((result: any) => placeIdSet.add(result.place_id));
    } else if (atmData.status !== 'ZERO_RESULTS') {
      console.warn(`⚠️  ATM search returned status: ${atmData.status} for (${lat}, ${lng})`);
    }
  } catch (error) {
    console.error(`❌ Error calling ATM Nearby Search API:`, error);
  }
  
  // Also search for type=bank (banks often have ATMs)
  const bankUrl = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=${SEARCH_RADIUS}&type=bank&key=${GOOGLE_PLACES_API_KEY}`;
  
  try {
    const bankResponse = await fetch(bankUrl);
    const bankData = await bankResponse.json();
    
    if (bankData.status === 'OK' && bankData.results) {
      bankData.results.forEach((result: any) => placeIdSet.add(result.place_id));
    } else if (bankData.status !== 'ZERO_RESULTS') {
      console.warn(`⚠️  Bank search returned status: ${bankData.status} for (${lat}, ${lng})`);
    }
  } catch (error) {
    console.error(`❌ Error calling Bank Nearby Search API:`, error);
  }
  
  // Rate limiting between searches
  await new Promise(resolve => setTimeout(resolve, API_DELAY));
  
  return Array.from(placeIdSet);
}

/**
 * Call Google Places Details API
 * Includes 'types' field to detect if it's a bank branch or store
 */
async function getPlaceDetails(placeId: string): Promise<GooglePlaceResult | null> {
  const fields = 'place_id,name,formatted_address,geometry,opening_hours,business_status,address_components,types';
  const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=${fields}&key=${GOOGLE_PLACES_API_KEY}`;
  
  try {
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.status === 'OK' && data.result) {
      return data.result;
    } else {
      console.warn(`⚠️  Place details returned status: ${data.status} for place_id: ${placeId}`);
      return null;
    }
  } catch (error) {
    console.error(`❌ Error calling Place Details API for ${placeId}:`, error);
    return null;
  }
}

/**
 * Check if a place should be marked as inactive (bad locations)
 */
function isBadLocation(place: GooglePlaceResult): boolean {
  const name = (place.name || '').toLowerCase();
  const types = place.types || [];
  
  // Bad keywords that indicate we should mark as inactive
  const badKeywords = [
    'bitcoin', 'btc', 'crypto', 'libertyx', 'coinsource', 'bitstop',
    'smoke', 'smokeshop', 'vape', 'liquor', 'laundry', 'laundromat',
  ];
  
  // Check name for bad keywords
  if (badKeywords.some(keyword => name.includes(keyword))) {
    return true;
  }
  
  // Check types for bad place types
  const badTypes = ['liquor_store', 'smoke_shop', 'laundry'];
  if (badTypes.some(badType => types.includes(badType))) {
    return true;
  }
  
  return false;
}

/**
 * Map Google Place result to ATM location row
 */
function mapPlaceToAtmLocation(place: GooglePlaceResult): any {
  const { city, state, postal_code, country } = parseAddressComponents(
    place.address_components,
    place.formatted_address
  );

  const types = place.types || [];
  const name = (place.name || '').toLowerCase();

  // Determine if in branch (bank types)
  const is_in_branch = types.includes('bank') || 
                       types.includes('credit_union') ||
                       name.includes('bank') ||
                       name.includes('credit union');

  // Determine if in store (convenience store, gas station, etc.)
  const is_in_store = types.includes('convenience_store') ||
                      types.includes('gas_station') ||
                      types.includes('supermarket') ||
                      types.includes('grocery_store') ||
                      types.includes('store') ||
                      name.includes('exxon') ||
                      name.includes('shell') ||
                      name.includes('chevron') ||
                      name.includes('7-eleven') ||
                      name.includes('quick shop');

  // Determine status from business_status and bad location check
  let status = 'active';
  if (place.business_status === 'TEMPORARILY_CLOSED') {
    status = 'temp_closed';
  } else if (place.business_status === 'PERMANENTLY_CLOSED') {
    status = 'perm_closed';
  } else if (isBadLocation(place)) {
    // Mark bad locations (bitcoin ATMs, smoke shops, etc.) as inactive
    status = 'inactive';
  }

  // Check if open 24h (heuristic: if opening_hours exists but weekday_text is empty or null, might be 24h)
  const open_24h = place.opening_hours?.open_now === true && 
                   (!place.opening_hours.weekday_text || place.opening_hours.weekday_text.length === 0);

  return {
    google_place_id: place.place_id,
    name: place.name,
    address: place.formatted_address,
    city,
    state,
    postal_code,
    country,
    lat: place.geometry.location.lat,
    lng: place.geometry.location.lng,
    network: null, // Google Places doesn't provide this
    surcharge_min_cents: null,
    surcharge_max_cents: null,
    surcharge_notes: null,
    is_in_branch,
    is_in_store,
    open_24h,
    open_hours_json: place.opening_hours || null,
    status,
    source: 'google_places',
    last_verified_at: new Date().toISOString(),
  };
}

/**
 * Main import function
 */
async function importMiamiAtms() {
  console.log('🚀 Starting Miami-Dade County ATM import...\n');
  console.log(`📍 Bounding box: (${MIAMI_BOUNDS.minLat}, ${MIAMI_BOUNDS.minLng}) to (${MIAMI_BOUNDS.maxLat}, ${MIAMI_BOUNDS.maxLng})`);
  console.log(`   Coverage: Entire Miami-Dade County (Homestead to Aventura, Everglades to coast)`);
  console.log(`📐 Grid step: ${GRID_STEP_LAT}° lat, ${GRID_STEP_LNG}° lng (coarser grid for county-wide coverage)`);
  console.log(`🔍 Search radius: ${SEARCH_RADIUS}m (larger radius to ensure overlap)\n`);

  // Generate grid points
  const gridPoints: Array<{ lat: number; lng: number }> = [];
  for (let lat = MIAMI_BOUNDS.minLat; lat <= MIAMI_BOUNDS.maxLat; lat += GRID_STEP_LAT) {
    for (let lng = MIAMI_BOUNDS.minLng; lng <= MIAMI_BOUNDS.maxLng; lng += GRID_STEP_LNG) {
      gridPoints.push({ lat, lng });
    }
  }

  // Calculate grid dimensions for cost estimation
  const latSteps = Math.ceil((MIAMI_BOUNDS.maxLat - MIAMI_BOUNDS.minLat) / GRID_STEP_LAT);
  const lngSteps = Math.ceil((MIAMI_BOUNDS.maxLng - MIAMI_BOUNDS.minLng) / GRID_STEP_LNG);
  const totalGridPoints = gridPoints.length;
  const estimatedSearches = totalGridPoints * 2; // 2 searches per point (atm + bank)
  const estimatedDetails = estimatedSearches; // Rough estimate (will dedupe)
  
  // Google Places API pricing (as of 2024):
  // Nearby Search: $32 per 1000 requests
  // Place Details: $17 per 1000 requests
  const searchCost = (estimatedSearches / 1000) * 32;
  const detailsCost = (estimatedDetails / 1000) * 17;
  const estimatedTotalCost = searchCost + detailsCost;
  
  console.log(`📊 Generated ${gridPoints.length} grid points`);
  console.log(`   (${latSteps} lat steps × ${lngSteps} lng steps)\n`);
  
  console.log(`💰 Estimated API usage & cost:`);
  console.log(`   - Nearby searches: ~${estimatedSearches} (${totalGridPoints} points × 2 types)`);
  console.log(`   - Place details: ~${estimatedDetails} (after deduplication)`);
  console.log(`   - Estimated cost: $${estimatedTotalCost.toFixed(2)}`);
  console.log(`     • Nearby Search: $${searchCost.toFixed(2)} ($$32/1000)`);
  console.log(`     • Place Details: $${detailsCost.toFixed(2)} ($$17/1000)`);
  console.log(`   - Note: Actual cost may be lower due to deduplication\n`);

  // Collect all unique place_ids
  const placeIdSet = new Set<string>();
  let searchCount = 0;

  console.log('🔍 Searching for ATMs...');
  for (const point of gridPoints) {
    searchCount++;
    if (searchCount % 10 === 0) {
      console.log(`   Searched ${searchCount}/${gridPoints.length} grid points, found ${placeIdSet.size} unique ATMs so far...`);
    }

    const placeIds = await searchNearbyAtms(point.lat, point.lng);
    placeIds.forEach(id => placeIdSet.add(id));

    // Rate limiting
    await new Promise(resolve => setTimeout(resolve, API_DELAY));
  }

  console.log(`\n✅ Search complete. Found ${placeIdSet.size} unique ATM place_ids\n`);

  // Fetch details for each place
  const placeIds = Array.from(placeIdSet);
  const placeDetails: GooglePlaceResult[] = [];
  let detailsCount = 0;

  console.log('📥 Fetching place details...');
  for (const placeId of placeIds) {
    detailsCount++;
    if (detailsCount % 50 === 0) {
      console.log(`   Fetched ${detailsCount}/${placeIds.length} place details...`);
    }

    const details = await getPlaceDetails(placeId);
    if (details) {
      placeDetails.push(details);
    }

    // Rate limiting
    await new Promise(resolve => setTimeout(resolve, API_DELAY));
  }

  console.log(`\n✅ Fetched ${placeDetails.length} place details\n`);

  // Upsert into database
  console.log('💾 Upserting into database...');
  let newCount = 0;
  let updatedCount = 0;
  let errorCount = 0;

  for (const place of placeDetails) {
    try {
      const atmData = mapPlaceToAtmLocation(place);

      // Upsert by google_place_id
      const { data, error } = await supabase
        .from('atm_locations')
        .upsert(atmData, {
          onConflict: 'google_place_id',
          ignoreDuplicates: false,
        })
        .select();

      if (error) {
        console.error(`❌ Error upserting ${place.place_id}:`, error);
        errorCount++;
      } else if (data && data.length > 0) {
        // Check if it was an insert or update by checking created_at vs updated_at
        // This is a heuristic - if created_at is very recent, likely new
        const record = data[0];
        const createdAt = new Date(record.created_at);
        const updatedAt = new Date(record.updated_at);
        const timeDiff = updatedAt.getTime() - createdAt.getTime();
        
        if (timeDiff < 1000) { // Less than 1 second difference = likely new
          newCount++;
        } else {
          updatedCount++;
        }
      }
    } catch (error) {
      console.error(`❌ Exception upserting ${place.place_id}:`, error);
      errorCount++;
    }
  }

  console.log('\n✅ Import complete!\n');
  console.log(`📊 Summary:`);
  console.log(`   - New ATMs: ${newCount}`);
  console.log(`   - Updated ATMs: ${updatedCount}`);
  console.log(`   - Errors: ${errorCount}`);
  console.log(`   - Total processed: ${newCount + updatedCount}`);
  console.log(`   - Total in database: ${placeDetails.length}\n`);
  
  // Show breakdown by status
  const { data: statusBreakdown } = await supabase
    .from('atm_locations')
    .select('status')
    .in('id', placeDetails.map(p => {
      // We need to get the IDs that were just upserted
      // This is approximate - we'll query all active ones
      return null;
    }).filter(Boolean) as string[]);
  
  // Better: query all ATMs and show status breakdown
  const { data: allAtms } = await supabase
    .from('atm_locations')
    .select('status, is_in_branch, is_in_store');
  
  if (allAtms) {
    const statusCounts = allAtms.reduce((acc, atm) => {
      const status = atm.status || 'null';
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const branchCount = allAtms.filter(a => a.is_in_branch === true).length;
    const storeCount = allAtms.filter(a => a.is_in_store === true).length;
    
    console.log(`📈 Database status breakdown:`);
    console.log(`   - Active: ${statusCounts['active'] || 0}`);
    console.log(`   - Inactive: ${statusCounts['inactive'] || 0}`);
    console.log(`   - Temp closed: ${statusCounts['temp_closed'] || 0}`);
    console.log(`   - Perm closed: ${statusCounts['perm_closed'] || 0}`);
    console.log(`   - In branch: ${branchCount}`);
    console.log(`   - In store: ${storeCount}`);
    console.log(`   - Total ATMs: ${allAtms.length}\n`);
  }
}

// Run the import
importMiamiAtms()
  .then(() => {
    console.log('✨ Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });

