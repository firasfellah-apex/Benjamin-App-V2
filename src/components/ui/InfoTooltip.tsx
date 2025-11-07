import { Info } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';

interface InfoTooltipProps {
  label: string;
  children: React.ReactNode;
}

export function InfoTooltip({ label, children }: InfoTooltipProps) {
  const [open, setOpen] = useState(false);

  return (
    <div
      className="relative inline-flex items-center"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
    >
      <button
        type="button"
        aria-label={label}
        className="inline-flex items-center justify-center w-3.5 h-3.5 rounded-full hover:bg-muted transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-black/20"
        tabIndex={0}
      >
        <Info className="w-3 h-3 text-muted-foreground" />
      </button>
      {open && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-3 bg-black text-white text-xs rounded-lg shadow-lg z-50 animate-in fade-in zoom-in-95 duration-150">
          {children}
          <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 w-2 h-2 bg-black rotate-45" />
        </div>
      )}
    </div>
  );
}
