import path from "node:path";

import {
  EvaluationModuleGraph,
  StaticModuleGraphEvaluator,
  normalizeModuleKey,
  readEvaluationModuleRecord,
  type EvaluationValue,
} from "../evaluation/index.js";
import {
  AURELIA_FRAMEWORK_PACKAGE_IDS,
  SourceProjectMemo,
  type SourceProject,
} from "../source/index.js";

const MODULE_EXTENSIONS = [
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".mjs",
  ".cjs",
] as const;

const MODULE_INDEX_FILES = [
  "index.ts",
  "index.tsx",
  "index.js",
  "index.jsx",
  "index.mjs",
  "index.cjs",
] as const;

const frameworkModuleBootMemo =
  new SourceProjectMemo<FrameworkModuleBootIndex>();

/** One module edge that could not be resolved while building a framework module graph. */
export class FrameworkModuleResolutionOpen {
  constructor(
    /** Module key that authored the unresolved edge. */
    readonly fromModuleKey: string,
    /** Module specifier text as authored. */
    readonly moduleSpecifier: string,
  ) {}
}

/** Package-level linked module graph and evaluator for framework source values. */
export class FrameworkPackageModuleBoot {
  constructor(
    /** Framework package id that owns the entry module. */
    readonly packageId: string,
    /** Source module key used as the package entry. */
    readonly entryModuleKey: string,
    /** Directed graph of source modules reachable from the entry. */
    readonly graph: EvaluationModuleGraph,
    /** Module-level evaluator over the linked graph. */
    readonly evaluator: StaticModuleGraphEvaluator,
    /** Module-resolution openings found while building the graph. */
    readonly unresolvedModules: readonly FrameworkModuleResolutionOpen[],
  ) {}

  /** Read a linked evaluator value from this package entry export. */
  readExportValue(exportName: string): EvaluationValue | null {
    return this.evaluator.readExportValue(this.entryModuleKey, exportName);
  }
}

/** Result of resolving one framework package export to an evaluator value. */
export class FrameworkExportValueRead {
  constructor(
    /** Package id used as the export root. */
    readonly packageId: string,
    /** Export name requested by the caller. */
    readonly exportName: string,
    /** Package boot context used for this read. */
    readonly packageBoot: FrameworkPackageModuleBoot | null,
    /** Evaluator-local value, or null when the export could not close. */
    readonly value: EvaluationValue | null,
  ) {}
}

/** SourceProject-scoped boot context for linked Aurelia framework module evaluation. */
export class FrameworkModuleBootIndex {
  readonly #packages = new Map<string, FrameworkPackageSourceRoot>();
  readonly #packageBoots = new Map<string, FrameworkPackageModuleBoot | null>();

  constructor(
    /** Hot source project whose framework source files are being evaluated. */
    readonly sourceProject: SourceProject,
  ) {
    const frameworkPackageIds = new Set<string>(AURELIA_FRAMEWORK_PACKAGE_IDS);
    for (const summary of sourceProject.summary().packages) {
      if (!frameworkPackageIds.has(summary.id)) {
        continue;
      }
      this.#packages.set(summary.id, {
        packageId: summary.id,
        packageName: summary.packageName,
        rootPath: normalizeModuleKey(summary.rootPath),
      });
    }
  }

  /** Read the linked boot context for one framework package entrypoint. */
  readPackage(packageId: string): FrameworkPackageModuleBoot | null {
    const cached = this.#packageBoots.get(packageId);
    if (cached !== undefined) {
      return cached;
    }
    const root = this.#packages.get(packageId);
    if (root === undefined) {
      this.#packageBoots.set(packageId, null);
      return null;
    }
    const entryModuleKey = normalizeModuleKey(
      path.posix.join(root.rootPath, "src", "index.ts"),
    );
    const built = buildFrameworkModuleGraph(
      this.sourceProject,
      this.#packages,
      entryModuleKey,
    );
    const boot = new FrameworkPackageModuleBoot(
      packageId,
      entryModuleKey,
      built.graph,
      new StaticModuleGraphEvaluator(this.sourceProject, built.graph),
      built.unresolvedModules,
    );
    this.#packageBoots.set(packageId, boot);
    return boot;
  }

  /** Read one exported framework value through linked source-module evaluation. */
  readExportValue(packageId: string, exportName: string): FrameworkExportValueRead {
    const packageBoot = this.readPackage(packageId);
    return new FrameworkExportValueRead(
      packageId,
      exportName,
      packageBoot,
      packageBoot?.readExportValue(exportName) ?? null,
    );
  }

  /** Read source roots known to this boot context. */
  readPackageRoots(): readonly FrameworkPackageSourceRoot[] {
    return [...this.#packages.values()].sort((left, right) =>
      left.packageId.localeCompare(right.packageId),
    );
  }
}

