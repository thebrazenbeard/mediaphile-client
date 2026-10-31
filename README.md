# Mediaphile Client

**A self-hosted, responsive web interface for browsing and playing media indexed by [Mediaphile Server](https://github.com/thebrazenbeard/mediaphile-server).**

Mediaphile Client is a React and TypeScript single-page application. It connects to a server you operate, displays your movie and TV collections, and uses that server's authenticated APIs for catalog, account, and playback state. It does not supply media, host a public streaming service, or replace the server.

The web application and its tests are **present on `main`**. This is a browser client, not a separately qualified native Roku, Android TV, tvOS, Fire TV, Tizen, or webOS app.

## What is implemented

- **Library browsing:** Home, Movies, TV Shows, Search, item details, Settings, and a player; library selection, watched-state filters, grid/list preferences, and cursor-based pagination.
- **Local account flow:** first-run administrator bootstrap, login/logout, server-version compatibility checks, explicit local-server connection, and reconnection screens.
- **Playback:** browser capability reporting, server-selected Direct Play or HLS, playback sessions and progress reporting, and a Continue Watching row populated from server playback state. Actual codec support depends on the browser, media source, and server.
- **Source-labeled details:** a provenance panel displays records supplied by the server and labels unresolved or conflicting information. It does not independently verify those records.
- **Shared navigation:** one left-side route and focus system across responsive desktop and phone browser viewports, including arrow-key/D-pad-style focus navigation. The layout contract is in [docs/UNIFIED_UI_CONTRACT.md](docs/UNIFIED_UI_CONTRACT.md).

The client does not scan disks or transcode files on its own. Library scanning, media paths, authorization decisions, and stream selection are server responsibilities.

## Requirements

- Node.js **22 or newer**, npm, and a browser with support for the required playback format.
- A running, compatible [Mediaphile Server](https://github.com/thebrazenbeard/mediaphile-server) exposing API V1 on a local or otherwise explicitly trusted network.
- Access to media you have permission to index and play.

This repository declares `"private": true` in `package.json`: it is not published as an npm package. The current source contains a web app and a build, not an installable TV-native application.

## Build and run

```sh
git clone https://github.com/thebrazenbeard/mediaphile-client.git
cd mediaphile-client
npm ci
npm run typecheck
npm run test:run
npm run build
```

The output is in `dist/`. For a same-origin deployment, configure Mediaphile Server to serve that directory, using the server's `MEDIAPHILE_UI_DIR` setting. For example, set it to the absolute path of the checkout's generated `dist/` directory. The server then serves the UI, API, and protected media routes from a single origin. Refer to the server's own configuration and authentication instructions before exposing it to other devices.

For local web development, start a compatible server at `http://127.0.0.1:8097`, then run:

```sh
npm run dev
```

Vite listens on `127.0.0.1:5173` and proxies `/api` to the local server. The manual connection screen performs **syntax-level** checks: HTTP(S) only, no embedded credentials, and an allowlist of loopback/private IPv4 literals, selected IPv6 prefixes, and `localhost`/`.local`/`.lan` hostnames. It does **not** resolve or pin DNS, verify where an allowed hostname resolves, authenticate the server, or establish a protected remote-execution boundary. Operators must enforce network and server authentication separately.

## API contract

The server owns the OpenAPI source. The client checks in a [generated snapshot](api/openapi.snapshot.yaml), [TypeScript API types](src/api/generated/schema.d.ts), and a [source-commit/hash pin](api/contract-source.json). To update the local snapshot from a separately checked-out compatible server:

```sh
npm run sync:api -- ../mediaphile-server/api/openapi.yaml <exact-server-commit-sha>
```

Pinning a file and commit supports traceability; it does not prove that a currently running server is that build. API requests, bearer-token handling, and error mapping are implemented in [src/api/client.ts](src/api/client.ts).

## Verification

```sh
npm run typecheck
npm run test:run
npm run build
npm run e2e
```

`test:run` runs Vitest unit/component tests; `e2e` runs Playwright Chromium against a **simulated API**, covering bootstrap, navigation, browsing, filters, pagination, reconnection, and Continue Watching. Playwright requires its Chromium runtime, installed with `npx playwright install chromium`.

For a separate **synthetic real-server** test, check out Mediaphile Server alongside this project, install its Go/FFmpeg prerequisites, and run:

```sh
export MEDIAPHILE_SERVER_DIR=../mediaphile-server
npm run e2e:real
```

This harness creates temporary credentials, state, and generated test video. It is not a production-media, NAS, physical-TV, or codec-matrix qualification. The [regular CI](.github/workflows/ci.yml) runs typecheck, unit tests, build, and mocked browser flows; [real integration](.github/workflows/real-integration.yml) is a separately dispatched workflow.

## Security, scope, and reuse

- The application is designed for local/private-network server access, not an Internet-facing relay. Authentication and media authorization are enforced by the server; the client must not be treated as an authorization boundary.
- Do not enter server credentials into arbitrary sites or expose a private media server without configuring its access controls. Browser local storage contains non-secret display preferences and connection hints; review browser and server privacy requirements for your deployment.
- Source-labeled metadata and test results do not establish truth, consent, verified provider identity, immutable host-owned permissions, or deployment on a physical streaming device.
- **Licensing needs clarification:** no root `LICENSE` or `COPYING` file is tracked on this branch, and redistribution permissions for bundled `public/fonts/` assets have not been established. Public source visibility is not an unrestricted license to redistribute the application or its assets. Confirm rights before packaging or commercial distribution.

The [UI contract](docs/UNIFIED_UI_CONTRACT.md) describes the intended cross-device interaction model; responsive Chromium tests are evidence for browser behavior only.
