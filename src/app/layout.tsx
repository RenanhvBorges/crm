import type { Metadata } from "next";
import { Montserrat } from "next/font/google";
import "./globals.css";

const montserrat = Montserrat({
  variable: "--font-montserrat",
  weight: ["400", "700"],
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
    <html lang="pt-BR" className={`${montserrat.variable} h-full`}>
      <body className="min-h-full flex flex-col bg-bg-page text-fg-1">
        {children}
      </body>
    </html>
  );
}
