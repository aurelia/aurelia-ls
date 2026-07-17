import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, test } from 'vitest';

import { createSemanticRuntime } from '../src/api/runtime.js';
import { TemplateTypeSystemOverlayBuilder } from '../src/template/template-type-system-overlay.js';
import type { TypeSystemOverlaySource } from '../src/type-system/overlay.js';
import { TypeSystemProjectBuilder } from '../src/type-system/project.js';

describe('type-system overlay identity', () => {
  test('preserves full semantic identity through lossy generated filenames', async () => {
    const { app, runtime, resource } = await openFixture('filename');
    const builder = new TemplateTypeSystemOverlayBuilder(runtime.workspace.store, app.emission.typeSystem);
    const punctuationLeft = requiredOverlay(builder.build(resource, 'contract:overlay'));
    const punctuationRight = requiredOverlay(builder.build(resource, 'contract-overlay'));
    const sharedPrefix = 'contract:overlay:'.repeat(20);
    const longLeft = requiredOverlay(builder.build(resource, `${sharedPrefix}left`));
    const longRight = requiredOverlay(builder.build(resource, `${sharedPrefix}right`));

    expect(path.basename(punctuationLeft.fileName)).not.toBe(path.basename(punctuationRight.fileName));
    expect(path.basename(longLeft.fileName)).not.toBe(path.basename(longRight.fileName));
  }, 30_000);

  test('deduplicates equivalent overlays and rejects conflicting path or origin identities', async () => {
    const { app, runtime, resource } = await openFixture('admission');
    const source = requiredOverlay(
      new TemplateTypeSystemOverlayBuilder(runtime.workspace.store, app.emission.typeSystem)
        .build(resource, 'contract:overlay-admission'),
    );
    const equivalent: TypeSystemOverlaySource = {
      ...source,
      segments: source.segments.map((segment) => ({ ...segment })),
    };
    const projectBuilder = new TypeSystemProjectBuilder();
    const typeSystem = projectBuilder.build(app.project, app.emission.evaluation, {
      overlaySources: [source, equivalent],
    });

    expect(typeSystem.readOverlaySources().filter((candidate) => candidate.originKey === source.originKey))
      .toHaveLength(1);
    expect(() => projectBuilder.build(app.project, app.emission.evaluation, {
      overlaySources: [source, { ...source, text: `${source.text}\n` }],
    })).toThrow(/overlay path .* conflicting origins or generated content/u);
    expect(() => projectBuilder.build(app.project, app.emission.evaluation, {
      overlaySources: [source, { ...source, originKey: `${source.originKey}:other` }],
    })).toThrow(/overlay path .* conflicting origins or generated content/u);
    expect(() => projectBuilder.build(app.project, app.emission.evaluation, {
      overlaySources: [source, {
        ...source,
        fileName: source.fileName.replace(/\.ts$/u, '.other.ts'),
      }],
    })).toThrow(/overlay origin .* maps to both/u);
  }, 30_000);
});

async function openFixture(key: string) {
  const runtime = await createSemanticRuntime({
    workspaceRoot: fixturePath('router-configuration-root-ownership'),
    storeKey: `contract:type-system-overlay-identity:${key}`,
  });
  const app = await runtime.openApp({ includeAuthoringTemplates: true });
  const resource = app.emission.templates.resources.find((candidate) =>
    candidate.compilation.definition.name === 'first-router-root'
  );
  if (resource == null) {
    throw new Error('Expected first-router-root template resource.');
  }
  return { app, resource, runtime };
}

function requiredOverlay(
  emission: ReturnType<TemplateTypeSystemOverlayBuilder['build']>,
): TypeSystemOverlaySource {
  if (emission.overlaySource == null) {
    throw new Error('Expected generated template overlay source.');
  }
  return emission.overlaySource;
}

function fixturePath(name: string): string {
  const packageRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
  return path.join(packageRoot, 'fixtures/pressure', name);
}
