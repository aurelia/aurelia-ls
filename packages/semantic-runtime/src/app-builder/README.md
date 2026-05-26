# App Builder

The app-builder substrate is the fresh AI-first pattern algebra and source
lowering layer for generated Aurelia apps.

It is an AI-first layer: semantic-runtime should do enough semantic planning that
MCP/IDE callers can ask for compact pattern compositions instead of spending
tokens on large reference-app examples. The durable unit is therefore a reusable
app-building mechanic, not a sample domain.

## Shape

```text
user intent
  -> seed profile
  -> app-builder pattern composition
  -> caller/domain slots
  -> Aurelia lowering
  -> app-builder source plan
  -> semantic reopen
  -> expected effects and diagnostics
  -> compact MCP/IDE guidance
```

This is intentionally different from the historical recipe path:

```text
example app
  -> recipe key
  -> source plan
  -> retrofitted ontology
```

## Boundaries

- `pattern.ts` owns reusable mechanic identities such as `draft-form`,
  `resource-index`, `collection-card-browser`, and `direct-state-template-read`.
- `domain-model.ts` owns caller/domain slots such as entity names, collection
  names, identity names, field schemas, operations, sample data, and presentation
  copy.
- `domain-preset.ts` owns public starter-domain presets such as task list. These
  fill domain slots when the caller has no domain yet, but they are not pattern
  identities.
- `seed-data.ts` owns seed data sets, including their audience, density, purpose,
  compatible domain preset, and records. Seed data is a first-class generation
  choice, not a field on the domain preset.
- `seed-profile.ts` owns the "how much app are we seeding?" axes: scale, data
  posture, architecture depth, routing depth, presentation posture, and code
  economy.
- `solution-space.ts` owns canonical product/application spaces such as commerce
  storefronts, catalog directories, operations backoffices, support workspaces,
  content knowledge bases, learning portals, reporting analytics, and account
  settings. These bias pattern menus without becoming caller domain slots.
- `intent.ts` owns starter intents such as minimal app starter, routed app
  starter, form/workflow starter, collection list starter, collection management
  starter, browse/detail starter, and dashboard starter.
- `aurelia-lowering-option.ts` owns Aurelia-specific lowering axes. App-wide
  axes include convention policy, router admission, shared-state ownership,
  package capabilities, and app styles. Per-resource or per-area axes include
  resource declaration, resource configuration, local state, area navigation,
  binding policy, DOM encapsulation, and resource styles. Scalar axes are
  mutually exclusive; array axes are genuinely stackable.
- `reference-scenario.ts` owns public scenario archetypes such as structured
  record management, primary/detail workspaces, dashboards, transactional form
  flows, and task navigation shells. These are pressure/examples, not recipe
  identities or app domains.
- `composition.ts` owns the compact answer shape: which mechanics satisfy the
  intent, what source policy applies, and which semantic effects should verify
  the lowering.
- `composition-catalog.ts` owns concrete app-builder compositions that can lower
  without depending on the historical recipe layer.
- `../source-plan` owns the shared source artifact policy, source text authority, and generated file envelopes that
  app-builder lowerings return.
- `minimal-app-source.ts` owns the first concrete source lowering.
- `collection-list-source.ts` owns the first nontrivial collection/source-value
  lowering.

## Current Rule

Start with pattern composition before source generation. When a current recipe
contains product names, copy, CSS, sample data, or presentation choices, treat
that material as reference-scenario pressure unless the same mechanic can be
named without the domain.

Patterns may name canonical solution spaces when those spaces are natural homes
for the mechanic. For example, card collection browsing is highly relevant to
commerce storefronts and catalog directories. The problem is not a pattern being
opinionated about a solution space; the problem is concrete fixture material
such as specific product names, copy, CSS, sample data, or route nouns becoming
the reusable ontology.

## AI Workflow

The first app-builder workflow should optimize for "no app yet, generate a good
starter." Treat this as progressive disclosure, not one huge recipe picker:

```text
available seed profiles
  -> profile-filtered starter intents
  -> intent/scenario-specific pattern menu
  -> selected pattern composition
  -> domain preset or required domain/source slots
  -> seed data set
  -> lowering preview and verification promise
  -> generated starter source
```

Each step should return compact machine-usable IDs, labels, consequences, and
next accepted inputs. A response is algebra when the next request can use it as
typed input; it is north-star prose when it only describes a desirable app shape
without constraining the next move.

The seed profile is the missing layer between workflow and intent. It answers
questions such as minimal versus starter versus large-app foundation, sample data
versus service boundary, no router versus routed shell, and fewest files versus
explicit boundaries before the pattern menu is opened.

Seed data is its own stage after the domain is known. A caller can choose no seed
data, a public starter set, a demo set, an inspection fixture set, or a
caller-supplied set. Domain presets define the shape; seed data sets define the
visible records and why they exist.

The second workflow is "existing app, suggest extension intents." That lane
should reopen the app first, read its observed taste/capability state, and then
pre-filter the same intent and pattern menus. Do not design merging/editing as
the first problem; keep the initial starter-source workflow clean enough that
merge policy can compose with it later.

## Starter Vertical Slices

`starter.ts` is the first executable app-builder slice. It deliberately supports
the smallest useful path before the broader algebra is settled:

```text
seed-profile menu
  -> starter-intent menu
  -> compatible pattern-composition menu
  -> lowering preview
  -> generated app-builder source plan
```

The initial supported concrete lowering is `minimal-runnable` plus
`minimal-app-starter`, which can lower through either
`minimal-app-shell.decorator` or `minimal-app-shell.convention`. With the
default seed/intent lowering selection it chooses the convention minimal app shell and returns
a shared `SourcePlan` with app-builder-owned complete file text for `src/main.ts`,
`src/my-app.ts`, and `src/my-app.html`.

This is intentionally small, but it is not a throwaway smoke. It proves the
moving parts that the larger app-builder needs: typed menu stages, compact
composition IDs, Aurelia lowering axes, shared source-plan reuse, file previews that
avoid returning source text too early, and expected semantic effect promises.

The second supported concrete lowering is `clean-starter` plus
`collection-list-starter`, currently through
`state-backed-collection-list.convention` and the public `task-list` domain
preset. The golden selects `task-list.public-small` seed data explicitly. The
reusable mechanics are state-backed collection rendering, DI-owned state,
ordinary domain entity, direct state template reads, native input value binding,
checked binding, and add-item flow. The task-list preset is only the default
domain-slot filler for inspection; it should not become the reusable pattern
identity, and its seed data should remain swappable or disabled.

Current concrete lowerings deliberately choose app-wide conventions, light DOM,
and no explicit app/resource style policy. Shadow DOM, component/global
stylesheets, cssModules, shadowCSS, inline custom elements, binding-driven local
view selection, and router-driven area view selection are already typed lowering
axes, but source generation must add a compatible composition before those
choices can be selected truthfully.

The materialized inspection goldens live under
`../../fixtures/app-builder/goldens/` and are refreshed by:

```powershell
pnpm --filter @aurelia-ls/semantic-runtime fixtures:app-builder
```

## Public Grounding

Reference scenarios are seeded only from public pattern and design-system
material. Current grounding includes PatternFly's reusable pattern catalog,
primary/detail, dashboard, and filters guidance; Material Design navigation,
lists, and data tables; GOV.UK form-structure guidance; and ONS service
patterns. The sources provide scenario pressure such as records, collections,
task flows, metrics, and navigation. Concrete names, copy, sample data, CSS, and
business-specific fields stay out of the ontology.
