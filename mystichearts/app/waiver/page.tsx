import type { Metadata } from "next";
import { WaiverEmbed } from "@/components/waiver/waiver-embed";

export const metadata: Metadata = {
  title: "Waivers and agreements | Mystic Hearts",
  description: "Sign Mystic Hearts' release, community agreements and photo choice before you come to the land. About three minutes.",
  alternates: { canonical: "/waiver/" },
  robots: { index: false, follow: true },
};

export default function Waiver() {
  return <WaiverEmbed />;
}
