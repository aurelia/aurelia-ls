import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { emptyArray } from '@aurelia/kernel';
import { describe, expect, it } from 'vitest';

import {
  AOT_FRAMEWORK_LINK_MAP_POSTURE,
  AOT_FRAMEWORK_LINK_PROTOCOL,
  AOT_RC2_FRAMEWORK_LINK_EXPECTATIONS,
  AOT_RC2_FRAMEWORK_LINK_GRAPH_FINGERPRINT,
  AOT_RC2_FRAMEWORK_LINK_RECIPE_FINGERPRINT,
  AOT_RC2_LINK_MODULES_EXPECTATIONS,
  AOT_RC2_LINK_MODULES_GRAPH_FINGERPRINT,
  AotFrameworkLinkEmitter,
  type AotPrepareFrameworkLinkModule,
  type AotPrepareFrameworkLinksRequest,
} from '../src/framework-link.js';

const repositoryRoot = path.resolve(import.meta.dirname, '../../..');
const frameworkRoot = path.resolve(repositoryRoot, 'aurelia');
const graphFingerprint = AOT_RC2_FRAMEWORK_LINK_GRAPH_FINGERPRINT;

describe('RC2 framework link', () => {
  it('emits deterministic compiler/parser ABI facades and unchanged guards', async () => {
    const request = await exactRequest();
    const emitter = new AotFrameworkLinkEmitter();
    const result = await emitter.prepare(request, { state: 'admitted' });

    expect(result.disposition).toBe('applied');
    if (result.disposition !== 'applied') return;
    expect(result.recipeFingerprint).toBe(AOT_RC2_FRAMEWORK_LINK_RECIPE_FINGERPRINT);
    expect(result.recipeFingerprint).toMatch(/^[0-9a-f]{64}$/u);
    expect(result.modules.map((module) => module.packageName)).toEqual([
      '@aurelia/expression-parser',
      '@aurelia/template-compiler',
    ]);
    expect(result.modules.every((module) => module.map === null)).toBe(true);

    const expressionParser = result.modules[0]!;
    expect(expressionParser.code).toContain("DI.createInterface('IExpressionParser')");
    expect(expressionParser.code).toContain('createAccessScopeExpression');
    expect(expressionParser.code).not.toContain('Infinity NaN isFinite');
    expect(expressionParser.linkedSha256).toBe(digest(expressionParser.code));

    const templateCompiler = result.modules[1]!;
    expect(templateCompiler.code).toContain("DI.createInterface('ITemplateCompiler')");
    expect(templateCompiler.code).toContain('export const itHydrateElement = 0;');
    expect(templateCompiler.code).toContain('export class AttrSyntax');
    expect(templateCompiler.code).toContain("unsupportedCompilerSurface('AttributePattern registration')");
    expect(templateCompiler.code).toContain("unsupportedCompilerSurface('BindingCommand.define')");
    expect(templateCompiler.code).not.toContain('compileSpread(');
    expect(templateCompiler.linkedSha256).toBe(digest(templateCompiler.code));

    expect(result.modules[0]!.inputSha256).toBe(request.modules[0]!.observedSha256);
    expect(result.modules[1]!.inputSha256).toBe(request.modules[1]!.observedSha256);
  });

  it('canonicalizes module order before emission', async () => {
    const request = await exactRequest();
    const emitter = new AotFrameworkLinkEmitter();
    const forward = await emitter.prepare(request, { state: 'admitted' });
    const reversed = await emitter.prepare({ ...request, modules: [...request.modules].reverse() }, { state: 'admitted' });

    expect(reversed).toEqual(forward);
  });

  it('preserves the framework emptyArray identity for empty interpolation expressions', async () => {
    const result = await new AotFrameworkLinkEmitter().prepare(await exactRequest(), { state: 'admitted' });
    expect(result.disposition).toBe('applied');
    if (result.disposition !== 'applied') return;
    const expressionParser = result.modules.find((module) =>
      module.packageName === '@aurelia/expression-parser'
    )!;
    expect(expressionParser.code).toContain("import { DI, emptyArray } from '@aurelia/kernel';");
    expect(expressionParser.code).toContain('createInterpolation(parts, expressions = emptyArray)');

    const createInterpolation = evaluateCreateInterpolation(expressionParser.code);
    const parts = ['before', 'after'];
    const interpolation = createInterpolation(parts);
    expect(interpolation).toEqual({
      $kind: 'Interpolation',
      isMulti: false,
      firstExpression: undefined,
      parts,
      expressions: emptyArray,
    });
    expect(interpolation.expressions).toBe(emptyArray);
    expect(Object.isFrozen(interpolation.expressions)).toBe(true);
  });

  it('returns typed C0 fallbacks for valid but unadmitted, mapped, or drifted inputs', async () => {
    const request = await exactRequest();
    const emitter = new AotFrameworkLinkEmitter();
    expect(await emitter.prepare(request, {
      state: 'c0-fallback',
      reasonKind: 'semantic-framework-link-guard-open',
      reason: 'Namespace import authority is open.',
    })).toEqual({
      disposition: 'c0-fallback',
      reason: {
        kind: 'unsupported-input',
        summary: 'semantic-framework-link-guard-open: Namespace import authority is open.',
      },
    });

    expect(await emitter.prepare({ ...request, mapPosture: 'mapped' }, { state: 'admitted' }))
      .toMatchObject({
        disposition: 'c0-fallback',
        reason: { kind: 'map-unavailable' },
      });

    expect(await emitter.prepare({ ...request, graphFingerprint: '7'.repeat(64) }, { state: 'admitted' }))
      .toMatchObject({
        disposition: 'c0-fallback',
        reason: {
          kind: 'unsupported-input',
          summary: expect.stringContaining(AOT_RC2_FRAMEWORK_LINK_GRAPH_FINGERPRINT),
        },
      });

    const changedCode = `${request.modules[0]!.code}\n`;
    const changed = replaceModule(request, 0, {
      code: changedCode,
      observedSha256: digest(changedCode),
    });
    expect(await emitter.prepare(changed, { state: 'admitted' })).toMatchObject({
      disposition: 'c0-fallback',
      reason: { kind: 'input-hash-mismatch' },
    });

    const honestDrift = replaceModule(request, 0, {
      code: changedCode,
      expectedSha256: digest(changedCode),
      observedSha256: digest(changedCode),
    });
    expect(await emitter.prepare(honestDrift, { state: 'admitted' })).toMatchObject({
      disposition: 'c0-fallback',
      reason: {
        kind: 'unsupported-input',
        packageName: '@aurelia/expression-parser',
      },
    });
  });

  it('fails closed when claimed hashes do not describe the supplied bytes', async () => {
    const request = await exactRequest();
    const changed = replaceModule(request, 0, { code: `${request.modules[0]!.code}\n` });

    await expect(new AotFrameworkLinkEmitter().prepare(changed, { state: 'admitted' }))
      .rejects.toThrowError(/observed hash .* does not match its bytes/u);
  });

  it('fails closed for malformed graph, recipe hash, module set, and resolved path structure', async () => {
    const request = await exactRequest();
    const emitter = new AotFrameworkLinkEmitter();
    const admitted = { state: 'admitted' } as const;

    await expect(emitter.prepare({ ...request, graphFingerprint: `sha256:${'7'.repeat(64)}` }, admitted))
      .rejects.toThrowError(/graphFingerprint must be a lowercase sha256 digest/u);
    await expect(emitter.prepare({ ...request, modules: request.modules.slice(1) }, admitted))
      .rejects.toThrowError(/exactly 4 recipe modules/u);
    await expect(emitter.prepare(replaceModule(request, 0, {
      expectedSha256: `sha256:${'8'.repeat(64)}`,
    }), admitted)).rejects.toThrowError(/expectedSha256 must be a lowercase sha256 digest/u);
    await expect(emitter.prepare(replaceModule(request, 0, {
      observedSha256: 'NOT-A-SHA256',
    }), admitted)).rejects.toThrowError(/observedSha256 must be a lowercase sha256 digest/u);
    await expect(emitter.prepare({
      ...request,
      modules: request.modules.map((module, index) => index === 1 ? request.modules[0]! : module),
    }, admitted)).rejects.toThrowError(/module 1 must be target @aurelia\/template-compiler/u);
    await expect(emitter.prepare(replaceModule(request, 0, {
      resolvedId: `${request.modules[0]!.resolvedId}?development`,
    }), admitted)).rejects.toThrowError(/invalid resolvedId/u);
    await expect(emitter.prepare(replaceModule(request, 0, {
      resolvedId: path.resolve(repositoryRoot, 'outside/index.mjs'),
    }), admitted)).rejects.toThrowError(/does not end in/u);
  });

  it('admits no package graph by borrowing the original RC2 identity or omitting a core package', async () => {
    const modulesRequest = await exactRequest(AOT_RC2_LINK_MODULES_EXPECTATIONS);
    const packages = modulesRequest.modules.filter((module) =>
      ['@aurelia/kernel', '@aurelia/runtime', '@aurelia/runtime-html'].includes(module.packageName)
    ).map((module) => ({
      packageName: module.packageName,
      packageRoot: path.resolve(module.resolvedId, '../../..'),
      expectedStandardEntrySha256: module.expectedSha256,
      expectedManifestSha256: '1'.repeat(64),
    }));
    const emitter = new AotFrameworkLinkEmitter();
    const admitted = { state: 'admitted' } as const;
    expect(await emitter.prepare({ ...modulesRequest, packages }, admitted)).toMatchObject({
      disposition: 'c0-fallback', reason: { kind: 'unsupported-input' },
    });
    const request = { ...modulesRequest, graphFingerprint: AOT_RC2_LINK_MODULES_GRAPH_FINGERPRINT, packages };
    await expect(emitter.prepare({ ...request, packages: packages.slice(1) }, admitted))
      .rejects.toThrowError(/requires kernel, runtime and runtime-html packages together/u);
    await expect(emitter.prepare({ ...request, packages: [packages[0]!, packages[0]!, packages[2]!] }, admitted))
      .rejects.toThrowError(/exactly one/u);
    await expect(emitter.prepare({ ...request, packages: packages.map((pkg) => ({
      ...pkg, packageRoot: path.join(pkg.packageRoot, 'other'),
    })) }, admitted)).rejects.toThrowError(/does not match its exact default entry/u);
    expect(await emitter.prepare(request, admitted)).toMatchObject({
      disposition: 'c0-fallback', reason: { summary: expect.stringContaining('no recipe for the supplied package manifests') },
    });
  });
});

