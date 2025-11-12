import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { User, CreditCard, BookOpen, HelpCircle, LogOut, Mail, ChevronRight } from "lucide-react";
import { ShellCard } from "@/components/ui/ShellCard";
import { Avatar } from "@/components/common/Avatar";
import { useAuth } from "@/contexts/AuthContext";
import { useProfile } from "@/contexts/ProfileContext";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";

export default function More() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { profile } = useProfile();
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);

  const handleLogout = async () => {
    await logout();
    setShowLogoutDialog(false);
    navigate("/");
  };

  const handleContactSupport = () => {
    window.location.href = `mailto:support@benjamin.app?subject=Runner Support Request&body=Hello, I need help with...`;
  };

  // Get user initials for avatar fallback
  const getUserInitials = () => {
    if (profile?.first_name && profile?.last_name) {
      return `${profile.first_name.charAt(0)}${profile.last_name.charAt(0)}`.toUpperCase();
    }
    if (profile?.first_name) {
      return profile.first_name.charAt(0).toUpperCase();
    }
    if (user?.email) {
      return user.email.charAt(0).toUpperCase();
    }
    return "R";
  };

  const getUserDisplayName = () => {
    if (profile?.first_name && profile?.last_name) {
      return `${profile.first_name} ${profile.last_name}`;
    }
    if (profile?.first_name) {
      return profile.first_name;
    }
    return user?.email || "Runner";
  };

  return (
    <div className="space-y-6">
      {/* Profile Section */}
      <ShellCard variant="runner">
        <div className="flex items-center gap-4">
          <Avatar
            src={profile?.avatar_url || undefined}
            fallback={getUserInitials()}
            size="lg"
            className="w-14 h-14"
          />
          <div className="flex-1 min-w-0">
            <p className="text-xs text-slate-400 mb-1">Signed in as</p>
            <h3 className="text-base font-semibold text-white truncate">
              {getUserDisplayName()}
            </h3>
            <p className="text-sm text-slate-400 truncate mt-0.5">
              {user?.email}
            </p>
            <button
              onClick={() => navigate("/account")}
              className="mt-2 text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
            >
              View profile
            </button>
          </div>
        </div>
      </ShellCard>

      {/* Benjamin Card Section */}
      <ShellCard variant="runner">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-indigo-500/15 text-indigo-400">
              <CreditCard className="h-4 w-4" />
            </div>
            <h2 className="text-base font-semibold text-slate-50">Benjamin Card</h2>
          </div>
          <Badge className="rounded-full bg-emerald-500/15 px-3 py-0.5 text-xs font-medium text-emerald-400 border-0">
            Active
          </Badge>
        </div>
        <p className="text-xs text-slate-400 mb-3 leading-relaxed">
          This card is automatically funded for approved jobs. You never use your own cash.
        </p>
        <div className="flex items-baseline gap-2 text-sm">
          <span className="text-slate-500">Card ending</span>
          <span className="font-mono tracking-wide text-slate-300">•••• 1234</span>
        </div>
      </ShellCard>

      {/* Training & Playbook */}
      <ShellCard variant="runner">
        <div className="flex items-center gap-2 mb-3">
          <div className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-indigo-500/15 text-indigo-400">
            <BookOpen className="h-4 w-4" />
          </div>
          <h2 className="text-base font-semibold text-slate-50">Training & Playbook</h2>
        </div>
        <div className="space-y-1">
          <button
            onClick={() => navigate("/admin/training")}
            className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm text-indigo-300 hover:text-indigo-200 hover:bg-indigo-500/10 transition-colors text-left"
          >
            <span>How Benjamin works</span>
            <ChevronRight className="h-4 w-4 text-slate-500" />
          </button>
          <button
            onClick={() => {
              // Placeholder - could navigate to a training page
              console.log("Cash handling & safety");
            }}
            className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm text-indigo-300 hover:text-indigo-200 hover:bg-indigo-500/10 transition-colors text-left"
          >
            <span>Cash handling & safety</span>
            <ChevronRight className="h-4 w-4 text-slate-500" />
          </button>
          <button
            onClick={() => {
              // Placeholder - could navigate to a training page
              console.log("Customer interaction guidelines");
            }}
            className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm text-indigo-300 hover:text-indigo-200 hover:bg-indigo-500/10 transition-colors text-left"
          >
            <span>Customer interaction guidelines</span>
            <ChevronRight className="h-4 w-4 text-slate-500" />
          </button>
        </div>
      </ShellCard>

      {/* Support */}
      <ShellCard variant="runner">
        <div className="flex items-center gap-2 mb-3">
          <div className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-indigo-500/15 text-indigo-400">
            <HelpCircle className="h-4 w-4" />
          </div>
          <h2 className="text-base font-semibold text-slate-50">Support</h2>
        </div>
        <p className="text-xs text-slate-400 mb-3">
          Need help with an order or your account?
        </p>
        <button
          onClick={handleContactSupport}
          className="w-full inline-flex items-center justify-center rounded-xl border border-indigo-500/40 bg-indigo-500/10 px-4 py-2.5 text-sm font-medium text-indigo-300 hover:bg-indigo-500/15 transition-colors"
        >
          <Mail className="mr-2 h-4 w-4" />
          Contact Support
        </button>
      </ShellCard>

      {/* Logout */}
      <button
        onClick={() => setShowLogoutDialog(true)}
        className="w-full inline-flex items-center justify-center rounded-xl border border-red-500/40 bg-red-500/5 px-4 py-3 text-sm font-medium text-red-400 hover:bg-red-500/10 transition-colors"
      >
        <LogOut className="mr-2 h-4 w-4" />
        Log Out
      </button>

      {/* Logout Confirmation Dialog */}
      <AlertDialog open={showLogoutDialog} onOpenChange={setShowLogoutDialog}>
        <AlertDialogContent className="bg-[#050816] border-slate-800">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Confirm Logout</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">
              Are you sure you want to log out? You'll need to log in again to access your account.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleLogout}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Log Out
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

