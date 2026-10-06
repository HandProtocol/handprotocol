"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import { ArrowUpRight, CalendarDays, CircleDot, Heart, MapPin } from "lucide-react";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

const videos = {
  hero: `${basePath}/assets/video/hero.mp4`,
  village: `${basePath}/assets/video/product-2.mp4`,
};

const CONTACT_EMAIL = "cshearer210@gmail.com";

const reveal = {
  hidden: { opacity: 0, y: 28 },
  visible: { opacity: 1, y: 0 },
};

const villageParts = ["Central house", "Yurts", "Tiny homes", "Healing modalities"];

function VideoPlane({
  src,
  className = "",
  poster,
}: {
  src: string;
  className?: string;
  poster?: string;
}) {
  return (
    <video
      className={`video-plane ${className}`}
      src={src}
      poster={poster}
      autoPlay
      muted
      loop
      playsInline
      preload="metadata"
    />
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="section-label">
      <CircleDot size={12} />
      <span>{children}</span>
    </div>
  );
}

export function MysticHeartsPage() {
  const { scrollYProgress } = useScroll();
  const heroScale = useTransform(scrollYProgress, [0, 0.6], [1, 1.12]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.7], [1, 0.42]);

  return (
    <main className="min-h-screen overflow-hidden bg-linen text-ink">
      <nav className="fixed left-0 right-0 top-0 z-50 px-5 py-4 md:px-8">
        <div className="mx-auto flex max-w-7xl items-center justify-between rounded-full border border-white/25 bg-ink/20 px-4 py-3 text-white shadow-soft backdrop-blur-xl">
          <a className="flex items-center gap-2 text-sm font-semibold tracking-[0.18em]" href="#top">
            <Heart size={18} fill="currentColor" />
            MYSTIC HEARTS
          </a>
          <a className="nav-cta" href={`mailto:${CONTACT_EMAIL}`}>
            Inquire
            <ArrowUpRight size={16} />
          </a>
        </div>
      </nav>

      <section id="top" className="hero-section slide">
        <motion.div className="hero-video-wrap" style={{ scale: heroScale, opacity: heroOpacity }}>
          <VideoPlane src={videos.hero} poster={`${basePath}/assets/images/hero-poster.jpg`} />
        </motion.div>
        <div className="hero-shade" />
        <div className="hero-content">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={reveal}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="mx-auto w-full max-w-6xl px-6"
          >
            <div className="hero-kicker">
              <MapPin size={16} />
              <span>Mystic Hearts</span>
              <i>9-acre healing center</i>
            </div>
            <h1 className="hero-title">
              A future village, <span>grounded in the work already beginning.</span>
            </h1>
            <p className="hero-copy">
              A place where people can arrive without performing, receive care without being
              processed, and take part in a small economy of skill, labor, attention, and
              reciprocity.
            </p>
            <div className="hero-notes" aria-label="Village components">
              {villageParts.map((part) => (
                <span key={part}>{part}</span>
              ))}
            </div>
          </motion.div>
        </div>
        <div className="scroll-cue">
          <span />
        </div>
      </section>

      <section id="visit" className="final-cta slide">
        <VideoPlane src={videos.village} />
        <div className="final-cta-shade" />
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={reveal}
          transition={{ duration: 0.75 }}
          className="relative z-10 mx-auto max-w-3xl px-6 text-center text-white"
        >
          <div className="video-wordmark">Fall 2027</div>
          <div className="mx-auto mb-6 flex h-12 w-12 items-center justify-center rounded-full border border-white/25 bg-white/12 backdrop-blur-md">
            <CalendarDays size={22} />
          </div>
          <SectionLabel>Opening season</SectionLabel>
          <h2 className="story-title">Coming fall 2027.</h2>
          <p className="story-copy">
            Nine acres of healing land are taking shape: a central house, yurts, and tiny homes,
            with practitioners holding breathwork, sound, energy work, and somatic practice. The
            first gatherings will be small and in person. If you want to help build it, practice
            here, or simply be there when it opens, reach out.
          </p>
          <a className="btn btn-primary mx-auto mt-8" href={`mailto:${CONTACT_EMAIL}`}>
            Get in touch
            <ArrowUpRight size={18} />
          </a>
          <p className="contact-line">{CONTACT_EMAIL}</p>
        </motion.div>
      </section>
    </main>
  );
}
