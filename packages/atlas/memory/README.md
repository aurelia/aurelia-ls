# Atlas Memory

`atlas-memory.json` is the durable manifest for the `atlas.memory` lens. Focused record shards live under
`records/*.json`. The manifest exists so future agent sessions can ask Atlas where to start instead of rereading every
large workbench after compaction.

The store is intentionally small and queryable. It should hold durable intent, reuse handles, and known live pressure;
it should not become a transcript, autonomous-loop log, or exhaustive task list.

## Information Ownership

Atlas memory is the queryable index for durable intent. Markdown is still useful, but each format has a different job:

- `packages/atlas/memory/records/*.json` stores durable, queryable facts: active pressure, intentional shapes, reuse handles, decisions, and doc shards. Use this when future Codex should be able to retrieve the note by `domain`, `path`, `symbolName`, `anchorLensId`, `liveCheckKind`, or `query`.
- Package `README.md` files own stable boundary maps and local rules. Link them from memory records when the rule matters for future work.
- `workbench/*.md` and `src/WORKBENCH.md` files own rolling context while a subsystem is still settling. Promote the durable part into JSON memory or an owning README when it becomes reusable.
- `.temp/*` files are scratch, review packs, and autonomous-loop ledgers. Do not rely on them after a commit boundary unless their essence has been promoted into JSON memory, a README, or a workbench.

If the same guidance appears in JSON and markdown, the JSON record should be the retrievable handle and the markdown should be the explanatory backing. The JSON record should link to the markdown through a `doc` anchor rather than copying a whole section.

## Storage Shape

The root manifest lists repository-relative shard paths:

```json
{
  "schemaVersion": "atlas-memory.v1",
  "shards": [
    { "path": "packages/atlas/memory/records/template.json" }
  ]
}
```

Each shard contains records:

```json
{
  "schemaVersion": "atlas-memory.v1",
  "records": []
}
```

Add new durable records to the shard that matches their strongest domain. Keep the manifest as an index, not a record
dump.

## Record Kinds

- `pressure-frontier`: live work that should eventually become resolved or be reshaped into an intentional design. These records need `liveChecks`.
- `intentional-shape`: a large or unusual structure that is deliberately kept for now. These records also need `liveChecks` so Atlas can tell whether the shape is still present.
- `reuse-guide`: a reusable “look here first” handle for future work. These records are reference material, not open tasks.
- `decision`: durable product or architecture intent that should survive compaction. Prefer recording the operator/user distinction in the rationale when taste and inference mix.
- `doc-shard`: a small, queryable pointer to documentation that is too easy to miss from the larger markdown files.

Pressure frontiers can carry `nextActionPolicy`:

- `proactive`: default for active pressure that should rank in unfiltered `memory:next`.
- `when-touched`: live source-backed guidance that should steer matching workstreams but not become the next task on its own.
- `hidden`: queryable record with no computed next-action row.

Use `when-touched` after a large frontier has closed for the current pass but still contains important grounding, such as the framework-error diagnostics lane. This prevents durable notes from turning into false-positive task pressure while keeping the source and lens handles easy to recover.
Memory rows and next-action rows display the effective policy; an active `pressure-frontier` without an explicit value
is reported as `proactive`.

## Status

Status is computed by Atlas, not trusted from prose:

- `active`: a `pressure-frontier` live check still matches current source pressure.
- `intentional-live`: an `intentional-shape` live check still matches current source pressure.
- `reference`: reusable guidance or decisions that are not themselves open work.
- `resolved`: a checked pressure record no longer matches its pressure threshold.
- `stale-source`: a checked source path disappeared.
- `stale-check`: the backing substrate was available, but the specific checked declaration or fact no longer matched.
- `untracked`: live product pressure found by Atlas without a durable memory record.

## Anchors And Checks

Use anchors to help a future reader jump to the right source, lens, command, or doc. Use `liveChecks` when Atlas can verify whether a record is still true.

Current live checks:

- `product-large-class`: keeps class-pressure records honest through `product.architecture`.
- `source-file-exists`: keeps a decision or doc pointer honest when the existence of a file matters.
- `source-declaration-exists`: keeps a source symbol pointer honest through the admitted TypeScript source project.
- `atlas-self-source-file`: keeps Atlas-owned source-file pressure honest through `atlas.self` line, shape, and local import counts.
- `atlas-self-class`: keeps Atlas-owned class pressure honest through `atlas.self` class surfaces.
- `atlas-self-function`: keeps Atlas-owned function pressure honest through `atlas.self` function surfaces.
- `auLink-exists`: keeps framework-shaped semantic-runtime memory grounded in a live `@auLink(...)` decorator placement.

