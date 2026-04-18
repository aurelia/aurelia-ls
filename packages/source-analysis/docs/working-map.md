# Working Map

Use this note when resuming work or choosing the next slice.

## Start Here

1. Read [README.md](C:/projects/aurelia-ls2/packages/source-analysis/README.md).
2. Read this file.
3. If resuming long-running work, read [resume-protocol.md](C:/projects/aurelia-ls2/packages/source-analysis/docs/resume-protocol.md).
4. Read [authority-first-campaign.md](C:/projects/aurelia-ls2/packages/source-analysis/docs/authority-first-campaign.md).
5. Read [current-handoff.md](C:/projects/aurelia-ls2/packages/source-analysis/docs/current-handoff.md) and [current-state.json](C:/projects/aurelia-ls2/packages/source-analysis/docs/current-state.json).
6. Run `pnpm preflight`.
7. Read [roadmap.md](C:/projects/aurelia-ls2/packages/source-analysis/docs/roadmap.md).

## When Working On X, Read Y

| Work you are doing | Read first | Then read |
| --- | --- | --- |
| Choosing or reshaping a capability | [governing-axes.md](C:/projects/aurelia-ls2/packages/source-analysis/docs/governing-axes.md) | [architecture-layers.md](C:/projects/aurelia-ls2/packages/source-analysis/docs/architecture-layers.md), [roadmap.md](C:/projects/aurelia-ls2/packages/source-analysis/docs/roadmap.md) |
| Changing what counts as truth, claim, no-claim, withdrawal, or consumer-safe action | [shared-semantic-authority.md](C:/projects/aurelia-ls2/packages/source-analysis/docs/shared-semantic-authority.md) | [provenance-and-steering.md](C:/projects/aurelia-ls2/packages/source-analysis/docs/provenance-and-steering.md), [analyzability.md](C:/projects/aurelia-ls2/packages/source-analysis/docs/analyzability.md) |
| Moving logic between core layers, projections, or adapters | [architecture-layers.md](C:/projects/aurelia-ls2/packages/source-analysis/docs/architecture-layers.md) | [governing-axes.md](C:/projects/aurelia-ls2/packages/source-analysis/docs/governing-axes.md), [shared-semantic-authority.md](C:/projects/aurelia-ls2/packages/source-analysis/docs/shared-semantic-authority.md), [roadmap.md](C:/projects/aurelia-ls2/packages/source-analysis/docs/roadmap.md) |
| Extending the semantic kernel or evaluator ceiling | [semantic-analysis.md](C:/projects/aurelia-ls2/packages/source-analysis/docs/semantic-analysis.md) | [analyzability.md](C:/projects/aurelia-ls2/packages/source-analysis/docs/analyzability.md), [shared-semantic-authority.md](C:/projects/aurelia-ls2/packages/source-analysis/docs/shared-semantic-authority.md), [roadmap.md](C:/projects/aurelia-ls2/packages/source-analysis/docs/roadmap.md) |
| Improving the AI-facing read surface, guidance, continuations, or self-usefulness | [self-pressure-test.md](C:/projects/aurelia-ls2/packages/source-analysis/docs/self-pressure-test.md) | [governing-axes.md](C:/projects/aurelia-ls2/packages/source-analysis/docs/governing-axes.md), [shared-semantic-authority.md](C:/projects/aurelia-ls2/packages/source-analysis/docs/shared-semantic-authority.md), [strategy.md](C:/projects/aurelia-ls2/packages/source-analysis/docs/strategy.md) |
| Working on provenance, operator steering, or explicit taste surfaces | [provenance-and-steering.md](C:/projects/aurelia-ls2/packages/source-analysis/docs/provenance-and-steering.md) | [shared-semantic-authority.md](C:/projects/aurelia-ls2/packages/source-analysis/docs/shared-semantic-authority.md), [roadmap.md](C:/projects/aurelia-ls2/packages/source-analysis/docs/roadmap.md) |
| Checking unresolved design pressure before a large move | [open-tensions.md](C:/projects/aurelia-ls2/packages/source-analysis/docs/open-tensions.md) | [roadmap.md](C:/projects/aurelia-ls2/packages/source-analysis/docs/roadmap.md) |
| Resuming after compaction or context loss | [resume-protocol.md](C:/projects/aurelia-ls2/packages/source-analysis/docs/resume-protocol.md) | [authority-first-campaign.md](C:/projects/aurelia-ls2/packages/source-analysis/docs/authority-first-campaign.md), [current-handoff.md](C:/projects/aurelia-ls2/packages/source-analysis/docs/current-handoff.md), [current-state.json](C:/projects/aurelia-ls2/packages/source-analysis/docs/current-state.json) |

## Two Questions Before You Commit To A Direction

- Is this work primarily about capability shape, or about truth and claim thresholds?
- Is the pressure really in a shared authority layer, or only in an adapter, projection, or ingress surface?

Those two questions usually tell you which governing note matters first.
