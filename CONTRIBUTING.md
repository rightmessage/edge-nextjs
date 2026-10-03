# Contributing

Use Node.js 22 and npm. Run `npm ci`, `npm ci --prefix examples/app`, and `npx playwright install chromium`. Run typecheck, lint, unit tests, build, and `npm run test:e2e` before submitting a pull request. Keep runtime changes covered by consumer-visible regression tests. Never include visitor data, private plans, cookies, credentials, or analytics in fixtures.

The live browser test depends on the public RightMessage demonstration plan; report upstream plan changes separately from SDK regressions. For local core development use `file:../edge` temporarily, but restore the published Git tag dependency and lockfile before committing.

## Releasing

The release workflow is gated by `vars.NPM_PUBLISH_ENABLED == 'true'`; leave that repository variable unset until npm is ready. Create the npm organization and package access, configure the package's trusted publisher for repository `rightmessage/edge-nextjs`, workflow `release.yml`, environment `npm`, and grant maintainers publish rights. Alternatively set the protected environment's `NPM_TOKEN` secret. Create the GitHub `npm` environment with approval protection. Confirm package version and green CI, then set `NPM_PUBLISH_ENABLED=true` and explicitly authorize a `v0.1.0` tag push or manually dispatch against that tag. The workflow uses npm 11.5+ and publishes public with provenance. A tag pushed while the variable is unset does not publish.
