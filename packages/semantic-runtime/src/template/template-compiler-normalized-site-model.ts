import type { OpenSeam } from '../kernel/open-seam.js';
import type { IdentityHandle, ProductHandle } from '../kernel/handles.js';
import type { CustomElementDefinition } from '../resources/custom-element-definition.js';
import type {
  AttributeClassification,
  AttributeSyntax,
} from './attribute-syntax.js';
import type {
  AttributeClassificationEmission,
} from './attribute-classification-materializer.js';
import type {
  BindingCommandBuildInput,
  BindingCommandLowering,
  MultiBindingLowering,
  MultiBindingSegment,
} from './binding-command-execution.js';
import type { BindingCommandLoweringEmission } from './binding-command-lowering-materializer.js';
import type { TemplateCompilerWorldEmission } from './compiler-world-materializer.js';
import type { TemplateCompilerIssue } from './compiler-issue.js';
import type { TemplateCompilationUnitEmission } from './compilation-unit-materializer.js';
import type {
  HtmlAttribute,
  HtmlDocument,
  HtmlElement,
  HtmlElementAttributeOwner,
  HtmlText,
} from './html-ir.js';
import type { TemplateInstruction } from './instruction-ir.js';
import type { CompiledTemplateEmission } from './compiled-template-materializer.js';
import type { TemplateResourceCompilationEmission } from './template-compilation-project-pass.js';
import type {
  TemplateExpressionParse,
  TemplateValueSite,
} from './value-site.js';

/** Exact front-door basis retained for later lane/currentness admission. */
export class TemplateCompilerNormalizedCompilationBasis {
  readonly familyOwnerHandle: IdentityHandle | ProductHandle;
  readonly analysisContextProductHandle: ProductHandle;
  readonly compilerWorld: TemplateCompilerWorldEmission;
  readonly definition: CustomElementDefinition;
  readonly unit: TemplateCompilationUnitEmission;
  readonly htmlDocument: HtmlDocument;

  constructor(readonly compilation: TemplateResourceCompilationEmission) {
    this.familyOwnerHandle = compilation.familyOwnerHandle;
    this.analysisContextProductHandle = compilation.analysisContextProductHandle;
    this.compilerWorld = compilation.compilerWorld;
    this.definition = compilation.definition;
    this.unit = compilation.unit;
    this.htmlDocument = compilation.html.document;
  }
}

/** Closed command-owned products rooted at one top-level authored attribute syntax. */
export class TemplateCompilerNormalizedCommandSite {
  constructor(
    readonly buildInput: BindingCommandBuildInput,
    readonly lowering: BindingCommandLowering,
    readonly secondaryValueSites: readonly TemplateValueSite[],
    readonly secondaryExpressionParses: readonly TemplateExpressionParse[],
    readonly instructions: readonly TemplateInstruction[],
  ) {}
}

/** Closed inline multi-binding products rooted at one authored custom-attribute value. */
export class TemplateCompilerNormalizedMultiBindingSite {
  constructor(
    readonly lowering: MultiBindingLowering,
    /** Segments in the aggregate lowering's authored order. */
    readonly segments: readonly MultiBindingSegment[],
    /** Secondary syntaxes aligned with `segments`. */
    readonly secondarySyntaxes: readonly AttributeSyntax[],
    /** Command build inputs in segment order; plain and invalid segments contribute none. */
    readonly buildInputs: readonly BindingCommandBuildInput[],
    /** Command lowerings in segment order; plain and invalid segments contribute none. */
    readonly commandLowerings: readonly BindingCommandLowering[],
    /** Parser-owned secondary sites in segment order. */
    readonly secondaryValueSites: readonly TemplateValueSite[],
    /** Parser publications aligned with `secondaryValueSites`. */
    readonly secondaryExpressionParses: readonly TemplateExpressionParse[],
    /** Instructions in exact framework production order across the ordered segments. */
    readonly instructions: readonly TemplateInstruction[],
  ) {}
}

