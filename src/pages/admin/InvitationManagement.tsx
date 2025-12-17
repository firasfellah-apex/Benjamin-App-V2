import { useEffect, useState } from "react";
import { Mail, UserPlus, X, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { getAllInvitations, createInvitation, revokeInvitation } from "@/db/api";
import type { InvitationWithDetails, InvitationStatus, Invitation } from "@/types/types";

const statusColors: Record<InvitationStatus, string> = {
  "Pending": "bg-muted text-muted-foreground",
  "Accepted": "bg-success text-success-foreground",
  "Expired": "bg-destructive text-destructive-foreground",
  "Revoked": "bg-destructive text-destructive-foreground"
};

export default function InvitationManagement() {
  const [invitations, setInvitations] = useState<InvitationWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [invitationLinkDialog, setInvitationLinkDialog] = useState(false);
  const [createdInvitation, setCreatedInvitation] = useState<Invitation | null>(null);
  const [copied, setCopied] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    roleToAssign: "runner" as 'runner' | 'admin',
    firstName: "",
    lastName: "",
    notes: ""
  });
  const [submitting, setSubmitting] = useState(false);

  const loadInvitations = async () => {
    const data = await getAllInvitations();
    setInvitations(data);
    setLoading(false);
  };

  useEffect(() => {
    loadInvitations();
  }, []);

  const getInvitationUrl = (token: string) => {
    return `${window.location.origin}/login?invitation=${token}`;
  };

  const copyToClipboard = async (text: string) => {
    // Fallback method using textarea (works in all environments)
    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.style.position = "fixed";
    textArea.style.left = "-999999px";
    textArea.style.top = "-999999px";
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    
    try {
      const successful = document.execCommand('copy');
      document.body.removeChild(textArea);
      
      if (successful) {
        setCopied(true);
        toast.success("Invitation link copied to clipboard!");
        setTimeout(() => setCopied(false), 2000);
      } else {
        toast.info("Copy not supported", {
          description: "Please select and copy the link manually from the input field above"
        });
      }
    } catch (error) {
      document.body.removeChild(textArea);
      toast.info("Copy not supported", {
        description: "Please select and copy the link manually from the input field above"
      });
    }
  };

  const handleSubmit = async () => {
    if (!formData.email) {
      toast.error("Email is required");
      return;
    }

    setSubmitting(true);
    try {
      const invitation = await createInvitation(
        formData.email,
        formData.roleToAssign,
        formData.firstName || undefined,
        formData.lastName || undefined,
        formData.notes || undefined
      );
      
      if (invitation) {
        setCreatedInvitation(invitation);
        setInvitationLinkDialog(true);
        toast.success("Invitation created successfully");
      }
      
      setDialogOpen(false);
      setFormData({
        email: "",
        roleToAssign: "runner",
        firstName: "",
        lastName: "",
        notes: ""
      });
      loadInvitations();
    } catch (error) {
      toast.error("Failed to create invitation");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRevoke = async (invitationId: string) => {
    try {
      const success = await revokeInvitation(invitationId);
      if (success) {
        toast.success("Invitation revoked");
        loadInvitations();
      }
    } catch (error) {
      toast.error("Failed to revoke invitation");
    }
  };

  const pendingInvitations = invitations.filter(i => i.status === "Pending");
  const acceptedInvitations = invitations.filter(i => i.status === "Accepted");

  return (
    <div className="w-full max-w-[95vw] mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Invitation Management</h1>
          <p className="text-muted-foreground">
            Invite new admins and runners to the platform
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <UserPlus className="mr-2 h-4 w-4" />
              Send Invitation
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Send Invitation</DialogTitle>
              <DialogDescription>
                Invite a new admin or runner to join the platform
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email Address *</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="invitee@example.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="role">Role *</Label>
                <Select
                  value={formData.roleToAssign}
                  onValueChange={(value: 'runner' | 'admin') => 
                    setFormData({ ...formData, roleToAssign: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="runner">Runner</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name</Label>
                  <Input
                    id="firstName"
                    placeholder="John"
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input
                    id="lastName"
                    placeholder="Doe"
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  placeholder="Additional notes about this invitation..."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSubmit} disabled={submitting}>
                <Mail className="mr-2 h-4 w-4" />
                {submitting ? "Creating..." : "Create Invitation"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Invitation Link Dialog */}
        <Dialog open={invitationLinkDialog} onOpenChange={setInvitationLinkDialog}>
          <DialogContent className="sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>Invitation Created Successfully!</DialogTitle>
              <DialogDescription>
                Share this invitation link with {formData.email || 'the invitee'}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Invitation Link</Label>
                <div className="flex gap-2">
                  <Input
                    readOnly
                    value={createdInvitation ? getInvitationUrl(createdInvitation.token) : ''}
                    className="font-mono text-sm"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => createdInvitation && copyToClipboard(getInvitationUrl(createdInvitation.token))}
                  >
                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  This link will expire in 7 days
                </p>
              </div>

              <div className="p-4 bg-muted rounded-lg space-y-2">
                <p className="text-sm font-medium">Next Steps:</p>
                <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                  <li>Copy the invitation link above</li>
                  <li>Send it to {formData.email || 'the invitee'} via email or messaging app</li>
                  <li>They will click the link and complete registration</li>
                  <li>Their account will be assigned the {formData.roleToAssign} role automatically</li>
                </ol>
              </div>

              {createdInvitation && (
                <div className="space-y-2">
                  <Label>Invitation Details</Label>
                  <div className="text-sm space-y-1">
                    <p><span className="font-medium">Email:</span> {createdInvitation.email}</p>
                    <p><span className="font-medium">Role:</span> {createdInvitation.role_to_assign}</p>
                    <p><span className="font-medium">Expires:</span> {new Date(createdInvitation.expires_at).toLocaleDateString('en-US')}</p>
                  </div>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button onClick={() => setInvitationLinkDialog(false)}>
                Done
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-6 md:grid-cols-3 mb-8">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Total Invitations</CardDescription>
            <CardTitle className="text-3xl">{invitations.length}</CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Pending</CardDescription>
            <CardTitle className="text-3xl">{pendingInvitations.length}</CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Accepted</CardDescription>
            <CardTitle className="text-3xl">{acceptedInvitations.length}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Invitations</CardTitle>
          <CardDescription>
            View and manage all sent invitations
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">
              Loading invitations...
            </div>
          ) : invitations.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-4">No invitations sent yet</p>
              <Button onClick={() => setDialogOpen(true)}>
                <UserPlus className="mr-2 h-4 w-4" />
                Send First Invitation
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto -mx-6 px-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[200px]">Email</TableHead>
                    <TableHead className="min-w-[150px]">Name</TableHead>
                    <TableHead className="min-w-[100px]">Role</TableHead>
                    <TableHead className="min-w-[100px]">Status</TableHead>
                    <TableHead className="min-w-[150px]">Sent By</TableHead>
                    <TableHead className="min-w-[140px]">Expires</TableHead>
                    <TableHead className="text-right min-w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invitations.map((invitation) => (
                    <TableRow key={invitation.id}>
                      <TableCell className="font-medium">
                        {invitation.email}
                      </TableCell>
                      <TableCell>
                        {invitation.invitee_first_name || invitation.invitee_last_name ? (
                          <span>
                            {invitation.invitee_first_name} {invitation.invitee_last_name}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {invitation.role_to_assign}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={statusColors[invitation.status]}>
                          {invitation.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {invitation.inviter?.first_name} {invitation.inviter?.last_name}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(invitation.expires_at).toLocaleDateString('en-US')}
                      </TableCell>
                      <TableCell className="text-right">
                        {invitation.status === "Pending" && (
                          <div className="flex gap-2 justify-end">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => copyToClipboard(getInvitationUrl(invitation.token))}
                            >
                              <Copy className="mr-2 h-4 w-4" />
                              Copy Link
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRevoke(invitation.id)}
                            >
                              <X className="mr-2 h-4 w-4" />
                              Revoke
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
