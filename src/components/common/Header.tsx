import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { DollarSign, Menu, X, User, LogOut, Shield, Truck, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "miaoda-auth-react";
import { useProfile } from "@/contexts/ProfileContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { profile } = useProfile();

  const handleLogout = () => {
    logout();
    navigate("/login");
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

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm">
                      <User className="h-4 w-4 mr-2" />
                      {profile.first_name || 'Account'}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>My Account</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {profile.role.includes('admin') && (
                      <DropdownMenuItem onClick={() => navigate("/admin/dashboard")}>
                        <Shield className="mr-2 h-4 w-4" />
                        Admin Dashboard
                      </DropdownMenuItem>
                    )}
                    {profile.role.includes('runner') && (
                      <DropdownMenuItem onClick={() => navigate("/runner/orders")}>
                        <Truck className="mr-2 h-4 w-4" />
                        My Deliveries
                      </DropdownMenuItem>
                    )}
                    {profile.role.includes('customer') && (
                      <DropdownMenuItem onClick={() => navigate("/customer/orders")}>
                        <Package className="mr-2 h-4 w-4" />
                        My Orders
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleLogout}>
                      <LogOut className="mr-2 h-4 w-4" />
                      Logout
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
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

                <button
                  onClick={() => {
                    handleLogout();
                    setIsMenuOpen(false);
                  }}
                  className="block w-full text-left px-3 py-2 text-base font-medium rounded-md hover:bg-muted"
                >
                  Logout
                </button>
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
    </header>
  );
};

export default Header;
