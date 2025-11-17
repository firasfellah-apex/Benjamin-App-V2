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
  // Count actual children (handles fragments, null, etc.)
  const hasChildren = React.Children.count(children) > 0;
  // Home screen: has map but no children content
  const isHomeScreen = !!map && !hasChildren;

  return (
    <div className={cn("flex flex-col h-screen overflow-hidden", className)}>
      {/* TOP: Header bar + top shelf (fixed, pinned to top) */}
      <CustomerHeaderBar 
        headerLeft={headerLeft}
        headerRight={headerRight}
      />
      <CustomerTopShelf extendToBottom={stepKey === "amount"}>
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
      
      {/* Spacer to push content below fixed header + top shelf */}
      {/* Uses CSS variable set by CustomerTopShelf for dynamic height */}
      {/* Header: safe area + 40px (logo + padding) */}
      <div 
        className="flex-shrink-0"
        style={{ 
          height: `calc(max(44px, env(safe-area-inset-top)) + 40px + var(--top-shelf-height, 200px))`
        }}
      />

      {/* MIDDLE: Map band – tucks under top shelf and bottom nav equally */}
      {map && (
        <div 
          className="-mx-6 flex-1 min-h-0 relative z-0 flex flex-col" 
          style={{ 
            marginTop: '-26px',
            marginBottom: '-26px',
          }}
        >
          <div className="flex-1 min-h-0 overflow-hidden rounded-t-none rounded-b-3xl">
            {map}
          </div>
        </div>
      )}

      {/* MAIN: Scrollable content area (flex-1, overflow-y-auto) */}
      {/* This is the ONE scroll container per page */}
      {/* Standardized spacing: px-6 (24px) horizontal, space-y-6 (24px) between major sections */}
      {/* Always render main to maintain layout structure, even if empty */}
      {/* Bottom padding accounts for fixed bottom nav (~150px) + safe area */}
      {/* z-index lower than bottom nav to ensure nav stays on top */}
      <main className={cn(
        "flex-1 min-h-0 overflow-y-auto px-6 space-y-6 mt-6 relative z-10",
        !hasChildren && "hidden"
      )}
      style={{
        paddingBottom: 'calc(150px + max(24px, env(safe-area-inset-bottom)))'
      }}>
        {children}
      </main>
    </div>
  );
}

