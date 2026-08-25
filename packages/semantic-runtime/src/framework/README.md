# Framework Products

This area owns semantic-runtime facts that are framework-shaped but not tied to one plugin domain. It is the home for
cross-domain framework capability and source-service API truth.

`framework.service-root` answers "why can this source receiver or expression be treated as an Aurelia framework service
or container root?" It carries a categorical basis, stable source identity, canonical DI-key identity, proof source,
owner handles, provenance, and post-DI-world claims such as root-to-DI-key, root-to-owning-root, and
`framework.container-root-denotes-container` edges.

`framework.capability-demand` answers "what registered framework capability does this authored use require, and is that
capability admitted in the app world?" Template syntax/resources and source service APIs should share this demand shape
when they have the same authored-use plus admission plus availability relation. Source service API demands use a
four-state admission lattice: `admitted` means a provider was proven on the consulting container chain;
`admitted-chain-unproven` means a provider exists in the world but the demand's consulting container could not be
mapped; `admission-unknown` means same-chain registration-hiding seams or an unmapped consulting container block
accusation without provider proof; and `not-admitted` is the only state that should emit
`framework-capability-not-registered`. Known sibling/off-chain providers are not admission evidence for a mapped
consulting container.

Template syntax/resource demands spend the same consulting-container admission boundary, but can also be
`configured-out`: the owning plugin/configuration is admitted while a closed option excludes the particular alias,
resource, or syntax surface. Keep the evidence planes separate. `admissionSourceAddressHandles` identify exact
registration values visible to the consulting world, `configurationSourceAddressHandles` identify exact option values
that excluded a surface, and `packageEvidence` says only whether an implementation is locally available. None is a
substitute for another. Catalog variants change effective membership while retaining canonical resource/syntax member
identity; do not republish variant-local copies and then join consumers by names. Variant local keys must encode both
configuration state and authored values through the shared local-key vocabulary so open recovery state cannot collide
with a closed value that happens to use the same spelling.
An open configuration is neither admitted membership nor exclusion. Compiler catalogs may retain conservative recovery
members so later analysis remains useful, but `FrameworkCapabilityDemand` must report `admission-unknown`, retain the
configuration contribution's materialization open seams in `blockingOpenSeamHandles`, and withhold accusatory
diagnostics. A default-looking recovery catalog is not proof that the host-dependent option kept the framework default.

Template capability demand identity includes both the resource definition and the
`TemplateResourceCompilationEmission.analysisContextProductHandle`. A component definition may be compiled under
multiple app-root compiler worlds with different admissions; queries and repairs must not collapse those cohorts.
Resource ownership comes from the actual resolver-selected visible definition and its built-in catalog header. Known
plugin names are an unresolved-resource fallback only, never authority over an app-owned resource with the same name.

Attribute-pattern selection must retain both actual and counterfactual framework truth when necessary. An admitted
generic pattern can be the compiler's actual winner while a more-specific known plugin pattern would have won if its
capability were registered or configured in. The demand lane records that missing/configured-out capability without
pretending the plugin command executed. Exact demand-to-application claims let diagnostic presentation group consequent
unresolved-resource rows while preserving every raw diagnostic fact.

Consulting-container proof spends typed producer results rather than reconstructing their generic records: spent AppTask
rows retain the receiving container, activation-backed roots map through current resource/compiler worlds, and
`container.get(...)` roots recurse through their owning container-root product. A direct source container root joins to
the exact `DI.createContainer()` product through service-root enrichment and the corresponding
`framework.container-root-denotes-container` claim; ambiguous source spans prove nothing. Provider visibility comes from
the exact `Container` frames and resolver/resource slots in the current DI/runtime world, never from world-global
presence. Registration-hiding seams retain their admission/container loci; unknown loci remain conservatively
unconstrained. A `DiRegistrationOpenSeamScope` is already typed application evidence and remains registration-hiding
regardless of whether the retained seam kind is owned by DI, registration, or evaluation. Only raw configuration seams
need kind-based filtering before they can block a capability demand.

Keep recognizers pure where possible, but do not let shared positive facts stay as projection-local state. If a fact is
consumed by more than one domain, or justifies a framework-coded positive diagnostic, promote it into a kernel product,
claim, or open seam with source/provenance in the same pass.
