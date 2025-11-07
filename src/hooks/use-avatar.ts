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
import { useAuth } from 'miaoda-auth-react';

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
   * Crop and resize image to square
   */
  const cropToSquare = async (file: File): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      img.onload = () => {
        const size = Math.min(img.width, img.height);
        const x = (img.width - size) / 2;
        const y = (img.height - size) / 2;

        canvas.width = 1024;
        canvas.height = 1024;

        ctx?.drawImage(
          img,
          x, y, size, size,
          0, 0, 1024, 1024
        );

        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('Failed to crop image'));
            }
          },
          'image/jpeg',
          0.9
        );
      };

      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = URL.createObjectURL(file);
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
      if (!file.type.startsWith('image/')) {
        throw new Error('File must be an image');
      }

      // Validate file size (5MB)
      if (file.size > 5 * 1024 * 1024) {
        throw new Error('File size must be less than 5MB');
      }

      // Crop to square
      const croppedBlob = await cropToSquare(file);

      // Upload to storage
      const filePath = `${user.id}/profile.jpg`;
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, croppedBlob, {
          upsert: true,
          contentType: 'image/jpeg'
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      // Update profile
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', user.id);

      if (updateError) throw updateError;

      return publicUrl;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to upload avatar';
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
      // Delete from storage
      const filePath = `${user.id}/profile.jpg`;
      const { error: deleteError } = await supabase.storage
        .from('avatars')
        .remove([filePath]);

      if (deleteError) throw deleteError;

      // Update profile
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: null })
        .eq('id', user.id);

      if (updateError) throw updateError;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to remove avatar';
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
