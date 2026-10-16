# Packaging and hosting

[Unpack This URL](https://tools.arcdrake.com/unpack/) is part of [Arcdrake Tools](https://tools.arcdrake.com/). This repository contains its standalone source. Its workflows check changes and prepare downloadable artifacts; they do not deploy the hosted service.

## Build a static package

Follow the development checks in the [README](../README.md), then run:

```sh
npm run package:release
```

Python 3.11 or newer must be available as `python`, the command used by the npm script. Check `python --version`; if only `python3` is available, configure your Python installation or PATH before using the npm command. The command creates `artifacts/release/static-release.zip` and a separate `manifest.json` with archive and per-file SHA-256 hashes.

The application files are `index.html`, `style.css`, `app.js`, `anatomy.js` and `language.js`. The package also includes `LICENSE` and `THIRD_PARTY_NOTICES.md`; retain these when redistributing it. Packaging does not download dependencies, upload files or configure hosting.

The **Prepare release artifact** GitHub Actions workflow runs on `main` when dispatched by a maintainer. It repeats the checks and uploads an artifact named with the source commit. GitHub keeps these workflow artifacts for 30 days; they are not permanent release downloads.

## Host your own copy

See [static hosting](DEPLOYMENT.md) for package layout, headers and browser requirements.

Retain the previous package and manifest if you need to restore an earlier version. Verify the files against the manifest before serving them.
