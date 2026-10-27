# Test coverage and compatibility

Install the development tools in the [README](../README.md), then run:

```sh
npm test
npm run test:ci
npm run test:localization
```

Core tests exercise URL parsing, duplicate query entries, nested links, bounded decoding and cleanup transformations. Chromium browser checks cover inert URL rendering, exact clipboard output, manual-copy fallback, clearing input and narrow layouts. Localization checks cover English/German selection and preservation of raw URL data.

Node-only tests also exercise the bundled shared client, event/field allowlists,
opt-in/opt-out and GPC/DNT, explicit form sends, failed-receipt draft preservation,
EN/DE notices and link switching. In-process DOM fixtures execute the real
inspection handler with the real parser and client: successful render completes,
invalid input does not, and unavailable counting leaves inspection/copying usable.
These fixtures do not establish browser layout, accessibility or clipboard access.
The release configuration is checked with previously saved consent and explicit
Send: zero collection requests, an unavailable status and preserved draft.
With `MEASUREMENT_SOURCE_ROOT` set to the shared backend checkout, two additional
source-integration checks verify exact bytes/dependencies and run the real
inspection/feedback path through the in-memory backend, export, delete and
retention. They skip when that external source is unavailable. No service starts.
Run them without a browser or server using `node --test tests/*.test.mjs`; run
`node tools/verify-static.mjs` for the static guard. The static guard pins reviewed
shared source hashes and forbids networking/storage/navigation in inspector code;
it is a regression check, not a complete data-flow/security proof.

Automated checks use Chromium. They do not establish compatibility with Safari, Firefox, physical devices or screen readers. Clipboard behavior also depends on browser permissions and the hosting origin.

Browser checks create their own loopback server and close it afterward. Screenshots default to ignored `artifacts/readiness/`. Setting `UPDATE_SCREENSHOTS=1` updates the documented screenshots in `docs/`; inspect those images before committing them.

The static package builder checks the application file inventory, compares archive contents with source, and writes archive and per-file SHA-256 hashes. It does not publish.
