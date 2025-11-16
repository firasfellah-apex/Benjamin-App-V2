import React, { useState } from "react";
import { cn } from "@/lib/utils";

type SheetState = "collapsed" | "expanded";

interface CustomerBottomSheetProps {
  collapsedHeight?: number; // px
  children: React.ReactNode;
}

export const CustomerBottomSheet: React.FC<CustomerBottomSheetProps> = ({
  collapsedHeight = 160,
  children,
}) => {
  const [state, setState] = useState<SheetState>("collapsed");

  const isCollapsed = state === "collapsed";

  const toggle = () => {
    setState((prev) => (prev === "collapsed" ? "expanded" : "collapsed"));
  };

  return (
    <div
      className={cn(
        "pointer-events-auto fixed left-1/2 -translate-x-1/2",
        "w-full max-w-md", // match your MobilePageShell width
        "transition-transform duration-300 ease-out",
      )}
      style={{
        // Sheet sits above the CTA bar; adjust 80px if your CTA is taller/shorter
        bottom: 80,
        transform: isCollapsed
          ? "translate(-50%, 0)"           // snapped down
          : "translate(-50%, -40vh)",      // pulled up (roughly 60% of screen visible)
      }}
    >
      <div
        className="mx-4 rounded-t-3xl rounded-b-3xl bg-white shadow-[0_-12px_40px_rgba(15,23,42,0.18)] overflow-hidden"
        style={{
          minHeight: collapsedHeight,
        }}
      >
        {/* Drag handle / tap target */}
        <button
          type="button"
          onClick={toggle}
          className="flex w-full flex-col items-center pt-3 pb-1"
        >
          <span className="h-1.5 w-10 rounded-full bg-slate-300" />
        </button>
        <div className="px-4 pb-4">
          {children}
        </div>
      </div>
    </div>
  );
};

export default CustomerBottomSheet;

