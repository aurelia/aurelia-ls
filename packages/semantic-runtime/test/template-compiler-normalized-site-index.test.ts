import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { beforeAll, describe, expect, test } from 'vitest';

import { createSemanticRuntime } from '../src/api/runtime.js';
import { bindProductDetailEnvelope, readProductDetailEnvelope } from '../src/kernel/product-details.js';
import { AttributeClassificationEmission } from '../src/template/attribute-classification-materializer.js';
import { AttributeSyntaxParseEmission } from '../src/template/attribute-syntax-materializer.js';
import { AttributeSyntax } from '../src/template/attribute-syntax.js';
import {
  BindingCommandLowering,
  BindingCommandLoweringState,
  MultiBindingLowering,
  MultiBindingSegment,
} from '../src/template/binding-command-execution.js';
import { BindingCommandLoweringEmission } from '../src/template/binding-command-lowering-materializer.js';
import { HtmlElement, HtmlNodeReference, HtmlText } from '../src/template/html-ir.js';
import { HtmlParseEmission } from '../src/template/html-parse-materializer.js';
import { IteratorBindingInstruction, TemplateInstructionKind } from '../src/template/instruction-ir.js';
import {
  TemplateResourceCompilationEmission,
} from '../src/template/template-compilation-project-pass.js';
import {
  buildTemplateCompilerNormalizedSiteIndex,
  TemplateCompilerNormalizedOutcomeAttributionKind,
  TemplateCompilerNormalizedSiteIndexState,
  TemplateCompilerNormalizedSiteMismatchKind,
} from '../src/template/template-compiler-normalized-site-index.js';
import { TemplateValueSite, TemplateValueSiteKind } from '../src/template/value-site.js';
import { TemplateValueSiteEmission } from '../src/template/value-site-materializer.js';

const packageRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));

