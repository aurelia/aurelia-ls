# Semantic Runtime API

See [../README.md](../README.md) for the folder-wide rebuild map and Atlas and auLink rule.

This folder owns the in-process API boundary for opening an Aurelia app with the semantic runtime. It is a library
surface, not a daemon, CLI, or snapshot format.

The API should stay close to the typed substrate. It may compose boot, evaluation, configuration, DI, resource,
compiler, rendering, and TypeChecker-backed products, but it should not recreate those layers as private summary tables.
When an answer becomes awkward, prefer improving the underlying product records or adding a narrow query projection over
building compatibility glue here.

## Shape

Use `createSemanticRuntime(...)` to boot a workspace, then `runtime.openApp(...)` to materialize the current app-world
view for one project. `SemanticApp.ask(...)` accepts a small query envelope for generic callers, while named methods such
as `summary()`, `resourceVisibility(...)`, and `templateCompilations(...)` are available for TypeScript callers.

Rows default to compact source labels and counts. Opaque kernel handles are intentionally opt-in through
`SemanticRuntimeDetail.Handles`; they are useful for exact in-process follow-up navigation but too noisy for initial
answers.

```ts
import {
  createSemanticRuntime,
  SemanticAppQueryKind,
  SemanticRuntimeDetail,
} from '@aurelia-ls/semantic-runtime';

const runtime = await createSemanticRuntime({ workspaceRoot: 'path/to/app' });
const app = await runtime.openApp();

const overview = app.ask({ kind: SemanticAppQueryKind.Summary });
const templates = app.ask({
  kind: SemanticAppQueryKind.TemplateCompilations,
  page: { size: 20 },
});
const exactTemplateRows = app.ask({
  kind: SemanticAppQueryKind.TemplateCompilations,
  page: { size: 5 },
  detail: SemanticRuntimeDetail.Handles,
});
```

## Fixture Pressure

Authoring fixtures live under `../../fixtures/authoring`. They should look like code we would be comfortable
recommending to Aurelia users, even when that makes the semantic runtime work harder. See
[../authoring/README.md](../authoring/README.md) and [../application/README.md](../application/README.md) for the
authoring/topology boundaries behind those fixtures.

Analyzer stress fixtures should be separate from authoring fixtures. Avoid adding brittle golden snapshots around either
kind of fixture; the valuable signal is whether the API can expose precise, navigable open seams and compact high-level
answers after the app is reopened.
