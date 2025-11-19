import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface CashAmountInputProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  className?: string;
  hideAmountDisplay?: boolean;
  hideRangeText?: boolean;
  onEditClick?: () => void;
}

export default function CashAmountInput({
  value,
  onChange,
  min = 100,
  max = 1000,
  step = 20,
  className,
  hideAmountDisplay = false,
  hideRangeText = false,
  onEditClick,
}: CashAmountInputProps) {
  const [input, setInput] = useState<string>(String(value));
  const [error, setError] = useState<string>("");
  const [isEditing, setIsEditing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [showPulse, setShowPulse] = useState(false);
  const [showBubble, setShowBubble] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const sliderRef = useRef<HTMLInputElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);

  // Sync input with value prop when not editing
  useEffect(() => {
    if (!isEditing) {
      setInput(String(value));
      setError("");
    }
  }, [value, isEditing]);

  // Format number with commas
  const formatWithCommas = (num: number | string): string => {
    const str = String(num).replace(/,/g, "");
    if (!str) return "";
    return str.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  };

  // Handle input change - allow free typing, no validation yet
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/,/g, "");
    // Allow only digits
    if (/^\d*$/.test(raw)) {
      setInput(raw);
      // Clear error while typing; final decision on blur
      setError("");
    }
  };

  // Validate and commit value
  const validateAndCommit = () => {
    if (input === "") {
      setError(`Minimum withdrawal is $${min.toLocaleString()}.`);
      const clamped = min;
      setInput(String(clamped));
      onChange(clamped);
      setIsEditing(false);
      return;
    }

    const num = Number(input.replace(/,/g, ""));
    if (isNaN(num)) {
      setError("Please enter a number.");
      setInput(String(value));
      setIsEditing(false);
      return;
    }

    if (num < min) {
      setError(`Minimum withdrawal is $${min.toLocaleString()}.`);
      const clamped = min;
      setInput(String(clamped));
      onChange(clamped);
      setIsEditing(false);
      return;
    }

    if (num > max) {
      setError(`Maximum allowed is $${max.toLocaleString()}.`);
      const clamped = max;
      setInput(String(clamped));
      onChange(clamped);
      setIsEditing(false);
      return;
    }

    if (num % step !== 0) {
      setError(`Please enter in $${step} increments (e.g. $140, $160).`);
      const nearest = Math.round(num / step) * step;
      const clamped = Math.min(max, Math.max(min, nearest));
      setInput(String(clamped));
      onChange(clamped);
      setIsEditing(false);
      return;
    }

    // All good
    setError("");
    onChange(num);
    setIsEditing(false);
  };

  // Handle input blur
  const handleBlur = () => {
    validateAndCommit();
  };

  // Handle Enter key
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      validateAndCommit();
    }
  };

  // Handle slider change
  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const num = Number(e.target.value);
    setInput(String(num));
    onChange(num);
    setError("");
    setIsEditing(false);
  };

  // Handle quick pick
  const handleQuickPick = (amount: number) => {
    const clamped = Math.min(max, Math.max(min, amount));
    setInput(String(clamped));
    onChange(clamped);
    setError("");
    setIsEditing(false);
  };

  // Handle display click to edit
  const handleDisplayClick = () => {
    setIsEditing(true);
    setInput(String(value));
    setTimeout(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    }, 0);
  };

  // Calculate thumb position for bubble
  const thumbPosition = ((value - min) / (max - min)) * 100;

  // Quick pick amounts
  const quickPicks = [100, 200, 500, 1000].filter(amt => amt >= min && amt <= max);

  return (
    <div className={cn("w-full space-y-6", className)}>
      {/* ZONE 1: Amount Focus */}
      {!hideAmountDisplay && (
        <div className="w-full text-center space-y-2">
          {!isEditing ? (
            <div 
              onClick={onEditClick || handleDisplayClick}
              className="text-3xl font-semibold text-slate-900 cursor-text hover:opacity-70 transition-opacity touch-manipulation"
            >
              ${formatWithCommas(value)}
            </div>
          ) : (
            <div className="flex justify-center">
              <input
                ref={inputRef}
                type="tel"
                inputMode="numeric"
                pattern="[0-9]*"
                value={input.replace(/,/g, "")}
                onChange={handleInputChange}
                onBlur={handleBlur}
                onKeyDown={handleKeyDown}
                className="text-3xl font-semibold text-slate-900 text-center w-32 border-0 border-b-2 border-black focus:outline-none focus:ring-0 pb-1 bg-transparent"
                aria-label="Cash amount"
                autoFocus
              />
            </div>
          )}
          <p className="text-xs text-slate-500">Cash you'll receive</p>
        </div>
      )}

      {/* ZONE 2: Controls (Quick Picks + Slider) */}
      <div className="space-y-4">
        {/* Quick Pick Buttons */}
        <div className="flex justify-center gap-2 flex-wrap">
          {quickPicks.map((amt) => (
          <button
            key={amt}
            type="button"
            onClick={() => handleQuickPick(amt)}
            className={cn(
                "px-4 py-2 rounded-xl border text-sm font-medium transition-colors touch-manipulation shadow-sm",
              value === amt
                ? "bg-black border-black text-white"
                  : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50 active:bg-slate-100"
            )}
          >
            ${amt.toLocaleString()}
          </button>
        ))}
      </div>

        {/* Slider Block - Premium Design */}
        <div className="space-y-3">
          {/* "Adjust amount" label */}
          <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
            Adjust amount
          </p>

          {/* Slider Track Row - Min labels, track, max labels */}
          <div className="relative" style={{ height: '50px' }}>
            {/* Track container - full width */}
            <div className="relative w-full" style={{ height: '44px', marginTop: '10px' }}>
              {/* Min label - left edge */}
              <span className="absolute left-0 text-xs text-slate-500" style={{ top: '22px' }}>
                ${min.toLocaleString()}
              </span>

              {/* Max label - right edge */}
              <span className="absolute right-0 text-xs text-slate-500" style={{ top: '22px' }}>
                ${max.toLocaleString()}
              </span>

              {/* Track area - full width, between labels */}
              <div className="absolute left-0 right-0" style={{ height: '6px', top: '19px' }}>
                {/* Background track - right side (slate-200) */}
                <div 
                  className="absolute left-0 right-0 h-full rounded-full"
            style={{ 
                    background: '#e5e7eb',
              }}
            />
          
                {/* Dual-tone: Left side (charcoal/black), right side (slate-200) */}
          <motion.div 
                  className="absolute left-0 h-full rounded-full pointer-events-none"
            style={{ 
                    background: '#111827',
              height: '6px'
            }}
            initial={false}
            animate={{ 
                    width: `${thumbPosition}%`
            }}
            transition={{ 
                    duration: isDragging ? 0 : 0.2, 
              ease: "easeOut" 
            }}
                />

                {/* Tick markers at quick pick positions */}
                {quickPicks.map((amt) => {
                  const tickPosition = ((amt - min) / (max - min)) * 100;
                  return (
                    <div
                      key={amt}
                      className="absolute w-px bg-slate-300 pointer-events-none"
                      style={{
                        left: `${tickPosition}%`,
                        top: '-1px',
                        height: '8px',
                        opacity: value === amt ? 0.8 : 0.4,
                      }}
                    />
                  );
                })}

                {/* Floating value bubble - above thumb */}
                <AnimatePresence>
                  {(isDragging || showBubble) && (
                    <motion.div
                      initial={{ opacity: 0, y: -4, scale: 0.9 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -4, scale: 0.9 }}
                      transition={{ duration: 0.15 }}
                      className="absolute pointer-events-none"
                      style={{
                        left: `${thumbPosition}%`,
                        top: '-28px',
                        transform: 'translateX(-50%)',
                      }}
                    >
                      <div className="bg-slate-900 text-white text-xs font-semibold px-2 py-1 rounded-full whitespace-nowrap shadow-lg">
                        ${formatWithCommas(value)}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Slider input - positioned on top */}
                <input
                  ref={sliderRef}
                  type="range"
                  min={min}
                  max={max}
                  step={step}
                  value={value}
                  onChange={handleSliderChange}
                  onTouchStart={(e) => {
                    e.stopPropagation();
                    setIsDragging(true);
                    setShowBubble(true);
                    setShowPulse(true);
                    setTimeout(() => setShowPulse(false), 600);
                  }}
                  onMouseDown={() => {
                    setIsDragging(true);
                    setShowBubble(true);
                    setShowPulse(true);
                    setTimeout(() => setShowPulse(false), 600);
                  }}
                  onMouseUp={() => {
                    setIsDragging(false);
                    setTimeout(() => setShowBubble(false), 300);
                  }}
                  onMouseLeave={() => {
                    setIsDragging(false);
                    setTimeout(() => setShowBubble(false), 300);
                  }}
                  onTouchEnd={() => {
                    setIsDragging(false);
                    setTimeout(() => setShowBubble(false), 300);
                  }}
                  disabled={isEditing}
              className={cn(
                    "absolute left-0 right-0 w-full appearance-none cursor-pointer disabled:opacity-50 bg-transparent z-10 slider-benjamin",
                    isDragging && "slider-dragging"
              )}
              style={{
                    height: '44px',
                    touchAction: 'pan-y',
                    margin: 0, 
                    padding: 0,
                    top: '-13px'
              }}
                  aria-label="Cash amount slider"
                />
              </div>

              {/* Pulse effect overlay - centered on thumb */}
              <AnimatePresence>
                {showPulse && (
                  <motion.div
                    className="absolute pointer-events-none"
                    style={{
                      left: `${thumbPosition}%`,
                      top: '29px',
                      transform: 'translateX(-50%)',
                    }}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ 
                      opacity: [0, 0.4, 0],
                      scale: [0.9, 2, 2.5]
                    }}
                    exit={{ opacity: 0 }}
                    transition={{ 
                      duration: 0.6, 
                      ease: "easeOut",
                      times: [0, 0.4, 1]
                    }}
                  >
                    <div
                      className="w-2 h-2 rounded-full"
                      style={{
                        background: 'radial-gradient(circle, rgba(16, 185, 129, 0.3) 0%, transparent 70%)'
                      }}
                  />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
          
          {/* Range caption - below slider */}
          {!hideRangeText && (
            <p className="text-xs text-slate-400 text-center">
              ${min.toLocaleString()}–${max.toLocaleString()} range
            </p>
          )}
        </div>
      </div>
          
          <style>{`
            .slider-benjamin {
              -webkit-appearance: none;
              appearance: none;
              outline: none;
              touch-action: pan-y;
            }
            
        /* Webkit Thumb - Elegant white circle with scale on drag */
            .slider-benjamin::-webkit-slider-thumb {
              -webkit-appearance: none;
              appearance: none;
              width: 32px;
              height: 32px;
              border-radius: 50%;
              background: #ffffff;
              cursor: pointer;
              border: 2px solid #111827;
              box-shadow: 0 3px 6px rgba(0, 0, 0, 0.12);
              transition: transform 0.15s ease, box-shadow 0.15s ease;
            }
            
        .slider-benjamin:hover::-webkit-slider-thumb {
              transform: scale(1.05);
              box-shadow: 0 4px 10px rgba(0, 0, 0, 0.15);
            }
            
            .slider-dragging.slider-benjamin::-webkit-slider-thumb {
          transform: scale(1.1);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
            }
            
            /* Firefox Thumb */
            .slider-benjamin::-moz-range-thumb {
              width: 32px;
              height: 32px;
              border-radius: 50%;
              background: #ffffff;
              cursor: pointer;
              border: 2px solid #111827;
              box-shadow: 0 3px 6px rgba(0, 0, 0, 0.12);
              transition: transform 0.15s ease, box-shadow 0.15s ease;
            }
            
        .slider-benjamin:hover::-moz-range-thumb {
              transform: scale(1.05);
              box-shadow: 0 4px 10px rgba(0, 0, 0, 0.15);
            }
            
            .slider-dragging.slider-benjamin::-moz-range-thumb {
          transform: scale(1.1);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
            }
            
            /* Track - transparent so we see our custom track */
            .slider-benjamin::-webkit-slider-runnable-track {
              background: transparent;
              height: 6px;
              border: none;
            }
            
            .slider-benjamin::-moz-range-track {
              background: transparent;
              height: 6px;
              border: none;
            }
            
            /* Focus state */
            .slider-benjamin:focus {
              outline: none;
            }
            
            .slider-benjamin:focus::-webkit-slider-thumb {
              box-shadow: 0 3px 6px rgba(0, 0, 0, 0.12), 0 0 0 3px rgba(16, 185, 129, 0.15);
            }
            
            /* Disabled state */
            .slider-benjamin:disabled::-webkit-slider-thumb {
              background: #f3f4f6;
              border-color: #9ca3af;
              cursor: not-allowed;
            }
            
            .slider-benjamin:disabled::-moz-range-thumb {
              background: #f3f4f6;
              border-color: #9ca3af;
              cursor: not-allowed;
            }
            
          `}</style>

      {/* Error message */}
      {error && (
        <p className="text-red-500 text-sm text-center transition-opacity duration-200">
          {error}
        </p>
      )}
    </div>
  );
}
