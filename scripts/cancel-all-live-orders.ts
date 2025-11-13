/**
 * Script to cancel all live/active orders
 * 
 * This script finds all orders that are not completed or cancelled
 * and cancels them using the FSM (Finite State Machine) for proper
 * state transitions and audit trails.
 * 
 * Usage:
 * 1. Make sure you're logged in as an admin in the browser
 * 2. Open browser console
 * 3. Paste and run this script
 * 
 * OR run via Node.js:
 * npx tsx scripts/cancel-all-live-orders.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials');
  console.error('Please ensure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

interface Order {
  id: string;
  status: string;
  customer_id: string;
  requested_amount: number;
  created_at: string;
}

async function cancelAllLiveOrders() {
  try {
    console.log('🔍 Finding all live orders...');

    // Get current user (must be admin)
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.error('❌ Not authenticated. Please log in as an admin first.');
      console.error('For browser: Open console on the admin page while logged in');
      console.error('For CLI: Set SUPABASE_SERVICE_ROLE_KEY in .env.local');
      return;
    }

    // Verify user is admin
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      console.error('❌ Error fetching user profile:', profileError);
      return;
    }

    if (!profile.role?.includes('admin')) {
      console.error('❌ Unauthorized: Admin access required');
      return;
    }

    console.log('✅ Authenticated as admin:', user.email);

    // Get all live orders (not completed, not cancelled)
    const { data: orders, error: fetchError } = await supabase
      .from('orders')
      .select('id, status, customer_id, requested_amount, created_at')
      .not('status', 'in', '(Completed,Cancelled)')
      .order('created_at', { ascending: false });

    if (fetchError) {
      console.error('❌ Error fetching orders:', fetchError);
      return;
    }

    if (!orders || orders.length === 0) {
      console.log('✅ No live orders found. All orders are either completed or cancelled.');
      return;
    }

    console.log(`\n📦 Found ${orders.length} live order(s):`);
    orders.forEach((order: Order) => {
      console.log(`  - ${order.id.slice(0, 8)}: ${order.status} | $${order.requested_amount} | Created: ${new Date(order.created_at).toLocaleString()}`);
    });

    console.log(`\n⚠️  WARNING: This will cancel ${orders.length} order(s).`);
    console.log('Press Ctrl+C to cancel, or wait 3 seconds to continue...\n');

    // Wait 3 seconds before proceeding
    await new Promise(resolve => setTimeout(resolve, 3000));

    console.log('🚀 Starting cancellation...\n');

    let successCount = 0;
    let failCount = 0;
    const errors: Array<{ orderId: string; error: string }> = [];

    // Cancel each order using FSM
    for (const order of orders) {
      try {
        console.log(`Cancelling order ${order.id.slice(0, 8)}...`);

        const { data, error: fsmError } = await supabase.rpc('rpc_advance_order', {
          p_order_id: order.id,
          p_next_status: 'Cancelled',
          p_metadata: {
            reason: 'Bulk cancellation by admin',
            cancelled_by: user.id,
            bulk_cancellation: true
          }
        });

        if (fsmError) {
          console.error(`  ❌ Failed: ${fsmError.message}`);
          failCount++;
          errors.push({ orderId: order.id, error: fsmError.message });
        } else {
          console.log(`  ✅ Cancelled successfully`);
          successCount++;
        }
      } catch (error: any) {
        console.error(`  ❌ Error: ${error.message}`);
        failCount++;
        errors.push({ orderId: order.id, error: error.message });
      }
    }

    console.log('\n📊 Summary:');
    console.log(`  ✅ Successfully cancelled: ${successCount}`);
    console.log(`  ❌ Failed: ${failCount}`);

    if (errors.length > 0) {
      console.log('\n❌ Errors:');
      errors.forEach(({ orderId, error }) => {
        console.log(`  - ${orderId.slice(0, 8)}: ${error}`);
      });
    }

    console.log('\n✅ Done!');

  } catch (error: any) {
    console.error('❌ Unexpected error:', error);
  }
}

// Run the script
cancelAllLiveOrders();









