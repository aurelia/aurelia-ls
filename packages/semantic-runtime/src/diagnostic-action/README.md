# Diagnostic Action

This folder owns the typed handoff from diagnostics and open seams to possible next actions.

Diagnostic actions are not source edits and not app-generation recipes. They classify pressure into action kinds, likely
change domains, runtime boundary kinds, runtime intent kinds, and readiness states so MCP/IDE layers can explain what
must be inspected or changed without pretending a code action is already safe.

`diagnosticRepairAffordanceForSuggestion(...)` is the shared single-row projection for IDE/custom/MCP adapters that need
the compact repair shape: action kind, plan kind, change domain, readiness, target-source coverage, and
`guided | manual | none` actionability. A diagnostic suggestion without an edit plan remains guidance; an edit-backed
caller must explicitly pass `editPlanState: "available"` after a planner has produced validated source edits, which
sets `applicationKind: "single-edit"`. This keeps diagnostic rows, repair intent, and mutating code actions as three
separate stages. Do not use actionability to mean "an edit exists"; that belongs to edit-plan state and application kind.

`fix-router-instruction` suggestions classify as `rewrite-router-instruction` /
`router-instruction-rewrite`. An exact template instruction source makes that app-source repair `guided` and
`ready-to-plan`, while `editPlanState: "not-available"` and `applicationKind: "none"` remain explicit until a router
source-operation planner can prove validated edits. Do not collapse this state into manual inspection, and do not turn
the suggestion into a code action by guessing a route, fallback, parameter value, or viewport declaration.

`register-framework-capability` suggestions are first-class action pressure. They come from template-authored
`framework.capability-demand` products when a known syntax/resource/value-converter/binding-behavior is used before the
matching framework registration is admitted. The action domain is app source, but readiness remains
`source-edit-policy-open`: the diagnostic source proves the demand site and candidate package, not the exact bootstrap
edit location or import formatting policy.
`TemplateCodeActions` may now promote that same repair shape to an edit-backed row when source-plan can prove an
app-root `.app(...)` chain and local package/import evidence. In that case the returned action keeps the diagnostic
guidance but passes `editPlanState: "available"`, which turns the row into a single-edit application with
`readiness: "ready-to-plan"`. State-store and AppTask admissions remain guidance until their project-specific source
intent is modeled.

If repair rows become a neutral IDE/edit surface, extend this package or a dedicated edit-planning package rather than
reintroducing recipe-shaped authoring as the host for diagnostics-to-action policy.
