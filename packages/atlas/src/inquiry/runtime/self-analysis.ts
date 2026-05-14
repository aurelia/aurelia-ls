import ts from "typescript";

import { uniqueSortedStrings } from "../../collections.js";
import { PhaseProfiler } from "../../phase-profile.js";
import { normalizedSourceFingerprint, stableTextFingerprint } from "../../text-fingerprint.js";
import { lowerFirst } from "../../text-case.js";
import { functionBodyShapeFingerprint } from "../../ast-fingerprint.js";
import {
  classDeclarationSurface,
  requiredSourceFileIdentity,
  hasModifier,
  objectLiteralObjectPropertyValue,
  objectLiteralPropertyAssignment,
  objectLiteralStringPropertyValue,
  propertyNameText,
  readTypeScriptEnumUsageIndex,
  sourceRangeFromFileSpan,
  sourceSpanForNode,
  SourceProjectMemo,
  stringLiteralArgument,
  unwrapExpression,
  type SourceProject,
  type TypeScriptEnumDeclarationRow,
  type TypeScriptEnumUsageIndex,
} from "../../source/index.js";
import { LensCatalog } from "../lens.js";
import type { SourceRange } from "../locus.js";
import type { FrameworkSemanticRouteSpec } from "./framework-continuation-core.js";
import {
  FRAMEWORK_SEMANTIC_ROUTE_SPECS,
  frameworkSemanticRouteSpecByPropertyName,
} from "./framework-route-catalog.js";
import {
  buildAtlasSelfEnumAnalysis,
  enumMemberNameByValue,
  enumMemberValueByName,
} from "./self-enums.js";
import {
  AtlasSelfContractStringClassifier,
  buildAtlasSelfStringRows,
  constObjectMemberForStringLiteral,
  isStringLiteralLike,
  stringRoleForNode,
} from "./self-strings.js";
import {
  ATLAS_SELF_ANALYSIS_VERSION,
  AtlasSelfAxisPressureKind,
} from "./self-analysis-contracts.js";
import type {
  AtlasSelfAnalysis,
  AtlasSelfAnalysisPhaseProfileRow,
  AtlasSelfAxisPressureRow,
  AtlasSelfClassSurfaceRow,
  AtlasSelfContinuationRow,
  AtlasSelfContractStringRow,
  AtlasSelfEnumMappingRow,
  AtlasSelfEnumReferenceRow,
  AtlasSelfEnumRow,
  AtlasSelfEnumValueSpaceRow,
  AtlasSelfFunctionShapeGroupRow,
  AtlasSelfFunctionSurfaceRow,
  AtlasSelfFunctionWrapperRow,
  AtlasSelfLensImplementationRow,
  AtlasSelfModuleDependencyRow,
  AtlasSelfProjectionBranchRow,
  AtlasSelfRelationshipSurfaceRow,
  AtlasSelfRowSurfaceRole,
  AtlasSelfRowSurfaceRow,
  AtlasSelfSemanticRouteRow,
  AtlasSelfSourceFileModuleShape,
  AtlasSelfSourceFileSurfaceRow,
  AtlasSelfStringLiteralRow,
  AtlasSelfStringOccurrence,
  AtlasSelfSubstrateSurfaceRow,
} from "./self-analysis-contracts.js";

export * from "./self-analysis-contracts.js";

type FunctionDeclarationRow = AtlasSelfFunctionSurfaceRow;
type FunctionWrapperSeed = Omit<
  AtlasSelfFunctionWrapperRow,
  "incomingCallCount" | "incomingValueReferenceCount" | "incomingUsageCount" | "summary"
>;

interface FunctionCallEdge {
  readonly filePath: string;
  readonly fromFunction: string;
  readonly toFunction: string;
}

interface FunctionValueReference {
  readonly filePath: string;
  readonly functionName: string;
}

interface FunctionImportBinding {
  readonly filePath: string;
  readonly localName: string;
  readonly importedName: string;
  readonly importedFilePath: string;
}

interface SelfAnalysisVisitContext {
  readonly sourceFile: ts.SourceFile;
  readonly packageId: string;
  readonly filePath: string;
  readonly currentFunction: string | null;
  readonly currentClass: string | null;
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

const atlasSelfAnalysisMemo = new SourceProjectMemo<AtlasSelfAnalysis>();

/** Read or build the Atlas self-analysis model for the current Program epoch. */
export function readAtlasSelfAnalysis(
  /** Hot source project owned by the runtime. */
  sourceProject: SourceProject,
): AtlasSelfAnalysis {
  return atlasSelfAnalysisMemo.read(sourceProject, () =>
    buildAtlasSelfAnalysis(sourceProject),
  );
}

function buildAtlasSelfAnalysis(
  sourceProject: SourceProject,
): AtlasSelfAnalysis {
  const profiler = new PhaseProfiler<AtlasSelfAnalysisPhaseProfileRow>();
  return new AtlasSelfAnalysisBuilder(sourceProject, profiler).build();
}

class AtlasSelfAnalysisBuilder {
  readonly #sourceProject: SourceProject;
  readonly #profiler: PhaseProfiler<AtlasSelfAnalysisPhaseProfileRow>;
  readonly #enumUsage: TypeScriptEnumUsageIndex;
  readonly #stringOccurrences: AtlasSelfStringOccurrence[] = [];
  readonly #rowSurfaces: AtlasSelfRowSurfaceRow[] = [];
  readonly #classSurfaces: AtlasSelfClassSurfaceRow[] = [];
  readonly #sourceFileSurfaces: AtlasSelfSourceFileSurfaceRow[] = [];
  readonly #functionDeclarations: FunctionDeclarationRow[] = [];
  readonly #functionWrapperSeeds: FunctionWrapperSeed[] = [];
  readonly #functionCallEdges: FunctionCallEdge[] = [];
  readonly #topLevelFunctionCallReferences: FunctionValueReference[] = [];
  readonly #functionValueReferences: FunctionValueReference[] = [];
  readonly #functionImportBindings: FunctionImportBinding[] = [];
  readonly #lensImplementationSeeds: Omit<
    AtlasSelfLensImplementationRow,
    "id" | "lensId" | "reachableFunctions" | "summary"
  >[] = [];
  readonly #projectionBranchSeeds: MutableProjectionBranchRow[] = [];
  readonly #continuationSeeds: MutableContinuationRow[] = [];
  readonly #moduleDependencies: AtlasSelfModuleDependencyRow[] = [];
  readonly #substrateSurfaces: AtlasSelfSubstrateSurfaceRow[] = [];
  readonly #axisMapperPressure: AtlasSelfAxisPressureRow[] = [];

  constructor(
    sourceProject: SourceProject,
    profiler: PhaseProfiler<AtlasSelfAnalysisPhaseProfileRow>,
  ) {
    this.#sourceProject = sourceProject;
    this.#profiler = profiler;
    const enumUsage = this.#profiler.time(
      "enum-usage-index",
      undefined,
      "Build the TypeScript enum usage index for Atlas source.",
      () => readTypeScriptEnumUsageIndex(sourceProject, {
        packageId: "atlas",
      }),
    );
    this.#profiler.addNestedRows("enum-usage", enumUsage.profile);
    this.#enumUsage = enumUsage;
  }

  build(): AtlasSelfAnalysis {
    const sourceFiles = this.#profiler.time(
      "atlas-source-file-selection",
      undefined,
      "Select Atlas-owned source files from the hot source project.",
      () => this.#sourceProject
        .ownedSourceFiles()
        .filter(
          (sourceFile) =>
            this.#sourceProject.packageForFileName(sourceFile.fileName)?.id ===
            "atlas",
        ),
    );

