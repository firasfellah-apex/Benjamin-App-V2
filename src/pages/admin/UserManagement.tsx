import { useEffect, useState } from "react";
import { UserPlus, Shield, Truck, User as UserIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { getAllProfiles, assignRole, revokeRole, updateProfile } from "@/db/api";
import type { Profile, UserRole } from "@/types/types";

export default function UserManagement() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const loadProfiles = async () => {
    const data = await getAllProfiles();
    setProfiles(data);
    setLoading(false);
  };

  useEffect(() => {
    loadProfiles();
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
      await updateProfile(userId, { kyc_status: 'Approved' });
      toast.success("KYC approved");
      loadProfiles();
    } catch (error) {
      toast.error("Failed to approve KYC");
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
          <div className="text-muted-foreground">Loading users...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="container max-w-7xl mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">User Management</h1>
        <p className="text-muted-foreground">
          Manage user accounts, roles, and permissions
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-3 mb-8">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Total Users</CardDescription>
            <CardTitle className="text-3xl">{profiles.length}</CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Active Users</CardDescription>
            <CardTitle className="text-3xl">
              {profiles.filter(p => p.is_active).length}
            </CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Pending KYC</CardDescription>
            <CardTitle className="text-3xl">
              {profiles.filter(p => p.kyc_status === 'Pending').length}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Users</CardTitle>
          <CardDescription>
            View and manage all registered users
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Roles</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>KYC</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {profiles.map((profile) => (
                  <TableRow key={profile.id}>
                    <TableCell>
                      <div className="font-medium">
                        {profile.first_name} {profile.last_name}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {profile.phone}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">
                      {profile.email}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1 flex-wrap">
                        {getRoleBadges(profile.role)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={profile.is_active ? "default" : "secondary"}>
                        {profile.is_active ? "Active" : "Inactive"}
                      </Badge>
                      {profile.is_suspended && (
                        <Badge variant="destructive" className="ml-1">
                          Suspended
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant={
                          profile.kyc_status === 'Approved' ? "default" :
                          profile.kyc_status === 'Failed' ? "destructive" :
                          "secondary"
                        }
                      >
                        {profile.kyc_status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(profile.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <Dialog open={dialogOpen && selectedProfile?.id === profile.id} onOpenChange={(open) => {
                        setDialogOpen(open);
                        if (open) setSelectedProfile(profile);
                      }}>
                        <DialogTrigger asChild>
                          <Button variant="ghost" size="sm">
                            Manage
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Manage User</DialogTitle>
                            <DialogDescription>
                              Update roles and permissions for {profile.first_name} {profile.last_name}
                            </DialogDescription>
                          </DialogHeader>

                          <div className="space-y-6 py-4">
                            <div className="space-y-2">
                              <h4 className="font-medium">Current Roles</h4>
                              <div className="flex gap-2 flex-wrap">
                                {getRoleBadges(profile.role)}
                              </div>
                            </div>

                            <div className="space-y-2">
                              <h4 className="font-medium">Add Role</h4>
                              <div className="flex gap-2">
                                {!profile.role.includes('admin') && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleAddRole(profile.id, 'admin')}
                                  >
                                    <Shield className="mr-2 h-4 w-4" />
                                    Admin
                                  </Button>
                                )}
                                {!profile.role.includes('runner') && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleAddRole(profile.id, 'runner')}
                                  >
                                    <Truck className="mr-2 h-4 w-4" />
                                    Runner
                                  </Button>
                                )}
                                {!profile.role.includes('customer') && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleAddRole(profile.id, 'customer')}
                                  >
                                    <UserIcon className="mr-2 h-4 w-4" />
                                    Customer
                                  </Button>
                                )}
                              </div>
                            </div>

                            <div className="space-y-2">
                              <h4 className="font-medium">Remove Role</h4>
                              <div className="flex gap-2">
                                {profile.role.map(role => (
                                  <Button
                                    key={role}
                                    size="sm"
                                    variant="destructive"
                                    onClick={() => handleRemoveRole(profile.id, role)}
                                  >
                                    Remove {role}
                                  </Button>
                                ))}
                              </div>
                            </div>

                            <div className="space-y-2">
                              <h4 className="font-medium">Account Status</h4>
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  variant={profile.is_active ? "default" : "outline"}
                                  onClick={() => handleToggleStatus(profile.id, 'is_active', !profile.is_active)}
                                >
                                  {profile.is_active ? "Deactivate" : "Activate"}
                                </Button>
                                <Button
                                  size="sm"
                                  variant={profile.is_suspended ? "default" : "outline"}
                                  onClick={() => handleToggleStatus(profile.id, 'is_suspended', !profile.is_suspended)}
                                >
                                  {profile.is_suspended ? "Unsuspend" : "Suspend"}
                                </Button>
                              </div>
                            </div>

                            {profile.kyc_status === 'Pending' && (
                              <div className="space-y-2">
                                <h4 className="font-medium">KYC Verification</h4>
                                <Button
                                  size="sm"
                                  onClick={() => handleApproveKYC(profile.id)}
                                >
                                  Approve KYC
                                </Button>
                              </div>
                            )}
                          </div>

                          <DialogFooter>
                            <Button variant="outline" onClick={() => setDialogOpen(false)}>
                              Close
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
