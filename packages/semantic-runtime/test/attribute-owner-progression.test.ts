import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { BindingMode } from '@aurelia/runtime-html';
import { describe, expect, test } from 'vitest';

import { createSemanticRuntime } from '../src/api/runtime.js';
import {
  TemplateCompilerAttributeOwnerProgressionDisposition,
  TemplateCompilerAttributeOwnerProgressionLaneKind,
  TemplateCompilerAttributeOwnerProgressionOpenReasonKind,
  TemplateCompilerAttributeOwnerProgressionState,
} from '../src/template/attribute-owner-progression.js';
import {
  TemplateCompilerReadKind,
  TemplateCompilerReadObservation,
} from '../src/template/compiler-read-view.js';
import {
  HtmlElement,
  htmlElementAttributeOwnersByElementProduct,
} from '../src/template/html-ir.js';
import {
  PropertyBindingInstruction,
  TemplateBindingMode,
} from '../src/template/instruction-ir.js';
import {
  buildTemplateCompilerNormalizedSiteIndex,
  TemplateCompilerNormalizedSiteIndexState,
} from '../src/template/template-compiler-normalized-site-index.js';

const packageRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));

describe('template compiler attribute-owner progression', () => {
  test('matches JIT contenteditable/textcontent binding-mode order and retains exact bundle authority', async () => {
    const runtime = await createSemanticRuntime({
      workspaceRoot: path.join(packageRoot, 'fixtures/pressure/attribute-owner-progression'),
      storeKey: 'contract:attribute-owner-progression',
    });
    try {
      const app = await runtime.openApp();
      const compilation = app.emission.templates.resources.find((resource) =>
        resource.compilation.definition.name === 'attribute-owner-progression-app'
      )?.compilation;
      if (compilation == null) throw new Error('Expected the attribute owner progression fixture compilation.');

      const owners = htmlElementAttributeOwnersByElementProduct(compilation.html.nodes, compilation.html.attributes);
      const elementById = (id: string): HtmlElement => {
        const owner = [...owners.values()].find((candidate) =>
          candidate.attributes.some((attribute) => attribute.rawName === 'id' && attribute.rawValue === id)
        );
        if (owner == null) throw new Error(`Expected element #${id}.`);
        return owner.element;
      };
      const bindingFor = (element: HtmlElement): PropertyBindingInstruction => {
        const instruction = compilation.bindingCommandLowering.instructions.find((candidate) =>
          candidate instanceof PropertyBindingInstruction
          && candidate.node.productHandle === element.productHandle
          && candidate.targetProperty === 'textContent'
        );
        if (!(instruction instanceof PropertyBindingInstruction)) {
          throw new Error(`Expected textContent binding for '${element.productHandle}'.`);
        }
        return instruction;
      };

      const removedFirst = elementById('removed-first');
      const bindingFirst = elementById('binding-first');
      expect(bindingFor(removedFirst).bindingMode).toBe(TemplateBindingMode.ToView);
      expect(bindingFor(bindingFirst).bindingMode).toBe(TemplateBindingMode.TwoWay);
      expect(BindingMode.toView).toBe(2);
      expect(BindingMode.twoWay).toBe(6);

      const progression = compilation.attributeOwnerProgression;
      const removedFirstOwner = owners.get(removedFirst.productHandle)!;
      const removedContenteditable = removedFirstOwner.attributes.find((attribute) =>
        attribute.rawName === 'contenteditable'
      )!;
      const removedTextcontent = removedFirstOwner.attributes.find((attribute) =>
        attribute.rawName === 'textcontent.bind'
      )!;
      expect(progression.siteForAttribute(removedContenteditable.productHandle)?.disposition)
        .toBe(TemplateCompilerAttributeOwnerProgressionDisposition.Removed);
      expect(progression.siteForAttribute(removedTextcontent.productHandle)?.ownerView?.hasAttribute('contenteditable'))
        .toBe(false);

      const openPredecessor = elementById('open-predecessor');
      const openOwner = owners.get(openPredecessor.productHandle)!;
      const openAttribute = openOwner.attributes.find((attribute) => attribute.rawName === 'value.delegate')!;
      const afterOpenAttribute = openOwner.attributes.find((attribute) => attribute.rawName === 'textcontent.bind')!;
      expect(progression.siteForAttribute(openAttribute.productHandle)?.disposition)
        .toBe(TemplateCompilerAttributeOwnerProgressionDisposition.Open);
      expect(progression.siteForAttribute(afterOpenAttribute.productHandle)).toMatchObject({
        state: TemplateCompilerAttributeOwnerProgressionState.Open,
        ownerView: null,
        disposition: TemplateCompilerAttributeOwnerProgressionDisposition.Open,
        openReason: {
          reasonKind: TemplateCompilerAttributeOwnerProgressionOpenReasonKind.SemanticPredecessorOpen,
          predecessorAttributeProductHandle: openAttribute.productHandle,
        },
      });
      expect(bindingFor(openPredecessor)).toBeInstanceOf(PropertyBindingInstruction);

      const rootTemplate = compilation.html.nodes.find((node): node is HtmlElement =>
        node instanceof HtmlElement && node.tagName === 'template'
      )!;
      const rootTemplateSite = owners.get(rootTemplate.productHandle)?.attributes[0];
      expect(progression.siteForAttribute(rootTemplateSite!.productHandle)?.laneKind)
        .toBe(TemplateCompilerAttributeOwnerProgressionLaneKind.OrdinaryElement);
      const letElement = compilation.html.nodes.find((node): node is HtmlElement =>
        node instanceof HtmlElement && node.tagName === 'let'
      )!;
      const letSite = owners.get(letElement.productHandle)?.attributes[0];
      expect(progression.siteForAttribute(letSite!.productHandle)).toMatchObject({
        laneKind: TemplateCompilerAttributeOwnerProgressionLaneKind.LetElementOpen,
        state: TemplateCompilerAttributeOwnerProgressionState.Open,
        disposition: TemplateCompilerAttributeOwnerProgressionDisposition.Open,
      });
      expect(compilation.bindingCommandLowering.lowerings.some((lowering) =>
        compilation.bindingCommandLowering.buildInputs.some((input) =>
          input.productHandle === lowering.inputProductHandle
          && input.attribute.productHandle === letSite?.productHandle
        )
      )).toBe(true);

      const surrogateCompilation = app.emission.templates.resources.find((resource) =>
        resource.compilation.definition.name === 'root-surrogate-owner-progression'
      )?.compilation;
      if (surrogateCompilation == null) throw new Error('Expected root-surrogate progression compilation.');
      const surrogateOwners = htmlElementAttributeOwnersByElementProduct(
        surrogateCompilation.html.nodes,
        surrogateCompilation.html.attributes,
      );
      const templates = surrogateCompilation.html.nodes.filter((node): node is HtmlElement =>
        node instanceof HtmlElement && node.tagName === 'template'
      );
      const surrogateRoot = templates.find((template) =>
        surrogateOwners.get(template.productHandle)?.attributes.some((attribute) => attribute.rawName === 'data-root.bind')
      )!;
      const nestedTemplate = templates.find((template) =>
        surrogateOwners.get(template.productHandle)?.attributes.some((attribute) => attribute.rawName === 'data-nested.bind')
      )!;
      const surrogateRootAttribute = surrogateOwners.get(surrogateRoot.productHandle)!.attributes[0]!;
      const nestedAttribute = surrogateOwners.get(nestedTemplate.productHandle)!.attributes[0]!;
      expect(surrogateCompilation.attributeOwnerProgression.siteForAttribute(surrogateRootAttribute.productHandle))
        .toMatchObject({
          laneKind: TemplateCompilerAttributeOwnerProgressionLaneKind.SurrogateOpen,
          state: TemplateCompilerAttributeOwnerProgressionState.Open,
          disposition: TemplateCompilerAttributeOwnerProgressionDisposition.Open,
        });
      expect(surrogateCompilation.attributeOwnerProgression.siteForAttribute(nestedAttribute.productHandle)?.laneKind)
        .toBe(TemplateCompilerAttributeOwnerProgressionLaneKind.OrdinaryElement);
      expect(surrogateCompilation.bindingCommandLowering.lowerings.some((lowering) =>
        surrogateCompilation.bindingCommandLowering.buildInputs.some((input) =>
          input.productHandle === lowering.inputProductHandle
          && input.attribute.productHandle === surrogateRootAttribute.productHandle
        )
      )).toBe(true);

      const graph = buildTemplateCompilerNormalizedSiteIndex(compilation);
      expect(graph.state).toBe(TemplateCompilerNormalizedSiteIndexState.GraphExact);
      expect(graph.index?.attributeSites.every((bundle) =>
        bundle.ownerProgressionSite === progression.siteForAttribute(bundle.attributeProductHandle)
      )).toBe(true);
    } finally {
      runtime.retireWorkspaceIncarnation();
    }
  });

  test('keeps 512-wide progressive views compact and mapper state keys constant-size', async () => {
    const parent = path.join(packageRoot, '.temp');
    await mkdir(parent, { recursive: true });
    const workspaceRoot = await mkdtemp(path.join(parent, 'attribute-owner-progression-wide-'));
    const sourceRoot = path.join(workspaceRoot, 'src');
    await mkdir(sourceRoot, { recursive: true });
    const attributes = Array.from({ length: 512 }, (_, index) => `data-${index}.bind="message"`).join(' ');
    await Promise.all([
      writeFile(path.join(workspaceRoot, 'tsconfig.json'), JSON.stringify({
        compilerOptions: { strict: true, rootDir: 'src', outDir: 'dist' },
        include: ['src/**/*.ts'],
      })),
      writeFile(path.join(sourceRoot, 'wide-app.html'), `<div ${attributes} textcontent.bind="message"></div>`),
      writeFile(path.join(sourceRoot, 'wide-app.ts'), [
        "import { customElement } from '@aurelia/runtime-html';",
        "import template from './wide-app.html';",
        "@customElement({ name: 'wide-app', template })",
        "export class WideApp { message = 'message'; }",
      ].join('\n')),
      writeFile(path.join(sourceRoot, 'main.ts'), [
        "import { Aurelia, StandardConfiguration } from '@aurelia/runtime-html';",
        "import { WideApp } from './wide-app';",
        "void new Aurelia().register(StandardConfiguration).app({ component: WideApp, host: document.body }).start();",
      ].join('\n')),
    ]);

    let runtime: Awaited<ReturnType<typeof createSemanticRuntime>> | null = null;
    try {
      runtime = await createSemanticRuntime({
        workspaceRoot,
        storeKey: 'contract:attribute-owner-progression-wide',
      });
      const app = await runtime.openApp();
      const compilation = app.emission.templates.resources.find((resource) =>
        resource.compilation.definition.name === 'wide-app'
      )?.compilation;
      if (compilation == null) throw new Error('Expected wide compilation.');
      const progression = compilation.attributeOwnerProgression;
      const sites = progression.readSites();
      expect(sites).toHaveLength(513);
      expect(sites.every((site) =>
        site.ownerView == null
        || (
          site.ownerView.attributes == null
          && site.ownerView.attributeStateKey.length < 160
        )
      )).toBe(true);
      expect(new Set(sites.flatMap((site) =>
        site.ownerView == null ? [] : [site.ownerView.attributeStateKey]
      )).size).toBe(513);
      const mapperReads = compilation.registeredReads.filter((read): read is TemplateCompilerReadObservation =>
        read instanceof TemplateCompilerReadObservation
        && read.readKind === TemplateCompilerReadKind.AttributeMapper
      );
      expect(mapperReads.length).toBeGreaterThanOrEqual(512);
      expect(Math.max(...mapperReads.map((read) => read.canonicalKey.length))).toBeLessThan(200);
      expect(Math.max(...mapperReads.map((read) => read.readKey.length))).toBeLessThan(400);
    } finally {
      runtime?.retireWorkspaceIncarnation();
      await rm(workspaceRoot, { recursive: true, force: true });
    }
  }, 30_000);
});
