import type { SourceRange } from "../locus.js";
import type {
  FrameworkBindingAdmissionRow,
  FrameworkBindingConstructorParameterRow,
  FrameworkBindingProductRow,
  FrameworkControllerCreationRow,
  FrameworkInstructionDeclarationRow,
  FrameworkInstructionDispatchRow,
  FrameworkInstructionSlotRow,
  FrameworkResourceCarrierRow,
  FrameworkSyntaxProductRow,
} from "./framework-entities.js";

/** Small public reference to a source resource carrier joined into a rendering product. */
export interface FrameworkResourceCarrierReferenceRow {
  /** Internal resource-carrier row id for detail/provenance correlation. */
  readonly id: string;
  /** Top-level exported source declaration name that carries the resource header. */
  readonly sourceExportName: string;
  /** Resource definition kind observed from the carrier. */
  readonly resourceKind: FrameworkResourceCarrierRow["resourceKind"];
  /** Source carrier lane that exposed the resource. */
  readonly carrierKind: FrameworkResourceCarrierRow["carrierKind"];
  /** Static resource lookup name when visible from the carrier. */
  readonly resourceName: string | null;
  /** Static aliases read from the carrier definition, when present. */
  readonly aliases: readonly string[];
  /** Best local target name behind the resource carrier. */
  readonly targetName: string | null;
}

/** Small public reference to a syntax product joined into a larger rendering row. */
export interface FrameworkSyntaxProductReferenceRow {
  /** Internal syntax-product row id for detail/provenance correlation. */
  readonly id: string;
  /** Aurelia framework package id that owns the producer. */
  readonly packageId: string;
  /** Package name from the source admission contract. */
  readonly packageName: string;
  /** Source declaration/export name for the producer. */
  readonly producerName: string;
  /** Producer lane. */
  readonly producerKind: FrameworkSyntaxProductRow["producerKind"];
  /** Product relation. */
  readonly productKind: FrameworkSyntaxProductRow["productKind"];
  /** Instruction class/interface/type observed from construction or renderer parameter typing. */
  readonly instructionName: string | null;
  /** Renderer target discriminator expression text, usually an it* constant. */
  readonly instructionTarget: string | null;
  /** Binding class/factory observed inside renderer materialization. */
  readonly bindingName: string | null;
}

/** Public compact row for rendering syntax-product projection answers. */
export interface FrameworkSyntaxProductSummaryRow
  extends FrameworkSyntaxProductReferenceRow {
  /** Resource carrier behind the producer, when the source producer has a resource header. */
  readonly resourceCarrier: FrameworkResourceCarrierReferenceRow | null;
  /** Expression text for the production site. */
  readonly expressionText: string;
  /** True when expression text was capped before reaching this row. */
  readonly expressionTextTruncated: boolean;
  /** Checker type display at the production expression. */
  readonly expressionType: string;
  /** Symbol display name at the production expression, when visible. */
  readonly expressionSymbolName: string | null;
  /** Exact production source range. */
  readonly source: SourceRange;
  /** Human-facing row summary. */
  readonly summary: string;
}

/** Small public reference to a controller binding admission joined into a larger row. */
export interface FrameworkBindingAdmissionReferenceRow {
  /** Internal binding-admission row id for detail/provenance correlation. */
  readonly id: string;
  /** Lexical producer that contains the admission call. */
  readonly producerName: string;
  /** Controller expression that receives the admitted binding. */
  readonly controllerExpression: string;
  /** Binding class/factory observed for the admitted value. */
  readonly bindingName: string;
  /** Static construction/admission shape. */
  readonly constructionKind: FrameworkBindingAdmissionRow["constructionKind"];
}

/** Public compact row for binding-product projection answers. */
export interface FrameworkBindingProductSummaryRow {
  /** Stable row id. */
  readonly id: string;
  /** Aurelia framework package id that owns the binding class. */
  readonly packageId: string;
  /** Package name from the source admission contract. */
  readonly packageName: string;
  /** Binding class name. */
  readonly bindingName: string;
  /** Source declaration kind for the binding shape. */
  readonly declarationKind: FrameworkBindingProductRow["declarationKind"];
  /** Exact binding class source range. */
  readonly source: SourceRange;
  /** Compact renderer syntax products that materialize this binding. */
  readonly constructionProducts: readonly FrameworkSyntaxProductReferenceRow[];
  /** Compact controller binding-list admission edges that materialize or attach this binding. */
  readonly admissions: readonly FrameworkBindingAdmissionReferenceRow[];
  /** Constructor parameter surface. */
  readonly constructorParameters: readonly FrameworkBindingConstructorParameterRow[];
  /** Declared method names on the binding class. */
  readonly methodNames: readonly string[];
  /** Lifecycle-relevant method names observed on the binding class. */
  readonly lifecycleMethods: readonly string[];
  /** Constructor parameters whose type/name identifies an observer locator. */
  readonly observerLocatorParameters: readonly FrameworkBindingConstructorParameterRow[];
  /** Observer-locator call-site count inside the binding class. */
  readonly observerLocatorCallSiteCount: number;
  /** Target-observer override methods exposed by the binding class. */
  readonly targetObserverMethods: readonly string[];
  /** Human-facing row summary. */
  readonly summary: string;
}

