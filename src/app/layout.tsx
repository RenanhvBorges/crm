import type { Metadata } from "next";
import { Prata, Manrope } from "next/font/google";
import "./globals.css";

const prata = Prata({
  variable: "--font-prata",
  weight: "400",
  subsets: ["latin"],
});

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Oxford CRM",
  description: "CRM interno da Oxford Soluções Digitais",
  icons: {
    icon: "/brand/logo-oxford-mark-v2-on-blue.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className={`${prata.variable} ${manrope.variable} h-full`}>
      <body className="min-h-full flex flex-col bg-bg-page text-fg-1">
        {children}
      </body>
    </html>
  );
}
