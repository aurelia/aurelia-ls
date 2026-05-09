import path from "node:path";
import { performance } from "node:perf_hooks";

import ts from "typescript";

import {
  groupBy,
  uniqueSortedStrings,
} from "../../collections.js";
import {
  calleeNameForExpression,
  canonicalSourceSymbolKey,
  classDeclarationSurface,
  hasModifier,
  propertyNameText,
  readAuLinkModel,
  requiredSourceFileIdentity,
  resolveAlias,
  sourceReferenceForNode,
  SourcePackageId,
  SourceProjectKeyedMemo,
  TypeScriptCallSiteKind,
  type SourceDeclarationRow,
  type SourceProject,
  type SourceSpan,
  type TypeScriptUsageRoleId,
  symbolForNode,
  usageRoleForIdentifier,
  usageText,
} from "../../source/index.js";

/** Schema marker for the semantic-runtime architecture source model. */
export const PRODUCT_ARCHITECTURE_ANALYSIS_VERSION =
  "product-architecture-analysis@1";

/** Semantic-runtime source reference with editor-friendly one-based coordinates. */
export interface ProductArchitectureSourceReference {
  /** Repository-relative source file path when Atlas can identify it. */
  readonly filePath: string;
  /** One-based line at the start of the source span. */
  readonly startLine: number;
  /** One-based character at the start of the source span. */
  readonly startCharacter: number;
  /** One-based line at the end of the source span. */
  readonly endLine: number;
  /** One-based character at the end of the source span. */
  readonly endCharacter: number;
}

/** Rollup for the semantic-runtime architecture analysis. */
export interface ProductArchitectureRollup {
  /** Number of semantic-runtime source files under packages/semantic-runtime/src. */
  readonly sourceFileCount: number;
  /** Number of discovered top-level source areas. */
  readonly areaCount: number;
  /** Number of source module rows. */
  readonly moduleCount: number;
  /** Number of source declaration rows in semantic-runtime src. */
  readonly declarationCount: number;
  /** Number of exported source declaration rows in semantic-runtime src. */
  readonly exportedDeclarationCount: number;
  /** Number of class declaration rows in semantic-runtime src. */
  readonly classCount: number;
  /** Number of class surface rows discovered directly from semantic-runtime source. */
  readonly classSurfaceCount: number;
  /** Number of function/method body surface rows discovered directly from semantic-runtime source. */
  readonly functionSurfaceCount: number;
  /** Number of checker-backed call-site rows inside semantic-runtime source. */
  readonly callSiteCount: number;
  /** Number of call-site rows whose resolved target is another semantic-runtime source declaration. */
  readonly localCallSiteCount: number;
  /** Number of local call-site rows that cross semantic-runtime source areas. */
  readonly crossAreaCallSiteCount: number;
  /** Number of grouped call dependencies between semantic-runtime files and admitted package targets. */
  readonly callDependencyCount: number;
  /** Number of checker-backed identifier references inside semantic-runtime source. */
  readonly symbolReferenceCount: number;
  /** Number of symbol references whose target is another semantic-runtime source declaration. */
  readonly localSymbolReferenceCount: number;
  /** Number of local symbol references that cross semantic-runtime source areas. */
  readonly crossAreaSymbolReferenceCount: number;
  /** Number of grouped semantic symbol dependency rows. */
  readonly symbolDependencyCount: number;
  /** Number of import-dependency rows read from semantic-runtime src. */
  readonly dependencyCount: number;
  /** Number of local dependencies that cross semantic-runtime source areas. */
  readonly crossAreaDependencyCount: number;
  /** Number of grouped area-to-area dependency rows. */
  readonly areaDependencyCount: number;
  /** Number of local semantic-runtime import cycle groups. */
  readonly cycleCount: number;
  /** Number of local import cycle groups that cross source areas. */
  readonly crossAreaCycleCount: number;
  /** Number of unresolved relative import rows. */
  readonly unresolvedRelativeDependencyCount: number;
  /** Stable counts by top-level semantic-runtime source area. */
  readonly byArea: Readonly<Record<string, ProductArchitectureAreaCounts>>;
}

/** Compact area counts embedded in the architecture rollup. */
export interface ProductArchitectureAreaCounts {
  /** Source file count in the area. */
  readonly files: number;
  /** Declaration count in the area. */
  readonly declarations: number;
  /** Exported declaration count in the area. */
  readonly exportedDeclarations: number;
  /** Local import count from this area to other semantic-runtime areas. */
  readonly crossAreaDependenciesOut: number;
  /** Local import count from other semantic-runtime areas into this area. */
  readonly crossAreaDependenciesIn: number;
}

/** Top-level semantic-runtime source area row. */
export interface ProductArchitectureAreaRow {
  /** Stable row id. */
  readonly id: string;
  /** Top-level source area name, or root for files directly under src. */
  readonly area: string;
  /** Repository-relative area root. */
  readonly sourceRoot: string;
  /** Source file count in this area. */
  readonly fileCount: number;
  /** Module row count in this area. */
  readonly moduleCount: number;
  /** Declaration row count in this area. */
  readonly declarationCount: number;
  /** Exported declaration row count in this area. */
  readonly exportedDeclarationCount: number;
  /** Class declaration row count in this area. */
  readonly classCount: number;
  /** Local dependency count leaving this area. */
  readonly dependencyOutCount: number;
  /** Local dependency count entering this area. */
  readonly dependencyInCount: number;
  /** Cross-area dependency count leaving this area. */
  readonly crossAreaDependencyOutCount: number;
  /** Cross-area dependency count entering this area. */
  readonly crossAreaDependencyInCount: number;
  /** Compact row summary. */
  readonly summary: string;
}

/** One semantic-runtime source file as an architecture module. */
export interface ProductArchitectureModuleRow {
  /** Stable row id. */
  readonly id: string;
  /** Repository-relative source file path. */
  readonly filePath: string;
  /** Top-level source area. */
  readonly area: string;
  /** Source line count. */
  readonly lineCount: number;
  /** Source declaration row count in this file. */
  readonly declarationCount: number;
  /** Exported source declaration row count in this file. */
  readonly exportedDeclarationCount: number;
  /** Top-level declaration row count in this file. */
  readonly topLevelDeclarationCount: number;
  /** Import declaration count in this file. */
  readonly importCount: number;
  /** Local semantic-runtime import count in this file. */
  readonly localImportCount: number;
  /** External package import count in this file. */
  readonly externalImportCount: number;
  /** Local imports that cross top-level semantic-runtime areas. */
  readonly crossAreaImportCount: number;
  /** Local semantic-runtime import count entering this file. */
  readonly localImportInCount: number;
  /** Function-like implementation bodies found in this file. */
  readonly functionSurfaceCount: number;
  /** Function-like bodies in this file above the Atlas large-body pressure threshold. */
  readonly largeFunctionCount: number;
  /** Largest function-like body span in this file. */
  readonly maxFunctionLineCount: number;
  /** Largest function-like body name in this file. */
  readonly maxFunctionName: string | null;
  /** Exported top-level declaration names, budgeted to keep rows compact. */
  readonly exportedNames: readonly string[];
  /** Exact source range for the whole module. */
  readonly source: ProductArchitectureSourceReference;
  /** Compact row summary. */
  readonly summary: string;
}

/** Source import edge from one semantic-runtime module to another module or package. */
export interface ProductArchitectureDependencyRow {
  /** Stable row id. */
  readonly id: string;
  /** Repository-relative source file containing the import. */
  readonly fromFilePath: string;
  /** Top-level source area containing the import. */
  readonly fromArea: string;
  /** Raw module specifier text. */
  readonly moduleSpecifier: string;
  /** True when the module specifier is relative. */
  readonly relative: boolean;
  /** True when the target resolves to semantic-runtime src. */
  readonly local: boolean;
  /** True when a relative import resolved to a source file. */
  readonly resolved: boolean;
  /** Resolved repository-relative semantic-runtime target file, when local. */
  readonly toFilePath: string | null;
  /** Resolved target area, external for package imports, or null for unresolved relatives. */
  readonly toArea: string | null;
  /** Import surface kind. */
  readonly importKind: "value-or-type" | "type-only" | "side-effect";
  /** True when a local dependency crosses semantic-runtime source areas. */
  readonly crossesArea: boolean;
  /** Exact source range for the import declaration. */
  readonly source: ProductArchitectureSourceReference;
  /** Compact row summary. */
  readonly summary: string;
}

/** Aggregated source-area dependency row. */
export interface ProductArchitectureAreaDependencyRow {
  /** Stable row id. */
  readonly id: string;
  /** Source area. */
  readonly fromArea: string;
  /** Target area. */
  readonly toArea: string;
  /** True when this row crosses semantic-runtime source areas. */
  readonly crossesArea: boolean;
  /** Number of import declarations in this area pair. */
  readonly dependencyCount: number;
  /** Number of value-or-type imports in this area pair. */
  readonly valueOrTypeImportCount: number;
  /** Number of type-only imports in this area pair. */
  readonly typeOnlyImportCount: number;
  /** Number of side-effect imports in this area pair. */
  readonly sideEffectImportCount: number;
  /** Number of distinct source modules in this area pair. */
  readonly sourceModuleCount: number;
  /** Number of distinct target modules in this area pair. */
  readonly targetModuleCount: number;
  /** Exact source files participating in this area pair. */
  readonly fromFilePaths: readonly string[];
  /** Exact local target files participating in this area pair. */
  readonly toFilePaths: readonly string[];
  /** Budgeted sample of source files participating in this area pair. */
  readonly sampleFromFiles: readonly string[];
  /** Budgeted sample of target files participating in this area pair. */
  readonly sampleToFiles: readonly string[];
  /** Budgeted sample of module specifiers participating in this area pair. */
  readonly sampleModuleSpecifiers: readonly string[];
  /** First source witness for this aggregate row. */
  readonly source: ProductArchitectureSourceReference;
  /** Compact row summary. */
  readonly summary: string;
}

/** Source declaration row scoped to semantic-runtime src. */
export interface ProductArchitectureDeclarationRow {
  /** Stable row id. */
  readonly id: string;
  /** Declaration name, or anonymous when the syntax carries no stable name. */
  readonly name: string;
  /** Atlas source declaration kind. */
  readonly declarationKind: string;
  /** True when the declaration has a top-level export/default modifier. */
  readonly exported: boolean;
  /** True when the declaration is top-level in its source file. */
  readonly topLevel: boolean;
  /** TypeChecker symbol key when available. */
  readonly symbolKey: string | null;
  /** Repository-relative source file path. */
  readonly filePath: string;
  /** Top-level source area. */
  readonly area: string;
  /** Declaration span line count. */
  readonly lineCount: number;
  /** Exact source range for the declaration. */
  readonly source: ProductArchitectureSourceReference;
  /** Compact row summary. */
  readonly summary: string;
}

