# Aurelia framework analysis

Atlas reads Aurelia framework implementations independently of semantic-runtime. The [module loader](module-boot.ts) resolves framework package imports to source in the Aurelia checkout and links them into the [static evaluator](../evaluation/README.md). For an author-facing rule, compare what a modeled configuration admits with framework documentation, tests and an execution through the relevant owner.

## Configurations, keys and providers

`answerFrameworkDi` and `answerFrameworkEvaluator` are available from `@aurelia-ls/atlas/analysis`. A DI world starts at a configuration export. A missing export leaves that world open. An admitted empty configuration is a different result. The world tests exercise both cases as well as guarded registrations, aliased keys, distinct same-named declarations and ambiguous re-exports. [Runnable fixtures](../../test/world.test.mjs) · [Configuration admission](admission-world.ts) · [Modeled DI world](di-world.ts)

Use registration declaration identity, requestor and resolution phase when comparing lookup results. A source-backed provider dependency identifies a candidate read in that provider's body. A live container run establishes which read actually occurred. Resource catalog lookup via `find` and instance construction via `get`, `getAll` or `invoke` have separate owners. [DI index](di-index.ts) · [Materialization](materialization.ts) · [Resource lifetime](resources.ts)

## Compare the product and framework

The full `bridge.aulink` inquiry joins a product placement to framework declarations. Use `targets` to inspect ambiguous matches, `role-evidence` to inspect relationships at their endpoints, and `usage-sites` to inspect which member is read on each side. A declaration or link alone establishes neither an executed lifecycle nor an obligation for an installed product. [auLink source index](../source/aulink.ts) · [Bridge usage](../inquiry/runtime/bridge-aulink-usage.ts)

For a Markdown report of framework composition and observation, run the command from the repository root. The default output is stdout. With `--out`, the command writes the report at the requested path.

```powershell
pnpm --filter @aurelia-ls/atlas report:framework-emulation
pnpm --filter @aurelia-ls/atlas report:framework-emulation --out ../../.temp/framework-emulation.md
```
