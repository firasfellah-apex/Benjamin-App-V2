/**
 * Reusable Plaid KYC button component
 * Uses the usePlaidLinkKyc hook to handle the full Plaid Link flow
 */

import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { usePlaidLinkKyc } from "@/hooks/usePlaidLinkKyc";
import type { ButtonProps } from "@/components/ui/button";

interface PlaidKycButtonProps extends Omit<ButtonProps, "onClick" | "disabled"> {
  label?: string;
  onCompleted?: () => void;
}

export function PlaidKycButton({
  label = "Connect bank with Plaid",
  onCompleted,
  variant = "default",
  className,
  ...props
}: PlaidKycButtonProps) {
  const { openPlaid, isLoading } = usePlaidLinkKyc(onCompleted);

  return (
    <Button
      onClick={openPlaid}
      disabled={isLoading}
      variant={variant}
      className={className}
      {...props}
    >
      {isLoading ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Connecting...
        </>
      ) : (
        label
      )}
    </Button>
  );
}

