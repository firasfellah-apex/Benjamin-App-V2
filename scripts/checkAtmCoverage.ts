/**
 * Check ATM Coverage Around Specific Address
 * 
 * Queries atm_locations to see what ATMs exist within 3km of a given coordinate.
 * 
 * Usage:
 *   npx tsx scripts/checkAtmCoverage.ts
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_CUSTOMER_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// Target address: 1091 W 59th Pl, Hialeah, FL 33012
const TARGET_LAT = 25.8764200935757;
const TARGET_LNG = -80.3060553469058;
const RADIUS_METERS = 3000; // 3km

/**
 * Calculate distance using Haversine formula (meters)
 */
function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
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

async function checkCoverage() {
  console.log('🔍 Checking ATM coverage around target address...\n');
  console.log(`📍 Target: 1091 W 59th Pl, Hialeah, FL 33012`);
  console.log(`   Coordinates: (${TARGET_LAT}, ${TARGET_LNG})`);
  console.log(`   Radius: ${RADIUS_METERS}m (3km)\n`);

  // Fetch all ATMs (we'll filter by distance in code since Supabase doesn't have earthdistance extension)
  const { data: allAtms, error } = await supabase
    .from('atm_locations')
    .select('id, name, address, city, lat, lng, status, is_in_branch, is_in_store')
    .or('status.eq.active,status.is.null');

  if (error) {
    console.error('❌ Error fetching ATMs:', error);
    process.exit(1);
  }

  if (!allAtms || allAtms.length === 0) {
    console.error('❌ No ATMs found in database');
    process.exit(1);
  }

  console.log(`📊 Total ATMs in database: ${allAtms.length}\n`);

  // Calculate distances and filter
  const nearbyAtms = allAtms
    .map(atm => {
      const distance = calculateDistance(TARGET_LAT, TARGET_LNG, atm.lat, atm.lng);
      return {
        ...atm,
        distance_m: Math.round(distance),
      };
    })
    .filter(atm => atm.distance_m <= RADIUS_METERS)
    .sort((a, b) => a.distance_m - b.distance_m);

  console.log(`✅ Found ${nearbyAtms.length} ATMs within ${RADIUS_METERS}m\n`);

  // Expected bank ATMs to check for
  const expectedBanks = [
    { name: 'Bank of America', address: '900 W 49th St' },
    { name: 'Space Coast Credit Union', address: '' },
    { name: 'Regions', address: 'W 12th Ave' },
    { name: 'Ocean Bank', address: '' },
    { name: 'TD Bank', address: '' },
  ];

  console.log('🔍 Checking for expected bank ATMs:\n');
  for (const expected of expectedBanks) {
    const found = nearbyAtms.find(atm => 
      atm.name?.toLowerCase().includes(expected.name.toLowerCase())
    );
    if (found) {
      console.log(`   ✅ ${expected.name}: Found "${found.name}" at ${found.distance_m}m`);
      console.log(`      Address: ${found.address}`);
    } else {
      console.log(`   ❌ ${expected.name}: NOT FOUND`);
    }
  }

  console.log('\n📋 All ATMs within 3km (sorted by distance):\n');
  console.log('Distance | Name | Address | Status | In Branch | In Store');
  console.log('---------|------|---------|--------|-----------|----------');
  
  for (const atm of nearbyAtms.slice(0, 50)) { // Show first 50
    const name = (atm.name || 'N/A').substring(0, 40).padEnd(40);
    const address = (atm.address || 'N/A').substring(0, 50).padEnd(50);
    const status = (atm.status || 'null').padEnd(8);
    const inBranch = atm.is_in_branch ? 'Yes' : 'No';
    const inStore = atm.is_in_store ? 'Yes' : 'No';
    console.log(`${atm.distance_m.toString().padStart(7)}m | ${name} | ${address} | ${status} | ${inBranch.padEnd(9)} | ${inStore}`);
  }

  if (nearbyAtms.length > 50) {
    console.log(`\n... and ${nearbyAtms.length - 50} more`);
  }

  // Summary by type
  console.log('\n📊 Summary by type:\n');
  const bankAtms = nearbyAtms.filter(atm => {
    const name = (atm.name || '').toLowerCase();
    return name.includes('bank') || 
           name.includes('credit union') || 
           name.includes('chase') ||
           name.includes('wells fargo') ||
           name.includes('bofa') ||
           name.includes('citibank') ||
           name.includes('td bank') ||
           name.includes('regions') ||
           name.includes('ocean bank') ||
           name.includes('space coast');
  });

  const gasStationAtms = nearbyAtms.filter(atm => {
    const name = (atm.name || '').toLowerCase();
    return name.includes('exxon') ||
           name.includes('shell') ||
           name.includes('chevron') ||
           name.includes('gas') ||
           name.includes('fuel');
  });

  const atmServices = nearbyAtms.filter(atm => {
    const name = (atm.name || '').toLowerCase();
    return name.includes('atm services') ||
           name.includes('d & b') ||
           name.includes('d&b');
  });

  console.log(`   Bank ATMs: ${bankAtms.length}`);
  console.log(`   Gas Station ATMs: ${gasStationAtms.length}`);
  console.log(`   ATM Services: ${atmServices.length}`);
  console.log(`   Other: ${nearbyAtms.length - bankAtms.length - gasStationAtms.length - atmServices.length}`);
}

checkCoverage()
  .then(() => {
    console.log('\n✨ Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });

