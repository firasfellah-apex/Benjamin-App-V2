import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Eye, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getCustomerOrders, subscribeToOrders } from "@/db/api";
import type { OrderWithDetails } from "@/types/types";
import { Chip } from "@/components/common/Chip";
import { Avatar } from "@/components/common/Avatar";
import { OrderListSkeleton } from "@/components/order/OrderListSkeleton";
import { EmptyState } from "@/components/common/EmptyState";
import { strings } from "@/lib/strings";

export default function MyOrders() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<OrderWithDetails[]>([]);
  const [loading, setLoading] = useState(true);

  const loadOrders = async () => {
    const data = await getCustomerOrders();
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

  return (
    <div className="container max-w-6xl mx-auto py-8 px-4">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">{strings.customer.ordersTitle}</h1>
          <p className="text-muted-foreground">
            {strings.customer.ordersSubtitle}
          </p>
        </div>
        <Button onClick={() => navigate("/customer/request")}>
          <Plus className="mr-2 h-4 w-4" />
          {strings.customer.newOrderButton}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{strings.customer.orderHistoryTitle}</CardTitle>
          <CardDescription>
            {strings.customer.orderHistoryDesc}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <OrderListSkeleton count={3} />
          ) : orders.length === 0 ? (
            <EmptyState
              icon={Package}
              title={strings.emptyStates.noOrders}
              description={strings.emptyStates.noOrdersDesc}
              actionLabel={strings.customer.createFirstOrder}
              onAction={() => navigate("/customer/request")}
            />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{strings.admin.orderId}</TableHead>
                    <TableHead>{strings.customer.runner}</TableHead>
                    <TableHead>{strings.admin.amount}</TableHead>
                    <TableHead>{strings.admin.total}</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>{strings.admin.created}</TableHead>
                    <TableHead className="text-right">{strings.admin.actions}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell className="font-mono text-sm">
                        #{order.id.slice(0, 8)}
                      </TableCell>
                      <TableCell>
                        {order.runner ? (
                          <div className="flex items-center gap-2">
                            <Avatar
                              src={order.runner.avatar_url}
                              fallback={`${order.runner.first_name} ${order.runner.last_name}`}
                              size="sm"
                            />
                            <span className="text-sm">
                              {order.runner.first_name} {order.runner.last_name}
                            </span>
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground">{strings.admin.notAssigned}</span>
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
                        {new Date(order.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate(`/customer/orders/${order.id}`)}
                        >
                          <Eye className="mr-2 h-4 w-4" />
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