    this.#profiler.time(
      "source-file-collection",
      sourceFiles.length,
      "Walk Atlas source files and collect raw declaration, string, relationship, continuation, module, and call-edge seeds.",
      () => {
        for (const sourceFile of sourceFiles) {
          this.#collectSourceFile(sourceFile);
        }
      },
    );

    return this.#finalize(sourceFiles.length);
  }

  #collectSourceFile(sourceFile: ts.SourceFile): void {
    const identity = requiredSourceFileIdentity(this.#sourceProject, sourceFile);
    const packageId =
      this.#sourceProject.packageForFileName(sourceFile.fileName)?.id ??
      "unknown";
    const filePath = identity.repoPath;
    this.#functionImportBindings.push(
      ...functionImportBindings(sourceFile, filePath),
    );
    this.#sourceFileSurfaces.push(
      sourceFileSurfaceForSourceFile(sourceFile, packageId, filePath),
    );
    this.#moduleDependencies.push(
      ...moduleDependencyRows(sourceFile, filePath),
    );
    this.#collectDeclarations({
      sourceFile,
      packageId,
      filePath,
      currentFunction: null,
      currentClass: null,
    }, sourceFile);
  }

  #collectDeclarations(
    context: SelfAnalysisVisitContext,
    node: ts.Node,
  ): void {
    if (ts.isFunctionDeclaration(node) && node.name !== undefined) {
      this.#collectFunctionDeclaration(context, node);
      return;
    }
    if (ts.isClassDeclaration(node) && node.name !== undefined) {
      this.#collectClassDeclaration(context, node);
      return;
    }
    if (ts.isMethodDeclaration(node) && node.name !== undefined) {
      this.#collectMethodDeclaration(context, node);
      return;
    }
    this.#collectNodeSurfaces(context, node);
    this.#collectChildren(context, node);
  }

  #collectFunctionDeclaration(
    context: SelfAnalysisVisitContext,
    node: ts.FunctionDeclaration,
  ): void {
    const functionName = node.name!.text;
    this.#functionDeclarations.push(
      atlasSelfFunctionSurfaceForFunctionDeclaration(
        context.sourceFile,
        context.packageId,
        context.filePath,
        node,
      ),
    );
    const wrapper = atlasSelfFunctionWrapperForFunctionDeclaration(
      context.sourceFile,
      context.packageId,
      context.filePath,
      node,
    );
    if (wrapper !== null) {
      this.#functionWrapperSeeds.push(wrapper);
    }
    this.#axisMapperPressure.push(
      ...axisMapperPressureForFunctionLike(
        context.sourceFile,
        context.filePath,
        functionName,
        node,
      ),
    );
    this.#substrateSurfaces.push(
      ...substrateSurfacesForFunction(context.sourceFile, context.filePath, node),
    );
    this.#collectChildren(contextWithFunction(context, functionName), node);
  }

  #collectClassDeclaration(
    context: SelfAnalysisVisitContext,
    node: ts.ClassDeclaration,
  ): void {
    const className = node.name!.text;
    this.#classSurfaces.push(
      atlasSelfClassSurfaceForDeclaration(
        context.sourceFile,
        context.packageId,
        context.filePath,
        node,
      ),
    );
    this.#collectChildren(contextWithClass(context, className), node);
  }

  #collectMethodDeclaration(
    context: SelfAnalysisVisitContext,
    node: ts.MethodDeclaration,
  ): void {
    const methodName = propertyNameText(node.name, context.sourceFile);
    const functionName =
      methodName === null
        ? null
        : context.currentClass === null
        ? methodName
        : `${context.currentClass}.${methodName}`;
    if (functionName !== null) {
      this.#functionDeclarations.push(
        functionSurfaceForMethodDeclaration(
          context.sourceFile,
          context.packageId,
          context.filePath,
          node,
          functionName,
          context.currentClass,
        ),
      );
      const wrapper = atlasSelfFunctionWrapperForMethodDeclaration(
        context.sourceFile,
        context.packageId,
        context.filePath,
        node,
        functionName,
        context.currentClass,
      );
      if (wrapper !== null) {
        this.#functionWrapperSeeds.push(wrapper);
      }
      this.#axisMapperPressure.push(
        ...axisMapperPressureForFunctionLike(
          context.sourceFile,
          context.filePath,
          functionName,
          node,
        ),
      );
    }
    this.#collectChildren(
      contextWithFunction(context, functionName ?? context.currentFunction),
      node,
    );
  }

  #collectNodeSurfaces(
    context: SelfAnalysisVisitContext,
    node: ts.Node,
  ): void {
    if (ts.isVariableStatement(node)) {
      this.#substrateSurfaces.push(
        ...substrateSurfacesForVariableStatement(
          context.sourceFile,
          context.filePath,
          node,
        ),
      );
    }
    if (isStringLiteralLike(node)) {
      this.#stringOccurrences.push({
        value: node.text,
        role: stringRoleForNode(node),
        packageId: context.packageId,
        filePath: context.filePath,
        source: sourceRangeForNode(context.sourceFile, context.filePath, node),
        declaredByConstObjectMember: constObjectMemberForStringLiteral(
          node,
          context.sourceFile,
        ),
      });
    }
    if (ts.isPropertyAccessExpression(node)) {
      // Counted in a second pass after every enum declaration in the project is indexed.
    } else if (ts.isIdentifier(node) && isFunctionValueReferenceIdentifier(node)) {
      this.#functionValueReferences.push({
        filePath: context.filePath,
        functionName: node.text,
      });
    } else if (ts.isCallExpression(node)) {
      const calledFunction = calledFunctionName(node, context.currentClass);
      if (calledFunction !== null) {
        if (context.currentFunction === null) {
          this.#topLevelFunctionCallReferences.push({
            filePath: context.filePath,
            functionName: calledFunction,
          });
        } else {
          this.#functionCallEdges.push({
            filePath: context.filePath,
            fromFunction: context.currentFunction,
            toFunction: calledFunction,
          });
        }
      }
      if (context.currentFunction === null) {
        return;
      }
      const continuation = continuationForHelperCall(
        context.sourceFile,
        context.filePath,
        context.currentFunction,
        node,
      );
      if (continuation !== null) {
        this.#continuationSeeds.push(continuation);
      }
    } else if (ts.isCaseClause(node)) {
      const implementation = lensImplementationSeedForCase(
        context.sourceFile,
        context.filePath,
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
          context.sourceFile,
          context.filePath,
          context.currentFunction,
          node,
        ),
      );
    } else if (ts.isBinaryExpression(node) && context.currentFunction !== null) {
      const projectionBranch = projectionBranchForBinaryExpression(
        context.sourceFile,
        context.filePath,
        context.currentFunction,
        node,
      );
      if (projectionBranch !== null) {
        this.#projectionBranchSeeds.push(projectionBranch);
      }
    } else if (ts.isObjectLiteralExpression(node) && context.currentFunction !== null) {
      const continuation = continuationForObjectLiteral(
        context.sourceFile,
        context.filePath,
        context.currentFunction,
        node,
      );
      if (continuation !== null) {
        this.#continuationSeeds.push(continuation);
      }
      this.#axisMapperPressure.push(
        ...optionalObjectSpreadPressureForObjectLiteral(
          context.sourceFile,
          context.filePath,
          context.currentFunction,
          node,
        ),
      );
    } else if (ts.isInterfaceDeclaration(node)) {
      const row = rowSurfaceForInterface(
        context.sourceFile,
        context.packageId,
        context.filePath,
        node,
      );
      if (row !== null) {
        this.#rowSurfaces.push(row);
      }
    } else if (ts.isTypeAliasDeclaration(node)) {
      const row = rowSurfaceForTypeAlias(
        context.sourceFile,
        context.packageId,
        context.filePath,
        node,
      );
      if (row !== null) {
        this.#rowSurfaces.push(row);
      }
    }
  }

  #collectChildren(context: SelfAnalysisVisitContext, node: ts.Node): void {
    ts.forEachChild(node, (child) =>
      this.#collectDeclarations(context, child),
    );
  }

  #finalize(sourceFileCount: number): AtlasSelfAnalysis {
    const strings = this.#profiler.time(
      "string-row-grouping",
      this.#stringOccurrences.length,
      "Group string literal occurrences and classify enum-backed declarations.",
      () => buildAtlasSelfStringRows(
        this.#stringOccurrences,
        this.#enumUsage,
      ),
    );
    const {
      enums,
      enumReferences,
      enumValueSpaces,
      enumValueOccurrences,
      enumMappings,
    } =
      this.#profiler.time(
        "enum-analysis",
        this.#enumUsage.enumDeclarations.length,
        "Build enum declaration, reference, raw value occurrence, value-space, and mapping rows.",
        () => buildAtlasSelfEnumAnalysis(this.#enumUsage),
      );
    const lensIdByMemberName = enumMemberValueByName(enums, "LensId");
    const navigationRelationMemberByValue = enumMemberNameByValue(
      enums,
      "NavigationRelation",
    );
    const rowSurfaces = this.#rowSurfaces.sort(compareByName);
    const relationshipSurfaces = rowSurfaces.filter(isRelationshipSurface);
    const classSurfaces = this.#classSurfaces.sort(compareClassSurface);
    const sourceFileSurfaces = this.#profiler.time(
      "source-file-surface-finalization",
      this.#sourceFileSurfaces.length,
      "Attach module dependency counts to Atlas source-file surface rows.",
      () => [
        ...finalizeSourceFileSurfaces(
          this.#sourceFileSurfaces,
          this.#moduleDependencies,
        ),
      ].sort(compareSourceFileSurface),
    );
    const functionSurfaces = this.#functionDeclarations.sort(
      compareFunctionSurface,
    );
    const functionShapeGroups = this.#profiler.time(
      "function-shape-grouping",
      functionSurfaces.length,
      "Group equivalent function body/control-flow shapes for split-brain helper pressure.",
      () => atlasSelfFunctionShapeGroups(functionSurfaces),
    );
    const functionWrapperRows = this.#profiler.time(
      "function-wrapper-finalization",
      this.#functionWrapperSeeds.length,
      "Attach local incoming-call counts to shallow constructor/call wrapper rows.",
      () => [
        ...finalizeFunctionWrapperRows(
          this.#functionWrapperSeeds,
          this.#functionCallEdges,
          this.#topLevelFunctionCallReferences,
          this.#functionValueReferences,
          this.#functionImportBindings,
        ),
      ].sort(compareFunctionWrapperRow),
    );
    const lensImplementations = this.#profiler.time(
      "lens-implementation-closure",
      this.#lensImplementationSeeds.length,
      "Close lens implementation seeds through function call and import edges.",
      () => finalizeLensImplementations(
        this.#lensImplementationSeeds,
        this.#enumUsage.enumDeclarations,
        this.#functionDeclarations,
        this.#functionCallEdges,
        this.#functionImportBindings,
      ),
    );
    const projectionBranches = this.#profiler.time(
      "projection-branch-finalization",
      this.#projectionBranchSeeds.length,
      "Attach lens ids and summaries to runtime projection branch rows.",
      () => finalizeProjectionBranches(
        this.#projectionBranchSeeds,
        lensImplementations,
      ),
    );
    const continuations = this.#profiler.time(
      "continuation-finalization",
      this.#continuationSeeds.length,
      "Attach lens ids, navigation relation names, and summaries to continuation rows.",
      () => finalizeContinuations(
        this.#continuationSeeds,
        lensImplementations,
        lensIdByMemberName,
        navigationRelationMemberByValue,
      ),
    );
    const semanticRoutes = this.#profiler.time(
      "semantic-route-materialization",
      FRAMEWORK_SEMANTIC_ROUTE_SPECS.length,
      "Materialize declared framework semantic route topology rows from route specs and source strings.",
      () => atlasSemanticRouteRows(
        this.#stringOccurrences,
        navigationRelationMemberByValue,
      ),
    );
    const contractStrings = this.#profiler.time(
      "contract-string-classification",
      strings.length,
      "Classify contract-bearing string literals across enum, schema, continuation, and lens contract roles.",
      () => new AtlasSelfContractStringClassifier(
        strings,
        continuations,
        this.#substrateSurfaces,
      ).rows(),
    );
    const axisPressure = this.#profiler.time(
      "axis-pressure-classification",
      rowSurfaces.length,
      "Classify enum, relationship, continuation, mapper, and object-spread pressure rows.",
      () => new AtlasSelfAxisPressureClassifier(
        enums,
        rowSurfaces,
        relationshipSurfaces,
        continuations,
        this.#axisMapperPressure,
      ).rows(),
    );
    const rollup = {
      enumCount: enums.length,
      enumMemberCount: enums.reduce((sum, row) => sum + row.memberCount, 0),
      unreferencedEnumMemberCount: enums.reduce(
        (sum, row) => sum + row.unreferencedMemberCount,
        0,
      ),
      enumReferenceCount: enumReferences.length,
      enumRawValueOccurrenceCount: enumValueSpaces.reduce(
        (sum, row) => sum + row.rawValueOccurrenceCount,
        0,
      ),
      enumValueSpaceCount: enumValueSpaces.length,
      enumMappingCount: enumMappings.length,
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
      functionShapeGroupCount: functionShapeGroups.length,
      functionWrapperCount: functionWrapperRows.length,
      singleUseFunctionWrapperCount: functionWrapperRows.filter((row) =>
        row.incomingUsageCount <= 1
      ).length,
      sourceFileSurfaceCount: sourceFileSurfaces.length,
      sourceFileLineCount: sourceFileSurfaces.reduce(
        (sum, row) => sum + row.lineCount,
        0,
      ),
      lensImplementationCount: lensImplementations.length,
      projectionBranchCount: projectionBranches.length,
      continuationCount: continuations.length,
      semanticRouteCount: semanticRoutes.length,
      moduleDependencyCount: this.#moduleDependencies.length,
      crossAreaModuleDependencyCount: this.#moduleDependencies.filter(
        (row) => row.crossesArea,
      ).length,
      substrateSurfaceCount: this.#substrateSurfaces.length,
      contractStringCount: contractStrings.length,
      axisPressureCount: axisPressure.length,
    };

    return {
      version: ATLAS_SELF_ANALYSIS_VERSION,
      sourceFileCount,
      enums,
      enumReferences,
      enumValueSpaces,
      enumValueOccurrences,
      enumMappings,
      strings,
      rowSurfaces,
      relationshipSurfaces,
      classSurfaces,
      sourceFileSurfaces,
      functionSurfaces,
      functionShapeGroups,
      functionWrapperRows,
      lensImplementations,
      projectionBranches,
      continuations,
      semanticRoutes,
      moduleDependencies: this.#moduleDependencies.sort(
        compareModuleDependency,
      ),
      substrateSurfaces: this.#substrateSurfaces.sort(compareSubstrateSurfaces),
      contractStrings,
      axisPressure,
      profile: this.#profiler.rows(),
      rollup,
    };
  }
}

