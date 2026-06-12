# Diagnostic Action

This folder owns the typed handoff from diagnostics and open seams to possible next actions.

Diagnostic actions are not source edits and not app-generation recipes. They classify pressure into action kinds, likely
change domains, runtime boundary kinds, runtime intent kinds, and readiness states so MCP/IDE layers can explain what
must be inspected or changed without pretending a code action is already safe.

`register-framework-capability` suggestions are first-class action pressure. They come from template-authored
`framework.capability-demand` products when a known syntax/resource/value-converter/binding-behavior is used before the
matching framework registration is admitted. The action domain is app source, but readiness remains
`source-edit-policy-open`: the diagnostic source proves the demand site and candidate package, not the exact bootstrap
edit location or import formatting policy.

If repair rows become a neutral IDE/edit surface, extend this package or a dedicated edit-planning package rather than
reintroducing recipe-shaped authoring as the host for diagnostics-to-action policy.