Atlas also validates duplicate record ids, missing source/doc anchors, source anchors whose `symbolName` no longer
appears in the admitted source project, lens anchors whose id or projection is not declared in `LensCatalog`,
recognized `pnpm --filter <package> <script>` anchors whose package script no longer exists, fixture anchors whose
repository-relative fixture path is missing, and
pressure/intentional source anchors that point at large product classes without any durable `product-large-class` live
check. `auLink` anchors are validated against semantic-runtime decorator placements discovered by
`product.architecture`.

## Usage

```powershell
pnpm --filter @aurelia-ls/atlas memory
pnpm --filter @aurelia-ls/atlas memory:next
pnpm --filter @aurelia-ls/atlas memory:write -- --mode=list-shards
pnpm --filter @aurelia-ls/atlas memory:write -- --template --id=frontier:example --kind=pressure-frontier --domains=atlas,memory --summary="Example"
pnpm --filter @aurelia-ls/atlas memory:write -- --template --id=decision:observer-shape --kind=decision --domains=observation,auLink --summary="Observer shape" --auLinkId=runtime-html:NodeObserverLocator --symbolName=NodeObserverLocator
pnpm --filter @aurelia-ls/atlas memory -- --projection=guidance --query=evaluator --detail
pnpm --filter @aurelia-ls/atlas memory -- --projection=frontiers --domain=router --detail
pnpm --filter @aurelia-ls/atlas memory:next -- --domain semantic-runtime --domain authoring --limit 8
pnpm --filter @aurelia-ls/atlas memory -- --projection=frontiers --surfaceRole=product-owner --detail
pnpm --filter @aurelia-ls/atlas memory:next -- --nextActionPolicy=when-touched --rows=8 --detail
pnpm --filter @aurelia-ls/atlas memory:next -- --liveCheckKind=atlas-self-source-file --rows=8 --detail
pnpm --filter @aurelia-ls/atlas memory -- --anchorLensId=framework.observation --detail
pnpm --filter @aurelia-ls/atlas memory -- --symbolName=AtlasMemoryRecord --detail
pnpm --filter @aurelia-ls/atlas memory -- --path=packages/semantic-runtime/src/template/runtime-rendering-materializer.ts --detail
pnpm --filter @aurelia-ls/atlas memory -- --projection=stale
pnpm --filter @aurelia-ls/atlas memory:json -- --projection=records --kind=doc-shard
```

## Updating Storage

Prefer the writer script when creating, moving, or deleting records so shard selection and duplicate-id cleanup stay boring:

```powershell
pnpm --filter @aurelia-ls/atlas memory:write -- --template --id=decision:some-intent --kind=decision --domains=atlas,memory --summary="Some durable intent"
pnpm --filter @aurelia-ls/atlas memory:write -- --record=.temp/some-intent.json --shard=atlas --dry-run
pnpm --filter @aurelia-ls/atlas memory:write -- --record=.temp/some-intent.json --shard=atlas
pnpm --filter @aurelia-ls/atlas memory:write -- --mode=remove --id=decision:some-intent --dry-run
```

`--record` accepts one memory record object. `--shard` accepts either a shard name such as `atlas` or a repository-relative shard path. When `--shard` is omitted, the writer uses the first record domain that matches a shard file and falls back to `product`. Upsert preserves an existing `createdAt`, refreshes `updatedAt`, and removes duplicate copies of the same id from other shards.

Memory scripts accept both `--name=value` and `--name value`, and `--limit` is a human-facing alias for `--rows`.
Repeated `--domain` filters narrow by all listed domains by default; add `--domainMode=any` when you deliberately want
an OR-style sweep.

Use `--path=` with a repository-relative file or directory prefix when you are about to touch a source area and want the
adjacent memory records plus any remaining untracked class pressure. The path filter also matches durable shard paths,
so `--path=packages/atlas/memory/records/router.json` is a quick way to inspect one memory shard through Atlas rather
than opening the raw JSON first.