/** Strongly-connected local import cycle group. */
export interface ProductArchitectureCycleRow {
  /** Stable row id. */
  readonly id: string;
  /** Repository-relative files participating in the cycle. */
  readonly filePaths: readonly string[];
  /** Top-level source areas participating in the cycle. */
  readonly areas: readonly string[];
  /** Number of participating source modules. */
  readonly moduleCount: number;
  /** Number of participating source areas. */
  readonly areaCount: number;
  /** Number of local dependency rows whose source and target are both inside this cycle. */
  readonly internalDependencyCount: number;
  /** Number of value-or-type import rows whose source and target are both inside this cycle. */
  readonly valueOrTypeImportCount: number;
  /** Number of type-only import rows whose source and target are both inside this cycle. */
  readonly typeOnlyImportCount: number;
  /** Number of side-effect import rows whose source and target are both inside this cycle. */
  readonly sideEffectImportCount: number;
  /** True when the cycle includes at least one runtime value import edge. */
  readonly runtimeCycle: boolean;
  /** True when this cycle crosses semantic-runtime source areas. */
  readonly crossesArea: boolean;
  /** Budgeted sample of internal module specifiers participating in this cycle. */
  readonly sampleModuleSpecifiers: readonly string[];
  /** First source witness for this aggregate row. */
  readonly source: ProductArchitectureSourceReference;
  /** Compact row summary. */
  readonly summary: string;
}

/** Source-level class surface inside semantic-runtime. */
export interface ProductArchitectureClassSurfaceRow {
  /** Stable row id. */
  readonly id: string;
  /** Class declaration name. */
  readonly name: string;
  /** True when exported from the source module. */
  readonly exported: boolean;
  /** True when declared abstract. */
  readonly abstract: boolean;
  /** Repository-relative source file path. */
  readonly filePath: string;
  /** Top-level source area. */
  readonly area: string;
  /** Base class expression text when present. */
  readonly extendsType: string | null;
  /** Implemented interface/type expression text when present. */
  readonly implementsTypes: readonly string[];
  /** Instance method names. */
  readonly methods: readonly string[];
  /** Static method names. */
  readonly staticMethods: readonly string[];
  /** Accessor names. */
  readonly accessors: readonly string[];
  /** Property names, including constructor parameter properties. */
  readonly properties: readonly string[];
  /** auLink ids decorating this product class, when any. */
  readonly auLinkIds: readonly string[];
  /** Number of constructor declarations. */
  readonly constructorCount: number;
  /** Number of instance and static method declarations. */
  readonly methodCount: number;
  /** Number of field/accessor/property declarations, including constructor parameter properties. */
  readonly propertyCount: number;
  /** Declaration span line count. */
  readonly lineCount: number;
  /** Exact declaration source range. */
  readonly source: ProductArchitectureSourceReference;
  /** Compact row summary. */
  readonly summary: string;
}

/** Function-like implementation body inside semantic-runtime. */
export interface ProductArchitectureFunctionSurfaceRow {
  /** Stable row id. */
  readonly id: string;
  /** Function name. Class members use ClassName.memberName. */
  readonly name: string;
  /** Function surface kind. */
  readonly functionKind:
    | "top-level"
    | "top-level-variable"
    | "class-method"
    | "class-field-function"
    | "constructor"
    | "accessor"
    | "local-function";
  /** Owning class name for class member bodies. */
  readonly className: string | null;
  /** Owning function/method body for local function surfaces. */
  readonly parentFunctionName: string | null;
  /** True when exported from the source module, or when the owning class is exported for class members. */
  readonly exported: boolean;
  /** True when the function-like declaration is static. */
  readonly static: boolean;
  /** True when the function-like declaration has an async modifier. */
  readonly async: boolean;
  /** Number of declared parameters. */
  readonly parameterCount: number;
  /** Repository-relative source file path. */
  readonly filePath: string;
  /** Top-level source area. */
  readonly area: string;
  /** Function-like body span line count. */
  readonly lineCount: number;
  /** Checker-backed call-site rows observed in this function body. */
  readonly callSiteCount: number;
  /** Checker-backed call-site rows whose target resolves inside semantic-runtime. */
  readonly localCallSiteCount: number;
  /** Checker-backed call-site rows crossing top-level semantic-runtime areas. */
  readonly crossAreaCallSiteCount: number;
  /** Distinct resolved callee symbols or callee names observed in this function body. */
  readonly distinctCalleeCount: number;
  /** Exact declaration source range. */
  readonly source: ProductArchitectureSourceReference;
  /** Compact row summary. */
  readonly summary: string;
}

/** One checker-backed call or constructor invocation inside semantic-runtime source. */
export interface ProductArchitectureCallSiteRow {
  /** Stable row id. */
  readonly id: string;
  /** Call-site syntax family. */
  readonly callKind: TypeScriptCallSiteKind;
  /** Repository-relative source file containing the call site. */
  readonly fromFilePath: string;
  /** Top-level semantic-runtime source area containing the call site. */
  readonly fromArea: string;
  /** Owning class name when the call sits inside a class body. */
  readonly className: string | null;
  /** Owning function/method/accessor surface when Atlas can infer one. */
  readonly functionName: string | null;
  /** Human-readable callee name from syntax or checker symbol. */
  readonly calleeName: string;
  /** Callee expression text as written at the call site. */
  readonly calleeText: string;
  /** Checker type display for the callee expression, when exact call details were requested. */
  readonly calleeType: string | null;
  /** Checker-visible callee symbol name when resolved. */
  readonly calleeSymbolName: string | null;
  /** Checker fully-qualified callee symbol key when resolved. */
  readonly calleeSymbolKey: string | null;
  /** Admitted package id owning the resolved callee declaration. */
  readonly targetPackageId: string | null;
  /** Repository-relative target declaration file when Atlas can identify it. */
  readonly targetFilePath: string | null;
  /** True when the call target resolves to an admitted source declaration. */
  readonly resolved: boolean;
  /** Top-level target area for semantic-runtime targets, otherwise null. */
  readonly targetArea: string | null;
  /** True when the target declaration lives inside semantic-runtime src. */
  readonly local: boolean;
  /** True when a local target crosses semantic-runtime source areas. */
  readonly crossesArea: boolean;
  /** Resolved signature display when TypeScript can resolve a signature. */
  readonly signature: string | null;
  /** Type argument count on the call expression. */
  readonly typeArgumentCount: number;
  /** Number of runtime arguments. */
  readonly argumentCount: number;
  /** Exact source range for the call site. */
  readonly source: ProductArchitectureSourceReference;
  /** Exact source range for the chosen target declaration when resolved. */
  readonly targetSource: ProductArchitectureSourceReference | null;
  /** Compact row summary. */
  readonly summary: string;
}

/** Grouped checker-backed call dependency between semantic-runtime and admitted package files. */
export interface ProductArchitectureCallDependencyRow {
  /** Stable row id. */
  readonly id: string;
  /** Source file for the grouped call sites. */
  readonly fromFilePath: string;
  /** Source area for the grouped call sites. */
  readonly fromArea: string;
  /** Resolved target file, or null for unresolved call targets. */
  readonly targetFilePath: string | null;
  /** True when the grouped target resolves to an admitted source declaration. */
  readonly resolved: boolean;
  /** Target package id when resolved. */
  readonly targetPackageId: string | null;
  /** Semantic-runtime target area when local. */
  readonly targetArea: string | null;
  /** True when the grouped target lives inside semantic-runtime src. */
  readonly local: boolean;
  /** True when local call sites cross semantic-runtime source areas. */
  readonly crossesArea: boolean;
  /** Number of call-site rows in this group. */
  readonly callCount: number;
  /** Number of distinct resolved callee symbol keys or callee names in this group. */
  readonly distinctCalleeCount: number;
  /** Number of constructor calls in this group. */
  readonly constructorCallCount: number;
  /** Number of calls whose callee expression is a member/element access. */
  readonly memberCallCount: number;
  /** Budgeted sample of callee names. */
  readonly sampleCalleeNames: readonly string[];
  /** Budgeted sample of callee expressions. */
  readonly sampleCalleeTexts: readonly string[];
  /** Exact owning class names represented in this group. */
  readonly classNames: readonly string[];
  /** Exact owning function names represented in this group. */
  readonly functionNames: readonly string[];
  /** Budgeted sample of owning function names. */
  readonly sampleFunctionNames: readonly string[];
  /** First call-site source witness for this grouped dependency. */
  readonly source: ProductArchitectureSourceReference;
  /** Compact row summary. */
  readonly summary: string;
}

/** One checker-backed identifier reference observed inside semantic-runtime source. */
export interface ProductArchitectureSymbolReferenceRow {
  /** Stable row id. */
  readonly id: string;
  /** Repository-relative source file containing the identifier usage. */
  readonly fromFilePath: string;
  /** Top-level semantic-runtime source area containing the usage. */
  readonly fromArea: string;
  /** Owning class name when the usage sits inside a class body. */
  readonly className: string | null;
  /** Owning function/method/accessor surface when Atlas can infer one. */
  readonly functionName: string | null;
  /** Exact TypeScript syntax role for the identifier usage. */
  readonly usageRole: TypeScriptUsageRoleId;
  /** Identifier or property-access text as written at the usage site. */
  readonly usageText: string;
  /** Checker-visible symbol name after alias resolution. */
  readonly symbolName: string;
  /** Checker fully-qualified symbol key after alias resolution. */
  readonly symbolKey: string;
  /** Admitted package id owning the referenced declaration. */
  readonly targetPackageId: string | null;
  /** Repository-relative target declaration file when Atlas can identify it. */
  readonly targetFilePath: string;
  /** Top-level target area for semantic-runtime targets, otherwise null. */
  readonly targetArea: string | null;
  /** True when the target declaration lives inside semantic-runtime src. */
  readonly local: boolean;
  /** True when a local target crosses semantic-runtime source areas. */
  readonly crossesArea: boolean;
  /** Exact source range for the usage site. */
  readonly source: ProductArchitectureSourceReference;
  /** Exact source range for the chosen target declaration. */
  readonly targetSource: ProductArchitectureSourceReference;
  /** Compact row summary. */
  readonly summary: string;
}

/** Grouped checker-backed symbol dependency between semantic-runtime and admitted package files. */
export interface ProductArchitectureSymbolDependencyRow {
  /** Stable row id. */
  readonly id: string;
  /** Source file for the grouped usages. */
  readonly fromFilePath: string;
  /** Source area for the grouped usages. */
  readonly fromArea: string;
  /** Target file for the grouped usages. */
  readonly targetFilePath: string;
  /** Target package id. */
  readonly targetPackageId: string | null;
  /** Semantic-runtime target area when local. */
  readonly targetArea: string | null;
  /** True when the grouped target lives inside semantic-runtime src. */
  readonly local: boolean;
  /** True when local usages cross semantic-runtime source areas. */
  readonly crossesArea: boolean;
  /** Number of identifier usage rows in this group. */
  readonly referenceCount: number;
  /** Number of distinct resolved symbol keys in this group. */
  readonly distinctSymbolCount: number;
  /** Count of import/export syntax references in this group. */
  readonly importExportReferenceCount: number;
  /** Count of type-reference and heritage syntax references in this group. */
  readonly typeReferenceCount: number;
  /** Count of value/member-reference syntax references in this group. */
  readonly valueReferenceCount: number;
  /** Count of direct call/member-call/new syntax references in this group. */
  readonly callReferenceCount: number;
  /** Count of value and call references that indicate runtime-side coupling. */
  readonly runtimeReferenceCount: number;
  /** Budgeted sample of referenced symbol names. */
  readonly sampleSymbolNames: readonly string[];
  /** Budgeted sample of owning function names. */
  readonly sampleFunctionNames: readonly string[];
  /** First usage source witness for this grouped dependency. */
  readonly source: ProductArchitectureSourceReference;
  /** Compact row summary. */
  readonly summary: string;
}

