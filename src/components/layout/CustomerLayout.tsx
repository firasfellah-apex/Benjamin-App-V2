/**
 * CustomerLayout Component
 *
 * True root shell for customer pages:
 * - Provides min-h-screen and background
 * - Manages bottom slot context
 * - Renders bottom slot outside scroll container at root level
 */

import { ReactNode } from "react";
import { MobilePageShell } from "./MobilePageShell";
import {
  CustomerBottomSlotProvider,
  useCustomerBottomSlot,
} from "@/contexts/CustomerBottomSlotContext";

function CustomerLayoutContent({ children }: { children: ReactNode }) {
  const { bottomSlot } = useCustomerBottomSlot();

  return (
    <div className="min-h-screen flex flex-col bg-white">
      {/* Main content column - no overflow constraints, let page scroll naturally */}
      <MobilePageShell className="flex-1 flex flex-col">
          {children}
      </MobilePageShell>
      
      {/* Bottom slot - RequestFlowBottomBar handles its own fixed positioning */}
      {/* When useFixedPosition=true, it's fixed to viewport bottom and won't move with content */}
      {bottomSlot && (
        <div className="w-full">
          {bottomSlot}
        </div>
      )}
    </div>
  );
}

interface CustomerLayoutProps {
  children: React.ReactNode;
}

export function CustomerLayout({ children }: CustomerLayoutProps) {
  return (
    <CustomerBottomSlotProvider>
      <CustomerLayoutContent>{children}</CustomerLayoutContent>
    </CustomerBottomSlotProvider>
  );
}

export default CustomerLayout;
