import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Briefcase, BarChart2, MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";

const TABS = [
  { key: "work", label: "Work", icon: Briefcase, path: "/runner/work" },
  { key: "earnings", label: "Earnings", icon: BarChart2, path: "/runner/earnings" },
  { key: "more", label: "More", icon: MoreHorizontal, path: "/runner/more" },
];

export function RunnerBottomNav() {
  const location = useLocation();
  const navigate = useNavigate();

  const getActiveKey = () => {
    if (location.pathname.startsWith("/runner/earnings")) return "earnings";
    if (location.pathname.startsWith("/runner/more")) return "more";
    return "work";
  };

  const activeKey = getActiveKey();

  const handleNavClick = (path: string) => {
    if (location.pathname !== path) {
      navigate(path);
    }
  };

  return (
    <div 
      className="fixed inset-x-0 bottom-0 bg-[#020817] pt-3 pb-6 px-6 border-t border-white/5 z-50"
      style={{ borderBottomLeftRadius: 0, borderBottomRightRadius: 0 }}
    >
      <div className="flex items-center justify-between gap-4">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = tab.key === activeKey;

          return (
            <button
              key={tab.key}
              onClick={() => handleNavClick(tab.path)}
              className={cn(
                "flex-1 flex flex-col items-center justify-center gap-1 py-2 transition-colors",
                "min-h-[44px]", // Ensure tap target is accessible
                isActive ? "text-emerald-400 font-semibold" : "text-slate-500"
              )}
              aria-label={`${tab.label} - ${tab.key === 'work' ? 'View active and available orders' : tab.key === 'earnings' ? 'View your earnings and payout history' : 'Profile, card, training, and settings'}`}
              aria-current={isActive ? "page" : undefined}
            >
              <Icon
                className={cn(
                  "h-5 w-5 transition-colors",
                  isActive ? "text-emerald-400" : "text-slate-500"
                )}
              />
              <span className="text-xs tracking-wide">
                {tab.label}
              </span>
              {isActive && (
                <span className="block mt-0.5 h-0.5 w-6 rounded-full bg-emerald-400 mx-auto" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default RunnerBottomNav;

