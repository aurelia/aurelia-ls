import type { SourceRange } from "../locus.js";
import type { NavigationRelation } from "../navigation.js";
import type {
  AtlasSelfEnumMappingRow,
  AtlasSelfEnumReferenceRow,
  AtlasSelfEnumRow,
  AtlasSelfEnumValueSpaceRow,
} from "./self-enums.js";
import type {
  AtlasSelfContractStringRow,
  AtlasSelfStringLiteralRow,
} from "./self-strings.js";

export type {
  AtlasSelfEnumMappingRow,
  AtlasSelfEnumMemberRow,
  AtlasSelfEnumReferenceRow,
  AtlasSelfEnumRow,
  AtlasSelfEnumValueSpaceRow,
} from "./self-enums.js";
export type {
  AtlasSelfContractStringRow,
  AtlasSelfStringLiteralRow,
  AtlasSelfStringOccurrence,
} from "./self-strings.js";

/** Schema marker for the Atlas self-analysis source model. */
export const ATLAS_SELF_ANALYSIS_VERSION = "atlas-self-analysis-v1";

/** Source-level interface/type row surface. */
export type AtlasSelfRowSurfaceRole =
  | "row"
  | "relationship-row"
  | "filter"
  | "classification"
  | "basis-transition"
  | "navigation-contract";

/** Source-level interface/type row surface. */
export interface AtlasSelfRowSurfaceRow {
  /** Stable row id. */
  readonly id: string;
  /** Package that owns the declaration. */
  readonly packageId: string;
  /** Interface/type declaration name. */
  readonly name: string;
  /** Declaration kind. */
  readonly declarationKind: "interface" | "type-alias";
  /** True when exported from the source module. */
  readonly exported: boolean;
  /** Axis/property names found on the row surface. */
  readonly fields: readonly string[];
  /** Axis/property type text keyed by field. */
  readonly fieldTypes: Readonly<Record<string, string>>;
  /** True when the surface carries a relation axis. */
  readonly hasRelation: boolean;
  /** True when the surface carries a mechanism axis. */
  readonly hasMechanism: boolean;
  /** True when the surface carries a phase axis. */
  readonly hasPhase: boolean;
  /** True when the surface carries source provenance. */
  readonly hasSource: boolean;
  /** True when the surface carries from/to endpoints. */
  readonly hasEndpoints: boolean;
  /** Exact ontology class for this shape. */
  readonly surfaceKind: "row" | "relationship";
  /** Functional role this surface plays inside Atlas. */
  readonly surfaceRole: AtlasSelfRowSurfaceRole;
  /** Exact declaration source. */
  readonly source: SourceRange;
  /** Compact row summary. */
  readonly summary: string;
}

/** Source-level interface/type surface with relationship axes. */
export interface AtlasSelfRelationshipSurfaceRow
  extends AtlasSelfRowSurfaceRow {
  /** Exact ontology class for this shape. */
  readonly surfaceKind: "relationship";
}

/** Source-level class surface that makes Atlas OOP shape visible to atlas.self. */
export interface AtlasSelfClassSurfaceRow {
  /** Stable row id. */
  readonly id: string;
  /** Package that owns the class declaration. */
  readonly packageId: string;
  /** Class declaration name. */
  readonly name: string;
  /** True when exported from the source module. */
  readonly exported: boolean;
  /** True when declared abstract. */
  readonly abstract: boolean;
  /** Source file that owns the class. */
  readonly filePath: string;
  /** Declaration span line count. */
  readonly lineCount: number;
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
  /** Number of constructor declarations. */
  readonly constructorCount: number;
  /** Number of instance and static method declarations. */
  readonly methodCount: number;
  /** Number of field/accessor/property declarations, including constructor parameter properties. */
  readonly propertyCount: number;
  /** Exact declaration source. */
  readonly source: SourceRange;
  /** Compact row summary. */
  readonly summary: string;
}

