import ts from 'typescript';
import { readClassTarget } from '../evaluation/expression-reader.js';
import { unwrapExpression } from '../evaluation/ts-syntax.js';
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
  ResourceOpenKind,
  ResourceTargetObservation,
} from './resource-observation.js';
import {
  ResourceDefinitionKind,
  type NamedResourceDefinitionKind,
} from './resource-kind.js';

/** Combined producer for named resources that are visible by markup or expression syntax names. */
export class NamedResourceRecognitionProducer {
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
      observations.push(...recognizeClassCarriers(context, node, resourceKind));
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
  ];
}

function recognizeDecorators(
  context: ResourceRecognitionContext,
  classNode: ts.ClassLikeDeclarationBase,
  wantedKind: NamedResourceDefinitionKind | null,
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
      : readResourceNameField(definitionExpression, context.expressionReader);
    const aliases = definitionExpression == null
      ? null
      : readResourceAliasesField(definitionExpression, context.expressionReader);
    const openSeams: ResourceRecognitionOpen[] = [];
    if (definitionExpression == null || name?.value == null) {
      openSeams.push(new ResourceRecognitionOpen(
        ResourceOpenKind.Name,
        `Decorator ${calleeName}(...) did not expose a static resource name.`,
        definitionExpression ?? decorator,
      ));
    }
    if (aliases?.openSummary != null && aliases.node != null) {
      openSeams.push(new ResourceRecognitionOpen(ResourceOpenKind.Alias, aliases.openSummary, aliases.node));
    }

    const target = readClassTarget(classNode);
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
              ResourceOpenKind.Kind,
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
      ResourceOpenKind.Name,
      name.openSummary ?? 'Static $au resource name did not close to a static string.',
      name.node ?? initializer,
    ));
  }
  if (aliases.openSummary != null && aliases.node != null) {
    openSeams.push(new ResourceRecognitionOpen(ResourceOpenKind.Alias, aliases.openSummary, aliases.node));
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
      ResourceOpenKind.Name,
      name?.openSummary ?? 'Define call did not expose a static resource name.',
      name?.node ?? definitionExpression ?? call,
    ));
  }
  if (aliases?.openSummary != null && aliases.node != null) {
    openSeams.push(new ResourceRecognitionOpen(ResourceOpenKind.Alias, aliases.openSummary, aliases.node));
  }
  if (target == null || target.localName == null) {
    openSeams.push(new ResourceRecognitionOpen(
      ResourceOpenKind.Target,
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

function matchesNamedKind(
  current: ResourceDefinitionKind,
  wanted: NamedResourceDefinitionKind | null,
): current is NamedResourceDefinitionKind {
  if (current === ResourceDefinitionKind.AttributePattern) {
    return false;
  }
  return wanted == null || current === wanted;
}
