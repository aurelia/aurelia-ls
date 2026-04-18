# Local Atlas Ports

This directory contains compact local ports of the Atlas source material that
the Aurelia docs in this repo currently depend on.

These files are not intended to replace the Atlas corpus.
They exist so this repo can:

- stay self-contained
- avoid hard-coded non-local references
- preserve the exact source slices that current local derivations spend

Each file is a compact excerpt or machine-legible reduction of a larger Atlas
artifact, focused on the sections this repo currently uses.

## Current Use

Right now this bundle primarily supports:

- [../export-semantic-surface-ledger.yaml](../export-semantic-surface-ledger.yaml)
- protocol and fixture derivation work around export-addressable Aurelia
  semantics

This is still in-progress spec derivation work.
Do not read these ports as a claim that the local export ontology is already
closed or ready to harden into a public framework contract.

## Included Ports

- [module-export-analysis-ledger.md](./module-export-analysis-ledger.md)
- [resource-system-common-denominators-ledger.md](./resource-system-common-denominators-ledger.md)
- [entity-ontology-and-carrier-contract.md](./entity-ontology-and-carrier-contract.md)
- [kernel-di-and-resource-admission-ledger.md](./kernel-di-and-resource-admission-ledger.md)
- [registration-world-constructors-ledger.md](./registration-world-constructors-ledger.md)
- [compile-time-vocabulary.md](./compile-time-vocabulary.md)
- [declaration-world-searched-target-and-space-surfaces.yaml](./declaration-world-searched-target-and-space-surfaces.yaml)
- [declaration-world-consultation-bases.yaml](./declaration-world-consultation-bases.yaml)
- [declaration-world-registration-pattern-families.yaml](./declaration-world-registration-pattern-families.yaml)
- [compile-time-di-container-state-algebra.yaml](./compile-time-di-container-state-algebra.yaml)
- [resource-kind-carrier-index.yaml](./resource-kind-carrier-index.yaml)
