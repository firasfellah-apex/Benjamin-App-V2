import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Zap, ShieldCheck, Shield, ChevronDown } from "lucide-react";
import { useState, useRef, useEffect } from "react";

export type DeliveryMode = "quick_handoff" | "count_confirm";

interface DeliveryModeSelectorProps {
  value: DeliveryMode | null;
  onChange: (mode: DeliveryMode) => void;
  className?: string;
}

const modes = [
  {
    value: "count_confirm" as DeliveryMode,
    title: "Counted",
    subtitle: "Count bills with the runner before confirming.",
    Icon: ShieldCheck,
  },
  {
    value: "quick_handoff" as DeliveryMode,
    title: "Speed",
    subtitle: "Quick handoff, no counting together.",
    Icon: Zap,
  },
];

export function DeliveryModeSelector({
  value,
  onChange,
  className,
}: DeliveryModeSelectorProps) {
  const [isSecurityTipExpanded, setIsSecurityTipExpanded] = useState(false);
  const securityTipRef = useRef<HTMLButtonElement>(null);

  // Scroll adjustment when security tip expands/collapses
  useEffect(() => {
    if (!securityTipRef.current) return;
    
    // Function to calculate and scroll to show bottom of component
    const scrollToBottom = () => {
      if (!securityTipRef.current) return;
      
      // Get the actual current position after any layout changes
      const rect = securityTipRef.current.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const currentScrollY = window.scrollY;
      
      // If component is above viewport (rect.bottom is negative or very small),
      // we need to calculate using the top position instead
      let componentBottom: number;
      
      if (rect.bottom < 0 || rect.top < 0) {
        // Component is above viewport, calculate from top
        const componentTop = rect.top + currentScrollY;
        // Estimate or measure the actual height
        const componentHeight = rect.height || securityTipRef.current.offsetHeight;
        componentBottom = componentTop + componentHeight;
      } else {
        // Component is in viewport, use rect.bottom directly
        componentBottom = rect.bottom + currentScrollY;
      }
      
      // Calculate target scroll position to show bottom of component at bottom of viewport
      // Add a small padding to ensure it's fully visible
      const targetScrollY = componentBottom - viewportHeight + 20;
      
      // Scroll to show the bottom of the component
      window.scrollTo({
        top: Math.max(0, targetScrollY),
        behavior: 'smooth'
      });
    };
    
    let rafId1: number | null = null;
    let rafId2: number | null = null;
    let rafId3: number | null = null;
    let timeout: ReturnType<typeof setTimeout> | null = null;
    
    if (isSecurityTipExpanded) {
      // When expanding, we need to wait for the expansion animation to actually change the DOM
      // Use multiple RAF calls to ensure we're measuring after layout has updated
      rafId1 = requestAnimationFrame(() => {
        rafId2 = requestAnimationFrame(() => {
          rafId3 = requestAnimationFrame(() => {
            // Now measure and scroll - the expansion should have started
            scrollToBottom();
            
            // Fine-tune after animation completes
            timeout = setTimeout(() => {
              scrollToBottom();
            }, 350);
          });
        });
      });
    } else {
      // When collapsing, scroll immediately
      scrollToBottom();
      
      // Fine-tune after collapse animation
      timeout = setTimeout(() => {
        scrollToBottom();
      }, 300);
    }
    
    return () => {
      if (rafId1 !== null) cancelAnimationFrame(rafId1);
      if (rafId2 !== null) cancelAnimationFrame(rafId2);
      if (rafId3 !== null) cancelAnimationFrame(rafId3);
      if (timeout !== null) clearTimeout(timeout);
    };
  }, [isSecurityTipExpanded]);

  return (
    <div className={cn("space-y-4", className)}>
      {/* Pill-shaped toggle - Minimal Color with Morph Transition */}
      <div className="rounded-3xl border border-slate-100 bg-[#F7F7F7] p-1 flex gap-2 relative">
        {/* Morphing white background - only for selected */}
        {modes.map((mode) => {
          const selected = mode.value === value;
          if (!selected) return null;

          return (
            <motion.div
              key={mode.value}
              layoutId="toggle-bg"
              className="absolute rounded-full bg-white pointer-events-none"
              initial={false}
              transition={{
                type: "spring",
                stiffness: 300,
                damping: 30,
                mass: 0.5,
              }}
              style={{
                top: "4px",
                bottom: "4px",
                left: mode.value === modes[0].value ? "4px" : "calc(50% + 2px)",
                width: "calc(50% - 6px)",
              }}
            />
          );
        })}

        {modes.map((mode) => {
          const selected = mode.value === value;
          const Icon = mode.Icon;

          return (
            <button
              key={mode.value}
              type="button"
              onClick={() => onChange(mode.value)}
              className={cn(
                "relative flex-1 h-13 rounded-full flex items-center justify-center gap-2 text-sm font-medium transition-colors duration-200 z-10",
                selected
                  ? "text-slate-900"
                  : "text-slate-500"
              )}
              style={{ height: '52px' }}
            >
              <Icon 
                className={cn("h-5 w-5", selected ? "text-slate-900" : "text-slate-500")} 
              />
              <span>{mode.title}</span>
            </button>
          );
        })}
      </div>

      {/* Description for selected mode - iOS-style expand/collapse */}
      <motion.div
        initial={false}
        animate={{
          height: value ? "auto" : 0,
          opacity: value ? 1 : 0,
        }}
        transition={{
          type: "spring",
          stiffness: 300,
          damping: 30,
          mass: 0.5,
        }}
        style={{ overflow: "hidden" }}
      >
        {value && (
          <div className="pt-3 pb-3">
            <p className="text-sm text-slate-600 leading-relaxed">
              {modes.find(m => m.value === value)?.subtitle}
            </p>
          </div>
        )}
      </motion.div>
      
      {/* Security Tip - Yellow Background - Entirely clickable */}
      <div className="mt-4">
        <button
          type="button"
          ref={securityTipRef}
          onClick={() => setIsSecurityTipExpanded(!isSecurityTipExpanded)}
          className={cn(
            "w-full text-left rounded-xl px-4 py-3",
            "bg-[#FEF9C3] active:opacity-80 cursor-pointer"
          )}
        >
          {/* Top Row - Center aligned */}
          <div className="flex flex-col items-center text-center">
            <div className="mb-1.5 flex items-center gap-2">
              <Shield className="h-4 w-4 text-amber-600 flex-shrink-0" />
              <p className="text-xs font-semibold text-slate-900">
                Guard Your One-Time Code
              </p>
            </div>
            <p className="text-xs text-slate-700">
              Anyone with the code can receive your cash.
            </p>
          </div>

          {/* Expanded content */}
          <AnimatePresence initial={false}>
            {isSecurityTipExpanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
                style={{ overflow: "hidden" }}
              >
                <div className="mt-2 border-t border-amber-200/60 pt-2.5 text-xs text-slate-800 space-y-1.5 text-center">
                  <p>Only share it when your runner is at your door.</p>
                  <p>Benjamin will never ask for it by phone or text.</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Chevron Icon (no white circle) - Same style as fee breakdown */}
          <div className="flex justify-center items-center mt-3">
            <motion.div
              animate={{ rotate: isSecurityTipExpanded ? 180 : 0 }}
              transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
            >
              <ChevronDown className="h-4 w-4 text-slate-900" />
            </motion.div>
          </div>
        </button>
      </div>
    </div>
  );
}

