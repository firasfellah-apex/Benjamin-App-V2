/**
 * Runner Identity Component with Safe Reveal
 * 
 * Shows runner information with privacy protection:
 * - Before cash pickup: Blurred avatar + initial only
 * - After cash pickup: Full avatar + full name with smooth transition
 */

import { Avatar } from '@/components/common/Avatar';
import { canRevealRunner } from '@/lib/reveal';
import { OrderStatus } from '@/types/types';
import { cn } from '@/lib/utils';
import { User } from 'lucide-react';
import { strings } from '@/lib/strings';

interface RunnerIdentityProps {
  runnerName?: string;
  runnerAvatarUrl?: string | null;
  orderStatus: OrderStatus;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function RunnerIdentity({
  runnerName,
  runnerAvatarUrl,
  orderStatus,
  showLabel = true,
  size = 'md',
  className
}: RunnerIdentityProps) {
  const canReveal = canRevealRunner(orderStatus);
  const initial = runnerName?.charAt(0).toUpperCase() || '?';

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

  return (
    <div className={cn('flex items-center', sizeClasses[size], className)}>
      {/* Avatar with blur effect */}
      <div className="relative">
        <Avatar
          src={runnerAvatarUrl}
          fallback={runnerName}
          size={avatarSizes[size]}
          blurred={!canReveal}
        />
        
        {!canReveal && (
          <div className="absolute inset-0 flex items-center justify-center">
            <User className="h-1/2 w-1/2 text-muted-foreground" />
          </div>
        )}
      </div>

      {/* Name with reveal transition */}
      <div className="flex flex-col">
        {showLabel && (
          <span className="text-xs text-muted-foreground">
            {canReveal ? strings.customer.runner : strings.customer.runnerHidden}
          </span>
        )}
        <span
          className={cn(
            'font-medium transition-all duration-500',
            textSizes[size],
            !canReveal && 'blur-sm select-none'
          )}
        >
          {canReveal ? runnerName || strings.customer.unknown : initial}
        </span>
      </div>
    </div>
  );
}
