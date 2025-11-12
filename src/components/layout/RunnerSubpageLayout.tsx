import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

interface RunnerSubpageLayoutProps {
  title: string;
  children: React.ReactNode;
  headerRight?: React.ReactNode;
}

/**
 * RunnerSubpageLayout Component
 * 
 * Layout for nested runner pages (delivery detail, delivery history, etc.)
 * - Hides bottom navigation
 * - Shows back button in header
 * - Uses consistent runner dark theme
 */
export function RunnerSubpageLayout({ title, children, headerRight }: RunnerSubpageLayoutProps) {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#020817] text-slate-50">
      <header className="flex items-center gap-3 px-4 pt-4 pb-2">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 rounded-lg bg-white/5 hover:bg-white/10 px-3 py-2 text-sm text-slate-300 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>
        <h1 className="text-lg font-semibold text-white">{title}</h1>
        {headerRight && <div className="ml-auto">{headerRight}</div>}
      </header>
      <main className="px-4 pb-6 pt-4">{children}</main>
    </div>
  );
}

