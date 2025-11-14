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
    <div className="min-h-screen flex flex-col bg-[#F4F5F7]">
      {/* Main content column, width-limited */}
      <MobilePageShell className="flex-1 flex flex-col">
        {children}
      </MobilePageShell>

      {/* Bottom slot rendered at root level, not inside main scroll */}
      {bottomSlot && (
        <div className="sticky bottom-0 z-20 w-full bg-transparent">
          <MobilePageShell>
            {bottomSlot}
          </MobilePageShell>
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
