// Fired by Netlify for every form submission on this site (the function name
// is the event). Emails the owner + the visitor through lib/forms.mjs. Uses
// the classic handler signature, which is what event-triggered functions
// document. Site packs configure which forms exist in site.config.mjs.

import { handleSubmission } from './lib/forms.mjs';

export async function handler(event) {
  let payload = {};
  try {
    payload = (JSON.parse(event.body || '{}') || {}).payload || {};
  } catch (_) {
    return { statusCode: 400, body: 'bad payload' };
  }
  const formName = String(payload.form_name || '');
  const data = payload.data && typeof payload.data === 'object' ? payload.data : {};
  const result = await handleSubmission({ formName, data });
  console.log(`[forms] ${formName}: ${JSON.stringify(result)}`);
  return { statusCode: 200, body: JSON.stringify(result) };
}
