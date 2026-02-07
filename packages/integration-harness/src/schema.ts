import type ts from "typescript";
import type { LocalImportDef, ResourceCollections, ResourceScopeId } from "@aurelia-ls/compiler";
import type { ConventionConfig, DefineMap } from "@aurelia-ls/compiler";

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

export interface DiscoveryHarnessOptions {
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
  // Preferred package identifier (use the actual package name).
  id?: string;
  // When omitted, the harness will resolve this from `id` using fixture rules.
  path?: string;
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

export type RuntimePatch = "bridge-bind-to-bound";

export interface SsrRuntimeExpectation {
  kind: "ssr-module";
  modulePath: string;
  entry?: string;
  configExport: string;
  componentName: string;
  template: string;
  rootVm?: Record<string, unknown>;
  elementName: string;
  scopeId?: ResourceScopeId;
  scopeFromCompile?: string;
  patchElementExport?: string;
  patches?: readonly RuntimePatch[];
  vm?: Record<string, unknown>;
  htmlLinks?: readonly string[];
}

export interface BrowserProbe {
  name: string;
  expr: string;
  expect?: unknown;
}

export interface BrowserRuntimeExpectation {
  kind: "browser";
  url: string;
  start?: string;
  cwd?: string;
  root?: string;
  waitFor?: string;
  timeoutMs?: number;
  headful?: boolean;
  delayMs?: number;
  attrs?: readonly string[];
  dom?: readonly DomExpectation[];
  attributes?: Readonly<Record<string, number>>;
  probes?: readonly BrowserProbe[];
}

export type RuntimeExpectation =
  | SsrRuntimeExpectation
  | BrowserRuntimeExpectation;

export type DomScope = "host" | "document";

export interface DomExpectation {
  selector: string;
  scope?: DomScope;
  count?: number;
  texts?: readonly string[];
  contains?: readonly string[];
}

export interface ParityExpectation {
  selector: string;
  scope?: DomScope;
}

export interface DoubleRenderExpectation {
  selector: string;
  scope?: DomScope;
  expectedTexts?: readonly string[];
  expectDuplicates?: boolean;
  minDuplicates?: number;
}

export interface ManifestExpectation {
  root?: string;
  controllers?: Readonly<Record<string, number>>;
}

export interface HydrationMutation {
  description?: string;
  mutate: (vm: Record<string, unknown>) => void | Promise<void>;
  expect: readonly DomExpectation[];
}

export interface SsrHydrationExpectation {
  id: string;
  target: string;
  componentName: string;
  host?: string;
  ssrState: Record<string, unknown>;
  clientState?: Record<string, unknown>;
  componentClass?: new () => Record<string, unknown>;
  ssrOptions?: {
    stripMarkers?: boolean;
  };
  expectMarkers?: "present" | "absent";
  expectHydrationError?: boolean;
  hydrationErrorContains?: string;
  manifest?: ManifestExpectation;
  ssrDom?: readonly DomExpectation[];
  hydrateDom?: readonly DomExpectation[];
  parity?: readonly ParityExpectation[];
  doubleRender?: readonly DoubleRenderExpectation[];
  mutations?: readonly HydrationMutation[];
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
  runtime?: RuntimeExpectation;
  ssr?: readonly SsrHydrationExpectation[];
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
  discovery?: DiscoveryHarnessOptions;
  compiler?: CompilerHarnessOptions;
  expect?: ScenarioExpectations;
}

export interface NormalizedScenario extends IntegrationScenario {
  tags: readonly ScenarioTag[];
  compile: readonly CompileTargetSpec[];
  externalPackages: readonly ExternalPackageSpec[];
  externalResourcePolicy: ExternalResourcePolicy;
  discovery: DiscoveryHarnessOptions;
  compiler: CompilerHarnessOptions;
}

export interface AssertionFailure {
  kind: string;
  message: string;
  details?: Record<string, unknown>;
}