describe('template compiler normalized site index', () => {
  let compilation: TemplateResourceCompilationEmission;
  let repeatCompilation: TemplateResourceCompilationEmission;
  let openCompilation: TemplateResourceCompilationEmission;

  beforeAll(async () => {
    [compilation, repeatCompilation, openCompilation] = await Promise.all([
      fixtureCompilation('bindable-contracts-lab', 'bindable-lab-app'),
      fixtureCompilation('template-controller-scope-lab', 'scope-lab-app'),
      fixtureCompilation('template-compiler-fidelity', 'template-compiler-fidelity-app'),
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
    expect(index.outcomes.issues).toBe(compilation.compiledTemplate.issues);
    expect(index.outcomes.openSeams).toBe(compilation.compiledTemplate.openSeams);
    expect(index.outcomes.attributionKind)
      .toBe(TemplateCompilerNormalizedOutcomeAttributionKind.NoPhaseGlobalOutcomes);
    expect(index.downstreamInstructions.rows.map((row) => row.instruction))
      .toEqual(compilation.compiledTemplate.createdInstructions);
    expect(index.downstreamInstructions.attributeOutputs).toHaveLength(13);
    expect(index.downstreamInstructions.textOutputs).toHaveLength(0);
    expect(index.downstreamInstructions.excludedStructuralOutputs).toHaveLength(9);
    expect(index.downstreamInstructions.attributeOutputs.every((row) => row.attributeSite != null)).toBe(true);

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

  test('keeps GraphExact distinct from phase-global semantic openness', () => {
    const result = buildTemplateCompilerNormalizedSiteIndex(openCompilation);
    expect(result.state).toBe(TemplateCompilerNormalizedSiteIndexState.GraphExact);
    const index = result.index;
    if (index == null) throw new Error('Expected GraphExact product structure with open semantic posture.');
    expect(index.outcomes.openSeams).toBe(openCompilation.compiledTemplate.openSeams);
    expect(index.outcomes.openSeams.length).toBeGreaterThan(0);
    expect(index.outcomes.attributionKind)
      .toBe(TemplateCompilerNormalizedOutcomeAttributionKind.PhaseGlobalOwnershipUnavailable);
    const openCommand = index.attributeSites.find((site) => site.syntax.command === 'open-command');
    expect(openCommand?.command?.lowering.state).toBe(BindingCommandLoweringState.Open);
    expect(openCommand?.outcomeRoute.bindingCommandLoweringAuthority)
      .toBe(openCompilation.bindingCommandLowering);
    expect(openCommand?.outcomeRoute.compiledTemplateAuthority)
      .toBe(openCompilation.compiledTemplate);
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
    expect(deletedDirectResult.mismatches.map((mismatch) => mismatch.mismatchKind)).toEqual(expect.arrayContaining([
      TemplateCompilerNormalizedSiteMismatchKind.MultiBindingGraphCardinality,
      TemplateCompilerNormalizedSiteMismatchKind.MultiBindingInstructionOrderMismatch,
    ]));

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

async function fixtureCompilation(
  fixtureName: string,
  definitionName: string,
): Promise<TemplateResourceCompilationEmission> {
  const runtime = await createSemanticRuntime({
    workspaceRoot: path.join(packageRoot, 'fixtures/pressure', fixtureName),
    storeKey: `contract:template-compiler-normalized-site-index:${fixtureName}`,
  });
  const app = await runtime.openApp();
  const resource = app.emission.templates.resources.find((candidate) =>
    candidate.compilation.definition.name === definitionName
  );
  if (resource == null) throw new Error(`Expected compilation '${definitionName}' in fixture '${fixtureName}'.`);
  return resource.compilation;
}

interface CompilationOverrides {
  readonly html?: HtmlParseEmission;
  readonly attributeSyntax?: AttributeSyntaxParseEmission;
  readonly attributeClassification?: AttributeClassificationEmission;
  readonly valueSites?: TemplateValueSiteEmission;
  readonly bindingCommandLowering?: BindingCommandLoweringEmission;
}

type ValueSiteEmissionOverrides = Partial<Pick<TemplateValueSiteEmission, 'sites' | 'parses'>>;

type HtmlEmissionOverrides = Partial<Pick<HtmlParseEmission, 'nodes' | 'attributes'>>;

function htmlEmission(
  compilation: TemplateResourceCompilationEmission,
  overrides: HtmlEmissionOverrides,
): HtmlParseEmission {
  return new HtmlParseEmission(
    compilation.html.draft,
    compilation.html.document,
    overrides.nodes ?? compilation.html.nodes,
    overrides.attributes ?? compilation.html.attributes,
    compilation.html.nodeDraftBindings,
    compilation.html.attributeDraftBindings,
    compilation.html.recoveries,
    compilation.html.records,
  );
}

function valueSiteEmission(
  compilation: TemplateResourceCompilationEmission,
  overrides: ValueSiteEmissionOverrides,
): TemplateValueSiteEmission {
  return new TemplateValueSiteEmission(
    overrides.sites ?? compilation.valueSites.sites,
    overrides.parses ?? compilation.valueSites.parses,
    compilation.valueSites.records,
  );
}

function valueSiteWithNode(site: TemplateValueSite, node: HtmlNodeReference): TemplateValueSite {
  return valueSiteWith(site, { node });
}

function valueSiteWith(
  site: TemplateValueSite,
  overrides: { readonly node?: HtmlNodeReference; readonly syntax?: AttributeSyntax },
): TemplateValueSite {
  const envelope = readProductDetailEnvelope(site);
  if (envelope == null) throw new Error('Expected the value-site product envelope.');
  return bindProductDetailEnvelope(new TemplateValueSite(
    site.siteKind,
    site.rawValue,
    site.entryFamily,
    overrides.node ?? site.node,
    site.attribute,
    overrides.syntax ?? site.syntax,
    site.classification,
    site.bindingCommand,
    site.bindable,
    site.fieldProvenance,
  ), envelope);
}

function equivalentAttributeSyntax(syntax: AttributeSyntax): AttributeSyntax {
  const envelope = readProductDetailEnvelope(syntax);
  if (envelope == null) throw new Error('Expected the attribute-syntax product envelope.');
  return bindProductDetailEnvelope(new AttributeSyntax(
    syntax.syntaxKind,
    syntax.rawName,
    syntax.runtimeRawName,
    syntax.nameSourceAddressHandle,
    syntax.rawValue,
    syntax.target,
    syntax.targetSourceAddressHandle,
    syntax.command,
    syntax.commandSourceAddressHandle,
    syntax.parts,
    syntax.patternParts,
    syntax.pattern,
    syntax.compiledPatternProductHandle,
    syntax.patternLiterals,
    syntax.attribute,
    syntax.fieldProvenance,
  ), envelope);
}

function segmentWithSyntax(
  segment: MultiBindingSegment,
  syntaxProductHandle: MultiBindingSegment['syntaxProductHandle'],
): MultiBindingSegment {
  return new MultiBindingSegment(
    segment.productHandle,
    segment.identityHandle,
    segment.site,
    segment.attribute,
    syntaxProductHandle,
    segment.bindable,
    segment.command,
    segment.segmentIndex,
    segment.rawName,
    segment.rawValue,
    segment.targetSourceAddressHandle,
    segment.sourceAddressHandle,
    segment.fieldProvenance,
  );
}

function segmentWithBindable(
  segment: MultiBindingSegment,
  bindable: MultiBindingSegment['bindable'],
): MultiBindingSegment {
  return new MultiBindingSegment(
    segment.productHandle,
    segment.identityHandle,
    segment.site,
    segment.attribute,
    segment.syntaxProductHandle,
    bindable,
    segment.command,
    segment.segmentIndex,
    segment.rawName,
    segment.rawValue,
    segment.targetSourceAddressHandle,
    segment.sourceAddressHandle,
    segment.fieldProvenance,
  );
}

function compilationWith(
  compilation: TemplateResourceCompilationEmission,
  overrides: CompilationOverrides,
): TemplateResourceCompilationEmission {
  return new TemplateResourceCompilationEmission(
    compilation.localKey,
    compilation.familyOwnerHandle,
    compilation.analysisContextProductHandle,
    compilation.appRootDefinitionProductHandle,
    compilation.parentCompilerWorld,
    compilation.compilerWorld,
    compilation.definition,
    compilation.unit,
    overrides.html ?? compilation.html,
    overrides.attributeSyntax ?? compilation.attributeSyntax,
    overrides.attributeClassification ?? compilation.attributeClassification,
    overrides.valueSites ?? compilation.valueSites,
    overrides.bindingCommandLowering ?? compilation.bindingCommandLowering,
    compilation.compiledTemplate,
    compilation.registeredReads,
  );
}

type LoweringEmissionOverrides = Partial<Pick<BindingCommandLoweringEmission,
  | 'buildInputs'
  | 'lowerings'
  | 'attributeSyntaxes'
  | 'multiBindingSegments'
  | 'multiBindingLowerings'
  | 'instructions'
  | 'valueSites'
  | 'expressionParses'
>>;

function loweringEmission(
  compilation: TemplateResourceCompilationEmission,
  overrides: LoweringEmissionOverrides,
): BindingCommandLoweringEmission {
  const lowering = compilation.bindingCommandLowering;
  return new BindingCommandLoweringEmission(
    overrides.buildInputs ?? lowering.buildInputs,
    overrides.lowerings ?? lowering.lowerings,
    lowering.issues,
    overrides.attributeSyntaxes ?? lowering.attributeSyntaxes,
    overrides.multiBindingSegments ?? lowering.multiBindingSegments,
    overrides.multiBindingLowerings ?? lowering.multiBindingLowerings,
    overrides.instructions ?? lowering.instructions,
    overrides.valueSites ?? lowering.valueSites,
    overrides.expressionParses ?? lowering.expressionParses,
    lowering.openSeams,
    lowering.records,
  );
}

function tracked<T>(values: readonly T[], reads: { count: number }): readonly T[] {
  return new Proxy(values, {
    get(target, property, receiver) {
      if (typeof property === 'string' && /^\d+$/u.test(property)) reads.count++;
      return Reflect.get(target, property, receiver);
    },
  });
}

function sortedHandles(handles: readonly string[]): readonly string[] {
  return [...handles].sort();
}
