/**
 * Customer Profile Onboarding Page
 * 
 * Full-screen, standalone onboarding for first-time customer sign-ups.
 * - Avatar upload with crop modal
 * - First name, last name, phone (with US mask)
 * - Fixed bottom CTA with safe-area support
 * - Proper validation and error handling
 */

import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useProfile } from '@/hooks/useProfile';
import { saveProfile } from '@/lib/profileMutations';
import { AvatarCropModal } from '@/components/common/AvatarCropModal';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Upload } from '@/lib/icons';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { supabase } from '@/db/supabase';
import { track } from '@/lib/analytics';

// Phone masking utility
function formatPhoneNumber(value: string): string {
  const numbers = value.replace(/\D/g, '');
  if (numbers.length === 0) return '';
  if (numbers.length <= 3) return `(${numbers}`;
  if (numbers.length <= 6) return `(${numbers.slice(0, 3)}) ${numbers.slice(3)}`;
  return `(${numbers.slice(0, 3)}) ${numbers.slice(3, 6)}-${numbers.slice(6, 10)}`;
}

function getInitials(firstName?: string | null, lastName?: string | null): string {
  const first = firstName?.charAt(0)?.toUpperCase() || '';
  const last = lastName?.charAt(0)?.toUpperCase() || '';
  return first + last || '?';
}

