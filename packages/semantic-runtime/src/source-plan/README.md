# Source Plan

`source-plan` owns neutral source artifact planning: source text, file edit envelopes, source-pattern metadata,
parameter schemas, and project-tooling files that a host may apply after a policy decision.

It is shared by app-builder, future diagnostic/edit planning, and fixture materialization. It must not grow
app-builder-specific domain fixtures or verification assertions; those belong in app-builder, fixture verification, or
a dedicated fixture/reference layer.

`SourcePlanOperationKind` is the typed file-operation vocabulary. Use it instead
of caller-owned string literals when a planned file was created for an entrypoint,
component view-model, component template, domain model, state model, or project
tooling operation. Finer app-builder part invocations live in app-builder and
may eventually feed AST/edit operations before becoming complete `SourcePlanFile`
artifacts.

`SourcePlanAssembly` is the stateful generated-file assembler. Use it when a
source lowerer creates multiple files under one root, policy, and text-authority
lifetime; it keeps `SourcePlanFile` / `SourcePlanText` construction out of
concrete generators without becoming a caller-specific wrapper.

`SourcePlanContribution` is the file-local ledger for generated source facts
that existed before final text assembly. It currently carries TypeScript import
requirements and source fragments, with app-builder part invocation origins
preserved when a fragment came from a reusable lowering callback, app-builder
source-lowering invocation origins preserved when one exact ontology target
emitted a generated fragment, app-builder source-lowering composition origins
preserved when a multi-fragment target such as Native Submit Form produced a
top-level wrapper, and framework configuration admission
origins preserved when an entrypoint import or registration came from
router/state/i18n/validation/virtualization admission. Preview/API rows can use
that ledger to answer "which framework/app-builder source mechanism produced
this file?" without reparsing the generated text.

`typescript-import-source.ts` owns static TypeScript import requirements and
import-statement assembly. Source lowerers should publish imports through
`SourcePlanContribution` or `TypeScriptImportRequirement` and then let this
substrate merge them, rather than hand-formatting repeated import blocks.
The import requirement model distinguishes value imports from type-only imports
so generated files can preserve runtime-safe `import type` boundaries while
still letting framework API fragments contribute their own value imports.
`typescript-source-text.ts` owns the next assembly step for complete TypeScript
files: pass body text, base import requirements, and origin-bearing source
contributions there so import rendering and the contribution ledger stay in
sync. Do not ask callers to format imports once source fragments have already
published import requirements.
`configuredAureliaEntrypointFile(...)` spends the same import lane for the
default Aurelia import, the root component import, and framework/plugin
configuration imports; entrypoint imports and registration expressions may also
carry contribution facts when they came from a lower-level source callback such
as an AppTask registration fragment or an `AureliaConfigurationAdmissionSource`.

`SourcePlanProjectTooling` is the structured package/build side of a source plan.
Use it for package dependencies, scripts, package manifests, tsconfig files, and
local declaration files instead of hiding tooling requirements in app-builder
source text. `SourcePlanPackageToolingPolicy.AppBuilderBaseline` means the
app-builder source-plan baseline owns a runnable package/tooling shape; `HostOwned`
and `NotModeled` remain available when a source plan is only a partial edit.

`AureliaConfigurationAdmissionSource` is the neutral source-plan vocabulary for
entrypoint framework/plugin admission. Router, state, i18n, validation-html, and
future package admissions should publish imports, registration expressions, and
package dependencies through this layer before an app-builder composition or
repair planner asks for an entrypoint file. This keeps app-builder from
re-stating framework configuration source forms as local recipe text. Its import
and registration contributions carry `AureliaConfigurationAdmissionKind` through
`SourcePlanContributionOriginKind.AureliaConfigurationAdmission`, so generated
entrypoint previews can explain which framework admission produced a package
import or registration without needing source-text parsing.

`SourcePatternParameter` is the source-plan vocabulary for caller-supplied
adaptation values such as route path identity. Source-applicable parameters must
be reflected by the lowered `SourcePattern`, and
`sourcePatternParameterApplications(...)` is the proof row that a caller value
was applied, rejected, or left advisory instead of being silently ignored.

`source-name.ts` owns shared generated-name word splitting and common case
rendering. App-builder may expose convenience adapters for source lowerers, but
new generators should not add local casing or word-splitting rules when this
substrate can own the policy for source plans, fixtures, and future edit
planning.
