# Mediaphile Client V1 Implementation Plan

> **For agentic workers:** Use the host's available task-by-task implementation workflow. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the first self-contained Mediaphile web/TV client that connects only to a LAN Mediaphile Server, supports local bootstrap/login, browses Movies and hierarchical TV libraries, exposes provenance-aware details, navigates by D-pad/keyboard, reports playback capabilities, and plays Direct Play or HLS server decisions.

**Architecture:** A React/TypeScript SPA consumes only the versioned server OpenAPI contract. Same-origin operation is the default; standalone browser use stores a validated LAN server URL. Navigation, API transport, capability detection, and playback are isolated feature boundaries so a future native/TV wrapper can reuse the same application without duplicating media logic.

**Tech Stack:** TypeScript, React, Vite, React Router, Fetch API, hls.js, Vitest, React Testing Library, Playwright, openapi-typescript.

## Global Constraints

- No direct SQLite or media-filesystem access.
- No Plex/cloud account, public discovery, CDN, analytics SaaS, Google Fonts, or remote runtime asset dependency.
- Same-origin server use is the default deployment.
- Standalone browser mode requires a manually validated Mediaphile Server URL.
- UDP discovery is reserved for future native wrappers; browser code must not fake it.
- Server owns playback transformation decisions.
- Client reports conservative demonstrated capabilities rather than optimistic user-agent guesses.
- D-pad/keyboard navigation is a first-class input model.
- Provenance/evidence classes stay visible and distinct.
- No implementation license is selected by this plan.
- No deployment to a public host is part of implementation.

---

### Task 1: Establish React/Vite baseline, local-only assets, and test harness

**Files:**
- Create: `package.json`
- Create: `package-lock.json`
- Create: `tsconfig.json`
- Create: `vite.config.ts`
- Create: `vitest.config.ts`
- Create: `playwright.config.ts`
- Create: `index.html`
- Create: `src/main.tsx`
- Create: `src/app/App.tsx`
- Create: `src/app/App.test.tsx`
- Create: `src/styles/tokens.css`
- Create: `src/styles/app.css`
- Create: `.gitignore`
- Create: `README.md`

**Interfaces:**
- Produces: `npm run dev`, `npm test`, `npm run build`, `npm run typecheck`, and `npm run e2e`.
- Produces a self-contained static `dist/` bundle.

- [ ] **Step 1: Add the focused failing test**

Add a render test expecting the application shell and a production-build inspection test that fails when `index.html`, generated CSS, or generated JS references an `http://` or `https://` runtime asset outside the configured Mediaphile API connection.

- [ ] **Step 2: Verify the relevant failure**

Run: `npm test -- --run`  
Expected: non-zero exit before application setup is complete.

- [ ] **Step 3: Implement the minimum behavior**

Create the Vite/React application with local CSS and system/local font stacks. Do not add analytics or remote asset URLs.

- [ ] **Step 4: Verify the focused pass**

Run: `npm test -- --run`  
Expected: zero exit.

- [ ] **Step 5: Run the affected integration check**

Run:
```bash
npm run typecheck
npm run build
```
Expected: both exit zero; `dist/` is self-contained.

- [ ] **Step 6: Commit the passing deliverable**

```bash
git add package.json package-lock.json tsconfig.json vite.config.ts vitest.config.ts playwright.config.ts index.html src .gitignore README.md
git commit -m "feat: establish Mediaphile client baseline"
```

### Task 2: Synchronize the server OpenAPI contract and add the typed API client

**Files:**
- Create: `api/openapi.snapshot.yaml`
- Create: `api/contract-source.json`
- Create: `scripts/sync-api-contract.mjs`
- Create: `src/api/generated/schema.d.ts`
- Create: `src/api/client.ts`
- Create: `src/api/client.test.ts`
- Modify: `package.json`

**Interfaces:**
- Consumes: exact `thebrazenbeard/mediaphile-server/api/openapi.yaml` file at a recorded Git commit/digest.
- Produces: typed methods for server info, auth, libraries/items, playback decision/sessions/state, and webhooks as the contract grows.

- [ ] **Step 1: Add the focused failing tests**

