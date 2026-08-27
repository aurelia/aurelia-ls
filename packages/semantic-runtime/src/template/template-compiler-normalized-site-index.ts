import type { IdentityHandle, ProductHandle } from '../kernel/handles.js';
import type {
  AttributeClassification,
  AttributeSyntax,
} from './attribute-syntax.js';
import type {
  BindingCommandBuildInput,
  BindingCommandLowering,
  MultiBindingLowering,
  MultiBindingSegment,
} from './binding-command-execution.js';
import {
  HtmlElementAttributeOwner,
  type HtmlAttribute,
  type HtmlDocument,
  htmlElementAttributeOwnersByAttributeProduct,
} from './html-ir.js';
import type { TemplateInstruction } from './instruction-ir.js';
import type { TemplateResourceCompilationEmission } from './template-compilation-project-pass.js';
import {
  TemplateValueSiteKind,
  type TemplateExpressionParse,
  type TemplateValueSite,
} from './value-site.js';

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
    /** Segments in the lowering's authored order. */
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
    /** Instructions in the aggregate multi-binding lowering's authoritative order. */
    readonly instructions: readonly TemplateInstruction[],
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
  ) {}
}

/** Cardinality of the validated normalized graph, retained for conservation and performance checks. */
export class TemplateCompilerNormalizedSiteCardinality {
  constructor(
    readonly authoredAttributes: number,
    readonly sites: number,
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
    readonly instructions: number,
  ) {}
}

/**
 * Immutable, product-free read index over one compiler-front-door emission.
 *
 * It retains existing semantic products without allocating handles, records, claims, or publication state.
 */
export class TemplateCompilerNormalizedSiteIndex {
  private readonly sitesByAttributeProduct: ReadonlyMap<ProductHandle, TemplateCompilerNormalizedSite>;

  constructor(
    readonly familyOwnerHandle: IdentityHandle | ProductHandle,
    readonly htmlDocument: HtmlDocument,
    readonly sites: readonly TemplateCompilerNormalizedSite[],
    readonly cardinality: TemplateCompilerNormalizedSiteCardinality,
  ) {
    this.sitesByAttributeProduct = new Map(sites.map((site) => [site.attributeProductHandle, site]));
  }

  siteForAttribute(attributeProductHandle: ProductHandle): TemplateCompilerNormalizedSite | null {
    return this.sitesByAttributeProduct.get(attributeProductHandle) ?? null;
  }
}

export const enum TemplateCompilerNormalizedSiteIndexState {
  Exact = 'exact',
  Mismatch = 'mismatch',
}

export const enum TemplateCompilerNormalizedSiteMismatchKind {
  HtmlDocumentAuthorityMismatch = 'html-document-authority-mismatch',
  DuplicateProduct = 'duplicate-product',
  MissingAttributeOwner = 'missing-attribute-owner',
  TopLevelSyntaxCardinality = 'top-level-syntax-cardinality',
  ClassificationCardinality = 'classification-cardinality',
  PrimaryValueSiteCardinality = 'primary-value-site-cardinality',
  ExpressionParseCardinality = 'expression-parse-cardinality',
  CommandGraphCardinality = 'command-graph-cardinality',
  MultiBindingGraphCardinality = 'multi-binding-graph-cardinality',
  MultiBindingSegmentOrderMismatch = 'multi-binding-segment-order-mismatch',
  MissingReferencedProduct = 'missing-referenced-product',
  CrossReferenceMismatch = 'cross-reference-mismatch',
  UnownedProduct = 'unowned-product',
}

/** Typed closed-graph failure. Product handles are the smallest useful causal witness. */
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
      : TemplateCompilerNormalizedSiteIndexState.Exact;
  }
}

/** Build and validate one normalized attribute-site graph without publishing a semantic product. */
export function buildTemplateCompilerNormalizedSiteIndex(
  compilation: TemplateResourceCompilationEmission,
): TemplateCompilerNormalizedSiteIndexResult {
  return new TemplateCompilerNormalizedSiteIndexBuilder(compilation).build();
}

class TemplateCompilerNormalizedSiteIndexBuilder {
  private readonly mismatches: TemplateCompilerNormalizedSiteMismatch[] = [];
  private readonly productKinds = new Map<ProductHandle, string>();

