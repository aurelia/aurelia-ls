# Declaration World And Resource Families

Use this note when modeling the Aurelia resource world, deciding what counts
as a resource family, or building compiler-facing framework scans that need a
world richer than a flat export inventory.

## Core Claim

The Aurelia resource world is a constructed declaration world, not a bag of
discovered symbols and not a runtime object graph.

The package should preserve at least these distinctions:

- recognized surface
- admissible member
- current-world active member

and also:

- registration path
- consulted visibility topology
- carrier species
- naming convergence

If those collapse, later compiler work becomes either too generic or too
runtime-shaped.

## Recognition, Admission, And Current-World Activity

These are different states:

- `recognized`: the authority can identify the surface or carrier family
- `admissible`: a consulted regime has a real mechanism that can activate it
- `current-world active`: the surface has actually entered the consulted
  semantic world

This matters because:

- preprocess-owned or policy-derived forms may be recognized without being
  framework-native admitted
- module-intake carriers may be analyzable and potentially admissible without
  being active yet
- lifecycle-gated or branch-sensitive registrations may be admissible before
  the consulted site materializes them

## Resource World Versus Generic DI World

The resource world is not the same thing as the generic DI world.

Generic DI answers:

- how do keys resolve through containers?

Resource-world answers:

- how do framework resources get keyed, registered, admitted, and found?

They overlap, but they do not collapse.

## Declaration-World Regimes

The minimum declaration-world regimes to preserve are:

- `definition-merge`
- `registry-carrier`
- `owner-bounded-local`
- `module-intake`
- `constructor-emission`
- `convention-mediated`

These are not just implementation details. They express different admission
paths, lookup regimes, naming surfaces, and witness burdens.

## Consultation Roles

The minimum consultation roles to preserve are:

- `candidate-intake-world`
- `admitted-registration-world`
- `current-world-active-local-world`

Compiler work should not jump straight from "known to exist" to "active in the
current resource world" without preserving which of these roles is actually
closed.

## Resource Families And Ontology Roles

The current resource-family floor should distinguish:

- `custom-element`
- `custom-attribute`
- `template-controller`
- `value-converter`
- `binding-behavior`
- `binding-command`
- `attribute-pattern`
- `local-custom-element`

They are not all the same kind of thing.

Ontology roles:

- `entity`: first-class framework or declaration entity
- `mode`: higher-order mode over an entity
- `nested-member`: adjunct or member family owned by a larger entity

Important consequences:

- `template-controller` is a mode over `custom-attribute`, not a peer carrier
  family
- `bindable` and `watch-adjunct` are nested members, not peer resource kinds
- `local-custom-element` is a first-class owner-bounded local entity, not
  merely a weak alias of `custom-element`

## Carrier Families And Domain Policies

Minimum carrier families:

- `resource-definition`
- `registrable-metadata-registry`

Minimum domain policies:

- `runtime-visible`
- `compiler-root-only`
- `owner-bounded-local`

That means, for example:

- `binding-command` is compiler-root-only, not a runtime-visible peer of
  custom elements
- `attribute-pattern` lives in a registrable metadata registry rather than the
  ordinary resource-definition carrier family
- `local-custom-element` lives in an owner-bounded local world

## Identity Constructors

The package should preserve at least these identity constructors:

- `kind-keyed-canonical-identity`
- `owner-bounded-local-identity`
- `parser-structural-identity`

That prevents false flattening such as:

- treating `attribute-pattern` identity as if it were a resource-definition
  row
- treating local custom elements as if package-wide canonical identity were
  sufficient

## Registration Paths

The minimum declaration-world registration paths are:

- `resource-definition-register`
- `registry-carrier-insertion`
- `owner-local-template-admission`
- `analyzed-module-selection-and-registration`
- `configuration-register-emission`
- `convention-policy-derived-admission`

These are how a surface becomes part of a consulted world. They are not the
same thing as later visibility or runtime activity.

## Local Implications For `source-analysis`

- The first Aurelia resource-world model should be a declaration-world model,
  not a runtime-world model.
- Compiler work should preserve resource families, carrier families, ontology
  roles, registration paths, and consultation roles explicitly.
- A framework API registry should know which family a surface belongs to and
  what identity constructor applies.
- Future query or proof surfaces should be able to say whether something is
  only recognized, already admissible, or truly current-world active.
