import { createHash } from "node:crypto";
import type { CompilerCase, CompilerSetupFactory } from "./compiler-case.js";
import { canonicalCompilerJson } from "./compiler-canonical-data.js";
import type { CompilerObligationCatalogEntry } from "./compiler-obligation-audit.js";

/** Stable descriptor fingerprint; executable adapter code is identified by the repository revision. */
export function compilerCaseRegistryFingerprint(
  cases: readonly CompilerCase[],
  setupFactories: readonly CompilerSetupFactory[],
): string {
  const factoryById = new Map(setupFactories.map((factory) => [factory.factoryId, factory]));
  const sortedCases = [...cases].sort((left, right) => left.id.localeCompare(right.id));
  const setupManifest = setupFactories
    .map((factory) => ({
      id: factory.factoryId,
      version: factory.version,
      exports: [...factory.exports].sort(),
    }))
    .sort((left, right) => left.id.localeCompare(right.id));
  const setupDescriptions = sortedCases.flatMap((candidate) => candidate.world.setups.map((setup) => {
    const factory = factoryById.get(setup.factory);
    if (factory == null) {
      throw new Error(`Cannot fingerprint unknown compiler setup factory ${setup.factory}.`);
    }
    return {
      caseId: candidate.id,
      symbol: setup.symbol,
      factory: setup.factory,
      description: factory.describe(setup.args),
    };
  }));
  const descriptor = {
    cases: sortedCases,
    setupManifest,
    setupDescriptions,
  };
  const hash = createHash("sha256");
  hash.update(canonicalCompilerJson(descriptor));
  return `sha256:${hash.digest("hex")}`;
}

/** Stable fingerprint for the source-reviewed obligation ledger itself. */
export function compilerObligationCatalogFingerprint(
  obligations: readonly CompilerObligationCatalogEntry[],
): string {
  const hash = createHash("sha256");
  hash.update(canonicalCompilerJson([...obligations].sort((left, right) => left.id.localeCompare(right.id))));
  return `sha256:${hash.digest("hex")}`;
}
