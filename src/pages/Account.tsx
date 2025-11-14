import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Mail, Shield, Calendar, Save, ArrowLeft, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useProfile } from "@/contexts/ProfileContext";
import { saveProfile } from "@/lib/profileMutations";
import { AvatarUploader } from "@/components/common/AvatarUploader";
import { CustomerScreen } from "@/pages/customer/components/CustomerScreen";
import { CustomerTopShell } from "@/pages/customer/components/CustomerTopShell";
import { RequestFlowBottomBar } from "@/components/customer/RequestFlowBottomBar";

export default function Account() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { profile, refreshProfile } = useProfile();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    phone: ""
  });

  useEffect(() => {
    if (profile) {
      setFormData({
        first_name: profile.first_name || "",
        last_name: profile.last_name || "",
        phone: profile.phone || ""
      });
    }
  }, [profile]);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!formData.first_name.trim() || !formData.last_name.trim()) {
      toast.error("First name and last name are required");
      return;
    }

    if (!user?.id) {
      toast.error("You must be logged in to update your profile");
      return;
    }

    setLoading(true);
    try {
      await saveProfile(user.id, {
        first_name: formData.first_name.trim(),
        last_name: formData.last_name.trim(),
        phone: formData.phone.trim() || null,
      });

      toast.success("Profile updated successfully!");
      await refreshProfile();
    } catch (error: any) {
      console.error("Error updating profile:", error);
      toast.error(error?.message || "An error occurred while updating your profile");
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    if (profile?.role.includes('admin')) {
      navigate('/admin/dashboard');
    } else if (profile?.role.includes('runner')) {
      navigate('/runner/orders');
    } else {
      navigate('/customer/deliveries');
    }
  };

  if (!profile) {
    // Check if we're in customer context (based on route or default)
    const isCustomerContext = window.location.pathname.startsWith('/customer') || 
                               (!window.location.pathname.startsWith('/admin') && 
                                !window.location.pathname.startsWith('/runner'));
    
    if (isCustomerContext) {
      return (
        <CustomerScreen
          header={
            <CustomerTopShell
              title="My Account"
              subtitle="Loading profile..."
              showBack={true}
              onBack={handleBack}
            />
          }
          map={
            <div className="flex items-center justify-center h-full">
              <div className="text-muted-foreground">Loading profile...</div>
            </div>
          }
        />
      );
    }
    
    return (
      <div className="container max-w-4xl mx-auto py-8 px-4">
        <div className="flex items-center justify-center h-64">
          <div className="text-muted-foreground">Loading profile...</div>
        </div>
      </div>
    );
  }

  // Check if customer context
  const isCustomerContext = profile.role.includes('customer') && !profile.role.includes('admin');

  // Customer mobile layout
  if (isCustomerContext) {
    return (
      <CustomerScreen
        header={
          <CustomerTopShell
            title="My Account"
            subtitle="Manage your profile information"
            showBack={true}
            onBack={handleBack}
          />
        }
        map={
          <div className="flex flex-col h-full bg-[#F4F5F7] overflow-y-auto">
            <div className="px-6 pt-2 pb-28 max-w-[420px] mx-auto w-full space-y-6">
              {/* Account Information Card */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Account Information</CardTitle>
                  <CardDescription className="text-sm">
                    View your account details and role information
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Mail className="h-4 w-4" />
                        <span>Email Address</span>
                      </div>
                      <div className="text-sm font-medium">{user?.email}</div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Shield className="h-4 w-4" />
                        <span>Account Role</span>
                      </div>
                      <div className="flex gap-2 flex-wrap">
                        {profile.role.map((role) => (
                          <Badge key={role} variant="secondary">
                            {role}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        <span>Member Since</span>
                      </div>
                      <div className="text-sm font-medium">
                        {new Date(profile.created_at).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </div>
                    </div>

                    {profile.role.includes('customer') && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <DollarSign className="h-4 w-4" />
                          <span>Daily Limit</span>
                        </div>
                        <div className="text-sm font-medium">
                          ${profile.daily_limit.toFixed(2)}
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Profile Picture Card */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Profile Picture</CardTitle>
                  <CardDescription className="text-sm">
                    Upload or change your profile picture
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <AvatarUploader
                    currentAvatarUrl={profile.avatar_url}
                    userName={`${profile.first_name} ${profile.last_name}`}
                    onUploadComplete={() => refreshProfile()}
                    onRemoveComplete={() => refreshProfile()}
                  />
                </CardContent>
              </Card>

              {/* Profile Details Card */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Profile Details</CardTitle>
                  <CardDescription className="text-sm">
                    Update your personal information
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="first_name">
                        First Name <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="first_name"
                        placeholder="John"
                        value={formData.first_name}
                        onChange={(e) => handleInputChange('first_name', e.target.value)}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="last_name">
                        Last Name <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="last_name"
                        placeholder="Doe"
                        value={formData.last_name}
                        onChange={(e) => handleInputChange('last_name', e.target.value)}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="email">
                        Email <span className="text-muted-foreground text-xs">(cannot be changed)</span>
                      </Label>
                      <Input
                        id="email"
                        type="email"
                        value={user?.email || profile?.email || ""}
                        disabled
                        className="bg-muted cursor-not-allowed"
                        readOnly
                      />
                      <p className="text-xs text-muted-foreground">
                        Email is managed through your authentication provider and cannot be changed here.
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone Number</Label>
                      <Input
                        id="phone"
                        type="tel"
                        placeholder="+1 (555) 123-4567"
                        value={formData.phone}
                        onChange={(e) => handleInputChange('phone', e.target.value)}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Customer Information Card */}
              {profile.role.includes('customer') && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Customer Information</CardTitle>
                    <CardDescription className="text-sm">
                      Your customer account details
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <div className="text-sm text-muted-foreground">Daily Limit</div>
                        <div className="text-xl font-bold">${profile.daily_limit.toFixed(2)}</div>
                      </div>

                      <div className="space-y-2">
                        <div className="text-sm text-muted-foreground">Used Today</div>
                        <div className="text-xl font-bold">${profile.daily_usage.toFixed(2)}</div>
                      </div>

                      <div className="space-y-2 col-span-2">
                        <div className="text-sm text-muted-foreground">Available Today</div>
                        <div className="text-2xl font-bold text-success">
                          ${(profile.daily_limit - profile.daily_usage).toFixed(2)}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        }
        footer={
          <RequestFlowBottomBar
            mode="amount"
            onPrimary={handleSave}
            onSecondary={handleBack}
            isLoading={loading}
            primaryDisabled={loading || !formData.first_name.trim() || !formData.last_name.trim()}
            primaryLabel="Save Changes"
            useFixedPosition={true}
          />
        }
      />
    );
  }

  // Desktop/admin/runner layout
  return (
    <div className="container max-w-4xl mx-auto py-8 px-4">
      <Button
        variant="ghost"
        onClick={handleBack}
        className="mb-6"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back
      </Button>

      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">My Account</h1>
          <p className="text-muted-foreground">
            Manage your profile information and account settings
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Account Information</CardTitle>
            <CardDescription>
              View your account details and role information
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Mail className="h-4 w-4" />
                  <span>Email Address</span>
                </div>
                <div className="text-sm font-medium">{user?.email}</div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Shield className="h-4 w-4" />
                  <span>Account Role</span>
                </div>
                <div className="flex gap-2 flex-wrap">
                  {profile.role.map((role) => (
                    <Badge key={role} variant="secondary">
                      {role}
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span>Member Since</span>
                </div>
                <div className="text-sm font-medium">
                  {new Date(profile.created_at).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </div>
              </div>

              {profile.role.includes('customer') && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <DollarSign className="h-4 w-4" />
                    <span>Daily Limit</span>
                  </div>
                  <div className="text-sm font-medium">
                    ${profile.daily_limit.toFixed(2)}
                  </div>
                </div>
              )}

              {profile.role.includes('runner') && profile.monthly_earnings !== undefined && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <DollarSign className="h-4 w-4" />
                    <span>Monthly Earnings</span>
                  </div>
                  <div className="text-sm font-medium text-success">
                    ${profile.monthly_earnings.toFixed(2)}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Profile Picture</CardTitle>
            <CardDescription>
              Upload or change your profile picture
            </CardDescription>
          </CardHeader>
          <CardContent>
            <AvatarUploader
              currentAvatarUrl={profile.avatar_url}
              userName={`${profile.first_name} ${profile.last_name}`}
              onUploadComplete={() => refreshProfile()}
              onRemoveComplete={() => refreshProfile()}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Profile Details</CardTitle>
            <CardDescription>
              Update your personal information
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="first_name">
                  First Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="first_name"
                  placeholder="John"
                  value={formData.first_name}
                  onChange={(e) => handleInputChange('first_name', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="last_name">
                  Last Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="last_name"
                  placeholder="Doe"
                  value={formData.last_name}
                  onChange={(e) => handleInputChange('last_name', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">
                  Email <span className="text-muted-foreground text-xs">(cannot be changed)</span>
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={user?.email || profile?.email || ""}
                  disabled
                  className="bg-muted cursor-not-allowed"
                  readOnly
                />
                <p className="text-xs text-muted-foreground">
                  Email is managed through your authentication provider and cannot be changed here.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="+1 (555) 123-4567"
                  value={formData.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                />
              </div>
            </div>

            <Separator />

            <div className="flex justify-end">
              <Button
                onClick={handleSave}
                disabled={loading}
                size="lg"
              >
                <Save className="mr-2 h-4 w-4" />
                {loading ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {profile.role.includes('customer') && (
          <Card>
            <CardHeader>
              <CardTitle>Customer Information</CardTitle>
              <CardDescription>
                Your customer account details
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <div className="text-sm text-muted-foreground">Daily Limit</div>
                  <div className="text-2xl font-bold">${profile.daily_limit.toFixed(2)}</div>
                </div>

                <div className="space-y-2">
                  <div className="text-sm text-muted-foreground">Used Today</div>
                  <div className="text-2xl font-bold">${profile.daily_usage.toFixed(2)}</div>
                </div>

                <div className="space-y-2">
                  <div className="text-sm text-muted-foreground">Available Today</div>
                  <div className="text-2xl font-bold text-success">
                    ${(profile.daily_limit - profile.daily_usage).toFixed(2)}
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="text-sm text-muted-foreground">Last Reset</div>
                  <div className="text-sm font-medium">
                    {new Date(profile.daily_limit_last_reset).toLocaleDateString('en-US')}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {profile.role.includes('runner') && (
          <Card>
            <CardHeader>
              <CardTitle>Runner Information</CardTitle>
              <CardDescription>
                Your runner account details and earnings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <div className="text-sm text-muted-foreground">Monthly Earnings</div>
                  <div className="text-3xl font-bold text-success">
                    ${profile.monthly_earnings?.toFixed(2) || '0.00'}
                  </div>
                </div>

                {profile.approved_by && (
                  <div className="space-y-2">
                    <div className="text-sm text-muted-foreground">Account Status</div>
                    <Badge variant="default" className="text-sm">
                      Approved
                    </Badge>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
