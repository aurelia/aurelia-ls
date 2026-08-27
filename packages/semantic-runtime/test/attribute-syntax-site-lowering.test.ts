import { describe, expect, test } from 'vitest';

import { SemanticClaim } from '../src/kernel/claim.js';
import { EvidenceRecord } from '../src/kernel/evidence.js';
import { KernelHandleFactory } from '../src/kernel/handles.js';
import { CompilerIdentity } from '../src/kernel/identity.js';
import {
  MaterializationRecord,
  MaterializedProduct,
} from '../src/kernel/materialization.js';
import {
  bindProductDetailEnvelope,
} from '../src/kernel/product-details.js';
import type {
  KernelPublicationContext,
  KernelPublicationPlan,
} from '../src/kernel/publication.js';
import { ProvenanceRecord } from '../src/kernel/provenance.js';
import { KernelVocabulary } from '../src/kernel/vocabulary.js';
import {
  AttributeParserParseResult,
  AttributePatternExecutionResult,
  type AttributeSyntax,
} from '../src/template/attribute-syntax.js';
import {
  type AuthoredAttributeSyntaxSiteEmission,
  AttributeSyntaxMaterializer,
} from '../src/template/attribute-syntax-materializer.js';
import {
  AttributeSyntaxParseInputKind,
  AttributeSyntaxSiteParseInput,
  parseAttributeSyntaxSite,
} from '../src/template/attribute-syntax-parsing.js';
import type { TemplateCompilerWorldEmission } from '../src/template/compiler-world-materializer.js';
import type {
  TemplateCompilerObservedValue,
  TemplateCompilerReadView,
} from '../src/template/compiler-read-view.js';
import type { TemplateCompilationUnit } from '../src/template/compilation-unit.js';
import {
  HtmlAttribute,
  HtmlElement,
  HtmlNamespaceKind,
} from '../src/template/html-ir.js';
import type { HtmlParseEmission } from '../src/template/html-parse-materializer.js';

class PublicationProbe {
  readonly handles = new KernelHandleFactory('contract:attribute-syntax-site-lowering');
  readonly plans: KernelPublicationPlan[] = [];
  readonly context = {
    handles: this.handles,
    read: () => null,
    publish: (plan: KernelPublicationPlan) => this.plans.push(plan),
  } as unknown as KernelPublicationContext;
}

class CompilerReadProbe {
  readonly calls: Array<readonly [rawName: string, rawValue: string]> = [];
  readonly observation = { readKey: 'attribute-syntax-probe' };

  constructor(
    private readonly executableProductHandle: ReturnType<KernelHandleFactory['product']>,
  ) {}

  readParsedAttribute(
    rawName: string,
    rawValue: string,
  ): TemplateCompilerObservedValue<AttributeParserParseResult> {
    this.calls.push([rawName, rawValue]);
    const execution = rawName.endsWith('.bind')
      ? AttributePatternExecutionResult.pattern(rawName, rawValue, rawName.slice(0, -5), 'bind')
      : AttributePatternExecutionResult.plain(rawName, rawValue);
    const parse = new ProbeAttributeParserParseResult(execution, rawName.endsWith('.bind')
      ? this.executableProductHandle
      : null);
    return {
      value: parse,
      observation: this.observation,
    } as unknown as TemplateCompilerObservedValue<AttributeParserParseResult>;
  }
}

class ProbeAttributeParserParseResult extends AttributeParserParseResult {
  constructor(
    execution: AttributePatternExecutionResult,
    private readonly executable: ReturnType<KernelHandleFactory['product']> | null,
  ) {
    super(null, null, execution);
  }

  override get executableProductHandle(): ReturnType<KernelHandleFactory['product']> | null {
    return this.executable;
  }
}

