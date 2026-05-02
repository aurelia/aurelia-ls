import ts from "typescript";

import type { SourceProject, SourceSpan } from "../../source/index.js";
import { LensCatalog } from "../lens.js";
import type { SourceRange } from "../locus.js";

/** Schema marker for the Atlas self-analysis source index. */
export const ATLAS_SELF_ANALYSIS_VERSION = "atlas-self-analysis-v1";

/** Role assigned to one string literal occurrence. */
export const enum AtlasSelfStringRole {
  /** Module specifier in an import/export declaration. */
  ModuleSpecifier = "module-specifier",
  /** String-valued enum member initializer. */
  EnumMemberValue = "enum-member-value",
  /** Literal type such as `"summary"`. */
  LiteralType = "literal-type",
  /** Switch case label. */
  CaseLabel = "case-label",
  /** Object property value. */
  PropertyValue = "property-value",
  /** Call/new expression argument. */
  Argument = "argument",
  /** Equality/comparison operand. */
  Comparison = "comparison",
  /** Template literal with no substitution. */
  TemplateLiteral = "template-literal",
  /** Other string literal occurrence. */
  Other = "other",
}

/** Enum member plus local use pressure. */
export interface AtlasSelfEnumMemberRow {
  /** Member name. */
  readonly name: string;
  /** Member initializer text/value when static. */
  readonly value: string | number | null;
  /** Property-access references such as EnumName.Member outside the declaration. */
  readonly referenceCount: number;
  /** String literal occurrences that duplicate this member's string value outside enum declarations/imports. */
  readonly literalReuseCount: number;
  /** Exact member declaration source. */
  readonly source: SourceRange;
}

/** Enum declaration row. */
export interface AtlasSelfEnumRow {
  /** Stable row id. */
  readonly id: string;
  /** Package that owns the enum declaration. */
  readonly packageId: string;
  /** Enum declaration name. */
  readonly name: string;
  /** True when the enum is exported from its source module. */
  readonly exported: boolean;
  /** True when declared as a const enum. */
  readonly constEnum: boolean;
  /** Number of enum members. */
  readonly memberCount: number;
  /** Members with at least one property-access reference. */
  readonly referencedMemberCount: number;
  /** Members with no property-access reference. */
  readonly unreferencedMemberCount: number;
  /** String literal occurrences that duplicate string-valued member values outside enum declarations/imports. */
  readonly literalReuseCount: number;
  /** Exact enum declaration source. */
  readonly source: SourceRange;
  /** Member rows. */
  readonly members: readonly AtlasSelfEnumMemberRow[];
  /** Compact row summary. */
  readonly summary: string;
}

/** One grouped string literal value. */
export interface AtlasSelfStringLiteralRow {
  /** Stable row id. */
  readonly id: string;
  /** Literal text value. */
  readonly value: string;
  /** Total occurrence count after grouping. */
  readonly count: number;
  /** Counts by string role. */
  readonly roles: Readonly<Record<string, number>>;
  /** Owning package ids where this literal appears. */
  readonly packageIds: readonly string[];
  /** Source files where this literal appears. */
  readonly files: readonly string[];
  /** First occurrence source. */
  readonly firstSource: SourceRange;
  /** Enum members that declare this exact string value. */
  readonly declaredByEnumMembers: readonly string[];
  /** True when this value also appears outside enum declarations/imports. */
  readonly reusedOutsideDeclaration: boolean;
  /** Compact row summary. */
  readonly summary: string;
}

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
  /** Property names. */
  readonly properties: readonly string[];
  /** Number of constructor declarations. */
  readonly constructorCount: number;
  /** Number of instance and static method declarations. */
  readonly methodCount: number;
  /** Number of field/accessor/property declarations. */
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
  /** Exact declaration source. */
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
  /** NavigationRelation enum member name when statically visible. */
  readonly routeRelationMember: string | null;
  /** Lens ids whose implementation path reaches this continuation. */
  readonly lensIds: readonly string[];
  /** Exact continuation object source. */
  readonly source: SourceRange;
  /** Compact row summary. */
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

/** Heavyweight index/cache/provenance surface observed in Atlas source. */
export interface AtlasSelfIndexProvenanceRow {
  /** Stable row id. */
  readonly id: string;
  /** Surface kind. */
  readonly kind: "schema-version" | "reader" | "builder" | "warmup" | "cache";
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

/** String literal grouped by likely contract-bearing role. */
export interface AtlasSelfContractStringRow {
  /** Stable row id. */
  readonly id: string;
  /** Literal value. */
  readonly value: string;
  /** Contract-bearing classes assigned to this value. */
  readonly classes: readonly string[];
  /** Number of grouped literal occurrences. */
  readonly count: number;
  /** Enum members that declare this string value. */
  readonly declaredByEnumMembers: readonly string[];
  /** Source files where this value appears. */
  readonly files: readonly string[];
  /** First occurrence source. */
  readonly firstSource: SourceRange;
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
export interface AtlasSelfAnalysisIndex {
  /** Schema marker. */
  readonly version: typeof ATLAS_SELF_ANALYSIS_VERSION;
  /** Number of analyzed source files. */
  readonly sourceFileCount: number;
  /** Enum declaration rows. */
  readonly enums: readonly AtlasSelfEnumRow[];
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
  /** Engine lens implementation rows. */
  readonly lensImplementations: readonly AtlasSelfLensImplementationRow[];
  /** Runtime projection branches. */
  readonly projectionBranches: readonly AtlasSelfProjectionBranchRow[];
  /** Runtime continuation object literals. */
  readonly continuations: readonly AtlasSelfContinuationRow[];
  /** Relative module dependency rows. */
  readonly moduleDependencies: readonly AtlasSelfModuleDependencyRow[];
  /** Index/cache/schema provenance rows. */
  readonly indexProvenance: readonly AtlasSelfIndexProvenanceRow[];
  /** Contract-bearing string rows. */
  readonly contractStrings: readonly AtlasSelfContractStringRow[];
  /** Exact rows that identify axis, mapper, and stringly-surface pressure. */
  readonly axisPressure: readonly AtlasSelfAxisPressureRow[];
  /** Rollup counts. */
  readonly rollup: {
    readonly enumCount: number;
    readonly enumMemberCount: number;
    readonly unreferencedEnumMemberCount: number;
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
    readonly lensImplementationCount: number;
    readonly projectionBranchCount: number;
    readonly continuationCount: number;
    readonly moduleDependencyCount: number;
    readonly crossAreaModuleDependencyCount: number;
    readonly indexProvenanceCount: number;
    readonly contractStringCount: number;
    readonly axisPressureCount: number;
  };
}

interface MutableEnumMember {
  readonly name: string;
  readonly value: string | number | null;
  referenceCount: number;
  literalReuseCount: number;
  readonly source: SourceRange;
}

interface MutableEnumRow {
  readonly id: string;
  readonly packageId: string;
  readonly name: string;
  readonly exported: boolean;
  readonly constEnum: boolean;
  readonly source: SourceRange;
  readonly members: MutableEnumMember[];
}

interface StringOccurrence {
  readonly value: string;
  readonly role: AtlasSelfStringRole;
  readonly packageId: string;
  readonly filePath: string;
  readonly source: SourceRange;
}

type FunctionDeclarationRow = AtlasSelfFunctionSurfaceRow;

interface FunctionCallEdge {
  readonly filePath: string;
  readonly fromFunction: string;
  readonly toFunction: string;
}

interface AxisCarrier {
  readonly row: AtlasSelfRowSurfaceRow;
  readonly field: string;
  readonly typeText: string;
  readonly axis: string;
  readonly valueSpace: string;
  readonly axisId: string;
}

interface MutableProjectionBranchRow
  extends Omit<AtlasSelfProjectionBranchRow, "lensIds" | "summary"> {}

interface MutableContinuationRow
  extends Omit<AtlasSelfContinuationRow, "lensIds" | "summary"> {}

const selfAnalysisByProject = new WeakMap<
  SourceProject,
  AtlasSelfAnalysisIndex
>();

/** Read or build the Atlas self-analysis source index for the current Program epoch. */
export function readAtlasSelfAnalysis(
  /** Hot source project owned by the runtime. */
  sourceProject: SourceProject,
): AtlasSelfAnalysisIndex {
  const cached = selfAnalysisByProject.get(sourceProject);
  if (cached !== undefined) {
    return cached;
  }
  const index = buildAtlasSelfAnalysis(sourceProject);
  selfAnalysisByProject.set(sourceProject, index);
  return index;
}

function buildAtlasSelfAnalysis(
  sourceProject: SourceProject,
): AtlasSelfAnalysisIndex {
  return new AtlasSelfAnalysisBuilder(sourceProject).build();
}

class AtlasSelfAnalysisBuilder {
  readonly #sourceProject: SourceProject;
  readonly #enumRows: MutableEnumRow[] = [];
  readonly #enumRowsByName = new Map<string, MutableEnumRow[]>();
  readonly #stringOccurrences: StringOccurrence[] = [];
  readonly #rowSurfaces: AtlasSelfRowSurfaceRow[] = [];
  readonly #classSurfaces: AtlasSelfClassSurfaceRow[] = [];
  readonly #functionDeclarations: FunctionDeclarationRow[] = [];
  readonly #functionCallEdges: FunctionCallEdge[] = [];
  readonly #lensImplementationSeeds: Omit<
    AtlasSelfLensImplementationRow,
    "id" | "lensId" | "reachableFunctions" | "summary"
  >[] = [];
  readonly #projectionBranchSeeds: MutableProjectionBranchRow[] = [];
  readonly #continuationSeeds: MutableContinuationRow[] = [];
  readonly #moduleDependencies: AtlasSelfModuleDependencyRow[] = [];
  readonly #indexProvenance: AtlasSelfIndexProvenanceRow[] = [];
  readonly #axisMapperPressure: AtlasSelfAxisPressureRow[] = [];

  constructor(sourceProject: SourceProject) {
    this.#sourceProject = sourceProject;
  }

  build(): AtlasSelfAnalysisIndex {
    const sourceFiles = this.#sourceProject
      .ownedSourceFiles()
      .filter(
        (sourceFile) =>
          this.#sourceProject.packageForFileName(sourceFile.fileName)?.id ===
          "atlas",
      );

    for (const sourceFile of sourceFiles) {
      this.#collectSourceFile(sourceFile);
    }
    for (const sourceFile of sourceFiles) {
      this.#collectEnumReferences(sourceFile);
    }

    return this.#finalize(sourceFiles.length);
  }

