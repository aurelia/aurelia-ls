import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, test } from 'vitest';

import { createSemanticRuntime } from '../src/api/runtime.js';
import { SourceFileAddress, SourceFileRole, SourceLanguage } from '../src/kernel/address.js';
import { RuntimeExpressionIdentity } from '../src/kernel/identity.js';
import { MaterializationRecord } from '../src/kernel/materialization.js';
import { OpenSeam, OpenSeamReasonKind } from '../src/kernel/open-seam.js';
import { KernelStore, KernelStoreBatch } from '../src/kernel/store.js';
import { KernelVocabulary } from '../src/kernel/vocabulary.js';

const pressureFixtures = fileURLToPath(new URL('../fixtures/pressure', import.meta.url));

describe('open seam materialization ownership', () => {
  test('distinguishes failed product attempts from raw evaluator evidence', async () => {
    const serviceRoots = await analyzeFixture('service-root-v2-edges');
    const serviceRootSeams = seamsOfKind(
      serviceRoots,
      KernelVocabulary.Framework.OpenServiceRootCandidate.key,
    );
    expect(serviceRootSeams.length).toBeGreaterThan(0);
    for (const seam of serviceRootSeams) {
      const [materialization] = materializationsForSeam(serviceRoots, seam);
      expect(materialization).toBeDefined();
      expect(materialization?.productHandles).toEqual([]);
      expect(recordForHandle(serviceRoots, materialization!.ownerHandle)).toMatchObject({
        kind: 'source-span-address',
      });
    }

    const convention = await analyzeFixture('resource-conventions-dynamic');
    const [conventionSeam] = seamsOfKind(
      convention,
      KernelVocabulary.Resource.OpenConventionTransformAdmission.key,
    );
    expect(conventionSeam).toBeDefined();
    const [conventionMaterialization] = materializationsForSeam(convention, conventionSeam!);
    expect(conventionMaterialization?.productHandles).toEqual([]);
    expect(recordForHandle(convention, conventionMaterialization!.ownerHandle)).toMatchObject({
      kind: 'source-span-address',
    });

    const di = await analyzeFixture('di-open-registration-container');
    const targetlessDiSeams = seamsOfKind(di, KernelVocabulary.Di.OpenRegistrationSpending.key)
      .filter((seam) => seam.summary.includes('receiving container'));
    expect(targetlessDiSeams.length).toBeGreaterThan(0);
    for (const seam of targetlessDiSeams) {
      const [materialization] = materializationsForSeam(di, seam);
      expect(materialization?.productHandles).toEqual([]);
      expect(recordForHandle(di, materialization!.ownerHandle)).toMatchObject({
        kind: 'configuration-identity',
        productKindKey: KernelVocabulary.Configuration.Step.key,
      });
    }

    const binding = await analyzeFixture('template-native-target-precedence');
    const [targetAccessSeam] = seamsOfKind(binding, KernelVocabulary.Binding.OpenTargetAccess.key);
    expect(targetAccessSeam).toBeDefined();
    const [targetAccessMaterialization] = materializationsForSeam(binding, targetAccessSeam!);
    expect(targetAccessMaterialization).toBeDefined();
    expect(targetAccessMaterialization?.productHandles.map((handle) =>
      binding.readProduct(handle)?.productKindKey
    )).toContain(KernelVocabulary.Binding.TargetAccess.key);

    const rendering = await analyzeFixture('di-custom-template-compiler');
    const missingRendererSeams = seamsOfKind(rendering, KernelVocabulary.Instruction.OpenInstruction.key)
      .filter((seam) => seam.summary.includes('No configured runtime renderer'));
    expect(missingRendererSeams.length).toBeGreaterThan(0);
    for (const seam of missingRendererSeams) {
      const [materialization] = materializationsForSeam(rendering, seam);
      expect(materialization?.productHandles).toEqual([]);
      expect(recordForHandle(rendering, materialization!.ownerHandle)).toMatchObject({
        kind: 'instruction-identity',
        instructionKindKey: KernelVocabulary.Instruction.TextBinding.key,
      });
    }

    const evaluator = await analyzeFixture('evaluation-open-seam-sites');
    const evaluatorSeams = seamsOfKind(evaluator, KernelVocabulary.Evaluation.UnresolvedIdentifier.key);
    expect(evaluatorSeams.length).toBeGreaterThan(0);
    for (const seam of evaluatorSeams) {
      expect(materializationsForSeam(evaluator, seam)).toEqual([]);
    }
  });

  test('requires indexed owners and cited products, claims, and seams', () => {
    const valid = kernelMaterializationFixture('valid');
    expect(() => valid.store.commit(new KernelStoreBatch([
      valid.owner,
      valid.seam,
      valid.materialization,
    ], 'valid-materialization'))).not.toThrow();
    expect(valid.store.readMaterializationsByOwner(valid.owner.handle)).toEqual([valid.materialization]);

    for (const scenario of [
      {
        label: 'owner',
        records: (fixture: ReturnType<typeof kernelMaterializationFixture>) => [
          fixture.seam,
          fixture.materialization,
        ],
        message: 'Unknown owner',
      },
      {
        label: 'product',
        records: (fixture: ReturnType<typeof kernelMaterializationFixture>) => [
          fixture.owner,
          fixture.seam,
          new MaterializationRecord(
            fixture.materialization.handle,
            fixture.owner.handle,
            [fixture.store.handles.product('missing')],
            [],
            [fixture.seam.handle],
          ),
        ],
        message: 'Unknown product',
      },
      {
        label: 'claim',
        records: (fixture: ReturnType<typeof kernelMaterializationFixture>) => [
          fixture.owner,
          fixture.seam,
          new MaterializationRecord(
            fixture.materialization.handle,
            fixture.owner.handle,
            [],
            [fixture.store.handles.claim('missing')],
            [fixture.seam.handle],
          ),
        ],
        message: 'Unknown claim',
      },
      {
        label: 'open-seam',
        records: (fixture: ReturnType<typeof kernelMaterializationFixture>) => [
          fixture.owner,
          new MaterializationRecord(
            fixture.materialization.handle,
            fixture.owner.handle,
            [],
            [],
            [fixture.store.handles.openSeam('missing')],
          ),
        ],
        message: 'Unknown open seam',
      },
    ] as const) {
      const fixture = kernelMaterializationFixture(scenario.label);
      expect(() =>
        fixture.store.commit(new KernelStoreBatch(
          scenario.records(fixture),
          `invalid-materialization:${scenario.label}`,
        ))
      ).toThrow(scenario.message);
    }
  });

  test('rejects duplicate materialization memberships before publication', () => {
    for (const referenceKind of ['product', 'claim', 'open seam'] as const) {
      const fixture = kernelMaterializationFixture(`duplicate-${referenceKind}`);
      const productHandle = fixture.store.handles.product('duplicate');
      const claimHandle = fixture.store.handles.claim('duplicate');
      const seamHandle = fixture.seam.handle;
      const materialization = new MaterializationRecord(
        fixture.materialization.handle,
        fixture.owner.handle,
        referenceKind === 'product' ? [productHandle, productHandle] : [],
        referenceKind === 'claim' ? [claimHandle, claimHandle] : [],
        referenceKind === 'open seam' ? [seamHandle, seamHandle] : [seamHandle],
      );
      expect(() =>
        fixture.store.commit(new KernelStoreBatch(
          [fixture.owner, fixture.seam, materialization],
          `duplicate-materialization:${referenceKind}`,
        ))
      ).toThrow(`Duplicate ${referenceKind} reference`);
    }
  });

  test('indexes runtime expression identities admitted by the kernel record union', () => {
    const store = new KernelStore('runtime-expression-identity-index');
    const identity = new RuntimeExpressionIdentity(
      store.handles.identity('runtime-expression'),
      KernelVocabulary.RuntimeExpression.AccessUse.key,
      null,
    );
    store.commit(new KernelStoreBatch([identity], 'runtime-expression-identity'));
    expect(store.readIdentity(identity.handle)).toBe(identity);
    expect(store.read(identity.handle)).toBe(identity);
  });
});

