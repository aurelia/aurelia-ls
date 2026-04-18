# Entity Ontology And Carrier Contract

Local port of the Atlas contract with the same name.
Only the derived resource archetypes currently spent by the export semantic
surface ledger are included here.

## Derived Resource Archetypes

### Structural host entity

Example:

- custom element

Typical shape:

- `resource-definition` carrier
- runtime-visible domain
- richest support bundle
- may host nested declaration and adjunct families

### Attribute entity with mode split

Examples:

- custom attribute
- template controller as a mode over custom attribute

Typical shape:

- shared `resource-definition` carrier
- runtime-visible domain
- policy-bearing definition fields
- adjunct families such as bindables and watches
- optional attachment to controller-semantics when controllerhood holds

### Thin protocol entity

Examples:

- value converter
- binding behavior

Typical shape:

- `resource-definition` carrier
- runtime-visible domain
- thin definition inventory
- richer behavior lives in instance or runtime protocol semantics, not in the
  base carrier inventory

### Compiler command entity

Example:

- binding command

Typical shape:

- `resource-definition` carrier
- compiler-root-only domain
- thin definition inventory
- attached binding-command semantic family provides the higher-order lowering
  contract

### Parser pattern registry entity

Example:

- attribute pattern

Typical shape:

- `registrable-metadata-registry` carrier
- compiler-root-only domain
- structural parser identity
- attached attribute-pattern semantic family provides interpretation behavior

### Owner-bounded local entity

Example:

- local custom element

Typical shape:

- owner-bounded identity
- local declaration surface rather than ordinary package-level registration
- adjacency to CE semantics without collapsing into the owning CE