describe('attribute-syntax single-site lowering', () => {
  test('normalizes authored names once and spends the exact runtime parser input', () => {
    const reads = new CompilerReadProbe(new KernelHandleFactory('contract:attribute-syntax-law').product('bind'));
    const cases = [
      [
        AttributeSyntaxSiteParseInput.authored('VALUE.BIND', 'message', HtmlNamespaceKind.Html),
        'value.bind',
      ],
      [
        AttributeSyntaxSiteParseInput.authored('viewbox', '0 0 10 10', HtmlNamespaceKind.Svg),
        'viewBox',
      ],
      [
        AttributeSyntaxSiteParseInput.authored('definitionurl', 'schema', HtmlNamespaceKind.Math),
        'definitionURL',
      ],
    ] as const;

    for (const [input, runtimeRawName] of cases) {
      const result = parseAttributeSyntaxSite(reads, input);
      expect(result.input).toBe(input);
      expect(result.input.inputKind).toBe(AttributeSyntaxParseInputKind.Authored);
      expect(result.input.runtimeRawName).toBe(runtimeRawName);
      expect(result.parse.execution.rawName).toBe(runtimeRawName);
      expect(result.read.observation).toBe(reads.observation);
    }

    expect(reads.calls).toEqual([
      ['value.bind', 'message'],
      ['viewBox', '0 0 10 10'],
      ['definitionURL', 'schema'],
    ]);
  });

  test('does not reinterpret an exact live/runtime raw name', () => {
    const reads = new CompilerReadProbe(new KernelHandleFactory('contract:attribute-syntax-law').product('bind'));
    const input = AttributeSyntaxSiteParseInput.runtime('VALUE.BIND', 'message');
    const result = parseAttributeSyntaxSite(reads, input);

    expect(result.input.inputKind).toBe(AttributeSyntaxParseInputKind.Runtime);
    expect(result.input.rawName).toBe('VALUE.BIND');
    expect(result.input.runtimeRawName).toBe('VALUE.BIND');
    expect(result.parse.execution.rawName).toBe('VALUE.BIND');
    expect(reads.calls).toEqual([['VALUE.BIND', 'message']]);
  });

  test('keeps legacy batch and direct-site products, rows, claims, reads, and handles identical', () => {
    const fixture = loweringFixture();
    const legacyPublication = new PublicationProbe();
    const legacyReads = new CompilerReadProbe(legacyPublication.handles.product('binding-command:bind'));
    const legacy = new AttributeSyntaxMaterializer(legacyPublication.context).parse({
      localKey: fixture.localKey,
      compilationUnit: fixture.compilationUnit,
      html: fixture.html,
      compilerWorld: {} as TemplateCompilerWorldEmission,
      compilerReads: legacyReads as unknown as TemplateCompilerReadView,
    });
    expect(legacy.syntaxes.map((syntax) => [
      syntax.rawName,
      syntax.runtimeRawName,
      syntax.rawValue,
      syntax.target,
      syntax.command,
    ])).toEqual([
      ['VALUE.BIND', 'value.bind', 'message', 'value', 'bind'],
      ['definitionurl', 'definitionURL', 'https://example.test/schema', 'definitionURL', null],
    ]);

    const directPublication = new PublicationProbe();
    const directReads = new CompilerReadProbe(directPublication.handles.product('binding-command:bind'));
    const directMaterializer = new AttributeSyntaxMaterializer(directPublication.context);
    const session = directMaterializer.beginSession({
      localKey: fixture.localKey,
      compilationUnit: fixture.compilationUnit,
      compilerReads: directReads as unknown as TemplateCompilerReadView,
    });
    const sites: AuthoredAttributeSyntaxSiteEmission[] = [];
    fixture.attributes.forEach((attribute, index) => {
      sites.push(session.lowerAuthoredSite({
        localKey: `attribute-syntax:${fixture.localKey}:${index}`,
        attribute,
        namespace: fixture.namespaces[index],
      }));
    });
    expect(directPublication.plans).toHaveLength(0);
    const direct = session.finish();

    expect(direct.syntaxes.map(syntaxProjection)).toEqual(legacy.syntaxes.map(syntaxProjection));
    expect(direct.records).toEqual(legacy.records);
    expect(sites.flatMap((site) => site.claims)).toEqual(
      legacy.records.filter((record): record is SemanticClaim => record instanceof SemanticClaim),
    );
    expect(sites.flatMap((site) => site.records).filter((record) => record instanceof CompilerIdentity)).toEqual(
      legacy.records.filter((record) => record instanceof CompilerIdentity),
    );
    expect(directReads.calls).toEqual(legacyReads.calls);
    expect(directReads.calls).toEqual([
      ['value.bind', 'message'],
      ['definitionURL', 'https://example.test/schema'],
    ]);
    expect(direct.syntaxes.map((syntax) => [
      syntax.productHandle,
      syntax.identityHandle,
      syntax.sourceAddressHandle,
    ])).toEqual(legacy.syntaxes.map((syntax) => [
      syntax.productHandle,
      syntax.identityHandle,
      syntax.sourceAddressHandle,
    ]));
    expect(directPublication.plans[0]?.batch.records).toEqual(legacyPublication.plans[0]?.batch.records);
    expect(directPublication.plans[0]?.productDetails.map((detail) => detail.productHandle)).toEqual(
      legacyPublication.plans[0]?.productDetails.map((detail) => detail.productHandle),
    );
  });

  test('builds one owner index and publishes one run-owned source and final materialization', () => {
    const fixture = loweringFixture();
    const publication = new PublicationProbe();
    const reads = new CompilerReadProbe(publication.handles.product('binding-command:bind'));
    const emission = new AttributeSyntaxMaterializer(publication.context).parse({
      localKey: fixture.localKey,
      compilationUnit: fixture.compilationUnit,
      html: fixture.html,
      compilerWorld: {} as TemplateCompilerWorldEmission,
      compilerReads: reads as unknown as TemplateCompilerReadView,
    });

    expect(fixture.htmlAccesses()).toEqual({
      nodes: 1,
      attributes: 1,
      nodeIndexIterations: 1,
      attributeIndexMaps: 1,
    });
    expect(publication.plans).toHaveLength(1);
    expect(publication.plans[0]?.batch.label).toBe(`attribute-syntax:${fixture.localKey}`);
    expect(emission.records.filter((record) => record instanceof MaterializationRecord)).toHaveLength(1);
    expect(emission.records.filter((record) => record instanceof EvidenceRecord &&
      record.handle === publication.handles.evidence(`attribute-syntax:${fixture.localKey}`))).toHaveLength(1);
    expect(emission.records.filter((record) => record instanceof ProvenanceRecord &&
      record.handle === publication.handles.provenance(`attribute-syntax:${fixture.localKey}`))).toHaveLength(1);
  });
});

