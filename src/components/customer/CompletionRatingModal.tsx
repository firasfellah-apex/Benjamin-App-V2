/**
 * Completion Rating Modal Component
 * 
 * Slide-up modal that appears when an order is completed, prompting the customer
 * to rate their runner. Similar to Uber's post-delivery experience.
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar } from '@/components/common/Avatar';
import { rateRunner } from '@/db/api';
import { toast } from 'sonner';
import type { OrderWithDetails } from '@/types/types';
import { getRunnerDisplayName } from '@/lib/reveal';
import OnTimeIllustration from '@/assets/illustrations/OnTime.png';
import { ReportIssueSheet } from '@/components/customer/ReportIssueSheet';

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
  const [showReportSheet, setShowReportSheet] = useState(false);

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

  // Close rating modal when issue sheet opens
  const handleReportIssue = () => {
    setShowReportSheet(true);
  };

  return (
    <AnimatePresence>
      {open && !showReportSheet && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleSkip}
            className="fixed inset-0 bg-black/50 z-[100]"
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
            className="fixed bottom-0 left-0 right-0 z-[100] bg-white rounded-t-3xl shadow-2xl max-h-[90vh] overflow-y-auto"
          >
            {/* Close Button */}
            <div className="absolute top-4 right-4 z-10">
              <button
                onClick={handleSkip}
                className="w-12 h-12 p-0 inline-flex items-center justify-center rounded-full border border-[#F0F0F0] bg-white hover:bg-slate-50 active:bg-slate-100 transition-colors touch-manipulation"
                aria-label="Close"
              >
                <X className="h-5 w-5 text-slate-900" />
              </button>
            </div>

            <div className="relative">
              {/* Illustration Section */}
              <div className="h-48 flex items-center justify-center relative overflow-hidden" style={{ backgroundColor: 'rgb(242, 171, 88)' }}>
                <img
                  src={OnTimeIllustration}
                  alt="Delivery completed"
                  className="w-3/4 h-3/4 object-contain object-center"
                />
              </div>

              {/* Content Section - White Background */}
              <div className="px-6 py-6 space-y-6">
                {/* Success Message */}
                <div className="text-center space-y-2">
                  <h2 className="text-2xl font-bold text-slate-900">Right on Time</h2>
                  <p className="text-sm text-slate-600 whitespace-pre-line">
                    {runnerName} delivered your cash safely.{'\n'}Mind taking a second to rate the experience?
                  </p>
                </div>

                {/* Runner Info Card */}
                {runner && (() => {
                  const runnerAny = runner as any;
                  const deliveriesCount =
                    runnerAny?.completed_deliveries ??
                    runnerAny?.total_deliveries ??
                    runnerAny?.deliveries_completed ??
                    runnerAny?.completed_runs ??
                    null;
                  
                  return (
                    <div className="rounded-xl bg-slate-50 border border-slate-200 p-5">
                      <div className="flex items-center gap-3">
                        <Avatar
                          src={runnerAny?.avatar_url || undefined}
                          fallback={runnerName}
                          size="md"
                        />
                        <div className="flex flex-col">
                          <p className="text-sm font-semibold text-slate-900">
                            Delivered by {runnerName}
                          </p>
                          {/* Meta row: rating + deliveries */}
                          {(runnerAny?.avg_runner_rating || deliveriesCount) && (
                            <div className="flex items-center flex-wrap gap-x-3 gap-y-0.5 mt-0.5">
                              {runnerAny?.avg_runner_rating && (
                                <p className="text-xs text-slate-500">
                                  ⭐ {runnerAny.avg_runner_rating.toFixed(1)} average rating
                                </p>
                              )}
                              {deliveriesCount && !Number.isNaN(Number(deliveriesCount)) && (
                                <p className="text-xs text-slate-500">
                                  • {deliveriesCount} deliveries completed
                                </p>
                              )}
                            </div>
                          )}
                          {runnerAny?.fun_fact && (
                            <p className="text-xs text-slate-500 mt-1 italic">
                              {runnerAny.fun_fact}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })()}

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
                              color: star <= (hoveredRating || rating) ? '#F2AB58' : '#E5E7EB',
                              fill: star <= (hoveredRating || rating) ? '#F2AB58' : '#E5E7EB'
                            }}
                          />
                        </button>
                      ))}
                    </div>
                    {rating > 0 && (
                      <p className="text-sm text-slate-600 mt-3">
                        {rating === 5 && "Excellent"}
                        {rating === 4 && "Great"}
                        {rating === 3 && "Good"}
                        {rating === 2 && "Fair"}
                        {rating === 1 && "Poor"}
                      </p>
                    )}
                  </div>
                  {/* Rating Importance Note */}
                  <p className="text-xs text-slate-500 text-center px-4">
                    Great runners earn more on Benjamin. Your rating helps keep the experience sharp, safe, and premium.
                  </p>
                </div>

                {/* Action Buttons */}
                <div className="space-y-3 pt-2">
                  <Button
                    onClick={handleSubmit}
                    disabled={submitting || rating === 0}
                    className="w-full h-[56px] rounded-full bg-black text-white hover:bg-black/90 text-base font-medium"
                  >
                    {submitting ? 'Submitting...' : 'Rate your order'}
                  </Button>
                  {order && (
                    <button
                      type="button"
                      disabled={submitting}
                      onClick={handleReportIssue}
                      className="w-full text-[11px] text-slate-400 hover:text-slate-600 pb-1"
                    >
                      Something felt off? Report an issue
                    </button>
                  )}
                </div>
              </div>
            </div>
            
          </motion.div>
        </>
      )}
      
      {/* Report Issue Sheet - Separate from rating modal */}
      {order && (
        <ReportIssueSheet
          open={showReportSheet}
          order={order}
          onClose={() => {
            setShowReportSheet(false);
            // Close the rating modal too when issue sheet closes
            onClose();
          }}
        />
      )}
    </AnimatePresence>
  );
}

