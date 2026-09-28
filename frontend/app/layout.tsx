import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";
import FetchInterceptor from "./FetchInterceptor";
import CookieBanner from "@/components/CookieBanner";
import Footer from "@/components/Footer";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ProvEEndo - Gestión Logística",
  description: "Plataforma de gestión para distribuidoras y tiendas de barrio.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white">
        <FetchInterceptor />
        <div className="flex-1">
          {children}
        </div>
        <Footer />
        <CookieBanner />
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