Test base URL normalization, stable JSON error decoding, Authorization header behavior, `401` callback, request abort propagation, and contract-source digest verification.

- [ ] **Step 2: Verify the relevant failure**

Run: `npm test -- --run src/api/client.test.ts`  
Expected: non-zero exit.

- [ ] **Step 3: Implement the minimum behavior**

The sync script copies an explicitly supplied server OpenAPI file, calculates SHA-256, records server repository/commit/digest, and runs `openapi-typescript`. It never fetches a moving branch implicitly.

The API client wraps `fetch` and exposes typed feature methods; components do not build raw endpoint strings.

- [ ] **Step 4: Verify the focused pass**

Run: `npm test -- --run src/api/client.test.ts`  
Expected: zero exit.

- [ ] **Step 5: Run the affected integration check**

Run:
```bash
npm run sync:api -- ../mediaphile-server/api/openapi.yaml <server-commit>
npm run typecheck
```
Expected: deterministic snapshot/types and zero type errors.

- [ ] **Step 6: Commit the passing deliverable**

```bash
git add api scripts src/api package.json package-lock.json
git commit -m "feat: bind typed server API contract"
```

### Task 3: Implement server selection, bootstrap/login, and authenticated application shell

**Files:**
- Create: `src/discovery/serverUrl.ts`
- Create: `src/discovery/ServerConnect.tsx`
- Create: `src/discovery/ServerConnect.test.tsx`
- Create: `src/auth/AuthProvider.tsx`
- Create: `src/auth/Bootstrap.tsx`
- Create: `src/auth/Login.tsx`
- Create: `src/auth/auth.test.tsx`
- Create: `src/app/AppShell.tsx`
- Create: `src/app/routes.tsx`
- Modify: `src/app/App.tsx`

**Interfaces:**
- Consumes: `GET /api/v1/server`, bootstrap/login/logout APIs.
- Produces: connection state `unresolved | uninitialized | unauthenticated | authenticated | incompatible | unreachable`.
- Produces authenticated API context for feature screens.

- [ ] **Step 1: Add the focused failing tests**

Test same-origin auto-selection, manual server URL accepted only after a successful Mediaphile server-info response, invalid/non-Mediaphile address rejection, bootstrap state, successful login, wrong credentials error, `401` clearing auth and returning to login while preserving selected server, and incompatible API displaying a dedicated screen.

- [ ] **Step 2: Verify the relevant failure**

Run: `npm test -- --run src/discovery src/auth`  
Expected: non-zero exit.

- [ ] **Step 3: Implement the minimum behavior**

Store only a validated standalone server base URL and non-secret client preferences in local storage. Keep bearer tokens in memory for V1 and require login again after a full page reload; this avoids persistent browser token storage while the server/client same-origin cookie alternative remains outside the approved server contract.

- [ ] **Step 4: Verify the focused pass**

Run: `npm test -- --run src/discovery src/auth`  
Expected: zero exit.

- [ ] **Step 5: Run the affected integration check**

Run: `npm run typecheck && npm test -- --run`  
Expected: zero exit.

- [ ] **Step 6: Commit the passing deliverable**

```bash
git add src/discovery src/auth src/app
git commit -m "feat: connect and authenticate to LAN server"
```

### Task 4: Build Home, Movies, TV hierarchy, search, and item details

**Files:**
- Create: `src/library/Home.tsx`
- Create: `src/library/Movies.tsx`
- Create: `src/library/Shows.tsx`
- Create: `src/library/Search.tsx`
- Create: `src/library/library.test.tsx`
- Create: `src/item/ItemDetail.tsx`
- Create: `src/item/ShowDetail.tsx`
- Create: `src/item/SeasonDetail.tsx`
- Create: `src/item/item.test.tsx`
- Create: `src/library/components/PosterCard.tsx`
- Create: `src/library/components/MediaRow.tsx`
- Modify: `src/app/routes.tsx`

**Interfaces:**
- Consumes: item/list/detail APIs.
- Produces: Home rows, Movies grid/list, TV Show -> Season -> Episode navigation, Search results, and detail surfaces.

- [ ] **Step 1: Add the focused failing tests**