/** Source-level function or method declaration surface. */
export interface AtlasSelfFunctionSurfaceRow {
  /** Stable row id. */
  readonly id: string;
  /** Package that owns the function declaration. */
  readonly packageId: string;
  /** Function or method name. Class methods use ClassName.methodName. */
  readonly name: string;
  /** Declaration family. */
  readonly functionKind: "top-level" | "class-method";
  /** Owning class name for class methods. */
  readonly className: string | null;
  /** True when exported from the source module, or when the owning class is exported for methods. */
  readonly exported: boolean;
  /** Source file that owns the declaration. */
  readonly filePath: string;
  /** Declaration span line count. */
  readonly lineCount: number;
  /** Direct call-expression count inside this declaration, excluding nested executable declarations. */
  readonly callCount: number;
  /** Unique locally resolved call targets observed inside this declaration. */
  readonly uniqueCallTargetCount: number;
  /** Exact declaration source. */
  readonly source: SourceRange;
  /** Compact row summary. */
  readonly summary: string;
}

/** Source file module surface with coarse size and top-level syntax counts. */
export type AtlasSelfSourceFileModuleShape =
  | "barrel"
  | "catalog"
  | "contract"
  | "implementation"
  | "mixed";

/** Source file module surface with coarse size, shape, and top-level syntax counts. */
export interface AtlasSelfSourceFileSurfaceRow {
  /** Stable row id. */
  readonly id: string;
  /** Package that owns the source file. */
  readonly packageId: string;
  /** Top-level Atlas source area. */
  readonly area: string;
  /** Source file path. */
  readonly filePath: string;
  /** Full file line count. */
  readonly lineCount: number;
  /** Coarse file shape for separating static catalogs/contracts from implementation pressure. */
  readonly moduleShape: AtlasSelfSourceFileModuleShape;
  /** Top-level statement count. */
  readonly statementCount: number;
  /** Top-level import declaration count. */
  readonly importCount: number;
  /** Resolved local import/export edges leaving this file. */
  readonly outgoingLocalImportCount: number;
  /** Resolved local import/export edges entering this file. */
  readonly incomingLocalImportCount: number;
  /** Resolved outgoing edges that cross Atlas source areas. */
  readonly crossAreaOutgoingImportCount: number;
  /** Top-level export declaration or exported declaration count. */
  readonly exportCount: number;
  /** Top-level declaration statement count. */
  readonly declarationCount: number;
  /** Top-level interface/type/enum declaration count. */
  readonly typeDeclarationCount: number;
  /** Top-level class/function/variable declaration count. */
  readonly valueDeclarationCount: number;
  /** Top-level variable statements whose initializer is a large array/object literal. */
  readonly largeLiteralCount: number;
  /** Exact file source range. */
  readonly source: SourceRange;
  /** Compact row summary. */
  readonly summary: string;
}

/** Runtime function that answers one lens from the engine switch. */
export interface AtlasSelfLensImplementationRow {
  /** Stable row id. */
  readonly id: string;
  /** LensId member name from the engine switch. */
  readonly lensMember: string;
  /** Lens id value when it can be joined to the runtime enum. */
  readonly lensId: string | null;
  /** Answer function called by the engine. */
  readonly implementationFunction: string;
  /** Source file that owns the engine switch row. */
  readonly filePath: string;
  /** Functions reachable through local function calls from the implementation function. */
  readonly reachableFunctions: readonly string[];
  /** Exact engine switch case source. */
  readonly source: SourceRange;
  /** Compact row summary. */
  readonly summary: string;
}

/** Projection branch observed in runtime source. */
export interface AtlasSelfProjectionBranchRow {
  /** Stable row id. */
  readonly id: string;
  /** Projection id string matched by the branch. */
  readonly projection: string;
  /** Function that owns the branch. */
  readonly functionName: string;
  /** Source file that owns the branch. */
  readonly filePath: string;
  /** Branch syntax shape. */
  readonly branchKind: "switch-case" | "if-equals";
  /** Lens ids whose implementation path reaches this branch. */
  readonly lensIds: readonly string[];
  /** Exact branch source. */
  readonly source: SourceRange;
  /** Compact row summary. */
  readonly summary: string;
}

/** Continuation object literal observed in runtime source. */
export interface AtlasSelfContinuationRow {
  /** Stable row id. */
  readonly id: string;
  /** Continuation id property when static. */
  readonly continuationId: string | null;
  /** ContinuationKind member name when static. */
  readonly kind: string | null;
  /** ContinuationPriority member name when static. */
  readonly priority: string | null;
  /** Function that owns the continuation object. */
  readonly functionName: string;
  /** Source file that owns the continuation object. */
  readonly filePath: string;
  /** Target lens id/member when statically visible. */
  readonly targetLens: string | null;
  /** Target projection when statically visible. */
  readonly targetProjection: string | null;
  /** NavigationRelation enum member or value when statically visible. */
  readonly routeRelationMember: string | null;
  /** Lens ids whose implementation path reaches this continuation. */
  readonly lensIds: readonly string[];
  /** Exact continuation object source. */
  readonly source: SourceRange;
  /** Compact row summary. */
  readonly summary: string;
}

