import fs from 'node:fs';
import ts from 'typescript';
import { findNodeBySpan, guessScriptKind, readCallCalleeText, readPropertyName, readStringLiteralValue, unwrapExpression } from '../analysis/ts-ast-helpers.js';
import type { DeclarationWorld, DeclarationExport } from '../declaration-world.js';
import { sourceNodeRefFromTsNode, type SourceNodeRef } from '../refs.js';
import { ExportClassification } from './contracts.js';
import type { Export } from './export.js';
import {
  ExportValueDefineArgument,
  ExportValueDefineCall,
  ExportValueDefineType,
  ExportValueSurface,
  type ExportValueCheckKind,
} from './export-value-surface.js';

export interface ExportScannerOptions {
  readonly declarationWorld: DeclarationWorld;
}

export interface ExportScannerState {
  readonly declarationOwnerLabel: string;
  readonly parsedFileCount: number;
}

// This seam owns the expensive cold path for export reads. Right now it only
// exposes declaration-world rows plus a stub classification hook so the
// higher-level export/query shape can harden before real export classification
// lands.
export class ExportScanner {
  private readonly declarationWorldValue: DeclarationWorld;
  private readonly parsedFiles = new Map<string, ts.SourceFile | null>();

  constructor(
    options: ExportScannerOptions,
  ) {
    this.declarationWorldValue = options.declarationWorld;
  }

  scanAll(): readonly DeclarationExport[] {
    return this.declarationWorldValue.readExports();
  }

  readValueSurface(
    current: Export,
  ): ExportValueSurface {
    const declarationKind = current.symbol?.declaration?.nodeKind ?? null;

    if (declarationKind === 'ClassDeclaration') {
      return new ExportValueSurface(
        'class-declaration',
        declarationKind,
        [
          'decorator',
          'static-$au',
          'registrable-metadata',
          'convention',
        ] satisfies readonly ExportValueCheckKind[],
        'class-declaration',
      );
    }

    if (declarationKind === 'FunctionDeclaration') {
      // TODO: exported function declarations in Aurelia often act as decorator
      // factories or helpers. Resource/configuration meaning only emerges after
      // body or returned-value recovery, so this syntax surface does not yet
      // justify deeper Aurelia checks on its own.
      return new ExportValueSurface(
        'function-declaration',
        declarationKind,
        [] satisfies readonly ExportValueCheckKind[],
      );
    }

    if (declarationKind === 'VariableDeclaration') {
      const variableDeclaration = this.readDeclarationNode(current);
      const variableInitializer = variableDeclaration != null && ts.isVariableDeclaration(variableDeclaration)
        ? variableDeclaration.initializer == null
          ? null
          : unwrapExpression(variableDeclaration.initializer)
        : null;

      if (variableInitializer != null && ts.isClassExpression(variableInitializer)) {
        return new ExportValueSurface(
          'variable-declaration',
          declarationKind,
          [
            'static-$au',
            'convention',
          ] satisfies readonly ExportValueCheckKind[],
          'class-expression',
        );
      }

      const defineCall = variableInitializer == null
        ? null
        : this.readDefineCall(variableInitializer, current);
      if (defineCall != null) {
        return new ExportValueSurface(
          'variable-declaration',
          declarationKind,
          [
            'define-call',
          ] satisfies readonly ExportValueCheckKind[],
          'resource-define-call',
          defineCall,
        );
      }

      // TODO: exported variable declarations still need broader initializer
      // value-shape recovery beyond direct class expressions and bounded
      // Aurelia `*.define(...)` call results.
      return new ExportValueSurface(
        'variable-declaration',
        declarationKind,
        [] satisfies readonly ExportValueCheckKind[],
      );
    }

    if (declarationKind === 'ExportAssignment') {
      // TODO: export-assignment value-shape recovery should eventually share
      // the same bounded define-call reader as exported variables. This first
      // slice keeps variable exports as the primary closed path.
      return new ExportValueSurface(
        'export-assignment',
        declarationKind,
        [] satisfies readonly ExportValueCheckKind[],
      );
    }

    return new ExportValueSurface('unknown', declarationKind, []);
  }

  classify(
    current: Export,
  ): ExportClassification {
    // TODO: a real export classifier should recover export route shape,
    // type/value/namespace posture, registry/configuration surfaces, and
    // resource candidacy. Returning unknown here is intentional until that
    // larger convergence algebra exists.
    const reasons = current.symbol == null
      ? ['Export has no closed symbol yet.']
      : ['Export classification has not been implemented yet.'];

    return new ExportClassification('unknown', reasons);
  }

