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
}: CashAmountInputProps) {
  const [input, setInput] = useState<string>(String(value));
  const [error, setError] = useState<string>("");
  const [isEditing, setIsEditing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const sliderRef = useRef<HTMLInputElement>(null);

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

  // Calculate thumb position
  const thumbPosition = ((value - min) / (max - min)) * 100;

  // Quick pick amounts
  const quickPicks = [100, 200, 500, 1000].filter(amt => amt >= min && amt <= max);

  return (
    <div className={cn("w-full", className)}>
      {/* TOP AMOUNT CONTAINER - Large centered amount in soft card */}
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

      {/* SLIDER - Thick green track + black knob */}
      <div className="mb-6 pt-3">
        {/* Visual track container - 10px height */}
        <div className="relative w-full" style={{ height: '10px' }}>
          {/* Background track - unfilled portion */}
          <div 
            className="absolute left-0 right-0 h-full rounded-full"
            style={{ background: '#F7F7F7' }}
          />
          
          {/* Filled portion - green */}
          <motion.div 
            className="absolute left-0 h-full rounded-full pointer-events-none"
            style={{ 
              background: '#13F287',
              height: '10px'
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

          {/* Slider input - Expanded touch area (44px) for easier activation, visually centered on 10px track */}
          <input
            ref={sliderRef}
            type="range"
            min={min}
            max={max}
            step={step}
            value={value}
            onChange={handleSliderChange}
            onMouseDown={() => setIsDragging(true)}
            onMouseUp={() => setIsDragging(false)}
            onMouseLeave={() => setIsDragging(false)}
            onTouchStart={() => setIsDragging(true)}
            onTouchEnd={() => setIsDragging(false)}
            disabled={isEditing}
            className="absolute left-0 right-0 w-full appearance-none cursor-pointer bg-transparent z-10 slider-cash-amount"
            style={{ 
              height: '44px',
              top: '-17px', // Center 44px touch area vertically on 10px visual track
              touchAction: 'none',
              margin: 0, 
              padding: 0,
            }}
            aria-label="Cash amount slider"
          />
        </div>

        {/* Min/Max labels - below slider */}
        <div className="flex justify-between mt-2">
          <span className="text-[12px] text-slate-400">${min.toLocaleString()}</span>
          <span className="text-[12px] text-slate-400">${max.toLocaleString()}</span>
        </div>
      </div>

      {/* QUICK AMOUNT PILLS - Equal width across row */}
      <div className="mt-6 flex gap-3">
        {quickPicks.map((amt) => (
          <button
            key={amt}
            type="button"
            onClick={() => handleQuickPick(amt)}
            className={cn(
              "flex-1 h-11 rounded-full text-sm font-medium text-slate-900 flex items-center justify-center transition-colors touch-manipulation",
              value === amt
                ? "border border-black bg-white"
                : "border border-slate-200 bg-white"
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
          touch-action: pan-y;
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

      {/* Error message */}
      {error && (
        <p className="text-red-500 text-sm text-center mt-4 transition-opacity duration-200">
          {error}
        </p>
      )}
    </div>
  );
}
