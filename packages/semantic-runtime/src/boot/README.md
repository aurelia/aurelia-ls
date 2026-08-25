# Boot Substrate

See [../README.md](../README.md) for the folder-wide rebuild map and Atlas and auLink rule.

Boot is the clean-room admission layer above the kernel. It creates workspace and project frames, admits source
files, and records why those inputs are present in the hot kernel store.

Boot does not materialize app-world Aurelia semantics. It owns the native semantic project/source-world configuration
that decides admission, and may expose cheap admission-level project shape for scope selection, but it must not
recognize resources, app registrations/configuration objects, templates, routes, or DI products. Those belong to later
materializers that consume admitted sources and emit their own evidence, claims, products, and seams.

## Responsibilities

- Create a `KernelStore` or populate a supplied one.
- Admit workspace/project/source frames in deterministic order.
- Discover project frames from the union of exact-root `package.json`, `tsconfig.json`, `jsconfig.json`, and
  `aurelia.project.json` markers when the host does not supply explicit projects, while preserving a `single-root`
  mode for callers that need one project frame. The default `project-markers` mode names that union directly.
- Merge `projectRootHints` supplied by a host into that automatic topology. Hints identify existing project boundaries;
  they do not choose project keys, imply Aurelia shape, or override configuration semantics.
- Parse exact-root `aurelia.project.json` through the captured project-input generation before source admission. The
  clean-slate version `1` contract owns both the strict `authoredSources.excludedRoots` boundary and projection-only
  `findings` policy with stable semantic rule IDs and `off` / `information` / `warning` / `error` presentation.
  Accepted version, application state, effective defaults, syntax/schema diagnostics, applied normalized roots, and
  policy provenance remain first-class project-frame facts even when no app world can open. Finding policy never
  deletes the underlying seam or changes source admission. See
  [Project Configuration](../../../../docs/project-configuration.md) for the public contract.
- Discover source files only as input admission, with conservative source roles such as `app-source`, `test-source`,
  `tooling-config`, `declaration`, `template`, `style`, and `package-manifest`.
- Read project compiler options as host footing for later evaluation and TypeChecker epochs. This is still boot-level
  because it describes how source modules are wired, not what Aurelia semantics they contain.
- Preserve authored TypeScript/JavaScript compiler configuration and ordinary package-manager resolution as the module
  authority. Boot does not synthesize aliases from ambient ancestor workspaces, a nearby Aurelia checkout, or process
  environment variables: those shortcuts can expose undeclared packages, bypass package exports, and give IDE, MCP,
  and future AOT consumers different semantic worlds.
- Expose conservative project-shape triage before app-world construction. The current policy counts local manifest
  dependencies on `aurelia` / `@aurelia/*`, inherits Aurelia dependency context from ancestor workspace manifests that
  explicitly include the project frame, and parses app-source imports for Aurelia facade/default/namespace imports,
  constructor use, `.app(...)`, `.enhance(...)`, and `.register(...)`. This classifies project frames as
  `aurelia-app`, `aurelia-resource-library`, `aurelia-package`, or `non-aurelia` so callers can choose app-like,
  resource-library, or all-package scope before paying TypeChecker/evaluator/materializer cost.
- Share package-manifest, directory, and path-normalization host helpers through `host-files.ts` so project discovery,
  compiler-option construction, evaluation module resolution, and future boot inputs do not grow parallel filesystem
  micro-policies. Package-manifest and directory reads flow through the captured project-input host, so their
  memoization is bounded by that immutable generation rather than a process-global path cache.
- Capture one immutable project-input host generation before an app open and build one compiler-options result on its
  `ProjectBootFrame`. Static evaluation and TypeSystem construction spend that same result, so tsconfig/jsconfig
  path-mapping shape cannot split within a candidate generation and no process-global project-root cache can outlive
  changed input. An exact-root `tsconfig.json` takes precedence over `jsconfig.json`, matching TypeScript project
  selection.
