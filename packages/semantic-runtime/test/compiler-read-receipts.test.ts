import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, test } from 'vitest';

import { createSemanticRuntime } from '../src/api/runtime.js';
import {
  TemplateCompilerObservedValue,
  TemplateCompilerReadKind,
  TemplateCompilerReadView,
  TemplateCompilerWorldAuthority,
} from '../src/template/compiler-read-view.js';

const packageRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));

describe('template compiler observed values', () => {
  test('pairs compiler-service values with one canonical currentness observation', async () => {
    const runtime = await createSemanticRuntime({
      workspaceRoot: path.join(packageRoot, 'fixtures/pressure/attribute-owner-progression'),
      storeKey: 'contract:compiler-read-receipts',
    });
    try {
      const app = await runtime.openApp();
      const compilation = app.emission.templates.resources.find((resource) =>
        resource.compilation.definition.name === 'attribute-owner-progression-app'
      )?.compilation;
      if (compilation == null) throw new Error('Expected attribute-owner progression compilation.');
      const ownerView = compilation.attributeOwnerProgression.readSites().find((site) => site.ownerView != null)
        ?.ownerView ?? null;
      if (ownerView == null) throw new Error('Expected one exact progressive attribute owner view.');

      const reads = new TemplateCompilerReadView(
        runtime.workspace.store,
        TemplateCompilerWorldAuthority.fixed(compilation.compilerWorld),
      );
      const compilerWorldObservation = reads.readAll()[0]!;

      const element = reads.readElement('ROOT-SURROGATE-OWNER-PROGRESSION');
      const attribute = reads.readAttribute('if');
      const command = reads.readBindingCommand('bind');
      const parsed = reads.readParsedAttribute('textcontent.bind', 'message');
      const mapped = reads.readMappedAttribute(ownerView, 'textcontent');
      const twoWay = reads.readTwoWay(ownerView, 'textcontent');

      expect(element).toBeInstanceOf(TemplateCompilerObservedValue);
      expect(element.value?.resource?.name).toBe('root-surrogate-owner-progression');
      expect(attribute.value?.resource?.name).toBe('if');
      expect(command.value?.name).toBe('bind');
      expect(parsed.value.execution.target).toBe('textcontent');
      expect(mapped.value).toBe('textContent');
      expect(twoWay.value).toBe(true);

      expect(element.observation).toMatchObject({
        readKind: TemplateCompilerReadKind.ElementResource,
        canonicalKey: 'root-surrogate-owner-progression',
        compilerScopeIdentityHandle: compilation.compilerWorld.resourceScope.identityHandle,
      });
      expect(attribute.observation).toMatchObject({
        readKind: TemplateCompilerReadKind.AttributeResource,
        canonicalKey: 'if',
      });
      expect(command.observation).toMatchObject({
        readKind: TemplateCompilerReadKind.BindingCommand,
        canonicalKey: 'bind',
      });
      expect(parsed.observation.readKind).toBe(TemplateCompilerReadKind.AttributePattern);
      expect(mapped.observation.readKind).toBe(TemplateCompilerReadKind.AttributeMapper);
      expect(twoWay.observation.readKind).toBe(TemplateCompilerReadKind.AttributeMapper);
      expect(mapped.observation.canonicalKey).toContain(ownerView.attributeStateKey);
      expect(twoWay.observation.canonicalKey).toContain(ownerView.attributeStateKey);

      for (const receipt of [element, attribute, command, parsed, mapped, twoWay]) {
        expect(receipt.observation.closure).toBe(compilerWorldObservation.closure);
        expect(receipt.observation.validate().isCurrent).toBe(true);
        expect(reads.readAll()).toContain(receipt.observation);
      }

      expect(reads.readElement('root-surrogate-owner-progression').observation).toBe(element.observation);
      expect(reads.readAttribute('if').observation).toBe(attribute.observation);
      expect(reads.readBindingCommand('bind').observation).toBe(command.observation);
      expect(reads.readParsedAttribute('textcontent.bind', 'message').observation).toBe(parsed.observation);
      expect(reads.readMappedAttribute(ownerView, 'textcontent').observation).toBe(mapped.observation);
      expect(reads.readTwoWay(ownerView, 'textcontent').observation).toBe(twoWay.observation);

      expect(reads.element('root-surrogate-owner-progression')).toEqual(element.value);
      expect(reads.attribute('if')).toEqual(attribute.value);
      expect(reads.bindingCommand('bind')).toBe(command.value);
      expect(reads.parseAttribute('textcontent.bind', 'message')).toEqual(parsed.value);
      expect(reads.mapAttribute(ownerView, 'textcontent')).toBe(mapped.value);
      expect(reads.isTwoWay(ownerView, 'textcontent')).toBe(twoWay.value);

      expect(reads.readAll()).toHaveLength(7);
      expect(reads.readAll().filter((read) => read.readKind === TemplateCompilerReadKind.AttributeMapper))
        .toEqual([mapped.observation, twoWay.observation]);
    } finally {
      runtime.retireWorkspaceIncarnation();
    }
  }, 30_000);
});
