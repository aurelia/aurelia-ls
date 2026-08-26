import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, test } from 'vitest';

import {
  createSemanticRuntime,
  type SemanticApp,
  type SemanticRuntime,
} from '../src/api/runtime.js';
import {
  NodeSemanticRuntimeProjectInputHost,
  SemanticRuntimeProjectInputAuthority,
} from '../src/kernel/project-input.js';
import {
  ComputationChildTransitionKind,
  type ComputationRead,
} from '../src/kernel/computation-lifecycle.js';
import { KernelPublicationDecisionKind } from '../src/kernel/publication.js';
import {
  TemplateCompilerHookKind,
  TemplateCompilerHookLane,
  TemplateCompilerHookMembershipState,
} from '../src/template/compiler-hook-world.js';
import {
  TemplateCompilerReadKind,
  TemplateCompilerReadObservation,
} from '../src/template/compiler-read-view.js';
import { TemplateProductDetails } from '../src/template/product-details.js';
import { TemplateCompilationLocus } from '../src/template/template-compilation-cohort.js';
import type { TemplateResourceCompilationEmission } from '../src/template/template-compilation-project-pass.js';
import { BrowserEffectiveTemplateMaterializer } from '../src/template/browser-effective-template-materializer.js';
import { parseBrowserTemplateFragmentDraft } from '../src/template/browser-template-parser.js';
import { selectBrowserTemplateCompilerCarrier } from '../src/template/browser-template-selection.js';
import {
  executeDeterministicTemplateCompiler,
  TemplateCompilerDeterministicExecutionReasonKind,
  TemplateCompilerDeterministicExecutionState,
} from '../src/template/template-compiler-deterministic-execution.js';
import { MutableProjectSourceOverlay } from './support/incremental-conformance.js';

const packageRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));

