import { cn } from "@/lib/utils";

interface ChipSelectorProps {
  options: Array<{ value: string; label: string }>;
  value: string | string[] | null;
  onChange: (value: string | string[] | null) => void;
  multiSelect?: boolean;
  className?: string;
}

export function ChipSelector({
  options,
  value,
  onChange,
  multiSelect = false,
  className,
}: ChipSelectorProps) {
  const isSelected = (optionValue: string) => {
    if (multiSelect && Array.isArray(value)) {
      return value.includes(optionValue);
    }
    return value === optionValue;
  };

  const handleClick = (optionValue: string) => {
    if (multiSelect) {
      const currentValue = Array.isArray(value) ? value : [];
      if (currentValue.includes(optionValue)) {
        const newValue = currentValue.filter((v) => v !== optionValue);
        onChange(newValue.length > 0 ? newValue : null);
      } else {
        onChange([...currentValue, optionValue]);
      }
    } else {
      onChange(value === optionValue ? null : optionValue);
    }
  };

  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {options.map((option) => {
        const selected = isSelected(option.value);
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => handleClick(option.value)}
            className={cn(
              "px-4 py-2.5 rounded-full text-sm font-medium transition-all",
              selected
                ? "bg-black text-white border border-black"
                : "bg-white text-slate-900 border border-slate-200 hover:border-slate-300"
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

