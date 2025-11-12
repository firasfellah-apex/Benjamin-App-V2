import { useEffect, useState, useCallback } from "react";
import { Filter, Package } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getAllOrders } from "@/db/api";
import { useOrdersRealtime } from "@/hooks/useOrdersRealtime";
import type { OrderWithDetails, Order } from "@/types/types";
import { Chip } from "@/components/common/Chip";
import { Avatar } from "@/components/common/Avatar";
import { OrderListSkeleton } from "@/components/order/OrderListSkeleton";
import { EmptyState } from "@/components/common/EmptyState";
import { AdminOrderDrawer } from "@/components/admin/AdminOrderDrawer";
import { strings } from "@/lib/strings";

export default function OrderMonitoring() {
  const [orders, setOrders] = useState<OrderWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedOrder, setSelectedOrder] = useState<OrderWithDetails | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const loadOrders = async () => {
    const data = await getAllOrders();
    setOrders(data);
    setLoading(false);
  };

  // Initial load
  useEffect(() => {
    loadOrders();
  }, []);

  // Handle realtime order insert
  const handleOrderInsert = useCallback((order: Order) => {
    console.log('[OrderMonitoring] Realtime INSERT received:', {
      orderId: order.id,
      status: order.status,
      customerId: order.customer_id,
    });
    
    setOrders((prev) => {
      // Check if order already exists
      if (prev.some((o) => o.id === order.id)) {
        console.log('[OrderMonitoring] Order already exists, skipping insert');
        return prev;
      }
      // Add to the beginning and sort by created_at
      const updated = [order as OrderWithDetails, ...prev].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      console.log('[OrderMonitoring] Order added, new count:', updated.length);
      return updated;
    });
  }, []);

  // Handle realtime order update
  const handleOrderUpdate = useCallback((order: Order, oldOrder?: Order) => {
    console.log('[OrderMonitoring] Realtime update received:', {
      orderId: order.id,
      oldStatus: oldOrder?.status,
      newStatus: order.status,
    });
    
    setOrders((prev) => {
      const existingIndex = prev.findIndex((o) => o.id === order.id);
      
      if (existingIndex >= 0) {
        // Update existing order
        const updated = [...prev];
        updated[existingIndex] = {
          ...updated[existingIndex],
          ...order,
        } as OrderWithDetails;
        return updated;
      } else {
        // Order not in list yet, add it (shouldn't happen but handle gracefully)
        console.log('[OrderMonitoring] Order not found in list, adding:', order.id);
        return [order as OrderWithDetails, ...prev].sort(
          (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
      }
    });
  }, []);

  // Handle realtime order delete
  const handleOrderDelete = useCallback((order: Order) => {
    setOrders((prev) => prev.filter((o) => o.id !== order.id));
  }, []);

  // Subscribe to all orders (admin mode)
  useOrdersRealtime({
    filter: { mode: 'admin' },
    onInsert: handleOrderInsert,
    onUpdate: handleOrderUpdate,
    onDelete: handleOrderDelete,
  });

  const filteredOrders = statusFilter === "all" 
    ? orders 
    : orders.filter(o => o.status === statusFilter);

  const stats = {
    total: orders.length,
    pending: orders.filter(o => o.status === "Pending").length,
    active: orders.filter(o => 
      o.status !== "Completed" && o.status !== "Cancelled" && o.status !== "Pending"
    ).length,
    completed: orders.filter(o => o.status === "Completed").length,
    cancelled: orders.filter(o => o.status === "Cancelled").length
  };

  return (
    <div className="container max-w-7xl mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2 text-[#F1F3F5]">{strings.admin.monitorTitle}</h1>
        <p className="text-[#A7A9AC]">
          {strings.admin.monitorSubtitle}
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-5 mb-8">
        <Card className="bg-[#23262B] border border-[#2F3238] rounded-2xl p-5 text-[#F1F3F5] hover:bg-[#2D3036] transition-all duration-150 ease-out">
          <CardHeader className="pb-3 p-0">
            <CardDescription className="text-[#A7A9AC] mb-1">{strings.admin.totalOrders}</CardDescription>
            <CardTitle className="text-3xl font-semibold text-[#F1F3F5]">{stats.total}</CardTitle>
          </CardHeader>
        </Card>

        <Card className="bg-[#23262B] border border-[#2F3238] rounded-2xl p-5 text-[#F1F3F5] hover:bg-[#2D3036] transition-all duration-150 ease-out">
          <CardHeader className="pb-3 p-0">
            <CardDescription className="text-[#A7A9AC] mb-1">{strings.admin.pending}</CardDescription>
            <CardTitle className="text-3xl font-semibold text-[#FBBF24]">{stats.pending}</CardTitle>
          </CardHeader>
        </Card>

        <Card className="bg-[#23262B] border border-[#2F3238] rounded-2xl p-5 text-[#F1F3F5] hover:bg-[#2D3036] transition-all duration-150 ease-out">
          <CardHeader className="pb-3 p-0">
            <CardDescription className="text-[#A7A9AC] mb-1">{strings.admin.inProgress}</CardDescription>
            <CardTitle className="text-3xl font-semibold text-[#5865F2]">{stats.active}</CardTitle>
          </CardHeader>
        </Card>

        <Card className="bg-[#23262B] border border-[#2F3238] rounded-2xl p-5 text-[#F1F3F5] hover:bg-[#2D3036] transition-all duration-150 ease-out">
          <CardHeader className="pb-3 p-0">
            <CardDescription className="text-[#A7A9AC] mb-1">{strings.admin.completed}</CardDescription>
            <CardTitle className="text-3xl font-semibold text-[#3CD5A0]">{stats.completed}</CardTitle>
          </CardHeader>
        </Card>

        <Card className="bg-[#23262B] border border-[#2F3238] rounded-2xl p-5 text-[#F1F3F5] hover:bg-[#2D3036] transition-all duration-150 ease-out">
          <CardHeader className="pb-3 p-0">
            <CardDescription className="text-[#A7A9AC] mb-1">{strings.admin.cancelled}</CardDescription>
            <CardTitle className="text-3xl font-semibold text-[#EF4444]">{stats.cancelled}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card className="bg-[#23262B] border border-[#2F3238] rounded-2xl p-5 text-[#F1F3F5]">
        <CardHeader className="p-0 pb-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-[#F1F3F5] font-semibold">{strings.admin.allOrders}</CardTitle>
              <CardDescription className="text-[#A7A9AC]">
                {strings.admin.allOrdersDesc}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-[#A7A9AC]" />
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder={strings.admin.filterByStatus} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{strings.admin.allStatuses}</SelectItem>
                  <SelectItem value="Pending">{strings.status.pending}</SelectItem>
                  <SelectItem value="Runner Accepted">{strings.status.accepted}</SelectItem>
                  <SelectItem value="Runner at ATM">{strings.status.runnerAtATM}</SelectItem>
                  <SelectItem value="Cash Withdrawn">{strings.status.cashPicked}</SelectItem>
                  <SelectItem value="Pending Handoff">{strings.status.pendingHandoff}</SelectItem>
                  <SelectItem value="Completed">{strings.status.completed}</SelectItem>
                  <SelectItem value="Cancelled">{strings.status.canceled}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <OrderListSkeleton count={5} />
          ) : filteredOrders.length === 0 ? (
            <EmptyState
              icon={Package}
              title={strings.admin.empty}
              description={statusFilter === "all" ? strings.admin.emptyDesc : `No orders with status: ${statusFilter}`}
            />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-[#2F3238] hover:bg-[#2D3036]">
                    <TableHead className="text-[#A7A9AC]">{strings.admin.orderId}</TableHead>
                    <TableHead className="text-[#A7A9AC]">{strings.runner.customer}</TableHead>
                    <TableHead className="text-[#A7A9AC]">{strings.customer.runner}</TableHead>
                    <TableHead className="text-[#A7A9AC]">{strings.admin.amount}</TableHead>
                    <TableHead className="text-[#A7A9AC]">{strings.admin.total}</TableHead>
                    <TableHead className="text-[#A7A9AC]">Status</TableHead>
                    <TableHead className="text-[#A7A9AC]">{strings.admin.created}</TableHead>
                    <TableHead className="text-right text-[#A7A9AC]">{strings.admin.actions}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOrders.map((order) => (
                    <TableRow 
                      key={order.id}
                      className="cursor-pointer border-[#2F3238] hover:bg-[#2D3036]"
                      onClick={() => {
                        setSelectedOrder(order);
                        setDrawerOpen(true);
                      }}
                    >
                      <TableCell className="font-mono text-sm text-[#F1F3F5]">
                        #{order.id.slice(0, 8)}
                      </TableCell>
                      <TableCell className="text-[#F1F3F5]">
                        <div className="flex items-center gap-2">
                          <Avatar
                            src={order.customer?.avatar_url}
                            fallback={`${order.customer?.first_name} ${order.customer?.last_name}`}
                            size="sm"
                          />
                          <div>
                            <div className="text-sm font-medium text-[#F1F3F5]">
                              {order.customer?.first_name} {order.customer?.last_name}
                            </div>
                            <div className="text-xs text-[#A7A9AC]">
                              {order.customer?.email}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {order.runner ? (
                          <div className="flex items-center gap-2">
                            <Avatar
                              src={order.runner.avatar_url}
                              fallback={`${order.runner.first_name} ${order.runner.last_name}`}
                              size="sm"
                            />
                            <div className="text-sm">
                              {order.runner.first_name} {order.runner.last_name}
                            </div>
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground">{strings.admin.unassigned}</span>
                        )}
                      </TableCell>
                      <TableCell className="font-semibold">
                        ${order.requested_amount.toFixed(2)}
                      </TableCell>
                      <TableCell className="font-semibold">
                        ${order.total_payment.toFixed(2)}
                      </TableCell>
                      <TableCell>
                        <Chip status={order.status} />
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(order.created_at).toLocaleString('en-US')}
                      </TableCell>
                      <TableCell className="text-right">
                        <span className="text-xs text-muted-foreground">{strings.admin.clickToView}</span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Admin Order Drawer */}
      {selectedOrder && (
        <AdminOrderDrawer
          order={selectedOrder}
          open={drawerOpen}
          onOpenChange={setDrawerOpen}
        />
      )}
    </div>
  );
}
