import ts from 'typescript';
import {
  EvaluationTargetRead,
  readClassTarget,
  StaticEvaluationExpressionReader,
} from '../evaluation/expression-reader.js';
import { ModuleEnvironmentRecord } from '../evaluation/environment.js';
import { unwrapExpression } from '../evaluation/ts-syntax.js';
import { EvaluationValueKind } from '../evaluation/values.js';
import { KernelVocabulary } from '../kernel/vocabulary.js';
import {
  conventionalResourceNameForFilePath,
  hasConventionalTemplatePair,
  isConventionResourceNameCompatible,
  readResourceNameConvention,
} from './resource-convention.js';
import type { ResourceRecognitionContext } from './resource-recognition-context.js';
import { createNamedResourceDefinitionHeader } from './resource-definition.js';
import {
  readDecoratorCalleeName,
  readDefineCallKind,
  readEvaluatedExpressionTarget,
  readResourceAliasesField,
  readResourceKindField,
  readResourceNameField,
  readStaticAuInitializer,
  readTemplateControllerFlag,
  RESOURCE_DECORATOR_KIND,
} from './resource-field-readers.js';
import {
  ResourceCarrierKind,
  ResourceRecognitionObservation,
  ResourceRecognitionOpen,
  ResourceTargetObservation,
} from './resource-observation.js';
import {
  ResourceDefinitionKind,
  type NamedResourceDefinitionKind,
} from './resource-kind.js';

/** Combined recognizer for named resources that are visible by markup or expression syntax names. */
export class NamedResourceRecognizer {
  recognize(context: ResourceRecognitionContext): readonly ResourceRecognitionObservation[] {
    return recognizeNamedResources(context, null);
  }
}

function recognizeNamedResources(
  context: ResourceRecognitionContext,
  resourceKind: NamedResourceDefinitionKind | null,
): readonly ResourceRecognitionObservation[] {
  const observations: ResourceRecognitionObservation[] = [];
  const visit = (node: ts.Node): void => {
    if (ts.isClassDeclaration(node) || ts.isClassExpression(node)) {
      if (!isNestedInFunctionLike(node)) {
        observations.push(...recognizeClassCarriers(context, node, resourceKind));
      }
    }
    if (ts.isCallExpression(node)) {
      const observation = recognizeDefineCall(context, node, resourceKind);
      if (observation != null) {
        observations.push(observation);
      }
    }
    ts.forEachChild(node, visit);
  };

  visit(context.sourceFile);
  observations.push(...recognizeEvaluatedClassBindings(context, resourceKind));
  return observations;
}

function recognizeClassCarriers(
  context: ResourceRecognitionContext,
  classNode: ts.ClassLikeDeclarationBase,
  wantedKind: NamedResourceDefinitionKind | null,
): readonly ResourceRecognitionObservation[] {
  return [
    ...recognizeDecorators(context, classNode, wantedKind),
    ...recognizeStaticAu(context, classNode, wantedKind),
    ...recognizeConventions(context, classNode, wantedKind),
  ];
}

function recognizeDecorators(
  context: ResourceRecognitionContext,
  classNode: ts.ClassLikeDeclarationBase,
  wantedKind: NamedResourceDefinitionKind | null,
  expressionReader = context.expressionReader,
  targetOverride: EvaluationTargetRead | null = null,
): readonly ResourceRecognitionObservation[] {
  const decorators = ts.canHaveDecorators(classNode)
    ? ts.getDecorators(classNode) ?? []
    : [];
  const observations: ResourceRecognitionObservation[] = [];

  for (const decorator of decorators) {
    const calleeName = readDecoratorCalleeName(decorator);
    const resourceKind = calleeName == null
      ? null
      : RESOURCE_DECORATOR_KIND.get(calleeName) ?? null;
    if (
      resourceKind == null
      || resourceKind === ResourceDefinitionKind.AttributePattern
      || !matchesNamedKind(resourceKind, wantedKind)
    ) {
      continue;
    }

    const expression = unwrapExpression(decorator.expression);
    const definitionExpression = ts.isCallExpression(expression)
      ? expression.arguments[0] ?? null
      : null;
    const name = definitionExpression == null
      ? null
      : readResourceNameField(definitionExpression, expressionReader);
    const aliases = definitionExpression == null
      ? null
      : readResourceAliasesField(definitionExpression, expressionReader);
    const openSeams: ResourceRecognitionOpen[] = [];
    if (definitionExpression == null || name?.value == null) {
      openSeams.push(new ResourceRecognitionOpen(
        KernelVocabulary.Resource.OpenNameExpression.key,
        `Decorator ${calleeName}(...) did not expose a static resource name.`,
        definitionExpression ?? decorator,
      ));
    }
    if (aliases?.openSummary != null && aliases.node != null) {
      openSeams.push(new ResourceRecognitionOpen(KernelVocabulary.Resource.OpenAliasExpression.key, aliases.openSummary, aliases.node));
    }

    const target = targetOverride ?? readClassTarget(classNode);
    const definition = createNamedResourceDefinitionHeader(
      resourceKind,
      new ResourceTargetObservation(target.localName, target.node, target.isDeclaration),
      name?.value ?? null,
      aliases?.value ?? [],
    );
    observations.push(new ResourceRecognitionObservation(
      ResourceCarrierKind.Decorator,
      decorator,
      definitionExpression,
      definition,
      openSeams,
    ));
  }

  return observations;
}

