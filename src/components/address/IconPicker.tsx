import { useState } from "react";
import { 
  Home, 
  Building2, 
  Heart, 
  MapPin, 
  Briefcase, 
  School, 
  Hotel, 
  Store, 
  Navigation,
  Calendar,
  Star,
  Zap,
  Coffee,
  Plane,
  Car,
  type LucideIcon
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

// Preset icon-label pairs
export const PRESET_ADDRESS_ICONS = [
  { icon: Home, name: "Home", label: "Home" },
  { icon: Building2, name: "Building2", label: "Office" },
  { icon: Heart, name: "Heart", label: "Loved one's place" },
  { icon: Briefcase, name: "Briefcase", label: "Work" },
  { icon: School, name: "School", label: "School" },
  { icon: Hotel, name: "Hotel", label: "Hotel" },
  { icon: Store, name: "Store", label: "Store" },
] as const;

// Additional location icons
export const LOCATION_ICONS = [
  { icon: MapPin, name: "MapPin", label: "Location" },
  { icon: Navigation, name: "Navigation", label: "Navigation" },
  { icon: Coffee, name: "Coffee", label: "Coffee Shop" },
  { icon: Calendar, name: "Calendar", label: "Event" },
  { icon: Star, name: "Star", label: "Favorite" },
  { icon: Zap, name: "Zap", label: "Quick" },
  { icon: Plane, name: "Plane", label: "Airport" },
  { icon: Car, name: "Car", label: "Parking" },
] as const;

// All available icons
export const ALL_ICONS = [...PRESET_ADDRESS_ICONS, ...LOCATION_ICONS];

// Helper to get icon by name
export function getIconByName(name: string): LucideIcon {
  const found = ALL_ICONS.find(i => i.name === name);
  return found ? found.icon : Home; // Default to Home
}

interface IconPickerProps {
  value: string; // Icon name
  onChange: (iconName: string) => void;
  className?: string;
}

export function IconPicker({ value, onChange, className }: IconPickerProps) {
  const [open, setOpen] = useState(false);
  const selectedIcon = ALL_ICONS.find(i => i.name === value) || PRESET_ADDRESS_ICONS[0];
  const IconComponent = selectedIcon.icon;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "flex items-center justify-center w-12 h-12 rounded-xl border-2 border-gray-200 bg-white hover:border-[#22C55E] hover:bg-green-50 transition-colors touch-manipulation",
            className
          )}
        >
          <IconComponent className="h-5 w-5 text-gray-700" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-4 z-[100]" align="start">
        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-2">Preset Locations</h3>
            <div className="grid grid-cols-4 gap-2">
              {PRESET_ADDRESS_ICONS.map(({ icon: Icon, name, label }) => {
                const isSelected = value === name;
                return (
                  <button
                    key={name}
                    type="button"
                    onClick={() => {
                      onChange(name);
                      setOpen(false);
                    }}
                    className={cn(
                      "flex items-center justify-center p-3 rounded-xl border-2 transition-all touch-manipulation",
                      "hover:scale-105 active:scale-95",
                      isSelected
                        ? "border-[#22C55E] bg-green-50"
                        : "border-gray-200 bg-white hover:border-gray-300"
                    )}
                    title={label}
                  >
                    <Icon className={cn(
                      "h-5 w-5",
                      isSelected ? "text-[#22C55E]" : "text-gray-700"
                    )} />
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-2">More Icons</h3>
            <div className="grid grid-cols-4 gap-2">
              {LOCATION_ICONS.map(({ icon: Icon, name, label }) => {
                const isSelected = value === name;
                return (
                  <button
                    key={name}
                    type="button"
                    onClick={() => {
                      onChange(name);
                      setOpen(false);
                    }}
                    className={cn(
                      "flex items-center justify-center p-3 rounded-xl border-2 transition-all touch-manipulation",
                      "hover:scale-105 active:scale-95",
                      isSelected
                        ? "border-[#22C55E] bg-green-50"
                        : "border-gray-200 bg-white hover:border-gray-300"
                    )}
                    title={label}
                  >
                    <Icon className={cn(
                      "h-5 w-5",
                      isSelected ? "text-[#22C55E]" : "text-gray-700"
                    )} />
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

