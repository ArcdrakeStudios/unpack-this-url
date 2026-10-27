# Optional counts and voluntary feedback

The shipped `feedback-config.js` sets `COLLECTION_ENABLED = false`. All normal
collection flows are disabled: no page/action event or explicit feedback send
can make an API request, even with an existing opt-in. The visible EN/DE notice
says feedback and counts are unavailable on this page; inspection works
independently. No consent window is offered while this build is disabled, and explicit Send returns unavailable locally while retaining the draft. An earlier saved preference cannot override this build switch. This is an
availability state, not a claim about the build location. No probing or polling.

Only a separately verified host release may set the switch to `true`. That
selects neutral service/failure copy and the unchanged shared client's normal
same-origin requests. The switch has no query-string, stored or global override.
An enabled configuration still requires the visitor's opt-in for every count;
feedback always requires explicit Send. Missing intake remains a failure.

Both shared modules are bundled next to each other, unchanged. When enabled, `feedback.js`
mounts the localized UI and sends `page_view` only if a previous opt-in still
applies. Allowing counts never sends past actions. Each actual inspection attempt
records `tool_start`; successful parsing and rendering records `tool_complete`.
Opening the form may count `feedback_open` after consent; it never sends feedback.
There are no URLs, query strings, results, identifiers or metadata in counts.

Counts default off. Every event rechecks the origin-wide
`arcdrake.analytics.v1` yes/no preference and GPC/DNT. Allow and decline controls are available in the separate privacy choices window. Blocked storage uses a choice for this page, with a visible warning
that an uncleared earlier opt-in may survive reload or in another tab. A failed
opt-out write best-effort removes stale permission and gates other same-page
clients. Persisted cross-tab denial is rechecked on every event. Counts
are actions, not anonymous or unique visitors; the host and abuse-protection
provider see connection data including IP addresses separately.

Feedback remains available with counts off. Only explicit Send submits product,
one of `bug`, `idea`, `usability`, `other`, a trimmed 1–2000-code-unit plain-text
message and optionally a trimmed email of at most 254 code units. Tabs/newlines
are allowed in messages; other controls and unknown fields are rejected. No
automatic retry, mailbox access, automatic email, file upload or reply guarantee.
Unconfirmed sends preserve the draft. A network failure can follow a successful
write, so do not assume that an error means nothing was stored or resend blindly.

The recipient is Arcdrake; authorized triage operators and agents can access
feedback until exactly 30 days after sending. Expired rows are hidden immediately
and purged hourly from active storage, subject to platform failure. Daily totals
cover the current UTC day plus the previous 89 days. Provider backups/recovery
have separate retention. Earlier records/copies retain their original deletion commitments; the prospective policy below applies to revised-notice submissions only. Keep the receipt ID for deletion
through the existing company contact route. The form stays brief and links the complete EN/DE Tools privacy notice and company contact route.

## Host integration

The public client uses exact same-origin, query-free POST `/api/events` and
`/api/feedback`, independent of whether the application lives at `/unpack/` or
another subpath. There is no fixture-origin restriction, browser secret, public
cross-origin ingestion, wildcard CORS or separate analytics provider. Configure
the actual host's routing and private service binding, rather than changing the
browser to call another origin. `connect-src 'self'` permits these API calls;
the inspector does not use networking to inspect destinations.

Events accept only `{product:'unpack',event:<allowlisted action>}`. Feedback
accepts only `{product:'unpack',category,message,replyTo?,noticeVersion:"2026-10-27-mail-v1"}`. Successful writes
require HTTP 202 with exactly `{ok:true}` for events or `{ok:true,id}` with a
UUIDv4 receipt for feedback. Error responses must have exactly `ok:false` and
`error`, with the matching status/code pair. Error responses
are `ok:false` with `invalid` (400), `origin`/`product` (403), `method` (405),
`size` (413), `type` (415), `rate` (429), `unavailable`/`capacity` (503).
HTML/unknown responses, network and redirect failures become unavailable.
Requests omit credentials and referrer, disallow redirects and never retry.
One 10-second deadline bounds both the request and reading/parsing its response;
it aborts on timeout, restores Send and retains the draft. Rate/capacity errors
describe service limits rather than blaming valid input. Malformed receipts
never reset the form or claim acceptance.

## Deterministic integration verification

