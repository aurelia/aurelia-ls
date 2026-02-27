import type { IntegrationScenario, NormalizedScenario, CompileTargetSpec, DiscoveryHarnessOptions, CompilerHarnessOptions } from "./schema.js";

const DEFAULT_DISCOVERY: DiscoveryHarnessOptions = {
  fileSystem: "mock",
};

const DEFAULT_COMPILER: CompilerHarnessOptions = {};

export function normalizeScenario(input: IntegrationScenario): NormalizedScenario {
  const tags = input.tags ? [...input.tags] : [];
  const compile = input.compile ? [...input.compile] : [];
  const externalPackages = input.externalPackages ? [...input.externalPackages] : [];
  const externalResourcePolicy = input.externalResourcePolicy ?? (externalPackages.length ? "root-scope" : "none");
  const discovery = { ...DEFAULT_DISCOVERY, ...(input.discovery ?? {}) };
  const compiler = { ...DEFAULT_COMPILER, ...(input.compiler ?? {}) };

  return {
    ...input,
    tags,
    compile,
    externalPackages,
    externalResourcePolicy,
    discovery,
    compiler,
  };
}

export function ensureCompileTarget(target: CompileTargetSpec, index: number): CompileTargetSpec {
  if (!target.id) {
    return { ...target, id: `compile-${index + 1}` };
  }
  return target;
}
