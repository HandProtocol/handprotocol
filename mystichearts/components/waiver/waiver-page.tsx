"use client";

import { ArrowLeft, ArrowRight, Check, Feather, Plus, Printer, Trash2 } from "lucide-react";
import Image from "next/image";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { SignaturePad } from "./signature-pad";
import { loadForms, signForms, waiversReady, WaiverApiError, type Envelope, type WaiverForm } from "./waiver-api";
import { PRIVACY, REASONS, STEPS, type ReasonKey } from "./waiver-copy";
import { WaiverDoc } from "./waiver-doc";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";
const CONTACT = "mysticheartshealing@gmail.com";
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type Minor = { name: string; birthDate: string };
type Load = { state: "loading" } | { state: "ready"; forms: WaiverForm[] } | { state: "failed" };

const initialsOf = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("")
    .slice(0, 4);

const sameName = (a: string, b: string) => a.trim().replace(/\s+/g, " ").toLowerCase() === b.trim().replace(/\s+/g, " ").toLowerCase();

function isUnder18(birthDate: string): boolean {
  const born = new Date(`${birthDate}T00:00:00`);
  if (Number.isNaN(born.getTime())) return false;
  const now = new Date();
  const eighteen = new Date(born.getFullYear() + 18, born.getMonth(), born.getDate());
  return eighteen > now && born <= now;
}

