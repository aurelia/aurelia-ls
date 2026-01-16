export type ScenarioId =
  | "S1"
  | "S2"
  | "S3"
  | "S4"
  | "S5"
  | "S6"
  | "S7"
  | "S8"
  | "S9";

export type FixtureId = string & { readonly __brand: "FixtureId" };

export type FixtureOrigin =
  | "semantic-workspace"
  | "resolution-app"
  | "integration-harness"
  | "playground"
  | "third-party"
  | "transform"
  | "vite-plugin"
  | "runtime";

export type FixtureSuite =
  | "workspace"
  | "lsp-adapter"
  | "integration-harness"
  | "runtime"
  | "transform"
  | "vite-plugin";

export type FixtureRootSpec =
  | { readonly kind: "local"; readonly path: string }
  | { readonly kind: "repo"; readonly path: string };

export type ArtifactKind =
  | "catalog"
  | "semantics"
  | "resource-graph"
  | "syntax"
  | "provenance"
  | "query"
  | "feature-usage"
  | "aot"
  | "ssr"
  | "diagnostics"
  | "refactor"
  | "incremental"
  | "determinism";

export type WorkspaceQueryKind =
  | "hover"
  | "definition"
  | "references"
  | "completions"
  | "diagnostics"
  | "semanticTokens";

export type WorkspaceRefactorKind = "rename" | "codeAction";

export type WorkspaceDiagnosticKind =
  | "unknown-element"
  | "unknown-attribute"
  | "type-mismatch"
  | "missing-required"
  | "duplicate-attribute"
  | "ssr-unsafe"
  | "gap-confidence"
  | "unresolved-import";

export type ResourceKind =
  | "element"
  | "attribute"
  | "value-converter"
  | "binding-behavior"
  | "template-controller";

export type DeclarationForm =
  | "decorator"
  | "decorator-config"
  | "static-au"
  | "convention"
  | "define";

export type ScopeKind = "global" | "local" | "imported";

export type TemplateFeature =
  | "interpolation"
  | "repeat"
  | "if"
  | "switch"
  | "let"
  | "template-controller"
  | "containerless"
  | "compose"
  | "import";

export interface FixtureCoverage {
  readonly artifacts: readonly ArtifactKind[];
  readonly queries?: readonly WorkspaceQueryKind[];
  readonly refactors?: readonly WorkspaceRefactorKind[];
  readonly diagnostics?: readonly WorkspaceDiagnosticKind[];
  readonly resources?: readonly ResourceKind[];
  readonly declarations?: readonly DeclarationForm[];
  readonly scopes?: readonly ScopeKind[];
  readonly templateFeatures?: readonly TemplateFeature[];
}

export interface FixtureDescriptor {
  readonly id: FixtureId;
  readonly title: string;
  readonly description: string;
  readonly origin: FixtureOrigin;
  readonly root: FixtureRootSpec;
  readonly scenarios: readonly ScenarioId[];
  readonly suites: readonly FixtureSuite[];
  readonly coverage: FixtureCoverage;
  readonly entry?: string;
  readonly templateEntry?: string;
  readonly optional?: boolean;
  readonly notes?: readonly string[];
}

export function asFixtureId(value: string): FixtureId {
  return value as FixtureId;
}
