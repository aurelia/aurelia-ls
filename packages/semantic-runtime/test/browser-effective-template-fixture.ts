import {
  SourceFileAddress,
  SourceFileRole,
  SourceLanguage,
  SourceSpanAddress,
  SourceSpanRole,
  TemplateAddress,
} from '../src/kernel/address.js';
import { ComputationLifecycleRegistry } from '../src/kernel/computation-lifecycle.js';
import { EvidenceKind, EvidenceRecord, EvidenceRole } from '../src/kernel/evidence.js';
import { TemplateIdentity, TemplatePhase } from '../src/kernel/identity.js';
import { MaterializedProduct } from '../src/kernel/materialization.js';
import { bindProductDetailEnvelope, requireProductDetailEnvelope } from '../src/kernel/product-details.js';
import { ProvenanceRecord } from '../src/kernel/provenance.js';
import { KernelPublicationPlan, publishProductDetail } from '../src/kernel/publication.js';
import { KernelStore, KernelStoreBatch } from '../src/kernel/store.js';
import { KernelVocabulary } from '../src/kernel/vocabulary.js';
import {
  BrowserEffectiveTemplateMaterializer,
  type BrowserEffectiveTemplateEmission,
} from '../src/template/browser-effective-template-materializer.js';
import { parseBrowserTemplateFragmentDraft } from '../src/template/browser-template-parser.js';
import { selectBrowserTemplateCompilerCarrier } from '../src/template/browser-template-selection.js';
import {
  TemplateCompilationUnitKind,
  TemplateSource,
  TemplateSourceKind,
} from '../src/template/compilation-unit.js';
import { HtmlParseMaterializer, type HtmlParseEmission } from '../src/template/html-parse-materializer.js';
import {
  TemplateFrontierKind,
  TemplateParseConsumer,
  TemplateParseContext,
  TemplateParseFrontier,
  TemplateRecoveryPolicy,
} from '../src/template/parse-context.js';
import { TemplateProductDetails } from '../src/template/product-details.js';

/** Shared broad browser-shape corpus for compiler-structure batches. */
export const browserEffectiveTemplateCases = [
  ['ordinary', '<section id="s"><h1>Hello</h1><!--c--><input disabled></section>'],
  ['implied-tbody', '<table><tr><td>x</td></tr></table>'],
  ['paragraph', '<p>a<div>b</div>c</p>'],
  ['foster', '<table><div>x</div><tr><td>y</td></tr>z</table>'],
  ['foster-merged', 'before<table>inside<tr><td>x</td></tr>after</table>'],
  ['nested-template', '<template data-x="1"><table><tr><td>x</td></tr></table><p>y</template>'],
  ['svg', '<svg viewbox="0 0 1 1"><foreignobject><DIV foo="bar"></DIV></foreignobject></svg>'],
  ['mathml', '<math><mtext><b>x</b></mtext><mi><mglyph></mglyph><i>y</i></mi></math>'],
  ['normalized', '<p title="a&amp;b">A\r\nB\rC &copy; &#x1F600; &notit; &nbsp;</p>'],
  ['text-modes', '<style>a<b>&amp;</style><textarea>a<b>&amp;</textarea>'],
  ['duplicates', '<div a="1" A="2" a="3" class="x" CLASS="y"></div>'],
  ['numeric-attribute', '<div a="x" 0="y" b="z"></div>'],
  ['noscript', '<noscript><b>x&copy;</b><!--c--></noscript><i>y</i>'],
  ['noscript-collision', '<noscript><b>x&amp;copy;</b><!--c--></noscript><i>y</i>'],
  ['adoption', '<p><b>1<i class="x">2</b>3</i>4</p>'],
  ['doctype-null', '<!DOCTYPE html><!--a--b--><div>\0x</div>'],
  ['customizable-select', '<select><button><selectedcontent></selectedcontent></button><option>one</option></select>'],
  ['empty', ''],
  ['text-only', 'plain text'],
  ['selected-comment-shield', 'x<!--c--><template><div>y</div></template><!--d-->z'],
  ['repeated-siblings', '<i></i><i></i><i></i>'],
  ['authored-marker-spellings', '<!--au--><!--au-start--><!--au-end-->'],
] as const;

export class BrowserEffectiveTemplateFixtureResult {
  constructor(
    readonly source: TemplateSource,
    readonly authoredHtml: HtmlParseEmission,
    readonly emission: BrowserEffectiveTemplateEmission,
  ) {}
}