/** Source-backed architecture analysis for semantic-runtime. */
export interface ProductArchitectureAnalysis {
  /** Analysis schema marker. */
  readonly version: typeof PRODUCT_ARCHITECTURE_ANALYSIS_VERSION;
  /** Compact rollup counts. */
  readonly rollup: ProductArchitectureRollup;
  /** Top-level source area rows. */
  readonly areas: readonly ProductArchitectureAreaRow[];
  /** Source module rows. */
  readonly modules: readonly ProductArchitectureModuleRow[];
  /** Import dependency rows. */
  readonly dependencies: readonly ProductArchitectureDependencyRow[];
  /** Aggregated area-to-area dependency rows. */
  readonly areaDependencies: readonly ProductArchitectureAreaDependencyRow[];
  /** Source declaration rows. */
  readonly declarations: readonly ProductArchitectureDeclarationRow[];
  /** Local import cycle rows. */
  readonly cycles: readonly ProductArchitectureCycleRow[];
  /** Class implementation surface rows. */
  readonly classSurfaces: readonly ProductArchitectureClassSurfaceRow[];
  /** Function/method implementation surface rows. */
  readonly functionSurfaces: readonly ProductArchitectureFunctionSurfaceRow[];
  /** Checker-backed call or constructor invocation rows. */
  readonly callSites: readonly ProductArchitectureCallSiteRow[];
  /** Grouped checker-backed call dependency rows. */
  readonly callDependencies: readonly ProductArchitectureCallDependencyRow[];
  /** Checker-backed identifier reference rows. */
  readonly symbolReferences: readonly ProductArchitectureSymbolReferenceRow[];
  /** Grouped checker-backed symbol dependency rows. */
  readonly symbolDependencies: readonly ProductArchitectureSymbolDependencyRow[];
}

/** One measured product-architecture build phase. */
export interface ProductArchitecturePhaseProfile {
  /** Phase name in build order. */
  readonly phase: string;
  /** Wall-clock duration in milliseconds. */
  readonly milliseconds: number;
  /** Row count or useful size for this phase result, when available. */
  readonly count: number | null;
}

/** Fresh product-architecture build with phase timings. */
export interface ProductArchitectureProfile {
  /** Analysis produced by the profiled build. */
  readonly analysis: ProductArchitectureAnalysis;
  /** True when checker-backed call-site and call dependency rows were included. */
  readonly includeCallSites: boolean;
  /** True when call-site rows include expensive checker type/signature displays. */
  readonly includeCallDetails: boolean;
  /** True when checker-backed identifier reference and symbol dependency rows were included. */
  readonly includeSymbols: boolean;
  /** Measured build phases in execution order. */
  readonly phases: readonly ProductArchitecturePhaseProfile[];
  /** Total wall-clock duration in milliseconds. */
  readonly totalMilliseconds: number;
}

/** Construction lanes for product-architecture analysis. */
export interface ProductArchitectureAnalysisOptions {
  /** Include checker-backed call-site rows, call dependency rows, and function call enrichment. */
  readonly includeCallSites?: boolean;
  /** Include expensive call-site checker type/signature displays. */
  readonly includeCallDetails?: boolean;
  /** Include checker-backed identifier reference and symbol dependency rows. */
  readonly includeSymbols?: boolean;
}

interface SemanticRuntimeSourceFile {
  readonly sourceFile: ts.SourceFile;
  readonly filePath: string;
  readonly area: string;
}

interface ResolvedImportTarget {
  readonly local: boolean;
  readonly resolved: boolean;
  readonly toFilePath: string | null;
  readonly toArea: string | null;
}

type ProductArchitecturePhaseRunner = <TValue>(
  phase: string,
  read: () => TValue,
  count?: (value: TValue) => number | null,
) => TValue;

const semanticRuntimeSrcPrefix = "packages/semantic-runtime/src/";
const rootArea = "root";
const largeFunctionLineThreshold = 100;
const productArchitectureMemo =
  new SourceProjectKeyedMemo<string, ProductArchitectureAnalysis>();

function productArchitectureMemoKey(
  includeCallSites: boolean,
  includeCallDetails: boolean,
  includeSymbols: boolean,
): string {
  return `${includeCallSites ? "calls" : "no-calls"}:${
    includeCallDetails ? "call-details" : "compact-calls"
  }:${
    includeSymbols ? "symbols" : "no-symbols"
  }`;
}

/** Read the semantic-runtime architecture analysis for the current source epoch. */
export function readProductArchitectureAnalysis(
  sourceProject: SourceProject,
  options: ProductArchitectureAnalysisOptions = {},
): ProductArchitectureAnalysis {
  const includeCallSites = options.includeCallSites ?? true;
  const includeCallDetails = includeCallSites && (options.includeCallDetails ?? false);
  const includeSymbols = options.includeSymbols ?? true;
  const memoKey = productArchitectureMemoKey(
    includeCallSites,
    includeCallDetails,
    includeSymbols,
  );
  return productArchitectureMemo.read(sourceProject, memoKey, () =>
    buildProductArchitectureAnalysis(
      sourceProject,
      runProductArchitecturePhase,
      includeCallSites,
      includeCallDetails,
      includeSymbols,
    ),
  );
}

/** Build a fresh semantic-runtime architecture analysis and expose phase timings. */
export function profileProductArchitectureAnalysis(
  sourceProject: SourceProject,
  options: ProductArchitectureAnalysisOptions = {},
): ProductArchitectureProfile {
  const includeCallSites = options.includeCallSites ?? true;
  const includeCallDetails = includeCallSites && (options.includeCallDetails ?? false);
  const includeSymbols = options.includeSymbols ?? true;
  const phases: ProductArchitecturePhaseProfile[] = [];
  const started = performance.now();
  const analysis = buildProductArchitectureAnalysis(sourceProject, (phase, read, count) => {
    const phaseStarted = performance.now();
    const value = read();
    phases.push({
      phase,
      milliseconds: performance.now() - phaseStarted,
      count: countValue(value, count),
    });
    return value;
  }, includeCallSites, includeCallDetails, includeSymbols);
  return {
    analysis,
    includeCallSites,
    includeCallDetails,
    includeSymbols,
    phases,
    totalMilliseconds: performance.now() - started,
  };
}

function buildProductArchitectureAnalysis(
  sourceProject: SourceProject,
  phase: ProductArchitecturePhaseRunner = runProductArchitecturePhase,
  includeCallSites: boolean = true,
  includeCallDetails: boolean = false,
  includeSymbols: boolean = true,
): ProductArchitectureAnalysis {
  const sourceFiles = phase(
    "semantic-runtime source files",
    () => semanticRuntimeSourceFiles(sourceProject),
    rowCount,
  );
  const declarations = phase(
    "semantic-runtime declarations",
    () => semanticRuntimeDeclarations(sourceProject),
    rowCount,
  );
  const topLevelDeclarationKeys = phase(
    "top-level declaration keys",
    () => new Set(
      sourceProject
        .topLevelDeclarationRows()
        .filter(isSemanticRuntimeSrcDeclaration)
        .map(productArchitectureDeclarationKey),
    ),
    (value) => value.size,
  );
  const declarationRows = phase(
    "declaration rows",
    () => declarations.map((row) => declarationRow(row, topLevelDeclarationKeys)),
    rowCount,
  );
  const dependencies = phase(
    "import dependency rows",
    () => sourceFiles.flatMap((entry) => dependencyRows(sourceProject, entry)),
    rowCount,
  );
  const auLinkClassIds = phase(
    "auLink class anchors",
    () => auLinkClassIdsByFileAndName(sourceProject),
    (value) => value.size,
  );
  const classSurfaces = phase(
    "class surface rows",
    () => sourceFiles.flatMap((entry) => classSurfaceRows(entry, auLinkClassIds)),
    rowCount,
  );
  const rawFunctionSurfaces = phase(
    "function surface rows",
    () => sourceFiles.flatMap(functionSurfaceRows),
    rowCount,
  );
  const callSites = includeCallSites
    ? phase(
      "checker call-site rows",
      () => callSiteRows(sourceProject, sourceFiles, includeCallDetails),
      rowCount,
    )
    : [];
  const functionSurfaces = includeCallSites
    ? phase(
      "function surface call enrichment",
      () => enrichFunctionSurfaces(rawFunctionSurfaces, callSites),
      rowCount,
    )
    : rawFunctionSurfaces;
  const callDependencies = includeCallSites
    ? phase(
      "call dependency rows",
      () => callDependencyRows(callSites),
      rowCount,
    )
    : [];
  const symbolReferences = includeSymbols
    ? phase(
      "checker symbol reference rows",
      () => symbolReferenceRows(sourceProject, sourceFiles),
      rowCount,
    )
    : [];
  const symbolDependencies = includeSymbols
    ? phase(
      "symbol dependency rows",
      () => symbolDependencyRows(symbolReferences),
      rowCount,
    )
    : [];
  const modules = phase(
    "module rows",
    () => moduleRows(
      sourceFiles,
      declarationRows,
      dependencies,
      functionSurfaces,
    ),
    rowCount,
  );
  const areaDependencies = phase(
    "area dependency rows",
    () => areaDependencyRows(dependencies),
    rowCount,
  );
  const cycles = phase(
    "import cycle rows",
    () => cycleRows(modules, dependencies),
    rowCount,
  );
  const areas = phase(
    "area rows",
    () => areaRows(modules, declarationRows, dependencies),
    rowCount,
  );

  return {
    version: PRODUCT_ARCHITECTURE_ANALYSIS_VERSION,
    rollup: productArchitectureRollup(
      areas,
      modules,
      declarationRows,
      cycles,
      classSurfaces,
      functionSurfaces,
      callSites,
      callDependencies,
      symbolReferences,
      symbolDependencies,
      dependencies,
      areaDependencies,
    ),
    areas,
    modules,
    dependencies,
    areaDependencies,
    declarations: declarationRows,
    cycles,
    classSurfaces,
    functionSurfaces,
    callSites,
    callDependencies,
    symbolReferences,
    symbolDependencies,
  };
}

function runProductArchitecturePhase<TValue>(
  _phase: string,
  read: () => TValue,
): TValue {
  return read();
}

function countValue<TValue>(
  value: TValue,
  count: ((value: TValue) => number | null) | undefined,
): number | null {
  return count === undefined ? null : count(value);
}

function rowCount<TValue extends { readonly length: number }>(
  value: TValue,
): number {
  return value.length;
}

function semanticRuntimeSourceFiles(
  sourceProject: SourceProject,
): readonly SemanticRuntimeSourceFile[] {
  const rows: SemanticRuntimeSourceFile[] = [];
  for (const sourceFile of sourceProject.ownedSourceFiles()) {
    const identity = requiredSourceFileIdentity(sourceProject, sourceFile);
    if (
      identity.packageId !== SourcePackageId.SemanticRuntime ||
      !identity.repoPath.startsWith(semanticRuntimeSrcPrefix)
    ) {
      continue;
    }
    const filePath = identity.repoPath;
    rows.push({
      sourceFile,
      filePath,
      area: areaForFilePath(filePath),
    });
  }
  return rows.sort((left, right) => left.filePath.localeCompare(right.filePath));
}

function semanticRuntimeDeclarations(
  sourceProject: SourceProject,
): readonly SourceDeclarationRow[] {
  return sourceProject
    .declarationRows()
    .filter(isSemanticRuntimeSrcDeclaration)
    .sort((left, right) =>
      left.file.repoPath.localeCompare(right.file.repoPath) ||
      left.span.start - right.span.start,
    );
}

