import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Menu, User, LogOut, Home, Package, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useProfile } from "@/hooks/useProfile";
import { Skeleton } from "@/components/ui/skeleton";
import { BenjaminLogo } from "@/components/common/BenjaminLogo";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
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
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import logoutIllustration from "@/assets/illustrations/Logout.png";

export function CustomerHeader() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { profile, isReady } = useProfile(user?.id);

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
    const baseClasses = "w-full flex items-center gap-3 px-3 py-3 text-sm font-medium rounded-md transition-colors text-left relative";
    const active = isActive(path, exact);
    
    if (isDestructive) {
      return `${baseClasses} ${active ? 'bg-destructive/10 text-destructive border-l-2 border-destructive' : 'text-destructive hover:bg-destructive/10 hover:text-destructive'}`;
    }
    
    if (active) {
      return `${baseClasses} bg-accent text-accent-foreground font-semibold border-l-2 border-primary`;
    }
    
    return `${baseClasses} hover:bg-accent hover:text-accent-foreground`;
  };

  const isCustomer = profile?.role.includes('customer');

  return (
    <header className="bg-white/95 backdrop-blur-sm border-b border-neutral-100 sticky top-0 z-50 shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Logo */}
          <div className="flex items-center">
            <Link to="/customer/home" className="flex items-center gap-2">
              <BenjaminLogo variant="customer" height={28} />
            </Link>
          </div>

          {/* Hamburger Menu */}
          <div className="flex items-center">
            <Sheet open={isMenuOpen} onOpenChange={setIsMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-2">
                  <Menu className="h-5 w-5" />
                  <span className="sr-only">Open menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-80">
                <SheetHeader>
                  <SheetTitle>Menu</SheetTitle>
                  <SheetDescription asChild>
                    {user ? (
                      <div className="text-left">
                        {!isReady ? (
                          <>
                            <Skeleton className="h-5 w-32 mb-2" />
                            <Skeleton className="h-4 w-48" />
                          </>
                        ) : profile?.first_name || profile?.last_name ? (
                          <>
                            <p className="font-semibold text-foreground">
                              {[profile.first_name, profile.last_name].filter(Boolean).join(' ') || 'User'}
                            </p>
                            {profile.phone && (
                              <p className="text-sm text-muted-foreground">{profile.phone}</p>
                            )}
                          </>
                        ) : (
                          <>
                            <p className="font-semibold text-foreground">Complete your profile</p>
                            <p className="text-sm text-muted-foreground">Add your name to get started</p>
                          </>
                        )}
                      </div>
                    ) : (
                      <span>Access your account</span>
                    )}
                  </SheetDescription>
                </SheetHeader>

                <div className="mt-6 space-y-1">
                  {user ? (
                    <>
                      {/* Profile Link */}
                      <button
                        onClick={() => handleMenuItemClick("/account")}
                        className={getMenuItemClasses("/account", true)}
                      >
                        <User className="h-5 w-5" />
                        <span>My Profile</span>
                      </button>

                      {/* Home Link */}
                      {isCustomer && (
                        <button
                          onClick={() => handleMenuItemClick("/customer/home")}
                          className={getMenuItemClasses("/customer/home", false)}
                        >
                          <Home className={`h-5 w-5 ${isActive("/customer/home", false) ? 'text-accent-foreground' : ''}`} />
                          <span>Home</span>
                        </button>
                      )}

                      {/* My Deliveries Link */}
                      {isCustomer && (
                        <button
                          onClick={() => handleMenuItemClick("/customer/deliveries")}
                          className={getMenuItemClasses("/customer/deliveries", false)}
                        >
                          <Package className="h-5 w-5" />
                          <span>My Deliveries</span>
                        </button>
                      )}

                      {/* Manage Addresses Link */}
                      {isCustomer && (
                        <button
                          onClick={() => handleMenuItemClick("/customer/addresses")}
                          className={getMenuItemClasses("/customer/addresses", true)}
                        >
                          <MapPin className="h-5 w-5" />
                          <span>Manage Addresses</span>
                        </button>
                      )}

                      <Separator className="my-2" />

                      {/* Logout Button */}
                      <button
                        onClick={handleLogoutClick}
                        className={getMenuItemClasses("", false, true)}
                      >
                        <LogOut className="h-5 w-5" />
                        <span>Log Out</span>
                      </button>
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
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </nav>
      <AlertDialog open={showLogoutDialog} onOpenChange={setShowLogoutDialog}>
        <AlertDialogContent 
          className="p-0 gap-0 !top-1/2 !left-1/2 !-translate-x-1/2 !-translate-y-1/2 !right-auto !bottom-auto"
          style={{ 
            top: '50%', 
            left: '50%', 
            transform: 'translate(-50%, -50%)',
            right: 'auto',
            bottom: 'auto'
          }}
        >
          {/* Illustration */}
          <div className="h-48 md:h-56 flex items-center justify-center bg-[#E5E7EA] rounded-t-[24px]">
            <img
              src={logoutIllustration}
              alt="Logout confirmation"
              className="w-3/4 h-3/4 object-contain"
            />
          </div>

          <div className="px-6 py-6 space-y-4">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-xl font-semibold text-slate-900 text-center">
                Confirm Logout
              </AlertDialogTitle>
              <AlertDialogDescription className="text-center text-slate-600">
                Are you sure you want to log out? You'll need to log in again to access your account.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="flex-col gap-3 sm:flex-col">
              <AlertDialogAction
                onClick={confirmLogout}
                className={cn(
                  "w-full h-14 rounded-full bg-black text-white",
                  "hover:bg-black/90 active:scale-[0.98]",
                  "text-base font-semibold",
                  "transition-all duration-150 touch-manipulation"
                )}
              >
                Log Out
              </AlertDialogAction>
              <AlertDialogCancel
                className={cn(
                  "w-full h-14 rounded-full border border-black bg-white text-black",
                  "hover:bg-slate-50 active:scale-[0.98]",
                  "text-base font-semibold",
                  "transition-all duration-150 touch-manipulation",
                  "mt-0"
                )}
              >
                Cancel
              </AlertDialogCancel>
            </AlertDialogFooter>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </header>
  );
}