Test empty Home rows disappear, Continue Watching items use resume state, movie grid renders opaque item IDs without path leakage, Show -> Season -> Episode route context is preserved, unknown year/summary is omitted or labeled unknown rather than invented, search query is passed to the API, and unavailable items show a recoverable state.

- [ ] **Step 2: Verify the relevant failure**

Run: `npm test -- --run src/library src/item`  
Expected: non-zero exit.

- [ ] **Step 3: Implement the minimum behavior**

Use server DTOs directly through typed view adapters. Avoid a client-side duplicate catalog schema. Paginated screens append via opaque cursors supplied by the server.

- [ ] **Step 4: Verify the focused pass**

Run: `npm test -- --run src/library src/item`  
Expected: zero exit.

- [ ] **Step 5: Run the affected integration check**

Run: `npm run typecheck && npm test -- --run`  
Expected: zero exit.

- [ ] **Step 6: Commit the passing deliverable**

```bash
git add src/library src/item src/app/routes.tsx
git commit -m "feat: browse Mediaphile library"
```

### Task 5: Render Mediaphile provenance and evidence classes without collapsing them

**Files:**
- Create: `src/knowledge/ProvenancePanel.tsx`
- Create: `src/knowledge/EvidenceBadge.tsx`
- Create: `src/knowledge/provenance.ts`
- Create: `src/knowledge/provenance.test.tsx`
- Modify: `src/item/ItemDetail.tsx`
- Modify: `src/item/ShowDetail.tsx`

**Interfaces:**
- Consumes: server knowledge/provenance fields.
- Produces visible labels for filesystem/catalog fact, external metadata, screenplay/transcript evidence, subtitle evidence, audiovisual review, derived analysis, and unresolved/conflicting material.

- [ ] **Step 1: Add the focused failing tests**

Test each evidence class maps to a distinct label; derived analysis never receives the filesystem/source-fact label; conflicting/unresolved records display state; source revision/digest can be inspected; missing provenance produces no fabricated badge.

- [ ] **Step 2: Verify the relevant failure**

Run: `npm test -- --run src/knowledge`  
Expected: non-zero exit.

- [ ] **Step 3: Implement the minimum behavior**

Use a closed mapping from server evidence enum to local presentation metadata. Unknown future enum values render as `Unknown evidence class` with the raw value retained for diagnostics rather than being coerced to a known class.

- [ ] **Step 4: Verify the focused pass**

Run: `npm test -- --run src/knowledge`  
Expected: zero exit.

- [ ] **Step 5: Run the affected integration check**

Run: `npm test -- --run src/item src/knowledge`  
Expected: zero exit.

- [ ] **Step 6: Commit the passing deliverable**

```bash
git add src/knowledge src/item
git commit -m "feat: expose provenance-aware knowledge"
```

### Task 6: Implement deterministic D-pad and focus navigation

**Files:**
- Create: `src/navigation/focusModel.ts`
- Create: `src/navigation/FocusProvider.tsx`
- Create: `src/navigation/useFocusable.ts`
- Create: `src/navigation/focusModel.test.ts`
- Create: `src/navigation/navigation.test.tsx`
- Modify: `src/library/components/PosterCard.tsx`
- Modify: `src/library/components/MediaRow.tsx`
- Modify: `src/app/AppShell.tsx`

**Interfaces:**
- Produces: directional focus registration/movement, focus restoration tokens, Enter/Select activation, Escape/Back navigation, and scroll-into-view behavior.

- [ ] **Step 1: Add the focused failing tests**

Test left/right movement within a row, up/down movement between rows/grids, deterministic tie-breaking, hidden and zero-area elements excluded, focus restoration after detail navigation, player-close restoration hook, and normal Tab semantics remaining functional.

- [ ] **Step 2: Verify the relevant failure**

Run: `npm test -- --run src/navigation`  
Expected: non-zero exit.

- [ ] **Step 3: Implement the minimum behavior**

Represent focusable elements with stable IDs and measured rectangles. Directional movement filters candidates to the requested half-plane, ranks primary-axis distance before orthogonal distance, then stable registration order. Keep focus state independent from catalog data.

