import fs from 'node:fs';
import ts from 'typescript';

import {
  findNodeBySpan,
  guessScriptKind,
  hasStaticModifier,
  readPropertyName,
  readReferenceSeed,
  readStringArrayValues,
  readStringLiteralValue,
  unwrapExpression,
} from '../analysis/index.js';
import {
  SourceNodeRef,
  SourceSpan,
  type SourceFileRef,
} from '../refs.js';
import { CustomAttributeDefinition } from './custom-attribute-definition.js';
import {
  CustomAttributeBindableEntry,
  CustomAttributeBindableFieldProvenance,
  CustomAttributeBindableFieldWitness,
  CustomAttributeBindableSurface,
  CustomAttributeDependencyContribution,
  CustomAttributeDependencyEntry,
  CustomAttributeFieldProvenance,
  CustomAttributeFieldWitness,
  CustomAttributeIdentity,
  CustomAttributePolicy,
  type CustomAttributeBindableFieldKind,
  type CustomAttributeBindableInterceptorKind,
  type CustomAttributeDependencyLinkSeedKind,
  type CustomAttributeDependencySourceKind,
  type CustomAttributeSupportCarrierKind,
  type CustomAttributeSupportFieldKind,
} from './custom-attribute-support.js';
import { TemplateControllerDefinition } from './template-controller-definition.js';

export interface CustomAttributeMaterializerState {
  readonly parsedFileCount: number;
}

interface CustomAttributeSurface {
  readonly identity: CustomAttributeIdentity;
  readonly bindableSurface: CustomAttributeBindableSurface;
  readonly policy: CustomAttributePolicy;
  readonly dependencyContribution: CustomAttributeDependencyContribution;
}

interface FieldContributor {
  readonly expression: ts.Expression | null;
  readonly contribution: CustomAttributeFieldWitness;
}

interface BindableContributor {
  readonly bindableName: string | null;
  readonly fields: Partial<Record<CustomAttributeBindableFieldKind, ts.Expression | null>>;
  readonly contribution: CustomAttributeBindableFieldWitness;
}

export class CustomAttributeMaterializer {
  private readonly parsedFiles = new Map<string, ts.SourceFile | null>();

  materialize(
    definition: CustomAttributeDefinition | TemplateControllerDefinition,
  ): CustomAttributeDefinition | TemplateControllerDefinition {
    const declaration = this.readDeclaration(definition.type);
    if (declaration == null) {
      return definition;
    }

    const classCarrier = readClassCarrier(declaration.node);
    if (classCarrier == null) {
      return definition;
    }

    const surface = readCustomAttributeSurface(classCarrier, declaration.file, declaration.sourceFile);

    if (definition.kind === 'custom-attribute') {
      return new CustomAttributeDefinition(
        definition.id,
        definition.type,
        mergeIdentity(definition.identity, surface.identity),
        mergeBindableSurface(definition.bindableSurface, surface.bindableSurface),
        mergePolicy(definition.policy, surface.policy),
        mergeDependencyContribution(definition.dependencyContribution, surface.dependencyContribution),
        definition.defaultBindingMode,
      );
    }

    return new TemplateControllerDefinition(
      definition.id,
      definition.type,
      mergeIdentity(definition.identity, surface.identity),
      mergeBindableSurface(definition.bindableSurface, surface.bindableSurface),
      mergePolicy(definition.policy, surface.policy),
      mergeDependencyContribution(definition.dependencyContribution, surface.dependencyContribution),
    );
  }

  inspectState(): CustomAttributeMaterializerState {
    return {
      parsedFileCount: this.parsedFiles.size,
    };
  }

  private readDeclaration(
    type: import('./contracts.js').ResourceDefinitionType,
  ): {
    readonly node: ts.Node;
    readonly file: SourceFileRef;
    readonly sourceFile: ts.SourceFile;
  } | null {
    if (type.kind === 'source-node') {
      const sourceFile = this.readSourceFile(type.file);
      if (sourceFile == null) {
        return null;
      }
      const node = findNodeBySpan(sourceFile, type.span.start, type.span.end);
      return node == null ? null : { node, file: type.file, sourceFile };
    }

    if (type.kind === 'symbol') {
      const declaration = type.declaration;
      const file = declaration?.file ?? type.file;
      if (declaration == null || file == null) {
        return null;
      }
      const sourceFile = this.readSourceFile(file);
      if (sourceFile == null) {
        return null;
      }
      const node = findNodeBySpan(sourceFile, declaration.span.start, declaration.span.end);
      return node == null ? null : { node, file, sourceFile };
    }

    return null;
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
    && ts.isClassExpression(declarationNode.initializer)
  ) {
    return declarationNode.initializer;
  }

