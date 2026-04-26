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
import type { SourceFileRef } from '../source-address.js';
import {
  sourceNodeRefFromTsNode,
  type SourceNodeRef,
} from '../refs.js';
import {
  BindableSurface,
  type BindableCarrierKind,
} from './bindable-support.js';
import {
  createBindableResolutionInput,
  mergeBindableSurface as mergeSharedBindableSurface,
  readBindableSurfaceFromInputs,
  type BindableContributorSeed,
} from './bindable-materialization.js';
import { CustomAttributeDefinition } from './custom-attribute-definition.js';
import {
  CustomAttributeDependencyContribution,
  CustomAttributeDependencyEntry,
  CustomAttributeFieldProvenance,
  CustomAttributeFieldWitness,
  CustomAttributeIdentity,
  CustomAttributePolicy,
  type CustomAttributeDependencyLinkSeedKind,
  type CustomAttributeDependencySourceKind,
  type CustomAttributeSupportCarrierKind,
  type CustomAttributeSupportFieldKind,
} from './custom-attribute-support.js';
import {
  CustomAttributeLifecycleHooks,
  CustomAttributeLifecycleHookProvenance,
  CustomAttributeLifecycleHookWitness,
  type CustomAttributeLifecycleHookKind,
} from './custom-attribute-lifecycle-support.js';
import { TemplateControllerDefinition } from './template-controller-definition.js';
import {
  mergeWatchSurface,
  readWatchSurface,
} from './watch-materialization.js';
import { WatchSurface } from './watch-support.js';

export interface CustomAttributeMaterializerState {
  readonly parsedFileCount: number;
}

interface CustomAttributeSurface {
  readonly identity: CustomAttributeIdentity;
  readonly bindableSurface: BindableSurface;
  readonly policy: CustomAttributePolicy;
  readonly dependencyContribution: CustomAttributeDependencyContribution;
  readonly watchSurface: WatchSurface;
  readonly lifecycleHooks: CustomAttributeLifecycleHooks;
}

