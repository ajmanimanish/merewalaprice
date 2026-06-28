import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans, Instrument_Serif } from "next/font/google";
import PWARegistration from "@/components/PWARegistration";
import "./globals.css";

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-plus-jakarta",
  display: "swap",
});

const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  variable: "--font-instrument-serif",
  weight: ["400"],
  style: ["normal", "italic"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "MereWalaPrice - Hyperlocal Price Comparison",
  description: "Bhopal's hyperlocal price comparison platform. Connect with local dealers for appliances and electronics, and get prices lower than online!",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "MereWalaPrice",
  },
};

export const viewport: Viewport = {
  themeColor: "#F0743E",
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
        className={`${plusJakartaSans.variable} ${instrumentSerif.variable} font-sans bg-slate-100 min-h-screen antialiased flex flex-col justify-start items-center`}
      >
        <div className="w-full max-w-[420px] min-h-screen bg-[#FAFAF8] flex flex-col relative border-x border-[#EBEBEB] shadow-sm">
          {children}
          <PWARegistration />
        </div>
      </body>
    </html>
  );
}
