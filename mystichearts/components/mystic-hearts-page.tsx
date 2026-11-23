"use client";

import { motion, useReducedMotion, type Variants } from "framer-motion";
import { ArrowUpRight, CalendarDays, Sparkles } from "lucide-react";
import Image from "next/image";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { AlmanacSheet } from "./almanac-sheet";
import type { Door } from "./contact-modal";
import { HappeningSoon } from "./happening-soon";
import { CHAPTERS, type ChapterKey } from "./copy";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";
const asset = (path: string) => `${basePath}${path}`;

const CONTACT_EMAIL = "mysticheartshealing@gmail.com";

const EASE = [0.2, 0.7, 0.2, 1] as const;
const rise: Variants = {
  hidden: { opacity: 0, y: 22 },
  visible: (delay: number = 0) => ({ opacity: 1, y: 0, transition: { duration: 0.9, delay, ease: EASE } }),
};

// The pergola loop. Phones in Low Power Mode (and some data savers) refuse muted autoplay and
// draw their own play button over the video, a button that does nothing here because the stage
// sits on top of it. So the video stays invisible until it is really playing; until then the
// poster shows as a plain picture underneath, and the first touch anywhere tries once more.
function HeroVideo() {
  const ref = useRef<HTMLVideoElement>(null);
  const still = useReducedMotion();
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    video.muted = true;
    if (still) {
      video.pause();
      setPlaying(false);
      return;
    }
    const tryPlay = () => {
      video.play().catch(() => {
        /* refused: the poster stays */
      });
    };
    const onPlaying = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    video.addEventListener("playing", onPlaying);
    video.addEventListener("timeupdate", onPlaying);
    video.addEventListener("pause", onPause);
    // autoplay may have started before this ran, so its "playing" event is already gone
    if (!video.paused && video.currentTime > 0) setPlaying(true);
    tryPlay();
    const retry = () => {
      if (video.paused) tryPlay();
    };
    window.addEventListener("pointerdown", retry, { once: true, passive: true });
    window.addEventListener("touchstart", retry, { once: true, passive: true });
    return () => {
      video.removeEventListener("playing", onPlaying);
      video.removeEventListener("timeupdate", onPlaying);
      video.removeEventListener("pause", onPause);
      window.removeEventListener("pointerdown", retry);
      window.removeEventListener("touchstart", retry);
    };
  }, [still]);

  const poster = asset("/assets/images/hero-pergola-poster.jpg");
  return (
    <>
      <div className="hero-poster" style={{ backgroundImage: `url(${poster})` }} aria-hidden="true" />
      <video
        ref={ref}
        className="hero-video"
        data-playing={playing ? "true" : "false"}
        autoPlay={!still}
        muted
        loop
        playsInline
        disablePictureInPicture
        controls={false}
        preload="auto"
        tabIndex={-1}
        aria-hidden="true"
      >
        <source src={asset("/assets/video/hero-pergola.webm")} type="video/webm" />
        <source src={asset("/assets/video/hero-pergola.mp4")} type="video/mp4" />
      </video>
    </>
  );
}

// Star points around the headline: position in the headline's box, size, and when each wakes.
const TWINKLES = [
  { x: "-4%", y: "8%", s: "14px", d: "0.4s" },
  { x: "97%", y: "22%", s: "11px", d: "2.1s" },
  { x: "88%", y: "96%", s: "15px", d: "3.6s" },
  { x: "6%", y: "78%", s: "9px", d: "5.2s" },
  { x: "52%", y: "-6%", s: "8px", d: "6.4s" },
] as const;

// Fireflies drifting over the stage itself, not just the chapter row. They sit under the words
// and the buttons (z-index 1, before the content in paint order) and in the band between the
// header and the doors, so they never cover a control. Each one wanders on its own clock.
const FLIES = [
  { x: "12%", y: "30%", dx: "9vw", dy: "-6vh", tx: "7.5s", ty: "9.2s", b: "4.1s", d: "-1s" },
  { x: "82%", y: "22%", dx: "-11vw", dy: "7vh", tx: "8.8s", ty: "7.1s", b: "5.3s", d: "-3s" },
  { x: "70%", y: "54%", dx: "-8vw", dy: "-9vh", tx: "10.2s", ty: "8.4s", b: "3.7s", d: "-6s" },
  { x: "24%", y: "62%", dx: "12vw", dy: "-5vh", tx: "9.4s", ty: "11s", b: "4.6s", d: "-2s" },
  { x: "48%", y: "16%", dx: "-7vw", dy: "8vh", tx: "11.6s", ty: "9.8s", b: "5.9s", d: "-4.5s" },
  { x: "90%", y: "44%", dx: "-10vw", dy: "-6vh", tx: "8.1s", ty: "10.6s", b: "4.4s", d: "-7s" },
  { x: "6%", y: "48%", dx: "8vw", dy: "9vh", tx: "12.4s", ty: "8.9s", b: "6.2s", d: "-5s" },
] as const;

function HeroFireflies() {
  return (
    <div className="hero-flies" aria-hidden="true">
      {FLIES.map((f, index) => (
        <span
          key={index}
          className="hero-fly"
          style={{ "--x": f.x, "--y": f.y, "--dx": f.dx, "--dy": f.dy, "--tx": f.tx, "--ty": f.ty, "--b": f.b, "--d": f.d } as CSSProperties}
        >
          <span>
            <i />
          </span>
        </span>
      ))}
    </div>
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
      <HeroFireflies />

      <header className="stage-head">
        <motion.a href="#" className="brand" variants={rise} initial="hidden" animate="visible" custom={0.1}>
          <Image src={asset("/assets/images/logo-gold.png")} alt="Mystic Hearts Healing Collective" width={132} height={132} priority className="brand-mark" />
        </motion.a>
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
          <span className="headline-text">
            A divine dream, <em>made real</em> in East Austin.
          </span>
          {/* the same words again, stacked exactly on top, carrying only the travelling glint */}
          <span className="headline-glint" aria-hidden="true">
            A divine dream, <em>made real</em> in East Austin.
          </span>
          <span className="headline-twinkles" aria-hidden="true">
            {TWINKLES.map((t, index) => (
              <i key={index} style={{ "--x": t.x, "--y": t.y, "--s": t.s, "--d": t.d } as CSSProperties} />
            ))}
          </span>
        </motion.h1>
        <motion.p className="lede" variants={rise} initial="hidden" animate="visible" custom={0.7}>
          A sober, interfaith home where people gather to heal, to practice, and to live more connected to the land and to each other.
        </motion.p>
        <motion.div className="doors" variants={rise} initial="hidden" animate="visible" custom={0.9}>
          <button className="btn btn-gold" type="button" onClick={() => openDoor("whatson")}>
            <Sparkles size={18} />
            <span>
              What&apos;s on<span className="long-only"> at the land</span>
            </span>
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

      <AlmanacSheet
        chapter={chapter}
        door={door}
        onChapter={openChapter}
        onDoor={openDoor}
        onClose={() => {
          setChapter(null);
          setDoor(null);
        }}
        fallbackEmail={CONTACT_EMAIL}
      />
    </main>
  );
}
