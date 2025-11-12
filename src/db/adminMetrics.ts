/**
 * Admin Metrics Helper
 * 
 * Centralized functions for calculating admin dashboard KPIs.
 * All metrics are computed from Supabase data and returned in a consistent format.
 */

import { supabase } from './supabase';
import type { OrderWithDetails, Profile, Order } from '@/types/types';

/**
 * Global Health Metrics
 * Top-level KPIs for founder view
 */
export interface GlobalHealthMetrics {
  liveOrders: {
    active: number;
    totalToday: number;
  };
  revenue: {
    gmvToday: number;
    benjaminFeeToday: number;
  };
  completion: {
    rateToday: number;
    rate7d: number;
    medianDeliveryTime7d: number; // in minutes
  };
  runnerNetwork: {
    online: number;
    total: number;
    coverage: 'healthy' | 'thin';
  };
  issues: {
    critical: number;
    warnings: number;
  };
}

/**
 * Calculate today's date range (start of day to now)
 */
function getTodayRange() {
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return {
    start: startOfDay.toISOString(),
    end: now.toISOString(),
  };
}

/**
 * Calculate 7-day date range
 */
function get7DayRange() {
  const now = new Date();
  const sevenDaysAgo = new Date(now);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  return {
    start: sevenDaysAgo.toISOString(),
    end: now.toISOString(),
  };
}

/**
 * Get all active orders (non-final statuses)
 */
export async function getActiveOrders(): Promise<OrderWithDetails[]> {
  const { data, error } = await supabase
    .from('orders')
    .select(`
      *,
      customer:customer_id(*),
      runner:runner_id(*)
    `)
    .not('status', 'in', '(Completed,Cancelled)')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching active orders:', error);
    return [];
  }

  return Array.isArray(data) ? data : [];
}

/**
 * Get orders created today
 */
export async function getOrdersToday(): Promise<OrderWithDetails[]> {
  const { start, end } = getTodayRange();
  
  const { data, error } = await supabase
    .from('orders')
    .select(`
      *,
      customer:customer_id(*),
      runner:runner_id(*)
    `)
    .gte('created_at', start)
    .lte('created_at', end)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching today\'s orders:', error);
    return [];
  }

  return Array.isArray(data) ? data : [];
}

/**
 * Get completed orders from last 7 days
 */
export async function getCompletedOrders7d(): Promise<OrderWithDetails[]> {
  const { start, end } = get7DayRange();
  
  const { data, error } = await supabase
    .from('orders')
    .select(`
      *,
      customer:customer_id(*),
      runner:runner_id(*)
    `)
    .eq('status', 'Completed')
    .gte('handoff_completed_at', start)
    .lte('handoff_completed_at', end)
    .order('handoff_completed_at', { ascending: false });

  if (error) {
    console.error('Error fetching completed orders (7d):', error);
    return [];
  }

  return Array.isArray(data) ? data : [];
}

/**
 * Get completed orders from today
 */
export async function getCompletedOrdersToday(): Promise<OrderWithDetails[]> {
  const { start, end } = getTodayRange();
  
  const { data, error } = await supabase
    .from('orders')
    .select(`
      *,
      customer:customer_id(*),
      runner:runner_id(*)
    `)
    .eq('status', 'Completed')
    .gte('handoff_completed_at', start)
    .lte('handoff_completed_at', end)
    .order('handoff_completed_at', { ascending: false });

  if (error) {
    console.error('Error fetching completed orders (today):', error);
    return [];
  }

  return Array.isArray(data) ? data : [];
}

/**
 * Get all runners with online status
 */
export async function getRunnersWithStatus(): Promise<Profile[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .contains('role', ['runner'])
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching runners:', error);
    return [];
  }

  return Array.isArray(data) ? data : [];
}

/**
 * Calculate median delivery time from completed orders
 * Uses time from created_at to handoff_completed_at
 */
