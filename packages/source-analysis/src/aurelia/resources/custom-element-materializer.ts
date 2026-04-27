import fs from 'node:fs';
import ts from 'typescript';
import { findNodeBySpan as astFindNodeBySpan, guessScriptKind as astGuessScriptKind, hasStaticModifier as astHasStaticModifier, readPropertyName as astReadPropertyName, readReferenceSeed, readStringArrayValues as astReadStringArrayValues, readStringLiteralValue as astReadStringLiteralValue } from '../analysis/ts-ast-helpers.js';
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
  mergeChildrenSurface,
  readChildrenSurface,
} from './children-materialization.js';
import { ChildrenSurface } from './children-support.js';
import {
  mergeSlottedSurface,
  readSlottedSurface,
} from './slotted-materialization.js';
import {
  readCustomElementSlotTopology,
} from './custom-element-slot-topology-materialization.js';
import {
  createBindableResolutionInput,
  mergeBindableSurface as mergeSharedBindableSurface,
  readBindableSurfaceFromInputs,
  type BindableContributorSeed,
} from './bindable-materialization.js';
import { CustomElementDefinition } from './custom-element-definition.js';
import {
  CustomElementDependencySource,
  CustomElementDependencyContribution,
  CustomElementDependencyEntry,
  CustomElementFieldProvenance,
  CustomElementFieldWitness,
  CustomElementIdentity,
  CustomElementPolicy,
  CustomElementTemplateSource,
  type CustomElementCaptureKind,
  type CustomElementDependencyLinkSeedKind,
  type CustomElementDependencySourceKind,
  type CustomElementSupportCarrierKind,
  type CustomElementSupportFieldKind,
  type CustomElementProcessContentKind,
} from './custom-element-support.js';
import { CustomElementSlotTopology } from './custom-element-slot-topology-support.js';
import {
  CustomElementLifecycleHooks,
  CustomElementLifecycleHookProvenance,
  CustomElementLifecycleHookWitness,
  type CustomElementLifecycleHookKind,
} from './custom-element-lifecycle-support.js';
import { SlottedSurface } from './slotted-support.js';
import {
  mergeWatchSurface,
  readWatchSurface,
} from './watch-materialization.js';
import { WatchSurface } from './watch-support.js';

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
      mergeWatchSurface(definition.watchSurface, surface.watchSurface),
      mergeLifecycleHooks(definition.lifecycleHooks, surface.lifecycleHooks),
      mergeChildrenSurface(definition.childrenSurface, surface.childrenSurface),
      mergeSlottedSurface(definition.slottedSurface, surface.slottedSurface),
      mergeSlotTopology(definition.slotTopology, surface.slotTopology),
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
  readonly bindableSurface: BindableSurface;
  readonly dependencyContribution: CustomElementDependencyContribution;
  readonly templateSource: CustomElementTemplateSource;
  readonly slotTopology: CustomElementSlotTopology;
  readonly watchSurface: WatchSurface;
  readonly lifecycleHooks: CustomElementLifecycleHooks;
  readonly childrenSurface: ChildrenSurface;
  readonly slottedSurface: SlottedSurface;
}

interface FieldContributor {
  readonly expression: ts.Expression | null;
  readonly contribution: CustomElementFieldWitness;
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
  // NOTE: imperative CustomElement.define(...) definition-object ingress is now
  // seeded upstream in ResourceScanner. This pass still only deepens the class
  // carrier itself; it does not re-read external definition objects here.
  const auDefinition = readStaticAuDefinition(declarationNode);

