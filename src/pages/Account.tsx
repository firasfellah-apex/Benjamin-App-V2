/**
 * Account Page - Profile Only
 * 
 * Simple profile management: avatar, name, email, phone
 */

import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Camera, Edit2, X, Trash2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useProfile } from "@/hooks/useProfile";
import { saveProfile } from "@/lib/profileMutations";
import { Avatar } from "@/components/common/Avatar";
import { CustomerScreen } from "@/pages/customer/components/CustomerScreen";
import CustomerCard from "@/pages/customer/components/CustomerCard";
import { useQueryClient } from "@tanstack/react-query";
import { useAvatar } from "@/hooks/use-avatar";
import { AvatarCropModal } from "@/components/common/AvatarCropModal";

export default function Account() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { profile, isReady } = useProfile(user?.id);
  const queryClient = useQueryClient();
  const { uploading: avatarUploading, uploadAvatar, removeAvatar } = useAvatar();
  
  const [isAvatarEditing, setIsAvatarEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    phone: "",
  });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showCropModal, setShowCropModal] = useState(false);
  const [selectedImageSrc, setSelectedImageSrc] = useState<string | null>(null);

  useEffect(() => {
    if (profile) {
      setFormData({
        first_name: profile.first_name || "",
        last_name: profile.last_name || "",
        phone: profile.phone || "",
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

    setIsSaving(true);
    try {
      await saveProfile(user.id, {
        first_name: formData.first_name.trim(),
        last_name: formData.last_name.trim(),
        phone: formData.phone.trim() || null,
      });
      toast.success("Profile updated successfully!");
      await queryClient.invalidateQueries({ queryKey: ["profile"] });
    } catch (error: any) {
      console.error("Error updating profile:", error);
      toast.error(error?.message || "An error occurred while updating your profile");
    } finally {
      setIsSaving(false);
    }
  };

  const handleBack = () => {
    if (profile?.role.includes('admin')) {
      navigate('/admin/dashboard');
    } else if (profile?.role.includes('runner')) {
      navigate('/runner/orders');
    } else {
      navigate('/customer/home');
    }
  };

  const handleAvatarDelete = async () => {
    try {
      await removeAvatar();

      const updatedAt = new Date().toISOString();

      // Optimistically clear avatar in react-query
      queryClient.setQueryData(["profile", user?.id], (old: any) =>
        old
          ? {
              ...old,
              avatar_url: null,
              updated_at: updatedAt,
            }
          : old
      );

      // Clear any localStorage cache
      try {
        localStorage.removeItem("benjamin:profile:v1");
      } catch {
        // ignore
      }

      await queryClient.invalidateQueries({ queryKey: ["profile"] });
      await queryClient.invalidateQueries({
        queryKey: ["profile", user?.id],
      });

      toast.success("Avatar removed successfully");
      setIsAvatarEditing(false);
    } catch (error) {
      console.error("Error removing avatar:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to remove avatar"
      );
    }
  };

  const handleAvatarReplace = () => {
    fileInputRef.current?.click();
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('File must be a JPEG, PNG, or WebP image');
      return;
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size must be less than 5MB');
      return;
    }

    // Create object URL and show crop modal
    const imageUrl = URL.createObjectURL(file);
    setSelectedImageSrc(imageUrl);
    setShowCropModal(true);
  };

  const handleCropComplete = async (croppedImageBlob: Blob) => {
    try {
      const croppedFile = new File([croppedImageBlob], "avatar.jpg", {
        type: "image/jpeg",
      });

      // Upload and get the new public URL
      const publicUrl = await uploadAvatar(croppedFile);

      // New timestamp for cache-busting
      const updatedAt = new Date().toISOString();

      // Optimistically update profile in react-query
      queryClient.setQueryData(["profile", user?.id], (old: any) =>
        old
          ? {
              ...old,
              avatar_url: publicUrl,
              updated_at: updatedAt,
            }
          : old
      );

      // Clear any localStorage profile cache
      try {
        localStorage.removeItem("benjamin:profile:v1");
      } catch {
        // ignore
      }

      // Also invalidate to keep everything in sync with Supabase
      await queryClient.invalidateQueries({ queryKey: ["profile"] });
      await queryClient.invalidateQueries({
        queryKey: ["profile", user?.id],
      });

      toast.success("Profile picture updated successfully");

      // Clean up object URL & state - only after upload completes
      if (selectedImageSrc) {
        URL.revokeObjectURL(selectedImageSrc);
      }
      setShowCropModal(false);
      setSelectedImageSrc(null);
      setIsAvatarEditing(false);

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (error) {
      console.error("Error uploading avatar:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to upload avatar"
      );
      // Re-throw so the modal can handle the error state
      throw error;
    }
  };

  const handleCropCancel = () => {
    if (selectedImageSrc) {
      URL.revokeObjectURL(selectedImageSrc);
    }
    setShowCropModal(false);
    setSelectedImageSrc(null);
    
    // Clear file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Loading state
  if (!isReady || !profile) {
    return (
      <CustomerScreen
        title="My Account"
        subtitle="Loading profile..."
        showBack
        onBack={handleBack}
      >
        <div className="flex items-center justify-center h-64">
          <div className="text-muted-foreground">Loading...</div>
        </div>
      </CustomerScreen>
    );
  }

  // Check if customer context
  const isCustomerContext = profile.role.includes('customer') && !profile.role.includes('admin');

  // Customer mobile layout (profile-only)
  if (isCustomerContext) {
    const fixedContent = <div className="h-[6px] bg-[#F7F7F7] -mx-6" />;

    const fullName =
      [profile.first_name, profile.last_name].filter(Boolean).join(" ") || "";

    const hasAvatar = !!profile.avatar_url;

    const initialData = {
      first_name: profile.first_name || "",
      last_name: profile.last_name || "",
      phone: profile.phone || "",
    };

    const hasChanges =
      initialData.first_name !== formData.first_name ||
      initialData.last_name !== formData.last_name ||
      initialData.phone !== formData.phone;

    const handleReset = () => {
      setFormData(initialData);
    };

    return (
      <>
        {/* Hidden File Input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/jpg,image/png,image/webp"
          className="hidden"
          onChange={handleFileInputChange}
          disabled={avatarUploading}
        />

        <CustomerScreen
          title="My Account"
          subtitle="Manage your profile and settings"
          showBack
          onBack={handleBack}
          fixedContent={fixedContent}
          topContent={
            <div className="pt-6 space-y-6">
              {/* IDENTITY: avatar + name + email */}
              <div className="flex flex-col items-start gap-3">
              <div className="relative">
                <Avatar
                  src={profile.avatar_url}
                  alt={fullName || "User"}
                  fallback={fullName || "User"}
                  size="2xl"
                  cacheKey={profile.updated_at}
                />
                  
                  {/* Morphing avatar controls: pen → X, row opens to the RIGHT (outside the avatar) */}
                  <div className="absolute bottom-0 right-0">
                    <div className="relative flex items-center">
                      {/* Anchor button – pen/X always in the exact same spot */}
                      <button
                        type="button"
                        aria-label={
                          isAvatarEditing
                            ? "Close avatar options"
                            : hasAvatar
                              ? "Edit profile photo"
                              : "Upload profile photo"
                        }
                        onClick={() => {
                          // If no avatar exists, go straight to upload
                          if (!hasAvatar) {
                            handleAvatarReplace();
                            return;
                          }
                          // If avatar exists, toggle the right-hand menu
                          setIsAvatarEditing((prev) => !prev);
                        }}
                        className="h-10 w-10 rounded-full bg-black text-white flex items-center justify-center shadow-sm border border-white"
                        disabled={avatarUploading}
                      >
                        {isAvatarEditing ? (
                          <X className="h-5 w-5" />
                        ) : hasAvatar ? (
                          <Edit2 className="h-5 w-5" />
                        ) : (
                          <Camera className="h-5 w-5" />
                        )}
                      </button>

                      {/* Sliding row: Delete / Replace – always to the RIGHT of the anchor */}
                      <div
                        className={`
                          absolute bottom-0 left-full ml-2
                          flex items-center gap-2
                          transition-all duration-500 ease-out
                          ${isAvatarEditing ? "opacity-100 translate-x-0" : "opacity-0 translate-x-2 pointer-events-none"}
                        `}
                      >
                        <button
                          type="button"
                          onClick={handleAvatarDelete}
                          aria-label="Remove avatar"
                          className="h-10 w-10 rounded-full border border-red-500 text-red-500 bg-white flex items-center justify-center shadow-sm disabled:opacity-50"
                          disabled={avatarUploading}
                        >
                          <Trash2 className="h-5 w-5" />
                        </button>

                        <button
                          type="button"
                          onClick={handleAvatarReplace}
                          aria-label="Replace avatar"
                          className="h-10 w-10 rounded-full border border-slate-900 text-slate-900 bg-white flex items-center justify-center shadow-sm disabled:opacity-50"
                          disabled={avatarUploading}
                        >
                          <RefreshCw className="h-5 w-5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

            {/* PROFILE FORM: always-on inputs */}
            <CustomerCard className="space-y-5 px-0">
              <div className="space-y-4">
                {/* First name and Last name in same row */}
                <div className="space-y-1.5">
                  <div className="flex gap-3">
                    {/* First name */}
                    <div className="flex-1 space-y-1.5">
                      <Label htmlFor="first_name" className="text-sm font-semibold text-gray-900">
                        First Name <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="first_name"
                        placeholder="First name"
                        value={formData.first_name}
                        onChange={(e) => handleInputChange("first_name", e.target.value)}
                        className="h-11 text-base rounded-xl border-slate-200 focus:border-[#22C55E] focus-visible:border-[#22C55E] focus:bg-green-50 focus-visible:ring-0"
                      />
                    </div>

                    {/* Last name */}
                    <div className="flex-1 space-y-1.5">
                      <Label htmlFor="last_name" className="text-sm font-semibold text-gray-900">
                        Last Name <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="last_name"
                        placeholder="Last name"
                        value={formData.last_name}
                        onChange={(e) => handleInputChange("last_name", e.target.value)}
                        className="h-11 text-base rounded-xl border-slate-200 focus:border-[#22C55E] focus-visible:border-[#22C55E] focus:bg-green-50 focus-visible:ring-0"
                      />
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Use the same name as on your bank account to avoid delays.
                  </p>
                </div>

                {/* Email – read-only but styled like an input */}
                <div className="space-y-1.5 pt-1 border-t border-slate-100">
                  <Label className="text-sm font-semibold text-gray-900">Email</Label>
                  <div className="h-11 px-3.5 flex items-center rounded-xl border-slate-200 bg-slate-50 text-base border">
                    <span className="truncate text-slate-400">{user?.email}</span>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    This is your sign-in email. Contact support if you need to change it.
                  </p>
                </div>

                {/* Phone number */}
                <div className="space-y-1.5">
                  <Label htmlFor="phone" className="text-sm font-semibold text-gray-900">
                    Phone Number
                  </Label>
                      <Input
                        id="phone"
                        type="tel"
                        placeholder="+1 (555) 123-4567"
                        value={formData.phone}
                        onChange={(e) => handleInputChange("phone", e.target.value)}
                        className="h-11 text-base rounded-xl border-slate-200 placeholder:text-slate-400 placeholder:font-light focus:border-[#22C55E] focus-visible:border-[#22C55E] focus:bg-green-50 focus-visible:ring-0 focus:placeholder:opacity-0"
                      />
                  <p className="text-[11px] text-slate-500">
                    Used only for delivery updates and important account alerts.
                  </p>
                </div>

              </div>

              {/* Actions - Only show when changes are made */}
              {hasChanges && (
                <div className="pt-4 border-t border-slate-100 flex gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1 h-14 min-h-[56px] px-6 text-[17px] font-semibold rounded-full border-black bg-white text-black hover:bg-slate-50"
                    onClick={handleReset}
                    disabled={isSaving}
                  >
                    Reset
                  </Button>
                  <Button
                    type="button"
                    className="flex-1 h-14 min-h-[56px] px-6 text-[17px] font-semibold rounded-full bg-black text-white hover:bg-black/90"
                    onClick={handleSave}
                    disabled={isSaving}
                  >
                    {isSaving ? "Saving..." : "Save changes"}
                  </Button>
                </div>
              )}
            </CustomerCard>
          </div>
        }
      />

        {/* Crop Modal */}
        {showCropModal && selectedImageSrc && (
          <AvatarCropModal
            imageSrc={selectedImageSrc}
            onCropComplete={handleCropComplete}
            onCancel={handleCropCancel}
          />
        )}
      </>
    );
  }

  // Desktop/admin/runner layout (simplified for now - can be enhanced later)
  return (
    <div className="container max-w-4xl mx-auto py-8 px-4">
      <Button
        variant="ghost"
        onClick={handleBack}
        className="mb-6"
      >
        <X className="mr-2 h-4 w-4" />
        Back
      </Button>

      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">My Account</h1>
          <p className="text-muted-foreground">
            Manage your profile information and account settings
          </p>
        </div>

        {/* Simplified desktop view - can be enhanced to match mobile architecture */}
        <div className="text-muted-foreground">
          Desktop view - to be enhanced to match mobile architecture
        </div>
      </div>
    </div>
  );
}
