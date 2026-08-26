import { describe, expect, test } from 'vitest';

import {
  SourceFileAddress,
  SourceFileRole,
  SourceLanguage,
  SourceSpanAddress,
  SourceSpanRole,
  TemplateAddress,
  TemplateNodeAddress,
} from '../src/kernel/address.js';
import { SemanticClaim } from '../src/kernel/claim.js';
import { ComputationLifecycleRegistry } from '../src/kernel/computation-lifecycle.js';
import { EvidenceKind, EvidenceRecord, EvidenceRole } from '../src/kernel/evidence.js';
import { TemplateIdentity, TemplateNodeIdentity, TemplatePhase } from '../src/kernel/identity.js';
import { MaterializationRecord, MaterializedProduct } from '../src/kernel/materialization.js';
import { OpenSeamReasonKind } from '../src/kernel/open-seam.js';
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
import { HtmlParseMaterializer } from '../src/template/html-parse-materializer.js';
import { HtmlIrNodeKind } from '../src/template/html-ir.js';
import {
  TemplateFrontierKind,
  TemplateParseConsumer,
  TemplateParseContext,
  TemplateParseFrontier,
  TemplateRecoveryPolicy,
} from '../src/template/parse-context.js';
import { TemplateProductDetails } from '../src/template/product-details.js';
import { BrowserEffectiveTemplateElement } from '../src/template/template-structure.js';
import { TemplateStructureDerivationAuthority } from '../src/template/template-structure-derivation.js';

describe('browser-effective template materializer', () => {
  test('publishes browser structure, factory carriers, derivation hyperedges, and correspondence seams in one batch', () => {
    const store = new KernelStore('browser-effective-template-materializer');
    const lifecycle = new ComputationLifecycleRegistry(store);
    const run = lifecycle.begin({
      kind: 'browser-effective-template-materializer-test',
      reconciliationKey: 'batch',
      summary: 'Browser-effective structural materializer batch.',
    });

    try {
      const unretainedSource = publishTemplateSource(run, 'unretained', '<div></div>');
      const unretainedHtml = parseAuthoredHtml(run, 'unretained', unretainedSource, false);
      expect(unretainedHtml.draft).toBeNull();
      expect(unretainedHtml.nodeDraftBindings).toEqual([]);
      expect(unretainedHtml.attributeDraftBindings).toEqual([]);

      const recovered = materializeCase(
        run,
        'recovered',
        '<!DOCTYPE html><p>a<div title.bind="x" TITLE.BIND="y">b</div>c</p>'
          + '<b><i title.bind="z">one</b>two</i>',
      );
      const selected = materializeCase(
        run,
        'selected',
        'x<!--c--><template><div title.bind="inside">y</div></template><!--d-->z',
      );

      expect(recovered.tree.compilerCarrier).toEqual(expect.objectContaining({ nodeKind: 'element' }));
      const generatedCarrier = recovered.nodes.find((node): node is BrowserEffectiveTemplateElement =>
        node instanceof BrowserEffectiveTemplateElement
        && node.productHandle === recovered.tree.compilerCarrier.productHandle
      );
      if (!(generatedCarrier instanceof BrowserEffectiveTemplateElement) || generatedCarrier.templateContent == null) {
        throw new Error('Expected a generated compiler carrier with explicit template content.');
      }
      expect(generatedCarrier.tagName).toBe('template');
      expect(generatedCarrier.sourceLocation).toBeNull();
      expect(generatedCarrier.templateContent.productHandle).toBe(recovered.tree.compilerContent.productHandle);
      expect(recovered.records.some((record) =>
        record instanceof SemanticClaim
        && record.subjectHandle === generatedCarrier.productHandle
        && record.predicateKey === KernelVocabulary.Template.HasStructuralTemplateContent.key
        && record.objectHandle === recovered.tree.compilerContent.productHandle
      )).toBe(true);
      expect(selected.tree.compilerCarrier.productHandle).toBe(selected.tree.authoredCarrier?.productHandle);
      expect(selected.tree.discardedInputNodes).toHaveLength(4);

      expect(recovered.nodes.filter((node) => node.nodeKind === HtmlIrNodeKind.Fragment).length).toBeGreaterThan(0);
      const nodeAddresses = recovered.nodes.map((node) => run.read(node.sourceAddressHandle!));
      expect(nodeAddresses.every((address) =>
        address instanceof TemplateNodeAddress && address.path.every(Number.isSafeInteger)
      )).toBe(true);
      const generatedAddress = run.read(generatedCarrier.sourceAddressHandle!);
      if (!(generatedAddress instanceof TemplateNodeAddress)) {
        throw new Error('Generated compiler carrier has no template-node address.');
      }
      expect(generatedAddress.authoredSourceHandle).toBeNull();
      expect(nodeAddresses.some((address) =>
        address instanceof TemplateNodeAddress && address.authoredSourceHandle != null
      )).toBe(true);
      const divergentOrigin = recovered.derivations.find((derivation) =>
        derivation.authority === TemplateStructureDerivationAuthority.HtmlTreeBuilder
        && derivation.inputs.length === 1
        && derivation.outputs.length === 1
        && derivation.inputs[0]?.segmentAddressHandle != null
        && derivation.inputs[0]?.segmentAddressHandle !== derivation.inputs[0]?.structure.addressHandle
      );
      const divergentOutput = recovered.nodes.find((node) =>
        node.productHandle === divergentOrigin?.outputs[0]?.structure.productHandle
      );
      const divergentAddress = divergentOutput == null ? null : run.read(divergentOutput.sourceAddressHandle!);
      if (!(divergentAddress instanceof TemplateNodeAddress)) {
        throw new Error('Divergent browser origin has no template-node address.');
      }
      expect(divergentAddress.authoredSourceHandle)
        .toBe(divergentOrigin?.inputs[0]?.segmentAddressHandle);

      expect(recovered.derivations).toEqual(expect.arrayContaining([
        expect.objectContaining({ authority: TemplateStructureDerivationAuthority.TemplateElementFactory, inputs: [], outputs: [expect.anything()] }),
        expect.objectContaining({ authority: TemplateStructureDerivationAuthority.HtmlTreeBuilder, inputs: [expect.anything()], outputs: [] }),
        expect.objectContaining({ authority: TemplateStructureDerivationAuthority.HtmlTreeBuilder, inputs: [expect.anything()], outputs: [expect.anything(), expect.anything()] }),
        expect.objectContaining({ authority: TemplateStructureDerivationAuthority.HtmlTreeBuilder, inputs: [], outputs: [expect.anything()] }),
      ]));
      expect(selected.derivations.filter((row) =>
        row.authority === TemplateStructureDerivationAuthority.TemplateElementFactory
        && row.inputs.length === 1
        && row.outputs.length === 0
      )).toHaveLength(4);
      expect(selected.derivations).toContainEqual(expect.objectContaining({
        authority: TemplateStructureDerivationAuthority.TemplateElementFactory,
        inputs: [expect.anything()],
        outputs: [expect.anything()],
      }));

      expect(recovered.openSeams.length).toBeGreaterThan(0);
      expect(recovered.openSeams.every((seam) =>
        seam.seamKindKey === KernelVocabulary.Template.OpenStructureCorrespondence.key
        && seam.reasonKinds.includes(OpenSeamReasonKind.TemplateStructureCorrespondenceOpen)
      )).toBe(true);
      const materialization = recovered.records.find((record) => record instanceof MaterializationRecord);
      expect(materialization?.productHandles).toEqual(expect.arrayContaining([
        recovered.tree.productHandle,
        ...recovered.nodes.map((node) => node.productHandle),
        ...recovered.attributes.map((attribute) => attribute.productHandle),
        ...recovered.derivations.map((derivation) => derivation.productHandle),
      ]));
      expect(materialization?.openSeamHandles).toEqual(recovered.openSeams.map((seam) => seam.handle));

      expect(run.readProductDetail(TemplateProductDetails.StructuralTree, recovered.tree.productHandle))
        .toBe(recovered.tree);
      for (const node of recovered.nodes) {
        expect(run.readProductDetail(TemplateProductDetails.StructuralNode, node.productHandle)).toBe(node);
      }
      const structuralNodeIdentities = recovered.records.filter((record): record is TemplateNodeIdentity =>
        record instanceof TemplateNodeIdentity
      );
      expect(structuralNodeIdentities).toHaveLength(recovered.nodes.length);
      expect(structuralNodeIdentities.every((identity) =>
        identity.templateHandle === recovered.tree.templateSource.identityHandle
      )).toBe(true);
      for (const derivation of recovered.derivations) {
        expect(run.readProductDetail(TemplateProductDetails.StructureDerivation, derivation.productHandle))
          .toBe(derivation);
      }
      expect(recovered.records.filter((record) => record.kind === 'semantic-claim').length)
        .toBeGreaterThan(recovered.nodes.length);
    } finally {
      run.abort();
    }
  });
});

