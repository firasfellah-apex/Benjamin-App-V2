import { useState, useEffect, useRef } from 'react';
import { Info } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface InfoTooltipProps {
  label: string;
  children: React.ReactNode;
  side?: 'top' | 'bottom' | 'left' | 'right';
  align?: 'start' | 'center' | 'end';
  className?: string;
}

/**
 * InfoTooltip Component - Brand Consistent
 * 
 * Uses Radix UI Tooltip with Portal for proper positioning.
 * Brand styling: Black background, white text, rounded corners.
 * Stays open until clicking outside.
 */
export function InfoTooltip({ 
  label, 
  children, 
  side = 'top',
  align = 'center',
  className 
}: InfoTooltipProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close tooltip on outside click
  useEffect(() => {
    if (!open) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [open]);

  // Handle button click - toggle tooltip open state
  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    // Toggle state immediately
    setOpen((prev) => !prev);
  };

  return (
    <div ref={containerRef} className="inline-flex">
      <Tooltip 
        open={open} 
        onOpenChange={(newOpen) => {
          // Fully controlled - only update if state actually changed
          // This prevents Radix from closing it automatically on click
          if (newOpen !== open) {
            // Only allow our manual state updates
            // Ignore Radix's automatic close on click
          }
        }}
      >
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={handleToggle}
            aria-label={label}
            className={cn(
              "inline-flex items-center justify-center w-4 h-4 rounded-full",
              "hover:bg-muted/50 transition-colors",
              "focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-black/20",
              "active:scale-95",
              className
            )}
            tabIndex={0}
          >
            <Info className="w-3.5 h-3.5 text-muted-foreground" />
          </button>
        </TooltipTrigger>
        <TooltipContent
          side={side}
          align={align}
          sideOffset={6}
          className={cn(
            "bg-black text-white text-xs rounded-lg shadow-lg",
            "max-w-xs px-3 py-2.5",
            "border-0",
            "z-[100]"
          )}
        >
          <p className="leading-relaxed">{children}</p>
        </TooltipContent>
      </Tooltip>
    </div>
  );
}
