// Emails the transport team when a driver signs up, changes answers, or removes their entry.
// Best-effort: never throws, no-op when RESEND_API_KEY / EMAIL_FROM / SPS_NOTIFY_TO are unset.
import { SLOTS } from "./slots.mjs";

const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const dayLabel = (iso) => new Date(iso + "T12:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });

// Lines like "Wed, Oct 7 · 1:58 PM · AUS → Camp · can drive"
export function answerLines(slots = {}) {
  return SLOTS.filter((s) => slots[s.id]).map((s) => ({
    text: `${dayLabel(s.date)} · ${s.pickup} · ${s.from} → ${s.to} · ${slots[s.id] === "yes" ? "can drive" : "maybe"}`,
    v: slots[s.id],
  }));
}

export function buildMessage({ event, driver, allDrivers = [] }) {
  const verb = { new: "signed up", update: "updated their answers", remove: "removed their entry" }[event] || event;
  const subject = `SPS drivers: ${driver.name} ${verb}`;
  const lines = answerLines(driver.slots);
  const open = SLOTS.filter((s) => !allDrivers.some((d) => d.slots?.[s.id] === "yes"));

  const text = [
    `${driver.name} ${verb}.`,
    driver.seats ? `Rider seats: ${driver.seats}` : "",
    driver.note ? `Note: ${driver.note}` : "",
    "",
    event === "remove" ? "" : lines.length ? "Their runs:" : "No runs marked yet.",
    ...lines.map((l) => "  - " + l.text),
    "",
    `${allDrivers.length} driver${allDrivers.length === 1 ? "" : "s"} signed up · ${open.length} run${open.length === 1 ? "" : "s"} still without a driver who can.`,
    "",
    "https://sps.handprotocol.org",
  ].filter((l) => l !== "").join("\n");

  const html = `<div style="font:15px/1.5 -apple-system,Segoe UI,sans-serif;color:#16231c">
    <p><b>${esc(driver.name)}</b> ${esc(verb)}.</p>
    ${driver.seats ? `<p>Rider seats: ${esc(driver.seats)}</p>` : ""}
    ${driver.note ? `<p>Note: ${esc(driver.note)}</p>` : ""}
    ${event === "remove" ? "" : lines.length ? `<p>Their runs:</p><ul>${lines.map((l) => `<li style="color:${l.v === "yes" ? "#2f7a4a" : "#9a5a00"}">${esc(l.text)}</li>`).join("")}</ul>` : "<p>No runs marked yet.</p>"}
    <p style="color:#56665b">${allDrivers.length} driver${allDrivers.length === 1 ? "" : "s"} signed up · ${open.length} run${open.length === 1 ? "" : "s"} still without a driver who can.</p>
    <p><a href="https://sps.handprotocol.org">sps.handprotocol.org</a></p>
  </div>`;
  return { subject, text, html };
}

export async function notify(payload) {
  const apiKey = process.env.RESEND_API_KEY, from = process.env.EMAIL_FROM, to = process.env.SPS_NOTIFY_TO;
  if (!apiKey || !from || !to) return { ok: false, reason: "email-unconfigured" };
  const { subject, text, html } = buildMessage(payload);
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to: to.split(",").map((s) => s.trim()), subject, text, html }),
    });
    if (!res.ok) { console.warn("[notify] resend", res.status, (await res.text()).slice(0, 200)); return { ok: false, reason: `email-${res.status}` }; }
    const { id } = await res.json();
    return { ok: true, id };
  } catch (err) {
    console.warn("[notify] failed", err?.message);
    return { ok: false, reason: "email-error" };
  }
}