  private readonly attributesByProduct = new Map<ProductHandle, HtmlAttribute>();
  private readonly ownersByAttributeProduct: ReadonlyMap<ProductHandle, HtmlElementAttributeOwner>;
  private readonly topLevelSyntaxesByProduct = new Map<ProductHandle, AttributeSyntax>();
  private readonly topLevelSyntaxesByAttribute = new Map<ProductHandle, AttributeSyntax[]>();
  private readonly classificationsByProduct = new Map<ProductHandle, AttributeClassification>();
  private readonly classificationsBySyntax = new Map<ProductHandle, AttributeClassification[]>();
  private readonly primaryValueSitesByProduct = new Map<ProductHandle, TemplateValueSite>();
  private readonly primaryValueSitesByClassification = new Map<ProductHandle, TemplateValueSite[]>();
  private readonly primaryExpressionParsesBySite = new Map<ProductHandle, TemplateExpressionParse[]>();
  private readonly secondarySyntaxesByProduct = new Map<ProductHandle, AttributeSyntax>();
  private readonly secondaryValueSitesByProduct = new Map<ProductHandle, TemplateValueSite>();
  private readonly secondaryValueSitesBySyntax = new Map<ProductHandle, TemplateValueSite[]>();
  private readonly secondaryExpressionParsesBySite = new Map<ProductHandle, TemplateExpressionParse[]>();
  private readonly buildInputsByProduct = new Map<ProductHandle, BindingCommandBuildInput>();
  private readonly buildInputsBySyntax = new Map<ProductHandle, BindingCommandBuildInput[]>();
  private readonly loweringsByProduct = new Map<ProductHandle, BindingCommandLowering>();
  private readonly loweringsByInput = new Map<ProductHandle, BindingCommandLowering[]>();
  private readonly segmentsByProduct = new Map<ProductHandle, MultiBindingSegment>();
  private readonly multiBindingLoweringsByProduct = new Map<ProductHandle, MultiBindingLowering>();
  private readonly multiBindingLoweringsBySite = new Map<ProductHandle, MultiBindingLowering[]>();
  private readonly instructionsByProduct = new Map<ProductHandle, TemplateInstruction>();

  private readonly spentSecondarySyntaxes = new Set<ProductHandle>();
  private readonly spentBuildInputs = new Set<ProductHandle>();
  private readonly spentLowerings = new Set<ProductHandle>();
  private readonly spentSegments = new Set<ProductHandle>();
  private readonly spentMultiBindingLowerings = new Set<ProductHandle>();
  private readonly spentSecondaryValueSites = new Set<ProductHandle>();
  private readonly spentSecondaryExpressionParses = new Set<ProductHandle>();
  private readonly spentInstructions = new Set<ProductHandle>();
  private primaryAttributeValueSiteCount = 0;
  private primaryAttributeExpressionParseCount = 0;

  constructor(private readonly compilation: TemplateResourceCompilationEmission) {
    this.ownersByAttributeProduct = htmlElementAttributeOwnersByAttributeProduct(
      compilation.html.nodes,
      compilation.html.attributes,
    );
  }

  build(): TemplateCompilerNormalizedSiteIndexResult {
    this.validateFamilyAuthority();
    this.indexGraph();
    this.validateGraphReferences();

    const sites: TemplateCompilerNormalizedSite[] = [];
    for (const attribute of this.compilation.html.attributes) {
      const site = this.buildAuthoredSite(attribute);
      if (site != null) sites.push(site);
    }
    this.validateUnownedProducts();

    if (this.mismatches.length > 0) {
      return new TemplateCompilerNormalizedSiteIndexResult(null, this.mismatches);
    }
    return new TemplateCompilerNormalizedSiteIndexResult(
      new TemplateCompilerNormalizedSiteIndex(
        this.compilation.familyOwnerHandle,
        this.compilation.html.document,
        sites,
        new TemplateCompilerNormalizedSiteCardinality(
          this.compilation.html.attributes.length,
          sites.length,
          this.compilation.attributeSyntax.syntaxes.length,
          this.compilation.attributeClassification.classifications.length,
          this.primaryAttributeValueSiteCount,
          this.primaryAttributeExpressionParseCount,
          this.compilation.bindingCommandLowering.buildInputs.length,
          this.compilation.bindingCommandLowering.lowerings.length,
          this.compilation.bindingCommandLowering.attributeSyntaxes.length,
          this.compilation.bindingCommandLowering.multiBindingSegments.length,
          this.compilation.bindingCommandLowering.multiBindingLowerings.length,
          this.compilation.bindingCommandLowering.valueSites.length,
          this.compilation.bindingCommandLowering.expressionParses.length,
          this.compilation.bindingCommandLowering.instructions.length,
        ),
      ),
      [],
    );
  }

  private validateFamilyAuthority(): void {
    const compiledDocument = this.compilation.compiledTemplate.compiledTemplate.htmlDocumentProductHandle;
    const htmlDocument = this.compilation.html.document.productHandle;
    const unitSource = this.compilation.unit.compilationUnit.templateSource.productHandle;
    const emittedSource = this.compilation.unit.templateSource.productHandle;
    if (compiledDocument !== htmlDocument || unitSource !== emittedSource) {
      this.mismatch(
        TemplateCompilerNormalizedSiteMismatchKind.HtmlDocumentAuthorityMismatch,
        'compilation-family/html-document',
        'Compilation-unit source, authored HTML document, and compiled-template family authority do not close over one emission.',
        [compiledDocument, htmlDocument, unitSource, emittedSource],
      );
    }
  }