  #collectSourceFile(sourceFile: ts.SourceFile): void {
    const packageId =
      this.#sourceProject.packageForFileName(sourceFile.fileName)?.id ??
      "unknown";
    const filePath =
      this.#sourceProject.sourceFileIdentity(sourceFile)?.repoPath ??
      sourceFile.fileName;
    this.#moduleDependencies.push(
      ...moduleDependencyRows(sourceFile, filePath),
    );
    this.#collectDeclarations(
      sourceFile,
      packageId,
      filePath,
      sourceFile,
      null,
      null,
    );
  }

  #collectDeclarations(
    sourceFile: ts.SourceFile,
    packageId: string,
    filePath: string,
    node: ts.Node,
    currentFunction: string | null,
    currentClass: string | null,
  ): void {
    if (ts.isFunctionDeclaration(node) && node.name !== undefined) {
      const functionName = node.name.text;
      this.#functionDeclarations.push(
        functionSurfaceForFunctionDeclaration(
          sourceFile,
          packageId,
          filePath,
          node,
        ),
      );
      this.#axisMapperPressure.push(
        ...axisMapperPressureForFunctionLike(
          sourceFile,
          filePath,
          functionName,
          node,
        ),
      );
      this.#indexProvenance.push(
        ...indexProvenanceForFunction(sourceFile, filePath, node),
      );
      ts.forEachChild(node, (child) =>
        this.#collectDeclarations(
          sourceFile,
          packageId,
          filePath,
          child,
          functionName,
          currentClass,
        ),
      );
      return;
    }
    if (ts.isClassDeclaration(node) && node.name !== undefined) {
      const className = node.name.text;
      this.#classSurfaces.push(
        classSurfaceForDeclaration(sourceFile, packageId, filePath, node),
      );
      ts.forEachChild(node, (child) =>
        this.#collectDeclarations(
          sourceFile,
          packageId,
          filePath,
          child,
          currentFunction,
          className,
        ),
      );
      return;
    }
    if (ts.isMethodDeclaration(node) && node.name !== undefined) {
      const methodName = memberNameText(node.name, sourceFile);
      const functionName =
        methodName === null
          ? null
          : currentClass === null
          ? methodName
          : `${currentClass}.${methodName}`;
      if (functionName !== null) {
        this.#functionDeclarations.push(
          functionSurfaceForMethodDeclaration(
            sourceFile,
            packageId,
            filePath,
            node,
            functionName,
            currentClass,
          ),
        );
        this.#axisMapperPressure.push(
          ...axisMapperPressureForFunctionLike(
            sourceFile,
            filePath,
            functionName,
            node,
          ),
        );
      }
      ts.forEachChild(node, (child) =>
        this.#collectDeclarations(
          sourceFile,
          packageId,
          filePath,
          child,
          functionName ?? currentFunction,
          currentClass,
        ),
      );
      return;
    }
    if (ts.isVariableStatement(node)) {
      this.#indexProvenance.push(
        ...indexProvenanceForVariableStatement(sourceFile, filePath, node),
      );
    }
    if (ts.isEnumDeclaration(node)) {
      this.#addEnumRow(
        enumRowForDeclaration(sourceFile, packageId, filePath, node),
      );
    }
    if (isStringLiteralLike(node)) {
      this.#stringOccurrences.push({
        value: node.text,
        role: stringRoleForNode(node),
        packageId,
        filePath,
        source: sourceRangeForNode(sourceFile, filePath, node),
      });
    }
    if (ts.isPropertyAccessExpression(node)) {
      // Counted in a second pass after every enum declaration in the project is indexed.
    } else if (ts.isCallExpression(node) && currentFunction !== null) {
      const calledFunction = calledFunctionName(node, currentClass);
      if (calledFunction !== null) {
        this.#functionCallEdges.push({
          filePath,
          fromFunction: currentFunction,
          toFunction: calledFunction,
        });
      }
      const continuation = continuationForHelperCall(
        sourceFile,
        filePath,
        currentFunction,
        node,
      );
      if (continuation !== null) {
        this.#continuationSeeds.push(continuation);
      }
    } else if (ts.isCaseClause(node)) {
      const implementation = lensImplementationSeedForCase(
        sourceFile,
        filePath,
        node,
      );
      if (implementation !== null) {
        this.#lensImplementationSeeds.push(implementation);
      }
    } else if (
      ts.isSwitchStatement(node) &&
      isProjectionExpression(node.expression)
    ) {
      this.#projectionBranchSeeds.push(
        ...projectionBranchesForSwitch(
          sourceFile,
          filePath,
          currentFunction,
          node,
        ),
      );
    } else if (ts.isBinaryExpression(node) && currentFunction !== null) {
      const projectionBranch = projectionBranchForBinaryExpression(
        sourceFile,
        filePath,
        currentFunction,
        node,
      );
      if (projectionBranch !== null) {
        this.#projectionBranchSeeds.push(projectionBranch);
      }
    } else if (ts.isObjectLiteralExpression(node) && currentFunction !== null) {
      const continuation = continuationForObjectLiteral(
        sourceFile,
        filePath,
        currentFunction,
        node,
      );
      if (continuation !== null) {
        this.#continuationSeeds.push(continuation);
      }
    } else if (ts.isInterfaceDeclaration(node)) {
      const row = rowSurfaceForInterface(sourceFile, packageId, filePath, node);
      if (row !== null) {
        this.#rowSurfaces.push(row);
      }
    } else if (ts.isTypeAliasDeclaration(node)) {
      const row = rowSurfaceForTypeAlias(sourceFile, packageId, filePath, node);
      if (row !== null) {
        this.#rowSurfaces.push(row);
      }
    }
    ts.forEachChild(node, (child) =>
      this.#collectDeclarations(
        sourceFile,
        packageId,
        filePath,
        child,
        currentFunction,
        currentClass,
      ),
    );
  }

  #addEnumRow(row: MutableEnumRow): void {
    this.#enumRows.push(row);
    const rows = this.#enumRowsByName.get(row.name) ?? [];
    rows.push(row);
    this.#enumRowsByName.set(row.name, rows);
  }

  #collectEnumReferences(sourceFile: ts.SourceFile): void {
    const collectReferences = (node: ts.Node): void => {
      if (ts.isPropertyAccessExpression(node)) {
        recordEnumMemberReference(this.#enumRowsByName, node);
      }
      ts.forEachChild(node, collectReferences);
    };
    collectReferences(sourceFile);
  }

  #finalize(sourceFileCount: number): AtlasSelfAnalysisIndex {
    const strings = stringRows(this.#stringOccurrences, this.#enumRows);
    for (const row of this.#enumRows) {
      for (const member of row.members) {
        if (typeof member.value !== "string") {
          continue;
        }
        member.literalReuseCount = this.#stringOccurrences.filter(
          (occurrence) =>
            occurrence.value === member.value &&
            isMagicStringRole(occurrence.role),
        ).length;
      }
    }
    const enums = this.#enumRows.map(finalizeEnumRow);
    const rowSurfaces = this.#rowSurfaces.sort(compareByName);
    const relationshipSurfaces = rowSurfaces.filter(isRelationshipSurface);
    const classSurfaces = this.#classSurfaces.sort(compareClassSurface);
    const functionSurfaces = this.#functionDeclarations.sort(
      compareFunctionSurface,
    );
    const lensImplementations = finalizeLensImplementations(
      this.#lensImplementationSeeds,
      this.#enumRows,
      this.#functionDeclarations,
      this.#functionCallEdges,
    );
    const projectionBranches = finalizeProjectionBranches(
      this.#projectionBranchSeeds,
      lensImplementations,
    );
    const continuations = finalizeContinuations(
      this.#continuationSeeds,
      lensImplementations,
    );
    const contractStrings = new AtlasSelfContractStringClassifier(
      strings,
      continuations,
      this.#indexProvenance,
    ).rows();
    const axisPressure = new AtlasSelfAxisPressureClassifier(
      enums,
      rowSurfaces,
      relationshipSurfaces,
      continuations,
      this.#axisMapperPressure,
    ).rows();
    const rollup = {
      enumCount: enums.length,
      enumMemberCount: enums.reduce((sum, row) => sum + row.memberCount, 0),
      unreferencedEnumMemberCount: enums.reduce(
        (sum, row) => sum + row.unreferencedMemberCount,
        0,
      ),
      stringValueCount: strings.length,
      magicStringValueCount: strings.filter(
        (row) => row.reusedOutsideDeclaration,
      ).length,
      rowSurfaceCount: rowSurfaces.length,
      relationshipSurfaceCount: relationshipSurfaces.length,
      relationshipSurfacesWithRelation: relationshipSurfaces.filter(
        (row) => row.hasRelation,
      ).length,
      relationshipSurfacesWithMechanism: relationshipSurfaces.filter(
        (row) => row.hasMechanism,
      ).length,
      relationshipSurfacesWithPhase: relationshipSurfaces.filter(
        (row) => row.hasPhase,
      ).length,
      classSurfaceCount: classSurfaces.length,
      classMethodCount: classSurfaces.reduce(
        (sum, row) => sum + row.methodCount,
        0,
      ),
      classPropertyCount: classSurfaces.reduce(
        (sum, row) => sum + row.propertyCount,
        0,
      ),
      functionSurfaceCount: functionSurfaces.length,
      topLevelFunctionCount: functionSurfaces.filter(
        (row) => row.functionKind === "top-level",
      ).length,
      classMethodFunctionCount: functionSurfaces.filter(
        (row) => row.functionKind === "class-method",
      ).length,
      lensImplementationCount: lensImplementations.length,
      projectionBranchCount: projectionBranches.length,
      continuationCount: continuations.length,
      moduleDependencyCount: this.#moduleDependencies.length,
      crossAreaModuleDependencyCount: this.#moduleDependencies.filter(
        (row) => row.crossesArea,
      ).length,
      indexProvenanceCount: this.#indexProvenance.length,
      contractStringCount: contractStrings.length,
      axisPressureCount: axisPressure.length,
    };

    return {
      version: ATLAS_SELF_ANALYSIS_VERSION,
      sourceFileCount,
      enums,
      strings,
      rowSurfaces,
      relationshipSurfaces,
      classSurfaces,
      functionSurfaces,
      lensImplementations,
      projectionBranches,
      continuations,
      moduleDependencies: this.#moduleDependencies.sort(
        compareModuleDependency,
      ),
      indexProvenance: this.#indexProvenance.sort(compareIndexProvenance),
      contractStrings,
      axisPressure,
      rollup,
    };
  }
}

function enumRowForDeclaration(
  sourceFile: ts.SourceFile,
  packageId: string,
  filePath: string,
  node: ts.EnumDeclaration,
): MutableEnumRow {
  const members = node.members.map((member) => ({
    name: member.name.getText(sourceFile),
    value: enumMemberValue(member),
    referenceCount: 0,
    literalReuseCount: 0,
    source: sourceRangeForNode(sourceFile, filePath, member),
  }));
  return {
    id: `atlas-self:enum:${packageId}:${filePath}:${node.name.text}`,
    packageId,
    name: node.name.text,
    exported: hasModifier(node, ts.SyntaxKind.ExportKeyword),
    constEnum: hasModifier(node, ts.SyntaxKind.ConstKeyword),
    source: sourceRangeForNode(sourceFile, filePath, node),
    members,
  };
}

