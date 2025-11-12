/**
 * Simple Browser Console Script - Use this one!
 * 
 * Instructions:
 * 1. Make sure you're logged in as admin
 * 2. Go to any admin page (e.g., /admin/dashboard)
 * 3. Open browser console (F12)
 * 4. Copy and paste this ENTIRE script
 * 5. Press Enter
 */

// This uses the existing Supabase client from the app
// Make sure you're on a page that has Supabase initialized

(async () => {
  try {
    // Import the supabase client from the app
    // We'll use a dynamic import or access it from window if available
    let supabase;
    
    // Try to get supabase from the app's context
    if (typeof window !== 'undefined' && window.__SUPABASE_CLIENT__) {
      supabase = window.__SUPABASE_CLIENT__;
    } else {
      // Try to import from the app's modules (this might not work in all cases)
      console.log('⚠️ Trying to access Supabase client...');
      // For Vite apps, we can try to access it via the module system
      // But the easiest way is to use the browser's fetch API directly
      console.error('❌ Please run this from the admin page console where Supabase is available');
      console.log('Alternative: Use the admin UI to cancel orders one by one, or use the Node.js script');
      return;
    }

    console.log('🔍 Finding all live orders...');

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.error('❌ Not authenticated. Please log in first.');
      return;
    }

    // Verify admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile?.role?.includes('admin')) {
      console.error('❌ Admin access required');
      return;
    }

    // Get live orders
    const { data: orders } = await supabase
      .from('orders')
      .select('id, status, requested_amount, created_at')
      .not('status', 'in', '(Completed,Cancelled)');

    if (!orders || orders.length === 0) {
      console.log('✅ No live orders');
      return;
    }

    console.log(`Found ${orders.length} live orders. Cancelling...`);

    let success = 0;
    for (const order of orders) {
      const { error } = await supabase.rpc('rpc_advance_order', {
        p_order_id: order.id,
        p_next_status: 'Cancelled',
        p_metadata: { reason: 'Bulk cancellation', cancelled_by: user.id }
      });
      if (error) {
        console.error(`Failed ${order.id.slice(0, 8)}:`, error.message);
      } else {
        success++;
        console.log(`✅ Cancelled ${order.id.slice(0, 8)}`);
      }
    }

    console.log(`\n✅ Cancelled ${success}/${orders.length} orders`);
  } catch (error) {
    console.error('Error:', error);
  }
})();

