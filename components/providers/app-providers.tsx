"use client";

import { type PropsWithChildren } from "react";

import { CartProvider } from "@/context/cart-context";
import { OrderFlowProvider } from "@/context/order-flow-context";

export function AppProviders({ children }: PropsWithChildren) {
  return (
    <CartProvider>
      <OrderFlowProvider>{children}</OrderFlowProvider>
    </CartProvider>
  );
}
