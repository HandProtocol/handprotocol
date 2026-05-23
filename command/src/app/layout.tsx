import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["200", "300", "400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "HAND Command Center",
  description:
    "Operator bridge for HAND Protocol's grant program. Holistic Approach to Nurture and Develop.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} h-full antialiased`}
      data-theme="hud-dark"
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
