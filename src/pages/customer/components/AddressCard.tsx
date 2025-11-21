/**
 * AddressCard Component
 * 
 * Unified address card component for both carousel and manage modes.
 * Single source of truth for address card styling and layout.
 */

import React from "react";
import { Home, Plus, Trash2, PenLine, MapPin } from "@/lib/icons";
import { cn } from "@/lib/utils";

interface AddressCardProps {
  mode: "carousel" | "manage" | "add" | "manage-carousel"; // "manage-carousel" for the carousel manage card
  label?: string;
  addressLine?: string;
  isDefault?: boolean;
  isSelected?: boolean; // For carousel mode
  note?: string; // For manage mode
  icon?: React.ReactNode; // Custom icon for saved addresses
  onClick?: () => void;
  onEdit?: (e: React.MouseEvent) => void;
  onDelete?: (e: React.MouseEvent) => void;
}

export function AddressCard({
  mode,
  label,
  addressLine,
  isDefault = false,
  isSelected = false,
  note,
  icon,
  onClick,
  onEdit,
  onDelete,
}: AddressCardProps) {
  // Standardized spacing: px-6 (24px) horizontal, py-6 (24px) vertical
  const baseClasses = "w-full rounded-2xl px-6 py-6 flex flex-col gap-2";
  const clickableClasses = onClick && (mode === "carousel" || mode === "manage-carousel") ? "cursor-pointer active:scale-[0.98] transition-transform duration-150" : "";

  // Determine variant styles - use tile styling, not panel styling
  const getVariantClasses = () => {
    if (mode === "add") {
      return "bg-slate-50/40 border border-dashed border-slate-200/70";
    }
    
    if (mode === "manage-carousel") {
      return "bg-slate-50/40 border border-slate-200/70";
    }
    
    if (mode === "carousel") {
      if (isSelected) {
        // Selected: green stroke + light green gradient
        return "bg-gradient-to-br from-green-50/80 to-emerald-50/60 border border-green-500/60";
      }
      return "bg-slate-50/40 border border-slate-200/70";
    }
    
    // manage mode
    if (isDefault) {
      return "bg-slate-50/40 border border-slate-200/70";
    }
    return "bg-slate-50/40 border border-slate-200/70";
  };

  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onEdit) {
      onEdit(e);
    }
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onDelete) {
      onDelete(e);
    }
  };

  // Add address variant
  if (mode === "add") {
    return (
      <div className={cn(baseClasses, getVariantClasses())}>
        <button
          type="button"
          onClick={onClick}
          className="w-full text-left flex flex-col gap-2"
        >
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-[#020816] text-white flex items-center justify-center shrink-0">
              <Plus className="w-5 h-5" />
            </div>
            <span className="text-base font-semibold text-slate-900">Add address</span>
          </div>
          <p className="text-sm text-slate-500">
            {addressLine || "Save another place you'd like cash delivered."}
          </p>
        </button>
      </div>
    );
  }

  // Manage addresses carousel variant (replaces the old "add" card in carousel)
  if (mode === "manage-carousel") {
    return (
      <div className={cn(baseClasses, getVariantClasses(), clickableClasses)}>
        <button
          type="button"
          onClick={onClick}
          className="w-full text-left flex flex-col gap-2"
        >
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-[#F4F7FB] text-slate-800 flex items-center justify-center shrink-0">
              <MapPin className="w-5 h-5" />
            </div>
            <span className="text-base font-semibold text-slate-900">Manage Addresses</span>
          </div>
          <p className="text-sm text-slate-500">
            {addressLine || "View, edit, or remove saved locations."}
          </p>
        </button>
      </div>
    );
  }

  // Saved address variant (carousel or manage)
  if (mode === "manage") {
    return (
      <div className={cn(baseClasses, getVariantClasses())}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            {icon || (
              <div className="w-10 h-10 rounded-full bg-[#F4F7FB] flex items-center justify-center text-slate-800 shrink-0">
                <Home className="w-5 h-5" />
              </div>
            )}
            <div className="flex flex-col flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-base font-semibold text-slate-900 truncate">
                  {label || 'Address'}
                </span>
                {/* Default badge hidden for now */}
                {false && isDefault && (
                  <span className="px-3 py-[3px] rounded-full bg-[#E6F7EB] text-[#17904A] text-xs font-medium shrink-0">
                    Default
                  </span>
                )}
              </div>
              {addressLine && (
                <span className="text-sm text-slate-700 truncate mt-0.5">
                  {addressLine}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3 text-slate-500 shrink-0">
            {onEdit && (
              <button
                type="button"
                onClick={handleEditClick}
                className="p-1 rounded transition-colors"
                title="Edit address"
              >
                <PenLine className="w-4 h-4" />
              </button>
            )}
            {onDelete && (
              <button
                type="button"
                onClick={handleDeleteClick}
                className="p-1 rounded transition-colors"
                title="Delete address"
              >
                <Trash2 className="w-4 h-4 text-red-500" />
              </button>
            )}
          </div>
        </div>

        {note && (
          <div className="mt-2 text-xs text-slate-500 flex items-center gap-1">
            <span>📝</span>
            <span className="truncate">{note}</span>
          </div>
        )}
      </div>
    );
  }

  // Carousel mode (saved address)
  return (
    <div 
      className={cn(baseClasses, getVariantClasses(), clickableClasses)}
      onClick={onClick && mode === "carousel" ? onClick : undefined}
      role={onClick && mode === "carousel" ? "button" : undefined}
      tabIndex={onClick && mode === "carousel" ? 0 : undefined}
      onKeyDown={onClick && mode === "carousel" ? (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      } : undefined}
    >
      {/* Row 1: Icon + Label + Default pill + Actions */}
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {icon || (
            <div className="flex items-center justify-center rounded-full bg-[#F4F7FB] text-slate-800 w-10 h-10 shrink-0">
              <Home className="w-6 h-6" />
            </div>
          )}
          <span className="text-base font-semibold text-slate-900 truncate">
            {label || "Saved address"}
          </span>
          {/* Default badge hidden for now */}
          {false && isDefault && (
            <span className="ml-2 inline-flex items-center px-3 py-[3px] rounded-full bg-[#E6F7EB] text-[#17904A] text-xs font-medium shrink-0">
              Default
            </span>
          )}
        </div>
        
        {/* Actions for carousel mode */}
        <div className="flex items-center gap-3 shrink-0">
          {onEdit && (
            <button
              type="button"
              onClick={handleEditClick}
              className="text-sm text-[#111827] underline underline-offset-2"
            >
              Edit
            </button>
          )}
          {onDelete && (
            <button
              type="button"
              onClick={handleDeleteClick}
              className="p-1 hover:bg-red-50 rounded transition-colors"
              title="Delete address"
            >
              <Trash2 className="w-4 h-4 text-red-500" />
            </button>
          )}
        </div>
      </div>

      {/* Row 2: Address line */}
      {addressLine && (
        <p className="text-sm text-slate-700 leading-snug truncate">{addressLine}</p>
      )}
    </div>
  );
}