- Preserve any host-supplied discovery limit through `SourceDiscoveryResult`.
- Emit source-file addresses, admission evidence, and direct provenance. Project frames likewise retain the complete,
  deterministic cause set for their admission and one kernel provenance record joining those witnesses.

## Non-Responsibilities

- TypeScript module evaluation.
- Aurelia resource recognition.
- App-world registration/configuration or DI world formation.
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

Project discovery is also admission policy. A mixed monorepo should boot every exact package, TypeScript/JavaScript
configuration, or native Aurelia configuration marker root as a separate project frame so no nested project is either
absorbed into a parent app world or excluded without receiving its own frame. Marker contents do not decide topology:
invalid configuration still owns a frame and its diagnostics. Nested project roots are excluded from their parent
frame's filesystem source discovery. Child workspace packages may inherit Aurelia dependency context from an
ancestor `workspaces` manifest, but that only affects shape triage: a child package with HTML/CSS resource-surface
source files becomes a resource-library authoring candidate, while activation calls are still required before the
package is treated as an app-world. Ordinary IDE/MCP consumers that know the intended app package should select its
discovered `projectKey`; that does not change the shared source world. Explicit `projects` are reserved for hosts such
as snapshot/AOT adapters that own the complete project and source topology, because supplying them replaces automatic
discovery rather than merely selecting an app.

Every admitted project frame carries typed `admissionOrigins`. Marker origins retain the exact marker source path;
markers recovered by a restarted hinted traversal also retain the hint directory that made them observable. Explicit
projects, `single-root`, the markerless workspace fallback, and direct host hints remain distinct policy origins. These
origins explain why the frame exists; they do not assert Aurelia shape or configuration validity. Boot publishes a
small evidence/provenance envelope for the same cause set, and the frame revision includes both the origins and that
provenance handle so a shared project-input authority cannot make differently admitted frames look current-equivalent.

`projectRootHints` are additive host topology facts for automatic marker-union discovery. Relative hints resolve from
the workspace root, the workspace root itself is valid, and active hints must identify existing directories at or below
that root. Hard workspace exclusions win before hint existence is checked. Canonical duplicates collapse
deterministically. Each accepted hint receives its own frame and restarts marker traversal at depth zero, so a known
root below an incidental prune or workspace-relative depth limit still discovers nested marker roots. The ordinary
workspace scan retains its existing root fallback when it finds no markers; adding a hint cannot withdraw that fallback.
Explicit `projects` (including an empty list) and `single-root` remain authoritative and ignore hints. Changing the
active normalized hint set or the hinted directory topology requires a fresh workspace boot.

`excludedWorkspaceRoots` is an authored-source boundary, not a filesystem read embargo. Excluded roots cannot become
project frames, source admissions, TypeScript root files, or diagnostic owners, and an excluded parent dominates every
nested root. Admitted source may still import an excluded file as a dependency; module resolution and outward source
locations must retain that fact without promoting the dependency into authored project membership. Workspace topology
and source discovery both read through the supplied `SemanticRuntimeProjectInputAuthority`, including for non-filesystem
hosts, so the boundary and the observed source world cannot diverge.

Pressure fixtures and clean-room probes must expose their declared dependencies through ordinary package topology or an
explicit authored `tsconfig`/`jsconfig`. If unbuilt or source-linked packages eventually require a separate resolution
plan, that plan must be a typed shared semantic-runtime input with provenance and currentness; it must not be recovered
from an adapter-specific environment variable or folded into authored-source ownership.

Project-qualified source admissions define stable physical source identities for the runtime session. Boot creates the
initial admissions; project evaluation may intern additional imported locations through the same authority without
making their address lifetime depend on one evaluator generation. File contents, existence, import reachability,
tsconfig/jsconfig, and package wiring are read through `SemanticRuntimeProjectInputAuthority`; advancing that authority revokes
captured hosts and lets the next app request rebuild compiler options and semantic products coherently. Project
discovery and removed project frames are topology changes and still require a fresh booted runtime.
