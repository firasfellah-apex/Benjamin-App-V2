/**
 * Debug page for testing Plaid KYC flow
 * Only visible in non-production environments
 * Now uses the reusable PlaidKycButton component
 */

import { useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PlaidKycButton } from "@/components/customer/plaid/PlaidKycButton";
import { usePlaidLinkKyc } from "@/hooks/usePlaidLinkKyc";
import { getCurrentProfile } from "@/db/api";
import { useQueryClient } from "@tanstack/react-query";
import type { Profile } from "@/types/types";
import { format } from "date-fns";

// Only render in development
const isDev = import.meta.env.MODE !== "production" || import.meta.env.VITE_SHOW_DEBUG === "true";

export default function PlaidLinkTest() {
  const queryClient = useQueryClient();
  const { isLoading, error, lastResult } = usePlaidLinkKyc(async () => {
    // Refetch profile after successful KYC
    await queryClient.invalidateQueries({ queryKey: ['profile'] });
  });

  // Get profile from query cache or fetch if needed
  const profile = queryClient.getQueryData<Profile>(['profile', undefined]);
  
  useEffect(() => {
    // Ensure profile is loaded
    if (!profile) {
      getCurrentProfile().then((p) => {
        if (p) {
          queryClient.setQueryData(['profile', undefined], p);
        }
      });
    }
  }, [profile, queryClient]);

  // Don't render in production unless explicitly enabled
  if (!isDev) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardHeader>
            <CardTitle>Debug Page Not Available</CardTitle>
            <CardDescription>
              This page is only available in development mode.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const getKYCStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      verified: "default",
      pending: "secondary",
      unverified: "outline",
      failed: "destructive",
    };

    return (
      <Badge variant={variants[status] || "outline"}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  return (
    <div className="container mx-auto p-6 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle>Plaid KYC Test</CardTitle>
          <CardDescription>
            Test the Plaid bank linking and KYC verification flow
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Current KYC Status */}
          {profile && (
            <div className="space-y-2">
              <h3 className="text-sm font-medium">Current KYC Status</h3>
              <div className="flex items-center gap-4 p-4 bg-muted rounded-lg">
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Status</div>
                  {getKYCStatusBadge(profile.kyc_status)}
                </div>
                {profile.kyc_verified_at && (
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">Verified At</div>
                    <div className="text-sm font-medium">
                      {format(new Date(profile.kyc_verified_at), "PPp")}
                    </div>
                  </div>
                )}
                {profile.plaid_item_id && (
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">Plaid Item ID</div>
                    <div className="text-sm font-mono text-xs">
                      {profile.plaid_item_id.substring(0, 8)}...
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Error Display */}
          {error && (
            <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
              <div className="text-sm font-medium text-destructive mb-1">Error</div>
              <div className="text-sm text-destructive/80">{error}</div>
            </div>
          )}

          {/* Actions */}
          <div className="space-y-4">
            <PlaidKycButton label="Start KYC with Plaid" className="w-full" />
          </div>

          {/* Instructions */}
          <div className="p-4 bg-muted rounded-lg text-sm space-y-2">
            <div className="font-medium">Instructions:</div>
            <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
              <li>Click "Start KYC with Plaid" to create a link token and open Plaid Link</li>
              <li>Use Plaid sandbox credentials (user_good / pass_good)</li>
              <li>After successful linking, your KYC status will be updated</li>
            </ol>
          </div>

          {/* Success Message */}
          {profile?.kyc_status === "verified" && (
            <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
              <div className="text-sm font-medium text-green-700 dark:text-green-400 mb-1">
                ✅ Benjamin KYC Complete 🎉
              </div>
              <div className="text-sm text-green-600 dark:text-green-300">
                Your identity has been verified via Plaid.
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
