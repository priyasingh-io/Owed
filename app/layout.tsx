import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Owed — Never lose a warranty. Never leave money unclaimed.",
  description:
    "Track purchases, auto-extract warranties from receipts, receive proactive expiry alerts, and file claims effortlessly.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="bg-[#090d16] text-[#f8fafc] antialiased">
        {children}
      </body>
    </html>
  );
}
