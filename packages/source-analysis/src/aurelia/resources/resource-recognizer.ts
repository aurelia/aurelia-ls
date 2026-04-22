import fs from 'node:fs';
import ts from 'typescript';

import {
  findNodeBySpan,
  guessScriptKind,
  hasStaticModifier,
  readCallCalleeText,
  readPropertyName,
  readStringLiteralValue,
} from '../analysis/index.js';
import type { Export, Exports } from '../exports/index.js';
import type { ResourceDefinitionKind } from './contracts.js';
import {
  ResourceCandidate,
  ResourceCarrier,
  type ResourceCarrierKind,
  ResourceRecognitionPath,
  type ResourceRecognitionPathKind,
} from './resource-candidate.js';

export interface ResourceRecognizerOptions {
  readonly exports: Exports;
  readonly conventionsActive?: boolean;
}

export interface ResourceRecognizerState {
  readonly exportOwnerLabel: string;
  readonly parsedFileCount: number;
  readonly conventionsActive: boolean;
}

interface RecognitionEvidence {
  readonly kind: ResourceDefinitionKind;
  readonly pathKind: ResourceRecognitionPathKind;
  readonly carrierKind: ResourceCarrierKind;
  readonly note: string | null;
}

interface ParsedClassCarrier {
  readonly filePath: string;
  readonly sourceFile: ts.SourceFile;
  readonly declarationNode: ts.Node;
  readonly classNode: ts.ClassLikeDeclarationBase;
}

// This seam now owns real export-backed resource ingress for the resource
// families that can be recognized honestly from declaration-local class
// surfaces. It still leaves registrable-metadata-only families such as
// attribute patterns for a later slice rather than bluffing them through.
export class ResourceRecognizer {
  private readonly exportsValue: Exports;
  private readonly conventionsActiveValue: boolean;
  private readonly parsedFiles = new Map<string, ts.SourceFile | null>();

  constructor(
    options: ResourceRecognizerOptions,
  ) {
    this.exportsValue = options.exports;
    this.conventionsActiveValue = options.conventionsActive === true;
  }

  recognizeAll(): readonly ResourceCandidate[] {
    return this.exportsValue.readAll().flatMap((current) => this.recognizeExport(current));
  }

  recognizeExport(
    current: Export,
  ): readonly ResourceCandidate[] {
    const surface = current.readValueSurface();
    if (surface.kind !== 'class-declaration') {
      return [];
    }

    const carrier = this.readParsedClassCarrier(current);
    if (carrier == null) {
      return [];
    }

    const evidence = [
      ...readDecoratorEvidence(carrier.classNode),
      ...readStaticAuEvidence(carrier.classNode),
      ...(this.conventionsActiveValue
        ? readConventionEvidence(current.name)
        : []),
    ];

    if (evidence.length === 0) {
      return [];
    }

    const byKind = new Map<ResourceDefinitionKind, RecognitionEvidence[]>();
    for (const currentEvidence of evidence) {
      const bucket = byKind.get(currentEvidence.kind);
      if (bucket == null) {
        byKind.set(currentEvidence.kind, [currentEvidence]);
      } else {
        bucket.push(currentEvidence);
      }
    }

    return [...byKind.entries()].map(([kind, matchedEvidence]) => new ResourceCandidate(
      `${current.id}:resource-candidate:${kind}`,
      current,
      [kind],
      dedupeRecognitionPaths(matchedEvidence),
      dedupeCarriers(matchedEvidence),
    ));
  }

  inspectState(): ResourceRecognizerState {
    return {
      exportOwnerLabel: this.exportsValue.ownerLabel,
      parsedFileCount: this.parsedFiles.size,
      conventionsActive: this.conventionsActiveValue,
    };
  }

  private readParsedClassCarrier(
    current: Export,
  ): ParsedClassCarrier | null {
    const symbol = current.symbol;
    const declaration = symbol?.declaration;
    const file = declaration?.file ?? current.sourceFile ?? symbol?.file ?? null;
    if (symbol == null || declaration == null || file == null) {
      return null;
    }

    const sourceFile = this.readSourceFile(file.path);
    if (sourceFile == null) {
      return null;
    }

    const declarationNode = findNodeBySpan(sourceFile, declaration.span.start, declaration.span.end);
    if (declarationNode == null) {
      return null;
    }

    const classNode = readClassCarrier(declarationNode);
    if (classNode == null) {
      return null;
    }

    return {
      filePath: file.path,
      sourceFile,
      declarationNode,
      classNode,
    };
  }

