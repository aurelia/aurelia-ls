import { createHash } from 'node:crypto';

import { ResourceCarrierKind } from '@aurelia-ls/semantic-runtime/browser-template';
import MagicString from 'magic-string';
import ts from 'typescript';

import { AOT_COMPILER_PATCH_RUNTIME_MODULE_ID } from './compiler-patch-runtime-module.js';
import type { AotRawSourceMap } from './template-module-emitter.js';

export const AOT_RUNTIME_MODULE_SPECIFIER = AOT_COMPILER_PATCH_RUNTIME_MODULE_ID;

export type AotSourceTransformErrorCode =
  | 'AOT_SOURCE_STALE'
  | 'AOT_SOURCE_UNSUPPORTED_CARRIER'
  | 'AOT_SOURCE_INVALID_PLAN';

export class AotSourceTransformError extends Error {
  public constructor(
    readonly code: AotSourceTransformErrorCode,
    message: string,
    readonly sourcePath: string,
    readonly resourceKey: string | null = null,
  ) {
    super(message);
    this.name = 'AotSourceTransformError';
  }
}

export interface AotSourceTransformSlice {
  readonly start: number;
  readonly end: number;
  readonly oldText: string;
}

export interface AotSourceTransformResourcePlan {
  readonly resourceKey: string;
  readonly compilerVariantKey: string;
  readonly definitionName: string;
  readonly carrierKind: ResourceCarrierKind;
  readonly carrier: AotSourceTransformSlice;
  readonly targetLocalName: string | null;
  readonly targetDeclaration: AotSourceTransformSlice | null;
  readonly payloadSpecifier: string;
  readonly payloadDigest: string;
}

export interface AotSourceTransformRequest {
  readonly sourcePath: string;
  readonly code: string;
  readonly resources: readonly AotSourceTransformResourcePlan[];
  readonly runtimeModuleSpecifier?: string;
}

export interface AotTransformedResource {
  readonly resourceKey: string;
  readonly compilerVariantKey: string;
  readonly definitionName: string;
  readonly carrierKind: ResourceCarrierKind;
  readonly carrierStart: number;
  readonly carrierEnd: number;
  readonly payloadDigest: string;
  readonly payloadSpecifier: string;
}

export interface AotSourceTransformArtifact {
  readonly sourcePath: string;
  readonly code: string;
  readonly map: AotRawSourceMap;
  readonly digest: string;
  readonly runtimeModuleSpecifier: string;
  readonly resources: readonly AotTransformedResource[];
}

