/**
 * AddressCarousel Component
 * 
 * Full-width address carousel that shows one address card at a time
 * with pagination dots. Includes an "Add Address" slide at the end.
 */

import React, { useEffect, useMemo, useState, useRef, useCallback } from "react";
import { useLocation } from "react-router-dom";
import type { CustomerAddress } from "@/types/types";
import { cn } from "@/lib/utils";
import { getIconByName } from "@/components/address/IconPicker";
import { formatAddress } from "@/db/api";
import { AddressCard } from "./AddressCard";
import { MapPin, Plus } from "@/lib/icons";
import { track } from "@/lib/analytics";

type AddressCarouselProps = {
  addresses: CustomerAddress[];
  selectedAddressId: string | null;
  onSelectAddress: (address: CustomerAddress) => void;
  onAddAddress: () => void;
  onEditAddress?: (address: CustomerAddress) => void;
  onDeleteAddress?: (address: CustomerAddress) => void;
  onManageAddresses?: () => void; // New handler for manage addresses card
};

type Slide = { type: "address"; address: CustomerAddress } | { type: "manage" };

export const AddressCarousel: React.FC<AddressCarouselProps> = ({
  addresses,
  selectedAddressId,
  onSelectAddress,
  onAddAddress,
  onEditAddress,
  onDeleteAddress,
  onManageAddresses,
}) => {
  const location = useLocation();
  const slides: Slide[] = useMemo(() => {
    const base = addresses.map((address) => ({ type: "address", address } as Slide));
    return [...base, { type: "manage" } as Slide];
  }, [addresses]);

  const initialIndex = useMemo(() => {
    if (!selectedAddressId || slides.length === 0) return 0;
    const idx = slides.findIndex(
      (s) => s.type === "address" && s.address.id === selectedAddressId
    );
    return idx >= 0 ? idx : 0;
  }, [slides, selectedAddressId]);

  const [index, setIndex] = useState(initialIndex);
  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);
  const isUserInitiatedChange = useRef(false);
  const prevActiveAddressId = useRef<string | null>(null);
  const isUserScrollingRef = useRef(false);
  const carouselRef = useRef<HTMLDivElement>(null);
  const scrollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isAnimatingRef = useRef(false);
  const animationFrameRef = useRef<number | null>(null);

  // Swipe detection
  const minSwipeDistance = 50;

  // iOS-like easing function
  const easeOutCubic = (t: number): number => {
    return 1 - Math.pow(1 - t, 3);
  };

  // Snap to specific index with iOS-like easing animation
  // Define this early so it can be used in effects below
  const snapToIndex = useCallback((targetIndex: number) => {
    const container = carouselRef.current;
    if (!container || isAnimatingRef.current) return;

    const cardCount = slides.length;
    const clamped = Math.max(0, Math.min(cardCount - 1, targetIndex));
    const cardWidth = container.clientWidth;
    const target = clamped * cardWidth;

    const start = container.scrollLeft;
    const distance = target - start;

    // If already at target, just update index
    if (Math.abs(distance) < 1) {
      setIndex(clamped);
      return;
    }

    isAnimatingRef.current = true;
    const duration = 260; // ms
    let startTime: number | null = null;

    const step = (timestamp: number) => {
      if (startTime == null) startTime = timestamp;
      const elapsed = timestamp - startTime;
      const t = Math.min(1, elapsed / duration);
      const eased = easeOutCubic(t);
      
      container.scrollLeft = start + distance * eased;
      
      if (t < 1) {
        animationFrameRef.current = requestAnimationFrame(step);
      } else {
        // Animation complete
        container.scrollLeft = target;
        setIndex(clamped);
        isAnimatingRef.current = false;
        animationFrameRef.current = null;
      }
    };

    animationFrameRef.current = requestAnimationFrame(step);
  }, [slides.length]);

  const goTo = (next: number) => {
    if (!slides.length) return;
    const bounded = (next + slides.length) % slides.length;
    isUserInitiatedChange.current = true;
    snapToIndex(bounded);
  };

  // Simplified touch handlers - let native scroll snapping handle most of the work
  // Only use for very intentional swipes that need programmatic navigation
  const onTouchStart = (e: React.TouchEvent) => {
    touchEndX.current = null;
    touchStartX.current = e.targetTouches[0].clientX;
    isUserScrollingRef.current = true;
  };

  const onTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.targetTouches[0].clientX;
  };

  const onTouchEnd = () => {
    // Let native scroll snapping handle the positioning
    // Only trigger programmatic navigation for very clear swipes
    if (!touchStartX.current || !touchEndX.current) {
      isUserScrollingRef.current = false;
      return;
    }
    
    const distance = touchStartX.current - touchEndX.current;
    const isLeftSwipe = distance > minSwipeDistance * 1.5; // Increased threshold
    const isRightSwipe = distance < -minSwipeDistance * 1.5;
    
    // Only programmatically navigate for very clear swipes
    // Otherwise let the native scroll snap handle it
    if (isLeftSwipe || isRightSwipe) {
      isUserInitiatedChange.current = true;
      if (isLeftSwipe) {
        goTo(index + 1);
      } else {
        goTo(index - 1);
      }
    }
    
    // Reset after a short delay to allow scroll to settle
    setTimeout(() => {
      isUserScrollingRef.current = false;
    }, 100);
  };

  // Keep index in sync when addresses/selection change (external sync only)
  // Only sync when selectedAddressId changes externally, not when user scrolls
  const prevSelectedAddressIdRef = useRef<string | null>(selectedAddressId);
  const isInitialMountRef = useRef(true);
  
  useEffect(() => {
    if (!slides.length) return;
    
    // Skip sync on initial mount - let initialIndex handle it
    if (isInitialMountRef.current) {
      isInitialMountRef.current = false;
      return;
    }
    
    // Only sync if selectedAddressId changed externally (not from user scrolling)
    const selectedAddressIdChanged = prevSelectedAddressIdRef.current !== selectedAddressId;
    prevSelectedAddressIdRef.current = selectedAddressId;
    
    // Don't sync if user is currently scrolling or just scrolled
    if (isUserScrollingRef.current || isUserInitiatedChange.current) {
      return;
    }
    
    // Don't sync if we're currently on the "Manage addresses" slide
    // This allows the user to stay on that slide without being forced back
    const currentSlide = slides[index];
    if (currentSlide?.type === "manage") {
      return;
    }
    
    // Only sync if selectedAddressId actually changed externally
    if (selectedAddressIdChanged && selectedAddressId) {
      const selectedIdx = slides.findIndex(
        (s) => s.type === "address" && s.address.id === selectedAddressId
      );
      
      if (selectedIdx >= 0 && selectedIdx !== index) {
        // This is an external sync, not user-initiated
        isUserInitiatedChange.current = false;
        snapToIndex(selectedIdx);
      }
    }
    
    // Safety check: ensure index is within bounds
    if (index >= slides.length) {
      setIndex(Math.max(0, slides.length - 1));
    }
  }, [slides, selectedAddressId, index, snapToIndex]);

  const active = slides[index];

  // Notify when active slide is an address (only on user-initiated changes)
  // Don't notify if we're on the "Add address" slide
  useEffect(() => {
    if (active?.type === "address") {
      const currentAddressId = active.address.id;
      // Only call onSelectAddress if user manually changed the slide
      // Skip if this is an external sync (selectedAddressId changed externally)
      if (isUserInitiatedChange.current && prevActiveAddressId.current !== currentAddressId) {
        prevActiveAddressId.current = currentAddressId;
        onSelectAddress(active.address);
        // Track user-initiated address selection (swipe or pagination)
        track('address_selected', {
          address_count: addresses.length,
          is_default: active.address.is_default || false,
          source: 'carousel_swipe',
        });
        isUserInitiatedChange.current = false;
      } else if (!isUserInitiatedChange.current) {
        // Update the ref even if we don't call onSelectAddress
        prevActiveAddressId.current = currentAddressId;
      }
    } else if (active?.type === "manage") {
      // When on "Manage addresses" slide, don't try to sync back to an address
      // This allows the user to stay on this slide
      isUserInitiatedChange.current = false;
    }
  }, [active, onSelectAddress, index, addresses.length]);

  // Initial scroll to selected index on mount (only if not index 0)
  const hasInitialScrolledRef = useRef(false);
  useEffect(() => {
    if (hasInitialScrolledRef.current || !carouselRef.current) return;
    if (initialIndex === 0) {
      hasInitialScrolledRef.current = true;
      console.log('[InitialScroll] Skipped: initialIndex is 0');
      return;
    }
    
    console.log('[InitialScroll] Scrolling to initial index:', initialIndex);
    // Small delay to ensure container is rendered
    const timeout = setTimeout(() => {
      if (carouselRef.current && !hasInitialScrolledRef.current) {
        hasInitialScrolledRef.current = true;
        snapToIndex(initialIndex);
        console.log('[InitialScroll] Scrolled to index:', initialIndex);
      }
    }, 150);
    return () => clearTimeout(timeout);
  }, [initialIndex, snapToIndex]);

  // Reset initial scroll flag when addresses change (component remounts or addresses reload)
  useEffect(() => {
    hasInitialScrolledRef.current = false;
  }, [addresses.length]);

  // Scroll to active card when index changes programmatically (not user scrolling)
  useEffect(() => {
    if (carouselRef.current && !isUserScrollingRef.current && !isAnimatingRef.current) {
      const container = carouselRef.current;
      const cardWidth = container.offsetWidth;
      const targetScroll = index * cardWidth;
      
      // Only scroll if we're significantly off target (more than 2px)
      if (Math.abs(container.scrollLeft - targetScroll) > 2) {
        snapToIndex(index);
      }
    }
  }, [index, snapToIndex]);

  // Improved scroll handler with debouncing and iOS-like snap detection
  // Treats all slides (including "Add address") equally
  const handleScroll = useCallback(() => {
    if (!carouselRef.current || isAnimatingRef.current) return;
    
    const container = carouselRef.current;
    const scrollLeft = container.scrollLeft;
    const cardWidth = container.offsetWidth;
    
    if (!cardWidth) return;
    
    // Calculate which slide we're closest to
    const rawIndex = scrollLeft / cardWidth;
    const newIndex = Math.round(rawIndex);
    
    // Clear previous timeout
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }
    
    // Mark as user scrolling to prevent sync effect from interfering
    isUserScrollingRef.current = true;
    
    // Update index if we've moved to a different slide
    // This works for ALL slides, including "Add address" (last slide)
    if (newIndex !== index && newIndex >= 0 && newIndex < slides.length) {
      isUserInitiatedChange.current = true;
      setIndex(newIndex);
    }
    
    // After scrolling stops, ensure we snap to the nearest slide with iOS-like easing
    scrollTimeoutRef.current = setTimeout(() => {
      if (!carouselRef.current || isAnimatingRef.current) return;
      
      const currentScroll = carouselRef.current.scrollLeft;
      const currentCardWidth = carouselRef.current.offsetWidth;
      
      if (!currentCardWidth) {
        isUserScrollingRef.current = false;
        return;
      }
      
      const currentRawIndex = currentScroll / currentCardWidth;
      const nearestIndex = Math.round(currentRawIndex);
      
      // Ensure index is within valid range (including last slide which is "Add address")
      if (nearestIndex < 0 || nearestIndex >= slides.length) {
        isUserScrollingRef.current = false;
        return;
      }
      
      // Snap to nearest index with iOS-like easing
      snapToIndex(nearestIndex);
      
      // Reset scrolling flags after a delay
      setTimeout(() => {
        isUserScrollingRef.current = false;
      }, 100);
    }, 80);
  }, [index, slides.length, snapToIndex]);

  // Cleanup timeouts and animation frames on unmount
  useEffect(() => {
    return () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  // Bounce hint animation - shows every time user opens address selection page
  // Runs when there are 2+ addresses and carousel is at scroll position 0
  const bounceAnimationFrameRef = useRef<number | null>(null);
  const hasBouncedRef = useRef(false);
  const bounceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  // Reset bounce flag when route changes to address selection page
  useEffect(() => {
    const isAddressSelectionRoute = location.pathname === '/customer/request' || location.pathname.startsWith('/customer/request');
    if (isAddressSelectionRoute) {
      console.log('[Bounce] Route is address selection, resetting bounce flag');
      hasBouncedRef.current = false;
    }
  }, [location.pathname]);
  
  // Bounce animation effect - trigger when component mounts with 2+ addresses
  useEffect(() => {
    // Only run on address selection route
    const isAddressSelectionRoute = location.pathname === '/customer/request' || location.pathname.startsWith('/customer/request');
    if (!isAddressSelectionRoute) {
      console.log('[Bounce] Not on address selection route, skipping');
      return;
    }

    console.log('[Bounce] Effect triggered:', {
      slidesLength: slides.length,
      hasBounced: hasBouncedRef.current,
      pathname: location.pathname,
      containerExists: !!carouselRef.current,
      initialIndex: initialIndex
    });

    if (slides.length < 2) {
      console.log('[Bounce] Skipped: Less than 2 slides');
      return;
    }
    
    if (hasBouncedRef.current) {
      console.log('[Bounce] Skipped: Already bounced');
      return;
    }
    
    // Only bounce when there's no selected address (initialIndex === 0)
    // This means we're showing the first address card
    if (initialIndex !== 0) {
      console.log('[Bounce] Skipped: initialIndex is not 0 (selected address exists), initialIndex:', initialIndex);
      return;
    }

    const container = carouselRef.current;
    if (!container) {
      console.log('[Bounce] Container not available yet, will retry');
      // Retry after a short delay if container isn't ready
      bounceTimeoutRef.current = setTimeout(() => {
        // Re-trigger by updating a dependency or just check again
        if (carouselRef.current && !hasBouncedRef.current && slides.length >= 2) {
          console.log('[Bounce] Retry: Container now available');
          // The effect will re-run due to dependency changes
        }
      }, 100);
      return;
    }

    console.log('[Bounce] Setting up bounce animation with delay...');

    // Clear any existing timeout
    if (bounceTimeoutRef.current) {
      clearTimeout(bounceTimeoutRef.current);
    }

    // Wait for initial render, scroll animations, and page transitions to complete
    // Increased delay to ensure we're past all initial animations
    bounceTimeoutRef.current = setTimeout(() => {
      if (!carouselRef.current) {
        console.log('[Bounce] Timeout: Container not available');
        return;
      }
      
      if (hasBouncedRef.current) {
        console.log('[Bounce] Timeout: Already bounced');
        return;
      }
      
      const container = carouselRef.current;
      const cardWidth = container.clientWidth;
      const currentScroll = container.scrollLeft;
      
      // Calculate which card we're on based on scroll position
      const currentIndex = cardWidth > 0 ? Math.round(currentScroll / cardWidth) : 0;
      
      console.log('[Bounce] Before bounce check:', {
        cardWidth,
        currentScroll,
        currentIndex,
        scrollLeft: container.scrollLeft,
        indexState: index
      });
      
      // Verify we're still at the first card (within reasonable tolerance)
      // Since we already checked initialIndex === 0 above, we just need to verify scroll position
      const isAtFirstCard = Math.abs(currentScroll) < 50; // More lenient tolerance
      
      if (!isAtFirstCard) {
        console.log('[Bounce] Skipped: Not at first card position', {
          currentScroll,
          currentIndex,
          tolerance: 50
        });
        return;
      }

      // Mark as bounced to prevent multiple bounces
      hasBouncedRef.current = true;
      console.log('[Bounce] ✅ Starting bounce animation!');

      // Temporarily disable scroll-snap during bounce for smoother animation
      // Force disable scroll-snap by setting it directly on the element with !important
      // This overrides the inline style set via React's style prop
      container.style.setProperty('scroll-snap-type', 'none', 'important');
      
      // Prevent scroll event handler from interfering during bounce
      isAnimatingRef.current = true;
      
      const distance = container.clientWidth * 0.25; // Increased to 25% for more visible effect (~97px on 390px container)
      const duration = 650; // Slowed down slightly for better visibility (was 500ms)
      let startTime: number | null = null;
      const initialScrollLeft = container.scrollLeft;

      console.log('[Bounce] Animation params:', {
        distance,
        duration,
        initialScrollLeft,
        containerWidth: container.clientWidth
      });

      const step = (timestamp: number) => {
        if (!carouselRef.current) {
          console.log('[Bounce] Step: Container lost during animation');
          // Restore scroll-snap and reset animation flag
          isAnimatingRef.current = false;
          return;
        }
        
        if (startTime == null) startTime = timestamp;
        const elapsed = timestamp - startTime;
        const t = Math.min(1, elapsed / duration);
        
        // Smoother ease in-out for bounce effect
        // Uses a cubic ease for more natural, visible motion
        const easeInOut = (t: number) => {
          // Cubic ease in-out - smoother than quadratic
          return t < 0.5
            ? 4 * t * t * t
            : 1 - Math.pow(-2 * t + 2, 3) / 2;
        };
        
        // Create bounce: go right from initial position, then bounce back
        // First half: ease out (go right), second half: ease in (bounce back)
        const bounceProgress = t < 0.5 
          ? easeInOut(t * 2) // 0 to 1 in first half (go right)
          : easeInOut(2 - t * 2); // 1 to 0 in second half (bounce back)
        
        const offset = initialScrollLeft + distance * bounceProgress;
        
        if (carouselRef.current) {
          carouselRef.current.scrollLeft = offset;
          
          // Log progress every 100ms for debugging
          if (Math.floor(elapsed / 100) !== Math.floor((elapsed - 16) / 100)) {
            console.log('[Bounce] Progress:', {
              t: t.toFixed(2),
              bounceProgress: bounceProgress.toFixed(2),
              offset: offset.toFixed(2),
              scrollLeft: carouselRef.current.scrollLeft.toFixed(2)
            });
          }
          
          if (t < 1) {
            bounceAnimationFrameRef.current = requestAnimationFrame(step);
          } else {
            console.log('[Bounce] ✅ Animation complete, restoring scroll-snap');
            // Restore scroll-snap
            if (carouselRef.current) {
              // Remove the important override - this will restore the original style from React's style prop
              carouselRef.current.style.removeProperty('scroll-snap-type');
              // Ensure we're back at position 0
              carouselRef.current.scrollLeft = 0;
            }
            // Reset animation flag after a brief delay to ensure scroll position is set
            setTimeout(() => {
              isAnimatingRef.current = false;
            }, 100);
            bounceAnimationFrameRef.current = null;
          }
        }
      };

      bounceAnimationFrameRef.current = requestAnimationFrame(step);
    }, 1500); // Longer delay to ensure all animations are complete

    return () => {
      if (bounceTimeoutRef.current) {
        clearTimeout(bounceTimeoutRef.current);
        bounceTimeoutRef.current = null;
      }
      if (bounceAnimationFrameRef.current !== null) {
        cancelAnimationFrame(bounceAnimationFrameRef.current);
        bounceAnimationFrameRef.current = null;
      }
    };
  }, [slides.length, location.pathname, snapToIndex, initialIndex]); // Include initialIndex to check if we should bounce

  // Helper function to get address title
  const getAddressTitle = (addr: CustomerAddress): string => {
    return addr.label || addr.line1?.split(',')[0] || 'Address';
  };

  // Zero-address state: show icon + short copy + "Add your first address" primary button
  // Parent container (CustomerTopShelf) already provides px-6 padding, so we don't add it here
  // Content fills container and sizes by content
  if (addresses.length === 0) {
    return (
      <div className="w-full">
        <div className="w-full flex flex-col items-center justify-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-[#F4F7FB] flex items-center justify-center">
            <MapPin className="w-8 h-8 text-slate-600" />
          </div>
          <h3 className="text-lg font-semibold text-slate-900 text-center">
            No Address Yet
          </h3>
          <p className="text-sm text-slate-500 text-center">
            Let's add your first address.
          </p>
          <button
            type="button"
            onClick={onAddAddress}
            className="w-full rounded-full bg-black text-white text-base font-semibold active:scale-[0.98] transition-transform duration-150 flex items-center justify-center gap-2 py-4 px-6"
          >
            <Plus className="w-5 h-5" />
            Add Your First Address
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Swipeable carousel container - no side padding, extends edge-to-edge */}
      <div
        ref={carouselRef}
        className="flex overflow-x-auto snap-x snap-mandatory scrollbar-hide pb-2"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onScroll={handleScroll}
        style={{ 
          scrollbarWidth: 'none', 
          msOverflowStyle: 'none',
          WebkitOverflowScrolling: 'touch', // iOS momentum scrolling
          scrollSnapType: 'x mandatory',
        }}
      >
        {slides.map((slide, i) => (
          <div
            key={i}
            className="snap-center shrink-0 w-full px-8 flex justify-center"
            style={{
              scrollSnapAlign: 'center',
              scrollSnapStop: 'always',
            }}
          >
            {slide.type === "address" ? (
              <AddressCard
                mode="carousel"
                label={getAddressTitle(slide.address)}
                addressLine={formatAddress(slide.address)}
                isDefault={slide.address.is_default}
                isSelected={i === index}
                icon={(() => {
                  const IconComponent = getIconByName(slide.address.icon || 'Home');
                  return (
                    <div className="flex items-center justify-center rounded-full bg-[#F4F7FB] text-slate-800 w-10 h-10 shrink-0">
                      <IconComponent className="w-6 h-6" />
                    </div>
                  );
                })()}
                onClick={() => {
                  isUserInitiatedChange.current = true;
                  snapToIndex(i);
                  onSelectAddress(slide.address);
                  track('address_selected', {
                    address_count: addresses.length,
                    is_default: slide.address.is_default || false,
                    source: 'user_click',
                  });
                }}
                onEdit={onEditAddress ? (e) => {
                  e.stopPropagation();
                  onEditAddress(slide.address);
                } : undefined}
                onDelete={onDeleteAddress ? (e) => {
                  e.stopPropagation();
                  onDeleteAddress(slide.address);
                } : undefined}
              />
            ) : (
              <AddressCard
                mode="manage-carousel"
                addressLine="View, edit, or remove saved locations."
                onClick={() => {
                  isUserInitiatedChange.current = true;
                  snapToIndex(i);
                  if (onManageAddresses) {
                    onManageAddresses();
                  }
                }}
              />
            )}
          </div>
        ))}
      </div>

      {/* Pagination dots with smooth morphing animation */}
      {slides.length > 1 && (
        <div className="mt-4 flex items-center justify-center gap-1.5">
          {slides.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => {
                isUserInitiatedChange.current = true;
                snapToIndex(i);
                // Also handle address selection if clicking on an address dot
                if (i < slides.length && slides[i]?.type === "address") {
                  onSelectAddress(slides[i].address);
                  track('address_selected', {
                    address_count: addresses.length,
                    is_default: slides[i].address.is_default || false,
                    source: 'pagination_dot',
                  });
                } else if (i < slides.length && slides[i]?.type === "manage" && onManageAddresses) {
                  // Handle manage addresses card click from pagination dot
                  onManageAddresses();
                }
              }}
              className={cn(
                "h-1.5 rounded-full transition-all duration-300 ease-in-out",
                i === index 
                  ? "w-6 bg-gray-900" 
                  : "w-1.5 bg-gray-300 hover:bg-gray-400"
              )}
              aria-label={`Go to slide ${i + 1}`}
              style={{
                transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1), background-color 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
};

