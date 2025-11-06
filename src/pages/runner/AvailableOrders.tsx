import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { DollarSign, MapPin, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { getAvailableOrders, acceptOrder, subscribeToOrders } from "@/db/api";
import type { OrderWithDetails } from "@/types/types";

export default function AvailableOrders() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<OrderWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState<string | null>(null);

  const loadOrders = async () => {
    const data = await getAvailableOrders();
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

  const handleAccept = async (orderId: string) => {
    setAccepting(orderId);
    try {
      const success = await acceptOrder(orderId);
      if (success) {
        toast.success("Order accepted! Proceed to ATM");
        navigate(`/runner/orders/${orderId}`);
      } else {
        toast.error("Failed to accept order. It may have been taken by another runner.");
      }
    } catch (error) {
      toast.error("Failed to accept order");
    } finally {
      setAccepting(null);
    }
  };

  return (
    <div className="container max-w-6xl mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Available Orders</h1>
        <p className="text-muted-foreground">
          Accept orders and start earning
        </p>
      </div>

      {loading ? (
        <div className="text-center py-12 text-muted-foreground">
          Loading available orders...
        </div>
      ) : orders.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <p className="text-muted-foreground mb-2">No orders available at the moment</p>
              <p className="text-sm text-muted-foreground">Check back soon for new delivery requests</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {orders.map((order) => (
            <Card key={order.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-2xl">
                      ${order.requested_amount.toFixed(2)}
                    </CardTitle>
                    <CardDescription>
                      Earn ${order.delivery_fee.toFixed(2)}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    {new Date(order.created_at).toLocaleTimeString([], { 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-start gap-2 text-sm">
                    <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                    <span className="text-muted-foreground line-clamp-2">
                      {order.customer_address}
                    </span>
                  </div>
                </div>

                <div className="pt-2 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Cash Amount</span>
                    <span className="font-semibold">${order.requested_amount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Your Earnings</span>
                    <span className="font-semibold text-success">${order.delivery_fee.toFixed(2)}</span>
                  </div>
                </div>

                <Button
                  onClick={() => handleAccept(order.id)}
                  disabled={accepting === order.id}
                  className="w-full"
                >
                  <DollarSign className="mr-2 h-4 w-4" />
                  {accepting === order.id ? "Accepting..." : "Accept Order"}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