  return null;
}

function readCustomAttributeSurface(
  declarationNode: ts.ClassLikeDeclarationBase,
  file: SourceFileRef,
  sourceFile: ts.SourceFile,
): CustomAttributeSurface {
  const auDefinition = readStaticAuDefinition(declarationNode);
  const nameContributors = readFieldContributors('name', declarationNode, auDefinition, file, sourceFile);
  const aliasesContributors = readFieldContributors('aliases', declarationNode, auDefinition, file, sourceFile);
  const bindablesContributors = readFieldContributors('bindables', declarationNode, auDefinition, file, sourceFile);
  const defaultPropertyContributors = readFieldContributors('default-property', declarationNode, auDefinition, file, sourceFile);
  const noMultiBindingsContributors = readFieldContributors('no-multi-bindings', declarationNode, auDefinition, file, sourceFile);
  const dependenciesContributors = readFieldContributors('dependencies', declarationNode, auDefinition, file, sourceFile);
  const containerStrategyContributors = readFieldContributors('container-strategy', declarationNode, auDefinition, file, sourceFile);
  const templateControllerContributors = readFieldContributors('is-template-controller', declarationNode, auDefinition, file, sourceFile);

  return {
    identity: new CustomAttributeIdentity(
      readStringLiteralValue(selectExpression(nameContributors)),
      readMergedStringArrayValues(aliasesContributors),
      null,
      compactFieldProvenances([
        buildFieldProvenance('name', nameContributors),
        buildFieldProvenance('aliases', aliasesContributors),
      ]),
      nameContributors.length === 0 && aliasesContributors.length === 0
        ? 'Custom-attribute identity is not explicitly declared on the class surface.'
        : null,
    ),
    bindableSurface: new CustomAttributeBindableSurface(
      readBindableEntries(bindablesContributors),
      compactFieldProvenances([
        buildFieldProvenance('bindables', bindablesContributors),
      ]),
      bindablesContributors.length === 0
        ? 'Bindable support-bundle materialization is still open unless the CA/TC surface declares bindables explicitly.'
        : null,
    ),
    policy: new CustomAttributePolicy(
      readStringLiteralValue(selectExpression(defaultPropertyContributors)),
      readBooleanValue(selectExpression(noMultiBindingsContributors)),
      readContainerStrategy(selectExpression(containerStrategyContributors)),
      readBooleanValue(selectExpression(templateControllerContributors)),
      compactFieldProvenances([
        buildFieldProvenance('default-property', defaultPropertyContributors),
        buildFieldProvenance('no-multi-bindings', noMultiBindingsContributors),
        buildFieldProvenance('container-strategy', containerStrategyContributors),
        buildFieldProvenance('is-template-controller', templateControllerContributors),
      ]),
      'Support-bundle policy for default property, multi-binding posture, container strategy, and template-controller admission.',
    ),
    dependencyContribution: new CustomAttributeDependencyContribution(
      readDependencyEntries(dependenciesContributors),
      compactFieldProvenances([
        buildFieldProvenance('dependencies', dependenciesContributors),
      ]),
      dependenciesContributors.length === 0
        ? 'Dependencies stayed open unless the CA/TC surface declares them explicitly.'
        : 'Dependencies are carried structurally here, but their downstream CA/TC-specific consequence is still provisional beyond the runtime container-register step.',
    ),
  };
}

function readStaticAuDefinition(
  declarationNode: ts.ClassLikeDeclarationBase,
): ts.ObjectLiteralExpression | null {
  const initializer = findStaticPropertyInitializer(declarationNode, '$au');
  return initializer != null && ts.isObjectLiteralExpression(initializer)
    ? initializer
    : null;
}

function findStaticPropertyInitializer(
  declarationNode: ts.ClassLikeDeclarationBase,
  propertyName: string,
): ts.Expression | null {
  for (const member of declarationNode.members) {
    if (!hasStaticModifier(member) || !ts.isPropertyDeclaration(member) || member.initializer == null) {
      continue;
    }
    if (readPropertyName(member.name) === propertyName) {
      return member.initializer;
    }
  }
  return null;
}

