import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { DollarSign, Menu, User, LogOut, Shield, Truck, Package, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useProfile } from "@/contexts/ProfileContext";
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

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { profile } = useProfile();

  // Check if user is admin (reuse same logic as RequireAdminAuth)
  const isAdmin = () => {
    if (!user?.email) return false;
    const email = user.email.toLowerCase();
    return email === 'firasfellah@gmail.com' || email.includes('mock');
  };

  const handleLogoutClick = () => {
    setShowLogoutDialog(true);
    setIsMenuOpen(false);
  };

  const confirmLogout = async () => {
    await logout();
    setShowLogoutDialog(false);
    navigate("/"); // Redirect to landing page after logout
  };

  const handleMenuItemClick = (path: string) => {
    navigate(path);
    setIsMenuOpen(false);
  };

  // Check if a menu item is active based on current location
  const isActive = (path: string, exact: boolean = false) => {
    if (exact) {
      return location.pathname === path;
    }
    
    // Special handling for customer home - match both /customer and /customer/home
    if (path === "/customer/home") {
      return location.pathname === "/customer" || location.pathname === "/customer/home" || location.pathname.startsWith("/customer/home/");
    }
    
    // For non-exact matches, check if pathname starts with the path
    // This handles sub-routes like /customer/deliveries/123
    return location.pathname.startsWith(path);
  };

  // Get menu item classes with active state
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

  return (
    <header className="bg-background border-b sticky top-0 z-50">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Logo */}
          <div className="flex items-center">
            <Link to="/" className="flex items-center gap-2">
              <div className="bg-primary text-primary-foreground rounded-lg p-2">
                <DollarSign className="h-6 w-6" />
              </div>
              <span className="text-xl font-bold">Benjamin</span>
            </Link>
          </div>

          {/* Universal Hamburger Menu - Visible on ALL screen sizes */}
          <div className="flex items-center">
            <Sheet open={isMenuOpen} onOpenChange={setIsMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-2 bg-[#ffffffff] bg-none">
                  <Menu className="h-5 w-5" />
                  <span className="sr-only">Open menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-80">
                <SheetHeader>
                  <SheetTitle>Menu</SheetTitle>
                  <SheetDescription>
                    {user ? (
                      <div className="text-left">
                        {profile ? (
                          <>
                            <p className="font-semibold text-foreground">{profile.first_name} {profile.last_name}</p>
                            <p className="text-sm">{user.email}</p>
                            <div className="flex gap-2 mt-2 flex-wrap">
                              {profile.role.map((role) => (
                                <Badge key={role} variant="secondary" className="text-xs">
                                  {role}
                                </Badge>
                              ))}
                            </div>
                          </>
                        ) : (
                          <>
                            <p className="font-semibold text-foreground">Loading profile...</p>
                            <p className="text-sm">{user.email}</p>
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
                      {/* Profile Link - Always First */}
                      <button
                        onClick={() => handleMenuItemClick("/account")}
                        className={getMenuItemClasses("/account", true)}
                      >
                        <User className="h-5 w-5" />
                        <span>My Profile</span>
                      </button>

                      <Separator className="my-2" />

                      {/* Role-Specific Navigation */}
                      {profile?.role.includes('customer') && (
                        <>
                          <div className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                            Customer
                          </div>
                          <button
                            onClick={() => handleMenuItemClick("/customer/home")}
                            className={getMenuItemClasses("/customer/home", false)}
                          >
                            <Home className={`h-5 w-5 ${isActive("/customer/home", false) ? 'text-accent-foreground' : ''}`} />
                            <span>Home</span>
                          </button>
                        </>
                      )}

                      {profile?.role.includes('runner') && (
                        <>
                          <div className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                            Runner
                          </div>
                          <button
                            onClick={() => handleMenuItemClick("/runner/available")}
                            className={getMenuItemClasses("/runner/available", false)}
                          >
                            <Package className={`h-5 w-5 ${isActive("/runner/available", false) ? 'text-accent-foreground' : ''}`} />
                            <span>Available Orders</span>
                          </button>
                          <button
                            onClick={() => handleMenuItemClick("/runner/orders")}
                            className={getMenuItemClasses("/runner/orders", false)}
                          >
                            <Truck className={`h-5 w-5 ${isActive("/runner/orders", false) ? 'text-accent-foreground' : ''}`} />
                            <span>My Deliveries</span>
                          </button>
                        </>
                      )}

                      {(profile?.role.includes('admin') || isAdmin()) && (
                        <>
                          <div className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                            Admin
                          </div>
                          <button
                            onClick={() => handleMenuItemClick("/admin/dashboard")}
                            className={getMenuItemClasses("/admin/dashboard", false)}
                          >
                            <Shield className={`h-5 w-5 ${isActive("/admin/dashboard", false) ? 'text-accent-foreground' : ''}`} />
                            <span>Dashboard</span>
                          </button>
                          <button
                            onClick={() => handleMenuItemClick("/admin/users")}
                            className={getMenuItemClasses("/admin/users", false)}
                          >
                            <User className={`h-5 w-5 ${isActive("/admin/users", false) ? 'text-accent-foreground' : ''}`} />
                            <span>Users</span>
                          </button>
                          <button
                            onClick={() => handleMenuItemClick("/admin/invitations")}
                            className={getMenuItemClasses("/admin/invitations", false)}
                          >
                            <Package className={`h-5 w-5 ${isActive("/admin/invitations", false) ? 'text-accent-foreground' : ''}`} />
                            <span>Invitations</span>
                          </button>
                          <button
                            onClick={() => handleMenuItemClick("/admin/orders")}
                            className={getMenuItemClasses("/admin/orders", false)}
                          >
                            <Package className={`h-5 w-5 ${isActive("/admin/orders", false) ? 'text-accent-foreground' : ''}`} />
                            <span>Orders</span>
                          </button>
                          <button
                            onClick={() => handleMenuItemClick("/admin/training")}
                            className={getMenuItemClasses("/admin/training", false)}
                          >
                            <Shield className={`h-5 w-5 ${isActive("/admin/training", false) ? 'text-accent-foreground' : ''}`} />
                            <span>Training</span>
                          </button>
                        </>
                      )}

                      <Separator className="my-2" />

                      {/* Logout Button - Always Last */}
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
                      {/* Guest User Options */}
                      <button
                        onClick={() => handleMenuItemClick("/")}
                        className={getMenuItemClasses("/", true)}
                      >
                        <Home className={`h-5 w-5 ${isActive("/", true) ? 'text-accent-foreground' : ''}`} />
                        <span>Home</span>
                      </button>
                      <button
                        onClick={() => handleMenuItemClick("/login")}
                        className={getMenuItemClasses("/login", true)}
                      >
                        <User className={`h-5 w-5 ${isActive("/login", true) ? 'text-accent-foreground' : ''}`} />
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
      {/* Logout Confirmation Dialog */}
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
    </header>
  );
};

export default Header;
