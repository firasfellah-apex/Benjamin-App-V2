/**
 * CustomerScreen Component
 * 
 * Clean 3-row layout for customer pages:
 * - Top: header bar + top shelf (auto height, hugs content)
 * - Middle: map band (fixed height, optional)
 * - Main: scrollable content area (flex-1, overflow-y-auto)
 * - Bottom: handled by CustomerLayout via CustomerBottomSlotContext (not rendered here)
 */

import React from "react";
import { cn } from "@/lib/utils";
import CustomerHeaderBar from "@/components/customer/layout/CustomerHeaderBar";
import CustomerTopShelf from "@/components/customer/layout/CustomerTopShelf";
import TopShelfSection from "@/components/customer/layout/TopShelfSection";

interface CustomerScreenProps {
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  loading?: boolean;              // Loading state for skeletons
  actions?: React.ReactNode;      // Optional action buttons/chips
  stepKey?: string;               // Step key for transition (e.g. "home", "address", "amount")
  headerLeft?: React.ReactNode;   // Optional custom left header (defaults to logo)
  headerRight?: React.ReactNode;  // Optional custom right header (defaults to menu)
  topContent?: React.ReactNode;   // Content to show in TopShelfSection (e.g. LastDeliveryCard)
  map?: React.ReactNode;           // Map band (fixed height, sits between header and content)
  children?: React.ReactNode;      // Main scrollable content (cards, lists, forms, etc.)
  className?: string;
}

export function CustomerScreen({ 
  title, 
  subtitle,
  loading = false,
  actions,
  stepKey,
  headerLeft,
  headerRight,
  topContent,
  map,
  children,
  className,
}: CustomerScreenProps) {
  return (
    <div className={cn("flex flex-col flex-1 min-h-0", className)}>
      {/* TOP: Header bar + top shelf (flex-shrink-0, auto height) */}
      <div className="flex-shrink-0">
        <CustomerHeaderBar 
          headerLeft={headerLeft}
          headerRight={headerRight}
        />
        <div className="relative z-10">
          <CustomerTopShelf>
            <TopShelfSection
              loading={loading}
              title={title}
              subtitle={subtitle}
              actions={actions}
              stepKey={stepKey}
            >
              {topContent}
            </TopShelfSection>
          </CustomerTopShelf>
        </div>
      </div>

      {/* MIDDLE: Map band – fixed height, fills the row, sits directly under the header */}
      {map && (
        <div className="flex-shrink-0">
          {/* Let the map bleed edge-to-edge inside the mobile shell */}
          <div className="-mx-6">
            <div className="h-[230px] w-full">
              {map}
            </div>
          </div>
        </div>
      )}

      {/* MAIN: Scrollable content area (flex-1, overflow-y-auto) */}
      {/* This is the ONE scroll container per page */}
      {/* Standardized spacing: px-6 (24px) horizontal, space-y-6 (24px) between major sections */}
      <main className="flex-1 min-h-0 overflow-y-auto px-6 space-y-6 pb-6">
        {children}
      </main>
    </div>
  );
}