function readFieldContributors(
  field: CustomAttributeSupportFieldKind,
  declarationNode: ts.ClassLikeDeclarationBase,
  staticAuDefinition: ts.ObjectLiteralExpression | null,
  file: SourceFileRef,
  sourceFile: ts.SourceFile,
): readonly FieldContributor[] {
  return [
    ...readDecoratorFieldContributors(field, declarationNode, file, sourceFile),
    ...readStaticCarrierContributors(field, declarationNode, staticAuDefinition, file, sourceFile),
  ];
}

function readDecoratorFieldContributors(
  field: CustomAttributeSupportFieldKind,
  declarationNode: ts.ClassLikeDeclarationBase,
  file: SourceFileRef,
  sourceFile: ts.SourceFile,
): readonly FieldContributor[] {
  const contributors: FieldContributor[] = [];
  const decorators = ts.canHaveDecorators(declarationNode)
    ? ts.getDecorators(declarationNode) ?? []
    : [];

  for (const decorator of decorators) {
    const expression = decorator.expression;
    const calleeText = readDecoratorCalleeText(expression);
    const args = ts.isCallExpression(expression) ? expression.arguments : ts.factory.createNodeArray<ts.Expression>();

    if (calleeText === 'customAttribute' || calleeText === 'templateController') {
      const firstArg = args[0] ?? null;
      if (field === 'name' && firstArg != null && isStringLike(firstArg)) {
        contributors.push({
          expression: firstArg,
          contribution: createFieldWitness(field, decorator, file, sourceFile, 'annotation-decorator')!,
        });
      } else if (firstArg != null && ts.isObjectLiteralExpression(firstArg)) {
        const property = readObjectLiteralPropertyInitializer(firstArg, mapFieldToPropertyName(field));
        if (property != null) {
          contributors.push({
            expression: property,
            contribution: createFieldWitness(field, decorator, file, sourceFile, 'annotation-decorator')!,
          });
        }
      }

      if (field === 'is-template-controller' && calleeText === 'templateController') {
        contributors.push({
          expression: ts.factory.createTrue(),
          contribution: createFieldWitness(field, decorator, file, sourceFile, 'annotation-decorator')!,
        });
      }
    }
  }

  if (field === 'bindables') {
    for (const member of declarationNode.members) {
      const memberDecorators = ts.canHaveDecorators(member)
        ? ts.getDecorators(member) ?? []
        : [];
      for (const decorator of memberDecorators) {
        const expression = decorator.expression;
        if (readDecoratorCalleeText(expression) !== 'bindable') {
          continue;
        }

        const args = ts.isCallExpression(expression) ? expression.arguments : ts.factory.createNodeArray<ts.Expression>();
        const firstArg = args[0];
        contributors.push({
          expression: firstArg != null && ts.isObjectLiteralExpression(firstArg)
            ? firstArg
            : ts.factory.createObjectLiteralExpression(),
          contribution: createFieldWitness(field, decorator, file, sourceFile, 'bindable-decorator')!,
        });
      }
    }
  }

  return contributors;
}

function readStaticCarrierContributors(
  field: CustomAttributeSupportFieldKind,
  declarationNode: ts.ClassLikeDeclarationBase,
  staticAuDefinition: ts.ObjectLiteralExpression | null,
  file: SourceFileRef,
  sourceFile: ts.SourceFile,
): readonly FieldContributor[] {
  const contributors: FieldContributor[] = [];

  if (staticAuDefinition != null) {
    const property = readObjectLiteralPropertyInitializer(staticAuDefinition, mapFieldToPropertyName(field));
    if (property != null) {
      contributors.push({
        expression: property,
        contribution: createFieldWitness(field, property, file, sourceFile, 'static-au-property')!,
      });
    }
  }

  const staticOwnName = mapFieldToStaticOwnPropertyName(field);
  if (staticOwnName != null) {
    const initializer = findStaticPropertyInitializer(declarationNode, staticOwnName);
    if (initializer != null) {
      contributors.push({
        expression: initializer,
        contribution: createFieldWitness(field, initializer, file, sourceFile, 'static-own-property')!,
      });
    }
  }

  return contributors;
}

