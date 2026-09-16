import type { Metadata, Viewport } from "next";
import { Vazirmatn } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "@/components/ui/sonner";
import { Providers } from "@/components/providers";

const vazirmatn = Vazirmatn({
  subsets: ["arabic", "latin"],
  variable: "--font-vazirmatn",
  display: "swap",
});

export const metadata: Metadata = {
  title: "سامانه مدیریت کلینیک | CRM درمانگاه",
  description:
    "سامانه جامع مدیریت ارتباط با مراجعین و فرآیندهای کلینیک و مطب — نوبت‌دهی، پرونده مراجعین، مالی، لیدها و گزارش‌ها",
  keywords: ["CRM", "کلینیک", "مطب", "نوبت‌دهی", "مدیریت مراجعین", "پزشکی"],
  authors: [{ name: "Clinic CRM" }],
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "CRM کلینیک",
  },
  icons: {
    icon: "/icon-192.png",
    apple: "/icon-192.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#0d9488",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fa" dir="rtl" suppressHydrationWarning>
      <body
        className={`${vazirmatn.variable} font-sans antialiased bg-background text-foreground`}
      >
        <Providers>
          {children}
          <Toaster />
          <SonnerToaster position="top-center" richColors />
        </Providers>
      </body>
    </html>
  );
}
