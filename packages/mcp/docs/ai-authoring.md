# Aurelia AI Authoring Guidance

This file is the compact static guidance for AI agents using the Aurelia MCP.
It is intentionally smaller than the bundled docs corpus and should stay
copyable into project rule files such as `AGENTS.md`, `CLAUDE.md`, `GEMINI.md`,
or editor-specific AI instructions.

The MCP server remains the source for details. Use this file to keep the
authoring posture stable before an agent starts guessing from stale framework
priors.

## Aurelia Agent Instructions

Copy this section into an AI rule file when working in an Aurelia app:

```markdown
# Aurelia Agent Instructions

When authoring new Aurelia code:

- Use `aurelia_pattern_menu` to find a compact curated starting point before
  inventing Aurelia-specific syntax.
- Fetch the selected pattern with `aurelia_pattern_example` by stable
  `patternId`.
- Use `aurelia_docs_search` and `aurelia_docs_fetch` for official docs context.
  The docs are bundled with the MCP package, so runtime web requests are not
  required for framework grounding.
- Adapt pattern source into the target app, then run relevant
  `support.followUp` hints from the pattern. Treat those hints as
  semantic-runtime verification steps, not autofixes.
- Run semantic-runtime diagnostics, template diagnostics, router overview, or
  compact app queries before declaring adapted code clean.

Default Aurelia design posture:

- Prefer platform HTML/browser semantics and native controls.
- Keep local state on view-models. Put shared or longer-lived feature state and
  commands in injected TypeScript classes through Aurelia DI.
- Use `@bindable` for parent-to-child inputs.
- Prefer injected state/service classes over EventAggregator, callback
  bindables, broad two-way/from-view bindables, or ad hoc cross-component event
  chains for shared feature behavior.
- Do not use callback bindables as the default way to pass commands between
  components; promote shared feature behavior to injected services instead.
- Treat routes as navigation transactions: `canLoad` decides entry, `loading()`
  prepares route-critical data after guards, shell/router events show
  navigation progress, and `promise.bind` is for secondary non-gating async
  content.
- Use `IRouteContext.getRouteParameters()` when nested route and query values
  form the identity for async route data loading.
- Use fetch/data services for HTTP boundaries. Keep cache, interceptor, retry,
  cancellation, and auth policy explicit instead of folding them into generic
  component code.

Supported but narrow choices:

- DOM refs are for small browser APIs such as focus, selection, measurement, or
  scroll calls on elements the component renders.
- `$attrs` transfer is for native wrapper components, not vague component APIs.
- Use validation-plugin patterns when native constraints are not enough; keep
  server validation errors in the same validation-controller display path.
- Use server-query collection patterns when the server owns filtering, sorting,
  pagination, and shareable URL query state.
- Use auth/session route guards for navigation UX, while mirroring every
  authorization decision on the server.
- Use i18n locale-service patterns for stable translation keys and runtime
  locale switching; keep validation localization and lazy namespace policy
  separate.
- Use dialog/modal patterns for blocking confirm/edit flows that return close
  results; keep non-blocking overlays in portal patterns.
- Use virtual-repeat for client-owned large collections with stable row
  geometry; it reduces DOM cost, not API payload size.
- Custom attributes, template controllers, dynamic composition, fetch
  interceptors, fetch cache policy, and portal-backed notification overlays are
  deliberate tools, not default answers.

Deferred or docs-first lanes:

- Use docs search/fetch and semantic-runtime diagnostics carefully for
  state/store plugins, validation localization, lazy i18n namespaces, external
  auth SDK flows, persistence/offline queues, design-system governance, and
  broad migration/modernization.
- Do not use `@aurelia/router-direct` for new public guidance; prefer the
  standard router patterns surfaced by the MCP.
- Do not ask for the old `app-builder` or `source-lowering` public grammar;
  use Patterns, bundled docs, and semantic-runtime verification instead.
- Do not revive Aurelia 1 `.delegate` or `.call`; semantic-runtime reports
  those removed binding commands as `AUR0713`.
```

## How This Relates To The MCP

- `aurelia_pattern_menu` returns compact menu rows only.
- `aurelia_pattern_example` returns source, assumptions, handoff notes, stable
  docs refs where available, and compact `support.followUp` hints.
- `aurelia_docs_search` and `aurelia_docs_fetch` read the bundled Aurelia docs
  snapshot.
- Semantic-runtime tools inspect the real target app after adaptation. They are
  the verification substrate for Patterns.

## Release Taxonomy

Endorsed defaults:

- native/platform HTML;
- template bindings and local view-model state;
- injected DI services for shared state and commands;
- typed fetch/data service boundaries;
- router transactions, route-context parameter reads, and shell progress;
- ordinary component inputs and light-DOM composition.

Supported exceptional or narrow lanes:

- child `CustomEvent` output for visible parent-child UI events;
- DOM refs for narrow browser APIs;
- attribute transfer for native wrappers;
- validation-plugin forms and server validation error merging;
- i18n locale service and stable translation keys;
- dialog/modal confirm or edit flows;
- virtual-repeat for client-owned large lists;
- server-owned filtering, sorting, pagination, and URL query-state;
- auth/session route guard UX with server-side authorization enforcement;
- custom attributes and template controllers for reusable resource behavior;
- dynamic composition for bounded known component choices;
- fetch interceptors/cache policies with explicit lifetime and policy;
- portal-backed notification overlays.

Deferred gaps:

- state/store plugins;
- validation localization and generated/schema-driven validation;
- lazy i18n namespace loading and route-title localization;
- external auth SDK token refresh and permission policy;
- persistence, browser storage, and offline queues;
- advanced accessibility such as focus traps and roving tabindex;
- design-system or component-library governance;
- broad migration and fixer/edit-planning flows;
- `@aurelia/router-direct`;
- old public `app-builder` or `source-lowering` grammar.
