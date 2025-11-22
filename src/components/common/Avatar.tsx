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
  cacheKey?: string | null; // Optional: timestamp or version for cache-busting (e.g., profile.updated_at)
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
  className,
  cacheKey
}: AvatarProps) {
  const [imageError, setImageError] = React.useState(false);
  const initials = getInitials(fallback || alt);
  
  // Track the last src to detect actual changes
  const lastSrcRef = React.useRef<string | null>(null);
  const cacheBustMapRef = React.useRef<Map<string, string>>(new Map());
  const hasLoadedRef = React.useRef<boolean>(false);
  
  // Reset error only when src actually changes (not on every render)
  React.useEffect(() => {
    const currentSrc = src || null;
    if (lastSrcRef.current !== currentSrc) {
      setImageError(false);
      // If src becomes null/empty, immediately reset loaded state to show initials
      if (!currentSrc) {
        hasLoadedRef.current = false;
      }
      lastSrcRef.current = currentSrc;
    }
  }, [src]);
  
  // Industry-standard cache-busting for Supabase storage URLs
  // Priority: 1) Use cacheKey (timestamp) if provided, 2) Fall back to hash-based for stability
  const getImageSrc = React.useMemo(() => {
    if (!src) {
      return null;
    }
    
    // Check if this is a Supabase storage URL
    if (src.includes('supabase.co/storage/v1/object/public')) {
      try {
        const url = new URL(src);
        // Remove any existing cache-busting params
        url.searchParams.delete('t');
        url.searchParams.delete('v');
        
        // Industry-standard: Use timestamp-based cache-busting if cacheKey is provided
        // This ensures instant updates when the image changes
        if (cacheKey) {
          // Convert timestamp to a short hash for cleaner URLs
          // Use the timestamp directly, or convert to seconds since epoch
          const timestamp = cacheKey.includes('T') 
            ? new Date(cacheKey).getTime() 
            : parseInt(cacheKey, 10) || Date.now();
          url.searchParams.set('t', Math.floor(timestamp / 1000).toString());
          return url.toString();
        }
        
        // Fallback: Create a stable hash from the URL path for backward compatibility
        // This ensures the same URL always gets the same cache-busting value when no cacheKey
        const urlPath = url.pathname;
        if (!cacheBustMapRef.current.has(urlPath)) {
          // Generate a hash from the URL path for stable cache-busting
          let hash = 0;
          for (let i = 0; i < urlPath.length; i++) {
            const char = urlPath.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
          }
          cacheBustMapRef.current.set(urlPath, Math.abs(hash).toString());
        }
        
        const cacheBust = cacheBustMapRef.current.get(urlPath) || '0';
        url.searchParams.set('v', cacheBust);
        return url.toString();
      } catch {
        // If URL parsing fails, use cacheKey or hash of the full URL
        if (cacheKey) {
          const timestamp = cacheKey.includes('T') 
            ? new Date(cacheKey).getTime() 
            : parseInt(cacheKey, 10) || Date.now();
          return `${src}?t=${Math.floor(timestamp / 1000)}`;
        }
        
        // Fallback to hash
        if (!cacheBustMapRef.current.has(src)) {
          let hash = 0;
          for (let i = 0; i < src.length; i++) {
            const char = src.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
          }
          cacheBustMapRef.current.set(src, Math.abs(hash).toString());
        }
        const cacheBust = cacheBustMapRef.current.get(src) || '0';
        return `${src}?v=${cacheBust}`;
      }
    }
    
    return src;
  }, [src, cacheKey]);
  
  // Debug logging in development
  React.useEffect(() => {
    if (import.meta.env.DEV && src) {
      console.log('[Avatar] Rendering with src:', src, {
        hasSrc: !!src,
        willShowImage: !!getImageSrc && !imageError,
        imageError,
        finalSrc: getImageSrc
      });
    }
  }, [src, imageError, getImageSrc]);
  
  // Determine if we should show the image
  // If src is null/empty, always show fallback (initials)
  // If we've loaded the image before, keep showing it even if there's a temporary error
  // This prevents the flash of initials when toggling edit mode
  const shouldShowImage = !!src && !!getImageSrc && (!imageError || hasLoadedRef.current);
  
  return (
    <RadixAvatar
      className={cn(
        sizeClasses[size],
        'transition-all duration-500 ease-out',
        blurred && 'blur-xl',
        className
      )}
    >
      {/* Always render AvatarImage - Radix will show fallback when src is undefined/null */}
      <AvatarImage
        src={shouldShowImage ? (getImageSrc || undefined) : undefined}
        alt={alt}
        className="object-cover"
        onError={(e) => {
          console.error('[Avatar] Failed to load image:', {
            src,
            error: e,
            target: e.currentTarget?.src
          });
          setImageError(true);
        }}
        onLoad={() => {
          hasLoadedRef.current = true;
          if (import.meta.env.DEV) {
            console.log('[Avatar] Image loaded successfully:', src);
          }
        }}
      />
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
