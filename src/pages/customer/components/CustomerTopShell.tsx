/**
 * CustomerTopShell Component
 * 
 * Minimal shared header for customer pages.
 * Only controls logo, title, subtitle, and optional top content.
 * No card-like containers or extra frames.
 */

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { EllipsisVertical, MapPin, Home, ArrowLeft, User, LogOut, Package } from "@/lib/icons";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { BenjaminLogo } from "@/components/common/BenjaminLogo";
import { Button } from "@/components/ui/button";
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
import type { ReactNode } from "react";

const ease = [0.22, 0.61, 0.36, 1];
const TRANSITION_DURATION = 0.3;

interface CustomerTopShellProps {
  title: string | ReactNode; // Allow ReactNode for skeleton loaders
  subtitle: string;
  topContent?: ReactNode; // last delivery / address cards / etc.
  onOpenMenu?: () => void;
  showBack?: boolean;
  onBack?: () => void;
  isReady?: boolean; // Whether profile/data is ready (controls shimmer)
}

export function CustomerTopShell({
  title,
  subtitle,
  topContent,
  onOpenMenu,
  showBack = false,
  onBack,
  isReady = true, // Default to true for backward compatibility
}: CustomerTopShellProps) {
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
      <motion.header
        layoutId="customer-top-shell-header"
        layout="position"
        transition={{ duration: TRANSITION_DURATION, ease, layout: { duration: TRANSITION_DURATION } }}
        className="px-8 pt-10 pb-8"
      >
        {/* Logo + menu (fixed position & styling across screens) */}
        <div className="flex items-center justify-between">
          {showBack ? (
            <button
              onClick={onBack || (() => navigate(-1))}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors -ml-2"
              aria-label="Go back"
            >
              <ArrowLeft className="h-5 w-5 text-gray-600" />
            </button>
          ) : (
            <Link to="/customer/home" className="flex items-center gap-2">
              <BenjaminLogo variant="customer" height={28} />
            </Link>
          )}
          
          {!showBack && (
            <Sheet open={isMenuOpen} onOpenChange={setIsMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-2">
                  <EllipsisVertical className="h-5 w-5" />
                  <span className="sr-only">Open menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-80">
                <SheetHeader>
                  <SheetTitle>Menu</SheetTitle>
                  <SheetDescription asChild>
                    {user ? (
                      <div className="text-left">
                        {profile ? (
                          <>
                            <p className="font-semibold text-foreground">{profile.first_name} {profile.last_name}</p>
                            <p className="text-sm text-muted-foreground">{user.email}</p>
                          </>
                        ) : (
                          <>
                            <p className="font-semibold text-foreground">Loading profile...</p>
                            <p className="text-sm text-muted-foreground">{user.email}</p>
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
                          onClick={() => handleMenuItemClick("/customer/orders")}
                          className={getMenuItemClasses("/customer/orders", false)}
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
          )}
        </div>

        {/* Title + subtitle with fixed height and AnimatePresence */}
        <motion.div 
          layout
          className="mt-6 min-h-[88px]"
        >
          <AnimatePresence mode="popLayout">
            <motion.div
              key={typeof title === 'string' ? title : 'title-content'}
              layout
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.18 }}
            >
              {!isReady ? (
                <>
                  <Skeleton className="h-7 w-64 mb-2" />
                  <Skeleton className="h-5 w-48" />
                </>
              ) : (
                <>
                  <h1 className="text-[24px] leading-tight font-semibold text-slate-900">
                    {title}
                  </h1>
                  <p className="mt-2 text-base text-slate-500">
                    {subtitle}
                  </p>
                </>
              )}
            </motion.div>
          </AnimatePresence>
        </motion.div>

        {/* Optional top content: subtle layout + fade, avoid remounting */}
        <AnimatePresence mode="wait">
          {topContent && (
            <motion.div 
              key="top-content"
              layout
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              className="mt-6"
            >
              {topContent}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.header>

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