function isSemanticRuntimeSrcDeclaration(row: SourceDeclarationRow): boolean {
  return (
    row.file.packageId === SourcePackageId.SemanticRuntime &&
    row.file.repoPath.startsWith(semanticRuntimeSrcPrefix)
  );
}

function dependencyRows(
  sourceProject: SourceProject,
  entry: SemanticRuntimeSourceFile,
): readonly ProductArchitectureDependencyRow[] {
  const rows: ProductArchitectureDependencyRow[] = [];
  for (const statement of entry.sourceFile.statements) {
    if (
      !ts.isImportDeclaration(statement) ||
      !ts.isStringLiteral(statement.moduleSpecifier)
    ) {
      continue;
    }
    const moduleSpecifier = statement.moduleSpecifier.text;
    const relative = moduleSpecifier.startsWith(".");
    const target = relative
      ? resolveRelativeImport(sourceProject, entry.sourceFile, moduleSpecifier)
      : {
          local: false,
          resolved: true,
          toFilePath: null,
          toArea: "external",
        };
    const crossesArea =
      target.local && target.toArea !== null && entry.area !== target.toArea;
    rows.push({
      id: `product.arch:dependency:${entry.filePath}:${statement.getStart(entry.sourceFile)}`,
      fromFilePath: entry.filePath,
      fromArea: entry.area,
      moduleSpecifier,
      relative,
      local: target.local,
      resolved: target.resolved,
      toFilePath: target.toFilePath,
      toArea: target.toArea,
      importKind: importKind(statement),
      crossesArea,
      source: sourceReferenceForNode(sourceProject, entry.sourceFile, statement),
      summary: dependencySummary(
        entry.area,
        moduleSpecifier,
        target,
        crossesArea,
      ),
    });
  }
  return rows;
}

function resolveRelativeImport(
  sourceProject: SourceProject,
  sourceFile: ts.SourceFile,
  moduleSpecifier: string,
): ResolvedImportTarget {
  const basePath = path.resolve(path.dirname(sourceFile.fileName), moduleSpecifier);
  for (const candidate of candidateImportPaths(basePath)) {
    const targetFile = sourceProject.readSourceFile(candidate);
    if (targetFile === null) {
      continue;
    }
    const identity = sourceProject.sourceFileIdentity(targetFile);
    if (
      identity?.packageId === SourcePackageId.SemanticRuntime &&
      identity.repoPath.startsWith(semanticRuntimeSrcPrefix)
    ) {
      return {
        local: true,
        resolved: true,
        toFilePath: identity.repoPath,
        toArea: areaForFilePath(identity.repoPath),
      };
    }
    if (identity === null) {
      return {
        local: false,
        resolved: true,
        toFilePath: null,
        toArea: "external",
      };
    }
    return {
      local: false,
      resolved: true,
      toFilePath: identity.repoPath,
      toArea: identity.packageId ?? "external",
    };
  }
  return {
    local: false,
    resolved: false,
    toFilePath: null,
    toArea: null,
  };
}

function candidateImportPaths(basePath: string): readonly string[] {
  const extension = path.extname(basePath);
  if (extension === ".js" || extension === ".mjs" || extension === ".cjs") {
    const withoutExtension = basePath.slice(0, -extension.length);
    return [
      `${withoutExtension}.ts`,
      `${withoutExtension}.tsx`,
      `${withoutExtension}.mts`,
      `${withoutExtension}.cts`,
      basePath,
    ];
  }
  if (extension.length > 0) {
    return [basePath];
  }
  return [
    basePath,
    `${basePath}.ts`,
    `${basePath}.tsx`,
    `${basePath}.mts`,
    `${basePath}.cts`,
    path.join(basePath, "index.ts"),
    path.join(basePath, "index.tsx"),
  ];
}

function importKind(
  statement: ts.ImportDeclaration,
): ProductArchitectureDependencyRow["importKind"] {
  if (statement.importClause === undefined) {
    return "side-effect";
  }
  return statement.importClause.isTypeOnly ? "type-only" : "value-or-type";
}

function moduleRows(
  sourceFiles: readonly SemanticRuntimeSourceFile[],
  declarations: readonly ProductArchitectureDeclarationRow[],
  dependencies: readonly ProductArchitectureDependencyRow[],
  functionSurfaces: readonly ProductArchitectureFunctionSurfaceRow[],
): readonly ProductArchitectureModuleRow[] {
  const declarationsByFile = groupBy(declarations, (row) => row.filePath);
  const dependenciesByFromFile = groupBy(dependencies, (row) => row.fromFilePath);
  const dependenciesByToFile = groupBy(
    dependencies.filter((row) => row.local && row.toFilePath !== null),
    (row) => row.toFilePath!,
  );
  const functionSurfacesByFile = groupBy(functionSurfaces, (row) => row.filePath);

  return sourceFiles.map((entry) => {
    const fileDeclarations = declarationsByFile.get(entry.filePath) ?? [];
    const fileDependencies = dependenciesByFromFile.get(entry.filePath) ?? [];
    const incomingDependencies = dependenciesByToFile.get(entry.filePath) ?? [];
    const fileFunctionSurfaces = functionSurfacesByFile.get(entry.filePath) ?? [];
    const largestFunction = [...fileFunctionSurfaces].sort((left, right) =>
      right.lineCount - left.lineCount ||
      left.name.localeCompare(right.name),
    )[0] ?? null;
    const exportedNames = fileDeclarations
      .filter((row) => row.topLevel && row.exported)
      .map((row) => row.name)
      .slice(0, 16);
    const lineCount =
      entry.sourceFile.getLineAndCharacterOfPosition(
        entry.sourceFile.text.length,
      ).line + 1;

    return {
      id: `product.arch:module:${entry.filePath}`,
      filePath: entry.filePath,
      area: entry.area,
      lineCount,
      declarationCount: fileDeclarations.length,
      exportedDeclarationCount: fileDeclarations.filter((row) => row.exported)
        .length,
      topLevelDeclarationCount: fileDeclarations.filter((row) => row.topLevel)
        .length,
      importCount: fileDependencies.length,
      localImportCount: fileDependencies.filter((row) => row.local).length,
      externalImportCount: fileDependencies.filter((row) => !row.relative).length,
      crossAreaImportCount: fileDependencies.filter((row) => row.crossesArea)
        .length,
      localImportInCount: incomingDependencies.length,
      functionSurfaceCount: fileFunctionSurfaces.length,
      largeFunctionCount: fileFunctionSurfaces.filter(
        (row) => row.lineCount >= largeFunctionLineThreshold,
      ).length,
      maxFunctionLineCount: largestFunction?.lineCount ?? 0,
      maxFunctionName: largestFunction?.name ?? null,
      exportedNames,
      source: sourceReferenceForFile(entry),
      summary: `${entry.filePath} has ${lineCount} line(s), ${fileDeclarations.length} declaration(s), ${fileDependencies.length} import(s), and ${fileFunctionSurfaces.length} function body surface(s)${largestFunction === null ? "" : `; largest body is ${largestFunction.name} at ${largestFunction.lineCount} line(s)`}.`,
    };
  });
}

function areaRows(
  modules: readonly ProductArchitectureModuleRow[],
  declarations: readonly ProductArchitectureDeclarationRow[],
  dependencies: readonly ProductArchitectureDependencyRow[],
): readonly ProductArchitectureAreaRow[] {
  const modulesByArea = groupBy(modules, (row) => row.area);
  const declarationsByArea = groupBy(declarations, (row) => row.area);
  const localDependencies = dependencies.filter((row) => row.local);
  const dependenciesByFromArea = groupBy(localDependencies, (row) => row.fromArea);
  const dependenciesByToArea = groupBy(
    localDependencies.filter((row) => row.toArea !== null),
    (row) => row.toArea!,
  );
  const areaNames = uniqueSortedStrings([
    ...modules.map((row) => row.area),
    ...declarations.map((row) => row.area),
    ...localDependencies.map((row) => row.fromArea),
    ...localDependencies.flatMap((row) => row.toArea === null ? [] : [row.toArea]),
  ]);

  return areaNames.map((area) => {
    const areaModules = modulesByArea.get(area) ?? [];
    const areaDeclarations = declarationsByArea.get(area) ?? [];
    const dependenciesOut = dependenciesByFromArea.get(area) ?? [];
    const dependenciesIn = dependenciesByToArea.get(area) ?? [];
    const crossAreaDependenciesOut = dependenciesOut.filter(
      (row) => row.crossesArea,
    );
    const crossAreaDependenciesIn = dependenciesIn.filter(
      (row) => row.crossesArea,
    );
    return {
      id: `product.arch:area:${area}`,
      area,
      sourceRoot:
        area === rootArea
          ? "packages/semantic-runtime/src"
          : `${semanticRuntimeSrcPrefix}${area}`,
      fileCount: areaModules.length,
      moduleCount: areaModules.length,
      declarationCount: areaDeclarations.length,
      exportedDeclarationCount: areaDeclarations.filter((row) => row.exported)
        .length,
      classCount: areaDeclarations.filter(
        (row) => row.declarationKind === "class",
      ).length,
      dependencyOutCount: dependenciesOut.length,
      dependencyInCount: dependenciesIn.length,
      crossAreaDependencyOutCount: crossAreaDependenciesOut.length,
      crossAreaDependencyInCount: crossAreaDependenciesIn.length,
      summary: `${area} owns ${areaModules.length} module(s), ${areaDeclarations.length} declaration(s), and ${crossAreaDependenciesOut.length} outgoing cross-area import(s).`,
    };
  });
}

function areaDependencyRows(
  dependencies: readonly ProductArchitectureDependencyRow[],
): readonly ProductArchitectureAreaDependencyRow[] {
  const localDependencies = dependencies.filter(
    (row) => row.local && row.toArea !== null,
  );
  const dependenciesByAreaPair = groupBy(
    localDependencies,
    (row) => `${row.fromArea}->${row.toArea}`,
  );
  return [...dependenciesByAreaPair.values()]
    .map((rows) => {
      const sortedRows = [...rows].sort((left, right) =>
        left.fromFilePath.localeCompare(right.fromFilePath) ||
        left.moduleSpecifier.localeCompare(right.moduleSpecifier),
      );
      const first = sortedRows[0]!;
      const fromArea = first.fromArea;
      const toArea = first.toArea!;
      const sourceFiles = uniqueSortedStrings(rows.map((row) => row.fromFilePath));
      const targetFiles = uniqueSortedStrings(
        rows.flatMap((row) => row.toFilePath === null ? [] : [row.toFilePath]),
      );
      const specifiers = uniqueSortedStrings(rows.map((row) => row.moduleSpecifier));
      const crossesArea = fromArea !== toArea;
      return {
        id: `product.arch:area-dependency:${fromArea}->${toArea}`,
        fromArea,
        toArea,
        crossesArea,
        dependencyCount: rows.length,
        valueOrTypeImportCount: rows.filter(
          (row) => row.importKind === "value-or-type",
        ).length,
        typeOnlyImportCount: rows.filter((row) => row.importKind === "type-only")
          .length,
        sideEffectImportCount: rows.filter(
          (row) => row.importKind === "side-effect",
        ).length,
        sourceModuleCount: sourceFiles.length,
        targetModuleCount: targetFiles.length,
        fromFilePaths: sourceFiles,
        toFilePaths: targetFiles,
        sampleFromFiles: sourceFiles.slice(0, 8),
        sampleToFiles: targetFiles.slice(0, 8),
        sampleModuleSpecifiers: specifiers.slice(0, 8),
        source: first.source,
        summary: `${fromArea} imports ${toArea} through ${rows.length} import(s) across ${sourceFiles.length} source module(s).`,
      };
    })
    .sort((left, right) =>
      Number(right.crossesArea) - Number(left.crossesArea) ||
      right.dependencyCount - left.dependencyCount ||
      left.fromArea.localeCompare(right.fromArea) ||
      left.toArea.localeCompare(right.toArea),
    );
}

