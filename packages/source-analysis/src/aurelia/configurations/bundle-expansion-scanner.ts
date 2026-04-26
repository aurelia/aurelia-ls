import fs from 'node:fs';
import path from 'node:path';

import ts from 'typescript';

import type { SourceFileRef } from '../source-address.js';
import { sourceNodeRefFromTsNode, type SourceNodeRef } from '../refs.js';
import type { Configurations } from './configurations.js';
import type { BundleArray } from './bundle-array.js';
import type { BundleSpread, RegistryFactoryMethod, RegistryMethod } from './registry-object.js';
import { BundleExpansion, BundleMember } from './bundle-expansion.js';

export interface BundleExpansionScannerOptions {
  readonly configurations: Configurations;
}

export interface BundleExpansionScannerState {
  readonly parsedFileCount: number;
}

export class BundleExpansionScanner {
  private readonly configurationsValue: Configurations;
  private readonly parsedFiles = new Map<string, ts.SourceFile | null>();

  constructor(
    options: BundleExpansionScannerOptions,
  ) {
    this.configurationsValue = options.configurations;
  }

  expandSpread(
    originMethod: RegistryMethod | RegistryFactoryMethod,
    spread: BundleSpread,
  ): BundleExpansion {
    const bundle = this.configurationsValue.readBundleArrays().find(
      (current) => current.sourceExport.name === spread.referenceName,
    ) ?? null;

    if (bundle == null) {
      return new BundleExpansion(
        `${originMethod.id}:bundle-expansion:${spread.referenceName}`,
        originMethod,
        spread,
        null,
        [],
        `Could not resolve bundle spread ${spread.referenceName} to a known bundle export.`,
      );
    }

    return new BundleExpansion(
      `${originMethod.id}:bundle-expansion:${spread.referenceName}`,
      originMethod,
      spread,
      bundle,
      this.readBundleMembers(bundle),
      `Expanded bundle ${spread.referenceName} into direct member references.`,
    );
  }

  inspectState(): BundleExpansionScannerState {
    return {
      parsedFileCount: this.parsedFiles.size,
    };
  }

  private readBundleMembers(
    bundle: BundleArray,
  ): readonly BundleMember[] {
    const sourceFile = this.readParsedSourceFile(bundle.source.file);
    if (sourceFile == null) {
      return bundle.elementNames.map((current, index) => new BundleMember(
        `${bundle.id}:bundle-member:${current}:${index}`,
        null,
        current,
        'Bundle member fell back to summary-only recovery because the source file could not be reparsed.',
      ));
    }

    const arrayLiteral = findNodeBySpan(
      sourceFile,
      bundle.source.span.start,
      bundle.source.span.end,
      ts.isArrayLiteralExpression,
    );
    if (arrayLiteral == null) {
      return bundle.elementNames.map((current, index) => new BundleMember(
        `${bundle.id}:bundle-member:${current}:${index}`,
        null,
        current,
        'Bundle member fell back to summary-only recovery because the array literal could not be rehydrated.',
      ));
    }

    return arrayLiteral.elements.map((current, index) => new BundleMember(
      `${bundle.id}:bundle-member:${bundle.elementNames[index] ?? current.getText()}:${current.getStart()}`,
      createNodeRef(bundle.source.file, current),
      summarizeExpression(current),
    ));
  }

  private readParsedSourceFile(
    file: SourceFileRef,
  ): ts.SourceFile | null {
    const resolvedPath = path.isAbsolute(file.path)
      ? file.path
      : path.join(file.program.repoRoot, file.path);
    const normalized = resolvedPath.replace(/\\/g, '/');
    const cached = this.parsedFiles.get(normalized);
    if (cached !== undefined) {
      return cached;
    }

    if (!fs.existsSync(resolvedPath)) {
      this.parsedFiles.set(normalized, null);
      return null;
    }

    const text = fs.readFileSync(resolvedPath, 'utf8');
    const sourceFile = ts.createSourceFile(
      resolvedPath,
      text,
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TS,
    );
    this.parsedFiles.set(normalized, sourceFile);
    return sourceFile;
  }
}

function findNodeBySpan<T extends ts.Node>(
  root: ts.Node,
  start: number,
  end: number,
  guard: (node: ts.Node) => node is T,
): T | null {
  let match: T | null = null;

  const visit = (node: ts.Node): void => {
    if (match != null) {
      return;
    }

    if (guard(node) && node.getStart() === start && node.end === end) {
      match = node;
      return;
    }

    ts.forEachChild(node, visit);
  };

  visit(root);
  return match;
}

function createNodeRef(
  file: SourceFileRef,
  node: ts.Node,
): SourceNodeRef {
  return sourceNodeRefFromTsNode(file, node);
}

function summarizeExpression(
  expression: ts.Expression,
): string {
  if (
    ts.isAsExpression(expression)
    || ts.isTypeAssertionExpression(expression)
    || ts.isParenthesizedExpression(expression)
    || ts.isNonNullExpression(expression)
  ) {
    return summarizeExpression(expression.expression);
  }

  if (ts.isIdentifier(expression)) {
    return expression.text;
  }

  if (ts.isPropertyAccessExpression(expression)) {
    return expression.getText();
  }

  if (ts.isClassExpression(expression) && expression.name != null) {
    return expression.name.text;
  }

  return expression.getText();
}
