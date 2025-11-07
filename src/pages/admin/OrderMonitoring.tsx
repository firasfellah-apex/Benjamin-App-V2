import { useEffect, useState } from "react";
import { Filter, Package } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getAllOrders, subscribeToOrders } from "@/db/api";
import type { OrderWithDetails } from "@/types/types";
import { Chip } from "@/components/common/Chip";
import { Avatar } from "@/components/common/Avatar";
import { OrderListSkeleton } from "@/components/order/OrderListSkeleton";
import { EmptyState } from "@/components/common/EmptyState";
import { AdminOrderDrawer } from "@/components/admin/AdminOrderDrawer";

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

  useEffect(() => {
    loadOrders();

    const subscription = subscribeToOrders(() => {
      loadOrders();
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

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
        <h1 className="text-3xl font-bold mb-2">Order Monitoring</h1>
        <p className="text-muted-foreground">
          Real-time monitoring of all cash delivery orders
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-5 mb-8">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Total Orders</CardDescription>
            <CardTitle className="text-3xl">{stats.total}</CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Pending</CardDescription>
            <CardTitle className="text-3xl">{stats.pending}</CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription>In Progress</CardDescription>
            <CardTitle className="text-3xl">{stats.active}</CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Completed</CardDescription>
            <CardTitle className="text-3xl">{stats.completed}</CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Cancelled</CardDescription>
            <CardTitle className="text-3xl">{stats.cancelled}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>All Orders</CardTitle>
              <CardDescription>
                Monitor and track all delivery orders
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="Pending">Pending</SelectItem>
                  <SelectItem value="Runner Accepted">Runner Accepted</SelectItem>
                  <SelectItem value="Runner at ATM">Runner at ATM</SelectItem>
                  <SelectItem value="Cash Withdrawn">Cash Withdrawn</SelectItem>
                  <SelectItem value="Pending Handoff">Pending Handoff</SelectItem>
                  <SelectItem value="Completed">Completed</SelectItem>
                  <SelectItem value="Cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <OrderListSkeleton count={5} />
          ) : filteredOrders.length === 0 ? (
            <EmptyState
              icon={Package}
              title="No orders found"
              description={statusFilter === "all" ? "Orders will appear here once customers make requests" : `No orders with status: ${statusFilter}`}
            />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order ID</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Runner</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOrders.map((order) => (
                    <TableRow 
                      key={order.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => {
                        setSelectedOrder(order);
                        setDrawerOpen(true);
                      }}
                    >
                      <TableCell className="font-mono text-sm">
                        #{order.id.slice(0, 8)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Avatar
                            src={order.customer?.avatar_url}
                            fallback={`${order.customer?.first_name} ${order.customer?.last_name}`}
                            size="sm"
                          />
                          <div>
                            <div className="text-sm font-medium">
                              {order.customer?.first_name} {order.customer?.last_name}
                            </div>
                            <div className="text-xs text-muted-foreground">
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
                          <span className="text-sm text-muted-foreground">Unassigned</span>
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
                        {new Date(order.created_at).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <span className="text-xs text-muted-foreground">Click to view</span>
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
