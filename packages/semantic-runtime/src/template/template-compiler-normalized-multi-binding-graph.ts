import type { ProductHandle } from '../kernel/handles.js';
import type { AttributeClassification, AttributeSyntax } from './attribute-syntax.js';
import {
  BindingCommandBuildInputKind,
  type BindingCommandBuildInput,
  type BindingCommandLowering,
  type MultiBindingLowering,
  type MultiBindingSegment,
} from './binding-command-execution.js';
import type { HtmlAttribute, HtmlElementAttributeOwner } from './html-ir.js';
import type { TemplateInstruction } from './instruction-ir.js';
import type { TemplateCompilerNormalizedInstructionGraphValidator } from './template-compiler-normalized-instruction-graph.js';
import type { TemplateCompilerNormalizedOwnershipBuilder } from './template-compiler-normalized-ownership.js';
import {
  sameNormalizedAttributeReference,
  sameNormalizedBindingCommandReference,
  sameNormalizedNodeReference,
  sameNormalizedValueSiteReference,
} from './template-compiler-normalized-reference.js';
import {
  TemplateCompilerNormalizedContainmentRelation,
  TemplateCompilerNormalizedMultiBindingSite,
  TemplateCompilerNormalizedOwnershipRelation,
  TemplateCompilerNormalizedSiteMismatchKind,
} from './template-compiler-normalized-site-model.js';
import { TemplateValueSiteKind, type TemplateExpressionParse, type TemplateValueSite } from './value-site.js';

export interface TemplateCompilerNormalizedMultiBindingGraphContext {
  readonly ownership: TemplateCompilerNormalizedOwnershipBuilder;
  readonly instructionGraph: TemplateCompilerNormalizedInstructionGraphValidator;
  readonly primaryValueSitesByProduct: ReadonlyMap<ProductHandle, TemplateValueSite>;
  readonly attributesByProduct: ReadonlyMap<ProductHandle, HtmlAttribute>;
  readonly secondarySyntaxesByProduct: ReadonlyMap<ProductHandle, AttributeSyntax>;
  readonly secondaryValueSitesBySyntax: ReadonlyMap<ProductHandle, readonly TemplateValueSite[]>;
  readonly secondaryExpressionParsesBySite: ReadonlyMap<ProductHandle, readonly TemplateExpressionParse[]>;
  readonly buildInputsBySyntax: ReadonlyMap<ProductHandle, readonly BindingCommandBuildInput[]>;
  readonly loweringsByInput: ReadonlyMap<ProductHandle, readonly BindingCommandLowering[]>;
  readonly segmentsByProduct: ReadonlyMap<ProductHandle, MultiBindingSegment>;
  readonly normalizedInstructionsByProduct: ReadonlyMap<ProductHandle, TemplateInstruction>;
  readonly mismatch: (
    kind: TemplateCompilerNormalizedSiteMismatchKind,
    relation: string,
    summary: string,
    handles: readonly ProductHandle[],
  ) => void;
  readonly missing: (relation: string, ownerHandle: ProductHandle, missingHandle: ProductHandle | null) => void;
  readonly crossReference: (relation: string, summary: string, handles: readonly ProductHandle[]) => void;
  readonly validateUniqueHandles: (
    handles: readonly ProductHandle[],
    relation: string,
    ownerHandle: ProductHandle,
  ) => void;
}

/** Validates the secondary grammar and exact framework production order for inline multi-bindings. */
export class TemplateCompilerNormalizedMultiBindingGraphValidator {
  constructor(private readonly context: TemplateCompilerNormalizedMultiBindingGraphContext) {}

  validateSegmentReferences(segment: MultiBindingSegment): void {
    const site = this.context.primaryValueSitesByProduct.get(segment.site.productHandle) ?? null;
    const syntax = this.context.secondarySyntaxesByProduct.get(segment.syntaxProductHandle) ?? null;
    const attribute = segment.attribute.productHandle == null
      ? null
      : this.context.attributesByProduct.get(segment.attribute.productHandle) ?? null;
    if (site == null) this.context.missing('multi-binding-segment/site', segment.productHandle, segment.site.productHandle);
    if (syntax == null) this.context.missing('multi-binding-segment/syntax', segment.productHandle, segment.syntaxProductHandle);
    if (attribute == null) this.context.missing('multi-binding-segment/attribute', segment.productHandle, segment.attribute.productHandle);
    if (
      site != null
      && syntax != null
      && attribute != null
      && (
        site.siteKind !== TemplateValueSiteKind.MultiBindingValue
        || site.attribute?.productHandle !== attribute.productHandle
        || syntax.attribute.productHandle !== attribute.productHandle
        || !sameNormalizedValueSiteReference(segment.site, site)
      )
    ) {
      this.context.crossReference(
        'multi-binding-segment/origin',
        'Multi-binding segment does not retain one exact primary site, secondary syntax, and authored attribute.',
        [segment.productHandle, site.productHandle, syntax.productHandle, attribute.productHandle],
      );
    }
  }

