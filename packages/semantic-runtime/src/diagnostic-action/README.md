# Diagnostic Action

This folder owns the typed handoff from diagnostic facts to possible repairs. It does not own source edits, and open
semantic seams remain in their owning substrate until an executable consumer needs a separate action projection.

The repair path has three distinct stages:

1. A diagnostic carries an optional `DiagnosticSuggestion`: author-facing intent, a closed action kind, and a semantic
   target when one is known.
2. `diagnosticRepairAffordanceForSuggestion(...)` classifies that suggestion into an action kind, plan family, change
   domain, readiness, target-source coverage, and `guided | manual` actionability.
3. A source planner may produce exact, old-text-validated edits. `SemanticTemplateCodeActionRow` proves this stage with
   a non-empty `edits` tuple and retains every source diagnostic addressed by the equivalent plan.

Do not put edit-plan availability or application cardinality on `DiagnosticRepairAffordance`. A suggestion can remain
`source-edit-policy-open` even when one current source context admits a concrete plan, and one plan may contain several
edits such as an import plus an Aurelia registration-chain insertion. The plan itself is the evidence that edits exist.

Suggestion contracts live here so diagnostic producers and API projections share one closed vocabulary. Repair
classification dispatches on `DiagnosticSuggestion.actionKind`; `suggestionKind` refines presentation and special cases
such as router expression rewrites, but must not silently become a second action dispatcher. Resource registration,
service registration, observer configuration, and true runtime-boundary declaration have distinct action kinds and
change domains.

`fix-router-instruction` suggestions classify as `rewrite-router-instruction` / `router-instruction-rewrite`. An exact
template instruction source makes that app-source repair guided and ready to plan, but no code action exists until a
router source-operation planner can prove an edit without guessing a route, fallback, parameter value, or viewport.

`register-framework-capability` suggestions come from template-authored `framework.capability-demand` products when a
known syntax or resource is used before its framework registration is admitted. The diagnostic affordance remains
`source-edit-policy-open`: the demand site and candidate package do not prove bootstrap placement or import policy.
`TemplateCodeActions` crosses that boundary only when `source-plan` proves an app-root `.app(...)` chain and local
package/import evidence. State-store and AppTask admissions remain guidance until their source intent is modeled.
