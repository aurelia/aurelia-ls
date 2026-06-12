/** Stable id for a repository terrain area known to Atlas. */
export const enum RepoAreaId {
  /** The Atlas package itself. */
  Atlas = "atlas",
  /** The product-semantic center of gravity for Aurelia semantics. */
  SemanticRuntime = "semantic-runtime",
  /** The Aurelia framework submodule. */
  AureliaFramework = "aurelia-framework",
  /** Older packages that should stay out of the active semantic surface for now. */
  LegacyLsPackages = "legacy-ls-packages",
  /** Example applications and app fixtures. */
  Examples = "examples",
  /** External Aurelia plugins checkout. */
  AureliaPlugins = "aurelia-plugins",
}

/** Semantic role of one repository terrain area. */
export const enum RepoAreaKind {
  /** Product semantics and product-owned substrate live here. */
  Product = "product",
  /** Framework source used as semantic reference. */
  Framework = "framework",
  /** Atlas code and contracts live here. */
  Atlas = "atlas",
  /** Older repo package whose semantics are deliberately deferred. */
  LegacyPackage = "legacy-package",
  /** Example app or fixture area. */
  Example = "example",
  /** Build, script, or repository tooling area. */
  Tooling = "tooling",
  /** Documentation area. */
  Docs = "docs",
}

/** Whether an area participates in current semantic analysis. */
export const enum RepoAreaStatus {
  /** Area is part of the current semantic terrain. */
  Active = "active",
  /** Area exists but should not shape current product/Atlas semantics. */
  Deferred = "deferred",
  /** Area is external and should not be edited by Atlas work. */
  External = "external",
}

/** Ownership model that affects edit policy and trust. */
export const enum RepoAreaOwnership {
  /** Area is owned by this repository. */
  InRepo = "in-repo",
  /** Area is a submodule or external checkout. */
  Submodule = "submodule",
  /** Area is generated and should be regenerated rather than hand-edited. */
  Generated = "generated",
}

/** Static terrain declaration for repository-aware inquiry routing. */
export interface RepoArea {
  /** Stable terrain id used by loci and handles. */
  readonly id: RepoAreaId;
  /** Semantic role this area plays for Atlas. */
  readonly kind: RepoAreaKind;
  /** Whether this area is active, deferred, or external. */
  readonly status: RepoAreaStatus;
  /** Ownership/editing model for this area. */
  readonly ownership: RepoAreaOwnership;
  /** Workspace-relative root path for the area. */
  readonly root: string;
  /** Grounded explanation of why the area exists in the terrain map. */
  readonly summary: string;
  /** Optional package ids that belong to this terrain area. */
  readonly packageIds?: readonly string[];
}

/** Repository terrain known to the current Atlas contract layer. */
export const RepoTerrain: readonly RepoArea[] = [
  {
    id: RepoAreaId.Atlas,
    kind: RepoAreaKind.Atlas,
    status: RepoAreaStatus.Active,
    ownership: RepoAreaOwnership.InRepo,
    root: "packages/atlas",
    summary: "Atlas package and substrate for repository-aware Codex collaboration.",
  },
  {
    id: RepoAreaId.SemanticRuntime,
    kind: RepoAreaKind.Product,
    status: RepoAreaStatus.Active,
    ownership: RepoAreaOwnership.InRepo,
    root: "packages/semantic-runtime/src",
    summary: "Current product-semantic center of gravity: kernel records, vocabulary, auLink, inquiry, DI, evaluation, template, resource, and registration work.",
    packageIds: ["semantic-runtime"],
  },
  {
    id: RepoAreaId.AureliaFramework,
    kind: RepoAreaKind.Framework,
    status: RepoAreaStatus.Active,
    ownership: RepoAreaOwnership.Submodule,
    root: "aurelia",
    summary: "Aurelia framework source used as the semantic reference for DI, resources, rendering, compilation, and runtime contracts.",
  },
  {
    id: RepoAreaId.LegacyLsPackages,
    kind: RepoAreaKind.LegacyPackage,
    status: RepoAreaStatus.Deferred,
    ownership: RepoAreaOwnership.InRepo,
    root: "packages",
    summary: "Older compiler, language-server, transform, vscode, semantic-workspace, and integration packages. Keep out of product-semantic reads until intentionally revived.",
    packageIds: [
      "compiler",
      "language-server",
      "transform",
      "vite-plugin",
      "vscode",
      "semantic-workspace",
      "integration-harness",
    ],
  },
  {
    id: RepoAreaId.Examples,
    kind: RepoAreaKind.Example,
    status: RepoAreaStatus.Deferred,
    ownership: RepoAreaOwnership.InRepo,
    root: "examples",
    summary: "Example applications. Useful later as behavioral fixtures, but not part of the current semantic substrate.",
  },
  {
    id: RepoAreaId.AureliaPlugins,
    kind: RepoAreaKind.Framework,
    status: RepoAreaStatus.External,
    ownership: RepoAreaOwnership.Submodule,
    root: "aurelia2-plugins",
    summary: "External plugin checkout. Do not mutate from Atlas work.",
  },
];

/** Return terrain areas that should participate in current semantic inquiry. */
export function activeTerrain(): readonly RepoArea[] {
  return RepoTerrain.filter((area) => area.status === RepoAreaStatus.Active);
}

/** Look up one terrain area by stable id. */
export function findTerrainById(id: RepoAreaId): RepoArea | undefined {
  return RepoTerrain.find((area) => area.id === id);
}
