/**
 * DeliveryMap Component
 * 
 * MVP-safe map wrapper for delivery address previews.
 * Used across:
 * - Select Address step (selectPreview mode, background variant)
 * - Cash Amount step (confirmPreview mode, background variant)
 * - Future: Tracking screens
 * 
 * Layout variants:
 * - "inline" (default): Fixed height block, typical embedded map
 * - "background": Fills parent container with absolute positioning, sits behind content
 * 
 * Principles:
 * - Never blocks core flows if Maps fails
 * - Shows friendly fallback if API key missing
 * - Non-interactive for MVP (no panning/zooming)
 * - Pure presentational component
 * - Background variant always shows a map (uses fallback center if no coordinates)
 */

import React from 'react';
import { BenjaminMap, type MapPosition } from './BenjaminMap';
import { MapPin } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export type DeliveryMapMode = "selectPreview" | "confirmPreview";
export type DeliveryMapVariant = "inline" | "background";

export interface DeliveryMapProps {
  /**
   * Map display mode
   */
  mode?: DeliveryMapMode;
  
  /**
   * Layout variant
   * - "inline": fixed height block (default)
   * - "background": fills parent container, sits behind content
   */
  variant?: DeliveryMapVariant;
  
  /**
   * Optional center coordinates
   * If not provided, shows default service area or neutral view
   */
  center?: { lat: number; lng: number };
  
  /**
   * Optional marker label (e.g., "Home", "Office")
   */
  markerLabel?: string;
  
  /**
   * Optional className for styling
   */
  className?: string;
}

/**
 * Default fallback UI when map is unavailable
 */
const MapFallback: React.FC<{ 
  height?: string; 
  label?: string;
  mode?: DeliveryMapMode;
  variant?: DeliveryMapVariant;
}> = ({ height = '180px', label, mode, variant = 'inline' }) => {
  const isConfirmMode = mode === 'confirmPreview';
  const isBackground = variant === 'background';
  
  // For background variant, use full height
  const containerHeight = isBackground ? '100%' : height;
  const containerStyle = isBackground 
    ? { position: 'absolute' as const, inset: 0, height: '100%', minHeight: '100%' }
    : { height, minHeight: height, position: 'relative' as const };
  
  return (
    <div 
      className={cn(
        "bg-gradient-to-br from-gray-50 via-gray-100 to-gray-50",
        "border border-gray-200",
        "flex flex-col items-center justify-center",
        "w-full relative overflow-hidden",
        !isBackground && isConfirmMode && "rounded-t-2xl"
      )}
      style={containerStyle}
    >
      {/* Subtle pattern overlay */}
      <div 
        className="absolute inset-0 opacity-5"
        style={{
          backgroundImage: 'radial-gradient(circle at 2px 2px, #000 1px, transparent 0)',
          backgroundSize: '24px 24px'
        }}
      />
      
      <div className="flex flex-col items-center justify-center h-full p-6 text-center relative z-10">
        <MapPin className="h-10 w-10 text-gray-400 mb-3" />
        {label && (
          <p className="text-sm font-semibold text-gray-800 mb-1">
            {label}
          </p>
        )}
        <p className="text-xs text-gray-500 max-w-[200px]">
          {isConfirmMode 
            ? "Delivery location confirmed" 
            : label 
              ? "Location preview" 
              : "Select an address to see location"}
        </p>
      </div>
    </div>
  );
};

/**
 * DeliveryMap Component
 * 
 * Renders a map preview for delivery addresses.
 * Safe fallback if Maps SDK is not configured.
 * 
 * Variants:
 * - "inline": Fixed height block (default)
 * - "background": Fills parent container, sits behind content with absolute positioning
 */
export const DeliveryMap: React.FC<DeliveryMapProps> = ({
  mode = 'selectPreview',
  variant = 'inline',
  center,
  markerLabel,
  className,
}) => {
  const isBackground = variant === 'background';
  
  // Height based on mode (only for inline variant)
  const height = mode === 'confirmPreview' ? '180px' : '160px';
  
  // Container styles based on variant
  const containerClass = cn(
    "w-full",
    isBackground && "absolute inset-0",
    className
  );
  
  const containerStyle = isBackground
    ? { 
        position: 'absolute' as const, 
        inset: 0, 
        height: '100%',
        minHeight: '100%',
        zIndex: 0
      }
    : {
        height: className?.includes('h-full') ? '100%' : height,
        minHeight: height,
        display: 'flex',
        flexDirection: 'column' as const
      };
  
  // For background variant, always show a map (use fallback center if no center provided)
  // For inline variant, show fallback UI if no center provided
  if (!center) {
    if (isBackground) {
      // Background mode: use fallback center to always show a map
      const fallbackCenter: { lat: number; lng: number } = { lat: 25.7617, lng: -80.1918 };
      const mapHeight = '100%';
      return (
        <div className={containerClass} style={containerStyle}>
          <BenjaminMap
            center={fallbackCenter}
            customerPosition={fallbackCenter}
            zoom={15}
            height={mapHeight}
            fallback={
              <MapFallback 
                height="100%" 
                label={markerLabel || "Select an address to see location"} 
                mode={mode} 
                variant={variant}
              />
            }
          />
        </div>
      );
    } else {
      // Inline mode: show fallback UI
      return (
        <div className={containerClass} style={containerStyle}>
          <MapFallback height={height} label={markerLabel} mode={mode} variant={variant} />
        </div>
      );
    }
  }
  
  // Render BenjaminMap with customer position marker
  // For background variant, use 100% height; for inline, use specified height
  const mapHeight = isBackground ? '100%' : (className?.includes('h-full') ? '100%' : height);
  
  return (
    <div className={containerClass} style={containerStyle}>
      <BenjaminMap
        center={center}
        customerPosition={center}
        zoom={15}
        height={mapHeight}
        fallback={
          <MapFallback 
            height={isBackground ? '100%' : height} 
            label={markerLabel} 
            mode={mode} 
            variant={variant}
          />
        }
      />
    </div>
  );
};

DeliveryMap.displayName = 'DeliveryMap';