/** Exact product route available when phase-global issue/seam ownership needs later repair. */
export class TemplateCompilerNormalizedSiteOutcomeRoute {
  constructor(
    readonly classification: AttributeClassification,
    readonly commandLowerings: readonly BindingCommandLowering[],
    readonly multiBindingLowering: MultiBindingLowering | null,
    readonly attributeClassificationAuthority: AttributeClassificationEmission,
    readonly bindingCommandLoweringAuthority: BindingCommandLoweringEmission,
    readonly compiledTemplateAuthority: CompiledTemplateEmission,
  ) {}
}

/** One normalized compiler bundle identified by its authored HtmlAttribute product. */
export class TemplateCompilerNormalizedSite {
  constructor(
    readonly attributeProductHandle: ProductHandle,
    readonly owner: HtmlElementAttributeOwner,
    readonly attribute: HtmlAttribute,
    readonly syntax: AttributeSyntax,
    readonly classification: AttributeClassification,
    readonly primaryValueSite: TemplateValueSite | null,
    readonly primaryExpressionParse: TemplateExpressionParse | null,
    readonly command: TemplateCompilerNormalizedCommandSite | null,
    readonly multiBinding: TemplateCompilerNormalizedMultiBindingSite | null,
    readonly outcomeRoute: TemplateCompilerNormalizedSiteOutcomeRoute,
  ) {}

  readExpressionParses(): readonly TemplateExpressionParse[] {
    return [
      ...(this.primaryExpressionParse == null ? [] : [this.primaryExpressionParse]),
      ...(this.command?.secondaryExpressionParses ?? []),
      ...(this.multiBinding?.secondaryExpressionParses ?? []),
    ];
  }
}

/** One authored text interpolation with its exact parser-owned products. */
export class TemplateCompilerNormalizedTextSite {
  constructor(
    readonly textProductHandle: ProductHandle,
    readonly text: HtmlText,
    readonly valueSite: TemplateValueSite,
    readonly expressionParse: TemplateExpressionParse,
  ) {}
}

export const enum TemplateCompilerNormalizedOwnershipRelation {
  AttributeOwnsTopLevelSyntax = 'attribute-owns-top-level-syntax',
  SyntaxOwnsClassification = 'syntax-owns-classification',
  ClassificationOwnsPrimaryValueSite = 'classification-owns-primary-value-site',
  TextOwnsPrimaryValueSite = 'text-owns-primary-value-site',
  ValueSiteOwnsExpressionParse = 'value-site-owns-expression-parse',
  ClassificationOwnsCommandBuildInput = 'classification-owns-command-build-input',
  SegmentOwnsCommandBuildInput = 'segment-owns-command-build-input',
  BuildInputOwnsCommandLowering = 'build-input-owns-command-lowering',
  CommandLoweringOwnsSecondaryValueSite = 'command-lowering-owns-secondary-value-site',
  CommandLoweringOwnsInstruction = 'command-lowering-owns-instruction',
  MultiBindingSiteOwnsLowering = 'multi-binding-site-owns-lowering',
  MultiBindingSiteOwnsSegment = 'multi-binding-site-owns-segment',
  SegmentOwnsSecondarySyntax = 'segment-owns-secondary-syntax',
  SegmentOwnsSecondaryValueSite = 'segment-owns-secondary-value-site',
  SegmentOwnsDirectInstruction = 'segment-owns-direct-instruction',
}

export const enum TemplateCompilerNormalizedContainmentRelation {
  MultiBindingLoweringContainsSegment = 'multi-binding-lowering-contains-segment',
  MultiBindingLoweringContainsInstruction = 'multi-binding-lowering-contains-instruction',
  IteratorInstructionContainsTailInstruction = 'iterator-instruction-contains-tail-instruction',
  InstructionContainsInstruction = 'instruction-contains-instruction',
}