/** Public compact row for binding-admission projection answers. */
export interface FrameworkBindingAdmissionSummaryRow {
  /** Stable row id. */
  readonly id: string;
  /** Aurelia framework package id that owns the admission site. */
  readonly packageId: string;
  /** Package name from the source admission contract. */
  readonly packageName: string;
  /** Lexical producer that contains the admission call. */
  readonly producerName: string;
  /** Controller expression that receives the admitted binding. */
  readonly controllerExpression: string;
  /** Binding class/factory observed for the admitted value. */
  readonly bindingName: string;
  /** Static construction/admission shape. */
  readonly constructionKind: FrameworkBindingAdmissionRow["constructionKind"];
  /** addBinding-like callee name, when visible from syntax/checker facts. */
  readonly admissionCalleeName: string;
  /** Expression text for the admitted value or producing expression. */
  readonly bindingExpressionText: string;
  /** True when expression text was capped before reaching this row. */
  readonly bindingExpressionTextTruncated: boolean;
  /** Checker type display for the admitted value or producing expression. */
  readonly bindingExpressionType: string;
  /** Symbol display name for the admitted value or producing expression, when visible. */
  readonly bindingExpressionSymbolName: string | null;
  /** Exact admission call source range. */
  readonly source: SourceRange;
  /** Compact syntax products that construct the same binding class, if any. */
  readonly constructionProducts: readonly FrameworkSyntaxProductReferenceRow[];
  /** Human-facing row summary. */
  readonly summary: string;
}

/** Small public reference to an instruction declaration joined into an instruction slot. */
export interface FrameworkInstructionDeclarationReferenceRow {
  /** Instruction class/interface/type name. */
  readonly instructionName: string;
  /** Source declaration kind for the instruction shape. */
  readonly declarationKind: FrameworkInstructionDeclarationRow["declarationKind"];
  /** Exact declaration source range. */
  readonly source: SourceRange;
}

/** Public compact row for instruction-slot projection answers. */
export interface FrameworkInstructionSlotSummaryRow {
  /** Stable row id. */
  readonly id: string;
  /** Aurelia framework package id that declares the slot constant. */
  readonly packageId: string;
  /** Package name from the source admission contract. */
  readonly packageName: string;
  /** Runtime discriminator constant name. */
  readonly slotName: string;
  /** Numeric runtime discriminator when statically visible. */
  readonly slotValue: number | null;
  /** Exact slot constant source range. */
  readonly source: SourceRange;
  /** Compact instruction declarations that reference this slot. */
  readonly instructionDeclarations: readonly FrameworkInstructionDeclarationReferenceRow[];
  /** Compact syntax products joined to this slot. */
  readonly syntaxProducts: readonly FrameworkSyntaxProductReferenceRow[];
  /** Human-facing row summary. */
  readonly summary: string;
}

/** Public compact row for instruction-dispatch projection answers. */
export interface FrameworkInstructionDispatchSummaryRow {
  /** Stable row id. */
  readonly id: string;
  /** Aurelia framework package id that owns the renderer. */
  readonly packageId: string;
  /** Package name from the source admission contract. */
  readonly packageName: string;
  /** Runtime discriminator constant name. */
  readonly slotName: string;
  /** Numeric runtime discriminator when statically visible. */
  readonly slotValue: number | null;
  /** Instruction class/interface/type consumed by the renderer. */
  readonly instructionName: string | null;
  /** Renderer producer/export name. */
  readonly rendererName: string;
  /** Internal syntax-product row id for detail/provenance correlation. */
  readonly rendererProductId: string;
  /** Internal instruction-slot row id for detail/provenance correlation. */
  readonly instructionSlotId: string;
  /** Binding class/factory produced by the renderer, when visible on the syntax product. */
  readonly bindingName: string | null;
  /** Count of instruction declarations that bind to this slot. */
  readonly instructionDeclarationCount: number;
  /** Count of syntax products joined to this slot. */
  readonly syntaxProductCount: number;
  /** Exact renderer target source range. */
  readonly source: SourceRange;
  /** Human-facing dispatch summary. */
  readonly summary: string;
}