/** Apply resource-addressed compiler patches to one authored TS/JS module without reconstructing its metadata. */
export class AotSourceTransformEmitter {
  public emit(request: AotSourceTransformRequest): AotSourceTransformArtifact | null {
    if (request.resources.length === 0) return null;

    const sourceFile = ts.createSourceFile(
      request.sourcePath,
      request.code,
      ts.ScriptTarget.Latest,
      true,
      scriptKind(request.sourcePath),
    );
    const resources = orderedResources(request.resources);
    assertDistinctPlanIdentity(request.sourcePath, resources);
    const usedNames = sourceIdentifierNames(sourceFile);
    const applyName = allocateIdentifier('__auAotApply', usedNames);
    const patchNames = new Map(resources.map((resource, index) => [
      resource.compilerVariantKey,
      allocateIdentifier(`__auAotPatch${index}`, usedNames),
    ]));
    const edits = new MagicString(request.code);
    const runtimeModuleSpecifier = request.runtimeModuleSpecifier ?? AOT_RUNTIME_MODULE_SPECIFIER;
    const importText = [
      `import { applyCompiledCustomElement as ${applyName} } from ${JSON.stringify(
        runtimeModuleSpecifier,
      )};`,
      ...resources.map((resource) =>
        `import ${requireMap(patchNames, resource.compilerVariantKey, request.sourcePath)} from ${JSON.stringify(resource.payloadSpecifier)};`
      ),
      '',
    ].join(detectNewline(request.code));
    edits.appendLeft(importInsertionOffset(sourceFile), importText);

    const applyAfterDeclaration = new Map<number, string[]>();
    for (const resource of resources) {
      assertSlice(request.sourcePath, request.code, resource.resourceKey, 'carrier', resource.carrier);
      const patchName = requireMap(patchNames, resource.compilerVariantKey, request.sourcePath);
      switch (resource.carrierKind) {
        case ResourceCarrierKind.DefineCall:
          edits.prependLeft(resource.carrier.start, `${applyName}(`);
          edits.appendLeft(resource.carrier.end, `, ${patchName})`);
          break;
        case ResourceCarrierKind.Decorator:
        case ResourceCarrierKind.StaticAu:
        case ResourceCarrierKind.Convention: {
          const declaration = resource.targetDeclaration;
          const targetName = resource.targetLocalName;
          if (declaration == null || targetName == null || !isIdentifierText(targetName)) {
            throw unsupportedCarrier(
              request.sourcePath,
              resource,
              'AOT cannot attach a compiler patch to a carrier without one statically named target declaration.',
            );
          }
          assertSlice(request.sourcePath, request.code, resource.resourceKey, 'target declaration', declaration);
          const calls = applyAfterDeclaration.get(declaration.end) ?? [];
          calls.push(`${applyName}(${targetName}, ${patchName});`);
          applyAfterDeclaration.set(declaration.end, calls);
          break;
        }
        case ResourceCarrierKind.AttributePatternCreate:
          throw unsupportedCarrier(
            request.sourcePath,
            resource,
            'Attribute-pattern carriers cannot own custom-element compiler payloads.',
          );
      }
    }

    const newline = detectNewline(request.code);
    for (const [offset, calls] of [...applyAfterDeclaration].sort(([left], [right]) => left - right)) {
      edits.appendLeft(offset, `${newline}${calls.join(newline)}`);
    }

    const code = edits.toString();
    const generated = edits.generateMap({
      source: request.sourcePath,
      includeContent: true,
      hires: 'boundary',
    });
    const encoded = JSON.parse(generated.toString()) as {
      version: number;
      file?: string;
      sources: string[];
      sourcesContent?: (string | null)[];
      names: string[];
      mappings: string;
    };
    const map: AotRawSourceMap = {
      version: 3,
      file: request.sourcePath,
      sources: encoded.sources,
      sourcesContent: (encoded.sourcesContent ?? [request.code]).map((value) => value ?? ''),
      names: encoded.names,
      mappings: encoded.mappings,
    };
    return {
      sourcePath: request.sourcePath,
      code,
      map,
      digest: `sha256:${createHash('sha256').update(code).update('\0').update(JSON.stringify(map)).digest('hex')}`,
      runtimeModuleSpecifier,
      resources: resources.map((resource) => ({
        resourceKey: resource.resourceKey,
        compilerVariantKey: resource.compilerVariantKey,
        definitionName: resource.definitionName,
        carrierKind: resource.carrierKind,
        carrierStart: resource.carrier.start,
        carrierEnd: resource.carrier.end,
        payloadDigest: resource.payloadDigest,
        payloadSpecifier: resource.payloadSpecifier,
      })),
    };
  }
}

function orderedResources(
  resources: readonly AotSourceTransformResourcePlan[],
): readonly AotSourceTransformResourcePlan[] {
  return [...resources].sort((left, right) =>
    left.carrier.start - right.carrier.start
    || right.carrier.end - left.carrier.end
    || left.compilerVariantKey.localeCompare(right.compilerVariantKey)
  );
}

