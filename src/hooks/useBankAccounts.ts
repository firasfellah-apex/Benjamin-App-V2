import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getBankAccounts, deleteBankAccount, type BankAccount } from "@/db/api";
import { useAuth } from "@/contexts/AuthContext";

export function useBankAccounts() {
  const { user } = useAuth();
  const userId = user?.id;

  const query = useQuery<BankAccount[]>({
    queryKey: ["bank-accounts", userId],
    queryFn: async () => {
      if (!userId) return [];
      return await getBankAccounts();
    },
    enabled: !!userId,
    staleTime: 0, // Always consider data stale to ensure fresh fetches
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    refetchOnReconnect: true,
  });

  const bankAccounts = query.data ?? [];
  const hasAnyBank = bankAccounts.length > 0;

  return {
    ...query,
    bankAccounts,
    hasAnyBank,
  };
}

// Helper hook to invalidate bank accounts cache
export function useInvalidateBankAccounts() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return async () => {
    await queryClient.invalidateQueries({ queryKey: ["bank-accounts", user?.id] });
    await queryClient.refetchQueries({ queryKey: ["bank-accounts", user?.id] });
  };
}

// Helper function to disconnect a bank account
export async function disconnectBankAccount(bankAccountId: string): Promise<boolean> {
  return await deleteBankAccount(bankAccountId);
}

