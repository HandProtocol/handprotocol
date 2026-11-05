"use client";

import { useEffect, useRef, useState } from "react";
import {
  CalendarPlus,
  Check,
  ChevronRight,
  Clock3,
  Headphones,
  Mic2,
  PhoneCall,
  PhoneOff,
  ShieldCheck,
  Sparkles,
  UserRound,
  Volume2,
  X,
} from "lucide-react";
import styles from "./call-console.module.css";

type CallStage = "routing" | "hold" | "screening" | "ready";

const stages: { key: CallStage; label: string; detail: string }[] = [
  { key: "routing", label: "Routing", detail: "Destination verified" },
  { key: "hold", label: "Hold", detail: "Voice agent remains on line" },
  { key: "screening", label: "Screening", detail: "Contact role identified" },
  { key: "ready", label: "Handoff", detail: "Human specialist requested" },
];

const appointments = ["Today, 3:30 PM CT", "Today, 4:15 PM CT", "Tomorrow, 10:00 AM CT"];

export function CallConsole({ standalone = false }: { standalone?: boolean }) {
  const [stage, setStage] = useState<CallStage>("hold");
  const [elapsed, setElapsed] = useState(137);
  const [isRoomOpen, setIsRoomOpen] = useState(false);
  const [appointment, setAppointment] = useState<string | null>(null);
  const [callEnded, setCallEnded] = useState(false);
  const [notes, setNotes] = useState(
    "Confirmed the account is handled by the membership office. The agent is holding for Maya Chen, Director of Accounts.",
  );
  const [postCallNotes, setPostCallNotes] = useState("");
  const [demoPhase, setDemoPhase] = useState<"quiet" | "signals" | "handoff">("quiet");
  const demoTimers = useRef<number[]>([]);

  const transcript = [
    { speaker: "Celeste", time: "02:06", line: "I have the June concierge balance ready. May I speak with the person who can review an arrangement?" },
    { speaker: "Front desk", time: "02:18", line: "I can transfer you to Maya now." },
    { speaker: "Maya", time: "02:24", line: "Yes, I have the balance in front of me. What arrangement is the member asking for?" },
  ];

  function clearDemo() {
    demoTimers.current.forEach((timer) => window.clearTimeout(timer));
    demoTimers.current = [];
  }

  function playExperience() {
    clearDemo();
    setIsRoomOpen(false);
    setCallEnded(false);
    setAppointment(null);
    setStage("routing");
    setDemoPhase("quiet");

    demoTimers.current = [
      window.setTimeout(() => {
        setStage("hold");
        setDemoPhase("signals");
      }, 700),
      window.setTimeout(() => setStage("screening"), 1900),
      window.setTimeout(() => {
        setStage("ready");
        setDemoPhase("handoff");
      }, 3050),
      window.setTimeout(() => setIsRoomOpen(true), 3900),
    ];
  }

  useEffect(() => {
    const timer = window.setInterval(() => setElapsed((time) => time + 1), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    playExperience();
    return clearDemo;
  }, []);

  const minutes = String(Math.floor(elapsed / 60)).padStart(2, "0");
  const seconds = String(elapsed % 60).padStart(2, "0");
  const activeStage = stages.findIndex((item) => item.key === stage);
  const liveMoment: Record<CallStage, string> = {
    routing: "is verifying the destination and account reference before entering the call tree.",
    hold: "has matched the account, named the reference number, and is holding the line until the accounts director is free.",
    screening: "has confirmed the accounts role and is asking for a warm transfer, not a callback.",
    ready: "has located the decision maker. The human specialist can join with the account context already prepared.",
  };

  function advanceCall() {
    const next: Record<CallStage, CallStage> = {
      routing: "hold",
      hold: "screening",
      screening: "ready",
      ready: "ready",
    };
    setStage(next[stage]);
    if (next[stage] === "ready") setIsRoomOpen(true);
  }

  return (
    <div className={`${styles.console} ${standalone ? styles.standalone : ""}`}>
      {standalone && <p className={styles.prototypeNotice}>Proof of concept within HAND Command. The final product home may move as voice operations mature.</p>}
      <header className={styles.header}>
        <div>
          <p className={styles.kicker}><span>Aurelia</span> / voice operations</p>
          <h1>Call orchestration</h1>
          <p className={styles.subhead}>An assisted calling desk for high-touch travel receivables. Voice layer staged for Fish Audio.</p>
        </div>
        <div className={styles.headerActions}>
          <span className={styles.compliance}><ShieldCheck size={15} /> Human approval required</span>
          <button className={styles.demoButton} type="button" onClick={playExperience}><Sparkles size={15} /> Replay experience</button>
          <button className={styles.outlineButton} type="button"><Volume2 size={16} /> Voice settings</button>
        </div>
      </header>

      <section className={styles.commandStrip} aria-label="Call system status">
        <div className={styles.agentIdentity}>
          <div className={styles.agentOrb} aria-hidden><span /></div>
          <div>
            <p className={styles.meta}>Active voice agent</p>
            <strong>Celeste</strong>
            <span className={styles.agentState}><i /> conducting call</span>
          </div>
        </div>
        <div className={styles.stripDivider} />
        <div className={styles.callReadout}>
          <p className={styles.meta}>Live conversation</p>
          <strong>{minutes}:{seconds}</strong>
          <span>Outbound · line 01</span>
        </div>
        <div className={styles.stripDivider} />
        <div className={styles.transcriptReadout}>
          <p className={styles.meta}>Last heard</p>
          <span>“I can transfer you to Maya now.”</span>
        </div>
        <button className={styles.takeoverButton} type="button" onClick={() => { setCallEnded(false); setStage("ready"); setIsRoomOpen(true); }}>
          <Headphones size={17} /> Enter call room
        </button>
      </section>

      <div className={styles.workspace}>
        <section className={styles.primaryColumn} aria-labelledby="live-call-heading">
          <div className={styles.sectionHeading}>
            <div>
              <p className={styles.kicker}>Priority transfer</p>
              <h2 id="live-call-heading">Alpine Passage Club</h2>
            </div>
            <span className={styles.livePill}><i /> Live</span>
          </div>

          <div className={styles.contactBar}>
            <div className={styles.monogram}>AP</div>
            <div className={styles.contactInfo}>
              <strong>Membership accounts</strong>
              <span>Account AP-0719 · $18,640 outstanding</span>
            </div>
            <button type="button" className={styles.quietButton} onClick={() => { setCallEnded(false); setIsRoomOpen(true); }}><PhoneCall size={15} /> View contact brief</button>
          </div>

          <div className={styles.callStage}>
            <div className={styles.stageTopline}>
              <div><p className={styles.meta}>Agent progression</p><strong>{stages[activeStage].label}</strong></div>
              <button type="button" className={styles.advanceButton} onClick={advanceCall} disabled={stage === "ready"}>
                {stage === "ready" ? "Specialist available" : "Advance demo"}<ChevronRight size={16} />
              </button>
            </div>
            <ol className={styles.stageList}>
              {stages.map((item, index) => (
                <li key={item.key} className={index <= activeStage ? styles.stageComplete : ""}>
                  <span className={styles.stageDot}>{index < activeStage ? <Check size={13} /> : index + 1}</span>
                  <span><strong>{item.label}</strong><small>{item.detail}</small></span>
                </li>
              ))}
            </ol>
            <div className={styles.liveMoment}>
              <div className={styles.wave} aria-label="Live audio activity"><i /><i /><i /><i /><i /><i /><i /><i /><i /></div>
              <p><span>Celeste</span> {liveMoment[stage]}</p>
            </div>
          </div>

          <div className={styles.intelligenceRow}>
            <article className={styles.intelligenceCard}>
              <p className={styles.meta}><Sparkles size={14} /> Suggested opening</p>
              <p>“Thank you, Maya. I’m joining the call now. We’re looking to settle the June concierge balance and keep the member’s reservation history intact.”</p>
              <button type="button" onClick={() => { setCallEnded(false); setIsRoomOpen(true); }}>Use in handoff <ChevronRight size={14} /></button>
            </article>
            <article className={styles.intelligenceCard}>
              <p className={styles.meta}><Clock3 size={14} /> Decision context</p>
              <p>Preferred resolution is a director-approved payment plan. Do not discuss card details on the call.</p>
              <span className={styles.guardrail}>Payment details stay off voice</span>
            </article>
          </div>
        </section>

        <aside className={styles.rightColumn} aria-label="Parallel call activity">
          <div className={styles.sectionHeading}><div><p className={styles.kicker}>Attention queue</p><h2>Other lines</h2></div><span className={styles.queueCount}>03 active</span></div>
          <section className={`${styles.signalDock} ${demoPhase !== "quiet" ? styles.signalDockActive : ""}`} aria-live="polite" aria-label="Agent attention signals">
            <p className={styles.meta}>Agent signals · ranked by urgency</p>
            <button type="button" className={`${styles.agentSignal} ${demoPhase === "signals" ? styles.signalUrgent : ""}`} onClick={() => { clearDemo(); setStage("ready"); setDemoPhase("handoff"); setIsRoomOpen(true); }}>
              <span className={styles.signalAvatar}>A</span><span><b>Astra</b><small>Human requested on hold</small></span><i className={styles.signalPulse} />
            </button>
            <button type="button" className={`${styles.agentSignal} ${demoPhase === "handoff" ? styles.signalReady : ""}`} onClick={() => { clearDemo(); setStage("ready"); setDemoPhase("handoff"); setIsRoomOpen(true); }}>
              <span className={`${styles.signalAvatar} ${styles.goldSignal}`}>C</span><span><b>Celeste</b><small>Decision maker located</small></span><ChevronRight size={15} />
            </button>
          </section>
          <article className={`${styles.parallelCard} ${styles.waitingCard} ${demoPhase === "signals" ? styles.needsAttention : ""}`}>
            <div className={styles.cardTop}><span className={styles.holdPill}><i /> Waiting on hold</span><span>05:42</span></div>
            <h3>Grand Meridian Voyages</h3>
            <p>Anna Bell asked for a human once the billing manager returns.</p>
            <div className={styles.cardFooter}><span className={styles.miniAgent}><i className={styles.violetAgent} /> Astra holding · Daniel waiting</span><button type="button" onClick={() => { setCallEnded(false); setIsRoomOpen(true); }}>Join <ChevronRight size={15} /></button></div>
          </article>
          <article className={styles.parallelCard}>
            <div className={styles.cardTop}><span className={styles.dialingPill}><i /> Agent dialing</span><span>00:18</span></div>
            <h3>Sanctuary Rail Collection</h3>
            <p>Verified direct number. Awaiting front-desk response.</p>
            <div className={styles.cardFooter}><span className={styles.miniAgent}><i className={styles.goldAgent} /> Celeste · line 03</span><span className={styles.audioBars} aria-hidden><i /><i /><i /><i /></span></div>
          </article>
          <article className={styles.appointmentCard}>
            <div><p className={styles.meta}><CalendarPlus size={14} /> Appointment opportunity</p><h3>Solstice Private Air</h3><p>Office requested a return call after the board review.</p></div>
            <div className={styles.appointmentOptions}>
              {appointments.map((time) => <button key={time} type="button" onClick={() => setAppointment(time)} className={appointment === time ? styles.selectedAppointment : ""}>{appointment === time && <Check size={13} />}{time}</button>)}
            </div>
            {appointment && <p className={styles.bookedNotice}><Check size={14} /> Tentatively held for {appointment}</p>}
          </article>
        </aside>
      </div>

      {isRoomOpen && (
        <div className={styles.roomOverlay} role="dialog" aria-modal="true" aria-labelledby="room-title">
          <div className={styles.roomBackdrop} onClick={() => setIsRoomOpen(false)} />
          <section className={styles.callRoom}>
            <header className={styles.roomHeader}>
              <div><p className={styles.kicker}>{callEnded ? "Call complete · Wrap-up in progress" : "Live transfer · Human specialist connected"}</p><h2 id="room-title">Alpine Passage Club</h2></div>
              <button type="button" className={styles.closeButton} aria-label="Close call room" onClick={() => setIsRoomOpen(false)}><X size={20} /></button>
            </header>
            <div className={styles.roomBody}>
              <div className={styles.conversationPanel}>
                <div className={styles.participantRow}><div className={styles.person}><div className={styles.personAvatar}>MC</div><span><strong>Maya Chen</strong><small>Director of Accounts · Alpine Passage</small></span></div>{callEnded ? <span className={styles.completedPill}><Check size={13} /> Completed</span> : <span className={styles.livePill}><i /> Connected</span>}</div>
                <div className={styles.roomWave}>{!callEnded && <div className={styles.wave} aria-label="Call audio active"><i /><i /><i /><i /><i /><i /><i /><i /><i /></div>}<p>{callEnded ? "The call has ended. Review the transcript, capture the final outcome, and save the record." : "Human handoff completed cleanly. Celeste is listening in silent-assist mode."}</p></div>
                <section className={styles.transcriptPanel} aria-labelledby="transcript-title">
                  <div className={styles.transcriptHeader}><div><p className={styles.meta}>Transcription</p><h3 id="transcript-title">Live call transcript</h3></div>{!callEnded && <span className={styles.transcribingPill}><i /> Transcribing</span>}</div>
                  <div className={styles.transcriptEntries} aria-live="polite">
                    {transcript.map((entry) => <p key={`${entry.speaker}-${entry.time}`}><span><b>{entry.speaker}</b><time>{entry.time}</time></span>{entry.line}</p>)}
                  </div>
                </section>
                <div className={styles.roomControls}><button type="button" className={styles.muteButton} disabled={callEnded}><Mic2 size={17} /> Mute</button>{!callEnded && <button type="button" className={styles.endButton} onClick={() => setCallEnded(true)}><PhoneOff size={17} /> End and review</button>}</div>
              </div>
              <aside className={styles.notesPanel}>
                <div className={styles.notesHeading}><div><p className={styles.meta}>{callEnded ? "Post-call record" : "During-call notes"}</p><h3>{callEnded ? "Close the loop with context" : "Capture context while you talk"}</h3></div><span>{callEnded ? "Ready to save" : "Auto-saving"}</span></div>
                {!callEnded ? <textarea value={notes} onChange={(event) => setNotes(event.target.value)} aria-label="During-call notes" /> : <textarea value={postCallNotes} onChange={(event) => setPostCallNotes(event.target.value)} aria-label="Post-call notes" placeholder="Record the agreement, next owner, promised date, or any follow-up needed." />}
                <div className={styles.noteActions}><button type="button" className={styles.outlineButton}><CalendarPlus size={16} /> {callEnded ? "Set follow-up" : "Offer appointment"}</button><button type="button" className={styles.primaryButton} onClick={() => { if (callEnded) setIsRoomOpen(false); }}><Check size={16} /> {callEnded ? "Save call record" : "Log resolution"}</button></div>
              </aside>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
