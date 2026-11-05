// Renderer for the HAND start journey (see journey.js).
//
// Preview build: nothing typed here leaves the device. On "Send to HAND" the renderer builds the
// submission envelope the onboarding service expects and shows it, instead of posting it.
// Going live means replacing deliver() and setting MODE to "live".

(() => {
  "use strict";

  const MODE = "preview";
  const DRAFT_KEY = "hand_start_draft_v1";
  const DRAFT_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;
  const REPLY_BUSINESS_DAYS = 5;
  const MAX_WALK = 60;
  const COUNTER_THRESHOLD = 0.8;
  const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

  const journey = window.HAND_JOURNEY;
  const app = document.getElementById("app");
  if (!journey || !app) return;

  const nodesById = new Map(journey.nodes.map((node) => [node.id, node]));
  const fieldsByKey = new Map(journey.nodes.flatMap((node) => (node.fields || []).map((field) => [field.key, field])));
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  const EMPTY = Object.freeze({ at: journey.startNodeId, answers: {}, returnToReview: false, errors: {}, sent: null, draftFound: null });
  let state = EMPTY;

  // ---------- small helpers ----------

  const escapeHtml = (value) => String(value ?? "").replace(/[&<>'"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[c]);
  const hasValue = (value) => (Array.isArray(value) ? value.length > 0 : value !== undefined && value !== null && value !== "" && value !== false);
  const isQuestion = (node) => Boolean(node.fields && node.fields.some((field) => field.input !== "hidden")) && node.type !== "consent";
  const isTapAdvance = (node) => {
    const visible = (node.fields || []).filter((field) => field.input !== "hidden");
    return visible.length === 1 && visible[0].input === "choice";
  };

  function emit(event, nodeId) {
    // Names only, never answers. Lets aggregate counting be attached later without touching the flow.
    document.dispatchEvent(new CustomEvent("hand:funnel", { detail: { event, node: nodeId || state.at } }));
  }

  // ---------- journey logic (allowlisted predicates only) ----------

  function matches(predicate, answers) {
    const actual = answers[predicate.field];
    if (predicate.operator === "exists") return actual !== undefined && actual !== null && actual !== "";
    if (predicate.operator === "equals") return actual === predicate.value;
    if (predicate.operator === "not") return actual !== predicate.value;
    if (predicate.operator === "includes") return Array.isArray(actual) ? actual.includes(predicate.value) : actual === predicate.value;
    return false;
  }

  function nextId(nodeId, answers) {
    const edge = journey.edges.find((candidate) => candidate.from === nodeId && (!candidate.when || matches(candidate.when, answers)));
    return edge ? edge.to : null;
  }

  function fieldError(field, answers) {
    const value = answers[field.key];
    if (field.required && !hasValue(value)) return field.requiredMessage || "Choose an answer to continue.";
    if (field.input === "email" && hasValue(value) && !EMAIL_PATTERN.test(value)) return "That does not look like an email address. It should read like name@example.com.";
    if (field.maxLength && typeof value === "string" && value.length > field.maxLength) return `Shorten this to ${field.maxLength.toLocaleString("en-US")} characters or fewer.`;
    return "";
  }

  function nodeErrors(node, answers) {
    return (node.fields || []).reduce((errors, field) => {
      const message = fieldError(field, answers);
      return message ? { ...errors, [field.key]: message } : errors;
    }, {});
  }

  const isComplete = (node, answers) => Object.keys(nodeErrors(node, answers)).length === 0;

  // The route from the start to the review for these answers. With stopAtGap, it stops at the first
  // question that still needs an answer.
  function walk(answers, stopAtGap) {
    const route = [];
    let id = journey.startNodeId;
    while (id && route.length < MAX_WALK) {
      const node = nodesById.get(id);
      if (!node) break;
      route.push(node);
      if (node.type === "review" || node.type === "external_action" || node.type === "completion") break;
      if (stopAtGap && isQuestion(node) && !isComplete(node, answers)) break;
      id = nextId(id, answers);
    }
    return route;
  }

  function currentPath(answers) {
    const route = walk(answers, false);
    const last = [...route].reverse().find((node) => node.path);
    const key = last ? last.path : "triage";
    return journey.paths[key] ? key : "triage";
  }

  function stepInfo(nodeId, answers) {
    const steps = walk(answers, false).filter((node) => isQuestion(node) && node.id !== "intent" && node.id !== "sorter");
    const index = steps.findIndex((node) => node.id === nodeId);
    return index < 0 ? null : { n: index + 1, total: steps.length };
  }

  // ---------- the letter ----------

  function sentenceFor(field, value) {
    if (!hasValue(value)) return "";
    if (field.options) {
      const say = (item) => {
        const option = field.options.find((candidate) => candidate.value === item);
        return option ? option.says || option.label : String(item);
      };
      if (!Array.isArray(value)) return say(value);
      const parts = value.map(say);
      return parts.length < 3 ? parts.join(" and ") : `${parts.slice(0, -1).join(", ")} and ${parts[parts.length - 1]}`;
    }
    return String(value).trim();
  }

  function fill(template, answers) {
    const replaceKeys = (text) => text.replace(/\{(\w+)\}/g, (_, key) => sentenceFor(fieldsByKey.get(key) || { key }, answers[key]));
    const allPresent = (text) => [...text.matchAll(/\{(\w+)\}/g)].every((match) => hasValue(answers[match[1]]));
    const withOptional = template.replace(/\[([^\]]*)\]/g, (_, inner) => (allPresent(inner) ? inner : ""));
    if (!allPresent(withOptional)) return "";
    const text = replaceKeys(withOptional).replace(/\s+/g, " ").trim();
    return /[.!?]$/.test(text) ? text.replace(/([.!?])\.$/, "$1") : `${text}.`;
  }

  function letterLines(answers) {
    return walk(answers, false)
      .filter((node) => node.letter)
      .map((node) => ({ node, text: fill(node.letter, answers) }))
      .filter((line) => line.text);
  }

  // Answers given on a path the person has since left. They are kept and sent, so they are shown.
  function strayAnswers(answers) {
    const onRoute = new Set(walk(answers, false).flatMap((node) => (node.fields || []).map((field) => field.key)));
    const letterKeys = new Set(journey.nodes.filter((node) => node.letter).flatMap((node) => node.fields.map((field) => field.key)));
    return Object.keys(answers)
      .filter((key) => hasValue(answers[key]) && !onRoute.has(key) && letterKeys.has(key))
      .map((key) => ({ key, label: fieldsByKey.get(key).label, text: sentenceFor(fieldsByKey.get(key), answers[key]) }));
  }

  function renderLetter(answers, withChange) {
    const lines = letterLines(answers);
    const body = lines.length
      ? lines.map((line) => `<p class="letter__line"><span>${escapeHtml(line.text)}</span>${withChange ? ` <button type="button" class="letter__change" data-action="edit" data-node="${line.node.id}" aria-label="Change: ${escapeHtml(line.node.title)}">Change</button>` : ""}</p>`).join("")
      : `<p class="letter__empty">Each answer adds a line here. This is the note a person at HAND will read.</p>`;
    const signature = hasValue(answers.name) ? `<p class="letter__sign">${escapeHtml(answers.name)}</p>` : "";
    return `<p class="letter__salute">Dear HAND,</p>${body}${signature}`;
  }

  // ---------- dates and references ----------

  function addBusinessDays(from, days) {
    const date = new Date(from.getTime());
    let remaining = days;
    while (remaining > 0) {
      date.setDate(date.getDate() + 1);
      const day = date.getDay();
      if (day !== 0 && day !== 6) remaining -= 1;
    }
    return date;
  }

  const replyByText = (date) => date.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });

  function newIdempotencyKey() {
    if (window.crypto && typeof window.crypto.randomUUID === "function") return window.crypto.randomUUID();
    return `k-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
  }

  // ---------- draft (this device only) ----------

  function readDraft() {
    try {
      const raw = window.localStorage.getItem(DRAFT_KEY);
      if (!raw) return null;
      const draft = JSON.parse(raw);
      const fresh = draft && typeof draft.savedAt === "number" && Date.now() - draft.savedAt < DRAFT_MAX_AGE_MS;
      if (!fresh || !draft.answers || typeof draft.answers !== "object") {
        window.localStorage.removeItem(DRAFT_KEY);
        return null;
      }
      return { at: nodesById.has(draft.at) ? draft.at : journey.startNodeId, answers: draft.answers };
    } catch (error) {
      return null; // Storage can be blocked or the draft unreadable. The flow works without it.
    }
  }

  function writeDraft() {
    if (state.sent || !Object.keys(state.answers).some((key) => hasValue(state.answers[key]))) return;
    try {
      const { privacy_ack: _ack, updates_opt_in: _updates, ...answers } = state.answers;
      window.localStorage.setItem(DRAFT_KEY, JSON.stringify({ savedAt: Date.now(), at: state.at, answers }));
    } catch (error) {
      // Storage can be full or blocked. Answers stay in memory for this visit.
    }
  }

  function dropDraft() {
    try { window.localStorage.removeItem(DRAFT_KEY); } catch (error) { /* nothing stored */ }
  }

  // ---------- state changes ----------

  function setState(patch) {
    state = { ...state, ...patch };
  }

  function go(nodeId, options = {}) {
    setState({ at: nodeId, errors: {}, ...(options.patch || {}) });
    if (options.replace) window.history.replaceState({ at: nodeId }, "");
    else window.history.pushState({ at: nodeId }, "");
    writeDraft();
    render({ moveFocus: true });
    emit("view", nodeId);
  }

  function advance() {
    if (state.returnToReview) {
      const route = walk(state.answers, true);
      const last = route[route.length - 1];
      go(last.id, { patch: { returnToReview: last.type !== "review" } });
      return;
    }
    const target = nextId(state.at, state.answers);
    if (target) go(target);
  }

  function back() {
    const route = walk(state.answers, false);
    const index = route.findIndex((node) => node.id === state.at);
    const previous = index > 0 ? route[index - 1] : nodesById.get(journey.startNodeId);
    go(previous.id, { patch: { returnToReview: false } });
  }

  function readFields(node) {
    return (node.fields || []).reduce((answers, field) => {
      if (field.input === "hidden" || field.input === "choice" && isTapAdvance(node)) return answers;
      if (field.input === "multi") {
        return { ...answers, [field.key]: [...app.querySelectorAll(`input[name="${field.key}"]:checked`)].map((input) => input.value) };
      }
      if (field.input === "choice") {
        const picked = app.querySelector(`input[name="${field.key}"]:checked`);
        return { ...answers, [field.key]: picked ? picked.value : "" };
      }
      if (field.input === "check") {
        const box = app.querySelector(`input[name="${field.key}"]`);
        return { ...answers, [field.key]: Boolean(box && box.checked) };
      }
      const input = app.querySelector(`[name="${field.key}"]`);
      return { ...answers, [field.key]: input ? input.value.trim() : "" };
    }, state.answers);
  }

  function submitNode() {
    const node = nodesById.get(state.at);
    const answers = readFields(node);
    const errors = nodeErrors(node, answers);
    setState({ answers, errors });
    if (Object.keys(errors).length) {
      render({ focusError: true });
      emit("error");
      return;
    }
    emit("complete");
    advance();
  }

  function choose(key, value) {
    const answers = { ...state.answers, [key]: value, ...(key === "intent" ? { write_instead: false } : {}) };
    setState({ answers, draftFound: null });
    emit("complete");
    // An answer can be given from a screen other than its own (the gift exit offers one),
    // so the next screen is worked out from the node that owns the field.
    const owner = journey.nodes.find((node) => (node.fields || []).some((field) => field.key === key));
    if (owner && owner.id !== state.at) setState({ at: owner.id });
    advance();
  }

  function writeInstead() {
    setState({ answers: { ...state.answers, intent: state.answers.intent || "choose", write_instead: true }, returnToReview: false });
    emit("write_instead");
    go("triage_need");
  }

  function buildEnvelope(answers) {
    const { privacy_ack: _ack, updates_opt_in: updates, ...rest } = answers;
    const kept = Object.fromEntries(Object.entries(rest).filter(([, value]) => hasValue(value)));
    return {
      siteKey: journey.siteKey,
      journeyKey: journey.key,
      journeyVersion: journey.version,
      channel: "web",
      entryPoint: "/start/",
      idempotencyKey: newIdempotencyKey(),
      answers: kept,
      privacyNoticeVersion: journey.privacyNoticeVersion,
      communicationConsent: Boolean(updates),
    };
  }

  // Preview: nothing is posted. Live: POST the envelope to the onboarding service and return
  // { reference, replyBy } from its response.
  async function deliver(envelope) {
    const pathKey = currentPath(envelope.answers);
    return {
      reference: `HAND-${journey.paths[pathKey].reference}-PREVIEW`,
      replyBy: addBusinessDays(new Date(), REPLY_BUSINESS_DAYS).toISOString(),
    };
  }

  async function send() {
    const consent = nodesById.get("consent");
    const answers = readFields(consent);
    const errors = nodeErrors(consent, answers);
    setState({ answers, errors });
    if (Object.keys(errors).length) {
      render({ focusError: true });
      return;
    }
    const envelope = buildEnvelope(answers);
    try {
      const receipt = await deliver(envelope);
      setState({ sent: { envelope, receipt, path: currentPath(answers) } });
      dropDraft();
      emit("sent", "received");
      go("received");
    } catch (error) {
      setState({ errors: { send: "Your note did not go through. Nothing was lost: it is still on this device. Try again in a moment." } });
      render({ focusError: true });
    }
  }

  function clearAnswers() {
    dropDraft();
    state = EMPTY;
    window.history.replaceState({ at: journey.startNodeId }, "");
    render({ moveFocus: true });
    emit("cleared", journey.startNodeId);
  }

  // ---------- rendering ----------

  function errorHtml(key) {
    return state.errors[key] ? `<p class="field__error" id="error-${key}" role="alert">${escapeHtml(state.errors[key])}</p>` : "";
  }

  function describedBy(field) {
    return [field.hint ? `hint-${field.key}` : "", state.errors[field.key] ? `error-${field.key}` : ""].filter(Boolean).join(" ");
  }

  function renderChoiceButtons(field) {
    const current = state.answers[field.key];
    return `<div class="choices" role="group" aria-label="${escapeHtml(field.label)}">${field.options.map((option) => `
      <button type="button" class="choice${current === option.value ? " is-picked" : ""}" data-action="choose" data-key="${field.key}" data-value="${option.value}" aria-pressed="${current === option.value}">
        <span class="choice__text">
          ${option.tag ? `<span class="choice__tag">${escapeHtml(option.tag)}</span>` : ""}
          <span class="choice__label">${escapeHtml(option.label)}</span>
          ${option.description ? `<span class="choice__description">${escapeHtml(option.description)}</span>` : ""}
        </span>
        <span class="choice__mark" aria-hidden="true">${current === option.value ? "Your answer" : "→"}</span>
      </button>`).join("")}</div>`;
  }

  function renderOptionInputs(field, type) {
    const current = state.answers[field.key];
    const picked = (value) => (type === "checkbox" ? Array.isArray(current) && current.includes(value) : current === value);
    return `<fieldset class="options${state.errors[field.key] ? " has-error" : ""}"${describedBy(field) ? ` aria-describedby="${describedBy(field)}"` : ""}>
      <legend class="sr-only">${escapeHtml(field.label)}</legend>
      ${field.options.map((option) => `<label class="option"><input type="${type}" name="${field.key}" value="${option.value}"${picked(option.value) ? " checked" : ""}><span class="option__box" aria-hidden="true"></span><span class="option__label">${escapeHtml(option.label)}</span></label>`).join("")}
      ${errorHtml(field.key)}
    </fieldset>`;
  }

  function renderTextField(field, node) {
    const stored = state.answers[field.key];
    const prefill = !hasValue(stored) && field.prefillFrom ? field.prefillFrom.map((key) => state.answers[key]).find(hasValue) : "";
    const value = hasValue(stored) ? stored : prefill || "";
    const soleField = (node.fields || []).filter((item) => item.input !== "hidden").length === 1;
    const label = `<label class="field__label${soleField ? " sr-only" : ""}" for="f-${field.key}">${escapeHtml(field.label)}${field.required ? "" : ` <span class="field__optional">(optional)</span>`}</label>`;
    const common = `id="f-${field.key}" name="${field.key}"${field.maxLength ? ` maxlength="${field.maxLength}"` : ""}${field.autocomplete ? ` autocomplete="${field.autocomplete}"` : ""}${describedBy(field) ? ` aria-describedby="${describedBy(field)}"` : ""}${state.errors[field.key] ? ` aria-invalid="true"` : ""}`;
    const control = field.input === "textarea"
      ? `<textarea ${common} rows="${field.rows || 4}" data-autosave>${escapeHtml(value)}</textarea>`
      : `<input ${common} type="${field.input === "tel" ? "tel" : field.input === "email" ? "email" : "text"}"${field.input === "email" ? ` inputmode="email" autocapitalize="none" spellcheck="false"` : ""}${field.input === "tel" ? ` inputmode="tel"` : ""} value="${escapeHtml(value)}" data-autosave>`;
    const counter = field.input === "textarea" && field.maxLength ? `<p class="field__count" data-count-for="${field.key}" hidden></p>` : "";
    return `<div class="field${state.errors[field.key] ? " has-error" : ""}">${label}${control}${field.hint ? `<p class="field__hint" id="hint-${field.key}">${escapeHtml(field.hint)}</p>` : ""}${counter}${errorHtml(field.key)}</div>`;
  }

  function renderFields(node) {
    return (node.fields || []).filter((field) => field.input !== "hidden").map((field) => {
      if (field.input === "choice") return isTapAdvance(node) ? renderChoiceButtons(field) : renderOptionInputs(field, "radio");
      if (field.input === "multi") return renderOptionInputs(field, "checkbox");
      return renderTextField(field, node);
    }).join("");
  }

  function kickerFor(node) {
    const path = journey.paths[currentPath(state.answers)];
    const step = stepInfo(node.id, state.answers);
    if (node.id === "sorter") return "Help me choose";
    if (!step) return path.label;
    return `${path.label} <span class="kicker__sep" aria-hidden="true">/</span> Step ${step.n} of ${step.total}`;
  }

  function footerLinks(showWrite) {
    return `<div class="screen__foot">
      <button type="button" class="link" data-action="back">Back</button>
      ${showWrite ? `<button type="button" class="link" data-action="write-instead">Rather just write to us?</button>` : ""}
    </div>`;
  }

  function renderStart() {
    const node = nodesById.get("intent");
    const draft = state.draftFound;
    const resume = draft ? `<div class="resume" role="region" aria-label="A note in progress">
        <p class="resume__text"><strong>You have a note in progress.</strong> It was saved on this device only.</p>
        <div class="resume__actions">
          <button type="button" class="btn btn--primary" data-action="resume">Pick up where I left off</button>
          <button type="button" class="link" data-action="clear">Start again</button>
        </div>
      </div>` : "";
    return `<div class="screen screen--start">
      <p class="kicker">Start here</p>
      <h1 class="screen__title" tabindex="-1">${escapeHtml(node.title)}</h1>
      <ul class="plain">
        <li>HAND is a small foundation in Austin, Texas, incorporating as a 501(c)(3). One person reads every note.</li>
        <li>A few taps and one or two written answers. No account.</li>
        <li>Nothing is sent until you press Send at the end.</li>
      </ul>
      ${resume}
      ${renderChoiceButtons(node.fields[0])}
      <div class="screen__foot"><button type="button" class="link" data-action="write-instead">Rather just write to us?</button></div>
    </div>`;
  }

  function renderQuestion(node) {
    const tap = isTapAdvance(node);
    const optional = !tap && !(node.fields || []).some((field) => field.required);
    return `<form class="screen" novalidate data-form="node">
      <p class="kicker" id="kicker">${kickerFor(node)}</p>
      <h1 class="screen__title" tabindex="-1" aria-describedby="kicker">${escapeHtml(node.title)}</h1>
      ${node.body ? `<p class="screen__body">${escapeHtml(node.body)}</p>` : ""}
      ${renderFields(node)}
      ${tap ? "" : `<div class="screen__actions"><button type="submit" class="btn btn--primary">${state.returnToReview ? "Save and return to my note" : "Continue"}</button>${optional ? `<span class="screen__skip">Optional. Continue without answering if you like.</span>` : ""}</div>`}
      ${footerLinks(node.id !== "triage_need" && node.id !== "triage_timing")}
    </form>`;
  }

  function renderInformation(node) {
    return `<div class="screen">
      <p class="kicker">${kickerFor(node)}</p>
      <h1 class="screen__title" tabindex="-1">${escapeHtml(node.title)}</h1>
      <p class="screen__body screen__body--long">${escapeHtml(node.body)}</p>
      <div class="screen__actions"><button type="button" class="btn btn--primary" data-action="advance">Continue</button></div>
      ${footerLinks(true)}
    </div>`;
  }

  function renderExit(node) {
    return `<div class="screen">
      <p class="kicker">${journey.paths.fund.label}</p>
      <h1 class="screen__title" tabindex="-1">${escapeHtml(node.title)}</h1>
      <p class="screen__body screen__body--long">${escapeHtml(node.body)}</p>
      <ul class="exits">${node.completionActions.map((action) => `<li><a class="exit" href="${action.href}"${action.external ? ` target="_blank" rel="noopener noreferrer"` : ""}><span>${escapeHtml(action.label)}</span><span aria-hidden="true">${action.external ? "↗" : "→"}</span>${action.external ? `<span class="sr-only"> (opens a new tab)</span>` : ""}</a></li>`).join("")}</ul>
      <div class="screen__actions"><button type="button" class="btn btn--ghost" data-action="choose" data-key="funding_mode" data-value="conversation">Write to HAND about a gift first</button></div>
      ${footerLinks(false)}
    </div>`;
  }

  function renderReview(node) {
    const consent = nodesById.get("consent");
    const stray = strayAnswers(state.answers);
    return `<form class="screen screen--review" novalidate data-form="send">
      <p class="kicker">${journey.paths[currentPath(state.answers)].label} <span class="kicker__sep" aria-hidden="true">/</span> Review</p>
      <h1 class="screen__title" tabindex="-1">${escapeHtml(node.title)}</h1>
      <p class="screen__body">${escapeHtml(node.body)}</p>
      <div class="letter letter--full">${renderLetter(state.answers, true)}</div>
      ${stray.length ? `<div class="stray"><h2 class="stray__title">Also kept from earlier</h2><p class="stray__body">You answered these before changing direction. They are sent too, unless you remove them.</p><ul>${stray.map((item) => `<li><span><strong>${escapeHtml(item.label)}:</strong> ${escapeHtml(item.text)}</span> <button type="button" class="link" data-action="remove" data-key="${item.key}" aria-label="Remove: ${escapeHtml(item.label)}">Remove</button></li>`).join("")}</ul></div>` : ""}
      <div class="consent">
        <h2 class="consent__title">${escapeHtml(consent.title)}</h2>
        <p class="consent__body">${escapeHtml(consent.body)}</p>
        ${consent.fields.map((field) => `<label class="option option--plain${state.errors[field.key] ? " has-error" : ""}"><input type="checkbox" name="${field.key}"${state.answers[field.key] ? " checked" : ""}${state.errors[field.key] ? ` aria-invalid="true" aria-describedby="error-${field.key}"` : ""}><span class="option__box" aria-hidden="true"></span><span class="option__label">${escapeHtml(field.label)}</span></label>${errorHtml(field.key)}`).join("")}
      </div>
      ${errorHtml("send")}
      <div class="screen__actions"><button type="submit" class="btn btn--primary btn--lg">Send to HAND</button></div>
      ${footerLinks(false)}
    </form>`;
  }

  function renderReceived(node) {
    const sent = state.sent;
    if (!sent) return renderStart();
    const path = journey.paths[sent.path];
    const replyBy = replyByText(new Date(sent.receipt.replyBy));
    const preview = MODE === "preview" ? `<div class="preview-note" role="note">
        <p><strong>This is a preview. Nothing was sent.</strong> A real visitor would see this page after their note was stored. To reach HAND today, use <a href="/reciprocates/">the form on the Reciprocates page</a>.</p>
        <details><summary>What would have been sent</summary><pre>${escapeHtml(JSON.stringify({ ...sent.envelope, idempotencyKey: "(generated on send)" }, null, 2))}</pre></details>
      </div>` : "";
    return `<div class="screen screen--received">
      <p class="kicker">${escapeHtml(path.label)} <span class="kicker__sep" aria-hidden="true">/</span> Received</p>
      <h1 class="screen__title" tabindex="-1">${escapeHtml(node.title)}</h1>
      <p class="screen__body screen__body--long">A person at HAND will reply by <strong>${escapeHtml(replyBy)}</strong>. Your reference is <span class="reference">${escapeHtml(sent.receipt.reference)}</span>.</p>
      ${preview}
      <ol class="next">
        <li><span class="next__when">By ${escapeHtml(replyBy)}</span><span class="next__what">A person reads your note and writes back. Not an autoresponder.</span></li>
        <li><span class="next__when">Within about two weeks, if there is something to build on</span><span class="next__what">A 30-minute call. A conversation, no pitch deck.</span></li>
        <li><span class="next__when">Either way</span><span class="next__what">You hear back. Not yet is not the same as no, and we will tell you which it is.</span></li>
      </ol>
      ${path.note ? `<p class="aside">${escapeHtml(path.note)}</p>` : ""}
      <h2 class="links__title">While you wait</h2>
      <ul class="exits">${path.links.map((link) => `<li><a class="exit" href="${link.href}"><span>${escapeHtml(link.label)}</span><span aria-hidden="true">→</span></a></li>`).join("")}</ul>
      <details class="sent-letter"><summary>The note you sent</summary><div class="letter letter--full">${renderLetter(sent.envelope.answers, false)}</div></details>
      <div class="screen__foot"><button type="button" class="link" data-action="clear">Write another note</button></div>
    </div>`;
  }

  function renderScreen() {
    const node = nodesById.get(state.at) || nodesById.get(journey.startNodeId);
    if (node.id === "intent") return renderStart();
    if (node.type === "review" || node.type === "consent") return renderReview(nodesById.get("review"));
    if (node.type === "completion") return renderReceived(node);
    if (node.type === "external_action") return renderExit(node);
    if (node.type === "information") return renderInformation(node);
    return renderQuestion(node);
  }

  function render(options = {}) {
    const node = nodesById.get(state.at) || nodesById.get(journey.startNodeId);
    const wide = node.type === "review" || node.type === "consent" || node.type === "completion";
    const step = stepInfo(node.id, state.answers);
    const hasAnswers = Object.keys(state.answers).some((key) => hasValue(state.answers[key]));
    const lines = letterLines(state.answers).length;

    app.innerHTML = `
      <div class="progress" aria-hidden="true"><span class="progress__bar" style="transform: scaleX(${step ? step.n / step.total : wide ? 1 : 0})"></span></div>
      <div class="stage${wide ? " stage--wide" : ""}">
        <main class="stage__main" id="main">${renderScreen()}</main>
        ${wide ? "" : `<aside class="stage__side" aria-label="Your note so far">
          <details class="note" ${window.matchMedia("(min-width: 900px)").matches ? "open" : ""}>
            <summary class="note__summary"><span>Your note so far</span><span class="note__count">${lines === 0 ? "empty" : lines === 1 ? "1 line" : `${lines} lines`}</span></summary>
            <div class="letter">${renderLetter(state.answers, false)}</div>
          </details>
          <p class="saved">${hasAnswers ? `Saved on this device only. <button type="button" class="link" data-action="clear">Clear my answers</button>` : "Nothing is saved or sent until you answer."}</p>
        </aside>`}
      </div>`;

    updateCounters();
    document.title = node.id === "intent" ? "Start here · HAND Protocol" : `${node.title} · HAND Protocol`;

    if (options.focusError) {
      const invalid = app.querySelector('[aria-invalid="true"], .has-error input, .has-error textarea');
      if (invalid) invalid.focus();
      return;
    }
    if (options.moveFocus) {
      window.scrollTo({ top: 0, behavior: "auto" });
      const title = app.querySelector(".screen__title");
      if (title) title.focus({ preventScroll: true });
      const screen = app.querySelector(".screen");
      if (screen && !reducedMotion.matches) screen.classList.add("is-entering");
    }
  }

  function updateCounters() {
    app.querySelectorAll("[data-count-for]").forEach((counter) => {
      const field = fieldsByKey.get(counter.dataset.countFor);
      const input = app.querySelector(`[name="${field.key}"]`);
      if (!input) return;
      const left = field.maxLength - input.value.length;
      counter.hidden = input.value.length < field.maxLength * COUNTER_THRESHOLD;
      counter.textContent = `${left.toLocaleString("en-US")} characters left`;
    });
  }

  // ---------- events ----------

  const actions = {
    choose: (target) => choose(target.dataset.key, target.dataset.value),
    advance: () => advance(),
    back: () => back(),
    "write-instead": () => writeInstead(),
    edit: (target) => go(target.dataset.node, { patch: { returnToReview: true } }),
    remove: (target) => {
      const { [target.dataset.key]: _removed, ...answers } = state.answers;
      setState({ answers });
      writeDraft();
      render();
    },
    clear: () => clearAnswers(),
    resume: () => {
      const draft = state.draftFound;
      const route = walk(draft.answers, true);
      const reachable = route.some((node) => node.id === draft.at);
      setState({ answers: draft.answers, draftFound: null });
      go(reachable ? draft.at : route[route.length - 1].id);
    },
  };

  app.addEventListener("click", (event) => {
    const target = event.target.closest("[data-action]");
    if (!target || !actions[target.dataset.action]) return;
    event.preventDefault();
    actions[target.dataset.action](target);
  });

  app.addEventListener("submit", (event) => {
    event.preventDefault();
    if (event.target.dataset.form === "send") send();
    else submitNode();
  });

  // Keep typed text as the person types, so a refresh or an interruption loses nothing.
  let saveTimer = 0;
  app.addEventListener("input", (event) => {
    const input = event.target;
    if (!input.matches("[data-autosave]")) return;
    setState({ answers: { ...state.answers, [input.name]: input.value } });
    updateCounters();
    window.clearTimeout(saveTimer);
    saveTimer = window.setTimeout(writeDraft, 400);
  });

  window.addEventListener("popstate", (event) => {
    // Once a note is sent, Back must not bring up a screen that could send it twice.
    const wanted = event.state && nodesById.has(event.state.at) ? event.state.at : journey.startNodeId;
    const target = state.sent ? "received" : wanted;
    const reachable = target === "received" ? Boolean(state.sent) : walk(state.answers, true).some((node) => node.id === target);
    setState({ at: reachable ? target : journey.startNodeId, errors: {}, returnToReview: false });
    render({ moveFocus: true });
  });

  // ---------- start ----------

  setState({ draftFound: readDraft() });
  window.history.replaceState({ at: journey.startNodeId }, "");
  render();
  emit("view", journey.startNodeId);
})();
