# Atlas

Atlas is the in-repo maintainer library for finding earlier Aurelia design decisions, tracing TypeScript symbols through a particular source project, and comparing the product model with independently interpreted framework source.

## In-process analysis

Build the library from the repository root. This example asks which decisions record the inputs a warm diagnostic pull depends on.

```powershell
pnpm --filter @aurelia-ls/atlas build:analysis
pnpm --filter @aurelia-ls/atlas exec node --input-type=module -e "
  import { analysisLenses, answerAtlasMemory, createSourceProject, findRepoRoot, RepoRootLocus } from '@aurelia-ls/atlas/analysis';
  const project = createSourceProject({ repoRoot: findRepoRoot() });
  try {
    const answer = answerAtlasMemory({
      lens: analysisLenses.memory, locus: RepoRootLocus, projection: 'records',
      filters: { query: 'diagnostic pull' }, budget: { rows: 10 }
    }, project);
    console.log(answer.value.records.map(row => row.id));
  } finally { project.dispose(); }"
```

Both the focused and full builds expose `@aurelia-ls/atlas/analysis`. They use the same module identities, output paths and TypeScript build-info file. Switching builds can recompile shared sources. Previously emitted full-build files stay on disk.

| Question | Where to look |
| --- | --- |
| Which decision already covers this case, and what checks still support it? | [Memory lookup, scope and edits](memory/README.md) |
| Who uses a symbol exported through another package? | [TypeScript source admission and reference queries](src/source/README.md) |
| Which provider does a framework configuration register under this key? | [Framework analysis](src/framework/README.md) and [static evaluation](src/evaluation/README.md) |
| Which other queries does the full package expose, and how do I interpret the results? | [Inquiry contracts](src/inquiry/README.md) and [session lifetime](src/session/README.md) |

Run `pnpm --filter @aurelia-ls/atlas smoke` to exercise the full session self-check and Atlas package tests. The complete list of package commands lives in [package.json](package.json).