  const nameContributors = readFieldContributors('name', declarationNode, auDefinition, file, sourceFile);
  const aliasesContributors = readFieldContributors('aliases', declarationNode, auDefinition, file, sourceFile);
  const bindablesContributors = readFieldContributors('bindables', declarationNode, auDefinition, file, sourceFile);
  const dependenciesContributors = readFieldContributors('dependencies', declarationNode, auDefinition, file, sourceFile);
  const captureContributors = readFieldContributors('capture', declarationNode, auDefinition, file, sourceFile);
  const containerlessContributors = readFieldContributors('containerless', declarationNode, auDefinition, file, sourceFile);
  const shadowOptionsContributors = readFieldContributors('shadow-options', declarationNode, auDefinition, file, sourceFile);
  const hasSlotsContributors = readFieldContributors('has-slots', declarationNode, auDefinition, file, sourceFile);
  const processContentContributors = readFieldContributors('process-content', declarationNode, auDefinition, file, sourceFile);
  const templateContributors = readFieldContributors('template', declarationNode, auDefinition, file, sourceFile);
  const templateSource = readTemplateSource(templateContributors);
  const hasSlotsProvenance = buildFieldProvenance('has-slots', hasSlotsContributors);
  const processContentKind = readProcessContentKind(selectExpression(processContentContributors));
  const slotTopology = readCustomElementSlotTopology(
    readDeclarationOwnerId(declarationNode, file, sourceFile),
    readDeclarationOwnerNode(declarationNode, file, sourceFile),
    file,
    templateSource,
    hasSlotsProvenance,
    readBooleanValue(selectExpression(hasSlotsContributors)),
    processContentKind !== 'open',
  );

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
      processContentKind,
      compactProvenances([
        buildFieldProvenance('capture', captureContributors),
        buildFieldProvenance('containerless', containerlessContributors),
        buildFieldProvenance('shadow-options', shadowOptionsContributors),
        buildFieldProvenance('process-content', processContentContributors),
      ]),
      captureContributors.length === 0
        && containerlessContributors.length === 0
        && shadowOptionsContributors.length === 0
        && hasSlotsContributors.length === 0
        && processContentContributors.length === 0
        ? 'Custom element policy fields are still open on this declaration surface.'
        : null,
    ),
    bindableSurface: readBindableSurfaceFromInputs(
      createBindableResolutionInputs(bindablesContributors),
      declarationNode,
      file,
      sourceFile,
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
    templateSource,
    slotTopology,
    watchSurface: readWatchSurface(declarationNode, file, sourceFile),
    lifecycleHooks: readLifecycleHooks(declarationNode, file, sourceFile),
    childrenSurface: readChildrenSurface(declarationNode, file, sourceFile),
    slottedSurface: readSlottedSurface(declarationNode, file, sourceFile),
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
  existing: BindableSurface,
  derived: BindableSurface,
): BindableSurface {
  return mergeSharedBindableSurface(existing, derived);
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

function mergeSlotTopology(
  existing: CustomElementSlotTopology,
  derived: CustomElementSlotTopology,
): CustomElementSlotTopology {
  if (existing.hasSlots != null || existing.slots.length > 0) {
    return existing;
  }
  return derived;
}

function mergeLifecycleHooks(
  existing: CustomElementLifecycleHooks,
  derived: CustomElementLifecycleHooks,
): CustomElementLifecycleHooks {
  return new CustomElementLifecycleHooks(
    existing.defineSource ?? derived.defineSource,
    existing.hydratingSource ?? derived.hydratingSource,
    existing.hydratedSource ?? derived.hydratedSource,
    existing.createdSource ?? derived.createdSource,
    existing.bindingSource ?? derived.bindingSource,
    existing.boundSource ?? derived.boundSource,
    existing.attachingSource ?? derived.attachingSource,
    existing.attachedSource ?? derived.attachedSource,
    existing.detachingSource ?? derived.detachingSource,
    existing.unbindingSource ?? derived.unbindingSource,
    existing.disposeSource ?? derived.disposeSource,
    existing.acceptSource ?? derived.acceptSource,
    mergeUniqueLifecycleProvenances(existing.provenance, derived.provenance),
    existing.note ?? derived.note,
  );
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
    case 'has-slots':
      return 'hasSlots';
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
  if (
    ts.isIdentifier(expression)
    || ts.isFunctionExpression(expression)
    || ts.isArrowFunction(expression)
    || ts.isPropertyAccessExpression(expression)
  ) {
    if (ts.isPropertyAccessExpression(expression) && expression.expression.getText() === 'Symbol') {
      return 'symbol-key';
    }
    return 'function-hook';
  }
  return 'open';
}

function toBindableContributorSeeds(
  contributors: readonly FieldContributor[],
): readonly BindableContributorSeed[] {
  return contributors.map((current) => ({
    expression: current.expression,
    carrier: toBindableCarrier(current.contribution.carrier),
    source: current.contribution.source,
    note: current.contribution.note,
  }));
}

function createBindableResolutionInputs(
  contributors: readonly FieldContributor[],
): readonly ReturnType<typeof createBindableResolutionInput>[] {
  // TODO: runtime CE bindables also fold inherited metadata and, in some
  // creation paths, later definition-object bindables. The current clean-room
  // closes the declaration-local ordering first: local @bindable metadata,
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
  carrier: CustomElementSupportCarrierKind,
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
      null,
      null,
      buildFieldProvenance('template', contributors, 'presence-only'),
      'No declaration-side template source is present on this custom element surface.',
    );
  }

  if (ts.isStringLiteral(expression) || ts.isNoSubstitutionTemplateLiteral(expression)) {
    return new CustomElementTemplateSource(
      'inline-string',
      expression.text,
      null,
      buildFieldProvenance('template', contributors),
      'Inline template text is present and would still require compilation unless precompiled instructions also exist.',
    );
  }

  return new CustomElementTemplateSource(
    'expression-reference',
    null,
    readReferenceName(expression),
    buildFieldProvenance('template', contributors),
    'Template source is reference-shaped and needs deeper value recovery to close further.',
  );
}