/** Public compact row for controller-creation projection answers. */
export interface FrameworkControllerCreationSummaryRow {
  /** Stable row id. */
  readonly id: string;
  /** Aurelia framework package id that owns the renderer. */
  readonly packageId: string;
  /** Package name from the source admission contract. */
  readonly packageName: string;
  /** Renderer export/class that owns the flow. */
  readonly rendererName: string;
  /** Resource kind hydrated by this renderer flow. */
  readonly resourceKind: string;
  /** Instruction class/interface/type consumed by this renderer. */
  readonly instructionName: string | null;
  /** Instruction discriminator target expression such as itHydrateElement. */
  readonly instructionTarget: string | null;
  /** Parent controller expression received by render(...). */
  readonly parentControllerExpression: string;
  /** Child controller local expression admitted to the parent. */
  readonly childControllerExpression: string;
  /** View-model construction/invocation callee name, when visible. */
  readonly viewModelCalleeName: string | null;
  /** Controller factory callee such as $el or $attr. */
  readonly controllerFactoryCalleeName: string;
  /** Parent addChild(...) callee name, when visible. */
  readonly childAdmissionCalleeName: string | null;
  /** Number of recursive renderer dispatch calls inside the renderer flow. */
  readonly recursiveDispatchCount: number;
  /** Template-controller link hook callee name, when visible. */
  readonly linkCalleeName: string | null;
  /** Exact renderer method source range. */
  readonly source: SourceRange;
  /** Human-facing row summary. */
  readonly summary: string;
}

/** Project an internal instruction-dispatch row into its compact public answer row. */
export function instructionDispatchSummaryRow(
  row: FrameworkInstructionDispatchRow,
): FrameworkInstructionDispatchSummaryRow {
  return {
    id: row.id,
    packageId: row.packageId,
    packageName: row.packageName,
    slotName: row.slotName,
    slotValue: row.slotValue,
    instructionName: row.instructionName,
    rendererName: row.rendererName,
    rendererProductId: row.rendererProduct.id,
    instructionSlotId: row.instructionSlot.id,
    bindingName: row.rendererProduct.bindingName,
    instructionDeclarationCount:
      row.instructionSlot.instructionDeclarations.length,
    syntaxProductCount: row.instructionSlot.syntaxProducts.length,
    source: row.source,
    summary: `${row.slotName} dispatches ${row.instructionName ?? "instruction"} to ${row.rendererName}.`,
  };
}

/** Project an internal syntax-product row into its compact public answer row. */
export function syntaxProductSummaryRow(
  row: FrameworkSyntaxProductRow,
): FrameworkSyntaxProductSummaryRow {
  return {
    ...syntaxProductReferenceRow(row),
    resourceCarrier:
      row.resourceCarrier === undefined
        ? null
        : resourceCarrierReferenceRow(row.resourceCarrier),
    expressionText: row.expression.text,
    expressionTextTruncated: row.expression.textTruncated,
    expressionType: row.expression.type,
    expressionSymbolName: row.expression.symbolName,
    source: row.source,
    summary: `${row.producerName} ${row.productKind}${row.instructionName === null ? "" : ` for ${row.instructionName}`}${row.bindingName === null ? "" : ` creates ${row.bindingName}`}.`,
  };
}

/** Project an internal instruction-slot row into its compact public answer row. */
export function instructionSlotSummaryRow(
  row: FrameworkInstructionSlotRow,
): FrameworkInstructionSlotSummaryRow {
  const declarations = row.instructionDeclarations.map(
    instructionDeclarationReferenceRow,
  );
  const syntaxProducts = row.syntaxProducts.map(syntaxProductReferenceRow);
  return {
    id: row.id,
    packageId: row.packageId,
    packageName: row.packageName,
    slotName: row.slotName,
    slotValue: row.slotValue,
    source: row.source,
    instructionDeclarations: declarations,
    syntaxProducts,
    summary: `${row.slotName} = ${row.slotValue ?? "unknown"} binds ${declarations.length} instruction declaration(s) to ${syntaxProducts.length} syntax product(s).`,
  };
}

