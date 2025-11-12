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
  isLoading?: boolean;
  primaryDisabled?: boolean;
}

export function CustomerOrderFlowFooter({
  mode,
  onPrimary,
  onSecondary,
  isLoading = false,
  primaryDisabled = false,
}: CustomerOrderFlowFooterProps) {
  return (
    <RequestFlowBottomBar
      mode={mode}
      onPrimary={onPrimary}
      onSecondary={onSecondary}
      isLoading={isLoading}
      primaryDisabled={primaryDisabled}
      useFixedPosition={true}
    />
  );
}

