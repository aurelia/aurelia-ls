import ts from "typescript";

import {
  FrameworkRelationshipEndpointKind,
  FrameworkRelationshipFamily,
  FrameworkRelationshipMechanism,
  FrameworkRelationshipPhase,
  FrameworkRelationshipRelation,
  type FrameworkRelationshipEndpoint,
} from "../../framework/relationships.js";
import {
  requiredSourceRangeForNode,
  type SourceProject,
} from "../../source/index.js";
import type { SourceRange } from "../locus.js";
import { FrameworkBindingEffectKind } from "./framework-entities.js";
import type {
  FrameworkBindingAdmissionRow,
  FrameworkBindingEffectRow,
  FrameworkBindingProductRow,
  FrameworkBindingSetupRow,
  FrameworkControllerCreationRow,
  FrameworkInstructionDispatchRow,
  FrameworkSyntaxProductRow,
} from "./framework-entities.js";
import type { FrameworkDiscoveryFilters } from "./framework-filters.js";
import {
  readFrameworkBindingAdmissions,
  readFrameworkBindingEffects,
  readFrameworkBindingProducts,
  readFrameworkBindingSetups,
  readFrameworkControllerCreations,
  readFrameworkInstructionDispatches,
  readFrameworkRenderingSyntaxProducts,
} from "./framework-rendering-graph.js";
import { sourceRangeForCallSiteEntry } from "./framework-support.js";
import { uniqueFrameworkSymbolPackageIdentity } from "./framework-symbol-package-index.js";

/** Graph row derived from framework rendering catalogs. */
export interface FrameworkRenderingRelationshipRow {
  /** Stable row id. */
  readonly id: string;
  /** Relationship family. */
  readonly family: FrameworkRelationshipFamily.Rendering;
  /** Semantic rendering relation. */
  readonly relation: FrameworkRelationshipRelation;
  /** Runtime/source mechanism that produced the relation. */
  readonly mechanism: FrameworkRelationshipMechanism;
  /** Rendering/compiler/lifecycle phase for this row. */
  readonly phase: FrameworkRelationshipPhase;
  /** Aurelia framework package id that owns the source evidence. */
  readonly packageId: string;
  /** Package name from the source admission contract. */
  readonly packageName: string;
  /** Source-side relationship origin. */
  readonly from: FrameworkRelationshipEndpoint;
  /** Relationship target. */
  readonly to: FrameworkRelationshipEndpoint;
  /** Exact source evidence for the relationship. */
  readonly source: SourceRange;
  /** Source row id that produced this relationship. */
  readonly sourceRowId: string;
  /** Human-facing relationship summary. */
  readonly summary: string;
}

/** Filters owned by the rendering relationship projection. */
export interface FrameworkRenderingRelationshipFilters
  extends FrameworkDiscoveryFilters {
  /** Filter relationship rows by semantic relation. */
  readonly relation?: string;
  /** Filter relationship rows by runtime/source mechanism. */
  readonly mechanism?: string;
  /** Filter relationship rows by compiler/rendering/lifecycle phase. */
  readonly phase?: string;
}

interface BindingEffectRelationshipFacts {
  readonly relation: FrameworkRelationshipRelation;
  readonly mechanism: FrameworkRelationshipMechanism;
  readonly phase: FrameworkRelationshipPhase;
  readonly idSegment: string;
  readonly summaryVerb: string;
}

const bindingEffectRelationshipFactsByKind: Readonly<
  Record<FrameworkBindingEffectKind, BindingEffectRelationshipFacts>
> = {
  [FrameworkBindingEffectKind.ObserverLookup]: {
    relation: FrameworkRelationshipRelation.LooksUpObserver,
    mechanism: FrameworkRelationshipMechanism.ObserverLookup,
    phase: FrameworkRelationshipPhase.Observation,
    idSegment: "looks-up-observer",
    summaryVerb: "looks up observer",
  },
  [FrameworkBindingEffectKind.LifecycleMethod]: {
    relation: FrameworkRelationshipRelation.PerformsBindingEffect,
    mechanism: FrameworkRelationshipMechanism.BindingLifecycle,
    phase: FrameworkRelationshipPhase.Lifecycle,
    idSegment: "binding-effect",
    summaryVerb: "performs binding effect",
  },
  [FrameworkBindingEffectKind.EventListener]: {
    relation: FrameworkRelationshipRelation.PerformsBindingEffect,
    mechanism: FrameworkRelationshipMechanism.BindingLifecycle,
    phase: FrameworkRelationshipPhase.Lifecycle,
    idSegment: "binding-effect",
    summaryVerb: "performs binding effect",
  },
  [FrameworkBindingEffectKind.Subscription]: {
    relation: FrameworkRelationshipRelation.PerformsBindingEffect,
    mechanism: FrameworkRelationshipMechanism.BindingLifecycle,
    phase: FrameworkRelationshipPhase.Lifecycle,
    idSegment: "binding-effect",
    summaryVerb: "performs binding effect",
  },
};