/** One exclusive producer→product relation in the normalized graph. */
export class TemplateCompilerNormalizedOwnershipRow {
  constructor(
    readonly ownerProductHandle: ProductHandle,
    readonly productHandle: ProductHandle,
    readonly relation: TemplateCompilerNormalizedOwnershipRelation,
  ) {}
}

/** One intentional ordered containment edge that does not replace exclusive production ownership. */
export class TemplateCompilerNormalizedContainmentRow {
  constructor(
    readonly containerProductHandle: ProductHandle,
    readonly productHandle: ProductHandle,
    readonly relation: TemplateCompilerNormalizedContainmentRelation,
    readonly ordinal: number,
  ) {}
}

/** Immutable ownership/containment ledger retained by a GraphExact index. */
export class TemplateCompilerNormalizedOwnershipLedger {
  private readonly ownershipByProduct: ReadonlyMap<ProductHandle, TemplateCompilerNormalizedOwnershipRow>;

  constructor(
    readonly ownership: readonly TemplateCompilerNormalizedOwnershipRow[],
    readonly containment: readonly TemplateCompilerNormalizedContainmentRow[],
  ) {
    this.ownershipByProduct = new Map(ownership.map((row) => [row.productHandle, row]));
  }

  ownerOf(productHandle: ProductHandle): TemplateCompilerNormalizedOwnershipRow | null {
    return this.ownershipByProduct.get(productHandle) ?? null;
  }
}

export const enum TemplateCompilerNormalizedOutcomeAttributionKind {
  NoRetainedPhaseGlobalOutcomes = 'no-retained-phase-global-outcomes',
  PhaseGlobalOwnershipUnavailable = 'phase-global-ownership-unavailable',
}

/** Exact global outcomes retained without pretending phase-flat rows have per-bundle ownership. */
export class TemplateCompilerNormalizedOutcomeInventory {
  readonly attributionKind: TemplateCompilerNormalizedOutcomeAttributionKind;

  constructor(
    readonly issues: readonly TemplateCompilerIssue[],
    readonly openSeams: readonly OpenSeam[],
  ) {
    this.attributionKind = issues.length === 0 && openSeams.length === 0
      ? TemplateCompilerNormalizedOutcomeAttributionKind.NoRetainedPhaseGlobalOutcomes
      : TemplateCompilerNormalizedOutcomeAttributionKind.PhaseGlobalOwnershipUnavailable;
  }
}

export const enum TemplateCompilerNormalizedDownstreamInstructionDisposition {
  RegenerateFromAttributeSite = 'regenerate-from-attribute-site',
  RegenerateFromTextSite = 'regenerate-from-text-site',
  ExcludedStructuralOutput = 'excluded-structural-output',
}

export const enum TemplateCompilerNormalizedDownstreamInstructionExclusionKind {
  NoSingularAttributeOrTextProducer = 'no-singular-attribute-or-text-producer',
}

/** One compiled-template-created output accounted for without turning it into normalization authority. */
export class TemplateCompilerNormalizedDownstreamInstruction {
  constructor(
    readonly instruction: TemplateInstruction,
    readonly disposition: TemplateCompilerNormalizedDownstreamInstructionDisposition,
    readonly attributeSite: TemplateCompilerNormalizedSite | null,
    readonly textSite: TemplateCompilerNormalizedTextSite | null,
    readonly exclusionKind: TemplateCompilerNormalizedDownstreamInstructionExclusionKind | null,
  ) {}
}

export const enum TemplateCompilerNormalizedDownstreamInstructionParityState {
  Exact = 'exact',
  Mismatch = 'mismatch',
}

/** Observational parity inventory; rows are never authored-precedent or scheduling authority. */
export class TemplateCompilerNormalizedDownstreamInstructionInventory {
  readonly state: TemplateCompilerNormalizedDownstreamInstructionParityState;