function cycleRows(
  modules: readonly ProductArchitectureModuleRow[],
  dependencies: readonly ProductArchitectureDependencyRow[],
): readonly ProductArchitectureCycleRow[] {
  const modulePaths = new Set(modules.map((row) => row.filePath));
  const dependenciesByFrom = groupBy(
    dependencies.filter((row) =>
      row.local &&
      row.toFilePath !== null &&
      modulePaths.has(row.fromFilePath) &&
      modulePaths.has(row.toFilePath),
    ),
    (row) => row.fromFilePath,
  );
  const moduleByPath = new Map(modules.map((row) => [row.filePath, row]));
  const components = stronglyConnectedComponents(
    modules.map((row) => row.filePath),
    (filePath) =>
      (dependenciesByFrom.get(filePath) ?? [])
        .flatMap((row) => row.toFilePath === null ? [] : [row.toFilePath]),
  );

  return components
    .filter((component) => {
      if (component.length > 1) {
        return true;
      }
      const only = component[0];
      return only !== undefined &&
        (dependenciesByFrom.get(only) ?? []).some(
          (row) => row.toFilePath === only,
        );
    })
    .map((component, index) => {
      const filePaths = uniqueSortedStrings(component);
      const fileSet = new Set(filePaths);
      const internalDependencies = dependencies.filter((row) =>
        row.local &&
        row.toFilePath !== null &&
        fileSet.has(row.fromFilePath) &&
        fileSet.has(row.toFilePath),
      );
      const areas = uniqueSortedStrings(
        filePaths.map((filePath) => moduleByPath.get(filePath)?.area ?? areaForFilePath(filePath)),
      );
      const runtimeDependencies = internalDependencies.filter(
        (row) => row.importKind === "value-or-type" || row.importKind === "side-effect",
      );
      const firstModule = filePaths
        .map((filePath) => moduleByPath.get(filePath) ?? null)
        .find((row): row is ProductArchitectureModuleRow => row !== null);
      const source = firstModule?.source ?? internalDependencies[0]?.source;
      if (source === undefined) {
        throw new Error(`Import cycle ${filePaths.join("|")} has no source witness.`);
      }
      return {
        id: `product.arch:cycle:${index}:${filePaths.join("|")}`,
        filePaths,
        areas,
        moduleCount: filePaths.length,
        areaCount: areas.length,
        internalDependencyCount: internalDependencies.length,
        valueOrTypeImportCount: internalDependencies.filter(
          (row) => row.importKind === "value-or-type",
        ).length,
        typeOnlyImportCount: internalDependencies.filter(
          (row) => row.importKind === "type-only",
        ).length,
        sideEffectImportCount: internalDependencies.filter(
          (row) => row.importKind === "side-effect",
        ).length,
        runtimeCycle: hasImportCycle(filePaths, runtimeDependencies),
        crossesArea: areas.length > 1,
        sampleModuleSpecifiers: uniqueSortedStrings(
          internalDependencies.map((row) => row.moduleSpecifier),
        ).slice(0, 12),
        source,
        summary: `${filePaths.length} semantic-runtime module(s) form an import cycle across ${areas.join(", ")} with ${internalDependencies.length} internal import(s).`,
      } satisfies ProductArchitectureCycleRow;
    })
    .sort((left, right) =>
      Number(right.crossesArea) - Number(left.crossesArea) ||
      right.moduleCount - left.moduleCount ||
      right.internalDependencyCount - left.internalDependencyCount ||
      left.filePaths[0]!.localeCompare(right.filePaths[0]!),
    );
}

function hasImportCycle(
  filePaths: readonly string[],
  dependencies: readonly ProductArchitectureDependencyRow[],
): boolean {
  const dependencySet = new Set(filePaths);
  const dependenciesByFrom = groupBy(
    dependencies.filter((row) =>
      row.toFilePath !== null &&
      dependencySet.has(row.fromFilePath) &&
      dependencySet.has(row.toFilePath),
    ),
    (row) => row.fromFilePath,
  );
  return stronglyConnectedComponents(filePaths, (filePath) =>
    (dependenciesByFrom.get(filePath) ?? []).flatMap((row) =>
      row.toFilePath === null ? [] : [row.toFilePath],
    ),
  ).some((component) =>
    component.length > 1 ||
    (component[0] !== undefined &&
      (dependenciesByFrom.get(component[0]) ?? []).some(
        (row) => row.toFilePath === component[0],
      ))
  );
}

function declarationRow(
  row: SourceDeclarationRow,
  topLevelDeclarationKeys: ReadonlySet<string>,
): ProductArchitectureDeclarationRow {
  const source = sourceReferenceFromSpan(row.file.repoPath, row.span);
  const name = row.name ?? "anonymous";
  const lineCount = lineCountForSource(source);
  return {
    id: `product.arch:declaration:${row.file.repoPath}:${row.kind}:${name}:${row.span.start}`,
    name,
    declarationKind: row.kind,
    exported: row.exported,
    topLevel: topLevelDeclarationKeys.has(productArchitectureDeclarationKey(row)),
    symbolKey: row.symbolKey,
    filePath: row.file.repoPath,
    area: areaForFilePath(row.file.repoPath),
    lineCount,
    source,
    summary: `${row.exported ? "exported " : ""}${row.kind} ${name} spans ${lineCount} line(s) in ${row.file.repoPath}.`,
  };
}

function auLinkClassIdsByFileAndName(
  sourceProject: SourceProject,
): ReadonlyMap<string, readonly string[]> {
  const idsByClass = new Map<string, string[]>();
  for (const anchor of readAuLinkModel(sourceProject, {}).anchors) {
    if (
      anchor.target.kind !== "class" ||
      anchor.target.name === null ||
      anchor.target.file.packageId !== SourcePackageId.SemanticRuntime ||
      !anchor.target.file.repoPath.startsWith(semanticRuntimeSrcPrefix)
    ) {
      continue;
    }
    const key = classSurfaceKey(anchor.target.file.repoPath, anchor.target.name);
    const ids = idsByClass.get(key);
    if (ids === undefined) {
      idsByClass.set(key, [anchor.linkId]);
    } else {
      ids.push(anchor.linkId);
    }
  }
  return new Map(
    [...idsByClass.entries()].map(([key, ids]) => [
      key,
      uniqueSortedStrings(ids),
    ]),
  );
}

function classSurfaceKey(filePath: string, className: string): string {
  return `${filePath}\u0000${className}`;
}

function classSurfaceRows(
  entry: SemanticRuntimeSourceFile,
  auLinkClassIds: ReadonlyMap<string, readonly string[]>,
): readonly ProductArchitectureClassSurfaceRow[] {
  return entry.sourceFile.statements
    .filter(ts.isClassDeclaration)
    .filter((node) => node.name !== undefined)
    .map((node) => productClassSurfaceForDeclaration(entry, node, auLinkClassIds));
}

function functionSurfaceRows(
  entry: SemanticRuntimeSourceFile,
): readonly ProductArchitectureFunctionSurfaceRow[] {
  const rows: ProductArchitectureFunctionSurfaceRow[] = [];
  for (const statement of entry.sourceFile.statements) {
    if (ts.isFunctionDeclaration(statement) && statement.name !== undefined) {
      rows.push(productFunctionSurfaceForFunctionDeclaration(entry, statement));
      rows.push(
        ...localFunctionSurfaceRows(entry, statement, statement.name.text, null),
      );
      continue;
    }
    if (ts.isVariableStatement(statement)) {
      rows.push(...functionSurfaceRowsForVariableStatement(entry, statement));
      continue;
    }
    if (ts.isClassDeclaration(statement) && statement.name !== undefined) {
      rows.push(...functionSurfaceRowsForClassDeclaration(entry, statement));
    }
  }
  return rows.sort((left, right) =>
    left.filePath.localeCompare(right.filePath) ||
    left.source.startLine - right.source.startLine ||
    left.name.localeCompare(right.name),
  );
}

function productClassSurfaceForDeclaration(
  entry: SemanticRuntimeSourceFile,
  node: ts.ClassDeclaration,
  auLinkClassIds: ReadonlyMap<string, readonly string[]>,
): ProductArchitectureClassSurfaceRow {
  const surface = classDeclarationSurface(node, entry.sourceFile);
  const source = sourceReferenceForEntryNode(entry, node);
  const lineCount = lineCountForSource(source);
  const auLinkIds = auLinkClassIds.get(classSurfaceKey(entry.filePath, surface.name)) ?? [];
  return {
    id: `product.arch:class:${entry.filePath}:${surface.name}:${node.getStart(entry.sourceFile)}`,
    name: surface.name,
    exported: surface.exported,
    abstract: surface.abstract,
    filePath: entry.filePath,
    area: entry.area,
    extendsType: surface.extendsType,
    implementsTypes: surface.implementsTypes,
    methods: surface.methods,
    staticMethods: surface.staticMethods,
    accessors: surface.accessors,
    properties: surface.properties,
    auLinkIds,
    constructorCount: surface.constructorCount,
    methodCount: surface.methodCount,
    propertyCount: surface.propertyCount,
    lineCount,
    source,
    summary: `${surface.name} spans ${lineCount} line(s), ${surface.methodCount} method(s), ${surface.propertyCount} property/accessor surface(s), ${surface.constructorCount} constructor declaration(s), and ${auLinkIds.length} auLink anchor(s).`,
  };
}

function productFunctionSurfaceForFunctionDeclaration(
  entry: SemanticRuntimeSourceFile,
  node: ts.FunctionDeclaration,
): ProductArchitectureFunctionSurfaceRow {
  return functionSurfaceRow(entry, node, {
    name: node.name!.text,
    functionKind: "top-level",
    className: null,
    parentFunctionName: null,
    exported: hasModifier(node, ts.SyntaxKind.ExportKeyword),
    static: false,
  });
}

function functionSurfaceRowsForVariableStatement(
  entry: SemanticRuntimeSourceFile,
  statement: ts.VariableStatement,
): readonly ProductArchitectureFunctionSurfaceRow[] {
  const rows: ProductArchitectureFunctionSurfaceRow[] = [];
  for (const declaration of statement.declarationList.declarations) {
    if (
      !ts.isIdentifier(declaration.name) ||
      declaration.initializer === undefined ||
      (!ts.isArrowFunction(declaration.initializer) &&
        !ts.isFunctionExpression(declaration.initializer))
    ) {
      continue;
    }
    rows.push(
      functionSurfaceRow(entry, declaration.initializer, {
        name: declaration.name.text,
        functionKind: "top-level-variable",
        className: null,
        parentFunctionName: null,
        exported: hasModifier(statement, ts.SyntaxKind.ExportKeyword),
        static: false,
      }),
    );
    rows.push(
      ...localFunctionSurfaceRows(
        entry,
        declaration.initializer,
        declaration.name.text,
        null,
      ),
    );
  }
  return rows;
}

