import { beforeAll, describe, expect, test } from 'vitest';

import { KernelHandleFactory } from '../src/kernel/handles.js';
import { AttributeClassificationEmission } from '../src/template/attribute-classification-materializer.js';
import { AttributeSyntaxParseEmission } from '../src/template/attribute-syntax-materializer.js';
import {
  BindingCommandLowering,
  BindingCommandLoweringState,
  MultiBindingLowering,
  MultiBindingSegment,
} from '../src/template/binding-command-execution.js';
import { HtmlElement, HtmlNodeReference, HtmlText } from '../src/template/html-ir.js';
import { HtmlParseEmission } from '../src/template/html-parse-materializer.js';
import {
  HydrateElementInstruction,
  HydrateAttributeInstruction,
  IteratorBindingInstruction,
  MultiAttrInstruction,
  SetPropertyInstruction,
  TemplateInstructionKind,
} from '../src/template/instruction-ir.js';
import { TemplateCompilerIssueKind } from '../src/template/compiler-issue.js';
import { TemplateCompilerFrameworkErrorCode } from '../src/template/framework-error-code.js';
import type { TemplateResourceCompilationEmission } from '../src/template/template-compilation-project-pass.js';
import {
  buildTemplateCompilerNormalizedSiteIndex,
  TemplateCompilerNormalizedDownstreamInstructionParityState,
  TemplateCompilerNormalizedOutcomeAttributionKind,
  TemplateCompilerNormalizedSiteIndexState,
  TemplateCompilerNormalizedSiteMismatchKind,
} from '../src/template/template-compiler-normalized-site-index.js';
import { TemplateValueSiteKind, TemplateValueSiteReference } from '../src/template/value-site.js';
import {
  TemplateValueSiteEmission,
  TemplateValueSiteExpectation,
  TemplateValueSiteExpectationDecision,
} from '../src/template/value-site-materializer.js';
import {
  compilationWith,
  compiledTemplateEmission,
  equivalentAttributeSyntax,
  equivalentHtmlElement,
  fixtureCompilation,
  htmlEmission,
  instructionWithNode,
  instructionWithSource,
  iteratorWith,
  loweringEmission,
  multiAttrWithExpression,
  segmentWithBindable,
  segmentWithSiteAndSource,
  segmentWithSource,
  segmentWithSyntax,
  setPropertyWithOutput,
  sortedHandles,
  tracked,
  valueSiteEmission,
  valueSiteWith,
  valueSiteWithNode,
} from './normalized-site-index-fixture.js';

