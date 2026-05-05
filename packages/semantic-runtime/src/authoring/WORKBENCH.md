# Authoring Workbench

This workbench keeps live authoring context close to the code while the authoring spine is young. Promote durable rules
to [README.md](./README.md), [ONTOLOGY.md](./ONTOLOGY.md), [CAPABILITY_CHECKLIST.md](./CAPABILITY_CHECKLIST.md), or
source contracts once they prove stable.

## Current Shape

The authoring layer is intentionally only a spine:

- `application` names framework-normal app topology.
- `authoring/ontology.ts` names operation families, actions, targets, capabilities, profiles, and common ambiguity points.
- `authoring` operation/plan classes point into that ontology instead of owning parallel categories.
- `api` can reopen apps after edits, but it does not yet expose authoring queries or edit application.

Do not add an app generator here until the semantic edit loop is real enough to verify what it writes.

## Active Pressure

- Teach recognition/evaluation about external `.html` templates and their source-address/provenance model.
- Add an idiomatic authoring fixture under `fixtures/authoring` only after external templates can be analyzed without
  falling back to inline `$au` analyzer conveniences.
- Add an API capability query that can say which authoring operations are supported, partial, or open.
- Add a recipe layer that composes ontology operations for flows such as minimal app, routed app, auth setup, and service-backed forms.
- Add a plan builder for a minimal app topology, then verify it by reopening the app through the existing API.
- Keep analyzer stress fixtures separate from authoring fixtures. Stress fixtures may be dense; authoring fixtures should
  look like code we would be comfortable recommending.

## Watchpoints

- If an operation requires taste, keep the taste outside semantic truth and make the choice visible to the caller.
- If authoring needs a shortcut because analysis cannot verify an idiomatic shape yet, improve analysis first or mark the
  capability open.
- If a plan cannot name expected semantic effects, the operation is probably still too textual and needs a better product
  primitive.
