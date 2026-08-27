import type { ProductHandle } from '../kernel/handles.js';
import type {
  AttributeClassification,
  AttributeSyntax,
} from './attribute-syntax.js';
import {
  BindingCommandBuildInputKind,
  type BindingCommandBuildInput,
  type BindingCommandLowering,
  type MultiBindingLowering,
  type MultiBindingSegment,
} from './binding-command-execution.js';
import {
  HtmlElement,
  type HtmlAttribute,
  type HtmlIrNode,
  HtmlText,
  htmlElementAttributeOwnersByAttributeProduct,
  type HtmlElementAttributeOwner,
} from './html-ir.js';
import type { TemplateInstruction } from './instruction-ir.js';
import type { TemplateResourceCompilationEmission } from './template-compilation-project-pass.js';
import {
  TemplateCompilerNormalizedInstructionGraphValidator,
} from './template-compiler-normalized-instruction-graph.js';
import {
  TemplateCompilerNormalizedMultiBindingGraphValidator,
} from './template-compiler-normalized-multi-binding-graph.js';
import {
  TemplateCompilerNormalizedCommandSite,
  TemplateCompilerNormalizedCompilationBasis,
  TemplateCompilerNormalizedMultiBindingSite,
  TemplateCompilerNormalizedOutcomeInventory,
  TemplateCompilerNormalizedOwnershipRelation,
  TemplateCompilerNormalizedSite,
  TemplateCompilerNormalizedSiteCardinality,
  TemplateCompilerNormalizedSiteIndex,
  TemplateCompilerNormalizedSiteIndexResult,
  TemplateCompilerNormalizedSiteMismatch,
  TemplateCompilerNormalizedSiteMismatchKind,
  TemplateCompilerNormalizedSiteOutcomeRoute,
  TemplateCompilerNormalizedTextSite,
} from './template-compiler-normalized-site-model.js';
import {
  TemplateCompilerNormalizedOwnershipBuilder,
} from './template-compiler-normalized-ownership.js';
import {
  sameNormalizedAttributeReference,
  sameNormalizedBindingCommandReference,
  sameNormalizedNodeReference,
  sameNormalizedValueSiteReference,
} from './template-compiler-normalized-reference.js';
import {
  TemplateValueSiteKind,
  type TemplateExpressionParse,
  type TemplateValueSite,
} from './value-site.js';

export function validateTemplateCompilerNormalizedSiteGraph(
  compilation: TemplateResourceCompilationEmission,
): TemplateCompilerNormalizedSiteIndexResult {
  return new TemplateCompilerNormalizedSiteGraphValidator(compilation).validate();
}

class TemplateCompilerNormalizedSiteGraphValidator {
  private readonly mismatches: TemplateCompilerNormalizedSiteMismatch[] = [];
  private readonly ownership: TemplateCompilerNormalizedOwnershipBuilder;
  private readonly instructionGraph: TemplateCompilerNormalizedInstructionGraphValidator;
  private readonly multiBindingGraph: TemplateCompilerNormalizedMultiBindingGraphValidator;
  private readonly productKinds = new Map<ProductHandle, string>();

