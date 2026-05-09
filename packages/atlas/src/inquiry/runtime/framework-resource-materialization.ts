import ts from "typescript";

import {
  FrameworkRelationshipClosure,
  FrameworkRelationshipEndpointKind,
  FrameworkRelationshipMechanism,
  FrameworkRelationshipPhase,
  FrameworkRelationshipRelation,
  type FrameworkRelationshipEndpoint,
} from "../../framework/relationships.js";
import {
  FrameworkResourceDefinitionKind,
  FrameworkResourceInstantiationKind,
  FrameworkResourceRuntimePolicy,
  type FrameworkResourceInstanceLifetime,
} from "../../framework/resources.js";
import {
  FrameworkSyntaxProducerKind,
  FrameworkSyntaxProductKind,
} from "../../framework/syntax.js";
import {
  readTypeScriptCallSiteEntry,
  requiredSourceFileIdentity,
  SourceProjectMemo,
  type SourceFileIdentity,
  type SourceProject,
  type TypeScriptCallSiteEntry,
} from "../../source/index.js";
import type { SourceRange } from "../locus.js";
import {
  FrameworkResourceCarrierKind,
  type FrameworkResourceCarrierRow,
  type FrameworkSyntaxProductRow,
} from "./framework-entities.js";
import type { FrameworkDiscoveryFilters } from "./framework-filters.js";
import { readFrameworkResourceCarriers } from "./framework-resources.js";
import { readFrameworkSyntaxProducts } from "./framework-rendering-syntax.js";
import { sourceRangeFromFileSpan } from "./framework-support.js";
import { calleeTail } from "./framework-ts-utils.js";

/** Source site class for framework resource materialization. */
export const enum FrameworkResourceMaterializationSiteKind {
  /** A resource definition registers resource keys and aliases with DI. */
  DefinitionRegistration = "definition-registration",
  /** A resource definition/type is looked up through the resource registry. */
  DefinitionLookup = "definition-lookup",
  /** A resource instance is resolved from DI through its resource key. */
  InstanceResolution = "instance-resolution",
  /** A renderer invokes a custom element, custom attribute, or template-controller view-model through the container. */
  ViewModelConstruction = "view-model-construction",
  /** au-compose can invoke a dynamically selected component type. */
  DynamicComposition = "dynamic-composition",
  /** Binding mixins resolve value converters or binding behaviors while evaluating expressions. */
  ExpressionResourceLookup = "expression-resource-lookup",
  /** Binding mixins apply a value converter or binding behavior during binding/runtime evaluation. */
  ExpressionResourceApplication = "expression-resource-application",
  /** The template compiler resolves a binding command instance for an attribute syntax. */
  CompilerCommandResolution = "compiler-command-resolution",
  /** The template compiler invokes binding-command build(...) to produce an instruction. */
  CompilerCommandBuild = "compiler-command-build",
  /** AttributePattern.create(...) creates a registry for compiler syntax patterns. */
  AttributePatternRegistry = "attribute-pattern-registry",
  /** AttributeParser records pattern definitions and handler types during registration. */
  AttributePatternRegistration = "attribute-pattern-registration",
  /** AttributeParser resolves the handler instance for a matched pattern. */
  AttributePatternHandlerResolution = "attribute-pattern-handler-resolution",
  /** The renderer(...) helper registers an IRenderer singleton consumed by Rendering.getAll(IRenderer). */
  RendererRegistration = "renderer-registration",
}

/** Low-level framework site that can materialize or apply a resource. */
export interface FrameworkResourceMaterializationSiteRow {
  /** Stable row id. */
  readonly id: string;
  /** Source site class. */
  readonly siteKind: FrameworkResourceMaterializationSiteKind;
  /** Semantic relationship asserted by this site. */
  readonly relation: FrameworkRelationshipRelation;
  /** Runtime/source mechanism observed at this site. */
  readonly mechanism: FrameworkRelationshipMechanism;
  /** Framework phase where this site participates. */
  readonly phase: FrameworkRelationshipPhase;
  /** Resource kinds this generic site can apply to. */
  readonly resourceKinds: readonly FrameworkResourceDefinitionKind[];
  /** Package id that owns the materialization site. */
  readonly packageId: string;
  /** Package name that owns the materialization site. */
  readonly packageName: string;
  /** Exact call site when the site is call-shaped. */
  readonly callSite?: TypeScriptCallSiteEntry;
  /** Binding-command syntax product when the site is a build-method product. */
  readonly syntaxProduct?: FrameworkSyntaxProductRow;
  /** Source text for the materialized subject, callee, or produced artifact. */
  readonly subjectText: string;
  /** Binding-command producer name when the site applies to one producer instead of all commands. */
  readonly producerName?: string;
  /** Exact materialization-site source range. */
  readonly source: SourceRange;
  /** Human-facing summary. */
  readonly summary: string;
}

