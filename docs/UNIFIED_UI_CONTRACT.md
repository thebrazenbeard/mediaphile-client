# Unified Mediaphile UI — owner-approved platform contract

**Decision date:** 2026-10-07  
**Authority:** Live owner instruction supersedes platform-by-platform recommendations in Plex comparison research.

## One layout

All Mediaphile application surfaces use one route hierarchy and one shell:

```text
┌───────────────┬──────────────────────────────────────────┐
│ MEDIAPHILE    │ Server / identity / session header       │
│ Home          ├──────────────────────────────────────────┤
│ Movies        │ Home rails, browse, details, or player    │
│ TV Shows      │                                          │
│ Search        │                                          │
│ Settings      │                                          │
└───────────────┴──────────────────────────────────────────┘
```

**Navigation is always on the left.** At narrow widths the same navigation becomes a persistent vertical icon rail; accessible names, ordering, paths, and focus semantics remain unchanged. No mobile bottom navigation, TV-specific top menu, duplicated route trees, or device-conditioned information architecture.

Responsiveness adjusts only scale: rail width, content columns, spacing, media cards, safe-area padding and touch/focus target sizes. Hardware/native wrappers may replace the media playback engine but must retain the same shell.

## Shared browsing behavior

- Movies and TV Shows use the same `BrowsePage` component and toolbar.
- Library picker filters by server-authoritative local library ID.
- Watch status is per-authenticated-user and server-filtered: All, Unplayed, In Progress, Watched.
- Search remains server-filtered.
- Grid/List is a presentation preference stored locally, never a second catalog model.
- Cursor pagination is mandatory; do not truncate a large library at the first 24/100/200 items.
- Neither IDs nor media paths are invented or reconstructed by the client.
- Posters/description/provenance remain evidence-grounded; absence is shown honestly.

## Same interface, different input methods

Mouse, touch, keyboard, D-pad and gamepad controllers operate the same visible controls. At every viewport the left rail retains stable focus order. Pointer hover is optional, never the only path to an action.

Native tvOS/Roku/Tizen/webOS/console apps are **not qualified** merely because a desktop browser can resize to their dimensions. Their decoder and hardware input stacks require separate testing.

## Tests and acceptance

Browser E2E runs the same navigation semantics on desktop and phone-size viewports; it verifies that the left rail stays at x=0 and fills the viewport height, that there is no horizontal scroll overflow, that library/source and status controls are available, that grid/list switch state works, and that a second cursor page loads.

For platform parity, future native clients must run the same navigation and browse interaction contract tests plus platform-specific playback tests. Never replace the shell for perceived platform conventions.

## Research lineage

The private core repository `thebrazenbeard/mediaphile` holds `docs/ux/PLEX_CROSS_PLATFORM_UI_RESEARCH_20261007.md`: observations of Plex Web, desktop, Android/iOS, tablets, tvOS, Android/Fire TV, Roku, smart TVs, consoles, HTPC, casting, and companion apps. The differences in Plex are *inputs* to this analysis, not permissions to fragment Mediaphile's interface.
