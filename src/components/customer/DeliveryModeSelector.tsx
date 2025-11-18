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
  const securityTipRef = useRef<HTMLDivElement>(null);

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
      {/* Pill-shaped toggle with morphing background - iOS-style button morph effect */}
      <div className="relative flex rounded-full border border-slate-200 bg-white p-1 overflow-hidden">
        {/* Morphing background indicator - slides between positions */}
        {modes.map((mode) => {
          const selected = mode.value === value;
          if (!selected) return null;
          
          return (
            <motion.div
              key={mode.value}
              layoutId="delivery-mode-bg"
              className="absolute inset-y-1 rounded-full bg-black"
              initial={false}
              transition={{
                duration: 0.4,
                ease: [0.34, 1.56, 0.64, 1],
              }}
              style={{
                width: "calc(50% - 4px)",
                left: mode.value === modes[0].value ? "4px" : "calc(50% + 2px)",
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
                "relative flex-1 flex items-center justify-center gap-2 px-4 py-3 z-10",
                "text-base font-semibold rounded-full",
                "transition-colors duration-200",
                selected
                  ? "text-white"
                  : "text-slate-900"
              )}
            >
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={selected ? "selected" : "unselected"}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.2 }}
                  className="flex items-center gap-2"
                >
                  <Icon 
                    className={cn("h-5 w-5", selected ? "text-emerald-400" : "text-slate-900")} 
                  />
                  <span>{mode.title}</span>
                </motion.div>
              </AnimatePresence>
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
      
      {/* Security Tip - Tinted Alert Card */}
      <div className="mt-4">
        <div
          ref={securityTipRef}
          className={cn(
            "w-full rounded-xl px-4 py-3",
            "bg-amber-50"
          )}
        >
          <button
            type="button"
            onClick={() => setIsSecurityTipExpanded(!isSecurityTipExpanded)}
            className="w-full text-left active:opacity-80"
          >
            {/* Top Row */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="mb-1.5 flex items-center gap-2">
                  <Shield className="h-4 w-4 text-amber-600 flex-shrink-0" />
                  <p className="text-xs font-semibold text-slate-900">
                    Guard your one-time code
                  </p>
                </div>
                <p className="text-xs text-slate-700">
                  Anyone with the code can receive your envelope.
                </p>
              </div>
              <ChevronDown
                className={cn(
                  "mt-0.5 h-4 w-4 text-slate-500 flex-shrink-0 transition-transform duration-200",
                  isSecurityTipExpanded && "rotate-180"
                )}
              />
            </div>
          </button>

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
                <div className="mt-2 border-t border-amber-200/60 pt-2.5 text-xs text-slate-800 space-y-1.5">
                  <p>Only share it when your runner is at your door.</p>
                  <p>Benjamin will never ask for it by phone or text.</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

