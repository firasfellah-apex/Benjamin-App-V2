import { cn } from "@/lib/utils";

export type DeliveryMode = "quick_handoff" | "count_confirm";

interface DeliveryModeSelectorProps {
  value: DeliveryMode | null;
  onChange: (mode: DeliveryMode) => void;
  className?: string;
}

export function DeliveryModeSelector({
  value,
  onChange,
  className,
}: DeliveryModeSelectorProps) {
  return (
    <div className={cn("space-y-3", className)}>
      <label className="text-sm font-medium text-gray-700">
        Delivery Style
      </label>
      
      <div className="space-y-2">
        {/* Quick Handoff */}
        <label className="flex items-start gap-3 p-4 rounded-lg border-2 cursor-pointer transition-colors hover:bg-gray-50">
          <input
            type="radio"
            name="delivery-mode"
            value="quick_handoff"
            checked={value === "quick_handoff"}
            onChange={() => onChange("quick_handoff")}
            className="mt-0.5 h-4 w-4 text-black border-gray-300 focus:ring-black"
          />
          <div className="flex-1">
            <div className="text-base font-semibold text-gray-900">
              Quick Handoff
            </div>
            <div className="text-sm text-gray-600 mt-0.5">
              Fast exchange, no counting required
            </div>
          </div>
        </label>

        {/* Count & Confirm */}
        <label className="flex items-start gap-3 p-4 rounded-lg border-2 cursor-pointer transition-colors hover:bg-gray-50">
          <input
            type="radio"
            name="delivery-mode"
            value="count_confirm"
            checked={value === "count_confirm"}
            onChange={() => onChange("count_confirm")}
            className="mt-0.5 h-4 w-4 text-black border-gray-300 focus:ring-black"
          />
          <div className="flex-1">
            <div className="text-base font-semibold text-gray-900">
              Count & Confirm
            </div>
            <div className="text-sm text-gray-600 mt-0.5">
              Runner counts cash with you before handoff
            </div>
          </div>
        </label>
      </div>
    </div>
  );
}

