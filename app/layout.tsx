'use client';
import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import { TonConnectUIProvider } from "@tonconnect/ui-react";
import { Analytics } from "@vercel/analytics/next"

const geist = Geist({ subsets: ["latin"] });

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={geist.className}>
        <TonConnectUIProvider manifestUrl="https://magic-ton.vercel.app/tonconnect-manifest.json">
          {children}
        </TonConnectUIProvider>
      </body>
    </html>
  );
}