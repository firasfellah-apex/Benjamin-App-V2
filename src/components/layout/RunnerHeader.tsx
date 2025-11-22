import { Link, useLocation, useNavigate } from "react-router-dom";
import { useProfile } from "@/contexts/ProfileContext";
import { BenjaminLogo } from "@/components/common/BenjaminLogo";

/**
 * Runner Status Pill Component
 * 
 * Read-only status indicator that shows Online/Offline state.
 * Clicking scrolls to the Online card in the Work screen (but does not change state).
 */
function RunnerStatusPill({ isOnline, isLoading }: { isOnline: boolean | null | undefined; isLoading?: boolean }) {
  const location = useLocation();
  const navigate = useNavigate();

  const handleClick = () => {
    // If not on Work page, navigate there first
    if (!location.pathname.startsWith("/runner/work") && location.pathname !== "/runner") {
      navigate("/runner/work", { 
        state: { scrollToOnlineCard: true } 
      });
    } else {
      // Already on Work page, just scroll
      // Use a small delay to ensure DOM is ready
      setTimeout(() => {
        const onlineCard = document.getElementById("runner-online-card");
        if (onlineCard) {
          onlineCard.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      }, 50);
    }
  };

  // Loading or unknown state
  if (isLoading || isOnline === null || isOnline === undefined) {
    return (
      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800/60 border border-slate-600 text-slate-500 text-xs font-medium">
        <span className="inline-flex rounded-full h-2 w-2 bg-slate-500" />
        <span>Status unavailable</span>
      </div>
    );
  }

  // Online state
  if (isOnline) {
    return (
      <button
        onClick={handleClick}
        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-900/40 border border-emerald-500/60 text-emerald-300 text-xs font-medium transition-opacity hover:opacity-80 cursor-pointer"
        aria-label="Online - Click to scroll to availability settings"
      >
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-50" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
        </span>
        <span>Online</span>
      </button>
    );
  }

  // Offline state
  return (
    <button
      onClick={handleClick}
      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800/60 border border-slate-600 text-slate-400 text-xs font-medium transition-opacity hover:opacity-80 cursor-pointer"
      aria-label="Offline - Click to scroll to availability settings"
    >
      <span className="inline-flex rounded-full h-2 w-2 bg-slate-500" />
      <span>Offline</span>
    </button>
  );
}

export function RunnerHeader() {
  const location = useLocation();
  const navigate = useNavigate();
  const { profile, loading: profileLoading } = useProfile();
  const isRunner = profile?.role.includes('runner');

  return (
    <header className="bg-[#020817] border-b border-slate-800 shrink-0 z-50">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex items-center">
            <Link to="/runner/work" className="flex items-center gap-2">
              <BenjaminLogo variant="runner" height={28} />
            </Link>
          </div>

          {/* Status Pill - Right Side */}
          {isRunner && (
            <RunnerStatusPill 
              isOnline={profile?.is_online} 
              isLoading={profileLoading}
            />
          )}
        </div>
      </nav>
    </header>
  );
}

