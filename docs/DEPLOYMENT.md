# Static deployment

Run `npm test`, the optional browser checks described in [README](../README.md),
then `python tools/package-release.py` (Python 3.11+). The resulting
`artifacts/release/static-release.zip` contains exactly four application files,
LICENSE and THIRD_PARTY_NOTICES.md; manifest.json records archive/per-file hashes.
No dependency install, frontend compilation, backend, database or account is needed.

Serve the unpacked static package over HTTPS from its own root or directory.
A directory mount must serve its trailing-slash index and adjacent relative assets.
Do not serve the repository root, tests, internal tooling or artifacts directory.
Confirm unknown-path 404 behavior and preserve other routes on an existing host.

Set X-Content-Type-Options: nosniff and Referrer-Policy: no-referrer. Keep the
application's current CSP, restrict framing through host headers, and use
revalidated HTML/consistent asset caching. No service worker is installed.
The URL inspector's connect-src remains 'none'; never fetch inspected URLs. Clipboard access requires HTTPS or a supported loopback secure context.

After deployment compare per-file hashes with the manifest, inspect security
headers and desktop/mobile behavior, and verify the actual origin-specific flow.
Hosting receives page/asset requests and may keep access logs; describe the chosen
host's processing and operator/contact information accurately. Retain the previous
static package for rollback. The app has no stored user data to migrate.

The shared home is tools.arcdrake.com. Source publication and production hosting are separate; see [RELEASING.md](RELEASING.md).
