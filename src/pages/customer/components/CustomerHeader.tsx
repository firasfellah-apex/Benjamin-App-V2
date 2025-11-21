import { ReactNode } from "react";
import { useState } from "react";
import { EllipsisVertical, ArrowLeft } from "@/lib/icons";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { BenjaminLogo } from "@/components/common/BenjaminLogo";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetClose,
  SheetTrigger,
  SheetHeader,
  SheetTitle,
  SheetDescription,
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
import { Avatar } from "@/components/common/Avatar";
import { Clock, MapPinPen, LogOut, X, Star } from "@/lib/icons";
import { Landmark } from "lucide-react";
import { cn } from "@/lib/utils";
import logoutIllustration from "@/assets/illustrations/Logout.png";

export function CustomerHeader({
  title,
  subtitle,
  right,
  showBack,
  onBack,
  useXButton = false,
}: {
  title: ReactNode | null;
  subtitle?: ReactNode | null;
  right?: ReactNode;
  showBack?: boolean;
  onBack?: () => void;
  useXButton?: boolean; // Use X button instead of arrow for menu pages
}) {
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

  const isCustomer = profile?.role.includes('customer');
  const isHomePage = location.pathname === "/customer/home" || location.pathname === "/customer";

  const menuButton = !showBack && isHomePage ? (
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
      <SheetContent 
        side="right" 
        className="w-[85vw] max-w-sm p-0 flex flex-col rounded-tl-3xl rounded-bl-3xl [&>button:first-child]:hidden"
      >
        {/* Accessibility: Hidden title and description for screen readers */}
        <SheetHeader className="sr-only">
          <SheetTitle>Menu</SheetTitle>
          <SheetDescription>Navigation menu and account settings</SheetDescription>
        </SheetHeader>

        {/* Close Button - aligned exactly with kebab menu button position */}
        <div className="px-6 pt-6 pb-2 flex items-center justify-end">
          <SheetClose asChild>
            <button
              type="button"
              className="w-12 h-12 p-0 inline-flex items-center justify-center rounded-full border border-[#F0F0F0] bg-white hover:bg-slate-50 active:bg-slate-100 transition-colors touch-manipulation"
              aria-label="Close menu"
            >
              <X className="h-5 w-5 text-slate-900" />
            </button>
          </SheetClose>
        </div>

        {/* Profile Section - Clickable */}
        {user && (
          <>
            <button
              onClick={() => {
                handleMenuItemClick("/account");
              }}
              className="w-full px-6 pb-6 flex flex-col items-center hover:bg-slate-50 active:bg-slate-100 transition-colors touch-manipulation"
            >
            <Avatar
              src={profile?.avatar_url}
              alt={profile ? [profile.first_name, profile.last_name].filter(Boolean).join(' ') || 'User' : 'User'}
              fallback={profile ? [profile.first_name, profile.last_name].filter(Boolean).join(' ') || 'User' : 'User'}
              size="2xl"
              className="mb-3"
            />
            <p className="font-semibold text-base text-slate-900 mb-1">
              {profile ? [profile.first_name, profile.last_name].filter(Boolean).join(' ') || 'User' : 'Loading...'}
            </p>
            {/* Rating with star - placeholder for now */}
            {profile && (
              <div className="flex items-center gap-1">
                <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
                <span className="text-sm text-slate-600">5</span>
              </div>
            )}
          </button>
          {/* Divider under account button */}
          <div className="h-[6px] bg-[#F7F7F7] mx-6" />
          </>
        )}

        {/* Menu Items */}
        {user && isCustomer && (
          <div className="flex-1 px-6 py-6 space-y-0 overflow-y-auto">
            <button
              onClick={() => handleMenuItemClick("/customer/deliveries")}
              className="w-full flex items-center gap-3 px-4 py-3.5 text-base font-medium text-slate-700 hover:bg-slate-50 active:bg-slate-100 transition-colors border-b border-slate-200"
            >
              <Clock className="h-5 w-5 text-slate-900" />
              <span>My Orders</span>
            </button>

            <button
              onClick={() => handleMenuItemClick("/customer/addresses")}
              className="w-full flex items-center gap-3 px-4 py-3.5 text-base font-medium text-slate-700 hover:bg-slate-50 active:bg-slate-100 transition-colors border-b border-slate-200"
            >
              <MapPinPen className="h-5 w-5 text-slate-900" />
              <span>Manage Addresses</span>
            </button>

            <button
              onClick={() => handleMenuItemClick("/customer/banks")}
              className="w-full flex items-center gap-3 px-4 py-3.5 text-base font-medium text-slate-700 hover:bg-slate-50 active:bg-slate-100 transition-colors"
            >
              <Landmark className="h-5 w-5 text-slate-900" />
              <span>My Bank Accounts</span>
            </button>
          </div>
        )}

        {/* Log Out Button */}
        {user && (
          <>
            {/* Divider above logout button */}
            <div className="h-[6px] bg-[#F7F7F7] mx-6" />
            <div className="px-6 pt-4 pb-6">
            <button
              onClick={handleLogoutClick}
              className="w-full flex items-center justify-center gap-2 h-14 min-h-[56px] px-6 text-[17px] font-semibold rounded-full border border-red-500 text-red-600 bg-transparent hover:bg-red-50 active:bg-red-100 transition-all"
            >
              <LogOut className="h-5 w-5 text-red-600" />
              <span>Log Out</span>
            </button>
          </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  ) : null;

  const backButton = showBack ? (
    <button
      onClick={onBack || (() => navigate(-1))}
      className={cn(
        "w-12 h-12 p-0 inline-flex items-center justify-center rounded-full border border-[#F0F0F0] bg-white hover:bg-slate-50 active:bg-slate-100 transition-colors touch-manipulation",
        useXButton ? "" : "p-2 hover:bg-gray-100 -ml-2"
      )}
      aria-label={useXButton ? "Close" : "Go back"}
    >
      {useXButton ? (
        <X className="h-5 w-5 text-slate-900" />
      ) : (
        <ArrowLeft className="h-5 w-5 text-gray-600" />
      )}
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
      {/* pb-6 ensures 24px spacing from subtitle to divider (matches FlowHeader) */}
      {(title || subtitle || right) && (
        <div className="flex items-start justify-between gap-3 pb-6">
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
        <AlertDialogContent className="sm:max-w-md">
          <div className="flex flex-col items-center text-center space-y-4">
            {/* Logout Illustration */}
            <div className="flex justify-center mb-2">
              <img 
                src={logoutIllustration} 
                alt="Logout" 
                className="w-32 h-32 object-contain"
              />
            </div>
            
            <AlertDialogHeader className="space-y-2">
              <AlertDialogTitle className="text-xl font-semibold">
                Confirm Logout
              </AlertDialogTitle>
              <AlertDialogDescription className="text-base text-slate-600">
                Are you sure you want to log out? You'll need to log in again to access your account.
              </AlertDialogDescription>
            </AlertDialogHeader>
          </div>
          
          <AlertDialogFooter className="flex-col sm:flex-row gap-3 mt-6">
            <AlertDialogCancel 
              className="h-14 min-h-[56px] px-6 text-[17px] font-semibold rounded-full border-black bg-white text-black hover:bg-slate-50 w-full sm:w-auto"
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmLogout}
              className="h-14 min-h-[56px] px-6 text-[17px] font-semibold rounded-full bg-black text-white hover:bg-black/90 w-full sm:w-auto"
            >
              Log Out
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