  private indexGraph(): void {
    for (const attribute of this.compilation.html.attributes) {
      this.register('html-attribute', attribute.productHandle, attribute, this.attributesByProduct);
    }
    for (const syntax of this.compilation.attributeSyntax.syntaxes) {
      this.register('top-level-attribute-syntax', syntax.productHandle, syntax, this.topLevelSyntaxesByProduct);
      this.append(this.topLevelSyntaxesByAttribute, syntax.attribute.productHandle, syntax);
    }
    for (const classification of this.compilation.attributeClassification.classifications) {
      this.register('attribute-classification', classification.productHandle, classification, this.classificationsByProduct);
      this.append(this.classificationsBySyntax, classification.syntaxProductHandle, classification);
    }
    for (const site of this.compilation.valueSites.sites) {
      this.register('primary-value-site', site.productHandle, site, this.primaryValueSitesByProduct);
      if (site.attribute?.productHandle != null) this.primaryAttributeValueSiteCount++;
      const classificationHandle = site.classification?.productHandle ?? null;
      if (classificationHandle != null) {
        this.append(this.primaryValueSitesByClassification, classificationHandle, site);
      }
    }
    for (const parse of this.compilation.valueSites.parses) {
      this.registerProduct('primary-expression-parse', parse.productHandle);
      if (this.primaryValueSitesByProduct.get(parse.site.productHandle)?.attribute?.productHandle != null) {
        this.primaryAttributeExpressionParseCount++;
      }
      this.append(this.primaryExpressionParsesBySite, parse.site.productHandle, parse);
    }
    for (const syntax of this.compilation.bindingCommandLowering.attributeSyntaxes) {
      this.register('secondary-attribute-syntax', syntax.productHandle, syntax, this.secondarySyntaxesByProduct);
    }
    for (const site of this.compilation.bindingCommandLowering.valueSites) {
      this.register('secondary-value-site', site.productHandle, site, this.secondaryValueSitesByProduct);
      const syntaxHandle = site.syntax?.productHandle ?? null;
      if (syntaxHandle != null) this.append(this.secondaryValueSitesBySyntax, syntaxHandle, site);
    }
    for (const parse of this.compilation.bindingCommandLowering.expressionParses) {
      this.registerProduct('secondary-expression-parse', parse.productHandle);
      this.append(this.secondaryExpressionParsesBySite, parse.site.productHandle, parse);
    }
    for (const input of this.compilation.bindingCommandLowering.buildInputs) {
      this.register('binding-command-build-input', input.productHandle, input, this.buildInputsByProduct);
      if (input.syntaxProductHandle != null) this.append(this.buildInputsBySyntax, input.syntaxProductHandle, input);
    }
    for (const lowering of this.compilation.bindingCommandLowering.lowerings) {
      this.register('binding-command-lowering', lowering.productHandle, lowering, this.loweringsByProduct);
      this.append(this.loweringsByInput, lowering.inputProductHandle, lowering);
    }
    for (const segment of this.compilation.bindingCommandLowering.multiBindingSegments) {
      this.register('multi-binding-segment', segment.productHandle, segment, this.segmentsByProduct);
    }
    for (const lowering of this.compilation.bindingCommandLowering.multiBindingLowerings) {
      this.register('multi-binding-lowering', lowering.productHandle, lowering, this.multiBindingLoweringsByProduct);
      this.append(this.multiBindingLoweringsBySite, lowering.site.productHandle, lowering);
    }
    for (const instruction of this.compilation.bindingCommandLowering.instructions) {
      this.register('binding-command-instruction', instruction.productHandle, instruction, this.instructionsByProduct);
    }
  }

