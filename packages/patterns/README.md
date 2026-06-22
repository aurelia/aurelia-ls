# Aurelia Patterns

Curated Aurelia pattern data and curation tooling for AI-facing guidance.

This package owns the pattern contract and catalog before MCP integration. It is
intentionally independent from `@aurelia-ls/semantic-runtime`.

It also owns the package-grade corpus parser for pattern curation. Atlas can
inform the design as prior art, but this package should parse and classify
official Aurelia docs, examples, and tests through its own purpose-built
machinery rather than depending on Atlas corpus APIs.

## Current Scope

- stable public pattern ids;
- compact menu rows;
- fetched pattern examples;
- curated source bundles;
- assumptions and handoff notes for adaptation;
- optional references only to stable, already-fetchable public surfaces;
- self-contained semantic corpus parsing and curation reports for pattern
  authoring;
- bundled Aurelia docs snapshots for offline MCP runtime grounding;
- compact bundled docs search/fetch helpers for MCP docs grounding.

## Curation Pipeline

The parser is not a public pattern generator. It is an evidence engine for
curation:

1. Read the local or bundled GitBook docs corpus.
2. Parse markdown structure, navigation targets, sections, code fences, and
   GitBook directive metadata.
3. Classify source units and extract internal affordance signals.
4. Emit candidate/admission review reports.
5. Keep public catalog records admitted and curated explicitly.

The docs search/fetch helpers expose bounded section-level docs context from
the same parsed corpus. They are for retrieval and review, not automatic pattern
admission.

The admitted public catalog currently covers component/resource, form,
template/binding, service/data, collection, shell, and router patterns. The
catalog itself is source-owned in `src/pattern-catalog.ts`; avoid duplicating
the full pattern id list in prose. To inspect one admitted pattern and its docs
evidence, run:

```powershell
pnpm --filter @aurelia-ls/patterns report -- <patternId>
```

Convenience `report:<slug>` scripts exist for each admitted pattern. The report
connects the pattern record to docs evidence and checks the curated catalog
entry for expected, deferred, non-default, and excluded signals.

Run the full catalog quality guard with:

```powershell
pnpm --filter @aurelia-ls/patterns test
```

This builds the package, runs the public contract tests, checks every admitted
pattern evidence report against the local docs corpus, and typechecks each
curated source bundle in an isolated scratch project against the local Aurelia
declaration files. Use the narrower guards while debugging:

```powershell
pnpm --filter @aurelia-ls/patterns test:contract
pnpm --filter @aurelia-ls/patterns check:evidence
pnpm --filter @aurelia-ls/patterns check:copyability
```

## Dependency Boundary

- no direct dependency on Atlas;
- no direct dependency from Atlas back into this package;
- no direct dependency on semantic-runtime, MCP, or app-builder from this
  package; consuming adapters may depend on patterns through thin integration
  layers;
- corpus parsing should read stable source inputs, such as official Aurelia docs
  and framework tests, through local package-owned readers and classifiers.

## Bundled Docs Corpus

The MCP runtime should not perform web requests to answer Aurelia pattern or
docs-grounded guidance. When the MCP is published, the publish/package step
should copy a snapshot of the Aurelia docs corpus into the package artifact and
include a generated manifest for the copied source revision, file counts, hashes,
and docs root.

Build a local snapshot with:

```powershell
pnpm --filter @aurelia-ls/patterns docs:snapshot
```

The snapshot writer copies `aurelia/docs/user-docs` by default and writes:

```text
docs/aurelia-user-docs
docs/aurelia-user-docs.manifest.json
```

`packages/mcp` calls the same package-owned writer during `release:pack`, so
release tarballs fail loudly when the local docs checkout is missing and include
the copied corpus plus manifest when packaging succeeds.

During development, the parser may read from the local `aurelia/docs` checkout.
Published MCP builds should read from the bundled snapshot through this package.
Public docs URLs may still appear as navigation references, but they are not a
runtime fetch requirement.

The package-level `searchAureliaDocs` and `fetchAureliaDocs` APIs return compact
public rows and bounded page/section payloads. Search omits permanently
excluded docs surfaces such as `router-direct/`; explicit fetches for excluded
paths remain possible for provenance and return caution text.

MCP tools consume this package through a thin adapter and should keep transport
concerns out of the pattern contract.