interface FieldContributor {
  readonly expression: ts.Expression | null;
  readonly contribution: CustomAttributeFieldWitness;
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
        mergeWatchSurface(definition.watchSurface, surface.watchSurface),
        mergeLifecycleHooks(definition.lifecycleHooks, surface.lifecycleHooks),
      );
    }

    return new TemplateControllerDefinition(
      definition.id,
      definition.type,
      mergeIdentity(definition.identity, surface.identity),
      mergeBindableSurface(definition.bindableSurface, surface.bindableSurface),
      mergePolicy(definition.policy, surface.policy),
      mergeDependencyContribution(definition.dependencyContribution, surface.dependencyContribution),
      mergeWatchSurface(definition.watchSurface, surface.watchSurface),
      mergeLifecycleHooks(definition.lifecycleHooks, surface.lifecycleHooks),
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
    bindableSurface: readBindableSurfaceFromInputs(
      createBindableResolutionInputs(bindablesContributors),
      declarationNode,
      file,
      sourceFile,
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
    watchSurface: readWatchSurface(declarationNode, file, sourceFile),
    lifecycleHooks: readLifecycleHooks(declarationNode, file, sourceFile),
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

function toBindableContributorSeeds(
  contributors: readonly FieldContributor[],
): readonly BindableContributorSeed[] {
  return contributors.map((current) => ({
    expression: current.expression == null ? null : unwrapExpression(current.expression),
    carrier: toBindableCarrier(current.contribution.carrier),
    source: current.contribution.source,
    note: current.contribution.note,
  }));
}

function createBindableResolutionInputs(
  contributors: readonly FieldContributor[],
): readonly ReturnType<typeof createBindableResolutionInput>[] {
  // TODO: runtime CA/TC bindables also fold inherited metadata and later
  // definition-object bindables. The current clean-room closes the
  // declaration-local ordering first: local @bindable metadata,
  // annotated/static-au bindables, then static own bindables.
  return [
    createBindableResolutionInput(
      'local-bindable-decorator-metadata',
      toBindableContributorSeeds(contributors.filter((current) => current.contribution.carrier === 'bindable-decorator')),
    ),
    createBindableResolutionInput(
      'annotated-bindables',
      toBindableContributorSeeds(contributors.filter((current) =>
        current.contribution.carrier === 'annotation-decorator' || current.contribution.carrier === 'static-au-property',
      )),
    ),
    createBindableResolutionInput(
      'static-own-bindables',
      toBindableContributorSeeds(contributors.filter((current) => current.contribution.carrier === 'static-own-property')),
    ),
  ].filter((current) => current.entries.length > 0);
}

function toBindableCarrier(
  carrier: CustomAttributeSupportCarrierKind,
): BindableCarrierKind {
  switch (carrier) {
    case 'definition-object':
      return 'definition-object';
    case 'bindable-decorator':
      return 'bindable-decorator';
    case 'static-au-property':
      return 'static-au-property';
    case 'static-own-property':
      return 'static-own-property';
    case 'default':
      return 'default';
    case 'annotation-decorator':
    case 'open':
    default:
      return 'open';
  }
}

function readLifecycleHooks(
  declarationNode: ts.ClassLikeDeclarationBase,
  file: SourceFileRef,
  sourceFile: ts.SourceFile,
): CustomAttributeLifecycleHooks {
  const createdMethod = findInstanceMethod(declarationNode, 'created');
  const linkMethod = findInstanceMethod(declarationNode, 'link');
  const bindingMethod = findInstanceMethod(declarationNode, 'binding');
  const boundMethod = findInstanceMethod(declarationNode, 'bound');
  const attachingMethod = findInstanceMethod(declarationNode, 'attaching');
  const attachedMethod = findInstanceMethod(declarationNode, 'attached');
  const detachingMethod = findInstanceMethod(declarationNode, 'detaching');
  const unbindingMethod = findInstanceMethod(declarationNode, 'unbinding');
  const disposeMethod = findInstanceMethod(declarationNode, 'dispose');
  const acceptMethod = findInstanceMethod(declarationNode, 'accept');

  return new CustomAttributeLifecycleHooks(
    createdMethod == null ? null : toNodeRef(createdMethod, file, sourceFile),
    linkMethod == null ? null : toNodeRef(linkMethod, file, sourceFile),
    bindingMethod == null ? null : toNodeRef(bindingMethod, file, sourceFile),
    boundMethod == null ? null : toNodeRef(boundMethod, file, sourceFile),
    attachingMethod == null ? null : toNodeRef(attachingMethod, file, sourceFile),
    attachedMethod == null ? null : toNodeRef(attachedMethod, file, sourceFile),
    detachingMethod == null ? null : toNodeRef(detachingMethod, file, sourceFile),
    unbindingMethod == null ? null : toNodeRef(unbindingMethod, file, sourceFile),
    disposeMethod == null ? null : toNodeRef(disposeMethod, file, sourceFile),
    acceptMethod == null ? null : toNodeRef(acceptMethod, file, sourceFile),
    compactLifecycleProvenances([
      buildLifecycleHookProvenance('created', createdMethod, file, sourceFile),
      buildLifecycleHookProvenance('link', linkMethod, file, sourceFile),
      buildLifecycleHookProvenance('binding', bindingMethod, file, sourceFile),
      buildLifecycleHookProvenance('bound', boundMethod, file, sourceFile),
      buildLifecycleHookProvenance('attaching', attachingMethod, file, sourceFile),
      buildLifecycleHookProvenance('attached', attachedMethod, file, sourceFile),
      buildLifecycleHookProvenance('detaching', detachingMethod, file, sourceFile),
      buildLifecycleHookProvenance('unbinding', unbindingMethod, file, sourceFile),
      buildLifecycleHookProvenance('dispose', disposeMethod, file, sourceFile),
      buildLifecycleHookProvenance('accept', acceptMethod, file, sourceFile),
    ]),
    'Custom-attribute/template-controller declaration-local lifecycle/link hook witnesses.',
  );
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

function findInstanceMethod(
  declarationNode: ts.ClassLikeDeclarationBase,
  name: string,
): ts.MethodDeclaration | null {
  for (const member of declarationNode.members) {
    if (hasStaticModifier(member) || !ts.isMethodDeclaration(member)) {
      continue;
    }
    if (readPropertyName(member.name) === name) {
      return member;
    }
  }
  return null;
}

function buildLifecycleHookProvenance(
  hook: CustomAttributeLifecycleHookKind,
  method: ts.MethodDeclaration | null,
  file: SourceFileRef,
  sourceFile: ts.SourceFile,
): CustomAttributeLifecycleHookProvenance | null {
  if (method == null) {
    return null;
  }

  const witness = new CustomAttributeLifecycleHookWitness(
    hook,
    'instance-method',
    toNodeRef(method, file, sourceFile),
  );
  return new CustomAttributeLifecycleHookProvenance(
    hook,
    'selected',
    witness,
    [witness],
  );
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
  left: CustomAttributeSupportCarrierKind,
  right: CustomAttributeSupportCarrierKind,
): number {
  return carrierPrecedence(left) - carrierPrecedence(right);
}

function carrierPrecedence(
  carrier: CustomAttributeSupportCarrierKind,
): number {
  switch (carrier) {
    case 'definition-object':
      return 0;
    case 'annotation-decorator':
      return 1;
    case 'bindable-decorator':
      return 2;
    case 'static-au-property':
      return 3;
    case 'static-own-property':
      return 4;
    case 'default':
      return 5;
    case 'open':
      return 6;
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
  existing: BindableSurface,
  surface: BindableSurface,
): BindableSurface {
  return mergeSharedBindableSurface(existing, surface);
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

function mergeLifecycleHooks(
  existing: CustomAttributeLifecycleHooks,
  surface: CustomAttributeLifecycleHooks,
): CustomAttributeLifecycleHooks {
  return new CustomAttributeLifecycleHooks(
    existing.createdSource ?? surface.createdSource,
    existing.linkSource ?? surface.linkSource,
    existing.bindingSource ?? surface.bindingSource,
    existing.boundSource ?? surface.boundSource,
    existing.attachingSource ?? surface.attachingSource,
    existing.attachedSource ?? surface.attachedSource,
    existing.detachingSource ?? surface.detachingSource,
    existing.unbindingSource ?? surface.unbindingSource,
    existing.disposeSource ?? surface.disposeSource,
    existing.acceptSource ?? surface.acceptSource,
    mergeUniqueLifecycleProvenances(existing.provenance, surface.provenance),
    existing.note ?? surface.note,
  );
}

function compactFieldProvenances(
  values: readonly (CustomAttributeFieldProvenance | null)[],
): readonly CustomAttributeFieldProvenance[] {
  return values.filter((value): value is CustomAttributeFieldProvenance => value != null);
}

function compactLifecycleProvenances(
  values: readonly (CustomAttributeLifecycleHookProvenance | null)[],
): readonly CustomAttributeLifecycleHookProvenance[] {
  return values.filter((value): value is CustomAttributeLifecycleHookProvenance => value != null);
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

function mergeUniqueLifecycleProvenances(
  ...values: readonly (readonly CustomAttributeLifecycleHookProvenance[])[]
): readonly CustomAttributeLifecycleHookProvenance[] {
  const byHook = new Map<CustomAttributeLifecycleHookKind, CustomAttributeLifecycleHookProvenance>();
  for (const list of values) {
    for (const value of list) {
      const existing = byHook.get(value.hook);
      if (existing == null) {
        byHook.set(value.hook, value);
        continue;
      }
      byHook.set(
        value.hook,
        new CustomAttributeLifecycleHookProvenance(
          value.hook,
          value.mode,
          value.selected ?? existing.selected,
          mergeUniqueLifecycleWitnesses(existing.contributors, value.contributors),
          existing.note ?? value.note,
        ),
      );
    }
  }
  return [...byHook.values()];
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

function mergeUniqueLifecycleWitnesses(
  ...values: readonly (readonly CustomAttributeLifecycleHookWitness[])[]
): readonly CustomAttributeLifecycleHookWitness[] {
  const seen = new Set<string>();
  const merged: CustomAttributeLifecycleHookWitness[] = [];
  for (const list of values) {
    for (const value of list) {
      const key = `${value.hook}:${value.carrier}:${value.source?.id ?? '<none>'}`;
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

function toNodeRef(
  node: ts.Node,
  file: SourceFileRef,
  sourceFile: ts.SourceFile,
): SourceNodeRef {
  return sourceNodeRefFromTsNode(file, node, sourceFile);
}

function isStringLike(
  expression: ts.Expression,
): expression is ts.StringLiteral | ts.NoSubstitutionTemplateLiteral {
  return ts.isStringLiteral(expression) || ts.isNoSubstitutionTemplateLiteral(expression);
}
