/**
 * Completion Rating Modal Component
 * 
 * Slide-up modal that appears when an order is completed, prompting the customer
 * to rate their runner. Similar to Uber's post-delivery experience.
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Star, Phone } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Avatar } from '@/components/common/Avatar';
import { rateRunner } from '@/db/api';
import { toast } from 'sonner';
import type { OrderWithDetails } from '@/types/types';
import { getRunnerDisplayName } from '@/lib/reveal';
import OnTimeIllustration from '@/assets/illustrations/OnTime.png';

interface CompletionRatingModalProps {
  order: OrderWithDetails | null;
  open: boolean;
  onClose: () => void;
  onRated?: () => void;
}

export function CompletionRatingModal({
  order,
  open,
  onClose,
  onRated,
}: CompletionRatingModalProps) {
  const [rating, setRating] = useState<number>(0);
  const [hoveredRating, setHoveredRating] = useState<number>(0);
  const [submitting, setSubmitting] = useState(false);

  // Reset rating when modal opens/closes
  useEffect(() => {
    if (!open) {
      setRating(0);
      setHoveredRating(0);
    }
  }, [open]);

  // Don't show if order is already rated
  if (!order || order.runner_rating) {
    return null;
  }

  const runner = order.runner;
  const runnerName = runner
    ? getRunnerDisplayName(
        (runner as any)?.first_name,
        (runner as any)?.last_name,
        order.status
      )
    : 'Your runner';

  const handleSubmit = async () => {
    if (rating === 0) {
      toast.error('Please select a rating');
      return;
    }

    try {
      setSubmitting(true);
      await rateRunner(order.id, rating);
      toast.success('Thanks for rating your runner!');
      onRated?.();
      onClose();
    } catch (error: any) {
      console.error('Error rating runner:', error);
      toast.error(error?.message || 'Failed to submit rating');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSkip = () => {
    onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleSkip}
            className="fixed inset-0 bg-black/50 z-50"
          />

          {/* Slide-up Modal */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{
              type: 'spring',
              stiffness: 300,
              damping: 30,
            }}
            className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-3xl shadow-2xl max-h-[90vh] overflow-y-auto"
          >
            {/* Close Button */}
            <div className="absolute top-4 right-4 z-10">
              <button
                onClick={handleSkip}
                className="h-8 w-8 rounded-full bg-black/10 flex items-center justify-center hover:bg-black/20 transition-colors"
                aria-label="Close"
              >
                <X className="h-4 w-4 text-white" />
              </button>
            </div>

            <div className="relative">
              {/* Illustration Section */}
              <div className="h-80 flex items-center justify-center relative overflow-hidden" style={{ backgroundColor: '#F5F5F4' }}>
                <img
                  src={OnTimeIllustration}
                  alt="Delivery completed"
                  className="w-full h-full object-contain object-center"
                />
              </div>

              {/* Content Section - White Background */}
              <div className="px-6 py-6 space-y-6">
                {/* Success Message */}
                <div className="text-center space-y-2">
                  <h2 className="text-2xl font-bold text-slate-900">Right on time</h2>
                  <p className="text-sm text-slate-600">
                    {runnerName} delivered your cash right on time. Take a minute to rate and say thanks.
                  </p>
                </div>

                {/* Runner Info Card */}
                {runner && (
                  <div className="rounded-xl bg-slate-50 border border-slate-200 p-4">
                    <div className="flex items-center gap-3">
                      <Avatar
                        src={(runner as any)?.avatar_url || undefined}
                        fallback={runnerName}
                        size="md"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-semibold text-slate-900">
                              Delivered by {runnerName}
                            </p>
                            <p className="text-xs text-slate-500 mt-0.5">
                              Ring {runnerName} if you can't find your order
                            </p>
                          </div>
                          <button
                            onClick={() => {
                              // TODO: Implement call functionality
                              toast.info('Call feature coming soon');
                            }}
                            className="p-2 rounded-full bg-white border border-slate-200 hover:bg-slate-50 transition-colors"
                            aria-label="Call runner"
                          >
                            <Phone className="h-4 w-4 text-slate-600" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Rating Section */}
                <div className="space-y-4">
                  <div className="text-center">
                    <p className="text-sm font-medium text-slate-900 mb-4">
                      How was your experience?
                    </p>
                    <div className="flex items-center justify-center gap-2">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setRating(star)}
                          onMouseEnter={() => setHoveredRating(star)}
                          onMouseLeave={() => setHoveredRating(0)}
                          className="focus:outline-none transition-transform hover:scale-110 active:scale-95"
                          disabled={submitting}
                        >
                          <Star
                            className="h-10 w-10 transition-colors"
                            style={{
                              color: star <= (hoveredRating || rating) ? '#DFB300' : '#E5E7EB',
                              fill: star <= (hoveredRating || rating) ? '#DFB300' : '#E5E7EB'
                            }}
                          />
                        </button>
                      ))}
                    </div>
                    {rating > 0 && (
                      <p className="text-sm text-slate-600 mt-3">
                        {rating === 5 && "Excellent! ⭐"}
                        {rating === 4 && "Great! 👍"}
                        {rating === 3 && "Good"}
                        {rating === 2 && "Fair"}
                        {rating === 1 && "Poor"}
                      </p>
                    )}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="space-y-3 pt-2">
                  <Button
                    onClick={handleSubmit}
                    disabled={submitting || rating === 0}
                    className="w-full h-12 rounded-full bg-black text-white hover:bg-black/90 text-base font-medium"
                  >
                    {submitting ? 'Submitting...' : 'Rate your order'}
                  </Button>
                  <button
                    onClick={handleSkip}
                    disabled={submitting}
                    className="w-full text-sm text-slate-500 hover:text-slate-700 py-2"
                  >
                    Maybe later
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

