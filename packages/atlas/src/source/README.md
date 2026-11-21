# TypeScript source analysis

A `SourceProject` owns one immutable TypeScript Program, checker, LanguageService and declaration index. Its package definitions supply roots and tsconfig paths. Inspect `project.summary().packages` to see what was admitted. A Program file can belong to no admitted package and carry `packageId: null`. Filesystem text reads can also cover current Markdown, JSON or a template outside the Program. [Project](project.ts) · [Host file cache](project-file-cache.ts)

## Find cross-package readers

Admit the caller and provider packages explicitly. For example, to find AOT readers of `@aurelia-ls/semantic-runtime/browser-template`:

1. Build the provider's declaration outputs, then call `createSourceProject` with the AOT and semantic-runtime tsconfigs.
2. Use `readModuleGraph` on the caller's import site. Inspect the resolved file. A package export can resolve to an emitted declaration barrel.
3. Pass the resolved file and export name to `readReferences`. Use its total and page bounds to determine whether all references in this project were returned.

The [analysis entry point](../analysis.ts) exports these functions and `sourceSelectorFromSubject`. The [source regression](../../test/source.test.mjs) checks module resolution and package identities. For build diagnostics use the package's actual tsconfig. The combined analysis Program has its own compiler options.

The [semantic surface](semantic-surface/index.ts) supplies checker-resolved symbols, declaration ranges, member slots, import/type/value usages and call-site arguments. Framework and product queries interpret those facts in their own domains. Import counts for one source directory exclude consumers found through a public export in another package.

## External source roots

`ATLAS_EXTERNAL_SOURCE_ROOTS` optionally admits external checkouts for local inspection. Keep external source text, paths, package and component names, identifying application structure, and derived copies of private fixtures out of tracked evidence. Preserve the general framework mechanism and reproduce it using an independently authored fixture.
