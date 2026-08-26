import { describe, expect, test } from 'vitest';

import { TemplateNodeAddress } from '../src/kernel/address.js';
import { SemanticClaim } from '../src/kernel/claim.js';
import { TemplateNodeIdentity } from '../src/kernel/identity.js';
import { MaterializationRecord } from '../src/kernel/materialization.js';
import { OpenSeamReasonKind } from '../src/kernel/open-seam.js';
import { KernelVocabulary } from '../src/kernel/vocabulary.js';
import { HtmlIrNodeKind } from '../src/template/html-ir.js';
import { TemplateProductDetails } from '../src/template/product-details.js';
import { BrowserEffectiveTemplateElement } from '../src/template/template-structure.js';
import { TemplateStructureDerivationAuthority } from '../src/template/template-structure-derivation.js';
import { BrowserEffectiveTemplateFixture } from './browser-effective-template-fixture.js';

describe('browser-effective template materializer', () => {
  test('publishes browser structure, factory carriers, derivation hyperedges, and correspondence seams in one batch', () => {
    const fixture = new BrowserEffectiveTemplateFixture('browser-effective-template-materializer');
    const run = fixture.run;

    try {
      const { html: unretainedHtml } = fixture.parseAuthored('unretained', '<div></div>', false);
      expect(unretainedHtml.draft).toBeNull();
      expect(unretainedHtml.nodeDraftBindings).toEqual([]);
      expect(unretainedHtml.attributeDraftBindings).toEqual([]);

      const recovered = fixture.materialize(
        'recovered',
        '<!DOCTYPE html><p>a<div title.bind="x" TITLE.BIND="y">b</div>c</p>'
          + '<b><i title.bind="z">one</b>two</i>',
      ).emission;
      const selected = fixture.materialize(
        'selected',
        'x<!--c--><template><div title.bind="inside">y</div></template><!--d-->z',
      ).emission;

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
      fixture.dispose();
    }
  });
});
