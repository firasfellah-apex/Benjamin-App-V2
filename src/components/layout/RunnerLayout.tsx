/**
 * RunnerLayout Component
 * 
 * Wrapper layout for runner pages that includes:
 * - RunnerHeader (dark theme with online/offline toggle)
 * - PageContainer with runner dark theme
 * - Bottom navigation (Work / Earnings / More)
 * - Proper padding to avoid content being hidden by bottom nav
 * - Consistent dark mode styling
 * - Slide transitions between tabs
 */

import React, { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { PageContainer } from './PageContainer';
import { RunnerHeader } from './RunnerHeader';
import { RunnerBottomNav } from '../runner/RunnerBottomNav';
import { NewJobModal } from '@/features/runner/components/NewJobModal';
import { RunnerJobsProvider, useRunnerJobs } from '@/features/runner/state/runnerJobsStore';
import { useJobOffersSubscription } from '@/features/runner/realtime/jobChannel';
import { useProfile } from '@/contexts/ProfileContext';
import { cn } from "@/lib/utils";

interface RunnerLayoutProps {
  children: React.ReactNode;
  showBottomNav?: boolean;
}

// Tab order for determining slide direction
const TAB_ORDER = {
  '/runner/work': 0,
  '/runner': 0,
  '/runner/earnings': 1,
  '/runner/more': 2,
};

function getTabIndex(pathname: string): number {
  if (pathname.startsWith('/runner/earnings')) return 1;
  if (pathname.startsWith('/runner/more')) return 2;
  return 0; // work or /runner
}

function RunnerLayoutContent({ children, showBottomNav }: RunnerLayoutProps) {
  const location = useLocation();
  const prevTabIndexRef = useRef<number | null>(null);
  const [slideDirection, setSlideDirection] = useState<'left' | 'right' | null>(null);
  const isInitialMount = useRef(true);
  const { profile } = useProfile();
  const { setOnline } = useRunnerJobs();
  
  // Subscribe to job offers
  useJobOffersSubscription();
  
  // Sync online status from profile to store
  useEffect(() => {
    if (profile?.is_online !== undefined) {
      setOnline(profile.is_online);
    }
  }, [profile?.is_online, setOnline]);
  
  // Determine slide direction based on tab navigation
  useEffect(() => {
    const currentTabIndex = getTabIndex(location.pathname);
    
    // Skip animation on initial mount
    if (isInitialMount.current) {
      isInitialMount.current = false;
      prevTabIndexRef.current = currentTabIndex;
      return;
    }
    
    if (prevTabIndexRef.current !== null && prevTabIndexRef.current !== currentTabIndex) {
      if (currentTabIndex > prevTabIndexRef.current) {
        // Moving forward (Work → Earnings → More): slide left (new page comes from right)
        setSlideDirection('left');
      } else if (currentTabIndex < prevTabIndexRef.current) {
        // Moving backward (More → Earnings → Work): slide right (new page comes from left)
        setSlideDirection('right');
      }
    }
    
    prevTabIndexRef.current = currentTabIndex;
    
    // Reset direction after animation completes
    const timer = setTimeout(() => setSlideDirection(null), 300);
    return () => clearTimeout(timer);
  }, [location.pathname]);
  
  // Hide bottom nav on nested pages (deliveries, order detail)
  const shouldShowBottomNav = showBottomNav !== undefined 
    ? showBottomNav 
    : !location.pathname.includes('/runner/deliveries') && 
      !location.pathname.includes('/runner/orders/') &&
      location.pathname !== '/runner/deliveries';

  return (
    <div 
      className="h-full flex flex-col bg-[#020817]"
    >
      <RunnerHeader />
      <PageContainer 
        variant="runner" 
        className="flex-1"
      >
        <div
          key={location.pathname}
          className={cn(
            "flex-1 min-h-0 overflow-y-auto overflow-x-hidden px-6 bg-[#020817]",
            slideDirection === 'left' && "animate-[slideInLeft_300ms_ease-in-out]",
            slideDirection === 'right' && "animate-[slideInRight_300ms_ease-in-out]",
            shouldShowBottomNav ? 'pt-2' : 'py-2'
          )}
          style={{
            WebkitOverflowScrolling: 'touch',
            backgroundColor: '#020817', // Explicit background to prevent white gap
            ...(shouldShowBottomNav && {
              paddingBottom: 'calc(76px + env(safe-area-inset-bottom, 0px))',
            }),
          }}
        >
          {children}
        </div>
      </PageContainer>
      
      {/* Fixed bottom navigation */}
      {shouldShowBottomNav && <RunnerBottomNav />}
      
      {/* Global job offer modal */}
      <NewJobModal />
    </div>
  );
}

export function RunnerLayout({ children, showBottomNav }: RunnerLayoutProps) {
  return (
    <RunnerJobsProvider>
      <RunnerLayoutContent showBottomNav={showBottomNav}>
        {children}
      </RunnerLayoutContent>
    </RunnerJobsProvider>
  );
}
