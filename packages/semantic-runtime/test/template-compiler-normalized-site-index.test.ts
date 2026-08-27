import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { beforeAll, describe, expect, test } from 'vitest';

import { createSemanticRuntime } from '../src/api/runtime.js';
import { AttributeClassificationEmission } from '../src/template/attribute-classification-materializer.js';
import { AttributeSyntaxParseEmission } from '../src/template/attribute-syntax-materializer.js';
import { MultiBindingLowering } from '../src/template/binding-command-execution.js';
import { BindingCommandLoweringEmission } from '../src/template/binding-command-lowering-materializer.js';
import { HtmlParseEmission } from '../src/template/html-parse-materializer.js';
import {
  TemplateResourceCompilationEmission,
} from '../src/template/template-compilation-project-pass.js';
import {
  buildTemplateCompilerNormalizedSiteIndex,
  TemplateCompilerNormalizedSiteIndexState,
  TemplateCompilerNormalizedSiteMismatchKind,
} from '../src/template/template-compiler-normalized-site-index.js';
import { TemplateValueSiteEmission } from '../src/template/value-site-materializer.js';

const packageRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));

describe('template compiler normalized site index', () => {
  let compilation: TemplateResourceCompilationEmission;

  beforeAll(async () => {
    const fixtureRoot = path.join(packageRoot, 'fixtures/pressure/bindable-contracts-lab');
    const runtime = await createSemanticRuntime({
      workspaceRoot: fixtureRoot,
      storeKey: 'contract:template-compiler-normalized-site-index',
    });
    const app = await runtime.openApp();
    const resource = app.emission.templates.resources.find((candidate) =>
      candidate.compilation.definition.name === 'bindable-lab-app'
    );
    if (resource == null) throw new Error('Expected the bindable-contracts app compilation.');
    compilation = resource.compilation;
  }, 30_000);

  test('conserves every attribute-owned normalized product under the authored attribute identity', () => {
    const result = buildTemplateCompilerNormalizedSiteIndex(compilation);
    expect(result.state).toBe(TemplateCompilerNormalizedSiteIndexState.Exact);
    expect(result.mismatches).toEqual([]);
    const index = result.index;
    if (index == null) throw new Error('Expected an exact normalized site index.');
    const attributeValueSiteHandles = new Set(compilation.valueSites.sites.flatMap((site) =>
      site.attribute?.productHandle == null ? [] : [site.productHandle]
    ));

    expect(index.familyOwnerHandle).toBe(compilation.familyOwnerHandle);
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
      sites: compilation.html.attributes.length,
      topLevelSyntaxes: compilation.attributeSyntax.syntaxes.length,
      classifications: compilation.attributeClassification.classifications.length,
      commandBuildInputs: compilation.bindingCommandLowering.buildInputs.length,
      commandLowerings: compilation.bindingCommandLowering.lowerings.length,
      secondarySyntaxes: compilation.bindingCommandLowering.attributeSyntaxes.length,
      multiBindingSegments: compilation.bindingCommandLowering.multiBindingSegments.length,
      multiBindingLowerings: compilation.bindingCommandLowering.multiBindingLowerings.length,
      secondaryValueSites: compilation.bindingCommandLowering.valueSites.length,
      secondaryExpressionParses: compilation.bindingCommandLowering.expressionParses.length,
      instructions: compilation.bindingCommandLowering.instructions.length,
    });

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
    expect(result.state).toBe(TemplateCompilerNormalizedSiteIndexState.Exact);
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

interface CompilationOverrides {
  readonly html?: HtmlParseEmission;
  readonly attributeSyntax?: AttributeSyntaxParseEmission;
  readonly attributeClassification?: AttributeClassificationEmission;
  readonly valueSites?: TemplateValueSiteEmission;
  readonly bindingCommandLowering?: BindingCommandLoweringEmission;
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