/** Resource carrier reframed as a possible runtime materialization route. */
export interface FrameworkResourceInstantiationRow {
  /** Stable row id. */
  readonly id: string;
  /** Aurelia framework package id that owns the resource carrier. */
  readonly packageId: string;
  /** Package name from source admission. */
  readonly packageName: string;
  /** Top-level exported source declaration name that carries the resource header. */
  readonly sourceExportName: string;
  /** Resource definition kind observed from the carrier. */
  readonly resourceKind: FrameworkResourceDefinitionKind;
  /** Source carrier lane that exposed the resource. */
  readonly carrierKind: FrameworkResourceCarrierKind;
  /** Static resource lookup name when visible from the carrier. */
  readonly resourceName: string | null;
  /** Best local target name behind the resource carrier. */
  readonly targetName: string | null;
  /** Primary runtime-existence class for the resource. */
  readonly instantiationKind: FrameworkResourceInstantiationKind;
  /** All runtime-existence classes observed for the resource. */
  readonly instantiationKinds: readonly FrameworkResourceInstantiationKind[];
  /** Runtime instance lifetime implied by the materialization route. */
  readonly instanceLifetime: FrameworkResourceInstanceLifetime;
  /** Resource endpoint suitable for relationship continuations. */
  readonly resource: FrameworkRelationshipEndpoint;
  /** Runtime/compiler/evaluator sites that apply to this resource class. */
  readonly materializationSites: readonly FrameworkResourceMaterializationSiteRow[];
  /** Closure class for this instantiation claim. */
  readonly closure: FrameworkRelationshipClosure;
  /** Exact source range for the resource carrier. */
  readonly source: SourceRange;
  /** Human-facing summary. */
  readonly summary: string;
}

const resourceMaterializationSitesMemo = new SourceProjectMemo<
  readonly FrameworkResourceMaterializationSiteRow[]
>();

const resourceInstantiationClosureByKind: Readonly<
  Record<FrameworkResourceInstantiationKind, FrameworkRelationshipClosure>
> = {
  [FrameworkResourceInstantiationKind.ViewModelContainerInvoke]:
    FrameworkRelationshipClosure.Modeled,
  [FrameworkResourceInstantiationKind.DynamicComposition]:
    FrameworkRelationshipClosure.Modeled,
  [FrameworkResourceInstantiationKind.ExpressionResourceLookup]:
    FrameworkRelationshipClosure.Modeled,
  [FrameworkResourceInstantiationKind.CompilerCommand]:
    FrameworkRelationshipClosure.Modeled,
  [FrameworkResourceInstantiationKind.SyntaxPatternHandler]:
    FrameworkRelationshipClosure.Modeled,
  [FrameworkResourceInstantiationKind.RendererSingleton]:
    FrameworkRelationshipClosure.Modeled,
  [FrameworkResourceInstantiationKind.DefinitionOnly]:
    FrameworkRelationshipClosure.Partial,
};

const rendererRegistrationSiteFacts = {
  siteKind: FrameworkResourceMaterializationSiteKind.RendererRegistration,
  relation: FrameworkRelationshipRelation.ProvidesKey,
  mechanism: FrameworkRelationshipMechanism.RegistrationHelper,
  phase: FrameworkRelationshipPhase.Registration,
  resourceKinds: [FrameworkResourceDefinitionKind.Renderer],
  subjectText: "IRenderer",
} as const;

/** Read resource instantiation rows from source-backed resource carriers plus framework materialization sites. */
export function readFrameworkResourceInstantiationRows(
  sourceProject: SourceProject,
  filters: FrameworkDiscoveryFilters,
): readonly FrameworkResourceInstantiationRow[] {
  const resources = readFrameworkResourceCarriers(sourceProject, filters);
  const materializationSites =
    readFrameworkResourceMaterializationSites(sourceProject);
  return resources
    .map((resource) =>
      resourceInstantiationRow(resource, materializationSites),
    )
    .filter(
      (row) =>
        filters.resourceName === undefined ||
        row.resourceName === filters.resourceName ||
        row.sourceExportName === filters.resourceName ||
        row.targetName === filters.resourceName,
    )
    .filter(
      (row) =>
        filters.resourceSiteKind === undefined ||
        row.materializationSites.some(
          (site) => site.siteKind === filters.resourceSiteKind,
        ),
    )
    .filter(
      (row) =>
        filters.query === undefined ||
        row.sourceExportName.includes(filters.query) ||
        row.resourceName?.includes(filters.query) === true ||
        row.targetName?.includes(filters.query) === true ||
        row.summary.includes(filters.query) ||
        row.materializationSites.some(
          (site) =>
            site.siteKind.includes(filters.query!) ||
            site.subjectText.includes(filters.query!) ||
            site.summary.includes(filters.query!),
        ),
    )
    .sort(
      (left, right) =>
        left.packageId.localeCompare(right.packageId) ||
        left.resourceKind.localeCompare(right.resourceKind) ||
        left.sourceExportName.localeCompare(right.sourceExportName),
    );
}

