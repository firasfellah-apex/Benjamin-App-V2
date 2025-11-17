import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import type { ComponentType, SVGProps } from 'react';

interface TrustCardBullet {
  text: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
}

interface TrustCard {
  id: string;
  image?: string; // URL or path to image
  title: string;
  bullets: TrustCardBullet[];
}

interface TrustCarouselProps {
  cards: TrustCard[];
  className?: string;
}

export function TrustCarousel({ cards, className }: TrustCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const carouselRef = useRef<HTMLDivElement>(null);
  const currentIndexRef = useRef(0);
  const hasUserInteractedRef = useRef(false);
  const autoAdvanceTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isAutoAdvancingRef = useRef(false);

  const scrollToIndex = (index: number, isAutoAdvance = false) => {
    if (!carouselRef.current) return;
    if (index < 0 || index >= cards.length) return;
    
    if (isAutoAdvance) {
      isAutoAdvancingRef.current = true;
    }
    
    const cardWidth = carouselRef.current.offsetWidth;
    carouselRef.current.scrollTo({
      left: index * cardWidth,
      behavior: 'smooth',
    });
    currentIndexRef.current = index;
    setCurrentIndex(index);
    
    // Reset flag after scroll animation completes (smooth scroll takes ~300ms)
    if (isAutoAdvance) {
      setTimeout(() => {
        isAutoAdvancingRef.current = false;
      }, 500); // Longer delay to cover smooth scroll animation
    }
  };

  // Stop auto-advance when user interacts
  const handleUserInteraction = () => {
    // Don't mark as interaction if this is from auto-advance
    if (isAutoAdvancingRef.current) {
      return;
    }
    
    if (!hasUserInteractedRef.current) {
      hasUserInteractedRef.current = true;
      // Clear auto-advance timer
      if (autoAdvanceTimerRef.current) {
        clearInterval(autoAdvanceTimerRef.current);
        autoAdvanceTimerRef.current = null;
      }
    }
  };

  // Auto-advance carousel every 5 seconds (only if user hasn't interacted)
  // Resets when component mounts (user returns to home page)
  useEffect(() => {
    // Reset interaction state on mount
    hasUserInteractedRef.current = false;
    
    // Don't auto-advance if there's only one card
    if (cards.length <= 1) {
      return;
    }

    // Start auto-advance timer
    autoAdvanceTimerRef.current = setInterval(() => {
      if (!hasUserInteractedRef.current && carouselRef.current) {
        const nextIndex = (currentIndexRef.current + 1) % cards.length;
        scrollToIndex(nextIndex, true); // Mark as auto-advance
      }
    }, 5000); // 5 seconds

    return () => {
      // Clean up timer on unmount
      if (autoAdvanceTimerRef.current) {
        clearInterval(autoAdvanceTimerRef.current);
        autoAdvanceTimerRef.current = null;
      }
    };
  }, [cards.length]); // Re-run if cards change or component remounts

  // Sync scroll position with currentIndex
  useEffect(() => {
    currentIndexRef.current = currentIndex;
  }, [currentIndex]);

  // Handle scroll events to update currentIndex
  useEffect(() => {
    if (!carouselRef.current) return;
    
    const handleScroll = () => {
      if (!carouselRef.current) return;
      const scrollLeft = carouselRef.current.scrollLeft;
      const cardWidth = carouselRef.current.offsetWidth;
      const newIndex = Math.round(scrollLeft / cardWidth);
      if (newIndex !== currentIndexRef.current && newIndex >= 0 && newIndex < cards.length) {
        currentIndexRef.current = newIndex;
        setCurrentIndex(newIndex);
      }
    };
    
    const element = carouselRef.current;
    element.addEventListener('scroll', handleScroll, { passive: true });
    return () => element.removeEventListener('scroll', handleScroll);
  }, [cards.length]);



  return (
    <div className={cn("w-full", className)}>
      <div className="w-full flex justify-center">
        {/* Fixed outer frame */}
        <div className="w-full max-w-md rounded-2xl bg-white border border-slate-200 overflow-hidden shadow-sm">
          {/* Horizontal scrolling container inside the frame */}
          <div
            ref={carouselRef}
            className="flex overflow-x-auto snap-x snap-mandatory scrollbar-hide"
            onTouchStart={handleUserInteraction}
            onTouchMove={handleUserInteraction}
            onScroll={handleUserInteraction}
            onClick={handleUserInteraction}
            style={{
              scrollbarWidth: 'none',
              msOverflowStyle: 'none',
              WebkitOverflowScrolling: 'touch',
              scrollSnapType: 'x mandatory',
              gap: 0,
            }}
          >
            {cards.map((card, index) => (
              <motion.div
                key={card.id}
                className="snap-center shrink-0 w-full flex justify-center"
                style={{ 
                  scrollSnapAlign: 'center',
                  margin: 0,
                  padding: 0,
                }}
                animate={{
                  scale: currentIndex === index ? 1 : 0.98,
                  opacity: currentIndex === index ? 1 : 0.7,
                }}
                transition={{
                  type: "spring",
                  stiffness: 300,
                  damping: 30,
                  mass: 0.5,
                }}
              >
                  <div className="w-full flex flex-col md:flex-row">
                  {/* Image half */}
                  <div className="w-full md:w-1/2 h-48 md:h-auto flex items-center justify-center p-6 bg-black">
                    {card.image ? (
                      <img
                        src={card.image}
                        alt={card.title}
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-slate-200 to-slate-300 flex items-center justify-center">
                        <span className="text-slate-400 text-sm">Image placeholder</span>
                      </div>
                    )}
                  </div>

                  {/* Text half */}
                  <div className="w-full md:w-1/2 p-6 flex flex-col justify-center">
                    <h3 className="text-lg font-semibold text-slate-900 mb-3">
                      {card.title}
                    </h3>
                    <ul className="space-y-2.5">
                      {card.bullets.map((bullet, i) => {
                        const Icon = bullet.icon;
                        return (
                          <li key={i} className="flex items-center gap-3">
                            <Icon className="w-4 h-4 text-emerald-500 shrink-0" />
                            <span className="text-sm text-slate-600 leading-relaxed">{bullet.text}</span>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
          
          {/* Dots indicator - outside scrolling container, always visible - iOS-style spring animations */}
          {cards.length > 1 && (
            <div className="flex justify-center gap-2 py-4 px-6 bg-white">
              {cards.map((_, idx) => (
                <motion.button
                  key={idx}
                  type="button"
                  onClick={() => {
                    handleUserInteraction();
                    scrollToIndex(idx, false);
                  }}
                  className={cn(
                    "h-2 rounded-full",
                    currentIndex === idx ? "bg-slate-900" : "bg-slate-300"
                  )}
                  animate={{
                    width: currentIndex === idx ? 32 : 8,
                    scale: currentIndex === idx ? 1.1 : 1,
                  }}
                  transition={{
                    type: "spring",
                    stiffness: 400,
                    damping: 35,
                    mass: 0.4,
                  }}
                  aria-label={`Go to slide ${idx + 1}`}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

