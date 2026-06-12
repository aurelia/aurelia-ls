# Framework Products

This area owns semantic-runtime facts that are framework-shaped but not tied to one plugin domain. It is the home for
cross-domain framework capability and source-service API truth.

`framework.service-root` answers "why can this source receiver or expression be treated as an Aurelia framework service
or container root?" It carries a categorical basis, stable source identity, proof source, owner handles, provenance, and
post-DI-world claims such as root-to-DI-key and service-root-to-container-root edges.

`framework.capability-demand` answers "what registered framework capability does this authored use require, and is that
capability admitted in the app world?" Template syntax/resources and source service APIs should share this demand shape
when they have the same authored-use plus admission plus availability relation. Source service API demands use a
four-state admission lattice: `admitted` means a provider was proven on the consulting container chain;
`admitted-chain-unproven` means a provider exists in the world but the demand's consulting container could not be
mapped; `admission-unknown` means same-chain registration-hiding seams or an unmapped consulting container block
accusation without provider proof; and `not-admitted` is the only state that should emit
`framework-capability-not-registered`. Known sibling/off-chain providers are not admission evidence for a mapped
consulting container.

Consulting-container proof is intentionally derived from existing substrate facts: AppTask roots map through
configuration sequence membership to the app-root container, activation-backed roots map through resource/class or
app-root ownership, and `container.get(...)` roots recurse through their owning container-root product. DI slot
membership should be read through `DiProductIdentity.containerHandle` plus `di.provides-key`, not through a parallel
membership predicate.

Keep recognizers pure where possible, but do not let shared positive facts stay as projection-local state. If a fact is
consumed by more than one domain, or justifies a framework-coded positive diagnostic, promote it into a kernel product,
claim, or open seam with source/provenance in the same pass.