function assertDistinctPlanIdentity(
  sourcePath: string,
  resources: readonly AotSourceTransformResourcePlan[],
): void {
  const resourceKeys = new Set<string>();
  const variantKeys = new Set<string>();
  for (const resource of resources) {
    if (resourceKeys.has(resource.resourceKey)) {
      throw invalidPlan(sourcePath, resource.resourceKey, `Duplicate resource key '${resource.resourceKey}'.`);
    }
    if (variantKeys.has(resource.compilerVariantKey)) {
      throw invalidPlan(sourcePath, resource.resourceKey, `Duplicate compiler variant '${resource.compilerVariantKey}'.`);
    }
    resourceKeys.add(resource.resourceKey);
    variantKeys.add(resource.compilerVariantKey);
  }
}

function assertSlice(
  sourcePath: string,
  code: string,
  resourceKey: string,
  label: string,
  slice: AotSourceTransformSlice,
): void {
  if (
    !Number.isInteger(slice.start)
    || !Number.isInteger(slice.end)
    || slice.start < 0
    || slice.end < slice.start
    || slice.end > code.length
    || code.slice(slice.start, slice.end) !== slice.oldText
  ) {
    throw new AotSourceTransformError(
      'AOT_SOURCE_STALE',
      `AOT ${label} source for '${resourceKey}' no longer matches '${sourcePath}'.`,
      sourcePath,
      resourceKey,
    );
  }
}

function sourceIdentifierNames(sourceFile: ts.SourceFile): Set<string> {
  const names = new Set<string>();
  const visit = (node: ts.Node): void => {
    if (ts.isIdentifier(node)) names.add(node.text);
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return names;
}

function allocateIdentifier(preferred: string, used: Set<string>): string {
  let candidate = preferred;
  let suffix = 0;
  while (used.has(candidate)) candidate = `${preferred}${++suffix}`;
  used.add(candidate);
  return candidate;
}

function importInsertionOffset(sourceFile: ts.SourceFile): number {
  const imports = sourceFile.statements.filter(ts.isImportDeclaration);
  if (imports.length > 0) {
    const last = imports[imports.length - 1]!;
    const text = sourceFile.text;
    let offset = last.getEnd();
    while (offset < text.length && (text[offset] === '\r' || text[offset] === '\n')) offset++;
    return offset;
  }
  return sourceFile.text.startsWith('#!')
    ? (sourceFile.text.indexOf('\n') < 0 ? sourceFile.text.length : sourceFile.text.indexOf('\n') + 1)
    : 0;
}

function scriptKind(sourcePath: string): ts.ScriptKind {
  const normalized = sourcePath.toLowerCase().split('?', 1)[0]!;
  if (normalized.endsWith('.tsx')) return ts.ScriptKind.TSX;
  if (normalized.endsWith('.jsx')) return ts.ScriptKind.JSX;
  if (normalized.endsWith('.js') || normalized.endsWith('.mjs') || normalized.endsWith('.cjs')) return ts.ScriptKind.JS;
  return ts.ScriptKind.TS;
}

function isIdentifierText(value: string): boolean {
  const scanner = ts.createScanner(ts.ScriptTarget.Latest, false, ts.LanguageVariant.Standard, value);
  return scanner.scan() === ts.SyntaxKind.Identifier && scanner.scan() === ts.SyntaxKind.EndOfFileToken;
}

function detectNewline(text: string): string {
  return text.includes('\r\n') ? '\r\n' : '\n';
}

function requireMap<TKey, TValue>(values: ReadonlyMap<TKey, TValue>, key: TKey, sourcePath: string): TValue {
  const value = values.get(key);
  if (value == null) throw invalidPlan(sourcePath, null, `AOT source transform cannot resolve '${String(key)}'.`);
  return value;
}

function unsupportedCarrier(
  sourcePath: string,
  resource: AotSourceTransformResourcePlan,
  message: string,
): AotSourceTransformError {
  return new AotSourceTransformError(
    'AOT_SOURCE_UNSUPPORTED_CARRIER',
    message,
    sourcePath,
    resource.resourceKey,
  );
}

function invalidPlan(sourcePath: string, resourceKey: string | null, message: string): AotSourceTransformError {
  return new AotSourceTransformError('AOT_SOURCE_INVALID_PLAN', message, sourcePath, resourceKey);
}