  private validateGraphReferences(): void {
    for (const syntax of this.topLevelSyntaxesByProduct.values()) {
      this.validateSyntaxAttribute(syntax, 'top-level-syntax/attribute');
    }
    for (const syntax of this.secondarySyntaxesByProduct.values()) {
      this.validateSyntaxAttribute(syntax, 'secondary-syntax/attribute');
    }
    for (const classification of this.classificationsByProduct.values()) {
      const syntax = this.topLevelSyntaxesByProduct.get(classification.syntaxProductHandle) ?? null;
      if (syntax == null) {
        this.missing('classification/top-level-syntax', classification.productHandle, classification.syntaxProductHandle);
        continue;
      }
      const owner = this.ownerForSyntax(syntax);
      if (owner == null || classification.ownerNode.productHandle !== owner.element.productHandle) {
        this.crossReference(
          'classification/owner',
          'Attribute classification does not retain the element that owns its top-level syntax.',
          [classification.productHandle, syntax.productHandle],
        );
      }
    }
    for (const site of this.primaryValueSitesByProduct.values()) {
      this.validateValueSite(site, true);
    }
    for (const parses of this.primaryExpressionParsesBySite.values()) {
      for (const parse of parses) this.validateExpressionParse(parse, this.primaryValueSitesByProduct, 'primary-parse/site');
    }
    for (const site of this.secondaryValueSitesByProduct.values()) {
      this.validateValueSite(site, false);
    }
    for (const parses of this.secondaryExpressionParsesBySite.values()) {
      for (const parse of parses) this.validateExpressionParse(parse, this.secondaryValueSitesByProduct, 'secondary-parse/site');
    }
    for (const input of this.buildInputsByProduct.values()) {
      const syntax = input.syntaxProductHandle == null ? null : this.syntax(input.syntaxProductHandle);
      if (syntax == null) {
        this.missing('build-input/syntax', input.productHandle, input.syntaxProductHandle);
        continue;
      }
      const attribute = this.attributeForSyntax(syntax);
      const owner = this.ownerForSyntax(syntax);
      if (
        attribute == null
        || owner == null
        || input.attribute.productHandle !== attribute.productHandle
        || input.node.productHandle !== owner.element.productHandle
      ) {
        this.crossReference(
          'build-input/attribute-owner',
          'Binding-command build input does not retain the attribute and element selected by its syntax.',
          [input.productHandle, syntax.productHandle],
        );
      }
    }
    for (const lowering of this.loweringsByProduct.values()) {
      if (!this.buildInputsByProduct.has(lowering.inputProductHandle)) {
        this.missing('command-lowering/build-input', lowering.productHandle, lowering.inputProductHandle);
      }
    }
    for (const segment of this.segmentsByProduct.values()) {
      const site = this.primaryValueSitesByProduct.get(segment.site.productHandle) ?? null;
      const syntax = this.secondarySyntaxesByProduct.get(segment.syntaxProductHandle) ?? null;
      const attribute = segment.attribute.productHandle == null
        ? null
        : this.attributesByProduct.get(segment.attribute.productHandle) ?? null;
      if (site == null) this.missing('multi-binding-segment/site', segment.productHandle, segment.site.productHandle);
      if (syntax == null) this.missing('multi-binding-segment/syntax', segment.productHandle, segment.syntaxProductHandle);
      if (attribute == null) this.missing('multi-binding-segment/attribute', segment.productHandle, segment.attribute.productHandle);
      if (
        site != null
        && syntax != null
        && attribute != null
        && (
          site.siteKind !== TemplateValueSiteKind.MultiBindingValue
          || site.attribute?.productHandle !== attribute.productHandle
          || syntax.attribute.productHandle !== attribute.productHandle
          || segment.site.identityHandle !== site.identityHandle
        )
      ) {
        this.crossReference(
          'multi-binding-segment/origin',
          'Multi-binding segment does not retain one primary multi-binding site and authored attribute.',
          [segment.productHandle, site.productHandle, syntax.productHandle, attribute.productHandle],
        );
      }
    }
    for (const lowering of this.multiBindingLoweringsByProduct.values()) {
      const site = this.primaryValueSitesByProduct.get(lowering.site.productHandle) ?? null;
      if (site == null) {
        this.missing('multi-binding-lowering/site', lowering.productHandle, lowering.site.productHandle);
      } else if (
        site.siteKind !== TemplateValueSiteKind.MultiBindingValue
        || lowering.site.identityHandle !== site.identityHandle
      ) {
        this.crossReference(
          'multi-binding-lowering/site',
          'Multi-binding lowering does not retain its primary multi-binding value site.',
          [lowering.productHandle, site.productHandle],
        );
      }
      lowering.segmentProductHandles.forEach((handle, ordinal) => {
        const segment = this.segmentsByProduct.get(handle) ?? null;
        if (segment == null) {
          this.missing('multi-binding-lowering/segment', lowering.productHandle, handle);
        } else {
          if (segment.site.productHandle !== lowering.site.productHandle) {
            this.crossReference(
              'multi-binding-lowering/segment-site',
              'Ordered multi-binding segment belongs to a different primary value site.',
              [lowering.productHandle, segment.productHandle],
            );
          }
          if (segment.segmentIndex !== ordinal) {
            this.mismatch(
              TemplateCompilerNormalizedSiteMismatchKind.MultiBindingSegmentOrderMismatch,
              'multi-binding-lowering/segment-order',
              `Multi-binding segment ${segment.segmentIndex} occupies aggregate ordinal ${ordinal}.`,
              [lowering.productHandle, segment.productHandle],
            );
          }
        }
      });
    }
  }

