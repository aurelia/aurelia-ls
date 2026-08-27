import type { AddressHandle, ProductHandle } from '../kernel/handles.js';
import { SourceSpanRole, type SourceSpanAddress } from '../kernel/address.js';
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
import {
  parseInlineMultiBindingSegments,
  type ParsedMultiBindingSegment,
} from './multi-binding-segments.js';
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
  readonly sourceSpansByHandle: ReadonlyMap<AddressHandle, SourceSpanAddress>;
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

class AdmittedMultiBindingSegments {
  constructor(
    readonly segments: readonly MultiBindingSegment[],
    readonly syntaxes: readonly AttributeSyntax[],
  ) {}
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
    this.context.instructionGraph.validateProducerClaims(aggregate.productHandle, aggregateInstructions);
    for (const instruction of aggregateInstructions) {
      this.context.instructionGraph.validateInstructionClaimRoles(aggregate.productHandle, instruction);
    }

    const admitted = this.preflightSegments(
      aggregate,
      attribute,
      owner,
      topLevelSyntax,
      classification,
      primaryValueSite,
    );
    if (admitted == null) {
      return new TemplateCompilerNormalizedMultiBindingSite(
        aggregate,
        [],
        [],
        [],
        [],
        [],
        [],
        aggregateInstructions,
      );
    }

    const buildInputs: BindingCommandBuildInput[] = [];
    const commandLowerings: BindingCommandLowering[] = [];
    const secondaryValueSites: TemplateValueSite[] = [];
    const secondaryExpressionParses: TemplateExpressionParse[] = [];
    let aggregateInstructionCursor = 0;
    let segmentOutputsExact = true;

