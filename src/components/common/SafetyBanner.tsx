/**
 * Safety Banner Component
 * 
 * Displays safety notice about when runner information is revealed
 * - Dismissible (stores preference in localStorage)
 * - Shows before runner info is revealed
 */

import { useState, useEffect } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Shield, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface SafetyBannerProps {
  message?: string;
  storageKey?: string;
  className?: string;
}

const DEFAULT_MESSAGE = 'Runner photo and live location will be visible after cash pickup for your safety';
const DEFAULT_STORAGE_KEY = 'benjamin-safety-banner-dismissed';

export function SafetyBanner({
  message = DEFAULT_MESSAGE,
  storageKey = DEFAULT_STORAGE_KEY,
  className
}: SafetyBannerProps) {
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    const dismissed = localStorage.getItem(storageKey);
    setIsDismissed(dismissed === 'true');
  }, [storageKey]);

  const handleDismiss = () => {
    localStorage.setItem(storageKey, 'true');
    setIsDismissed(true);
  };

  if (isDismissed) {
    return null;
  }

  return (
    <Alert className={cn('border-primary/50 bg-primary/5', className)}>
      <Shield className="h-4 w-4 text-primary" />
      <AlertDescription className="flex items-start justify-between gap-2">
        <span className="text-sm">{message}</span>
        <Button
          variant="ghost"
          size="sm"
          className="h-auto p-1 hover:bg-transparent"
          onClick={handleDismiss}
          aria-label="Dismiss safety notice"
        >
          <X className="h-4 w-4" />
        </Button>
      </AlertDescription>
    </Alert>
  );
}
