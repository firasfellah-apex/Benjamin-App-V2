/**
 * RateDeliveryModal Component
 * 
 * Modal for rating a completed delivery (1-5 stars + optional comment)
 */

import { useState } from 'react';
import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { updateOrderRating } from '@/db/api';
import type { OrderWithDetails } from '@/types/types';

interface RateDeliveryModalProps {
  order: OrderWithDetails | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRated?: () => void;
}

export function RateDeliveryModal({ order, open, onOpenChange, onRated }: RateDeliveryModalProps) {
  const [rating, setRating] = useState<number>(0);
  const [hoveredRating, setHoveredRating] = useState<number>(0);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!order || rating === 0) {
      toast.error('Please select a rating');
      return;
    }

    try {
      setLoading(true);
      const result = await updateOrderRating(order.id, rating, comment || null);
      
      if (result.success) {
        toast.success('Thanks for sharing feedback!');
        onOpenChange(false);
        onRated?.();
        // Reset form
        setRating(0);
        setComment('');
      } else {
        toast.error(result.message || 'Failed to submit rating');
      }
    } catch (error: any) {
      console.error('Error rating order:', error);
      toast.error('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      onOpenChange(false);
      // Reset form when closing
      setTimeout(() => {
        setRating(0);
        setComment('');
      }, 200);
    }
  };

  if (!order) return null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Rate Your Delivery</DialogTitle>
          <DialogDescription>
            How was your experience with this delivery?
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Star Rating */}
          <div className="flex flex-col items-center gap-3">
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoveredRating(star)}
                  onMouseLeave={() => setHoveredRating(0)}
                  className="focus:outline-none transition-transform hover:scale-110 active:scale-95"
                  disabled={loading}
                >
                  <Star
                    className={cn(
                      "h-10 w-10 transition-colors",
                      star <= (hoveredRating || rating)
                        ? "fill-yellow-400 text-yellow-400"
                        : "fill-zinc-200 text-zinc-200"
                    )}
                  />
                </button>
              ))}
            </div>
            {rating > 0 && (
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
              {rating === 5 && "Excellent!"}
              {rating === 4 && "Great!"}
              {rating === 3 && "Good"}
              {rating === 2 && "Fair"}
              {rating === 1 && "Poor"}
            </p>
            )}
          </div>

          {/* Comment */}
          <div className="space-y-2">
            <label htmlFor="comment" className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
              Optional Feedback
            </label>
            <Textarea
              id="comment"
              placeholder="Tell us about your experience..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={4}
              className="resize-none"
              disabled={loading}
            />
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={handleClose}
              disabled={loading}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={loading || rating === 0}
              className="flex-1 bg-black text-white hover:bg-black/90"
            >
              {loading ? 'Submitting...' : 'Submit Rating'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