/** Read derived rendering relationship rows. */
export function readFrameworkRenderingRelationships(
  sourceProject: SourceProject,
  filters: FrameworkRenderingRelationshipFilters,
): readonly FrameworkRenderingRelationshipRow[] {
  const rows = uniqueRenderingRelationships([
    ...readFrameworkRenderingSyntaxProducts(sourceProject, filters).flatMap(
      syntaxProductRelationships,
    ),
    ...readFrameworkInstructionDispatches(sourceProject, filters).map(
      (row) => instructionDispatchRelationship(sourceProject, row),
    ),
    ...readFrameworkControllerCreations(sourceProject, filters).flatMap(
      controllerCreationRelationships,
    ),
    ...readFrameworkBindingProducts(sourceProject, filters).flatMap(
      bindingProductRelationships,
    ),
    ...readFrameworkBindingAdmissions(sourceProject, filters).map(
      bindingAdmissionRelationship,
    ),
    ...readFrameworkBindingEffects(sourceProject, filters).map(
      bindingEffectRelationship,
    ),
    ...readFrameworkBindingSetups(sourceProject, filters).map(
      bindingSetupRelationship,
    ),
    ...bindablesDefinitionRelationships(sourceProject),
  ]);
  return rows
    .filter((row) => renderingRelationshipMatches(row, filters))
    .sort(
      (left, right) =>
        left.packageId.localeCompare(right.packageId) ||
        left.phase.localeCompare(right.phase) ||
        left.relation.localeCompare(right.relation) ||
        left.from.name.localeCompare(right.from.name) ||
        left.to.name.localeCompare(right.to.name),
    );
}

function bindablesDefinitionRelationships(
  sourceProject: SourceProject,
): readonly FrameworkRenderingRelationshipRow[] {
  const sourceFile = sourceProject
    .ownedSourceFiles()
    .find((file) =>
      file.fileName
        .replace(/\\/gu, "/")
        .endsWith("aurelia/packages/runtime-html/src/bindable.ts"),
    );
  if (sourceFile === undefined) {
    return [];
  }
  const classDeclaration = sourceFile.statements.find(
    (statement): statement is ts.ClassDeclaration =>
      ts.isClassDeclaration(statement) &&
      statement.name?.text === "BindableDefinition",
  );
  if (classDeclaration?.name === undefined) {
    return [];
  }
  const source = requiredSourceRangeForNode(sourceProject, classDeclaration.name);
  return [
    {
      id: [
        "framework-rendering-contract",
        "bindable-definition",
        source.filePath,
        source.start.line,
        source.start.character,
      ].join(":"),
      family: FrameworkRelationshipFamily.Rendering,
      relation: FrameworkRelationshipRelation.DefinesRenderingStructure,
      mechanism: FrameworkRelationshipMechanism.SyntaxProduct,
      phase: FrameworkRelationshipPhase.Definition,
      packageId: "runtime-html",
      packageName: "@aurelia/runtime-html",
      from: {
        kind: FrameworkRelationshipEndpointKind.Package,
        name: "@aurelia/runtime-html",
        packageId: "runtime-html",
        packageName: "@aurelia/runtime-html",
        source,
      },
      to: {
        kind: FrameworkRelationshipEndpointKind.Symbol,
        name: "BindableDefinition",
        packageId: "runtime-html",
        packageName: "@aurelia/runtime-html",
        source,
      },
      source,
      sourceRowId: "framework-rendering-contract:bindable-definition",
      summary:
        "BindableDefinition is the runtime-html definition record produced for @bindable metadata and ResourceResolver bindable tables.",
    },
  ];
}

function uniqueRenderingRelationships(
  rows: readonly FrameworkRenderingRelationshipRow[],
): readonly FrameworkRenderingRelationshipRow[] {
  const byKey = new Map<string, FrameworkRenderingRelationshipRow>();
  for (const row of rows) {
    const key = renderingRelationshipIdentity(row);
    const current = byKey.get(key);
    if (
      current === undefined ||
      renderingRelationshipSpecificity(row) >
        renderingRelationshipSpecificity(current)
    ) {
      byKey.set(key, row);
    }
  }
  return [...byKey.values()];
}

