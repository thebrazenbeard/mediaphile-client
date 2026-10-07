# Mediaphile LAN Client Design

**Date:** 2026-10-07  
**Repository:** `thebrazenbeard/mediaphile-client`  
**Status:** Design approved in chat; written specification awaiting explicit review before implementation.

## 1. Purpose

Mediaphile Client is the local-network user interface for Mediaphile Server. V1 is a self-contained web application designed for desktop browsers and 10-foot/D-pad use, with architecture that can later be wrapped for TV-native targets.

The client is not a second source of media truth. It consumes the versioned server API, reports its playback capabilities, renders library/knowledge state, and drives playback sessions.

## 2. Product Invariants

1. The client never reads SQLite directly.
2. The client never receives or constructs raw server filesystem paths.
3. The client does not require Plex, a Plex account, or a cloud identity.
4. All fonts, scripts, styles, icons, and runtime assets required for normal use are bundled locally; no CDN is required.
5. Same-origin operation from Mediaphile Server is the default deployment.
6. A standalone browser build may connect to a manually supplied LAN server URL.
7. Browser code does not pretend it can perform UDP discovery; native wrappers may add Mediaphile Discovery V1 later.
8. The client reports demonstrated playback capabilities and lets the server choose Direct Play, Remux, Transcode, or Unplayable.
9. D-pad/keyboard navigation is a first-class interaction model, not a later accessibility patch.
10. The client treats provenance/knowledge fields from the Mediaphile corpus as labeled evidence, not as undifferentiated metadata.

## 3. Technology

The initial implementation will use:

- TypeScript;
- React;
- Vite;
- the browser Fetch API;
- native `<video>` playback for Direct Play and compatible remux outputs;
- `hls.js` only when the browser lacks native HLS support and the server returns HLS;
- CSS with no external runtime stylesheet/font dependency;
- Vitest and React Testing Library for component/application behavior;
- Playwright for browser-level flow tests.

The implementation avoids a large global state framework until observed complexity requires one. Server state is accessed through a small typed API layer and local UI/player state remains close to the owning feature.

## 4. Repository Structure

Proposed initial structure:

```text
src/
  app/                     application shell and routing
  api/                     typed HTTP client and generated contract types
  auth/                    bootstrap/login/session lifecycle
  discovery/               same-origin/manual server selection
  library/                 home rows, browse, filters and search
  item/                    movie/show/episode details
  playback/                capability detection, decision request and player
  navigation/              D-pad/focus model
  knowledge/               provenance-aware Mediaphile knowledge rendering
  settings/                local client preferences
  styles/                  local design tokens and application CSS
public/                    local static assets only
tests/                     integration helpers
e2e/                       Playwright flows
docs/                      client architecture/operations
```

Feature folders own their public components, state, and tests. The API layer contains transport details; components do not scatter raw endpoint strings.

## 5. Server Contract

The machine-readable contract is authoritative in:

`thebrazenbeard/mediaphile-server/api/openapi.yaml`

This client maintains generated TypeScript types from an explicitly synchronized snapshot. Generated types are not manually edited.

The synchronized client artifact records the source contract digest. CI fails when generated output does not match the checked-in contract snapshot.

The client supports the server's `/api/v1` contract and surfaces a clear incompatible-server screen if the server reports no mutually supported API version.

## 6. Connection Model

### Same-origin

When served by Mediaphile Server, the client uses the current origin. This is the default installation path and requires no server discovery.

### Standalone browser

A standalone build presents a server-address screen. The address must resolve to an HTTP(S) Mediaphile Server and pass `GET /api/v1/server`.

The chosen server URL is stored locally only after successful validation.

### Native/TV wrapper

A future wrapper may discover Mediaphile Server via UDP discovery and hand the selected base URL to the same web application. UDP discovery is outside browser JavaScript and is not simulated through public Internet services.

## 7. Authentication UX

The client has three states:

- uninitialized server -> bootstrap screen;
- initialized but unauthenticated -> login screen;
- authenticated -> application shell.

The bootstrap secret is entered by the user and exchanged once. It is not retained after successful setup.

Session tokens are kept in the narrowest browser storage mechanism compatible with the server's chosen same-origin authentication design. The client never places credentials in query strings, media URLs, logs, analytics, or persisted debug state.

A `401` clears client authentication state and returns to login while preserving the selected LAN server address.