  private readonly nodesByProduct = new Map<ProductHandle, HtmlIrNode>();
  private readonly elementsByProduct = new Map<ProductHandle, HtmlElement>();
  private readonly textsByProduct = new Map<ProductHandle, HtmlText>();
  private readonly attributesByProduct = new Map<ProductHandle, HtmlAttribute>();
  private readonly ownersByAttributeProduct: ReadonlyMap<ProductHandle, HtmlElementAttributeOwner>;
  private readonly topLevelSyntaxesByProduct = new Map<ProductHandle, AttributeSyntax>();
  private readonly topLevelSyntaxesByAttribute = new Map<ProductHandle, AttributeSyntax[]>();
  private readonly classificationsByProduct = new Map<ProductHandle, AttributeClassification>();
  private readonly classificationsBySyntax = new Map<ProductHandle, AttributeClassification[]>();
  private readonly primaryValueSitesByProduct = new Map<ProductHandle, TemplateValueSite>();
  private readonly primaryValueSitesByClassification = new Map<ProductHandle, TemplateValueSite[]>();
  private readonly primaryTextValueSitesByNode = new Map<ProductHandle, TemplateValueSite[]>();
  private readonly primaryExpressionParsesByProduct = new Map<ProductHandle, TemplateExpressionParse>();
  private readonly primaryExpressionParsesBySite = new Map<ProductHandle, TemplateExpressionParse[]>();
  private readonly secondarySyntaxesByProduct = new Map<ProductHandle, AttributeSyntax>();
  private readonly secondaryValueSitesByProduct = new Map<ProductHandle, TemplateValueSite>();
  private readonly secondaryValueSitesBySyntax = new Map<ProductHandle, TemplateValueSite[]>();
  private readonly secondaryExpressionParsesByProduct = new Map<ProductHandle, TemplateExpressionParse>();
  private readonly secondaryExpressionParsesBySite = new Map<ProductHandle, TemplateExpressionParse[]>();
  private readonly buildInputsByProduct = new Map<ProductHandle, BindingCommandBuildInput>();
  private readonly buildInputsBySyntax = new Map<ProductHandle, BindingCommandBuildInput[]>();
  private readonly loweringsByProduct = new Map<ProductHandle, BindingCommandLowering>();
  private readonly loweringsByInput = new Map<ProductHandle, BindingCommandLowering[]>();
  private readonly segmentsByProduct = new Map<ProductHandle, MultiBindingSegment>();
  private readonly multiBindingLoweringsByProduct = new Map<ProductHandle, MultiBindingLowering>();
  private readonly multiBindingLoweringsBySite = new Map<ProductHandle, MultiBindingLowering[]>();
  private readonly normalizedInstructionsByProduct = new Map<ProductHandle, TemplateInstruction>();
  private readonly createdInstructionsByProduct = new Map<ProductHandle, TemplateInstruction>();

  constructor(private readonly compilation: TemplateResourceCompilationEmission) {
    this.ownersByAttributeProduct = htmlElementAttributeOwnersByAttributeProduct(
      compilation.html.nodes,
      compilation.html.attributes,
    );
    this.ownership = new TemplateCompilerNormalizedOwnershipBuilder(
      (kind, relation, summary, handles) => this.mismatch(kind, relation, summary, handles),
    );
    this.instructionGraph = new TemplateCompilerNormalizedInstructionGraphValidator({
      compilation,
      ownership: this.ownership,
      normalizedInstructionsByProduct: this.normalizedInstructionsByProduct,
      createdInstructionsByProduct: this.createdInstructionsByProduct,
      primaryExpressionParsesByProduct: this.primaryExpressionParsesByProduct,
      secondaryExpressionParsesByProduct: this.secondaryExpressionParsesByProduct,
      topLevelSyntaxesByProduct: this.topLevelSyntaxesByProduct,
      ownerForSyntax: (syntax) => this.ownerForSyntax(syntax),
      mismatch: (kind, relation, summary, handles) => this.mismatch(kind, relation, summary, handles),
      missing: (relation, ownerHandle, missingHandle) => this.missing(relation, ownerHandle, missingHandle),
      crossReference: (relation, summary, handles) => this.crossReference(relation, summary, handles),
      validateUniqueHandles: (handles, relation, ownerHandle) =>
        this.validateUniqueHandles(handles, relation, ownerHandle),
    });
    this.multiBindingGraph = new TemplateCompilerNormalizedMultiBindingGraphValidator({
      ownership: this.ownership,
      instructionGraph: this.instructionGraph,
      primaryValueSitesByProduct: this.primaryValueSitesByProduct,
      attributesByProduct: this.attributesByProduct,
      secondarySyntaxesByProduct: this.secondarySyntaxesByProduct,
      secondaryValueSitesBySyntax: this.secondaryValueSitesBySyntax,
      secondaryExpressionParsesBySite: this.secondaryExpressionParsesBySite,
      buildInputsBySyntax: this.buildInputsBySyntax,
      loweringsByInput: this.loweringsByInput,
      segmentsByProduct: this.segmentsByProduct,
      normalizedInstructionsByProduct: this.normalizedInstructionsByProduct,
      mismatch: (kind, relation, summary, handles) => this.mismatch(kind, relation, summary, handles),
      missing: (relation, ownerHandle, missingHandle) => this.missing(relation, ownerHandle, missingHandle),
      crossReference: (relation, summary, handles) => this.crossReference(relation, summary, handles),
      validateUniqueHandles: (handles, relation, ownerHandle) =>
        this.validateUniqueHandles(handles, relation, ownerHandle),
    });
  }