    admitted.segments.forEach((segment, segmentOrdinal) => {
      const syntax = admitted.syntaxes[segmentOrdinal]!;
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
      this.context.ownership.claim(
        segment.productHandle,
        syntax.productHandle,
        TemplateCompilerNormalizedOwnershipRelation.SegmentOwnsSecondarySyntax,
      );

      const segmentBuildInputs = this.context.buildInputsBySyntax.get(syntax.productHandle) ?? [];
      const segmentSites = this.context.secondaryValueSitesBySyntax.get(syntax.productHandle) ?? [];
      const segmentParses: TemplateExpressionParse[] = [];

      if (segment.bindable == null) {
        if (segmentBuildInputs.length > 0 || segmentSites.length > 0) {
          this.context.mismatch(
            TemplateCompilerNormalizedSiteMismatchKind.MultiBindingGraphCardinality,
            'invalid-multi-binding-segment/outputs',
            'A nonbindable segment unexpectedly owns command or parser outputs.',
            [segment.productHandle],
          );
        }
      } else if (segment.command != null) {
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
        if (input == null || lowering == null) {
          segmentOutputsExact = false;
        } else {
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
          const segmentInstructions = this.resolveInstructionSequence(
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
            const aggregateInstruction = aggregateInstructions[aggregateInstructionCursor++] ?? null;
            if (aggregateInstruction !== instruction) segmentOutputsExact = false;
          }
          for (const site of segmentSites) {
            this.validateAttributeSiteOrigin(
              site,
              syntax,
              classification,
              attribute,
              owner,
              'multi-binding-command/secondary-site',
            );
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
          this.validateAttributeSiteOrigin(
            site,
            syntax,
            classification,
            attribute,
            owner,
            'plain-multi-binding/secondary-site',
          );
          this.validateSegmentSiteSelection(site, segment);
          this.context.ownership.claim(
            segment.productHandle,
            site.productHandle,
            TemplateCompilerNormalizedOwnershipRelation.SegmentOwnsSecondaryValueSite,
          );
          const parse = this.expressionParseForSite(site, 'plain-multi-binding/secondary-parse');
          if (parse != null) segmentParses.push(parse);
        }
        const directInstruction = aggregateInstructions[aggregateInstructionCursor++] ?? null;
        if (directInstruction == null) {
          segmentOutputsExact = false;
        } else {
          this.context.ownership.claim(
            segment.productHandle,
            directInstruction.productHandle,
            TemplateCompilerNormalizedOwnershipRelation.SegmentOwnsDirectInstruction,
          );
          if (!this.context.instructionGraph.matchesPlainMultiBindingInstruction(
            segment,
            directInstruction,
            segmentParses,
            attribute,
            owner.element,
          )) {
            segmentOutputsExact = false;
          }
          this.context.instructionGraph.validatePlainMultiBindingInstruction(
            segment,
            directInstruction,
            segmentParses,
            attribute,
            owner.element,
          );
        }
      }

      secondaryValueSites.push(...segmentSites);
      secondaryExpressionParses.push(...segmentParses);
    });

    if (!segmentOutputsExact || aggregateInstructionCursor !== aggregateInstructions.length) {
      this.context.mismatch(
        TemplateCompilerNormalizedSiteMismatchKind.MultiBindingInstructionOrderMismatch,
        'multi-binding/aggregate-instruction-order',
        'Aggregate instructions are not the exact forward concatenation of ordered segment outputs.',
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
      admitted.segments,
      admitted.syntaxes,
      buildInputs,
      commandLowerings,
      secondaryValueSites,
      secondaryExpressionParses,
      aggregateInstructions,
    );
  }

  private preflightSegments(
    aggregate: MultiBindingLowering,
    attribute: HtmlAttribute,
    owner: HtmlElementAttributeOwner,
    topLevelSyntax: AttributeSyntax,
    classification: AttributeClassification,
    primaryValueSite: TemplateValueSite,
  ): AdmittedMultiBindingSegments | null {
    const parsedSegments = parseInlineMultiBindingSegments(primaryValueSite.rawValue);
    let admitted = aggregate.segmentProductHandles.length === parsedSegments.length;
    if (!admitted) {
      this.context.mismatch(
        TemplateCompilerNormalizedSiteMismatchKind.MultiBindingGraphCardinality,
        'multi-binding/reparsed-segments',
        `Reparsed multi-binding has ${parsedSegments.length} segments; aggregate retains ${aggregate.segmentProductHandles.length}.`,
        [aggregate.productHandle],
      );
    }
    const occupiedSyntaxes = new Map<ProductHandle, ProductHandle>();
    const segments: MultiBindingSegment[] = [];
    const syntaxes: AttributeSyntax[] = [];
    aggregate.segmentProductHandles.forEach((segmentHandle, index) => {
      const segment = this.context.segmentsByProduct.get(segmentHandle) ?? null;
      const parsed = parsedSegments[index] ?? null;
      const syntax = segment == null
        ? null
        : this.context.secondarySyntaxesByProduct.get(segment.syntaxProductHandle) ?? null;
      if (segment == null || parsed == null || syntax == null) {
        admitted = false;
        return;
      }
      const previousSegment = occupiedSyntaxes.get(syntax.productHandle) ?? null;
      if (previousSegment != null) {
        admitted = false;
        this.context.mismatch(
          TemplateCompilerNormalizedSiteMismatchKind.ExclusiveOwnershipConflict,
          'multi-binding/segment-syntax-preflight',
          'Peer multi-binding segments reference the same secondary syntax product.',
          [previousSegment, segment.productHandle, syntax.productHandle],
        );
      } else {
        occupiedSyntaxes.set(syntax.productHandle, segment.productHandle);
      }
      this.validateSegmentAlignment(
        segment,
        syntax,
        parsed,
        primaryValueSite,
        topLevelSyntax,
        classification,
        attribute,
        owner,
      );
      segments.push(segment);
      syntaxes.push(syntax);
    });
    return admitted ? new AdmittedMultiBindingSegments(segments, syntaxes) : null;
  }

  private validateSegmentAlignment(
    segment: MultiBindingSegment,
    syntax: AttributeSyntax,
    parsed: ParsedMultiBindingSegment,
    primaryValueSite: TemplateValueSite,
    topLevelSyntax: AttributeSyntax,
    classification: AttributeClassification,
    attribute: HtmlAttribute,
    owner: HtmlElementAttributeOwner,
  ): void {
    if (
      segment.segmentIndex !== parsed.segmentIndex
      || segment.rawName !== parsed.rawName
      || segment.rawValue !== parsed.rawValue
      || segment.rawName !== syntax.rawName
      || segment.rawValue !== syntax.rawValue
      || syntax.command !== (segment.command?.name ?? null)
      || segment.targetSourceAddressHandle !== syntax.targetSourceAddressHandle
      || !sameNormalizedAttributeReference(segment.attribute, attribute)
      || !sameNormalizedAttributeReference(syntax.attribute, attribute)
      || !sameNormalizedValueSiteReference(segment.site, primaryValueSite)
      || primaryValueSite.syntax !== topLevelSyntax
      || primaryValueSite.classification !== classification
      || !sameNormalizedNodeReference(primaryValueSite.node, owner.element)
      || !this.segmentSourceMatches(primaryValueSite, syntax, segment, parsed)
    ) {
      this.context.crossReference(
        'multi-binding-segment/alignment',
        'Ordered multi-binding segment does not align with its exact syntax, primary site, classification, attribute, and owner.',
        [segment.productHandle, syntax.productHandle, primaryValueSite.productHandle],
      );
    }
  }

  private segmentSourceMatches(
    primaryValueSite: TemplateValueSite,
    syntax: AttributeSyntax,
    segment: MultiBindingSegment,
    parsed: ParsedMultiBindingSegment,
  ): boolean {
    const base = primaryValueSite.sourceAddressHandle == null
      ? null
      : this.context.sourceSpansByHandle.get(primaryValueSite.sourceAddressHandle) ?? null;
    const syntaxSource = syntax.sourceAddressHandle == null
      ? null
      : this.context.sourceSpansByHandle.get(syntax.sourceAddressHandle) ?? null;
    const valueSource = segment.sourceAddressHandle == null
      ? null
      : this.context.sourceSpansByHandle.get(segment.sourceAddressHandle) ?? null;
    if (base == null) return true;
    return syntaxSource != null
      && valueSource != null
      && (
      syntaxSource.fileHandle === base.fileHandle
      && syntaxSource.start === base.start + parsed.start
      && syntaxSource.end === base.start + parsed.end
      && syntaxSource.role === SourceSpanRole.Range
      ) && (
      valueSource.fileHandle === base.fileHandle
      && valueSource.start === base.start + parsed.valueStart
      && valueSource.end === base.start + parsed.valueEnd
      && valueSource.role === SourceSpanRole.Value
      );
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

function productHandle(handle: ProductHandle | null | undefined): readonly ProductHandle[] {
  return handle == null ? [] : [handle];
}
