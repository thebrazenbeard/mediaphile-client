# Mediaphile Client

**One interface. Every screen. Entirely local.**

Mediaphile Client is the React/TypeScript web interface for [Mediaphile Server](https://github.com/thebrazenbeard/mediaphile-server). It browses your own Movie and TV libraries, controls playback, manages local library configuration, and displays provenance-backed knowledge when the server has verified records.

> **Development status:** The V1 implementation lives on [`build/mediaphile-client-v1`](https://github.com/thebrazenbeard/mediaphile-client/tree/build/mediaphile-client-v1) in [draft PR #1](https://github.com/thebrazenbeard/mediaphile-client/pull/1). The default main branch is not merged. No physical TV or NAS deployment is claimed.

## The unified layout rule

Mediaphile has **one navigation system** across all form factors: the same left sidebar, same routes, same browsing controls, and same player. On a narrow phone screen the sidebar becomes an icon-width rail **on the left**, not a separate mobile UI. TV remotes, keyboard arrows, touch, and mouse activate the same controls; only spacing, density, and device-specific decoding adapt.

Read the [owner-approved unified UI contract](docs/UNIFIED_UI_CONTRACT.md) and [Plex platform research](https://github.com/thebrazenbeard/mediaphile/blob/research/plex-platform-ux-20261007/docs/ux/PLEX_CROSS_PLATFORM_UI_RESEARCH_20261007.md). Plex is a behavior reference; its branding, source code, and platform-fragmented layouts are not reproduced.

## Implemented screens

- Home, Movies, TV Shows, Search, library-aware detail and provenance, Settings, playback.
- Local admin bootstrap, login, logout, reconnection.
- Per-library selection; All, Unplayed, In Progress, Watched filters using the **authenticated user's server state**.
- Grid/List display preferences, 24-at-a-time cursor pagination, stable poster navigation.
- D-pad/keyboard navigation with screen-reader labels; phone and desktop viewports share one shell.
- Playback capabilities, Direct Play and HLS support, progress/session reporting.

## Run it

Requires Node.js 22+ and a running [Mediaphile Server](https://github.com/thebrazenbeard/mediaphile-server) (Go 1.24+, optional FFmpeg/FFprobe).

```sh
npm ci
npm run typecheck
npm run test:run
npm run build
```

**Recommended:** serve the built `dist/` directory through Mediaphile Server by setting `MEDIAPHILE_UI_DIR` to its full path. Browse to the server's local `http://<LAN-IP>:8097` address. This keeps application API, protected video, and HLS assets on the same origin.

**Development:** `npm run dev` starts a Vite server on `127.0.0.1:5173` with an `/api` proxy to Mediaphile Server on `127.0.0.1:8097`. No public CDN is needed.

## Tests

```sh
npm run typecheck
npm run test:run
npm run build
npm run e2e
```

The last command runs Chromium scenarios with a **mock** server and verifies the shared navigation layout, bootstrap/login, Movies/TV detail paths, filters, pagination, keyboard focus, and reconnection.

For a more meaningful end-to-end test, checkout both `mediaphile-client` and `mediaphile-server`, install FFmpeg/FFprobe and Go, then run:

```sh
# Set this to the absolute folder containing the server go.mod file.
export MEDIAPHILE_SERVER_DIR=/path/to/mediaphile-server
npm run e2e:real
```

On Windows PowerShell use `$env:MEDIAPHILE_SERVER_DIR='C:\path\to\mediaphile-server'`. The harness builds a temporary server, generates its **own** synthetic H.264/AAC video, scans and browses it, checks real range delivery, authenticates in Chromium, and plays it. It uses temporary state and does **not** read, rename, or modify your NAS/Plex media.

## Contract and repository roles

The server owns `api/openapi.yaml`. The client pins a generated snapshot and source commit/hash in [`api/contract-source.json`](api/contract-source.json), refreshed with:

```sh
npm run sync:api -- /path/to/mediaphile-server/api/openapi.yaml <exact-server-commit-SHA>
```

The [private Mediaphile repo](https://github.com/thebrazenbeard/mediaphile) owns the research/provenance corpus, not client accounts or playback files. No cloud sign-in, telemetry, WAN tunneling, or Internet runtime dependencies are required.

**Not qualified yet:** physical Roku/tvOS/Android TV/Fire TV/Tizen/webOS builds, full NAS production playback, and all hardware codec/DRM/audio-format combinations. Responsive browser tests are not a substitute for those platform tests.