## 8. Information Architecture

The primary application navigation is:

- Home
- Movies
- TV Shows
- Search
- Settings

Home initially contains:

- Continue Watching;
- Recently Added;
- Movies;
- TV Shows.

Rows disappear cleanly when empty rather than displaying placeholder tiles.

Movies supports grid/list browsing and text search.

TV Shows uses hierarchy:

`Show -> Season -> Episode`

The client does not flatten seasons/episodes in a way that loses their catalog identity.

## 9. Detail Views

A movie detail view shows:

- title and year;
- edition when present;
- summary;
- poster/backdrop where available;
- runtime and content facts;
- available media qualities;
- resume/play action;
- watched state;
- available audio/subtitle information;
- Mediaphile knowledge/provenance section when present.

A show detail view shows show-level facts plus seasons.

An episode detail view shows show/season context, episode number/title, summary, runtime, resume/play action, and knowledge/provenance when present.

Unknown metadata is omitted or labeled unknown. The UI never fabricates a title/year match to make the screen look complete.

## 10. Provenance-Aware Knowledge UI

Mediaphile-specific knowledge is an advantage over a generic Plex clone.

Knowledge records render with their evidence class and source state. The client visually distinguishes at least:

- filesystem/catalog fact;
- external metadata;
- screenplay/transcript evidence;
- subtitle evidence;
- audiovisual review;
- derived analysis;
- unresolved/conflicting material.

The client does not silently present derived interpretation as if it were direct source evidence.

## 11. D-pad and Focus Navigation

Every primary screen must be usable with:

- ArrowLeft / ArrowRight / ArrowUp / ArrowDown;
- Enter / Select;
- Escape / Back;
- keyboard Tab as a browser fallback.

Focus behavior is deterministic:

- exactly one actionable element owns TV focus;
- moving in a direction selects the closest eligible element in that direction using stable row/grid semantics;
- focus is restored when returning from detail to browse;
- opening the player moves focus into player controls;
- closing the player restores focus to the originating item;
- off-screen focus targets are scrolled into view;
- hidden/zero-area elements are never focus candidates.

Mouse/touch remains supported but does not define the navigation model.

## 12. Playback Capability Detection

The client builds a capability profile from browser APIs and conservative known support:

- `HTMLMediaElement.canPlayType`;
- Media Source Extensions availability where relevant;
- native HLS support;
- supported subtitle handling;
- screen dimensions;
- configured client quality ceiling.

The client sends the normalized profile to `POST /api/v1/playback/decide`.

The client does not decide to transcode on its own. It may declare preferences such as quality ceiling or subtitle selection; the server owns the final media transform decision.

## 13. Playback Flow

1. user selects Play or Resume;
2. client sends item ID, stream preferences, resume intent, and capability profile;
3. server returns `DIRECT_PLAY`, `REMUX`, `TRANSCODE`, or `UNPLAYABLE` plus reason codes and a server URL;
4. client creates a playback session;
5. player opens the returned source;
6. client reports progress at a bounded interval and on seek/pause/resume;
7. client sends terminal state on stop/end;
8. server persists playback state;
9. client refreshes Continue Watching/watched state.

For Direct Play and byte-range sources, the native video element is used.

For HLS, native HLS is preferred; otherwise `hls.js` attaches to the same video element.

## 14. Player UX

The V1 player provides:

- play/pause;
- seek;
- current/duration time;
- resume;
- audio-stream selection when server-supported;
- subtitle selection/off;
- fullscreen;
- stop/back;
- buffering indication;
- playback-decision/debug detail behind an advanced panel.

Player controls auto-hide only while playback is active and restore immediately on pointer/keyboard/D-pad interaction.

A failed media request shows the server's stable reason code and human explanation instead of silently retrying incompatible formats indefinitely.

## 15. Error Handling

The API layer normalizes failures into:

- unreachable server;
- incompatible API;
- authentication required;
- permission denied;
- not found/unavailable;
- conflict;
- playback unsupported;
- server/transcode failure;
- malformed/unexpected response.

Retry is automatic only for idempotent transient reads and bounded HLS segment/network failures. Mutating requests are not blindly replayed.

The application shell must remain navigable after an item disappears or becomes unavailable.

## 16. Local-Only Behavior

The production bundle contains no dependency on:

- Google Fonts;
- analytics SaaS;
- CDN-hosted JavaScript;
- cloud feature flags;
- remote authentication;
- public discovery;
- externally hosted artwork required for app chrome.

Media artwork may be served by Mediaphile Server. If optional external metadata is later enabled server-side, the browser still receives cached/proxied server URLs rather than becoming an independent Internet metadata client.

## 17. Accessibility

TV navigation and browser accessibility share one DOM rather than separate interfaces.

Requirements include:

- semantic buttons/links;
- visible focus indicator;
- meaningful accessible names;
- keyboard operation;
- captions/subtitles exposed through the media experience;
- sufficient information without relying solely on color;
- reduced-motion support for nonessential animation.

## 18. Testing Strategy

Required unit/component tests include:

- server URL validation;
- authentication state transitions;
- empty/non-empty Home rows;
- movie/show/season/episode routing;
- provenance labels remain attached to the correct evidence class;
- D-pad directional focus behavior;
- hidden/zero-area elements excluded from focus;
- focus restoration after detail/player navigation;
- capability profile generation;
- Direct Play response configures native video;
- HLS response uses native HLS when available;
- HLS response uses `hls.js` when native HLS is unavailable;
- progress events are bounded and terminal stop/end is sent;
- `401` clears session and returns to login;
- incompatible API receives a dedicated screen;
- no external runtime asset URLs are present in the production HTML/manifest.

Required browser-level flows include:

1. bootstrap/login -> Home;
2. Home -> Movie detail -> Direct Play -> seek -> stop -> resume state;
3. TV Show -> Season -> Episode -> playback;
4. keyboard/D-pad only browse -> play -> back;
5. unavailable item error recovery;
6. server unreachable/reconnect;
7. mocked Transcode HLS playback initialization.

Maestro may later be added for tvOS/Fire TV/Roku/native-wrapper qualification, but Playwright is the initial web-client gate.

## 19. Build and Deployment

`npm run build` produces a static `dist/` bundle.

Deployment modes:

- bundled into a Mediaphile Server release;
- served by Mediaphile Server from a configured static directory;
- hosted by any trusted LAN-only static server and pointed manually at Mediaphile Server.

The normal release path packages a known client build with a known compatible server API contract.

## 20. Visual Direction

The first implementation prioritizes density, legibility, distance viewing, and media artwork rather than cloning Plex branding.

Baseline behavior:

- dark UI appropriate for television use;
- large readable type;
- poster-oriented movie/show grids;
- horizontal Home rows;
- strong focus treatment;
- detail screens that reserve space for Mediaphile knowledge without crowding playback actions;
- responsive desktop layout using the same information architecture.

Exact branding, logo, color palette, and typography are not frozen by this architecture specification.

## 21. Initial Implementation Order

After this written specification is approved:

1. TypeScript/React/Vite baseline plus test harness;
2. typed API client and server connection screen;
3. bootstrap/login/application shell;
4. Home and browse views against deterministic API fixtures;
5. item details and provenance rendering;
6. D-pad/focus engine;
7. capability detection and playback-decision request;
8. Direct Play video flow and progress reporting;
9. HLS path;
10. settings/error/reconnect behavior;
11. Playwright end-to-end flows;
12. production bundle handoff to the server repo.

Each observable behavior receives a focused failing test first where practical.

## 22. V1 Success Criteria

The client is successful when:

1. it builds into a self-contained static bundle without Internet-hosted runtime assets;
2. it can bootstrap/login to a same-origin or manually selected LAN Mediaphile Server;
3. it displays movies and hierarchical TV content;
4. it renders unresolved/missing metadata without inventing facts;
5. it exposes Mediaphile provenance classes without collapsing them;
6. the entire primary flow is usable by keyboard/D-pad;
7. it reports client media capabilities;
8. it Direct Plays compatible media and handles server-provided HLS;
9. resume/watched state round-trips through the server;
10. auth loss and server loss recover without a page corruption/reload loop;
11. no Plex/cloud service is required.

## 23. Assumptions Chosen for V1

The server is the authority for LAN access policy and media transformation. The client is not responsible for enforcing network isolation beyond refusing insecurely mixed public origins in deployment configurations where the browser can identify that condition.

No license is selected by this specification. The repository currently has no implementation license; choosing one is a separate owner decision.
