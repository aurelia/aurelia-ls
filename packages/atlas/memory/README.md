# Atlas memory

## Information Ownership

Memory keeps design decisions, reasons for preserving unusual code, and links to evidence a future maintainer might otherwise overlook. The linked code, tests and framework checkout own current behavior. Each record has a stable ID and belongs to one of the [manifest](atlas-memory.json) shards under [records/](records/).

## Look up a decision

Run either command from the repository root. The first searches for an issue by description. The second retrieves a known record and its evidence.

```powershell
pnpm --filter @aurelia-ls/atlas memory -- --projection=records "--query=diagnostic pull" --rows=5
pnpm --filter @aurelia-ls/atlas memory -- --recordId=decision:project-input-change-detection --detail
```

Use `--domain=`, `--path=`, `--symbolName=`, or `--auLinkId=` to narrow a lookup. Historical records marked `archived: true` remain addressable by ID. The records projection accepts `--archived=true` to restrict a search to them.

## Interpret a check

`reference` identifies a reusable decision or guide. A measured frontier can be `active` or `resolved`; an intentional design with a matching check is `intentional-live`. A resolved size threshold establishes that the measured code is below that threshold. The code may still have production callers.

An `out-of-scope` result requires admitting the subject file before judging the check. `stale-source` means the checked path is gone, and `stale-check` means the expected declaration or fact failed its check. The answer's basis describes its source coverage. Anchors can name a file, declaration, documentation heading, fixture, package command, auLink target or lens. A passing existence check establishes presence; a claim about observable behavior needs evidence from its consumer.

## Update a record

When an owner changes or a lookup gives bad guidance, compare the record with that owner's current implementation and a distinguishing check. Keep the reasoning another reader would need, the anchor and the replay. An archived record can name the successor and the Git revision containing the historical detail.

The writer validates records and supports moves between shards. An upsert preserves the original creation date and refreshes the update date. Give the draft path relative to the repository root, or use an absolute path.

```powershell
pnpm --filter @aurelia-ls/atlas memory:write -- --template --id=decision:example --kind=decision --domains=kernel
pnpm --filter @aurelia-ls/atlas memory:write -- --mode=upsert --record=decision.json --shard=kernel --dry-run
```

Remove `--dry-run` to write a reviewed draft. The [record contracts](../src/inquiry/runtime/atlas-memory-contracts.ts) and [writer](../src/scripts/atlas-memory-write.ts) define the available record kinds, anchor fields and update operations.