- [ ] **Step 4: Verify the focused pass**

Run: `npm test -- --run src/navigation`  
Expected: zero exit.

- [ ] **Step 5: Run the affected integration check**

Run: `npm test -- --run src/navigation src/library src/item`  
Expected: zero exit.

- [ ] **Step 6: Commit the passing deliverable**

```bash
git add src/navigation src/library src/item src/app/AppShell.tsx
git commit -m "feat: add TV focus navigation"
```

### Task 7: Detect playback capabilities and request server decisions

**Files:**
- Create: `src/playback/capabilities.ts`
- Create: `src/playback/capabilities.test.ts`
- Create: `src/playback/decision.ts`
- Create: `src/playback/decision.test.ts`
- Create: `src/playback/PlayButton.tsx`
- Modify: `src/item/ItemDetail.tsx`

**Interfaces:**
- Produces normalized client capability profile matching the server OpenAPI schema.
- Consumes: `POST /api/v1/playback/decide`.
- Produces a typed decision object consumed by the player.

- [ ] **Step 1: Add the focused failing tests**

Test conservative container/codec reporting using `canPlayType`, native HLS detection, MSE availability, screen bounds, configured quality ceiling, stable local client ID, selected subtitle/audio preferences, and all four decision variants parsed without client-side reinterpretation.

- [ ] **Step 2: Verify the relevant failure**

Run: `npm test -- --run src/playback/capabilities.test.ts src/playback/decision.test.ts`  
Expected: non-zero exit.

- [ ] **Step 3: Implement the minimum behavior**

Report only formats the browser positively or probably supports; omit uncertain codecs rather than claiming support. Treat the server's decision/reason codes as authoritative.

- [ ] **Step 4: Verify the focused pass**

Run: `npm test -- --run src/playback/capabilities.test.ts src/playback/decision.test.ts`  
Expected: zero exit.

- [ ] **Step 5: Run the affected integration check**

Run: `npm run typecheck && npm test -- --run`  
Expected: zero exit.

- [ ] **Step 6: Commit the passing deliverable**

```bash
git add src/playback src/item/ItemDetail.tsx
git commit -m "feat: negotiate playback capabilities"
```

### Task 8: Build Direct Play/HLS player and progress lifecycle

**Files:**
- Create: `src/playback/Player.tsx`
- Create: `src/playback/usePlaybackSession.ts`
- Create: `src/playback/hls.ts`
- Create: `src/playback/player.test.tsx`
- Create: `src/playback/session.test.tsx`
- Create: `src/playback/PlayerControls.tsx`
- Modify: `src/app/routes.tsx`
- Modify: `src/navigation/FocusProvider.tsx`

**Interfaces:**
- Consumes: decision URL, session create/update/delete API, per-user playback state.
- Produces: native video Direct Play, native HLS where supported, hls.js fallback, bounded progress, pause/resume/stop/completed events.

- [ ] **Step 1: Add the focused failing tests**

Test Direct Play assigns the server media URL to `<video>`; native HLS bypasses hls.js; non-native HLS attaches hls.js; UNPLAYABLE shows server reason; resume offset is applied after metadata availability; progress is throttled to a bounded interval; seek/pause/resume generate state updates; ended sends completed; explicit close sends stop; `401` returns to login; closing restores prior browse focus.

- [ ] **Step 2: Verify the relevant failure**

Run: `npm test -- --run src/playback/player.test.tsx src/playback/session.test.tsx`  
Expected: non-zero exit.

- [ ] **Step 3: Implement the minimum behavior**

Use one native `video` element. Load hls.js dynamically only for HLS when native HLS is unavailable so Direct Play does not pay that runtime cost. Player controls remain normal semantic buttons and are wired into the focus system.

- [ ] **Step 4: Verify the focused pass**

Run: `npm test -- --run src/playback/player.test.tsx src/playback/session.test.tsx`  
Expected: zero exit.

- [ ] **Step 5: Run the affected integration check**

Run: `npm run typecheck && npm test -- --run && npm run build`  
Expected: zero exit.

- [ ] **Step 6: Commit the passing deliverable**

