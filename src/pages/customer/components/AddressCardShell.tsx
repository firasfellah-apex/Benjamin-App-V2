/**
 * AddressCardShell Component
 * 
 * Unified card shell for both saved address cards and "Add address" cards.
 * Uses a single layout system with variant styling.
 */

import React from "react";
import { Home, Plus } from "@/lib/icons";
import { cn } from "@/lib/utils";

interface AddressCardShellProps {
  mode: "saved" | "add";
  label?: string;
  addressLine?: string;
  isDefault?: boolean;
  onClick?: () => void;
  onEdit?: (e: React.MouseEvent) => void;
  icon?: React.ReactNode; // For saved addresses, custom icon
}

export function AddressCardShell({
  mode,
  label,
  addressLine,
  isDefault = false,
  onClick,
  onEdit,
  icon,
}: AddressCardShellProps) {
  const baseClasses = "w-full rounded-[24px] px-5 py-4 flex flex-col gap-1.5";

  const variantClasses =
    mode === "saved"
      ? "bg-[#F3FFF5] border border-[#C4EECF]"
      : "bg-[#F9FBFF] border border-dashed border-[#CBD5E1]";

  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onEdit) {
      onEdit(e);
    }
  };

  if (mode === "add") {
    return (
      <div className={cn(baseClasses, variantClasses)}>
        <button
          type="button"
          onClick={onClick}
          className="w-full text-left flex flex-col gap-1.5"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-slate-900 flex items-center justify-center shrink-0">
              <Plus className="w-5 h-5 text-white" />
            </div>
            <span className="font-semibold text-slate-900">Add address</span>
          </div>
          <p className="text-sm text-slate-500">
            {addressLine || "Save another place you'd like cash delivered."}
          </p>
        </button>
      </div>
    );
  }

  // Saved address variant
  return (
    <div className={cn(baseClasses, variantClasses)}>
      {onClick ? (
        <button
          type="button"
          onClick={onClick}
          className="w-full text-left flex flex-col gap-1.5"
        >
          {/* Row 1: Icon + Label + Default pill */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              {icon || <Home className="w-5 h-5 text-slate-800 shrink-0" />}
              <span className="font-semibold text-slate-900 truncate">
                {label || "Saved address"}
              </span>
            </div>
            {isDefault && (
              <span className="px-3 py-1 rounded-full bg-[#E5FAEA] text-emerald-700 text-xs font-medium shrink-0">
                Default
              </span>
            )}
          </div>

          {/* Row 2: Address line */}
          {addressLine && (
            <p className="text-sm text-slate-600 leading-snug">{addressLine}</p>
          )}
        </button>
      ) : (
        <>
          {/* Row 1: Icon + Label + Default pill */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              {icon || <Home className="w-5 h-5 text-slate-800 shrink-0" />}
              <span className="font-semibold text-slate-900 truncate">
                {label || "Saved address"}
              </span>
            </div>
            {isDefault && (
              <span className="px-3 py-1 rounded-full bg-[#E5FAEA] text-emerald-700 text-xs font-medium shrink-0">
                Default
              </span>
            )}
          </div>

          {/* Row 2: Address line */}
          {addressLine && (
            <p className="text-sm text-slate-600 leading-snug">{addressLine}</p>
          )}
        </>
      )}

      {/* Row 3: Edit link - outside button to avoid nesting */}
      {onEdit && (
        <button
          type="button"
          onClick={handleEditClick}
          className="mt-1 text-sm font-medium text-slate-800 underline-offset-2 hover:underline self-start"
        >
          Edit
        </button>
      )}
    </div>
  );
}