function finalizeEnumRow(row: MutableEnumRow): AtlasSelfEnumRow {
  const members = row.members.map((member) => ({
    name: member.name,
    value: member.value,
    referenceCount: member.referenceCount,
    literalReuseCount: member.literalReuseCount,
    source: member.source,
  }));
  const referencedMemberCount = members.filter(
    (member) => member.referenceCount > 0,
  ).length;
  const literalReuseCount = members.reduce(
    (sum, member) => sum + member.literalReuseCount,
    0,
  );
  return {
    id: row.id,
    packageId: row.packageId,
    name: row.name,
    exported: row.exported,
    constEnum: row.constEnum,
    memberCount: members.length,
    referencedMemberCount,
    unreferencedMemberCount: members.length - referencedMemberCount,
    literalReuseCount,
    source: row.source,
    members,
    summary: `${row.name} declares ${members.length} member(s); ${
      members.length - referencedMemberCount
    } member(s) have no Enum.Member reference and ${literalReuseCount} matching magic string occurrence(s).`,
  };
}

function recordEnumMemberReference(
  enumRowsByName: ReadonlyMap<string, readonly MutableEnumRow[]>,
  node: ts.PropertyAccessExpression,
): void {
  const enumName = node.expression.getText();
  const memberName = node.name.text;
  const rows = enumRowsByName.get(enumName);
  if (rows === undefined) {
    return;
  }
  for (const row of rows) {
    const member = row.members.find((entry) => entry.name === memberName);
    if (member !== undefined) {
      member.referenceCount += 1;
    }
  }
}

function stringRows(
  occurrences: readonly StringOccurrence[],
  enums: readonly MutableEnumRow[],
): readonly AtlasSelfStringLiteralRow[] {
  const enumMembersByValue = new Map<string, string[]>();
  for (const enumRow of enums) {
    for (const member of enumRow.members) {
      if (typeof member.value !== "string") {
        continue;
      }
      const rows = enumMembersByValue.get(member.value) ?? [];
      rows.push(`${enumRow.name}.${member.name}`);
      enumMembersByValue.set(member.value, rows);
    }
  }
  const byValue = new Map<string, StringOccurrence[]>();
  for (const occurrence of occurrences) {
    const rows = byValue.get(occurrence.value) ?? [];
    rows.push(occurrence);
    byValue.set(occurrence.value, rows);
  }
  return [...byValue.entries()]
    .map(([value, rows]) => {
      const roles = countBy(rows, (row) => row.role);
      const files = uniqueSorted(rows.map((row) => row.filePath));
      const packageIds = uniqueSorted(rows.map((row) => row.packageId));
      const declaredByEnumMembers = enumMembersByValue.get(value) ?? [];
      const reusedOutsideDeclaration = rows.some((row) =>
        isMagicStringRole(row.role),
      );
      return {
        id: `atlas-self:string:${stableStringId(value)}`,
        value,
        count: rows.length,
        roles,
        packageIds,
        files,
        firstSource: rows[0]!.source,
        declaredByEnumMembers,
        reusedOutsideDeclaration,
        summary: `"${value}" appears ${rows.length} time(s) across ${files.length} file(s).`,
      };
    })
    .sort(
      (left, right) =>
        Number(right.reusedOutsideDeclaration) -
          Number(left.reusedOutsideDeclaration) ||
        right.count - left.count ||
        left.value.localeCompare(right.value),
    );
}

function rowSurfaceForInterface(
  sourceFile: ts.SourceFile,
  packageId: string,
  filePath: string,
  node: ts.InterfaceDeclaration,
): AtlasSelfRowSurfaceRow | null {
  const properties = node.members.filter(ts.isPropertySignature);
  const fieldTypes = Object.fromEntries(
    properties.flatMap((property) => {
      const name = propertyNameText(property.name, sourceFile);
      return name === null
        ? []
        : [[name, property.type?.getText(sourceFile) ?? "unknown"]];
    }),
  );
  return rowSurfaceRow(
    sourceFile,
    packageId,
    filePath,
    node.name.text,
    "interface",
    hasModifier(node, ts.SyntaxKind.ExportKeyword),
    fieldTypes,
    node,
  );
}

function rowSurfaceForTypeAlias(
  sourceFile: ts.SourceFile,
  packageId: string,
  filePath: string,
  node: ts.TypeAliasDeclaration,
): AtlasSelfRowSurfaceRow | null {
  if (!ts.isTypeLiteralNode(node.type)) {
    return null;
  }
  const fieldTypes = Object.fromEntries(
    node.type.members.filter(ts.isPropertySignature).flatMap((property) => {
      const name = propertyNameText(property.name, sourceFile);
      return name === null
        ? []
        : [[name, property.type?.getText(sourceFile) ?? "unknown"]];
    }),
  );
  return rowSurfaceRow(
    sourceFile,
    packageId,
    filePath,
    node.name.text,
    "type-alias",
    hasModifier(node, ts.SyntaxKind.ExportKeyword),
    fieldTypes,
    node,
  );
}

function rowSurfaceRow(
  sourceFile: ts.SourceFile,
  packageId: string,
  filePath: string,
  name: string,
  declarationKind: "interface" | "type-alias",
  exported: boolean,
  fieldTypes: Readonly<Record<string, string>>,
  node: ts.Node,
): AtlasSelfRowSurfaceRow | null {
  const fields = Object.keys(fieldTypes).sort((left, right) =>
    left.localeCompare(right),
  );
  const nameLooksStructural =
    /(Row|Value|Surface|Spec|Claim|Relationship|Admission|Materialization|Route|Edge|Atom)$/u.test(
      name,
    );
  const fieldLooksStructural = [
    "id",
    "summary",
    "source",
    "firstSource",
    "relation",
    "mechanism",
    "phase",
    "from",
    "to",
  ].some((field) => fields.includes(field));
  if (!nameLooksStructural && !fieldLooksStructural) {
    return null;
  }
  const hasRelation = fields.includes("relation");
  const hasMechanism = fields.includes("mechanism");
  const hasPhase = fields.includes("phase");
  const basisTransition = isBasisTransitionSurface(name, fieldTypes);
  const hasSource =
    fields.includes("source") ||
    fields.includes("firstSource") ||
    fields.includes("span") ||
    fields.includes("fromSpans");
  const hasEndpoints =
    fields.includes("from") && fields.includes("to") && !basisTransition;
  const surfaceKind =
    hasRelation || hasEndpoints || (hasMechanism && hasPhase)
      ? "relationship"
      : "row";
  const surfaceRole = rowSurfaceRole(name, surfaceKind, basisTransition);
  return {
    id: `atlas-self:${surfaceKind}-surface:${packageId}:${filePath}:${name}`,
    packageId,
    name,
    declarationKind,
    exported,
    fields,
    fieldTypes,
    hasRelation,
    hasMechanism,
    hasPhase,
    hasSource,
    hasEndpoints,
    surfaceKind,
    surfaceRole,
    source: sourceRangeForNode(sourceFile, filePath, node),
    summary: `${name} is a ${surfaceRole} surface with ${
      fields.length
    } field(s)${hasRelation ? " and relation" : ""}${
      hasMechanism ? ", mechanism" : ""
    }${hasPhase ? ", phase" : ""}.`,
  };
}

function isRelationshipSurface(
  row: AtlasSelfRowSurfaceRow,
): row is AtlasSelfRelationshipSurfaceRow {
  return row.surfaceKind === "relationship";
}

function rowSurfaceRole(
  name: string,
  surfaceKind: AtlasSelfRowSurfaceRow["surfaceKind"],
  basisTransition: boolean,
): AtlasSelfRowSurfaceRole {
  if (basisTransition) {
    return "basis-transition";
  }
  if (name.endsWith("Filters")) {
    return "filter";
  }
  if (name.endsWith("Classification")) {
    return "classification";
  }
  if (
    name.startsWith("Navigation") &&
    (name.endsWith("Claim") || name.endsWith("Spec"))
  ) {
    return "navigation-contract";
  }
  return surfaceKind === "relationship" ? "relationship-row" : "row";
}

function isBasisTransitionSurface(
  name: string,
  fieldTypes: Readonly<Record<string, string>>,
): boolean {
  return (
    name.endsWith("Transition") &&
    fieldTypes["from"]?.includes("BasisKind") === true &&
    fieldTypes["to"]?.includes("BasisKind") === true
  );
}

function classSurfaceForDeclaration(
  sourceFile: ts.SourceFile,
  packageId: string,
  filePath: string,
  node: ts.ClassDeclaration,
): AtlasSelfClassSurfaceRow {
  const methods = uniqueSorted(
    node.members
      .filter(ts.isMethodDeclaration)
      .filter((member) => !hasModifier(member, ts.SyntaxKind.StaticKeyword))
      .flatMap((member) => memberNameText(member.name, sourceFile) ?? []),
  );
  const staticMethods = uniqueSorted(
    node.members
      .filter(ts.isMethodDeclaration)
      .filter((member) => hasModifier(member, ts.SyntaxKind.StaticKeyword))
      .flatMap((member) => memberNameText(member.name, sourceFile) ?? []),
  );
  const accessors = uniqueSorted(
    node.members
      .filter(
        (
          member,
        ): member is ts.GetAccessorDeclaration | ts.SetAccessorDeclaration =>
          ts.isGetAccessor(member) || ts.isSetAccessor(member),
      )
      .flatMap((member) => memberNameText(member.name, sourceFile) ?? []),
  );
  const properties = uniqueSorted(
    node.members
      .filter(ts.isPropertyDeclaration)
      .flatMap((member) => memberNameText(member.name, sourceFile) ?? []),
  );
  const extendsType =
    heritageTypeTexts(node, ts.SyntaxKind.ExtendsKeyword)[0] ?? null;
  const implementsTypes = heritageTypeTexts(
    node,
    ts.SyntaxKind.ImplementsKeyword,
  );
  const constructorCount = node.members.filter(
    ts.isConstructorDeclaration,
  ).length;
  const methodCount = methods.length + staticMethods.length;
  const propertyCount = properties.length + accessors.length;
  return {
    id: `atlas-self:class:${packageId}:${filePath}:${node.name!.text}`,
    packageId,
    name: node.name!.text,
    exported: hasModifier(node, ts.SyntaxKind.ExportKeyword),
    abstract: hasModifier(node, ts.SyntaxKind.AbstractKeyword),
    filePath,
    extendsType,
    implementsTypes,
    methods,
    staticMethods,
    accessors,
    properties,
    constructorCount,
    methodCount,
    propertyCount,
    source: sourceRangeForNode(sourceFile, filePath, node),
    summary: `${
      node.name!.text
    } exposes ${methodCount} method(s), ${propertyCount} property/accessor surface(s), and ${constructorCount} constructor declaration(s).`,
  };
}