function recognizeEvaluatedClassBindings(
  context: ResourceRecognitionContext,
  wantedKind: NamedResourceDefinitionKind | null,
): readonly ResourceRecognitionObservation[] {
  const observations: ResourceRecognitionObservation[] = [];
  for (const binding of context.evaluation.environment.readBindings()) {
    if (
      binding.value.kind !== EvaluationValueKind.Class
      || binding.declaration == null
      || !ts.isVariableDeclaration(binding.declaration)
      || !ts.isIdentifier(binding.declaration.name)
      || !(binding.value.environment instanceof ModuleEnvironmentRecord)
    ) {
      continue;
    }
    const reader = new StaticEvaluationExpressionReader(
      binding.value.environment,
      context.moduleKey,
      context.evaluation.policy,
      context.evaluation.runtimeHost,
    );
    observations.push(...recognizeDecorators(
      context,
      binding.value.declaration,
      wantedKind,
      reader,
      new EvaluationTargetRead(binding.name, binding.declaration.name, true),
    ));
  }
  return observations;
}

function recognizeStaticAu(
  context: ResourceRecognitionContext,
  classNode: ts.ClassLikeDeclarationBase,
  wantedKind: NamedResourceDefinitionKind | null,
): readonly ResourceRecognitionObservation[] {
  const initializer = readStaticAuInitializer(classNode);
  if (initializer == null) {
    return [];
  }

  const kindRead = readResourceKindField(initializer, context.expressionReader);
  let resourceKind = kindRead.value;
  if (
    resourceKind === ResourceDefinitionKind.CustomAttribute
    && readTemplateControllerFlag(initializer, context.expressionReader)
  ) {
    resourceKind = ResourceDefinitionKind.TemplateController;
  }
  const target = readClassTarget(classNode);
  if (resourceKind == null) {
    return wantedKind == null
      ? [
        new ResourceRecognitionObservation(
          ResourceCarrierKind.StaticAu,
          initializer,
          initializer,
          null,
          [
            new ResourceRecognitionOpen(
              KernelVocabulary.Resource.OpenKindExpression.key,
              kindRead.openSummary ?? 'Static $au resource kind did not close to a recognized resource type.',
              kindRead.node ?? initializer,
            ),
          ],
        ),
      ]
      : [];
  }
  if (
    resourceKind === ResourceDefinitionKind.AttributePattern
    || !matchesNamedKind(resourceKind, wantedKind)
  ) {
    return [];
  }

  const name = readResourceNameField(initializer, context.expressionReader);
  const aliases = readResourceAliasesField(initializer, context.expressionReader);
  const openSeams: ResourceRecognitionOpen[] = [];
  if (name.value == null) {
    openSeams.push(new ResourceRecognitionOpen(
      KernelVocabulary.Resource.OpenNameExpression.key,
      name.openSummary ?? 'Static $au resource name did not close to a static string.',
      name.node ?? initializer,
    ));
  }
  if (aliases.openSummary != null && aliases.node != null) {
    openSeams.push(new ResourceRecognitionOpen(KernelVocabulary.Resource.OpenAliasExpression.key, aliases.openSummary, aliases.node));
  }

  const definition = createNamedResourceDefinitionHeader(
    resourceKind,
    new ResourceTargetObservation(target.localName, target.node, target.isDeclaration),
    name.value,
    aliases.value ?? [],
  );
  return [
    new ResourceRecognitionObservation(
      ResourceCarrierKind.StaticAu,
      initializer,
      initializer,
      definition,
      openSeams,
    ),
  ];
}

