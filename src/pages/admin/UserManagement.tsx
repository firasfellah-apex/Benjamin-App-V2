import { useEffect, useState } from "react";
import { UserPlus, Shield, Truck, User as UserIcon, Radio, DollarSign, Package, Activity } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { getAllProfiles, assignRole, revokeRole, updateProfile, syncAuthUsersToProfiles, getRunnerStatsForAdmin, getCustomerStatsForAdmin } from "@/db/api";
import { supabase } from "@/db/supabase";
import type { Profile, UserRole } from "@/types/types";
import { cn } from "@/lib/utils";

interface RunnerStats {
  activeDeliveries: number;
  completedThisMonth: number;
  monthlyEarnings: number;
  totalCompleted: number;
  totalEarnings: number;
  acceptedCount: number;
  skippedCount: number;
  timedOutCount: number;
}

interface CustomerStats {
  activeOrders: number;
  totalOrders: number;
  completedOrders: number;
  totalSpent: number;
}

export default function UserManagement() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [runnerStats, setRunnerStats] = useState<Record<string, RunnerStats>>({});
  const [customerStats, setCustomerStats] = useState<Record<string, CustomerStats>>({});
  const [loadingStats, setLoadingStats] = useState<Record<string, boolean>>({});

  const runners = profiles.filter(p => p.role.includes('runner'));
  const customers = profiles.filter(p => p.role.includes('customer') && !p.role.includes('admin'));

  const loadProfiles = async () => {
    try {
      setLoading(true);
      const data = await getAllProfiles();
      setProfiles(data || []);
    } catch (error) {
      console.error('Error loading profiles:', error);
      toast.error('Failed to load users. Check console for details.');
      setProfiles([]);
    } finally {
      setLoading(false);
    }
  };

  const loadRunnerStats = async (runnerId: string) => {
    if (runnerStats[runnerId] || loadingStats[runnerId]) return;
    
    setLoadingStats(prev => ({ ...prev, [runnerId]: true }));
    try {
      const stats = await getRunnerStatsForAdmin(runnerId);
      setRunnerStats(prev => ({ ...prev, [runnerId]: stats }));
    } catch (error) {
      console.error(`Error loading stats for runner ${runnerId}:`, error);
    } finally {
      setLoadingStats(prev => ({ ...prev, [runnerId]: false }));
    }
  };

  const loadCustomerStats = async (customerId: string) => {
    if (customerStats[customerId] || loadingStats[customerId]) return;
    
    setLoadingStats(prev => ({ ...prev, [customerId]: true }));
    try {
      const stats = await getCustomerStatsForAdmin(customerId);
      setCustomerStats(prev => ({ ...prev, [customerId]: stats }));
    } catch (error) {
      console.error(`Error loading stats for customer ${customerId}:`, error);
    } finally {
      setLoadingStats(prev => ({ ...prev, [customerId]: false }));
    }
  };

  useEffect(() => {
    loadProfiles();
  }, []);

  // Load stats for all runners and customers
  useEffect(() => {
    runners.forEach(runner => {
      loadRunnerStats(runner.id);
    });
    customers.forEach(customer => {
      loadCustomerStats(customer.id);
    });
  }, [runners.length, customers.length]);

  // Real-time subscription for runner online/offline status
  useEffect(() => {
    const channelName = 'admin-profiles-updates';
    
    console.log('[UserManagement] Setting up real-time subscription for profiles...');
    
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
        },
        (payload: any) => {
          try {
            const updatedProfile = payload.new as Profile;
            const oldProfile = payload.old as Profile;
            
            // Only update if is_online status changed (or other relevant fields)
            if (updatedProfile && updatedProfile.id) {
              console.log('[UserManagement] Profile update received:', {
                profileId: updatedProfile.id,
                oldIsOnline: oldProfile?.is_online,
                newIsOnline: updatedProfile.is_online,
                email: updatedProfile.email,
              });
              
              // Update the profile in state
              setProfiles((prev) => {
                const updated = prev.map((p) => {
                  if (p.id === updatedProfile.id) {
                    // Merge the update, preserving existing data
                    return {
                      ...p,
                      ...updatedProfile,
                    };
                  }
                  return p;
                });
                
                // If profile doesn't exist in state yet, add it
                if (!prev.some(p => p.id === updatedProfile.id)) {
                  return [...prev, updatedProfile];
                }
                
                return updated;
              });
            }
          } catch (error) {
            console.error('[UserManagement] Error handling profile update:', error);
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('[UserManagement] ✅ Subscribed to profile updates');
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.error('[UserManagement] ❌ Subscription error:', status);
        } else if (status === 'CLOSED') {
          console.log('[UserManagement] Profile subscription closed');
        }
      });

    return () => {
      console.log('[UserManagement] Unsubscribing from profile updates');
      supabase.removeChannel(channel);
    };
  }, []);

  const handleAddRole = async (userId: string, role: UserRole) => {
    try {
      const success = await assignRole(userId, role);
      if (success) {
        toast.success(`${role} role assigned successfully`);
        loadProfiles();
      }
    } catch (error) {
      toast.error("Failed to assign role");
    }
  };

  const handleRemoveRole = async (userId: string, role: UserRole) => {
    try {
      const success = await revokeRole(userId, role);
      if (success) {
        toast.success(`${role} role revoked successfully`);
        loadProfiles();
      }
    } catch (error) {
      toast.error("Failed to revoke role");
    }
  };

  const handleToggleStatus = async (userId: string, field: 'is_active' | 'is_suspended', value: boolean) => {
    try {
      await updateProfile(userId, { [field]: value });
      toast.success("User status updated");
      loadProfiles();
    } catch (error) {
      toast.error("Failed to update user status");
    }
  };

  const handleApproveKYC = async (userId: string) => {
    try {
      await updateProfile(userId, { kyc_status: 'verified' });
      toast.success("KYC approved");
      loadProfiles();
    } catch (error) {
      toast.error("Failed to approve KYC");
    }
  };

  const handleSyncUsers = async () => {
    setSyncing(true);
    try {
      const result = await syncAuthUsersToProfiles();
      if (result.success) {
        toast.success(result.message);
        loadProfiles();
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      console.error('Error syncing users:', error);
      toast.error('Failed to sync users. Check console for details.');
    } finally {
      setSyncing(false);
    }
  };

  const getRoleBadges = (roles: UserRole[]) => {
    return roles.map(role => {
      const config = {
        admin: { icon: Shield, color: "bg-destructive text-destructive-foreground" },
        runner: { icon: Truck, color: "bg-accent text-accent-foreground" },
        customer: { icon: UserIcon, color: "bg-muted text-muted-foreground" }
      }[role];

      const Icon = config.icon;
      return (
        <Badge key={role} className={config.color}>
          <Icon className="mr-1 h-3 w-3" />
          {role}
        </Badge>
      );
    });
  };

  if (loading) {
    return (
      <div className="container max-w-7xl mx-auto py-8 px-4">
        <div className="flex items-center justify-center h-64">
          <div className="text-[#A7A9AC]">Loading users...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="container max-w-7xl mx-auto py-8 px-4">
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h1 className="text-3xl font-bold mb-2 text-[#F1F3F5]">User Management</h1>
            <p className="text-[#A7A9AC]">
              Manage runners, customers, and their activity
            </p>
          </div>
          <Button
            onClick={handleSyncUsers}
            disabled={syncing}
            variant="outline"
            className="gap-2 border-[#5865F2] text-[#F1F3F5] hover:bg-[#2D3036]"
          >
            <UserPlus className="h-4 w-4" />
            {syncing ? 'Syncing...' : 'Sync Users'}
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-6 md:grid-cols-4 mb-8">
        <Card className="bg-[#23262B] border border-[#2F3238] rounded-2xl p-5 text-[#F1F3F5] hover:bg-[#2D3036] transition-all duration-150 ease-out">
          <CardHeader className="pb-3 p-0">
            <CardDescription className="text-[#A7A9AC] mb-1">Total Users</CardDescription>
            <CardTitle className="text-3xl font-semibold text-[#5865F2]">{profiles.length}</CardTitle>
          </CardHeader>
        </Card>

        <Card className="bg-[#23262B] border border-[#2F3238] rounded-2xl p-5 text-[#F1F3F5] hover:bg-[#2D3036] transition-all duration-150 ease-out">
          <CardHeader className="pb-3 p-0">
            <CardDescription className="text-[#A7A9AC] mb-1">Runners</CardDescription>
            <CardTitle className="text-3xl font-semibold text-[#3CD5A0]">{runners.length}</CardTitle>
            <p className="text-xs text-[#6C6E73] mt-1">
              {runners.filter(r => r.is_online).length} online
            </p>
          </CardHeader>
        </Card>

        <Card className="bg-[#23262B] border border-[#2F3238] rounded-2xl p-5 text-[#F1F3F5] hover:bg-[#2D3036] transition-all duration-150 ease-out">
          <CardHeader className="pb-3 p-0">
            <CardDescription className="text-[#A7A9AC] mb-1">Customers</CardDescription>
            <CardTitle className="text-3xl font-semibold text-[#5865F2]">{customers.length}</CardTitle>
          </CardHeader>
        </Card>

        <Card className="bg-[#23262B] border border-[#2F3238] rounded-2xl p-5 text-[#F1F3F5] hover:bg-[#2D3036] transition-all duration-150 ease-out">
          <CardHeader className="pb-3 p-0">
            <CardDescription className="text-[#A7A9AC] mb-1">Pending KYC</CardDescription>
            <CardTitle className="text-3xl font-semibold text-[#FBBF24]">
              {profiles.filter(p => p.kyc_status?.toLowerCase() === 'pending').length}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Tabs for Runners and Customers */}
      <Tabs defaultValue="runners" className="space-y-6">
        <TabsList className="bg-[#23262B] border border-[#2F3238]">
          <TabsTrigger value="runners" className="text-[#A7A9AC] data-[state=active]:text-[#F1F3F5] data-[state=active]:bg-[#2D3036]">
            <Truck className="mr-2 h-4 w-4" />
            Runners ({runners.length})
          </TabsTrigger>
          <TabsTrigger value="customers" className="text-[#A7A9AC] data-[state=active]:text-[#F1F3F5] data-[state=active]:bg-[#2D3036]">
            <UserIcon className="mr-2 h-4 w-4" />
            Customers ({customers.length})
          </TabsTrigger>
        </TabsList>

        {/* Runners Tab */}
        <TabsContent value="runners">
          <Card className="bg-[#23262B] border border-[#2F3238] rounded-2xl p-5 text-[#F1F3F5]">
            <CardHeader className="p-0 pb-4">
              <CardTitle className="text-[#F1F3F5] font-semibold">All Runners</CardTitle>
              <CardDescription className="text-[#A7A9AC]">
                View and manage all runners with their online status and performance metrics
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-[#2F3238] hover:bg-[#2D3036]">
                      <TableHead className="text-[#A7A9AC]">Runner</TableHead>
                      <TableHead className="text-[#A7A9AC]">Status</TableHead>
                      <TableHead className="text-[#A7A9AC]">Active Deliveries</TableHead>
                      <TableHead className="text-[#A7A9AC]">This Month</TableHead>
                      <TableHead className="text-[#A7A9AC]">Total Earnings</TableHead>
                      <TableHead className="text-[#A7A9AC]">Accepted</TableHead>
                      <TableHead className="text-[#A7A9AC]">Skipped</TableHead>
                      <TableHead className="text-[#A7A9AC]">Timed-Out</TableHead>
                      <TableHead className="text-[#A7A9AC]">Account</TableHead>
                      <TableHead className="text-right text-[#A7A9AC]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {runners.length === 0 ? (
                      <TableRow className="border-[#2F3238]">
                        <TableCell colSpan={10} className="text-center py-8">
                          <div className="flex flex-col items-center gap-2">
                            <Truck className="h-12 w-12 text-[#6C6E73]" />
                            <p className="text-sm font-medium text-[#A7A9AC]">No runners found</p>
                            <p className="text-xs text-[#6C6E73]">
                              Runners will appear here once they sign up and are assigned the runner role.
                            </p>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      runners.map((runner) => {
                        const stats = runnerStats[runner.id];
                        const isLoading = loadingStats[runner.id];
                        return (
                          <TableRow key={runner.id} className="border-[#2F3238] hover:bg-[#2D3036]">
                            <TableCell className="text-[#F1F3F5]">
                              <div className="font-medium">
                                {runner.first_name} {runner.last_name}
                              </div>
                              <div className="text-sm text-[#A7A9AC]">
                                {runner.email}
                              </div>
                              {runner.phone && (
                                <div className="text-xs text-[#6C6E73]">
                                  {runner.phone}
                                </div>
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <div className={cn(
                                  "flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium",
                                  runner.is_online
                                    ? "bg-[#3CD5A0]/10 text-[#3CD5A0] border border-[#3CD5A0]/30"
                                    : "bg-[#6C6E73]/10 text-[#6C6E73] border border-[#6C6E73]/30"
                                )}>
                                  <Radio className={cn(
                                    "h-3 w-3",
                                    runner.is_online ? "text-[#3CD5A0]" : "text-[#6C6E73]"
                                  )} />
                                  {runner.is_online ? 'Online' : 'Offline'}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="text-[#F1F3F5]">
                              {isLoading ? (
                                <span className="text-[#6C6E73]">Loading...</span>
                              ) : (
                                <div className="flex items-center gap-1">
                                  <Activity className="h-4 w-4 text-[#5865F2]" />
                                  <span className="font-semibold">{stats?.activeDeliveries || 0}</span>
                                </div>
                              )}
                            </TableCell>
                            <TableCell className="text-[#F1F3F5]">
                              {isLoading ? (
                                <span className="text-[#6C6E73]">Loading...</span>
                              ) : (
                                <div className="space-y-0.5">
                                  <div className="flex items-center gap-1">
                                    <Package className="h-3.5 w-3.5 text-[#3CD5A0]" />
                                    <span className="text-sm font-medium">{stats?.completedThisMonth || 0}</span>
                                  </div>
                                  <div className="text-xs text-[#6C6E73]">
                                    ${(stats?.monthlyEarnings || 0).toFixed(2)}
                                  </div>
                                </div>
                              )}
                            </TableCell>
                            <TableCell className="text-[#F1F3F5]">
                              {isLoading ? (
                                <span className="text-[#6C6E73]">Loading...</span>
                              ) : (
                                <div className="space-y-0.5">
                                  <div className="flex items-center gap-1">
                                    <DollarSign className="h-3.5 w-3.5 text-[#3CD5A0]" />
                                    <span className="text-sm font-semibold">${(stats?.totalEarnings || 0).toFixed(2)}</span>
                                  </div>
                                  <div className="text-xs text-[#6C6E73]">
                                    {stats?.totalCompleted || 0} completed
                                  </div>
                                </div>
                              )}
                            </TableCell>
                            <TableCell className="text-[#F1F3F5]">
                              {isLoading ? (
                                <span className="text-[#6C6E73]">Loading...</span>
                              ) : (
                                <div className="flex items-center gap-1">
                                  <Package className="h-4 w-4 text-[#3CD5A0]" />
                                  <span className="font-semibold">{stats?.acceptedCount || 0}</span>
                                </div>
                              )}
                            </TableCell>
                            <TableCell className="text-[#F1F3F5]">
                              {isLoading ? (
                                <span className="text-[#6C6E73]">Loading...</span>
                              ) : (
                                <div className="flex items-center gap-1">
                                  <Package className="h-4 w-4 text-[#EF4444]" />
                                  <span className="font-semibold">{stats?.skippedCount || 0}</span>
                                </div>
                              )}
                            </TableCell>
                            <TableCell className="text-[#F1F3F5]">
                              {isLoading ? (
                                <span className="text-[#6C6E73]">Loading...</span>
                              ) : (
                                <div className="flex items-center gap-1">
                                  <Package className="h-4 w-4 text-[#F59E0B]" />
                                  <span className="font-semibold">{stats?.timedOutCount || 0}</span>
                                </div>
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-col gap-1">
                                <Badge variant={runner.is_active ? "default" : "secondary"} className="w-fit text-xs">
                                  {runner.is_active ? "Active" : "Inactive"}
                                </Badge>
                                {runner.is_suspended && (
                                  <Badge variant="destructive" className="w-fit text-xs">
                                    Suspended
                                  </Badge>
                                )}
                                {(() => {
                                  const kycStatus = runner.kyc_status?.toLowerCase();
                                  if (kycStatus === 'verified') {
                                    return (
                                      <Badge variant="default" className="w-fit text-xs bg-[#3CD5A0]/10 text-[#3CD5A0] border-[#3CD5A0]/20">
                                        KYC Verified
                                      </Badge>
                                    );
                                  } else if (kycStatus === 'pending') {
                                    return (
                                      <Badge variant="secondary" className="w-fit text-xs bg-[#FBBF24]/10 text-[#FBBF24]">
                                        KYC Pending
                                      </Badge>
                                    );
                                  } else if (kycStatus === 'failed') {
                                    return (
                                      <Badge variant="destructive" className="w-fit text-xs">
                                        KYC Failed
                                      </Badge>
                                    );
                                  } else {
                                    return (
                                      <Badge variant="outline" className="w-fit text-xs text-[#6C6E73]">
                                        KYC Unverified
                                      </Badge>
                                    );
                                  }
                                })()}
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              <Dialog open={dialogOpen && selectedProfile?.id === runner.id} onOpenChange={(open) => {
                                setDialogOpen(open);
                                if (open) setSelectedProfile(runner);
                              }}>
                                <DialogTrigger asChild>
                                  <Button variant="ghost" size="sm" className="text-[#A7A9AC] hover:text-[#F1F3F5] hover:bg-[#2D3036]">
                                    Manage
                                  </Button>
                                </DialogTrigger>
                                <DialogContent className="bg-[#23262B] border-[#2F3238] text-[#F1F3F5] max-w-2xl">
                                  <DialogHeader>
                                    <DialogTitle className="text-[#F1F3F5]">Manage Runner</DialogTitle>
                                    <DialogDescription className="text-[#A7A9AC]">
                                      {runner.first_name} {runner.last_name}
                                    </DialogDescription>
                                  </DialogHeader>
                                  <div className="space-y-6 py-4 max-h-[60vh] overflow-y-auto">
                                    {/* Runner Stats */}
                                    {stats && (
                                      <div className="grid grid-cols-2 gap-4 p-4 bg-[#1B1D21] rounded-xl border border-[#2F3238]">
                                        <div>
                                          <p className="text-xs text-[#A7A9AC] mb-1">Active Deliveries</p>
                                          <p className="text-xl font-semibold text-[#F1F3F5]">{stats.activeDeliveries}</p>
                                        </div>
                                        <div>
                                          <p className="text-xs text-[#A7A9AC] mb-1">Completed This Month</p>
                                          <p className="text-xl font-semibold text-[#3CD5A0]">{stats.completedThisMonth}</p>
                                        </div>
                                        <div>
                                          <p className="text-xs text-[#A7A9AC] mb-1">Monthly Earnings</p>
                                          <p className="text-xl font-semibold text-[#3CD5A0]">${stats.monthlyEarnings.toFixed(2)}</p>
                                        </div>
                                        <div>
                                          <p className="text-xs text-[#A7A9AC] mb-1">Total Earnings</p>
                                          <p className="text-xl font-semibold text-[#3CD5A0]">${stats.totalEarnings.toFixed(2)}</p>
                                        </div>
                                      </div>
                                    )}
                                    {/* Role Management */}
                                    <div className="space-y-2">
                                      <h4 className="font-medium text-[#F1F3F5]">Current Roles</h4>
                                      <div className="flex gap-2 flex-wrap">
                                        {getRoleBadges(runner.role)}
                                      </div>
                                    </div>
                                    <div className="space-y-2">
                                      <h4 className="font-medium text-[#F1F3F5]">Add Role</h4>
                                      <div className="flex gap-2">
                                        {!runner.role.includes('admin') && (
                                          <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => handleAddRole(runner.id, 'admin')}
                                            className="border-[#5865F2] text-[#F1F3F5] hover:bg-[#2D3036]"
                                          >
                                            <Shield className="mr-2 h-4 w-4" />
                                            Admin
                                          </Button>
                                        )}
                                        {!runner.role.includes('customer') && (
                                          <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => handleAddRole(runner.id, 'customer')}
                                            className="border-[#5865F2] text-[#F1F3F5] hover:bg-[#2D3036]"
                                          >
                                            <UserIcon className="mr-2 h-4 w-4" />
                                            Customer
                                          </Button>
                                        )}
                                      </div>
                                    </div>
                                    <div className="space-y-2">
                                      <h4 className="font-medium text-[#F1F3F5]">Remove Role</h4>
                                      <div className="flex gap-2">
                                        {runner.role.map(role => (
                                          <Button
                                            key={role}
                                            size="sm"
                                            variant="destructive"
                                            onClick={() => handleRemoveRole(runner.id, role)}
                                            className="bg-[#EF4444]/10 text-[#F87171] hover:bg-[#EF4444]/20"
                                          >
                                            Remove {role}
                                          </Button>
                                        ))}
                                      </div>
                                    </div>
                                    {/* Account Status */}
                                    <div className="space-y-2">
                                      <h4 className="font-medium text-[#F1F3F5]">Account Status</h4>
                                      <div className="flex gap-2">
                                        <Button
                                          size="sm"
                                          variant={runner.is_active ? "default" : "outline"}
                                          onClick={() => handleToggleStatus(runner.id, 'is_active', !runner.is_active)}
                                          className={runner.is_active ? "bg-[#5865F2] hover:bg-[#4752C4]" : "border-[#5865F2] text-[#F1F3F5] hover:bg-[#2D3036]"}
                                        >
                                          {runner.is_active ? "Deactivate" : "Activate"}
                                        </Button>
                                        <Button
                                          size="sm"
                                          variant={runner.is_suspended ? "default" : "outline"}
                                          onClick={() => handleToggleStatus(runner.id, 'is_suspended', !runner.is_suspended)}
                                          className={runner.is_suspended ? "bg-[#EF4444]/10 text-[#F87171] hover:bg-[#EF4444]/20" : "border-[#5865F2] text-[#F1F3F5] hover:bg-[#2D3036]"}
                                        >
                                          {runner.is_suspended ? "Unsuspend" : "Suspend"}
                                        </Button>
                                      </div>
                                    </div>
                                    {/* KYC Status for Runner */}
                                    <div className="space-y-2">
                                      <h4 className="font-medium text-[#F1F3F5]">KYC Status</h4>
                                      <div className="flex items-center gap-2">
                                        {(() => {
                                          const kycStatus = runner.kyc_status?.toLowerCase();
                                          if (kycStatus === 'verified') {
                                            return (
                                              <Badge variant="default" className="bg-[#3CD5A0]/10 text-[#3CD5A0] border-[#3CD5A0]/20">
                                                Verified
                                              </Badge>
                                            );
                                          } else if (kycStatus === 'pending') {
                                            return (
                                              <Badge variant="secondary" className="bg-[#FBBF24]/10 text-[#FBBF24]">
                                                Pending
                                              </Badge>
                                            );
                                          } else if (kycStatus === 'failed') {
                                            return (
                                              <Badge variant="destructive">
                                                Failed
                                              </Badge>
                                            );
                                          } else {
                                            return (
                                              <Badge variant="outline" className="text-[#6C6E73]">
                                                Unverified
                                              </Badge>
                                            );
                                          }
                                        })()}
                                        {runner.kyc_verified_at && (
                                          <span className="text-xs text-[#A7A9AC]">
                                            {new Date(runner.kyc_verified_at).toLocaleDateString('en-US', {
                                              year: 'numeric',
                                              month: 'short',
                                              day: 'numeric',
                                              hour: '2-digit',
                                              minute: '2-digit'
                                            })}
                                          </span>
                                        )}
                                      </div>
                                      {runner.plaid_item_id && (
                                        <div className="text-xs text-[#6C6E73] font-mono">
                                          Plaid: {runner.plaid_item_id.substring(0, 12)}...
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                  <DialogFooter>
                                    <Button variant="outline" onClick={() => setDialogOpen(false)} className="border-[#2F3238] text-[#A7A9AC] hover:bg-[#2D3036]">
                                      Close
                                    </Button>
                                  </DialogFooter>
                                </DialogContent>
                              </Dialog>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Customers Tab */}
        <TabsContent value="customers">
          <Card className="bg-[#23262B] border border-[#2F3238] rounded-2xl p-5 text-[#F1F3F5]">
            <CardHeader className="p-0 pb-4">
              <CardTitle className="text-[#F1F3F5] font-semibold">All Customers</CardTitle>
              <CardDescription className="text-[#A7A9AC]">
                View and manage all customers with their order history and activity
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-[#2F3238] hover:bg-[#2D3036]">
                      <TableHead className="text-[#A7A9AC]">Customer</TableHead>
                      <TableHead className="text-[#A7A9AC]">Active Orders</TableHead>
                      <TableHead className="text-[#A7A9AC]">Total Orders</TableHead>
                      <TableHead className="text-[#A7A9AC]">Total Spent</TableHead>
                      <TableHead className="text-[#A7A9AC]">Account</TableHead>
                      <TableHead className="text-[#A7A9AC]">Joined</TableHead>
                      <TableHead className="text-right text-[#A7A9AC]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {customers.length === 0 ? (
                      <TableRow className="border-[#2F3238]">
                        <TableCell colSpan={7} className="text-center py-8">
                          <div className="flex flex-col items-center gap-2">
                            <UserIcon className="h-12 w-12 text-[#6C6E73]" />
                            <p className="text-sm font-medium text-[#A7A9AC]">No customers found</p>
                            <p className="text-xs text-[#6C6E73]">
                              Customers will appear here once they sign up.
                            </p>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      customers.map((customer) => {
                        const stats = customerStats[customer.id];
                        const isLoading = loadingStats[customer.id];
                        return (
                          <TableRow key={customer.id} className="border-[#2F3238] hover:bg-[#2D3036]">
                            <TableCell className="text-[#F1F3F5]">
                              <div className="font-medium">
                                {customer.first_name} {customer.last_name}
                              </div>
                              <div className="text-sm text-[#A7A9AC]">
                                {customer.email}
                              </div>
                              {customer.phone && (
                                <div className="text-xs text-[#6C6E73]">
                                  {customer.phone}
                                </div>
                              )}
                            </TableCell>
                            <TableCell className="text-[#F1F3F5]">
                              {isLoading ? (
                                <span className="text-[#6C6E73]">Loading...</span>
                              ) : (
                                <div className="flex items-center gap-1">
                                  <Activity className="h-4 w-4 text-[#5865F2]" />
                                  <span className="font-semibold">{stats?.activeOrders || 0}</span>
                                </div>
                              )}
                            </TableCell>
                            <TableCell className="text-[#F1F3F5]">
                              {isLoading ? (
                                <span className="text-[#6C6E73]">Loading...</span>
                              ) : (
                                <div className="space-y-0.5">
                                  <span className="text-sm font-medium">{stats?.totalOrders || 0}</span>
                                  <div className="text-xs text-[#6C6E73]">
                                    {stats?.completedOrders || 0} completed
                                  </div>
                                </div>
                              )}
                            </TableCell>
                            <TableCell className="text-[#F1F3F5]">
                              {isLoading ? (
                                <span className="text-[#6C6E73]">Loading...</span>
                              ) : (
                                <div className="flex items-center gap-1">
                                  <DollarSign className="h-3.5 w-3.5 text-[#3CD5A0]" />
                                  <span className="text-sm font-semibold">${(stats?.totalSpent || 0).toFixed(2)}</span>
                                </div>
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-col gap-1">
                                <Badge variant={customer.is_active ? "default" : "secondary"} className="w-fit text-xs">
                                  {customer.is_active ? "Active" : "Inactive"}
                                </Badge>
                                {customer.is_suspended && (
                                  <Badge variant="destructive" className="w-fit text-xs">
                                    Suspended
                                  </Badge>
                                )}
                                {(() => {
                                  const kycStatus = customer.kyc_status?.toLowerCase();
                                  if (kycStatus === 'verified') {
                                    return (
                                      <Badge variant="default" className="w-fit text-xs bg-[#3CD5A0]/10 text-[#3CD5A0] border-[#3CD5A0]/20">
                                        KYC Verified
                                      </Badge>
                                    );
                                  } else if (kycStatus === 'pending') {
                                    return (
                                      <Badge variant="secondary" className="w-fit text-xs bg-[#FBBF24]/10 text-[#FBBF24]">
                                        KYC Pending
                                      </Badge>
                                    );
                                  } else if (kycStatus === 'failed') {
                                    return (
                                      <Badge variant="destructive" className="w-fit text-xs">
                                        KYC Failed
                                      </Badge>
                                    );
                                  } else {
                                    return (
                                      <Badge variant="outline" className="w-fit text-xs text-[#6C6E73]">
                                        KYC Unverified
                                      </Badge>
                                    );
                                  }
                                })()}
                              </div>
                            </TableCell>
                            <TableCell className="text-sm text-[#6C6E73]">
                              {new Date(customer.created_at).toLocaleDateString('en-US')}
                            </TableCell>
                            <TableCell className="text-right">
                              <Dialog open={dialogOpen && selectedProfile?.id === customer.id} onOpenChange={(open) => {
                                setDialogOpen(open);
                                if (open) setSelectedProfile(customer);
                              }}>
                                <DialogTrigger asChild>
                                  <Button variant="ghost" size="sm" className="text-[#A7A9AC] hover:text-[#F1F3F5] hover:bg-[#2D3036]">
                                    Manage
                                  </Button>
                                </DialogTrigger>
                                <DialogContent className="bg-[#23262B] border-[#2F3238] text-[#F1F3F5] max-w-2xl">
                                  <DialogHeader>
                                    <DialogTitle className="text-[#F1F3F5]">Manage Customer</DialogTitle>
                                    <DialogDescription className="text-[#A7A9AC]">
                                      {customer.first_name} {customer.last_name}
                                    </DialogDescription>
                                  </DialogHeader>
                                  <div className="space-y-6 py-4 max-h-[60vh] overflow-y-auto">
                                    {/* Customer Stats */}
                                    {stats && (
                                      <div className="grid grid-cols-2 gap-4 p-4 bg-[#1B1D21] rounded-xl border border-[#2F3238]">
                                        <div>
                                          <p className="text-xs text-[#A7A9AC] mb-1">Active Orders</p>
                                          <p className="text-xl font-semibold text-[#F1F3F5]">{stats.activeOrders}</p>
                                        </div>
                                        <div>
                                          <p className="text-xs text-[#A7A9AC] mb-1">Total Orders</p>
                                          <p className="text-xl font-semibold text-[#F1F3F5]">{stats.totalOrders}</p>
                                        </div>
                                        <div>
                                          <p className="text-xs text-[#A7A9AC] mb-1">Completed Orders</p>
                                          <p className="text-xl font-semibold text-[#3CD5A0]">{stats.completedOrders}</p>
                                        </div>
                                        <div>
                                          <p className="text-xs text-[#A7A9AC] mb-1">Total Spent</p>
                                          <p className="text-xl font-semibold text-[#3CD5A0]">${stats.totalSpent.toFixed(2)}</p>
                                        </div>
                                      </div>
                                    )}
                                    {/* Role Management */}
                                    <div className="space-y-2">
                                      <h4 className="font-medium text-[#F1F3F5]">Current Roles</h4>
                                      <div className="flex gap-2 flex-wrap">
                                        {getRoleBadges(customer.role)}
                                      </div>
                                    </div>
                                    <div className="space-y-2">
                                      <h4 className="font-medium text-[#F1F3F5]">Add Role</h4>
                                      <div className="flex gap-2">
                                        {!customer.role.includes('admin') && (
                                          <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => handleAddRole(customer.id, 'admin')}
                                            className="border-[#5865F2] text-[#F1F3F5] hover:bg-[#2D3036]"
                                          >
                                            <Shield className="mr-2 h-4 w-4" />
                                            Admin
                                          </Button>
                                        )}
                                        {!customer.role.includes('runner') && (
                                          <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => handleAddRole(customer.id, 'runner')}
                                            className="border-[#5865F2] text-[#F1F3F5] hover:bg-[#2D3036]"
                                          >
                                            <Truck className="mr-2 h-4 w-4" />
                                            Runner
                                          </Button>
                                        )}
                                      </div>
                                    </div>
                                    <div className="space-y-2">
                                      <h4 className="font-medium text-[#F1F3F5]">Remove Role</h4>
                                      <div className="flex gap-2">
                                        {customer.role.map(role => (
                                          <Button
                                            key={role}
                                            size="sm"
                                            variant="destructive"
                                            onClick={() => handleRemoveRole(customer.id, role)}
                                            className="bg-[#EF4444]/10 text-[#F87171] hover:bg-[#EF4444]/20"
                                          >
                                            Remove {role}
                                          </Button>
                                        ))}
                                      </div>
                                    </div>
                                    {/* Account Status */}
                                    <div className="space-y-2">
                                      <h4 className="font-medium text-[#F1F3F5]">Account Status</h4>
                                      <div className="flex gap-2">
                                        <Button
                                          size="sm"
                                          variant={customer.is_active ? "default" : "outline"}
                                          onClick={() => handleToggleStatus(customer.id, 'is_active', !customer.is_active)}
                                          className={customer.is_active ? "bg-[#5865F2] hover:bg-[#4752C4]" : "border-[#5865F2] text-[#F1F3F5] hover:bg-[#2D3036]"}
                                        >
                                          {customer.is_active ? "Deactivate" : "Activate"}
                                        </Button>
                                        <Button
                                          size="sm"
                                          variant={customer.is_suspended ? "default" : "outline"}
                                          onClick={() => handleToggleStatus(customer.id, 'is_suspended', !customer.is_suspended)}
                                          className={customer.is_suspended ? "bg-[#EF4444]/10 text-[#F87171] hover:bg-[#EF4444]/20" : "border-[#5865F2] text-[#F1F3F5] hover:bg-[#2D3036]"}
                                        >
                                          {customer.is_suspended ? "Unsuspend" : "Suspend"}
                                        </Button>
                                      </div>
                                    </div>
                                    {/* KYC Status */}
                                    <div className="space-y-2">
                                      <h4 className="font-medium text-[#F1F3F5]">KYC Status</h4>
                                      <div className="flex items-center gap-2">
                                        {(() => {
                                          const kycStatus = customer.kyc_status?.toLowerCase();
                                          if (kycStatus === 'verified') {
                                            return (
                                              <Badge variant="default" className="bg-[#3CD5A0]/10 text-[#3CD5A0] border-[#3CD5A0]/20">
                                                Verified
                                              </Badge>
                                            );
                                          } else if (kycStatus === 'pending') {
                                            return (
                                              <Badge variant="secondary" className="bg-[#FBBF24]/10 text-[#FBBF24]">
                                                Pending
                                              </Badge>
                                            );
                                          } else if (kycStatus === 'failed') {
                                            return (
                                              <Badge variant="destructive">
                                                Failed
                                              </Badge>
                                            );
                                          } else {
                                            return (
                                              <Badge variant="outline" className="text-[#6C6E73]">
                                                Unverified
                                              </Badge>
                                            );
                                          }
                                        })()}
                                        {customer.kyc_verified_at && (
                                          <span className="text-xs text-[#A7A9AC]">
                                            {new Date(customer.kyc_verified_at).toLocaleDateString('en-US', {
                                              year: 'numeric',
                                              month: 'short',
                                              day: 'numeric',
                                              hour: '2-digit',
                                              minute: '2-digit'
                                            })}
                                          </span>
                                        )}
                                      </div>
                                      {customer.plaid_item_id && (
                                        <div className="text-xs text-[#6C6E73] font-mono">
                                          Plaid: {customer.plaid_item_id.substring(0, 12)}...
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                  <DialogFooter>
                                    <Button variant="outline" onClick={() => setDialogOpen(false)} className="border-[#2F3238] text-[#A7A9AC] hover:bg-[#2D3036]">
                                      Close
                                    </Button>
                                  </DialogFooter>
                                </DialogContent>
                              </Dialog>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