function functionSurfaceForFunctionDeclaration(
  sourceFile: ts.SourceFile,
  packageId: string,
  filePath: string,
  node: ts.FunctionDeclaration,
): AtlasSelfFunctionSurfaceRow {
  return {
    id: `atlas-self:function:${packageId}:${filePath}:${node.name!.text}`,
    packageId,
    name: node.name!.text,
    functionKind: "top-level",
    className: null,
    exported: hasModifier(node, ts.SyntaxKind.ExportKeyword),
    filePath,
    source: sourceRangeForNode(sourceFile, filePath, node),
    summary: `${node.name!.text} is a top-level function in ${filePath}.`,
  };
}

function functionSurfaceForMethodDeclaration(
  sourceFile: ts.SourceFile,
  packageId: string,
  filePath: string,
  node: ts.MethodDeclaration,
  functionName: string,
  className: string | null,
): AtlasSelfFunctionSurfaceRow {
  return {
    id: `atlas-self:function:${packageId}:${filePath}:${functionName}`,
    packageId,
    name: functionName,
    functionKind: "class-method",
    className,
    exported: methodOwningClassIsExported(node),
    filePath,
    source: sourceRangeForNode(sourceFile, filePath, node),
    summary: `${functionName} is a class method in ${filePath}.`,
  };
}

function methodOwningClassIsExported(node: ts.MethodDeclaration): boolean {
  return (
    ts.isClassDeclaration(node.parent) &&
    hasModifier(node.parent, ts.SyntaxKind.ExportKeyword)
  );
}

function heritageTypeTexts(
  node: ts.ClassDeclaration,
  token: ts.SyntaxKind.ExtendsKeyword | ts.SyntaxKind.ImplementsKeyword,
): readonly string[] {
  return uniqueSorted(
    (node.heritageClauses ?? [])
      .filter((clause) => clause.token === token)
      .flatMap((clause) =>
        clause.types.map((type) =>
          type.expression.getText(node.getSourceFile()),
        ),
      ),
  );
}

function moduleDependencyRows(
  sourceFile: ts.SourceFile,
  filePath: string,
): readonly AtlasSelfModuleDependencyRow[] {
  return sourceFile.statements.flatMap((statement) => {
    const moduleSpecifier = moduleSpecifierText(statement);
    if (moduleSpecifier === null || !moduleSpecifier.startsWith(".")) {
      return [];
    }
    const toFile = resolveRelativeModule(filePath, moduleSpecifier);
    const fromArea = atlasAreaForPath(filePath);
    const toArea = toFile === null ? null : atlasAreaForPath(toFile);
    return [
      {
        id: `atlas-self:module:${filePath}:${statement.pos}:${stableHash(
          moduleSpecifier,
        )}`,
        fromFile: filePath,
        fromArea,
        moduleSpecifier,
        toFile,
        toArea,
        crossesArea: toArea !== null && fromArea !== toArea,
        source: sourceRangeForNode(sourceFile, filePath, statement),
        summary: `${filePath} imports ${moduleSpecifier}${
          toArea === null ? "" : ` into ${toArea}`
        }.`,
      },
    ];
  });
}

function moduleSpecifierText(statement: ts.Statement): string | null {
  if (
    (ts.isImportDeclaration(statement) || ts.isExportDeclaration(statement)) &&
    statement.moduleSpecifier !== undefined &&
    ts.isStringLiteral(statement.moduleSpecifier)
  ) {
    return statement.moduleSpecifier.text;
  }
  return null;
}

function resolveRelativeModule(
  filePath: string,
  moduleSpecifier: string,
): string | null {
  const directoryParts = filePath.split("/").slice(0, -1);
  const specifierParts = moduleSpecifier.replace(/\\/gu, "/").split("/");
  const parts = [...directoryParts];
  for (const part of specifierParts) {
    if (part === "." || part.length === 0) {
      continue;
    }
    if (part === "..") {
      parts.pop();
      continue;
    }
    parts.push(part);
  }
  const resolved = parts.join("/");
  if (resolved.endsWith(".js")) {
    return `${resolved.slice(0, -3)}.ts`;
  }
  return `${resolved}.ts`;
}

function atlasAreaForPath(filePath: string): string {
  const marker = "packages/atlas/src/";
  const index = filePath.indexOf(marker);
  const relative =
    index >= 0 ? filePath.slice(index + marker.length) : filePath;
  return relative.split("/")[0] ?? "unknown";
}

function indexProvenanceForFunction(
  sourceFile: ts.SourceFile,
  filePath: string,
  node: ts.FunctionDeclaration,
): readonly AtlasSelfIndexProvenanceRow[] {
  const name = node.name?.text;
  if (name === undefined) {
    return [];
  }
  const kind = indexFunctionKind(name);
  if (kind === null) {
    return [];
  }
  return [
    {
      id: `atlas-self:index:${kind}:${filePath}:${name}`,
      kind,
      name,
      filePath,
      value: null,
      source: sourceRangeForNode(sourceFile, filePath, node),
      summary: `${name} is an Atlas ${kind} surface.`,
    },
  ];
}

function indexProvenanceForVariableStatement(
  sourceFile: ts.SourceFile,
  filePath: string,
  node: ts.VariableStatement,
): readonly AtlasSelfIndexProvenanceRow[] {
  return node.declarationList.declarations.flatMap((declaration) => {
    if (!ts.isIdentifier(declaration.name)) {
      return [];
    }
    const name = declaration.name.text;
    const value =
      declaration.initializer !== undefined &&
      isStringLiteralLike(declaration.initializer)
        ? declaration.initializer.text
        : null;
    const kind = indexVariableKind(name, value);
    if (kind === null) {
      return [];
    }
    return [
      {
        id: `atlas-self:index:${kind}:${filePath}:${name}`,
        kind,
        name,
        filePath,
        value,
        source: sourceRangeForNode(sourceFile, filePath, declaration),
        summary:
          value === null
            ? `${name} is an Atlas ${kind} declaration.`
            : `${name} declares ${kind} value ${JSON.stringify(value)}.`,
      },
    ];
  });
}

function indexFunctionKind(
  name: string,
): AtlasSelfIndexProvenanceRow["kind"] | null {
  if (/^(read|get).*?(Index|Cache|Manifest)$/u.test(name)) {
    return "reader";
  }
  if (/^(build|create|write).*?(Index|Cache|Manifest)$/u.test(name)) {
    return "builder";
  }
  if (/(warmup|prewarm|warm)/iu.test(name)) {
    return "warmup";
  }
  if (/(cache|manifest)/iu.test(name)) {
    return "cache";
  }
  return null;
}

function indexVariableKind(
  name: string,
  value: string | null,
): AtlasSelfIndexProvenanceRow["kind"] | null {
  if (/(SCHEMA|VERSION)/u.test(name) && value !== null) {
    return "schema-version";
  }
  if (/(CACHE|MANIFEST|INDEX)/u.test(name)) {
    return "cache";
  }
  return null;
}

function lensImplementationSeedForCase(
  sourceFile: ts.SourceFile,
  filePath: string,
  node: ts.CaseClause,
): Omit<
  AtlasSelfLensImplementationRow,
  "id" | "lensId" | "reachableFunctions" | "summary"
> | null {
  const expression = node.expression;
  if (
    !ts.isPropertyAccessExpression(expression) ||
    expression.expression.getText(sourceFile) !== "LensId"
  ) {
    return null;
  }
  const implementationFunction = firstReturnedCallName(node);
  if (implementationFunction === null) {
    return null;
  }
  return {
    lensMember: expression.name.text,
    implementationFunction,
    filePath,
    source: sourceRangeForNode(sourceFile, filePath, node),
  };
}

function firstReturnedCallName(node: ts.Node): string | null {
  let found: string | null = null;
  const visit = (child: ts.Node): void => {
    if (found !== null) {
      return;
    }
    if (ts.isReturnStatement(child) && child.expression !== undefined) {
      if (ts.isCallExpression(child.expression)) {
        found = calledFunctionName(child.expression);
        return;
      }
      if (
        ts.isAwaitExpression(child.expression) &&
        ts.isCallExpression(child.expression.expression)
      ) {
        found = calledFunctionName(child.expression.expression);
        return;
      }
    }
    ts.forEachChild(child, visit);
  };
  visit(node);
  return found;
}

function calledFunctionName(
  node: ts.CallExpression,
  currentClass: string | null = null,
): string | null {
  if (ts.isIdentifier(node.expression)) {
    return node.expression.text;
  }
  if (ts.isPropertyAccessExpression(node.expression)) {
    const methodName =
      memberNameText(node.expression.name, node.getSourceFile()) ??
      node.expression.name.getText(node.getSourceFile());
    if (
      node.expression.expression.kind === ts.SyntaxKind.ThisKeyword &&
      currentClass !== null
    ) {
      return `${currentClass}.${methodName}`;
    }
    if (
      ts.isNewExpression(node.expression.expression) &&
      ts.isIdentifier(node.expression.expression.expression)
    ) {
      return `${node.expression.expression.expression.text}.${methodName}`;
    }
  }
  return null;
}

function projectionBranchesForSwitch(
  sourceFile: ts.SourceFile,
  filePath: string,
  currentFunction: string | null,
  node: ts.SwitchStatement,
): readonly MutableProjectionBranchRow[] {
  if (currentFunction === null) {
    return [];
  }
  return node.caseBlock.clauses.flatMap((clause) => {
    if (!ts.isCaseClause(clause) || !isStringLiteralLike(clause.expression)) {
      return [];
    }
    const projection = clause.expression.text;
    return [
      {
        id: `atlas-self:projection:${filePath}:${currentFunction}:${projection}:${clause.pos}`,
        projection,
        functionName: currentFunction,
        filePath,
        branchKind: "switch-case",
        source: sourceRangeForNode(sourceFile, filePath, clause),
      },
    ];
  });
}

function projectionBranchForBinaryExpression(
  sourceFile: ts.SourceFile,
  filePath: string,
  currentFunction: string,
  node: ts.BinaryExpression,
): MutableProjectionBranchRow | null {
  if (
    node.operatorToken.kind !== ts.SyntaxKind.EqualsEqualsEqualsToken &&
    node.operatorToken.kind !== ts.SyntaxKind.EqualsEqualsToken
  ) {
    return null;
  }
  const leftProjection = isProjectionExpression(node.left);
  const rightProjection = isProjectionExpression(node.right);
  const literal =
    leftProjection && isStringLiteralLike(node.right)
      ? node.right
      : rightProjection && isStringLiteralLike(node.left)
      ? node.left
      : null;
  if (literal === null) {
    return null;
  }
  return {
    id: `atlas-self:projection:${filePath}:${currentFunction}:${literal.text}:${node.pos}`,
    projection: literal.text,
    functionName: currentFunction,
    filePath,
    branchKind: "if-equals",
    source: sourceRangeForNode(sourceFile, filePath, node),
  };
}