export default function OnboardingProfile() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { profile } = useProfile(user?.id);
  
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [avatarBlob, setAvatarBlob] = useState<Blob | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [showCropModal, setShowCropModal] = useState(false);
  const [selectedImageSrc, setSelectedImageSrc] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState<{
    firstName?: string;
    lastName?: string;
    phone?: string;
  }>({});
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Redirect if profile is already complete
  useEffect(() => {
    if (profile && profile.first_name && profile.last_name) {
      navigate('/customer/home', { replace: true });
    }
  }, [profile, navigate]);

  // Pre-fill from existing profile if available
  useEffect(() => {
    if (profile) {
      if (profile.first_name) setFirstName(profile.first_name);
      if (profile.last_name) setLastName(profile.last_name);
      if (profile.phone) setPhone(formatPhoneNumber(profile.phone));
      if (profile.avatar_url) setAvatarPreview(profile.avatar_url);
    }
  }, [profile]);

  const handleFileSelect = (file: File) => {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('File must be a JPEG, PNG, or WebP image');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size must be less than 5MB');
      return;
    }

    const imageUrl = URL.createObjectURL(file);
    setSelectedImageSrc(imageUrl);
    setShowCropModal(true);
  };

  const handleCropComplete = async (croppedBlob: Blob) => {
    setAvatarBlob(croppedBlob);
    const previewUrl = URL.createObjectURL(croppedBlob);
    setAvatarPreview(previewUrl);
    setShowCropModal(false);
    
    // Clean up
    if (selectedImageSrc) {
      URL.revokeObjectURL(selectedImageSrc);
    }
    setSelectedImageSrc(null);
    
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleCropCancel = () => {
    if (selectedImageSrc) {
      URL.revokeObjectURL(selectedImageSrc);
    }
    setShowCropModal(false);
    setSelectedImageSrc(null);
    
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const validate = (): boolean => {
    const newErrors: typeof errors = {};
    
    if (!firstName.trim()) {
      newErrors.firstName = 'Please enter your first name';
    }
    
    if (!lastName.trim()) {
      newErrors.lastName = 'Please enter your last name';
    }
    
    // Phone is optional, but if provided, validate format
    if (phone.trim()) {
      const numbers = phone.replace(/\D/g, '');
      if (numbers.length !== 10) {
        newErrors.phone = 'Please enter a valid phone number';
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!user?.id) {
      toast.error('You must be logged in to complete onboarding');
      return;
    }

    if (!validate()) {
      return;
    }

    setIsSaving(true);

    try {
      let avatarUrl: string | null = null;

      // Upload avatar if provided
      if (avatarBlob) {
        try {
          const bucketId = 'Avatars';
          const filePath = `${user.id}/profile.jpg`;
          
          // Resize to 1024x1024
          const resizedBlob = await resizeImage(avatarBlob);
          
          const { error: uploadError } = await supabase.storage
            .from(bucketId)
            .upload(filePath, resizedBlob, {
              upsert: true,
              contentType: 'image/jpeg',
              cacheControl: '3600'
            });

          if (uploadError) {
            throw uploadError;
          }

          const { data: { publicUrl } } = supabase.storage
            .from(bucketId)
            .getPublicUrl(filePath);
          
          avatarUrl = publicUrl;
        } catch (error) {
          console.error('Error uploading avatar:', error);
          toast.error('Failed to upload avatar. Profile will be saved without photo.');
        }
      }

      // Save profile
      const phoneNumbers = phone.replace(/\D/g, '');
      await saveProfile(user.id, {
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        phone: phoneNumbers || null,
        avatar_url: avatarUrl,
      });

      // Track profile completion
      track('profile_completed', {
        has_avatar: !!avatarUrl,
        has_phone: !!phoneNumbers,
        field_count: 2 + (phoneNumbers ? 1 : 0),
      });

      toast.success('Profile saved successfully!');
      navigate('/customer/onboarding/personalize', { replace: true });
    } catch (error: any) {
      console.error('Error saving profile:', error);
      toast.error(error?.message || 'Failed to save profile. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const isValid = firstName.trim() && lastName.trim() && Object.keys(errors).length === 0;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2 }}
      className="min-h-dvh flex flex-col bg-white"
    >
      {/* Scrollable content */}
      <main className="flex-1 px-6 pt-10 pb-32 overflow-y-auto">
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
          Hello, I'm Benjamin — who am I serving today?
        </h1>
        <p className="mt-2 text-slate-500">Tell us a few basics to get started.</p>

        {/* Avatar */}
        <section className="mt-8 flex flex-col items-center">
          <button
            type="button"
            className="relative h-28 w-28 rounded-full bg-slate-900 text-white flex items-center justify-center text-2xl font-semibold shadow-sm overflow-hidden"
            onClick={() => fileInputRef.current?.click()}
            aria-label="Upload profile picture"
          >
            {avatarPreview ? (
              <img
                src={avatarPreview}
                alt=""
                className="absolute inset-0 h-full w-full rounded-full object-cover"
              />
            ) : (
              <span>{getInitials(firstName, lastName)}</span>
            )}
          </button>
          <button
            type="button"
            className="mt-3 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium shadow-sm active:scale-[0.98] transition-transform"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="h-4 w-4" /> Upload
          </button>
          <p className="mt-2 text-xs text-slate-500">JPG, PNG, or WebP · Max 5MB</p>
          
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/jpg,image/png,image/webp"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFileSelect(file);
            }}
          />
        </section>

        {/* Fields */}
        <section className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* First name */}
          <div className="space-y-2">
            <Label htmlFor="first_name" className="text-sm font-medium text-slate-900">
              First name
            </Label>
            <Input
              id="first_name"
              value={firstName}
              onChange={(e) => {
                setFirstName(e.target.value);
                if (errors.firstName) {
                  setErrors((prev) => ({ ...prev, firstName: undefined }));
                }
              }}
              placeholder="Jane"
              className="rounded-full h-12 text-base"
              aria-invalid={!!errors.firstName}
              aria-describedby={errors.firstName ? 'first_name_error' : undefined}
            />
            {errors.firstName && (
              <p id="first_name_error" className="text-xs text-red-500 mt-1">
                {errors.firstName}
              </p>
            )}
          </div>

          {/* Last name */}
          <div className="space-y-2">
            <Label htmlFor="last_name" className="text-sm font-medium text-slate-900">
              Last name
            </Label>
            <Input
              id="last_name"
              value={lastName}
              onChange={(e) => {
                setLastName(e.target.value);
                if (errors.lastName) {
                  setErrors((prev) => ({ ...prev, lastName: undefined }));
                }
              }}
              placeholder="Doe"
              className="rounded-full h-12 text-base"
              aria-invalid={!!errors.lastName}
              aria-describedby={errors.lastName ? 'last_name_error' : undefined}
            />
            {errors.lastName && (
              <p id="last_name_error" className="text-xs text-red-500 mt-1">
                {errors.lastName}
              </p>
            )}
          </div>
        </section>

        {/* Phone */}
        <section className="mt-4">
          <div className="space-y-2">
            <Label htmlFor="phone" className="text-sm font-medium text-slate-900">
              Phone <span className="text-slate-400 font-normal">(optional)</span>
            </Label>
            <Input
              id="phone"
              type="tel"
              inputMode="numeric"
              value={phone}
              onChange={(e) => {
                const formatted = formatPhoneNumber(e.target.value);
                setPhone(formatted);
                if (errors.phone) {
                  setErrors((prev) => ({ ...prev, phone: undefined }));
                }
              }}
              placeholder="(305) 555-0123"
              className="rounded-full h-12 text-base"
              aria-invalid={!!errors.phone}
              aria-describedby={errors.phone ? 'phone_error' : undefined}
            />
            {errors.phone && (
              <p id="phone_error" className="text-xs text-red-500 mt-1">
                {errors.phone}
              </p>
            )}
          </div>
        </section>
      </main>

      {/* Bottom CTA */}
      <footer className="fixed inset-x-0 bottom-0 z-10">
        <div className="pointer-events-none bg-gradient-to-t from-white/90 to-transparent h-8" />
        <div className="backdrop-blur supports-[backdrop-filter]:bg-white/70 bg-white/90 border-t border-slate-200">
          <div className="mx-auto px-6 pb-[max(16px,env(safe-area-inset-bottom))] pt-3">
            <button
              type="button"
              onClick={handleSave}
              disabled={!isValid || isSaving}
              className="w-full rounded-full bg-slate-900 text-white font-semibold h-14 shadow-lg disabled:opacity-60 disabled:cursor-not-allowed transition-opacity flex items-center justify-center gap-2"
            >
              {isSaving ? (
                <>
                  <svg
                    className="animate-spin h-5 w-5"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Saving…
                </>
              ) : (
                'Save and continue'
              )}
            </button>
          </div>
        </div>
      </footer>

      {/* Crop modal */}
      {showCropModal && selectedImageSrc && (
        <AvatarCropModal
          imageSrc={selectedImageSrc}
          onCropComplete={handleCropComplete}
          onCancel={handleCropCancel}
        />
      )}
    </motion.div>
  );
}

// Image resize utility
async function resizeImage(blob: Blob, maxSize = 1024): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(blob);
    
    img.onload = () => {
      URL.revokeObjectURL(url);
      
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;
      
      if (width > height) {
        if (width > maxSize) {
          height = (height * maxSize) / width;
          width = maxSize;
        }
      } else {
        if (height > maxSize) {
          width = (width * maxSize) / height;
          height = maxSize;
        }
      }
      
      canvas.width = width;
      canvas.height = height;
      
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('No 2d context'));
        return;
      }
      
      ctx.drawImage(img, 0, 0, width, height);
      
      canvas.toBlob(
        (resizedBlob) => {
          if (resizedBlob) {
            resolve(resizedBlob);
          } else {
            reject(new Error('Failed to resize image'));
          }
        },
        'image/jpeg',
        0.95
      );
    };
    
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image'));
    };
    
    img.src = url;
  });
}

