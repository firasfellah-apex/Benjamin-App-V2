/**
 * CustomerTopBar Component
 * 
 * Simple top bar with logo and menu.
 * No rounded corners or shadows - just the essential navigation.
 */

import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Menu, User, LogOut, Home, Package, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
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
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/contexts/AuthContext";
import { useProfile } from "@/hooks/useProfile";
import { Skeleton } from "@/components/ui/skeleton";

export function CustomerTopBar() {
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
    const baseClasses = "w-full flex items-center gap-3 px-3 py-3 text-base font-semibold rounded-md transition-colors text-left relative";
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
    <>
      <div className="flex justify-between items-center mb-4">
        <Link to="/customer/home" className="flex items-center gap-2">
          <BenjaminLogo variant="customer" height={28} />
        </Link>

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
                  <button
                    onClick={() => handleMenuItemClick("/account")}
                    className={getMenuItemClasses("/account", true)}
                  >
                    <User className="h-5 w-5" />
                    <span>My Profile</span>
                  </button>

                  {isCustomer && (
                    <button
                      onClick={() => handleMenuItemClick("/customer/home")}
                      className={getMenuItemClasses("/customer/home", false)}
                    >
                      <Home className={`h-5 w-5 ${isActive("/customer/home", false) ? 'text-accent-foreground' : ''}`} />
                      <span>Home</span>
                    </button>
                  )}

                  {isCustomer && (
                    <button
                      onClick={() => handleMenuItemClick("/customer/deliveries")}
                      className={getMenuItemClasses("/customer/deliveries", false)}
                    >
                      <Package className="h-5 w-5" />
                      <span>My Deliveries</span>
                    </button>
                  )}

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

                  <Button
                    onClick={handleLogoutClick}
                    className="w-full justify-start gap-3 text-white hover:opacity-90 active:opacity-80"
                    style={{ backgroundColor: '#E84855' }}
                  >
                    <LogOut className="h-5 w-5" />
                    <span>Log Out</span>
                  </Button>
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

      <AlertDialog open={showLogoutDialog} onOpenChange={setShowLogoutDialog}>
        <AlertDialogContent className="max-w-sm mx-auto">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-semibold text-slate-900">
              Confirm Logout
            </AlertDialogTitle>
            <AlertDialogDescription className="text-slate-600">
              Are you sure you want to log out?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col gap-3 sm:flex-col">
            <Button
              onClick={confirmLogout}
              className="w-full h-14 text-white hover:opacity-90"
              style={{ backgroundColor: '#E84855' }}
            >
              Log Out
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowLogoutDialog(false)}
              className="w-full h-14"
            >
              Cancel
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