function isProjectionExpression(node: ts.Expression): boolean {
  if (ts.isParenthesizedExpression(node)) {
    return isProjectionExpression(node.expression);
  }
  if (
    ts.isBinaryExpression(node) &&
    node.operatorToken.kind === ts.SyntaxKind.QuestionQuestionToken
  ) {
    return (
      isProjectionExpression(node.left) || isProjectionExpression(node.right)
    );
  }
  const text = node.getText();
  return (
    text === "projection" ||
    text === "inquiry.projection" ||
    text.endsWith(".projection")
  );
}

function continuationForObjectLiteral(
  sourceFile: ts.SourceFile,
  filePath: string,
  currentFunction: string,
  node: ts.ObjectLiteralExpression,
): MutableContinuationRow | null {
  const kind = enumMemberProperty(node, "kind", "ContinuationKind", sourceFile);
  if (kind === null) {
    return null;
  }
  const continuationId = stringProperty(node, "id");
  const priority = enumMemberProperty(
    node,
    "priority",
    "ContinuationPriority",
    sourceFile,
  );
  const inquiry = objectProperty(node, "inquiry");
  const targetLens =
    inquiry === null
      ? null
      : enumMemberProperty(inquiry, "lens", "LensId", sourceFile) ??
        stringProperty(inquiry, "lens");
  const targetProjection =
    inquiry === null ? null : stringProperty(inquiry, "projection");
  const routeRelationMember = firstEnumMemberInNode(
    node,
    "NavigationRelation",
    sourceFile,
  );
  return {
    id: `atlas-self:continuation:${filePath}:${currentFunction}:${node.pos}`,
    continuationId,
    kind,
    priority,
    functionName: currentFunction,
    filePath,
    targetLens,
    targetProjection,
    routeRelationMember,
    source: sourceRangeForNode(sourceFile, filePath, node),
  };
}

function continuationForHelperCall(
  sourceFile: ts.SourceFile,
  filePath: string,
  currentFunction: string,
  node: ts.CallExpression,
): MutableContinuationRow | null {
  const helperName = calledFunctionName(node);
  if (helperName === "projectionContinuation") {
    const options = objectArgument(node, 4);
    return {
      id: `atlas-self:continuation:${filePath}:${currentFunction}:${node.pos}`,
      continuationId: stringArgument(node, 1),
      kind: "SwitchProjection",
      priority: "Primary",
      functionName: currentFunction,
      filePath,
      targetLens:
        options === null
          ? null
          : enumMemberProperty(options, "lens", "LensId", sourceFile) ??
            stringProperty(options, "lens"),
      targetProjection: stringArgument(node, 2),
      routeRelationMember: "ProjectionOf",
      source: sourceRangeForNode(sourceFile, filePath, node),
    };
  }
  if (helperName === "nextPageContinuation") {
    return {
      id: `atlas-self:continuation:${filePath}:${currentFunction}:${node.pos}`,
      continuationId: stringArgument(node, 1),
      kind: "NextPage",
      priority: "Primary",
      functionName: currentFunction,
      filePath,
      targetLens: null,
      targetProjection: null,
      routeRelationMember: "NextPageOf",
      source: sourceRangeForNode(sourceFile, filePath, node),
    };
  }
  return null;
}

function stringArgument(
  node: ts.CallExpression,
  index: number,
): string | null {
  const argument = node.arguments[index];
  return argument !== undefined && isStringLiteralLike(argument)
    ? argument.text
    : null;
}

function objectArgument(
  node: ts.CallExpression,
  index: number,
): ts.ObjectLiteralExpression | null {
  const argument = node.arguments[index];
  return argument !== undefined && ts.isObjectLiteralExpression(argument)
    ? argument
    : null;
}

function stringProperty(
  node: ts.ObjectLiteralExpression,
  name: string,
): string | null {
  const property = propertyAssignment(node, name);
  if (property === null || !isStringLiteralLike(property.initializer)) {
    return null;
  }
  return property.initializer.text;
}

function objectProperty(
  node: ts.ObjectLiteralExpression,
  name: string,
): ts.ObjectLiteralExpression | null {
  const property = propertyAssignment(node, name);
  if (
    property === null ||
    !ts.isObjectLiteralExpression(property.initializer)
  ) {
    return null;
  }
  return property.initializer;
}

function enumMemberProperty(
  node: ts.ObjectLiteralExpression,
  name: string,
  enumName: string,
  sourceFile: ts.SourceFile,
): string | null {
  const property = propertyAssignment(node, name);
  if (property === null) {
    return null;
  }
  return enumMemberName(property.initializer, enumName, sourceFile);
}

function propertyAssignment(
  node: ts.ObjectLiteralExpression,
  name: string,
): ts.PropertyAssignment | null {
  for (const property of node.properties) {
    if (!ts.isPropertyAssignment(property)) {
      continue;
    }
    const propertyName = propertyNameText(
      property.name,
      property.getSourceFile(),
    );
    if (propertyName === name) {
      return property;
    }
  }
  return null;
}

function firstEnumMemberInNode(
  node: ts.Node,
  enumName: string,
  sourceFile: ts.SourceFile,
): string | null {
  let found: string | null = null;
  const visit = (child: ts.Node): void => {
    if (found !== null) {
      return;
    }
    const member = enumMemberName(child, enumName, sourceFile);
    if (member !== null) {
      found = member;
      return;
    }
    ts.forEachChild(child, visit);
  };
  visit(node);
  return found;
}

function enumMemberName(
  node: ts.Node,
  enumName: string,
  sourceFile: ts.SourceFile,
): string | null {
  if (
    !ts.isPropertyAccessExpression(node) ||
    node.expression.getText(sourceFile) !== enumName
  ) {
    return null;
  }
  return node.name.text;
}

function finalizeLensImplementations(
  seeds: readonly Omit<
    AtlasSelfLensImplementationRow,
    "id" | "lensId" | "reachableFunctions" | "summary"
  >[],
  enumRows: readonly MutableEnumRow[],
  functionDeclarations: readonly FunctionDeclarationRow[],
  callEdges: readonly FunctionCallEdge[],
): readonly AtlasSelfLensImplementationRow[] {
  const functionGraph = AtlasSelfFunctionGraph.from(
    functionDeclarations,
    callEdges,
  );
  const lensIdMembers = new Map<string, string | null>();
  for (const enumRow of enumRows) {
    if (enumRow.name !== "LensId") {
      continue;
    }
    for (const member of enumRow.members) {
      lensIdMembers.set(
        member.name,
        typeof member.value === "string" ? member.value : null,
      );
    }
  }
  return seeds
    .map((seed) => {
      const lensId = lensIdMembers.get(seed.lensMember) ?? null;
      const implementationFilePath =
        functionGraph.fileForFunction(seed.implementationFunction) ??
        seed.filePath;
      const reachableFunctions = functionGraph.reachableFunctionKeys(
        seed.implementationFunction,
        implementationFilePath,
      );
      return {
        id: `atlas-self:lens-implementation:${seed.lensMember}`,
        lensMember: seed.lensMember,
        lensId,
        implementationFunction: seed.implementationFunction,
        filePath: implementationFilePath,
        reachableFunctions,
        source: seed.source,
        summary: `${lensId ?? seed.lensMember} is answered by ${
          seed.implementationFunction
        } with ${reachableFunctions.length} reachable helper function(s).`,
      };
    })
    .sort((left, right) =>
      (left.lensId ?? left.lensMember).localeCompare(
        right.lensId ?? right.lensMember,
      ),
    );
}

class AtlasSelfFunctionGraph {
  readonly #fileByFunctionName: ReadonlyMap<string, string>;
  readonly #callsByFileAndFunction: ReadonlyMap<string, readonly string[]>;

  private constructor(
    fileByFunctionName: ReadonlyMap<string, string>,
    callsByFileAndFunction: ReadonlyMap<string, readonly string[]>,
  ) {
    this.#fileByFunctionName = fileByFunctionName;
    this.#callsByFileAndFunction = callsByFileAndFunction;
  }

  static from(
    declarations: readonly FunctionDeclarationRow[],
    callEdges: readonly FunctionCallEdge[],
  ): AtlasSelfFunctionGraph {
    const fileByFunctionName = new Map<string, string>();
    for (const declaration of declarations) {
      if (!fileByFunctionName.has(declaration.name)) {
        fileByFunctionName.set(declaration.name, declaration.filePath);
      }
    }
    const calls = new Map<string, string[]>();
    for (const edge of callEdges) {
      const key = this.#callKey(edge.filePath, edge.fromFunction);
      const targets = calls.get(key) ?? [];
      targets.push(edge.toFunction);
      calls.set(key, targets);
    }
    return new AtlasSelfFunctionGraph(fileByFunctionName, calls);
  }

  fileForFunction(functionName: string): string | undefined {
    return this.#fileByFunctionName.get(functionName);
  }

  reachableFunctionKeys(start: string, filePath: string): readonly string[] {
    const visited = new Set<string>();
    const queue = [start];
    while (queue.length > 0) {
      const next = queue.shift()!;
      if (visited.has(next)) {
        continue;
      }
      visited.add(next);
      for (const target of this.#callsByFileAndFunction.get(
        AtlasSelfFunctionGraph.#callKey(filePath, next),
      ) ?? []) {
        if (!visited.has(target)) {
          queue.push(target);
        }
      }
    }
    return [...visited]
      .map((name) => `${filePath}:${name}`)
      .sort((left, right) => left.localeCompare(right));
  }

  static #callKey(filePath: string, functionName: string): string {
    return `${filePath}:${functionName}`;
  }
}

function finalizeProjectionBranches(
  seeds: readonly MutableProjectionBranchRow[],
  lensImplementations: readonly AtlasSelfLensImplementationRow[],
): readonly AtlasSelfProjectionBranchRow[] {
  return dedupeById(seeds)
    .map((seed) => {
      const lensIds = lensIdsForFunction(
        seed.filePath,
        seed.functionName,
        lensImplementations,
      );
      return {
        ...seed,
        lensIds,
        summary: `${seed.projection} is handled by ${seed.functionName}${
          lensIds.length === 0 ? "" : ` for ${lensIds.join(", ")}`
        }.`,
      };
    })
    .sort(
      (left, right) =>
        left.filePath.localeCompare(right.filePath) ||
        left.functionName.localeCompare(right.functionName) ||
        left.projection.localeCompare(right.projection),
    );
}