function mapFieldToPropertyName(
  field: CustomAttributeSupportFieldKind,
): string {
  switch (field) {
    case 'default-property':
      return 'defaultProperty';
    case 'no-multi-bindings':
      return 'noMultiBindings';
    case 'container-strategy':
      return 'containerStrategy';
    case 'is-template-controller':
      return 'isTemplateController';
    default:
      return field;
  }
}

function mapFieldToStaticOwnPropertyName(
  field: CustomAttributeSupportFieldKind,
): string | null {
  switch (field) {
    case 'name':
      return null;
    case 'aliases':
      return 'aliases';
    case 'bindables':
      return 'bindables';
    case 'default-property':
      return 'defaultProperty';
    case 'no-multi-bindings':
      return 'noMultiBindings';
    case 'dependencies':
      return 'dependencies';
    case 'container-strategy':
      return 'containerStrategy';
    case 'is-template-controller':
      return 'isTemplateController';
  }
}

function readBindableEntries(
  contributors: readonly FieldContributor[],
): readonly CustomAttributeBindableEntry[] {
  const rawContributors = contributors.flatMap(extractBindableContributors);
  const bindableNamesBySource = new Map<string, string>();

  for (const contributor of rawContributors) {
    const sourceId = contributor.contribution.source?.id;
    if (sourceId == null || contributor.bindableName == null) {
      continue;
    }
    bindableNamesBySource.set(sourceId, bindableNamesBySource.get(sourceId) ?? contributor.bindableName);
  }

  const byName = new Map<string, BindableContributor[]>();
  for (const contributor of rawContributors) {
    const bindableName = contributor.bindableName
      ?? (contributor.contribution.source == null
        ? null
        : bindableNamesBySource.get(contributor.contribution.source.id) ?? null);
    if (bindableName == null) {
      continue;
    }
    const current = byName.get(bindableName) ?? [];
    current.push(contributor);
    byName.set(bindableName, current);
  }

  const entries: CustomAttributeBindableEntry[] = [];
  for (const [bindableName, bindableContributors] of byName) {
    const nameContributors = bindableContributors.filter((current) => current.fields.name != null);
    const attributeContributors = bindableContributors.filter((current) => current.fields.attribute != null);
    const callbackContributors = bindableContributors.filter((current) => current.fields.callback != null);
    const modeContributors = bindableContributors.filter((current) => current.fields.mode != null);
    const setContributors = bindableContributors.filter((current) => current.fields.set != null);
    const typeContributors = bindableContributors.filter((current) => current.fields.type != null);
    const nullableContributors = bindableContributors.filter((current) => current.fields.nullable != null);

    entries.push(
      new CustomAttributeBindableEntry(
        bindableName,
        readBindableStringValue(selectBindableExpression(attributeContributors, 'attribute')) ?? toKebabCase(bindableName),
        readBindableStringValue(selectBindableExpression(callbackContributors, 'callback')) ?? `${bindableName}Changed`,
        readBindableModeValue(selectBindableExpression(modeContributors, 'mode')) ?? 'toView',
        readBindableInterceptorKind(setContributors, typeContributors),
        readBindableTypeReferenceName(selectBindableExpression(typeContributors, 'type')),
        readBooleanValue(selectBindableExpression(nullableContributors, 'nullable')),
        compactBindableProvenances([
          buildBindableFieldProvenance('name', nameContributors),
          buildBindableFieldProvenance('attribute', attributeContributors),
          buildBindableFieldProvenance('callback', callbackContributors),
          buildBindableFieldProvenance('mode', modeContributors),
          buildBindableFieldProvenance('set', setContributors),
          buildBindableFieldProvenance('type', typeContributors),
          buildBindableFieldProvenance('nullable', nullableContributors),
        ]),
        'Bindable mini-definition recovered from custom-attribute/template-controller support carriers.',
      ),
    );
  }

  return entries;
}