  validateAggregateReferences(lowering: MultiBindingLowering): void {
    const site = this.context.primaryValueSitesByProduct.get(lowering.site.productHandle) ?? null;
    if (site == null) {
      this.context.missing('multi-binding-lowering/site', lowering.productHandle, lowering.site.productHandle);
    } else if (
      site.siteKind !== TemplateValueSiteKind.MultiBindingValue
      || !sameNormalizedValueSiteReference(lowering.site, site)
    ) {
      this.context.crossReference(
        'multi-binding-lowering/site',
        'Multi-binding lowering does not retain its exact primary multi-binding value site.',
        [lowering.productHandle, site.productHandle],
      );
    }
    this.context.validateUniqueHandles(
      lowering.segmentProductHandles,
      'multi-binding-lowering/segments',
      lowering.productHandle,
    );
    lowering.segmentProductHandles.forEach((handle, ordinal) => {
      const segment = this.context.segmentsByProduct.get(handle) ?? null;
      if (segment == null) {
        this.context.missing('multi-binding-lowering/segment', lowering.productHandle, handle);
      } else {
        if (segment.site.productHandle !== lowering.site.productHandle) {
          this.context.crossReference(
            'multi-binding-lowering/segment-site',
            'Ordered multi-binding segment belongs to a different primary value site.',
            [lowering.productHandle, segment.productHandle],
          );
        }
        if (segment.segmentIndex !== ordinal) {
          this.context.mismatch(
            TemplateCompilerNormalizedSiteMismatchKind.MultiBindingSegmentOrderMismatch,
            'multi-binding-lowering/segment-order',
            `Multi-binding segment ${segment.segmentIndex} occupies aggregate ordinal ${ordinal}.`,
            [lowering.productHandle, segment.productHandle],
          );
        }
      }
    });
    this.context.validateUniqueHandles(
      lowering.instructionProductHandles,
      'multi-binding-lowering/instructions',
      lowering.productHandle,
    );
  }