  private readSourceFile(
    filePath: string,
  ): ts.SourceFile | null {
    if (this.parsedFiles.has(filePath)) {
      return this.parsedFiles.get(filePath) ?? null;
    }

    try {
      const text = fs.readFileSync(filePath, 'utf8');
      const parsed = ts.createSourceFile(
        filePath,
        text,
        ts.ScriptTarget.Latest,
        true,
        guessScriptKind(filePath),
      );
      this.parsedFiles.set(filePath, parsed);
      return parsed;
    } catch {
      this.parsedFiles.set(filePath, null);
      return null;
    }
  }
}

function readClassCarrier(
  declarationNode: ts.Node,
): ts.ClassLikeDeclarationBase | null {
  if (ts.isClassDeclaration(declarationNode) || ts.isClassExpression(declarationNode)) {
    return declarationNode;
  }

  if (
    ts.isVariableDeclaration(declarationNode)
    && declarationNode.initializer != null
    && ts.isClassExpression(declarationNode.initializer)
  ) {
    return declarationNode.initializer;
  }

  return null;
}

function readDecoratorEvidence(
  declarationNode: ts.ClassLikeDeclarationBase,
): readonly RecognitionEvidence[] {
  const decorators = ts.canHaveDecorators(declarationNode)
    ? ts.getDecorators(declarationNode) ?? []
    : [];
  const evidence: RecognitionEvidence[] = [];

  for (const decorator of decorators) {
    const calleeText = readDecoratorCalleeText(decorator.expression);
    const matchedKind = calleeText == null
      ? null
      : DECORATOR_KIND_MAP[calleeText] ?? null;
    if (matchedKind == null) {
      continue;
    }

    evidence.push({
      kind: matchedKind,
      pathKind: 'decorator',
      carrierKind: 'decorator',
      note: `Decorator ${calleeText}(...) closed ${matchedKind} candidacy on the class carrier.`,
    });
  }

  return evidence;
}

function readStaticAuEvidence(
  declarationNode: ts.ClassLikeDeclarationBase,
): readonly RecognitionEvidence[] {
  const staticAuDefinition = readStaticAuDefinition(declarationNode);
  if (staticAuDefinition == null) {
    return [];
  }

  const typeExpression = readObjectLiteralPropertyInitializer(staticAuDefinition, 'type');
  if (typeExpression == null) {
    return [];
  }

  const rawKind = readStaticAuKind(typeExpression);
  if (rawKind == null || rawKind === 'attribute-pattern') {
    // TODO: registrable-metadata/definition decomposition for attribute
    // patterns still needs its own ingress slice. Do not pretend static `type`
    // is enough to materialize usable pattern definitions here.
    return [];
  }

  const kind = rawKind === 'custom-attribute' && readTrueBooleanProperty(staticAuDefinition, 'isTemplateController')
    ? 'template-controller'
    : rawKind;

  return [{
    kind,
    pathKind: 'static-$au',
    carrierKind: 'static-au',
    note: `Static $au.type closed ${kind} candidacy on the class carrier.`,
  }];
}

function readConventionEvidence(
  exportName: string,
): readonly RecognitionEvidence[] {
  const matched = readConventionKind(exportName);
  if (matched == null || matched.kind === 'attribute-pattern') {
    // TODO: attribute-pattern ingress still wants a richer multi-pattern
    // definition lane than the current single-row resource model.
    return [];
  }

  return [{
    kind: matched.kind,
    pathKind: 'convention',
    carrierKind: 'convention',
    note: `Export name ${exportName} matched ${matched.kind} convention via the ${matched.suffix} suffix. This path is only meaningful when a build-tool conventions layer is known to be active.`,
  }];
}

function dedupeRecognitionPaths(
  evidence: readonly RecognitionEvidence[],
): readonly ResourceRecognitionPath[] {
  const seen = new Set<string>();
  const result: ResourceRecognitionPath[] = [];
  for (const current of evidence) {
    const key = `${current.pathKind}:${current.note ?? ''}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    result.push(new ResourceRecognitionPath(
      current.pathKind,
      'matched',
      current.note,
    ));
  }
  return result;
}

function dedupeCarriers(
  evidence: readonly RecognitionEvidence[],
): readonly ResourceCarrier[] {
  const seen = new Set<string>();
  const result: ResourceCarrier[] = [];
  for (const current of evidence) {
    const key = `${current.carrierKind}:${current.note ?? ''}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    result.push(new ResourceCarrier(
      current.carrierKind,
      current.note,
    ));
  }
  return result;
}

