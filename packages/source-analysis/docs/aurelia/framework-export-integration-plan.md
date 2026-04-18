# Framework Export Integration Plan

Use this note when the goal is to make `packages/source-analysis` operational
against the Aurelia framework source itself.

This is intentionally a thin-slice plan.
The priority is:

1. resolve and classify the full Aurelia framework export surface
2. keep the answer shape honest and stable enough for tests
3. defer richer protocol features until the landscape is mapped

## Core Goal

Point `source-analysis` at the Aurelia framework repo, resolve every exported
surface reachable from package entrypoints, and classify each export into the
right Aurelia-facing semantic family or a truthful non-Aurelia fallback.

For this first slice, "full coverage" means:

- every export gets a classification result
- resource exports resolve to the right resource family when that closes
- non-resource framework exports still resolve to the right non-resource family
- unresolved or open cases stay explicit instead of being forced into a false
  positive

It does **not** require:

- current-world activity closure
- continuation prediction
- the full protocol result algebra
- final public API naming
- full identity/anchor sophistication

## Thin-Slice Rule

Prefer a thinner protocol with broader framework coverage over a richer
protocol that only works for a narrow resource subset.

For the initial Aurelia-framework integration pass, these features should stay
out of scope unless they become unavoidable:

- continuation hints
- delta / reread law
- full capability negotiation
- current-world activity classification
- rich trust-profile publication
- cross-consumer presentation shaping

The first useful surface is a truthful export-classification authority, not a
fully polished protocol.

## Current Landed Harness

The repo now has a first thin golden harness for this slice:

- [fixtures/aurelia-framework-exports/README.md](../../fixtures/aurelia-framework-exports/README.md)
- [manifest.json](../../fixtures/aurelia-framework-exports/manifest.json)
- [generate-aurelia-framework-goldens.mjs](../../scripts/generate-aurelia-framework-goldens.mjs)
- [aurelia-framework-exports.test.ts](../../test/aurelia-framework-exports.test.ts)

That harness currently uses a deliberately tiny row shape:

- exported name
- original name
- declaration name and file
- face kind and face kinds
- type/value posture
- namespace export flag
- export-chain kind summary

This is intentionally below the protocol/kernel ambition described elsewhere.
It exists to create broad framework pressure first.

## First Operational Surface

The first operational target should be a batch export-classification command or
host primitive that works over another repo via `--repo`.

Conceptually:

```text
pnpm source-analysis aurelia classify-exports --repo <aurelia-framework-repo> [--package <name>] [--json]
```

This surface does not need to be final public contract.
It only needs to:

- iterate workspace packages in the target repo
- resolve their exported surfaces through the existing TypeScript/export trace
  machinery
- run Aurelia-aware classification over each export
- emit deterministic machine-checkable results

## Thin Result Contract

The first result contract should be much thinner than the current read-kernel
ideal.

Suggested shape:

```ts
interface FrameworkExportClassificationRecord {
  packageName: string;
  analysisEntrypoint: string;
  exportedName: string;

  tsExport: {
    declarationFile: string | null;
    declarationLine: number | null;
    declarationName: string | null;
    faceKind: string;
    faceKinds: readonly string[];
    traceKind: 'direct' | 'alias' | 'reexport' | 'namespace' | 'fallback';
  };

  status: 'classified' | 'open' | 'no-claim' | 'ts-only';

  ownerIngress:
    | 'grounded-direct'
    | 'grounded-alias'
    | 'grounded-reexport'
    | 'grounded-bounded-assignment'
    | 'wrong-owner-surface'
    | 'unresolved-owner-surface';

  exportFamily:
    | 'resource-definition-export'
    | 'registry-like-export'
    | 'constructable-nondefinition-export'
    | 'interface-symbol-key-export'
    | 'resolver-export'
    | 'resource-key-export'
    | 'compiler-vocabulary-export'
    | 'ignored-primitive-like-export'
    | 'ts-only-fallback';

  resourceKind?:
    | 'custom-element'
    | 'custom-attribute'
    | 'template-controller'
    | 'value-converter'
    | 'binding-behavior'
    | 'binding-command'
    | 'attribute-pattern'
    | 'local-custom-element';

  carrierFamily?:
    | 'resource-definition'
    | 'registrable-metadata-registry'
    | 'analyzed-module-bridge';

  ontologyRole?: 'entity' | 'mode' | 'nested-member';

  keySpaces?: readonly string[];
  namingSurfaces?: readonly string[];
  registrationPaths?: readonly string[];
  evidenceKinds: readonly string[];
  openReason?: string;
}
```

