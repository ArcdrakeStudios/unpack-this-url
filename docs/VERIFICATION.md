# Verification

On 14 October 2026, 8 deterministic core tests passed under Node.js 24.14.0.
Six headless Chromium 151.0.7922.34 checks passed on the actual local page.
Desktop and 390px mobile-emulation screenshots use synthetic inputs and were
visually inspected; no horizontal overflow was measured. No physical-device,
screen-reader or non-Chromium acceptance is claimed.

Clipboard readback independently matched the exact transformed preview. Submitted URLs stayed inert; only local assets were requested. Injected clipboard denial selected the complete manual-copy preview; Clear removed input/results.

Run `npm test`. For browser checks follow the [README](../README.md): an optional
existing Playwright installation/browser cache is required. The browser script
starts its own loopback server and closes it and its isolated browser afterward.
Screenshots default to ignored artifacts; UPDATE_SCREENSHOTS=1 is a deliberate
release-image refresh. The application needs no package installation.

The static package builder rejects unexpected files/subdirectories, uses stored
ZIP entries with fixed metadata, checks each archive member against source and
writes archive/per-file SHA-256 hashes. It is not a publishing command.
