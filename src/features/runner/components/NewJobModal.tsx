/**
 * NewJobModal Component
 * 
 * Full-screen modal that appears when a new job offer arrives.
 * Shows offer details, countdown timer, and Accept/Skip buttons.
 */

import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Clock, DollarSign, Flag, Link } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRunnerJobs } from '../state/runnerJobsStore';
import { Button } from '@/components/ui/button';
import { SlideToConfirm } from '@/components/customer/SlideToConfirm';
import { SlideToSkip } from '@/components/runner/SlideToSkip';
import { toast } from 'sonner';
// Delivery style helpers removed from imports - delivery type hidden until after cash-out

export function NewJobModal() {
  const { pendingOffer, acceptOffer, skipOffer, online } = useRunnerJobs();
  const navigate = useNavigate();
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const [isAccepting, setIsAccepting] = useState(false);

  // Calculate time remaining
  useEffect(() => {
    if (!pendingOffer) {
      setTimeRemaining(0);
      return;
    }

    const updateTimer = () => {
      const now = new Date().getTime();
      const expires = new Date(pendingOffer.expiresAt).getTime();
      const remaining = Math.max(0, Math.floor((expires - now) / 1000));
      setTimeRemaining(remaining);

      // Auto-expire when timer hits 0
      if (remaining === 0 && pendingOffer) {
        skipOffer("timeout");
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [pendingOffer, skipOffer]);

  // Define callbacks BEFORE early return to follow Rules of Hooks
  const handleAccept = useCallback(async () => {
    if (!pendingOffer) return;
    
    setIsAccepting(true);
    try {
      await acceptOffer();
      toast.success("Job accepted! Starting delivery flow...");
      // Navigate to delivery detail page (existing route)
      navigate(`/runner/deliveries/${pendingOffer.id}`);
    } catch (error: any) {
      console.error('Error accepting offer:', error);
      toast.error(error?.message || "Failed to accept job. It may have been taken.");
    } finally {
      setIsAccepting(false);
    }
  }, [acceptOffer, navigate, pendingOffer]);

  const handleSkip = useCallback(async () => {
    await skipOffer("manual");
  }, [skipOffer]);

  // Format time as MM:SS
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Calculate percentage for countdown ring
  const totalTime = 30; // 30 seconds default
  const percentage = (timeRemaining / totalTime) * 100;

  return (
    <AnimatePresence mode="wait">
      {online && pendingOffer && (
        <motion.div
          key="new-job-modal"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm"
          // Backdrop click disabled - runner must explicitly choose Accept or Skip
        >
        <motion.div
          initial={{ scale: 0.95, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.95, y: 20 }}
          transition={{ type: "spring", duration: 0.24, bounce: 0.2 }}
          className="relative mx-4 w-full max-w-md rounded-2xl bg-[#0B1020] p-5 md:p-6 shadow-elev-2 text-white"
          onClick={(e) => e.stopPropagation()} // Prevent backdrop click
        >
          {/* Header */}
          <div className="mb-6 text-center">
            <h2 className="text-2xl font-bold mb-2">New Job Available</h2>
            <p className="text-sm text-slate-400">Please accept or skip as soon as possible.</p>
          </div>

          {/* Countdown Timer */}
          <div className="mb-6 flex items-center justify-center">
            <div className="relative">
              {/* Circular progress ring */}
              <svg className="w-20 h-20 transform -rotate-90" viewBox="0 0 80 80">
                <circle
                  cx="40"
                  cy="40"
                  r="35"
                  stroke="rgba(255,255,255,0.1)"
                  strokeWidth="6"
                  fill="none"
                />
                <circle
                  cx="40"
                  cy="40"
                  r="35"
                  stroke={timeRemaining > 10 ? "#10b981" : timeRemaining > 5 ? "#f59e0b" : "#ef4444"}
                  strokeWidth="6"
                  fill="none"
                  strokeDasharray={`${2 * Math.PI * 35}`}
                  strokeDashoffset={`${2 * Math.PI * 35 * (1 - percentage / 100)}`}
                  strokeLinecap="round"
                  className="transition-all duration-1000"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-xs text-slate-300 font-medium" aria-live="polite">
                  {formatTime(timeRemaining)}
                </span>
              </div>
            </div>
          </div>

          {/* Offer Details */}
          <div className="space-y-4 mb-6">
            {/* Earnings Only - Security: Do not show cash amount */}
            <div className="flex items-center justify-center p-8 rounded-xl bg-white/5">
              <div className="text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <DollarSign className="h-5 w-5 text-emerald-400" />
                  <div className="text-xs text-slate-400">Your Earnings</div>
                </div>
                <div className="text-3xl font-bold text-emerald-400">${pendingOffer.payout.toFixed(2)}</div>
              </div>
            </div>

            {/* ATM Location and Delivery Area - Side by side */}
            <div className="grid grid-cols-2 gap-3">
              {/* ATM Location */}
              <div className="flex items-start gap-3 p-4 rounded-xl bg-white/5">
                <Flag className="h-5 w-5 text-white mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-slate-400 mb-1">ATM Location</div>
                  <div className="text-sm font-medium text-white">{pendingOffer.pickup.name}</div>
                </div>
              </div>

              {/* Delivery Area - NO delivery type shown in pre-accept UI */}
              {pendingOffer.dropoffApprox.neighborhood ? (
                <div className="flex items-start gap-3 p-4 rounded-xl bg-white/5">
                  <MapPin className="h-5 w-5 text-white mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs text-slate-400 mb-1">Delivery Area</div>
                    <div className="text-sm font-medium text-white">{pendingOffer.dropoffApprox.neighborhood}</div>
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-3 p-4 rounded-xl bg-white/5">
                  <MapPin className="h-5 w-5 text-white mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs text-slate-400 mb-1">Delivery Area</div>
                    <div className="text-sm font-medium text-white">—</div>
                  </div>
                </div>
              )}
            </div>

            {/* Total Travel and Est. Time - Side by side */}
            <div className="grid grid-cols-2 gap-3">
              {/* Total Travel Component */}
              <div className="flex items-start gap-3 p-4 rounded-xl bg-white/5">
                <Link className="h-5 w-5 text-white mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-slate-400 mb-1">Total Travel</div>
                  <div className="text-sm font-medium text-white">{(pendingOffer.distanceKm * 0.621371).toFixed(1)} miles</div>
                </div>
              </div>

              {/* Est. Time Component */}
              <div className="flex items-start gap-3 p-4 rounded-xl bg-white/5">
                <Clock className="h-5 w-5 text-white mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-slate-400 mb-1">Est. Time</div>
                  <div className="text-sm font-medium text-white">{pendingOffer.etaMinutes} min</div>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            {/* Slide-to-Skip Button - Red, above Accept */}
            <SlideToSkip
              onSkip={handleSkip}
              disabled={isAccepting || timeRemaining === 0}
              label="Slide to Skip"
              confirmedLabel="Skipped"
              trackClassName="rounded-[12px] bg-red-500/20 border border-red-500/30"
              handleClassName="rounded-[12px]"
            />

            {/* Slide-to-Confirm Accept Button */}
            <SlideToConfirm
              onConfirm={handleAccept}
              disabled={isAccepting || timeRemaining === 0}
              label="Slide to Accept Job"
              confirmedLabel="Accepting..."
              trackClassName="rounded-[12px] bg-gradient-to-r from-green-500/20 to-emerald-500/30 border border-green-500/30"
              handleClassName="rounded-[12px]"
            />
          </div>
        </motion.div>
      </motion.div>
      )}
    </AnimatePresence>
  );
}