  private buildAuthoredSite(attribute: HtmlAttribute): TemplateCompilerNormalizedSite | null {
    const owner = this.ownersByAttributeProduct.get(attribute.productHandle) ?? null;
    if (owner == null) {
      this.mismatch(
        TemplateCompilerNormalizedSiteMismatchKind.MissingAttributeOwner,
        'html-attribute/owner',
        `Authored attribute '${attribute.rawName}' has no exact element owner.`,
        [attribute.productHandle],
      );
    }
    const syntax = this.single(
      this.topLevelSyntaxesByAttribute.get(attribute.productHandle) ?? [],
      TemplateCompilerNormalizedSiteMismatchKind.TopLevelSyntaxCardinality,
      'html-attribute/top-level-syntax',
      `Authored attribute '${attribute.rawName}' must own exactly one top-level syntax.`,
      [attribute.productHandle],
    );
    const classification = syntax == null
      ? null
      : this.single(
          this.classificationsBySyntax.get(syntax.productHandle) ?? [],
          TemplateCompilerNormalizedSiteMismatchKind.ClassificationCardinality,
          'top-level-syntax/classification',
          `Top-level syntax '${syntax.rawName}' must own exactly one attribute classification.`,
          [syntax.productHandle],
        );
    if (owner == null || syntax == null || classification == null) return null;

    const primaryValueSite = this.optionalSingle(
      this.primaryValueSitesByClassification.get(classification.productHandle) ?? [],
      TemplateCompilerNormalizedSiteMismatchKind.PrimaryValueSiteCardinality,
      'classification/primary-value-site',
      'Attribute classification owns more than one primary value site.',
      [classification.productHandle],
    );
    const primaryExpressionParse = primaryValueSite == null
      ? null
      : this.expressionParseForSite(primaryValueSite, this.primaryExpressionParsesBySite, 'primary-value-site/expression-parse');

    const command = classification.bindingCommand == null
      ? null
      : this.buildCommandSite(syntax, classification, primaryValueSite);
    const multiBinding = primaryValueSite?.siteKind === TemplateValueSiteKind.MultiBindingValue
      ? this.buildMultiBindingSite(primaryValueSite)
      : null;

    return new TemplateCompilerNormalizedSite(
      attribute.productHandle,
      owner,
      attribute,
      syntax,
      classification,
      primaryValueSite,
      primaryExpressionParse,
      command,
      multiBinding,
    );
  }

  private buildCommandSite(
    syntax: AttributeSyntax,
    classification: AttributeClassification,
    primaryValueSite: TemplateValueSite | null,
  ): TemplateCompilerNormalizedCommandSite | null {
    if (primaryValueSite?.siteKind !== TemplateValueSiteKind.BindingCommandValue) {
      this.mismatch(
        TemplateCompilerNormalizedSiteMismatchKind.PrimaryValueSiteCardinality,
        'command-classification/primary-value-site',
        'A binding-command classification must retain one primary binding-command value site.',
        [classification.productHandle],
      );
    }
    const buildInput = this.single(
      this.buildInputsBySyntax.get(syntax.productHandle) ?? [],
      TemplateCompilerNormalizedSiteMismatchKind.CommandGraphCardinality,
      'top-level-command/build-input',
      'Top-level binding-command syntax must own exactly one build input.',
      [syntax.productHandle],
    );
    const lowering = buildInput == null
      ? null
      : this.single(
          this.loweringsByInput.get(buildInput.productHandle) ?? [],
          TemplateCompilerNormalizedSiteMismatchKind.CommandGraphCardinality,
          'top-level-command/lowering',
          'Top-level binding-command build input must own exactly one lowering.',
          [buildInput.productHandle],
        );
    if (buildInput == null || lowering == null) return null;

    const secondaryValueSites = this.secondaryValueSitesBySyntax.get(syntax.productHandle) ?? [];
    const secondaryExpressionParses = secondaryValueSites.flatMap((site) => {
      const parse = this.expressionParseForSite(site, this.secondaryExpressionParsesBySite, 'command-secondary-site/expression-parse');
      return parse == null ? [] : [parse];
    });
    const instructions = this.resolveInstructions(
      lowering.instructionProductHandles,
      'top-level-command/instructions',
      lowering.productHandle,
    );
    this.spentBuildInputs.add(buildInput.productHandle);
    this.spentLowerings.add(lowering.productHandle);
    for (const site of secondaryValueSites) this.spentSecondaryValueSites.add(site.productHandle);
    for (const parse of secondaryExpressionParses) this.spentSecondaryExpressionParses.add(parse.productHandle);
    for (const instruction of instructions) this.spentInstructions.add(instruction.productHandle);
    return new TemplateCompilerNormalizedCommandSite(
      buildInput,
      lowering,
      secondaryValueSites,
      secondaryExpressionParses,
      instructions,
    );
  }

