import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { SidenotesProvider } from "@/components/providers/SidenotesProvider";
import "./globals.css";
import "sidenotes/dist/sidenotes.css";
import "@/styles/highlights.css";

const defaultUrl = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(defaultUrl),
  title: "Next.js and Supabase Starter Kit",
  description: "The fastest way to build apps with Next.js and Supabase",
};

const geistSans = Geist({
  variable: "--font-geist-sans",
  display: "swap",
  subsets: ["latin"],
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.className} antialiased`}>
        <SidenotesProvider>
          {children}
        </SidenotesProvider>
      </body>
    </html>
  );
}
