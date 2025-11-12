/**
 * Avatar Uploader Component
 * 
 * Allows users to upload, change, or remove their avatar
 * - Drag & drop or click to upload
 * - Shows current avatar or initials
 * - Interactive crop modal to select square area (ensures faces are visible)
 */

import { useRef, useState } from 'react';
import { Avatar } from './Avatar';
import { Button } from '@/components/ui/button';
import { useAvatar } from '@/hooks/use-avatar';
import { Upload, X, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { AvatarCropModal } from './AvatarCropModal';

interface AvatarUploaderProps {
  currentAvatarUrl?: string | null;
  userName?: string;
  onUploadComplete?: (url: string) => void;
  onRemoveComplete?: () => void;
  className?: string;
}

export function AvatarUploader({
  currentAvatarUrl,
  userName,
  onUploadComplete,
  onRemoveComplete,
  className
}: AvatarUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [showCropModal, setShowCropModal] = useState(false);
  const [selectedImageSrc, setSelectedImageSrc] = useState<string | null>(null);
  const { uploading, uploadAvatar, removeAvatar } = useAvatar();

  const handleFileSelect = (file: File) => {
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
      // Create a File object from the blob
      const croppedFile = new File([croppedImageBlob], 'avatar.jpg', {
        type: 'image/jpeg',
      });

      console.log('[AvatarUploader] Starting upload for cropped image');
      const url = await uploadAvatar(croppedFile);
      console.log('[AvatarUploader] Upload successful, URL:', url);
      toast.success('Profile picture updated successfully');
      onUploadComplete?.(url);
      
      // Clean up
      if (selectedImageSrc) {
        URL.revokeObjectURL(selectedImageSrc);
      }
      setShowCropModal(false);
      setSelectedImageSrc(null);
      
      // Clear file input so the same file can be selected again
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      console.error('[AvatarUploader] Upload failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to upload avatar';
      toast.error(errorMessage);
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

  const handleRemove = async () => {
    try {
      await removeAvatar();
      toast.success('Avatar removed');
      onRemoveComplete?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to remove avatar');
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      handleFileSelect(file);
    } else {
      toast.error('Please drop an image file');
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  return (
    <div className={cn('flex flex-col items-center gap-4', className)}>
      {/* Avatar Preview */}
      <div
        className={cn(
          'relative cursor-pointer transition-all',
          isDragging && 'scale-105 ring-2 ring-primary',
          uploading && 'opacity-50 pointer-events-none'
        )}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={handleClick}
      >
        <Avatar
          src={currentAvatarUrl}
          fallback={userName}
          size="2xl"
          className="ring-2 ring-border hover:ring-primary transition-all"
        />
        
        {uploading && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/80 rounded-full">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        )}
        
        {!uploading && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/0 hover:bg-background/80 rounded-full transition-all opacity-0 hover:opacity-100">
            <Upload className="h-8 w-8 text-primary" />
          </div>
        )}
      </div>

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/webp"
        className="hidden"
        onChange={handleFileInputChange}
        disabled={uploading}
      />

      {/* Action Buttons */}
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={handleClick}
          disabled={uploading}
        >
          <Upload className="h-4 w-4 mr-2" />
          {currentAvatarUrl ? 'Change' : 'Upload'}
        </Button>

        {currentAvatarUrl && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleRemove}
            disabled={uploading}
          >
            <X className="h-4 w-4 mr-2" />
            Remove
          </Button>
        )}
      </div>

      {/* Help Text */}
      <p className="text-xs text-muted-foreground text-center max-w-xs">
        Click or drag & drop to upload. JPG, PNG, or WebP. Max 5MB.
        <br />
        You'll be able to select the crop area.
      </p>

      {/* Crop Modal */}
      {showCropModal && selectedImageSrc && (
        <AvatarCropModal
          imageSrc={selectedImageSrc}
          onCropComplete={handleCropComplete}
          onCancel={handleCropCancel}
        />
      )}
    </div>
  );
}