function finalizeContinuations(
  seeds: readonly MutableContinuationRow[],
  lensImplementations: readonly AtlasSelfLensImplementationRow[],
): readonly AtlasSelfContinuationRow[] {
  return dedupeById(seeds)
    .map((seed) => {
      const lensIds = lensIdsForFunction(
        seed.filePath,
        seed.functionName,
        lensImplementations,
      );
      return {
        ...seed,
        lensIds,
        summary: `${seed.continuationId ?? "(anonymous continuation)"} emits ${
          seed.kind ?? "unknown"
        }${
          seed.targetLens === null
            ? ""
            : ` to ${seed.targetLens}${
                seed.targetProjection === null
                  ? ""
                  : `/${seed.targetProjection}`
              }`
        }.`,
      };
    })
    .sort(
      (left, right) =>
        left.filePath.localeCompare(right.filePath) ||
        left.functionName.localeCompare(right.functionName) ||
        (left.continuationId ?? "").localeCompare(right.continuationId ?? ""),
    );
}

function lensIdsForFunction(
  filePath: string,
  functionName: string,
  lensImplementations: readonly AtlasSelfLensImplementationRow[],
): readonly string[] {
  const functionKey = `${filePath}:${functionName}`;
  return lensImplementations
    .filter((row) => row.reachableFunctions.includes(functionKey))
    .map((row) => row.lensId ?? row.lensMember)
    .sort((left, right) => left.localeCompare(right));
}

class AtlasSelfAxisPressureClassifier {
  readonly #enums: readonly AtlasSelfEnumRow[];
  readonly #rowSurfaces: readonly AtlasSelfRowSurfaceRow[];
  readonly #relationshipSurfaces: readonly AtlasSelfRelationshipSurfaceRow[];
  readonly #continuations: readonly AtlasSelfContinuationRow[];
  readonly #mapperRows: readonly AtlasSelfAxisPressureRow[];

  constructor(
    enums: readonly AtlasSelfEnumRow[],
    rowSurfaces: readonly AtlasSelfRowSurfaceRow[],
    relationshipSurfaces: readonly AtlasSelfRelationshipSurfaceRow[],
    continuations: readonly AtlasSelfContinuationRow[],
    mapperRows: readonly AtlasSelfAxisPressureRow[],
  ) {
    this.#enums = enums;
    this.#rowSurfaces = rowSurfaces;
    this.#relationshipSurfaces = relationshipSurfaces;
    this.#continuations = continuations;
    this.#mapperRows = mapperRows;
  }

  rows(): readonly AtlasSelfAxisPressureRow[] {
    return [
      ...this.#enumUsageRows(),
      ...this.#stringlyAxisRows(),
      ...this.#relationshipSurfaceGapRows(),
      ...this.#parallelAxisRows(),
      ...this.#continuationTargetGapRows(),
      ...this.#mapperRows,
    ].sort(compareAxisPressure);
  }

  #enumUsageRows(): readonly AtlasSelfAxisPressureRow[] {
    return this.#enums.flatMap((row) => {
      if (row.unreferencedMemberCount === 0 && row.literalReuseCount === 0) {
        return [];
      }
      const signals = [
        ...(row.unreferencedMemberCount === 0
          ? []
          : [`unreferenced-members:${row.unreferencedMemberCount}`]),
        ...(row.literalReuseCount === 0
          ? []
          : [`literal-reuses:${row.literalReuseCount}`]),
      ];
      const pressure =
        row.unreferencedMemberCount > 3 || row.literalReuseCount > 10
          ? "high"
          : row.unreferencedMemberCount > 0 && row.literalReuseCount > 0
          ? "medium"
          : "low";
      return [
        {
          id: `atlas-self:axis-pressure:enum:${row.name}`,
          kind: AtlasSelfAxisPressureKind.EnumUsage,
          axis: row.name,
          axisField: null,
          valueSpace: row.name,
          axisId: `enum:${row.name}`,
          sourceName: row.name,
          filePath: row.source.filePath,
          sourceAxes: [],
          targetAxes: [row.name],
          signals,
          pressure,
          source: row.source,
          summary: `${row.name} has ${signals.join(
            ", ",
          )}; inspect whether the axis is over-declared, stringly reused, or intentionally reserved.`,
        },
      ];
    });
  }

  #stringlyAxisRows(): readonly AtlasSelfAxisPressureRow[] {
    return this.#rowSurfaces.flatMap((row) =>
      row.fields.flatMap((field) => {
        const carrier = axisCarrierForRowField(row, field);
        if (carrier === null || !isStringlyAxisType(carrier.typeText)) {
          return [];
        }
        return [
          {
            id: `atlas-self:axis-pressure:stringly:${row.name}:${field}`,
            kind: AtlasSelfAxisPressureKind.StringlyAxisField,
            axis: carrier.axis,
            axisField: carrier.field,
            valueSpace: carrier.valueSpace,
            axisId: carrier.axisId,
            sourceName: row.name,
            filePath: row.source.filePath,
            sourceAxes: [carrier.field],
            targetAxes: [carrier.valueSpace],
            signals: [
              `field:${carrier.field}`,
              `type:${carrier.typeText}`,
              `axis-id:${carrier.axisId}`,
            ],
            pressure: row.name.endsWith("Filters")
              ? "low"
              : row.surfaceKind === "relationship"
              ? "high"
              : "medium",
            source: row.source,
            summary: `${row.name}.${carrier.field} carries the ${carrier.axis} axis as ${carrier.typeText}; prefer the stable axis type when this is not a loose user filter.`,
          },
        ];
      }),
    );
  }

  #relationshipSurfaceGapRows(): readonly AtlasSelfAxisPressureRow[] {
    return this.#relationshipSurfaces.flatMap((row) => {
      if (row.surfaceRole !== "relationship-row") {
        return [];
      }
      const signals = [
        ...(row.hasRelation ? [] : ["missing:relation"]),
        ...(row.hasSource ? [] : ["missing:source"]),
        ...(row.hasEndpoints ? [] : ["missing:endpoints"]),
      ];
      if (signals.length === 0) {
        return [];
      }
      return [
        {
          id: `atlas-self:axis-pressure:relationship-gap:${row.name}`,
          kind: AtlasSelfAxisPressureKind.RelationshipSurfaceGap,
          axis: "relationship-surface",
          axisField: null,
          valueSpace: row.name,
          axisId: `relationship-surface:${row.name}`,
          sourceName: row.name,
          filePath: row.source.filePath,
          sourceAxes: row.fields,
          targetAxes: ["relation", "source", "from", "to"],
          signals,
          pressure: signals.includes("missing:relation") ? "high" : "medium",
          source: row.source,
          summary: `${row.name} is relationship-like but has ${signals.join(
            ", ",
          )}.`,
        },
      ];
    });
  }

  #parallelAxisRows(): readonly AtlasSelfAxisPressureRow[] {
    const rows: AtlasSelfAxisPressureRow[] = [];
    const carriers = this.#rowSurfaces.flatMap((row) =>
      row.fields.flatMap((field) => axisCarrierForRowField(row, field) ?? []),
    );
    const axisFields = uniqueSorted(
      carriers.map((carrier) => carrier.axis),
    );
    for (const axis of axisFields) {
      const axisCarriers = carriers.filter((carrier) => carrier.axis === axis);
      const valueSpaces = uniqueSorted(
        axisCarriers.map((carrier) => carrier.valueSpace),
      );
      if (axisCarriers.length < 2 || valueSpaces.length < 2) {
        continue;
      }
      const relationshipCarriers = axisCarriers.filter(
        (carrier) =>
          !carrier.row.name.endsWith("Filters") &&
          carrier.row.surfaceKind === "relationship",
      );
      const nonFilterCarriers = axisCarriers.filter(
        (carrier) => !carrier.row.name.endsWith("Filters"),
      );
      const source = axisCarriers[0]!.row.source;
      rows.push({
        id: `atlas-self:axis-pressure:parallel:${axis}`,
        kind: AtlasSelfAxisPressureKind.ParallelAxisSurface,
        axis,
        axisField: null,
        valueSpace: valueSpaces.join("|"),
        axisId: `${axis}:*`,
        sourceName: `${axis} axis`,
        filePath: source.filePath,
        sourceAxes: axisCarriers.map(
          (carrier) => `${carrier.row.name}.${carrier.field}`,
        ),
        targetAxes: valueSpaces,
        signals: axisCarriers.map(
          (carrier) =>
            `${carrier.row.name}.${carrier.field}:${carrier.valueSpace}`,
        ),
        pressure: parallelAxisPressure(
          relationshipCarriers,
          nonFilterCarriers,
        ),
        source,
        summary: `${axis} field labels span ${valueSpaces.length} typed value space(s); inspect whether this is intentional lens-local vocabulary or substrate split-brain.`,
      });
    }

    const valueSpaces = uniqueSorted(
      carriers.map((carrier) => carrier.valueSpace),
    );
    for (const valueSpace of valueSpaces) {
      const valueSpaceCarriers = carriers.filter(
        (carrier) => carrier.valueSpace === valueSpace,
      );
      const fields = uniqueSorted(
        valueSpaceCarriers.map((carrier) => carrier.field),
      );
      if (valueSpaceCarriers.length < 2 || fields.length < 2) {
        continue;
      }
      const source = valueSpaceCarriers[0]!.row.source;
      rows.push({
        id: `atlas-self:axis-pressure:parallel-value-space:${valueSpace}`,
        kind: AtlasSelfAxisPressureKind.ParallelAxisSurface,
        axis: valueSpace,
        axisField: null,
        valueSpace,
        axisId: `value-space:${valueSpace}`,
        sourceName: `${valueSpace} value space`,
        filePath: source.filePath,
        sourceAxes: valueSpaceCarriers.map(
          (carrier) => `${carrier.row.name}.${carrier.field}`,
        ),
        targetAxes: fields,
        signals: valueSpaceCarriers.map(
          (carrier) =>
            `${carrier.row.name}.${carrier.field}:${carrier.axisId}`,
        ),
        pressure: "medium",
        source,
        summary: `${valueSpace} appears through ${fields.length} field label(s); inspect whether the labels express different roles or accidental aliases.`,
      });
    }
    return rows;
  }

  #continuationTargetGapRows(): readonly AtlasSelfAxisPressureRow[] {
    const projectionsByLens = new Map(
      LensCatalog.map((lens) => [
        String(lens.id),
        new Set(lens.projections.map((projection) => projection.id)),
      ]),
    );
    const lensIdMembers = this.#lensIdMemberValues();
    return this.#continuations.flatMap((row) => {
      if (row.targetProjection === null) {
        return [];
      }
      const targetLensIds =
        row.targetLens === null
          ? row.lensIds
          : [lensIdMembers.get(row.targetLens) ?? row.targetLens];
      if (targetLensIds.length === 0) {
        return [];
      }
      const invalidLensIds = targetLensIds.filter(
        (lensId) =>
          projectionsByLens.get(lensId)?.has(row.targetProjection!) !== true,
      );
      if (invalidLensIds.length === 0) {
        return [];
      }
      const signals = [
        `projection:${row.targetProjection}`,
        ...invalidLensIds.map((lensId) => `invalid-target:${lensId}`),
        ...(row.targetLens === null ? ["target-lens:inherited"] : []),
      ];
      return [
        {
          id: `atlas-self:axis-pressure:continuation-target:${row.id}`,
          kind: AtlasSelfAxisPressureKind.ContinuationTargetGap,
          axis: "continuation-target",
          axisField: "projection",
          valueSpace: row.targetProjection,
          axisId: `continuation-target:${row.targetProjection}`,
          sourceName: row.continuationId ?? row.functionName,
          filePath: row.filePath,
          sourceAxes: row.lensIds,
          targetAxes: targetLensIds,
          signals,
          pressure:
            invalidLensIds.length === targetLensIds.length
              ? "high"
              : "medium",
          source: row.source,
          summary: `${
            row.continuationId ?? "(anonymous continuation)"
          } targets ${row.targetProjection}, which is not valid for ${invalidLensIds.join(
            ", ",
          )}.`,
        },
      ];
    });
  }

  #lensIdMemberValues(): ReadonlyMap<string, string> {
    const members = new Map<string, string>();
    for (const row of this.#enums) {
      if (row.name !== "LensId") {
        continue;
      }
      for (const member of row.members) {
        if (typeof member.value === "string") {
          members.set(member.name, member.value);
        }
      }
    }
    return members;
  }
}

