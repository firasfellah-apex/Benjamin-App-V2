/**
 * CustomerTopShell Component
 * 
 * Top navigation shell for customer flow pages.
 * Includes logo/menu row and page-specific content.
 * Height auto-adjusts to content ("hugs" content).
 */

import React, { useRef, useState } from "react";
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
  AlertDialogAction,
  AlertDialogCancel,
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
import { cn } from "@/lib/utils";

interface CustomerTopShellProps {
  children: React.ReactNode; // page-specific content under the logo/menu row
  className?: string;
}

export function CustomerTopShell({ children, className }: CustomerTopShellProps) {
  const containerRef = useRef<HTMLDivElement>(null);
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
    <>
      <div
        ref={containerRef}
        className={cn(
          "w-full bg-white rounded-b-[32px]",
          "shadow-[0_8px_24px_rgba(15,23,42,0.08)]",
          "px-6 pt-6 pb-5",
          "max-w-md mx-auto",
          className
        )}
      >
        {/* Logo + Menu Row */}
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

        {/* Page-specific content */}
        {children}
      </div>

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