function calculateMedianDeliveryTime(orders: OrderWithDetails[]): number {
  if (orders.length === 0) return 0;

  const deliveryTimes = orders
    .map(order => {
      const created = new Date(order.created_at);
      const completed = order.handoff_completed_at 
        ? new Date(order.handoff_completed_at)
        : new Date(order.updated_at);
      return (completed.getTime() - created.getTime()) / (1000 * 60); // minutes
    })
    .filter(time => time > 0 && time < 1440) // Filter out invalid times (0-24 hours)
    .sort((a, b) => a - b);

  if (deliveryTimes.length === 0) return 0;

  const mid = Math.floor(deliveryTimes.length / 2);
  return deliveryTimes.length % 2 === 0
    ? (deliveryTimes[mid - 1] + deliveryTimes[mid]) / 2
    : deliveryTimes[mid];
}

/**
 * Detect stalled/at-risk orders
 */
async function detectAtRiskOrders(): Promise<{ critical: number; warnings: number }> {
  const now = new Date();
  const fifteenMinutesAgo = new Date(now.getTime() - 15 * 60 * 1000);
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

  // Critical: Pending > 1 hour
  const { data: criticalOrders } = await supabase
    .from('orders')
    .select('id')
    .eq('status', 'Pending')
    .lt('created_at', oneHourAgo.toISOString());

  // Warnings: Pending > 15 min, Pending Handoff > 30 min
  const { data: warningOrders1 } = await supabase
    .from('orders')
    .select('id')
    .eq('status', 'Pending')
    .lt('created_at', fifteenMinutesAgo.toISOString())
    .gte('created_at', oneHourAgo.toISOString());

  const thirtyMinutesAgo = new Date(now.getTime() - 30 * 60 * 1000);
  const { data: warningOrders2 } = await supabase
    .from('orders')
    .select('id')
    .eq('status', 'Pending Handoff')
    .lt('updated_at', thirtyMinutesAgo.toISOString());

  const critical = criticalOrders?.length || 0;
  const warnings = (warningOrders1?.length || 0) + (warningOrders2?.length || 0);

  return { critical, warnings };
}

/**
 * Calculate Benjamin fee from order
 * Benjamin fee = total_service_fee (profit + compliance_fee + delivery_fee)
 * Runner gets delivery_fee, Benjamin keeps profit + compliance_fee
 */
function calculateBenjaminFee(order: Order): number {
  // Benjamin keeps: profit + compliance_fee
  // Runner gets: delivery_fee
  return (order.profit || 0) + (order.compliance_fee || 0);
}

/**
 * Get global health metrics
 */
export async function getGlobalHealthMetrics(): Promise<GlobalHealthMetrics> {
  const [
    activeOrders,
    ordersToday,
    completedToday,
    completed7d,
    runners,
    atRisk,
  ] = await Promise.all([
    getActiveOrders(),
    getOrdersToday(),
    getCompletedOrdersToday(),
    getCompletedOrders7d(),
    getRunnersWithStatus(),
    detectAtRiskOrders(),
  ]);

  // Live Orders
  const liveOrders = {
    active: activeOrders.length,
    totalToday: ordersToday.length,
  };

  // Revenue & Margin
  const gmvToday = completedToday.reduce((sum, o) => sum + (o.requested_amount || 0), 0);
  const benjaminFeeToday = completedToday.reduce((sum, o) => sum + calculateBenjaminFee(o), 0);

  // Completion & SLA
  const completionRateToday = ordersToday.length > 0
    ? (completedToday.length / ordersToday.length) * 100
    : 0;

  // Get all orders from last 7 days for completion rate calculation
  const { start, end } = get7DayRange();
  const { data: allOrders7d, error: ordersError } = await supabase
    .from('orders')
    .select('id, status, created_at, handoff_completed_at, updated_at')
    .gte('created_at', start)
    .lte('created_at', end);

  if (ordersError) {
    console.error('Error fetching orders for 7d completion rate:', ordersError);
  }

  const totalOrders7d = Array.isArray(allOrders7d) ? allOrders7d.length : 0;
  const completionRate7d = totalOrders7d > 0
    ? (completed7d.length / totalOrders7d) * 100
    : 0;

  const medianDeliveryTime7d = calculateMedianDeliveryTime(completed7d);

  // Runner Network
  const onlineRunners = runners.filter(r => r.is_online).length;
  const totalRunners = runners.length;
  // Coverage: healthy if > 2 online runners, or > 1 online per 5 active orders
  const coverage = onlineRunners >= 2 && (activeOrders.length === 0 || onlineRunners >= Math.ceil(activeOrders.length / 5))
    ? 'healthy'
    : 'thin';

  return {
    liveOrders,
    revenue: {
      gmvToday,
      benjaminFeeToday,
    },
    completion: {
      rateToday: completionRateToday,
      rate7d: completionRate7d,
      medianDeliveryTime7d: Math.round(medianDeliveryTime7d),
    },
    runnerNetwork: {
      online: onlineRunners,
      total: totalRunners,
      coverage,
    },
    issues: atRisk,
  };
}