interface FrameworkPackageSourceRoot {
  readonly packageId: string;
  readonly packageName: string;
  readonly rootPath: string;
}

interface FrameworkModuleGraphBuildResult {
  readonly graph: EvaluationModuleGraph;
  readonly unresolvedModules: readonly FrameworkModuleResolutionOpen[];
}

/** Build or read the framework module boot context for one hot source project. */
export function readFrameworkModuleBootIndex(
  sourceProject: SourceProject,
): FrameworkModuleBootIndex {
  return frameworkModuleBootMemo.read(
    sourceProject,
    () => new FrameworkModuleBootIndex(sourceProject),
  );
}

function buildFrameworkModuleGraph(
  sourceProject: SourceProject,
  packages: ReadonlyMap<string, FrameworkPackageSourceRoot>,
  entryModuleKey: string,
): FrameworkModuleGraphBuildResult {
  const graph = new EvaluationModuleGraph();
  const unresolvedModules: FrameworkModuleResolutionOpen[] = [];
  const visited = new Set<string>();

  const visit = (moduleKey: string): void => {
    const normalizedModuleKey = normalizeModuleKey(moduleKey);
    if (visited.has(normalizedModuleKey)) {
      return;
    }
    visited.add(normalizedModuleKey);
    const sourceFile = sourceProject.readSourceFile(normalizedModuleKey);
    if (sourceFile === null) {
      return;
    }

    const record = readEvaluationModuleRecord(sourceFile, normalizedModuleKey);
    graph.addModule(record);
    const moduleSpecifiers = [
      ...record.imports.map((entry) => ({
        moduleSpecifier: entry.moduleSpecifier,
      })),
      ...record.exports
        .filter((entry) => entry.moduleSpecifier !== null)
        .map((entry) => ({ moduleSpecifier: entry.moduleSpecifier as string })),
    ];

    for (const edge of moduleSpecifiers) {
      const target = resolveFrameworkModuleSpecifier(
        sourceProject,
        packages,
        normalizedModuleKey,
        edge.moduleSpecifier,
      );
      graph.linkModule(normalizedModuleKey, edge.moduleSpecifier, target);
      if (target === null) {
        unresolvedModules.push(
          new FrameworkModuleResolutionOpen(
            normalizedModuleKey,
            edge.moduleSpecifier,
          ),
        );
        continue;
      }
      visit(target);
    }
  };

  visit(entryModuleKey);
  return { graph, unresolvedModules };
}

function resolveFrameworkModuleSpecifier(
  sourceProject: SourceProject,
  packages: ReadonlyMap<string, FrameworkPackageSourceRoot>,
  fromModuleKey: string,
  moduleSpecifier: string,
): string | null {
  if (
    moduleSpecifier.startsWith("./") ||
    moduleSpecifier.startsWith("../")
  ) {
    return firstExistingModuleKey(
      sourceProject,
      path.posix.normalize(
        path.posix.join(path.posix.dirname(fromModuleKey), moduleSpecifier),
      ),
    );
  }

  const packageSpecifier = frameworkPackageSpecifier(moduleSpecifier);
  if (packageSpecifier === null) {
    return null;
  }
  const root = packages.get(packageSpecifier.packageId);
  if (root === undefined) {
    return null;
  }
  const sourceBase =
    packageSpecifier.subpath.length === 0
      ? path.posix.join(root.rootPath, "src", "index")
      : path.posix.join(root.rootPath, "src", packageSpecifier.subpath);
  return firstExistingModuleKey(sourceProject, sourceBase);
}

function frameworkPackageSpecifier(
  moduleSpecifier: string,
): { readonly packageId: string; readonly subpath: string } | null {
  if (moduleSpecifier === "aurelia") {
    return { packageId: "aurelia", subpath: "" };
  }
  if (!moduleSpecifier.startsWith("@aurelia/")) {
    return null;
  }
  const parts = moduleSpecifier.slice("@aurelia/".length).split("/");
  const packageId = parts.shift();
  if (packageId === undefined || packageId.length === 0) {
    return null;
  }
  return {
    packageId,
    subpath: parts.join("/"),
  };
}

function firstExistingModuleKey(
  sourceProject: SourceProject,
  sourceBase: string,
): string | null {
  const normalizedBase = normalizeModuleKey(sourceBase);
  for (const candidate of candidateModuleKeys(normalizedBase)) {
    if (sourceProject.readSourceFile(candidate) !== null) {
      return candidate;
    }
  }
  return null;
}

function candidateModuleKeys(sourceBase: string): readonly string[] {
  const withExtensions = MODULE_EXTENSIONS.map(
    (extension) => `${sourceBase}${extension}`,
  );
  const withIndexes = MODULE_INDEX_FILES.map((file) =>
    path.posix.join(sourceBase, file),
  );
  return [...withExtensions, ...withIndexes];
}
