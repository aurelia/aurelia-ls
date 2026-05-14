# Authoring Operation Ontology

This note explains the operation vocabulary in `ontology.ts`. The TypeScript catalog is the authority; this document is
the compact orientation layer for future agents. See [README.md](./README.md) for the folder boundary and
[CAPABILITY_CHECKLIST.md](./CAPABILITY_CHECKLIST.md) for the broader authoring scope map.

## Grounding Principles

The ontology starts from the job semantic-runtime must do for an AI-assisted authoring loop:

- expose what can be safely authored and verified;
- represent app changes as typed semantic transforms rather than file templates;
- keep convention and taste choices visible instead of silently flattening them;
- compose larger requests from smaller operations;
- reopen the app after edits and compare observed facts against expected effects.

## Algebra

The authoring ontology has five durable concepts:

- **Operation**: an intentful semantic transformation such as creating a component or configuring the router.
- **Recipe**: an ordered composition of operations, such as setting up auth through services, routing, hooks, and UI.
- **Capability**: a statement about what the runtime can currently author and verify.
- **Profile**: taste and convention policy, such as native decorators or conventions.
- **Repair**: a typed handoff from a diagnostic, open seam, or verification failure into a future authoring operation.

Operations are described by stable axes:

- `familyKey`: the broad semantic area.
- `action`: create, connect, configure, modify, remove, verify, repair, or migrate.
- `targetKind`: the app topology or semantic surface being transformed.
- `requiredCapabilities`: what the runtime must know how to author or verify.
- `commonAmbiguities`: choices the AI should not silently flatten when they are genuinely user/product taste.

This lets larger requests remain recipes instead of magic primitives. "Set up auth" can compose authentication,
service/DI, integration, routing, access-control, template, component, design, and verification operations while each
piece keeps its own semantic lane.

Capabilities may also carry product-level open reasons in the ontology. These are gaps that are true before an app is
opened, such as package-tooling policy, source-edit policy, or not-yet-modeled product areas. App-specific capability
rows may add more reasons from observed facts, but they should not be the only place where global product gaps are
discoverable.

Package-tooling policy is intentionally layered. A recipe can now expose recipe-baseline package/typecheck artifacts
through `package-tooling.ts` while still carrying a product-open package-tooling reason for build-tool or package-manager
execution policy. Do not treat `packageToolingPolicy: recipe-baseline` as "the app is runnable in every host"; it means
the package manifest, TypeScript config, and module declarations are structured enough for the authoring loop to review
and apply.

Repair vocabulary is deliberately separate from edit vocabulary. A repair row may say "declare a missing member",
"strengthen this owner type", "rewrite this binding source", or "extend semantic-runtime substrate", but it should not
pretend formatting, file placement, imports, or package-manager policy are solved. The source edit boundary remains an
explicit open part of the authoring loop.

Support states are ordered by promise strength. `observable` means the current app has facts the authoring API can read;
`plannable` means the authoring layer can construct a semantic plan. A minimum support-state check must not treat those
as equivalent, even though an operation may choose to become `plannable` after all of its required capabilities are at
least observable.

Taste axes have a dominant layer, but individual taste values carry their own layer. This is deliberate: one axis can
contain source-observed values, policy preferences, and weaker derived readings without pretending they have equal
authority. For example, `state-ownership` can report observed route-parameter state pressure while also naming the
authoring policy preference for DI-owned state classes. Future recipes should inspect value-level layer, confidence, and
evidence before treating a value as a recommendation.

`build-tool-profile` is a policy-bearing axis, not a hidden generator switch. Current generated recipes prefer
`host-selected-build-tool` while their project-tooling plan emits only package/typecheck artifacts. Opened apps may
separately observe `typecheck-only-tooling` or `bundler-config-tooling` from project source roles and config filenames,
but those observed shapes do not by themselves authorize semantic-runtime to choose Vite, a dev server, or an asset
pipeline.

Profiles are taste-preference bundles, not separate ontology axes. A profile such as `native-decorators`,
`conventions`, or `explicit-registration` points at the same axis/value descriptors used by recipe preferences and
orientation rows. If a profile cannot name explicit preferences, keep it as an ambiguity summary rather than encoding
another local policy vocabulary.

`AuthoringOrientation` keeps the ontology meaning and the current app reading separate. Taste value rows expose
`ontologySummary` for the durable value definition and `observedSummary`/`summary` for why that value appeared in the
opened app. Axis rows also split value counts by `primitive-policy`, `observed-shape`, and `derived-reading`.
`policyState` is only inferred when the opened app produced at least one primitive-policy value; observed-shape values
can still verify recipe signatures, but they are not treated as a declared or inferred authoring policy by themselves.
Do not infer policy from a descriptor summary without checking the observed evidence, layer, and confidence.