function axisMapperPressureForFunctionLike(
  sourceFile: ts.SourceFile,
  filePath: string,
  functionName: string,
  node: ts.FunctionDeclaration | ts.MethodDeclaration,
): readonly AtlasSelfAxisPressureRow[] {
  if (node.body === undefined) {
    return [];
  }
  const returnedEnumAxes = new Set<string>();
  const switchAxes = new Set<string>();
  const comparisonAxes = new Set<string>();
  const returnedSignals = new Set<string>();

  const visit = (child: ts.Node): void => {
    if (ts.isReturnStatement(child) && child.expression !== undefined) {
      for (const axis of enumAxesInReturnExpression(
        child.expression,
        sourceFile,
      )) {
        returnedEnumAxes.add(axis);
        returnedSignals.add(`returns:${axis}`);
      }
    } else if (ts.isSwitchStatement(child)) {
      const axis = axisNameForExpression(child.expression, sourceFile);
      if (axis !== null) {
        switchAxes.add(axis);
      }
    } else if (ts.isBinaryExpression(child)) {
      const leftAxis = axisNameForExpression(child.left, sourceFile);
      const rightAxis = axisNameForExpression(child.right, sourceFile);
      if (leftAxis !== null) {
        comparisonAxes.add(leftAxis);
      }
      if (rightAxis !== null) {
        comparisonAxes.add(rightAxis);
      }
    }
    ts.forEachChild(child, visit);
  };
  visit(node.body);

  const parameterAxes = uniqueSorted(
    node.parameters.flatMap((parameter) => {
      const name = parameterNameText(parameter.name, sourceFile);
      const typeText = parameter.type?.getText(sourceFile);
      return [
        ...(name === null ? [] : [axisNameForField(name) ?? name]),
        ...(typeText === undefined ? [] : [axisValueSpaceForType(typeText)]),
      ].filter((entry) => axisLikeText(entry) || axisNameForField(entry) !== null);
    }),
  );
  const sourceAxes = uniqueSorted([
    ...parameterAxes,
    ...switchAxes,
    ...comparisonAxes,
  ]);
  const targetAxes = uniqueSorted([...returnedEnumAxes]);
  const mapperName =
    /(?:^|\.)(classify|normalize|coerce|convert|map|relation|mechanism|phase|kind|endpoint|evidenceKind)/u.test(
      functionName,
    );
  if (targetAxes.length === 0 || (!mapperName && sourceAxes.length === 0)) {
    return [];
  }
  const source = sourceRangeForNode(sourceFile, filePath, node);
  const returnsFrameworkRelationshipAxis = targetAxes.some(
    (axis) =>
      axis.includes("FrameworkRelationship") ||
      axis.includes("FrameworkBundleAssociation") ||
      axis.includes("FrameworkMaterialization"),
  );
  const pressure = returnsFrameworkRelationshipAxis
    ? "high"
    : targetAxes.length > 1
    ? "medium"
    : "low";
  return [
    {
      id: `atlas-self:axis-pressure:mapper:${filePath}:${functionName}`,
      kind: AtlasSelfAxisPressureKind.AxisMapperFunction,
      axis: targetAxes.join("|"),
      axisField: null,
      valueSpace: targetAxes.length === 0 ? null : targetAxes.join("|"),
      axisId: `mapper:${targetAxes.join("|")}`,
      sourceName: functionName,
      filePath,
      sourceAxes,
      targetAxes,
      signals: uniqueSorted([
        ...[...returnedSignals],
        ...sourceAxes.map((axis) => `input:${axis}`),
      ]),
      pressure,
      source,
      summary: `${functionName} derives ${targetAxes.join(", ")} from ${
        sourceAxes.length === 0 ? "local logic" : sourceAxes.join(", ")
      }.`,
    },
  ];
}

function parallelAxisPressure(
  relationshipCarriers: readonly AxisCarrier[],
  nonFilterCarriers: readonly AxisCarrier[],
): AtlasSelfAxisPressureRow["pressure"] {
  if (nonFilterCarriers.length === 0) {
    return "low";
  }
  if (
    relationshipCarriers.some((carrier) => isStringlyAxisType(carrier.typeText))
  ) {
    return "high";
  }
  return "medium";
}

function enumAxesInReturnExpression(
  node: ts.Node,
  sourceFile: ts.SourceFile,
): readonly string[] {
  const axes = new Set<string>();
  const visit = (child: ts.Node): void => {
    const axis = enumAxisName(child, sourceFile);
    if (axis !== null) {
      axes.add(axis);
      return;
    }
    if (ts.isConditionalExpression(child)) {
      visit(child.whenTrue);
      visit(child.whenFalse);
      return;
    }
    if (ts.isBinaryExpression(child)) {
      return;
    }
    if (ts.isPrefixUnaryExpression(child)) {
      visit(child.operand);
      return;
    }
    if (ts.isParenthesizedExpression(child) || ts.isAsExpression(child)) {
      visit(child.expression);
      return;
    }
    ts.forEachChild(child, visit);
  };
  visit(node);
  return [...axes];
}

function enumAxisName(node: ts.Node, sourceFile: ts.SourceFile): string | null {
  if (!ts.isPropertyAccessExpression(node)) {
    return null;
  }
  const axis = node.expression.getText(sourceFile);
  return axisLikeText(axis) ? axis : null;
}

function axisNameForExpression(
  node: ts.Node,
  sourceFile: ts.SourceFile,
): string | null {
  const enumAxis = enumAxisName(node, sourceFile);
  if (enumAxis !== null) {
    return enumAxis;
  }
  const text = node.getText(sourceFile);
  const field = text.split(".").at(-1);
  return field === undefined ? null : axisNameForField(field) ?? null;
}

function axisCarrierForRowField(
  row: AtlasSelfRowSurfaceRow,
  field: string,
): AxisCarrier | null {
  const typeText = row.fieldTypes[field];
  if (typeText === undefined || isBooleanPredicateType(typeText)) {
    return null;
  }
  const axisTypeNames = axisTypeNamesInText(typeText);
  const axis = axisNameForFieldAndType(field, axisTypeNames);
  if (axis === null) {
    return null;
  }
  const valueSpace = axisValueSpaceForType(typeText);
  return {
    row,
    field,
    typeText,
    axis,
    valueSpace,
    axisId: `${axis}:${valueSpace}`,
  };
}

function axisNameForFieldAndType(
  field: string,
  axisTypeNames: readonly string[],
): string | null {
  if (field === "kind") {
    return axisTypeNames.length === 1 ? axisTypeNames[0]! : null;
  }
  return axisNameForField(field);
}

function axisNameForField(field: string): string | null {
  const known = axisNameForKnownField(field);
  if (known !== null) {
    return known;
  }
  const suffix = axisLikeSuffix(field);
  if (suffix !== null) {
    return suffix === field ? field : lowerFirst(suffix);
  }
  return null;
}

function isBooleanPredicateType(typeText: string): boolean {
  return normalizeAxisTypeText(typeText) === "boolean";
}

function axisNameForKnownField(field: string): string | null {
  const knownFields: Readonly<Record<string, string>> = {
    relation: "relation",
    mechanism: "mechanism",
    phase: "phase",
    kind: "kind",
    family: "family",
    closure: "closure",
    strategy: "strategy",
    certainty: "certainty",
    policy: "policy",
    access: "access",
    evidenceBasis: "evidenceBasis",
    routeKind: "routeKind",
    associationKind: "associationKind",
    resourceKind: "resourceKind",
    dependencyPolicy: "dependencyPolicy",
    dependencyAccess: "dependencyAccess",
  };
  return knownFields[field] ?? null;
}

function axisValueSpaceForType(typeText: string): string {
  const axisTypes = axisTypeNamesInText(typeText);
  if (axisTypes.length === 1) {
    return axisTypes[0]!;
  }
  if (axisTypes.length > 1) {
    return axisTypes.join("|");
  }
  return normalizeAxisTypeText(typeText);
}

function axisTypeNamesInText(typeText: string): readonly string[] {
  const names = new Set<string>();
  for (const match of typeText.matchAll(
    /(?:\b[A-Za-z_$][\w$]*\.)?([A-Z][A-Za-z0-9_$]*(?:Kind|Relation|Mechanism|Phase|Policy|Access|Strategy|Role|Family|Closure|Basis|Certainty|Confidence|Authority|Freshness))\b/gu,
  )) {
    const name = match[1];
    if (name !== undefined && axisLikeText(name)) {
      names.add(name);
    }
  }
  return [...names].sort((left, right) => left.localeCompare(right));
}

function normalizeAxisTypeText(typeText: string): string {
  return typeText
    .replace(/\breadonly\s+/gu, "")
    .replace(/\s+/gu, " ")
    .trim();
}

function axisLikeSuffix(text: string): string | null {
  const match =
    /(?:Kind|Relation|Mechanism|Phase|Policy|Access|Strategy|Role|Family|Closure|Basis|Certainty|Confidence|Authority|Freshness)$/u.exec(
      text.split(".").at(-1) ?? text,
    );
  return match?.[0] ?? null;
}

function lowerFirst(text: string): string {
  return text.length === 0
    ? text
    : `${text[0]!.toLowerCase()}${text.slice(1)}`;
}

function isStringlyAxisType(typeText: string): boolean {
  return (
    typeText === "string" ||
    typeText === "string | null" ||
    typeText === "readonly string[]"
  );
}

function axisLikeText(text: string): boolean {
  return /(?:Kind|Relation|Mechanism|Phase|Policy|Access|Strategy|Role|Family|Closure|Basis|Certainty|Confidence|Authority|Freshness)$/u.test(
    text.split(".").at(-1) ?? text,
  );
}

