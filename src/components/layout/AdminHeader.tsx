import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Menu, User, LogOut, Shield, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useProfile } from "@/contexts/ProfileContext";
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

export function AdminHeader() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { profile } = useProfile();

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
    return location.pathname.startsWith(path);
  };

  const getMenuItemClasses = (path: string, exact: boolean = false, isDestructive: boolean = false) => {
    const baseClasses = "w-full flex items-center gap-3 px-3 py-3 text-sm font-medium rounded-md transition-colors text-left relative";
    const active = isActive(path, exact);
    
    if (isDestructive) {
      return `${baseClasses} ${active ? 'bg-destructive/10 text-destructive border-l-2 border-destructive' : 'text-destructive hover:bg-destructive/10 hover:text-destructive'}`;
    }
    
    if (active) {
      return `${baseClasses} bg-[#2D3036] text-[#F1F3F5] font-semibold border-l-2 border-[#5865F2]`;
    }
    
    return `${baseClasses} hover:bg-[#2D3036] hover:text-[#F1F3F5] text-[#A7A9AC]`;
  };

  const isAdmin = profile?.role.includes('admin');

  return (
    <header className="bg-[#1B1D21] border-b border-[#2F3238] sticky top-0 z-50">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Logo */}
          <div className="flex items-center">
            <Link to="/admin/dashboard" className="flex items-center gap-2">
              <BenjaminLogo variant="admin" height={28} />
            </Link>
          </div>

          {/* Hamburger Menu */}
          <div className="flex items-center">
            <Sheet open={isMenuOpen} onOpenChange={setIsMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-2 text-[#F1F3F5] hover:bg-[#2D3036]">
                  <Menu className="h-5 w-5" />
                  <span className="sr-only">Open menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-80 bg-[#1B1D21] border-[#2F3238]">
                <SheetHeader>
                  <SheetTitle className="text-[#F1F3F5]">Menu</SheetTitle>
                  <SheetDescription className="text-[#A7A9AC]">
                    {user ? (
                      <div className="text-left">
                        {profile ? (
                          <>
                            <p className="font-semibold text-[#F1F3F5]">{profile.first_name} {profile.last_name}</p>
                            <p className="text-sm text-[#A7A9AC]">{user.email}</p>
                            <div className="flex gap-2 mt-2 flex-wrap">
                              {profile.role.map((role) => (
                                <Badge key={role} variant="secondary" className="text-xs bg-[#5865F2]/20 text-[#5865F2]">
                                  {role}
                                </Badge>
                              ))}
                            </div>
                          </>
                        ) : (
                          <>
                            <p className="font-semibold text-[#F1F3F5]">Loading profile...</p>
                            <p className="text-sm text-[#A7A9AC]">{user.email}</p>
                          </>
                        )}
                      </div>
                    ) : (
                      "Access your account"
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

                      <Separator className="my-2 bg-slate-800" />

                      {/* Admin Navigation */}
                      {isAdmin && (
                        <>
                          <div className="px-3 py-2 text-xs font-semibold text-[#6C6E73] uppercase tracking-wider">
                            Admin
                          </div>
                          <button
                            onClick={() => handleMenuItemClick("/admin/dashboard")}
                            className={getMenuItemClasses("/admin/dashboard", false)}
                          >
                            <Shield className="h-5 w-5" />
                            <span>Dashboard</span>
                          </button>
                          <button
                            onClick={() => handleMenuItemClick("/admin/users")}
                            className={getMenuItemClasses("/admin/users", false)}
                          >
                            <User className="h-5 w-5" />
                            <span>Users</span>
                          </button>
                          <button
                            onClick={() => handleMenuItemClick("/admin/invitations")}
                            className={getMenuItemClasses("/admin/invitations", false)}
                          >
                            <Package className="h-5 w-5" />
                            <span>Invitations</span>
                          </button>
                          <button
                            onClick={() => handleMenuItemClick("/admin/orders")}
                            className={getMenuItemClasses("/admin/orders", false)}
                          >
                            <Package className="h-5 w-5" />
                            <span>Orders</span>
                          </button>
                          <button
                            onClick={() => handleMenuItemClick("/admin/training")}
                            className={getMenuItemClasses("/admin/training", false)}
                          >
                            <Shield className="h-5 w-5" />
                            <span>Training</span>
                          </button>
                        </>
                      )}

                      <Separator className="my-2 bg-slate-800" />

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
        <AlertDialogContent className="bg-[#23262B] border-[#2F3238]">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-[#F1F3F5]">Confirm Logout</AlertDialogTitle>
            <AlertDialogDescription className="text-[#A7A9AC]">
              Are you sure you want to log out? You'll need to log in again to access your account.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-[#23262B] text-[#A7A9AC] border-[#2F3238] hover:bg-[#2D3036]">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmLogout} className="bg-[#5865F2] hover:bg-[#4752C4] text-white">
              Log Out
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </header>
  );
}

