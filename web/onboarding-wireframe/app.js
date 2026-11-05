(() => {
  const DRAFT_KEY = "hand_onboarding_wireframe_draft_v1";
  const DRAFT_AGE = 30 * 24 * 60 * 60 * 1000;
  const body = document.body;
  const shell = document.getElementById("deviceShell");
  const journeyView = document.getElementById("journeyView");
  const builderView = document.getElementById("builderView");
  const inboxView = document.getElementById("inboxView");
  const frameLabel = document.querySelector("[data-frame-label]");
  const template = document.getElementById("journeyTemplate");

  const PATHS = {
    support: { label: "Receive support", kicker: "For Reciprocates", reply: "Thursday, August 6", links: [["Read the discovery research", "../discovery/"], ["Learn about Sovereign Reciprocates", "../sovereign-reciprocates/"], ["Stay close to HAND", "../#stay-close"]] },
    contribute: { label: "Contribute skills", kicker: "For Contributors", reply: "Thursday, August 6", links: [["Read the resource-pool vision", "../discovery/skill-exchange-vision.html"], ["See HAND’s research", "../discovery/"], ["Support the filing raise", "../#tiers"]] },
    fund: { label: "Fund the work", kicker: "For funders", reply: "Thursday, August 6", links: [["Read the governance package", "../governance/"], ["Explore the foundation campaign", "../"], ["See the research behind HAND", "../discovery/"]] },
    partner: { label: "Partner with HAND", kicker: "For collaborators", reply: "Thursday, August 6", links: [["See the landscape research", "../discovery/impact-org-landscape.html"], ["Read the governance package", "../governance/"], ["Explore the foundation campaign", "../"]] },
    triage: { label: "Human triage", kicker: "A real person will help", reply: "Thursday, August 6", links: [["Explore HAND’s work", "../"], ["Read the discovery research", "../discovery/"], ["Email HAND directly", "mailto:hand@handprotocol.org"]] },
  };

  let state = { path: "choose", step: 0, answers: {}, consent: false, communication: false, chatIntent: null, chatIndex: 0, chatStage: null, chatThinking: false, chatPending: null };

  const CHAT_CONTACT = [
    { key: "name", prompt: "What should I call you?", kind: "text" },
    { key: "organization_name", prompt: "Is there an organization or group name I should include?", kind: "text", optional: true },
    { key: "email", prompt: "What email should HAND use for a real reply?", kind: "email" },
    { key: "phone", prompt: "Would you like to share a phone number too?", kind: "phone", optional: true },
  ];

  const CHAT_FLOWS = {
    support: [
      { key: "identity", prompt: "Which description feels closest?", kind: "choice", options: [["impact_entrepreneur", "Impact entrepreneur"], ["community_business", "Community-rooted small business"], ["grassroots_org", "Grassroots organization"], ["emerging_group", "Emerging group"]] },
      { key: "work_description", prompt: "What are you building or holding?", kind: "text" },
      { key: "stage", prompt: "Where are you right now?", kind: "choice", options: [["idea", "Early idea"], ["forming", "Forming"], ["operating", "Operating"], ["growing", "Growing or changing"]] },
      { key: "location", prompt: "Where are you based?", kind: "text" },
      { key: "obstacle", prompt: "What is the immediate obstacle?", kind: "text" },
      { key: "support_needs", prompt: "What support would help most? Choose any that fit.", kind: "multi", options: [["web", "Website or web presence"], ["brand", "Brand or story"], ["formation", "Formation or legal structure"], ["operations", "Operations"], ["matching", "Contributor matching"], ["funding", "Funding navigation"], ["sovereign_ai", "Sovereign Reciprocates"], ["long_term", "Long-term accompaniment"], ["unsure", "I am not sure yet"]] },
      { key: "timing", prompt: "When would support help most?", kind: "choice", options: [["now", "Right now"], ["month", "Within a month"], ["quarter", "This season"], ["exploring", "I am exploring"]] },
      { key: "resources", prompt: "What resources already exist, if any?", kind: "text", optional: true },
    ],
    contribute: [
      { key: "profession", prompt: "What is your profession or trade?", kind: "text" },
      { key: "skills_summary", prompt: "What skills or practical strengths do you bring?", kind: "text" },
      { key: "availability", prompt: "Where are you available, locally or remotely?", kind: "text" },
      { key: "capacity", prompt: "What capacity feels right?", kind: "choice", options: [["one_time", "One focused contribution"], ["monthly", "A few hours monthly"], ["ongoing", "An ongoing relationship"]] },
      { key: "contribution_mode", prompt: "Would you like to Donate time or Exchange?", kind: "choice", options: [["donate", "Donate time"], ["exchange", "Exchange"]] },
      { key: "credentials", prompt: "Any credentials or experience worth noting?", kind: "text", optional: true },
      { key: "preferred_work", prompt: "What kinds of work feel most useful to you?", kind: "text" },
    ],
    fund: [
      { key: "funding_mode", prompt: "How would you like to help?", kind: "choice", options: [["direct", "Make a direct gift"], ["conversation", "Institutional or major gift"], ["sponsorship", "Sponsorship or grant"]] },
      { key: "funding_interest", prompt: "What interests you about HAND?", kind: "choice", options: [["filing", "501(c)(3) filing raise"], ["reciprocates", "Reciprocate accompaniment"], ["contributors", "Resource pool and Contributors"], ["sovereign_ai", "Sovereign Reciprocates"], ["general", "General support"]] },
      { key: "expected_range", prompt: "Is there an expected range you can share?", kind: "choice", options: [["under_5k", "Under $5,000"], ["5_25k", "$5,000 to $25,000"], ["25_100k", "$25,000 to $100,000"], ["100k_plus", "$100,000+"], ["unknown", "Still exploring"]] },
      { key: "funding_timing", prompt: "What timing are you working with?", kind: "choice", options: [["now", "Now"], ["quarter", "This quarter"], ["year", "This year"], ["unknown", "Still exploring"]] },
      { key: "organization", prompt: "What organization or affiliation should HAND know about?", kind: "text", optional: true },
      { key: "funding_note", prompt: "Is there anything else you would like HAND to know before replying?", kind: "text", optional: true },
    ],
    partner: [
      { key: "partner_type", prompt: "What kind of organization are you?", kind: "choice", options: [["community_org", "Community organization"], ["fiscal_sponsor", "Fiscal sponsor"], ["funder_intermediary", "Funder or intermediary"], ["referral_partner", "Referral partner"], ["technology_partner", "Technology partner"], ["other", "Another collaborator"]] },
      { key: "partner_org", prompt: "What is the organization called?", kind: "text" },
      { key: "relationship", prompt: "What relationship do you have in mind?", kind: "text" },
      { key: "mutual_value", prompt: "What could be useful in both directions?", kind: "text" },
      { key: "partner_timing", prompt: "What is the timing?", kind: "choice", options: [["now", "A current need"], ["quarter", "This quarter"], ["future", "A future possibility"], ["exploring", "Still exploring"]] },
    ],
    triage: [
      { key: "triage_need", prompt: "What is happening, and what do you hope changes?", kind: "text" },
      { key: "triage_timing", prompt: "How soon would a reply help?", kind: "choice", options: [["now", "Now"], ["soon", "Soon"], ["exploring", "I am exploring"]] },
    ],
  };

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character]);
  }

  function loadDraft() {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (!raw) return;
      const draft = JSON.parse(raw);
      if (!draft.savedAt || Date.now() - draft.savedAt > DRAFT_AGE) { localStorage.removeItem(DRAFT_KEY); return; }
      if (draft.state?.path && draft.state.path !== "choose") state = draft.state;
    } catch { /* Storage is optional in this wireframe. */ }
  }

  function saveDraft() {
    if (state.path === "choose" || state.step === "success") return;
    try { localStorage.setItem(DRAFT_KEY, JSON.stringify({ savedAt: Date.now(), state })); } catch { /* Storage can be blocked. */ }
  }

  function clearDraft() {
    try { localStorage.removeItem(DRAFT_KEY); } catch { /* nothing to clear */ }
    state = { path: "choose", step: 0, answers: {}, consent: false, communication: false, chatIntent: null, chatIndex: 0, chatStage: null, chatThinking: false, chatPending: null };
    renderJourney();
  }

  function reset(path = "choose", answers = {}) {
    state = { path, step: 0, answers, consent: false, communication: false, chatIntent: null, chatIndex: 0, chatStage: null, chatThinking: false, chatPending: null };
    renderJourney();
  }

  function choice(title, description, value, selected = false) {
    return `<button class="choice${selected ? " is-selected" : ""}" type="button" data-choice="${value}"><span class="choice__symbol">${selected ? "●" : "○"}</span><span class="choice__body"><span class="choice__title">${title}</span>${description ? `<span class="choice__description">${description}</span>` : ""}</span><span class="choice__arrow">→</span></button>`;
  }

  function formField(key, label, type = "text", options = {}) {
    const value = state.answers[key] ?? "";
    const wide = options.wide ? " field--wide" : "";
    const hint = options.hint ? `<span class="hint">${options.hint}</span>` : "";
    if (type === "select") return `<div class="field${wide}"><label for="field-${key}">${label} ${hint}</label><select id="field-${key}" data-key="${key}">${options.options.map(([v, text]) => `<option value="${v}"${value === v ? " selected" : ""}>${text}</option>`).join("")}</select></div>`;
    if (type === "textarea") return `<div class="field${wide}"><label for="field-${key}">${label} ${hint}</label><textarea id="field-${key}" data-key="${key}" ${options.required ? "required" : ""}>${escapeHtml(value)}</textarea></div>`;
    return `<div class="field${wide}"><label for="field-${key}">${label} ${hint}</label><input id="field-${key}" data-key="${key}" type="${type}" value="${escapeHtml(value)}" ${options.required ? "required" : ""}></div>`;
  }

  function checkGrid(key, options) {
    const values = Array.isArray(state.answers[key]) ? state.answers[key] : [];
    return `<div class="check-grid">${options.map(([value, label]) => `<label class="check"><input type="checkbox" data-check-key="${key}" value="${value}" ${values.includes(value) ? "checked" : ""}><span>${label}</span></label>`).join("")}</div>`;
  }

  function captureFields() {
    journeyView.querySelectorAll("[data-key]").forEach((input) => { state.answers[input.dataset.key] = input.value.trim(); });
    journeyView.querySelectorAll("[data-check-key]").forEach((input) => {
      const key = input.dataset.checkKey;
      const selected = [...journeyView.querySelectorAll(`[data-check-key="${key}"]:checked`)].map((item) => item.value);
      state.answers[key] = selected;
    });
  }

  function updateProgress() {
    const progress = journeyView.querySelector("#progress");
    if (!progress) return;
    const total = state.path === "choose" ? 1 : stepCount(state.path);
    progress.style.width = `${Math.min(100, (state.step / total) * 100)}%`;
  }

  function stepCount(path) { return path === "choose-help" ? 3 : 4; }

  function stepLabel() {
    if (state.path === "choose") return "Choose a path";
    if (state.path === "chat") return state.chatStage === "success" ? "Received" : "Chat";
    if (state.step === "review") return "Review before sending";
    if (state.step === "success") return "Received";
    return `Step ${state.step + 1} of ${stepCount(state.path)}`;
  }

  function page(kicker, title, lede, content, actions = "") {
    return `<div class="question"><span class="question-kicker">${kicker}</span><h2>${title}</h2>${lede ? `<p class="question__lede">${lede}</p>` : ""}${content}${actions}</div>`;
  }

  function renderStart() {
    return page("Start here", "What brings you to HAND?", "Choose the closest door. You can change direction, and a real person can help if the labels miss.", `<div class="choice-list">${choice("Chat with HAND", "Answer short prompts in one conversation, with quick replies and a review at the end.", "chat")}${choice("Receive support", "For impact entrepreneurs, community-rooted businesses, grassroots organizations, and emerging groups.", "support")}${choice("Contribute skills", "Bring a profession, trade, or practical capability into HAND’s curated resource pool.", "contribute")}${choice("Fund the work", "Make a gift now, or start an institutional, major-gift, sponsorship, or grant conversation.", "fund")}${choice("Partner with HAND", "For community organizations, fiscal sponsors, funder intermediaries, referrals, and technology partners.", "partner")}${choice("Help me choose", "Two plain-language questions, then we will suggest a path or route this to a human.", "choose-help")}</div>`);
  }

  function chatQuestions(intent) {
    return [...(CHAT_FLOWS[intent] || []), ...CHAT_CONTACT];
  }

  function optionLabel(question, value) {
    return question?.options?.find(([key]) => key === value)?.[1] || value;
  }

  function commitChatAnswer(question, value) {
    if (question.key === "funding_mode" && value === "direct") {
      state.answers[question.key] = value;
      state.chatStage = "external";
      renderJourney();
      return;
    }
    if (question.key === "chat_fit") {
      state.answers.chat_fit = value;
      state.chatIntent = value === "triage" ? "triage" : value;
      state.chatIndex = 0;
      renderJourney();
      return;
    }
    state.answers[question.key] = value;
    state.chatIndex += 1;
    renderJourney();
  }

  function chatAnswer(question, value) {
    state.chatThinking = true;
    state.chatPending = { question, value };
    renderJourney();
    window.setTimeout(() => {
      if (!state.chatPending || state.chatPending.question.key !== question.key) return;
      state.chatThinking = false;
      state.chatPending = null;
      commitChatAnswer(question, value);
    }, 520);
  }

  function chatBubble(kind, content, extra = "") {
    const avatar = kind === "you" ? "" : `<span class="chat-avatar" aria-hidden="true">H</span>`;
    return `<div class="chat-message chat-message--${kind}"${extra}>${avatar}<div class="chat-bubble chat-bubble--${kind}">${content}</div></div>`;
  }

  function chatThinking() {
    return chatBubble("thinking", `<p><span>Holistically approaching your request</span><span class="chat-thinking__dots" aria-label="Thinking"><i></i><i></i><i></i></span></p>`);
  }

  function chatHeader(progress = "") {
    return `<div class="chat__top"><div><span class="question-kicker">HAND</span><span class="chat__name">Holistic Approach to Nurture and Develop</span></div>${progress ? `<span class="journey__step">${progress}</span>` : ""}<button type="button" class="link-button" data-leave-chat>Use the standard journey</button></div>`;
  }

  function renderChatQuestion(question) {
    if (question.kind === "choice") return `<div class="chat-choices">${question.options.map(([value, label]) => `<button type="button" data-chat-answer="${value}">${label}</button>`).join("")}</div>`;
    if (question.kind === "multi") return `<div class="chat-choices chat-choices--multi">${question.options.map(([value, label]) => `<label><input type="checkbox" data-chat-multi value="${value}"><span>${label}</span></label>`).join("")}<button class="primary" type="button" data-chat-multi-send>Continue</button></div>`;
    return `<div class="chat-composer"><label class="sr-only" for="chatInput">Your reply</label><textarea id="chatInput" rows="2" placeholder="Write a reply…"></textarea><button class="primary" type="button" data-chat-send>Send</button>${question.optional ? `<button class="link-button" type="button" data-chat-skip>Skip</button>` : ""}</div>`;
  }

  function renderChatReview() {
    const summary = Object.entries(state.answers).filter(([key, value]) => key !== "chat_fit" && value && (!Array.isArray(value) || value.length)).map(([key, value]) => `<div><span>${escapeHtml(readableKey(key))}</span><strong>${escapeHtml(Array.isArray(value) ? value.join(", ") : value)}</strong><button type="button" data-chat-edit="${key}">Change</button></div>`).join("");
    return `<div class="chat">${chatHeader("Review")}<div class="chat__thread">${chatBubble("hand", "<p>I have this down. Please check the summary before it reaches HAND.</p>")}${chatBubble("summary", summary)}${chatBubble("hand", "<p>HAND will use this information only to respond to your introduction and coordinate a next step. Do you agree to send it?</p>")}<div class="chat-choices"><button type="button" data-chat-consent="yes">I agree to send</button><button type="button" data-chat-consent="back">I need to change something</button></div></div></div>`;
  }

  function renderChatSuccess() {
    const data = PATHS[state.chatIntent] || PATHS.triage;
    return `<div class="chat">${chatHeader("Received")}<div class="chat__thread">${chatBubble("hand", `<p><strong>Your introduction is received.</strong></p><p>A person at HAND will reply by ${data.reply}. Your reference is <span class="reference">${referenceFor(state.chatIntent)}</span>.</p>`)}${chatBubble("hand", `<p>While you wait:</p><ul>${data.links.map(([label, href]) => `<li><a href="${href}">${label}</a></li>`).join("")}</ul>`)}<div class="chat-choices"><button type="button" data-restart>Start another introduction</button></div></div></div>`;
  }

  function renderChat() {
    if (!state.chatIntent) return `<div class="chat">${chatHeader()}<div class="chat__thread">${chatBubble("hand", "<p>Hi. I can walk with you one question at a time. What brings you to HAND?</p>")}<div class="chat-choices">${[["support", "I need support for my work"], ["contribute", "I have skills or a trade to offer"], ["fund", "I want to fund the work"], ["partner", "I want to partner with HAND"], ["help", "Help me choose"]].map(([value, label]) => `<button type="button" data-chat-intent="${value}">${label}</button>`).join("")}</div></div></div>`;
    if (state.chatStage === "external") return `<div class="chat">${chatHeader()}<div class="chat__thread">${chatBubble("hand", "<p>I can take you to the current donation route. This prototype will not collect payment details here.</p>")}<div class="chat-choices"><a class="primary" href="../#tiers">Continue to donate</a><button type="button" data-chat-restart-intent>Choose a different way to help</button></div></div></div>`;
    if (state.chatStage === "review") return renderChatReview();
    if (state.chatStage === "success") return renderChatSuccess();
    const questions = state.chatIntent === "help" ? [{ key: "chat_fit", prompt: "Which direction feels closest?", kind: "choice", options: [["support", "My work needs support"], ["contribute", "I have skills or a trade to offer"], ["fund", "I want to fund or resource HAND"], ["partner", "I want to collaborate"], ["triage", "None of these fit"]] }] : chatQuestions(state.chatIntent);
    const question = questions[state.chatIndex];
    if (!question) { state.chatStage = "review"; return renderChatReview(); }
    const history = questions.slice(0, state.chatIndex).map((item) => `${chatBubble("hand", `<p>${item.prompt}</p>`)}${chatBubble("you", `<p>${escapeHtml(Array.isArray(state.answers[item.key]) ? state.answers[item.key].map((value) => optionLabel(item, value)).join(", ") : optionLabel(item, state.answers[item.key]))}</p>`)}`).join("");
    const pending = state.chatPending;
    const thread = state.chatThinking && pending ? `${history}${chatBubble("hand", `<p>${question.prompt}</p>`)}${chatBubble("you", `<p>${escapeHtml(Array.isArray(pending.value) ? pending.value.map((value) => optionLabel(question, value)).join(", ") : optionLabel(question, pending.value))}</p>`)}${chatThinking()}` : `${history}${chatBubble("hand", `<p>${question.prompt}</p>`)}${renderChatQuestion(question)}`;
    return `<div class="chat">${chatHeader(state.chatIntent === "help" ? "A quick check-in" : `${state.chatIndex + 1} of ${questions.length}`)}<div class="chat__thread" aria-live="polite">${thread}</div></div>`;
  }

  function renderSupport() {
    if (state.step === 0) return page("Receive support · 1 of 4", "Tell us about the work.", "This is not a competition for perfect words. A clear starting point is enough.", `<div class="form-grid">${formField("identity", "Which is closest?", "select", { options: [["", "Choose one"], ["impact_entrepreneur", "Impact entrepreneur"], ["community_business", "Community-rooted small business"], ["grassroots_org", "Grassroots organization"], ["emerging_group", "Emerging group"]] })}${formField("work_name", "Name of the work or group", "text", { hint: "optional" })}${formField("work_description", "What are you building or holding?", "textarea", { wide: true, required: true })}${formField("stage", "Where are you now?", "select", { options: [["", "Choose a stage"], ["idea", "Early idea"], ["forming", "Forming"], ["operating", "Operating"], ["growing", "Growing or changing"]] })}${formField("location", "Where are you based?", "text", { required: true })}${formField("obstacle", "What is the immediate obstacle?", "textarea", { wide: true, required: true })}</div>`, nextButtons());
    if (state.step === 1) return page("Receive support · 2 of 4", "What kind of support would help?", "Choose as many as fit. “Unsure” is a complete answer.", `<div class="choice-list">${checkGrid("support_needs", [["web", "Website or web presence"], ["brand", "Brand or story"], ["formation", "Formation or legal structure"], ["operations", "Operations and basic systems"], ["matching", "Contributor matching"], ["funding", "Funding navigation"], ["sovereign_ai", "Sovereign Reciprocates"], ["long_term", "Long-term accompaniment"], ["unsure", "I am not sure yet"]])}</div>`, nextButtons());
    if (state.step === 2) return page("Receive support · 3 of 4", "What is the timing and what already exists?", "This helps HAND make an honest first reply.", `<div class="form-grid">${formField("timing", "When would support help most?", "select", { options: [["", "Choose timing"], ["now", "Right now"], ["month", "Within a month"], ["quarter", "This season"], ["exploring", "I am exploring"]] })}${formField("resources", "Existing resources", "text", { hint: "people, tools, funding, or relationships" })}${formField("context", "Anything else a person should understand?", "textarea", { wide: true, hint: "optional" })}</div>`, nextButtons());
    return renderContact("Receive support · 4 of 4");
  }

  function renderContribute() {
    if (state.step === 0) return page("Contribute skills · 1 of 4", "What do you bring?", "HAND curates matches and tends relationships over time. This is not an open job board.", `<div class="form-grid">${formField("profession", "Profession or trade", "text", { required: true })}${formField("availability", "Location or remote availability", "text", { required: true })}${formField("skills_summary", "Skills and practical strengths", "textarea", { wide: true, required: true })}${formField("capacity", "Capacity", "select", { options: [["", "Choose capacity"], ["one_time", "One focused contribution"], ["monthly", "A few hours monthly"], ["ongoing", "Ongoing relationship"]] })}</div>`, nextButtons());
    if (state.step === 1) return page("Contribute skills · 2 of 4", "How would you like to participate?", "Donate and Exchange are both valid ways into the pool.", `<div class="choice-list">${choice("Donate time", "Offer your skills without an exchange expectation.", "donate", state.answers.contribution_mode === "donate")}${choice("Exchange", "Trade skills, value, or access through a reciprocal arrangement.", "exchange", state.answers.contribution_mode === "exchange")}</div>`, nextButtons("contribution_mode"));
    if (state.step === 2) return page("Contribute skills · 3 of 4", "What work feels most useful?", "Tell us what kinds of Reciprocate work you are drawn to, and any credentials that matter.", `<div class="form-grid">${formField("credentials", "Relevant credentials or experience", "textarea", { wide: true, hint: "optional" })}${formField("preferred_work", "Preferred types of work", "textarea", { wide: true, required: true })}</div>`, nextButtons());
    return renderContact("Contribute skills · 4 of 4");
  }

  function renderFund() {
    if (state.step === 0) return page("Fund the work · 1 of 4", "How would you like to help?", "A direct gift takes you to the existing donation route. The other paths begin a conversation.", `<div class="choice-list">${choice("Make a direct gift", "Go to the current HAND donation page.", "direct")}${choice("Institutional or major gift", "A conversation about significant individual or institutional support.", "conversation")}${choice("Sponsorship or grant", "Explore a funded partnership, sponsorship, or grant opportunity.", "sponsorship")}</div>`, nextButtons("funding_mode"));
    if (state.answers.funding_mode === "direct") return `<div class="external"><span class="question-kicker">Direct gift</span><h2>Take me to the donation route.</h2><p class="question__lede">This wireframe never sends a payment. The production journey will record the voluntary exit without storing payment details.</p><a class="primary" href="../#tiers">Continue to donate</a><div class="button-row"><button class="link-button" type="button" data-back>Choose a different path</button></div></div>`;
    if (state.step === 1) return page("Fund the work · 2 of 4", "What interests you about HAND?", "A few words are enough. We will use them to prepare a relevant reply.", `<div class="form-grid">${formField("funding_interest", "Interest area", "select", { options: [["", "Choose an area"], ["filing", "501(c)(3) filing raise"], ["reciprocates", "Reciprocate accompaniment"], ["contributors", "Resource pool and Contributors"], ["sovereign_ai", "Sovereign Reciprocates"], ["general", "General support"]] })}${formField("expected_range", "Expected range", "select", { options: [["", "Prefer not to say"], ["under_5k", "Under $5,000"], ["5_25k", "$5,000 to $25,000"], ["25_100k", "$25,000 to $100,000"], ["100k_plus", "$100,000+"], ["unknown", "Still exploring"]] })}${formField("funding_timing", "Timing", "select", { options: [["", "Choose timing"], ["now", "Now"], ["quarter", "This quarter"], ["year", "This year"], ["unknown", "Still exploring"]] })}</div>`, nextButtons());
    if (state.step === 2) return page("Fund the work · 3 of 4", "What should we know before we reply?", "An organization, giving context, or question can help us prepare.", `<div class="form-grid">${formField("organization", "Organization or affiliation", "text", { hint: "optional" })}${formField("funding_note", "Context or question", "textarea", { wide: true, hint: "optional" })}</div>`, nextButtons());
    return renderContact("Fund the work · 4 of 4");
  }

  function renderPartner() {
    if (state.step === 0) return page("Partner with HAND · 1 of 4", "What kind of organization are you?", "We work alongside local organizations, funders, referrers, fiscal sponsors, and technology collaborators.", `<div class="form-grid">${formField("partner_type", "Organization type", "select", { options: [["", "Choose one"], ["community_org", "Community organization"], ["fiscal_sponsor", "Fiscal sponsor"], ["funder_intermediary", "Funder or intermediary"], ["referral_partner", "Referral partner"], ["technology_partner", "Technology partner"], ["other", "Another collaborator"]] })}${formField("partner_org", "Organization name", "text", { required: true })}</div>`, nextButtons());
    if (state.step === 1) return page("Partner with HAND · 2 of 4", "What relationship do you have in mind?", "Name the first useful shape. It can change as people talk.", `<div class="form-grid">${formField("relationship", "Proposed relationship", "textarea", { wide: true, required: true })}${formField("mutual_value", "What could be useful in both directions?", "textarea", { wide: true, required: true })}</div>`, nextButtons());
    if (state.step === 2) return page("Partner with HAND · 3 of 4", "What is the timing?", "Let us know what is already moving, or whether this is an early conversation.", `<div class="form-grid">${formField("partner_timing", "Timing", "select", { options: [["", "Choose timing"], ["now", "A current need"], ["quarter", "This quarter"], ["future", "A future possibility"], ["exploring", "Still exploring"]] })}${formField("partner_note", "Anything else we should know?", "textarea", { wide: true, hint: "optional" })}</div>`, nextButtons());
    return renderContact("Partner with HAND · 4 of 4");
  }

  function renderHelpChoose() {
    if (state.step === 0) return page("Help me choose · 1 of 3", "What are you hoping changes?", "This only guides the next question. It does not limit where you can end up.", `<div class="choice-list">${choice("My work needs support", "I am building, running, or holding something in my community.", "support")}${choice("I have skills or a trade to offer", "I want my time to land in a well-matched relationship.", "contribute")}${choice("I want to resource or collaborate", "I can fund, refer, sponsor, or build alongside HAND.", "resource")}${choice("None of these fit", "Please let a person read this without forcing a label.", "triage")}</div>`);
    if (state.step === 1) return page("Help me choose · 2 of 3", "What is most urgent right now?", "A short note helps the next person understand the stakes.", `<div class="form-grid">${formField("triage_need", "What is happening?", "textarea", { wide: true, required: true })}${formField("triage_timing", "Timing", "select", { options: [["", "Choose timing"], ["now", "Now"], ["soon", "Soon"], ["exploring", "I am exploring"]] })}</div>`, nextButtons());
    return renderContact("Help me choose · 3 of 3", true);
  }

  function renderContact(kicker, triage = false) {
    return page(kicker, "Where can a person reach you?", "We use this only to reply to this introduction. Communication updates are optional.", `<div class="form-grid">${formField("name", "Name", "text", { required: true })}${formField("organization_name", "Organization or group", "text", { hint: "optional" })}${formField("email", "Email", "email", { required: true })}${formField("phone", "Phone", "tel", { hint: "optional" })}</div>`, `<div class="button-row"><button class="secondary" type="button" data-back>Back</button><button class="primary" type="button" data-review>${triage ? "Review for human triage" : "Review your introduction"}</button></div>`);
  }

  function nextButtons(requiredChoice) {
    return `<div class="button-row"><button class="secondary" type="button" data-back>Back</button><button class="primary" type="button" data-next${requiredChoice ? ` data-requires="${requiredChoice}"` : ""}>Continue</button></div>`;
  }

  function readableKey(key) {
    return ({ identity:"Closest description", work_name:"Work or group", work_description:"What you are building", stage:"Current stage", location:"Location", obstacle:"Immediate obstacle", support_needs:"Support wanted", timing:"Timing", resources:"Existing resources", context:"Additional context", profession:"Profession or trade", availability:"Availability", skills_summary:"Skills", capacity:"Capacity", contribution_mode:"Participation", credentials:"Credentials", preferred_work:"Preferred work", funding_mode:"Funding path", funding_interest:"Interest area", expected_range:"Expected range", funding_timing:"Timing", organization:"Organization", funding_note:"Context", partner_type:"Organization type", partner_org:"Organization", relationship:"Proposed relationship", mutual_value:"Mutual value", partner_timing:"Timing", partner_note:"Additional context", triage_need:"What is happening", triage_timing:"Timing", name:"Name", organization_name:"Organization or group", email:"Email", phone:"Phone" })[key] || key.replaceAll("_", " ");
  }

  function renderReview() {
    const rows = Object.entries(state.answers).filter(([, value]) => value && (!Array.isArray(value) || value.length)).map(([key, value]) => `<div class="review-row"><dt>${escapeHtml(readableKey(key))}</dt><dd>${escapeHtml(Array.isArray(value) ? value.join(", ") : value)}</dd><button type="button" data-edit>Change</button></div>`).join("");
    return page(`${PATHS[state.path]?.kicker || "Introduction"} · Review`, "Check this before it reaches HAND.", "You can go back and correct any answer. This prototype does not send anything.", `<dl class="review-list">${rows}</dl><div class="consent"><strong>Privacy notice, version 2026-07-28</strong><br>HAND will use this information to respond to your introduction and coordinate any next step. It will not be sold or used for advertising.<label><input type="checkbox" data-consent ${state.consent ? "checked" : ""}> <span>I have read the privacy notice and agree to send this introduction.</span></label><label><input type="checkbox" data-communication ${state.communication ? "checked" : ""}> <span>HAND may send me occasional updates about this work. Optional.</span></label></div>`, `<div class="button-row"><button class="secondary" type="button" data-back>Back</button><button class="primary" type="button" data-submit ${state.consent ? "" : "disabled"}>Send introduction</button></div>`);
  }

  function renderSuccess(path = state.path) {
    const data = PATHS[path] || PATHS.triage;
    return page(data.kicker, "Your introduction is received.", `Reference ${referenceFor(path)}. A person at HAND will reply by ${data.reply}. You will also receive a concise email receipt at the address you shared.`, `<div class="success-mark" aria-hidden="true">✓</div><p class="reference">${referenceFor(path)}</p><div class="notice"><strong>What happens next</strong><br>HAND records this as received, routes it to the right person, and follows up until it reaches a real contact or a clear close.</div><div class="actions-list"><strong>While you wait</strong>${data.links.map(([label, href]) => `<a href="${href}">${label} →</a>`).join("")}</div>`, `<div class="button-row"><button class="secondary" type="button" data-restart>Start another introduction</button></div>`);
  }

  function referenceFor(path) { return `HAND-${({support:"R",contribute:"C",fund:"F",partner:"P",triage:"T"})[path] || "R"}-20260728-014`; }

  function currentMarkup() {
    if (state.path === "chat") return renderChat();
    if (state.step === "review") return renderReview();
    if (state.step === "success") return renderSuccess();
    if (state.path === "choose") return renderStart();
    if (state.path === "support") return renderSupport();
    if (state.path === "contribute") return renderContribute();
    if (state.path === "fund") return renderFund();
    if (state.path === "partner") return renderPartner();
    if (state.path === "choose-help") return renderHelpChoose();
    return renderStart();
  }

  function renderJourney() {
    journeyView.hidden = false; builderView.hidden = true; inboxView.hidden = true;
    journeyView.innerHTML = template.innerHTML;
    journeyView.querySelector("#journeyBody").innerHTML = currentMarkup();
    const status = journeyView.querySelector("#draftStatus");
    journeyView.querySelector("#stepLabel").textContent = stepLabel();
    if (state.path !== "choose" && state.step !== "success") status.textContent = "Draft stays on this device for 30 days";
    frameLabel.textContent = `HAND / ${state.step === "success" ? "RECEIVED" : state.path.toUpperCase()}`;
    updateProgress(); bindJourney(); saveDraft();
    if (state.path === "chat") {
      window.requestAnimationFrame(() => {
        const latest = journeyView.querySelector(".chat__thread")?.lastElementChild;
        latest?.scrollIntoView({ block: "end", behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
      });
    }
  }

  function validCurrentForm() {
    captureFields();
    const invalid = [...journeyView.querySelectorAll("[required]")].find((field) => !field.value.trim());
    if (invalid) { invalid.focus(); invalid.setAttribute("aria-invalid", "true"); return false; }
    const email = journeyView.querySelector("[data-key=email]");
    if (email && !/^\S+@\S+\.\S+$/.test(email.value)) { email.focus(); email.setAttribute("aria-invalid", "true"); return false; }
    return true;
  }

  function bindJourney() {
    journeyView.querySelector("[data-start-chat]")?.addEventListener("click", () => reset("chat"));
    journeyView.querySelectorAll("[data-leave-chat]").forEach((button) => button.addEventListener("click", () => reset("choose")));
    journeyView.querySelectorAll("[data-chat-intent]").forEach((button) => button.addEventListener("click", () => {
      state.chatIntent = button.dataset.chatIntent;
      state.chatIndex = 0;
      renderJourney();
    }));
    journeyView.querySelectorAll("[data-chat-answer]").forEach((button) => button.addEventListener("click", () => {
      const questions = state.chatIntent === "help" ? [{ key: "chat_fit", prompt: "Which direction feels closest?", kind: "choice", options: [] }] : chatQuestions(state.chatIntent);
      chatAnswer(questions[state.chatIndex], button.dataset.chatAnswer);
    }));
    journeyView.querySelector("[data-chat-send]")?.addEventListener("click", () => {
      const input = journeyView.querySelector("#chatInput");
      const value = input?.value.trim();
      if (!value) { input?.focus(); return; }
      const question = chatQuestions(state.chatIntent)[state.chatIndex];
      if (question?.kind === "email" && !/^\S+@\S+\.\S+$/.test(value)) { input.focus(); input.setAttribute("aria-invalid", "true"); return; }
      chatAnswer(question, value);
    });
    journeyView.querySelector("[data-chat-skip]")?.addEventListener("click", () => {
      const question = chatQuestions(state.chatIntent)[state.chatIndex];
      chatAnswer(question, "");
    });
    journeyView.querySelector("[data-chat-multi-send]")?.addEventListener("click", () => {
      const values = [...journeyView.querySelectorAll("[data-chat-multi]:checked")].map((input) => input.value);
      if (!values.length) return;
      chatAnswer(chatQuestions(state.chatIntent)[state.chatIndex], values);
    });
    journeyView.querySelectorAll("[data-chat-consent]").forEach((button) => button.addEventListener("click", () => {
      if (button.dataset.chatConsent === "back") { state.chatIndex = Math.max(0, chatQuestions(state.chatIntent).length - 1); state.chatStage = null; renderJourney(); return; }
      state.consent = true;
      state.chatStage = "success";
      try { localStorage.removeItem(DRAFT_KEY); } catch { /* no local storage */ }
      renderJourney();
    }));
    journeyView.querySelectorAll("[data-chat-edit]").forEach((button) => button.addEventListener("click", () => {
      const index = chatQuestions(state.chatIntent).findIndex((question) => question.key === button.dataset.chatEdit);
      if (index < 0) return;
      state.chatIndex = index;
      state.chatStage = null;
      renderJourney();
    }));
    journeyView.querySelector("[data-chat-restart-intent]")?.addEventListener("click", () => {
      state.chatStage = null;
      delete state.answers.funding_mode;
      state.chatIndex = 0;
      renderJourney();
    });
    journeyView.querySelectorAll("[data-choice]").forEach((button) => button.addEventListener("click", () => {
      const value = button.dataset.choice;
      if (state.path === "choose") { reset(value); return; }
      if (state.path === "choose-help" && state.step === 0) {
        if (value === "support" || value === "contribute") { state.answers.choice_reason = value; reset(value, state.answers); return; }
        if (value === "resource") { state.answers.choice_reason = value; reset("fund", state.answers); return; }
        state.answers.choice_reason = value; state.path = "triage"; state.step = "review"; renderJourney(); return;
      }
      if (state.path === "contribute") state.answers.contribution_mode = value;
      if (state.path === "fund") state.answers.funding_mode = value;
      renderJourney();
    }));
    journeyView.querySelectorAll("[data-next]").forEach((button) => button.addEventListener("click", () => {
      captureFields();
      if (button.dataset.requires && !state.answers[button.dataset.requires]) return;
      if (!validCurrentForm()) return;
      state.step += 1; renderJourney();
    }));
    journeyView.querySelectorAll("[data-back]").forEach((button) => button.addEventListener("click", () => {
      if (state.path === "fund" && state.answers.funding_mode === "direct") { state.step = 0; delete state.answers.funding_mode; } else state.step = Math.max(0, state.step - 1);
      renderJourney();
    }));
    journeyView.querySelectorAll("[data-review]").forEach((button) => button.addEventListener("click", () => { if (validCurrentForm()) { state.step = "review"; renderJourney(); } }));
    journeyView.querySelector("[data-edit]")?.addEventListener("click", () => { state.step = Math.max(0, stepCount(state.path) - 1); renderJourney(); });
    journeyView.querySelector("[data-consent]")?.addEventListener("change", (event) => { state.consent = event.target.checked; renderJourney(); });
    journeyView.querySelector("[data-communication]")?.addEventListener("change", (event) => { state.communication = event.target.checked; });
    journeyView.querySelector("[data-submit]")?.addEventListener("click", () => { if (state.consent) { state.step = "success"; try { localStorage.removeItem(DRAFT_KEY); } catch {} renderJourney(); } });
    journeyView.querySelector("[data-restart]")?.addEventListener("click", () => reset());
  }

  function renderBuilder() {
    journeyView.hidden = true; builderView.hidden = false; inboxView.hidden = true; frameLabel.textContent = "COMMAND / BUILDER";
    builderView.innerHTML = `<div class="operator-head"><div><span class="operator-kicker">Onboarding / Journeys</span><h2>HAND start journey <span style="color:#8e8a7e;font:500 .65rem JetBrains Mono,monospace">DRAFT V3</span></h2></div><button class="operator-button">Preview mobile</button></div><div class="builder-grid"><nav class="builder-nav" aria-label="Builder sections"><button class="is-active">Start</button><button>Steps</button><button>Branches</button><button>Completion</button><button>Routing</button><button>Preview</button><button>Publish</button></nav><div><div class="builder-main"><div class="builder-main__head"><h3>Ordered steps</h3><p>Use ordered editing, not a workflow canvas. Published versions stay immutable.</p></div>${[["01","What brings you to HAND?","Single choice · entry routing"],["02","Receive support","Four screens · Reciprocate fields"],["03","Contribute skills","Four screens · Contributor fields"],["04","Fund the work","Direct exit or funding conversation"],["05","Partner with HAND","Four screens · partnership fields"],["06","Review and privacy","Consent required before submit"],["07","Received","Reference, reply date, and next links"]].map(([n,title,detail]) => `<div class="step-row"><span>${n}</span><div>${title}<small>${detail}</small></div><button class="operator-button">Edit</button></div>`).join("")}</div><div class="validation">Ready to publish: no unreachable steps, dead ends, invalid field keys, or missing consent detected.</div></div></div>`;
  }

  function renderInbox() {
    journeyView.hidden = true; builderView.hidden = true; inboxView.hidden = false; frameLabel.textContent = "COMMAND / SUBMISSIONS";
    const items = [["HAND-R-20260728-014","Río Verde Collective","Receive support","new","Reply due Thu Aug 6"],["HAND-C-20260727-009","Maya Chen","Contribute skills","triaged","Reply due Wed Aug 5"],["HAND-P-20260725-003","Central Texas Food Network","Partner with HAND","assigned","Assigned to koH"]];
    inboxView.innerHTML = `<div class="operator-head"><div><span class="operator-kicker">Onboarding / Submissions</span><h2>Durable submission inbox</h2></div><button class="operator-button">Assign selected</button></div><div class="inbox-tabs"><span>New 4</span><span>Triaged 6</span><span>Assigned 3</span><span>Contacted 12</span><span>Closed 18</span></div><div class="submission-list">${items.map(([ref,name,path,status,due], index) => `<button class="submission" type="button" data-inbox-item="${index}"><div><h3>${name}</h3><p>${path}</p><span class="status status--${status}">${status}</span></div><div class="submission__meta">${ref}<br>${due}</div></button>`).join("")}</div><div class="submission-detail" id="submissionDetail"><h3>Open a submission to triage it.</h3><p style="color:#8e8a7e;font-size:.75rem">Private-channel alerts only show a reference, path, priority, due date, and authenticated Command Center link.</p></div>`;
    inboxView.querySelectorAll("[data-inbox-item]").forEach((button) => button.addEventListener("click", () => {
      const [ref,name,path,status,due] = items[Number(button.dataset.inboxItem)];
      inboxView.querySelector("#submissionDetail").innerHTML = `<h3>${name} <span class="status status--${status}">${status}</span></h3><p style="color:#8e8a7e;font-size:.75rem">${ref} · ${path} · ${due}</p><div class="assignment">Assign to <select aria-label="Assign submission"><option>Unassigned</option><option selected>koH</option><option>Future intake lead</option></select><button class="operator-button">Mark triaged</button><button class="operator-button">Contacted</button></div>`;
    }));
  }

  function activateView(view, path) {
    document.querySelectorAll(".route-link").forEach((button) => button.classList.toggle("is-active", button.dataset.view === view && (!path || button.dataset.path === path)));
    if (view === "journey") { reset(path || "choose"); return; }
    if (view === "success") { state = { path:"support", step:"success", answers:{}, consent:true, communication:false }; renderJourney(); return; }
    if (view === "builder") renderBuilder();
    if (view === "inbox") renderInbox();
  }

  document.querySelectorAll(".route-link").forEach((button) => button.addEventListener("click", () => activateView(button.dataset.view, button.dataset.path)));
  document.getElementById("mobileToggle").addEventListener("change", (event) => shell.classList.toggle("is-mobile", event.target.checked));
  document.querySelector("[data-action=clear-draft]").addEventListener("click", clearDraft);
  loadDraft(); renderJourney();
})();
