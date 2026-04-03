'use client';
import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import { TonConnectUIProvider } from "@tonconnect/ui-react";

const geist = Geist({ subsets: ["latin"] });

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={geist.className}>
        <TonConnectUIProvider manifestUrl="https://raw.githubusercontent.com/ton-community/tutorials/main/03-client/test/public/tonconnect-manifest.json">
          {children}
        </TonConnectUIProvider>
      </body>
    </html>
  );
}