import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ShellCard } from "@/components/ui/ShellCard";
import { StatusChip } from "@/components/ui/StatusChip";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getRunnerOrders, subscribeToOrders } from "@/db/api";
import type { OrderWithDetails } from "@/types/types";
import { useProfile } from "@/contexts/ProfileContext";

export default function MyDeliveries() {
  const navigate = useNavigate();
  const { profile } = useProfile();
  const [orders, setOrders] = useState<OrderWithDetails[]>([]);
  const [loading, setLoading] = useState(true);

  const loadOrders = async () => {
    const data = await getRunnerOrders();
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

  const activeOrders = orders.filter(o => 
    o.status !== "Completed" && o.status !== "Cancelled"
  );
  const completedOrders = orders.filter(o => o.status === "Completed");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">My Deliveries</h1>
          <p className="text-sm text-slate-400">
            Track your delivery orders and earnings
          </p>
        </div>
        <Button 
          onClick={() => navigate("/runner/available")}
          className="bg-indigo-600 text-white hover:bg-indigo-700 rounded-xl"
        >
          View Available Orders
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <ShellCard variant="runner">
          <div className="space-y-1">
            <p className="text-sm text-slate-400">Monthly Earnings</p>
            <p className="text-3xl font-bold text-white">
              ${profile?.monthly_earnings.toFixed(2) || '0.00'}
            </p>
          </div>
        </ShellCard>

        <ShellCard variant="runner">
          <div className="space-y-1">
            <p className="text-sm text-slate-400">Active Deliveries</p>
            <p className="text-3xl font-bold text-white">
              {activeOrders.length}
            </p>
          </div>
        </ShellCard>

        <ShellCard variant="runner">
          <div className="space-y-1">
            <p className="text-sm text-slate-400">Completed This Month</p>
            <p className="text-3xl font-bold text-white">
              {completedOrders.length}
            </p>
          </div>
        </ShellCard>
      </div>

      {activeOrders.length > 0 && (
        <ShellCard variant="runner">
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-white">Active Deliveries</h2>
              <p className="text-sm text-slate-400 mt-1">
                Orders currently in progress
              </p>
            </div>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-700 hover:bg-slate-800/50">
                    <TableHead className="text-slate-300">Order ID</TableHead>
                    <TableHead className="text-slate-300">Amount</TableHead>
                    <TableHead className="text-slate-300">Earnings</TableHead>
                    <TableHead className="text-slate-300">Status</TableHead>
                    <TableHead className="text-slate-300">Accepted</TableHead>
                    <TableHead className="text-right text-slate-300">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activeOrders.map((order) => (
                    <TableRow key={order.id} className="border-slate-700 hover:bg-slate-800/50">
                      <TableCell className="font-mono text-sm text-slate-300">
                        #{order.id.slice(0, 8)}
                      </TableCell>
                      <TableCell className="font-semibold text-white">
                        ${order.requested_amount.toFixed(2)}
                      </TableCell>
                      <TableCell className="font-semibold text-emerald-400">
                        ${order.delivery_fee.toFixed(2)}
                      </TableCell>
                      <TableCell>
                        <StatusChip status={order.status} tone="runner" />
                      </TableCell>
                      <TableCell className="text-sm text-slate-400">
                        {order.runner_accepted_at ? new Date(order.runner_accepted_at).toLocaleString() : '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate(`/runner/orders/${order.id}`)}
                          className="text-slate-300 hover:text-white hover:bg-slate-700"
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
          </div>
        </ShellCard>
      )}

      <ShellCard variant="runner">
        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-white">Delivery History</h2>
            <p className="text-sm text-slate-400 mt-1">
              All your completed deliveries
            </p>
          </div>
          {loading ? (
            <div className="text-center py-8 text-slate-400">
              Loading deliveries...
            </div>
          ) : orders.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-slate-400 mb-4">No deliveries yet</p>
              <Button 
                onClick={() => navigate("/runner/available")}
                className="bg-indigo-600 text-white hover:bg-indigo-700 rounded-xl"
              >
                View Available Orders
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-700 hover:bg-slate-800/50">
                    <TableHead className="text-slate-300">Order ID</TableHead>
                    <TableHead className="text-slate-300">Amount</TableHead>
                    <TableHead className="text-slate-300">Earnings</TableHead>
                    <TableHead className="text-slate-300">Status</TableHead>
                    <TableHead className="text-slate-300">Completed</TableHead>
                    <TableHead className="text-right text-slate-300">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.map((order) => (
                    <TableRow key={order.id} className="border-slate-700 hover:bg-slate-800/50">
                      <TableCell className="font-mono text-sm text-slate-300">
                        #{order.id.slice(0, 8)}
                      </TableCell>
                      <TableCell className="font-semibold text-white">
                        ${order.requested_amount.toFixed(2)}
                      </TableCell>
                      <TableCell className="font-semibold text-emerald-400">
                        ${order.delivery_fee.toFixed(2)}
                      </TableCell>
                      <TableCell>
                        <StatusChip status={order.status} tone="runner" />
                      </TableCell>
                      <TableCell className="text-sm text-slate-400">
                        {order.handoff_completed_at ? new Date(order.handoff_completed_at).toLocaleDateString() : '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate(`/runner/orders/${order.id}`)}
                          className="text-slate-300 hover:text-white hover:bg-slate-700"
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
        </div>
      </ShellCard>
    </div>
  );
}
