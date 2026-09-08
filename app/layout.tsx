import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Owed — Personal Warranty Vault & Claims",
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
      <body className={`${plusJakarta.className} bg-[#090b10] text-slate-100 antialiased selection:bg-slate-700 selection:text-white`}>
        {children}
      </body>
    </html>
  );
}