  validate(): TemplateCompilerNormalizedSiteIndexResult {
    this.validateFamilyAuthority();
    this.indexGraph();
    this.validateGraphReferences();

    const attributeSites: TemplateCompilerNormalizedSite[] = [];
    for (const attribute of this.compilation.html.attributes) {
      const site = this.buildAttributeSite(attribute);
      if (site != null) attributeSites.push(site);
    }
    const textSites = this.buildTextSites();
    this.validateUnownedNormalizedProducts();
    const downstream = this.instructionGraph.buildDownstreamInstructionInventory(attributeSites, textSites);

    if (this.mismatches.length > 0) {
      return new TemplateCompilerNormalizedSiteIndexResult(null, this.mismatches);
    }
    const ledger = this.ownership.finish();
    return new TemplateCompilerNormalizedSiteIndexResult(new TemplateCompilerNormalizedSiteIndex(
      new TemplateCompilerNormalizedCompilationBasis(this.compilation),
      attributeSites,
      textSites,
      [...this.elementsByProduct.values()],
      [...this.textsByProduct.values()],
      ledger,
      new TemplateCompilerNormalizedOutcomeInventory(
        this.compilation.compiledTemplate.issues,
        this.compilation.compiledTemplate.openSeams,
      ),
      downstream,
      new TemplateCompilerNormalizedSiteCardinality(
        this.elementsByProduct.size,
        this.textsByProduct.size,
        this.compilation.html.attributes.length,
        attributeSites.length,
        textSites.length,
        this.compilation.attributeSyntax.syntaxes.length,
        this.compilation.attributeClassification.classifications.length,
        this.compilation.valueSites.sites.length,
        this.compilation.valueSites.parses.length,
        this.compilation.bindingCommandLowering.buildInputs.length,
        this.compilation.bindingCommandLowering.lowerings.length,
        this.compilation.bindingCommandLowering.attributeSyntaxes.length,
        this.compilation.bindingCommandLowering.multiBindingSegments.length,
        this.compilation.bindingCommandLowering.multiBindingLowerings.length,
        this.compilation.bindingCommandLowering.valueSites.length,
        this.compilation.bindingCommandLowering.expressionParses.length,
        this.compilation.bindingCommandLowering.instructions.length,
        this.compilation.compiledTemplate.createdInstructions.length,
        ledger.ownership.length,
        ledger.containment.length,
      ),
    ), []);
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
    this.registerProduct('html-document', this.compilation.html.document.productHandle);
    for (const node of this.compilation.html.nodes) {
      this.register('html-node', node.productHandle, node, this.nodesByProduct);
      if (node instanceof HtmlElement) this.elementsByProduct.set(node.productHandle, node);
      if (node instanceof HtmlText) this.textsByProduct.set(node.productHandle, node);
    }
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
      if (site.siteKind === TemplateValueSiteKind.TextInterpolation) {
        this.append(this.primaryTextValueSitesByNode, site.node.productHandle, site);
      } else if (site.classification?.productHandle != null) {
        this.append(this.primaryValueSitesByClassification, site.classification.productHandle, site);
      }
    }
    for (const parse of this.compilation.valueSites.parses) {
      this.register('primary-expression-parse', parse.productHandle, parse, this.primaryExpressionParsesByProduct);
      this.append(this.primaryExpressionParsesBySite, parse.site.productHandle, parse);
    }
    for (const syntax of this.compilation.bindingCommandLowering.attributeSyntaxes) {
      this.register('secondary-attribute-syntax', syntax.productHandle, syntax, this.secondarySyntaxesByProduct);
    }
    for (const site of this.compilation.bindingCommandLowering.valueSites) {
      this.register('secondary-value-site', site.productHandle, site, this.secondaryValueSitesByProduct);
      this.append(this.secondaryValueSitesBySyntax, site.syntax?.productHandle ?? null, site);
    }
    for (const parse of this.compilation.bindingCommandLowering.expressionParses) {
      this.register('secondary-expression-parse', parse.productHandle, parse, this.secondaryExpressionParsesByProduct);
      this.append(this.secondaryExpressionParsesBySite, parse.site.productHandle, parse);
    }
    for (const input of this.compilation.bindingCommandLowering.buildInputs) {
      this.register('binding-command-build-input', input.productHandle, input, this.buildInputsByProduct);
      this.append(this.buildInputsBySyntax, input.syntaxProductHandle, input);
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
      this.register('normalized-instruction', instruction.productHandle, instruction, this.normalizedInstructionsByProduct);
    }
    for (const instruction of this.compilation.compiledTemplate.createdInstructions) {
      this.register('compiled-created-instruction', instruction.productHandle, instruction, this.createdInstructionsByProduct);
    }
  }

  private validateGraphReferences(): void {
    for (const attribute of this.attributesByProduct.values()) {
      if (!this.ownersByAttributeProduct.has(attribute.productHandle)) {
        this.mismatch(
          TemplateCompilerNormalizedSiteMismatchKind.MissingAttributeOwner,
          'html-attribute/owner',
          `Authored attribute '${attribute.rawName}' has no exact element owner.`,
          [attribute.productHandle],
        );
      }
    }
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
      if (owner == null || !sameNormalizedNodeReference(classification.ownerNode, owner.element)) {
        this.crossReference(
          'classification/owner',
          'Attribute classification does not retain the exact element that owns its top-level syntax.',
          [classification.productHandle, syntax.productHandle],
        );
      }
    }
    for (const site of this.primaryValueSitesByProduct.values()) this.validatePrimaryValueSite(site);
    for (const parse of this.primaryExpressionParsesByProduct.values()) {
      this.validateExpressionParse(parse, this.primaryValueSitesByProduct, 'primary-parse/site');
    }
    for (const site of this.secondaryValueSitesByProduct.values()) this.validateSecondaryValueSite(site);
    for (const parse of this.secondaryExpressionParsesByProduct.values()) {
      this.validateExpressionParse(parse, this.secondaryValueSitesByProduct, 'secondary-parse/site');
    }
    for (const input of this.buildInputsByProduct.values()) this.validateBuildInput(input);
    for (const lowering of this.loweringsByProduct.values()) {
      if (!this.buildInputsByProduct.has(lowering.inputProductHandle)) {
        this.missing('command-lowering/build-input', lowering.productHandle, lowering.inputProductHandle);
      }
      this.validateUniqueHandles(
        lowering.instructionProductHandles,
        'command-lowering/instruction-sequence',
        lowering.productHandle,
      );
    }
    for (const segment of this.segmentsByProduct.values()) this.multiBindingGraph.validateSegmentReferences(segment);
    for (const lowering of this.multiBindingLoweringsByProduct.values()) {
      this.multiBindingGraph.validateAggregateReferences(lowering);
    }
  }

  private buildAttributeSite(attribute: HtmlAttribute): TemplateCompilerNormalizedSite | null {
    const owner = this.ownersByAttributeProduct.get(attribute.productHandle) ?? null;
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
    this.ownership.claim(
      attribute.productHandle,
      syntax.productHandle,
      TemplateCompilerNormalizedOwnershipRelation.AttributeOwnsTopLevelSyntax,
    );
    this.ownership.claim(
      syntax.productHandle,
      classification.productHandle,
      TemplateCompilerNormalizedOwnershipRelation.SyntaxOwnsClassification,
    );

    const primaryValueSite = this.optionalSingle(
      this.primaryValueSitesByClassification.get(classification.productHandle) ?? [],
      TemplateCompilerNormalizedSiteMismatchKind.PrimaryValueSiteCardinality,
      'classification/primary-value-site',
      'Attribute classification owns more than one primary value site.',
      [classification.productHandle],
    );
    let primaryExpressionParse: TemplateExpressionParse | null = null;
    if (primaryValueSite != null) {
      this.ownership.claim(
        classification.productHandle,
        primaryValueSite.productHandle,
        TemplateCompilerNormalizedOwnershipRelation.ClassificationOwnsPrimaryValueSite,
      );
      primaryExpressionParse = this.expressionParseForSite(
        primaryValueSite,
        this.primaryExpressionParsesBySite,
        'primary-value-site/expression-parse',
      );
    }

    const command = classification.bindingCommand == null
      ? null
      : this.buildCommandSite(attribute, owner, syntax, classification, primaryValueSite);
    const multiBinding = primaryValueSite?.siteKind === TemplateValueSiteKind.MultiBindingValue
      ? this.buildMultiBindingSite(attribute, owner, syntax, classification, primaryValueSite)
      : null;
    const routeLowerings = [
      ...(command == null ? [] : [command.lowering]),
      ...(multiBinding?.commandLowerings ?? []),
    ];

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
      new TemplateCompilerNormalizedSiteOutcomeRoute(
        classification,
        routeLowerings,
        multiBinding?.lowering ?? null,
        this.compilation.attributeClassification,
        this.compilation.bindingCommandLowering,
        this.compilation.compiledTemplate,
      ),
    );
  }

  private buildTextSites(): readonly TemplateCompilerNormalizedTextSite[] {
    const result: TemplateCompilerNormalizedTextSite[] = [];
    for (const text of this.textsByProduct.values()) {
      const candidates = this.primaryTextValueSitesByNode.get(text.productHandle) ?? [];
      if (candidates.length === 0) continue;
      const site = this.single(
        candidates,
        TemplateCompilerNormalizedSiteMismatchKind.TextValueSiteCardinality,
        'html-text/value-site',
        'One authored text node owns more than one primary interpolation value site.',
        [text.productHandle],
      );
      if (site == null) continue;
      this.ownership.claim(
        text.productHandle,
        site.productHandle,
        TemplateCompilerNormalizedOwnershipRelation.TextOwnsPrimaryValueSite,
      );
      const parse = this.expressionParseForSite(
        site,
        this.primaryExpressionParsesBySite,
        'text-value-site/expression-parse',
      );
      if (parse != null) result.push(new TemplateCompilerNormalizedTextSite(text.productHandle, text, site, parse));
    }
    return result;
  }

  private buildCommandSite(
    attribute: HtmlAttribute,
    owner: HtmlElementAttributeOwner,
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
    this.ownership.claim(
      classification.productHandle,
      buildInput.productHandle,
      TemplateCompilerNormalizedOwnershipRelation.ClassificationOwnsCommandBuildInput,
    );
    this.ownership.claim(
      buildInput.productHandle,
      lowering.productHandle,
      TemplateCompilerNormalizedOwnershipRelation.BuildInputOwnsCommandLowering,
    );
    this.validateCommandReference(classification.bindingCommand, lowering, 'top-level-command/command');
    this.validateTopLevelBuildInput(buildInput, classification);

    const secondaryValueSites = this.secondaryValueSitesBySyntax.get(syntax.productHandle) ?? [];
    const secondaryExpressionParses: TemplateExpressionParse[] = [];
    for (const site of secondaryValueSites) {
      this.validateAttributeSiteOrigin(site, syntax, classification, attribute, owner, 'top-level-command/secondary-site');
      if (
        site.bindable !== classification.bindable
        || !sameNormalizedBindingCommandReference(site.bindingCommand, classification.bindingCommand)
      ) {
        this.crossReference(
          'top-level-command/secondary-site-selection',
          'Command secondary value site does not retain the classification-selected bindable and command.',
          [classification.productHandle, site.productHandle],
        );
      }
      this.ownership.claim(
        lowering.productHandle,
        site.productHandle,
        TemplateCompilerNormalizedOwnershipRelation.CommandLoweringOwnsSecondaryValueSite,
      );
      const parse = this.expressionParseForSite(
        site,
        this.secondaryExpressionParsesBySite,
        'top-level-command/secondary-parse',
      );
      if (parse != null) secondaryExpressionParses.push(parse);
    }
    const instructions = this.resolveInstructionSequence(
      lowering.instructionProductHandles,
      'top-level-command/instructions',
      lowering.productHandle,
    );
    for (const instruction of instructions) {
      this.ownership.claim(
        lowering.productHandle,
        instruction.productHandle,
        TemplateCompilerNormalizedOwnershipRelation.CommandLoweringOwnsInstruction,
      );
    }
    this.instructionGraph.validateOwnedInstructionGraph(
      lowering.productHandle,
      instructions,
      secondaryExpressionParses,
      attribute,
      owner.element,
    );
    return new TemplateCompilerNormalizedCommandSite(
      buildInput,
      lowering,
      secondaryValueSites,
      secondaryExpressionParses,
      instructions,
    );
  }

  private buildMultiBindingSite(
    attribute: HtmlAttribute,
    owner: HtmlElementAttributeOwner,
    topLevelSyntax: AttributeSyntax,
    classification: AttributeClassification,
    primaryValueSite: TemplateValueSite,
  ): TemplateCompilerNormalizedMultiBindingSite | null {
    const aggregate = this.single(
      this.multiBindingLoweringsBySite.get(primaryValueSite.productHandle) ?? [],
      TemplateCompilerNormalizedSiteMismatchKind.MultiBindingGraphCardinality,
      'multi-binding-site/lowering',
      'Primary multi-binding value site must own exactly one aggregate lowering.',
      [primaryValueSite.productHandle],
    );
    return aggregate == null
      ? null
      : this.multiBindingGraph.build(
          aggregate,
          attribute,
          owner,
          topLevelSyntax,
          classification,
          primaryValueSite,
        );
  }

  private validatePrimaryValueSite(site: TemplateValueSite): void {
    if (site.siteKind === TemplateValueSiteKind.TextInterpolation) {
      const text = site.node.productHandle == null ? null : this.textsByProduct.get(site.node.productHandle) ?? null;
      if (text == null) {
        this.missing('text-value-site/node', site.productHandle, site.node.productHandle);
        return;
      }
      if (
        site.attribute != null
        || site.syntax != null
        || site.classification != null
        || site.bindingCommand != null
        || site.bindable != null
        || site.entryFamily !== 'Interpolation'
        || !sameNormalizedNodeReference(site.node, text)
      ) {
        this.crossReference(
          'text-value-site/origin',
          'Text interpolation site does not retain the exact authored text identity/address/kind and null attribute lanes.',
          [site.productHandle, text.productHandle],
        );
      }
      return;
    }
    const classification = site.classification?.productHandle == null
      ? null
      : this.classificationsByProduct.get(site.classification.productHandle) ?? null;
    const syntax = classification == null
      ? null
      : this.topLevelSyntaxesByProduct.get(classification.syntaxProductHandle) ?? null;
    const attribute = syntax == null ? null : this.attributeForSyntax(syntax);
    const owner = syntax == null ? null : this.ownerForSyntax(syntax);
    if (classification == null) this.missing('primary-value-site/classification', site.productHandle, site.classification?.productHandle ?? null);
    if (syntax == null) this.missing('primary-value-site/syntax', site.productHandle, site.syntax?.productHandle ?? null);
    if (attribute == null) this.missing('primary-value-site/attribute', site.productHandle, site.attribute?.productHandle ?? null);
    if (classification != null && syntax != null && attribute != null && owner != null) {
      this.validateAttributeSiteOrigin(site, syntax, classification, attribute, owner, 'primary-value-site/origin');
      if (
        site.bindable !== classification.bindable
        || !sameNormalizedBindingCommandReference(site.bindingCommand, classification.bindingCommand)
      ) {
        this.crossReference(
          'primary-value-site/selection',
          'Primary value site does not retain the classification-selected bindable and command.',
          [site.productHandle, classification.productHandle],
        );
      }
    }
  }

  private validateSecondaryValueSite(site: TemplateValueSite): void {
    const syntax = site.syntax?.productHandle == null ? null : this.syntax(site.syntax.productHandle);
    const classification = site.classification?.productHandle == null
      ? null
      : this.classificationsByProduct.get(site.classification.productHandle) ?? null;
    const topLevelSyntax = classification == null
      ? null
      : this.topLevelSyntaxesByProduct.get(classification.syntaxProductHandle) ?? null;
    const attribute = syntax == null ? null : this.attributeForSyntax(syntax);
    const owner = syntax == null ? null : this.ownerForSyntax(syntax);
    if (syntax == null) this.missing('secondary-value-site/syntax', site.productHandle, site.syntax?.productHandle ?? null);
    if (classification == null) this.missing('secondary-value-site/classification', site.productHandle, site.classification?.productHandle ?? null);
    if (attribute == null) this.missing('secondary-value-site/attribute', site.productHandle, site.attribute?.productHandle ?? null);
    if (
      syntax != null
      && classification != null
      && topLevelSyntax != null
      && attribute != null
      && owner != null
    ) {
      this.validateAttributeSiteOrigin(site, syntax, classification, attribute, owner, 'secondary-value-site/origin');
      if (topLevelSyntax.attribute.productHandle !== attribute.productHandle) {
        this.crossReference(
          'secondary-value-site/top-level-classification',
          'Secondary value-site classification belongs to a different authored attribute bundle.',
          [site.productHandle, classification.productHandle],
        );
      }
    }
  }

  private validateBuildInput(input: BindingCommandBuildInput): void {
    const syntax = input.syntaxProductHandle == null ? null : this.syntax(input.syntaxProductHandle);
    if (syntax == null) {
      this.missing('build-input/syntax', input.productHandle, input.syntaxProductHandle);
      return;
    }
    const attribute = this.attributeForSyntax(syntax);
    const owner = this.ownerForSyntax(syntax);
    if (
      attribute == null
      || owner == null
      || !sameNormalizedAttributeReference(input.attribute, attribute)
      || !sameNormalizedNodeReference(input.node, owner.element)
    ) {
      this.crossReference(
        'build-input/attribute-owner',
        'Binding-command build input does not retain the exact attribute and element selected by its syntax.',
        [input.productHandle, syntax.productHandle],
      );
    }
  }

  private validateTopLevelBuildInput(
    input: BindingCommandBuildInput,
    classification: AttributeClassification,
  ): void {
    const bindableOwner = classification.bindable?.reference.ownerDefinitionProductHandle ?? null;
    const definition = classification.resource?.definitionProductHandle ?? null;
    const expectedKind = classification.bindable == null
      ? BindingCommandBuildInputKind.PlainAttribute
      : BindingCommandBuildInputKind.Bindable;
    if (
      input.inputKind !== expectedKind
      || input.bindableOwnerProductHandle !== bindableOwner
      || input.definitionProductHandle !== definition
    ) {
      this.crossReference(
        'top-level-command/build-input-selection',
        'Top-level command build input does not retain the classification-selected bindable and definition.',
        [classification.productHandle, input.productHandle],
      );
    }
  }

  private validateAttributeSiteOrigin(
    site: TemplateValueSite,
    syntax: AttributeSyntax,
    classification: AttributeClassification,
    attribute: HtmlAttribute,
    owner: HtmlElementAttributeOwner,
    relation: string,
  ): void {
    if (
      site.syntax !== syntax
      || site.syntax.productHandle !== syntax.productHandle
      || site.syntax.identityHandle !== syntax.identityHandle
      || site.classification !== classification
      || site.classification.productHandle !== classification.productHandle
      || site.classification.identityHandle !== classification.identityHandle
      || !sameNormalizedAttributeReference(site.attribute, attribute)
      || !sameNormalizedNodeReference(site.node, owner.element)
    ) {
      this.crossReference(
        relation,
        'Value site does not retain the exact syntax object/identity, classification object/identity, attribute, and owner.',
        [site.productHandle, syntax.productHandle, classification.productHandle, attribute.productHandle],
      );
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
    if (!sameNormalizedValueSiteReference(parse.site, site)) {
      this.crossReference(
        relation,
        'Expression parse reference does not retain the exact value-site identity, kind, family, and source.',
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
    const parse = parses.length === 1 ? parses[0]! : null;
    if (parse != null) this.ownership.claim(
      site.productHandle,
      parse.productHandle,
      TemplateCompilerNormalizedOwnershipRelation.ValueSiteOwnsExpressionParse,
    );
    return parse;
  }

  private validateCommandReference(
    expected: AttributeClassification['bindingCommand'] | MultiBindingSegment['command'],
    lowering: BindingCommandLowering,
    relation: string,
  ): void {
    if (
      expected == null
      || expected.productHandle !== lowering.command.productHandle
      || expected.identityHandle !== lowering.command.identityHandle
      || expected.name !== lowering.command.name
      || expected.key !== lowering.command.key
    ) {
      this.crossReference(
        relation,
        'Binding-command lowering does not retain the exact selected command reference.',
        [lowering.productHandle, ...productHandle(expected?.productHandle)],
      );
    }
  }

  private validateUnownedNormalizedProducts(): void {
    this.requireOwned(this.topLevelSyntaxesByProduct, 'top-level-attribute-syntax');
    this.requireOwned(this.classificationsByProduct, 'attribute-classification');
    this.requireOwned(this.primaryValueSitesByProduct, 'primary-value-site');
    this.requireOwned(this.primaryExpressionParsesByProduct, 'primary-expression-parse');
    this.requireOwned(this.secondarySyntaxesByProduct, 'secondary-attribute-syntax');
    this.requireOwned(this.buildInputsByProduct, 'binding-command-build-input');
    this.requireOwned(this.loweringsByProduct, 'binding-command-lowering');
    this.requireOwned(this.segmentsByProduct, 'multi-binding-segment');
    this.requireOwned(this.multiBindingLoweringsByProduct, 'multi-binding-lowering');
    this.requireOwned(this.secondaryValueSitesByProduct, 'secondary-value-site');
    this.requireOwned(this.secondaryExpressionParsesByProduct, 'secondary-expression-parse');
    this.requireOwned(this.normalizedInstructionsByProduct, 'normalized-instruction');
  }

  private requireOwned<T>(products: ReadonlyMap<ProductHandle, T>, kind: string): void {
    for (const handle of products.keys()) {
      if (this.ownership.ownerOf(handle) == null) {
        this.mismatch(
          TemplateCompilerNormalizedSiteMismatchKind.UnownedProduct,
          `normalized-site/${kind}`,
          `${kind} has no singular producer in the normalized ownership ledger.`,
          [handle],
        );
      }
    }
  }

  private resolveInstructionSequence(
    handles: readonly ProductHandle[],
    relation: string,
    ownerHandle: ProductHandle,
  ): readonly TemplateInstruction[] {
    this.validateUniqueHandles(handles, relation, ownerHandle);
    const instructions: TemplateInstruction[] = [];
    for (const handle of handles) {
      const instruction = this.normalizedInstructionsByProduct.get(handle) ?? null;
      if (instruction == null) this.missing(relation, ownerHandle, handle);
      else instructions.push(instruction);
    }
    return instructions;
  }

  private validateUniqueHandles(
    handles: readonly ProductHandle[],
    relation: string,
    ownerHandle: ProductHandle,
  ): void {
    const occupied = new Set<ProductHandle>();
    for (const handle of handles) {
      if (occupied.has(handle)) {
        this.mismatch(
          TemplateCompilerNormalizedSiteMismatchKind.DuplicateReference,
          relation,
          'Ordered product-handle relation repeats one product.',
          [ownerHandle, handle],
        );
      }
      occupied.add(handle);
    }
  }

  private validateSyntaxAttribute(syntax: AttributeSyntax, relation: string): void {
    const attribute = this.attributeForSyntax(syntax);
    if (attribute == null) {
      this.missing(relation, syntax.productHandle, syntax.attribute.productHandle);
      return;
    }
    if (!sameNormalizedAttributeReference(syntax.attribute, attribute)) {
      this.crossReference(
        relation,
        'Attribute syntax reference does not retain the exact authored attribute name and address.',
        [syntax.productHandle, attribute.productHandle],
      );
    }
  }

  private expressionParse(productHandle: ProductHandle): TemplateExpressionParse | null {
    return this.primaryExpressionParsesByProduct.get(productHandle)
      ?? this.secondaryExpressionParsesByProduct.get(productHandle)
      ?? null;
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

  private missing(relation: string, ownerHandle: ProductHandle, missingHandle: ProductHandle | null): void {
    this.mismatch(
      TemplateCompilerNormalizedSiteMismatchKind.MissingReferencedProduct,
      relation,
      'Normalized compiler graph references a product absent from this compilation emission.',
      missingHandle == null ? [ownerHandle] : [ownerHandle, missingHandle],
    );
  }

  private crossReference(relation: string, summary: string, productHandles: readonly ProductHandle[]): void {
    this.mismatch(TemplateCompilerNormalizedSiteMismatchKind.CrossReferenceMismatch, relation, summary, productHandles);
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

function productHandle(handle: ProductHandle | null | undefined): readonly ProductHandle[] {
  return handle == null ? [] : [handle];
}