  private buildMultiBindingSite(
    primaryValueSite: TemplateValueSite,
  ): TemplateCompilerNormalizedMultiBindingSite | null {
    const lowering = this.single(
      this.multiBindingLoweringsBySite.get(primaryValueSite.productHandle) ?? [],
      TemplateCompilerNormalizedSiteMismatchKind.MultiBindingGraphCardinality,
      'multi-binding-site/lowering',
      'Primary multi-binding value site must own exactly one aggregate lowering.',
      [primaryValueSite.productHandle],
    );
    if (lowering == null) return null;

    const segments: MultiBindingSegment[] = [];
    const secondarySyntaxes: AttributeSyntax[] = [];
    const buildInputs: BindingCommandBuildInput[] = [];
    const commandLowerings: BindingCommandLowering[] = [];
    const secondaryValueSites: TemplateValueSite[] = [];
    const secondaryExpressionParses: TemplateExpressionParse[] = [];
    const aggregateInstructionHandles = new Set(lowering.instructionProductHandles);

    for (const segmentHandle of lowering.segmentProductHandles) {
      const segment = this.segmentsByProduct.get(segmentHandle) ?? null;
      if (segment == null) continue;
      segments.push(segment);
      this.spentSegments.add(segment.productHandle);
      const syntax = this.secondarySyntaxesByProduct.get(segment.syntaxProductHandle) ?? null;
      if (syntax == null) continue;
      secondarySyntaxes.push(syntax);
      this.spentSecondarySyntaxes.add(syntax.productHandle);

      const segmentBuildInputs = this.buildInputsBySyntax.get(syntax.productHandle) ?? [];
      if (segmentBuildInputs.length > 1) {
        this.mismatch(
          TemplateCompilerNormalizedSiteMismatchKind.CommandGraphCardinality,
          'multi-binding-segment/build-input',
          'One multi-binding segment owns more than one command build input.',
          [segment.productHandle, ...segmentBuildInputs.map((input) => input.productHandle)],
        );
      }
      for (const input of segmentBuildInputs) {
        buildInputs.push(input);
        this.spentBuildInputs.add(input.productHandle);
        const segmentLowerings = this.loweringsByInput.get(input.productHandle) ?? [];
        if (segmentLowerings.length !== 1) {
          this.mismatch(
            TemplateCompilerNormalizedSiteMismatchKind.CommandGraphCardinality,
            'multi-binding-build-input/lowering',
            'A multi-binding command build input must own exactly one lowering.',
            [input.productHandle, ...segmentLowerings.map((candidate) => candidate.productHandle)],
          );
        }
        for (const commandLowering of segmentLowerings) {
          commandLowerings.push(commandLowering);
          this.spentLowerings.add(commandLowering.productHandle);
          if (commandLowering.instructionProductHandles.some((handle) => !aggregateInstructionHandles.has(handle))) {
            this.crossReference(
              'multi-binding-command-lowering/aggregate-instructions',
              'Segment command lowering produced an instruction absent from its aggregate multi-binding lowering.',
              [lowering.productHandle, commandLowering.productHandle],
            );
          }
        }
      }

      const segmentValueSites = this.secondaryValueSitesBySyntax.get(syntax.productHandle) ?? [];
      secondaryValueSites.push(...segmentValueSites);
      for (const site of segmentValueSites) {
        this.spentSecondaryValueSites.add(site.productHandle);
        const parse = this.expressionParseForSite(site, this.secondaryExpressionParsesBySite, 'multi-binding-secondary-site/expression-parse');
        if (parse != null) {
          secondaryExpressionParses.push(parse);
          this.spentSecondaryExpressionParses.add(parse.productHandle);
        }
      }
    }

    const instructions = this.resolveInstructions(
      lowering.instructionProductHandles,
      'multi-binding/instructions',
      lowering.productHandle,
    );
    this.spentMultiBindingLowerings.add(lowering.productHandle);
    for (const instruction of instructions) this.spentInstructions.add(instruction.productHandle);
    return new TemplateCompilerNormalizedMultiBindingSite(
      lowering,
      segments,
      secondarySyntaxes,
      buildInputs,
      commandLowerings,
      secondaryValueSites,
      secondaryExpressionParses,
      instructions,
    );
  }