async function exactRequest(
  expectations = AOT_RC2_FRAMEWORK_LINK_EXPECTATIONS,
): Promise<AotPrepareFrameworkLinksRequest> {
  const modules = await Promise.all(expectations.map(
    async (expectation): Promise<AotPrepareFrameworkLinkModule> => {
      const packageDirectory = expectation.packageName === 'aurelia'
        ? 'aurelia'
        : expectation.packageName.slice('@aurelia/'.length);
      const code = await readFile(
        path.resolve(frameworkRoot, 'packages', packageDirectory, expectation.packageRelativePath),
        'utf8',
      );
      const observedSha256 = digest(code);
      expect(observedSha256).toBe(expectation.expectedSha256);
      return {
        role: expectation.role,
        packageName: expectation.packageName,
        packageRelativePath: expectation.packageRelativePath,
        resolvedId: path.resolve(
          repositoryRoot,
          '.temp/framework-link-test/node_modules',
          expectation.packageName,
          expectation.packageRelativePath,
        ),
        expectedSha256: expectation.expectedSha256,
        observedSha256,
        code,
      };
    },
  ));
  return {
    protocol: AOT_FRAMEWORK_LINK_PROTOCOL,
    graphFingerprint,
    mapPosture: AOT_FRAMEWORK_LINK_MAP_POSTURE,
    policy: 'allow-c0-fallback',
    modules,
  };
}