function readDecoratorCalleeText(
  expression: ts.Expression,
): string | null {
  if (ts.isCallExpression(expression)) {
    return readCallCalleeText(expression.expression);
  }

  if (ts.isIdentifier(expression)) {
    return expression.text;
  }

  if (ts.isPropertyAccessExpression(expression)) {
    return expression.name.text;
  }

  return null;
}

function readStaticAuDefinition(
  declarationNode: ts.ClassLikeDeclarationBase,
): ts.ObjectLiteralExpression | null {
  for (const member of declarationNode.members) {
    if (!hasStaticModifier(member) || !ts.isPropertyDeclaration(member) || member.initializer == null) {
      continue;
    }
    if (readPropertyName(member.name) !== '$au') {
      continue;
    }
    return ts.isObjectLiteralExpression(member.initializer)
      ? member.initializer
      : null;
  }

  return null;
}

function readObjectLiteralPropertyInitializer(
  literal: ts.ObjectLiteralExpression,
  propertyName: string,
): ts.Expression | null {
  for (const property of literal.properties) {
    if (ts.isPropertyAssignment(property) && readPropertyName(property.name) === propertyName) {
      return property.initializer;
    }
  }

  return null;
}

function readTrueBooleanProperty(
  literal: ts.ObjectLiteralExpression,
  propertyName: string,
): boolean {
  const initializer = readObjectLiteralPropertyInitializer(literal, propertyName);
  return initializer?.kind === ts.SyntaxKind.TrueKeyword;
}

function readStaticAuKind(
  expression: ts.Expression,
): ResourceDefinitionKind | null {
  const stringValue = readStringLiteralValue(expression);
  if (stringValue != null) {
    switch (stringValue) {
      case 'custom-element':
      case 'custom-attribute':
      case 'template-controller':
      case 'value-converter':
      case 'binding-behavior':
      case 'binding-command':
      case 'attribute-pattern':
        return stringValue;
      default:
        return null;
    }
  }

  if (ts.isIdentifier(expression)) {
    return STATIC_AU_IDENTIFIER_KIND_MAP[expression.text] ?? null;
  }

  if (ts.isPropertyAccessExpression(expression)) {
    return STATIC_AU_IDENTIFIER_KIND_MAP[expression.name.text] ?? null;
  }

  return null;
}

function readConventionKind(
  exportName: string,
): {
  readonly kind: ResourceDefinitionKind;
  readonly suffix: string;
} | null {
  if (exportName.endsWith('CustomElement')) {
    return { kind: 'custom-element', suffix: 'CustomElement' };
  }
  if (exportName.endsWith('CustomAttribute')) {
    return { kind: 'custom-attribute', suffix: 'CustomAttribute' };
  }
  if (exportName.endsWith('ValueConverter')) {
    return { kind: 'value-converter', suffix: 'ValueConverter' };
  }
  if (exportName.endsWith('BindingBehavior')) {
    return { kind: 'binding-behavior', suffix: 'BindingBehavior' };
  }
  if (exportName.endsWith('BindingCommand')) {
    return { kind: 'binding-command', suffix: 'BindingCommand' };
  }
  if (exportName.endsWith('TemplateController')) {
    return { kind: 'template-controller', suffix: 'TemplateController' };
  }
  if (exportName.endsWith('AttributePattern')) {
    return { kind: 'attribute-pattern', suffix: 'AttributePattern' };
  }

  return null;
}

const DECORATOR_KIND_MAP: Record<string, ResourceDefinitionKind> = {
  customElement: 'custom-element',
  customAttribute: 'custom-attribute',
  templateController: 'template-controller',
  valueConverter: 'value-converter',
  bindingBehavior: 'binding-behavior',
  bindingCommand: 'binding-command',
  attributePattern: 'attribute-pattern',
};

const STATIC_AU_IDENTIFIER_KIND_MAP: Record<string, ResourceDefinitionKind> = {
  elementTypeName: 'custom-element',
  attrTypeName: 'custom-attribute',
  converterTypeName: 'value-converter',
  behaviorTypeName: 'binding-behavior',
  bindingCommandTypeName: 'binding-command',
};
