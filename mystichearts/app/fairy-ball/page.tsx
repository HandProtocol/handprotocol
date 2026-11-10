import type { Metadata } from "next";
import { FairyBallPage } from "@/components/fairy-ball-page";
import { FAIRY_BALL } from "@/components/events";

const DESCRIPTION = `${FAIRY_BALL.tagline} ${FAIRY_BALL.motto} ${FAIRY_BALL.dateLine}, on the land in East Austin.`;

export const metadata: Metadata = {
  title: `${FAIRY_BALL.title} | Mystic Hearts`,
  description: DESCRIPTION,
  alternates: { canonical: "/fairy-ball/" },
  openGraph: {
    type: "website",
    url: "/fairy-ball/",
    siteName: "Mystic Hearts Healing Collective",
    title: FAIRY_BALL.title,
    description: DESCRIPTION,
    images: ["/assets/images/fairy-ball-poster.jpg"],
  },
};

export default function FairyBall() {
  return <FairyBallPage />;
}
