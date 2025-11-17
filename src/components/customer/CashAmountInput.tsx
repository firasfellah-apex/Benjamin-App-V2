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
  const inputRef = useRef<HTMLInputElement>(null);

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

  return (
    <div className={cn(hideAmountDisplay && hideRangeText ? "" : "space-y-4", className)}>
      {/* Primary Value - Large display, clickable to edit (only if not hidden) */}
      {!hideAmountDisplay && (
        <>
          {!isEditing ? (
            <div 
              onClick={onEditClick || handleDisplayClick}
              className="text-5xl font-bold text-gray-900 text-center cursor-text hover:opacity-70 transition-opacity touch-manipulation"
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
                className="text-5xl font-bold text-gray-900 text-center w-48 border-0 border-b-2 border-black focus:outline-none focus:ring-0 pb-2 bg-transparent"
                aria-label="Cash amount"
                autoFocus
              />
            </div>
          )}
        </>
      )}

      {/* Secondary Text - Range helper (only if not hidden) */}
      {!hideRangeText && (
        <p className="text-sm text-gray-500 text-center">
          ${min.toLocaleString()}–${max.toLocaleString()} range
        </p>
      )}

      {/* Amount Buttons */}
      <div className="flex justify-center gap-2 flex-wrap" style={{ marginBottom: '16px' }}>
        {[100, 200, 500, 1000].map((amt) => (
          <button
            key={amt}
            type="button"
            onClick={() => handleQuickPick(amt)}
            className={cn(
              "px-4 py-2 rounded-lg border text-sm font-medium transition-colors touch-manipulation",
              value === amt
                ? "bg-black border-black text-white"
                : "border-gray-300 text-gray-700 hover:bg-gray-50 active:bg-gray-100"
            )}
          >
            ${amt.toLocaleString()}
          </button>
        ))}
      </div>

      {/* Slider - Premium Benjamin Design */}
      <div className="space-y-1">
        <div className="relative w-full flex items-center" style={{ height: '44px' }}>
          {/* Background track - matte gray with subtle depth */}
          <div 
            className="absolute left-0 right-0 slider-track-bg"
            style={{ 
              top: '19px', 
              height: '6px'
            }}
          >
            <div 
              className="w-full h-full rounded-full"
              style={{
                background: 'linear-gradient(90deg, #e5e7eb, #d1d5db)',
                boxShadow: '0 0 0 0.5px rgba(15, 23, 42, 0.08) inset'
              }}
            />
          </div>
          
          {/* Green fill track - sleek matte glass with horizontal gradient */}
          <motion.div 
            className="absolute left-0 pointer-events-none rounded-full slider-fill"
            style={{ 
              top: '19px',
              height: '6px'
            }}
            initial={false}
            animate={{ 
              width: `${((value - min) / (max - min)) * 100}%`
            }}
            transition={{ 
              duration: 0.2, 
              ease: "easeOut" 
            }}
          >
            <div 
              className={cn(
                "w-full h-full rounded-full relative overflow-hidden",
                isDragging && "pulse-active"
              )}
              style={{
                background: 'linear-gradient(90deg, #10b981, #0ea564)',
                boxShadow: '0 0 0 0.5px rgba(15, 23, 42, 0.1) inset'
              }}
            >
              {/* Pulse effect overlay - triggers once per drag start */}
              <AnimatePresence>
                {showPulse && (
                  <motion.div
                    className="absolute inset-0 rounded-full pointer-events-none"
                    style={{
                      background: 'radial-gradient(circle at center, rgba(16, 185, 129, 0.25) 0%, transparent 70%)'
                    }}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ 
                      opacity: [0, 0.5, 0],
                      scale: [0.9, 1.8, 2.5]
                    }}
                    exit={{ opacity: 0 }}
                    transition={{ 
                      duration: 0.6, 
                      ease: "easeOut",
                      times: [0, 0.4, 1]
                    }}
                  />
                )}
              </AnimatePresence>
            </div>
          </motion.div>
          
          {/* Slider input - positioned on top, perfectly aligned */}
          <input
            type="range"
            min={min}
            max={max}
            step={step}
            value={value}
            onChange={handleSliderChange}
            onTouchStart={(e) => {
              e.stopPropagation();
              setIsDragging(true);
              setShowPulse(true);
              setTimeout(() => setShowPulse(false), 600);
            }}
            onMouseDown={() => {
              setIsDragging(true);
              setShowPulse(true);
              // Hide pulse after animation completes
              setTimeout(() => setShowPulse(false), 600);
            }}
            onMouseUp={() => setIsDragging(false)}
            onMouseLeave={() => setIsDragging(false)}
            onTouchEnd={() => setIsDragging(false)}
            disabled={isEditing}
            className={cn(
              "relative w-full appearance-none cursor-pointer disabled:opacity-50 bg-transparent z-10 slider-benjamin",
              isDragging && "slider-dragging"
            )}
            style={{ 
              height: '44px',
              touchAction: 'pan-y',
              margin: 0, 
              padding: 0
            }}
            aria-label="Cash amount slider"
          />
          
          <style>{`
            .slider-benjamin {
              -webkit-appearance: none;
              appearance: none;
              outline: none;
              touch-action: pan-y;
            }
            
            /* Webkit Thumb - Elegant white circle */
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
              margin-top: -13px;
              transition: transform 0.15s ease, box-shadow 0.15s ease;
            }
            
            .slider-benjamin:hover::-webkit-slider-thumb,
            .slider-benjamin:active::-webkit-slider-thumb {
              transform: scale(1.05);
              box-shadow: 0 4px 10px rgba(0, 0, 0, 0.15);
            }
            
            .slider-dragging.slider-benjamin::-webkit-slider-thumb {
              transform: scale(1.05);
              box-shadow: 0 4px 10px rgba(0, 0, 0, 0.15);
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
            
            .slider-benjamin:hover::-moz-range-thumb,
            .slider-benjamin:active::-moz-range-thumb {
              transform: scale(1.05);
              box-shadow: 0 4px 10px rgba(0, 0, 0, 0.15);
            }
            
            .slider-dragging.slider-benjamin::-moz-range-thumb {
              transform: scale(1.05);
              box-shadow: 0 4px 10px rgba(0, 0, 0, 0.15);
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
        </div>
        <div className="flex justify-between text-xs text-gray-400">
          <span>${min.toLocaleString()}</span>
          <span>${max.toLocaleString()}</span>
        </div>
      </div>

      {/* Error message */}
      {error && (
        <p className="text-red-500 text-sm text-center transition-opacity duration-200">
          {error}
        </p>
      )}
    </div>
  );
}

