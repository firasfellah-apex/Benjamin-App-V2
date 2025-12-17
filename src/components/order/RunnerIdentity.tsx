/**
 * Runner Identity Component with Progressive Reveal
 * 
 * Shows runner information with privacy protection:
 * - Before accepted: No runner info
 * - Accepted → At ATM: First name + blurred avatar
 * - Cash Withdrawn+: Full name + clear avatar
 */

import { Avatar } from '@/components/common/Avatar';
import { 
  canRevealRunnerIdentity, 
  shouldBlurRunnerAvatar,
  getRunnerDisplayName 
} from '@/lib/reveal';
import { OrderStatus } from '@/types/types';
import { cn } from '@/lib/utils';
import { User } from 'lucide-react';
import { strings } from '@/lib/strings';

interface RunnerIdentityProps {
  runnerFirstName?: string;
  runnerLastName?: string;
  runnerAvatarUrl?: string | null;
  orderStatus: OrderStatus;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function RunnerIdentity({
  runnerFirstName,
  runnerLastName,
  runnerAvatarUrl,
  orderStatus,
  showLabel = true,
  size = 'md',
  className
}: RunnerIdentityProps) {
  const canReveal = canRevealRunnerIdentity(orderStatus);
  const shouldBlur = shouldBlurRunnerAvatar(orderStatus);
  const displayName = getRunnerDisplayName(runnerFirstName, runnerLastName);
  const initial = runnerFirstName?.charAt(0).toUpperCase() || '?';

  const sizeClasses = {
    sm: 'gap-2',
    md: 'gap-3',
    lg: 'gap-4'
  };

  const avatarSizes = {
    sm: 'sm' as const,
    md: 'lg' as const,
    lg: 'xl' as const
  };

  const textSizes = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg'
  };

  // Don't show anything if runner hasn't been assigned yet
  if (!canReveal) {
    return null;
  }

  return (
    <div className={cn('flex items-center', sizeClasses[size], className)}>
      {/* Avatar with blur effect */}
      <div className="relative">
        <Avatar
          src={runnerAvatarUrl}
          fallback={displayName}
          size={avatarSizes[size]}
          blurred={shouldBlur}
        />
        
        {shouldBlur && (
          <div className="absolute inset-0 flex items-center justify-center">
            <User className="h-1/2 w-1/2 text-muted-foreground" />
          </div>
        )}
      </div>

      {/* Name with reveal transition */}
      <div className="flex flex-col">
        {showLabel && (
          <span className="text-xs text-muted-foreground">
            {shouldBlur ? strings.customer.runnerHidden : strings.customer.runner}
          </span>
        )}
        <span
          className={cn(
            'font-medium transition-all duration-500',
            textSizes[size],
            shouldBlur && 'blur-sm select-none'
          )}
        >
          {shouldBlur ? initial : displayName}
        </span>
      </div>
    </div>
  );
}
