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
 * Works consistently across all apps (Customer, Runner, Admin).
 */
export function InfoTooltip({ 
  label, 
  children, 
  side = 'top',
  align = 'center',
  className 
}: InfoTooltipProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
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
  );
}
