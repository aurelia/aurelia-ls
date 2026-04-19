# Working Map

Use this note when resuming work or choosing the next slice.

## Start Here

1. Read [README.md](../README.md).
2. Read this file.
3. If resuming long-running work, read [resume-protocol.md](./resume-protocol.md).
4. Read [authority-first-campaign.md](./authority-first-campaign.md).
5. Read [current-handoff.md](./current-handoff.md) and [current-state.json](./current-state.json).
6. Run `pnpm preflight`.
7. Read [roadmap.md](./roadmap.md).
8. If the work touches the machine-facing API, read [machine-legible-api-reset.md](./machine-legible-api-reset.md).
9. If the work touches canonical record shape, evaluators, or projections, read [modeling-laws.md](./modeling-laws.md).
10. If the work is framework-aware, read [aurelia/README.md](./aurelia/README.md).
11. If the work is framework-aware and currently in spec or fixture derivation mode, also read [aurelia/export-semantic-surface-ledger.yaml](./aurelia/export-semantic-surface-ledger.yaml) and [aurelia/atlas/README.md](./aurelia/atlas/README.md).
12. If the work is framework-aware and operationally aimed at the Aurelia framework repo itself, also read [aurelia/framework-export-integration-plan.md](./aurelia/framework-export-integration-plan.md).
13. If the work is in protocol or fixture derivation mode, also read
    [protocol-derivation-workbook.md](./protocol-derivation-workbook.md),
    [../fixtures/protocol-derivation/README.md](../fixtures/protocol-derivation/README.md),
    and [../fixtures/protocol-derivation/manifest.yaml](../fixtures/protocol-derivation/manifest.yaml).

## When Working On X, Read Y

| Work you are doing | Read first | Then read |
| --- | --- | --- |
| Changing canonical records, projection rows, or evaluator-owned computed fields | [modeling-laws.md](./modeling-laws.md) | [architecture-layers.md](./architecture-layers.md), [shared-semantic-authority.md](./shared-semantic-authority.md) |
| Choosing or reshaping a capability | [governing-axes.md](./governing-axes.md) | [architecture-layers.md](./architecture-layers.md), [roadmap.md](./roadmap.md) |
| Changing what counts as truth, claim, no-claim, withdrawal, or consumer-safe action | [shared-semantic-authority.md](./shared-semantic-authority.md) | [provenance-and-steering.md](./provenance-and-steering.md), [analyzability.md](./analyzability.md) |
| Moving logic between core layers, projections, or adapters | [architecture-layers.md](./architecture-layers.md) | [governing-axes.md](./governing-axes.md), [shared-semantic-authority.md](./shared-semantic-authority.md), [roadmap.md](./roadmap.md) |
| Resetting the machine-facing API away from natural-language routing and toward typed primitives | [machine-legible-api-reset.md](./machine-legible-api-reset.md) | [authority-first-campaign.md](./authority-first-campaign.md), [shared-semantic-authority.md](./shared-semantic-authority.md), [roadmap.md](./roadmap.md) |
| Doing protocol derivation or fixture pressure tests | [protocol-derivation-workbook.md](./protocol-derivation-workbook.md) | [protocol-read-algebra.md](./protocol-read-algebra.md), [../fixtures/protocol-derivation/README.md](../fixtures/protocol-derivation/README.md), [../fixtures/protocol-derivation/manifest.yaml](../fixtures/protocol-derivation/manifest.yaml), [aurelia/export-semantic-surface-ledger.yaml](./aurelia/export-semantic-surface-ledger.yaml) |
| Extending the semantic kernel or evaluator ceiling | [semantic-analysis.md](./semantic-analysis.md) | [analyzability.md](./analyzability.md), [shared-semantic-authority.md](./shared-semantic-authority.md), [roadmap.md](./roadmap.md) |
| Starting framework-aware Aurelia work, framework API registry work, or build-time DI modeling | [aurelia/README.md](./aurelia/README.md) | [modeling-laws.md](./modeling-laws.md), [aurelia/di-and-registration-lens-charter.md](./aurelia/di-and-registration-lens-charter.md), [aurelia/framework-owner-ingress.md](./aurelia/framework-owner-ingress.md), [aurelia/compile-time-di-container-state.md](./aurelia/compile-time-di-container-state.md), [aurelia/export-semantic-surface-ledger.yaml](./aurelia/export-semantic-surface-ledger.yaml), [aurelia/atlas/README.md](./aurelia/atlas/README.md), [shared-semantic-authority.md](./shared-semantic-authority.md) |
| Building the Aurelia framework export integration slice or classifying the full Aurelia framework surface | [aurelia/framework-export-integration-plan.md](./aurelia/framework-export-integration-plan.md) | [aurelia/README.md](./aurelia/README.md), [aurelia/export-semantic-surface-ledger.yaml](./aurelia/export-semantic-surface-ledger.yaml), [semantic-analysis.md](./semantic-analysis.md), [roadmap.md](./roadmap.md) |
| Improving the AI-facing read surface, guidance, continuations, or self-usefulness | [self-pressure-test.md](./self-pressure-test.md) | [governing-axes.md](./governing-axes.md), [shared-semantic-authority.md](./shared-semantic-authority.md), [strategy.md](./strategy.md) |
| Working on provenance, operator steering, or explicit taste surfaces | [provenance-and-steering.md](./provenance-and-steering.md) | [shared-semantic-authority.md](./shared-semantic-authority.md), [roadmap.md](./roadmap.md) |
| Checking unresolved design pressure before a large move | [open-tensions.md](./open-tensions.md) | [roadmap.md](./roadmap.md) |
| Resuming after compaction or context loss | [resume-protocol.md](./resume-protocol.md) | [authority-first-campaign.md](./authority-first-campaign.md), [current-handoff.md](./current-handoff.md), [current-state.json](./current-state.json) |

## Two Questions Before You Commit To A Direction

- Is this work primarily about capability shape, or about truth and claim thresholds?
- Is the pressure really in a shared authority layer, or only in an adapter, projection, or ingress surface?

Those two questions usually tell you which governing note matters first.
