/**
 * Avatar Upload Hook
 * 
 * Handles avatar upload, update, and deletion
 * - Uploads to avatars/{userId}/profile.jpg
 * - Center-crops to square 1024x1024
 * - Updates profiles.avatar_url
 */

import { useState } from 'react';
import { supabase } from '@/db/supabase';
import { useAuth } from '@/contexts/AuthContext';

interface UseAvatarReturn {
  uploading: boolean;
  uploadAvatar: (file: File) => Promise<string>;
  removeAvatar: () => Promise<void>;
  error: string | null;
}

export function useAvatar(): UseAvatarReturn {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  /**
   * Resize image blob to 1024x1024 (image is already cropped by user)
   */
  const resizeImage = async (blob: Blob): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      img.onload = () => {
        // Image should already be square from crop, but ensure it's 1024x1024
        canvas.width = 1024;
        canvas.height = 1024;

        ctx?.drawImage(img, 0, 0, 1024, 1024);

        canvas.toBlob(
          (resultBlob) => {
            if (resultBlob) {
              resolve(resultBlob);
            } else {
              reject(new Error('Failed to resize image'));
            }
          },
          'image/jpeg',
          0.9
        );
      };

      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = URL.createObjectURL(blob);
    });
  };

  /**
   * Upload avatar
   */
  const uploadAvatar = async (file: File): Promise<string> => {
    if (!user?.id) {
      throw new Error('User not authenticated');
    }

    setUploading(true);
    setError(null);

    try {
      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
      if (!allowedTypes.includes(file.type)) {
        throw new Error('File must be a JPEG, PNG, or WebP image');
      }

      // Validate file size (5MB)
      if (file.size > 5 * 1024 * 1024) {
        throw new Error('File size must be less than 5MB');
      }

      // Note: We skip the bucket existence check because listBuckets() may not work
      // due to permissions. If the bucket doesn't exist, the upload will fail with
      // a clear error message anyway.

      // Resize to 1024x1024 (image is already cropped by user)
      console.log('[Avatar Upload] Resizing image to 1024x1024...');
      const resizedBlob = await resizeImage(file);
      console.log('[Avatar Upload] Image resized successfully');

      // Upload to storage
      // Bucket ID is case-sensitive - use the exact ID from your Supabase storage
      // If your bucket name is "Avatars", the ID is likely "Avatars" (capital A)
      const bucketId = 'Avatars'; // Changed to match bucket name in Dashboard
      const filePath = `${user.id}/profile.jpg`;
      console.log('[Avatar Upload] Uploading to bucket:', bucketId, 'path:', filePath);
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from(bucketId)
        .upload(filePath, resizedBlob, {
          upsert: true,
          contentType: 'image/jpeg',
          cacheControl: '3600'
        });

      if (uploadError) {
        console.error('[Avatar Upload] Upload error:', uploadError);
        // Provide more specific error messages
        if (uploadError.message.includes('new row violates row-level security')) {
          throw new Error('Permission denied. Please ensure you are logged in and have permission to upload avatars.');
        }
        if (uploadError.message.includes('Bucket not found')) {
          throw new Error('Avatar storage bucket not found. Please contact support.');
        }
        throw uploadError;
      }

      console.log('[Avatar Upload] File uploaded successfully:', uploadData);

      // Get public URL - store WITHOUT cache-busting params
      // Cache-busting will be added when rendering, not when storing
      const { data: { publicUrl } } = supabase.storage
        .from(bucketId)
        .getPublicUrl(filePath);

      console.log('[Avatar Upload] Public URL:', publicUrl);

      // Update profile with base URL (no query params)
      // Also update updated_at to ensure cache invalidation
      console.log('[Avatar Upload] Updating profile with new avatar URL...');
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ 
          avatar_url: publicUrl,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (updateError) {
        console.error('[Avatar Upload] Profile update error:', updateError);
        // Try to clean up the uploaded file if profile update fails
        await supabase.storage.from(bucketId).remove([filePath]);
        throw updateError;
      }

      console.log('[Avatar Upload] Profile updated successfully');
      return publicUrl;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to upload avatar';
      console.error('[Avatar Upload] Error:', err);
      setError(message);
      throw err;
    } finally {
      setUploading(false);
    }
  };

  /**
   * Remove avatar
   */
  const removeAvatar = async (): Promise<void> => {
    if (!user?.id) {
      throw new Error('User not authenticated');
    }

    setUploading(true);
    setError(null);

    try {
      // Delete from storage (ignore errors if file doesn't exist)
      // Bucket ID is case-sensitive - use the exact ID from your Supabase storage
      const bucketId = 'Avatars'; // Changed to match bucket name in Dashboard
      const filePath = `${user.id}/profile.jpg`;
      const { error: deleteError } = await supabase.storage
        .from(bucketId)
        .remove([filePath]);

      // Log but don't fail if file doesn't exist
      if (deleteError && !deleteError.message.includes('not found')) {
        console.warn('[Avatar Remove] Error deleting file:', deleteError);
        // Continue anyway - we still want to clear the profile URL
      }

      // Update profile to remove avatar_url
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: null })
        .eq('id', user.id);

      if (updateError) {
        console.error('[Avatar Remove] Profile update error:', updateError);
        throw updateError;
      }

      console.log('[Avatar Remove] Avatar removed successfully');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to remove avatar';
      console.error('[Avatar Remove] Error:', err);
      setError(message);
      throw err;
    } finally {
      setUploading(false);
    }
  };

  return {
    uploading,
    uploadAvatar,
    removeAvatar,
    error
  };
}