/**
 * Get GMV trend for last 7 days
 */
export async function getGMVTrend7d(): Promise<{ date: string; gmv: number }[]> {
  const { start, end } = get7DayRange();
  
  const { data, error } = await supabase
    .from('orders')
    .select('handoff_completed_at, requested_amount')
    .eq('status', 'Completed')
    .gte('handoff_completed_at', start)
    .lte('handoff_completed_at', end)
    .order('handoff_completed_at', { ascending: true });

  if (error || !data) {
    console.error('Error fetching GMV trend:', error);
    return [];
  }

  // Group by date
  const dailyGMV: Record<string, number> = {};
  data.forEach(order => {
    if (!order.handoff_completed_at) return;
    const date = new Date(order.handoff_completed_at).toISOString().split('T')[0];
    dailyGMV[date] = (dailyGMV[date] || 0) + (order.requested_amount || 0);
  });

  // Fill in missing days with 0
  const result: { date: string; gmv: number }[] = [];
  const startDate = new Date(start);
  const endDate = new Date(end);
  
  for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
    const dateStr = d.toISOString().split('T')[0];
    result.push({
      date: dateStr,
      gmv: dailyGMV[dateStr] || 0,
    });
  }

  return result;
}

/**
 * Get completion rate trend for last 7 days
 */
export async function getCompletionRateTrend7d(): Promise<{ date: string; rate: number }[]> {
  const { start, end } = get7DayRange();
  
  // Get all orders created in last 7 days
  const { data: allOrders, error: allError } = await supabase
    .from('orders')
    .select('id, created_at, status, handoff_completed_at')
    .gte('created_at', start)
    .lte('created_at', end);

  if (allError || !allOrders) {
    console.error('Error fetching orders for completion trend:', allError);
    return [];
  }

  // Group by date
  const dailyStats: Record<string, { total: number; completed: number }> = {};
  
  allOrders.forEach(order => {
    const date = new Date(order.created_at).toISOString().split('T')[0];
    if (!dailyStats[date]) {
      dailyStats[date] = { total: 0, completed: 0 };
    }
    dailyStats[date].total++;
    if (order.status === 'Completed') {
      dailyStats[date].completed++;
    }
  });

  // Calculate rates and fill missing days
  const result: { date: string; rate: number }[] = [];
  const startDate = new Date(start);
  const endDate = new Date(end);
  
  for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
    const dateStr = d.toISOString().split('T')[0];
    const stats = dailyStats[dateStr] || { total: 0, completed: 0 };
    const rate = stats.total > 0 ? (stats.completed / stats.total) * 100 : 0;
    result.push({
      date: dateStr,
      rate: Math.round(rate * 10) / 10, // Round to 1 decimal
    });
  }

  return result;
}

