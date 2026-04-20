import fs from 'node:fs';
import ts from 'typescript';

import {
  findNodeBySpan as astFindNodeBySpan,
  guessScriptKind as astGuessScriptKind,
  hasStaticModifier as astHasStaticModifier,
  readPropertyName as astReadPropertyName,
  readReferenceSeed,
  readStringArrayValues as astReadStringArrayValues,
  readStringLiteralValue as astReadStringLiteralValue,
} from '../analysis/index.js';
import {
  SourceNodeRef,
  SourceSpan,
  type SourceFileRef,
} from '../refs.js';
import { CustomElementDefinition } from './custom-element-definition.js';
import {
  CustomElementBindableEntry,
  CustomElementBindableFieldProvenance,
  CustomElementBindableFieldWitness,
  CustomElementBindableSurface,
  CustomElementDependencySource,
  CustomElementDependencyContribution,
  CustomElementDependencyEntry,
  CustomElementFieldProvenance,
  CustomElementFieldWitness,
  CustomElementIdentity,
  CustomElementPolicy,
  CustomElementTemplateSource,
  type CustomElementBindableFieldKind,
  type CustomElementBindableInterceptorKind,
  type CustomElementCaptureKind,
  type CustomElementDependencyLinkSeedKind,
  type CustomElementDependencySourceKind,
  type CustomElementSupportCarrierKind,
  type CustomElementSupportFieldKind,
  type CustomElementProcessContentKind,
} from './custom-element-support.js';

export interface CustomElementMaterializerState {
  readonly parsedFileCount: number;
}

export class CustomElementMaterializer {
  private readonly parsedFiles = new Map<string, ts.SourceFile | null>();

  materialize(
    definition: CustomElementDefinition,
  ): CustomElementDefinition {
    const declaration = this.readDeclaration(definition.type);
    if (declaration == null) {
      return definition;
    }

    const classCarrier = readClassCarrier(declaration.node);
    if (classCarrier == null) {
      return definition;
    }

    const surface = readCustomElementSurface(classCarrier, declaration.file, declaration.sourceFile);
    return new CustomElementDefinition(
      definition.id,
      definition.type,
      mergeIdentity(definition.identity, surface.identity),
      mergePolicy(definition.policy, surface.policy),
      mergeBindableSurface(definition.bindableSurface, surface.bindableSurface),
      mergeDependencyContribution(definition.dependencyContribution, surface.dependencyContribution),
      mergeTemplateSource(definition.templateSource, surface.templateSource),
    );
  }

  inspectState(): CustomElementMaterializerState {
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
      const node = astFindNodeBySpan(sourceFile, type.span.start, type.span.end);
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
      const node = astFindNodeBySpan(sourceFile, declaration.span.start, declaration.span.end);
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
        astGuessScriptKind(file.path),
      );
      this.parsedFiles.set(file.path, parsed);
      return parsed;
    } catch {
      this.parsedFiles.set(file.path, null);
      return null;
    }
  }
}

interface CustomElementSurface {
  readonly identity: CustomElementIdentity;
  readonly policy: CustomElementPolicy;
  readonly bindableSurface: CustomElementBindableSurface;
  readonly dependencyContribution: CustomElementDependencyContribution;
  readonly templateSource: CustomElementTemplateSource;
}

interface FieldContributor {
  readonly expression: ts.Expression | null;
  readonly contribution: CustomElementFieldWitness;
}

