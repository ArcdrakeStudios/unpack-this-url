# English and German interface

The bundled `dist/language.js` contains local translations for static text, dynamic findings, help, errors and accessibility labels. It makes no network requests and adds no runtime dependencies. Rehearsal also localizes exported HTML run sheets. Raw URLs, DNS evidence, protocol values and user-authored event content remain data, protected by explicit raw display boundaries.

Language priority is valid `?lang=de|en`, then valid `arcdrake-tools-language` preference, then German browser language, otherwise English. Unavailable browser storage does not prevent an explicit URL choice. Only the preference is persisted by the language module.

The visible English/Deutsch buttons update the URL with `history.replaceState` without reloading. Each app dispatches and listens for `arcdrake-language-change` on `window`, with `detail.language` equal to `en` or `de`. This lets the collection shell change language while preserving entered values, selections, simulations and existing results.

The translator retains English source text per node and translates exact strings or bounded message templates. It never replaces arbitrary words inside user text. When adding UI copy, add both its English source and German translation, keep inserted user values in raw boundaries, and extend the localization journey as needed.

Run `npm test`, `npm run test:ci`, and `npm run test:localization`. Localization browser tests cover dynamic German results/errors, EN/DE state retention, raw-data retention, explicit URL and stored preference priority, browser-language fallback, denied storage and narrow screens. Every owned test browser is closed in `finally`.
