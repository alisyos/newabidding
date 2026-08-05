import type { Metadata } from "next";
import "./globals.css";
import { Header } from "@/components/layout/header";
import { PointsHydrator } from "@/components/providers/points-hydrator";
import { ToastProvider } from "@/components/providers/toast-provider";

export const metadata: Metadata = {
  title: "Sample Top",
  description: "Sample project with top navigation",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className="antialiased">
        <PointsHydrator />
        <Header />
        <main>
          {children}
        </main>
        <ToastProvider />
      </body>
    </html>
  );
}
