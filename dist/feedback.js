import { mountMeasurementFeedback } from './measurement-feedback-client.mjs';
import { EVENTS } from './measurement-contract.mjs';
import { COLLECTION_ENABLED } from './feedback-config.js';
import { getLanguage } from './language.js';

// The host supplies the same-origin /api/events and /api/feedback routes.
// Disabled builds resolve explicit sends locally without making API requests.
export function mountUnpackFeedback(container, { enabled = false, ...options } = {}) {
  const ui = mountMeasurementFeedback(container, { ...options, product: 'unpack', language: 'en', consentWindow: enabled,
    ...(!enabled ? { fetchImpl: async () => ({ status: 503,
      json: async () => ({ ok: false, error: 'unavailable' }) }) } : {}),
  });
  if (!enabled) {
    const choice = ui.client.choice;
    ui.client.choice = () => choice() === 'blocked' ? 'blocked' : 'no';
    ui.client.track = async event => {
      if (!EVENTS.includes(event)) throw new TypeError('Unknown event');
      return { ok: true, skipped: true };
    };
    ui.refreshChoice();
  }
  return ui;
}
const container = document.getElementById('measurement-feedback');
const ui = mountUnpackFeedback(container, { enabled: COLLECTION_ENABLED });
if (COLLECTION_ENABLED) document.getElementById('feedback-availability').textContent = 'Optional usage counts and voluntary feedback use this site’s service. If a send cannot be confirmed, your text stays in the form. URL inspection works independently.';
export const measurement = ui.client;
function refreshLinks() {
  const prefix = getLanguage() === 'de' ? '/de' : '';
  const links = container.querySelectorAll('a');
  links[0].href = `https://tools.arcdrake.com${prefix}/privacy/`;
  links[1].href = `https://arcdrake.com${prefix}/contact/`;
  ui.refreshChoice();
}
refreshLinks();
window.addEventListener('arcdrake-language-change', refreshLinks);
void measurement.track('page_view');
