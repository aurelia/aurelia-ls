# App-Builder Ontology

This folder owns the legacy/internal app-builder ontology. It is a semantic
runtime substrate for app-building research, source-lowering experiments,
fixture pressure, and evidence harvesting.

It is not the current public app-building product surface. Public MCP guidance
now belongs to **Aurelia Patterns**:

```text
pattern menu/search
  -> pattern example fetch by stable patternId
  -> adapt source into the target app
  -> verify the adapted project with semantic-runtime diagnostics/app queries
```

Do not use this ontology README, its old query family names, or its status
matrix as authority for the public MCP contract. The retired public app-builder
ladder asked AI callers to inspect catalogs, choose policy axes, provide domain
models, satisfy readiness/preflight gates, and request source-lowering before
they had a useful pattern in hand. That design has been superseded.

## Current Boundary

The ontology can remain useful as internal evidence:

- broad maps of affordances, application patterns, collection concepts,
  controls, styling mechanisms, policy axes, input contracts, and effect
  contracts;
- graph links between rows that help explain why a source-lowering target needs
  particular input, policy, or effect facts;
- request-field coverage for executable source-lowering surfaces;
- generated fixture indexes and expected-effect pressure;
- source provenance and SourcePlan contribution tracking;
- native/accessibility review pressure that can inform curated patterns.

Those details should inform Aurelia Patterns only after curation. Do not leak
ontology row kinds, target catalogs, input-readiness rows, recommendation-policy
handles, status matrices, source-lowering preflight, SourcePlan request fields,
or caller-supplied domain-model requirements into public pattern responses.

## Source Ownership

- `catalog.ts`, `relations.ts`, and row-family modules own the internal map of
  ontology rows and relationships.
- `input-contract-*.ts`, `input-readiness*.ts`, and payload modules own legacy
  caller input modeling. These are evidence for what generated source used to
  need, not public Aurelia Patterns request fields.
- `source-lowering-surface.ts` is the internal registry of exact ontology
  targets that expose callable source-lowering surfaces.
- `source-lowering-request-field*.ts` owns per-call request-field contracts such
  as binding expressions, button text, collection expressions, source placement,
  and nested source envelopes. These are not input contracts and should not be
  satisfied by hidden defaults.
- `target-catalog.ts`, `source-lowering-preflight.ts`,
  `source-lowering-invocation.ts`, `source-lowering-composition.ts`, and
  `source-lowering-source-plan.ts` preserve the old internal query ladder for
  tests, fixtures, and possible harvesting. They should not be re-registered as
  public MCP tools without a new product decision.
- Detail modules such as `affordance-detail.ts`,
  `application-pattern-detail.ts`, `collection-concept-detail.ts`,
  `control-pattern-detail.ts`, `effect-contract-detail.ts`, `policy-detail.ts`,
  and `style-detail.ts` expose family-specific evidence for internal analysis.

## Internal Query Families

If internal scripts or tests still call app-builder query functions, interpret
the word "public" in their legacy names as historical semantic-runtime API
surface, not as the current MCP product contract.

The old families include:

- ontology and target catalogs;
- input contract detail and input readiness;
- affordance, application-pattern, collection-concept, control, effect, policy,
  and style detail;
- source-lowering preflight, invocation, composition, and SourcePlan preview.

These functions should stay compact and selector-sensitive while they exist.
They should not re-expand into MCP startup schemas, prompts, Work Router
guidance, or user-facing docs.

## Status And Policy

Status projection is internal review pressure, not public vocabulary.

Use status rows to audit declaration drift between modeled rows and executable
source-lowering registry coverage. Use recommendation-policy rows to understand
legacy applicability and evidence. Do not ask a pattern caller to select a
status, source domain, recommendation profile, visual policy, convention policy,
or control-realization policy before returning useful source.

Local defaulting candidates remain local app-builder research. They do not make
blank-slate defaults for Aurelia Patterns.

## Source Lowering

Source-lowering answers are read-only. They may return fragments, compositions,
SourcePlan previews, witness rows, generated control-use inventory, provenance,
and effect links, but they must not write files.

Important internal boundaries:

- Preflight is a gate and explanation surface, not a generator.
- The executable source-lowering registry, not the status matrix alone, decides
  which targets have callable lowerers.
- Per-call request fields stay explicit. Hidden defaults should not make a
  lowerer appear ready when essential naming, binding, data, source placement,
  or accessibility facts are missing.
- Direct delegated fragments should preserve part-source origin. Composed
  fragments should also preserve the app-builder ontology target that caused the
  composition.
- SourcePlan wrappers should keep broad app-building policy separate from
  concrete file placement and contribution metadata.

These constraints are useful when harvesting examples for patterns, but the
curated pattern example is the public artifact.

## Effect Contracts

Effect contracts can describe the kinds of semantic-runtime verification that a
generated or adapted app might exercise: resource discovery, template binding,
component manifests, control-use inventory, dependency injection, expected
effects, router facts, diagnostics, and related app-query products.

Do not bake effect-contract stamps into public patterns as proof. The preferred
verification loop is asynchronous: adapt a pattern into the target app, then run
semantic-runtime diagnostics or app queries against the actual project.

## Relationship To Patterns

When moving evidence from app-builder into `packages/patterns`:

- start from framework-docs and test-corpus canon first;
- use app-builder fixtures as pressure examples, not as source of public
  grammar;
- keep assumptions and handoff notes tiny and reviewable;
- cite stable docs refs when available;
- omit ontology-specific explanation unless it is directly useful to the user
  adapting the example;
- prefer native browser semantics, plain TypeScript, Aurelia DI, and
  affordance-local microdomains.

Router-direct is permanently excluded from public Aurelia Patterns guidance.
Validation and i18n can be admitted only through curated patterns or docs-first
handoffs; do not treat old app-builder deferred-lane wording as current pattern
authority.

## Ground Rules

App-builder ontology code can continue to be maintained where it protects
semantic-runtime regressions or helps harvest better patterns. It should not
drive the MCP public contract, Atlas public guidance, Work Router routing, or
new pattern vocabulary by inertia.

Exact implementation details live in the source files. This README intentionally
documents the boundary and ownership model instead of reproducing the retired
public workflow.
