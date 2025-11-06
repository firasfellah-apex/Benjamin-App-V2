import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { DollarSign, Menu, X, User, LogOut, Shield, Truck, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "miaoda-auth-react";
import { useProfile } from "@/contexts/ProfileContext";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
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

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isAccountOpen, setIsAccountOpen] = useState(false);
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { profile } = useProfile();

  const handleLogoutClick = () => {
    setShowLogoutDialog(true);
  };

  const confirmLogout = () => {
    logout();
    setShowLogoutDialog(false);
    setIsAccountOpen(false);
    navigate("/login");
  };

  const handleMenuItemClick = (path: string) => {
    navigate(path);
    setIsAccountOpen(false);
  };

  return (
    <header className="bg-background border-b sticky top-0 z-50">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link to="/" className="flex items-center gap-2">
              <div className="bg-primary text-primary-foreground rounded-lg p-2">
                <DollarSign className="h-6 w-6" />
              </div>
              <span className="text-xl font-bold">Benjamin</span>
            </Link>
          </div>

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
                  </>
                )}

                <Popover open={isAccountOpen} onOpenChange={setIsAccountOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="ghost" size="sm">
                      <User className="h-4 w-4 mr-2" />
                      {profile.first_name || 'Account'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent align="end" className="w-56">
                    <div className="space-y-1">
                      <div className="px-2 py-1.5">
                        <p className="text-sm font-semibold">My Account</p>
                        <p className="text-xs text-muted-foreground">{user.email}</p>
                      </div>
                      <Separator />
                      <div className="space-y-1 py-1">
                        {profile.role.includes('admin') && (
                          <button
                            onClick={() => handleMenuItemClick("/admin/dashboard")}
                            className="w-full flex items-center px-2 py-1.5 text-sm rounded-sm hover:bg-accent hover:text-accent-foreground transition-colors"
                          >
                            <Shield className="mr-2 h-4 w-4" />
                            Admin Dashboard
                          </button>
                        )}
                        {profile.role.includes('runner') && (
                          <button
                            onClick={() => handleMenuItemClick("/runner/orders")}
                            className="w-full flex items-center px-2 py-1.5 text-sm rounded-sm hover:bg-accent hover:text-accent-foreground transition-colors"
                          >
                            <Truck className="mr-2 h-4 w-4" />
                            My Deliveries
                          </button>
                        )}
                        {profile.role.includes('customer') && (
                          <button
                            onClick={() => handleMenuItemClick("/customer/orders")}
                            className="w-full flex items-center px-2 py-1.5 text-sm rounded-sm hover:bg-accent hover:text-accent-foreground transition-colors"
                          >
                            <Package className="mr-2 h-4 w-4" />
                            My Orders
                          </button>
                        )}
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>

                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={handleLogoutClick}
                  className="ml-2"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Log Out
                </Button>
              </>
            )}

            {!user && (
              <Button onClick={() => navigate("/login")}>
                Login
              </Button>
            )}
          </div>

          <div className="md:hidden flex items-center">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </Button>
          </div>
        </div>

        {isMenuOpen && (
          <div className="md:hidden py-4 space-y-2">
            {user && profile ? (
              <>
                {profile.role.includes('customer') && (
                  <>
                    <Link
                      to="/customer/request"
                      className="block px-3 py-2 text-base font-medium rounded-md hover:bg-muted"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      Request Cash
                    </Link>
                    <Link
                      to="/customer/orders"
                      className="block px-3 py-2 text-base font-medium rounded-md hover:bg-muted"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      My Orders
                    </Link>
                  </>
                )}

                {profile.role.includes('runner') && (
                  <>
                    <Link
                      to="/runner/available"
                      className="block px-3 py-2 text-base font-medium rounded-md hover:bg-muted"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      Available Orders
                    </Link>
                    <Link
                      to="/runner/orders"
                      className="block px-3 py-2 text-base font-medium rounded-md hover:bg-muted"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      My Deliveries
                    </Link>
                  </>
                )}

                {profile.role.includes('admin') && (
                  <>
                    <Link
                      to="/admin/dashboard"
                      className="block px-3 py-2 text-base font-medium rounded-md hover:bg-muted"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      Dashboard
                    </Link>
                    <Link
                      to="/admin/users"
                      className="block px-3 py-2 text-base font-medium rounded-md hover:bg-muted"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      Users
                    </Link>
                    <Link
                      to="/admin/invitations"
                      className="block px-3 py-2 text-base font-medium rounded-md hover:bg-muted"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      Invitations
                    </Link>
                    <Link
                      to="/admin/orders"
                      className="block px-3 py-2 text-base font-medium rounded-md hover:bg-muted"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      Orders
                    </Link>
                  </>
                )}

                <Button
                  variant="outline"
                  onClick={() => {
                    handleLogoutClick();
                    setIsMenuOpen(false);
                  }}
                  className="w-full mt-2"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Log Out
                </Button>
              </>
            ) : (
              <Button
                onClick={() => {
                  navigate("/login");
                  setIsMenuOpen(false);
                }}
                className="w-full"
              >
                Login
              </Button>
            )}
          </div>
        )}
      </nav>

      {/* Logout Confirmation Dialog */}
      <AlertDialog open={showLogoutDialog} onOpenChange={setShowLogoutDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Logout</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to log out? You will need to sign in again to access your account.
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