function extractBindableContributors(
  contributor: FieldContributor,
): readonly BindableContributor[] {
  const expression = contributor.expression == null ? null : unwrapExpression(contributor.expression);
  if (expression == null) {
    return [];
  }

  if (isStringLike(expression)) {
    return [{
      bindableName: expression.text,
      fields: { name: ts.factory.createStringLiteral(expression.text) },
      contribution: toBindableWitness(contributor.contribution),
    }];
  }

  if (ts.isArrayLiteralExpression(expression)) {
    const items: BindableContributor[] = [];
    for (const element of expression.elements) {
      if (isStringLike(element)) {
        items.push({
          bindableName: element.text,
          fields: { name: ts.factory.createStringLiteral(element.text) },
          contribution: toBindableWitness(contributor.contribution),
        });
        continue;
      }

      if (ts.isObjectLiteralExpression(element)) {
        const bindableName = readBindableStringValue(readObjectLiteralPropertyInitializer(element, 'name'));
        items.push({
          bindableName,
          fields: readBindableFieldMap(element),
          contribution: toBindableWitness(contributor.contribution),
        });
      }
    }
    return items;
  }

  if (ts.isObjectLiteralExpression(expression)) {
    const explicitName = readBindableStringValue(readObjectLiteralPropertyInitializer(expression, 'name'));
    if (contributor.contribution.carrier === 'bindable-decorator') {
      return [{
        bindableName: null,
        fields: readBindableFieldMap(expression),
        contribution: toBindableWitness(contributor.contribution),
      }];
    }

    if (explicitName != null) {
      return [{
        bindableName: explicitName,
        fields: readBindableFieldMap(expression),
        contribution: toBindableWitness(contributor.contribution),
      }];
    }

    const items: BindableContributor[] = [];
    for (const property of expression.properties) {
      if (!ts.isPropertyAssignment(property)) {
        continue;
      }
      const bindableName = readPropertyName(property.name);
      if (bindableName == null) {
        continue;
      }
      const initializer = unwrapExpression(property.initializer);
      if (initializer.kind === ts.SyntaxKind.TrueKeyword) {
        items.push({
          bindableName,
          fields: { name: ts.factory.createStringLiteral(bindableName) },
          contribution: toBindableWitness(contributor.contribution),
        });
        continue;
      }
      if (isStringLike(initializer)) {
        items.push({
          bindableName,
          fields: {
            name: ts.factory.createStringLiteral(bindableName),
            attribute: initializer,
          },
          contribution: toBindableWitness(contributor.contribution),
        });
        continue;
      }
      if (ts.isObjectLiteralExpression(initializer)) {
        items.push({
          bindableName,
          fields: {
            name: ts.factory.createStringLiteral(bindableName),
            ...readBindableFieldMap(initializer),
          },
          contribution: toBindableWitness(contributor.contribution),
        });
      }
    }
    return items;
  }

  return [];
}

function readBindableFieldMap(
  objectLiteral: ts.ObjectLiteralExpression,
): Partial<Record<CustomAttributeBindableFieldKind, ts.Expression | null>> {
  return {
    name: readObjectLiteralPropertyInitializer(objectLiteral, 'name'),
    attribute: readObjectLiteralPropertyInitializer(objectLiteral, 'attribute'),
    callback: readObjectLiteralPropertyInitializer(objectLiteral, 'callback'),
    mode: readObjectLiteralPropertyInitializer(objectLiteral, 'mode'),
    set: readObjectLiteralPropertyInitializer(objectLiteral, 'set'),
    type: readObjectLiteralPropertyInitializer(objectLiteral, 'type'),
    nullable: readObjectLiteralPropertyInitializer(objectLiteral, 'nullable'),
  };
}

function readDependencyEntries(
  contributors: readonly FieldContributor[],
): readonly CustomAttributeDependencyEntry[] {
  const entries: CustomAttributeDependencyEntry[] = [];
  for (const contributor of contributors) {
    const expression = contributor.expression == null ? null : unwrapExpression(contributor.expression);
    if (expression == null) {
      continue;
    }

    if (ts.isArrayLiteralExpression(expression)) {
      const sourceKind: CustomAttributeDependencySourceKind = expression.elements.some(ts.isSpreadElement)
        ? 'merged-array'
        : 'literal-array';
      for (const element of expression.elements) {
        const target = ts.isSpreadElement(element) ? element.expression : element;
        const seed = readReferenceSeed(target);
        entries.push(new CustomAttributeDependencyEntry(
          seed.candidateName,
          sourceKind,
          seed.kind as CustomAttributeDependencyLinkSeedKind,
          contributor.contribution,
        ));
      }
      continue;
    }

    if (ts.isIdentifier(expression) || ts.isPropertyAccessExpression(expression)) {
      const seed = readReferenceSeed(expression);
      entries.push(new CustomAttributeDependencyEntry(
        seed.candidateName,
        'array-reference',
        seed.kind as CustomAttributeDependencyLinkSeedKind,
        contributor.contribution,
      ));
      continue;
    }

    if (ts.isCallExpression(expression)) {
      entries.push(new CustomAttributeDependencyEntry(
        null,
        'call-result',
        'open-expression',
        contributor.contribution,
      ));
      continue;
    }

    entries.push(new CustomAttributeDependencyEntry(
      null,
      'open-expression',
      'open-expression',
      contributor.contribution,
    ));
  }

  return entries;
}

