import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  ReactNode,
  PropsWithChildren,
} from "react";

type CustomerBottomSlotContextValue = {
  bottomSlot: ReactNode | null;
  setBottomSlot: (node: ReactNode | null) => void;
};

const CustomerBottomSlotContext = createContext<
  CustomerBottomSlotContextValue | undefined
>(undefined);

export function CustomerBottomSlotProvider({ children }: PropsWithChildren<{}>) {
  const [bottomSlot, setBottomSlotState] = useState<ReactNode | null>(null);

  const setBottomSlot = useCallback((node: ReactNode | null) => {
    setBottomSlotState(node);
  }, []);

  const value = useMemo(
    () => ({ bottomSlot, setBottomSlot }),
    [bottomSlot, setBottomSlot]
  );

  return (
    <CustomerBottomSlotContext.Provider value={value}>
      {children}
    </CustomerBottomSlotContext.Provider>
  );
}

export function useCustomerBottomSlot() {
  const context = useContext(CustomerBottomSlotContext);
  if (!context) {
    throw new Error('useCustomerBottomSlot must be used within CustomerBottomSlotProvider');
  }
  return context;
}

