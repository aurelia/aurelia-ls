# Boot Substrate

See [../README.md](../README.md) for the folder-wide rebuild map and Atlas and auLink rule.

Boot is the clean-room admission layer above the kernel. It creates workspace and project frames, admits source
files, and records why those inputs are present in the hot kernel store.

Boot does not materialize Aurelia semantics. It may expose cheap admission-level project shape for scope selection, but
it must not recognize resources, configurations, registrations, templates, routes, or DI products. Those belong to
later materializers that consume admitted sources and emit their own evidence, claims, products, and seams.

## Responsibilities

- Create a `KernelStore` or populate a supplied one.
- Admit workspace/project/source frames in deterministic order.
- Discover package/tsconfig project frames for monorepo workspaces when the host does not supply explicit projects,
  while preserving a `single-root` mode for callers that need one project frame.
- Discover source files only as input admission, with conservative source roles such as `app-source`, `test-source`,
  `tooling-config`, `declaration`, `template`, `style`, and `package-manifest`.
- Read project compiler options as host footing for later evaluation and TypeChecker epochs. This is still boot-level
  because it describes how source modules are wired, not what Aurelia semantics they contain.
- Synthesize TypeScript path mappings for the checked-out Aurelia framework packages by reading package manifests under
  `aurelia/packages/*` and pointing each package name at `dist/types/index.d.ts` when present. Keep this dynamic rather
  than a hand-maintained package list: validation, i18n, state, dialog, and future framework packages all need the same
  checker footing when generated fixtures import their public APIs.
- Expose conservative project-shape triage before app-world construction. The current policy counts local manifest
  dependencies on `aurelia` / `@aurelia/*`, inherits Aurelia dependency context from ancestor workspace manifests that
  explicitly include the project frame, and parses app-source imports for Aurelia facade/default/namespace imports,
  constructor use, `.app(...)`, `.enhance(...)`, and `.register(...)`. This classifies project frames as
  `aurelia-app`, `aurelia-resource-library`, `aurelia-package`, or `non-aurelia` so callers can choose app-like,
  resource-library, or all-package scope before paying TypeChecker/evaluator/materializer cost.
- Share package-manifest, directory, and path-normalization host helpers through `host-files.ts` so project discovery,
  compiler-option construction, evaluation module resolution, and future boot inputs do not grow parallel filesystem
  micro-policies. Package manifests are cached at this host boundary for the current process.
- Cache project compiler-option shapes by project root for the current process and clone them on read. Static
  evaluation and TypeSystem construction both need the same filesystem-derived tsconfig/path-mapping shape during one
  app open; caching this at boot avoids repeating package/source-root discovery without sharing a mutable
  `ts.CompilerOptions` object between TypeScript consumers.
- Admit package-source roots from local workspace manifests and, during clean-room pressure runs, from
  `SEMANTIC_RUNTIME_EXTERNAL_SOURCE_ROOTS` / `ATLAS_EXTERNAL_SOURCE_ROOTS`. These roots supply TypeScript path
  mappings for sibling/plugin package source; they are input wiring, not checked-in app facts.
- Preserve any host-supplied discovery limit through `SourceDiscoveryResult`.
- Emit source-file addresses, admission evidence, and direct provenance.

## Non-Responsibilities

- TypeScript module evaluation.
- Aurelia resource recognition.
- Configuration or DI world formation.
- Query answer ranking or consumer policy.
- Reconnecting to the older eager `Workspace` / `Project` constructors.

## Design Pressure

Boot is allowed to know host and filesystem facts plus minimal Aurelia bootstrap evidence needed for scope selection.
It is not allowed to turn those facts into app-world products. A missing root, scan limit, host-supplied file list,
excluded directory, package dependency, or Aurelia facade entrypoint signal is boot/admission pressure. Whether a file
declares a custom element, exports configuration, registers a DI key, or contributes a route tree is materializer
pressure layered later.

Source roles are admission policy, not Aurelia meaning. They keep app-world passes from treating tests, declaration
files, or known tooling configs as application modules while preserving those files for source inventory and later
navigation. Boot discovery admits standard TypeScript/JavaScript module extensions (`.ts`, `.tsx`, `.mts`, `.cts`,
`.js`, `.jsx`, `.mjs`, `.cjs`) plus framework assets. TypeSystem can still root local declaration admissions in
no-tsconfig fallback mode so ambient modules and local type support participate in the checker without becoming
static-evaluation entrypoints. The classifier should stay conservative: a user-authored `config.ts` or generated-looking
app module is still app source unless it matches a known tool/artifact lane.

Project discovery is also admission policy. A mixed monorepo should boot package/tsconfig roots as separate project
frames so non-Aurelia packages do not enter one giant app-world pass. Nested project roots are excluded from their
parent frame's filesystem source discovery. Child workspace packages may inherit Aurelia dependency context from an
ancestor `workspaces` manifest, but that only affects shape triage: a child package with HTML/CSS resource-surface
source files becomes a resource-library authoring candidate, while activation calls are still required before the
package is treated as an app-world. If a host already knows the intended app package, it should still pass an explicit
`projects` entry or `projectKey`.

External source roots are deliberately ephemeral. They let pressure runs resolve public or private sibling package
source without copying those paths into fixtures or durable docs. Materializers may then recognize resources,
configuration, and registration bodies in the linked package source if project evaluation reaches those modules through
ordinary import edges.

Project compiler-option caching is a CPU/read-amplification trade-off, not a semantic claim about the app. It caches
small configuration objects and path-mapping strings, while app-world products, TypeScript dependency SourceFiles, and
query outcomes retain their own lifetimes. If a long-lived host changes tsconfig or workspace/package wiring, it should
restart the semantic-runtime session or clear that boot cache through the owning control path once a config-epoch
invalidation policy exists.
