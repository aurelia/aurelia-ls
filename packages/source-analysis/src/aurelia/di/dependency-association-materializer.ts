import fs from 'node:fs';
import ts from 'typescript';

import {
  findNodeBySpan,
  guessScriptKind,
  readCallCalleeText,
  readPropertyName,
  readReferenceSeed,
  unwrapExpression,
} from '../analysis/index.js';
import type { SourceFileRef } from '../source-address.js';
import {
  sourceNodeRefFromTsNode,
  type SourceNodeRef,
  type SymbolRef,
} from '../refs.js';
import {
  AllResourcesLookupRegime,
  OptionalResourceLookupRegime,
  ResourceResolverLookupRegime,
  type ResourceLookupRegime,
} from '../registrations/resource-lookup-regime.js';
import {
  DependencyAssociation,
  DependencySite,
  type DependencySiteKind,
} from './dependency-association.js';
import {
  InjectAnnotationDependencyAssociationSource,
  ResolveCallDependencyAssociationSource,
  StaticInjectDependencyAssociationSource,
} from './dependency-association-source.js';
import {
  DependencyAssociationProvenance,
  DependencyContributor,
  DependencyMaterialization,
} from './dependency-provenance.js';
import { DependencyOpenSeam } from './dependency-open-seam.js';
import { DependencyRequest } from './dependency-request.js';
import { DependencySubjectResolver } from './dependency-subject-resolver.js';
import {
  AllLookupModifier,
  FactoryLookupModifier,
  FromHydrationContextLookupModifier,
  LazyLookupModifier,
  NewInstanceForScopeLookupModifier,
  NewInstanceOfLookupModifier,
  OptionalLookupModifier,
  OwnLookupModifier,
  type LookupModifier,
} from './lookup-modifier.js';

export interface DependencyAssociationMaterializerState {
  readonly parsedFileCount: number;
}

interface PendingAssociation {
  readonly site: DependencySite;
  readonly contributor: DependencyContributor;
}

export class DependencyAssociationMaterializer {
  private readonly parsedFiles = new Map<string, ts.SourceFile | null>();
  private readonly subjectResolver = new DependencySubjectResolver();

  materialize(
    owner: SymbolRef | SourceNodeRef,
  ): DependencyMaterialization {
    const declaration = this.readDeclaration(owner);
    if (declaration == null) {
      return new DependencyMaterialization(
        owner,
        [],
        [
          new DependencyOpenSeam(
            'missing-declaration',
            owner.kind === 'source-node' ? owner : owner.declaration,
            null,
            'Dependency materialization needs a declaration-bearing source locus.',
          ),
        ],
      );
    }

    const classCarrier = readClassCarrier(declaration.node);
    if (classCarrier == null) {
      return new DependencyMaterialization(
        owner,
        [],
        [
          new DependencyOpenSeam(
            'unsupported-carrier',
            createNodeRef(declaration.file, declaration.sourceFile, declaration.node),
            null,
            'Ordinary DI materialization currently only supports class carriers.',
          ),
        ],
      );
    }

    const pending = [
      ...readStaticInjectAssociations(classCarrier, declaration.file, declaration.sourceFile),
      ...readClassInjectAssociations(classCarrier, declaration.file, declaration.sourceFile),
      ...readFieldInjectAssociations(classCarrier, declaration.file, declaration.sourceFile),
      ...readResolveAssociations(classCarrier, declaration.file, declaration.sourceFile),
    ];
    const openSeams = readOpenSeams(classCarrier, declaration.file, declaration.sourceFile, pending);

    const grouped = new Map<string, PendingAssociation[]>();
    for (const association of pending) {
      const key = `${association.site.kind}:${association.site.location ?? ''}`;
      const existing = grouped.get(key);
      if (existing == null) {
        grouped.set(key, [association]);
      } else {
        existing.push(association);
      }
    }

    return new DependencyMaterialization(
      owner,
      [...grouped.values()]
        .map((current, index) => materializeAssociation(owner, current, index, declaration.file, declaration.sourceFile, this.subjectResolver))
        .sort(compareAssociations),
      openSeams,
    );
  }

