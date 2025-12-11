/**
 * Reusable hook for Plaid KYC Link integration
 * Encapsulates the full flow: create token → open Link → exchange token → refetch profile
 */

import { useState, useCallback, useEffect } from "react";
import { usePlaidLink } from "react-plaid-link";
import { toast } from "sonner";
import { createLinkToken, exchangePublicToken } from "@/lib/plaid";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { useOrderDraftStore } from "@/stores/useOrderDraftStore";

export interface UsePlaidLinkKycResult {
  openPlaid: () => void;
  isLoading: boolean;
  error: string | null;
  lastResult: {
    kyc_status: string;
    plaid_item_id: string;
  } | null;
}

export function usePlaidLinkKyc(onCompleted?: () => void): UsePlaidLinkKycResult {
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<UsePlaidLinkKycResult["lastResult"]>(null);
  const [pendingOpen, setPendingOpen] = useState(false);
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { draft, returnTo } = useOrderDraftStore();

  const onSuccess = useCallback(
    async (publicToken: string, metadata: any) => {
      try {
        setLoading(true);
        setError(null);
        setPendingOpen(false);
        
        console.log("[Plaid] Public token received:", publicToken);
        console.log("[Plaid] Metadata:", metadata);

        const result = await exchangePublicToken(publicToken);
        
        console.log("[Plaid] Exchange result:", result);
        
        setLastResult({
          kyc_status: result.kyc_status,
          plaid_item_id: result.plaid_item_id,
        });
        
        // Invalidate profile query to refetch
        await queryClient.invalidateQueries({ queryKey: ['profile'] });
        
        toast.success("You're verified 🎉", {
          description: "Your bank is connected and you're ready to request cash.",
        });
        
        // Check if we need to navigate back to order review
        if (returnTo === 'order-review' && draft) {
          // Navigate back to order review screen with step 2
          navigate('/customer/request?step=2&address_id=' + draft.addressId);
        }
        
        // Call completion callback if provided
        onCompleted?.();
      } catch (err: any) {
        const errorMsg = err.message || "Failed to exchange public token";
        setError(errorMsg);
        toast.error(errorMsg);
        console.error("[Plaid] Error exchanging public token:", err);
      } finally {
        setLoading(false);
      }
    },
    [onCompleted, queryClient, navigate, draft, returnTo]
  );

  const { open, ready } = usePlaidLink({
    token: linkToken,
    onSuccess,
    onExit: (err, metadata) => {
      if (err) {
        console.error("[Plaid] Link exit error:", err);
        setError(err.error_message || "User exited Plaid Link");
      } else {
        console.log("[Plaid] User exited Plaid Link:", metadata);
      }
      setLoading(false);
      setPendingOpen(false);
    },
  });

  // Open Plaid Link when token is ready and we have a pending open request
  useEffect(() => {
    if (linkToken && ready && pendingOpen && !loading) {
      open();
      setPendingOpen(false);
    }
  }, [linkToken, ready, pendingOpen, open, loading]);

  const openPlaid = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const token = await createLinkToken();
      setLinkToken(token);
      setPendingOpen(true);
      setLoading(false);
    } catch (err: any) {
      const errorMsg = err.message || "Failed to create link token";
      setError(errorMsg);
      toast.error(errorMsg);
      console.error("[Plaid] Error creating link token:", err);
      setLoading(false);
      setPendingOpen(false);
    }
  }, []);

  return {
    openPlaid,
    isLoading: loading || (pendingOpen && !ready),
    error,
    lastResult,
  };
}
