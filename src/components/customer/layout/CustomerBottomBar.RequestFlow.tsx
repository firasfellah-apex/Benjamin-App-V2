/**
 * CustomerBottomBarRequestFlow Component
 * 
 * Bottom bar for request flow (Home, Address Selection, Cash Amount).
 * Hugs content; expands slightly when 2-step progress bar is visible.
 * 
 * Note: This is a simple wrapper. The actual button content with morphing animations
 * comes from RequestFlowBottomBar, which handles its own fixed positioning.
 */

import React from "react";
import { cn } from "@/lib/utils";

interface CustomerBottomBarRequestFlowProps {
  children?: React.ReactNode;
  className?: string;
}

export const CustomerBottomBarRequestFlow: React.FC<CustomerBottomBarRequestFlowProps> = ({
  children,
  className,
}) => {
  // This component is a simple container for RequestFlowBottomBar
  // RequestFlowBottomBar handles its own fixed positioning and styling
  return <>{children}</>;
};