/** Declared semantic route from Atlas framework route topology. */
export interface AtlasSelfSemanticRouteRow {
  /** Stable row id. */
  readonly id: string;
  /** Domain route declaration id. */
  readonly semanticRouteId: string;
  /** Generic navigation grammar route id this route follows. */
  readonly navigationSpecId: string;
  /** Target endpoint declaration id. */
  readonly targetEndpointId: string;
  /** Target lens id. */
  readonly targetLens: string;
  /** Target projection id. */
  readonly targetProjection: string;
  /** NavigationRelation value carried by the route declaration. */
  readonly relation: NavigationRelation;
  /** NavigationRelation member name when visible. */
  readonly relationMember: string | null;
  /** Basis values carried by this declared route. */
  readonly basis: readonly string[];
  /** Exact route declaration source when visible. */
  readonly source?: SourceRange;
  /** Compact route summary. */
  readonly summary: string;
}

/** Relative module dependency observed in Atlas source. */
export interface AtlasSelfModuleDependencyRow {
  /** Stable row id. */
  readonly id: string;
  /** Importing source file. */
  readonly fromFile: string;
  /** Top-level Atlas source area for the importer. */
  readonly fromArea: string;
  /** Module specifier text. */
  readonly moduleSpecifier: string;
  /** Best-effort resolved target file in repo-relative Atlas source space. */
  readonly toFile: string | null;
  /** Top-level Atlas source area for the target. */
  readonly toArea: string | null;
  /** True when the edge crosses top-level Atlas source areas. */
  readonly crossesArea: boolean;
  /** Exact import/export source. */
  readonly source: SourceRange;
  /** Compact row summary. */
  readonly summary: string;
}

/** Substrate reader, builder, and schema declaration observed in Atlas source. */
export interface AtlasSelfSubstrateSurfaceRow {
  /** Stable row id. */
  readonly id: string;
  /** Surface kind. */
  readonly kind: "schema-version" | "reader" | "builder";
  /** Declaration name. */
  readonly name: string;
  /** Source file that owns the declaration. */
  readonly filePath: string;
  /** Static string value for schema/version constants when visible. */
  readonly value: string | null;
  /** Exact declaration source. */
  readonly source: SourceRange;
  /** Compact row summary. */
  readonly summary: string;
}

/** Exact pressure class for one Atlas axis/coherence row. */
export const enum AtlasSelfAxisPressureKind {
  /** Enum members are unused through Enum.Member references or reappear as raw strings. */
  EnumUsage = "enum-usage",
  /** A row/filter surface carries a known axis field as plain string. */
  StringlyAxisField = "stringly-axis-field",
  /** A relationship-like surface lacks one of the stabilizing relation/source/endpoint fields. */
  RelationshipSurfaceGap = "relationship-surface-gap",
  /** A function derives one axis from another axis or switch surface. */
  AxisMapperFunction = "axis-mapper-function",
  /** Multiple row surfaces carry the same axis through different type representations. */
  ParallelAxisSurface = "parallel-axis-surface",
  /** A continuation points at a projection that is not valid for a reachable target lens. */
  ContinuationTargetGap = "continuation-target-gap",
}

/** Source-backed row explaining where Atlas axis/taxonomy pressure exists. */
export interface AtlasSelfAxisPressureRow {
  /** Stable row id. */
  readonly id: string;
  /** Pressure class. */
  readonly kind: AtlasSelfAxisPressureKind;
  /** Axis or axis family involved. */
  readonly axis: string;
  /** Exact row field label when this pressure is field-backed. */
  readonly axisField: string | null;
  /** Typed value space carried by the field or mapper output when visible. */
  readonly valueSpace: string | null;
  /** Stable axis identity that keeps field labels and value spaces distinct. */
  readonly axisId: string;
  /** Declaration/function/surface that owns the pressure. */
  readonly sourceName: string;
  /** Source file that owns this pressure row. */
  readonly filePath: string;
  /** Source axes or inputs when visible. */
  readonly sourceAxes: readonly string[];
  /** Target axes or output representations when visible. */
  readonly targetAxes: readonly string[];
  /** Exact signals that justify the row. */
  readonly signals: readonly string[];
  /** Coarse maintenance pressure for sorting and orientation. */
  readonly pressure: "low" | "medium" | "high";
  /** Exact source range for the owning declaration/function/surface. */
  readonly source: SourceRange;
  /** Compact row summary. */
  readonly summary: string;
}

