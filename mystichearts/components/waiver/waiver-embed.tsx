"use client";

import { ArrowLeft } from "lucide-react";
import Image from "next/image";
import Script from "next/script";

// /waiver for now: the collective's GoHighLevel waiver, framed in the site's own look. The
// form's inside is styled in GoHighLevel's builder (an iframe from its domain; our CSS cannot
// reach it). The link comes from NEXT_PUBLIC_WAIVER_EMBED_URL (.env.production); with none set,
// the page says how to get the waiver by email. The Kohsi-backed flow (waiver-page.tsx, texts in
// waivers/forms.mjs) is parked until the collective wants signatures in its own system.

const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";
const EMBED_URL = process.env.NEXT_PUBLIC_WAIVER_EMBED_URL || "";
const CONTACT = "mysticheartshealing@gmail.com";

export function WaiverEmbed() {
  return (
    <main className="wv">
      <header className="wv-head">
        <a className="fb-back" href={`${basePath}/`}>
          <ArrowLeft size={16} aria-hidden="true" />
          <Image src={`${basePath}/assets/images/logo-gold.png`} alt="Mystic Hearts Healing Collective" width={80} height={80} className="fb-logo" />
        </a>
        <span className="fb-place">Waiver and agreements</span>
      </header>

      <div className="wv-sheet">
        <p className="wv-kicker">Before you come to the land</p>
        <h1 className="wv-title">
          Welcome. <em>A few words first.</em>
        </h1>
        <p className="wv-lede">
          Everyone who comes onto the land, including the Fairy Ball, signs this once: a release, our community agreements and a photo choice. It takes about three minutes, and a copy comes to your email.
        </p>

        {EMBED_URL ? (
          <div className="wv-embed">
            <iframe src={EMBED_URL} title="Mystic Hearts waiver" className="wv-embed-frame" loading="eager" allow="clipboard-write" />
            <Script src="https://link.msgsndr.com/js/form_embed.js" strategy="afterInteractive" />
          </div>
        ) : (
          <div className="wv-quiet">
            <p>The online waiver is opening shortly.</p>
            <p>
              Until then, write to <a href={`mailto:${CONTACT}?subject=Waiver`}>{CONTACT}</a> and we will send it to you to sign.
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