function readFrameworkResourceMaterializationSites(
  sourceProject: SourceProject,
): readonly FrameworkResourceMaterializationSiteRow[] {
  return resourceMaterializationSitesMemo.read(sourceProject, () => {
    const callSites = sourceProject
      .ownedSourceFiles()
      .flatMap((sourceFile) =>
        shouldScanMaterializationSourceFile(sourceProject, sourceFile)
          ? materializationSitesForSourceFile(sourceProject, sourceFile)
          : [],
      );
    const bindingCommandProducts = readFrameworkSyntaxProducts(sourceProject, {
      producerKind: FrameworkSyntaxProducerKind.BindingCommand,
      productKind: FrameworkSyntaxProductKind.BuildsInstruction,
    }).map(materializationSiteForSyntaxProduct);
    return [...callSites, ...bindingCommandProducts].sort(
      (left, right) =>
        left.source.filePath.localeCompare(right.source.filePath) ||
        left.source.start.line - right.source.start.line ||
        left.source.start.character - right.source.start.character ||
        left.siteKind.localeCompare(right.siteKind),
    );
  });
}

function shouldScanMaterializationSourceFile(
  sourceProject: SourceProject,
  sourceFile: ts.SourceFile,
): boolean {
  const packageId = sourceProject.packageForFileName(sourceFile.fileName)?.id;
  return (
    packageId === "runtime-html" ||
    packageId === "template-compiler" ||
    sourceFile.text.includes("AttributePattern.create")
  );
}

