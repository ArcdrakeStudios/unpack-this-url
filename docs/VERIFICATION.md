# Test coverage and compatibility

Install the development tools in the [README](../README.md), then run:

```sh
npm test
npm run test:ci
npm run test:localization
```

Core tests exercise URL parsing, duplicate query entries, nested links, bounded decoding and cleanup transformations. Chromium browser checks cover inert URL rendering, exact clipboard output, manual-copy fallback, clearing input and narrow layouts. Localization checks cover English/German selection and preservation of raw URL data.

Automated checks use Chromium. They do not establish compatibility with Safari, Firefox, physical devices or screen readers. Clipboard behavior also depends on browser permissions and the hosting origin.

Browser checks create their own loopback server and close it afterward. Screenshots default to ignored `artifacts/readiness/`. Setting `UPDATE_SCREENSHOTS=1` updates the documented screenshots in `docs/`; inspect those images before committing them.

The static package builder checks the application file inventory, compares archive contents with source, and writes archive and per-file SHA-256 hashes. It does not publish.