function readLifecycleHooks(
  declarationNode: ts.ClassLikeDeclarationBase,
  file: SourceFileRef,
  sourceFile: ts.SourceFile,
): CustomElementLifecycleHooks {
  const defineMethod = findInstanceMethod(declarationNode, 'define');
  const hydratingMethod = findInstanceMethod(declarationNode, 'hydrating');
  const hydratedMethod = findInstanceMethod(declarationNode, 'hydrated');
  const createdMethod = findInstanceMethod(declarationNode, 'created');
  const bindingMethod = findInstanceMethod(declarationNode, 'binding');
  const boundMethod = findInstanceMethod(declarationNode, 'bound');
  const attachingMethod = findInstanceMethod(declarationNode, 'attaching');
  const attachedMethod = findInstanceMethod(declarationNode, 'attached');
  const detachingMethod = findInstanceMethod(declarationNode, 'detaching');
  const unbindingMethod = findInstanceMethod(declarationNode, 'unbinding');
  const disposeMethod = findInstanceMethod(declarationNode, 'dispose');
  const acceptMethod = findInstanceMethod(declarationNode, 'accept');

  return new CustomElementLifecycleHooks(
    defineMethod == null ? null : toNodeRef(defineMethod, file, sourceFile),
    hydratingMethod == null ? null : toNodeRef(hydratingMethod, file, sourceFile),
    hydratedMethod == null ? null : toNodeRef(hydratedMethod, file, sourceFile),
    createdMethod == null ? null : toNodeRef(createdMethod, file, sourceFile),
    bindingMethod == null ? null : toNodeRef(bindingMethod, file, sourceFile),
    boundMethod == null ? null : toNodeRef(boundMethod, file, sourceFile),
    attachingMethod == null ? null : toNodeRef(attachingMethod, file, sourceFile),
    attachedMethod == null ? null : toNodeRef(attachedMethod, file, sourceFile),
    detachingMethod == null ? null : toNodeRef(detachingMethod, file, sourceFile),
    unbindingMethod == null ? null : toNodeRef(unbindingMethod, file, sourceFile),
    disposeMethod == null ? null : toNodeRef(disposeMethod, file, sourceFile),
    acceptMethod == null ? null : toNodeRef(acceptMethod, file, sourceFile),
    compactLifecycleProvenances([
      buildLifecycleHookProvenance('define', defineMethod, file, sourceFile),
      buildLifecycleHookProvenance('hydrating', hydratingMethod, file, sourceFile),
      buildLifecycleHookProvenance('hydrated', hydratedMethod, file, sourceFile),
      buildLifecycleHookProvenance('created', createdMethod, file, sourceFile),
      buildLifecycleHookProvenance('binding', bindingMethod, file, sourceFile),
      buildLifecycleHookProvenance('bound', boundMethod, file, sourceFile),
      buildLifecycleHookProvenance('attaching', attachingMethod, file, sourceFile),
      buildLifecycleHookProvenance('attached', attachedMethod, file, sourceFile),
      buildLifecycleHookProvenance('detaching', detachingMethod, file, sourceFile),
      buildLifecycleHookProvenance('unbinding', unbindingMethod, file, sourceFile),
      buildLifecycleHookProvenance('dispose', disposeMethod, file, sourceFile),
      buildLifecycleHookProvenance('accept', acceptMethod, file, sourceFile),
    ]),
    'Custom-element declaration-local lifecycle hook witnesses over compile and activation hook names.',
  );
}