function kernelMaterializationFixture(localKey: string) {
  const store = new KernelStore(`open-seam-materialization:${localKey}`);
  const owner = new SourceFileAddress(
    store.handles.address('owner'),
    'workspace',
    'src/app.ts',
    SourceLanguage.TypeScript,
    SourceFileRole.AppSource,
  );
  const seam = new OpenSeam(
    store.handles.openSeam('seam'),
    KernelVocabulary.Binding.OpenTargetAccess.key,
    'Observer selection remains open.',
    owner.handle,
    null,
    [OpenSeamReasonKind.BindingObserverSelectionOpen],
  );
  const materialization = new MaterializationRecord(
    store.handles.materialization('materialization'),
    owner.handle,
    [],
    [],
    [seam.handle],
  );
  return { store, owner, seam, materialization };
}

async function analyzeFixture(fixtureName: string): Promise<KernelStore> {
  const runtime = await createSemanticRuntime({
    workspaceRoot: path.join(pressureFixtures, fixtureName),
    storeKey: `test:open-seam-materialization:${fixtureName}`,
  });
  await runtime.openApp({ analysisDepth: 'binding-observation' });
  return runtime.workspace.store;
}

function seamsOfKind(
  store: KernelStore,
  seamKindKey: OpenSeam['seamKindKey'],
): readonly OpenSeam[] {
  return store.readOpenSeams().filter((seam) => seam.seamKindKey === seamKindKey);
}

function materializationsForSeam(store: KernelStore, seam: OpenSeam) {
  return store.readMaterializations().filter((materialization) =>
    materialization.openSeamHandles.includes(seam.handle)
  );
}

function recordForHandle(store: KernelStore, handle: string) {
  return store.readAllRecords().find((record) => record.handle === handle) ?? null;
}
