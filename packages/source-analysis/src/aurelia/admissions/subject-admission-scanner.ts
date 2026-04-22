import fs from 'node:fs';
import ts from 'typescript';

import {
  findNodeBySpan,
  guessScriptKind,
  hasStaticModifier,
  readCallCalleeText,
  readPropertyName,
} from '../analysis/index.js';
import type { Configurations } from '../configurations/index.js';
import type { Export, Exports } from '../exports/index.js';
import type { Resources } from '../resources/index.js';
import { AdmittedSubject } from './admitted-subject.js';

export interface SubjectAdmissionScannerOptions {
  readonly configurations: Configurations;
  readonly exports: Exports;
  readonly resources: Resources;
}

export interface SubjectAdmissionScannerState {
  readonly ownerLabel: string;
}

export class SubjectAdmissionScanner {
  private readonly configurationsValue: Configurations;
  private readonly exportsValue: Exports;
  private readonly resourcesValue: Resources;
  private readonly parsedFiles = new Map<string, ts.SourceFile | null>();

  constructor(
    options: SubjectAdmissionScannerOptions,
  ) {
    this.configurationsValue = options.configurations;
    this.exportsValue = options.exports;
    this.resourcesValue = options.resources;
  }

  readAdmission(
    id: string,
    source: import('../refs.js').SourceNodeRef,
    referenceName: string,
  ): AdmittedSubject {
    const matchingExports = this.exportsValue.find(referenceName);
    if (matchingExports.length !== 1) {
      return matchingExports.length > 1
        ? new AdmittedSubject(
          id,
          source,
          referenceName,
          'open',
          'open',
          null,
          null,
          `Reference ${referenceName} is ambiguous across multiple exported Aurelia subjects.`,
        )
        : new AdmittedSubject(
          id,
          source,
          referenceName,
          'open',
          'open',
          null,
          null,
          `Reference ${referenceName} does not yet resolve to a unique exported Aurelia subject.`,
        );
    }

    const resolvedExport = matchingExports[0] ?? null;
    if (resolvedExport == null) {
      return new AdmittedSubject(
        id,
        source,
        referenceName,
        'open',
        'open',
        null,
        null,
        `Reference ${referenceName} matched an empty export resolution unexpectedly.`,
      );
    }

    const defineCallAdmission = readDefineCallAdmission(id, source, referenceName, resolvedExport);
    if (defineCallAdmission != null) {
      return defineCallAdmission;
    }

    const existingResource = this.resourcesValue.readAll().find((current) =>
      getResourceTypeName(current) === referenceName,
    ) ?? null;
    if (existingResource != null) {
      return fromExistingResource(id, source, referenceName, resolvedExport, existingResource.kind);
    }

    if (this.configurationsValue.readRegistryObjects().some((current) => current.sourceExport.name === referenceName)) {
      return new AdmittedSubject(
        id,
        source,
        referenceName,
        'registry',
        'registry-registration',
        resolvedExport,
        null,
        `Resolved ${referenceName} as an exported registry surface.`,
      );
    }

    const declarationAdmission = this.readDeclarationAdmission(id, source, referenceName, resolvedExport);
    if (declarationAdmission != null) {
      return declarationAdmission;
    }

    // TODO: deeper initializer/value evaluation still needs to land for
    // wrapper-heavy or factory-heavy service admission surfaces.
    // This seam now intentionally avoids bundle/path heuristics.
    return new AdmittedSubject(
      id,
      source,
      referenceName,
      'open',
      'open',
      resolvedExport,
      null,
      `Reference ${referenceName} resolved, but its admission carrier and policy are not yet closed under the current bounded declaration seam.`,
    );
  }

  inspectState(): SubjectAdmissionScannerState {
    return {
      ownerLabel: this.exportsValue.ownerLabel,
    };
  }

  private readDeclarationAdmission(
    id: string,
    source: import('../refs.js').SourceNodeRef,
    referenceName: string,
    resolvedExport: Export,
  ): AdmittedSubject | null {
    const declarationNode = this.readDeclarationNode(resolvedExport);
    if (declarationNode == null) {
      return null;
    }

    if (ts.isClassDeclaration(declarationNode)) {
      const classAdmission = classifyClassDeclaration(declarationNode);
      if (classAdmission != null) {
        return new AdmittedSubject(
          id,
          source,
          referenceName,
          classAdmission.carrier,
          classAdmission.policy,
          resolvedExport,
          classAdmission.declarationKind,
          classAdmission.note,
        );
      }

      return new AdmittedSubject(
        id,
        source,
        referenceName,
        'service',
        'service-container',
        resolvedExport,
        null,
        `Closed ${referenceName} as a plain class admitted through the container's self-registration path.`,
      );
    }

    if (ts.isVariableDeclaration(declarationNode)) {
      const variableAdmission = classifyVariableDeclaration(declarationNode);
      if (variableAdmission != null) {
        return new AdmittedSubject(
          id,
          source,
          referenceName,
          variableAdmission.carrier,
          variableAdmission.policy,
          resolvedExport,
          variableAdmission.declarationKind,
          variableAdmission.note,
        );
      }
    }

    return null;
  }