function functionSurfaceRowsForClassDeclaration(
  entry: SemanticRuntimeSourceFile,
  node: ts.ClassDeclaration,
): readonly ProductArchitectureFunctionSurfaceRow[] {
  const className = node.name!.text;
  const classExported = hasModifier(node, ts.SyntaxKind.ExportKeyword);
  const rows: ProductArchitectureFunctionSurfaceRow[] = [];
  for (const member of node.members) {
    if (ts.isConstructorDeclaration(member)) {
      rows.push(
        functionSurfaceRow(entry, member, {
          name: `${className}.constructor`,
          functionKind: "constructor",
          className,
          parentFunctionName: null,
          exported: classExported,
          static: false,
        }),
      );
      rows.push(
        ...localFunctionSurfaceRows(
          entry,
          member,
          `${className}.constructor`,
          className,
        ),
      );
      continue;
    }
    if (ts.isMethodDeclaration(member)) {
      const memberName = propertyNameText(member.name, entry.sourceFile);
      if (memberName === null) {
        continue;
      }
      const functionName = `${className}.${memberName}`;
      rows.push(
        functionSurfaceRow(entry, member, {
          name: functionName,
          functionKind: "class-method",
          className,
          parentFunctionName: null,
          exported: classExported,
          static: hasModifier(member, ts.SyntaxKind.StaticKeyword),
        }),
      );
      rows.push(
        ...localFunctionSurfaceRows(entry, member, functionName, className),
      );
      continue;
    }
    if (ts.isGetAccessor(member) || ts.isSetAccessor(member)) {
      const memberName = propertyNameText(member.name, entry.sourceFile);
      if (memberName === null) {
        continue;
      }
      const functionName = `${className}.${memberName}`;
      rows.push(
        functionSurfaceRow(entry, member, {
          name: functionName,
          functionKind: "accessor",
          className,
          parentFunctionName: null,
          exported: classExported,
          static: hasModifier(member, ts.SyntaxKind.StaticKeyword),
        }),
      );
      rows.push(
        ...localFunctionSurfaceRows(entry, member, functionName, className),
      );
      continue;
    }
    if (
      ts.isPropertyDeclaration(member) &&
      member.initializer !== undefined &&
      (ts.isArrowFunction(member.initializer) ||
        ts.isFunctionExpression(member.initializer))
    ) {
      const memberName = propertyNameText(member.name, entry.sourceFile);
      if (memberName === null) {
        continue;
      }
      const functionName = `${className}.${memberName}`;
      rows.push(
        functionSurfaceRow(entry, member.initializer, {
          name: functionName,
          functionKind: "class-field-function",
          className,
          parentFunctionName: null,
          exported: classExported,
          static: hasModifier(member, ts.SyntaxKind.StaticKeyword),
        }),
      );
      rows.push(
        ...localFunctionSurfaceRows(
          entry,
          member.initializer,
          functionName,
          className,
        ),
      );
    }
  }
  return rows;
}

function localFunctionSurfaceRows(
  entry: SemanticRuntimeSourceFile,
  root: ts.Node,
  parentFunctionName: string,
  className: string | null,
): readonly ProductArchitectureFunctionSurfaceRow[] {
  const rows: ProductArchitectureFunctionSurfaceRow[] = [];
  const visit = (node: ts.Node): void => {
    if (ts.isFunctionDeclaration(node) && node.name !== undefined) {
      const functionName = `${parentFunctionName}.${node.name.text}`;
      rows.push(
        functionSurfaceRow(entry, node, {
          name: functionName,
          functionKind: "local-function",
          className,
          parentFunctionName,
          exported: false,
          static: false,
        }),
      );
      rows.push(...localFunctionSurfaceRows(entry, node, functionName, className));
      return;
    }
    if (
      ts.isVariableDeclaration(node) &&
      ts.isIdentifier(node.name) &&
      node.initializer !== undefined &&
      (ts.isArrowFunction(node.initializer) ||
        ts.isFunctionExpression(node.initializer))
    ) {
      const functionName = `${parentFunctionName}.${node.name.text}`;
      rows.push(
        functionSurfaceRow(entry, node.initializer, {
          name: functionName,
          functionKind: "local-function",
          className,
          parentFunctionName,
          exported: false,
          static: false,
        }),
      );
      rows.push(
        ...localFunctionSurfaceRows(
          entry,
          node.initializer,
          functionName,
          className,
        ),
      );
      return;
    }
    ts.forEachChild(node, visit);
  };
  ts.forEachChild(root, visit);
  return rows;
}

function functionSurfaceRow(
  entry: SemanticRuntimeSourceFile,
  node:
    | ts.FunctionDeclaration
    | ts.FunctionExpression
    | ts.ArrowFunction
    | ts.MethodDeclaration
    | ts.ConstructorDeclaration
    | ts.GetAccessorDeclaration
    | ts.SetAccessorDeclaration,
  fields: Pick<
    ProductArchitectureFunctionSurfaceRow,
    | "name"
    | "functionKind"
    | "className"
    | "parentFunctionName"
    | "exported"
    | "static"
  >,
): ProductArchitectureFunctionSurfaceRow {
  const source = sourceReferenceForEntryNode(entry, node);
  const lineCount = lineCountForSource(source);
  return {
    id: `product.arch:function:${entry.filePath}:${fields.name}:${node.getStart(entry.sourceFile)}`,
    ...fields,
    async: hasModifier(node, ts.SyntaxKind.AsyncKeyword),
    parameterCount: node.parameters.length,
    filePath: entry.filePath,
    area: entry.area,
    lineCount,
    callSiteCount: 0,
    localCallSiteCount: 0,
    crossAreaCallSiteCount: 0,
    distinctCalleeCount: 0,
    source,
    summary: `${fields.name} is a ${fields.functionKind} surface spanning ${lineCount} line(s) in ${entry.filePath}.`,
  };
}

function enrichFunctionSurfaces(
  functionSurfaces: readonly ProductArchitectureFunctionSurfaceRow[],
  callSites: readonly ProductArchitectureCallSiteRow[],
): readonly ProductArchitectureFunctionSurfaceRow[] {
  const callSitesByFunction = groupBy(
    callSites.filter((row) => row.functionName !== null),
    (row) => `${row.fromFilePath}\u0000${row.functionName}`,
  );
  return functionSurfaces.map((row) => {
    const rowCallSites =
      callSitesByFunction.get(`${row.filePath}\u0000${row.name}`) ?? [];
    const distinctCalleeCount = new Set(rowCallSites.map((callSite) =>
      callSite.calleeSymbolKey ?? callSite.calleeName,
    )).size;
    return {
      ...row,
      callSiteCount: rowCallSites.length,
      localCallSiteCount: rowCallSites.filter((callSite) => callSite.local)
        .length,
      crossAreaCallSiteCount: rowCallSites.filter((callSite) =>
        callSite.crossesArea
      ).length,
      distinctCalleeCount,
      summary: `${row.name} is a ${row.functionKind} surface spanning ${row.lineCount} line(s) in ${row.filePath} with ${rowCallSites.length} checker-backed call-site row(s) across ${distinctCalleeCount} distinct callee(s).`,
    };
  });
}

function callSiteRows(
  sourceProject: SourceProject,
  sourceFiles: readonly SemanticRuntimeSourceFile[],
  includeCallDetails: boolean,
): readonly ProductArchitectureCallSiteRow[] {
  const symbolResolution = new ProductArchitectureSymbolResolutionCache(sourceProject);
  return sourceFiles
    .flatMap((entry) =>
      callSiteRowsForEntry(
        sourceProject,
        entry,
        symbolResolution,
        includeCallDetails,
      )
    )
    .sort((left, right) =>
      left.fromFilePath.localeCompare(right.fromFilePath) ||
      left.source.startLine - right.source.startLine ||
      left.source.startCharacter - right.source.startCharacter,
    );
}

function callSiteRowsForEntry(
  sourceProject: SourceProject,
  entry: SemanticRuntimeSourceFile,
  symbolResolution: ProductArchitectureSymbolResolutionCache,
  includeCallDetails: boolean,
): readonly ProductArchitectureCallSiteRow[] {
  const rows: ProductArchitectureCallSiteRow[] = [];
  const rootContext: SymbolReferenceVisitContext = {
    className: null,
    functionName: null,
  };

  const visit = (
    node: ts.Node,
    context: SymbolReferenceVisitContext,
  ): void => {
    const nodeContext = symbolReferenceContextForNode(
      node,
      context,
      entry.sourceFile,
    );
    if (ts.isCallExpression(node) || ts.isNewExpression(node)) {
      const row = callSiteRowForExpression(
        sourceProject,
        entry,
        node,
        nodeContext,
        symbolResolution,
        includeCallDetails,
      );
      if (row !== null) {
        rows.push(row);
      }
    }
    ts.forEachChild(node, (child) => visit(child, nodeContext));
  };

  visit(entry.sourceFile, rootContext);
  return rows;
}

function callSiteRowForExpression(
  sourceProject: SourceProject,
  entry: SemanticRuntimeSourceFile,
  expression: ts.CallExpression | ts.NewExpression,
  context: SymbolReferenceVisitContext,
  symbolResolution: ProductArchitectureSymbolResolutionCache,
  includeCallDetails: boolean,
): ProductArchitectureCallSiteRow | null {
  const symbol = symbolForCallCallee(sourceProject.checker, expression.expression);
  const resolved = symbol === null ? null : symbolResolution.read(symbol);
  const callSite = lightweightCallSiteFact(
    sourceProject,
    entry.sourceFile,
    expression,
    symbol,
    includeCallDetails,
  );
  const target = resolved?.target ?? null;
  const local = target?.identity.packageId === SourcePackageId.SemanticRuntime &&
    target.identity.repoPath.startsWith(semanticRuntimeSrcPrefix);
  const targetArea = local && target !== null
    ? areaForFilePath(target.identity.repoPath)
    : null;
  const crossesArea = local && targetArea !== entry.area;
  const targetSource = resolved?.targetSource ?? null;
  const source = sourceReferenceForEntryNode(entry, expression);
  const targetFilePath = target?.identity.repoPath ?? null;
  const targetPackageId = target?.identity.packageId ?? null;
  const calleeSymbolName = resolved?.symbolName ?? null;
  const calleeSymbolKey = resolved?.symbolKey ?? null;
  return {
    id: `product.arch:call-site:${entry.filePath}:${expression.getStart(entry.sourceFile)}:${callSite.calleeName}`,
    callKind: callSite.kind,
    fromFilePath: entry.filePath,
    fromArea: entry.area,
    className: context.className,
    functionName: context.functionName,
    calleeName: callSite.calleeName,
    calleeText: callSite.calleeText,
    calleeType: callSite.calleeType,
    calleeSymbolName,
    calleeSymbolKey,
    targetPackageId,
    targetFilePath,
    resolved: target !== null,
    targetArea,
    local,
    crossesArea,
    signature: callSite.signature,
    typeArgumentCount: callSite.typeArgumentCount,
    argumentCount: callSite.argumentCount,
    source,
    targetSource,
    summary: callSiteSummary(
      entry.area,
      context.functionName,
      callSite.calleeName,
      targetPackageId,
      targetArea,
      targetFilePath,
      crossesArea,
    ),
  };
}

interface ProductArchitectureCallSiteFact {
  readonly kind: TypeScriptCallSiteKind;
  readonly calleeName: string;
  readonly calleeText: string;
  readonly calleeType: string | null;
  readonly signature: string | null;
  readonly typeArgumentCount: number;
  readonly argumentCount: number;
}

