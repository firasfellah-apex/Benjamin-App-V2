import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { 
  Package, 
  DollarSign, 
  TrendingUp, 
  Users, 
  AlertTriangle,
  Activity,
  Clock,
  ArrowRight
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  getGlobalHealthMetrics, 
  getActiveOrders, 
  getGMVTrend7d, 
  getCompletionRateTrend7d,
  getOrdersToday
} from "@/db/adminMetrics";
import { getAllOrders } from "@/db/api";
import { useOrdersRealtime } from "@/hooks/useOrdersRealtime";
import type { OrderWithDetails, Order } from "@/types/types";
import { Chip } from "@/components/common/Chip";
import { Avatar } from "@/components/common/Avatar";

/**
 * Simple sparkline component
 * Renders a mini line chart from data points
 */
function Sparkline({ 
  data, 
  color = "#5865F2",
  height = 40 
}: { 
  data: number[]; 
  color?: string;
  height?: number;
}) {
  if (data.length === 0) return null;

  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;

  const points = data.map((value, index) => {
    const x = (index / (data.length - 1)) * 100;
    const y = 100 - ((value - min) / range) * 100;
    return `${x},${y}`;
  }).join(' ');

  return (
    <svg width="100%" height={height} className="overflow-visible">
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

/**
 * KPI Card Component
 * Clickable card for global health metrics with consistent typography
 */
function KPICard({
  label,
  value,
  subtext,
  icon: Icon,
  onClick,
  accentColor = "text-[#F1F3F5]",
}: {
  label: string;
  value: string | number;
  subtext?: string;
  icon: React.ElementType;
  onClick?: () => void;
  accentColor?: string;
}) {
  return (
    <Card 
      className={`
        bg-[#23262B] border border-[#2F3238] rounded-2xl p-6
        transition-all duration-200 ease-out
        ${onClick ? 'cursor-pointer hover:bg-[#2D3036] hover:border-[#5865F2]/30 hover:shadow-lg hover:shadow-[#5865F2]/5' : ''}
      `}
      onClick={onClick}
    >
      <CardHeader className="flex flex-row items-start justify-between p-0 mb-3">
        <CardTitle className="text-xs font-medium text-[#A7A9AC] uppercase tracking-wider leading-tight">
          {label}
        </CardTitle>
        <Icon className="h-4 w-4 text-[#6C6E73] flex-shrink-0 mt-0.5" />
      </CardHeader>
      <CardContent className="p-0">
        <div className={`text-3xl font-bold leading-none mb-2 ${accentColor}`}>
          {value}
        </div>
        {subtext && (
          <p className="text-xs font-normal text-[#6C6E73] leading-relaxed">
            {subtext}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Section Card Component
 * Large card for main dashboard sections
 */
function SectionCard({
  title,
  subtitle,
  icon: Icon,
  actionLabel,
  onAction,
  children,
  className = "",
}: {
  title: string;
  subtitle?: string;
  icon: React.ElementType;
  actionLabel?: string;
  onAction?: () => void;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Card className={`bg-[#23262B] border border-[#2F3238] rounded-2xl p-6 ${className}`}>
      <CardHeader className="p-0 pb-5 mb-5 border-b border-[#2F3238]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-[#2D3036] flex items-center justify-center">
              <Icon className="h-5 w-5 text-[#5865F2]" />
            </div>
            <div>
              <CardTitle className="text-lg font-semibold text-[#F1F3F5] leading-tight">
                {title}
              </CardTitle>
              {subtitle && (
                <CardDescription className="text-sm font-normal text-[#A7A9AC] mt-1">
                  {subtitle}
                </CardDescription>
              )}
            </div>
          </div>
          {actionLabel && onAction && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onAction();
              }}
              className="text-sm font-medium text-[#5865F2] hover:text-[#4752C4] transition-colors flex items-center gap-1.5 group"
            >
              {actionLabel}
              <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
            </button>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {children}
      </CardContent>
    </Card>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<any>(null);
  const [activeOrders, setActiveOrders] = useState<OrderWithDetails[]>([]);
  const [recentOrders, setRecentOrders] = useState<OrderWithDetails[]>([]);
  const [gmvTrend, setGmvTrend] = useState<{ date: string; gmv: number }[]>([]);
  const [completionTrend, setCompletionTrend] = useState<{ date: string; rate: number }[]>([]);

  // Load initial data
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [
        healthMetrics,
        activeOrdersData,
        allOrdersData,
        gmvData,
        completionData,
      ] = await Promise.all([
        getGlobalHealthMetrics(),
        getActiveOrders(),
        getAllOrders(),
        getGMVTrend7d(),
        getCompletionRateTrend7d(),
      ]);

      setMetrics(healthMetrics);
      setActiveOrders(activeOrdersData);
      setRecentOrders(allOrdersData.slice(0, 10));
      setGmvTrend(gmvData);
      setCompletionTrend(completionData);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Realtime subscription for active orders
  const handleOrderInsert = useCallback((order: Order) => {
    setActiveOrders((prev) => {
      if (prev.some((o) => o.id === order.id)) return prev;
      return [order as OrderWithDetails, ...prev]
        .filter(o => o.status !== 'Completed' && o.status !== 'Cancelled')
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    });
    setRecentOrders((prev) => {
      if (prev.some((o) => o.id === order.id)) return prev;
      return [order as OrderWithDetails, ...prev]
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 10);
    });
    // Refresh metrics when new order comes in
    loadData();
  }, [loadData]);

  const handleOrderUpdate = useCallback((order: Order, oldOrder?: Order) => {
    setActiveOrders((prev) => {
      const existingIndex = prev.findIndex((o) => o.id === order.id);
      if (existingIndex >= 0) {
        // Update existing order
        const updated = [...prev];
        updated[existingIndex] = { ...updated[existingIndex], ...order } as OrderWithDetails;
        // Remove if status changed to final
        if (order.status === 'Completed' || order.status === 'Cancelled') {
          return updated.filter((o) => o.id !== order.id);
        }
        return updated;
      } else if (order.status !== 'Completed' && order.status !== 'Cancelled') {
        // Add new active order
        return [order as OrderWithDetails, ...prev]
          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      }
      return prev;
    });
    setRecentOrders((prev) => {
      const existingIndex = prev.findIndex((o) => o.id === order.id);
      if (existingIndex >= 0) {
        const updated = [...prev];
        updated[existingIndex] = { ...updated[existingIndex], ...order } as OrderWithDetails;
        return updated.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      }
      return prev;
    });
    // Refresh metrics when order status changes
    loadData();
  }, [loadData]);

  const handleOrderDelete = useCallback((order: Order) => {
    setActiveOrders((prev) => prev.filter((o) => o.id !== order.id));
    setRecentOrders((prev) => prev.filter((o) => o.id !== order.id));
    loadData();
  }, [loadData]);

  // Subscribe to all orders (admin mode)
  useOrdersRealtime({
    filter: { mode: 'admin' },
    onInsert: handleOrderInsert,
    onUpdate: handleOrderUpdate,
    onDelete: handleOrderDelete,
  });

  // Calculate order age in minutes
  const getOrderAge = (order: OrderWithDetails): number => {
    const created = new Date(order.created_at);
    const now = new Date();
    return Math.floor((now.getTime() - created.getTime()) / (1000 * 60));
  };

  // Format order age for display
  const formatOrderAge = (minutes: number): string => {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  // Get customer area (city/neighborhood) from address
  const getCustomerArea = (order: OrderWithDetails): string => {
    if (order.address_snapshot?.city) {
      return order.address_snapshot.city;
    }
    if (order.customer_address) {
      // Try to extract city from address string
      const parts = order.customer_address.split(',');
      return parts[parts.length - 2]?.trim() || 'Unknown';
    }
    return 'Unknown';
  };

  // Format alerts value for display
  const formatAlertsValue = (critical: number, warnings: number): string => {
    if (critical === 0 && warnings === 0) {
      return "All clear";
    }
    const parts: string[] = [];
    if (critical > 0) {
      parts.push(`${critical} critical`);
    }
    if (warnings > 0) {
      parts.push(`${warnings} warnings`);
    }
    return parts.join(" • ");
  };

  if (loading) {
    return (
      <div className="container max-w-7xl mx-auto py-8 px-4">
        <div className="flex items-center justify-center h-64">
          <div className="text-[#A7A9AC] text-sm font-normal">Loading dashboard...</div>
        </div>
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="container max-w-7xl mx-auto py-8 px-4">
        <div className="flex items-center justify-center h-64">
          <div className="text-[#EF4444] text-sm font-normal">Failed to load dashboard data</div>
        </div>
      </div>
    );
  }

  return (
    <div className="container max-w-7xl mx-auto py-8 px-4">
      {/* Header */}
      <div className="mb-10">
        <h1 className="text-3xl font-bold text-[#F1F3F5] mb-2 leading-tight">
          Admin Dashboard
        </h1>
        <p className="text-sm font-normal text-[#A7A9AC] leading-relaxed">
          Live operational view — monitor money movement, deliveries, and network health
        </p>
      </div>

      {/* Global Health Strip (top row) */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5 mb-8">
        <KPICard
          label="Live Orders"
          value={metrics.liveOrders.active}
          subtext={`of ${metrics.liveOrders.totalToday} orders today`}
          icon={Package}
          accentColor="text-[#F1F3F5]"
          onClick={() => navigate('/admin/orders?filter=active&range=today')}
        />
        <KPICard
          label="Today's Volume"
          value={`$${metrics.revenue.gmvToday.toFixed(0)}`}
          subtext={`Benjamin fee: $${metrics.revenue.benjaminFeeToday.toFixed(2)}`}
          icon={DollarSign}
          accentColor="text-[#3CD5A0]"
          onClick={() => navigate('/admin/revenue')}
        />
        <KPICard
          label="Completion Health"
          value={`${metrics.completion.rate7d.toFixed(1)}%`}
          subtext={`Median delivery: ${metrics.completion.medianDeliveryTime7d} min (7d)`}
          icon={TrendingUp}
          accentColor="text-[#3CD5A0]"
          onClick={() => navigate('/admin/orders?view=sla')}
        />
        <KPICard
          label="Runner Coverage"
          value={`${metrics.runnerNetwork.online}/${metrics.runnerNetwork.total}`}
          subtext={`${metrics.runnerNetwork.coverage === 'healthy' ? 'Coverage: Healthy' : 'Coverage: Thin'}`}
          icon={Users}
          accentColor={metrics.runnerNetwork.coverage === 'healthy' ? 'text-[#3CD5A0]' : 'text-[#FBBF24]'}
          onClick={() => navigate('/admin/users?role=runner')}
        />
        <KPICard
          label="Alerts"
          value={formatAlertsValue(metrics.issues.critical, metrics.issues.warnings)}
          subtext={metrics.issues.critical > 0 ? 'Action required' : metrics.issues.warnings > 0 ? 'Review needed' : 'All clear'}
          icon={AlertTriangle}
          accentColor={metrics.issues.critical > 0 ? 'text-[#EF4444]' : metrics.issues.warnings > 0 ? 'text-[#FBBF24]' : 'text-[#3CD5A0]'}
          onClick={() => navigate('/admin/orders?filter=at-risk')}
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-8">
        {/* Active Deliveries (center-left, spans 2 columns on large) */}
        <div className="lg:col-span-2">
          <SectionCard
            title="Active Deliveries"
            subtitle="Live updates via realtime"
            icon={Activity}
            actionLabel="View all"
            onAction={() => navigate('/admin/orders?filter=active')}
          >
            {activeOrders.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-sm font-normal text-[#6C6E73]">
                  No active deliveries
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-[#2F3238] hover:bg-transparent">
                      <TableHead className="text-xs font-medium text-[#A7A9AC] uppercase tracking-wider">
                        Order ID
                      </TableHead>
                      <TableHead className="text-xs font-medium text-[#A7A9AC] uppercase tracking-wider">
                        Area
                      </TableHead>
                      <TableHead className="text-xs font-medium text-[#A7A9AC] uppercase tracking-wider">
                        Amount
                      </TableHead>
                      <TableHead className="text-xs font-medium text-[#A7A9AC] uppercase tracking-wider">
                        Runner
                      </TableHead>
                      <TableHead className="text-xs font-medium text-[#A7A9AC] uppercase tracking-wider">
                        Status
                      </TableHead>
                      <TableHead className="text-xs font-medium text-[#A7A9AC] uppercase tracking-wider">
                        Age
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {activeOrders.slice(0, 10).map((order) => (
                      <TableRow
                        key={order.id}
                        className="cursor-pointer border-[#2F3238] hover:bg-[#2D3036] transition-colors"
                        onClick={() => navigate(`/admin/orders/${order.id}`)}
                      >
                        <TableCell className="font-mono text-sm font-medium text-[#F1F3F5]">
                          #{order.id.slice(0, 8)}
                        </TableCell>
                        <TableCell className="text-sm font-normal text-[#A7A9AC]">
                          {getCustomerArea(order)}
                        </TableCell>
                        <TableCell className="text-sm font-semibold text-[#F1F3F5]">
                          ${order.requested_amount.toFixed(2)}
                        </TableCell>
                        <TableCell>
                          {order.runner ? (
                            <div className="flex items-center gap-2">
                              <Avatar
                                src={order.runner.avatar_url}
                                fallback={`${order.runner.first_name} ${order.runner.last_name}`}
                                size="sm"
                              />
                              <span className="text-sm font-normal text-[#F1F3F5]">
                                {order.runner.first_name} {order.runner.last_name}
                              </span>
                            </div>
                          ) : (
                            <span className="text-sm font-normal text-[#6C6E73]">Unassigned</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Chip status={order.status} />
                        </TableCell>
                        <TableCell className="text-sm font-normal text-[#A7A9AC]">
                          {formatOrderAge(getOrderAge(order))}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </SectionCard>
        </div>

        {/* Supply & Demand (center-right) */}
        <div>
          <SectionCard
            title="Supply & Demand"
            subtitle="Network snapshot"
            icon={Users}
            actionLabel="View runners"
            onAction={() => navigate('/admin/users?role=runner')}
            className="cursor-pointer hover:bg-[#2D3036] transition-colors"
          >
            <div className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-normal text-[#A7A9AC]">Online Runners</span>
                  <span className="text-2xl font-bold text-[#F1F3F5] leading-none">
                    {metrics.runnerNetwork.online}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-normal text-[#A7A9AC]">Active Orders</span>
                  <span className="text-2xl font-bold text-[#F1F3F5] leading-none">
                    {activeOrders.length}
                  </span>
                </div>
              </div>
              <div className="pt-4 border-t border-[#2F3238]">
                <div className="flex items-center gap-2">
                  <div className={`h-2 w-2 rounded-full flex-shrink-0 ${
                    metrics.runnerNetwork.coverage === 'healthy' ? 'bg-[#3CD5A0]' : 'bg-[#FBBF24]'
                  }`} />
                  <span className="text-sm font-normal text-[#A7A9AC]">
                    Coverage: {metrics.runnerNetwork.coverage === 'healthy' ? 'Healthy' : 'Thin'}
                  </span>
                </div>
              </div>
            </div>
          </SectionCard>
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Recent Orders (bottom-left) */}
        <SectionCard
          title="Recent Orders"
          subtitle="Last 10 orders"
          icon={Clock}
          actionLabel="View all"
          onAction={() => navigate('/admin/orders')}
        >
          <div className="space-y-3">
            {recentOrders.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-sm font-normal text-[#6C6E73]">
                  No recent orders
                </div>
              </div>
            ) : (
              recentOrders.map((order) => (
                <div
                  key={order.id}
                  className="flex items-center justify-between p-4 border border-[#2F3238] rounded-xl hover:bg-[#2D3036] transition-colors cursor-pointer"
                  onClick={() => navigate(`/admin/orders/${order.id}`)}
                >
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <p className="font-mono text-sm font-semibold text-[#F1F3F5] leading-tight">
                      #{order.id.slice(0, 8)}
                    </p>
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-[#F1F3F5]">
                        ${order.requested_amount.toFixed(2)}
                      </p>
                      <span className="text-[#6C6E73]">•</span>
                      <Chip status={order.status} />
                    </div>
                  </div>
                  <div className="text-right ml-4 flex-shrink-0">
                    <p className="text-xs font-normal text-[#6C6E73] leading-tight">
                      {new Date(order.created_at).toLocaleDateString('en-US')}
                    </p>
                    {order.status === 'Completed' && order.handoff_completed_at && (
                      <p className="text-xs font-normal text-[#6C6E73] mt-1 leading-tight">
                        {new Date(order.handoff_completed_at).toLocaleTimeString('en-US')}
                      </p>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </SectionCard>

        {/* Trends (bottom-right) */}
        <SectionCard
          title="Last 7 Days"
          subtitle="GMV & completion trends"
          icon={TrendingUp}
          actionLabel="View reports"
          onAction={() => navigate('/admin/reports')}
          className="cursor-pointer hover:bg-[#2D3036] transition-colors"
        >
          <div className="space-y-6">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-normal text-[#A7A9AC]">GMV Trend</span>
                <span className="text-sm font-semibold text-[#F1F3F5]">
                  ${gmvTrend.reduce((sum, d) => sum + d.gmv, 0).toFixed(0)} total
                </span>
              </div>
              <div className="h-14 bg-[#1B1D21] rounded-lg p-3 border border-[#2F3238]">
                <Sparkline 
                  data={gmvTrend.map(d => d.gmv)} 
                  color="#5865F2"
                  height={32}
                />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-normal text-[#A7A9AC]">Completion Rate</span>
                <span className="text-sm font-semibold text-[#3CD5A0]">
                  {completionTrend.length > 0 
                    ? `${(completionTrend.reduce((sum, d) => sum + d.rate, 0) / completionTrend.length).toFixed(1)}% avg`
                    : '0%'
                  }
                </span>
              </div>
              <div className="h-14 bg-[#1B1D21] rounded-lg p-3 border border-[#2F3238]">
                <Sparkline 
                  data={completionTrend.map(d => d.rate)} 
                  color="#3CD5A0"
                  height={32}
                />
              </div>
            </div>
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