  private readDeclarationNode(
    resolvedExport: Export,
  ): ts.Node | null {
    const declaration = resolvedExport.symbol?.declaration;
    const filePath = resolvedExport.sourceFile?.path ?? resolvedExport.symbol?.file?.path ?? null;
    if (declaration == null || filePath == null) {
      return null;
    }

    const sourceFile = this.readSourceFile(filePath);
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
}

function fromExistingResource(
  id: string,
  source: import('../refs.js').SourceNodeRef,
  referenceName: string,
  resolvedExport: Export,
  resourceKind: import('../resources/index.js').ResourceDefinitionKind,
): AdmittedSubject {
  switch (resourceKind) {
    case 'attribute-pattern':
      return new AdmittedSubject(
        id,
        source,
        referenceName,
        'registrable-metadata-registry',
        'compiler-root-only',
        resolvedExport,
        resourceKind,
        `Closed ${referenceName} through existing attribute-pattern admission materialization.`,
      );
    case 'binding-command':
      return new AdmittedSubject(
        id,
        source,
        referenceName,
        'resource-definition',
        'compiler-root-only',
        resolvedExport,
        resourceKind,
        `Closed ${referenceName} through existing binding-command definition materialization.`,
      );
    default:
      return new AdmittedSubject(
        id,
        source,
        referenceName,
        'resource-definition',
        'template-local-or-root',
        resolvedExport,
        resourceKind,
        `Closed ${referenceName} through existing resource-definition materialization.`,
      );
  }
}

function readDefineCallAdmission(
  id: string,
  source: import('../refs.js').SourceNodeRef,
  referenceName: string,
  resolvedExport: Export,
): AdmittedSubject | null {
  const defineCall = resolvedExport.readValueSurface().defineCall;
  if (defineCall == null) {
    return null;
  }

  const declarationKind = defineCall.resourceKind;
  const policy = declarationKind === 'binding-command'
    ? 'compiler-root-only'
    : 'template-local-or-root';

  return new AdmittedSubject(
    id,
    source,
    referenceName,
    'resource-definition',
    policy,
    resolvedExport,
    declarationKind,
    declarationKind === 'template-controller'
      ? `Closed ${referenceName} through exported CustomAttribute.define(...) value-shape recovery whose definition object admitted template-controller shape.`
      : `Closed ${referenceName} through exported ${declarationKind} define-call value-shape recovery.`,
  );
}

function getResourceTypeName(
  resource: import('../resources/index.js').ResourceDefinition,
): string | null {
  const type = resource.type;
  if ('name' in type && typeof type.name === 'string') {
    return type.name;
  }

  return null;
}

function classifyClassDeclaration(
  declarationNode: ts.ClassDeclaration,
): {
  readonly carrier: AdmittedSubject['carrier'];
  readonly policy: AdmittedSubject['policy'];
  readonly declarationKind: import('../resources/index.js').ResourceDefinitionKind | null;
  readonly note: string;
} | null {
  const staticAuType = readStaticAuType(declarationNode);
  if (staticAuType != null) {
    return {
      carrier: 'resource-definition',
      policy: staticAuType === 'binding-command' ? 'compiler-root-only' : 'template-local-or-root',
      declarationKind: staticAuType,
      note: 'Closed from static $au resource declaration on the class.',
    };
  }

  if (hasAttributePatternRegistrableMetadata(declarationNode)) {
    return {
      carrier: 'registrable-metadata-registry',
      policy: 'compiler-root-only',
      declarationKind: 'attribute-pattern',
      note: 'Closed from class-level registrableMetadataKey -> AttributePattern.create(...) admission.',
    };
  }

  return null;
}

function classifyVariableDeclaration(
  declarationNode: ts.VariableDeclaration,
): {
  readonly carrier: AdmittedSubject['carrier'];
  readonly policy: AdmittedSubject['policy'];
  readonly declarationKind: import('../resources/index.js').ResourceDefinitionKind | null;
  readonly note: string;
} | null {
  const initializer = declarationNode.initializer;
  if (initializer == null) {
    return null;
  }

  if (ts.isClassExpression(initializer)) {
    return {
      carrier: 'service',
      policy: 'service-container',
      declarationKind: null,
      note: 'Closed from exported class-expression value admitted as a plain service.',
    };
  }

  if (ts.isObjectLiteralExpression(initializer) && hasRegisterMethod(initializer)) {
    return {
      carrier: 'registry',
      policy: 'registry-registration',
      declarationKind: null,
      note: 'Closed from exported object-literal register(container) surface.',
    };
  }

  if (ts.isCallExpression(initializer)) {
    const calleeText = readCallCalleeText(initializer.expression);
    if (calleeText === 'renderer' && initializer.arguments.some(ts.isClassExpression)) {
      return {
        carrier: 'renderer',
        policy: 'instruction-renderer',
        declarationKind: null,
        // TODO: route renderer(...) through framework-API ingress once the
        // clean room has a better declaration-side wrapper recovery seam.
        // For now this only closes the shallow renderer family, not any of
        // the downstream instruction/hydration semantics that renderers
        // ultimately govern.
        note: 'Closed from renderer(...) wrapper over a class implementation.',
      };
    }

    if (calleeText === 'AttributePattern.create') {
      return {
        carrier: 'registrable-metadata-registry',
        policy: 'compiler-root-only',
        declarationKind: 'attribute-pattern',
        note: 'Closed from AttributePattern.create(...) registrable-metadata wrapper.',
      };
    }

    if (calleeText === 'TemplateCompilerHooks.define') {
      return {
        carrier: 'registry',
        policy: 'registry-registration',
        declarationKind: null,
        note: 'Closed from TemplateCompilerHooks.define(...) registry factory.',
      };
    }
  }

  return null;
}

function readStaticAuType(
  declarationNode: ts.ClassDeclaration,
): import('../resources/index.js').ResourceDefinitionKind | null {
  for (const member of declarationNode.members) {
    if (!hasStaticModifier(member) || !ts.isPropertyDeclaration(member)) {
      continue;
    }
    if (!ts.isIdentifier(member.name) || member.name.text !== '$au') {
      continue;
    }
    if (member.initializer == null || !ts.isObjectLiteralExpression(member.initializer)) {
      continue;
    }

    const typeProperty = member.initializer.properties.find((current) =>
      ts.isPropertyAssignment(current)
      && ts.isIdentifier(current.name)
      && current.name.text === 'type'
    );
    if (
      typeProperty != null
      && ts.isPropertyAssignment(typeProperty)
      && ts.isStringLiteral(typeProperty.initializer)
    ) {
      const typeText = typeProperty.initializer.text;
      if (isResourceDefinitionKind(typeText)) {
        return typeText;
      }
    }
  }

  return null;
}

function hasAttributePatternRegistrableMetadata(
  declarationNode: ts.ClassDeclaration,
): boolean {
  for (const member of declarationNode.members) {
    if (!hasStaticModifier(member) || !ts.isPropertyDeclaration(member) || member.initializer == null) {
      continue;
    }
    if (!ts.isComputedPropertyName(member.name)) {
      continue;
    }
    if (member.name.expression.getText() !== 'Symbol.metadata') {
      continue;
    }
    if (!ts.isObjectLiteralExpression(member.initializer)) {
      continue;
    }

    for (const property of member.initializer.properties) {
      if (!ts.isPropertyAssignment(property) || !ts.isComputedPropertyName(property.name)) {
        continue;
      }
      if (property.name.expression.getText() !== 'registrableMetadataKey') {
        continue;
      }
      if (
        ts.isCallExpression(property.initializer)
        && readCallCalleeText(property.initializer.expression) === 'AttributePattern.create'
      ) {
        return true;
      }
    }
  }

  return false;
}

function hasRegisterMethod(
  literal: ts.ObjectLiteralExpression,
): boolean {
  return literal.properties.some((current) => {
    if (ts.isMethodDeclaration(current)) {
      return readPropertyName(current.name) === 'register';
    }
    if (ts.isPropertyAssignment(current)) {
      return readPropertyName(current.name) === 'register'
        && (ts.isFunctionExpression(current.initializer) || ts.isArrowFunction(current.initializer));
    }
    return false;
  });
}

function isResourceDefinitionKind(
  value: string,
): value is import('../resources/index.js').ResourceDefinitionKind {
  return value === 'custom-element'
    || value === 'custom-attribute'
    || value === 'template-controller'
    || value === 'value-converter'
    || value === 'binding-behavior'
    || value === 'binding-command'
    || value === 'attribute-pattern';
}
