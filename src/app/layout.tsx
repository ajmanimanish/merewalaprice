import type { Metadata, Viewport } from "next";
import { Inter, Baloo_2 } from "next/font/google";
import PWARegistration from "@/components/PWARegistration";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const baloo = Baloo_2({
  subsets: ["latin"],
  variable: "--font-baloo-2",
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "MereWalaPrice - Bhopal ka sabse sahi price",
  description: "Bhopal's hyperlocal price comparison platform. Connect with local dealers for appliances and electronics, and get prices lower than Amazon & Flipkart!",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "MereWalaPrice",
  },
};

export const viewport: Viewport = {
  themeColor: "#FF6B00",
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
    <html lang="en">
      <head>
        {/* Apple touch icon */}
        <link rel="apple-touch-icon" href="/icon-192.png" />
      </head>
      <body
        className={`${inter.variable} ${baloo.variable} font-sans bg-gradient-to-tr from-orange-50 via-slate-100 to-orange-100 min-h-screen antialiased flex flex-col justify-start items-center`}
      >
        <div className="w-full max-w-[420px] min-h-screen bg-white shadow-2xl flex flex-col relative">
          {children}
          <PWARegistration />
        </div>
      </body>
    </html>
  );
}
