/**
 * Avatar Component with Blur Support
 * 
 * Features:
 * - Shows user avatar image or initials fallback
 * - Supports blur effect for privacy (runner identity protection)
 * - Multiple sizes
 * - Smooth transitions
 */

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
  const initials = getInitials(fallback || alt);
  
  return (
    <RadixAvatar
      className={cn(
        sizeClasses[size],
        'transition-all duration-500 ease-out',
        blurred && 'blur-xl',
        className
      )}
    >
      {src && (
        <AvatarImage
          src={src}
          alt={alt}
          className="object-cover"
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
