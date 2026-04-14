"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren
} from "react";

import type { CartItem, MenuItem } from "@/types/webapp";

type TenantCart = {
  items: CartItem[];
};

type CartStore = Record<string, TenantCart>;

type CartContextValue = {
  getItems: (tenantId: string) => CartItem[];
  addItem: (tenantId: string, item: MenuItem) => void;
  updateQuantity: (tenantId: string, sku: string, quantity: number) => void;
  removeItem: (tenantId: string, sku: string) => void;
  clearCart: (tenantId: string) => void;
  getCount: (tenantId: string) => number;
  getSubtotal: (tenantId: string) => number;
  isHydrated: boolean;
};

const STORAGE_KEY = "restaurant-webapp-cart-v1";
const CartContext = createContext<CartContextValue | null>(null);

function readStorage() {
  if (typeof window === "undefined") {
    return {};
  }

  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return {};
  }

  try {
    return JSON.parse(raw) as CartStore;
  } catch {
    return {};
  }
}

export function CartProvider({ children }: PropsWithChildren) {
  const [carts, setCarts] = useState<CartStore>({});
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    setCarts(readStorage());
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    if (!isHydrated) {
      return;
    }

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(carts));
  }, [carts, isHydrated]);

  const value = useMemo<CartContextValue>(
    () => ({
      getItems: (tenantId) => carts[tenantId]?.items ?? [],
      addItem: (tenantId, item) => {
        setCarts((current) => {
          const existingItems = current[tenantId]?.items ?? [];
          const match = existingItems.find((entry) => entry.sku === item.sku);

          const nextItems = match
            ? existingItems.map((entry) =>
                entry.sku === item.sku
                  ? { ...entry, quantity: entry.quantity + 1 }
                  : entry
              )
            : [
                ...existingItems,
                {
                  sku: item.sku,
                  name: item.name,
                  price: item.price,
                  photo_url: item.photo_url,
                  category: item.category,
                  quantity: 1
                }
              ];

          return {
            ...current,
            [tenantId]: {
              items: nextItems
            }
          };
        });
      },
      updateQuantity: (tenantId, sku, quantity) => {
        setCarts((current) => {
          const nextItems = (current[tenantId]?.items ?? [])
            .map((item) => (item.sku === sku ? { ...item, quantity } : item))
            .filter((item) => item.quantity > 0);

          return {
            ...current,
            [tenantId]: {
              items: nextItems
            }
          };
        });
      },
      removeItem: (tenantId, sku) => {
        setCarts((current) => ({
          ...current,
          [tenantId]: {
            items: (current[tenantId]?.items ?? []).filter((item) => item.sku !== sku)
          }
        }));
      },
      clearCart: (tenantId) => {
        setCarts((current) => ({
          ...current,
          [tenantId]: {
            items: []
          }
        }));
      },
      getCount: (tenantId) =>
        (carts[tenantId]?.items ?? []).reduce((sum, item) => sum + item.quantity, 0),
      getSubtotal: (tenantId) =>
        (carts[tenantId]?.items ?? []).reduce((sum, item) => sum + item.price * item.quantity, 0),
      isHydrated
    }),
    [carts, isHydrated]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCartContext() {
  const context = useContext(CartContext);

  if (!context) {
    throw new Error("useCartContext must be used inside CartProvider.");
  }

  return context;
}