function buildFieldProvenance(
  field: CustomAttributeSupportFieldKind,
  contributors: readonly FieldContributor[],
): CustomAttributeFieldProvenance | null {
  if (contributors.length === 0) {
    return null;
  }

  const mergedFields = field === 'aliases' || field === 'bindables' || field === 'dependencies';
  const mode = mergedFields ? 'merged' : 'selected';

  return new CustomAttributeFieldProvenance(
    field,
    mode,
    mode === 'selected' ? selectContributor(contributors)?.contribution ?? null : null,
    mergeUniqueFieldWitnesses(contributors.map((current) => current.contribution)),
  );
}

function buildBindableFieldProvenance(
  field: CustomAttributeBindableFieldKind,
  contributors: readonly BindableContributor[],
): CustomAttributeBindableFieldProvenance | null {
  if (contributors.length === 0) {
    return null;
  }
  const selected = selectBindableContributor(contributors);
  return new CustomAttributeBindableFieldProvenance(
    field,
    'selected',
    selected?.contribution ?? null,
    mergeUniqueBindableWitnesses(contributors.map((current) => current.contribution)),
  );
}

function selectContributor(
  contributors: readonly FieldContributor[],
): FieldContributor | null {
  return [...contributors].sort((left, right) =>
    compareCarrierPrecedence(left.contribution.carrier, right.contribution.carrier),
  )[0] ?? null;
}

function selectBindableContributor(
  contributors: readonly BindableContributor[],
): BindableContributor | null {
  return [...contributors].sort((left, right) =>
    compareBindableCarrierPrecedence(left.contribution.carrier, right.contribution.carrier),
  )[0] ?? null;
}

function selectExpression(
  contributors: readonly FieldContributor[],
): ts.Expression | null {
  return selectContributor(contributors)?.expression ?? null;
}

function selectBindableExpression(
  contributors: readonly BindableContributor[],
  field: CustomAttributeBindableFieldKind,
): ts.Expression | null {
  return selectBindableContributor(contributors)?.fields[field] ?? null;
}

function compareCarrierPrecedence(
  left: CustomAttributeSupportCarrierKind,
  right: CustomAttributeSupportCarrierKind,
): number {
  return carrierPrecedence(left) - carrierPrecedence(right);
}

function carrierPrecedence(
  carrier: CustomAttributeSupportCarrierKind,
): number {
  switch (carrier) {
    case 'annotation-decorator':
      return 0;
    case 'bindable-decorator':
      return 1;
    case 'static-au-property':
      return 2;
    case 'static-own-property':
      return 3;
    case 'default':
      return 4;
    case 'open':
      return 5;
  }
}

function compareBindableCarrierPrecedence(
  left: CustomAttributeSupportCarrierKind,
  right: CustomAttributeSupportCarrierKind,
): number {
  return bindableCarrierPrecedence(left) - bindableCarrierPrecedence(right);
}

function bindableCarrierPrecedence(
  carrier: CustomAttributeSupportCarrierKind,
): number {
  switch (carrier) {
    case 'static-au-property':
      return 0;
    case 'static-own-property':
      return 1;
    case 'bindable-decorator':
      return 2;
    case 'annotation-decorator':
      return 3;
    case 'default':
      return 4;
    case 'open':
      return 5;
  }
}

function readBooleanValue(
  expression: ts.Expression | null,
): boolean | null {
  const current = expression == null ? null : unwrapExpression(expression);
  return current != null && current.kind === ts.SyntaxKind.TrueKeyword
    ? true
    : current != null && current.kind === ts.SyntaxKind.FalseKeyword
      ? false
      : null;
}

function readContainerStrategy(
  expression: ts.Expression | null,
): 'reuse' | 'new' | null {
  const value = readStringLiteralValue(expression);
  return value === 'reuse' || value === 'new'
    ? value
    : null;
}