function replaceModule(
  request: AotPrepareFrameworkLinksRequest,
  index: number,
  replacement: Partial<AotPrepareFrameworkLinkModule>,
): AotPrepareFrameworkLinksRequest {
  return {
    ...request,
    modules: request.modules.map((module, candidate) =>
      candidate === index ? { ...module, ...replacement } : module
    ),
  };
}

function digest(code: string): string {
  return createHash('sha256').update(code, 'utf8').digest('hex');
}

function evaluateCreateInterpolation(code: string): (
  parts: readonly string[],
  expressions?: readonly unknown[],
) => {
  readonly $kind: 'Interpolation';
  readonly isMulti: boolean;
  readonly firstExpression: unknown;
  readonly parts: readonly string[];
  readonly expressions: readonly unknown[];
} {
  const start = code.indexOf('export function createInterpolation');
  const terminator = '\n}\n\nexport class CustomExpression';
  const end = code.indexOf(terminator, start);
  if (start < 0 || end < 0) throw new Error('Expression facade omitted createInterpolation.');
  const functionSource = code.slice(start, end + 2).replace('export function', 'function');
  return Function(
    'emptyArray',
    `"use strict";\n${functionSource}\nreturn createInterpolation;`,
  )(emptyArray) as ReturnType<typeof evaluateCreateInterpolation>;
}