  private validateValueSite(site: TemplateValueSite, primary: boolean): void {
    if (site.attribute?.productHandle == null) {
      if (primary && site.siteKind === TemplateValueSiteKind.TextInterpolation) return;
      this.crossReference(
        `${primary ? 'primary' : 'secondary'}-value-site/attribute`,
        'Attribute-site graph contains a value site without an authored attribute.',
        [site.productHandle],
      );
      return;
    }
    const attribute = this.attributesByProduct.get(site.attribute.productHandle) ?? null;
    const syntax = site.syntax == null ? null : this.syntax(site.syntax.productHandle);
    const classification = site.classification == null
      ? null
      : this.classificationsByProduct.get(site.classification.productHandle) ?? null;
    const owner = syntax == null ? null : this.ownerForSyntax(syntax);
    if (attribute == null) this.missing('value-site/attribute', site.productHandle, site.attribute.productHandle);
    if (syntax == null) this.missing('value-site/syntax', site.productHandle, site.syntax?.productHandle ?? null);
    if (classification == null) this.missing('value-site/classification', site.productHandle, site.classification?.productHandle ?? null);
    if (
      attribute != null
      && syntax != null
      && classification != null
      && owner != null
      && (
        syntax.attribute.productHandle !== attribute.productHandle
        || classification.syntaxProductHandle !== (primary ? syntax.productHandle : classification.syntaxProductHandle)
        || site.classification !== classification
        || site.node.productHandle !== owner.element.productHandle
      )
    ) {
      this.crossReference(
        `${primary ? 'primary' : 'secondary'}-value-site/origin`,
        'Value site does not retain one authored attribute, classification, syntax, and owner.',
        [site.productHandle, attribute.productHandle, syntax.productHandle, classification.productHandle],
      );
    }
    if (!primary && classification != null && site.syntax != null) {
      const topSyntax = this.topLevelSyntaxesByProduct.get(classification.syntaxProductHandle) ?? null;
      if (topSyntax?.attribute.productHandle !== site.attribute.productHandle) {
        this.crossReference(
          'secondary-value-site/top-level-classification',
          'Secondary value site classification belongs to a different authored attribute bundle.',
          [site.productHandle, classification.productHandle],
        );
      }
    }
  }

  private validateExpressionParse(
    parse: TemplateExpressionParse,
    sitesByProduct: ReadonlyMap<ProductHandle, TemplateValueSite>,
    relation: string,
  ): void {
    const site = sitesByProduct.get(parse.site.productHandle) ?? null;
    if (site == null) {
      this.missing(relation, parse.productHandle, parse.site.productHandle);
      return;
    }
    if (
      parse.site.identityHandle !== site.identityHandle
      || parse.site.siteKind !== site.siteKind
      || parse.site.entryFamily !== site.entryFamily
    ) {
      this.crossReference(
        relation,
        'Expression parse reference does not retain the exact value-site identity and parser family.',
        [parse.productHandle, site.productHandle],
      );
    }
  }

  private expressionParseForSite(
    site: TemplateValueSite,
    parsesBySite: ReadonlyMap<ProductHandle, TemplateExpressionParse[]>,
    relation: string,
  ): TemplateExpressionParse | null {
    const parses = parsesBySite.get(site.productHandle) ?? [];
    const expected = site.entryFamily == null ? 0 : 1;
    if (parses.length !== expected) {
      this.mismatch(
        TemplateCompilerNormalizedSiteMismatchKind.ExpressionParseCardinality,
        relation,
        `Value site expects ${expected} expression parse product but owns ${parses.length}.`,
        [site.productHandle, ...parses.map((parse) => parse.productHandle)],
      );
    }
    return parses.length === 1 ? parses[0]! : null;
  }

  private validateSyntaxAttribute(syntax: AttributeSyntax, relation: string): void {
    const attribute = this.attributeForSyntax(syntax);
    if (attribute == null) {
      this.missing(relation, syntax.productHandle, syntax.attribute.productHandle);
      return;
    }
    if (
      syntax.attribute.rawName !== attribute.rawName
      || syntax.attribute.addressHandle !== attribute.sourceAddressHandle
    ) {
      this.crossReference(
        relation,
        'Attribute syntax reference does not retain the exact authored attribute name and address.',
        [syntax.productHandle, attribute.productHandle],
      );
    }
  }

  private validateUnownedProducts(): void {
    this.unowned(this.secondarySyntaxesByProduct, this.spentSecondarySyntaxes, 'secondary-attribute-syntax');
    this.unowned(this.buildInputsByProduct, this.spentBuildInputs, 'binding-command-build-input');
    this.unowned(this.loweringsByProduct, this.spentLowerings, 'binding-command-lowering');
    this.unowned(this.segmentsByProduct, this.spentSegments, 'multi-binding-segment');
    this.unowned(this.multiBindingLoweringsByProduct, this.spentMultiBindingLowerings, 'multi-binding-lowering');
    this.unowned(this.secondaryValueSitesByProduct, this.spentSecondaryValueSites, 'secondary-value-site');
    for (const parses of this.secondaryExpressionParsesBySite.values()) {
      for (const parse of parses) {
        if (!this.spentSecondaryExpressionParses.has(parse.productHandle)) {
          this.mismatch(
            TemplateCompilerNormalizedSiteMismatchKind.UnownedProduct,
            'normalized-site/secondary-expression-parse',
            'Secondary expression parse is not reachable from an authored attribute bundle.',
            [parse.productHandle],
          );
        }
      }
    }
    this.unowned(this.instructionsByProduct, this.spentInstructions, 'binding-command-instruction');
  }