interface BindableContributor {
  readonly bindableName: string | null;
  readonly fields: Partial<Record<CustomElementBindableFieldKind, ts.Expression | null>>;
  readonly contribution: CustomElementBindableFieldWitness;
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

function readCustomElementSurface(
  declarationNode: ts.ClassLikeDeclarationBase,
  file: SourceFileRef,
  sourceFile: ts.SourceFile,
): CustomElementSurface {
  // TODO: explicit CustomElement.define({...}, Type) definition-object paths
  // still need their own carrier seam. This pass now includes decorator
  // metadata plus class-carrier surfaces, but not external definition-object
  // arguments or runtime metadata execution.
  const auDefinition = readStaticAuDefinition(declarationNode);

  const nameContributors = readFieldContributors('name', declarationNode, auDefinition, file, sourceFile);
  const aliasesContributors = readFieldContributors('aliases', declarationNode, auDefinition, file, sourceFile);
  const bindablesContributors = readFieldContributors('bindables', declarationNode, auDefinition, file, sourceFile);
  const dependenciesContributors = readFieldContributors('dependencies', declarationNode, auDefinition, file, sourceFile);
  const captureContributors = readFieldContributors('capture', declarationNode, auDefinition, file, sourceFile);
  const containerlessContributors = readFieldContributors('containerless', declarationNode, auDefinition, file, sourceFile);
  const shadowOptionsContributors = readFieldContributors('shadow-options', declarationNode, auDefinition, file, sourceFile);
  const processContentContributors = readFieldContributors('process-content', declarationNode, auDefinition, file, sourceFile);
  const templateContributors = readFieldContributors('template', declarationNode, auDefinition, file, sourceFile);

  return {
    identity: new CustomElementIdentity(
      astReadStringLiteralValue(selectExpression(nameContributors)),
      readMergedStringArrayValues(aliasesContributors),
      null,
      compactProvenances([
        buildFieldProvenance('name', nameContributors),
        buildFieldProvenance('aliases', aliasesContributors),
      ]),
      nameContributors.length === 0 && aliasesContributors.length === 0
        ? 'Custom element identity is not explicitly declared on the class surface.'
        : null,
    ),
    policy: new CustomElementPolicy(
      readCaptureKind(selectExpression(captureContributors)),
      readBooleanValue(selectExpression(containerlessContributors)),
      readShadowMode(selectExpression(shadowOptionsContributors)),
      readProcessContentKind(selectExpression(processContentContributors)),
      compactProvenances([
        buildFieldProvenance('capture', captureContributors),
        buildFieldProvenance('containerless', containerlessContributors),
        buildFieldProvenance('shadow-options', shadowOptionsContributors),
        buildFieldProvenance('process-content', processContentContributors),
      ]),
      captureContributors.length === 0
        && containerlessContributors.length === 0
        && shadowOptionsContributors.length === 0
        && processContentContributors.length === 0
        ? 'Custom element policy fields are still open on this declaration surface.'
        : null,
    ),
    bindableSurface: new CustomElementBindableSurface(
      readBindableEntries(bindablesContributors),
      compactProvenances([
        buildFieldProvenance('bindables', bindablesContributors),
      ]),
      bindablesContributors.length === 0
        ? 'Bindable support-bundle materialization is still open unless the CE surface declares bindables explicitly.'
        : null,
    ),
    dependencyContribution: new CustomElementDependencyContribution(
      readDependencySources(dependenciesContributors),
      readDependencyEntries(dependenciesContributors),
      compactProvenances([
        buildFieldProvenance('dependencies', dependenciesContributors),
      ]),
      dependenciesContributors.length === 0
        ? 'Child-world dependency contribution is still open unless the CE surface declares dependencies explicitly.'
        : null,
    ),
    templateSource: readTemplateSource(templateContributors),
  };
}

function mergeIdentity(
  existing: CustomElementIdentity,
  derived: CustomElementIdentity,
): CustomElementIdentity {
  return new CustomElementIdentity(
    existing.name ?? derived.name,
    mergeUniqueStrings(existing.aliases, derived.aliases),
    existing.key ?? derived.key,
    mergeUniqueProvenances(existing.provenance, derived.provenance),
    existing.note ?? derived.note,
  );
}

function mergePolicy(
  existing: CustomElementPolicy,
  derived: CustomElementPolicy,
): CustomElementPolicy {
  return new CustomElementPolicy(
    existing.captureKind === 'open' ? derived.captureKind : existing.captureKind,
    existing.containerless ?? derived.containerless,
    existing.shadowMode ?? derived.shadowMode,
    existing.processContentKind === 'open' ? derived.processContentKind : existing.processContentKind,
    mergeUniqueProvenances(existing.provenance, derived.provenance),
    existing.note ?? derived.note,
  );
}

function mergeBindableSurface(
  existing: CustomElementBindableSurface,
  derived: CustomElementBindableSurface,
): CustomElementBindableSurface {
  const byName = new Map<string, CustomElementBindableEntry>();
  for (const entry of [...existing.entries, ...derived.entries]) {
    if (entry.name == null) {
      continue;
    }
    byName.set(entry.name, byName.get(entry.name) ?? entry);
  }

  return new CustomElementBindableSurface(
    [...byName.values()],
    mergeUniqueProvenances(existing.provenance, derived.provenance),
    existing.note ?? derived.note,
  );
}

function mergeDependencyContribution(
  existing: CustomElementDependencyContribution,
  derived: CustomElementDependencyContribution,
): CustomElementDependencyContribution {
  const sourceSeen = new Set<string>();
  const sources: CustomElementDependencySource[] = [];
  for (const source of [...existing.sources, ...derived.sources]) {
    const key = `${source.kind}:${source.referenceName ?? '<anonymous>'}:${source.witness.source?.id ?? '<none>'}:${source.witness.carrier}`;
    if (sourceSeen.has(key)) {
      continue;
    }
    sourceSeen.add(key);
    sources.push(source);
  }

  const seen = new Set<string>();
  const entries: CustomElementDependencyEntry[] = [];

  for (const entry of [...existing.entries, ...derived.entries]) {
    const key = `${entry.referenceName ?? '<anonymous>'}:${entry.sourceKind}:${entry.linkSeedKind}:${entry.witness.source?.id ?? '<none>'}:${entry.witness.carrier}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    entries.push(entry);
  }

  return new CustomElementDependencyContribution(
    sources,
    entries,
    mergeUniqueProvenances(existing.provenance, derived.provenance),
    existing.note ?? derived.note,
  );
}

function mergeTemplateSource(
  existing: CustomElementTemplateSource,
  derived: CustomElementTemplateSource,
): CustomElementTemplateSource {
  return existing.kind === 'open'
    ? derived
    : existing;
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
    if (!astHasStaticModifier(member) || !ts.isPropertyDeclaration(member) || member.initializer == null) {
      continue;
    }
    if (astReadPropertyName(member.name) === propertyName) {
      return member.initializer;
    }
  }
  return null;
}

function readFieldContributors(
  field: CustomElementSupportFieldKind,
  declarationNode: ts.ClassLikeDeclarationBase,
  literal: ts.ObjectLiteralExpression | null,
  file: SourceFileRef,
  sourceFile: ts.SourceFile,
): readonly FieldContributor[] {
  return [
    ...readDecoratorFieldContributors(field, declarationNode, file, sourceFile),
    ...readStaticCarrierContributors(field, declarationNode, literal, file, sourceFile),
  ];
}

function readDecoratorFieldContributors(
  field: CustomElementSupportFieldKind,
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

    if (calleeText === 'customElement') {
      const firstArg = args[0] ?? null;
      if (field === 'name' && firstArg != null && (ts.isStringLiteral(firstArg) || ts.isNoSubstitutionTemplateLiteral(firstArg))) {
        contributors.push({
          expression: firstArg,
          contribution: createWitness(field, decorator, file, sourceFile, 'annotation-decorator')!,
        });
      } else if (firstArg != null && ts.isObjectLiteralExpression(firstArg)) {
        const property = readObjectLiteralPropertyInitializer(firstArg, mapFieldToPropertyName(field));
        if (property != null) {
          contributors.push({
            expression: property,
            contribution: createWitness(field, decorator, file, sourceFile, 'annotation-decorator')!,
          });
        }
      }
    }

    if (field === 'shadow-options' && calleeText === 'useShadowDOM') {
      const firstArg = args[0] ?? null;
      contributors.push({
        expression: firstArg != null && ts.isObjectLiteralExpression(firstArg)
          ? firstArg
          : ts.factory.createObjectLiteralExpression([
            ts.factory.createPropertyAssignment('mode', ts.factory.createStringLiteral('open')),
          ]),
        contribution: createWitness(field, decorator, file, sourceFile, 'annotation-decorator')!,
      });
    }

    if (field === 'containerless' && (calleeText === 'containerless' || calleeText === 'containerless()')) {
      contributors.push({
        expression: ts.factory.createTrue(),
        contribution: createWitness(field, decorator, file, sourceFile, 'annotation-decorator')!,
      });
    }

    if (field === 'capture' && calleeText === 'capture') {
      contributors.push({
        expression: args[0] ?? ts.factory.createTrue(),
        contribution: createWitness(field, decorator, file, sourceFile, 'annotation-decorator')!,
      });
    }

    if (field === 'process-content' && calleeText === 'processContent' && args[0] != null) {
      contributors.push({
        expression: args[0],
        contribution: createWitness(field, decorator, file, sourceFile, 'annotation-decorator')!,
      });
    }

    if (field === 'bindables' && calleeText === 'bindable' && args[0] != null) {
      contributors.push({
        expression: args[0],
        contribution: createWitness(field, decorator, file, sourceFile, 'bindable-decorator')!,
      });
    }
  }

  if (field === 'bindables' || field === 'process-content') {
    for (const member of declarationNode.members) {
      const memberDecorators = ts.canHaveDecorators(member)
        ? ts.getDecorators(member) ?? []
        : [];
      for (const decorator of memberDecorators) {
        const calleeText = readDecoratorCalleeText(decorator.expression);
        const args = ts.isCallExpression(decorator.expression)
          ? decorator.expression.arguments
          : ts.factory.createNodeArray<ts.Expression>();
        if (field === 'bindables' && calleeText === 'bindable') {
          if (args[0] != null) {
            contributors.push({
              expression: args[0],
              contribution: createWitness(field, decorator, file, sourceFile, 'bindable-decorator')!,
            });
          }
          const name = readDecoratedMemberName(member);
          if (name != null) {
            contributors.push({
              expression: ts.factory.createStringLiteral(name),
              contribution: createWitness(field, decorator, file, sourceFile, 'bindable-decorator')!,
            });
          }
        }
        if (field === 'process-content' && calleeText === 'processContent') {
          const name = readDecoratedMemberName(member);
          if (name != null) {
            contributors.push({
              expression: ts.factory.createIdentifier(name),
              contribution: createWitness(field, decorator, file, sourceFile, 'annotation-decorator')!,
            });
          }
        }
      }
    }
  }

  return contributors;
}

function readStaticCarrierContributors(
  field: CustomElementSupportFieldKind,
  declarationNode: ts.ClassLikeDeclarationBase,
  literal: ts.ObjectLiteralExpression | null,
  file: SourceFileRef,
  sourceFile: ts.SourceFile,
): readonly FieldContributor[] {
  const contributors: FieldContributor[] = [];
  const definitionExpression = readObjectLiteralPropertyInitializer(literal, mapFieldToPropertyName(field));
  if (definitionExpression != null) {
    contributors.push({
      expression: definitionExpression,
      contribution: createWitness(field, definitionExpression, file, sourceFile, 'static-au-property')!,
    });
  }

  const staticOwnExpression = findStaticPropertyInitializer(declarationNode, mapFieldToPropertyName(field));
  if (staticOwnExpression != null) {
    contributors.push({
      expression: staticOwnExpression,
      contribution: createWitness(field, staticOwnExpression, file, sourceFile, 'static-own-property')!,
    });
  }

  return contributors;
}

function mapFieldToPropertyName(
  field: CustomElementSupportFieldKind,
): string {
  switch (field) {
    case 'shadow-options':
      return 'shadowOptions';
    case 'process-content':
      return 'processContent';
    default:
      return field;
  }
}

function readObjectLiteralPropertyInitializer(
  literal: ts.ObjectLiteralExpression | null,
  propertyName: string,
): ts.Expression | null {
  if (literal == null) {
    return null;
  }

  for (const property of literal.properties) {
    if (ts.isPropertyAssignment(property) && readPropertyName(property.name) === propertyName) {
      return property.initializer;
    }
  }

  return null;
}

function readStringLiteralValue(
  expression: ts.Expression | null,
): string | null {
  return expression != null && (ts.isStringLiteral(expression) || ts.isNoSubstitutionTemplateLiteral(expression))
    ? expression.text
    : null;
}

function readStringArrayValues(
  expression: ts.Expression | null,
): readonly string[] {
  if (expression == null || !ts.isArrayLiteralExpression(expression)) {
    return [];
  }

  const values: string[] = [];
  for (const element of expression.elements) {
    if (ts.isStringLiteral(element) || ts.isNoSubstitutionTemplateLiteral(element)) {
      values.push(element.text);
    }
  }
  return values;
}

function readMergedStringArrayValues(
  contributors: readonly FieldContributor[],
): readonly string[] {
  const merged: string[] = [];
  const seen = new Set<string>();

  for (const contributor of contributors) {
    for (const value of astReadStringArrayValues(contributor.expression)) {
      if (seen.has(value)) {
        continue;
      }
      seen.add(value);
      merged.push(value);
    }
  }

  return merged;
}

function readCaptureKind(
  expression: ts.Expression | null,
): CustomElementCaptureKind {
  if (expression == null) {
    return 'open';
  }
  if (expression.kind === ts.SyntaxKind.TrueKeyword || expression.kind === ts.SyntaxKind.FalseKeyword) {
    return 'boolean';
  }
  if (ts.isFunctionExpression(expression) || ts.isArrowFunction(expression) || ts.isIdentifier(expression)) {
    return 'predicate';
  }
  return 'open';
}

function readBooleanValue(
  expression: ts.Expression | null,
): boolean | null {
  if (expression == null) {
    return null;
  }
  if (expression.kind === ts.SyntaxKind.TrueKeyword) {
    return true;
  }
  if (expression.kind === ts.SyntaxKind.FalseKeyword) {
    return false;
  }
  return null;
}

function readShadowMode(
  expression: ts.Expression | null,
): 'open' | 'closed' | null {
  if (expression == null || !ts.isObjectLiteralExpression(expression)) {
    return null;
  }

  const mode = readStringLiteralValue(readObjectLiteralPropertyInitializer(expression, 'mode'));
  return mode === 'open' || mode === 'closed'
    ? mode
    : null;
}

function readProcessContentKind(
  expression: ts.Expression | null,
): CustomElementProcessContentKind {
  if (expression == null) {
    return 'open';
  }
  if (ts.isStringLiteral(expression) || ts.isNoSubstitutionTemplateLiteral(expression)) {
    return 'string-key';
  }
  if (ts.isIdentifier(expression) || ts.isFunctionExpression(expression) || ts.isArrowFunction(expression)) {
    return 'function-hook';
  }
  if (ts.isPropertyAccessExpression(expression) && expression.expression.getText() === 'Symbol') {
    return 'symbol-key';
  }
  return 'open';
}

function readBindableEntries(
  contributors: readonly FieldContributor[],
): readonly CustomElementBindableEntry[] {
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

  const entries: CustomElementBindableEntry[] = [];
  for (const [bindableName, bindableContributors] of byName) {
    const nameContributors = bindableContributors.filter((current) => current.fields.name != null);
    const attributeContributors = bindableContributors.filter((current) => current.fields.attribute != null);
    const callbackContributors = bindableContributors.filter((current) => current.fields.callback != null);
    const modeContributors = bindableContributors.filter((current) => current.fields.mode != null);
    const setContributors = bindableContributors.filter((current) => current.fields.set != null);
    const typeContributors = bindableContributors.filter((current) => current.fields.type != null);
    const nullableContributors = bindableContributors.filter((current) => current.fields.nullable != null);

    entries.push(
      new CustomElementBindableEntry(
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
          buildBindableFieldProvenance('set', setContributors, 'presence-only'),
          buildBindableFieldProvenance('type', typeContributors, 'presence-only'),
          buildBindableFieldProvenance('nullable', nullableContributors),
        ]),
        // TODO: add richer per-contributor value summaries so conflicts or
        // divergent config payloads can be explained without reopening the
        // whole bindable mini-definition by hand.
        null,
      ),
    );
  }

  return entries;
}

function extractBindableContributors(
  contributor: FieldContributor,
): readonly BindableContributor[] {
  const expression = contributor.expression;
  if (expression == null) {
    return [];
  }

  if (ts.isStringLiteral(expression) || ts.isNoSubstitutionTemplateLiteral(expression)) {
    return [{
      bindableName: expression.text,
      fields: {
        name: expression,
      },
      contribution: toBindableWitness('name', contributor.contribution),
    }];
  }

  if (ts.isArrayLiteralExpression(expression)) {
    const items: BindableContributor[] = [];
    for (const element of expression.elements) {
      if (ts.isStringLiteral(element) || ts.isNoSubstitutionTemplateLiteral(element)) {
        items.push({
          bindableName: element.text,
          fields: { name: element },
          contribution: toBindableWitness('name', contributor.contribution),
        });
        continue;
      }
      if (ts.isObjectLiteralExpression(element)) {
        const bindableName = readBindableStringValue(readObjectLiteralPropertyInitializer(element, 'name'));
        items.push({
          bindableName,
          fields: readBindableFieldMap(element),
          contribution: toBindableWitness('name', contributor.contribution),
        });
      }
    }
    return items;
  }

  if (ts.isObjectLiteralExpression(expression)) {
    const explicitName = readBindableStringValue(readObjectLiteralPropertyInitializer(expression, 'name'));
    if (explicitName != null) {
      return [{
        bindableName: explicitName,
        fields: readBindableFieldMap(expression),
        contribution: toBindableWitness('name', contributor.contribution),
      }];
    }

    if (contributor.contribution.carrier === 'bindable-decorator') {
      return [{
        bindableName: null,
        fields: readBindableFieldMap(expression),
        contribution: toBindableWitness('name', contributor.contribution),
      }];
    }

    const items: BindableContributor[] = [];
    for (const property of expression.properties) {
      if (!ts.isPropertyAssignment(property) && !ts.isShorthandPropertyAssignment(property)) {
        continue;
      }

      const bindableName = readPropertyName(property.name);
      if (bindableName == null) {
        continue;
      }

      if (ts.isShorthandPropertyAssignment(property)) {
        items.push({
          bindableName,
          fields: { name: ts.factory.createStringLiteral(bindableName) },
          contribution: toBindableWitness('name', contributor.contribution),
        });
        continue;
      }

      const initializer = property.initializer;
      if (initializer.kind === ts.SyntaxKind.TrueKeyword) {
        items.push({
          bindableName,
          fields: { name: ts.factory.createStringLiteral(bindableName) },
          contribution: toBindableWitness('name', contributor.contribution),
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
          contribution: toBindableWitness('name', contributor.contribution),
        });
      }
    }
    return items;
  }

  return [];
}

function readBindableFieldMap(
  expression: ts.ObjectLiteralExpression,
): Partial<Record<CustomElementBindableFieldKind, ts.Expression | null>> {
  return {
    name: readObjectLiteralPropertyInitializer(expression, 'name'),
    attribute: readObjectLiteralPropertyInitializer(expression, 'attribute'),
    callback: readObjectLiteralPropertyInitializer(expression, 'callback'),
    mode: readObjectLiteralPropertyInitializer(expression, 'mode'),
    set: readObjectLiteralPropertyInitializer(expression, 'set'),
    type: readObjectLiteralPropertyInitializer(expression, 'type'),
    nullable: readObjectLiteralPropertyInitializer(expression, 'nullable'),
  };
}

function toBindableWitness(
  field: CustomElementBindableFieldKind,
  witness: CustomElementFieldWitness,
): CustomElementBindableFieldWitness {
  return new CustomElementBindableFieldWitness(
    field,
    witness.carrier,
    witness.source,
    witness.note,
  );
}

function buildBindableFieldProvenance(
  field: CustomElementBindableFieldKind,
  contributors: readonly BindableContributor[],
  modeOverride?: 'selected' | 'presence-only',
): CustomElementBindableFieldProvenance | null {
  if (contributors.length === 0) {
    return null;
  }

  const selectedContributor = selectBindableContributor(contributors);
  const contributorWitnesses = mergeUniqueBindableWitnesses(
    contributors.map((current) =>
      new CustomElementBindableFieldWitness(
        field,
        current.contribution.carrier,
        current.contribution.source,
        current.contribution.note,
      ),
    ),
  );

  return new CustomElementBindableFieldProvenance(
    field,
    modeOverride ?? 'selected',
    selectedContributor == null
      ? null
      : new CustomElementBindableFieldWitness(
        field,
        selectedContributor.contribution.carrier,
        selectedContributor.contribution.source,
        selectedContributor.contribution.note,
      ),
    contributorWitnesses,
  );
}

function compactBindableProvenances(
  values: readonly (CustomElementBindableFieldProvenance | null)[],
): readonly CustomElementBindableFieldProvenance[] {
  return values.filter((value): value is CustomElementBindableFieldProvenance => value != null);
}

function mergeUniqueBindableWitnesses(
  values: readonly CustomElementBindableFieldWitness[],
): readonly CustomElementBindableFieldWitness[] {
  const seen = new Set<string>();
  const merged: CustomElementBindableFieldWitness[] = [];

  for (const value of values) {
    const key = `${value.field}:${value.carrier}:${value.source?.id ?? '<none>'}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    merged.push(value);
  }

  return merged;
}

function selectBindableContributor(
  contributors: readonly BindableContributor[],
): BindableContributor | null {
  return [...contributors].sort((left, right) =>
    compareBindableCarrierPrecedence(left.contribution.carrier, right.contribution.carrier),
  )[0] ?? null;
}

function selectBindableExpression(
  contributors: readonly BindableContributor[],
  field: CustomElementBindableFieldKind,
): ts.Expression | null {
  const selected = selectBindableContributor(contributors);
  if (selected == null) {
    return null;
  }

  return selected.fields[field] ?? null;
}

function readBindableStringValue(
  expression: ts.Expression | null,
): string | null {
  return readStringLiteralValue(expression);
}

function readBindableModeValue(
  expression: ts.Expression | null,
): string | number | null {
  if (expression == null) {
    return null;
  }
  if (ts.isStringLiteral(expression) || ts.isNoSubstitutionTemplateLiteral(expression)) {
    return expression.text;
  }
  if (ts.isIdentifier(expression)) {
    return expression.text;
  }
  if (ts.isNumericLiteral(expression)) {
    return Number(expression.text);
  }
  return null;
}

function readBindableTypeReferenceName(
  expression: ts.Expression | null,
): string | null {
  if (expression == null) {
    return null;
  }
  if (ts.isIdentifier(expression)) {
    return expression.text;
  }
  if (ts.isPropertyAccessExpression(expression)) {
    return expression.name.text;
  }
  return null;
}

function readBindableInterceptorKind(
  setContributors: readonly BindableContributor[],
  typeContributors: readonly BindableContributor[],
): CustomElementBindableInterceptorKind {
  if (setContributors.length > 0) {
    return 'explicit-set';
  }
  if (typeContributors.length > 0) {
    return 'type-coercer';
  }
  return 'default-noop';
}

function toKebabCase(
  value: string,
): string {
  return value.replace(/([A-Z])/g, (_, capital: string) => `-${capital.toLowerCase()}`);
}

function readDependencyEntries(
  contributors: readonly FieldContributor[],
): readonly CustomElementDependencyEntry[] {
  const entries: CustomElementDependencyEntry[] = [];
  const seen = new Set<string>();

  for (const contributor of contributors) {
    const current = contributor.expression;
    if (current == null) {
      continue;
    }
    if (ts.isArrayLiteralExpression(current)) {
      for (const element of current.elements) {
        const sourceKind = ts.isSpreadElement(element)
          ? 'merged-array'
          : hasAnySpread(current)
            ? 'merged-array'
            : 'literal-array';
        const targetExpression = ts.isSpreadElement(element) ? element.expression : element;
        const seed = readReferenceSeed(targetExpression);
        const referenceName = seed.candidateName;
        const key = `${referenceName ?? '<anonymous>'}:${sourceKind}:${seed.kind}:${contributor.contribution.source?.id ?? '<none>'}:${contributor.contribution.carrier}`;
        if (seen.has(key)) {
          continue;
        }
        seen.add(key);
        entries.push(
          new CustomElementDependencyEntry(
            referenceName,
            sourceKind,
            seed.kind,
            contributor.contribution,
          ),
        );
      }
      continue;
    }

    const sourceKind = classifyDependencySourceKind(current);
    const seed = readReferenceSeed(current);
    const key = `${seed.candidateName ?? '<anonymous>'}:${sourceKind}:${seed.kind}:${contributor.contribution.source?.id ?? '<none>'}:${contributor.contribution.carrier}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    entries.push(
      new CustomElementDependencyEntry(
        seed.candidateName,
        sourceKind,
        seed.kind,
        contributor.contribution,
      ),
    );
  }

  return entries;
}

function readDependencySources(
  contributors: readonly FieldContributor[],
): readonly CustomElementDependencySource[] {
  const sources: CustomElementDependencySource[] = [];
  const seen = new Set<string>();

  for (const contributor of contributors) {
    const expression = contributor.expression;
    if (expression == null) {
      continue;
    }

    const seed = readReferenceSeed(expression);
    const kind = classifyDependencySourceKind(expression);
    const key = `${kind}:${seed.kind}:${seed.candidateName ?? '<anonymous>'}:${contributor.contribution.source?.id ?? '<none>'}:${contributor.contribution.carrier}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    sources.push(
      new CustomElementDependencySource(
        kind,
        contributor.contribution,
        seed.candidateName,
        seed.kind,
        kind === 'open-expression'
          ? 'Dependency carrier shape is not yet closed under the current bounded evaluator seam.'
          : null,
      ),
    );
  }

  return sources;
}

function classifyDependencySourceKind(
  expression: ts.Expression,
): CustomElementDependencySourceKind {
  if (ts.isArrayLiteralExpression(expression)) {
    return hasAnySpread(expression) ? 'merged-array' : 'literal-array';
  }
  if (ts.isCallExpression(expression)) {
    return 'call-result';
  }

  const seed = readReferenceSeed(expression);
  if (seed.kind === 'identifier-name' || seed.kind === 'property-access-name') {
    return 'array-reference';
  }

  return 'open-expression';
}

function hasAnySpread(
  expression: ts.ArrayLiteralExpression,
): boolean {
  return expression.elements.some(ts.isSpreadElement);
}

function readTemplateSource(
  contributors: readonly FieldContributor[],
): CustomElementTemplateSource {
  const selected = selectContributor(contributors);
  const expression = selected?.expression ?? null;

  if (expression == null || expression.kind === ts.SyntaxKind.NullKeyword) {
    return new CustomElementTemplateSource(
      'none',
      buildFieldProvenance('template', contributors, 'presence-only'),
      'No declaration-side template source is present on this custom element surface.',
    );
  }

  if (ts.isStringLiteral(expression) || ts.isNoSubstitutionTemplateLiteral(expression)) {
    return new CustomElementTemplateSource(
      'inline-string',
      buildFieldProvenance('template', contributors),
      'Inline template text is present and would still require compilation unless precompiled instructions also exist.',
    );
  }

  return new CustomElementTemplateSource(
    'expression-reference',
    buildFieldProvenance('template', contributors),
    'Template source is reference-shaped and needs deeper value recovery to close further.',
  );
}

function readReferenceName(
  expression: ts.Expression,
): string | null {
  if (ts.isIdentifier(expression)) {
    return expression.text;
  }

  if (ts.isPropertyAccessExpression(expression)) {
    return expression.name.text;
  }

  if (ts.isStringLiteral(expression) || ts.isNoSubstitutionTemplateLiteral(expression)) {
    return expression.text;
  }

  return null;
}

function toNodeRef(
  node: ts.Node,
  file: SourceFileRef,
  sourceFile: ts.SourceFile,
): SourceNodeRef {
  return new SourceNodeRef(
    `node:${ts.SyntaxKind[node.kind]}:${node.getStart(sourceFile)}-${node.end}`,
    file,
    ts.SyntaxKind[node.kind],
    new SourceSpan(node.getStart(sourceFile), node.end),
  );
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

function compactProvenances(
  values: readonly (CustomElementFieldProvenance | null)[],
): readonly CustomElementFieldProvenance[] {
  return values.filter((value): value is CustomElementFieldProvenance => value != null);
}

function mergeUniqueProvenances(
  ...values: readonly (readonly CustomElementFieldProvenance[])[]
): readonly CustomElementFieldProvenance[] {
  const byField = new Map<CustomElementSupportFieldKind, CustomElementFieldProvenance>();

  for (const list of values) {
    for (const value of list) {
      const existing = byField.get(value.field);
      if (existing == null) {
        byField.set(value.field, value);
        continue;
      }

      byField.set(
        value.field,
        new CustomElementFieldProvenance(
          value.field,
          value.mode,
          value.selected ?? existing.selected,
          mergeUniqueWitnesses(existing.contributors, value.contributors),
          existing.note ?? value.note,
        ),
      );
    }
  }

  return [...byField.values()];
}

function mergeUniqueWitnesses(
  ...values: readonly (readonly CustomElementFieldWitness[])[]
): readonly CustomElementFieldWitness[] {
  const seen = new Set<string>();
  const merged: CustomElementFieldWitness[] = [];

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

function buildFieldProvenance(
  field: CustomElementSupportFieldKind,
  contributors: readonly FieldContributor[],
  modeOverride?: 'selected' | 'merged' | 'presence-only',
): CustomElementFieldProvenance | null {
  if (contributors.length === 0) {
    return null;
  }

  const mergedFields = field === 'aliases' || field === 'bindables' || field === 'dependencies';
  const mode = modeOverride ?? (mergedFields ? 'merged' : 'selected');

  return new CustomElementFieldProvenance(
    field,
    mode,
    mode === 'selected' ? selectContributor(contributors)?.contribution ?? null : null,
    mergeUniqueWitnesses(contributors.map((current) => current.contribution)),
  );
}

function selectContributor(
  contributors: readonly FieldContributor[],
): FieldContributor | null {
  return [...contributors].sort((left, right) =>
    compareCarrierPrecedence(left.contribution.carrier, right.contribution.carrier),
  )[0] ?? null;
}

function selectExpression(
  contributors: readonly FieldContributor[],
): ts.Expression | null {
  return selectContributor(contributors)?.expression ?? null;
}

function compareCarrierPrecedence(
  left: CustomElementSupportCarrierKind,
  right: CustomElementSupportCarrierKind,
): number {
  return carrierPrecedence(left) - carrierPrecedence(right);
}

function compareBindableCarrierPrecedence(
  left: CustomElementSupportCarrierKind,
  right: CustomElementSupportCarrierKind,
): number {
  return bindableCarrierPrecedence(left) - bindableCarrierPrecedence(right);
}

function carrierPrecedence(
  carrier: CustomElementSupportCarrierKind,
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

function bindableCarrierPrecedence(
  carrier: CustomElementSupportCarrierKind,
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

function createWitness(
  field: CustomElementSupportFieldKind,
  node: ts.Node | null,
  file: SourceFileRef,
  sourceFile: ts.SourceFile,
  carrier: CustomElementSupportCarrierKind,
): CustomElementFieldWitness | null {
  if (node == null) {
    return null;
  }

  return new CustomElementFieldWitness(
    field,
    carrier,
    toNodeRef(node, file, sourceFile),
  );
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

function readDecoratedMemberName(
  member: ts.ClassElement,
): string | null {
  if ('name' in member && member.name != null && ts.isIdentifier(member.name)) {
    return member.name.text;
  }
  return null;
}

function readPropertyName(
  name: ts.PropertyName,
): string | null {
  return ts.isIdentifier(name) || ts.isStringLiteral(name) || ts.isNoSubstitutionTemplateLiteral(name)
    ? name.text
    : null;
}

function hasStaticModifier(
  node: ts.Node,
): boolean {
  return ts.canHaveModifiers(node)
    ? (ts.getModifiers(node)?.some((current) => current.kind === ts.SyntaxKind.StaticKeyword) ?? false)
    : false;
}

function findNodeBySpan(
  sourceFile: ts.SourceFile,
  start: number,
  end: number,
): ts.Node | null {
  let best: ts.Node | null = null;

  const visit = (node: ts.Node) => {
    const nodeStart = node.getStart(sourceFile);
    if (nodeStart === start && node.end === end) {
      best = node;
      return;
    }
    if (start >= nodeStart && end <= node.end) {
      ts.forEachChild(node, visit);
    }
  };

  visit(sourceFile);
  return best;
}

function guessScriptKind(
  filePath: string,
): ts.ScriptKind {
  return filePath.endsWith('.tsx')
    ? ts.ScriptKind.TSX
    : filePath.endsWith('.js') || filePath.endsWith('.mjs')
      ? ts.ScriptKind.JS
      : ts.ScriptKind.TS;
}