function parameterNameText(
  name: ts.BindingName,
  sourceFile: ts.SourceFile,
): string | null {
  return ts.isIdentifier(name) ? name.text : name.getText(sourceFile);
}

function compareAxisPressure(
  left: AtlasSelfAxisPressureRow,
  right: AtlasSelfAxisPressureRow,
): number {
  return (
    pressureRank(right.pressure) - pressureRank(left.pressure) ||
    left.kind.localeCompare(right.kind) ||
    left.axis.localeCompare(right.axis) ||
    left.sourceName.localeCompare(right.sourceName)
  );
}

function pressureRank(pressure: AtlasSelfAxisPressureRow["pressure"]): number {
  switch (pressure) {
    case "high":
      return 3;
    case "medium":
      return 2;
    case "low":
    default:
      return 1;
  }
}

class AtlasSelfContractStringClassifier {
  readonly #strings: readonly AtlasSelfStringLiteralRow[];
  readonly #continuationIds: ReadonlySet<string>;
  readonly #schemaValues: ReadonlySet<string>;

  constructor(
    strings: readonly AtlasSelfStringLiteralRow[],
    continuations: readonly AtlasSelfContinuationRow[],
    indexProvenance: readonly AtlasSelfIndexProvenanceRow[],
  ) {
    this.#strings = strings;
    this.#continuationIds = new Set(
      continuations.flatMap((row) =>
        row.continuationId === null ? [] : [row.continuationId],
      ),
    );
    this.#schemaValues = new Set(
      indexProvenance.flatMap((row) => (row.value === null ? [] : [row.value])),
    );
  }

  rows(): readonly AtlasSelfContractStringRow[] {
    return this.#strings
      .flatMap((row) => {
        const classes = this.#classesFor(row);
        if (classes.length === 0) {
          return [];
        }
        return [
          {
            id: `atlas-self:contract-string:${stableStringId(row.value)}`,
            value: row.value,
            classes,
            count: row.count,
            declaredByEnumMembers: row.declaredByEnumMembers,
            files: row.files,
            firstSource: row.firstSource,
            summary: `${JSON.stringify(
              row.value,
            )} is contract-bearing as ${classes.join(", ")}.`,
          },
        ];
      })
      .sort(
        (left, right) =>
          left.classes[0]!.localeCompare(right.classes[0]!) ||
          left.value.localeCompare(right.value),
      );
  }

  #classesFor(row: AtlasSelfStringLiteralRow): readonly string[] {
    const classes = new Set<string>();
    for (const enumMember of row.declaredByEnumMembers) {
      this.#addEnumMemberClasses(classes, enumMember);
    }
    if (
      this.#continuationIds.has(row.value) ||
      /^[a-z0-9.-]+:[a-z0-9:._-]+$/u.test(row.value)
    ) {
      classes.add("continuation-or-row-id");
    }
    if (this.#schemaValues.has(row.value) || /-v\d+$/u.test(row.value)) {
      classes.add("schema-or-version");
    }
    if (
      row.files.some((file) => file.endsWith("lens.ts")) &&
      row.roles["property-value"] !== undefined
    ) {
      classes.add("lens-contract-literal");
    }
    return [...classes].sort((left, right) => left.localeCompare(right));
  }

  #addEnumMemberClasses(classes: Set<string>, enumMember: string): void {
    const enumName = enumMember.split(".")[0];
    switch (enumName) {
      case "LensId":
        classes.add("lens-id");
        break;
      case "SubstrateId":
        classes.add("substrate-id");
        break;
      case "NavigationRelation":
        classes.add("navigation-relation");
        break;
      case "NavigationPlane":
        classes.add("navigation-plane");
        break;
      case "EvidenceKind":
        classes.add("evidence-kind");
        break;
      case "BasisKind":
        classes.add("basis-kind");
        break;
      case "ContinuationKind":
        classes.add("continuation-kind");
        break;
      default:
        if (enumName?.endsWith("Relation") === true) {
          classes.add("relation-axis-value");
        } else if (enumName?.endsWith("Kind") === true) {
          classes.add("kind-axis-value");
        } else if (enumName?.endsWith("Phase") === true) {
          classes.add("phase-axis-value");
        }
        break;
    }
  }
}

function dedupeById<TRow extends { readonly id: string }>(
  rows: readonly TRow[],
): readonly TRow[] {
  return [...new Map(rows.map((row) => [row.id, row])).values()];
}

function enumMemberValue(member: ts.EnumMember): string | number | null {
  const initializer = member.initializer;
  if (initializer === undefined) {
    return null;
  }
  if (ts.isStringLiteralLike(initializer)) {
    return initializer.text;
  }
  if (ts.isNumericLiteral(initializer)) {
    return Number(initializer.text);
  }
  if (
    ts.isPrefixUnaryExpression(initializer) &&
    ts.isNumericLiteral(initializer.operand)
  ) {
    const value = Number(initializer.operand.text);
    return initializer.operator === ts.SyntaxKind.MinusToken ? -value : value;
  }
  return initializer.getText();
}

function stringRoleForNode(node: ts.StringLiteralLike): AtlasSelfStringRole {
  const parent = node.parent;
  if (ts.isImportDeclaration(parent) || ts.isExportDeclaration(parent)) {
    return AtlasSelfStringRole.ModuleSpecifier;
  }
  if (ts.isEnumMember(parent) && parent.initializer === node) {
    return AtlasSelfStringRole.EnumMemberValue;
  }
  if (ts.isLiteralTypeNode(parent)) {
    return AtlasSelfStringRole.LiteralType;
  }
  if (ts.isCaseClause(parent)) {
    return AtlasSelfStringRole.CaseLabel;
  }
  if (ts.isPropertyAssignment(parent) && parent.initializer === node) {
    return AtlasSelfStringRole.PropertyValue;
  }
  if (
    (ts.isCallExpression(parent) || ts.isNewExpression(parent)) &&
    parent.arguments?.includes(node as ts.Expression) === true
  ) {
    return AtlasSelfStringRole.Argument;
  }
  if (
    ts.isBinaryExpression(parent) &&
    (parent.left === node || parent.right === node)
  ) {
    return AtlasSelfStringRole.Comparison;
  }
  if (ts.isNoSubstitutionTemplateLiteral(node)) {
    return AtlasSelfStringRole.TemplateLiteral;
  }
  return AtlasSelfStringRole.Other;
}

function isMagicStringRole(role: AtlasSelfStringRole): boolean {
  return (
    role !== AtlasSelfStringRole.ModuleSpecifier &&
    role !== AtlasSelfStringRole.EnumMemberValue
  );
}

function isStringLiteralLike(
  node: ts.Node,
): node is ts.StringLiteral | ts.NoSubstitutionTemplateLiteral {
  return ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node);
}

function memberNameText(
  name: ts.PropertyName | ts.PrivateIdentifier,
  sourceFile: ts.SourceFile,
): string | null {
  if (ts.isPrivateIdentifier(name)) {
    return name.text.startsWith("#") ? name.text : `#${name.text}`;
  }
  return propertyNameText(name, sourceFile);
}

function propertyNameText(
  name: ts.PropertyName,
  sourceFile: ts.SourceFile,
): string | null {
  if (
    ts.isIdentifier(name) ||
    ts.isStringLiteral(name) ||
    ts.isNumericLiteral(name)
  ) {
    return name.text;
  }
  return name.getText(sourceFile);
}

function hasModifier(
  node: ts.Node,
  kind:
    | ts.SyntaxKind.ExportKeyword
    | ts.SyntaxKind.ConstKeyword
    | ts.SyntaxKind.StaticKeyword
    | ts.SyntaxKind.AbstractKeyword,
): boolean {
  return (
    ts.canHaveModifiers(node) &&
    ts.getModifiers(node)?.some((modifier) => modifier.kind === kind) === true
  );
}

function sourceRangeForNode(
  sourceFile: ts.SourceFile,
  filePath: string,
  node: ts.Node,
): SourceRange {
  return sourceRangeFromFileSpan(filePath, sourceSpan(sourceFile, node));
}

function sourceSpan(sourceFile: ts.SourceFile, node: ts.Node): SourceSpan {
  const start = node.getStart(sourceFile);
  const end = node.getEnd();
  const startPosition = sourceFile.getLineAndCharacterOfPosition(start);
  const endPosition = sourceFile.getLineAndCharacterOfPosition(end);
  return {
    start,
    end,
    startLine: startPosition.line + 1,
    startCharacter: startPosition.character + 1,
    endLine: endPosition.line + 1,
    endCharacter: endPosition.character + 1,
  };
}

function sourceRangeFromFileSpan(
  filePath: string,
  span: SourceSpan,
): SourceRange {
  return {
    filePath,
    start: {
      line: span.startLine - 1,
      character: span.startCharacter - 1,
    },
    end: {
      line: span.endLine - 1,
      character: span.endCharacter - 1,
    },
  };
}

function stableStringId(value: string): string {
  const readable =
    [...value]
      .map((char) => (/[a-zA-Z0-9._-]/u.test(char) ? char : "_"))
      .join("")
      .slice(0, 64) || "empty";
  return `${readable}:${stableHash(value)}`;
}

function stableHash(value: string): string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(36);
}

function uniqueSorted(values: readonly string[]): readonly string[] {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right));
}

function compareByName(
  left: { readonly name: string },
  right: { readonly name: string },
): number {
  return left.name.localeCompare(right.name);
}

function compareModuleDependency(
  left: AtlasSelfModuleDependencyRow,
  right: AtlasSelfModuleDependencyRow,
): number {
  return (
    left.fromFile.localeCompare(right.fromFile) ||
    left.moduleSpecifier.localeCompare(right.moduleSpecifier)
  );
}

function compareIndexProvenance(
  left: AtlasSelfIndexProvenanceRow,
  right: AtlasSelfIndexProvenanceRow,
): number {
  return (
    left.filePath.localeCompare(right.filePath) ||
    left.kind.localeCompare(right.kind) ||
    left.name.localeCompare(right.name)
  );
}

function compareClassSurface(
  left: AtlasSelfClassSurfaceRow,
  right: AtlasSelfClassSurfaceRow,
): number {
  return (
    left.filePath.localeCompare(right.filePath) ||
    left.name.localeCompare(right.name)
  );
}

function compareFunctionSurface(
  left: AtlasSelfFunctionSurfaceRow,
  right: AtlasSelfFunctionSurfaceRow,
): number {
  return (
    left.filePath.localeCompare(right.filePath) ||
    left.functionKind.localeCompare(right.functionKind) ||
    left.name.localeCompare(right.name)
  );
}

function countBy<TValue>(
  rows: readonly TValue[],
  keyFor: (row: TValue) => string,
): Readonly<Record<string, number>> {
  const counts: Record<string, number> = {};
  for (const row of rows) {
    const key = keyFor(row);
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return Object.fromEntries(
    Object.entries(counts).sort(([left], [right]) => left.localeCompare(right)),
  );
}