describe('compiler-hook world currentness', () => {
  test('replaces only the component hook fact when a cssModules dependency is added and removed', async () => {
    const workspaceRoot = await mkdtemp(path.join(packageRoot, '.compiler-hook-world-currentness-'));
    const mutableFileName = path.join(workspaceRoot, 'src/mutable-card.ts');
    const originalMutableSource = [
      "import { cssModules, customElement } from '@aurelia/runtime-html';",
      "import template from './mutable-card.html';",
      '',
      '@customElement({',
      "  name: 'mutable-card',",
      '  template,',
      '})',
      'export class MutableCard {}',
      '',
    ].join('\n');
    const changedMutableSource = originalMutableSource.replace(
      '  template,',
      [
        '  template,',
        "  dependencies: [cssModules({ mapped: 'mapped_hash' })],",
      ].join('\n'),
    );
    expect(changedMutableSource).not.toBe(originalMutableSource);

    const overlay = new MutableProjectSourceOverlay();
    const inputAuthority = new SemanticRuntimeProjectInputAuthority(
      new NodeSemanticRuntimeProjectInputHost(overlay),
    );
    let runtime: SemanticRuntime | null = null;
    try {
      await writeWorkspaceFiles(workspaceRoot, {
        'tsconfig.json': JSON.stringify({
          compilerOptions: {
            target: 'ES2022',
            module: 'ESNext',
            moduleResolution: 'Bundler',
            strict: true,
            skipLibCheck: true,
          },
          include: ['src/**/*.ts'],
        }),
        'src/mutable-card.ts': originalMutableSource,
        'src/mutable-card.html': '<div class="mapped">mutable</div>',
        'src/stable-card.ts': [
          "import { customElement } from '@aurelia/runtime-html';",
          '',
          "@customElement({ name: 'stable-card', template: '<div>stable</div>' })",
          'export class StableCard {}',
          '',
        ].join('\n'),
        'src/main.ts': [
          "import { Aurelia, customElement, StandardConfiguration } from '@aurelia/runtime-html';",
          "import { MutableCard } from './mutable-card.js';",
          "import { StableCard } from './stable-card.js';",
          '',
          '@customElement({',
          "  name: 'hook-currentness-app',",
          "  template: '<mutable-card></mutable-card><stable-card></stable-card>',",
          '  dependencies: [MutableCard, StableCard],',
          '})',
          'class HookCurrentnessApp {}',
          '',
          'new Aurelia()',
          '  .register(StandardConfiguration)',
          '  .app({ host: document.body, component: HookCurrentnessApp });',
          '',
        ].join('\n'),
      });
      runtime = await createSemanticRuntime({
        workspaceRoot,
        storeKey: `test:compiler-hook-world-currentness:${path.basename(workspaceRoot)}`,
        projectInputAuthority: inputAuthority,
      });

      const baseline = await runtime.openApp({
        analysisDepth: 'binding-observation',
        telemetry: { inquiryProfile: 'aot' },
      });
      const baselineRootHooks = requireRootHookSet(baseline);
      const baselineMutable = requireCompilation(baseline, 'mutable-card');
      const baselineStable = requireCompilation(baseline, 'stable-card');
      const baselineMutableRead = requireHookRead(baselineMutable);
      const baselineStableRead = requireHookRead(baselineStable);
      expect(baselineRootHooks.membershipState).toBe(TemplateCompilerHookMembershipState.ExactNone);
      expect(baselineMutable.compilerWorld.compilerHooks.membershipState)
        .toBe(TemplateCompilerHookMembershipState.ExactNone);
      expect(baselineStable.compilerWorld.compilerHooks.membershipState)
        .toBe(TemplateCompilerHookMembershipState.ExactNone);
      expect(baselineMutableRead.validate().isCurrent).toBe(true);
      expect(baselineStableRead.validate().isCurrent).toBe(true);

      overlay.write(mutableFileName, changedMutableSource);
      const changed = await reopenApp(runtime, inputAuthority, baseline);
      const changedRootHooks = requireRootHookSet(changed);
      const changedMutable = requireCompilation(changed, 'mutable-card');
      const changedStable = requireCompilation(changed, 'stable-card');
      const changedMutableRead = requireHookRead(changedMutable);
      const changedStableRead = requireHookRead(changedStable);

      expect(changedRootHooks.productHandle).toBe(baselineRootHooks.productHandle);
      expect(changedRootHooks.membershipState).toBe(TemplateCompilerHookMembershipState.ExactNone);
      expectCanonicalHookSet(runtime, changedRootHooks);
      expect(changedMutable.compilerWorld.compilerHooks).toMatchObject({
        membershipState: TemplateCompilerHookMembershipState.ExactList,
        entries: [{
          lane: TemplateCompilerHookLane.Leaf,
          sourceOrdinal: 0,
          hookKind: TemplateCompilerHookKind.CssModules,
        }],
        openReasons: [],
      });
      const changedMarkup = changedMutable.unit.templateSource.markup;
      if (changedMarkup == null || changedMutable.html.draft == null) {
        throw new Error('Expected changed mutable-card browser replay authority.');
      }
      const replayRun = runtime.computationLifecycle.begin({
        kind: 'compiler-hook-currentness-replay',
        reconciliationKey: 'compiler-hook-currentness-replay',
        summary: 'Exercise exact CSS Modules hook membership with provider execution still open.',
      });
      try {
        const browser = parseBrowserTemplateFragmentDraft(changedMarkup);
        const browserTemplate = new BrowserEffectiveTemplateMaterializer(replayRun).materialize({
          localKey: 'compiler-hook-currentness-replay:mutable-card',
          sourceRevision: changedMutable.definition.template?.authoredSourceRevision ?? 'test:mutable-card',
          templateSource: changedMutable.unit.templateSource,
          authoredHtml: changedMutable.html,
          browser,
          carrierSelection: selectBrowserTemplateCompilerCarrier(browser.fragment),
        });
        const replay = executeDeterministicTemplateCompiler({
          browserTemplate,
          compilation: changedMutable,
        });
        expect(replay.state).toBe(TemplateCompilerDeterministicExecutionState.Open);
        expect(replay.reasons.map((reason) => reason.reasonKind)).toContain(
          TemplateCompilerDeterministicExecutionReasonKind.CompilerHookProviderOpen,
        );
      } finally {
        replayRun.abort();
      }
      expect(changedStable.compilerWorld.compilerHooks.membershipState)
        .toBe(TemplateCompilerHookMembershipState.ExactNone);
      expect(changedMutableRead.observedRevision).not.toBe(baselineMutableRead.observedRevision);
      expect(changedStableRead.observedRevision).toBe(baselineStableRead.observedRevision);
      expect(changedMutableRead.validate().isCurrent).toBe(true);
      expect(changedStableRead.validate().isCurrent).toBe(true);
      expect(changedStable.compiledTemplate).toBe(baselineStable.compiledTemplate);
      expectFamilyTransition(
        runtime,
        changed,
        baselineMutable.familyOwnerHandle,
        ComputationChildTransitionKind.Withdrawn,
      );
      expectFamilyTransition(
        runtime,
        changed,
        changedMutable.familyOwnerHandle,
        ComputationChildTransitionKind.Executed,
      );
      expectFamilyTransition(
        runtime,
        changed,
        baselineStable.familyOwnerHandle,
        ComputationChildTransitionKind.Carried,
      );
      expectRetainedHookSetPublication(
        runtime,
        changed,
        baselineStable.compilerWorld.compilerHooks.productHandle,
      );

      overlay.write(mutableFileName, originalMutableSource);
      const restored = await reopenApp(runtime, inputAuthority, changed);
      const restoredRootHooks = requireRootHookSet(restored);
      const restoredMutable = requireCompilation(restored, 'mutable-card');
      const restoredStable = requireCompilation(restored, 'stable-card');
      const restoredMutableRead = requireHookRead(restoredMutable);
      const restoredStableRead = requireHookRead(restoredStable);

      expect(restoredRootHooks.productHandle).toBe(baselineRootHooks.productHandle);
      expect(restoredRootHooks.membershipState).toBe(TemplateCompilerHookMembershipState.ExactNone);
      expectCanonicalHookSet(runtime, restoredRootHooks);
      expect(restoredMutable.compilerWorld.compilerHooks.membershipState)
        .toBe(TemplateCompilerHookMembershipState.ExactNone);
      expect(restoredMutable.compilerWorld.compilerHooks.entries).toEqual([]);
      expect(restoredMutableRead.observedRevision).toBe(baselineMutableRead.observedRevision);
      expect(restoredMutableRead.observedRevision).not.toBe(changedMutableRead.observedRevision);
      expect(restoredMutableRead.validate().isCurrent).toBe(true);
      expect(restoredStableRead.observedRevision).toBe(baselineStableRead.observedRevision);
      expect(restoredStableRead.validate().isCurrent).toBe(true);
      expect(restoredStable.compiledTemplate).toBe(baselineStable.compiledTemplate);
      expectFamilyTransition(
        runtime,
        restored,
        changedMutable.familyOwnerHandle,
        ComputationChildTransitionKind.Withdrawn,
      );
      expectFamilyTransition(
        runtime,
        restored,
        restoredMutable.familyOwnerHandle,
        ComputationChildTransitionKind.Executed,
      );
      expectFamilyTransition(
        runtime,
        restored,
        changedStable.familyOwnerHandle,
        ComputationChildTransitionKind.Carried,
      );
    } finally {
      runtime?.clearAnalysisCache({ typeSystemDependencyCacheClearPolicy: 'preserve' });
      await rm(workspaceRoot, { recursive: true, force: true });
    }
  }, 30_000);
});