/** Compact self-analysis rollup. */
export interface AtlasSelfAnalysis {
  /** Schema marker. */
  readonly version: typeof ATLAS_SELF_ANALYSIS_VERSION;
  /** Number of analyzed source files. */
  readonly sourceFileCount: number;
  /** Enum declaration rows. */
  readonly enums: readonly AtlasSelfEnumRow[];
  /** Exact Enum.Member reference rows. */
  readonly enumReferences: readonly AtlasSelfEnumReferenceRow[];
  /** Enum value-space rows. */
  readonly enumValueSpaces: readonly AtlasSelfEnumValueSpaceRow[];
  /** Enum-to-enum mapping rows. */
  readonly enumMappings: readonly AtlasSelfEnumMappingRow[];
  /** Grouped string literal rows. */
  readonly strings: readonly AtlasSelfStringLiteralRow[];
  /** Structural row/interface/type surfaces. */
  readonly rowSurfaces: readonly AtlasSelfRowSurfaceRow[];
  /** Relationship-like row surfaces. */
  readonly relationshipSurfaces: readonly AtlasSelfRelationshipSurfaceRow[];
  /** Class declaration surfaces. */
  readonly classSurfaces: readonly AtlasSelfClassSurfaceRow[];
  /** Function and method declaration surfaces. */
  readonly functionSurfaces: readonly AtlasSelfFunctionSurfaceRow[];
  /** Source file module surfaces. */
  readonly sourceFileSurfaces: readonly AtlasSelfSourceFileSurfaceRow[];
  /** Engine lens implementation rows. */
  readonly lensImplementations: readonly AtlasSelfLensImplementationRow[];
  /** Runtime projection branches. */
  readonly projectionBranches: readonly AtlasSelfProjectionBranchRow[];
  /** Runtime continuation object literals. */
  readonly continuations: readonly AtlasSelfContinuationRow[];
  /** Declared semantic framework route topology rows. */
  readonly semanticRoutes: readonly AtlasSelfSemanticRouteRow[];
  /** Relative module dependency rows. */
  readonly moduleDependencies: readonly AtlasSelfModuleDependencyRow[];
  /** Substrate reader, builder, and schema surface rows. */
  readonly substrateSurfaces: readonly AtlasSelfSubstrateSurfaceRow[];
  /** Contract-bearing string rows. */
  readonly contractStrings: readonly AtlasSelfContractStringRow[];
  /** Exact rows that identify axis, mapper, and stringly-surface pressure. */
  readonly axisPressure: readonly AtlasSelfAxisPressureRow[];
  /** Rollup counts. */
  readonly rollup: {
    readonly enumCount: number;
    readonly enumMemberCount: number;
    readonly unreferencedEnumMemberCount: number;
    readonly enumReferenceCount: number;
    readonly enumRawValueOccurrenceCount: number;
    readonly enumValueSpaceCount: number;
    readonly enumMappingCount: number;
    readonly stringValueCount: number;
    readonly magicStringValueCount: number;
    readonly rowSurfaceCount: number;
    readonly relationshipSurfaceCount: number;
    readonly relationshipSurfacesWithRelation: number;
    readonly relationshipSurfacesWithMechanism: number;
    readonly relationshipSurfacesWithPhase: number;
    readonly classSurfaceCount: number;
    readonly classMethodCount: number;
    readonly classPropertyCount: number;
    readonly functionSurfaceCount: number;
    readonly topLevelFunctionCount: number;
    readonly classMethodFunctionCount: number;
    readonly sourceFileSurfaceCount: number;
    readonly sourceFileLineCount: number;
    readonly lensImplementationCount: number;
    readonly projectionBranchCount: number;
    readonly continuationCount: number;
    readonly semanticRouteCount: number;
    readonly moduleDependencyCount: number;
    readonly crossAreaModuleDependencyCount: number;
    readonly substrateSurfaceCount: number;
    readonly contractStringCount: number;
    readonly axisPressureCount: number;
  };
}