/** Shared candidate-local fixture for browser-effective and compiler-occurrence contracts. */
export class BrowserEffectiveTemplateFixture {
  readonly store: KernelStore;
  readonly lifecycle: ComputationLifecycleRegistry;
  readonly run: ReturnType<ComputationLifecycleRegistry['begin']>;

  constructor(key: string) {
    this.store = new KernelStore(key);
    this.lifecycle = new ComputationLifecycleRegistry(this.store);
    this.run = this.lifecycle.begin({
      kind: 'browser-effective-template-fixture',
      reconciliationKey: key,
      summary: 'Browser-effective template fixture run.',
    });
  }

  parseAuthored(
    key: string,
    markup: string,
    retainDraftBindings: boolean,
  ): { readonly source: TemplateSource; readonly html: HtmlParseEmission } {
    const source = this.publishTemplateSource(key, markup);
    const parseContext = new TemplateParseContext(
      this.run.handles.product(`parse-context:${key}`),
      TemplateParseConsumer.Compilation,
      TemplateRecoveryPolicy.Recover,
      new TemplateParseFrontier(TemplateFrontierKind.None, null, null),
      source.sourceAddressHandle,
      [],
    );
    const html = new HtmlParseMaterializer(this.run).parse({
      localKey: `browser-materializer:${key}:authored`,
      templateSource: source,
      compilationUnit: {
        unitKind: TemplateCompilationUnitKind.CustomElement,
      },
      parseContext,
      retainDraftBindings,
    });
    return { source, html };
  }

  materialize(key: string, markup: string): BrowserEffectiveTemplateFixtureResult {
    const { source, html } = this.parseAuthored(key, markup, true);
    if (html.draft == null) throw new Error('Browser-effective fixture lost retained authored bindings.');
    const browser = parseBrowserTemplateFragmentDraft(markup);
    const carrierSelection = selectBrowserTemplateCompilerCarrier(browser.fragment);
    const emission = new BrowserEffectiveTemplateMaterializer(this.run).materialize({
      localKey: `browser-materializer:${key}`,
      sourceRevision: `test:${key}`,
      templateSource: source,
      authoredHtml: html,
      browser,
      carrierSelection,
    });
    return new BrowserEffectiveTemplateFixtureResult(source, html, emission);
  }

  dispose(): void {
    this.run.abort();
  }

  private publishTemplateSource(key: string, markup: string): TemplateSource {
    const fileHandle = this.run.handles.address(`source-file:${key}`);
    const sourceHandle = this.run.handles.address(`source-span:${key}`);
    const templateHandle = this.run.handles.address(`template:${key}`);
    const productHandle = this.run.handles.product(`template-source:${key}`);
    const identityHandle = this.run.handles.identity(`template-source:${key}`);
    const evidenceHandle = this.run.handles.evidence(`template-source:${key}`);
    const provenanceHandle = this.run.handles.provenance(`template-source:${key}`);
    const source = bindProductDetailEnvelope(new TemplateSource(
      productHandle,
      identityHandle,
      TemplateSourceKind.Markup,
      TemplatePhase.Authored,
      null,
      markup,
      null,
      templateHandle,
      sourceHandle,
      [],
    ), new MaterializedProduct(
      productHandle,
      KernelVocabulary.Template.Source.key,
      identityHandle,
      sourceHandle,
      provenanceHandle,
    ));
    this.run.publish(new KernelPublicationPlan(
      new KernelStoreBatch([
        new SourceFileAddress(fileHandle, 'test', `src/${key}.html`, SourceLanguage.Html, SourceFileRole.Template),
        new SourceSpanAddress(sourceHandle, fileHandle, 0, markup.length, SourceSpanRole.Range),
        new TemplateAddress(templateHandle, `template:${key}`, null, sourceHandle),
        new EvidenceRecord(
          evidenceHandle,
          EvidenceKind.SourceObservation,
          [EvidenceRole.Admission, EvidenceRole.TransformInput],
          'Test template source.',
          sourceHandle,
          identityHandle,
        ),
        new ProvenanceRecord(provenanceHandle, [evidenceHandle]),
        new TemplateIdentity(identityHandle, null, TemplatePhase.Authored, templateHandle),
        requireProductDetailEnvelope(source, 'template.source'),
      ], `template-source:${key}`),
      [publishProductDetail(TemplateProductDetails.Source, source.productHandle, source)],
    ));
    return source;
  }
}