export function WaiverPage() {
  const [load, setLoad] = useState<Load>({ state: "loading" });
  const [step, setStep] = useState(0);
  const [reasons, setReasons] = useState<Set<ReasonKey>>(new Set());
  const [person, setPerson] = useState({ name: "", email: "", phone: "", adult: false });
  const [emergency, setEmergency] = useState({ name: "", phone: "" });
  const [minors, setMinors] = useState<Minor[]>([{ name: "", birthDate: "" }]);
  const [initials, setInitials] = useState("");
  const [stamps, setStamps] = useState<Record<string, number[]>>({});
  const [media, setMedia] = useState<"yes" | "no" | null>(null);
  const [typed, setTyped] = useState("");
  const [drawn, setDrawn] = useState<string | null>(null);
  const [consent, setConsent] = useState({ electronic: false, readAll: false });
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState<Envelope | null>(null);
  const attempt = useRef<string | null>(null);
  const heading = useRef<HTMLHeadingElement>(null);

  const fetchForms = () => {
    if (!waiversReady()) return setLoad({ state: "failed" });
    setLoad({ state: "loading" });
    loadForms().then(
      (forms) => setLoad({ state: "ready", forms }),
      () => setLoad({ state: "failed" }),
    );
  };

  // First load: the forms, and a reason named in the link (/waiver/?for=fairy-ball) ticked.
  useEffect(() => {
    let alive = true;
    const wanted = new URLSearchParams(window.location.search).get("for");
    loadForms().then(
      (forms) => {
        if (!alive) return;
        setLoad({ state: "ready", forms });
        if (wanted && REASONS.some((reason) => reason.key === wanted)) setReasons(new Set([wanted as ReasonKey]));
      },
      () => alive && setLoad({ state: "failed" }),
    );
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    heading.current?.focus();
  }, [step, done]);

  const published = load.state === "ready" ? load.forms : [];
  const offered = REASONS.filter((reason) => !reason.needs || published.some((form) => form.key === reason.needs));
  const chosen = useMemo(() => {
    const keys = new Set(REASONS.filter((reason) => reasons.has(reason.key)).flatMap((reason) => reason.forms));
    if (keys.size > 0 && !keys.has("land-release")) ["land-release", "community-agreements", "media"].forEach((key) => keys.add(key));
    return published.filter((form) => keys.has(form.key));
  }, [reasons, published]);
  const bringingChild = reasons.has("child");
  const event = REASONS.find((reason) => reasons.has(reason.key) && reason.event)?.event;

  const toggle = (key: ReasonKey) =>
    setReasons((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  const stampedOf = (key: string) => new Set(stamps[key] ?? []);
  const stamp = (key: string, index: number) => setStamps((current) => ({ ...current, [key]: [...(current[key] ?? []), index] }));
  const initialCount = (form: WaiverForm) => form.blocks.filter((block) => block.t === "initial").length;
  const allStamped = chosen.every((form) => stampedOf(form.key).size >= initialCount(form));
  const needsMedia = chosen.some((form) => form.kind === "media");

  // What stops each step, in plain words (empty when the step is complete).
  const blockers = (at: number): string[] => {
    if (at === 0) return chosen.length === 0 ? ["Choose at least one reason you are coming."] : [];
    if (at === 1) {
      const out: string[] = [];
      if (person.name.trim().length < 2) out.push("Your full name.");
      if (!EMAIL.test(person.email.trim())) out.push("An email address for your copy.");
      if (!person.adult) out.push("Confirm you are 18 or older.");
      if (emergency.name.trim().length < 2 || emergency.phone.replace(/\D/g, "").length < 7) out.push("An emergency contact's name and phone.");
      if (bringingChild && minors.some((minor) => minor.name.trim().length < 2 || !isUnder18(minor.birthDate))) out.push("Each child's name and a birth date under 18.");
      return out;
    }
    if (at === 2) {
      const out: string[] = [];
      if (initials.trim().length === 0) out.push("Your initials.");
      if (!allStamped) out.push("Initial every highlighted paragraph.");
      if (needsMedia && !media) out.push("Your photo and video choice.");
      return out;
    }
    const out: string[] = [];
    if (!sameName(typed, person.name)) out.push(`Type your full name exactly as above: ${person.name.trim()}.`);
    if (!consent.electronic) out.push("Agree to sign electronically.");
    if (!consent.readAll) out.push("Confirm you have read every document.");
    return out;
  };

  const next = () => {
    const missing = blockers(step);
    if (missing.length > 0) return setError(missing.join(" "));
    setError(null);
    if (step === 1 && initials.length === 0) setInitials(initialsOf(person.name));
    setStep((current) => Math.min(current + 1, STEPS.length - 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const back = () => {
    setError(null);
    setStep((current) => Math.max(current - 1, 0));
  };

  const submit = async (formEvent: FormEvent) => {
    formEvent.preventDefault();
    const missing = blockers(3);
    if (missing.length > 0) return setError(missing.join(" "));
    setError(null);
    setSending(true);
    attempt.current ??= `wv-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    try {
      const envelope = await signForms(
        {
          forms: chosen.map((form) => ({ key: form.key, version: form.version, hash: form.hash, ...(initialCount(form) > 0 ? { initials: initials.trim() } : {}) })),
          signer: { name: person.name.trim(), email: person.email.trim(), ...(person.phone.trim() ? { phone: person.phone.trim() } : {}), adult: true },
          emergency: { name: emergency.name.trim(), phone: emergency.phone.trim() },
          ...(bringingChild ? { minors: minors.map((minor) => ({ name: minor.name.trim(), birthDate: minor.birthDate })) } : {}),
          ...(needsMedia && media ? { media } : {}),
          ...(event ? { event } : {}),
          signature: { typed: typed.trim(), ...(drawn ? { drawn } : {}) },
          consent: { electronic: true, readAll: true },
          website: "",
        },
        attempt.current,
      );
      setDone(envelope);
      try {
        localStorage.setItem("mh-waiver", JSON.stringify({ id: envelope.id, signedAt: envelope.signedAt, forms: envelope.forms.map((form) => form.key) }));
      } catch {
        /* private window: nothing to remember */
      }
    } catch (failure) {
      if (failure instanceof WaiverApiError && failure.code === "form_outdated") {
        setError("A document was just updated. We loaded the new version: please read and initial it again.");
        setStamps({});
        setStep(2);
        fetchForms();
      } else if (failure instanceof WaiverApiError && failure.code === "rate_limited") {
        setError("Too many tries just now. Please wait a few minutes and sign again.");
      } else {
        setError(`We could not save your signature. Please try again, or write to ${CONTACT}.`);
      }
    } finally {
      setSending(false);
    }
  };

  return (
    <main className="wv">
      <header className="wv-head">
        <a className="fb-back" href={`${basePath}/`}>
          <ArrowLeft size={16} aria-hidden="true" />
          <Image src={`${basePath}/assets/images/logo-gold.png`} alt="Mystic Hearts Healing Collective" width={80} height={80} className="fb-logo" />
        </a>
        <span className="fb-place">Waivers and agreements</span>
      </header>

      <div className="wv-sheet">
        {done ? (
          <Receipt envelope={done} email={person.email.trim()} forms={chosen} heading={heading} />
        ) : (
          <>
            <p className="wv-kicker">Before you come to the land</p>
            <h1 className="wv-title" ref={heading} tabIndex={-1}>
              {step === 0 ? (
                <>
                  Welcome. <em>A few words first.</em>
                </>
              ) : (
                STEPS[step]
              )}
            </h1>
            <ol className="wv-steps" aria-label="Steps">
              {STEPS.map((label, index) => (
                <li key={label} className={index === step ? "is-now" : index < step ? "is-done" : ""} aria-current={index === step ? "step" : undefined}>
                  <span>{index < step ? <Check size={12} aria-hidden="true" /> : index + 1}</span>
                  {label}
                </li>
              ))}
            </ol>

            {load.state === "loading" && <p className="wv-quiet">Opening the agreements…</p>}
            {load.state === "failed" && (
              <div className="wv-quiet">
                <p>The agreements are not loading right now.</p>
                <p>
                  <button type="button" className="link-btn" onClick={fetchForms}>
                    Try again
                  </button>{" "}
                  or write to <a href={`mailto:${CONTACT}`}>{CONTACT}</a> and we will send them to you.
                </p>
              </div>
            )}

            {load.state === "ready" && (
              <form className="wv-form" onSubmit={submit} noValidate>
                <input type="text" name="website" tabIndex={-1} autoComplete="off" className="sr-only" aria-hidden="true" defaultValue="" />

                {step === 0 && (
                  <section>
                    <p className="wv-lede">
                      Everyone who comes onto the land signs once a year: a release, our community agreements and a photo choice. Pick what brings you and we will show only what applies. It takes about three minutes.
                    </p>
                    <div className="wv-reasons" role="group" aria-label="What brings you">
                      {offered.map((reason) => (
                        <button key={reason.key} type="button" className="wv-reason" aria-pressed={reasons.has(reason.key)} onClick={() => toggle(reason.key)}>
                          <span className="wv-check" aria-hidden="true">
                            {reasons.has(reason.key) && <Check size={14} />}
                          </span>
                          <span>
                            <strong>{reason.label}</strong>
                            <small>{reason.hint}</small>
                          </span>
                        </button>
                      ))}
                    </div>
                    {chosen.length > 0 && (
                      <p className="wv-quiet">
                        You will read and sign: {chosen.map((form) => form.title).join("; ")}.
                      </p>
                    )}
                  </section>
                )}

                {step === 1 && (
                  <section className="wv-fields">
                    <fieldset>
                      <legend>You</legend>
                      <label>
                        Full legal name
                        <input value={person.name} onChange={(e) => setPerson({ ...person, name: e.target.value })} autoComplete="name" required />
                      </label>
                      <div className="field-row">
                        <label>
                          Email (your signed copy goes here)
                          <input type="email" value={person.email} onChange={(e) => setPerson({ ...person, email: e.target.value })} autoComplete="email" required />
                        </label>
                        <label>
                          Phone (optional)
                          <input type="tel" value={person.phone} onChange={(e) => setPerson({ ...person, phone: e.target.value })} autoComplete="tel" />
                        </label>
                      </div>
                      <label className="wv-tick">
                        <input type="checkbox" checked={person.adult} onChange={(e) => setPerson({ ...person, adult: e.target.checked })} />I am 18 or older.
                      </label>
                    </fieldset>
                    <fieldset>
                      <legend>Emergency contact</legend>
                      <p className="wv-quiet">Someone not coming with you, whom we may call if you are hurt.</p>
                      <div className="field-row">
                        <label>
                          Their name
                          <input value={emergency.name} onChange={(e) => setEmergency({ ...emergency, name: e.target.value })} required />
                        </label>
                        <label>
                          Their phone
                          <input type="tel" value={emergency.phone} onChange={(e) => setEmergency({ ...emergency, phone: e.target.value })} required />
                        </label>
                      </div>
                    </fieldset>
                    {bringingChild && (
                      <fieldset>
                        <legend>Each child you are signing for</legend>
                        {minors.map((minor, index) => (
                          <div className="field-row wv-minor" key={index}>
                            <label>
                              Child&apos;s full name
                              <input value={minor.name} onChange={(e) => setMinors(minors.map((m, i) => (i === index ? { ...m, name: e.target.value } : m)))} />
                            </label>
                            <label>
                              Birth date
                              <input type="date" value={minor.birthDate} onChange={(e) => setMinors(minors.map((m, i) => (i === index ? { ...m, birthDate: e.target.value } : m)))} />
                            </label>
                            {minors.length > 1 && (
                              <button type="button" className="wv-icon" aria-label={`Remove child ${index + 1}`} onClick={() => setMinors(minors.filter((_, i) => i !== index))}>
                                <Trash2 size={16} />
                              </button>
                            )}
                          </div>
                        ))}
                        {minors.length < 6 && (
                          <button type="button" className="link-btn" onClick={() => setMinors([...minors, { name: "", birthDate: "" }])}>
                            <Plus size={14} aria-hidden="true" /> Add another child
                          </button>
                        )}
                      </fieldset>
                    )}
                    <details className="wv-privacy">
                      <summary>{PRIVACY.title}</summary>
                      <ul>
                        {PRIVACY.items.map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    </details>
                  </section>
                )}

                {step === 2 && (
                  <section>
                    <div className="wv-initials-bar">
                      <label>
                        Your initials
                        <input value={initials} maxLength={4} onChange={(e) => setInitials(e.target.value.toUpperCase())} />
                      </label>
                      <p className="wv-quiet">Read each document. Tap Initial here beside every highlighted paragraph.</p>
                    </div>
                    {chosen.map((form) => (
                      <WaiverDoc
                        key={form.key}
                        form={form}
                        initials={initials}
                        stamped={stampedOf(form.key)}
                        onStamp={(index) => stamp(form.key, index)}
                        media={media}
                        onMedia={setMedia}
                      />
                    ))}
                  </section>
                )}

                {step === 3 && (
                  <section className="wv-fields">
                    <p className="wv-lede">
                      You are signing {chosen.length} {chosen.length === 1 ? "document" : "documents"}
                      {bringingChild ? ` for yourself and ${minors.length === 1 ? "one child" : `${minors.length} children`}` : ""}. A copy of everything goes to {person.email.trim()}.
                    </p>
                    <label>
                      Type your full legal name to sign
                      <input className="wv-typed" value={typed} onChange={(e) => setTyped(e.target.value)} placeholder={person.name.trim()} autoComplete="off" />
                    </label>
                    <SignaturePad onChange={setDrawn} />
                    <label className="wv-tick">
                      <input type="checkbox" checked={consent.readAll} onChange={(e) => setConsent({ ...consent, readAll: e.target.checked })} />I have read every document above, I understand that I am giving up rights, including the right to sue, and I sign freely.
                    </label>
                    <label className="wv-tick">
                      <input type="checkbox" checked={consent.electronic} onChange={(e) => setConsent({ ...consent, electronic: e.target.checked })} />I agree to sign electronically and to receive my copy by email. My typed name is my signature.
                    </label>
                  </section>
                )}

                {error && (
                  <p className="wv-error" role="alert">
                    {error}
                  </p>
                )}

                <div className="wv-nav">
                  {step > 0 && (
                    <button type="button" className="btn btn-glass" onClick={back}>
                      <ArrowLeft size={16} aria-hidden="true" /> Back
                    </button>
                  )}
                  {step < STEPS.length - 1 ? (
                    <button type="button" className="btn btn-gold" onClick={next}>
                      Continue <ArrowRight size={16} aria-hidden="true" />
                    </button>
                  ) : (
                    <button type="submit" className="btn btn-gold" disabled={sending}>
                      <Feather size={16} aria-hidden="true" /> {sending ? "Signing…" : "Sign"}
                    </button>
                  )}
                </div>
              </form>
            )}
          </>
        )}
      </div>
    </main>
  );
}

function Receipt({ envelope, email, forms, heading }: { envelope: Envelope; email: string; forms: WaiverForm[]; heading: React.RefObject<HTMLHeadingElement | null> }) {
  const when = new Date(envelope.signedAt).toLocaleString("en-US", { dateStyle: "long", timeStyle: "short", timeZone: "America/Chicago" });
  return (
    <section className="wv-done">
      <p className="wv-kicker">Signed</p>
      <h1 className="wv-title" ref={heading} tabIndex={-1}>
        Thank you. <em>See you on the land.</em>
      </h1>
      <p className="wv-lede">
        You signed on {when}. A complete copy is on its way to {email}: keep that email, it is your record.
      </p>
      <ul className="wv-receipt">
        {envelope.forms.map((form) => (
          <li key={form.key}>
            <Check size={16} aria-hidden="true" /> {form.title} <small>version {form.version}</small>
          </li>
        ))}
      </ul>
      <p className="wv-quiet">
        Record {envelope.id}. Receipt {envelope.receiptHash.slice(0, 16)}…
      </p>
      <div className="wv-nav">
        <button type="button" className="btn btn-glass" onClick={() => window.print()}>
          <Printer size={16} aria-hidden="true" /> Print
        </button>
        <a className="btn btn-gold" href={`${basePath}/`}>
          Back to Mystic Hearts
        </a>
      </div>
      <div className="wv-print-only">
        {forms.map((form) => (
          <article key={form.key}>
            <h2>
              {form.title} (version {form.version})
            </h2>
            {form.blocks.map((block, index) => (
              <p key={index}>{block.text}</p>
            ))}
          </article>
        ))}
      </div>
    </section>
  );
}