function renderingRelationshipIdentity(
  row: FrameworkRenderingRelationshipRow,
): string {
  return [
    row.packageId,
    row.relation,
    row.mechanism,
    row.phase,
    row.from.kind,
    row.from.name,
    row.to.kind,
    row.to.name,
    row.source.filePath,
    row.source.start.line,
    row.source.start.character,
  ].join(":");
}

function renderingRelationshipSpecificity(
  row: FrameworkRenderingRelationshipRow,
): number {
  return (
    (row.to.source === undefined ? 0 : 4) +
    (row.from.source === undefined ? 0 : 2) +
    (row.to.expression === undefined ? 0 : 1)
  );
}

function syntaxProductRelationships(
  row: FrameworkSyntaxProductRow,
): readonly FrameworkRenderingRelationshipRow[] {
  const relationships: FrameworkRenderingRelationshipRow[] = [];
  const from = syntaxProductEndpoint(row);
  if (row.bindingName !== null) {
    relationships.push({
      id: `${row.id}:relationship:produces-binding`,
      family: FrameworkRelationshipFamily.Rendering,
      relation: FrameworkRelationshipRelation.ProducesBinding,
      mechanism: FrameworkRelationshipMechanism.BindingConstruction,
      phase: FrameworkRelationshipPhase.Rendering,
      packageId: row.packageId,
      packageName: row.packageName,
      from,
      to: symbolEndpoint(row.bindingName, row.packageId, row.packageName),
      source: row.source,
      sourceRowId: row.id,
      summary: `${from.name} produces binding ${row.bindingName}.`,
    });
  }
  return relationships;
}

function instructionDispatchRelationship(
  sourceProject: SourceProject,
  row: FrameworkInstructionDispatchRow,
): FrameworkRenderingRelationshipRow {
  const instructionPackage =
    uniqueFrameworkSymbolPackageIdentity(sourceProject, row.instructionName) ?? {
      packageId: row.packageId,
      packageName: row.packageName,
    };
  return {
    id: `${row.id}:relationship:dispatches-instruction`,
    family: FrameworkRelationshipFamily.Rendering,
    relation: FrameworkRelationshipRelation.DispatchesInstruction,
    mechanism: FrameworkRelationshipMechanism.RendererDispatch,
    phase: FrameworkRelationshipPhase.Rendering,
    packageId: row.packageId,
    packageName: row.packageName,
    from: {
      kind: FrameworkRelationshipEndpointKind.Concept,
      name: row.instructionName ?? row.slotName,
      packageId: instructionPackage.packageId,
      packageName: instructionPackage.packageName,
      source: row.instructionSlot.source,
    },
    to: symbolEndpoint(row.rendererName, row.packageId, row.packageName),
    source: row.source,
    sourceRowId: row.id,
    summary: `${row.slotName} dispatches ${row.instructionName ?? "instruction"} to ${row.rendererName}.`,
  };
}

function bindingProductRelationships(
  row: FrameworkBindingProductRow,
): readonly FrameworkRenderingRelationshipRow[] {
  return row.constructionProducts.map((product) => ({
    id: `${row.id}:relationship:constructed-by:${product.id}`,
    family: FrameworkRelationshipFamily.Rendering,
    relation: FrameworkRelationshipRelation.ProducesBinding,
    mechanism: FrameworkRelationshipMechanism.BindingConstruction,
    phase: FrameworkRelationshipPhase.Rendering,
    packageId: row.packageId,
    packageName: row.packageName,
    from: syntaxProductEndpoint(product),
    to: symbolEndpoint(row.bindingName, row.packageId, row.packageName, row.source),
    source: product.source,
    sourceRowId: row.id,
    summary: `${product.producerName} constructs binding ${row.bindingName}.`,
  }));
}

function bindingAdmissionRelationship(
  row: FrameworkBindingAdmissionRow,
): FrameworkRenderingRelationshipRow {
  return {
    id: `${row.id}:relationship:admits-binding`,
    family: FrameworkRelationshipFamily.Rendering,
    relation: FrameworkRelationshipRelation.AdmitsBinding,
    mechanism: FrameworkRelationshipMechanism.ControllerAddBinding,
    phase: FrameworkRelationshipPhase.Binding,
    packageId: row.packageId,
    packageName: row.packageName,
    from: {
      kind: FrameworkRelationshipEndpointKind.Method,
      name: row.producerName,
      packageId: row.packageId,
      packageName: row.packageName,
      source: row.source,
    },
    to: symbolEndpoint(row.bindingName, row.packageId, row.packageName),
    source: row.source,
    sourceRowId: row.id,
    summary: `${row.producerName} admits binding ${row.bindingName} through addBinding.`,
  };
}