  constructor(
    readonly rows: readonly TemplateCompilerNormalizedDownstreamInstruction[],
    readonly attributeOutputs: readonly TemplateCompilerNormalizedDownstreamInstruction[],
    readonly textOutputs: readonly TemplateCompilerNormalizedDownstreamInstruction[],
    readonly excludedStructuralOutputs: readonly TemplateCompilerNormalizedDownstreamInstruction[],
    readonly mismatches: readonly TemplateCompilerNormalizedSiteMismatch[] = [],
  ) {
    this.state = mismatches.length === 0
      ? TemplateCompilerNormalizedDownstreamInstructionParityState.Exact
      : TemplateCompilerNormalizedDownstreamInstructionParityState.Mismatch;
  }
}

/** Cardinality of the validated graph, retained for conservation and performance checks. */
export class TemplateCompilerNormalizedSiteCardinality {
  constructor(
    readonly authoredElements: number,
    readonly authoredTexts: number,
    readonly authoredAttributes: number,
    readonly attributeSites: number,
    readonly textSites: number,
    readonly topLevelSyntaxes: number,
    readonly classifications: number,
    readonly primaryValueSites: number,
    readonly primaryExpressionParses: number,
    readonly commandBuildInputs: number,
    readonly commandLowerings: number,
    readonly secondarySyntaxes: number,
    readonly multiBindingSegments: number,
    readonly multiBindingLowerings: number,
    readonly secondaryValueSites: number,
    readonly secondaryExpressionParses: number,
    readonly normalizedInstructions: number,
    readonly downstreamCreatedInstructions: number,
    readonly ownershipEdges: number,
    readonly containmentEdges: number,
  ) {}
}

/**
 * Immutable authored-precedent index over one compiler-front-door emission.
 *
 * `GraphExact` means the retained normalized product graph and its cross-references are exact. It does not mean every
 * compiler effect completed semantically, that the basis is current, or that it is the complete live-site universe.
 * Currentness must be paired externally; browser normalization and generated sites require the later live resolver.
 * Issue/open-seam posture remains explicit in `outcomes` and bundle routes.
 */
export class TemplateCompilerNormalizedSiteIndex {
  private readonly attributeSitesByProduct: ReadonlyMap<ProductHandle, TemplateCompilerNormalizedSite>;
  private readonly textSitesByProduct: ReadonlyMap<ProductHandle, TemplateCompilerNormalizedTextSite>;
  private readonly elementsByProduct: ReadonlyMap<ProductHandle, HtmlElement>;
  private readonly textsByProduct: ReadonlyMap<ProductHandle, HtmlText>;

  constructor(
    readonly basis: TemplateCompilerNormalizedCompilationBasis,
    readonly attributeSites: readonly TemplateCompilerNormalizedSite[],
    readonly textSites: readonly TemplateCompilerNormalizedTextSite[],
    readonly authoredElements: readonly HtmlElement[],
    readonly authoredTexts: readonly HtmlText[],
    readonly ownership: TemplateCompilerNormalizedOwnershipLedger,
    readonly outcomes: TemplateCompilerNormalizedOutcomeInventory,
    readonly downstreamInstructions: TemplateCompilerNormalizedDownstreamInstructionInventory,
    readonly cardinality: TemplateCompilerNormalizedSiteCardinality,
  ) {
    this.attributeSitesByProduct = new Map(attributeSites.map((site) => [site.attributeProductHandle, site]));
    this.textSitesByProduct = new Map(textSites.map((site) => [site.textProductHandle, site]));
    this.elementsByProduct = new Map(authoredElements.map((element) => [element.productHandle, element]));
    this.textsByProduct = new Map(authoredTexts.map((text) => [text.productHandle, text]));
  }

  /** Compatibility alias while downstream schedule callers move to the explicit attribute lane. */
  get sites(): readonly TemplateCompilerNormalizedSite[] {
    return this.attributeSites;
  }

  get compilation(): TemplateResourceCompilationEmission {
    return this.basis.compilation;
  }