  build(
    aggregate: MultiBindingLowering,
    attribute: HtmlAttribute,
    owner: HtmlElementAttributeOwner,
    topLevelSyntax: AttributeSyntax,
    classification: AttributeClassification,
    primaryValueSite: TemplateValueSite,
  ): TemplateCompilerNormalizedMultiBindingSite {
    this.context.ownership.claim(
      primaryValueSite.productHandle,
      aggregate.productHandle,
      TemplateCompilerNormalizedOwnershipRelation.MultiBindingSiteOwnsLowering,
    );
    const aggregateInstructions = this.resolveInstructionSequence(
      aggregate.instructionProductHandles,
      'multi-binding/instructions',
      aggregate.productHandle,
    );
    const commandedInstructionHandles = new Set<ProductHandle>();
    for (const segmentHandle of aggregate.segmentProductHandles) {
      const segment = this.context.segmentsByProduct.get(segmentHandle) ?? null;
      const syntaxHandle = segment?.syntaxProductHandle ?? null;
      if (syntaxHandle == null) continue;
      for (const input of this.context.buildInputsBySyntax.get(syntaxHandle) ?? []) {
        for (const lowering of this.context.loweringsByInput.get(input.productHandle) ?? []) {
          for (const instructionHandle of lowering.instructionProductHandles) {
            commandedInstructionHandles.add(instructionHandle);
          }
        }
      }
    }
    const directInstructionsByKey = new Map<string, TemplateInstruction[]>();
    for (const instruction of aggregateInstructions) {
      if (commandedInstructionHandles.has(instruction.productHandle)) continue;
      const key = this.context.instructionGraph.plainMultiBindingInstructionKey(instruction);
      if (key == null) continue;
      const candidates = directInstructionsByKey.get(key);
      if (candidates == null) directInstructionsByKey.set(key, [instruction]);
      else candidates.push(instruction);
    }
    const segments: MultiBindingSegment[] = [];
    const secondarySyntaxes: AttributeSyntax[] = [];
    const buildInputs: BindingCommandBuildInput[] = [];
    const commandLowerings: BindingCommandLowering[] = [];
    const secondaryValueSites: TemplateValueSite[] = [];
    const secondaryExpressionParses: TemplateExpressionParse[] = [];
    const expectedInstructionHandles: ProductHandle[] = [];
    let segmentOutputsComplete = true;

    aggregate.segmentProductHandles.forEach((segmentHandle, segmentOrdinal) => {
      const segment = this.context.segmentsByProduct.get(segmentHandle) ?? null;
      if (segment == null) {
        segmentOutputsComplete = false;
        return;
      }
      segments.push(segment);
      this.context.ownership.claim(
        primaryValueSite.productHandle,
        segment.productHandle,
        TemplateCompilerNormalizedOwnershipRelation.MultiBindingSiteOwnsSegment,
      );
      this.context.ownership.contain(
        aggregate.productHandle,
        segment.productHandle,
        TemplateCompilerNormalizedContainmentRelation.MultiBindingLoweringContainsSegment,
        segmentOrdinal,
      );
      const syntax = this.context.secondarySyntaxesByProduct.get(segment.syntaxProductHandle) ?? null;
      if (syntax == null) {
        segmentOutputsComplete = false;
        return;
      }
      secondarySyntaxes.push(syntax);
      this.context.ownership.claim(
        segment.productHandle,
        syntax.productHandle,
        TemplateCompilerNormalizedOwnershipRelation.SegmentOwnsSecondarySyntax,
      );
      this.validateSegmentAlignment(segment, syntax, primaryValueSite, topLevelSyntax, classification, attribute, owner);

      const segmentBuildInputs = this.context.buildInputsBySyntax.get(syntax.productHandle) ?? [];
      const segmentSites = this.context.secondaryValueSitesBySyntax.get(syntax.productHandle) ?? [];
      const segmentParses: TemplateExpressionParse[] = [];
      let segmentInstructions: readonly TemplateInstruction[] = [];

      if (segment.command != null) {
        const input = this.single(
          segmentBuildInputs,
          TemplateCompilerNormalizedSiteMismatchKind.CommandGraphCardinality,
          'multi-binding-segment/build-input',
          'Commanded multi-binding segment must own exactly one build input.',
          [segment.productHandle],
        );
        const lowering = input == null
          ? null
          : this.single(
              this.context.loweringsByInput.get(input.productHandle) ?? [],
              TemplateCompilerNormalizedSiteMismatchKind.CommandGraphCardinality,
              'multi-binding-segment/lowering',
              'Commanded multi-binding build input must own exactly one lowering.',
              [input.productHandle],
            );
        if (input != null && lowering != null) {
          buildInputs.push(input);
          commandLowerings.push(lowering);
          this.context.ownership.claim(
            segment.productHandle,
            input.productHandle,
            TemplateCompilerNormalizedOwnershipRelation.SegmentOwnsCommandBuildInput,
          );
          this.context.ownership.claim(
            input.productHandle,
            lowering.productHandle,
            TemplateCompilerNormalizedOwnershipRelation.BuildInputOwnsCommandLowering,
          );
          this.validateCommandReference(segment.command, lowering, 'multi-binding-segment/command');
          this.validateSegmentBuildInput(input, segment);
          segmentInstructions = this.resolveInstructionSequence(
            lowering.instructionProductHandles,
            'multi-binding-segment/instructions',
            lowering.productHandle,
          );
          for (const instruction of segmentInstructions) {
            this.context.ownership.claim(
              lowering.productHandle,
              instruction.productHandle,
              TemplateCompilerNormalizedOwnershipRelation.CommandLoweringOwnsInstruction,
            );
          }
          for (const site of segmentSites) {
            this.validateAttributeSiteOrigin(site, syntax, classification, attribute, owner, 'multi-binding-command/secondary-site');
            this.validateSegmentSiteSelection(site, segment);
            this.context.ownership.claim(
              lowering.productHandle,
              site.productHandle,
              TemplateCompilerNormalizedOwnershipRelation.CommandLoweringOwnsSecondaryValueSite,
            );
            const parse = this.expressionParseForSite(site, 'multi-binding-command/secondary-parse');
            if (parse != null) segmentParses.push(parse);
          }
          this.context.instructionGraph.validateOwnedInstructionGraph(
            lowering.productHandle,
            segmentInstructions,
            segmentParses,
            attribute,
            owner.element,
          );
        } else {
          segmentOutputsComplete = false;
        }
      } else if (segment.bindable == null) {
        if (segmentBuildInputs.length > 0 || segmentSites.length > 0) {
          this.context.mismatch(
            TemplateCompilerNormalizedSiteMismatchKind.MultiBindingGraphCardinality,
            'invalid-multi-binding-segment/outputs',
            'A segment without a bindable or command unexpectedly owns lowering outputs.',
            [segment.productHandle],
          );
        }
      } else {
        if (segmentBuildInputs.length > 0) {
          this.context.mismatch(
            TemplateCompilerNormalizedSiteMismatchKind.CommandGraphCardinality,
            'plain-multi-binding-segment/build-input',
            'Plain multi-binding segment unexpectedly owns a command build input.',
            [segment.productHandle, ...segmentBuildInputs.map((input) => input.productHandle)],
          );
        }
        const site = this.single(
          segmentSites,
          TemplateCompilerNormalizedSiteMismatchKind.MultiBindingGraphCardinality,
          'plain-multi-binding-segment/value-site',
          'Plain bindable multi-binding segment must own exactly one value site.',
          [segment.productHandle],
        );
        if (site != null) {
          this.validateAttributeSiteOrigin(site, syntax, classification, attribute, owner, 'plain-multi-binding/secondary-site');
          this.validateSegmentSiteSelection(site, segment);
          this.context.ownership.claim(
            segment.productHandle,
            site.productHandle,
            TemplateCompilerNormalizedOwnershipRelation.SegmentOwnsSecondaryValueSite,
          );
          const parse = this.expressionParseForSite(site, 'plain-multi-binding/secondary-parse');
          if (parse != null) segmentParses.push(parse);
        }
        const directInstructionKey = this.context.instructionGraph.plainMultiBindingInstructionKeyForSegment(
          segment,
          segmentParses,
          attribute,
          owner.element,
        );
        const directInstruction = this.single(
          directInstructionKey == null ? [] : directInstructionsByKey.get(directInstructionKey) ?? [],
          TemplateCompilerNormalizedSiteMismatchKind.MultiBindingGraphCardinality,
          'plain-multi-binding-segment/direct-instruction',
          'Plain bindable multi-binding segment must own one independently matched direct instruction.',
          [segment.productHandle],
        );
        if (directInstruction != null) {
          segmentInstructions = [directInstruction];
          this.context.ownership.claim(
            segment.productHandle,
            directInstruction.productHandle,
            TemplateCompilerNormalizedOwnershipRelation.SegmentOwnsDirectInstruction,
          );
          this.context.instructionGraph.validatePlainMultiBindingInstruction(
            segment,
            directInstruction,
            segmentParses,
            attribute,
            owner.element,
          );
        } else {
          segmentOutputsComplete = false;
        }
      }

      secondaryValueSites.push(...segmentSites);
      secondaryExpressionParses.push(...segmentParses);
      expectedInstructionHandles.push(...segmentInstructions.map((instruction) => instruction.productHandle));
    });

    if (
      !segmentOutputsComplete
      || !sameHandleSequence(expectedInstructionHandles, aggregate.instructionProductHandles)
    ) {
      this.context.mismatch(
        TemplateCompilerNormalizedSiteMismatchKind.MultiBindingInstructionOrderMismatch,
        'multi-binding/aggregate-instruction-order',
        'Aggregate multi-binding instruction handles do not equal ordered segment outputs in framework production order.',
        [aggregate.productHandle, ...aggregate.instructionProductHandles],
      );
    }
    aggregate.instructionProductHandles.forEach((handle, ordinal) => this.context.ownership.contain(
      aggregate.productHandle,
      handle,
      TemplateCompilerNormalizedContainmentRelation.MultiBindingLoweringContainsInstruction,
      ordinal,
    ));
    return new TemplateCompilerNormalizedMultiBindingSite(
      aggregate,
      segments,
      secondarySyntaxes,
      buildInputs,
      commandLowerings,
      secondaryValueSites,
      secondaryExpressionParses,
      aggregateInstructions,
    );
  }