Convention-related values intentionally sit on two different axes. Resource declaration mode asks how the resource
metadata itself is represented: decorators, static class-side metadata, explicit definition objects/factory calls, or
the currently specified legacy conventions plugin shape. Resource admission mode asks how resources become visible to
an app or compiler world, where convention discovery is an admission path beside registration, bundles, plugin APIs, and
dependency arrays. A future modern convention model should stay a future-product horizon until it has specified
framework/source semantics; do not encode it as an active taste value just because the authoring loop wants a cleaner
convention story.
`AuthoringOrientation` classifies resource admission from the framework-registration substrate when possible:
runtime-html bundles and decomposed registration groups stay on `bundle-registration-admission`, plugin configuration
registries such as router, i18n, validation, state, and dialog stay on `plugin-registration-admission`, direct
registration calls stay on `direct-registration-admission`, and component dependency arrays remain a resource-scoped
admission value. App-wide resource-registration facts are also an observed admission shape, not a weaker source-style
guess. Do not collapse these back into the source syntax of `.register(...)`; the source call can be direct while the
admitted thing is still a bundle or plugin configuration.

Package/workspace shape and source-folder shape are also separate axes. `package-topology` answers whether the current
project is an app package, workspace/monorepo participant, or resource-library package. `source-layout` answers how the
roleful source files appear organized inside that package. The selected `aurelia-app` project shape is an observed
single-app package value, while feature/bounded-context layout remains a weaker source-organization reading. A generated form can therefore report both
`single-app-package` and `feature-folder-topology`; those are not competing values.

Navigation ownership uses router model dimensions instead of a single "routes exist" reading. Route rows carry
`originKind` (`@route`, `Route.configure`, class static defaults, or child `routes`) separately from `valueKind`
(object literal, path expression, routeable component, class static defaults, or open expression).
`decorator-route-config`, `configure-call-route-config`, `class-static-default-route-config`, and
`child-routes-property-route-config` come from the origin dimension. `static-route-config` comes from closed value
shapes, `dynamic-route-config` comes from open value shapes, and `viewport-layout-navigation` comes from viewport fields
or runtime viewport/agent topology. Do not collapse those back into one route-config axis value.

Template, form, and style readings follow the same one-question-per-axis rule. `template-source-ownership` answers where
markup comes from, while `template-rendering-boundary` answers whether the template uses Shadow DOM, light DOM, or
template-controller composition. `form-value-channel` answers which observer/value-channel semantics are visible,
`validation-ownership` answers who owns validation, and `form-type-surface` records whether form-like value channels
currently have strict or weak TypeChecker surfaces. `style-resource-ownership` answers where stylesheets or
style-system dependencies live, while
`style-binding-model` answers which observer-backed class/style value channels are used: whole class tokens,
per-class toggles, whole style rules, or per-property style values. Style resource values come from
`AppTopology.styles` source-backed CSS import and Aurelia style registry rows, not from dynamic class/style binding
flows. `create-style-asset` is the source-edit operation for adding stylesheet/style assets, while `style-resource` is
the style-scoped expected-effect fact used to verify that reopened topology can see those assets. Do not collapse these
back into broad "template ownership", "form model", or "style ownership" buckets just because a recipe happens to care
about several of them at once.

## Families

- `workspace-shell`: package/build tooling, folder structure, entrypoints, app roots, templates, styles.
- `capability-admission`: plugins, packages, app-wide feature registrations.
- `resource-authoring`: Aurelia resources: custom elements, attributes, template controllers, converters, behaviors,
  commands, and attribute patterns.
- `component-composition`: role-specific components such as forms, routed pages, widgets, layouts, and async boundaries.
- `domain-model`: state classes, repositories, use-case classes, and domain-owned app model surfaces.
- `dependency-injection`: DI keys, registrations, injection sites, lifetimes, aliases, and container visibility.
- `integration`: backend clients, platform adapters, environment boundaries, and external capability edges.
- `routing`: route trees, routeable components, navigation surfaces, route hooks, and viewport/layout structure.
- `authentication`: user/session services, login/logout flows, provider integration, and auth UI states.
- `access-control`: authorization policy, protected route admission, guard hooks, permission checks, and denied states.
- `template-composition`: bindings, events, forms, validation, template control flow, slots, resource usage.
- `design-system`: style strategy, theme tokens, layout policy, accessibility, component-library integration.
- `evolution`: rename, move, extract, split, convert, upgrade, migrate.
- `verification`: reopen app, compare expected semantic effects, surface open seams, plan repairs.

## Scope Boundary

The ontology names semantic operation vocabulary. It does not own implementation sequencing, fixture content, or
package-manager behavior. Keep broad capability coverage in [CAPABILITY_CHECKLIST.md](./CAPABILITY_CHECKLIST.md), and
keep live session context in [WORKBENCH.md](./WORKBENCH.md).

The stable rule is that recipe generators should be added only when their composed operations can name expected semantic
effects and the analysis side can verify or explicitly open those effects.