describe('template compiler normalized site index', () => {
  let compilation: TemplateResourceCompilationEmission;
  let repeatCompilation: TemplateResourceCompilationEmission;
  let openCompilation: TemplateResourceCompilationEmission;
  let invalidCompilation: TemplateResourceCompilationEmission;

  beforeAll(async () => {
    [compilation, repeatCompilation, openCompilation, invalidCompilation] = await Promise.all([
      fixtureCompilation('bindable-contracts-lab', 'bindable-lab-app'),
      fixtureCompilation('template-controller-scope-lab', 'scope-lab-app'),
      fixtureCompilation('template-compiler-fidelity', 'template-compiler-fidelity-app'),
      fixtureCompilation('template-compiler-errors', 'template-compiler-errors-app'),
    ]);
  }, 30_000);

  test('conserves every attribute-owned normalized product under the authored attribute identity', () => {
    const result = buildTemplateCompilerNormalizedSiteIndex(compilation);
    expect(result.state).toBe(TemplateCompilerNormalizedSiteIndexState.GraphExact);
    expect(result.mismatches).toEqual([]);
    const index = result.index;
    if (index == null) throw new Error('Expected an exact normalized site index.');
    const attributeValueSiteHandles = new Set(compilation.valueSites.sites.flatMap((site) =>
      site.attribute?.productHandle == null ? [] : [site.productHandle]
    ));

    expect(index.familyOwnerHandle).toBe(compilation.familyOwnerHandle);
    expect(index.compilation).toBe(compilation);
    expect(index.analysisContextProductHandle).toBe(compilation.analysisContextProductHandle);
    expect(index.compilerWorld).toBe(compilation.compilerWorld);
    expect(index.definition).toBe(compilation.definition);
    expect(index.unit).toBe(compilation.unit);
    expect(index.htmlDocument).toBe(compilation.html.document);
    expect(index.sites).toHaveLength(compilation.html.attributes.length);
    expect(index.sites.every((site) =>
      index.siteForAttribute(site.attribute.productHandle) === site
      && site.attributeProductHandle === site.attribute.productHandle
      && site.owner.attributes.includes(site.attribute)
      && site.syntax.attribute.productHandle === site.attribute.productHandle
      && site.classification.syntaxProductHandle === site.syntax.productHandle
    )).toBe(true);

    const multiBindings = index.sites.flatMap((site) => site.multiBinding == null ? [] : [site.multiBinding]);
    expect(multiBindings).toHaveLength(3);
    expect(multiBindings.map((multiBinding) =>
      multiBinding.segments.map((segment) => segment.rawName)
    )).toEqual([
      ['message.bind', 'display-label.bind', 'tone.bind'],
      ['message.one-time'],
      ['message', 'tone'],
    ]);
    expect(multiBindings.map((multiBinding) =>
      multiBinding.secondarySyntaxes.map((syntax) => syntax.rawName)
    )).toEqual(multiBindings.map((multiBinding) =>
      multiBinding.segments.map((segment) => segment.rawName)
    ));
    expect(multiBindings.map((multiBinding) => ({
      builds: multiBinding.buildInputs.length,
      lowerings: multiBinding.commandLowerings.length,
      sites: multiBinding.secondaryValueSites.length,
      parses: multiBinding.secondaryExpressionParses.length,
      instructions: multiBinding.instructions.length,
    }))).toEqual([
      { builds: 3, lowerings: 3, sites: 3, parses: 3, instructions: 3 },
      { builds: 1, lowerings: 1, sites: 1, parses: 1, instructions: 1 },
      { builds: 0, lowerings: 0, sites: 2, parses: 2, instructions: 2 },
    ]);

    expect(index.cardinality).toMatchObject({
      authoredAttributes: compilation.html.attributes.length,
      attributeSites: compilation.html.attributes.length,
      topLevelSyntaxes: compilation.attributeSyntax.syntaxes.length,
      classifications: compilation.attributeClassification.classifications.length,
      commandBuildInputs: compilation.bindingCommandLowering.buildInputs.length,
      commandLowerings: compilation.bindingCommandLowering.lowerings.length,
      secondarySyntaxes: compilation.bindingCommandLowering.attributeSyntaxes.length,
      multiBindingSegments: compilation.bindingCommandLowering.multiBindingSegments.length,
      multiBindingLowerings: compilation.bindingCommandLowering.multiBindingLowerings.length,
      secondaryValueSites: compilation.bindingCommandLowering.valueSites.length,
      secondaryExpressionParses: compilation.bindingCommandLowering.expressionParses.length,
      normalizedInstructions: compilation.bindingCommandLowering.instructions.length,
      downstreamCreatedInstructions: compilation.compiledTemplate.createdInstructions.length,
    });
    expect(index.outcomes.issues).toEqual(compilation.compiledTemplate.issues);
    expect(index.outcomes.openSeams).toEqual(compilation.compiledTemplate.openSeams);
    expect(index.outcomes.attributionKind)
      .toBe(TemplateCompilerNormalizedOutcomeAttributionKind.NoRetainedPhaseGlobalOutcomes);
    expect(index.downstreamInstructions.rows.map((row) => row.instruction))
      .toEqual(compilation.compiledTemplate.createdInstructions);
    expect(index.downstreamInstructions.attributeOutputs).toHaveLength(13);
    expect(index.downstreamInstructions.textOutputs).toHaveLength(0);
    expect(index.downstreamInstructions.excludedStructuralOutputs).toHaveLength(9);
    expect(index.downstreamInstructions.attributeOutputs.every((row) => row.attributeSite != null)).toBe(true);
    expect(index.downstreamInstructions.state)
      .toBe(TemplateCompilerNormalizedDownstreamInstructionParityState.Exact);

    expect(sortedHandles(index.sites.map((site) => site.syntax.productHandle)))
      .toEqual(sortedHandles(compilation.attributeSyntax.syntaxes.map((syntax) => syntax.productHandle)));
    expect(sortedHandles(index.sites.map((site) => site.classification.productHandle)))
      .toEqual(sortedHandles(compilation.attributeClassification.classifications.map((classification) => classification.productHandle)));
    expect(sortedHandles(index.sites.flatMap((site) =>
      site.primaryValueSite == null ? [] : [site.primaryValueSite.productHandle]
    ))).toEqual(sortedHandles([...attributeValueSiteHandles]));
    expect(sortedHandles(index.sites.flatMap((site) =>
      site.primaryExpressionParse == null ? [] : [site.primaryExpressionParse.productHandle]
    ))).toEqual(sortedHandles(compilation.valueSites.parses.flatMap((parse) =>
      attributeValueSiteHandles.has(parse.site.productHandle) ? [parse.productHandle] : []
    )));
    expect(sortedHandles(index.sites.flatMap((site) => [
      ...(site.command == null ? [] : [site.command.buildInput.productHandle]),
      ...(site.multiBinding?.buildInputs.map((input) => input.productHandle) ?? []),
    ]))).toEqual(sortedHandles(compilation.bindingCommandLowering.buildInputs.map((input) => input.productHandle)));
    expect(sortedHandles(index.sites.flatMap((site) => [
      ...(site.command == null ? [] : [site.command.lowering.productHandle]),
      ...(site.multiBinding?.commandLowerings.map((lowering) => lowering.productHandle) ?? []),
    ]))).toEqual(sortedHandles(compilation.bindingCommandLowering.lowerings.map((lowering) => lowering.productHandle)));
    expect(sortedHandles(index.sites.flatMap((site) =>
      site.multiBinding?.secondarySyntaxes.map((syntax) => syntax.productHandle) ?? []
    ))).toEqual(sortedHandles(compilation.bindingCommandLowering.attributeSyntaxes.map((syntax) => syntax.productHandle)));
    expect(sortedHandles(index.sites.flatMap((site) =>
      site.multiBinding?.segments.map((segment) => segment.productHandle) ?? []
    ))).toEqual(sortedHandles(compilation.bindingCommandLowering.multiBindingSegments.map((segment) => segment.productHandle)));
    expect(sortedHandles(index.sites.flatMap((site) =>
      site.multiBinding == null ? [] : [site.multiBinding.lowering.productHandle]
    ))).toEqual(sortedHandles(compilation.bindingCommandLowering.multiBindingLowerings.map((lowering) => lowering.productHandle)));
    expect(sortedHandles(index.sites.flatMap((site) => [
      ...(site.command?.secondaryValueSites.map((valueSite) => valueSite.productHandle) ?? []),
      ...(site.multiBinding?.secondaryValueSites.map((valueSite) => valueSite.productHandle) ?? []),
    ]))).toEqual(sortedHandles(compilation.bindingCommandLowering.valueSites.map((valueSite) => valueSite.productHandle)));
    expect(sortedHandles(index.sites.flatMap((site) => [
      ...(site.command?.secondaryExpressionParses.map((parse) => parse.productHandle) ?? []),
      ...(site.multiBinding?.secondaryExpressionParses.map((parse) => parse.productHandle) ?? []),
    ]))).toEqual(sortedHandles(compilation.bindingCommandLowering.expressionParses.map((parse) => parse.productHandle)));
    expect(sortedHandles(index.sites.flatMap((site) => [
      ...(site.command?.instructions.map((instruction) => instruction.productHandle) ?? []),
      ...(site.multiBinding?.instructions.map((instruction) => instruction.productHandle) ?? []),
    ]))).toEqual(sortedHandles(compilation.bindingCommandLowering.instructions.map((instruction) => instruction.productHandle)));
    const normalizedOwnedHandles = [
      ...compilation.attributeSyntax.syntaxes.map((syntax) => syntax.productHandle),
      ...compilation.attributeClassification.classifications.map((classification) => classification.productHandle),
      ...compilation.valueSites.sites.map((site) => site.productHandle),
      ...compilation.valueSites.parses.map((parse) => parse.productHandle),
      ...compilation.bindingCommandLowering.attributeSyntaxes.map((syntax) => syntax.productHandle),
      ...compilation.bindingCommandLowering.buildInputs.map((input) => input.productHandle),
      ...compilation.bindingCommandLowering.lowerings.map((lowering) => lowering.productHandle),
      ...compilation.bindingCommandLowering.multiBindingSegments.map((segment) => segment.productHandle),
      ...compilation.bindingCommandLowering.multiBindingLowerings.map((lowering) => lowering.productHandle),
      ...compilation.bindingCommandLowering.valueSites.map((site) => site.productHandle),
      ...compilation.bindingCommandLowering.expressionParses.map((parse) => parse.productHandle),
      ...compilation.bindingCommandLowering.instructions.map((instruction) => instruction.productHandle),
    ];
    expect(normalizedOwnedHandles.every((handle) => index.ownership.ownerOf(handle) != null)).toBe(true);
  });

  test('refuses a foreign attribute-owner progression as GraphExact authority', () => {
    const foreignProgression = repeatCompilation.attributeOwnerProgression;
    const result = buildTemplateCompilerNormalizedSiteIndex(compilationWith(compilation, {
      bindingCommandLowering: loweringEmission(compilation, {
        attributeOwnerProgression: foreignProgression,
      }),
    }));

    expect(result.state).toBe(TemplateCompilerNormalizedSiteIndexState.Mismatch);
    expect(result.mismatches).toContainEqual(expect.objectContaining({
      mismatchKind: TemplateCompilerNormalizedSiteMismatchKind.AttributeOwnerProgressionMismatch,
    }));
  });

  test('keeps GraphExact distinct from phase-global semantic openness', () => {
    const result = buildTemplateCompilerNormalizedSiteIndex(openCompilation);
    expect(result.state).toBe(TemplateCompilerNormalizedSiteIndexState.GraphExact);
    const index = result.index;
    if (index == null) throw new Error('Expected GraphExact product structure with open semantic posture.');
    expect(index.outcomes.openSeams).toEqual(openCompilation.compiledTemplate.openSeams);
    expect(index.outcomes.openSeams.length).toBeGreaterThan(0);
    expect(index.outcomes.openSeams).toHaveLength(new Set([
      ...openCompilation.bindingCommandLowering.openSeams.map((seam) => seam.handle),
      ...openCompilation.compiledTemplate.openSeams.map((seam) => seam.handle),
    ]).size);
    expect(index.outcomes.attributionKind)
      .toBe(TemplateCompilerNormalizedOutcomeAttributionKind.PhaseGlobalOwnershipUnavailable);
    const openCommand = index.attributeSites.find((site) => site.syntax.command === 'open-command');
    expect(openCommand?.command?.lowering.state).toBe(BindingCommandLoweringState.Open);
    expect(openCommand?.outcomeRoute.bindingCommandLoweringAuthority)
      .toBe(openCompilation.bindingCommandLowering);
    expect(openCommand?.outcomeRoute.compiledTemplateAuthority)
      .toBe(openCompilation.compiledTemplate);
    expect(index.downstreamInstructions.state)
      .toBe(TemplateCompilerNormalizedDownstreamInstructionParityState.Mismatch);
  });

  test('keeps known-command nonbindable segments GraphExact and semantically Invalid', () => {
    const result = buildTemplateCompilerNormalizedSiteIndex(invalidCompilation);
    expect(result.state).toBe(TemplateCompilerNormalizedSiteIndexState.GraphExact);
    const index = result.index;
    if (index == null) throw new Error('Expected GraphExact invalid compiler products.');
    const invalid = index.attributeSites.find((site) =>
      site.multiBinding?.segments.some((segment) => segment.rawName === 'missing.bind')
    )?.multiBinding;
    const segment = invalid?.segments.find((candidate) => candidate.rawName === 'missing.bind');
    expect(invalid?.segments.map((candidate) => candidate.rawName)).toEqual([
      'value.bind',
      'missing.bind',
    ]);
    expect(segment?.bindable).toBeNull();
    expect(segment?.command?.name).toBe('bind');
    expect(invalid?.lowering.state).toBe(BindingCommandLoweringState.Invalid);
    expect(invalid?.lowering.instructionProductHandles).toEqual([]);
    expect(invalid?.segments.some((candidate) => candidate.rawValue === 'neverReached')).toBe(false);
    const staged = invalid?.commandLowerings.flatMap((lowering) => lowering.instructionProductHandles) ?? [];
    expect(staged.length).toBeGreaterThan(0);
    const invalidSite = index.attributeSites.find((site) => site.multiBinding === invalid);
    expect(invalidCompilation.compiledTemplate.instructions.some((instruction) =>
      instruction instanceof HydrateAttributeInstruction
      && instruction.attribute.productHandle === invalidSite?.attribute.productHandle
    )).toBe(false);
    expect(index.outcomes.issues.length).toBeGreaterThan(0);
    expect(index.outcomes.issues).toHaveLength(new Set([
      ...invalidCompilation.attributeClassification.issues.map((issue) => issue.productHandle),
      ...invalidCompilation.bindingCommandLowering.issues.map((issue) => issue.productHandle),
      ...invalidCompilation.compiledTemplate.issues.map((issue) => issue.productHandle),
    ]).size);
    expect(index.outcomes.attributionKind)
      .toBe(TemplateCompilerNormalizedOutcomeAttributionKind.PhaseGlobalOwnershipUnavailable);
  });

  test('stops at a closed-world unknown multi-binding command and publishes AUR0713', () => {
    const result = buildTemplateCompilerNormalizedSiteIndex(invalidCompilation);
    expect(result.state).toBe(TemplateCompilerNormalizedSiteIndexState.GraphExact);
    const index = result.index;
    if (index == null) throw new Error('Expected GraphExact invalid compiler products.');
    const site = index.attributeSites.find((candidate) =>
      candidate.multiBinding?.segments.some((segment) => segment.rawName === 'value.unknown-command')
    );
    const multi = site?.multiBinding;
    expect(multi?.segments.map((segment) => segment.rawName)).toEqual([
      'value.bind',
      'value.unknown-command',
    ]);
    expect(multi?.segments[1]).toMatchObject({
      bindable: expect.objectContaining({ definition: expect.objectContaining({ name: 'value' }) }),
      command: null,
    });
    expect(multi?.lowering.state).toBe(BindingCommandLoweringState.Invalid);
    expect(multi?.lowering.instructionProductHandles).toEqual([]);
    expect(multi?.segments.some((segment) => segment.rawValue === 'neverReached')).toBe(false);
    expect(invalidCompilation.bindingCommandLowering.issues).toContainEqual(expect.objectContaining({
      issueKind: TemplateCompilerIssueKind.UnknownBindingCommand,
      frameworkErrorCode: TemplateCompilerFrameworkErrorCode.CompilerUnknownBindingCommand,
    }));
    expect(invalidCompilation.compiledTemplate.instructions.some((instruction) =>
      instruction instanceof HydrateAttributeInstruction
      && instruction.attribute.productHandle === site?.attribute.productHandle
    )).toBe(false);
  });

  test('stops after a commanded segment parser failure without committing its instruction', () => {
    const result = buildTemplateCompilerNormalizedSiteIndex(invalidCompilation);
    expect(result.state).toBe(TemplateCompilerNormalizedSiteIndexState.GraphExact);
    const index = result.index;
    if (index == null) throw new Error('Expected GraphExact invalid compiler products.');
    const site = index.attributeSites.find((candidate) =>
      candidate.multiBinding?.segments.some((segment) => segment.rawValue === '#')
    );
    const multi = site?.multiBinding;
    expect(multi?.segments.map((segment) => [segment.rawName, segment.rawValue])).toEqual([
      ['value.bind', 'enabled'],
      ['value.bind', '#'],
    ]);
    expect(multi?.lowering.state).toBe(BindingCommandLoweringState.Invalid);
    expect(multi?.lowering.instructionProductHandles).toEqual([]);
    expect(multi?.commandLowerings.map((lowering) => lowering.state)).toEqual([
      BindingCommandLoweringState.Complete,
      BindingCommandLoweringState.Invalid,
    ]);
    expect(multi?.commandLowerings[1]?.instructionProductHandles).toEqual([]);
    expect(multi?.secondaryExpressionParses.some((parse) => parse.state === 'error')).toBe(true);
    expect(invalidCompilation.bindingCommandLowering.issues).toContainEqual(expect.objectContaining({
      issueKind: TemplateCompilerIssueKind.BindingCommandBuildInvalid,
    }));
    expect(invalidCompilation.compiledTemplate.instructions.some((instruction) =>
      instruction instanceof HydrateAttributeInstruction
      && instruction.attribute.productHandle === site?.attribute.productHandle
    )).toBe(false);
  });

  test('keeps downstream corruption in observational parity rather than authored GraphExact', () => {
    const createdSets = compilation.compiledTemplate.createdInstructions.filter(
      (instruction): instruction is SetPropertyInstruction => instruction instanceof SetPropertyInstruction,
    );
    const left = createdSets[0];
    const right = createdSets[1];
    if (left == null || right == null) throw new Error('Expected two created set-property outputs.');
    const swappedLeft = setPropertyWithOutput(left, right);
    const swappedRight = setPropertyWithOutput(right, left);
    const swappedCreated = compilation.compiledTemplate.createdInstructions.map((instruction) =>
      instruction === left ? swappedLeft : instruction === right ? swappedRight : instruction
    );
    const swappedAll = compilation.compiledTemplate.instructions.map((instruction) =>
      instruction === left ? swappedLeft : instruction === right ? swappedRight : instruction
    );
    const swapped = buildTemplateCompilerNormalizedSiteIndex(compilationWith(compilation, {
      compiledTemplate: compiledTemplateEmission(compilation, {
        instructions: swappedAll,
        createdInstructions: swappedCreated,
      }),
    }));
    expect(swapped.state).toBe(TemplateCompilerNormalizedSiteIndexState.GraphExact);
    expect(swapped.index?.downstreamInstructions.state)
      .toBe(TemplateCompilerNormalizedDownstreamInstructionParityState.Mismatch);
    expect(swapped.index?.downstreamInstructions.mismatches.map((mismatch) => mismatch.relation))
      .toContain('compiled-created-instruction/attribute');

    const normalized = compilation.bindingCommandLowering.instructions[0];
    if (normalized == null) throw new Error('Expected one normalized instruction.');
    const missingNormalized = buildTemplateCompilerNormalizedSiteIndex(compilationWith(compilation, {
      compiledTemplate: compiledTemplateEmission(compilation, {
        instructions: compilation.compiledTemplate.instructions.filter((instruction) =>
          instruction.productHandle !== normalized.productHandle
        ),
      }),
    }));
    expect(missingNormalized.state).toBe(TemplateCompilerNormalizedSiteIndexState.GraphExact);
    expect(missingNormalized.index?.downstreamInstructions.mismatches.map((mismatch) => mismatch.relation))
      .toContain('compiled-template/reverse-instruction-membership');

    const hydrate = compilation.compiledTemplate.createdInstructions.find(
      (instruction): instruction is HydrateElementInstruction => instruction instanceof HydrateElementInstruction,
    );
    const capturedCandidate = hydrate == null
      ? null
      : compilation.attributeSyntax.syntaxes.find((syntax) =>
          compilation.attributeClassification.classifications.some((classification) =>
            classification.syntaxProductHandle === syntax.productHandle
            && classification.ownerNode.productHandle === hydrate.node.productHandle
          )
        ) ?? null;
    if (hydrate == null || capturedCandidate == null) throw new Error('Expected hydrate-element and same-node syntax.');
    const malformedHydrate = new HydrateElementInstruction(
      hydrate.productHandle,
      hydrate.identityHandle,
      new HtmlNodeReference(
        hydrate.node.nodeKind,
        null,
        hydrate.node.productHandle,
        hydrate.node.addressHandle,
      ),
      hydrate.elementName,
      hydrate.resourceLookupName,
      hydrate.resource,
      hydrate.projections,
      hydrate.discardedProjectionContributors,
      hydrate.auSlotProcessContent,
      hydrate.bindableInstructionProductHandles,
      [capturedCandidate.productHandle, capturedCandidate.productHandle],
      hydrate.containerless,
      hydrate.sourceAddressHandle,
      hydrate.fieldProvenance,
    );
    const malformedCreated = compilation.compiledTemplate.createdInstructions.map((instruction) =>
      instruction === hydrate ? malformedHydrate : instruction
    );
    const malformedAll = compilation.compiledTemplate.instructions.map((instruction) =>
      instruction === hydrate ? malformedHydrate : instruction
    );
    const structural = buildTemplateCompilerNormalizedSiteIndex(compilationWith(compilation, {
      compiledTemplate: compiledTemplateEmission(compilation, {
        instructions: malformedAll,
        createdInstructions: malformedCreated,
      }),
    }));
    expect(structural.state).toBe(TemplateCompilerNormalizedSiteIndexState.GraphExact);
    expect(structural.index?.downstreamInstructions.mismatches.map((mismatch) => mismatch.mismatchKind))
      .toEqual(expect.arrayContaining([
        TemplateCompilerNormalizedSiteMismatchKind.DuplicateReference,
        TemplateCompilerNormalizedSiteMismatchKind.InstructionReferenceMismatch,
        TemplateCompilerNormalizedSiteMismatchKind.CrossReferenceMismatch,
      ]));
  });

  test('indexes text interpolation and the three-site repeat.for command graph exactly', () => {
    const result = buildTemplateCompilerNormalizedSiteIndex(repeatCompilation);
    expect(result.state).toBe(TemplateCompilerNormalizedSiteIndexState.GraphExact);
    const index = result.index;
    if (index == null) throw new Error('Expected a GraphExact repeat/text index.');
    const textSites = repeatCompilation.valueSites.sites.filter((site) =>
      site.siteKind === TemplateValueSiteKind.TextInterpolation
    );
    expect(index.textSites).toHaveLength(textSites.length);
    expect(index.textSites.every((bundle) =>
      index.siteForText(bundle.text.productHandle) === bundle
      && index.textForProduct(bundle.text.productHandle) === bundle.text
      && bundle.valueSite.node.productHandle === bundle.text.productHandle
      && bundle.valueSite.node.identityHandle === bundle.text.identityHandle
      && bundle.valueSite.node.addressHandle === bundle.text.sourceAddressHandle
      && bundle.valueSite.node.nodeKind === bundle.text.nodeKind
      && bundle.expressionParse.site.productHandle === bundle.valueSite.productHandle
    )).toBe(true);

    const repeat = index.attributeSites.find((site) =>
      site.syntax.rawName === 'repeat.for'
      && site.syntax.rawValue.includes('contextual.bind')
    );
    expect(repeat).toBeDefined();
    if (repeat?.primaryValueSite == null || repeat.command == null) {
      throw new Error('Expected the contextual repeat.for command bundle.');
    }
    expect([repeat.primaryValueSite, ...repeat.command.secondaryValueSites]).toHaveLength(3);
    expect(repeat.command.secondaryExpressionParses).toHaveLength(2);
    expect(repeat.command.instructions.map((instruction) => instruction.instructionKind)).toEqual([
      TemplateInstructionKind.MultiAttr,
      TemplateInstructionKind.MultiAttr,
      TemplateInstructionKind.IteratorBinding,
    ]);
    const iterator = repeat.command.instructions[2];
    expect(iterator).toBeInstanceOf(IteratorBindingInstruction);
    if (!(iterator instanceof IteratorBindingInstruction)) throw new Error('Expected repeat iterator instruction.');
    expect(iterator.tailInstructionProductHandles).toEqual(
      repeat.command.instructions.slice(0, 2).map((instruction) => instruction.productHandle),
    );
    expect(index.ownership.containment.filter((row) =>
      row.containerProductHandle === iterator.productHandle
    ).map((row) => row.productHandle)).toEqual(iterator.tailInstructionProductHandles);
    expect(repeat.command.instructions.every((instruction) =>
      index.ownership.ownerOf(instruction.productHandle)?.ownerProductHandle === repeat.command?.lowering.productHandle
    )).toBe(true);
    expect(index.downstreamInstructions.textOutputs.length).toBeGreaterThan(index.textSites.length);
    expect(index.downstreamInstructions.rows).toHaveLength(repeatCompilation.compiledTemplate.createdInstructions.length);
  });

  test('enforces selector-owned primary site presence and shape', () => {
    const required = compilation.valueSites.sites.find((site) =>
      site.siteKind === TemplateValueSiteKind.BindingCommandValue
    );
    if (required == null) throw new Error('Expected a required binding-command primary site.');
    const removed = buildTemplateCompilerNormalizedSiteIndex(compilationWith(compilation, {
      valueSites: valueSiteEmission(compilation, {
        sites: compilation.valueSites.sites.filter((site) => site !== required),
      }),
    }));
    expect(removed.state).toBe(TemplateCompilerNormalizedSiteIndexState.Mismatch);
    expect(removed.mismatches.map((mismatch) => mismatch.mismatchKind)).toContain(
      TemplateCompilerNormalizedSiteMismatchKind.PrimaryValueSiteCardinality,
    );

    const relabeled = valueSiteWith(required, { siteKind: TemplateValueSiteKind.BindableValue });
    const relabeledResult = buildTemplateCompilerNormalizedSiteIndex(compilationWith(compilation, {
      valueSites: valueSiteEmission(compilation, {
        sites: compilation.valueSites.sites.map((site) => site === required ? relabeled : site),
      }),
    }));
    expect(relabeledResult.state).toBe(TemplateCompilerNormalizedSiteIndexState.Mismatch);
    expect(relabeledResult.mismatches.map((mismatch) => mismatch.mismatchKind)).toContain(
      TemplateCompilerNormalizedSiteMismatchKind.CrossReferenceMismatch,
    );

    const rawCorrupt = valueSiteWith(required, { rawValue: `${required.rawValue}:corrupt` });
    const rawResult = buildTemplateCompilerNormalizedSiteIndex(compilationWith(compilation, {
      valueSites: valueSiteEmission(compilation, {
        sites: compilation.valueSites.sites.map((site) => site === required ? rawCorrupt : site),
      }),
    }));
    expect(rawResult.state).toBe(TemplateCompilerNormalizedSiteIndexState.Mismatch);
    expect(rawResult.mismatches.map((mismatch) => mismatch.mismatchKind)).toContain(
      TemplateCompilerNormalizedSiteMismatchKind.CrossReferenceMismatch,
    );

    if (required.syntax == null) throw new Error('Expected top-level syntax for required site.');
    const runtimeNameCorrupt = equivalentAttributeSyntax(required.syntax, { runtimeRawName: 'not-browser-normalized' });
    const runtimeNameSite = valueSiteWith(required, { syntax: runtimeNameCorrupt });
    const runtimeNameResult = buildTemplateCompilerNormalizedSiteIndex(compilationWith(compilation, {
      attributeSyntax: new AttributeSyntaxParseEmission(
        compilation.attributeSyntax.syntaxes.map((syntax) => syntax === required.syntax ? runtimeNameCorrupt : syntax),
        compilation.attributeSyntax.records,
      ),
      valueSites: valueSiteEmission(compilation, {
        sites: compilation.valueSites.sites.map((site) => site === required ? runtimeNameSite : site),
      }),
    }));
    expect(runtimeNameResult.state).toBe(TemplateCompilerNormalizedSiteIndexState.Mismatch);
    expect(runtimeNameResult.mismatches.map((mismatch) => mismatch.relation)).toContain(
      'top-level-syntax/scalars',
    );
  });

  test('rejects duplicate, foreign, and parse-less text interpolation products', () => {
    const textSite = repeatCompilation.valueSites.sites.find((site) =>
      site.siteKind === TemplateValueSiteKind.TextInterpolation
    );
    const foreignElement = repeatCompilation.html.nodes.find((node): node is HtmlElement => node instanceof HtmlElement);
    const textNode = repeatCompilation.html.nodes.find((node): node is HtmlText =>
      node instanceof HtmlText && node.productHandle === textSite?.node.productHandle
    );
    if (textSite == null || textNode == null || foreignElement == null) {
      throw new Error('Expected text and element products for falsification.');
    }

    const duplicateTextResult = buildTemplateCompilerNormalizedSiteIndex(compilationWith(repeatCompilation, {
      html: htmlEmission(repeatCompilation, {
        nodes: [...repeatCompilation.html.nodes, textNode],
      }),
    }));
    expect(duplicateTextResult.state).toBe(TemplateCompilerNormalizedSiteIndexState.Mismatch);
    expect(duplicateTextResult.mismatches.map((mismatch) => mismatch.mismatchKind)).toContain(
      TemplateCompilerNormalizedSiteMismatchKind.DuplicateProduct,
    );

    const foreign = valueSiteWithNode(textSite, foreignElement.toReference());
    const foreignResult = buildTemplateCompilerNormalizedSiteIndex(compilationWith(repeatCompilation, {
      valueSites: valueSiteEmission(repeatCompilation, {
        sites: repeatCompilation.valueSites.sites.map((site) => site === textSite ? foreign : site),
      }),
    }));
    expect(foreignResult.state).toBe(TemplateCompilerNormalizedSiteIndexState.Mismatch);
    expect(foreignResult.mismatches.map((mismatch) => mismatch.mismatchKind)).toEqual(expect.arrayContaining([
      TemplateCompilerNormalizedSiteMismatchKind.MissingReferencedProduct,
      TemplateCompilerNormalizedSiteMismatchKind.UnownedProduct,
    ]));

    const duplicateResult = buildTemplateCompilerNormalizedSiteIndex(compilationWith(repeatCompilation, {
      valueSites: valueSiteEmission(repeatCompilation, {
        sites: [...repeatCompilation.valueSites.sites, textSite],
      }),
    }));
    expect(duplicateResult.state).toBe(TemplateCompilerNormalizedSiteIndexState.Mismatch);
    expect(duplicateResult.mismatches.map((mismatch) => mismatch.mismatchKind)).toEqual(expect.arrayContaining([
      TemplateCompilerNormalizedSiteMismatchKind.DuplicateProduct,
      TemplateCompilerNormalizedSiteMismatchKind.TextValueSiteCardinality,
    ]));

    const parseLessResult = buildTemplateCompilerNormalizedSiteIndex(compilationWith(repeatCompilation, {
      valueSites: valueSiteEmission(repeatCompilation, {
        parses: repeatCompilation.valueSites.parses.filter((parse) =>
          parse.site.productHandle !== textSite.productHandle
        ),
      }),
    }));
    expect(parseLessResult.state).toBe(TemplateCompilerNormalizedSiteIndexState.Mismatch);
    expect(parseLessResult.mismatches.map((mismatch) => mismatch.mismatchKind)).toContain(
      TemplateCompilerNormalizedSiteMismatchKind.ExpressionParseCardinality,
    );
  });

  test('rejects shared attribute ownership and Frankenstein family authorities', () => {
    const elements = compilation.html.nodes.filter((node): node is HtmlElement => node instanceof HtmlElement);
    const sourceOwner = elements.find((element) => element.attributes.length > 0);
    const secondOwner = elements.find((element) => element !== sourceOwner);
    const sharedReference = sourceOwner?.attributes[0] ?? null;
    if (sourceOwner == null || secondOwner == null || sharedReference == null) {
      throw new Error('Expected two elements and one authored attribute reference.');
    }
    const sharedOwner = equivalentHtmlElement(secondOwner, {
      attributes: [...secondOwner.attributes, sharedReference],
    });
    const ownerResult = buildTemplateCompilerNormalizedSiteIndex(compilationWith(compilation, {
      html: htmlEmission(compilation, {
        nodes: compilation.html.nodes.map((node) => node === secondOwner ? sharedOwner : node),
      }),
    }));
    expect(ownerResult.state).toBe(TemplateCompilerNormalizedSiteIndexState.Mismatch);
    expect(ownerResult.mismatches.map((mismatch) => mismatch.mismatchKind)).toContain(
      TemplateCompilerNormalizedSiteMismatchKind.AttributeOwnerCardinality,
    );

    const frankenstein = buildTemplateCompilerNormalizedSiteIndex(compilationWith(compilation, {
      compilerWorld: openCompilation.compilerWorld,
      definition: openCompilation.definition,
    }));
    expect(frankenstein.state).toBe(TemplateCompilerNormalizedSiteIndexState.Mismatch);
    expect(frankenstein.mismatches.map((mismatch) => mismatch.mismatchKind)).toContain(
      TemplateCompilerNormalizedSiteMismatchKind.CompilationBasisMismatch,
    );
  });

  test('returns typed graph mismatches for missing and misordered phase products', () => {
    const missingSyntaxLowering = loweringEmission(compilation, {
      attributeSyntaxes: compilation.bindingCommandLowering.attributeSyntaxes.slice(1),
    });
    const missingSyntax = buildTemplateCompilerNormalizedSiteIndex(compilationWith(compilation, {
      bindingCommandLowering: missingSyntaxLowering,
    }));
    expect(missingSyntax.state).toBe(TemplateCompilerNormalizedSiteIndexState.Mismatch);
    expect(missingSyntax.index).toBeNull();
    expect(missingSyntax.mismatches.map((mismatch) => mismatch.mismatchKind)).toContain(
      TemplateCompilerNormalizedSiteMismatchKind.MissingReferencedProduct,
    );

    const ordered = compilation.bindingCommandLowering.multiBindingLowerings.find((lowering) =>
      lowering.segmentProductHandles.length > 1
    );
    if (ordered == null) throw new Error('Expected a multi-segment lowering in the fixture.');
    const reversed = new MultiBindingLowering(
      ordered.productHandle,
      ordered.identityHandle,
      ordered.site,
      ordered.state,
      [...ordered.segmentProductHandles].reverse(),
      ordered.instructionProductHandles,
      ordered.sourceAddressHandle,
      ordered.fieldProvenance,
    );
    const misordered = buildTemplateCompilerNormalizedSiteIndex(compilationWith(compilation, {
      bindingCommandLowering: loweringEmission(compilation, {
        multiBindingLowerings: compilation.bindingCommandLowering.multiBindingLowerings.map((lowering) =>
          lowering === ordered ? reversed : lowering
        ),
      }),
    }));
    expect(misordered.state).toBe(TemplateCompilerNormalizedSiteIndexState.Mismatch);
    expect(misordered.mismatches.map((mismatch) => mismatch.mismatchKind)).toContain(
      TemplateCompilerNormalizedSiteMismatchKind.MultiBindingSegmentOrderMismatch,
    );
  });

  test('rejects aliased segment syntax, reordered direct outputs, and duplicate command outputs', () => {
    const aggregate = compilation.bindingCommandLowering.multiBindingLowerings.find((lowering) =>
      lowering.segmentProductHandles.length > 1
    );
    if (aggregate == null) throw new Error('Expected a multi-segment aggregate.');
    const aggregateSegments = aggregate.segmentProductHandles.map((handle) =>
      compilation.bindingCommandLowering.multiBindingSegments.find((segment) => segment.productHandle === handle)
    );
    const first = aggregateSegments[0];
    const second = aggregateSegments[1];
    if (first == null || second == null) throw new Error('Expected two exact segment products.');
    const aliased = segmentWithSyntax(first, second.syntaxProductHandle);
    const aliasResult = buildTemplateCompilerNormalizedSiteIndex(compilationWith(compilation, {
      bindingCommandLowering: loweringEmission(compilation, {
        multiBindingSegments: compilation.bindingCommandLowering.multiBindingSegments.map((segment) =>
          segment === first ? aliased : segment
        ),
      }),
    }));
    expect(aliasResult.state).toBe(TemplateCompilerNormalizedSiteIndexState.Mismatch);
    expect(aliasResult.mismatches.map((mismatch) => mismatch.mismatchKind)).toEqual(expect.arrayContaining([
      TemplateCompilerNormalizedSiteMismatchKind.ExclusiveOwnershipConflict,
      TemplateCompilerNormalizedSiteMismatchKind.CrossReferenceMismatch,
    ]));
    const swappedFirst = segmentWithSyntax(first, second.syntaxProductHandle);
    const swappedSecond = segmentWithSyntax(second, first.syntaxProductHandle);
    const swappedResult = buildTemplateCompilerNormalizedSiteIndex(compilationWith(compilation, {
      bindingCommandLowering: loweringEmission(compilation, {
        multiBindingSegments: compilation.bindingCommandLowering.multiBindingSegments.map((segment) =>
          segment === first ? swappedFirst : segment === second ? swappedSecond : segment
        ),
      }),
    }));
    expect(swappedResult.state).toBe(TemplateCompilerNormalizedSiteIndexState.Mismatch);
    expect(swappedResult.mismatches.map((mismatch) => mismatch.mismatchKind)).toContain(
      TemplateCompilerNormalizedSiteMismatchKind.CrossReferenceMismatch,
    );
    const misbound = segmentWithBindable(first, second.bindable);
    const misboundResult = buildTemplateCompilerNormalizedSiteIndex(compilationWith(compilation, {
      bindingCommandLowering: loweringEmission(compilation, {
        multiBindingSegments: compilation.bindingCommandLowering.multiBindingSegments.map((segment) =>
          segment === first ? misbound : segment
        ),
      }),
    }));
    expect(misboundResult.state).toBe(TemplateCompilerNormalizedSiteIndexState.Mismatch);
    expect(misboundResult.mismatches.map((mismatch) => mismatch.mismatchKind)).toContain(
      TemplateCompilerNormalizedSiteMismatchKind.CrossReferenceMismatch,
    );
    const commandedSegment = compilation.bindingCommandLowering.multiBindingSegments.find((segment) =>
      segment.command != null
    );
    const commandedSyntax = commandedSegment == null
      ? null
      : compilation.bindingCommandLowering.attributeSyntaxes.find((syntax) =>
          syntax.productHandle === commandedSegment.syntaxProductHandle
        ) ?? null;
    if (commandedSegment == null || commandedSyntax == null) throw new Error('Expected commanded segment syntax.');
    const nullCommandSyntax = equivalentAttributeSyntax(commandedSyntax, { command: null });
    const nullCommandResult = buildTemplateCompilerNormalizedSiteIndex(compilationWith(compilation, {
      bindingCommandLowering: loweringEmission(compilation, {
        attributeSyntaxes: compilation.bindingCommandLowering.attributeSyntaxes.map((syntax) =>
          syntax === commandedSyntax ? nullCommandSyntax : syntax
        ),
        valueSites: compilation.bindingCommandLowering.valueSites.map((site) =>
          site.syntax === commandedSyntax ? valueSiteWith(site, { syntax: nullCommandSyntax }) : site
        ),
      }),
    }));
    expect(nullCommandResult.state).toBe(TemplateCompilerNormalizedSiteIndexState.Mismatch);
    expect(nullCommandResult.mismatches.map((mismatch) => mismatch.relation)).toContain(
      'multi-binding-segment/alignment',
    );

    const directAggregate = compilation.bindingCommandLowering.multiBindingLowerings.find((lowering) =>
      lowering.segmentProductHandles.length > 1
      && lowering.segmentProductHandles.every((handle) =>
        compilation.bindingCommandLowering.multiBindingSegments.find((segment) => segment.productHandle === handle)?.command == null
      )
    );
    if (directAggregate == null) throw new Error('Expected a plain multi-binding aggregate.');
    const reversedDirect = new MultiBindingLowering(
      directAggregate.productHandle,
      directAggregate.identityHandle,
      directAggregate.site,
      directAggregate.state,
      directAggregate.segmentProductHandles,
      [...directAggregate.instructionProductHandles].reverse(),
      directAggregate.sourceAddressHandle,
      directAggregate.fieldProvenance,
    );
    const reversedDirectResult = buildTemplateCompilerNormalizedSiteIndex(compilationWith(compilation, {
      bindingCommandLowering: loweringEmission(compilation, {
        multiBindingLowerings: compilation.bindingCommandLowering.multiBindingLowerings.map((lowering) =>
          lowering === directAggregate ? reversedDirect : lowering
        ),
      }),
    }));
    expect(reversedDirectResult.state).toBe(TemplateCompilerNormalizedSiteIndexState.Mismatch);
    expect(reversedDirectResult.mismatches.map((mismatch) => mismatch.mismatchKind)).toContain(
      TemplateCompilerNormalizedSiteMismatchKind.MultiBindingInstructionOrderMismatch,
    );
    const directInstruction = compilation.bindingCommandLowering.instructions.find((instruction) =>
      instruction.productHandle === directAggregate.instructionProductHandles[0]
    );
    if (directInstruction == null) throw new Error('Expected a direct multi-binding instruction.');
    const badDirect = instructionWithNode(directInstruction, new HtmlNodeReference(
      directInstruction.node.nodeKind,
      null,
      directInstruction.node.productHandle,
      directInstruction.node.addressHandle,
    ));
    const badDirectResult = buildTemplateCompilerNormalizedSiteIndex(compilationWith(compilation, {
      bindingCommandLowering: loweringEmission(compilation, {
        instructions: compilation.bindingCommandLowering.instructions.map((instruction) =>
          instruction === directInstruction ? badDirect : instruction
        ),
      }),
    }));
    expect(badDirectResult.state).toBe(TemplateCompilerNormalizedSiteIndexState.Mismatch);
    expect(badDirectResult.mismatches.map((mismatch) => mismatch.relation)).toContain(
      'plain-multi-binding-segment/instruction',
    );
    const deletedDirect = new MultiBindingLowering(
      directAggregate.productHandle,
      directAggregate.identityHandle,
      directAggregate.site,
      directAggregate.state,
      directAggregate.segmentProductHandles,
      directAggregate.instructionProductHandles.slice(1),
      directAggregate.sourceAddressHandle,
      directAggregate.fieldProvenance,
    );
    const deletedDirectResult = buildTemplateCompilerNormalizedSiteIndex(compilationWith(compilation, {
      bindingCommandLowering: loweringEmission(compilation, {
        multiBindingLowerings: compilation.bindingCommandLowering.multiBindingLowerings.map((lowering) =>
          lowering === directAggregate ? deletedDirect : lowering
        ),
      }),
    }));
    expect(deletedDirectResult.state).toBe(TemplateCompilerNormalizedSiteIndexState.Mismatch);
    expect(deletedDirectResult.mismatches.map((mismatch) => mismatch.mismatchKind)).toContain(
      TemplateCompilerNormalizedSiteMismatchKind.MultiBindingInstructionOrderMismatch,
    );

    const commandLowering = compilation.bindingCommandLowering.lowerings.find((lowering) =>
      lowering.instructionProductHandles.length > 0
    );
    if (commandLowering == null) throw new Error('Expected a command lowering with output.');
    const duplicatedCommand = new BindingCommandLowering(
      commandLowering.productHandle,
      commandLowering.identityHandle,
      commandLowering.command,
      commandLowering.inputProductHandle,
      commandLowering.state,
      commandLowering.message,
      commandLowering.frameworkErrorCode,
      [...commandLowering.instructionProductHandles, commandLowering.instructionProductHandles[0]!],
      commandLowering.sourceAddressHandle,
      commandLowering.fieldProvenance,
    );
    const duplicateResult = buildTemplateCompilerNormalizedSiteIndex(compilationWith(compilation, {
      bindingCommandLowering: loweringEmission(compilation, {
        lowerings: compilation.bindingCommandLowering.lowerings.map((lowering) =>
          lowering === commandLowering ? duplicatedCommand : lowering
        ),
      }),
    }));
    expect(duplicateResult.state).toBe(TemplateCompilerNormalizedSiteIndexState.Mismatch);
    expect(duplicateResult.mismatches.map((mismatch) => mismatch.mismatchKind)).toEqual(expect.arrayContaining([
      TemplateCompilerNormalizedSiteMismatchKind.DuplicateReference,
      TemplateCompilerNormalizedSiteMismatchKind.ExclusiveOwnershipConflict,
    ]));

    const secondarySite = compilation.bindingCommandLowering.valueSites[0];
    if (secondarySite?.syntax == null) throw new Error('Expected a secondary value site syntax.');
    const equivalentSyntax = equivalentAttributeSyntax(secondarySite.syntax);
    const nonIdenticalSite = valueSiteWith(secondarySite, { syntax: equivalentSyntax });
    const nonIdenticalResult = buildTemplateCompilerNormalizedSiteIndex(compilationWith(compilation, {
      bindingCommandLowering: loweringEmission(compilation, {
        valueSites: compilation.bindingCommandLowering.valueSites.map((site) =>
          site === secondarySite ? nonIdenticalSite : site
        ),
      }),
    }));
    expect(nonIdenticalResult.state).toBe(TemplateCompilerNormalizedSiteIndexState.Mismatch);
    expect(nonIdenticalResult.mismatches.map((mismatch) => mismatch.mismatchKind)).toContain(
      TemplateCompilerNormalizedSiteMismatchKind.CrossReferenceMismatch,
    );
  });

  test('uses producer claims for repeat expression roles and exact tail order', () => {
    const repeat = buildTemplateCompilerNormalizedSiteIndex(repeatCompilation).index?.attributeSites.find((site) =>
      site.syntax.rawName === 'repeat.for' && site.syntax.rawValue.includes('contextual.bind')
    );
    const iterator = repeat?.command?.instructions.find((instruction): instruction is IteratorBindingInstruction =>
      instruction instanceof IteratorBindingInstruction
    );
    const contextual = repeat?.command?.instructions.find((instruction): instruction is MultiAttrInstruction =>
      instruction instanceof MultiAttrInstruction && instruction.expressionProductHandle != null
    );
    if (iterator == null || contextual?.expressionProductHandle == null || iterator.iterableExpressionProductHandle == null) {
      throw new Error('Expected repeat iterator and contextual tail expression roles.');
    }

    const swappedIterator = iteratorWith(iterator, {
      iterableExpressionProductHandle: contextual.expressionProductHandle,
    });
    const swappedContextual = multiAttrWithExpression(contextual, iterator.iterableExpressionProductHandle);
    const swapped = buildTemplateCompilerNormalizedSiteIndex(compilationWith(repeatCompilation, {
      bindingCommandLowering: loweringEmission(repeatCompilation, {
        instructions: repeatCompilation.bindingCommandLowering.instructions.map((instruction) =>
          instruction === iterator
            ? swappedIterator
            : instruction === contextual
              ? swappedContextual
              : instruction
        ),
      }),
    }));
    expect(swapped.state).toBe(TemplateCompilerNormalizedSiteIndexState.Mismatch);
    expect(swapped.mismatches.map((mismatch) => mismatch.relation)).toContain(
      'instruction-expression/claims',
    );

    const reversedIterator = iteratorWith(iterator, {
      tailInstructionProductHandles: [...iterator.tailInstructionProductHandles].reverse(),
    });
    const reversed = buildTemplateCompilerNormalizedSiteIndex(compilationWith(repeatCompilation, {
      bindingCommandLowering: loweringEmission(repeatCompilation, {
        instructions: repeatCompilation.bindingCommandLowering.instructions.map((instruction) =>
          instruction === iterator ? reversedIterator : instruction
        ),
      }),
    }));
    expect(reversed.state).toBe(TemplateCompilerNormalizedSiteIndexState.Mismatch);
    expect(reversed.mismatches.map((mismatch) => mismatch.relation)).toContain(
      'iterator-instruction/tail-order',
    );
  });

  test('rejects missing segment source maps when the primary multi-binding source is exact', () => {
    const exact = buildTemplateCompilerNormalizedSiteIndex(compilation).index;
    const multi = exact?.attributeSites.map((site) => site.multiBinding).find((candidate) =>
      candidate != null
      && candidate.segments.length > 1
      && candidate.segments.every((segment) => segment.command == null)
    );
    if (multi == null) throw new Error('Expected a plain multi-binding bundle.');
    const segmentHandles = new Set(multi.segments.map((segment) => segment.productHandle));
    const instructionHandles = new Set(multi.instructions.map((instruction) => instruction.productHandle));
    const sourceUnmappedSegments = compilation.bindingCommandLowering.multiBindingSegments.map((segment) =>
      segmentHandles.has(segment.productHandle) ? segmentWithSource(segment, null) : segment
    );
    const sourceUnmappedInstructions = compilation.bindingCommandLowering.instructions.map((instruction) =>
      instructionHandles.has(instruction.productHandle) ? instructionWithSource(instruction, null) : instruction
    );
    const result = buildTemplateCompilerNormalizedSiteIndex(compilationWith(compilation, {
      bindingCommandLowering: loweringEmission(compilation, {
        multiBindingSegments: sourceUnmappedSegments,
        instructions: sourceUnmappedInstructions,
      }),
    }));
    expect(result.state).toBe(TemplateCompilerNormalizedSiteIndexState.Mismatch);
    expect(result.mismatches.map((mismatch) => mismatch.relation)).toContain(
      'multi-binding-segment/alignment',
    );
  });

  test('consumes ordered plain multi-binding outputs when the whole source basis is unmapped', () => {
    const exact = buildTemplateCompilerNormalizedSiteIndex(compilation).index;
    const bundle = exact?.attributeSites.find((site) =>
      site.primaryValueSite != null
      && site.multiBinding != null
      && site.multiBinding.segments.length > 1
      && site.multiBinding.segments.every((segment) => segment.command == null)
    );
    if (bundle?.primaryValueSite == null || bundle.multiBinding == null) {
      throw new Error('Expected a plain multi-binding source-unmapped seed.');
    }
    const primary = valueSiteWith(bundle.primaryValueSite, { sourceAddressHandle: null });
    const primaryReference = new TemplateValueSiteReference(
      primary.productHandle,
      primary.identityHandle,
      primary.siteKind,
      primary.entryFamily,
      null,
    );
    const segmentHandles = new Set(bundle.multiBinding.segments.map((segment) => segment.productHandle));
    const instructionHandles = new Set(bundle.multiBinding.instructions.map((instruction) => instruction.productHandle));
    const segments = compilation.bindingCommandLowering.multiBindingSegments.map((segment) =>
      segmentHandles.has(segment.productHandle)
        ? segmentWithSiteAndSource(segment, primaryReference, null)
        : segment
    );
    const aggregate = bundle.multiBinding.lowering;
    const unmappedAggregate = new MultiBindingLowering(
      aggregate.productHandle,
      aggregate.identityHandle,
      primaryReference,
      aggregate.state,
      aggregate.segmentProductHandles,
      aggregate.instructionProductHandles,
      null,
      aggregate.fieldProvenance,
    );
    const instructions = compilation.bindingCommandLowering.instructions.map((instruction) =>
      instructionHandles.has(instruction.productHandle) ? instructionWithSource(instruction, null) : instruction
    );
    const expectations = compilation.valueSites.expectations.map((decision) => {
      if (decision.ownerProductHandle !== bundle.classification.productHandle || decision.expectation == null) {
        return decision;
      }
      const expectation = decision.expectation;
      return new TemplateValueSiteExpectationDecision(
        decision.ownerKind,
        decision.ownerProductHandle,
        new TemplateValueSiteExpectation(
          expectation.siteKind,
          expectation.rawValue,
          expectation.entryFamily,
          expectation.node,
          expectation.attribute,
          expectation.syntax,
          expectation.classification,
          expectation.bindingCommand,
          expectation.bindable,
          null,
        ),
      );
    });
    const result = buildTemplateCompilerNormalizedSiteIndex(compilationWith(compilation, {
      valueSites: valueSiteEmission(compilation, {
        sites: compilation.valueSites.sites.map((site) => site === bundle.primaryValueSite ? primary : site),
        expectations,
      }),
      bindingCommandLowering: loweringEmission(compilation, {
        multiBindingSegments: segments,
        multiBindingLowerings: compilation.bindingCommandLowering.multiBindingLowerings.map((lowering) =>
          lowering === aggregate ? unmappedAggregate : lowering
        ),
        instructions,
      }),
    }));
    expect(result.state).toBe(TemplateCompilerNormalizedSiteIndexState.GraphExact);
  });

  test('rejects K-way segment syntax aliasing without grouped expansion', () => {
    const aggregate = compilation.bindingCommandLowering.multiBindingLowerings.find((lowering) =>
      lowering.segmentProductHandles.length > 1
    );
    const seed = aggregate == null
      ? null
      : compilation.bindingCommandLowering.multiBindingSegments.find((segment) =>
          segment.productHandle === aggregate.segmentProductHandles[0]
        ) ?? null;
    if (aggregate == null || seed == null) throw new Error('Expected an aggregate alias seed.');
    const handles = new KernelHandleFactory('normalized-site-alias-scaling');
    const aliases = Array.from({ length: 256 }, (_, index) => new MultiBindingSegment(
      handles.product(`segment:${index}`),
      handles.identity(`segment:${index}`),
      seed.site,
      seed.attribute,
      seed.syntaxProductHandle,
      seed.bindable,
      seed.command,
      index,
      seed.rawName,
      seed.rawValue,
      seed.targetSourceAddressHandle,
      seed.sourceAddressHandle,
      seed.fieldProvenance,
    ));
    const reads = { count: 0 };
    const aliasHandles = tracked(aliases.map((segment) => segment.productHandle), reads);
    const aliasAggregate = new MultiBindingLowering(
      aggregate.productHandle,
      aggregate.identityHandle,
      aggregate.site,
      aggregate.state,
      aliasHandles,
      aggregate.instructionProductHandles,
      aggregate.sourceAddressHandle,
      aggregate.fieldProvenance,
    );
    const replacedHandles = new Set(aggregate.segmentProductHandles);
    const malformed = compilationWith(compilation, {
      bindingCommandLowering: loweringEmission(compilation, {
        multiBindingSegments: [
          ...compilation.bindingCommandLowering.multiBindingSegments.filter((segment) =>
            !replacedHandles.has(segment.productHandle)
          ),
          ...aliases,
        ],
        multiBindingLowerings: compilation.bindingCommandLowering.multiBindingLowerings.map((lowering) =>
          lowering === aggregate ? aliasAggregate : lowering
        ),
      }),
    });
    reads.count = 0;
    const result = buildTemplateCompilerNormalizedSiteIndex(malformed);
    expect(result.state).toBe(TemplateCompilerNormalizedSiteIndexState.Mismatch);
    expect(result.mismatches.map((mismatch) => mismatch.mismatchKind)).toContain(
      TemplateCompilerNormalizedSiteMismatchKind.ExclusiveOwnershipConflict,
    );
    expect(reads.count).toBeLessThanOrEqual(aliasHandles.length * 6);
  });

  test('keeps malformed nested instruction edges linear', () => {
    const exact = buildTemplateCompilerNormalizedSiteIndex(repeatCompilation).index;
    const repeat = exact?.attributeSites.find((site) =>
      site.syntax.rawName === 'repeat.for' && site.syntax.rawValue.includes('contextual.bind')
    );
    const iterator = repeat?.command?.instructions.find((instruction): instruction is IteratorBindingInstruction =>
      instruction instanceof IteratorBindingInstruction
    );
    if (iterator == null) throw new Error('Expected a repeat iterator instruction.');
    const reads = { count: 0 };
    const repeatedTailHandles = tracked(
      Array.from({ length: 512 }, (_, index) =>
        iterator.tailInstructionProductHandles[index % iterator.tailInstructionProductHandles.length]!
      ),
      reads,
    );
    const malformedIterator = new IteratorBindingInstruction(
      iterator.productHandle,
      iterator.identityHandle,
      iterator.node,
      iterator.attribute,
      iterator.targetProperty,
      iterator.localNames,
      iterator.objectBindingSourceKeys,
      iterator.iterableExpressionProductHandle,
      repeatedTailHandles,
      iterator.sourceAddressHandle,
      iterator.fieldProvenance,
    );
    const malformedCompilation = compilationWith(repeatCompilation, {
      bindingCommandLowering: loweringEmission(repeatCompilation, {
        instructions: repeatCompilation.bindingCommandLowering.instructions.map((instruction) =>
          instruction.productHandle === iterator.productHandle ? malformedIterator : instruction
        ),
      }),
    });
    reads.count = 0;

    const result = buildTemplateCompilerNormalizedSiteIndex(malformedCompilation);
    expect(result.state).toBe(TemplateCompilerNormalizedSiteIndexState.Mismatch);
    expect(result.mismatches.map((mismatch) => mismatch.mismatchKind)).toContain(
      TemplateCompilerNormalizedSiteMismatchKind.DuplicateReference,
    );
    expect(reads.count).toBeLessThanOrEqual(repeatedTailHandles.length * 4);
  });

  test('reads each phase collection a constant number of times', () => {
    const reads = { count: 0 };
    const html = new HtmlParseEmission(
      compilation.html.draft,
      compilation.html.document,
      tracked(compilation.html.nodes, reads),
      tracked(compilation.html.attributes, reads),
      compilation.html.nodeDraftBindings,
      compilation.html.attributeDraftBindings,
      compilation.html.recoveries,
      compilation.html.records,
    );
    const attributeSyntax = new AttributeSyntaxParseEmission(
      tracked(compilation.attributeSyntax.syntaxes, reads),
      compilation.attributeSyntax.records,
    );
    const attributeClassification = new AttributeClassificationEmission(
      tracked(compilation.attributeClassification.classifications, reads),
      compilation.attributeClassification.issues,
      compilation.attributeClassification.records,
    );
    const valueSites = new TemplateValueSiteEmission(
      tracked(compilation.valueSites.sites, reads),
      tracked(compilation.valueSites.parses, reads),
      compilation.valueSites.records,
      compilation.valueSites.expectations,
    );
    const bindingCommandLowering = loweringEmission(compilation, {
      buildInputs: tracked(compilation.bindingCommandLowering.buildInputs, reads),
      lowerings: tracked(compilation.bindingCommandLowering.lowerings, reads),
      attributeSyntaxes: tracked(compilation.bindingCommandLowering.attributeSyntaxes, reads),
      multiBindingSegments: tracked(compilation.bindingCommandLowering.multiBindingSegments, reads),
      multiBindingLowerings: tracked(compilation.bindingCommandLowering.multiBindingLowerings, reads),
      instructions: tracked(compilation.bindingCommandLowering.instructions, reads),
      valueSites: tracked(compilation.bindingCommandLowering.valueSites, reads),
      expressionParses: tracked(compilation.bindingCommandLowering.expressionParses, reads),
    });
    const trackedCompilation = compilationWith(compilation, {
      html,
      attributeSyntax,
      attributeClassification,
      valueSites,
      bindingCommandLowering,
    });
    reads.count = 0;

    const result = buildTemplateCompilerNormalizedSiteIndex(trackedCompilation);
    expect(result.state).toBe(TemplateCompilerNormalizedSiteIndexState.GraphExact);
    const phaseRowCount = compilation.html.nodes.length
      + compilation.html.attributes.length
      + compilation.attributeSyntax.syntaxes.length
      + compilation.attributeClassification.classifications.length
      + compilation.valueSites.sites.length
      + compilation.valueSites.parses.length
      + compilation.bindingCommandLowering.buildInputs.length
      + compilation.bindingCommandLowering.lowerings.length
      + compilation.bindingCommandLowering.attributeSyntaxes.length
      + compilation.bindingCommandLowering.multiBindingSegments.length
      + compilation.bindingCommandLowering.multiBindingLowerings.length
      + compilation.bindingCommandLowering.instructions.length
      + compilation.bindingCommandLowering.valueSites.length
      + compilation.bindingCommandLowering.expressionParses.length;
    expect(reads.count).toBeLessThanOrEqual(phaseRowCount * 3);
  });
});
