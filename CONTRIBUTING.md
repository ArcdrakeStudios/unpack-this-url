# Contributing

Small, focused fixes are welcome. Open an issue before a substantial change so we can discuss the intended behavior. Fork the repository, create a branch and submit a pull request against `main`.

## Development checks

Follow the prerequisites in the [README](README.md), then run:

```sh
npm ci
npx playwright install chromium
npm test
npm run test:ci
npm run test:localization
npm run package:release
```

On Linux, `npx playwright install --with-deps chromium` also installs required browser libraries. Browser tests start and stop their own preview servers; leave the app's preview port free.

## Preparing a pull request

Explain the user-visible problem, the change and how you checked it. Add a regression test for behavioral fixes when practical, and keep documentation and both interface languages consistent with the application.

Preserve the documented privacy boundaries and keep runtime dependencies minimal. Use fictional inputs in issues, tests and screenshots. Never post private data or credentials.

Pull requests must pass the required CI check before merging. Contributor pull requests are reviewed by a maintainer. A maintainer may need to approve a contributor's workflow run before checks begin.

Contributions are provided under the repository's MIT license. Be respectful and constructive.

See [packaging and hosting](docs/RELEASING.md), [language support](docs/LOCALIZATION.md) and [security reporting](SECURITY.md).

Accepted changes can be included in future updates to the hosted app. Deployment
is managed separately from pull request merging.