  private validateSegmentAlignment(
    segment: MultiBindingSegment,
    syntax: AttributeSyntax,
    primaryValueSite: TemplateValueSite,
    topLevelSyntax: AttributeSyntax,
    classification: AttributeClassification,
    attribute: HtmlAttribute,
    owner: HtmlElementAttributeOwner,
  ): void {
    if (
      segment.rawName !== syntax.rawName
      || segment.rawValue !== syntax.rawValue
      || (segment.command != null && syntax.command !== segment.command.name)
      || segment.targetSourceAddressHandle !== syntax.targetSourceAddressHandle
      || !sameNormalizedAttributeReference(segment.attribute, attribute)
      || !sameNormalizedAttributeReference(syntax.attribute, attribute)
      || !sameNormalizedValueSiteReference(segment.site, primaryValueSite)
      || primaryValueSite.syntax !== topLevelSyntax
      || primaryValueSite.classification !== classification
      || !sameNormalizedNodeReference(primaryValueSite.node, owner.element)
    ) {
      this.context.crossReference(
        'multi-binding-segment/alignment',
        'Ordered multi-binding segment does not align with its exact syntax, primary site, classification, attribute, and owner.',
        [segment.productHandle, syntax.productHandle, primaryValueSite.productHandle],
      );
    }
  }

