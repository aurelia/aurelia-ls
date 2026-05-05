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

The authoring ontology has four durable concepts:

- **Operation**: an intentful semantic transformation such as creating a component or configuring the router.
- **Recipe**: an ordered composition of operations, such as setting up auth through services, routing, hooks, and UI.
- **Capability**: a statement about what the runtime can currently author and verify.
- **Profile**: taste and convention policy, such as native decorators or conventions.

Operations are described by stable axes:

- `familyKey`: the broad semantic area.
- `action`: create, connect, configure, modify, remove, verify, repair, or migrate.
- `targetKind`: the app topology or semantic surface being transformed.
- `requiredCapabilities`: what the runtime must know how to author or verify.
- `commonAmbiguities`: choices the AI should not silently flatten when they are genuinely user/product taste.

This lets larger requests remain recipes instead of magic primitives. "Set up auth" can compose authentication,
service/DI, integration, routing, access-control, template, component, design, and verification operations while each
piece keeps its own semantic lane.

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