function materializeCase(
  run: ReturnType<ComputationLifecycleRegistry['begin']>,
  key: string,
  markup: string,
): BrowserEffectiveTemplateEmission {
  const source = publishTemplateSource(run, key, markup);
  const authoredHtml = parseAuthoredHtml(run, key, source, true);
  if (authoredHtml.draft == null) throw new Error('Test requested retained authored bindings.');
  const browser = parseBrowserTemplateFragmentDraft(markup);
  const carrierSelection = selectBrowserTemplateCompilerCarrier(browser.fragment);
  return new BrowserEffectiveTemplateMaterializer(run).materialize({
    localKey: `browser-materializer:${key}`,
    sourceRevision: `test:${key}`,
    templateSource: source,
    authoredHtml,
    browser,
    carrierSelection,
  });
}

function parseAuthoredHtml(
  run: ReturnType<ComputationLifecycleRegistry['begin']>,
  key: string,
  source: TemplateSource,
  retainDraftBindings: boolean,
) {
  const parseContext = new TemplateParseContext(
    run.handles.product(`parse-context:${key}`),
    TemplateParseConsumer.Compilation,
    TemplateRecoveryPolicy.Recover,
    new TemplateParseFrontier(TemplateFrontierKind.None, null, null),
    source.sourceAddressHandle,
    [],
  );
  return new HtmlParseMaterializer(run).parse({
    localKey: `browser-materializer:${key}:authored`,
    templateSource: source,
    compilationUnit: {
      unitKind: TemplateCompilationUnitKind.CustomElement,
    },
    parseContext,
    retainDraftBindings,
  });
}

function publishTemplateSource(
  run: ReturnType<ComputationLifecycleRegistry['begin']>,
  key: string,
  markup: string,
): TemplateSource {
  const fileHandle = run.handles.address(`source-file:${key}`);
  const sourceHandle = run.handles.address(`source-span:${key}`);
  const templateHandle = run.handles.address(`template:${key}`);
  const productHandle = run.handles.product(`template-source:${key}`);
  const identityHandle = run.handles.identity(`template-source:${key}`);
  const evidenceHandle = run.handles.evidence(`template-source:${key}`);
  const provenanceHandle = run.handles.provenance(`template-source:${key}`);
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
  run.publish(new KernelPublicationPlan(
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