`node --test tests/*.test.mjs` covers the bundled client, disabled release,
actual inspector hooks and EN/DE notices without any browser or listener.
For an explicitly enabled in-process integration with the shared backend source,
set `MEASUREMENT_SOURCE_ROOT` to that source checkout and run the same command.
It additionally verifies byte parity of both shared modules and exercises the
actual inspector through client/API/storage, voluntary receipt/reset,
authenticated export/deletion and simulated retention. No data leaves the
process. These two source-integration checks skip when that dependency is absent;
the application and all independent checks still work. The fixture and temporary
operator credentials are never part of the static package. Browser journeys
remain an attended follow-up: `node tests/readiness-browser.mjs` and
`node tests/localization-browser.mjs` with existing Playwright/Chromium tooling.

The hosting Worker must forward only the exact API paths through the private
`MEASUREMENT_FEEDBACK` binding, preserving the original HTTPS URL, same-origin
Origin and trusted platform ingress IP. Missing binding must return 503 JSON,
not HTML or fake success. Preserve existing contact/static routing and bot
protection. The service backend must have no public route or workers.dev URL.
Configure `HOST_PRODUCTS` as an explicit map of exact HTTPS origins to allowed
product IDs; for the existing Tools host, `https://tools.arcdrake.com` must
include `unpack` alongside its other integrated products. No wildcards or local
origin exception. Triage/abuse secrets stay only in server secret bindings,
never in browser assets, URLs, templates or exports of public source.

Activation requires a separately authorized host release: update EN/DE host
privacy copy, confirm provider limits and backup retention, supply the reviewed
namespace/migration, secret bindings and origin map, bind the original-request
hosting wrapper, and verify bounded synthetic writes/triage/deletion plus
retention/alarm behavior. Keep the brief form and complete linked privacy notices consistent. Review final EN/DE browser
UX and security headers at that stage, then enable the release switch and
rebuild the package/manifest together. A static upload alone cannot activate
the API. Roll back client intake and forwarding together; retain cleanup for
any existing stored feedback. No activation is performed by packaging.

## Consent and feedback notice update — 27 October 2026

This private source candidate copies the reviewed canonical shared client/contract from consent source `d8c50c8`. Both copied modules are explicitly LF in `.gitattributes` to preserve byte parity across checkouts. No production push, API activation or deployment is included. Local task behavior and privacy gates remain intact.

The feedback area has a short intro and fields; analytics detail and equally usable allow/decline controls live in the separate branded Privacy choices window. Existing EN/DE privacy/contact links remain. The current client adds exact `noticeVersion: "2026-10-27-mail-v1"` to explicit feedback payloads. This identifies its notice version, not proof that a human read it. An old tab/client without the marker remains storage-only forever; it cannot be replayed into mail.

For revised-notice submissions the website working copy still expires after 30 days, with hourly cleanup under normal operation. Feedback also queues for forwarding through the existing Microsoft 365 transport to Arcdrake's business mailbox. Mailbox correspondence is deleted when no longer needed, subject to statutory obligations or necessary legal claims. A saved receipt confirms website storage/queueing, never inbox delivery or a human response. Existing collected records and exports/copies retain the original promises under which they were collected; there is no retroactive exemption or new manual mailbox/export deletion duty.

Host release must first accept the optional marker with `FEEDBACK_MAIL_ACTIVE="0"`, then supply the existing private mail entrypoint/binding and deploy all revised notices/client adapters. Verify service bindings and Operations Control delivery health before explicitly activating dispatch last. Marker-tagged messages queue while off without transport attempts; old/unmarked records remain legacy. Keep the deliberate active setting in later reviewed deployment configs. Standalone builds with a disabled collection switch remain disabled.

Candidate verification: `npm test` passed 67 tests. Shared client/contract byte parity matches the canonical LF Git blobs; source hashes are pinned where required. The local release package/build completed. No browser, physical-device, live backend or inbox verification is claimed by this source-propagation packet.

Locale startup repair: after mounting, the adapter announces the app-selected language through the existing `arcdrake-language-change` event. The native Privacy choices dialog therefore localizes its heading, purpose, disclosure, decline action and privacy URL on initial German entry and later EN/DE switches. The same form, draft and consent choice are retained. Native-dialog control-flow regression passes; browser verification is recorded separately by the release review.