function findInstanceMethod(
  declarationNode: ts.ClassLikeDeclarationBase,
  name: string,
): ts.MethodDeclaration | null {
  for (const member of declarationNode.members) {
    if (astHasStaticModifier(member) || !ts.isMethodDeclaration(member)) {
      continue;
    }
    if (astReadPropertyName(member.name) === name) {
      return member;
    }
  }
  return null;
}

function buildLifecycleHookProvenance(
  hook: CustomElementLifecycleHookKind,
  method: ts.MethodDeclaration | null,
  file: SourceFileRef,
  sourceFile: ts.SourceFile,
): CustomElementLifecycleHookProvenance | null {
  if (method == null) {
    return null;
  }

  const witness = new CustomElementLifecycleHookWitness(
    hook,
    'instance-method',
    toNodeRef(method, file, sourceFile),
  );
  return new CustomElementLifecycleHookProvenance(
    hook,
    'selected',
    witness,
    [witness],
  );
}

function compactLifecycleProvenances(
  values: readonly (CustomElementLifecycleHookProvenance | null)[],
): readonly CustomElementLifecycleHookProvenance[] {
  return values.filter((value): value is CustomElementLifecycleHookProvenance => value != null);
}

function mergeUniqueLifecycleProvenances(
  ...values: readonly (readonly CustomElementLifecycleHookProvenance[])[]
): readonly CustomElementLifecycleHookProvenance[] {
  const byHook = new Map<CustomElementLifecycleHookKind, CustomElementLifecycleHookProvenance>();

  for (const list of values) {
    for (const value of list) {
      const existing = byHook.get(value.hook);
      if (existing == null) {
        byHook.set(value.hook, value);
        continue;
      }
      byHook.set(
        value.hook,
        new CustomElementLifecycleHookProvenance(
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

function mergeUniqueLifecycleWitnesses(
  ...values: readonly (readonly CustomElementLifecycleHookWitness[])[]
): readonly CustomElementLifecycleHookWitness[] {
  const seen = new Set<string>();
  const merged: CustomElementLifecycleHookWitness[] = [];

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
  return sourceNodeRefFromTsNode(file, node, sourceFile);
}

function readDeclarationOwnerNode(
  declarationNode: ts.ClassLikeDeclarationBase,
  file: SourceFileRef,
  sourceFile: ts.SourceFile,
): SourceNodeRef {
  return toNodeRef(declarationNode, file, sourceFile);
}

function readDeclarationOwnerId(
  declarationNode: ts.ClassLikeDeclarationBase,
  file: SourceFileRef,
  sourceFile: ts.SourceFile,
): string {
  return readDeclarationOwnerNode(declarationNode, file, sourceFile).id;
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

function carrierPrecedence(
  carrier: CustomElementSupportCarrierKind,
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
