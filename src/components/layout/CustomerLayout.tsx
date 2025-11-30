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
    <div className="flex h-full flex-col bg-white min-h-0">
      {/* Main content – header/title/divider are fixed, only content scrolls */}
      <MobilePageShell className="flex-1 flex flex-col min-h-0">
        {children}
      </MobilePageShell>

      {/* Bottom slot – stays pinned under the scroll area */}
      {bottomSlot && (
        <div className="w-full shrink-0">
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