function loweringFixture(): {
  readonly localKey: string;
  readonly compilationUnit: TemplateCompilationUnit;
  readonly html: HtmlParseEmission;
  readonly attributes: readonly HtmlAttribute[];
  readonly namespaces: readonly HtmlNamespaceKind[];
  readonly htmlAccesses: () => {
    readonly nodes: number;
    readonly attributes: number;
    readonly nodeIndexIterations: number;
    readonly attributeIndexMaps: number;
  };
} {
  const handles = new KernelHandleFactory('contract:attribute-syntax-site-lowering');
  const provenanceHandle = handles.provenance('html-source');
  const value = materializedAttribute(handles, provenanceHandle, 'attribute:value', 'VALUE.BIND', 'message');
  const definitionUrl = materializedAttribute(
    handles,
    provenanceHandle,
    'attribute:definition-url',
    'definitionurl',
    'https://example.test/schema',
  );
  const htmlElement = materializedElement(
    handles,
    provenanceHandle,
    'element:input',
    'input',
    HtmlNamespaceKind.Html,
    [value],
  );
  const mathElement = materializedElement(
    handles,
    provenanceHandle,
    'element:annotation-xml',
    'annotation-xml',
    HtmlNamespaceKind.Math,
    [definitionUrl],
  );
  const attributes = [value, definitionUrl];
  const nodes = [htmlElement, mathElement];
  let nodeAccesses = 0;
  let attributeAccesses = 0;
  let nodeIndexIterations = 0;
  let attributeIndexMaps = 0;
  const indexedNodes = new Proxy(nodes, {
    get(target, property, receiver) {
      if (property === Symbol.iterator) nodeIndexIterations++;
      return Reflect.get(target, property, receiver);
    },
  });
  const indexedAttributes = new Proxy(attributes, {
    get(target, property, receiver) {
      if (property === 'map') attributeIndexMaps++;
      return Reflect.get(target, property, receiver);
    },
  });
  const html = {
    get nodes() {
      nodeAccesses++;
      return indexedNodes;
    },
    get attributes() {
      attributeAccesses++;
      return indexedAttributes;
    },
  } as HtmlParseEmission;
  return {
    localKey: 'component:attribute-syntax',
    compilationUnit: {
      identityHandle: handles.identity('compilation-unit'),
      sourceAddressHandle: null,
    } as TemplateCompilationUnit,
    html,
    attributes,
    namespaces: [HtmlNamespaceKind.Html, HtmlNamespaceKind.Math],
    htmlAccesses: () => ({
      nodes: nodeAccesses,
      attributes: attributeAccesses,
      nodeIndexIterations,
      attributeIndexMaps,
    }),
  };
}

function materializedAttribute(
  handles: KernelHandleFactory,
  provenanceHandle: ReturnType<KernelHandleFactory['provenance']>,
  localKey: string,
  rawName: string,
  rawValue: string,
): HtmlAttribute {
  return bindProductDetailEnvelope(new HtmlAttribute(
    rawName,
    rawValue,
    null,
    null,
  ), new MaterializedProduct(
    handles.product(localKey),
    KernelVocabulary.Template.HtmlAttribute.key,
    handles.identity(localKey),
    null,
    provenanceHandle,
  ));
}

function materializedElement(
  handles: KernelHandleFactory,
  provenanceHandle: ReturnType<KernelHandleFactory['provenance']>,
  localKey: string,
  tagName: string,
  namespace: HtmlNamespaceKind,
  attributes: readonly HtmlAttribute[],
): HtmlElement {
  return bindProductDetailEnvelope(new HtmlElement(
    tagName,
    namespace,
    attributes.map((attribute) => attribute.toReference()),
    [],
    false,
    null,
    null,
  ), new MaterializedProduct(
    handles.product(localKey),
    KernelVocabulary.Template.HtmlNode.key,
    handles.identity(localKey),
    null,
    provenanceHandle,
  ));
}

function syntaxProjection(syntax: AttributeSyntax): readonly unknown[] {
  return [
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
    syntax.productHandle,
    syntax.identityHandle,
    syntax.sourceAddressHandle,
  ];
}