function bindingEffectRelationship(
  row: FrameworkBindingEffectRow,
): FrameworkRenderingRelationshipRow {
  const facts = bindingEffectRelationshipFactsByKind[row.effectKind];
  return {
    id: `${row.id}:relationship:${facts.idSegment}`,
    family: FrameworkRelationshipFamily.Rendering,
    relation: facts.relation,
    mechanism: facts.mechanism,
    phase: facts.phase,
    packageId: row.packageId,
    packageName: row.packageName,
    from: symbolEndpoint(row.bindingName, row.packageId, row.packageName),
    to: {
      kind: FrameworkRelationshipEndpointKind.Method,
      name: row.effectName,
      packageId: row.packageId,
      packageName: row.packageName,
      source: row.source,
      expression: row.expression,
    },
    source: row.source,
    sourceRowId: row.id,
    summary: `${row.bindingName}.${row.methodName} ${facts.summaryVerb} ${row.effectName}.`,
  };
}

function bindingSetupRelationship(
  row: FrameworkBindingSetupRow,
): FrameworkRenderingRelationshipRow {
  return {
    id: `${row.id}:relationship:configures-observation`,
    family: FrameworkRelationshipFamily.Rendering,
    relation: FrameworkRelationshipRelation.ConfiguresObservation,
    mechanism: FrameworkRelationshipMechanism.BindingSetup,
    phase: FrameworkRelationshipPhase.Observation,
    packageId: row.packageId,
    packageName: row.packageName,
    from: symbolEndpoint(row.bindingName, row.packageId, row.packageName),
    to: {
      kind: FrameworkRelationshipEndpointKind.Method,
      name: row.setupMethodName,
      packageId: row.packageId,
      packageName: row.packageName,
      source: row.source,
      expression: row.bindingExpression,
    },
    source: row.source,
    sourceRowId: row.id,
    summary: `${row.producerName} configures ${row.bindingName} observation through ${row.setupMethodName}.`,
  };
}