Use `--query=` for a compact fuzzy text pass before choosing structural filters. Query matching keeps old substring
behavior and also matches all tokens split across punctuation and camel-case, so `--query="expression type"` can find
`CheckerExpressionTypeEvaluator`-shaped records. Memory rows, frontier rows, untracked frontiers, and next actions first
rank strict all-token matches, then append significant adjacent matches when at least half the query tokens, and at least
two tokens, match the row. Broad
checkpoint phrases such as `navigation ownership route origin` can therefore surface both the exact authoring record and
the router records that own route-origin semantics without falling back to every one-token mention.
Free-text query matching deliberately ignores storage-envelope fields such as shard paths and synthesized
`atlas.memory:next:*` ids; use `--path=` or `--recordId=` when the storage identity itself is the question.
Query-filtered rows are ranked by where the match came from: ids, exact domains, anchors, source paths, and summaries
outrank incidental mentions in rationale or guidance. Use `--domain=` when the workstream is already known and you want
exact domain membership instead of broad text relevance; repeat it when future-you needs records/actions that sit at an
intersection such as semantic-runtime authoring.

Use `--surfaceRole=` to focus untracked product-class pressure by Atlas'
coarse role classifier. Current roles are `product-owner`, `publisher`,
`work-frame`, `data-carrier`, `service-surface`, `epoch-context`,
`semantic-model`, and `other`. The role is a navigation aid over source shape,
auLink identity, and naming conventions; it is not a product verdict.

Use `--liveCheckKind=` when the useful question is about the mechanism that
keeps a record honest, such as `product-large-class` for semantic-runtime
frontiers or `atlas-self-source-file` for Atlas-owned maintenance pressure.

Use `--nextActionPolicy=` to distinguish proactive frontiers from source-backed guidance that should only be consulted
when the current task touches that domain. The filter accepts `proactive`, `when-touched`, and `hidden`.

Use `--anchorKind=`, `--anchorLensId=`, and `--symbolName=` when the useful
question is structural: records that point at a source symbol, records that
reuse a particular lens, or records that carry a source/script/doc/fixture/lens anchor.
Use `--auLinkId=` when a framework-shaped concept should join durable memory to
the `bridge.aulink` mirror rather than living only in prose.
The writer's template mode accepts the same `--auLinkId=` plus optional
`--symbolName=` and emits the matching `auLink` anchor, so framework-shaped
records do not need hand-authored anchor envelopes before being upserted.
The bridge is bidirectional: `bridge.aulink` anchor, target, mirror, role-evidence,
and obligation rows can continue into `atlas.memory` records filtered by the same
`auLinkId`. Use that path when framework-semantic exploration turns into durable
work tracking or when a mirror row looks familiar but the relevant frontier may
already be recorded.

Use `--rows=` to keep detailed checkpoint output bounded before trying a broad
filter. `--limit=` is accepted for the same purpose when writing quick checkpoint commands.

Treat untracked frontier counts as a canary, not a task count. Add records only when the guidance is durable enough to help future work avoid local reinvention or stale markdown archaeology.

The summary rollup includes untracked frontier counts by semantic-runtime source area and class role. Use that
distribution to choose the next memory-seeding or architecture pass; do not try to exhaustively record every class in
one sweep.

The default summary includes the first ranked next actions. The `next` projection expands that lane from storage
issues, stale records, live pressure-frontiers, live intentional shapes, reuse guides, and untracked product class pressure. It exists for
autonomous-loop checkpoints: check time, ask `memory:next`, keep going from the highest live row that matches the
current workstream. Active pressure-frontiers with `nextActionPolicy=when-touched` appear as lower-ranked consult rows:
they remain available through domain/query filters without hijacking the global queue. Record-backed next actions print
the durable shard path and line, include their backing memory record rows in the answer payload, and print anchors in
detail mode before guidance so the source, doc, script, lens, fixture, or auLink handle is visible without opening raw
JSON. Active live-frontier ranking spends live check pressure
facts such as class lines/methods and Atlas source-file size/coupling instead
of counting checks as the only proxy. When `--query=` is present, next-action ranks include the same relevance bonus as
record rows so workstream-specific handles are not buried under global pressure that only mentions the term in prose.
In `memory:next --detail`, backing memory records remain present in the answer payload, but records already expanded as
next actions are summarized in the printed `memory records` section to avoid repeating the same guidance block twice.
When the workstream is already known, prefer structural narrowing such as
`memory:next -- --domain authoring --rows 8` over reading the global queue and
manually skipping unrelated large-class frontiers.

For Atlas-owned maintenance work, prefer `atlas-self-*` live checks over broad `source-file-exists` checks when the
record is about size, coupling, or function/class pressure. That keeps the memory lane able to resolve or go stale as
Atlas itself is refactored.
