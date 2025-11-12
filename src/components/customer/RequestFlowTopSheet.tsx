/**
 * RequestFlowTopSheet Component
 * 
 * Fixed top sheet that mirrors the visual language of the bottom bar.
 * Provides a consistent header for all request flow screens.
 */

import { ReactNode } from "react";

export interface RequestFlowTopSheetProps {
  title: string;
  subtitle?: string;
  children?: ReactNode; // for address cards / quick actions / etc
}

export function RequestFlowTopSheet({ title, subtitle, children }: RequestFlowTopSheetProps) {
  return (
    <header 
      data-request-flow-top-sheet
      className="fixed top-16 inset-x-0 z-30 flex justify-center pointer-events-none"
      style={{ maxHeight: '50vh' }} // Prevent top sheet from taking too much space
    >
      <div className="pointer-events-auto w-full max-w-md bg-white rounded-b-3xl shadow-[0_8px_24px_rgba(15,23,42,0.08)] overflow-y-auto max-h-full">
        <div className="px-6 pt-4 pb-4">
          <h1 className="text-[24px] font-semibold text-slate-900 leading-tight">
            {title}
          </h1>
          {subtitle && (
            <p className="mt-1 text-sm text-slate-500">
              {subtitle}
            </p>
          )}
          {children && (
            <div className="mt-4 flex flex-col gap-3">
              {children}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

