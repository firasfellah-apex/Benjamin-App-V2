import { ReactNode } from "react";
import { useState } from "react";
import { EllipsisVertical, ArrowLeft } from "@/lib/icons";
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
import { Home, User, LogOut, Package, MapPin } from "@/lib/icons";

export function CustomerHeader({
  title,
  subtitle,
  right,
  showBack,
  onBack,
}: {
  title: ReactNode | null;
  subtitle?: ReactNode | null;
  right?: ReactNode;
  showBack?: boolean;
  onBack?: () => void;
}) {
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

  const menuButton = !showBack ? (
    <Sheet open={isMenuOpen} onOpenChange={setIsMenuOpen}>
      <SheetTrigger asChild>
        <Button 
          variant="ghost" 
          size="sm" 
          className="w-12 h-12 p-0 inline-flex items-center justify-center rounded-full border border-[#F0F0F0] bg-white hover:bg-slate-50 active:bg-slate-100"
        >
          <EllipsisVertical className="h-5 w-5 text-slate-900" />
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
  ) : null;

  const backButton = showBack ? (
    <button
      onClick={onBack || (() => navigate(-1))}
      className="p-2 hover:bg-gray-100 rounded-full transition-colors -ml-2"
      aria-label="Go back"
    >
      <ArrowLeft className="h-5 w-5 text-gray-600" />
    </button>
  ) : (
    <Link 
      to="/customer/home" 
      className="inline-flex items-center"
    >
      <BenjaminLogo variant="customer" height={28} />
    </Link>
  );

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        {backButton}
        {menuButton}
      </div>
      {/* Only render hero block when we actually have a title/subtitle */}
      {(title || subtitle || right) && (
        <div className="flex items-start justify-between gap-3">
          <div>
            {title && (
              <h1 className="text-2xl font-semibold leading-snug tracking-tight text-slate-900">
                {title}
              </h1>
            )}
            {subtitle && (
              <p className="text-slate-500 text-base mt-1 leading-relaxed">
                {subtitle}
              </p>
            )}
          </div>
          {right && <div className="shrink-0">{right}</div>}
        </div>
      )}

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

