import type ts from "typescript";
import type { LocalImportDef, ResourceCollections, ResourceScopeId } from "@aurelia-ls/compiler";
import type { ConventionConfig, DefineMap } from "@aurelia-ls/resolution";

export type ScenarioTag = string;

export type ScenarioSource =
  | {
      kind: "memory";
      files: Record<string, string>;
      rootNames?: readonly string[];
      compilerOptions?: ts.CompilerOptions;
    }
  | {
      kind: "tsconfig";
      tsconfigPath: string;
    };

export type FileSystemMode = "mock" | "node" | "none";

export interface ResolutionHarnessOptions {
  conventions?: ConventionConfig;
  defines?: DefineMap;
  fileSystem?: FileSystemMode;
  templateExtensions?: readonly string[];
  styleExtensions?: readonly string[];
  packageRoots?: Readonly<Record<string, string>>;
  explicitResources?: Partial<ResourceCollections>;
}

export interface CompilerHarnessOptions {
  strict?: boolean;
  deprecations?: boolean;
}

export type ExternalResourcePolicy =
  | "none"
  | "semantics"
  | "root-scope"
  | "rebuild-graph";

export interface ExternalPackageSpec {
  id?: string;
  path: string;
  preferSource?: boolean;
}

export type CompileScope =
  | "root"
  | { localOf: string }
  | ResourceScopeId;

export interface CompileTargetSpec {
  id: string;
  templatePath?: string;
  markup?: string;
  scope?: CompileScope;
  aot?: boolean;
  overlay?: boolean;
  localImports?: readonly LocalImportDef[];
}

export interface ResourceExpectation {
  global?: readonly string[];
  local?: Readonly<Record<string, readonly string[]>>;
}

export interface BindableExpectation {
  resource: string;
  name: string;
  attribute?: string;
  mode?: string;
  primary?: boolean;
}

export interface DiagnosticExpectation {
  code: string;
  severity?: "error" | "warning" | "info";
  contains?: string;
}

export interface GapExpectation {
  kind: string;
  contains?: string;
  file?: string;
}

export interface AotExpectation {
  instructions?: Array<{
    type: string;
    res?: string;
    target?: number;
  }>;
  snapshots?: {
    semantic?: boolean;
    apiSurface?: boolean;
    aot?: boolean;
  };
}

export interface RegistrationPlanResourceSet {
  elements?: readonly string[];
  attributes?: readonly string[];
  controllers?: readonly string[];
  valueConverters?: readonly string[];
  bindingBehaviors?: readonly string[];
}

export interface RegistrationPlanScopeExpectation extends RegistrationPlanResourceSet {
  exclude?: RegistrationPlanResourceSet;
}

export interface RegistrationPlanExpectation {
  scopes: Readonly<Record<string, RegistrationPlanScopeExpectation>>;
}

export interface ScenarioExpectations {
  resources?: ResourceExpectation;
  bindables?: readonly BindableExpectation[];
  diagnostics?: readonly DiagnosticExpectation[];
  gaps?: readonly GapExpectation[];
  aot?: AotExpectation;
  registrationPlan?: RegistrationPlanExpectation;
}

export interface IntegrationScenario {
  id: string;
  title?: string;
  tags?: readonly ScenarioTag[];
  source: ScenarioSource;
  entry?: string;
  compile?: readonly CompileTargetSpec[];
  externalPackages?: readonly ExternalPackageSpec[];
  externalResourcePolicy?: ExternalResourcePolicy;
  resolution?: ResolutionHarnessOptions;
  compiler?: CompilerHarnessOptions;
  expect?: ScenarioExpectations;
}

export interface NormalizedScenario extends IntegrationScenario {
  tags: readonly ScenarioTag[];
  compile: readonly CompileTargetSpec[];
  externalPackages: readonly ExternalPackageSpec[];
  externalResourcePolicy: ExternalResourcePolicy;
  resolution: ResolutionHarnessOptions;
  compiler: CompilerHarnessOptions;
}

export interface AssertionFailure {
  kind: string;
  message: string;
  details?: Record<string, unknown>;
}
