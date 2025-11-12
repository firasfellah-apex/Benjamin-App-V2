/**
 * Avatar Component with Blur Support
 * 
 * Features:
 * - Shows user avatar image or initials fallback
 * - Supports blur effect for privacy (runner identity protection)
 * - Multiple sizes
 * - Smooth transitions
 * - Handles image load errors gracefully
 */

import * as React from 'react';
import { Avatar as RadixAvatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

export type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

interface AvatarProps {
  src?: string | null;
  alt?: string;
  fallback?: string;
  size?: AvatarSize;
  blurred?: boolean;
  className?: string;
}

const sizeClasses: Record<AvatarSize, string> = {
  xs: 'h-6 w-6 text-xs',
  sm: 'h-8 w-8 text-sm',
  md: 'h-10 w-10 text-base',
  lg: 'h-12 w-12 text-lg',
  xl: 'h-16 w-16 text-xl',
  '2xl': 'h-24 w-24 text-2xl'
};

/**
 * Get initials from name
 * @param name Full name or email
 * @returns Two-letter initials
 */
function getInitials(name?: string): string {
  if (!name) return '?';
  
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  
  return name.slice(0, 2).toUpperCase();
}

export function Avatar({
  src,
  alt = 'User avatar',
  fallback,
  size = 'md',
  blurred = false,
  className
}: AvatarProps) {
  const [imageError, setImageError] = React.useState(false);
  const initials = getInitials(fallback || alt);
  
  // Validate URL before using it
  const isValidUrl = React.useMemo(() => {
    if (!src) return false;
    try {
      const url = new URL(src);
      return url.protocol === 'http:' || url.protocol === 'https:';
    } catch {
      // Invalid URL or relative path
      return false;
    }
  }, [src]);
  
  // Reset error when src changes
  React.useEffect(() => {
    setImageError(false);
  }, [src]);
  
  const shouldShowImage = src && isValidUrl && !imageError;
  
  return (
    <RadixAvatar
      className={cn(
        sizeClasses[size],
        'transition-all duration-500 ease-out',
        blurred && 'blur-xl',
        className
      )}
    >
      {shouldShowImage && (
        <AvatarImage
          src={src}
          alt={alt}
          className="object-cover"
          onError={() => {
            console.warn('[Avatar] Failed to load image:', src);
            setImageError(true);
          }}
        />
      )}
      <AvatarFallback
        className={cn(
          'bg-primary text-primary-foreground font-medium',
          'transition-all duration-500'
        )}
      >
        {initials}
      </AvatarFallback>
    </RadixAvatar>
  );
}