function contextWithFunction(
  context: SelfAnalysisVisitContext,
  currentFunction: string | null,
): SelfAnalysisVisitContext {
  return {
    sourceFile: context.sourceFile,
    packageId: context.packageId,
    filePath: context.filePath,
    currentFunction,
    currentClass: context.currentClass,
  };
}

function contextWithClass(
  context: SelfAnalysisVisitContext,
  currentClass: string | null,
): SelfAnalysisVisitContext {
  return {
    sourceFile: context.sourceFile,
    packageId: context.packageId,
    filePath: context.filePath,
    currentFunction: context.currentFunction,
    currentClass,
  };
}

function atlasSemanticRouteRows(
  occurrences: readonly AtlasSelfStringOccurrence[],
  relationMemberByValue: ReadonlyMap<string, string>,
): readonly AtlasSelfSemanticRouteRow[] {
  const sourceByRouteId = new Map(
    occurrences
      .filter(
        (occurrence) =>
          occurrence.filePath.endsWith(
            "packages/atlas/src/inquiry/runtime/framework-route-catalog.ts",
          ) && occurrence.value.startsWith("framework.route."),
      )
      .map((occurrence) => [occurrence.value, occurrence.source]),
  );
  return FRAMEWORK_SEMANTIC_ROUTE_SPECS.map((routeSpec) => {
    const source = sourceByRouteId.get(routeSpec.id);
    return {
      id: `atlas-self:semantic-route:${routeSpec.id}`,
      semanticRouteId: routeSpec.id,
      navigationSpecId: routeSpec.navigationSpecId,
      targetEndpointId: routeSpec.target.id,
      targetLens: routeSpec.target.lens,
      targetProjection: routeSpec.target.projection,
      relation: routeSpec.relation,
      relationMember: relationMemberByValue.get(routeSpec.relation) ?? null,
      basis: routeSpec.basis,
      source,
      summary: routeSpec.summary,
    };
  });
}

function atlasSelfFunctionShapeGroups(
  functions: readonly AtlasSelfFunctionSurfaceRow[],
): readonly AtlasSelfFunctionShapeGroupRow[] {
  const byShape = new Map<string, AtlasSelfFunctionSurfaceRow[]>();
  for (const row of functions) {
    const group = byShape.get(row.bodyShapeFingerprint);
    if (group === undefined) {
      byShape.set(row.bodyShapeFingerprint, [row]);
    } else {
      group.push(row);
    }
  }
  return [...byShape.entries()]
    .flatMap(([bodyShapeFingerprint, rows]) => {
      if (rows.length < 2) {
        return [];
      }
      const sortedRows = [...rows].sort(compareFunctionSurface);
      const names = uniqueSortedStrings(sortedRows.map((row) => row.name));
      const files = uniqueSortedStrings(sortedRows.map((row) => row.filePath));
      const functionKinds = uniqueSortedStrings(sortedRows.map((row) => row.functionKind));
      return [{
        id: `atlas-self:function-shape:${bodyShapeFingerprint}`,
        bodyShapeFingerprint,
        functionCount: sortedRows.length,
        nameCount: names.length,
        fileCount: files.length,
        lineCount: sortedRows.reduce((sum, row) => sum + row.lineCount, 0),
        functionKinds,
        nameSamples: names.slice(0, 8),
        fileSamples: files.slice(0, 5),
        source: sortedRows[0]!.source,
        summary: `${sortedRows.length} function surface(s) share one AST/control-flow body shape across ${names.length} name(s) and ${files.length} file(s).`,
      } satisfies AtlasSelfFunctionShapeGroupRow];
    })
    .sort((left, right) =>
      right.functionCount - left.functionCount ||
      right.nameCount - left.nameCount ||
      right.fileCount - left.fileCount ||
      right.lineCount - left.lineCount ||
      left.bodyShapeFingerprint.localeCompare(right.bodyShapeFingerprint)
    );
}

function finalizeFunctionWrapperRows(
  seeds: readonly FunctionWrapperSeed[],
  callEdges: readonly FunctionCallEdge[],
  topLevelCallReferences: readonly FunctionValueReference[],
  valueReferences: readonly FunctionValueReference[],
  importBindings: readonly FunctionImportBinding[],
): readonly AtlasSelfFunctionWrapperRow[] {
  const incoming = new Map<string, number>();
  const incomingValueReferences = new Map<string, number>();
  const importedByLocalName = new Map<string, FunctionImportBinding>();
  for (const binding of importBindings) {
    importedByLocalName.set(functionWrapperKey(binding.filePath, binding.localName), binding);
  }
  for (const edge of callEdges) {
    incrementMap(incoming, functionWrapperKey(edge.filePath, edge.toFunction));
    const imported = importedByLocalName.get(functionWrapperKey(edge.filePath, edge.toFunction));
    if (imported !== undefined) {
      incrementMap(incoming, functionWrapperKey(imported.importedFilePath, imported.importedName));
    }
  }
  for (const reference of topLevelCallReferences) {
    incrementMap(incoming, functionWrapperKey(reference.filePath, reference.functionName));
    const imported = importedByLocalName.get(functionWrapperKey(reference.filePath, reference.functionName));
    if (imported !== undefined) {
      incrementMap(incoming, functionWrapperKey(imported.importedFilePath, imported.importedName));
    }
  }
  for (const reference of valueReferences) {
    incrementMap(incomingValueReferences, functionWrapperKey(reference.filePath, reference.functionName));
    const imported = importedByLocalName.get(functionWrapperKey(reference.filePath, reference.functionName));
    if (imported !== undefined) {
      incrementMap(incomingValueReferences, functionWrapperKey(imported.importedFilePath, imported.importedName));
    }
  }
  return seeds.map((seed) => {
    const incomingCallCount = incoming.get(functionWrapperKey(seed.filePath, seed.name)) ?? 0;
    const incomingValueReferenceCount =
      incomingValueReferences.get(functionWrapperKey(seed.filePath, seed.name)) ?? 0;
    const incomingUsageCount = incomingCallCount + incomingValueReferenceCount;
    return {
      ...seed,
      incomingCallCount,
      incomingValueReferenceCount,
      incomingUsageCount,
      summary:
        `${seed.name} is a ${seed.wrapperKind} wrapper around ${seed.wrappedTarget} with ` +
        `${incomingCallCount} locally resolved incoming call(s) and ${incomingValueReferenceCount} value/callback reference(s).`,
    };
  });
}