function lightweightCallSiteFact(
  sourceProject: SourceProject,
  sourceFile: ts.SourceFile,
  expression: ts.CallExpression | ts.NewExpression,
  symbol: ts.Symbol | null,
  includeCallDetails: boolean,
): ProductArchitectureCallSiteFact {
  const checker = sourceProject.checker;
  const callee = expression.expression;
  const signature = includeCallDetails
    ? checker.getResolvedSignature(expression)
    : undefined;
  return {
    kind: ts.isNewExpression(expression)
      ? TypeScriptCallSiteKind.New
      : TypeScriptCallSiteKind.Call,
    calleeName:
      calleeNameForExpression(
        callee,
        sourceFile,
        symbol?.getName() ?? callee.getText(sourceFile),
      ) ?? callee.getText(sourceFile),
    calleeText: callee.getText(sourceFile),
    calleeType: includeCallDetails
      ? checker.typeToString(checker.getTypeAtLocation(callee), callee)
      : null,
    signature: signature === undefined
      ? null
      : checker.signatureToString(signature, expression),
    typeArgumentCount: expression.typeArguments?.length ?? 0,
    argumentCount: expression.arguments?.length ?? 0,
  };
}

export function callDependencyRows(
  callSites: readonly ProductArchitectureCallSiteRow[],
): readonly ProductArchitectureCallDependencyRow[] {
  const callsByFilePair = groupBy(
    callSites,
    (row) => `${row.fromFilePath}->${row.targetFilePath ?? `unresolved:${row.calleeSymbolKey ?? row.calleeName}`}`,
  );
  return [...callsByFilePair.values()]
    .map((rows) => {
      const sortedRows = [...rows].sort((left, right) =>
        left.source.startLine - right.source.startLine ||
        left.source.startCharacter - right.source.startCharacter ||
        left.calleeName.localeCompare(right.calleeName),
      );
      const first = sortedRows[0]!;
      const calleeNames = uniqueSortedStrings(rows.map((row) => row.calleeName));
      const calleeTexts = uniqueSortedStrings(rows.map((row) => row.calleeText));
      const functionNames = uniqueSortedStrings(
        rows.flatMap((row) =>
          row.functionName === null ? [] : [row.functionName],
        ),
      );
      const classNames = uniqueSortedStrings(
        rows.flatMap((row) =>
          row.className === null ? [] : [row.className],
        ),
      );
      return {
        id: `product.arch:call-dependency:${first.fromFilePath}->${first.targetFilePath ?? first.calleeSymbolKey ?? first.calleeName}`,
        fromFilePath: first.fromFilePath,
        fromArea: first.fromArea,
        targetFilePath: first.targetFilePath,
        resolved: first.resolved,
        targetPackageId: first.targetPackageId,
        targetArea: first.targetArea,
        local: first.local,
        crossesArea: first.crossesArea,
        callCount: rows.length,
        distinctCalleeCount: new Set(
          rows.map((row) => row.calleeSymbolKey ?? row.calleeName),
        ).size,
        constructorCallCount: rows.filter((row) => row.callKind === "new").length,
        memberCallCount: rows.filter((row) =>
          row.calleeText.includes(".") || row.calleeText.includes("[")
        ).length,
        sampleCalleeNames: calleeNames.slice(0, 12),
        sampleCalleeTexts: calleeTexts.slice(0, 12),
        classNames,
        functionNames,
        sampleFunctionNames: functionNames.slice(0, 12),
        source: first.source,
        summary: callDependencySummary(first, rows.length, calleeNames.length),
      } satisfies ProductArchitectureCallDependencyRow;
    })
    .sort((left, right) =>
      Number(right.crossesArea) - Number(left.crossesArea) ||
      right.callCount - left.callCount ||
      right.distinctCalleeCount - left.distinctCalleeCount ||
      left.fromFilePath.localeCompare(right.fromFilePath) ||
      (left.targetFilePath ?? "").localeCompare(right.targetFilePath ?? ""),
    );
}

interface SymbolReferenceVisitContext {
  readonly className: string | null;
  readonly functionName: string | null;
}

function symbolReferenceRows(
  sourceProject: SourceProject,
  sourceFiles: readonly SemanticRuntimeSourceFile[],
): readonly ProductArchitectureSymbolReferenceRow[] {
  const symbolResolution = new ProductArchitectureSymbolResolutionCache(sourceProject);
  return sourceFiles
    .flatMap((entry) => symbolReferenceRowsForEntry(sourceProject, entry, symbolResolution))
    .sort((left, right) =>
      left.fromFilePath.localeCompare(right.fromFilePath) ||
      left.source.startLine - right.source.startLine ||
      left.source.startCharacter - right.source.startCharacter,
    );
}

function symbolReferenceRowsForEntry(
  sourceProject: SourceProject,
  entry: SemanticRuntimeSourceFile,
  symbolResolution: ProductArchitectureSymbolResolutionCache,
): readonly ProductArchitectureSymbolReferenceRow[] {
  const rows: ProductArchitectureSymbolReferenceRow[] = [];
  const rootContext: SymbolReferenceVisitContext = {
    className: null,
    functionName: null,
  };

  const visit = (
    node: ts.Node,
    context: SymbolReferenceVisitContext,
  ): void => {
    const nodeContext = symbolReferenceContextForNode(
      node,
      context,
      entry.sourceFile,
    );
    if (ts.isIdentifier(node)) {
      const row = symbolReferenceRowForIdentifier(
        sourceProject,
        entry,
        node,
        nodeContext,
        symbolResolution,
      );
      if (row !== null) {
        rows.push(row);
      }
    }
    ts.forEachChild(node, (child) => visit(child, nodeContext));
  };

  visit(entry.sourceFile, rootContext);
  return rows;
}

function symbolReferenceRowForIdentifier(
  sourceProject: SourceProject,
  entry: SemanticRuntimeSourceFile,
  identifier: ts.Identifier,
  context: SymbolReferenceVisitContext,
  symbolResolution: ProductArchitectureSymbolResolutionCache,
): ProductArchitectureSymbolReferenceRow | null {
  const role = usageRoleForIdentifier(identifier);
  if (role === null) {
    return null;
  }
  const symbol = symbolForNode(sourceProject.checker, identifier);
  if (symbol === null) {
    return null;
  }
  const resolved = symbolResolution.read(symbol);
  const target = resolved.target;
  if (target === null) {
    return null;
  }
  const local = target.identity.packageId === SourcePackageId.SemanticRuntime &&
    target.identity.repoPath.startsWith(semanticRuntimeSrcPrefix);
  const targetArea = local ? areaForFilePath(target.identity.repoPath) : null;
  const crossesArea = local && targetArea !== entry.area;
  const text = usageText(identifier);
  const source = sourceReferenceForEntryNode(entry, identifier);
  return {
    id: `product.arch:symbol-reference:${entry.filePath}:${identifier.getStart(entry.sourceFile)}:${resolved.symbolKey}`,
    fromFilePath: entry.filePath,
    fromArea: entry.area,
    className: context.className,
    functionName: context.functionName,
    usageRole: role,
    usageText: text,
    symbolName: resolved.symbolName,
    symbolKey: resolved.symbolKey,
    targetPackageId: target.identity.packageId,
    targetFilePath: target.identity.repoPath,
    targetArea,
    local,
    crossesArea,
    source,
    targetSource: resolved.targetSource!,
    summary: `${entry.area} ${role} ${text} resolves to ${target.identity.packageId}:${resolved.symbolName}${targetArea === null ? "" : ` in ${targetArea}`}.`,
  };
}

function symbolDependencyRows(
  symbolReferences: readonly ProductArchitectureSymbolReferenceRow[],
): readonly ProductArchitectureSymbolDependencyRow[] {
  const referencesByFilePair = groupBy(
    symbolReferences,
    (row) => `${row.fromFilePath}->${row.targetFilePath}`,
  );
  return [...referencesByFilePair.values()]
    .map((rows) => {
      const sortedRows = [...rows].sort((left, right) =>
        left.source.startLine - right.source.startLine ||
        left.source.startCharacter - right.source.startCharacter ||
        left.symbolName.localeCompare(right.symbolName),
      );
      const first = sortedRows[0]!;
      const symbolNames = uniqueSortedStrings(rows.map((row) => row.symbolName));
      const functionNames = uniqueSortedStrings(
        rows.flatMap((row) =>
          row.functionName === null ? [] : [row.functionName],
        ),
      );
      const valueReferenceCount = rows.filter((row) =>
        row.usageRole === "value-reference" ||
        row.usageRole === "member-reference",
      ).length;
      const callReferenceCount = rows.filter((row) =>
        row.usageRole === "call-expression" ||
        row.usageRole === "member-call" ||
        row.usageRole === "new-expression",
      ).length;
      return {
        id: `product.arch:symbol-dependency:${first.fromFilePath}->${first.targetFilePath}`,
        fromFilePath: first.fromFilePath,
        fromArea: first.fromArea,
        targetFilePath: first.targetFilePath,
        targetPackageId: first.targetPackageId,
        targetArea: first.targetArea,
        local: first.local,
        crossesArea: first.crossesArea,
        referenceCount: rows.length,
        distinctSymbolCount: new Set(rows.map((row) => row.symbolKey)).size,
        importExportReferenceCount: rows.filter((row) =>
          row.usageRole === "import" || row.usageRole === "export",
        ).length,
        typeReferenceCount: rows.filter((row) =>
          row.usageRole === "type-reference" || row.usageRole === "heritage",
        ).length,
        valueReferenceCount,
        callReferenceCount,
        runtimeReferenceCount: valueReferenceCount + callReferenceCount,
        sampleSymbolNames: symbolNames.slice(0, 12),
        sampleFunctionNames: functionNames.slice(0, 12),
        source: first.source,
        summary: `${first.fromFilePath} references ${first.targetFilePath} through ${rows.length} checker-backed identifier usage(s) across ${symbolNames.length} symbol(s).`,
      } satisfies ProductArchitectureSymbolDependencyRow;
    })
    .sort((left, right) =>
      Number(right.crossesArea) - Number(left.crossesArea) ||
      right.runtimeReferenceCount - left.runtimeReferenceCount ||
      right.referenceCount - left.referenceCount ||
      left.fromFilePath.localeCompare(right.fromFilePath) ||
      left.targetFilePath.localeCompare(right.targetFilePath),
    );
}

function symbolReferenceContextForNode(
  node: ts.Node,
  context: SymbolReferenceVisitContext,
  sourceFile: ts.SourceFile,
): SymbolReferenceVisitContext {
  if (ts.isClassDeclaration(node) && node.name !== undefined) {
    return {
      className: node.name.text,
      functionName: context.functionName,
    };
  }
  const functionName = functionNameForReferenceContext(node, context, sourceFile);
  if (functionName === null) {
    return context;
  }
  return {
    className: context.className,
    functionName,
  };
}

