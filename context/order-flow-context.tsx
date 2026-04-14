"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren
} from "react";

import type { CheckoutDraft, SubmittedOrderRecap } from "@/types/webapp";

type OrderFlowStore = {
  drafts: Record<string, CheckoutDraft>;
  confirmations: Record<string, SubmittedOrderRecap>;
};

type OrderFlowContextValue = {
  getDraft: (tenantId: string) => CheckoutDraft;
  saveDraft: (tenantId: string, draft: Partial<CheckoutDraft>) => void;
  clearDraft: (tenantId: string) => void;
  getConfirmation: (tenantId: string) => SubmittedOrderRecap | null;
  setConfirmation: (tenantId: string, order: SubmittedOrderRecap) => void;
  clearConfirmation: (tenantId: string) => void;
  isHydrated: boolean;
};

const STORAGE_KEY = "restaurant-webapp-flow-v1";

const EMPTY_DRAFT: CheckoutDraft = {
  customer_name: "",
  customer_phone: "",
  requested_time: "",
  notes: ""
};

const OrderFlowContext = createContext<OrderFlowContextValue | null>(null);

function readStorage(): OrderFlowStore {
  if (typeof window === "undefined") {
    return { drafts: {}, confirmations: {} };
  }

  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return { drafts: {}, confirmations: {} };
  }

  try {
    const parsed = JSON.parse(raw) as Partial<OrderFlowStore>;
    return {
      drafts: parsed.drafts ?? {},
      confirmations: parsed.confirmations ?? {}
    };
  } catch {
    return { drafts: {}, confirmations: {} };
  }
}

export function OrderFlowProvider({ children }: PropsWithChildren) {
  const [store, setStore] = useState<OrderFlowStore>({ drafts: {}, confirmations: {} });
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    setStore(readStorage());
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    if (!isHydrated) {
      return;
    }

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  }, [isHydrated, store]);

  const value = useMemo<OrderFlowContextValue>(
    () => ({
      getDraft: (tenantId) => store.drafts[tenantId] ?? EMPTY_DRAFT,
      saveDraft: (tenantId, draft) => {
        setStore((current) => ({
          ...current,
          drafts: {
            ...current.drafts,
            [tenantId]: {
              ...(current.drafts[tenantId] ?? EMPTY_DRAFT),
              ...draft
            }
          }
        }));
      },
      clearDraft: (tenantId) => {
        setStore((current) => ({
          ...current,
          drafts: Object.fromEntries(
            Object.entries(current.drafts).filter(([key]) => key !== tenantId)
          )
        }));
      },
      getConfirmation: (tenantId) => store.confirmations[tenantId] ?? null,
      setConfirmation: (tenantId, order) => {
        setStore((current) => ({
          ...current,
          confirmations: {
            ...current.confirmations,
            [tenantId]: order
          }
        }));
      },
      clearConfirmation: (tenantId) => {
        setStore((current) => ({
          ...current,
          confirmations: Object.fromEntries(
            Object.entries(current.confirmations).filter(([key]) => key !== tenantId)
          )
        }));
      },
      isHydrated
    }),
    [isHydrated, store]
  );

  return <OrderFlowContext.Provider value={value}>{children}</OrderFlowContext.Provider>;
}

export function useOrderFlowContext() {
  const context = useContext(OrderFlowContext);

  if (!context) {
    throw new Error("useOrderFlowContext must be used inside OrderFlowProvider.");
  }

  return context;
}