function recognizeConventions(
  context: ResourceRecognitionContext,
  classNode: ts.ClassLikeDeclarationBase,
  wantedKind: NamedResourceDefinitionKind | null,
): readonly ResourceRecognitionObservation[] {
  if (!ts.isClassDeclaration(classNode) || classNode.name == null || hasDeclareModifier(classNode)) {
    return [];
  }
  if (hasExplicitResourceCarrier(classNode)) {
    return [];
  }

  const convention = readResourceNameConvention(classNode.name.text);
  if (
    convention == null
    || !matchesNamedKind(convention.resourceKind, wantedKind)
  ) {
    return [];
  }
  if (
    convention.resourceKind === ResourceDefinitionKind.CustomElement
    && (
      !isConventionResourceNameCompatible(convention.name, conventionalResourceNameForFilePath(context.moduleKey))
      || !hasConventionalTemplatePair(context, classNode)
    )
  ) {
    return [];
  }

  const target = readClassTarget(classNode);
  return [
    new ResourceRecognitionObservation(
      ResourceCarrierKind.Convention,
      classNode,
      null,
      createNamedResourceDefinitionHeader(
        convention.resourceKind,
        new ResourceTargetObservation(target.localName, target.node, target.isDeclaration),
        convention.name,
        [],
      ),
    ),
  ];
}

function recognizeDefineCall(
  context: ResourceRecognitionContext,
  call: ts.CallExpression,
  wantedKind: NamedResourceDefinitionKind | null,
): ResourceRecognitionObservation | null {
  const resourceKind = readDefineCallKind(call);
  if (
    resourceKind == null
    || resourceKind === ResourceDefinitionKind.AttributePattern
    || !matchesNamedKind(resourceKind, wantedKind)
  ) {
    return null;
  }

  const definitionExpression = call.arguments[0] ?? null;
  const targetExpression = call.arguments[1] ?? null;
  const name = definitionExpression == null
    ? null
    : readResourceNameField(definitionExpression, context.expressionReader);
  const aliases = definitionExpression == null
    ? null
    : readResourceAliasesField(definitionExpression, context.expressionReader);
  const target = targetExpression == null
    ? null
    : readEvaluatedExpressionTarget(targetExpression, context.expressionReader);
  const openSeams: ResourceRecognitionOpen[] = [];

  if (definitionExpression == null || name?.value == null) {
    openSeams.push(new ResourceRecognitionOpen(
      KernelVocabulary.Resource.OpenNameExpression.key,
      name?.openSummary ?? 'Define call did not expose a static resource name.',
      name?.node ?? definitionExpression ?? call,
    ));
  }
  if (aliases?.openSummary != null && aliases.node != null) {
    openSeams.push(new ResourceRecognitionOpen(KernelVocabulary.Resource.OpenAliasExpression.key, aliases.openSummary, aliases.node));
  }
  if (target == null || target.localName == null) {
    openSeams.push(new ResourceRecognitionOpen(
      KernelVocabulary.Resource.OpenTargetExpression.key,
      'Define call did not expose a statically named resource target.',
      targetExpression ?? call,
    ));
  }

  const definition = createNamedResourceDefinitionHeader(
    resourceKind,
    target == null ? null : new ResourceTargetObservation(target.localName, target.node, target.isDeclaration),
    name?.value ?? null,
    aliases?.value ?? [],
  );
  return new ResourceRecognitionObservation(
    ResourceCarrierKind.DefineCall,
    call,
    definitionExpression,
    definition,
    openSeams,
  );
}

function hasExplicitResourceCarrier(classNode: ts.ClassLikeDeclarationBase): boolean {
  const decorators = ts.canHaveDecorators(classNode)
    ? ts.getDecorators(classNode) ?? []
    : [];
  if (decorators.some((decorator) => {
    const calleeName = readDecoratorCalleeName(decorator);
    return calleeName != null && RESOURCE_DECORATOR_KIND.has(calleeName);
  })) {
    return true;
  }
  return readStaticAuInitializer(classNode) != null;
}

function isNestedInFunctionLike(node: ts.Node): boolean {
  let current = node.parent;
  while (current != null && !ts.isSourceFile(current)) {
    if (ts.isFunctionLike(current)) {
      return true;
    }
    current = current.parent;
  }
  return false;
}

function hasDeclareModifier(node: ts.Node): boolean {
  return ts.canHaveModifiers(node)
    ? ts.getModifiers(node)?.some((modifier) => modifier.kind === ts.SyntaxKind.DeclareKeyword) === true
    : false;
}

function matchesNamedKind(
  current: ResourceDefinitionKind,
  wanted: NamedResourceDefinitionKind | null,
): current is NamedResourceDefinitionKind {
  if (current === ResourceDefinitionKind.AttributePattern) {
    return false;
  }
  return wanted == null || current === wanted;
}
