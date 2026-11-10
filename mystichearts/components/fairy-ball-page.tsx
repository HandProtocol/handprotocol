"use client";

import { motion, type Variants } from "framer-motion";
import { ArrowLeft, ArrowUpRight, CalendarDays, Feather, MapPin, Sparkles, Ticket } from "lucide-react";
import Image from "next/image";
import { useEffect, useState, type CSSProperties } from "react";
import { FAIRY_BALL } from "./events";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

const EASE = [0.2, 0.7, 0.2, 1] as const;
const rise: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: (delay: number = 0) => ({ opacity: 1, y: 0, transition: { duration: 0.9, delay, ease: EASE } }),
};

// Stars drifting over the page: x, y in %, size, beat.
const STARS = [
  ["8%", "14%", "14px", "0s"], ["22%", "72%", "9px", "1.4s"], ["44%", "8%", "11px", "2.6s"], ["62%", "88%", "13px", "0.7s"],
  ["78%", "22%", "10px", "3.2s"], ["91%", "64%", "15px", "1.9s"], ["35%", "40%", "7px", "4.1s"], ["70%", "50%", "8px", "2.2s"],
  ["5%", "48%", "9px", "3.7s"], ["52%", "60%", "6px", "0.3s"], ["86%", "8%", "8px", "4.6s"], ["16%", "92%", "12px", "2.9s"],
] as const;

export function FairyBallPage() {
  // The poster shows once it has loaded; until then (or if it is not there) a drawn card stands in.
  const [poster, setPoster] = useState<"loading" | "ready" | "missing">("loading");
  useEffect(() => {
    const probe = new window.Image();
    probe.onload = () => setPoster("ready");
    probe.onerror = () => setPoster("missing");
    probe.src = FAIRY_BALL.poster;
  }, []);
  const posterMissing = poster !== "ready";
  const hasTickets = FAIRY_BALL.partifulUrl.length > 0;

  return (
    <main className="fb">
      {!posterMissing && <img className="fb-ambient" src={FAIRY_BALL.poster} alt="" aria-hidden="true" />}
      <div className="fb-shade" aria-hidden="true" />
      <div className="fb-stars" aria-hidden="true">
        {STARS.map(([x, y, s, d], index) => (
          <i key={index} style={{ "--x": x, "--y": y, "--s": s, "--d": d } as CSSProperties} />
        ))}
      </div>

      <header className="fb-head">
        <a className="fb-back" href={`${basePath}/`}>
          <ArrowLeft size={16} aria-hidden="true" />
          <Image src={`${basePath}/assets/images/logo-gold.png`} alt="Mystic Hearts Healing Collective" width={92} height={92} className="fb-logo" />
        </a>
        <span className="fb-place">East Austin, Texas</span>
      </header>

      <div className="fb-grid">
        <motion.figure className="fb-poster" variants={rise} initial="hidden" animate="visible" custom={0.1}>
          {posterMissing ? (
            <div className="fb-poster-fallback" role="img" aria-label={FAIRY_BALL.title}>
              <span>The 1111</span>
              <strong>Immaculate</strong>
              <em>Fairy Ball</em>
            </div>
          ) : (
            <img src={FAIRY_BALL.poster} alt={`${FAIRY_BALL.title} poster: ${FAIRY_BALL.tagline} ${FAIRY_BALL.dateLine}.`} />
          )}
        </motion.figure>

        <section className="fb-words" aria-labelledby="fb-title">
          <motion.p className="fb-kicker" variants={rise} initial="hidden" animate="visible" custom={0.2}>
            <span className="soon-glow" aria-hidden="true" />
            {FAIRY_BALL.dateLine}
          </motion.p>
          <motion.h1 id="fb-title" className="fb-title" variants={rise} initial="hidden" animate="visible" custom={0.3}>
            <span className="fb-title-pre">The 1111</span>
            Immaculate <em>Fairy Ball</em>
          </motion.h1>
          <motion.p className="fb-tagline" variants={rise} initial="hidden" animate="visible" custom={0.42}>
            {FAIRY_BALL.tagline} <span>{FAIRY_BALL.motto}</span>
          </motion.p>

          <motion.ul className="fb-features" variants={rise} initial="hidden" animate="visible" custom={0.52}>
            {FAIRY_BALL.features.map((feature) => (
              <li key={feature}>
                <Sparkles size={13} aria-hidden="true" />
                {feature}
              </li>
            ))}
          </motion.ul>

          <motion.dl className="fb-facts" variants={rise} initial="hidden" animate="visible" custom={0.62}>
            <div>
              <dt>
                <CalendarDays size={16} aria-hidden="true" /> When
              </dt>
              <dd>{FAIRY_BALL.dateLine}. Doors and times on the ticket page.</dd>
            </div>
            <div>
              <dt>
                <MapPin size={16} aria-hidden="true" /> Where
              </dt>
              <dd>On the land in East Austin. The address comes with your ticket.</dd>
            </div>
            <div>
              <dt>
                <Feather size={16} aria-hidden="true" /> The spirit
              </dt>
              <dd>A sober celebration, like every gathering on the land: cacao and water, no alcohol or substances. Come dressed for the fairy realm.</dd>
            </div>
          </motion.dl>

          <motion.div className="fb-actions" variants={rise} initial="hidden" animate="visible" custom={0.74}>
            {hasTickets ? (
              <a className="btn btn-gold" href={FAIRY_BALL.partifulUrl} target="_blank" rel="noopener noreferrer">
                <Ticket size={18} aria-hidden="true" />
                Get your ticket on Partiful
                <ArrowUpRight size={16} aria-hidden="true" />
              </a>
            ) : (
              <span className="btn btn-gold is-waiting" aria-disabled="true">
                <Ticket size={18} aria-hidden="true" />
                Tickets open soon on Partiful
              </span>
            )}
            <a className="btn btn-glass" href={FAIRY_BALL.waiverHref}>
              <Feather size={18} aria-hidden="true" />
              Sign the waiver
            </a>
          </motion.div>
          <motion.p className="fb-note" variants={rise} initial="hidden" animate="visible" custom={0.82}>
            Everyone signs a short waiver before the night. It takes about three minutes.
          </motion.p>
          <motion.p className="fb-presenters" variants={rise} initial="hidden" animate="visible" custom={0.9}>
            {FAIRY_BALL.presenters}
          </motion.p>
        </section>
      </div>
    </main>
  );
}
