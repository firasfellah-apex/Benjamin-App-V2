import { useState } from "react";
import { EllipsisVertical, MapPin, Home, User, LogOut, X } from "@/lib/icons";
import { Clock } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetClose,
  SheetTrigger,
} from "@/components/ui/sheet";
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
import { useAuth } from "@/contexts/AuthContext";
import { useProfile } from "@/hooks/useProfile";

export function CustomerMenuButton() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { profile } = useProfile(user?.id);

  const handleLogoutClick = () => {
    setShowLogoutDialog(true);
    setIsMenuOpen(false);
  };

  const confirmLogout = async () => {
    await logout();
    setShowLogoutDialog(false);
    navigate("/");
  };

  const handleMenuItemClick = (path: string) => {
    navigate(path);
    setIsMenuOpen(false);
  };

  const isActive = (path: string, exact: boolean = false) => {
    if (exact) {
      return location.pathname === path;
    }
    if (path === "/customer/home") {
      return location.pathname === "/customer" || location.pathname === "/customer/home" || location.pathname.startsWith("/customer/home/");
    }
    return location.pathname.startsWith(path);
  };

  const getMenuItemClasses = (path: string, exact: boolean = false, isDestructive: boolean = false) => {
    const baseClasses = "w-full flex items-center gap-3 px-4 py-3.5 text-base font-medium rounded-lg transition-all text-left relative";
    const active = isActive(path, exact);
    
    if (isDestructive) {
      return `${baseClasses} text-white font-semibold`;
    }
    
    if (active) {
      return `${baseClasses} bg-black text-white font-semibold`;
    }
    
    return `${baseClasses} text-slate-700 hover:bg-slate-50 active:bg-slate-100`;
  };

  const isCustomer = profile?.role.includes('customer');

  return (
    <>
      <Sheet open={isMenuOpen} onOpenChange={setIsMenuOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="sm" className="gap-2 hover:bg-transparent hover:text-current">
            <EllipsisVertical className="h-5 w-5" />
            <span className="sr-only">Open menu</span>
          </Button>
        </SheetTrigger>
        <SheetContent side="right" className="w-[85vw] max-w-sm p-0 flex flex-col rounded-tl-3xl rounded-bl-3xl [&>button]:hidden">
          {/* Header - matches kebab menu position */}
          <div 
            className="px-6 flex items-center justify-end border-b border-slate-200"
            style={{ 
              paddingTop: 'max(44px, env(safe-area-inset-top))',
              paddingBottom: '12px' // Match header bar's pb-3
            }}
          >
            <SheetClose asChild>
              <button
                type="button"
                className="text-slate-500 hover:text-slate-700 rounded-full p-2 transition-colors touch-manipulation"
                aria-label="Close menu"
              >
                <X className="h-5 w-5" />
              </button>
            </SheetClose>
          </div>

          <div className="flex-1 px-6 py-6 space-y-1 overflow-y-auto">
            {user ? (
              <>
                <button
                  onClick={() => handleMenuItemClick("/account")}
                  className={getMenuItemClasses("/account", true)}
                >
                  <User className="h-5 w-5" style={isActive("/account", true) ? { color: '#34D399' } : { color: '#64748b' }} />
                  <span>My Profile</span>
                </button>

                {isCustomer && (
                  <button
                    onClick={() => handleMenuItemClick("/customer/home")}
                    className={getMenuItemClasses("/customer/home", false)}
                  >
                    <Home className="h-5 w-5" style={isActive("/customer/home", false) ? { color: '#34D399' } : { color: '#64748b' }} />
                    <span>Home</span>
                  </button>
                )}

                {isCustomer && (
                  <button
                    onClick={() => handleMenuItemClick("/customer/deliveries")}
                    className={getMenuItemClasses("/customer/deliveries", false)}
                  >
                    <Clock className="h-5 w-5" style={isActive("/customer/deliveries", false) ? { color: '#34D399' } : { color: '#64748b' }} />
                    <span>My Deliveries</span>
                  </button>
                )}

                {isCustomer && (
                  <button
                    onClick={() => handleMenuItemClick("/customer/addresses")}
                    className={getMenuItemClasses("/customer/addresses", true)}
                  >
                    <MapPin className="h-5 w-5" style={isActive("/customer/addresses", true) ? { color: '#34D399' } : { color: '#64748b' }} />
                    <span>Manage Addresses</span>
                  </button>
                )}
              </>
            ) : (
              <>
                <button
                  onClick={() => handleMenuItemClick("/")}
                  className={getMenuItemClasses("/", true)}
                >
                  <Home className="h-5 w-5" />
                  <span>Home</span>
                </button>
                <button
                  onClick={() => handleMenuItemClick("/login")}
                  className={getMenuItemClasses("/login", true)}
                >
                  <User className="h-5 w-5" />
                  <span>Log In</span>
                </button>
              </>
            )}
          </div>

          {user && (
            <div 
              className="px-6 pt-4 border-t border-slate-200"
              style={{ paddingBottom: 'max(24px, env(safe-area-inset-bottom))' }}
            >
              <button
                onClick={handleLogoutClick}
                className="w-full flex items-center gap-3 px-4 py-3.5 text-base font-semibold rounded-lg transition-all text-left bg-red-600 text-white hover:bg-red-700 active:bg-red-800"
              >
                <LogOut className="h-5 w-5" />
                <span>Log Out</span>
              </button>
            </div>
          )}
        </SheetContent>
      </Sheet>

      <AlertDialog open={showLogoutDialog} onOpenChange={setShowLogoutDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Logout</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to log out? You'll need to log in again to access your account.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmLogout}>
              Log Out
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