function requireCompilation(
  app: SemanticApp,
  name: string,
): TemplateResourceCompilationEmission {
  const compilation = app.emission.templates.resources.find((resource) =>
    resource.compilation.definition.name === name
  )?.compilation ?? null;
  if (compilation == null) throw new Error(`Expected template compilation '${name}'.`);
  return compilation;
}

function requireRootHookSet(app: SemanticApp) {
  const hooks = app.emission.appWorld.compilerWorlds[0]?.compilerHooks ?? null;
  if (hooks == null) throw new Error('Expected one app-root compiler-hook set.');
  return hooks;
}

function requireHookRead(
  compilation: TemplateResourceCompilationEmission,
): ComputationRead {
  const read = compilation.registeredReads.find((candidate) =>
    candidate instanceof TemplateCompilerReadObservation
      ? candidate.readKind === TemplateCompilerReadKind.CompilerHooks && candidate.canonicalKey === 'all'
      : candidate.domain === 'template-compiler' && candidate.readKey.includes('|compiler-hooks|all')
  ) ?? null;
  if (read == null) {
    throw new Error(
      `Expected compiler-hooks read for '${compilation.definition.name}'; observed ${compilation.registeredReads
        .map((candidate) => `${candidate.constructor.name}:${candidate.readKey}`)
        .join(', ')}.`,
    );
  }
  return read;
}

function expectFamilyTransition(
  runtime: SemanticRuntime,
  app: SemanticApp,
  ownerHandle: string,
  expected: ComputationChildTransitionKind,
): void {
  const locus = new TemplateCompilationLocus(app.project.projectKey, ownerHandle);
  const child = latestTransition(runtime, app).children.find((candidate) =>
    candidate.locus.kind === locus.kind
      && candidate.locus.reconciliationKey === locus.reconciliationKey
  ) ?? null;
  expect(child?.kind).toBe(expected);
}

function expectCanonicalHookSet(
  runtime: SemanticRuntime,
  hooks: ReturnType<typeof requireRootHookSet>,
): void {
  const canonical = runtime.workspace.store.productDetails.read(
    TemplateProductDetails.CompilerHookSet,
    hooks.productHandle,
  );
  expect(canonical).toStrictEqual(hooks);
  expect(canonical?.membershipState).toBe(TemplateCompilerHookMembershipState.ExactNone);
}

function expectRetainedHookSetPublication(
  runtime: SemanticRuntime,
  app: SemanticApp,
  productHandle: string,
): void {
  const decision = latestTransition(runtime, app).publications.find((publication) =>
    publication.handle === productHandle
      && publication.detailKind === TemplateProductDetails.CompilerHookSet.detailKind
  ) ?? null;
  expect(decision).not.toBeNull();
  expect(decision?.decision).toBe(KernelPublicationDecisionKind.Retain);
}

async function reopenApp(
  runtime: SemanticRuntime,
  inputAuthority: SemanticRuntimeProjectInputAuthority,
  previous: SemanticApp,
): Promise<SemanticApp> {
  inputAuthority.advance();
  return runtime.openApp({
    projectKey: previous.project.projectKey,
    analysisDepth: 'binding-observation',
    telemetry: { inquiryProfile: 'aot' },
  });
}

function latestTransition(runtime: SemanticRuntime, app: SemanticApp) {
  const generation = runtime.appAnalysisComputations.authorityFor(app.project.projectKey).current();
  const transition = generation == null
    ? null
    : runtime.computationLifecycle.readLatestTransition(generation.computationId);
  if (transition == null) throw new Error('Expected a committed app transition.');
  return transition;
}

async function writeWorkspaceFiles(
  root: string,
  files: Readonly<Record<string, string>>,
): Promise<void> {
  for (const [relativePath, contents] of Object.entries(files)) {
    const target = path.join(root, relativePath);
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, contents, 'utf8');
  }
}
