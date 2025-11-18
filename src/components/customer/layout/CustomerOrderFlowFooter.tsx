/**
 * CustomerOrderFlowFooter Component
 * 
 * Footer for 2-step order creation flow (Address Selection + Cash Amount).
 * Includes progress indicator and navigation buttons.
 * Fixed to bottom, hugs content.
 */

import React from "react";
import { RequestFlowBottomBar } from "@/components/customer/RequestFlowBottomBar";

interface CustomerOrderFlowFooterProps {
  mode: "address" | "amount";
  onPrimary: () => void;
  onSecondary?: () => void;
  onAddAddress?: () => void; // Add address button (for address page)
  isLoading?: boolean;
  primaryDisabled?: boolean;
  termsContent?: React.ReactNode;
  useSliderButton?: boolean; // Enable slider button for amount page
}

export function CustomerOrderFlowFooter({
  mode,
  onPrimary,
  onSecondary,
  onAddAddress,
  isLoading = false,
  primaryDisabled = false,
  termsContent,
  useSliderButton = false, // Default to false to keep current behavior
}: CustomerOrderFlowFooterProps) {
  return (
    <RequestFlowBottomBar
      mode={mode}
      onPrimary={onPrimary}
      onSecondary={onSecondary}
      onAddAddress={onAddAddress}
      isLoading={isLoading}
      primaryDisabled={primaryDisabled}
      useFixedPosition={true}
      termsContent={termsContent}
      useSliderButton={useSliderButton}
    />
  );
}

