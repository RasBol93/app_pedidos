import type { Metadata } from "next";
import { type PropsWithChildren } from "react";

import { AppProviders } from "@/components/providers/app-providers";

import "./globals.css";

export const metadata: Metadata = {
  title: "Restaurant Web-App V1",
  description: "Mobile-first web-app para pedidos pickup por tenant."
};

export default function RootLayout({ children }: PropsWithChildren) {
  return (
    <html lang="es">
      <body>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