function readBindableStringValue(
  expression: ts.Expression | null,
): string | null {
  return readStringLiteralValue(expression);
}

function readBindableModeValue(
  expression: ts.Expression | null,
): string | number | null {
  const current = expression == null ? null : unwrapExpression(expression);
  if (current == null) {
    return null;
  }

  if (isStringLike(current)) {
    return current.text;
  }

  if (ts.isIdentifier(current)) {
    return current.text;
  }

  if (ts.isPropertyAccessExpression(current)) {
    return current.name.text;
  }

  if (ts.isNumericLiteral(current)) {
    return Number(current.text);
  }

  return null;
}

function readBindableTypeReferenceName(
  expression: ts.Expression | null,
): string | null {
  const current = expression == null ? null : unwrapExpression(expression);
  if (current == null) {
    return null;
  }
  return ts.isIdentifier(current)
    ? current.text
    : ts.isPropertyAccessExpression(current)
      ? current.name.text
      : null;
}

function readBindableInterceptorKind(
  setContributors: readonly BindableContributor[],
  typeContributors: readonly BindableContributor[],
): CustomAttributeBindableInterceptorKind {
  const hasSet = setContributors.length > 0;
  const hasType = typeContributors.length > 0;
  if (hasSet) {
    return 'explicit-set';
  }
  if (hasType) {
    return 'type-coercer';
  }
  return 'default-noop';
}

function readDecoratorCalleeText(
  expression: ts.LeftHandSideExpression,
): string | null {
  if (ts.isIdentifier(expression)) {
    return expression.text;
  }

  if (ts.isCallExpression(expression)) {
    return readDecoratorCalleeText(expression.expression);
  }

  if (ts.isPropertyAccessExpression(expression)) {
    const left = readDecoratorCalleeText(expression.expression);
    return left == null ? expression.name.text : `${left}.${expression.name.text}`;
  }

  return null;
}

function readObjectLiteralPropertyInitializer(
  objectLiteral: ts.ObjectLiteralExpression,
  propertyName: string,
): ts.Expression | null {
  for (const property of objectLiteral.properties) {
    if (ts.isPropertyAssignment(property) && readPropertyName(property.name) === propertyName) {
      return property.initializer;
    }
  }
  return null;
}

function mergeIdentity(
  existing: CustomAttributeIdentity,
  surface: CustomAttributeIdentity,
): CustomAttributeIdentity {
  return new CustomAttributeIdentity(
    surface.name ?? existing.name,
    mergeUniqueStrings(existing.aliases, surface.aliases),
    existing.key,
    mergeUniqueFieldProvenances(existing.provenance, surface.provenance),
    existing.note ?? surface.note,
  );
}

function mergeBindableSurface(
  existing: CustomAttributeBindableSurface,
  surface: CustomAttributeBindableSurface,
): CustomAttributeBindableSurface {
  return new CustomAttributeBindableSurface(
    surface.entries.length > 0 ? surface.entries : existing.entries,
    mergeUniqueFieldProvenances(existing.provenance, surface.provenance),
    existing.note ?? surface.note,
  );
}

function mergePolicy(
  existing: CustomAttributePolicy,
  surface: CustomAttributePolicy,
): CustomAttributePolicy {
  return new CustomAttributePolicy(
    surface.defaultProperty ?? existing.defaultProperty,
    surface.noMultiBindings ?? existing.noMultiBindings,
    surface.containerStrategy ?? existing.containerStrategy,
    surface.isTemplateController ?? existing.isTemplateController,
    mergeUniqueFieldProvenances(existing.provenance, surface.provenance),
    existing.note ?? surface.note,
  );
}

function mergeDependencyContribution(
  existing: CustomAttributeDependencyContribution,
  surface: CustomAttributeDependencyContribution,
): CustomAttributeDependencyContribution {
  return new CustomAttributeDependencyContribution(
    surface.entries.length > 0 ? surface.entries : existing.entries,
    mergeUniqueFieldProvenances(existing.provenance, surface.provenance),
    existing.note ?? surface.note,
  );
}

function compactFieldProvenances(
  values: readonly (CustomAttributeFieldProvenance | null)[],
): readonly CustomAttributeFieldProvenance[] {
  return values.filter((value): value is CustomAttributeFieldProvenance => value != null);
}