  inspectState(): DependencyAssociationMaterializerState {
    return {
      parsedFileCount: this.parsedFiles.size,
    };
  }

  private readDeclaration(
    owner: SymbolRef | SourceNodeRef,
  ): {
    readonly file: SourceFileRef;
    readonly node: ts.Node;
    readonly sourceFile: ts.SourceFile;
  } | null {
    const file = owner.kind === 'source-node'
      ? owner.file
      : owner.file;
    const declaration = owner.kind === 'source-node'
      ? owner
      : owner.declaration;
    if (file == null || declaration == null) {
      return null;
    }

    const sourceFile = this.readSourceFile(file);
    if (sourceFile == null) {
      return null;
    }

    const node = findNodeBySpan(sourceFile, declaration.span.start, declaration.span.end);
    return node == null ? null : { file, node, sourceFile };
  }

  private readSourceFile(
    file: SourceFileRef,
  ): ts.SourceFile | null {
    if (this.parsedFiles.has(file.path)) {
      return this.parsedFiles.get(file.path) ?? null;
    }

    try {
      const text = fs.readFileSync(file.path, 'utf8');
      const parsed = ts.createSourceFile(
        file.path,
        text,
        ts.ScriptTarget.Latest,
        true,
        guessScriptKind(file.path),
      );
      this.parsedFiles.set(file.path, parsed);
      return parsed;
    } catch {
      this.parsedFiles.set(file.path, null);
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
    && ts.isClassExpression(unwrapExpression(declarationNode.initializer))
  ) {
    return unwrapExpression(declarationNode.initializer) as ts.ClassExpression;
  }

  return null;
}

function readStaticInjectAssociations(
  declarationNode: ts.ClassLikeDeclarationBase,
  file: SourceFileRef,
  sourceFile: ts.SourceFile,
): readonly PendingAssociation[] {
  const pending: PendingAssociation[] = [];

  for (const member of declarationNode.members) {
    if (!('name' in member) || member.name == null || !isStatic(member)) {
      continue;
    }

    const name = readPropertyName(member.name);
    if (name !== 'inject') {
      continue;
    }

    const expressions = readStaticInjectExpressions(member);
    let index = 0;
    for (const expression of expressions) {
      const request = readDependencyRequest(expression, file, sourceFile);
      const sourceNode = createNodeRef(file, sourceFile, expression);
      pending.push({
        site: new DependencySite(
          'constructor-parameter',
          createNodeRef(file, sourceFile, declarationNode),
          createNodeRef(file, sourceFile, member),
          `parameter[${index}]`,
        ),
        contributor: new DependencyContributor(
          new StaticInjectDependencyAssociationSource(
            'Dependency associated through the static inject array.',
          ),
          request,
          sourceNode,
        ),
      });
      index += 1;
    }
  }

  return pending;
}

function readClassInjectAssociations(
  declarationNode: ts.ClassLikeDeclarationBase,
  file: SourceFileRef,
  sourceFile: ts.SourceFile,
): readonly PendingAssociation[] {
  // TODO: route decorator helper identity through framework API ingress once
  // ordinary DI helper aliasing matters. This first pass only recognizes
  // source-literal inject(...) calls.
  const pending: PendingAssociation[] = [];
  for (const decorator of readDecorators(declarationNode)) {
    const expression = unwrapExpression(decorator.expression);
    if (!ts.isCallExpression(expression) || readCallCalleeText(expression.expression) !== 'inject') {
      continue;
    }

    if (expression.arguments.length === 0) {
      continue;
    }

    let index = 0;
    for (const argument of expression.arguments) {
      pending.push({
        site: new DependencySite(
          'constructor-parameter',
          createNodeRef(file, sourceFile, declarationNode),
          createNodeRef(file, sourceFile, decorator),
          `parameter[${index}]`,
        ),
        contributor: new DependencyContributor(
          new InjectAnnotationDependencyAssociationSource(
            'Dependency associated through @inject(...) decorator metadata.',
          ),
          readDependencyRequest(argument, file, sourceFile),
          createNodeRef(file, sourceFile, argument),
        ),
      });
      index += 1;
    }
  }

  return pending;
}

function readFieldInjectAssociations(
  declarationNode: ts.ClassLikeDeclarationBase,
  file: SourceFileRef,
  sourceFile: ts.SourceFile,
): readonly PendingAssociation[] {
  // TODO: field @inject(...) currently closes metadata association only.
  // Later DI/container-state work still needs to decide how, where, or whether
  // that property-keyed metadata is spent beyond declaration-side recovery.
  const pending: PendingAssociation[] = [];

  for (const member of declarationNode.members) {
    if (!('name' in member) || member.name == null) {
      continue;
    }

    const propertyName = readPropertyName(member.name);
    if (propertyName == null) {
      continue;
    }

    for (const decorator of readDecorators(member)) {
      const expression = unwrapExpression(decorator.expression);
      if (!ts.isCallExpression(expression) || readCallCalleeText(expression.expression) !== 'inject') {
        continue;
      }

      if (expression.arguments.length === 0) {
        continue;
      }

      const argument = expression.arguments[0]!;
      pending.push({
        site: new DependencySite(
          isStatic(member) ? 'static-field' : 'instance-field',
          createNodeRef(file, sourceFile, declarationNode),
          createNodeRef(file, sourceFile, member),
          `field:${propertyName}`,
        ),
        contributor: new DependencyContributor(
          new InjectAnnotationDependencyAssociationSource(
            'Field dependency associated through @inject(...) decorator metadata.',
          ),
          readDependencyRequest(argument, file, sourceFile),
          createNodeRef(file, sourceFile, argument),
          expression.arguments.length > 1
            ? 'Field @inject(...) only consumes the first dependency argument in kernel today.'
            : null,
        ),
      });
    }
  }

  return pending;
}

function readResolveAssociations(
  declarationNode: ts.ClassLikeDeclarationBase,
  file: SourceFileRef,
  sourceFile: ts.SourceFile,
): readonly PendingAssociation[] {
  const pending: PendingAssociation[] = [];

  const constructor = declarationNode.members.find(ts.isConstructorDeclaration) ?? null;
  if (constructor != null) {
    constructor.parameters.forEach((parameter, index) => {
      if (parameter.initializer == null) {
        return;
      }

      const calls = readResolveRequests(parameter.initializer);
      if (calls.length === 0) {
        return;
      }

      calls.forEach((requestExpression, requestIndex) => {
        pending.push({
          site: new DependencySite(
            'resolve-call',
            createNodeRef(file, sourceFile, declarationNode),
            createNodeRef(file, sourceFile, parameter),
            calls.length === 1
              ? `parameter[${index}]`
              : `parameter[${index}][${requestIndex}]`,
          ),
          contributor: new DependencyContributor(
            new ResolveCallDependencyAssociationSource(
              'Dependency associated through constructor parameter resolve(...) fallback.',
            ),
            readDependencyRequest(requestExpression, file, sourceFile),
            createNodeRef(file, sourceFile, requestExpression),
          ),
        });
      });
    });
  }

  for (const member of declarationNode.members) {
    if (!('name' in member) || member.name == null || !ts.isPropertyDeclaration(member) || member.initializer == null) {
      continue;
    }

    const propertyName = readPropertyName(member.name);
    if (propertyName == null) {
      continue;
    }

    const calls = readResolveRequests(member.initializer);
    if (calls.length === 0) {
      continue;
    }

    calls.forEach((requestExpression, requestIndex) => {
      pending.push({
        site: new DependencySite(
          'resolve-call',
          createNodeRef(file, sourceFile, declarationNode),
          createNodeRef(file, sourceFile, member),
          calls.length === 1
            ? `field:${propertyName}`
            : `field:${propertyName}[${requestIndex}]`,
        ),
        contributor: new DependencyContributor(
          new ResolveCallDependencyAssociationSource(
            'Dependency associated through field initializer resolve(...) call.',
          ),
          readDependencyRequest(requestExpression, file, sourceFile),
          createNodeRef(file, sourceFile, requestExpression),
        ),
      });
    });
  }

  return pending;
}

function readOpenSeams(
  declarationNode: ts.ClassLikeDeclarationBase,
  file: SourceFileRef,
  sourceFile: ts.SourceFile,
  pending: readonly PendingAssociation[],
): readonly DependencyOpenSeam[] {
  // TODO: design:paramtypes and prototype fallback want a stronger TS-backed
  // seam than this source-only pass. Keep those burdens explicit until we have
  // a bounded checker/metadata bridge rather than guessing from type syntax.
  const seams: DependencyOpenSeam[] = [];
  const declarationSource = createNodeRef(file, sourceFile, declarationNode);
  const constructor = declarationNode.members.find(ts.isConstructorDeclaration) ?? null;
  if (constructor != null && constructor.parameters.length > 0) {
    const explicitConstructorSites = new Set(
      pending
        .filter((current) => current.site.kind === 'constructor-parameter')
        .map((current) => current.site.location),
    );
    const missing = constructor.parameters
      .map((_, index) => `parameter[${index}]`)
      .filter((location) => !explicitConstructorSites.has(location));
    if (missing.length > 0) {
      seams.push(
        new DependencyOpenSeam(
          'design-paramtypes-open',
          declarationSource,
          missing.join(', '),
          `Constructor slots ${missing.join(', ')} still depend on a later design:paramtypes seam; this pass only closes source-explicit DI surfaces.`,
        ),
      );
    }
  }

  if (hasExtendsClause(declarationNode)) {
    seams.push(
      new DependencyOpenSeam(
        'prototype-fallback-open',
        declarationSource,
        null,
        'Prototype inheritance fallback from DI.getDependencies(...) is not yet materialized; inherited ordinary DI remains open in this first source-level pass.',
      ),
    );
  }

  if (hasImplicitInjectDecorator(declarationNode)) {
    seams.push(
      new DependencyOpenSeam(
        'implicit-inject-open',
        declarationSource,
        null,
        'Implicit @inject() without explicit arguments still depends on decorator metadata emission; this pass does not pretend that design:paramtypes is already closed from source alone.',
      ),
    );
  }

  if (hasImplicitFieldInjectDecorator(declarationNode)) {
    seams.push(
      new DependencyOpenSeam(
        'implicit-field-inject-open',
        declarationSource,
        null,
        'Implicit field @inject() remains open for the same metadata-emission reason; only explicit field @inject(Key) is closed here.',
      ),
    );
  }

  return dedupeOpenSeams(seams);
}

function materializeAssociation(
  owner: SymbolRef | SourceNodeRef,
  pending: readonly PendingAssociation[],
  index: number,
  file: SourceFileRef,
  sourceFile: ts.SourceFile,
  subjectResolver: DependencySubjectResolver,
): DependencyAssociation {
  const site = pending[0]?.site;
  if (site == null) {
    throw new Error('Expected at least one pending dependency association.');
  }

  const contributors = [...pending.map((current) => current.contributor)];
  const selected = selectContributor(site.kind, contributors);
  const provenance = new DependencyAssociationProvenance(
    contributors.length > 1 ? 'overlay' : 'selected',
    selected,
    contributors,
    contributors.length > 1
      ? 'This dependency site had more than one source-level contributor, so the selected request reflects a bounded precedence choice over preserved contributors.'
      : null,
  );
  const resolvedRequest = selected?.request ?? contributors[0]?.request ?? new DependencyRequest(
    'open-expression',
    null,
    'open-expression',
    null,
    [],
    null,
    'Dependency request did not materialize.',
  );
  const resolution = subjectResolver.resolveInSourceFile(
    resolvedRequest,
    file,
    sourceFile,
  );

  return new DependencyAssociation(
    `dependency-association:${owner.id}:${index}`,
    site,
    resolvedRequest,
    null,
    provenance,
    selected?.note ?? null,
    resolution,
  );
}

function selectContributor(
  siteKind: DependencySiteKind,
  contributors: readonly DependencyContributor[],
): DependencyContributor | null {
  if (contributors.length === 0) {
    return null;
  }

  const weighted = [...contributors].sort((left, right) =>
    contributorPrecedence(siteKind, right.source.kind) - contributorPrecedence(siteKind, left.source.kind),
  );
  return weighted[0] ?? null;
}

function contributorPrecedence(
  siteKind: DependencySiteKind,
  kind: import('./dependency-association-source.js').DependencyAssociationSourceKind,
): number {
  if (siteKind === 'constructor-parameter') {
    switch (kind) {
      case 'static-inject':
        return 40;
      case 'annotation-paramtypes':
        return 30;
      case 'design-paramtypes':
        return 20;
      default:
        return 0;
    }
  }

  switch (kind) {
    case 'annotation-paramtypes':
      return 20;
    case 'design-paramtypes':
      return 10;
    default:
      return 0;
  }
}

function compareAssociations(
  left: DependencyAssociation,
  right: DependencyAssociation,
): number {
  return `${left.site.kind}:${left.site.location ?? ''}`.localeCompare(`${right.site.kind}:${right.site.location ?? ''}`);
}

function readStaticInjectExpressions(
  member: ts.ClassElement,
): readonly ts.Expression[] {
  if (ts.isPropertyDeclaration(member) && member.initializer != null) {
    return readArrayExpressions(member.initializer);
  }

  if (ts.isGetAccessorDeclaration(member) && member.body != null) {
    for (const statement of member.body.statements) {
      if (ts.isReturnStatement(statement) && statement.expression != null) {
        return readArrayExpressions(statement.expression);
      }
    }
  }

  return [];
}

function readArrayExpressions(
  expression: ts.Expression,
): readonly ts.Expression[] {
  const current = unwrapExpression(expression);
  if (!ts.isArrayLiteralExpression(current)) {
    return [];
  }

  return current.elements.map((element) =>
    ts.isSpreadElement(element)
      ? unwrapExpression(element.expression)
      : unwrapExpression(element),
  );
}

function readResolveRequests(
  expression: ts.Expression,
): readonly ts.Expression[] {
  const current = unwrapExpression(expression);
  if (!ts.isCallExpression(current) || readCallCalleeText(current.expression) !== 'resolve') {
    return [];
  }

  return [...current.arguments];
}

function readDependencyRequest(
  expression: ts.Expression,
  file: SourceFileRef,
  sourceFile: ts.SourceFile,
): DependencyRequest {
  const current = unwrapExpression(expression);
  const helperName = ts.isCallExpression(current)
    ? readCallCalleeText(current.expression)
    : null;

  if (ts.isCallExpression(current) && helperName != null && current.arguments.length > 0) {
    const modifier = readLookupModifier(helperName, file, sourceFile, current);
    const resourceRegime = readResourceLookupRegime(helperName, file, sourceFile, current);
    if (modifier != null || resourceRegime != null) {
      const inner = readDependencyRequest(current.arguments[0]!, file, sourceFile);
      return new DependencyRequest(
        'helper-wrapped',
        createNodeRef(file, sourceFile, current),
        inner.seedKind,
        inner.candidateName,
        modifier == null
          ? inner.lookupModifiers
          : [...inner.lookupModifiers, modifier],
        resourceRegime ?? inner.resourceLookupRegime,
        inner.note,
      );
    }
  }

  const seed = readReferenceSeed(current);
  return new DependencyRequest(
    seed.kind === 'open-expression' ? 'open-expression' : 'direct-key',
    createNodeRef(file, sourceFile, current),
    seed.kind,
    seed.candidateName,
    [],
    null,
    seed.kind === 'open-expression'
      ? 'Dependency request remained open under the current bounded expression reader.'
      : null,
  );
}

function readLookupModifier(
  helperName: string,
  file: SourceFileRef,
  sourceFile: ts.SourceFile,
  expression: ts.CallExpression,
): LookupModifier | null {
  void file;
  void sourceFile;
  void expression;

  switch (helperName) {
    case 'all':
      return new AllLookupModifier();
    case 'lazy':
      return new LazyLookupModifier();
    case 'optional':
      return new OptionalLookupModifier();
    case 'factory':
      return new FactoryLookupModifier();
    case 'own':
      return new OwnLookupModifier();
    case 'fromHydrationContext':
      return new FromHydrationContextLookupModifier();
    case 'newInstanceOf':
      return new NewInstanceOfLookupModifier();
    case 'newInstanceForScope':
      return new NewInstanceForScopeLookupModifier();
    default:
      return null;
  }
}

function readResourceLookupRegime(
  helperName: string,
  file: SourceFileRef,
  sourceFile: ts.SourceFile,
  expression: ts.CallExpression,
): ResourceLookupRegime | null {
  void file;
  void sourceFile;
  void expression;

  switch (helperName) {
    case 'resource':
      return new ResourceResolverLookupRegime();
    case 'optionalResource':
      return new OptionalResourceLookupRegime();
    case 'allResources':
      return new AllResourcesLookupRegime();
    default:
      return null;
  }
}

function readDecorators(
  node: ts.Node,
): readonly ts.Decorator[] {
  return ts.canHaveDecorators(node)
    ? ts.getDecorators(node) ?? []
    : [];
}

function hasImplicitInjectDecorator(
  declarationNode: ts.ClassLikeDeclarationBase,
): boolean {
  return readDecorators(declarationNode).some((decorator) => {
    const expression = unwrapExpression(decorator.expression);
    return ts.isCallExpression(expression)
      && readCallCalleeText(expression.expression) === 'inject'
      && expression.arguments.length === 0;
  });
}

function hasImplicitFieldInjectDecorator(
  declarationNode: ts.ClassLikeDeclarationBase,
): boolean {
  return declarationNode.members.some((member) =>
    readDecorators(member).some((decorator) => {
      const expression = unwrapExpression(decorator.expression);
      return ts.isCallExpression(expression)
        && readCallCalleeText(expression.expression) === 'inject'
        && expression.arguments.length === 0;
    }),
  );
}

function hasExtendsClause(
  declarationNode: ts.ClassLikeDeclarationBase,
): boolean {
  return declarationNode.heritageClauses?.some((current) => current.token === ts.SyntaxKind.ExtendsKeyword) ?? false;
}

function isStatic(
  member: ts.ClassElement,
): boolean {
  return ts.canHaveModifiers(member)
    ? (ts.getModifiers(member)?.some((current) => current.kind === ts.SyntaxKind.StaticKeyword) ?? false)
    : false;
}

function createNodeRef(
  file: SourceFileRef,
  sourceFile: ts.SourceFile,
  node: ts.Node,
): SourceNodeRef {
  return sourceNodeRefFromTsNode(file, node, sourceFile);
}

function dedupeOpenSeams(
  seams: readonly DependencyOpenSeam[],
): readonly DependencyOpenSeam[] {
  const seen = new Set<string>();
  const result: DependencyOpenSeam[] = [];
  for (const seam of seams) {
    const key = `${seam.kind}:${seam.location ?? ''}:${seam.note ?? ''}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    result.push(seam);
  }
  return result;
}