```bash
git add src/playback src/app/routes.tsx src/navigation/FocusProvider.tsx package.json package-lock.json
git commit -m "feat: play negotiated media"
```

### Task 9: Add settings, resilience, accessibility, Playwright flows, and release artifact metadata

**Files:**
- Create: `src/settings/Settings.tsx`
- Create: `src/settings/preferences.ts`
- Create: `src/settings/settings.test.tsx`
- Create: `src/app/ErrorBoundary.tsx`
- Create: `src/app/ConnectionStatus.tsx`
- Create: `src/app/resilience.test.tsx`
- Create: `e2e/bootstrap-home.spec.ts`
- Create: `e2e/movie-playback.spec.ts`
- Create: `e2e/tv-playback.spec.ts`
- Create: `e2e/dpad.spec.ts`
- Create: `e2e/recovery.spec.ts`
- Create: `scripts/write-build-metadata.mjs`
- Create: `public/build-metadata.json`
- Create: `docs/OPERATIONS.md`
- Modify: `package.json`
- Modify: `README.md`

**Interfaces:**
- Produces local preferences such as quality ceiling and UI options.
- Produces recoverable unreachable/auth-loss/unavailable-item states.
- Produces build metadata containing client Git revision and server OpenAPI digest.
- Produces browser-level qualification of the approved V1 flows.

- [ ] **Step 1: Add the focused failing tests**

Test preference persistence contains no bearer token, reduced-motion handling, visible focus semantics, server unreachable -> reconnect recovery, unavailable item -> browse recovery, auth loss recovery, and production asset inspection for remote dependencies.

Add Playwright fixtures that run against a deterministic local fake server implementing the current OpenAPI contract. Verify bootstrap/login -> Home, Movie -> Direct Play -> seek -> stop -> resume, Show -> Season -> Episode -> play, keyboard/D-pad-only operation, unavailable item recovery, unreachable/reconnect, and mocked HLS initialization.

- [ ] **Step 2: Verify the relevant failure**

Run: `npm test -- --run src/settings src/app/resilience.test.tsx` and `npm run e2e`  
Expected: non-zero exit until resilience/settings/e2e flows exist.

- [ ] **Step 3: Implement the minimum behavior**

Keep preferences versioned in local storage. Add an application error boundary that preserves a reconnect/logout path. Build metadata is generated from explicit environment/CLI values and never guesses a server revision.

- [ ] **Step 4: Verify the focused pass**

Run: `npm test -- --run src/settings src/app/resilience.test.tsx` and `npm run e2e`  
Expected: zero exit.

- [ ] **Step 5: Run the affected integration check**

Run:
```bash
npm run typecheck
npm test -- --run
npm run build
npm run e2e
npm audit --omit=dev
```
Expected: typecheck/tests/build/e2e exit zero. Any audit finding is classified by affected production dependency and severity rather than silently ignored.

Inspect `dist/` for external runtime URLs and verify `build-metadata.json` contains the exact client revision input and OpenAPI digest.

- [ ] **Step 6: Commit the passing deliverable**

```bash
git add src e2e scripts public docs README.md package.json package-lock.json
git commit -m "feat: complete Mediaphile client v1 slice"
```

## Cross-Repository Integration Gate

After both repositories reach their individual green states:

1. synchronize the client OpenAPI snapshot from the exact server head;
2. build the client `dist/` with exact client Git revision + server contract digest;
3. supply that bundle to the server static-hosting integration fixture;
4. launch the server against a temporary SQLite database and deterministic test media;
5. run Playwright against the real server process for bootstrap -> browse -> Direct Play -> progress/resume;
6. verify a request with a public synthetic source address is rejected by the server guard at the HTTP test seam;
7. record both exact Git heads and the OpenAPI digest in the integration report.

A green client mock-server suite does not substitute for this real cross-repo gate.

## Unresolved Externally Observable Decisions

- **Repository licensing:** no public implementation license has been selected.
- **Visual branding:** the approved design establishes dark, distance-readable, poster-forward behavior but not a final logo, palette, or typeface.
- **Persistent browser login:** V1 plan keeps bearer tokens in memory; persistent authentication across full browser restarts would require a future explicit server/client cookie or secure-storage design change.
