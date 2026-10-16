# Unpack This URL

See the host, query parameters and nested links hidden inside a long URL before deciding what to do with it. Unpack This URL reads the text in your browser without opening the destination.

**[Open Unpack This URL](https://tools.arcdrake.com/unpack/)** · [Download source](https://github.com/ArcdrakeStudios/unpack-this-url/archive/refs/heads/main.zip) · [Arcdrake Tools](https://tools.arcdrake.com/) · [Report an issue](https://github.com/ArcdrakeStudios/unpack-this-url/issues)

## How to use it

1. Paste an absolute URL, such as `https://example.com/page?utm_source=newsletter`, or choose **Try an example**.
2. Inspect the parsed host, original components, query entries and nested links.
3. Choose whether to remove common tracking parameters, credentials or the fragment.
4. Check the exact preview, then copy it.

<details>
<summary>View desktop screenshot</summary>

![Unpack This URL with fictional example data](docs/screenshot-desktop.png)

</details>

[Mobile screenshot](docs/screenshot-mobile.png). Screenshots show the standalone application with fictional data.

## Privacy and limitations

Entered URLs are never visited, fetched or saved by the application. Results describe URL syntax; they do not establish who owns a destination or whether it is safe. Changing a URL can change its behavior, so inspect the preview before using it.

The inspector accepts up to 8,192 characters and expands the first 150 query entries. Cleanup is disabled beyond that query-entry limit. Nested-link inspection follows common redirect parameter names, up to three levels and 12 links, with two additional percent-decoding passes per already form-decoded value. Other fields or deeper levels may still contain URLs.

Tracking cleanup affects only the outer query. It removes `utm_*`, `fbclid`, `gclid`, `dclid`, `msclkid`, `mc_cid`, `mc_eid` and `igshid`, preserving the spelling, order and duplicates of other entries. Credentials and fragments have separate options.

Copying uses the browser clipboard when permitted; otherwise the preview is selected for manual copying. Clear removes input and results from the page. Your browser and clipboard may retain their own data.

English and German are available. Only the language preference is stored locally; entered URLs and results are not.

The hosted site receives ordinary page and asset requests. See its [privacy information](https://tools.arcdrake.com/privacy/) for hosting details.

## Run locally

Download and extract the source ZIP, or clone this repository. Open a terminal
in the resulting folder.

Install Node.js 24 or newer, then run from this repository:

```sh
npm run dev
```

Open http://127.0.0.1:43218/. Stop the preview with Ctrl+C. No package installation is needed to run the application. Serve it over HTTP(S), rather than opening `index.html` directly. The files in `dist/` are the application source; there is no compilation step.

## Development

Packaging additionally requires Python 3.11 or newer available as `python`, because the npm script calls that command. Check `python --version`; if your system only provides `python3`, configure your Python installation or PATH so `python` selects Python 3.11 or newer. Install the locked development tools and run the checks:

```sh
npm ci
npx playwright install chromium
npm test
npm run test:ci
npm run test:localization
npm run package:release
```

Browser checks manage their own local servers. Leave the preview port free before running them. The package command writes static files and a SHA-256 manifest to `artifacts/release/`; it does not publish or deploy.

Automated browser coverage uses Chromium, including narrow layouts. Safari, Firefox, physical devices and screen readers have not been verified for this app. Report compatibility problems with your browser version and a fictional example.

See [contributing](CONTRIBUTING.md), [language support](docs/LOCALIZATION.md), [test coverage](docs/VERIFICATION.md) and [packaging and hosting](docs/RELEASING.md).

## License and support

An [Arcdrake](https://arcdrake.com/) product. Free to use, modify and redistribute under the [MIT license](LICENSE). See [third-party notices](THIRD_PARTY_NOTICES.md) for attribution.

Use the [issue tracker](https://github.com/ArcdrakeStudios/unpack-this-url/issues) for bugs and suggestions. Do not include private URLs or credentials. Report security vulnerabilities through the [private reporting channel](SECURITY.md).

Feature requests are welcome in the issue tracker. To contribute an improvement,
see [the contribution guide](CONTRIBUTING.md).