function materializationSitesForSourceFile(
  sourceProject: SourceProject,
  sourceFile: ts.SourceFile,
): readonly FrameworkResourceMaterializationSiteRow[] {
  const file = requiredSourceFileIdentity(sourceProject, sourceFile);
  const packageInfo = sourceProject.packageForFileName(sourceFile.fileName);
  if (packageInfo === null || file.packageId === null) {
    return [];
  }
  const rows: FrameworkResourceMaterializationSiteRow[] = [];
  const visit = (node: ts.Node): void => {
    if (ts.isCallExpression(node)) {
      const row = materializationSiteForCall(
        sourceProject,
        sourceFile,
        file,
        packageInfo.packageName,
        node,
      );
      if (row !== null) {
        rows.push(row);
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return rows;
}

function materializationSiteForCall(
  sourceProject: SourceProject,
  sourceFile: ts.SourceFile,
  file: SourceFileIdentity,
  packageName: string,
  call: ts.CallExpression,
): FrameworkResourceMaterializationSiteRow | null {
  const filePath = normalizedPath(file.repoPath);
  if (!isPotentialMaterializationCall(call, sourceFile, filePath)) {
    return null;
  }
  const callSite = readTypeScriptCallSiteEntry(sourceProject, sourceFile, call);
  if (callSite === null) {
    return null;
  }
  const descriptor = materializationCallDescriptor(
    call,
    sourceFile,
    filePath,
    callSite.signature ?? "",
  );
  if (descriptor === null) {
    return null;
  }
  const source = sourceRangeFromFileSpan(file.repoPath, callSite.span);
  return {
    id: `framework-resource-materialization:${file.repoPath}:${call.getStart(
      sourceFile,
    )}:${descriptor.siteKind}:${descriptor.subjectText}`,
    siteKind: descriptor.siteKind,
    relation: descriptor.relation,
    mechanism: descriptor.mechanism,
    phase: descriptor.phase,
    resourceKinds: descriptor.resourceKinds,
    packageId: file.packageId!,
    packageName,
    callSite,
    subjectText: descriptor.subjectText,
    ...(descriptor.producerName === undefined
      ? {}
      : { producerName: descriptor.producerName }),
    source,
    summary: descriptor.summary,
  };
}

function isPotentialMaterializationCall(
  call: ts.CallExpression,
  sourceFile: ts.SourceFile,
  filePath: string,
): boolean {
  const calleeText = call.expression.getText(sourceFile);
  const tail = calleeTail(call.expression);
  return (
    tail === "invoke" ||
    calleeText === "CustomElement.find" ||
    calleeText === "CustomAttribute.find" ||
    calleeText === "ValueConverter.get" ||
    calleeText === "BindingBehavior.get" ||
    calleeText === "BindingCommand.get" ||
    (filePath.endsWith("template-compiler/src/template-compiler.ts") &&
      ((tail === "get" && calleeText.endsWith("._commandResolver.get")) ||
        (tail === "build" && calleeText.endsWith(".build")))) ||
    calleeText === "AttributePattern.create" ||
    (filePath.endsWith("template-compiler/src/attribute-pattern.ts") &&
      (tail === "registerPattern" ||
        (tail === "get" && calleeText.endsWith("._container.get")))) ||
    (filePath.endsWith("binding/binding-utils.ts") &&
      (calleeText.includes("behavior") || calleeText.includes("vc."))) ||
    (resourceKindsForResourceFile(filePath).length > 0 &&
      (tail === "register" || tail === "find" || tail === "get"))
  );
}

function materializationSiteForSyntaxProduct(
  product: FrameworkSyntaxProductRow,
): FrameworkResourceMaterializationSiteRow {
  const subjectText =
    product.instructionName ??
    product.instructionTarget ??
    product.bindingName ??
    "instruction";
  return {
    id: `framework-resource-materialization:${product.id}`,
    siteKind: FrameworkResourceMaterializationSiteKind.CompilerCommandBuild,
    relation: FrameworkRelationshipRelation.ProducesInstruction,
    mechanism: FrameworkRelationshipMechanism.BindingCommandBuild,
    phase: FrameworkRelationshipPhase.Compilation,
    resourceKinds: [FrameworkResourceDefinitionKind.BindingCommand],
    packageId: product.packageId,
    packageName: product.packageName,
    syntaxProduct: product,
    subjectText,
    producerName: product.producerName,
    source: product.source,
    summary: `${product.producerName} build(...) produces ${subjectText}.`,
  };
}

interface MaterializationCallDescriptor {
  readonly siteKind: FrameworkResourceMaterializationSiteKind;
  readonly relation: FrameworkRelationshipRelation;
  readonly mechanism: FrameworkRelationshipMechanism;
  readonly phase: FrameworkRelationshipPhase;
  readonly resourceKinds: readonly FrameworkResourceDefinitionKind[];
  readonly subjectText: string;
  readonly producerName?: string;
  readonly summary: string;
}

function materializationCallDescriptor(
  call: ts.CallExpression,
  sourceFile: ts.SourceFile,
  filePath: string,
  signatureText: string,
): MaterializationCallDescriptor | null {
  const calleeText = call.expression.getText(sourceFile);
  const tail = calleeTail(call.expression);
  const firstArgumentText = call.arguments[0]?.getText(sourceFile) ?? "";

  const viewModelConstruction = viewModelConstructionDescriptor(
    firstArgumentText,
    signatureText,
    filePath,
  );
  if (tail === "invoke" && viewModelConstruction !== null) {
    return viewModelConstruction;
  }

  const resourceFileDescriptor = resourceFileCallDescriptor(
    tail,
    calleeText,
    filePath,
  );
  if (resourceFileDescriptor !== null) {
    return resourceFileDescriptor;
  }

  if (calleeText === "CustomElement.find") {
    return definitionLookupDescriptor(
      [FrameworkResourceDefinitionKind.CustomElement],
      calleeText,
      FrameworkRelationshipPhase.Compilation,
    );
  }
  if (calleeText === "CustomAttribute.find") {
    return definitionLookupDescriptor(
      [
        FrameworkResourceDefinitionKind.CustomAttribute,
        FrameworkResourceDefinitionKind.TemplateController,
      ],
      calleeText,
      FrameworkRelationshipPhase.Compilation,
    );
  }
  if (calleeText === "ValueConverter.get") {
    return expressionResourceLookupDescriptor(
      FrameworkResourceDefinitionKind.ValueConverter,
      calleeText,
    );
  }
  if (calleeText === "BindingBehavior.get") {
    return expressionResourceLookupDescriptor(
      FrameworkResourceDefinitionKind.BindingBehavior,
      calleeText,
    );
  }
  if (calleeText === "BindingCommand.get") {
    return {
      siteKind:
        FrameworkResourceMaterializationSiteKind.CompilerCommandResolution,
      relation: FrameworkRelationshipRelation.ResolvesResource,
      mechanism: FrameworkRelationshipMechanism.BindingCommandResolver,
      phase: FrameworkRelationshipPhase.Compilation,
      resourceKinds: [FrameworkResourceDefinitionKind.BindingCommand],
      subjectText: calleeText,
      summary: "Binding command resolver resolves a command instance from DI.",
    };
  }
  if (
    filePath.endsWith("template-compiler/src/template-compiler.ts") &&
    tail === "get" &&
    calleeText.endsWith("._commandResolver.get")
  ) {
    return {
      siteKind:
        FrameworkResourceMaterializationSiteKind.CompilerCommandResolution,
      relation: FrameworkRelationshipRelation.LooksUpResource,
      mechanism: FrameworkRelationshipMechanism.BindingCommandResolver,
      phase: FrameworkRelationshipPhase.Compilation,
      resourceKinds: [FrameworkResourceDefinitionKind.BindingCommand],
      subjectText: calleeText,
      summary:
        "Compilation context asks the binding-command resolver for an attribute command.",
    };
  }
  if (
    filePath.endsWith("template-compiler/src/template-compiler.ts") &&
    tail === "build" &&
    calleeText.endsWith(".build")
  ) {
    return {
      siteKind: FrameworkResourceMaterializationSiteKind.CompilerCommandBuild,
      relation: FrameworkRelationshipRelation.ProducesInstruction,
      mechanism: FrameworkRelationshipMechanism.BindingCommandBuild,
      phase: FrameworkRelationshipPhase.Compilation,
      resourceKinds: [FrameworkResourceDefinitionKind.BindingCommand],
      subjectText: calleeText,
      summary:
        "Template compiler invokes a binding-command build(...) method to produce an instruction.",
    };
  }
  const attributePatternDescriptor = attributePatternDescriptorForCall(
    call,
    sourceFile,
    tail,
    calleeText,
    filePath,
  );
  if (attributePatternDescriptor !== null) {
    return attributePatternDescriptor;
  }
  return expressionApplicationDescriptor(tail, calleeText, filePath);
}

function attributePatternDescriptorForCall(
  call: ts.CallExpression,
  sourceFile: ts.SourceFile,
  tail: string | null,
  calleeText: string,
  filePath: string,
): MaterializationCallDescriptor | null {
  if (calleeText === "AttributePattern.create") {
    const typeArgument = call.arguments[1];
    return {
      siteKind:
        FrameworkResourceMaterializationSiteKind.AttributePatternRegistry,
      relation: FrameworkRelationshipRelation.RegistersResource,
      mechanism: FrameworkRelationshipMechanism.ResourceRegister,
      phase: FrameworkRelationshipPhase.Definition,
      resourceKinds: [FrameworkResourceDefinitionKind.AttributePattern],
      subjectText: calleeText,
      ...(typeArgument === undefined || ts.isSpreadElement(typeArgument)
        ? {}
        : { producerName: typeArgument.getText(sourceFile) }),
      summary:
        "AttributePattern.create produces a registry for compiler syntax pattern handlers.",
    };
  }
  if (!filePath.endsWith("template-compiler/src/attribute-pattern.ts")) {
    return null;
  }
  if (tail === "registerPattern") {
    return {
      siteKind:
        FrameworkResourceMaterializationSiteKind.AttributePatternRegistration,
      relation: FrameworkRelationshipRelation.RegistersResource,
      mechanism: FrameworkRelationshipMechanism.ResourceRegister,
      phase: FrameworkRelationshipPhase.Registration,
      resourceKinds: [FrameworkResourceDefinitionKind.AttributePattern],
      subjectText: calleeText,
      summary:
        "AttributePattern registry adds pattern definitions and handler types to IAttributeParser.",
    };
  }
  if (tail === "get" && calleeText.endsWith("._container.get")) {
    return {
      siteKind:
        FrameworkResourceMaterializationSiteKind.AttributePatternHandlerResolution,
      relation: FrameworkRelationshipRelation.ResolvesResource,
      mechanism: FrameworkRelationshipMechanism.ContainerGet,
      phase: FrameworkRelationshipPhase.Compilation,
      resourceKinds: [FrameworkResourceDefinitionKind.AttributePattern],
      subjectText: calleeText,
      summary:
        "AttributeParser resolves the handler instance for a matched attribute pattern.",
    };
  }
  return null;
}

function viewModelConstructionDescriptor(
  argumentText: string,
  signature: string,
  filePath: string,
): MaterializationCallDescriptor | null {
  if (signature.includes("ICustomElementViewModel")) {
    return {
      siteKind: FrameworkResourceMaterializationSiteKind.ViewModelConstruction,
      relation: FrameworkRelationshipRelation.ConstructsInstance,
      mechanism: FrameworkRelationshipMechanism.ContainerInvoke,
      phase: FrameworkRelationshipPhase.Hydration,
      resourceKinds: [FrameworkResourceDefinitionKind.CustomElement],
      subjectText: argumentText,
      summary: `Custom element renderer invokes a view-model through ${argumentText}.`,
    };
  }
  if (signature.includes("ICustomAttributeViewModel")) {
    return {
      siteKind: FrameworkResourceMaterializationSiteKind.ViewModelConstruction,
      relation: FrameworkRelationshipRelation.ConstructsInstance,
      mechanism: FrameworkRelationshipMechanism.ContainerInvoke,
      phase: FrameworkRelationshipPhase.Hydration,
      resourceKinds: [
        FrameworkResourceDefinitionKind.CustomAttribute,
        FrameworkResourceDefinitionKind.TemplateController,
      ],
      subjectText: argumentText,
      summary: `Custom attribute/template-controller renderer invokes a view-model through ${argumentText}.`,
    };
  }
  if (
    filePath.endsWith("resources/custom-elements/au-compose.ts") &&
    argumentText === "comp"
  ) {
    return {
      siteKind: FrameworkResourceMaterializationSiteKind.DynamicComposition,
      relation: FrameworkRelationshipRelation.ConstructsInstance,
      mechanism: FrameworkRelationshipMechanism.ContainerInvoke,
      phase: FrameworkRelationshipPhase.Hydration,
      resourceKinds: [FrameworkResourceDefinitionKind.CustomElement],
      subjectText: argumentText,
      summary:
        "au-compose invokes a dynamically selected custom element component type.",
    };
  }
  return null;
}

function resourceFileCallDescriptor(
  tail: string | null,
  calleeText: string,
  filePath: string,
): MaterializationCallDescriptor | null {
  const resourceKinds = resourceKindsForResourceFile(filePath);
  if (resourceKinds.length === 0) {
    return null;
  }
  if (tail === "register" && calleeText.endsWith(".register")) {
    return {
      siteKind: FrameworkResourceMaterializationSiteKind.DefinitionRegistration,
      relation: FrameworkRelationshipRelation.RegistersResource,
      mechanism: FrameworkRelationshipMechanism.ResourceRegister,
      phase: FrameworkRelationshipPhase.Registration,
      resourceKinds,
      subjectText: calleeText,
      summary: "Resource definition registers DI keys and aliases.",
    };
  }
  if (tail === "find" && calleeText.endsWith(".find")) {
    return definitionLookupDescriptor(
      resourceKinds,
      calleeText,
      FrameworkRelationshipPhase.ResourceLookup,
    );
  }
  if (
    tail === "get" &&
    calleeText.endsWith(".get") &&
    resourceKindsUseInstanceResolution(resourceKinds)
  ) {
    return {
      siteKind: FrameworkResourceMaterializationSiteKind.InstanceResolution,
      relation: FrameworkRelationshipRelation.ResolvesResource,
      mechanism: FrameworkRelationshipMechanism.ResourceGet,
      phase: FrameworkRelationshipPhase.Resolution,
      resourceKinds,
      subjectText: calleeText,
      summary: "Resource kind resolves an instance through a DI resource key.",
    };
  }
  return null;
}

function resourceKindsUseInstanceResolution(
  resourceKinds: readonly FrameworkResourceDefinitionKind[],
): boolean {
  return resourceKinds.some(
    (resourceKind) =>
      resourceKind === FrameworkResourceDefinitionKind.ValueConverter ||
      resourceKind === FrameworkResourceDefinitionKind.BindingBehavior ||
      resourceKind === FrameworkResourceDefinitionKind.BindingCommand,
  );
}

function resourceKindsForResourceFile(
  filePath: string,
): readonly FrameworkResourceDefinitionKind[] {
  if (filePath.endsWith("resources/custom-element.ts")) {
    return [FrameworkResourceDefinitionKind.CustomElement];
  }
  if (filePath.endsWith("resources/custom-attribute.ts")) {
    return [
      FrameworkResourceDefinitionKind.CustomAttribute,
      FrameworkResourceDefinitionKind.TemplateController,
    ];
  }
  if (filePath.endsWith("resources/value-converter.ts")) {
    return [FrameworkResourceDefinitionKind.ValueConverter];
  }
  if (filePath.endsWith("resources/binding-behavior.ts")) {
    return [FrameworkResourceDefinitionKind.BindingBehavior];
  }
  if (filePath.endsWith("template-compiler/src/binding-command.ts")) {
    return [FrameworkResourceDefinitionKind.BindingCommand];
  }
  return [];
}

function definitionLookupDescriptor(
  resourceKinds: readonly FrameworkResourceDefinitionKind[],
  subjectText: string,
  phase: FrameworkRelationshipPhase,
): MaterializationCallDescriptor {
  return {
    siteKind: FrameworkResourceMaterializationSiteKind.DefinitionLookup,
    relation: FrameworkRelationshipRelation.LooksUpResource,
    mechanism: FrameworkRelationshipMechanism.ResourceFind,
    phase,
    resourceKinds,
    subjectText,
    summary: "Framework source looks up a resource definition by kind/name.",
  };
}

function expressionResourceLookupDescriptor(
  resourceKind: FrameworkResourceDefinitionKind,
  subjectText: string,
): MaterializationCallDescriptor {
  return {
    siteKind: FrameworkResourceMaterializationSiteKind.ExpressionResourceLookup,
    relation: FrameworkRelationshipRelation.ResolvesResource,
    mechanism: FrameworkRelationshipMechanism.AstEvaluatorResource,
    phase: FrameworkRelationshipPhase.Binding,
    resourceKinds: [resourceKind],
    subjectText,
    summary:
      "AST evaluator resolves an expression resource instance through the binding service locator.",
  };
}

function expressionApplicationDescriptor(
  tail: string | null,
  calleeText: string,
  filePath: string,
): MaterializationCallDescriptor | null {
  if (!filePath.endsWith("binding/binding-utils.ts")) {
    return null;
  }
  if (tail === "bind" && calleeText.includes("behavior")) {
    return {
      siteKind:
        FrameworkResourceMaterializationSiteKind.ExpressionResourceApplication,
      relation: FrameworkRelationshipRelation.AppliesResource,
      mechanism: FrameworkRelationshipMechanism.AstEvaluatorResource,
      phase: FrameworkRelationshipPhase.Binding,
      resourceKinds: [FrameworkResourceDefinitionKind.BindingBehavior],
      subjectText: calleeText,
      summary: "AST evaluator applies a binding behavior bind hook.",
    };
  }
  if (tail === "unbind" && calleeText.includes("behavior")) {
    return {
      siteKind:
        FrameworkResourceMaterializationSiteKind.ExpressionResourceApplication,
      relation: FrameworkRelationshipRelation.AppliesResource,
      mechanism: FrameworkRelationshipMechanism.AstEvaluatorResource,
      phase: FrameworkRelationshipPhase.Binding,
      resourceKinds: [FrameworkResourceDefinitionKind.BindingBehavior],
      subjectText: calleeText,
      summary: "AST evaluator applies a binding behavior unbind hook.",
    };
  }
  if (
    (tail === "toView" || tail === "fromView") &&
    (calleeText.includes("vc.") || calleeText.includes("vc?"))
  ) {
    return {
      siteKind:
        FrameworkResourceMaterializationSiteKind.ExpressionResourceApplication,
      relation: FrameworkRelationshipRelation.AppliesResource,
      mechanism: FrameworkRelationshipMechanism.AstEvaluatorResource,
      phase: FrameworkRelationshipPhase.Binding,
      resourceKinds: [FrameworkResourceDefinitionKind.ValueConverter],
      subjectText: calleeText,
      summary: "AST evaluator applies a value converter conversion hook.",
    };
  }
  return null;
}

function resourceInstantiationRow(
  row: FrameworkResourceCarrierRow,
  materializationSites: readonly FrameworkResourceMaterializationSiteRow[],
): FrameworkResourceInstantiationRow {
  const sites = [
    ...materializationSitesForResource(row, materializationSites),
    ...registrationSitesForResourceCarrier(row),
  ];
  const instantiationKinds = resourceInstantiationKinds(row, sites);
  const instantiationKind =
    instantiationKinds[0] ?? FrameworkResourceInstantiationKind.DefinitionOnly;
  const runtimePolicy = FrameworkResourceRuntimePolicy.fromInstantiationKinds(
    row.resourceKind,
    instantiationKinds,
  );
  return {
    id: `framework-resource-instantiation:${row.id}`,
    packageId: row.packageId,
    packageName: row.packageName,
    sourceExportName: row.sourceExportName,
    resourceKind: row.resourceKind,
    carrierKind: row.carrierKind,
    resourceName: row.resourceName,
    targetName: row.targetName,
    instantiationKind,
    instantiationKinds,
    instanceLifetime: runtimePolicy.instanceLifetime,
    resource: resourceEndpointForCarrier(row),
    materializationSites: sites,
    closure: resourceInstantiationClosure(instantiationKind),
    source: row.source,
    summary: resourceInstantiationSummary(
      row,
      instantiationKinds,
      sites,
      runtimePolicy.instanceLifetime,
    ),
  };
}

function resourceEndpointForCarrier(
  row: FrameworkResourceCarrierRow,
): FrameworkRelationshipEndpoint {
  return {
    kind: FrameworkRelationshipEndpointKind.Resource,
    name: row.targetName ?? row.sourceExportName,
    packageId: row.packageId,
    packageName: row.packageName,
    source: row.source,
    resourceKind: row.resourceKind,
    resourceName: row.resourceName,
  };
}

function resourceInstantiationClosure(
  instantiationKind: FrameworkResourceInstantiationKind,
): FrameworkRelationshipClosure {
  return resourceInstantiationClosureByKind[instantiationKind];
}

function registrationSitesForResourceCarrier(
  row: FrameworkResourceCarrierRow,
): readonly FrameworkResourceMaterializationSiteRow[] {
  if (
    row.resourceKind !== FrameworkResourceDefinitionKind.Renderer ||
    row.carrierKind !== FrameworkResourceCarrierKind.RendererHelper
  ) {
    return [];
  }
  const producerName = row.targetName ?? row.sourceExportName;
  return [
    {
      id: `framework-resource-materialization:${row.id}:renderer-registration`,
      ...rendererRegistrationSiteFacts,
      packageId: row.packageId,
      packageName: row.packageName,
      producerName,
      source: row.source,
      summary: `${producerName} is registered by renderer(...) as a singleton IRenderer provider.`,
    },
  ];
}

function materializationSitesForResource(
  row: FrameworkResourceCarrierRow,
  materializationSites: readonly FrameworkResourceMaterializationSiteRow[],
): readonly FrameworkResourceMaterializationSiteRow[] {
  return materializationSites.filter(
    (site) =>
      site.resourceKinds.includes(row.resourceKind) &&
      (site.producerName === undefined ||
        site.producerName === row.sourceExportName ||
        site.producerName === row.targetName ||
        site.producerName === row.carrierEntry.exportName ||
        site.producerName === row.carrierEntry.resolvedName),
  );
}

function resourceInstantiationKinds(
  row: FrameworkResourceCarrierRow,
  materializationSites: readonly FrameworkResourceMaterializationSiteRow[],
): readonly FrameworkResourceInstantiationKind[] {
  const kinds: FrameworkResourceInstantiationKind[] = [];
  switch (row.resourceKind) {
    case FrameworkResourceDefinitionKind.CustomElement:
      if (
        materializationSites.some(
          (site) =>
            site.siteKind ===
            FrameworkResourceMaterializationSiteKind.ViewModelConstruction,
        )
      ) {
        kinds.push(FrameworkResourceInstantiationKind.ViewModelContainerInvoke);
      }
      if (
        materializationSites.some(
          (site) =>
            site.siteKind ===
            FrameworkResourceMaterializationSiteKind.DynamicComposition,
        )
      ) {
        kinds.push(FrameworkResourceInstantiationKind.DynamicComposition);
      }
      break;
    case FrameworkResourceDefinitionKind.CustomAttribute:
    case FrameworkResourceDefinitionKind.TemplateController:
      if (
        materializationSites.some(
          (site) =>
            site.siteKind ===
            FrameworkResourceMaterializationSiteKind.ViewModelConstruction,
        )
      ) {
        kinds.push(FrameworkResourceInstantiationKind.ViewModelContainerInvoke);
      }
      break;
    case FrameworkResourceDefinitionKind.ValueConverter:
    case FrameworkResourceDefinitionKind.BindingBehavior:
      if (
        materializationSites.some(
          (site) =>
            site.siteKind ===
              FrameworkResourceMaterializationSiteKind.ExpressionResourceLookup ||
            site.siteKind ===
              FrameworkResourceMaterializationSiteKind.ExpressionResourceApplication ||
            site.siteKind ===
              FrameworkResourceMaterializationSiteKind.InstanceResolution,
        )
      ) {
        kinds.push(FrameworkResourceInstantiationKind.ExpressionResourceLookup);
      }
      break;
    case FrameworkResourceDefinitionKind.BindingCommand:
      if (
        materializationSites.some(
          (site) =>
            site.siteKind ===
              FrameworkResourceMaterializationSiteKind.CompilerCommandResolution ||
            site.siteKind ===
              FrameworkResourceMaterializationSiteKind.CompilerCommandBuild ||
            site.siteKind ===
              FrameworkResourceMaterializationSiteKind.InstanceResolution,
        )
      ) {
        kinds.push(FrameworkResourceInstantiationKind.CompilerCommand);
      }
      break;
    case FrameworkResourceDefinitionKind.AttributePattern:
      if (
        materializationSites.some(
          (site) =>
            site.siteKind ===
              FrameworkResourceMaterializationSiteKind.AttributePatternRegistry ||
            site.siteKind ===
              FrameworkResourceMaterializationSiteKind.AttributePatternRegistration ||
            site.siteKind ===
              FrameworkResourceMaterializationSiteKind.AttributePatternHandlerResolution,
        )
      ) {
        kinds.push(FrameworkResourceInstantiationKind.SyntaxPatternHandler);
      }
      break;
    case FrameworkResourceDefinitionKind.Renderer:
      if (
        materializationSites.some(
          (site) =>
            site.siteKind ===
            FrameworkResourceMaterializationSiteKind.RendererRegistration,
        )
      ) {
        kinds.push(FrameworkResourceInstantiationKind.RendererSingleton);
      }
      break;
    default:
      break;
  }
  return kinds.length === 0
    ? [FrameworkResourceInstantiationKind.DefinitionOnly]
    : kinds;
}

function resourceInstantiationSummary(
  row: FrameworkResourceCarrierRow,
  instantiationKinds: readonly FrameworkResourceInstantiationKind[],
  materializationSites: readonly FrameworkResourceMaterializationSiteRow[],
  instanceLifetime: FrameworkResourceInstanceLifetime,
): string {
  const target = row.targetName ?? row.sourceExportName;
  if (
    instantiationKinds.length === 1 &&
    instantiationKinds[0] === FrameworkResourceInstantiationKind.DefinitionOnly
  ) {
    return `${row.resourceKind} ${target} has a source-backed resource definition; runtime materialization path is not modeled yet.`;
  }
  const siteKinds = [...new Set(materializationSites.map((site) => site.siteKind))]
    .sort()
    .join(", ");
  return `${row.resourceKind} ${target} has ${instanceLifetime} runtime materialization via ${siteKinds}.`;
}

function normalizedPath(filePath: string): string {
  return filePath.replaceAll("\\", "/");
}