Keep this intentionally small.

It is enough to:

- test coverage over the whole framework surface
- pressure the Aurelia ontology
- detect where the classifier still lacks a family
- delay more elaborate protocol commitments until the export landscape is known

## What The Initial Slice Must Decide

For each export, the initial classifier must answer:

1. Did we resolve this to a real framework-owned surface?
2. What export family does it belong to?
3. If it is a resource-like surface, what resource kind is it?
4. Which carrier family does it use?
5. Does it primarily belong to resource key space, generic DI key space, or
   neither?
6. Is the answer closed enough to classify, still open, or honestly only
   TypeScript-visible?

That is the minimum useful algebra for the integration target.

## What Can Wait

These can come later without blocking the first framework-wide export pass:

- continuations
- current-world activity
- world handle publication
- richer distinction between preserved / claim / spendable
- full anchor or identity issuance
- generalized multi-framework adapter law

## Missing Capability Families In Dependency Order

The safest build order is:

### 1. External repo integration harness

Need:

- a deterministic way to point `source-analysis` at an Aurelia framework repo
- package discovery over that repo
- batch export enumeration over all workspace packages

Reuse:

- existing `--repo` support
- existing exports analysis in
  [analyze.ts](../../src/exports/analyze.ts)

Exit condition:

- we can enumerate every export row for the framework repo without any
  Aurelia-aware semantics yet

### 2. Owner-ingress grounding

Need:

- exact package/export/member/face grounding for framework-owned surfaces
- explicit no-claim for wrong-owner and unresolved-owner cases

Grounding:

- [framework-owner-ingress.md](./framework-owner-ingress.md)

Exit condition:

- every export row gets an owner-ingress result before Aurelia-specific
  classification begins

### 3. Module-item bridge classifier

Need:

- value-shape classification above plain TS face kind
- stable bridge facts such as:
  - `isConstructable`
  - `isRegistry`
  - recovered definition metadata when present

Grounding:

- [module-export-analysis-ledger.md](./atlas/module-export-analysis-ledger.md)

Exit condition:

- every export row gets a bridge profile usable by later Aurelia classifiers

### 4. Resource-definition recovery

Need:

- recovery of Aurelia resource-definition-bearing exports
- kind recovery for:
  - `custom-element`
  - `custom-attribute`
  - `template-controller`
  - `value-converter`
  - `binding-behavior`
  - `binding-command`

Grounding:

- [declaration-world-and-resource-families.md](./declaration-world-and-resource-families.md)
- [resource-kind-carrier-index.yaml](./atlas/resource-kind-carrier-index.yaml)

Exit condition:

- definition-bearing exports classify into the right kind and carrier family

### 5. Compiler-vocabulary recovery

Need:

- explicit classification for `binding-command`
- explicit classification for `attribute-pattern`
- no collapse between them just because both are compiler-facing

Grounding:

- [resource-kind-carrier-index.yaml](./atlas/resource-kind-carrier-index.yaml)

Exit condition:

- compiler-root-only vocabulary exports resolve cleanly instead of falling into
  generic resource or TS-only buckets

### 6. DI/key-space classification

Need:

- explicit distinction between:
  - generic DI keys
  - interface-symbol keys
  - resolver keys
  - resource keys
- helper surfaces and resolver exports should not be misclassified as resources

Grounding:

- [kernel-di-and-resource-admission-ledger.md](./atlas/kernel-di-and-resource-admission-ledger.md)

Exit condition:

- exported DI/key surfaces classify without pretending to be resources

### 7. Registry/configuration constructor classification

Need:

- classification for registry-like exports
- archetype recognition for configuration/builder/wrapper/lifecycle-attached
  constructor surfaces

Grounding:

- [registration-world-constructors.md](./registration-world-constructors.md)
- [export-semantic-surface-ledger.yaml](./export-semantic-surface-ledger.yaml)

Exit condition:

- registry-like exports stop being a catch-all unknown bucket and become a real
  classified family

### 8. Naming and registration-path explanation

Need:

- canonical name and alias recovery where cheap and honest
- registration-path family tagging

This should stay shallow at first.
It is there to make classifications explainable and testable, not to close the
whole world-construction problem.

Exit condition:

- classified exports expose enough supporting fields to debug and test why they
  landed in a given family

### 9. Batch integration expectations

Need:

- a golden fixture format for the framework repo
- deterministic expected rows or expected subsets
- package-level coverage and family counts

