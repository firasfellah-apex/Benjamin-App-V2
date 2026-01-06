import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface CashAmountInputProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  className?: string;
  hideAmountDisplay?: boolean;
  onEditClick?: () => void;
  onDragStart?: () => void;
  onDragEnd?: () => void;
}

export default function CashAmountInput({
  value,
  onChange,
  min = 100,
  max = 1000,
  step = 20,
  className,
  hideAmountDisplay = false,
  onEditClick,
  onDragStart,
  onDragEnd,
}: CashAmountInputProps) {
  const [input, setInput] = useState<string>(String(value));
  const [error, setError] = useState<string>("");
  const [isEditing, setIsEditing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const sliderRef = useRef<HTMLInputElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  
  // Refs for drag state to avoid dependency issues
  const draggingRef = useRef(false);
  const activePointerIdRef = useRef<number | null>(null);

  // Sync input with value prop when not editing
  useEffect(() => {
    if (!isEditing) {
      setInput(String(value));
      setError("");
    }
  }, [value, isEditing]);

  // Reset drag refs on unmount
  useEffect(() => {
    return () => {
      draggingRef.current = false;
      activePointerIdRef.current = null;
      onDragEnd?.();
    };
  }, []);

  // Format number with commas
  const formatWithCommas = (num: number | string): string => {
    const str = String(num).replace(/,/g, "");
    if (!str) return "";
    return str.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  };

  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/,/g, "");
    if (/^\d*$/.test(raw)) {
      setInput(raw);
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

    setError("");
    onChange(num);
    setIsEditing(false);
  };

  const handleBlur = () => {
    validateAndCommit();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      validateAndCommit();
    }
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

  // Handle quick pick
  const handleQuickPick = (amount: number) => {
    const clamped = Math.min(max, Math.max(min, amount));
    setInput(String(clamped));
    onChange(clamped);
    setError("");
    setIsEditing(false);
  };

  // Convert pointer X position to snapped value
  // Note: We use the ref directly inside handlers to avoid dependency chain issues
  const calculateValueFromX = (clientX: number) => {
    const el = trackRef.current;
    if (!el) return min;

    const rect = el.getBoundingClientRect();
    const t = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    const raw = min + t * (max - min);
    const snapped = Math.round(raw / step) * step;
    return Math.min(max, Math.max(min, snapped));
  };

  // Calculate thumb position for visual
  const thumbPosition = ((value - min) / (max - min)) * 100;
  const quickPicks = [100, 200, 500, 1000].filter(amt => amt >= min && amt <= max);

  return (
    <div className={cn("w-full", className)}>
      {/* TOP AMOUNT CONTAINER */}
      {!hideAmountDisplay && (
        <div className="mb-8">
          {!isEditing ? (
            <div
              onClick={onEditClick || handleDisplayClick}
              className="bg-[#F7F7F7] px-6 py-6 flex items-center justify-center cursor-text hover:opacity-80 transition-opacity touch-manipulation"
              style={{ height: '96px', borderRadius: '12px' }}
            >
              <p className="text-4xl font-semibold text-slate-900">
                ${formatWithCommas(value)}
              </p>
            </div>
          ) : (
            <div className="bg-[#F7F7F7] px-6 py-6 flex items-center justify-center gap-1" style={{ height: '96px', borderRadius: '12px' }}>
              <span className="text-4xl font-semibold text-slate-900">$</span>
              <input
                ref={inputRef}
                type="tel"
                inputMode="numeric"
                pattern="[0-9]*"
                value={input.replace(/,/g, "")}
                onChange={handleInputChange}
                onBlur={handleBlur}
                onKeyDown={handleKeyDown}
                className="text-4xl font-semibold text-slate-900 text-center border-0 border-b-2 border-black focus:outline-none focus:ring-0 focus:border-black pb-1 bg-transparent min-w-0 flex-1"
                style={{ maxWidth: '200px' }}
                aria-label="Cash amount"
                autoFocus
              />
            </div>
          )}
        </div>
      )}

      {/* SLIDER CONTAINER */}
      <div className="mb-6 pt-3">
        <div ref={trackRef} className="relative w-full" style={{ height: '10px' }}>
          {/* Background track */}
          <div 
            className="absolute left-0 right-0 h-full rounded-full"
            style={{ background: '#F7F7F7' }}
          />
          
          {/* Filled portion */}
          <motion.div 
            className="absolute left-0 h-full rounded-full pointer-events-none"
            style={{ 
              background: '#13F287',
              height: '10px'
            }}
            initial={false}
            animate={{ width: `${thumbPosition}%` }}
            transition={{ 
              duration: isDragging ? 0 : 0.2, 
              ease: "easeOut" 
            }}
          />

          {/* Range Input - Visible for thumb, but pointer events handled by overlay */}
          <input
            ref={sliderRef}
            type="range"
            min={min}
            max={max}
            step={step}
            value={value}
            onChange={(e) => {
               // Only for keyboard/screen reader interaction
               const v = Number(e.target.value);
               setInput(String(v));
               onChange(v);
            }}
            disabled={isEditing}
            className="absolute left-0 right-0 w-full appearance-none bg-transparent z-10 slider-cash-amount"
            style={{ 
              height: "44px",
              top: "-17px",
              margin: 0, 
              padding: 0,
              pointerEvents: "none" 
            }}
          />

          {/* INTERACTIVE OVERLAY 
            Using Pointer Events with setPointerCapture to guarantee drag continuity 
          */}
          <div
            className="absolute left-0 right-0 z-20"
            style={{
              height: "44px",
              top: "-17px",
              touchAction: "none", // Critical: prevents browser scroll while dragging
              cursor: "pointer"
            }}
            onPointerDown={(e) => {
              if (isEditing) return;
              
              onDragStart?.();
              // 1. Stop browser defaults (scrolling/text selection)
              e.preventDefault();
              
              // 2. Capture the pointer. This makes the element receive events 
              //    even if the finger/mouse leaves the element bounds.
              (e.target as Element).setPointerCapture(e.pointerId);

              // 3. Set State
              draggingRef.current = true;
              activePointerIdRef.current = e.pointerId;
              setIsDragging(true);

              // 4. Update Value immediately
              const next = calculateValueFromX(e.clientX);
              if (next !== value) {
                setInput(String(next));
                onChange(next);
              }
              setError("");
            }}
            onPointerMove={(e) => {
              if (!draggingRef.current) return;
              if (activePointerIdRef.current !== null && e.pointerId !== activePointerIdRef.current) return;

              e.preventDefault();

              const next = calculateValueFromX(e.clientX);
              // Only update if changed to avoid unnecessary renders
              if (next !== value) {
                setInput(String(next));
                onChange(next);
              }
            }}
            onPointerUp={(e) => {
              if (activePointerIdRef.current !== null && e.pointerId !== activePointerIdRef.current) return;
              
              draggingRef.current = false;
              activePointerIdRef.current = null;
              onDragEnd?.();
              setIsDragging(false);
              
              // Release capture
              try {
                (e.target as Element).releasePointerCapture(e.pointerId);
              } catch {}
            }}
            onPointerCancel={() => {
               draggingRef.current = false;
               activePointerIdRef.current = null;
               onDragEnd?.();
               setIsDragging(false);
            }}
          />
        </div>

        {/* Min/Max labels */}
        <div className="flex justify-between mt-2">
          <span className="text-[12px] text-slate-400">${min.toLocaleString()}</span>
          <span className="text-[12px] text-slate-400">${max.toLocaleString()}</span>
        </div>
      </div>

      {/* QUICK AMOUNT PILLS */}
      <div className="mt-6 flex gap-3">
        {quickPicks.map((amt) => (
          <button
            key={amt}
            type="button"
            onClick={() => handleQuickPick(amt)}
            className={cn(
              "flex-1 h-11 rounded-full text-sm font-medium text-slate-900 flex items-center justify-center transition-colors touch-manipulation",
              value === amt
                ? "border-2 border-black bg-white"
                : "border-0 bg-[#F7F7F7]"
            )}
          >
            ${amt.toLocaleString()}
          </button>
        ))}
      </div>

      <style>{`
        .slider-cash-amount {
          -webkit-appearance: none;
          appearance: none;
          outline: none;
          touch-action: none;
        }
        
        /* Webkit Thumb - Black center, 28px diameter, white border - centered on track */
        .slider-cash-amount::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 28px;
          height: 28px;
          border-radius: 50%;
          background: #000000;
          cursor: pointer;
          border: 3px solid #ffffff;
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.08);
          transition: transform 120ms ease-out, box-shadow 120ms ease-out;
          margin-top: -9px; /* Center vertically: (28px thumb - 10px track) / 2 = -9px */
        }
        
        .slider-cash-amount:active::-webkit-slider-thumb {
          transform: scale(1.05);
        }
        
        /* Firefox Thumb - centered on track */
        .slider-cash-amount::-moz-range-thumb {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          background: #000000;
          cursor: pointer;
          border: 3px solid #ffffff;
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.08);
          transition: transform 120ms ease-out, box-shadow 120ms ease-out;
          margin-top: -9px; /* Center vertically */
        }
        
        .slider-cash-amount:active::-moz-range-thumb {
          transform: scale(1.05);
        }
        
        /* Track - transparent */
        .slider-cash-amount::-webkit-slider-runnable-track {
          background: transparent;
          height: 10px;
          border: none;
        }
        
        .slider-cash-amount::-moz-range-track {
          background: transparent;
          height: 10px;
          border: none;
        }
        
        .slider-cash-amount:focus {
          outline: none;
        }
      `}</style>

      {error && (
        <p className="text-red-500 text-sm text-center mt-4 transition-opacity duration-200">
          {error}
        </p>
      )}
    </div>
  );
}
