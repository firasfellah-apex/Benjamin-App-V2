/**
 * CustomerScreen Component
 * 
 * Shared 3-zone layout for customer pages:
 * - Header Bar: persistent header row (logo + menu) - never remounts
 * - Top Shelf: full-width, bottom-rounded, bottom-shadow only - morphs smoothly
 * - Map: flex-1 fills remaining space (with padding-bottom for fixed footer)
 * - Footer: fixed to bottom, hugs content (bottom nav/CTAs)
 * 
 * Header bar stays mounted; only shelf body morphs between routes.
 */

import React from "react";
import { useLocation } from "react-router-dom";
import CustomerHeaderBar from "@/components/customer/layout/CustomerHeaderBar";
import CustomerTopShelf from "@/components/customer/layout/CustomerTopShelf";
import TopShelfSection from "@/components/customer/layout/TopShelfSection";

interface CustomerScreenProps {
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  loading?: boolean;              // Loading state for skeletons
  actions?: React.ReactNode;      // Optional action buttons/chips
  nextKey?: string;               // Optional next route key for pre-measurement
  nextEstimate?: React.ReactNode; // Optional lightweight estimate of next view
  headerLeft?: React.ReactNode;   // Optional custom left header (defaults to logo)
  headerRight?: React.ReactNode;  // Optional custom right header (defaults to menu)
  children?: React.ReactNode;     // Content that goes inside the TopShelf
  map?: React.ReactNode;          // middle map area
  footer?: React.ReactNode;       // bottom nav / CTAs (will be fixed to bottom)
}

export function CustomerScreen({ 
  title, 
  subtitle,
  loading = false,
  actions,
  nextKey,
  nextEstimate,
  headerLeft,
  headerRight,
  children,
  map, 
  footer 
}: CustomerScreenProps) {
  const location = useLocation();
  const routeKey = location.pathname;

  return (
    <div className="flex min-h-screen flex-col bg-[#F4F5F7]">
      {/* Persistent header bar - never remounts, no animations */}
      <CustomerHeaderBar 
        headerLeft={headerLeft}
        headerRight={headerRight}
      />

      {/* Full-width shelf - bleeds to edges, morphs smoothly */}
      <CustomerTopShelf>
        <TopShelfSection
          loading={loading}
          title={title}
          subtitle={subtitle}
          actions={actions}
        >
          {children}
        </TopShelfSection>
      </CustomerTopShelf>

      {/* MIDDLE: flex map / content - full width background, no padding constraints */}
      <main className="relative z-10 flex-1 min-h-0 w-full">
        {map}
      </main>

      {/* BOTTOM: fixed to bottom, hugging content */}
      {/* Footer components handle their own fixed positioning */}
      {footer}
    </div>
  );
}

