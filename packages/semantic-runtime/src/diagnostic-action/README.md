# Diagnostic Action

This folder owns the typed handoff from diagnostics and open seams to possible next actions.

Diagnostic actions are not source edits and not app-generation recipes. They classify pressure into action kinds, likely
change domains, runtime boundary kinds, runtime intent kinds, and readiness states so MCP/IDE layers can explain what
must be inspected or changed without pretending a code action is already safe.

If repair rows become a neutral IDE/edit surface, extend this package or a dedicated edit-planning package rather than
reintroducing recipe-shaped authoring as the host for diagnostics-to-action policy.
