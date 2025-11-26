import { ReactNode, useState, useEffect } from "react";
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
import { useQueryClient } from "@tanstack/react-query";
import { Clock, MapPinPen, LogOut, X, Star } from "@/lib/icons";
import { Landmark, CheckCircle2 } from "lucide-react";
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
  const queryClient = useQueryClient();

  // Refetch profile when menu opens to ensure fresh avatar
  useEffect(() => {
    if (isMenuOpen && user?.id) {
      queryClient.refetchQueries({ queryKey: ['profile', user.id] });
    }
  }, [isMenuOpen, user?.id, queryClient]);

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

  const kycStatus = profile?.kyc_status;
  const isKycVerified = kycStatus === "verified";

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
          <button
            onClick={() => {
              handleMenuItemClick("/account");
            }}
            className="w-full px-6 pb-5 flex flex-col items-center transition-colors touch-manipulation"
          >
            <Avatar
              src={profile?.avatar_url}
              alt={
                profile
                  ? [profile.first_name, profile.last_name]
                      .filter(Boolean)
                      .join(" ") || "User"
                  : "User"
              }
              fallback={
                profile
                  ? [profile.first_name, profile.last_name]
                      .filter(Boolean)
                      .join(" ") || "User"
                  : "User"
              }
              size="2xl"
              className="mb-3"
              cacheKey={profile?.updated_at}
            />

            <p className="font-semibold text-base text-slate-900">
              {profile
                ? [profile.first_name, profile.last_name]
                    .filter(Boolean)
                    .join(" ") || "User"
                : "Loading..."}
            </p>

            <div className="mt-1 flex items-center gap-2">
              {/* KYC pill */}
              <span
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-sm font-normal",
                  isKycVerified
                    ? "bg-emerald-50 text-emerald-700"
                    : "bg-amber-50 text-amber-700"
                )}
              >
                {isKycVerified ? (
                  <CheckCircle2 className="h-3.5 w-3.5" />
                ) : (
                  <span className="h-1.5 w-1.5 rounded-full bg-current" />
                )}
                {isKycVerified ? "Verified" : "Verification needed"}
              </span>

              {/* Rating pill */}
              <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-sm font-normal" style={{ backgroundColor: '#FFFBEB', color: '#F2AB58' }}>
                <Star className="h-3.5 w-3.5 fill-[#F2AB58]" style={{ color: '#F2AB58' }} />
                <span>5.0</span>
              </span>
            </div>
          </button>
        )}

        {/* Divider under profile – full width of the sheet */}
        <div className="h-[6px] bg-[#F7F7F7] w-full" />

        {/* Menu Items */}
        {user && isCustomer && (
          <div className="flex-1 overflow-y-auto">
            <div className="px-6">
              {/* My Orders */}
              <button
                onClick={() => handleMenuItemClick("/customer/deliveries")}
                className="w-full flex items-center gap-3 pt-0 pb-3.5 rounded-2xl hover:bg-slate-50 active:bg-slate-100 transition-colors border border-transparent"
              >
                <Clock className="h-5 w-5 text-slate-900 flex-shrink-0" />
                <span className="flex flex-col items-start text-left">
                  <span className="text-base font-medium text-slate-900">
                    My Orders
                  </span>
                  <span className="mt-0.5 text-sm text-slate-400">
                    See your past cash deliveries.
                  </span>
                </span>
              </button>
            </div>

            {/* Divider */}
            <div className="h-[6px] bg-[#F7F7F7] w-full" />

            <div className="px-6">
              {/* Manage Addresses */}
              <button
                onClick={() => handleMenuItemClick("/customer/addresses")}
                className="w-full flex items-center gap-3 py-3.5 rounded-2xl hover:bg-slate-50 active:bg-slate-100 transition-colors border border-transparent"
              >
                <MapPinPen className="h-5 w-5 text-slate-900 flex-shrink-0" />
                <span className="flex flex-col items-start text-left">
                  <span className="text-base font-medium text-slate-900">
                    Manage Addresses
                  </span>
                  <span className="mt-0.5 text-sm text-slate-400">
                    Add, edit, or delete addresses.
                  </span>
                </span>
              </button>
            </div>

            {/* Divider */}
            <div className="h-[6px] bg-[#F7F7F7] w-full" />

            <div className="px-6">
              {/* My Bank Accounts */}
              <button
                onClick={() => handleMenuItemClick("/customer/banks")}
                className="w-full flex items-center gap-3 py-3.5 rounded-2xl hover:bg-slate-50 active:bg-slate-100 transition-colors border border-transparent"
              >
                <Landmark className="h-5 w-5 text-slate-900 flex-shrink-0" />
                <span className="flex flex-col items-start text-left">
                  <span className="text-base font-medium text-slate-900">
                    My Bank Accounts
                  </span>
                  <span className="mt-0.5 text-sm text-slate-400">
                    Connect or update your bank account.
                  </span>
                </span>
              </button>
            </div>
          </div>
        )}

        {/* Bottom divider – full width */}
        {user && <div className="h-[6px] bg-[#F7F7F7] w-full" />}

        {/* Log Out Button */}
        {user && (
          <div className="px-6 pt-4 pb-6">
            <button
              onClick={handleLogoutClick}
              className="w-full flex items-center justify-center gap-2 h-14 min-h-[56px] px-6 text-[17px] font-semibold rounded-full border border-red-500 text-red-600 bg-transparent hover:bg-red-50 active:bg-red-100 transition-all"
            >
              <LogOut className="h-5 w-5 text-red-600" />
              <span>Log Out</span>
            </button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  ) : null;

  const backButton = showBack ? (
    <button
      onClick={onBack || (() => navigate(-1))}
      className={cn(
        "w-12 h-12 p-0 inline-flex items-center justify-center rounded-full border border-[#F0F0F0] bg-white hover:bg-slate-50 active:bg-slate-100 transition-colors touch-manipulation"
      )}
      aria-label={useXButton ? "Close" : "Go back"}
    >
      {useXButton ? (
        <X className="h-5 w-5 text-slate-900" />
      ) : (
        <ArrowLeft className="h-5 w-5 text-slate-900" />
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

