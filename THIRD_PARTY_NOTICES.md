# Third-party and asset notice

The static application contains no runtime package dependencies, vendored library files, external fonts, photographs or downloaded artwork. UI marks are text/CSS, using installed system fonts; fonts are not distributed. Application source is MIT licensed; see LICENSE.

The URL display decoder implements the RFC 3492 Bootstring algorithm; the source identifies that standard. It does not bundle a punycode package or vendor implementation. Standards are references, not relicensed documents.

Browser tests use the pinned Playwright development dependency and its browsers. They are development tools, not bundled in the static release; their own licenses remain applicable. Node.js and Python are external local tooling. Synthetic example inputs and screenshots contain no customer data. Arcdrake names/marks are not granted a trademark license by MIT.

## Development dependencies

Playwright is pinned in package-lock.json for browser regression tests and is licensed under Apache-2.0. It and its downloaded browser binaries are development tools, not bundled static application assets. Consult their distributed license files when installing or redistributing them.