function functionNameForReferenceContext(
  node: ts.Node,
  context: SymbolReferenceVisitContext,
  sourceFile: ts.SourceFile,
): string | null {
  if (ts.isConstructorDeclaration(node)) {
    return `${context.className ?? "anonymous"}.constructor`;
  }
  if (ts.isMethodDeclaration(node) || ts.isGetAccessor(node) || ts.isSetAccessor(node)) {
    const name = propertyNameText(node.name, sourceFile);
    if (name === null) {
      return null;
    }
    return context.className === null ? name : `${context.className}.${name}`;
  }
  if (ts.isFunctionDeclaration(node) && node.name !== undefined) {
    return nestedFunctionName(context.functionName, node.name.text);
  }
  if (ts.isArrowFunction(node) || ts.isFunctionExpression(node)) {
    const parent = node.parent;
    if (ts.isVariableDeclaration(parent) && ts.isIdentifier(parent.name)) {
      return nestedFunctionName(context.functionName, parent.name.text);
    }
    if (ts.isPropertyDeclaration(parent)) {
      const name = propertyNameText(parent.name, sourceFile);
      if (name === null) {
        return null;
      }
      return context.className === null ? name : `${context.className}.${name}`;
    }
  }
  return null;
}

function nestedFunctionName(
  parentFunctionName: string | null,
  localName: string,
): string {
  return parentFunctionName === null ? localName : `${parentFunctionName}.${localName}`;
}

type ProductArchitectureTargetDeclaration = {
  readonly declaration: ts.Declaration;
  readonly identity: NonNullable<ReturnType<SourceProject["sourceFileIdentity"]>>;
};

interface ProductArchitectureResolvedSymbol {
  readonly symbolName: string;
  readonly symbolKey: string;
  readonly target: ProductArchitectureTargetDeclaration | null;
  readonly targetSource: ProductArchitectureSourceReference | null;
}

class ProductArchitectureSymbolResolutionCache {
  readonly #values = new WeakMap<ts.Symbol, ProductArchitectureResolvedSymbol>();

  constructor(
    readonly sourceProject: SourceProject,
  ) {}

  read(symbol: ts.Symbol): ProductArchitectureResolvedSymbol {
    const existing = this.#values.get(symbol);
    if (existing !== undefined) {
      return existing;
    }
    const target = targetDeclarationForSymbol(this.sourceProject, symbol);
    const resolved = {
      symbolName: symbol.getName(),
      symbolKey: symbolKeyForResolvedSymbol(this.sourceProject, symbol),
      target,
      targetSource: target === null
        ? null
        : sourceReferenceForNode(
          this.sourceProject,
          target.declaration.getSourceFile(),
          target.declaration,
        ),
    } satisfies ProductArchitectureResolvedSymbol;
    this.#values.set(symbol, resolved);
    return resolved;
  }
}

function targetDeclarationForSymbol(
  sourceProject: SourceProject,
  symbol: ts.Symbol,
): ProductArchitectureTargetDeclaration | null {
  for (const declaration of symbol.declarations ?? []) {
    const identity = sourceProject.sourceFileIdentity(declaration.getSourceFile());
    if (identity !== null) {
      return { declaration, identity };
    }
  }
  return null;
}

function symbolForCallCallee(
  checker: ts.TypeChecker,
  expression: ts.Expression,
): ts.Symbol | null {
  let symbol: ts.Symbol | undefined;
  if (ts.isPropertyAccessExpression(expression)) {
    symbol = checker.getSymbolAtLocation(expression.name) ??
      checker.getSymbolAtLocation(expression);
  } else if (
    ts.isElementAccessExpression(expression) &&
    expression.argumentExpression !== undefined
  ) {
    symbol = checker.getSymbolAtLocation(expression.argumentExpression) ??
      checker.getSymbolAtLocation(expression);
  } else {
    symbol = checker.getSymbolAtLocation(expression);
  }
  return symbol === undefined ? null : resolveAlias(checker, symbol);
}

function symbolKeyForResolvedSymbol(
  sourceProject: SourceProject,
  symbol: ts.Symbol,
): string {
  try {
    return canonicalSourceSymbolKey(
      sourceProject.checker.getFullyQualifiedName(symbol),
    );
  } catch {
    return symbol.getName();
  }
}

function callSiteSummary(
  fromArea: string,
  functionName: string | null,
  calleeName: string,
  targetPackageId: string | null,
  targetArea: string | null,
  targetFilePath: string | null,
  crossesArea: boolean,
): string {
  const owner = functionName ?? fromArea;
  if (targetFilePath === null) {
    return `${owner} calls ${calleeName}; Atlas could not resolve a declaration target.`;
  }
  const target = targetArea ?? targetPackageId ?? targetFilePath;
  return `${owner} calls ${calleeName} in ${target}${crossesArea ? " across semantic-runtime areas" : ""}.`;
}

function callDependencySummary(
  first: ProductArchitectureCallDependencyRow | ProductArchitectureCallSiteRow,
  callCount: number,
  calleeNameCount: number,
): string {
  if (first.targetFilePath === null) {
    return `${first.fromFilePath} has ${callCount} unresolved call-site row(s) across ${calleeNameCount} callee name(s).`;
  }
  return `${first.fromFilePath} calls ${first.targetFilePath} through ${callCount} call-site row(s) across ${calleeNameCount} callee name(s).`;
}

function productArchitectureRollup(
  areas: readonly ProductArchitectureAreaRow[],
  modules: readonly ProductArchitectureModuleRow[],
  declarations: readonly ProductArchitectureDeclarationRow[],
  cycles: readonly ProductArchitectureCycleRow[],
  classSurfaces: readonly ProductArchitectureClassSurfaceRow[],
  functionSurfaces: readonly ProductArchitectureFunctionSurfaceRow[],
  callSites: readonly ProductArchitectureCallSiteRow[],
  callDependencies: readonly ProductArchitectureCallDependencyRow[],
  symbolReferences: readonly ProductArchitectureSymbolReferenceRow[],
  symbolDependencies: readonly ProductArchitectureSymbolDependencyRow[],
  dependencies: readonly ProductArchitectureDependencyRow[],
  areaDependencies: readonly ProductArchitectureAreaDependencyRow[],
): ProductArchitectureRollup {
  return {
    sourceFileCount: modules.length,
    areaCount: areas.length,
    moduleCount: modules.length,
    declarationCount: declarations.length,
    exportedDeclarationCount: declarations.filter((row) => row.exported).length,
    classCount: declarations.filter((row) => row.declarationKind === "class")
      .length,
    classSurfaceCount: classSurfaces.length,
    functionSurfaceCount: functionSurfaces.length,
    callSiteCount: callSites.length,
    localCallSiteCount: callSites.filter((row) => row.local).length,
    crossAreaCallSiteCount: callSites.filter((row) => row.crossesArea).length,
    callDependencyCount: callDependencies.length,
    symbolReferenceCount: symbolReferences.length,
    localSymbolReferenceCount: symbolReferences.filter((row) => row.local).length,
    crossAreaSymbolReferenceCount: symbolReferences.filter((row) => row.crossesArea)
      .length,
    symbolDependencyCount: symbolDependencies.length,
    dependencyCount: dependencies.length,
    crossAreaDependencyCount: dependencies.filter((row) => row.crossesArea)
      .length,
    areaDependencyCount: areaDependencies.length,
    cycleCount: cycles.length,
    crossAreaCycleCount: cycles.filter((row) => row.crossesArea).length,
    unresolvedRelativeDependencyCount: dependencies.filter(
      (row) => row.relative && !row.resolved,
    ).length,
    byArea: Object.fromEntries(
      areas.map((row) => [
        row.area,
        {
          files: row.fileCount,
          declarations: row.declarationCount,
          exportedDeclarations: row.exportedDeclarationCount,
          crossAreaDependenciesOut: row.crossAreaDependencyOutCount,
          crossAreaDependenciesIn: row.crossAreaDependencyInCount,
        } satisfies ProductArchitectureAreaCounts,
      ]),
    ),
  };
}

function areaForFilePath(filePath: string): string {
  const relative = filePath.startsWith(semanticRuntimeSrcPrefix)
    ? filePath.slice(semanticRuntimeSrcPrefix.length)
    : filePath;
  const slashIndex = relative.indexOf("/");
  return slashIndex === -1 ? rootArea : relative.slice(0, slashIndex);
}

function dependencySummary(
  fromArea: string,
  moduleSpecifier: string,
  target: ResolvedImportTarget,
  crossesArea: boolean,
): string {
  if (!target.resolved) {
    return `${fromArea} imports unresolved relative module ${moduleSpecifier}.`;
  }
  if (!target.local) {
    return `${fromArea} imports ${moduleSpecifier}.`;
  }
  return `${fromArea} imports ${target.toArea}${
    crossesArea ? " across semantic-runtime areas" : ""
  }.`;
}

function sourceReferenceForFile(
  entry: SemanticRuntimeSourceFile,
): ProductArchitectureSourceReference {
  const endPosition = entry.sourceFile.getLineAndCharacterOfPosition(
    entry.sourceFile.text.length,
  );
  return {
    filePath: entry.filePath,
    startLine: 1,
    startCharacter: 1,
    endLine: endPosition.line + 1,
    endCharacter: endPosition.character + 1,
  };
}

function sourceReferenceFromSpan(
  filePath: string,
  span: SourceSpan,
): ProductArchitectureSourceReference {
  return {
    filePath,
    startLine: span.startLine,
    startCharacter: span.startCharacter,
    endLine: span.endLine,
    endCharacter: span.endCharacter,
  };
}

function sourceReferenceForEntryNode(
  entry: SemanticRuntimeSourceFile,
  node: ts.Node,
): ProductArchitectureSourceReference {
  const start = node.getStart(entry.sourceFile);
  const end = node.getEnd();
  const startPosition = entry.sourceFile.getLineAndCharacterOfPosition(start);
  const endPosition = entry.sourceFile.getLineAndCharacterOfPosition(end);
  return {
    filePath: entry.filePath,
    startLine: startPosition.line + 1,
    startCharacter: startPosition.character + 1,
    endLine: endPosition.line + 1,
    endCharacter: endPosition.character + 1,
  };
}

function lineCountForSource(source: ProductArchitectureSourceReference): number {
  return Math.max(1, source.endLine - source.startLine + 1);
}

function productArchitectureDeclarationKey(row: SourceDeclarationRow): string {
  return `${row.file.repoPath}:${row.kind}:${row.name ?? ""}:${row.span.start}`;
}

function stronglyConnectedComponents(
  nodes: readonly string[],
  edgesFrom: (node: string) => readonly string[],
): readonly string[][] {
  const indexByNode = new Map<string, number>();
  const lowLinkByNode = new Map<string, number>();
  const stack: string[] = [];
  const onStack = new Set<string>();
  const components: string[][] = [];
  let nextIndex = 0;

  const visit = (node: string): void => {
    indexByNode.set(node, nextIndex);
    lowLinkByNode.set(node, nextIndex);
    nextIndex += 1;
    stack.push(node);
    onStack.add(node);

    for (const target of edgesFrom(node)) {
      if (!indexByNode.has(target)) {
        visit(target);
        lowLinkByNode.set(
          node,
          Math.min(lowLinkByNode.get(node)!, lowLinkByNode.get(target)!),
        );
      } else if (onStack.has(target)) {
        lowLinkByNode.set(
          node,
          Math.min(lowLinkByNode.get(node)!, indexByNode.get(target)!),
        );
      }
    }

    if (lowLinkByNode.get(node) !== indexByNode.get(node)) {
      return;
    }
    const component: string[] = [];
    while (stack.length > 0) {
      const entry = stack.pop()!;
      onStack.delete(entry);
      component.push(entry);
      if (entry === node) {
        break;
      }
    }
    components.push(component);
  };

  for (const node of nodes) {
    if (!indexByNode.has(node)) {
      visit(node);
    }
  }
  return components;
}
