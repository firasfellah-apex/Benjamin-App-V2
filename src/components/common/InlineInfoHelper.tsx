import { useState, useEffect, useRef } from "react";
import { Info } from "lucide-react";

interface InlineInfoHelperProps {
  title: string;
  body: string;
}

/**
 * InlineInfoHelper Component
 * 
 * Reusable inline info button with toggleable tooltip.
 * Displays a circular info icon that, when tapped, shows a tooltip with title and body text.
 * Tooltip closes when clicking outside or pressing Escape.
 */
export function InlineInfoHelper({ title, body }: InlineInfoHelperProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close tooltip on outside click or Escape key
  useEffect(() => {
    if (!open) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [open]);

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation(); // Prevent triggering parent button
          setOpen((prev) => !prev);
        }}
        aria-label={title}
        aria-expanded={open}
        className="flex items-center justify-center w-6 h-6 rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-700 transition-colors active:scale-95 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-1"
      >
        <Info className="w-3 h-3" strokeWidth={2.2} />
      </button>

      {open && (
        <div className="absolute right-0 bottom-full mb-2 w-64 rounded-2xl bg-slate-900 text-white text-xs leading-relaxed p-3 shadow-lg z-30">
          <p className="font-semibold mb-1">{title}</p>
          <p>{body}</p>
        </div>
      )}
    </div>
  );
}

