/**
 * Browser Console Script to Cancel All Live Orders
 * 
 * INSTRUCTIONS:
 * 1. Log in as admin in your browser
 * 2. Go to any admin page (e.g., /admin/dashboard)
 * 3. Open browser console (F12 or Cmd+Option+I)
 * 4. Copy and paste this ENTIRE script
 * 5. Press Enter
 * 
 * This script will:
 * - Find all live orders (not Completed, not Cancelled)
 * - Cancel them one by one using the FSM
 * - Show you progress and results
 */

(async function() {
  try {
    console.log('🔍 Finding all live orders...');

    // Get Supabase client - try to access it from the app context
    // The app should have supabase available in the global scope or via import
    let supabase;
    
    // Try different ways to access Supabase
    if (typeof window !== 'undefined') {
      // Try to get it from the app's context
      // For Vite apps, we might need to use the app's instance
      try {
        // Import supabase from the app (this works if modules are available)
        const { supabase: supabaseClient } = await import('/src/db/supabase.ts');
        supabase = supabaseClient;
      } catch (e) {
        // If that doesn't work, try to create a new client
        // Get URL and key from environment or window
        const url = import.meta.env?.VITE_SUPABASE_URL || window.__SUPABASE_URL__;
        const key = import.meta.env?.VITE_SUPABASE_ANON_KEY || window.__SUPABASE_ANON_KEY__;
        
        if (!url || !key) {
          console.error('❌ Cannot find Supabase credentials.');
          console.error('Please run this from the admin page where the app is loaded.');
          console.error('Alternatively, manually set:');
          console.error('  window.__SUPABASE_URL__ = "your-url";');
          console.error('  window.__SUPABASE_ANON_KEY__ = "your-key";');
          return;
        }
        
        const { createClient } = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm');
        supabase = createClient(url, key);
      }
    }

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.error('❌ Not authenticated. Please log in as admin first.');
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
    orders.forEach((order) => {
      console.log(`  - ${order.id.slice(0, 8)}: ${order.status} | $${order.requested_amount} | Created: ${new Date(order.created_at).toLocaleString()}`);
    });

    // Ask for confirmation
    const confirmed = confirm(
      `⚠️ WARNING: This will cancel ${orders.length} live order(s).\n\n` +
      `This action cannot be undone. Do you want to continue?`
    );

    if (!confirmed) {
      console.log('❌ Cancellation aborted by user.');
      return;
    }

    console.log('\n🚀 Starting cancellation...\n');

    let successCount = 0;
    let failCount = 0;
    const errors = [];

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
      } catch (error) {
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

    console.log('\n✅ Done! Refresh the page to see updated order statuses.');

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
})();