Exit condition:

- running the Aurelia framework integration test tells us exactly which exports
  still fail to classify or fell into the wrong family

## First-Pass Classification Algorithm

The first-pass algorithm should stay simple and monotonic:

1. Enumerate package exports through the existing export analyzer.
2. Resolve TS export trace and declaration face.
3. Run owner-ingress grounding.
4. If owner-ingress does not close, emit `no-claim` or `ts-only`.
5. Build module-item bridge facts:
   - constructable
   - registry-like
   - definition-bearing
   - primitive-like
6. Attempt the strongest closed Aurelia family first:
   - resource-definition-export
   - compiler-vocabulary-export
   - interface-symbol-key-export
   - resolver-export
   - resource-key-export
   - registry-like-export
   - constructable-nondefinition-export
7. If none close honestly:
   - emit `open` when the surface is plausibly framework-shaped but the needed
     evidence is still missing
   - emit `ts-only` when only TS truth is available
   - emit `no-claim` when the framework lane does not apply

The classifier should never force a resource kind just because:

- the export name looks familiar
- the declaration is constructable
- a nearby sibling export is a resource

## Proposed Golden Fixture Shape

This should be a new integration fixture family rather than an extension of the
small derivation fixtures.

Suggested layout:

```text
packages/source-analysis/fixtures/aurelia-framework-exports/
  README.md
  manifest.yaml
  schema.yaml
  vocabulary.yaml
  expectations/
    packages/
      aurelia-kernel.yaml
      aurelia-runtime-html.yaml
      ...
```

### Manifest

The manifest should declare:

- suite id
- target repo locator
- package selection
- expected package count
- expected export count if known
- allowed temporary open buckets

Example shape:

```yaml
schema_version: v0alpha1
suite_id: aurelia-framework-exports
repo_locator:
  kind: env-or-path
  env_var: AURELIA_FRAMEWORK_REPO
  fallback_paths:
    - ../aurelia
packages:
  - '@aurelia/kernel'
  - '@aurelia/runtime'
  - '@aurelia/runtime-html'
allowed_open_families:
  - registry-like-export
```

### Per-package expectation packet

Each package packet should contain:

- package metadata
- known entrypoint
- expected family counts
- explicit export rows

Example shape:

```yaml
schema_version: v0alpha1
package: '@aurelia/runtime-html'
analysis_entrypoint: packages/runtime-html/src/index.ts
expected_counts:
  classified: 0
  open: 0
  no_claim: 0
  ts_only: 0
  by_export_family: {}
  by_resource_kind: {}
exports:
  - exported_name: CustomElement
    status: classified
    owner_ingress: grounded-direct
    export_family: resource-definition-export
    resource_kind: custom-element
    carrier_family: resource-definition
    ontology_role: entity
  - exported_name: BindingCommand
    status: classified
    owner_ingress: grounded-direct
    export_family: compiler-vocabulary-export
    resource_kind: binding-command
    carrier_family: resource-definition
```

### Row-level rules

The first framework-wide golden format should keep row expectations thin:

- `exported_name`
- `status`
- `owner_ingress`
- `export_family`
- optional `resource_kind`
- optional `carrier_family`
- optional `ontology_role`

Only add more row fields when they are stable enough to help catch real
regressions.

### Why This Format Is Safer

This format is safer than trying to encode the full protocol now because it:

- lets the classifier cover the whole framework sooner
- tells us which Aurelia family buckets are still missing
- creates pressure on ontology and vocabulary through real framework data
- avoids hard-freezing continuations, world handles, and richer algebra before
  the classification landscape is known

## Initial Success Criteria

The initial Aurelia framework integration slice is successful when:

- every export from the chosen Aurelia framework packages produces one
  deterministic row
- the majority of framework-owned exports classify into a non-TS-only family
- the remaining `open` and `ts-only` rows are small enough to inspect directly
- resource kinds and non-resource families stop drifting between passes
- misclassifications become visible as fixture diffs instead of ad hoc source
  rereads

## Recommended Immediate Build Sequence

If this starts now, the safest order is:

1. add the batch harness over `--repo`
2. add a thin Aurelia owner-ingress and export-family classifier
3. create the framework export fixture suite and seed a few package packets
4. run against the framework repo and inspect all `open` / `ts-only` rows
5. close the biggest family gaps one by one
6. only after surface coverage stabilizes, widen the protocol again

That sequence favors mapping the real semantic terrain before hardening a
larger protocol around guesses.