  private validateSegmentSiteSelection(site: TemplateValueSite, segment: MultiBindingSegment): void {
    if (
      site.bindable !== segment.bindable
      || !sameNormalizedBindingCommandReference(site.bindingCommand, segment.command)
    ) {
      this.context.crossReference(
        'multi-binding-segment/site-selection',
        'Multi-binding secondary value site does not retain the segment-selected bindable and command.',
        [segment.productHandle, site.productHandle],
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
      this.context.crossReference(
        relation,
        'Value site does not retain the exact syntax object/identity, classification object/identity, attribute, and owner.',
        [site.productHandle, syntax.productHandle, classification.productHandle, attribute.productHandle],
      );
    }
  }

  private expressionParseForSite(site: TemplateValueSite, relation: string): TemplateExpressionParse | null {
    const parses = this.context.secondaryExpressionParsesBySite.get(site.productHandle) ?? [];
    const expected = site.entryFamily == null ? 0 : 1;
    if (parses.length !== expected) {
      this.context.mismatch(
        TemplateCompilerNormalizedSiteMismatchKind.ExpressionParseCardinality,
        relation,
        `Value site expects ${expected} expression parse product but owns ${parses.length}.`,
        [site.productHandle, ...parses.map((parse) => parse.productHandle)],
      );
    }
    const parse = parses.length === 1 ? parses[0]! : null;
    if (parse != null) this.context.ownership.claim(
      site.productHandle,
      parse.productHandle,
      TemplateCompilerNormalizedOwnershipRelation.ValueSiteOwnsExpressionParse,
    );
    return parse;
  }

  private validateCommandReference(
    expected: MultiBindingSegment['command'],
    lowering: BindingCommandLowering,
    relation: string,
  ): void {
    if (!sameNormalizedBindingCommandReference(expected, lowering.command)) {
      this.context.crossReference(
        relation,
        'Binding-command lowering does not retain the exact segment-selected command reference.',
        [lowering.productHandle, ...productHandle(expected?.productHandle)],
      );
    }
  }

  private validateSegmentBuildInput(input: BindingCommandBuildInput, segment: MultiBindingSegment): void {
    const bindableOwner = segment.bindable?.reference.ownerDefinitionProductHandle ?? null;
    if (
      segment.bindable == null
      || input.inputKind !== BindingCommandBuildInputKind.Bindable
      || input.bindableOwnerProductHandle !== bindableOwner
      || input.definitionProductHandle !== bindableOwner
      || input.syntaxProductHandle !== segment.syntaxProductHandle
    ) {
      this.context.crossReference(
        'multi-binding-segment/build-input-selection',
        'Multi-binding command build input does not retain the segment-selected bindable, definition, and syntax.',
        [segment.productHandle, input.productHandle],
      );
    }
  }

  private resolveInstructionSequence(
    handles: readonly ProductHandle[],
    relation: string,
    ownerHandle: ProductHandle,
  ): readonly TemplateInstruction[] {
    this.context.validateUniqueHandles(handles, relation, ownerHandle);
    const instructions: TemplateInstruction[] = [];
    for (const handle of handles) {
      const instruction = this.context.normalizedInstructionsByProduct.get(handle) ?? null;
      if (instruction == null) this.context.missing(relation, ownerHandle, handle);
      else instructions.push(instruction);
    }
    return instructions;
  }

  private single<T>(
    values: readonly T[],
    mismatchKind: TemplateCompilerNormalizedSiteMismatchKind,
    relation: string,
    summary: string,
    handles: readonly ProductHandle[],
  ): T | null {
    if (values.length === 1) return values[0]!;
    this.context.mismatch(mismatchKind, relation, summary, handles);
    return null;
  }
}

function sameHandleSequence(left: readonly ProductHandle[], right: readonly ProductHandle[]): boolean {
  return left.length === right.length && left.every((handle, index) => handle === right[index]);
}

function productHandle(handle: ProductHandle | null | undefined): readonly ProductHandle[] {
  return handle == null ? [] : [handle];
}
