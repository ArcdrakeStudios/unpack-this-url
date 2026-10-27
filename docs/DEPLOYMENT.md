# Static hosting

The hosted application is available at [tools.arcdrake.com/unpack/](https://tools.arcdrake.com/unpack/). To host your own copy, build a package using [these instructions](RELEASING.md).

## Files and paths

Extract `artifacts/release/static-release.zip`. It contains nine application files: `index.html`, `style.css`, `app.js`, `anatomy.js`, `language.js`, `feedback.js`, `feedback-config.js`, `measurement-feedback-client.mjs` and `measurement-contract.mjs`, plus `LICENSE` and `THIRD_PARTY_NOTICES.md`. A separate `manifest.json` records archive and per-file SHA-256 hashes. Serve both `.js` and `.mjs` as JavaScript.

Serve the extracted static files over HTTPS from a root or directory, preserving relative asset paths. A directory mount must serve its trailing-slash index. Do not serve the repository root, tests or development tools. No application backend, database or account system is required.

## Host configuration

Keep the application's Content Security Policy. Set `X-Content-Type-Options: nosniff` and `Referrer-Policy: no-referrer`, and configure framing restrictions appropriate to your host. Revalidate HTML and avoid serving stale assets from another version.

Keep `connect-src 'self'` for the exact optional same-origin APIs. The inspector must not fetch submitted URLs. Missing intake returns 503; static hosting does not activate collection. Follow [feedback integration](MEASUREMENT-FEEDBACK.md) for the private service binding, HTTPS origin map, privacy copy and activation checks. Clipboard access requires HTTPS or a supported loopback secure context. A denied clipboard request should still allow manual copying.

No service worker is installed. Language and usage-count preference storage belong to the current origin.

## Check your deployment

Verify file hashes against the manifest, unknown-path 404 responses, asset loading, security headers, narrow layouts and English/German controls. Check URL inspection and both clipboard and manual copying.

Hosting receives ordinary page and asset requests and may keep access logs. Describe the host's processing and operator/contact information accurately. Keep the previous package and manifest if you need to restore an earlier version.