  inspectState(): ExportScannerState {
    return {
      declarationOwnerLabel: this.declarationWorldValue.ownerLabel,
      parsedFileCount: this.parsedFiles.size,
    };
  }

  private readDeclarationNode(
    current: Export,
  ): ts.Node | null {
    const declaration = current.symbol?.declaration ?? null;
    const file = declaration?.file ?? current.sourceFile ?? current.symbol?.file ?? null;
    if (declaration == null || file == null) {
      return null;
    }

    const sourceFile = this.readSourceFile(file.path);
    if (sourceFile == null) {
      return null;
    }

    return findNodeBySpan(sourceFile, declaration.span.start, declaration.span.end);
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

  private readDefineCall(
    expression: ts.Expression,
    current: Export,
  ): ExportValueDefineCall | null {
    const call = unwrapExpression(expression);
    if (!ts.isCallExpression(call)) {
      return null;
    }

    const calleeText = readCallCalleeText(call.expression);
    // TODO: this first imperative-ingress slice only closes direct canonical
    // `CustomElement.define(...)` / `CustomAttribute.define(...)`-style callees.
    // Aliased or imported drivers such as `CE.define(...)` still need symbol-
    // backed callee recovery before they can participate honestly.
    const baseKind = calleeText != null && calleeText in DEFINE_CALL_RESOURCE_KIND_BY_CALLEE
      ? DEFINE_CALL_RESOURCE_KIND_BY_CALLEE[calleeText as keyof typeof DEFINE_CALL_RESOURCE_KIND_BY_CALLEE]
      : null;
    if (baseKind == null) {
      return null;
    }

    const declaration = current.symbol?.declaration;
    const file = declaration?.file ?? current.sourceFile ?? current.symbol?.file ?? null;
    if (declaration == null || file == null) {
      return null;
    }

    const sourceFile = this.readSourceFile(file.path);
    if (sourceFile == null) {
      return null;
    }

    const resourceKind = baseKind === 'custom-attribute' && readTrueBooleanObjectLiteralProperty(call.arguments[0] ?? null, 'isTemplateController')
      ? 'template-controller'
      : baseKind;
    const callSource = toNodeRef(call, file, sourceFile);
    const definitionArgument = readDefineCallDefinitionArgument(call.arguments[0] ?? null, file, sourceFile);
    const typeArgument = readDefineCallTypeArgument(
      resourceKind,
      call.arguments[1] ?? null,
      current,
      file,
      sourceFile,
    );

    return new ExportValueDefineCall(
      resourceKind,
      callSource,
      definitionArgument,
      typeArgument,
      'Bounded exported `*.define(...)` value-shape recovery over the current export initializer.',
    );
  }
}

function readDefineCallDefinitionArgument(
  expression: ts.Expression | null,
  file: NonNullable<DeclarationExport['sourceFile']>,
  sourceFile: ts.SourceFile,
): ExportValueDefineArgument {
  if (expression == null) {
    return new ExportValueDefineArgument(
      'missing',
      null,
      null,
      'No explicit definition/name argument was provided on this define call.',
    );
  }

  const current = unwrapExpression(expression);
  const stringValue = readStringLiteralValue(current);
  if (stringValue != null) {
    return new ExportValueDefineArgument(
      'string-literal',
      toNodeRef(current, file, sourceFile),
      stringValue,
      'Definition/name argument closed as a string literal.',
    );
  }

  if (ts.isObjectLiteralExpression(current)) {
    return new ExportValueDefineArgument(
      'object-literal',
      toNodeRef(current, file, sourceFile),
      readStringLiteralObjectProperty(current, 'name'),
      'Definition argument closed as an object literal.',
    );
  }

  return new ExportValueDefineArgument(
    'open',
    toNodeRef(current, file, sourceFile),
    null,
    'Definition/name argument stayed open under the current bounded value reader.',
  );
}

function readDefineCallTypeArgument(
  resourceKind: NonNullable<ExportValueDefineCall['resourceKind']>,
  expression: ts.Expression | null,
  current: Export,
  file: NonNullable<DeclarationExport['sourceFile']>,
  sourceFile: ts.SourceFile,
): ExportValueDefineType {
  const currentExpression = expression == null
    ? null
    : unwrapExpression(expression);

  if (
    expression == null
    || (resourceKind === 'custom-element' && currentExpression?.kind === ts.SyntaxKind.NullKeyword)
  ) {
    if (resourceKind === 'custom-element') {
      return new ExportValueDefineType(
        'generated-type',
        current.symbol,
        current.name,
        'CustomElement.define(def) and CustomElement.define(def, null) may generate a synthetic type; the exported result becomes the current best owner surface.',
      );
    }

    return new ExportValueDefineType(
      'export-result-reference',
      current.symbol,
      current.name,
      'No explicit type argument was recovered; the exported result remains the current best owner surface.',
    );
  }

  if (currentExpression == null) {
    return new ExportValueDefineType(
      'export-result-reference',
      current.symbol,
      current.name,
      'Type argument stayed open under the current bounded define-call reader.',
    );
  }

  if (ts.isClassExpression(currentExpression)) {
    return new ExportValueDefineType(
      'inline-class',
      toNodeRef(currentExpression, file, sourceFile),
      currentExpression.name?.text ?? current.name,
      'Type argument closed as an inline class expression.',
    );
  }

  if (ts.isIdentifier(currentExpression)) {
    const localCarrier = findLocalClassCarrierByName(sourceFile, currentExpression.text);
    if (localCarrier != null) {
      return new ExportValueDefineType(
        'local-class-reference',
        toNodeRef(localCarrier, file, sourceFile),
        currentExpression.text,
        'Type argument closed as a same-file class carrier reference.',
      );
    }
  }

  return new ExportValueDefineType(
    'export-result-reference',
    current.symbol,
    readIdentifierLikeName(currentExpression),
    'Type argument did not close to a same-file class carrier; the exported result remains the current best owner surface, so later class-local materialization stays open until a deeper value/reference lane exists.',
  );
}

function findLocalClassCarrierByName(
  sourceFile: ts.SourceFile,
  name: string,
): ts.ClassLikeDeclarationBase | null {
  for (const statement of sourceFile.statements) {
    if (ts.isClassDeclaration(statement) && statement.name?.text === name) {
      return statement;
    }

    if (!ts.isVariableStatement(statement)) {
      continue;
    }

    for (const declaration of statement.declarationList.declarations) {
      if (!ts.isIdentifier(declaration.name) || declaration.name.text !== name) {
        continue;
      }
      const initializer = declaration.initializer == null ? null : unwrapExpression(declaration.initializer);
      if (initializer != null && ts.isClassExpression(initializer)) {
        return initializer;
      }
    }
  }

  return null;
}

function readTrueBooleanObjectLiteralProperty(
  expression: ts.Expression | null,
  propertyName: string,
): boolean {
  if (expression == null) {
    return false;
  }

  const current = unwrapExpression(expression);
  if (!ts.isObjectLiteralExpression(current)) {
    return false;
  }

  for (const property of current.properties) {
    if (!ts.isPropertyAssignment(property) || readPropertyName(property.name) !== propertyName) {
      continue;
    }
    return unwrapExpression(property.initializer).kind === ts.SyntaxKind.TrueKeyword;
  }

  return false;
}

function readStringLiteralObjectProperty(
  objectLiteral: ts.ObjectLiteralExpression,
  propertyName: string,
): string | null {
  for (const property of objectLiteral.properties) {
    if (!ts.isPropertyAssignment(property) || readPropertyName(property.name) !== propertyName) {
      continue;
    }
    return readStringLiteralValue(unwrapExpression(property.initializer));
  }

  return null;
}

function readIdentifierLikeName(
  expression: ts.Expression,
): string | null {
  const current = unwrapExpression(expression);
  if (ts.isIdentifier(current)) {
    return current.text;
  }
  if (ts.isPropertyAccessExpression(current)) {
    return current.name.text;
  }
  return null;
}

function toNodeRef(
  node: ts.Node,
  file: NonNullable<DeclarationExport['sourceFile']>,
  sourceFile: ts.SourceFile,
): SourceNodeRef {
  return sourceNodeRefFromTsNode(file, node, sourceFile);
}

const DEFINE_CALL_RESOURCE_KIND_BY_CALLEE = {
  'CustomElement.define': 'custom-element',
  'CustomAttribute.define': 'custom-attribute',
  'ValueConverter.define': 'value-converter',
  'BindingBehavior.define': 'binding-behavior',
  'BindingCommand.define': 'binding-command',
} as const;
