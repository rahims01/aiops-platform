import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Sidebar } from "@/components/Sidebar";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AIOps Platform | Axway SecureTransport",
  description: "ML-powered anomaly detection, failure prediction, and incident correlation for Axway SecureTransport file transfers",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-gray-50 dark:bg-gray-950">
        <Sidebar />
        <div className="pl-64">
          <main className="min-h-screen">{children}</main>
        </div>
      </body>
    </html>
  );
}
