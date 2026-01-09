import { useState, useEffect, useRef, useCallback } from "react";
import { X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { IconButton } from "@/components/ui/icon-button";

interface StoryPage {
  id: string;
  content: React.ReactNode;
}

interface BankingHelpStoriesProps {
  isOpen: boolean;
  onClose: () => void;
  pages: StoryPage[];
  duration?: number; // Duration per page in milliseconds (default 5 seconds)
  closeButtonPosition?: { top: number; right: number } | null; // Position to match the help button
}

const DEFAULT_DURATION = 10000; // 10 seconds per page (Instagram-style)

export function BankingHelpStories({
  isOpen,
  onClose,
  pages,
  duration = DEFAULT_DURATION,
  closeButtonPosition,
}: BankingHelpStoriesProps) {
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const pausedRef = useRef(false);
  
  // Swipe gesture state
  const touchStartYRef = useRef<number | null>(null);
  const touchCurrentYRef = useRef<number | null>(null);
  const [swipeOffset, setSwipeOffset] = useState(0);
  const SWIPE_THRESHOLD = 100; // Minimum pixels to swipe down to close

  const currentPage = pages[currentPageIndex];

  // Reset when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setCurrentPageIndex(0);
      setProgress(0);
      pausedRef.current = false;
      startTimeRef.current = Date.now();
    } else {
      // Cleanup
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      setProgress(0);
      startTimeRef.current = null;
    }
  }, [isOpen]);

  // Progress animation
  useEffect(() => {
    if (!isOpen || pausedRef.current || !currentPage) return;

    // Clear any existing interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    // Reset progress when page changes
    setProgress(0);
    startTimeRef.current = Date.now();

    // Update progress every 16ms (60fps)
    intervalRef.current = setInterval(() => {
      if (pausedRef.current || !startTimeRef.current) return;

      const elapsed = Date.now() - startTimeRef.current;
      const newProgress = Math.min((elapsed / duration) * 100, 100);
      setProgress(newProgress);

      // Auto-advance when progress reaches 100%
      if (newProgress >= 100) {
        handleNext();
      }
    }, 16);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isOpen, currentPageIndex, duration, currentPage]);

  const handleNext = useCallback(() => {
    if (currentPageIndex < pages.length - 1) {
      setCurrentPageIndex((prev) => prev + 1);
      setProgress(0);
      startTimeRef.current = Date.now();
    } else {
      // Last page - close
      onClose();
    }
  }, [currentPageIndex, pages.length, onClose]);

  const handlePrevious = useCallback(() => {
    if (currentPageIndex > 0) {
      setCurrentPageIndex((prev) => prev - 1);
      setProgress(0);
      startTimeRef.current = Date.now();
    }
  }, [currentPageIndex]);

  // Pause on touch/click start, resume on end
  const handlePause = useCallback(() => {
    pausedRef.current = true;
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const handleResume = useCallback(() => {
    if (pausedRef.current && startTimeRef.current) {
      // Adjust start time to account for pause
      const elapsed = Date.now() - startTimeRef.current;
      const remaining = duration - elapsed;
      if (remaining > 0) {
        startTimeRef.current = Date.now() - (duration - remaining);
        pausedRef.current = false;
        // Restart interval
        intervalRef.current = setInterval(() => {
          if (pausedRef.current || !startTimeRef.current) return;
          const elapsed = Date.now() - startTimeRef.current;
          const newProgress = Math.min((elapsed / duration) * 100, 100);
          setProgress(newProgress);
          if (newProgress >= 100) {
            handleNext();
          }
        }, 16);
      } else {
        // Time already elapsed, move to next
        handleNext();
      }
    }
  }, [duration, handleNext]);

  // Swipe down gesture handlers
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartYRef.current = e.touches[0].clientY;
    touchCurrentYRef.current = e.touches[0].clientY;
    handlePause(); // Pause story progress while swiping
  }, [handlePause]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (touchStartYRef.current === null) return;
    
    touchCurrentYRef.current = e.touches[0].clientY;
    const deltaY = touchCurrentYRef.current - touchStartYRef.current;
    
    // Only allow downward swipes (positive deltaY)
    if (deltaY > 0) {
      setSwipeOffset(deltaY);
    }
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (touchStartYRef.current === null || touchCurrentYRef.current === null) {
      handleResume();
      return;
    }
    
    const deltaY = touchCurrentYRef.current - touchStartYRef.current;
    
    // If swiped down enough, close the stories
    if (deltaY > SWIPE_THRESHOLD) {
      onClose();
    } else {
      // Reset swipe offset and resume
      setSwipeOffset(0);
      handleResume();
    }
    
    // Reset touch refs
    touchStartYRef.current = null;
    touchCurrentYRef.current = null;
  }, [onClose, SWIPE_THRESHOLD, handleResume]);

  // Reset swipe offset when closing
  useEffect(() => {
    if (!isOpen) {
      setSwipeOffset(0);
      touchStartYRef.current = null;
      touchCurrentYRef.current = null;
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black z-[100]"
            onClick={onClose}
          />

          {/* Stories Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 0 }}
            animate={{ 
              opacity: swipeOffset > 0 ? Math.max(0.3, 1 - swipeOffset / 500) : 1, 
              scale: swipeOffset > 0 ? Math.max(0.8, 1 - swipeOffset / 1000) : 1, 
              y: swipeOffset,
            }}
            exit={{ opacity: 0, scale: 0.95, y: "100%" }}
            transition={{ 
              duration: swipeOffset > 0 ? 0 : 0.3,
              type: swipeOffset > 0 ? "spring" : "tween",
              spring: { stiffness: 300, damping: 30 },
            }}
            className="fixed inset-0 z-[101] flex items-center justify-center"
            onMouseDown={handlePause}
            onMouseUp={handleResume}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            style={{ 
              touchAction: "pan-y",
              userSelect: "none",
            }}
          >
            <div 
              className="relative w-full h-full max-w-md mx-auto bg-black"
            >
              {/* Fixed Black Background - stays constant, never changes */}
              <div className="absolute inset-0 bg-black pointer-events-none" />
              
              {/* Progress Bars - Instagram style (edge-to-edge) */}
              <div className="absolute top-0 left-0 right-0 z-10 flex gap-2 px-3 pt-3">
                {pages.map((_, index) => (
                  <div
                    key={index}
                    className="flex-1 h-1 bg-slate-700 rounded-full overflow-hidden"
                  >
                    <motion.div
                      className="h-full bg-green-500 rounded-full"
                      initial={{ width: index < currentPageIndex ? "100%" : "0%" }}
                      animate={{
                        width:
                          index < currentPageIndex
                            ? "100%"
                            : index === currentPageIndex
                            ? `${progress}%`
                            : "0%",
                      }}
                      transition={{ duration: 0.1, ease: "linear" }}
                    />
                  </div>
                ))}
              </div>

              {/* Close Button - positioned same as help button, styled like map layer close button */}
              <IconButton
                onClick={(e) => {
                  e.stopPropagation();
                  onClose();
                }}
                className="absolute z-20 bg-[#2A2A2A] hover:bg-[#3A3A3A] text-white"
                style={
                  closeButtonPosition
                    ? {
                        top: `${closeButtonPosition.top}px`,
                        right: `${closeButtonPosition.right}px`,
                      }
                    : {
                        top: '1rem',
                        right: '1rem',
                      }
                }
                aria-label="Close"
                size="lg"
              >
                <X className="h-5 w-5" strokeWidth={2} />
              </IconButton>

              {/* Content Area - only content rotates, background stays fixed */}
              <div className="absolute inset-0">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={currentPage?.id}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.2 }}
                    className="absolute inset-0"
                  >
                    {currentPage?.content}
                  </motion.div>
                </AnimatePresence>
              </div>

              {/* Left/Right Click Areas for Navigation - 50% width each */}
              <div
                className="absolute left-0 top-0 bottom-0 w-1/2 cursor-pointer z-[5]"
                onClick={(e) => {
                  e.stopPropagation();
                  handlePrevious();
                }}
                aria-label="Previous"
              />
              <div
                className="absolute right-0 top-0 bottom-0 w-1/2 cursor-pointer z-[5]"
                onClick={(e) => {
                  e.stopPropagation();
                  handleNext();
                }}
                aria-label="Next"
              />
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