/** Project an internal controller-creation row into its compact public answer row. */
export function controllerCreationSummaryRow(
  row: FrameworkControllerCreationRow,
): FrameworkControllerCreationSummaryRow {
  return {
    id: row.id,
    packageId: row.packageId,
    packageName: row.packageName,
    rendererName: row.rendererName,
    resourceKind: row.resourceKind,
    instructionName: row.instructionName,
    instructionTarget: row.instructionTarget,
    parentControllerExpression: row.parentControllerExpression,
    childControllerExpression: row.childControllerExpression,
    viewModelCalleeName: row.viewModelCall?.calleeName ?? null,
    controllerFactoryCalleeName: row.controllerFactoryCall.calleeName,
    childAdmissionCalleeName: row.childAdmissionCall?.calleeName ?? null,
    recursiveDispatchCount: row.recursiveDispatchCalls.length,
    linkCalleeName: row.linkCall?.calleeName ?? null,
    source: row.source,
    summary: row.summary,
  };
}

/** Project an internal binding-product row into its compact public answer row. */
export function bindingProductSummaryRow(
  row: FrameworkBindingProductRow,
): FrameworkBindingProductSummaryRow {
  return {
    id: row.id,
    packageId: row.packageId,
    packageName: row.packageName,
    bindingName: row.bindingName,
    declarationKind: row.declarationKind,
    source: row.source,
    constructionProducts: row.constructionProducts.map(
      syntaxProductReferenceRow,
    ),
    admissions: row.admissions.map(bindingAdmissionReferenceRow),
    constructorParameters: row.constructorParameters,
    methodNames: row.methodNames,
    lifecycleMethods: row.lifecycleMethods,
    observerLocatorParameters: row.observerLocatorParameters,
    observerLocatorCallSiteCount: row.observerLocatorCallSites.length,
    targetObserverMethods: row.targetObserverMethods,
    summary: `${row.bindingName} has ${row.constructionProducts.length} construction product(s), ${row.admissions.length} admission edge(s), lifecycle [${row.lifecycleMethods.join(", ")}], and ${row.observerLocatorCallSites.length} observer-locator call(s).`,
  };
}

/** Project an internal binding-admission row into its compact public answer row. */
export function bindingAdmissionSummaryRow(
  row: FrameworkBindingAdmissionRow,
): FrameworkBindingAdmissionSummaryRow {
  return {
    id: row.id,
    packageId: row.packageId,
    packageName: row.packageName,
    producerName: row.producerName,
    controllerExpression: row.controllerExpression,
    bindingName: row.bindingName,
    constructionKind: row.constructionKind,
    admissionCalleeName: row.admissionCall.calleeName,
    bindingExpressionText: row.bindingExpression.text,
    bindingExpressionTextTruncated: row.bindingExpression.textTruncated,
    bindingExpressionType: row.bindingExpression.type,
    bindingExpressionSymbolName: row.bindingExpression.symbolName,
    source: row.source,
    constructionProducts: row.constructionProducts.map(
      syntaxProductReferenceRow,
    ),
    summary: `${row.producerName} admits ${row.bindingName} into ${row.controllerExpression} via ${row.constructionKind}.`,
  };
}

function syntaxProductReferenceRow(
  row: FrameworkSyntaxProductRow,
): FrameworkSyntaxProductReferenceRow {
  return {
    id: row.id,
    packageId: row.packageId,
    packageName: row.packageName,
    producerName: row.producerName,
    producerKind: row.producerKind,
    productKind: row.productKind,
    instructionName: row.instructionName,
    instructionTarget: row.instructionTarget,
    bindingName: row.bindingName,
  };
}

function bindingAdmissionReferenceRow(
  row: FrameworkBindingAdmissionRow,
): FrameworkBindingAdmissionReferenceRow {
  return {
    id: row.id,
    producerName: row.producerName,
    controllerExpression: row.controllerExpression,
    bindingName: row.bindingName,
    constructionKind: row.constructionKind,
  };
}

function instructionDeclarationReferenceRow(
  row: FrameworkInstructionDeclarationRow,
): FrameworkInstructionDeclarationReferenceRow {
  return {
    instructionName: row.instructionName,
    declarationKind: row.declarationKind,
    source: row.source,
  };
}

function resourceCarrierReferenceRow(
  row: FrameworkResourceCarrierRow,
): FrameworkResourceCarrierReferenceRow {
  return {
    id: row.id,
    sourceExportName: row.sourceExportName,
    resourceKind: row.resourceKind,
    carrierKind: row.carrierKind,
    resourceName: row.resourceName,
    aliases: row.aliases,
    targetName: row.targetName,
  };
}
