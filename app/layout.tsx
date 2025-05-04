// app/layout.tsx
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers"; // <-- Import the Providers wrapper

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Rideway - Motorcycle Maintenance Tracker",
  description: "Track and manage maintenance for your motorcycles",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
