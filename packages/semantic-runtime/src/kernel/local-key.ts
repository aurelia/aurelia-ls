import type ts from 'typescript';
import type { ProductHandle } from './handles.js';

/** Key input for records identified by a source node and a caller-owned ordinal. */
export interface SourceNodeOrdinalLocalKeyInput {
  readonly prefix: string;
  readonly sourceFile: ts.SourceFile;
  readonly node: ts.Node;
  readonly index: number;
}

/** Build a stable local key for repeated observations attached to one source span. */
export function sourceNodeOrdinalLocalKey(
  input: SourceNodeOrdinalLocalKeyInput,
): string {
  return `${input.prefix}:${input.node.getStart(input.sourceFile)}:${input.node.end}:${input.index}`;
}

/** Key input for source-node observations owned by a project/module pair. */
export interface ProjectModuleSourceNodeOrdinalLocalKeyInput {
  readonly projectKey: string;
  readonly moduleKey: string;
  readonly sourceFile: ts.SourceFile;
  readonly node: ts.Node;
  readonly index: number;
}

/** Build the project/module variant of a source-node ordinal key. */
export function projectModuleSourceNodeOrdinalLocalKey(
  input: ProjectModuleSourceNodeOrdinalLocalKeyInput,
): string {
  return sourceNodeOrdinalLocalKey({
    prefix: `${input.projectKey}:${input.moduleKey}`,
    sourceFile: input.sourceFile,
    node: input.node,
    index: input.index,
  });
}

/** Key input for catalog-shaped products grouped by framework package and catalog group. */
export interface CatalogGroupLocalKeyInput {
  readonly packageId: string;
  readonly group: string;
}

/** Build a catalog group key without a variant dimension. */
export function catalogGroupLocalKey(input: CatalogGroupLocalKeyInput): string {
  return `${localKeyPart(input.packageId)}:${localKeyPart(input.group)}`;
}

/** Key input for catalog-shaped products with an optional variant dimension. */
export interface CatalogVariantLocalKeyInput extends CatalogGroupLocalKeyInput {
  readonly variantKey?: string | null;
}

/** Build a catalog variant key, using default for the unqualified variant. */
export function catalogVariantLocalKey(input: CatalogVariantLocalKeyInput): string {
  return [
    localKeyPart(input.packageId),
    localKeyPart(input.group),
    input.variantKey == null ? 'default' : localKeyPart(input.variantKey),
  ].join(':');
}

/** Encode arbitrary authored/runtime text for use as one handle-local key segment. */
export function localKeyPart(value: string): string {
  return encodeURIComponent(value).replace(/[!'()*]/g, (character) =>
    `%${character.charCodeAt(0).toString(16).toUpperCase()}`
  );
}

export function checkerExpressionTypeLocalKey(
  scopeProductHandle: ProductHandle,
  bindingProductHandle: ProductHandle,
  expressionProductHandle: ProductHandle | null,
): string {
  return [
    'checker-expression-type',
    scopeProductHandle,
    expressionProductHandle ?? `binding:${bindingProductHandle}`,
  ].join(':');
}
