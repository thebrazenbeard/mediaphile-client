# Mediaphile Client

A self-contained, D-pad-capable local media client for [Mediaphile Server](https://github.com/thebrazenbeard/mediaphile-server).

React/TypeScript/Vite; the server-owned OpenAPI V1 contract is pinned in `api/contract-source.json`. No Plex login, CDN, analytics, or Internet connection is required at runtime.

```sh
npm ci
npm run typecheck
npm run test:run
npm run build
```

Run Mediaphile Server on port 8097 and `npm run dev` for local development. For deployment, copy `dist/` to the server's `MEDIAPHILE_UI_DIR`. Client and server should be served from the same origin so HttpOnly media cookies work for native video and HLS.

See [Client Design](docs/superpowers/specs/2026-10-07-mediaphile-client-design.md) and [Implementation Plan](docs/plans/2026-10-07-mediaphile-client-v1.md).

**Status:** feature development branch; not deployed.