  private unowned<T>(
    products: ReadonlyMap<ProductHandle, T>,
    spent: ReadonlySet<ProductHandle>,
    kind: string,
  ): void {
    for (const handle of products.keys()) {
      if (!spent.has(handle)) {
        this.mismatch(
          TemplateCompilerNormalizedSiteMismatchKind.UnownedProduct,
          `normalized-site/${kind}`,
          `${kind} is not reachable from an authored attribute bundle.`,
          [handle],
        );
      }
    }
  }

  private resolveInstructions(
    handles: readonly ProductHandle[],
    relation: string,
    ownerHandle: ProductHandle,
  ): readonly TemplateInstruction[] {
    const instructions: TemplateInstruction[] = [];
    const occupied = new Set<ProductHandle>();
    for (const handle of handles) {
      const instruction = this.instructionsByProduct.get(handle) ?? null;
      if (instruction == null) {
        this.missing(relation, ownerHandle, handle);
      } else if (occupied.has(handle)) {
        this.crossReference(
          relation,
          'Instruction producer repeats one instruction product handle.',
          [ownerHandle, handle],
        );
      } else {
        occupied.add(handle);
        instructions.push(instruction);
      }
    }
    return instructions;
  }

  private syntax(productHandle: ProductHandle): AttributeSyntax | null {
    return this.topLevelSyntaxesByProduct.get(productHandle)
      ?? this.secondarySyntaxesByProduct.get(productHandle)
      ?? null;
  }

  private attributeForSyntax(syntax: AttributeSyntax): HtmlAttribute | null {
    return syntax.attribute.productHandle == null
      ? null
      : this.attributesByProduct.get(syntax.attribute.productHandle) ?? null;
  }

  private ownerForSyntax(syntax: AttributeSyntax): HtmlElementAttributeOwner | null {
    return syntax.attribute.productHandle == null
      ? null
      : this.ownersByAttributeProduct.get(syntax.attribute.productHandle) ?? null;
  }

  private register<T>(
    kind: string,
    productHandle: ProductHandle,
    product: T,
    index: Map<ProductHandle, T>,
  ): void {
    this.registerProduct(kind, productHandle);
    if (!index.has(productHandle)) index.set(productHandle, product);
  }

  private registerProduct(kind: string, productHandle: ProductHandle): void {
    const previousKind = this.productKinds.get(productHandle) ?? null;
    if (previousKind != null) {
      this.mismatch(
        TemplateCompilerNormalizedSiteMismatchKind.DuplicateProduct,
        'normalized-site/product-handle',
        `Product handle is shared by ${previousKind} and ${kind}.`,
        [productHandle],
      );
    } else {
      this.productKinds.set(productHandle, kind);
    }
  }

  private append<T>(map: Map<ProductHandle, T[]>, key: ProductHandle | null, value: T): void {
    if (key == null) return;
    const values = map.get(key);
    if (values == null) map.set(key, [value]);
    else values.push(value);
  }

  private single<T>(
    values: readonly T[],
    mismatchKind: TemplateCompilerNormalizedSiteMismatchKind,
    relation: string,
    summary: string,
    handles: readonly ProductHandle[],
  ): T | null {
    if (values.length === 1) return values[0]!;
    this.mismatch(mismatchKind, relation, summary, handles);
    return null;
  }

  private optionalSingle<T>(
    values: readonly T[],
    mismatchKind: TemplateCompilerNormalizedSiteMismatchKind,
    relation: string,
    summary: string,
    handles: readonly ProductHandle[],
  ): T | null {
    if (values.length <= 1) return values[0] ?? null;
    this.mismatch(mismatchKind, relation, summary, handles);
    return null;
  }

  private missing(
    relation: string,
    ownerHandle: ProductHandle,
    missingHandle: ProductHandle | null,
  ): void {
    this.mismatch(
      TemplateCompilerNormalizedSiteMismatchKind.MissingReferencedProduct,
      relation,
      'Normalized compiler graph references a product absent from this compilation emission.',
      missingHandle == null ? [ownerHandle] : [ownerHandle, missingHandle],
    );
  }

  private crossReference(
    relation: string,
    summary: string,
    productHandles: readonly ProductHandle[],
  ): void {
    this.mismatch(
      TemplateCompilerNormalizedSiteMismatchKind.CrossReferenceMismatch,
      relation,
      summary,
      productHandles,
    );
  }

  private mismatch(
    mismatchKind: TemplateCompilerNormalizedSiteMismatchKind,
    relation: string,
    summary: string,
    productHandles: readonly ProductHandle[],
  ): void {
    this.mismatches.push(new TemplateCompilerNormalizedSiteMismatch(
      mismatchKind,
      relation,
      summary,
      productHandles,
    ));
  }
}
