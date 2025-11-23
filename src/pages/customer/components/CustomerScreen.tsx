// src/pages/customer/components/CustomerScreen.tsx

import React from "react";
import { cn } from "@/lib/utils";
import { CustomerHeader } from "@/pages/customer/components/CustomerHeader";

interface CustomerScreenProps {
  /** For Home: big greeting title */
  title?: React.ReactNode;
  /** For Home: subtitle below greeting */
  subtitle?: React.ReactNode;
  /** For flow pages: a prebuilt FlowHeader component (step pills + title/subtitle) */
  flowHeader?: React.ReactNode;
  /** Fixed content between flowHeader and scrollable area (e.g. map, section titles) */
  fixedContent?: React.ReactNode;
  /** Content that should sit just under the header (e.g. LastDeliveryCard, address card, cash amount card) */
  topContent?: React.ReactNode;
  /** Main page content (lists, extra cards, etc.) – optional for now */
  children?: React.ReactNode;
  /** Show a back arrow instead of the logo in the header */
  showBack?: boolean;
  /** Custom back handler – default is history.back() */
  onBack?: () => void;
  /** Use X button instead of arrow for menu pages */
  useXButton?: boolean;
  /** Custom bottom padding for scroll container (e.g. for pages with taller bottom nav) */
  customBottomPadding?: string;
  className?: string;
}

/**
 * Vanilla layout:
 *
 * - Single background: white for the whole screen
 * - Header: Benjamin + menu (and optional hero for home)
 * - Optional flow header bar (full-width, not in a card)
 * - Inner scroll container for Safari/Comet compatibility
 * - Bottom nav is fixed by RequestFlowBottomBar
 */
export function CustomerScreen({
  title,
  subtitle,
  flowHeader,
  fixedContent,
  topContent,
  children,
  showBack = false,
  onBack,
  useXButton = false,
  customBottomPadding,
  className,
}: CustomerScreenProps) {
  const showHero = !!title || !!subtitle;
  const isFlowPage = !!flowHeader; // If flowHeader exists, hide logo/menu

  return (
    <div
      className={cn(
        // Treat this as the app viewport for that screen
        // Header/title/divider are fixed, only main content scrolls
        "flex h-full flex-col bg-white min-h-0",
        "text-slate-900",
        className
      )}
    >
      {/* Header: logo + menu + optional hero (only show when NOT a flow page) - FIXED, NO SCROLL */}
      {!isFlowPage && (
        <header className="px-6 pt-6 shrink-0 bg-white">
        <CustomerHeader
            title={showHero ? title : null}
            subtitle={showHero ? subtitle : null}
          showBack={showBack}
          onBack={onBack}
          useXButton={useXButton}
        />
        </header>
      )}

      {/* Flow header (replaces logo/menu row + title/subtitle) - FIXED, NO SCROLL */}
        {flowHeader && (
        <header className="px-6 pt-6 shrink-0 bg-white">
            {flowHeader}
        </header>
      )}

      {/* Fixed content (divider) – not scrollable - FIXED, NO SCROLL */}
      {/* No pt-6 here - spacing is handled by pb-6 on title/subtitle containers above */}
      {fixedContent && (
        <div className="px-6 bg-white shrink-0">
          {fixedContent}
          </div>
        )}

      {/* MAIN: the ONLY scroll container - content between divider and bottom */}
      <main
        className={cn(
          "flex-1 min-h-0 px-6 space-y-6 overflow-y-auto overflow-x-hidden",
          fixedContent ? "pt-2" : "pt-0" // Less top padding when fixedContent is present, 0 when flowHeader (24px spacing handled in topContent)
        )}
        style={{
          paddingBottom: customBottomPadding || "calc(24px + max(24px, env(safe-area-inset-bottom)) + 96px)",
          WebkitOverflowScrolling: "touch", // important for iOS
        }}
      >
        {topContent}
        {children}
      </main>

      {/* Bottom nav injected via CustomerBottomSlot / RequestFlowBottomBar */}
    </div>
  );
}

export default CustomerScreen;
