/**
 * Admin Order Drawer Component
 * 
 * Slide-in drawer showing detailed order information:
 * - Order timeline with status progression
 * - Customer and runner avatars
 * - Map with locations
 * - Event audit log
 */

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Avatar } from '@/components/common/Avatar';
import { OrderProgressTimeline } from '@/components/order/OrderProgressTimeline';
import { Chip } from '@/components/common/Chip';
import { OrderWithDetails } from '@/types/types';
import { MapPin, User, DollarSign, Clock } from 'lucide-react';

interface AdminOrderDrawerProps {
  order: OrderWithDetails | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AdminOrderDrawer({
  order,
  open,
  onOpenChange
}: AdminOrderDrawerProps) {
  if (!order) return null;

  const formatDate = (date: string) => {
    return new Date(date).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatCurrency = (amount: number) => {
    return `$${amount.toFixed(2)}`;
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-xl">
        <SheetHeader>
          <SheetTitle className="flex items-center justify-between">
            <span>Order #{order.id.slice(0, 8)}</span>
            <Chip status={order.status} />
          </SheetTitle>
          <SheetDescription>
            Created {formatDate(order.created_at)}
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-8rem)] mt-6">
          <div className="space-y-6 pr-4">
            {/* Timeline */}
            <div>
              <h3 className="text-sm font-medium mb-3">Order Progress</h3>
              <OrderProgressTimeline
                currentStatus={order.status}
                variant="internal"
              />
            </div>

            <Separator />

            {/* Customer Info */}
            <div>
              <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
                <User className="h-4 w-4" />
                Customer
              </h3>
              <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                <Avatar
                  src={order.customer?.avatar_url}
                  fallback={order.customer_name || 'Customer'}
                  size="md"
                />
                <div className="flex-1">
                  <p className="font-medium">{order.customer_name || 'Unknown'}</p>
                  <p className="text-sm text-muted-foreground">{order.customer?.email || 'N/A'}</p>
                </div>
              </div>
            </div>

            {/* Runner Info */}
            {order.runner_id && (
              <>
                <Separator />
                <div>
                  <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Runner
                  </h3>
                  <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                    <Avatar
                      src={order.runner?.avatar_url}
                      fallback={`${order.runner?.first_name} ${order.runner?.last_name}`}
                      size="md"
                    />
                    <div className="flex-1">
                      <p className="font-medium">
                        {order.runner?.first_name} {order.runner?.last_name}
                      </p>
                      <p className="text-sm text-muted-foreground">{order.runner?.email || 'N/A'}</p>
                    </div>
                  </div>
                </div>
              </>
            )}

            <Separator />

            {/* Order Details */}
            <div>
              <h3 className="text-sm font-medium mb-3">Order Details</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <DollarSign className="h-4 w-4" />
                    <span>Requested Amount</span>
                  </div>
                  <span className="font-medium">{formatCurrency(order.requested_amount)}</span>
                </div>

                <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <DollarSign className="h-4 w-4" />
                    <span>Service Fee</span>
                  </div>
                  <span className="font-medium">{formatCurrency(order.total_service_fee)}</span>
                </div>

                <div className="flex items-center justify-between p-3 bg-primary/10 rounded-lg border border-primary/20">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <DollarSign className="h-4 w-4" />
                    <span>Total Payment</span>
                  </div>
                  <span className="font-bold">{formatCurrency(order.total_payment)}</span>
                </div>
              </div>
            </div>

            <Separator />

            {/* Locations */}
            <div>
              <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Locations
              </h3>
              <div className="space-y-2">
                {order.customer_address && (
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-xs text-muted-foreground mb-1">Customer Address</p>
                    <p className="text-sm">{order.customer_address}</p>
                  </div>
                )}

                {order.customer_notes && (
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-xs text-muted-foreground mb-1">Customer Notes</p>
                    <p className="text-sm">{order.customer_notes}</p>
                  </div>
                )}
              </div>
            </div>

            <Separator />

            {/* Event Log */}
            <div>
              <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Event Log
              </h3>
              <div className="space-y-2">
                {order.handoff_completed_at && (
                  <div className="flex items-start gap-3 p-2 rounded-lg">
                    <div className="h-2 w-2 rounded-full bg-primary mt-2" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">Handoff Completed</p>
                      <p className="text-xs text-muted-foreground">{formatDate(order.handoff_completed_at)}</p>
                    </div>
                  </div>
                )}

                {order.cash_withdrawn_at && (
                  <div className="flex items-start gap-3 p-2 rounded-lg">
                    <div className="h-2 w-2 rounded-full bg-primary mt-2" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">Cash Withdrawn</p>
                      <p className="text-xs text-muted-foreground">{formatDate(order.cash_withdrawn_at)}</p>
                    </div>
                  </div>
                )}

                {order.runner_at_atm_at && (
                  <div className="flex items-start gap-3 p-2 rounded-lg">
                    <div className="h-2 w-2 rounded-full bg-muted-foreground mt-2" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">Runner at ATM</p>
                      <p className="text-xs text-muted-foreground">{formatDate(order.runner_at_atm_at)}</p>
                    </div>
                  </div>
                )}

                {order.runner_accepted_at && (
                  <div className="flex items-start gap-3 p-2 rounded-lg">
                    <div className="h-2 w-2 rounded-full bg-muted-foreground mt-2" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">Runner Accepted</p>
                      <p className="text-xs text-muted-foreground">{formatDate(order.runner_accepted_at)}</p>
                    </div>
                  </div>
                )}

                {order.cancelled_at && (
                  <div className="flex items-start gap-3 p-2 rounded-lg">
                    <div className="h-2 w-2 rounded-full bg-destructive mt-2" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">Order Cancelled</p>
                      <p className="text-xs text-muted-foreground">{formatDate(order.cancelled_at)}</p>
                      {order.cancellation_reason && (
                        <p className="text-xs text-muted-foreground mt-1">Reason: {order.cancellation_reason}</p>
                      )}
                    </div>
                  </div>
                )}

                <div className="flex items-start gap-3 p-2 rounded-lg">
                  <div className="h-2 w-2 rounded-full bg-muted-foreground mt-2" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">Order Created</p>
                    <p className="text-xs text-muted-foreground">{formatDate(order.created_at)}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
