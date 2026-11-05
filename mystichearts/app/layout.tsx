import type { Metadata } from "next";
import { Cormorant_Garamond, Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://mysticheartshealing.com";
const DESCRIPTION =
  "Ten acres of healing land in East Austin: a sober, interfaith home where people gather to heal, to practice, and to live more connected to the land and to each other.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "Mystic Hearts Healing Collective | East Austin",
  description: DESCRIPTION,
  alternates: { canonical: "/" },
  openGraph: { type: "website", url: "/", siteName: "Mystic Hearts Healing Collective", title: "Mystic Hearts Healing Collective", description: DESCRIPTION, images: ["/assets/images/hero-pergola-poster.jpg"] },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${cormorant.variable}`}>{children}</body>
    </html>
  );
}