  get familyOwnerHandle(): IdentityHandle | ProductHandle {
    return this.basis.familyOwnerHandle;
  }

  get analysisContextProductHandle(): ProductHandle {
    return this.basis.analysisContextProductHandle;
  }

  get compilerWorld(): TemplateCompilerWorldEmission {
    return this.basis.compilerWorld;
  }

  get definition(): CustomElementDefinition {
    return this.basis.definition;
  }

  get unit(): TemplateCompilationUnitEmission {
    return this.basis.unit;
  }

  get htmlDocument(): HtmlDocument {
    return this.basis.htmlDocument;
  }

  siteForAttribute(attributeProductHandle: ProductHandle): TemplateCompilerNormalizedSite | null {
    return this.attributeSitesByProduct.get(attributeProductHandle) ?? null;
  }

  siteForText(textProductHandle: ProductHandle): TemplateCompilerNormalizedTextSite | null {
    return this.textSitesByProduct.get(textProductHandle) ?? null;
  }

  elementForProduct(elementProductHandle: ProductHandle): HtmlElement | null {
    return this.elementsByProduct.get(elementProductHandle) ?? null;
  }

  textForProduct(textProductHandle: ProductHandle): HtmlText | null {
    return this.textsByProduct.get(textProductHandle) ?? null;
  }
}

export const enum TemplateCompilerNormalizedSiteIndexState {
  GraphExact = 'graph-exact',
  Mismatch = 'mismatch',
}

export const enum TemplateCompilerNormalizedSiteMismatchKind {
  HtmlDocumentAuthorityMismatch = 'html-document-authority-mismatch',
  CompilationBasisMismatch = 'compilation-basis-mismatch',
  DuplicateProduct = 'duplicate-product',
  DuplicateReference = 'duplicate-reference',
  ExclusiveOwnershipConflict = 'exclusive-ownership-conflict',
  MissingAttributeOwner = 'missing-attribute-owner',
  AttributeOwnerCardinality = 'attribute-owner-cardinality',
  TopLevelSyntaxCardinality = 'top-level-syntax-cardinality',
  ClassificationCardinality = 'classification-cardinality',
  PrimaryValueSiteCardinality = 'primary-value-site-cardinality',
  TextValueSiteCardinality = 'text-value-site-cardinality',
  ExpressionParseCardinality = 'expression-parse-cardinality',
  CommandGraphCardinality = 'command-graph-cardinality',
  MultiBindingGraphCardinality = 'multi-binding-graph-cardinality',
  MultiBindingSegmentOrderMismatch = 'multi-binding-segment-order-mismatch',
  MultiBindingInstructionOrderMismatch = 'multi-binding-instruction-order-mismatch',
  InstructionReferenceMismatch = 'instruction-reference-mismatch',
  MissingReferencedProduct = 'missing-referenced-product',
  CrossReferenceMismatch = 'cross-reference-mismatch',
  UnownedProduct = 'unowned-product',
  DownstreamInstructionInventoryMismatch = 'downstream-instruction-inventory-mismatch',
}

/** Typed GraphExact failure. Product handles are the smallest useful causal witness. */
export class TemplateCompilerNormalizedSiteMismatch {
  constructor(
    readonly mismatchKind: TemplateCompilerNormalizedSiteMismatchKind,
    readonly relation: string,
    readonly summary: string,
    readonly productHandles: readonly ProductHandle[] = [],
  ) {}
}

export class TemplateCompilerNormalizedSiteIndexResult {
  readonly state: TemplateCompilerNormalizedSiteIndexState;

  constructor(
    readonly index: TemplateCompilerNormalizedSiteIndex | null,
    readonly mismatches: readonly TemplateCompilerNormalizedSiteMismatch[],
  ) {
    this.state = index == null
      ? TemplateCompilerNormalizedSiteIndexState.Mismatch
      : TemplateCompilerNormalizedSiteIndexState.GraphExact;
  }
}
