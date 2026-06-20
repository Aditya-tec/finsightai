import type { Metadata } from "next";
import { Geist_Mono, Inter } from "next/font/google";
import CursorGlow from "@/components/CursorGlow";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "RupeeRead",
  description: "Indian market analyst with agentic RAG and citations — RupeeRead",
  icons: {
    icon: "/rupeeread-favicon-white.png",
    apple: "/rupeeread-favicon-white.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body>
        <CursorGlow />
        {children}
      </body>
    </html>
  );
}
