# Authoring

See [../README.md](../README.md) for the folder-wide rebuild map and Atlas and auLink rule.

This folder owns semantic authoring: turning an AI/user intent into a typed plan, applying source edits elsewhere, then
reopening the app and verifying that the intended Aurelia facts materialized.

Authoring is not a one-shot scaffold generator. It should be a closed loop:

```text
intent -> capability negotiation -> authoring plan -> code edits -> app analysis -> verification or repair
```

The AI may decide product taste and prose, but this package should supply Aurelia-correct structure, known capabilities,
semantic preconditions, expected effects, and verification pressure.

The operation ontology is modeled in `ontology.ts` and explained in [ONTOLOGY.md](./ONTOLOGY.md). The flexible scope map
lives in [CAPABILITY_CHECKLIST.md](./CAPABILITY_CHECKLIST.md). Concrete operation classes should point into the ontology
instead of creating parallel names or generator-local categories.

## Boundary

- `application` models the framework-normal app topology that authoring wants to create or modify; see
  [../application/README.md](../application/README.md).
- `authoring` models capability negotiation, semantic operations, plan steps, and verification expectations.
- `api` opens apps and returns compact semantic answers after edits have been applied; see
  [../api/README.md](../api/README.md).
- Source edit application, formatting, package-manager execution, and user-facing taste negotiation sit outside this
  folder until their durable semantic contracts are clear.

## Principles

- Prefer idiomatic Aurelia source shapes over analyzer-friendly shortcuts.
- Treat taste as policy, not semantic substrate.
- Treat unsupported app shapes as explicit capabilities with open summaries, not as silent fallback generators.
- Verify effects through semantic facts and open seams, not brittle file snapshots.
- Add authoring operations only when the analysis side has, or is about to get, the substrate needed to prove them.
- Treat large requests such as auth setup as recipes composed from smaller semantic operations.
- Keep open scope in [CAPABILITY_CHECKLIST.md](./CAPABILITY_CHECKLIST.md), not in incidental prose scattered across
  folder READMEs.

## Success Shape

The success signal is not that files are generated. The success signal is that an authored app reopens through the API
and produces closed-enough configuration, DI, resource, compiler-world, template, and TypeChecker-backed facts with any
remaining gaps named as actionable open seams.
