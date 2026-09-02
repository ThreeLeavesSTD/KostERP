import type { Metadata, Viewport } from "next";
import "./globals.css";
import { NotificationProvider } from "@/components/ui/notification-provider";
import { AuthProvider } from "@/lib/auth-context";

export const metadata: Metadata = {
  title: "ERP Operasional Kost Pro",
  description: "Platform Manajemen Operasional Kost, Inventaris Kamar, Token PLN & Penagihan Sewa",
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  themeColor: "#2563eb",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased selection:bg-blue-500 selection:text-white">
        <AuthProvider>
          <NotificationProvider>{children}</NotificationProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