function controllerCreationRelationships(
  row: FrameworkControllerCreationRow,
): readonly FrameworkRenderingRelationshipRow[] {
  const relationships: FrameworkRenderingRelationshipRow[] = [
    {
      id: `${row.id}:relationship:creates-controller`,
      family: FrameworkRelationshipFamily.Rendering,
      relation: FrameworkRelationshipRelation.CreatesController,
      mechanism: FrameworkRelationshipMechanism.RendererControllerFactory,
      phase: FrameworkRelationshipPhase.Hydration,
      packageId: row.packageId,
      packageName: row.packageName,
      from: symbolEndpoint(row.rendererName, row.packageId, row.packageName, row.source),
      to: {
        kind: FrameworkRelationshipEndpointKind.Method,
        name: row.controllerFactoryCall.calleeName,
        packageId: row.packageId,
        packageName: row.packageName,
        source: sourceRangeForCallSiteEntry(row.controllerFactoryCall),
        expression: row.controllerFactoryCall.callee,
      },
      source: sourceRangeForCallSiteEntry(row.controllerFactoryCall),
      sourceRowId: row.id,
      summary: `${row.rendererName} creates ${row.resourceKind} child controller through ${row.controllerFactoryCall.calleeName}.`,
    },
  ];
  if (row.childAdmissionCall !== null) {
    relationships.push({
      id: `${row.id}:relationship:admits-child-controller`,
      family: FrameworkRelationshipFamily.Rendering,
      relation: FrameworkRelationshipRelation.AdmitsChildController,
      mechanism: FrameworkRelationshipMechanism.ControllerAddChild,
      phase: FrameworkRelationshipPhase.Hydration,
      packageId: row.packageId,
      packageName: row.packageName,
      from: symbolEndpoint(row.rendererName, row.packageId, row.packageName, row.source),
      to: {
        kind: FrameworkRelationshipEndpointKind.Concept,
        name: `${row.parentControllerExpression}.children`,
        packageId: row.packageId,
        packageName: row.packageName,
        source: sourceRangeForCallSiteEntry(row.childAdmissionCall),
        expression: row.childAdmissionCall.callee,
      },
      source: sourceRangeForCallSiteEntry(row.childAdmissionCall),
      sourceRowId: row.id,
      summary: `${row.rendererName} admits ${row.childControllerExpression} to ${row.parentControllerExpression}.children.`,
    });
  }
  for (const [index, call] of row.recursiveDispatchCalls.entries()) {
    relationships.push({
      id: `${row.id}:relationship:recursive-renderer-dispatch:${index}`,
      family: FrameworkRelationshipFamily.Rendering,
      relation: FrameworkRelationshipRelation.DispatchesInstruction,
      mechanism: FrameworkRelationshipMechanism.RecursiveRendererDispatch,
      phase: FrameworkRelationshipPhase.Hydration,
      packageId: row.packageId,
      packageName: row.packageName,
      from: symbolEndpoint(row.rendererName, row.packageId, row.packageName, row.source),
      to: {
        kind: FrameworkRelationshipEndpointKind.Expression,
        name: call.callee.text,
        packageId: row.packageId,
        packageName: row.packageName,
        source: sourceRangeForCallSiteEntry(call),
        expression: call.callee,
      },
      source: sourceRangeForCallSiteEntry(call),
      sourceRowId: row.id,
      summary: `${row.rendererName} recursively dispatches property instructions into ${row.childControllerExpression}.`,
    });
  }
  if (row.linkCall !== null) {
    relationships.push({
      id: `${row.id}:relationship:template-controller-link`,
      family: FrameworkRelationshipFamily.Rendering,
      relation: FrameworkRelationshipRelation.InvokesCallback,
      mechanism: FrameworkRelationshipMechanism.TemplateControllerLink,
      phase: FrameworkRelationshipPhase.Hydration,
      packageId: row.packageId,
      packageName: row.packageName,
      from: symbolEndpoint(row.rendererName, row.packageId, row.packageName, row.source),
      to: {
        kind: FrameworkRelationshipEndpointKind.Method,
        name: row.linkCall.calleeName,
        packageId: row.packageId,
        packageName: row.packageName,
        source: sourceRangeForCallSiteEntry(row.linkCall),
        expression: row.linkCall.callee,
      },
      source: sourceRangeForCallSiteEntry(row.linkCall),
      sourceRowId: row.id,
      summary: `${row.rendererName} invokes the template-controller link hook before child admission.`,
    });
  }
  return relationships;
}

function syntaxProductEndpoint(
  row: FrameworkSyntaxProductRow,
): FrameworkRelationshipEndpoint {
  if (row.resourceCarrier !== undefined) {
    return {
      kind: FrameworkRelationshipEndpointKind.Resource,
      name: row.resourceCarrier.targetName ?? row.producerName,
      packageId: row.packageId,
      packageName: row.packageName,
      source: row.resourceCarrier.source,
      resourceKind: row.resourceCarrier.resourceKind,
      resourceName: row.resourceCarrier.resourceName,
    };
  }
  return {
    kind: FrameworkRelationshipEndpointKind.Symbol,
    name: row.producerName,
    packageId: row.packageId,
    packageName: row.packageName,
    source: row.source,
  };
}

function symbolEndpoint(
  name: string,
  packageId: string,
  packageName: string,
  source?: SourceRange,
): FrameworkRelationshipEndpoint {
  return {
    kind: FrameworkRelationshipEndpointKind.Symbol,
    name,
    packageId,
    packageName,
    ...(source === undefined ? {} : { source }),
  };
}

function renderingRelationshipMatches(
  row: FrameworkRenderingRelationshipRow,
  filters: FrameworkRenderingRelationshipFilters,
): boolean {
  return (
    (filters.packageId === undefined || row.packageId === filters.packageId) &&
    (filters.fromName === undefined || row.from.name === filters.fromName) &&
    (filters.toName === undefined || row.to.name === filters.toName) &&
    (filters.relation === undefined || row.relation === filters.relation) &&
    (filters.mechanism === undefined || row.mechanism === filters.mechanism) &&
    (filters.phase === undefined || row.phase === filters.phase) &&
    (filters.resourceKind === undefined ||
      row.from.resourceKind === filters.resourceKind ||
      row.to.resourceKind === filters.resourceKind) &&
    (filters.query === undefined ||
      row.summary.includes(filters.query) ||
      row.from.name.includes(filters.query) ||
      row.to.name.includes(filters.query) ||
      row.relation.includes(filters.query) ||
      row.mechanism.includes(filters.query) ||
      row.phase.includes(filters.query))
  );
}