function compactBindableProvenances(
  values: readonly (CustomAttributeBindableFieldProvenance | null)[],
): readonly CustomAttributeBindableFieldProvenance[] {
  return values.filter((value): value is CustomAttributeBindableFieldProvenance => value != null);
}

function mergeUniqueFieldProvenances(
  ...values: readonly (readonly CustomAttributeFieldProvenance[])[]
): readonly CustomAttributeFieldProvenance[] {
  const byField = new Map<CustomAttributeSupportFieldKind, CustomAttributeFieldProvenance>();
  for (const list of values) {
    for (const value of list) {
      const existing = byField.get(value.field);
      if (existing == null) {
        byField.set(value.field, value);
        continue;
      }
      byField.set(
        value.field,
        new CustomAttributeFieldProvenance(
          value.field,
          value.mode,
          value.selected ?? existing.selected,
          mergeUniqueFieldWitnesses(existing.contributors, value.contributors),
          existing.note ?? value.note,
        ),
      );
    }
  }
  return [...byField.values()];
}

function mergeUniqueFieldWitnesses(
  ...values: readonly (readonly CustomAttributeFieldWitness[])[]
): readonly CustomAttributeFieldWitness[] {
  const seen = new Set<string>();
  const merged: CustomAttributeFieldWitness[] = [];
  for (const list of values) {
    for (const value of list) {
      const key = `${value.field}:${value.carrier}:${value.source?.id ?? '<none>'}`;
      if (seen.has(key)) {
        continue;
      }
      seen.add(key);
      merged.push(value);
    }
  }
  return merged;
}

function mergeUniqueBindableWitnesses(
  ...values: readonly (readonly CustomAttributeBindableFieldWitness[])[]
): readonly CustomAttributeBindableFieldWitness[] {
  const seen = new Set<string>();
  const merged: CustomAttributeBindableFieldWitness[] = [];
  for (const list of values) {
    for (const value of list) {
      const key = `${value.field}:${value.carrier}:${value.source?.id ?? '<none>'}`;
      if (seen.has(key)) {
        continue;
      }
      seen.add(key);
      merged.push(value);
    }
  }
  return merged;
}

function mergeUniqueStrings(
  ...values: readonly (readonly string[])[]
): readonly string[] {
  const seen = new Set<string>();
  const merged: string[] = [];
  for (const list of values) {
    for (const value of list) {
      if (seen.has(value)) {
        continue;
      }
      seen.add(value);
      merged.push(value);
    }
  }
  return merged;
}

function readMergedStringArrayValues(
  contributors: readonly FieldContributor[],
): readonly string[] {
  const merged: string[] = [];
  for (const contributor of contributors) {
    for (const current of readStringArrayValues(contributor.expression)) {
      if (!merged.includes(current)) {
        merged.push(current);
      }
    }
  }
  return merged;
}

function createFieldWitness(
  field: CustomAttributeSupportFieldKind,
  node: ts.Node | null,
  file: SourceFileRef,
  sourceFile: ts.SourceFile,
  carrier: CustomAttributeSupportCarrierKind,
): CustomAttributeFieldWitness | null {
  if (node == null) {
    return null;
  }
  return new CustomAttributeFieldWitness(
    field,
    carrier,
    toNodeRef(node, file, sourceFile),
  );
}

function toBindableWitness(
  witness: CustomAttributeFieldWitness,
): CustomAttributeBindableFieldWitness {
  return new CustomAttributeBindableFieldWitness(
    'name',
    witness.carrier,
    witness.source,
    witness.note,
  );
}

function toNodeRef(
  node: ts.Node,
  file: SourceFileRef,
  sourceFile: ts.SourceFile,
): SourceNodeRef {
  return new SourceNodeRef(
    `${file.id}:${node.getStart(sourceFile)}:${node.end}`,
    file,
    ts.SyntaxKind[node.kind] ?? 'Unknown',
    new SourceSpan(node.getStart(sourceFile), node.end),
  );
}

function isStringLike(
  expression: ts.Expression,
): expression is ts.StringLiteral | ts.NoSubstitutionTemplateLiteral {
  return ts.isStringLiteral(expression) || ts.isNoSubstitutionTemplateLiteral(expression);
}

function toKebabCase(
  value: string,
): string {
  return value.replace(/([A-Z])/g, (_, current: string) => `-${current.toLowerCase()}`);
}
