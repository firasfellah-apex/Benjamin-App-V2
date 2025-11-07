import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { DollarSign, Menu, User, LogOut, Shield, Truck, Package, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "miaoda-auth-react";
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

  const handleLogoutClick = () => {
    setShowLogoutDialog(true);
    setIsMenuOpen(false);
  };

  const confirmLogout = () => {
    logout();
    setShowLogoutDialog(false);
    navigate("/login");
  };

  const handleMenuItemClick = (path: string) => {
    navigate(path);
    setIsMenuOpen(false);
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

          {/* Desktop Navigation Links */}
          <div className="hidden md:flex items-center gap-6">
            {user && profile && (
              <>
                {profile.role.includes('customer') && (
                  <>
                    <Link
                      to="/customer/request"
                      className={`text-sm font-medium transition-colors hover:text-primary ${
                        location.pathname === "/customer/request"
                          ? "text-primary"
                          : "text-muted-foreground"
                      }`}
                    >
                      Request Cash
                    </Link>
                    <Link
                      to="/customer/orders"
                      className={`text-sm font-medium transition-colors hover:text-primary ${
                        location.pathname === "/customer/orders"
                          ? "text-primary"
                          : "text-muted-foreground"
                      }`}
                    >
                      My Orders
                    </Link>
                  </>
                )}

                {profile.role.includes('runner') && (
                  <>
                    <Link
                      to="/runner/available"
                      className={`text-sm font-medium transition-colors hover:text-primary ${
                        location.pathname === "/runner/available"
                          ? "text-primary"
                          : "text-muted-foreground"
                      }`}
                    >
                      Available Orders
                    </Link>
                    <Link
                      to="/runner/orders"
                      className={`text-sm font-medium transition-colors hover:text-primary ${
                        location.pathname === "/runner/orders"
                          ? "text-primary"
                          : "text-muted-foreground"
                      }`}
                    >
                      My Deliveries
                    </Link>
                  </>
                )}

                {profile.role.includes('admin') && (
                  <>
                    <Link
                      to="/admin/dashboard"
                      className={`text-sm font-medium transition-colors hover:text-primary ${
                        location.pathname === "/admin/dashboard"
                          ? "text-primary"
                          : "text-muted-foreground"
                      }`}
                    >
                      Dashboard
                    </Link>
                    <Link
                      to="/admin/users"
                      className={`text-sm font-medium transition-colors hover:text-primary ${
                        location.pathname === "/admin/users"
                          ? "text-primary"
                          : "text-muted-foreground"
                      }`}
                    >
                      Users
                    </Link>
                    <Link
                      to="/admin/invitations"
                      className={`text-sm font-medium transition-colors hover:text-primary ${
                        location.pathname === "/admin/invitations"
                          ? "text-primary"
                          : "text-muted-foreground"
                      }`}
                    >
                      Invitations
                    </Link>
                    <Link
                      to="/admin/orders"
                      className={`text-sm font-medium transition-colors hover:text-primary ${
                        location.pathname === "/admin/orders"
                          ? "text-primary"
                          : "text-muted-foreground"
                      }`}
                    >
                      Orders
                    </Link>
                    <Link
                      to="/admin/training"
                      className={`text-sm font-medium transition-colors hover:text-primary ${
                        location.pathname === "/admin/training"
                          ? "text-primary"
                          : "text-muted-foreground"
                      }`}
                    >
                      Training
                    </Link>
                  </>
                )}
              </>
            )}
          </div>

          {/* Universal Hamburger Menu - Visible on ALL screen sizes */}
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
                  <SheetDescription>
                    {user && profile ? (
                      <div className="text-left">
                        <p className="font-semibold text-foreground">{profile.first_name} {profile.last_name}</p>
                        <p className="text-sm">{user.email}</p>
                        <div className="flex gap-2 mt-2 flex-wrap">
                          {profile.role.map((role) => (
                            <Badge key={role} variant="secondary" className="text-xs">
                              {role}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    ) : (
                      "Access your account"
                    )}
                  </SheetDescription>
                </SheetHeader>

                <div className="mt-6 space-y-1">
                  {user && profile ? (
                    <>
                      {/* Profile Link - Always First */}
                      <button
                        onClick={() => handleMenuItemClick("/account")}
                        className="w-full flex items-center gap-3 px-3 py-3 text-sm font-medium rounded-md hover:bg-accent hover:text-accent-foreground transition-colors text-left"
                      >
                        <User className="h-5 w-5" />
                        <span>My Profile</span>
                      </button>

                      <Separator className="my-2" />

                      {/* Role-Specific Navigation */}
                      {profile.role.includes('customer') && (
                        <>
                          <div className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                            Customer
                          </div>
                          <button
                            onClick={() => handleMenuItemClick("/customer/request")}
                            className="w-full flex items-center gap-3 px-3 py-3 text-sm font-medium rounded-md hover:bg-accent hover:text-accent-foreground transition-colors text-left"
                          >
                            <DollarSign className="h-5 w-5" />
                            <span>Request Cash</span>
                          </button>
                          <button
                            onClick={() => handleMenuItemClick("/customer/orders")}
                            className="w-full flex items-center gap-3 px-3 py-3 text-sm font-medium rounded-md hover:bg-accent hover:text-accent-foreground transition-colors text-left"
                          >
                            <Package className="h-5 w-5" />
                            <span>My Orders</span>
                          </button>
                        </>
                      )}

                      {profile.role.includes('runner') && (
                        <>
                          <div className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                            Runner
                          </div>
                          <button
                            onClick={() => handleMenuItemClick("/runner/available")}
                            className="w-full flex items-center gap-3 px-3 py-3 text-sm font-medium rounded-md hover:bg-accent hover:text-accent-foreground transition-colors text-left"
                          >
                            <Package className="h-5 w-5" />
                            <span>Available Orders</span>
                          </button>
                          <button
                            onClick={() => handleMenuItemClick("/runner/orders")}
                            className="w-full flex items-center gap-3 px-3 py-3 text-sm font-medium rounded-md hover:bg-accent hover:text-accent-foreground transition-colors text-left"
                          >
                            <Truck className="h-5 w-5" />
                            <span>My Deliveries</span>
                          </button>
                        </>
                      )}

                      {profile.role.includes('admin') && (
                        <>
                          <div className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                            Admin
                          </div>
                          <button
                            onClick={() => handleMenuItemClick("/admin/dashboard")}
                            className="w-full flex items-center gap-3 px-3 py-3 text-sm font-medium rounded-md hover:bg-accent hover:text-accent-foreground transition-colors text-left"
                          >
                            <Shield className="h-5 w-5" />
                            <span>Dashboard</span>
                          </button>
                          <button
                            onClick={() => handleMenuItemClick("/admin/users")}
                            className="w-full flex items-center gap-3 px-3 py-3 text-sm font-medium rounded-md hover:bg-accent hover:text-accent-foreground transition-colors text-left"
                          >
                            <User className="h-5 w-5" />
                            <span>Users</span>
                          </button>
                          <button
                            onClick={() => handleMenuItemClick("/admin/invitations")}
                            className="w-full flex items-center gap-3 px-3 py-3 text-sm font-medium rounded-md hover:bg-accent hover:text-accent-foreground transition-colors text-left"
                          >
                            <Package className="h-5 w-5" />
                            <span>Invitations</span>
                          </button>
                          <button
                            onClick={() => handleMenuItemClick("/admin/orders")}
                            className="w-full flex items-center gap-3 px-3 py-3 text-sm font-medium rounded-md hover:bg-accent hover:text-accent-foreground transition-colors text-left"
                          >
                            <Package className="h-5 w-5" />
                            <span>Orders</span>
                          </button>
                          <button
                            onClick={() => handleMenuItemClick("/admin/training")}
                            className="w-full flex items-center gap-3 px-3 py-3 text-sm font-medium rounded-md hover:bg-accent hover:text-accent-foreground transition-colors text-left"
                          >
                            <Shield className="h-5 w-5" />
                            <span>Training</span>
                          </button>
                        </>
                      )}

                      <Separator className="my-2" />

                      {/* Logout Button - Always Last */}
                      <button
                        onClick={handleLogoutClick}
                        className="w-full flex items-center gap-3 px-3 py-3 text-sm font-medium rounded-md hover:bg-destructive hover:text-destructive-foreground transition-colors text-left text-destructive"
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
                        className="w-full flex items-center gap-3 px-3 py-3 text-sm font-medium rounded-md hover:bg-accent hover:text-accent-foreground transition-colors text-left"
                      >
                        <Home className="h-5 w-5" />
                        <span>Home</span>
                      </button>
                      <button
                        onClick={() => handleMenuItemClick("/login")}
                        className="w-full flex items-center gap-3 px-3 py-3 text-sm font-medium rounded-md hover:bg-accent hover:text-accent-foreground transition-colors text-left"
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
