import type { Metadata } from "next";
import { Alegreya_Sans, Alegreya_Sans_SC, Marcellus } from "next/font/google";
import "./globals.css";

// The body face: Alegreya Sans, the humanist partner to the display face. It has no 600, so
// semibold text renders at 700.
const sans = Alegreya_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
  weight: ["400", "500", "700"],
  style: ["normal", "italic"],
});

// The almanac sheet's small capitals (kickers, labels, the ribbons and the doors).
const smallCaps = Alegreya_Sans_SC({
  subsets: ["latin"],
  variable: "--font-sc",
  display: "swap",
  weight: ["500", "700"],
});

// The display face, for every heading on every page: Marcellus, a clean Roman inscriptional
// face. It has one weight and no italic, so globals.css turns font synthesis off and headings
// render in the true regular. Swap the face here; everything reads --font-display.
const display = Marcellus({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
  weight: "400",
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
      <body className={`${sans.variable} ${display.variable} ${smallCaps.variable}`}>{children}</body>
    </html>
  );
}