function functionWrapperKey(filePath: string, functionName: string): string {
  return `${filePath}:${functionName}`;
}

function incrementMap(map: Map<string, number>, key: string): void {
  map.set(key, (map.get(key) ?? 0) + 1);
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
  const hasRelation = fields.includes("relation") || fields.includes("predicate");
  const hasMechanism = fields.includes("mechanism");
  const hasPhase = fields.includes("phase");
  const basisTransition = isBasisTransitionSurface(name, fieldTypes);
  const hasSource =
    fields.includes("source") ||
    fields.includes("firstSource") ||
    fields.includes("span") ||
    fields.includes("fromSpans");
  const hasEndpoints =
    ((fields.includes("from") && fields.includes("to")) ||
      (fields.includes("subject") && fields.includes("object"))) &&
    !basisTransition;
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
  if (name.endsWith("Classification") || name.endsWith("SignatureRow")) {
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

function atlasSelfClassSurfaceForDeclaration(
  sourceFile: ts.SourceFile,
  packageId: string,
  filePath: string,
  node: ts.ClassDeclaration,
): AtlasSelfClassSurfaceRow {
  const surface = classDeclarationSurface(node, sourceFile);
  const source = sourceRangeForNode(sourceFile, filePath, node);
  const lineCount = source.end.line - source.start.line + 1;
  return {
    id: `atlas-self:class:${packageId}:${filePath}:${surface.name}`,
    packageId,
    name: surface.name,
    exported: surface.exported,
    abstract: surface.abstract,
    filePath,
    lineCount,
    extendsType: surface.extendsType,
    implementsTypes: surface.implementsTypes,
    methods: surface.methods,
    staticMethods: surface.staticMethods,
    accessors: surface.accessors,
    properties: surface.properties,
    constructorCount: surface.constructorCount,
    methodCount: surface.methodCount,
    propertyCount: surface.propertyCount,
    source,
    summary: `${
      surface.name
    } spans ${lineCount} line(s) and exposes ${surface.methodCount} method(s), ${surface.propertyCount} property/accessor surface(s), and ${surface.constructorCount} constructor declaration(s).`,
  };
}

function atlasSelfFunctionSurfaceForFunctionDeclaration(
  sourceFile: ts.SourceFile,
  packageId: string,
  filePath: string,
  node: ts.FunctionDeclaration,
): AtlasSelfFunctionSurfaceRow {
  const source = sourceRangeForNode(sourceFile, filePath, node);
  const callStats = callStatsForFunctionLike(node, null);
  return {
    id: `atlas-self:function:${packageId}:${filePath}:${node.name!.text}`,
    packageId,
    name: node.name!.text,
    functionKind: "top-level",
    className: null,
    exported: hasModifier(node, ts.SyntaxKind.ExportKeyword),
    filePath,
    lineCount: lineCountForSourceRange(source),
    bodyFingerprint: normalizedSourceFingerprint(
      (node.body ?? node).getText(sourceFile),
    ),
    bodyShapeFingerprint: functionBodyShapeFingerprint(node, sourceFile),
    callCount: callStats.callCount,
    uniqueCallTargetCount: callStats.uniqueCallTargetCount,
    source,
    summary: `${node.name!.text} is a top-level function in ${filePath} with ${callStats.callCount} direct call(s).`,
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
  const source = sourceRangeForNode(sourceFile, filePath, node);
  const callStats = callStatsForFunctionLike(node, className);
  return {
    id: `atlas-self:function:${packageId}:${filePath}:${functionName}`,
    packageId,
    name: functionName,
    functionKind: "class-method",
    className,
    exported: methodOwningClassIsExported(node),
    filePath,
    lineCount: lineCountForSourceRange(source),
    bodyFingerprint: normalizedSourceFingerprint(
      (node.body ?? node).getText(sourceFile),
    ),
    bodyShapeFingerprint: functionBodyShapeFingerprint(node, sourceFile),
    callCount: callStats.callCount,
    uniqueCallTargetCount: callStats.uniqueCallTargetCount,
    source,
    summary: `${functionName} is a class method in ${filePath} with ${callStats.callCount} direct call(s).`,
  };
}

function atlasSelfFunctionWrapperForFunctionDeclaration(
  sourceFile: ts.SourceFile,
  packageId: string,
  filePath: string,
  node: ts.FunctionDeclaration,
): FunctionWrapperSeed | null {
  const name = node.name?.text;
  if (name === undefined) {
    return null;
  }
  return atlasSelfFunctionWrapperForFunctionLike(
    sourceFile,
    packageId,
    filePath,
    node,
    name,
    "top-level",
    null,
    hasModifier(node, ts.SyntaxKind.ExportKeyword),
  );
}

function atlasSelfFunctionWrapperForMethodDeclaration(
  sourceFile: ts.SourceFile,
  packageId: string,
  filePath: string,
  node: ts.MethodDeclaration,
  functionName: string,
  className: string | null,
): FunctionWrapperSeed | null {
  return atlasSelfFunctionWrapperForFunctionLike(
    sourceFile,
    packageId,
    filePath,
    node,
    functionName,
    "class-method",
    className,
    methodOwningClassIsExported(node),
  );
}

function atlasSelfFunctionWrapperForFunctionLike(
  sourceFile: ts.SourceFile,
  packageId: string,
  filePath: string,
  node: ts.FunctionDeclaration | ts.MethodDeclaration,
  name: string,
  functionKind: AtlasSelfFunctionWrapperRow["functionKind"],
  className: string | null,
  exported: boolean,
): FunctionWrapperSeed | null {
  const body = node.body;
  if (body === undefined || body.statements.length !== 1) {
    return null;
  }
  const statement = body.statements[0];
  if (statement === undefined || !ts.isReturnStatement(statement) || statement.expression === undefined) {
    return null;
  }
  const wrapped = wrappedReturnExpression(statement.expression, sourceFile, className);
  if (wrapped === null) {
    return null;
  }
  const source = sourceRangeForNode(sourceFile, filePath, node);
  return {
    id: `atlas-self:function-wrapper:${packageId}:${filePath}:${name}`,
    packageId,
    name,
    functionKind,
    className,
    exported,
    filePath,
    lineCount: lineCountForSourceRange(source),
    wrapperKind: wrapped.wrapperKind,
    wrappedTarget: wrapped.wrappedTarget,
    argumentCount: wrapped.argumentCount,
    statementCount: body.statements.length,
    source,
  };
}

function wrappedReturnExpression(
  expression: ts.Expression,
  sourceFile: ts.SourceFile,
  currentClass: string | null,
): Pick<AtlasSelfFunctionWrapperRow, "wrapperKind" | "wrappedTarget" | "argumentCount"> | null {
  const unwrapped = unwrapReturnedExpression(expression);
  if (ts.isNewExpression(unwrapped)) {
    return {
      wrapperKind: "constructor-return",
      wrappedTarget: unwrapped.expression.getText(sourceFile),
      argumentCount: unwrapped.arguments?.length ?? 0,
    };
  }
  if (ts.isCallExpression(unwrapped)) {
    const wrappedTarget = shallowWrapperCallTarget(unwrapped, sourceFile, currentClass);
    if (wrappedTarget === null) {
      return null;
    }
    return {
      wrapperKind: "call-return",
      wrappedTarget,
      argumentCount: unwrapped.arguments.length,
    };
  }
  return null;
}

function shallowWrapperCallTarget(
  node: ts.CallExpression,
  sourceFile: ts.SourceFile,
  currentClass: string | null,
): string | null {
  if (ts.isIdentifier(node.expression)) {
    return node.expression.text;
  }
  if (!ts.isPropertyAccessExpression(node.expression)) {
    return null;
  }
  const methodName = propertyNameText(node.expression.name, sourceFile)
    ?? node.expression.name.getText(sourceFile);
  const receiver = node.expression.expression;
  if (receiver.kind === ts.SyntaxKind.ThisKeyword && currentClass !== null) {
    return `${currentClass}.${methodName}`;
  }
  if (ts.isIdentifier(receiver)) {
    return `${receiver.text}.${methodName}`;
  }
  if (ts.isNewExpression(receiver) && ts.isIdentifier(receiver.expression)) {
    return `${receiver.expression.text}.${methodName}`;
  }
  return null;
}

function unwrapReturnedExpression(expression: ts.Expression): ts.Expression {
  const unwrapped = unwrapExpression(expression);
  if (ts.isAwaitExpression(unwrapped)) {
    return unwrapReturnedExpression(unwrapped.expression);
  }
  return unwrapped;
}

function sourceFileSurfaceForSourceFile(
  sourceFile: ts.SourceFile,
  packageId: string,
  filePath: string,
): AtlasSelfSourceFileSurfaceRow {
  const source = sourceRangeForNode(sourceFile, filePath, sourceFile);
  const importCount = sourceFile.statements.filter(ts.isImportDeclaration).length;
  const exportCount = sourceFile.statements.filter(isTopLevelExportStatement).length;
  const declarationCount = sourceFile.statements.filter(isTopLevelDeclarationStatement).length;
  const typeDeclarationCount = sourceFile.statements.filter(isTopLevelTypeDeclarationStatement).length;
  const valueDeclarationCount = sourceFile.statements.filter(isTopLevelValueDeclarationStatement).length;
  const largeLiteralCount = sourceFile.statements.filter((statement) =>
    isTopLevelLargeLiteralStatement(sourceFile, statement),
  ).length;
  const lineCount = lineCountForSourceRange(source);
  const moduleShape = sourceFileModuleShape(sourceFile, {
    lineCount,
    typeDeclarationCount,
    valueDeclarationCount,
    largeLiteralCount,
  });
  return {
    id: `atlas-self:source-file:${filePath}`,
    packageId,
    area: atlasAreaForPath(filePath),
    filePath,
    lineCount,
    moduleShape,
    statementCount: sourceFile.statements.length,
    importCount,
    outgoingLocalImportCount: 0,
    incomingLocalImportCount: 0,
    crossAreaOutgoingImportCount: 0,
    exportCount,
    declarationCount,
    typeDeclarationCount,
    valueDeclarationCount,
    largeLiteralCount,
    source,
    summary: `${filePath} is a ${moduleShape} module spanning ${lineCount} line(s), ${sourceFile.statements.length} top-level statement(s), ${importCount} import(s), ${exportCount} export surface(s), and ${declarationCount} declaration statement(s).`,
  };
}

function isTopLevelExportStatement(statement: ts.Statement): boolean {
  return ts.isExportDeclaration(statement) ||
    ts.isExportAssignment(statement) ||
    hasModifier(statement, ts.SyntaxKind.ExportKeyword);
}

function isTopLevelDeclarationStatement(statement: ts.Statement): boolean {
  return ts.isClassDeclaration(statement) ||
    ts.isFunctionDeclaration(statement) ||
    ts.isInterfaceDeclaration(statement) ||
    ts.isTypeAliasDeclaration(statement) ||
    ts.isEnumDeclaration(statement) ||
    ts.isVariableStatement(statement);
}

function isTopLevelTypeDeclarationStatement(statement: ts.Statement): boolean {
  return ts.isInterfaceDeclaration(statement) ||
    ts.isTypeAliasDeclaration(statement) ||
    ts.isEnumDeclaration(statement);
}

function isTopLevelValueDeclarationStatement(statement: ts.Statement): boolean {
  return ts.isClassDeclaration(statement) ||
    ts.isFunctionDeclaration(statement) ||
    ts.isVariableStatement(statement);
}

function sourceFileModuleShape(
  sourceFile: ts.SourceFile,
  counts: {
    readonly lineCount: number;
    readonly typeDeclarationCount: number;
    readonly valueDeclarationCount: number;
    readonly largeLiteralCount: number;
  },
): AtlasSelfSourceFileModuleShape {
  const statements = sourceFile.statements;
  if (statements.length > 0 && statements.every(isBarrelStatement)) {
    return "barrel";
  }
  if (
    counts.largeLiteralCount > 0 &&
    counts.lineCount >= 100 &&
    counts.valueDeclarationCount <= 3
  ) {
    return "catalog";
  }
  if (counts.typeDeclarationCount > 0 && counts.valueDeclarationCount === 0) {
    return "contract";
  }
  if (counts.typeDeclarationCount > 0 && counts.valueDeclarationCount > 0) {
    return "mixed";
  }
  return "implementation";
}

function isBarrelStatement(statement: ts.Statement): boolean {
  return ts.isImportDeclaration(statement) ||
    ts.isExportDeclaration(statement) ||
    ts.isExportAssignment(statement);
}

function isTopLevelLargeLiteralStatement(sourceFile: ts.SourceFile, statement: ts.Statement): boolean {
  if (!ts.isVariableStatement(statement)) {
    return false;
  }
  for (const declaration of statement.declarationList.declarations) {
    if (declaration.initializer === undefined) {
      continue;
    }
    const initializer = unwrapExpression(declaration.initializer);
    if (
      (ts.isArrayLiteralExpression(initializer) ||
        ts.isObjectLiteralExpression(initializer)) &&
      nodeLineCount(sourceFile, initializer) >= 40
    ) {
      return true;
    }
  }
  return false;
}

function nodeLineCount(sourceFile: ts.SourceFile, node: ts.Node): number {
  const start = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line;
  const end = sourceFile.getLineAndCharacterOfPosition(node.getEnd()).line;
  return end - start + 1;
}

function finalizeSourceFileSurfaces(
  rows: readonly AtlasSelfSourceFileSurfaceRow[],
  dependencies: readonly AtlasSelfModuleDependencyRow[],
): readonly AtlasSelfSourceFileSurfaceRow[] {
  const outgoing = new Map<string, number>();
  const incoming = new Map<string, number>();
  const crossAreaOutgoing = new Map<string, number>();
  for (const dependency of dependencies) {
    if (dependency.toFile === null) {
      continue;
    }
    outgoing.set(dependency.fromFile, (outgoing.get(dependency.fromFile) ?? 0) + 1);
    incoming.set(dependency.toFile, (incoming.get(dependency.toFile) ?? 0) + 1);
    if (dependency.crossesArea) {
      crossAreaOutgoing.set(
        dependency.fromFile,
        (crossAreaOutgoing.get(dependency.fromFile) ?? 0) + 1,
      );
    }
  }
  return rows.map((row) => ({
    ...row,
    outgoingLocalImportCount: outgoing.get(row.filePath) ?? 0,
    incomingLocalImportCount: incoming.get(row.filePath) ?? 0,
    crossAreaOutgoingImportCount: crossAreaOutgoing.get(row.filePath) ?? 0,
    summary: `${row.filePath} is a ${row.moduleShape} module spanning ${row.lineCount} line(s), ${row.statementCount} top-level statement(s), ${row.importCount} import(s), ${outgoing.get(row.filePath) ?? 0} local outgoing edge(s), ${incoming.get(row.filePath) ?? 0} local incoming edge(s), ${row.exportCount} export surface(s), and ${row.declarationCount} declaration statement(s).`,
  }));
}

function callStatsForFunctionLike(
  node: ts.FunctionDeclaration | ts.MethodDeclaration,
  currentClass: string | null,
): { readonly callCount: number; readonly uniqueCallTargetCount: number } {
  let callCount = 0;
  const targets = new Set<string>();
  const visit = (child: ts.Node): void => {
    if (child !== node && isNestedExecutableDeclaration(child)) {
      return;
    }
    if (ts.isCallExpression(child)) {
      callCount += 1;
      const target = calledFunctionName(child, currentClass);
      if (target !== null) {
        targets.add(target);
      }
    }
    ts.forEachChild(child, visit);
  };
  visit(node);
  return {
    callCount,
    uniqueCallTargetCount: targets.size,
  };
}

function isNestedExecutableDeclaration(node: ts.Node): boolean {
  return ts.isFunctionDeclaration(node) ||
    ts.isFunctionExpression(node) ||
    ts.isArrowFunction(node) ||
    ts.isMethodDeclaration(node) ||
    ts.isGetAccessor(node) ||
    ts.isSetAccessor(node) ||
    ts.isConstructorDeclaration(node) ||
    ts.isClassDeclaration(node);
}

function methodOwningClassIsExported(node: ts.MethodDeclaration): boolean {
  return (
    ts.isClassDeclaration(node.parent) &&
    hasModifier(node.parent, ts.SyntaxKind.ExportKeyword)
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
        id: `atlas-self:module:${filePath}:${statement.pos}:${stableTextFingerprint(
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

function functionImportBindings(
  sourceFile: ts.SourceFile,
  filePath: string,
): readonly FunctionImportBinding[] {
  const bindings: FunctionImportBinding[] = [];
  for (const statement of sourceFile.statements) {
    if (
      !ts.isImportDeclaration(statement) ||
      statement.moduleSpecifier === undefined ||
      !ts.isStringLiteral(statement.moduleSpecifier) ||
      !statement.moduleSpecifier.text.startsWith(".")
    ) {
      continue;
    }
    const importedFilePath = resolveRelativeModule(
      filePath,
      statement.moduleSpecifier.text,
    );
    if (importedFilePath === null) {
      continue;
    }
    const namedBindings = statement.importClause?.namedBindings;
    if (
      namedBindings === undefined ||
      !ts.isNamedImports(namedBindings)
    ) {
      continue;
    }
    for (const element of namedBindings.elements) {
      bindings.push({
        filePath,
        localName: element.name.text,
        importedName: element.propertyName?.text ?? element.name.text,
        importedFilePath,
      });
    }
  }
  return bindings;
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

function substrateSurfacesForFunction(
  sourceFile: ts.SourceFile,
  filePath: string,
  node: ts.FunctionDeclaration,
): readonly AtlasSelfSubstrateSurfaceRow[] {
  const name = node.name?.text;
  if (name === undefined) {
    return [];
  }
  const kind = substrateSurfaceKindForFunctionName(name);
  if (kind === null) {
    return [];
  }
  return [
    {
      id: `atlas-self:substrate-surface:${kind}:${filePath}:${name}`,
      kind,
      name,
      filePath,
      value: null,
      source: sourceRangeForNode(sourceFile, filePath, node),
      summary: `${name} is an Atlas ${kind} surface.`,
    },
  ];
}

function substrateSurfacesForVariableStatement(
  sourceFile: ts.SourceFile,
  filePath: string,
  node: ts.VariableStatement,
): readonly AtlasSelfSubstrateSurfaceRow[] {
  return node.declarationList.declarations.flatMap((declaration) => {
    if (!ts.isIdentifier(declaration.name)) {
      return [];
    }
    const name = declaration.name.text;
    const value = stringLiteralExpressionText(declaration.initializer);
    const kind = substrateSurfaceKindForVariable(name, value);
    if (kind === null) {
      return [];
    }
    return [
      {
        id: `atlas-self:substrate-surface:${kind}:${filePath}:${name}`,
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

function substrateSurfaceKindForFunctionName(
  name: string,
): AtlasSelfSubstrateSurfaceRow["kind"] | null {
  if (/^(read|get).*?(Index|Cache|Manifest)$/u.test(name)) {
    return "reader";
  }
  if (/^(build|create|write).*?(Index|Cache|Manifest)$/u.test(name)) {
    return "builder";
  }
  return null;
}

function substrateSurfaceKindForVariable(
  name: string,
  value: string | null,
): AtlasSelfSubstrateSurfaceRow["kind"] | null {
  if (/(SCHEMA|VERSION)/u.test(name) && value !== null) {
    return "schema-version";
  }
  return null;
}

function stringLiteralExpressionText(
  expression: ts.Expression | undefined,
): string | null {
  if (expression === undefined) {
    return null;
  }
  let current: ts.Expression = expression;
  while (
    ts.isAsExpression(current) ||
    ts.isTypeAssertionExpression(current) ||
    ts.isSatisfiesExpression(current)
  ) {
    current = current.expression;
  }
  return isStringLiteralLike(current) ? current.text : null;
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
      propertyNameText(node.expression.name, node.getSourceFile()) ??
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

function isFunctionValueReferenceIdentifier(node: ts.Identifier): boolean {
  if (isIdentifierDeclarationName(node) || isIdentifierInTypePosition(node)) {
    return false;
  }
  const parent = node.parent;
  if (parent === undefined) {
    return true;
  }
  if (ts.isCallExpression(parent) && parent.expression === node) {
    return false;
  }
  if (ts.isPropertyAccessExpression(parent) && parent.name === node) {
    return false;
  }
  if (ts.isPropertyAssignment(parent) && parent.name === node) {
    return false;
  }
  if (ts.isBindingElement(parent) && parent.name === node) {
    return false;
  }
  if (ts.isExportSpecifier(parent) || ts.isImportSpecifier(parent)) {
    return false;
  }
  return true;
}

function isIdentifierDeclarationName(node: ts.Identifier): boolean {
  const parent = node.parent;
  if (parent === undefined) {
    return false;
  }
  return (
    ((ts.isClassDeclaration(parent) ||
      ts.isFunctionDeclaration(parent) ||
      ts.isMethodDeclaration(parent) ||
      ts.isInterfaceDeclaration(parent) ||
      ts.isTypeAliasDeclaration(parent) ||
      ts.isEnumDeclaration(parent) ||
      ts.isVariableDeclaration(parent) ||
      ts.isParameter(parent) ||
      ts.isPropertyDeclaration(parent) ||
      ts.isPropertySignature(parent) ||
      ts.isMethodSignature(parent) ||
      ts.isImportSpecifier(parent) ||
      ts.isExportSpecifier(parent)) &&
      parent.name === node) ||
    (ts.isImportClause(parent) && parent.name === node)
  );
}

function isIdentifierInTypePosition(node: ts.Identifier): boolean {
  for (let current: ts.Node | undefined = node.parent; current !== undefined; current = current.parent) {
    if (ts.isTypeNode(current)) {
      return true;
    }
    if (
      ts.isExpressionStatement(current) ||
      ts.isBlock(current) ||
      ts.isSourceFile(current) ||
      ts.isCallExpression(current) ||
      ts.isNewExpression(current) ||
      ts.isObjectLiteralExpression(current) ||
      ts.isArrayLiteralExpression(current) ||
      ts.isPropertyAssignment(current) ||
      ts.isShorthandPropertyAssignment(current) ||
      ts.isReturnStatement(current) ||
      ts.isVariableDeclaration(current)
    ) {
      return false;
    }
  }
  return false;
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
  const continuationId = objectLiteralStringPropertyValue(node, "id");
  const priority = enumMemberProperty(
    node,
    "priority",
    "ContinuationPriority",
    sourceFile,
  );
  const inquiry = objectLiteralObjectPropertyValue(node, "inquiry");
  const targetLens =
    inquiry === null
      ? null
      : enumMemberProperty(inquiry, "lens", "LensId", sourceFile) ??
        objectLiteralStringPropertyValue(inquiry, "lens");
  const targetProjection =
    inquiry === null ? null : objectLiteralStringPropertyValue(inquiry, "projection");
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
  const rowContinuation = continuationForRowContinuationBuilderCall(
    sourceFile,
    filePath,
    currentFunction,
    node,
  );
  if (rowContinuation !== null) {
    return rowContinuation;
  }
  const builderContinuation = continuationForSemanticRouteBuilderCall(
    sourceFile,
    filePath,
    currentFunction,
    node,
  );
  if (builderContinuation !== null) {
    return builderContinuation;
  }
  const helperName = calledFunctionName(node);
  if (helperName === "projectionContinuation") {
    const options = objectArgument(node, 4);
    const targetLens =
      options === null
        ? null
        : enumMemberProperty(options, "lens", "LensId", sourceFile) ??
          objectLiteralStringPropertyValue(options, "lens");
    return {
      id: `atlas-self:continuation:${filePath}:${currentFunction}:${node.pos}`,
      continuationId: stringLiteralArgument(node, 1),
      kind: targetLens === null ? "SwitchProjection" : null,
      priority:
        options === null
          ? "Primary"
          : enumMemberProperty(
              options,
              "priority",
              "ContinuationPriority",
              sourceFile,
            ) ?? "Primary",
      functionName: currentFunction,
      filePath,
      targetLens,
      targetProjection: stringLiteralArgument(node, 2),
      routeRelationMember: "ProjectionOf",
      source: sourceRangeForNode(sourceFile, filePath, node),
    };
  }
  if (helperName === "nextPageContinuation") {
    const options = objectArgument(node, 5);
    return {
      id: `atlas-self:continuation:${filePath}:${currentFunction}:${node.pos}`,
      continuationId: stringLiteralArgument(node, 1),
      kind: "NextPage",
      priority:
        options === null
          ? "Primary"
          : enumMemberProperty(
              options,
              "priority",
              "ContinuationPriority",
              sourceFile,
            ) ?? "Primary",
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

const rowContinuationBuilderMethodSpecs = {
  source: {
    kind: "InspectEvidence",
    priority: "Primary",
    targetLens: "TsSource",
    targetProjection: "text",
    routeRelationMember: "SourceFor",
  },
  typeFacts: {
    kind: "SwitchLens",
    priority: "Secondary",
    targetLens: "TsType",
    targetProjection: "facts",
    routeRelationMember: "TypeFactsFor",
  },
  callSites: {
    kind: "SwitchLens",
    priority: "Secondary",
    targetLens: "TsType",
    targetProjection: "call-sites",
    routeRelationMember: "CallSitesOf",
  },
  effects: {
    kind: "SwitchLens",
    priority: "Primary",
    targetLens: "FrameworkEvaluator",
    targetProjection: "effects",
    routeRelationMember: "EffectsOf",
  },
} as const;

const rowContinuationBuilderNamesBySourceFile = new WeakMap<
  ts.SourceFile,
  ReadonlySet<string>
>();

function continuationForRowContinuationBuilderCall(
  sourceFile: ts.SourceFile,
  filePath: string,
  currentFunction: string,
  node: ts.CallExpression,
): MutableContinuationRow | null {
  if (!ts.isPropertyAccessExpression(node.expression)) {
    return null;
  }
  const receiver = node.expression.expression;
  if (
    !ts.isIdentifier(receiver) ||
    !rowContinuationBuilderVariableNames(sourceFile).has(receiver.text)
  ) {
    return null;
  }
  const methodName = node.expression.name.text;
  const methodSpec =
    rowContinuationBuilderMethodSpecs[
      methodName as keyof typeof rowContinuationBuilderMethodSpecs
    ];
  if (methodSpec === undefined) {
    return null;
  }
  const options = objectArgument(node, 4);
  return {
    id: `atlas-self:continuation:${filePath}:${currentFunction}:${node.pos}`,
    continuationId: stringLiteralArgument(node, 0),
    kind: methodSpec.kind,
    priority:
      options === null
        ? methodSpec.priority
        : enumMemberProperty(
            options,
            "priority",
            "ContinuationPriority",
            sourceFile,
          ) ?? methodSpec.priority,
    functionName: currentFunction,
    filePath,
    targetLens: methodSpec.targetLens,
    targetProjection: methodSpec.targetProjection,
    routeRelationMember: methodSpec.routeRelationMember,
    source: sourceRangeForNode(sourceFile, filePath, node),
  };
}

function rowContinuationBuilderVariableNames(
  sourceFile: ts.SourceFile,
): ReadonlySet<string> {
  const cached = rowContinuationBuilderNamesBySourceFile.get(sourceFile);
  if (cached !== undefined) {
    return cached;
  }
  const names = new Set<string>();
  const visit = (node: ts.Node): void => {
    if (
      ts.isVariableDeclaration(node) &&
      ts.isIdentifier(node.name) &&
      node.initializer !== undefined &&
      ts.isNewExpression(node.initializer) &&
      ts.isIdentifier(node.initializer.expression) &&
      node.initializer.expression.text === "FrameworkRowContinuationBuilder"
    ) {
      names.add(node.name.text);
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  rowContinuationBuilderNamesBySourceFile.set(sourceFile, names);
  return names;
}

function continuationForSemanticRouteBuilderCall(
  sourceFile: ts.SourceFile,
  filePath: string,
  currentFunction: string,
  node: ts.CallExpression,
): MutableContinuationRow | null {
  if (
    !ts.isPropertyAccessExpression(node.expression) ||
    node.expression.name.text !== "continuation"
  ) {
    return null;
  }
  const routeSpec = semanticRouteSpecArgument(node, 0, sourceFile);
  if (routeSpec === null) {
    return null;
  }
  const instance = objectArgument(node, 2);
  return {
    id: `atlas-self:continuation:${filePath}:${currentFunction}:${node.pos}`,
    continuationId: stringLiteralArgument(node, 1),
    kind:
      instance === null
        ? null
        : enumMemberProperty(
            instance,
            "kind",
            "ContinuationKind",
            sourceFile,
          ),
    priority:
      instance === null
        ? null
        : enumMemberProperty(
            instance,
            "priority",
            "ContinuationPriority",
            sourceFile,
          ),
    functionName: currentFunction,
    filePath,
    targetLens: routeSpec.target.lens,
    targetProjection: routeSpec.target.projection,
    routeRelationMember: routeSpec.relation,
    source: sourceRangeForNode(sourceFile, filePath, node),
  };
}

function semanticRouteSpecArgument(
  node: ts.CallExpression,
  index: number,
  sourceFile: ts.SourceFile,
): FrameworkSemanticRouteSpec | null {
  const argument = node.arguments[index];
  if (argument === undefined) {
    return null;
  }
  return frameworkSemanticRouteSpecByPropertyName(
    semanticRouteSpecPropertyName(argument, sourceFile),
  );
}

function semanticRouteSpecPropertyName(
  node: ts.Node,
  sourceFile: ts.SourceFile,
): string {
  if (ts.isIdentifier(node)) {
    return node.text;
  }
  if (ts.isPropertyAccessExpression(node)) {
    return node.name.text;
  }
  return node.getText(sourceFile);
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

function enumMemberProperty(
  node: ts.ObjectLiteralExpression,
  name: string,
  enumName: string,
  sourceFile: ts.SourceFile,
): string | null {
  const property = objectLiteralPropertyAssignment(node, name);
  if (property === null) {
    return null;
  }
  return enumMemberName(property.initializer, enumName, sourceFile);
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
  enumRows: readonly TypeScriptEnumDeclarationRow[],
  functionDeclarations: readonly FunctionDeclarationRow[],
  callEdges: readonly FunctionCallEdge[],
  importBindings: readonly FunctionImportBinding[],
): readonly AtlasSelfLensImplementationRow[] {
  const functionGraph = AtlasSelfFunctionGraph.from(
    functionDeclarations,
    callEdges,
    importBindings,
  );
  const lensIdMembers = new Map<string, string | null>();
  for (const enumRow of enumRows) {
    if (enumRow.enumName !== "LensId") {
      continue;
    }
    for (const member of enumRow.members) {
      lensIdMembers.set(
        member.memberName,
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
  readonly #declaredFunctionsByFile: ReadonlyMap<string, ReadonlySet<string>>;
  readonly #callsByFileAndFunction: ReadonlyMap<string, readonly string[]>;
  readonly #importsByFileAndLocalName: ReadonlyMap<
    string,
    FunctionImportBinding
  >;

  private constructor(
    fileByFunctionName: ReadonlyMap<string, string>,
    declaredFunctionsByFile: ReadonlyMap<string, ReadonlySet<string>>,
    callsByFileAndFunction: ReadonlyMap<string, readonly string[]>,
    importsByFileAndLocalName: ReadonlyMap<string, FunctionImportBinding>,
  ) {
    this.#fileByFunctionName = fileByFunctionName;
    this.#declaredFunctionsByFile = declaredFunctionsByFile;
    this.#callsByFileAndFunction = callsByFileAndFunction;
    this.#importsByFileAndLocalName = importsByFileAndLocalName;
  }

  static from(
    declarations: readonly FunctionDeclarationRow[],
    callEdges: readonly FunctionCallEdge[],
    importBindings: readonly FunctionImportBinding[],
  ): AtlasSelfFunctionGraph {
    const fileByFunctionName = new Map<string, string>();
    const declaredFunctionsByFile = new Map<string, Set<string>>();
    for (const declaration of declarations) {
      if (!fileByFunctionName.has(declaration.name)) {
        fileByFunctionName.set(declaration.name, declaration.filePath);
      }
      const functions =
        declaredFunctionsByFile.get(declaration.filePath) ?? new Set<string>();
      functions.add(declaration.name);
      declaredFunctionsByFile.set(declaration.filePath, functions);
    }
    const calls = new Map<string, string[]>();
    for (const edge of callEdges) {
      const key = this.#callKey(edge.filePath, edge.fromFunction);
      const targets = calls.get(key) ?? [];
      targets.push(edge.toFunction);
      calls.set(key, targets);
    }
    const imports = new Map<string, FunctionImportBinding>();
    for (const binding of importBindings) {
      imports.set(this.#callKey(binding.filePath, binding.localName), binding);
    }
    return new AtlasSelfFunctionGraph(
      fileByFunctionName,
      declaredFunctionsByFile,
      calls,
      imports,
    );
  }

  fileForFunction(functionName: string): string | undefined {
    return this.#fileByFunctionName.get(functionName);
  }

  reachableFunctionKeys(start: string, filePath: string): readonly string[] {
    const visited = new Set<string>();
    const queue: { readonly filePath: string; readonly functionName: string }[] = [
      { filePath, functionName: start },
    ];
    while (queue.length > 0) {
      const next = queue.shift()!;
      const key = AtlasSelfFunctionGraph.#callKey(
        next.filePath,
        next.functionName,
      );
      if (visited.has(key)) {
        continue;
      }
      visited.add(key);
      for (const target of this.#callsByFileAndFunction.get(
        key,
      ) ?? []) {
        const resolved = this.#resolveCallTarget(next.filePath, target);
        if (resolved !== null) {
          queue.push(resolved);
        }
      }
    }
    return [...visited]
      .sort((left, right) => left.localeCompare(right));
  }

  #resolveCallTarget(
    filePath: string,
    targetName: string,
  ): { readonly filePath: string; readonly functionName: string } | null {
    if (this.#declaredFunctionsByFile.get(filePath)?.has(targetName)) {
      return { filePath, functionName: targetName };
    }
    const binding = this.#importsByFileAndLocalName.get(
      AtlasSelfFunctionGraph.#callKey(filePath, targetName),
    );
    if (binding !== undefined) {
      return {
        filePath: binding.importedFilePath,
        functionName: binding.importedName,
      };
    }
    return null;
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
  lensIdByMemberName: ReadonlyMap<string, string>,
  navigationRelationMemberByValue: ReadonlyMap<string, string>,
): readonly AtlasSelfContinuationRow[] {
  return dedupeById(seeds)
    .map((seed) => {
      const routeRelationMember =
        seed.routeRelationMember === null
          ? null
          : navigationRelationMemberByValue.get(seed.routeRelationMember) ??
            seed.routeRelationMember;
      const lensIds = lensIdsForFunction(
        seed.filePath,
        seed.functionName,
        lensImplementations,
      );
      const kind = continuationKindForSeed(
        seed,
        lensIds,
        lensIdByMemberName,
      );
      return {
        ...seed,
        kind,
        routeRelationMember,
        lensIds,
        summary: `${seed.continuationId ?? "(anonymous continuation)"} emits ${
          kind ?? "unknown"
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

function continuationKindForSeed(
  seed: MutableContinuationRow,
  lensIds: readonly string[],
  lensIdByMemberName: ReadonlyMap<string, string>,
): string | null {
  if (seed.kind !== null) {
    return seed.kind;
  }
  if (seed.targetProjection === null) {
    return null;
  }
  if (seed.targetLens === null) {
    return "SwitchProjection";
  }
  const targetLensId =
    lensIdByMemberName.get(seed.targetLens) ?? seed.targetLens;
  if (lensIds.length === 1 && lensIds[0] === targetLensId) {
    return "SwitchProjection";
  }
  if (lensIds.length > 0 && !lensIds.includes(targetLensId)) {
    return "SwitchLens";
  }
  return null;
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
      const literalReuseCount = stringEnumLiteralReuseCount(row);
      if (row.unreferencedMemberCount === 0 && literalReuseCount === 0) {
        return [];
      }
      const signals = [
        ...(row.unreferencedMemberCount === 0
          ? []
          : [`unreferenced-members:${row.unreferencedMemberCount}`]),
        ...(literalReuseCount === 0
          ? []
          : [`literal-reuses:${literalReuseCount}`]),
      ];
      const pressure =
        row.unreferencedMemberCount > 3 || literalReuseCount > 10
          ? "high"
          : row.unreferencedMemberCount > 0 && literalReuseCount > 0
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
    const axisFields = uniqueSortedStrings(
      carriers.map((carrier) => carrier.axis),
    );
    for (const axis of axisFields) {
      const axisCarriers = carriers.filter((carrier) => carrier.axis === axis);
      const valueSpaces = uniqueSortedStrings(
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

    const valueSpaces = uniqueSortedStrings(
      carriers.map((carrier) => carrier.valueSpace),
    );
    for (const valueSpace of valueSpaces) {
      const valueSpaceCarriers = carriers.filter(
        (carrier) => carrier.valueSpace === valueSpace,
      );
      const fields = uniqueSortedStrings(
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

function stringEnumLiteralReuseCount(row: AtlasSelfEnumRow): number {
  return row.members
    .filter((member) => typeof member.value === "string")
    .reduce((sum, member) => sum + member.literalReuseCount, 0);
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

  const parameterAxes = uniqueSortedStrings(
    node.parameters.flatMap((parameter) => {
      const name = parameterNameText(parameter.name, sourceFile);
      const typeText = parameter.type?.getText(sourceFile);
      return [
        ...(name === null ? [] : [axisNameForField(name) ?? name]),
        ...(typeText === undefined ? [] : [axisValueSpaceForType(typeText)]),
      ].filter((entry) => axisLikeText(entry) || axisNameForField(entry) !== null);
    }),
  );
  const sourceAxes = uniqueSortedStrings([
    ...parameterAxes,
    ...switchAxes,
    ...comparisonAxes,
  ]);
  const targetAxes = uniqueSortedStrings([...returnedEnumAxes]);
  const mapperName =
    /(?:^|\.)(classify|normalize|coerce|convert|map|relation|mechanism|phase|kind|endpoint|evidenceKind)/u.test(
      functionName,
    );
  if (targetAxes.length === 0 || (!mapperName && sourceAxes.length === 0)) {
    return [];
  }
  const source = sourceRangeForNode(sourceFile, filePath, node);
  const directAxisFactory = isDirectAxisFactoryFunction(node.body);
  const pressure = axisMapperFunctionPressure(
    targetAxes,
    sourceAxes,
    directAxisFactory,
  );
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
      signals: uniqueSortedStrings([
        ...[...returnedSignals],
        ...sourceAxes.map((axis) => `input:${axis}`),
        ...(directAxisFactory ? ["shape:direct-axis-factory"] : []),
      ]),
      pressure,
      source,
      summary: `${functionName} derives ${targetAxes.join(", ")} from ${
        sourceAxes.length === 0 ? "local logic" : sourceAxes.join(", ")
      }.`,
    },
  ];
}

function optionalObjectSpreadPressureForObjectLiteral(
  sourceFile: ts.SourceFile,
  filePath: string,
  functionName: string,
  node: ts.ObjectLiteralExpression,
): readonly AtlasSelfAxisPressureRow[] {
  const optionalSpreads = node.properties.flatMap((property) =>
    optionalObjectSpreadPropertyNames(property, sourceFile),
  );
  if (optionalSpreads.length === 0) {
    return [];
  }

  const propertyNames = uniqueSortedStrings(optionalSpreads.flatMap((entry) => entry));
  return [
    {
      id: `atlas-self:axis-pressure:optional-object-spread:${filePath}:${node.pos}:${node.end}`,
      kind: AtlasSelfAxisPressureKind.OptionalObjectSpread,
      axis: "object-construction",
      axisField: null,
      valueSpace: "optional-spread-properties",
      axisId: "object-construction:optional-spread",
      sourceName: functionName,
      filePath,
      sourceAxes: propertyNames,
      targetAxes: ["object-literal"],
      signals: [
        `conditional-spread-count:${optionalSpreads.length}`,
        ...propertyNames.map((propertyName) => `property:${propertyName}`),
      ],
      pressure: optionalSpreads.length >= 5 ? "high" : optionalSpreads.length >= 2 ? "medium" : "low",
      source: sourceRangeForNode(sourceFile, filePath, node),
      summary: `${functionName} builds an object literal with ${optionalSpreads.length} conditional empty-object spread branch(es).`,
    },
  ];
}

function optionalObjectSpreadPropertyNames(
  property: ts.ObjectLiteralElementLike,
  sourceFile: ts.SourceFile,
): readonly string[] {
  if (!ts.isSpreadAssignment(property)) {
    return [];
  }

  const expression = unwrapExpression(property.expression);
  if (!ts.isConditionalExpression(expression)) {
    return [];
  }

  const whenTrue = optionalObjectLiteral(expression.whenTrue, sourceFile);
  const whenFalse = optionalObjectLiteral(expression.whenFalse, sourceFile);
  if (whenTrue?.kind === "empty" && whenFalse?.kind === "properties") {
    return whenFalse.propertyNames;
  }
  if (whenFalse?.kind === "empty" && whenTrue?.kind === "properties") {
    return whenTrue.propertyNames;
  }
  return [];
}

function optionalObjectLiteral(
  expression: ts.Expression,
  sourceFile: ts.SourceFile,
): { readonly kind: "empty" } | { readonly kind: "properties"; readonly propertyNames: readonly string[] } | null {
  const unwrapped = unwrapExpression(expression);
  if (!ts.isObjectLiteralExpression(unwrapped)) {
    return null;
  }
  if (unwrapped.properties.length === 0) {
    return { kind: "empty" };
  }
  const propertyNames = uniqueSortedStrings(
    unwrapped.properties.flatMap((property) => objectLiteralElementNames(property, sourceFile)),
  );
  return propertyNames.length === 0
    ? null
    : { kind: "properties", propertyNames };
}

function objectLiteralElementNames(
  property: ts.ObjectLiteralElementLike,
  sourceFile: ts.SourceFile,
): readonly string[] {
  if (ts.isShorthandPropertyAssignment(property)) {
    return [property.name.text];
  }
  if (
    ts.isPropertyAssignment(property) ||
    ts.isMethodDeclaration(property) ||
    ts.isGetAccessorDeclaration(property) ||
    ts.isSetAccessorDeclaration(property)
  ) {
    const name = propertyNameText(property.name, sourceFile);
    return name === null ? [] : [name];
  }
  return [];
}

function axisMapperFunctionPressure(
  targetAxes: readonly string[],
  sourceAxes: readonly string[],
  directAxisFactory: boolean,
): AtlasSelfAxisPressureRow["pressure"] {
  const frameworkAxisCount = targetAxes.filter(isFrameworkSemanticAxis).length;
  if (directAxisFactory && frameworkAxisCount > 1) {
    return "medium";
  }
  if (frameworkAxisCount > 1) {
    return "high";
  }
  if (
    frameworkAxisCount === 1 &&
    (targetAxes.length > 1 || sourceAxes.length > 1)
  ) {
    return "medium";
  }
  return targetAxes.length > 1 ? "medium" : "low";
}

function isDirectAxisFactoryFunction(body: ts.Block): boolean {
  const statements = [...body.statements];
  const returned = statements.at(-1);
  if (
    returned === undefined ||
    !ts.isReturnStatement(returned) ||
    returned.expression === undefined ||
    !isDirectAxisFactoryExpression(returned.expression)
  ) {
    return false;
  }
  return statements.slice(0, -1).every(isDirectAxisFactorySetupStatement);
}

function isDirectAxisFactorySetupStatement(statement: ts.Statement): boolean {
  if (ts.isVariableStatement(statement)) {
    return true;
  }
  return (
    ts.isIfStatement(statement) &&
    statement.elseStatement === undefined &&
    statementAlwaysReturnsEmptyAxisFactoryResult(statement.thenStatement)
  );
}

function statementAlwaysReturnsEmptyAxisFactoryResult(
  statement: ts.Statement,
): boolean {
  if (ts.isReturnStatement(statement)) {
    return isEmptyAxisFactoryResult(statement.expression);
  }
  return (
    ts.isBlock(statement) &&
    statement.statements.length === 1 &&
    statementAlwaysReturnsEmptyAxisFactoryResult(statement.statements[0]!)
  );
}

function isEmptyAxisFactoryResult(expression: ts.Expression | undefined): boolean {
  return (
    expression?.kind === ts.SyntaxKind.NullKeyword ||
    (expression !== undefined &&
      ts.isArrayLiteralExpression(expression) &&
      expression.elements.length === 0)
  );
}

function isDirectAxisFactoryExpression(expression: ts.Expression): boolean {
  const current = ts.isParenthesizedExpression(expression)
    ? expression.expression
    : expression;
  return (
    ts.isObjectLiteralExpression(current) ||
    ts.isArrayLiteralExpression(current) ||
    ts.isCallExpression(current)
  );
}

function isFrameworkSemanticAxis(axis: string): boolean {
  return (
    axis.includes("FrameworkRelationship") ||
    axis.includes("FrameworkBundleAssociation") ||
    axis.includes("FrameworkMaterialization")
  );
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

function dedupeById<TRow extends { readonly id: string }>(
  rows: readonly TRow[],
): readonly TRow[] {
  return [...new Map(rows.map((row) => [row.id, row])).values()];
}

function sourceRangeForNode(
  sourceFile: ts.SourceFile,
  filePath: string,
  node: ts.Node,
): SourceRange {
  return sourceRangeFromFileSpan(filePath, sourceSpanForNode(sourceFile, node));
}

function lineCountForSourceRange(source: SourceRange): number {
  return source.end.line - source.start.line + 1;
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

function compareSubstrateSurfaces(
  left: AtlasSelfSubstrateSurfaceRow,
  right: AtlasSelfSubstrateSurfaceRow,
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

function compareSourceFileSurface(
  left: AtlasSelfSourceFileSurfaceRow,
  right: AtlasSelfSourceFileSurfaceRow,
): number {
  return left.filePath.localeCompare(right.filePath);
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

function compareFunctionWrapperRow(
  left: AtlasSelfFunctionWrapperRow,
  right: AtlasSelfFunctionWrapperRow,
): number {
  const exportedRank = Number(left.exported) - Number(right.exported);
  return (
    left.incomingUsageCount - right.incomingUsageCount ||
    left.incomingCallCount - right.incomingCallCount ||
    exportedRank ||
    left.wrapperKind.localeCompare(right.wrapperKind) ||
    right.lineCount - left.lineCount ||
    left.filePath.localeCompare(right.filePath) ||
    left.name.localeCompare(right.name)
  );
}
