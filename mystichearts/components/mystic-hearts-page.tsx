"use client";

import { motion, useReducedMotion, type Variants } from "framer-motion";
import { ArrowUpRight, CalendarDays, Sparkles } from "lucide-react";
import Image from "next/image";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { ContactModal, type Door } from "./contact-modal";
import { HappeningSoon } from "./happening-soon";
import { CHAPTERS, type ChapterKey } from "./copy";
import { StorySheet } from "./story-sheet";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";
const asset = (path: string) => `${basePath}${path}`;

const CONTACT_EMAIL = "mysticheartshealing@gmail.com";

const EASE = [0.2, 0.7, 0.2, 1] as const;
const rise: Variants = {
  hidden: { opacity: 0, y: 22 },
  visible: (delay: number = 0) => ({ opacity: 1, y: 0, transition: { duration: 0.9, delay, ease: EASE } }),
};

function HeroVideo() {
  const ref = useRef<HTMLVideoElement>(null);
  const still = useReducedMotion();

  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    video.muted = true;
    if (still) {
      video.pause();
      return;
    }
    video.play().catch(() => {
      /* autoplay refused: the poster stays */
    });
  }, [still]);

  return (
    <video
      ref={ref}
      className="hero-video"
      poster={asset("/assets/images/hero-pergola-poster.jpg")}
      autoPlay={!still}
      muted
      loop
      playsInline
      preload="auto"
      aria-hidden="true"
    >
      <source src={asset("/assets/video/hero-pergola.webm")} type="video/webm" />
      <source src={asset("/assets/video/hero-pergola.mp4")} type="video/mp4" />
    </video>
  );
}

export function MysticHeartsPage() {
  const [door, setDoor] = useState<Door | null>(null);
  const [chapter, setChapter] = useState<ChapterKey | null>(null);
  const openDoor = (next: Door) => {
    setChapter(null);
    setDoor(next);
  };
  const openChapter = (next: ChapterKey) => {
    setDoor(null);
    setChapter(next);
  };

  return (
    <main className="stage" data-sheet={door !== null || chapter !== null ? "open" : "closed"}>
      <HeroVideo />
      <div className="stage-shade" aria-hidden="true" />
      <div className="stage-grain" aria-hidden="true" />

      <header className="stage-head">
        <motion.a href="#" className="brand" variants={rise} initial="hidden" animate="visible" custom={0.1}>
          <Image src={asset("/assets/images/logo-gold.png")} alt="Mystic Hearts Healing Collective" width={132} height={132} priority className="brand-mark" />
        </motion.a>
        <motion.nav className="head-nav" aria-label="About the collective" variants={rise} initial="hidden" animate="visible" custom={0.2}>
          {CHAPTERS.map((item) => (
            <button key={item.key} type="button" className="head-link" onClick={() => openChapter(item.key)}>
              {item.label}
            </button>
          ))}
        </motion.nav>
        <motion.div className="head-right" variants={rise} initial="hidden" animate="visible" custom={0.25}>
          <span className="brand-place">East Austin, Texas</span>
          <button className="btn btn-glass btn-small" type="button" onClick={() => openDoor("hello")}>
            Get in touch
            <ArrowUpRight size={16} />
          </button>
        </motion.div>
      </header>

      <section className="stage-center">
        <motion.p className="kicker" variants={rise} initial="hidden" animate="visible" custom={0.35}>
          Ten acres of healing land
        </motion.p>
        <motion.h1 className="headline" variants={rise} initial="hidden" animate="visible" custom={0.5}>
          A divine dream, <em>made real</em> in East Austin.
        </motion.h1>
        <motion.p className="lede" variants={rise} initial="hidden" animate="visible" custom={0.7}>
          A sober, interfaith home where people gather to heal, to practice, and to live more connected to the land and to each other.
        </motion.p>
        <motion.div className="doors" variants={rise} initial="hidden" animate="visible" custom={0.9}>
          <button className="btn btn-gold" type="button" onClick={() => openDoor("whatson")}>
            <Sparkles size={18} />
            What&apos;s on at the land
          </button>
          <button className="btn btn-glass" type="button" onClick={() => openDoor("visit")}>
            <CalendarDays size={18} />
            Visit the land
          </button>
        </motion.div>
        <HappeningSoon onOpen={() => openDoor("whatson")} />
      </section>

      <motion.nav className="stage-foot" aria-label="About the collective" variants={rise} initial="hidden" animate="visible" custom={1.15}>
        {CHAPTERS.map((item, index) => (
          <button key={item.key} type="button" className="chapter-link" onClick={() => openChapter(item.key)} style={{ "--i": index } as CSSProperties}>
            <span className="chapter-label">
              {item.label}
              <span className="firefly" aria-hidden="true">
                <span className="firefly-y">
                  <i />
                </span>
              </span>
            </span>
          </button>
        ))}
      </motion.nav>

      <StorySheet chapter={chapter} onClose={() => setChapter(null)} onSwitch={setChapter} onDoor={openDoor} />
      <ContactModal door={door} onClose={() => setDoor(null)} onSwitch={setDoor} onChapter={openChapter} fallbackEmail={CONTACT_EMAIL} />
    </main>
  );
}
