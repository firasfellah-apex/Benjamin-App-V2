import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getCustomerOrders, subscribeToOrders } from "@/db/api";
import type { OrderWithDetails, OrderStatus } from "@/types/types";

const statusColors: Record<OrderStatus, string> = {
  "Pending": "bg-muted text-muted-foreground",
  "Runner Accepted": "bg-accent text-accent-foreground",
  "Runner at ATM": "bg-accent text-accent-foreground",
  "Cash Withdrawn": "bg-accent text-accent-foreground",
  "Pending Handoff": "bg-accent text-accent-foreground",
  "Completed": "bg-success text-success-foreground",
  "Cancelled": "bg-destructive text-destructive-foreground"
};

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
          <h1 className="text-3xl font-bold mb-2">My Orders</h1>
          <p className="text-muted-foreground">
            View and track your cash delivery orders
          </p>
        </div>
        <Button onClick={() => navigate("/customer/request")}>
          <Plus className="mr-2 h-4 w-4" />
          New Request
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Order History</CardTitle>
          <CardDescription>
            All your cash delivery requests
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">
              Loading orders...
            </div>
          ) : orders.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-4">No orders yet</p>
              <Button onClick={() => navigate("/customer/request")}>
                <Plus className="mr-2 h-4 w-4" />
                Create Your First Order
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order ID</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell className="font-mono text-sm">
                        #{order.id.slice(0, 8)}
                      </TableCell>
                      <TableCell className="font-semibold">
                        ${order.requested_amount.toFixed(2)}
                      </TableCell>
                      <TableCell className="font-semibold">
                        ${order.total_payment.toFixed(2)}
                      </TableCell>
                      <TableCell>
                        <Badge className={statusColors[order.status]}>
                          {order.status}
                        </Badge>
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
