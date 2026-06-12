# Framework Products

This area owns semantic-runtime facts that are framework-shaped but not tied to one plugin domain. It is the home for
cross-domain framework capability and source-service API truth.

`framework.service-root` answers "why can this source receiver or expression be treated as an Aurelia framework service
or container root?" It carries a categorical basis, stable source identity, proof source, owner handles, provenance, and
post-DI-world claims such as root-to-DI-key and service-root-to-container-root edges.

`framework.capability-demand` answers "what registered framework capability does this authored use require, and is that
capability admitted in the app world?" Template syntax/resources and source service APIs should share this demand shape
when they have the same authored-use plus admission plus availability relation.

Keep recognizers pure where possible, but do not let shared positive facts stay as projection-local state. If a fact is
consumed by more than one domain, or justifies a framework-coded positive diagnostic, promote it into a kernel product,
claim, or open seam with source/provenance in the same pass.
