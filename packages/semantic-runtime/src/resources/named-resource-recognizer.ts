import ts from 'typescript';
import { evaluationAbruptCompletionSummary } from '../evaluation/completion.js';
import {
  EvaluationTargetResolutionKind,
  EvaluationTargetRead,
  readClassTarget,
  StaticEvaluationExpressionReader,
} from '../evaluation/expression-reader.js';
import { ModuleEnvironmentRecord } from '../evaluation/environment.js';
import { unwrapExpression } from '../evaluation/ts-syntax.js';
import { EvaluationValueKind } from '../evaluation/values.js';
import { OpenSeamReasonKind } from '../kernel/open-seam.js';
import { KernelVocabulary } from '../kernel/vocabulary.js';
import {
  readConventionalTemplateAdmission,
  readResourceNameConvention,
} from './resource-convention.js';
import type { ResourceRecognitionContext } from './resource-recognition-context.js';
import {
  type NamedResourceDefinitionHeader,
} from './resource-definition.js';
import { createNamedResourceDefinitionHeader } from './named-resource-kind.js';
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
  ResourceRecognitionObservation,
  ResourceRecognitionOpen,
  ResourceTargetObservation,
  resourceTargetClassLikeNode,
} from './resource-observation.js';
import {
  ResourceCarrierKind,
  ResourceDefinitionKind,
  type NamedResourceDefinitionKind,
} from './resource-kind.js';

/** Combined recognizer for named resources that are visible by markup or expression syntax names. */
export class NamedResourceRecognizer {
  recognize(context: ResourceRecognitionContext): readonly ResourceRecognitionObservation[] {
    return recognizeNamedResources(context, null);
  }
}

interface NamedResourceDefinitionRead {
  readonly definition: NamedResourceDefinitionHeader;
  readonly openSeams: readonly ResourceRecognitionOpen[];
}

function recognizeNamedResources(
  context: ResourceRecognitionContext,
  resourceKind: NamedResourceDefinitionKind | null,
): readonly ResourceRecognitionObservation[] {
  const reachedCalls = new Set(context.evaluation.invocations.map((invocation) => invocation.node).filter(ts.isCallExpression));
  const defineCallTargets = collectDefineCallTargets(context, resourceKind, reachedCalls);
  const observations: ResourceRecognitionObservation[] = [];
  const visit = (node: ts.Node): void => {
    if (ts.isClassDeclaration(node) || ts.isClassExpression(node)) {
      if (!isNestedInFunctionLike(node)) {
        observations.push(...recognizeClassCarriers(context, node, resourceKind, defineCallTargets));
      }
    }
    if (ts.isCallExpression(node) && reachedCalls.has(node)) {
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

function collectDefineCallTargets(
  context: ResourceRecognitionContext,
  wantedKind: NamedResourceDefinitionKind | null,
  reachedCalls: ReadonlySet<ts.CallExpression>,
): ReadonlySet<ts.ClassLikeDeclarationBase> {
  const targets = new Set<ts.ClassLikeDeclarationBase>();
  const visit = (node: ts.Node): void => {
    if (ts.isCallExpression(node) && reachedCalls.has(node)) {
      const target = readDefineCallTargetClass(context, node, wantedKind);
      if (target != null) {
        targets.add(target);
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(context.sourceFile);
  return targets;
}

function recognizeClassCarriers(
  context: ResourceRecognitionContext,
  classNode: ts.ClassLikeDeclarationBase,
  wantedKind: NamedResourceDefinitionKind | null,
  defineCallTargets: ReadonlySet<ts.ClassLikeDeclarationBase>,
): readonly ResourceRecognitionObservation[] {
  return [
    ...recognizeDecorators(context, classNode, wantedKind),
    ...recognizeStaticAu(context, classNode, wantedKind),
    ...recognizeConventions(context, classNode, wantedKind, defineCallTargets),
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
  const target = targetOverride ?? readClassTarget(classNode);
  return decorators.flatMap((decorator) => {
    const read = readDecoratorResource(decorator, wantedKind, expressionReader, target);
    return read == null ? [] : [read];
  });
}

function readDecoratorResource(
  decorator: ts.Decorator,
  wantedKind: NamedResourceDefinitionKind | null,
  expressionReader: StaticEvaluationExpressionReader,
  target: EvaluationTargetRead,
): ResourceRecognitionObservation | null {
  const calleeName = readDecoratorCalleeName(decorator);
  const resourceKind = resourceKindForDecorator(calleeName, wantedKind);
  if (resourceKind == null) {
    return null;
  }
  const definitionExpression = decoratorDefinitionExpression(decorator);
  const read = readNamedResourceDefinition(
    resourceKind,
    new ResourceTargetObservation(target.localName, target.node, target.declarationNode),
    definitionExpression,
    expressionReader,
    decorator,
    `Decorator ${calleeName}(...) did not expose a static resource name.`,
  );
  const openSeams = [...read.openSeams];
  appendTargetReadOpen(
    openSeams,
    target,
    `Decorator ${calleeName}(...) target evaluation remained open.`,
  );
  return new ResourceRecognitionObservation(
    ResourceCarrierKind.Decorator,
    decorator,
    definitionExpression,
    read.definition,
    openSeams,
  );
}

function resourceKindForDecorator(
  calleeName: string | null,
  wantedKind: NamedResourceDefinitionKind | null,
): NamedResourceDefinitionKind | null {
  const resourceKind = calleeName == null
    ? null
    : RESOURCE_DECORATOR_KIND.get(calleeName) ?? null;
  return resourceKind == null
    || resourceKind === ResourceDefinitionKind.AttributePattern
    || !matchesNamedKind(resourceKind, wantedKind)
    ? null
    : resourceKind;
}

function decoratorDefinitionExpression(decorator: ts.Decorator): ts.Expression | null {
  const expression = unwrapExpression(decorator.expression);
  return ts.isCallExpression(expression)
    ? expression.arguments[0] ?? null
    : null;
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
      new EvaluationTargetRead(
        EvaluationTargetResolutionKind.ResolvedDeclaration,
        binding.name,
        binding.declaration.name,
        binding.declaration,
      ),
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
  const templateControllerRead = resourceKind === ResourceDefinitionKind.CustomAttribute
    ? readTemplateControllerFlag(initializer, context.expressionReader)
    : null;
  if (
    resourceKind === ResourceDefinitionKind.CustomAttribute
    && templateControllerRead?.value === true
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
              kindRead.openReasonKinds,
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

  const read = readNamedResourceDefinition(
    resourceKind,
    new ResourceTargetObservation(target.localName, target.node, target.declarationNode),
    initializer,
    context.expressionReader,
    initializer,
    'Static $au resource name did not close to a static string.',
  );
  const openSeams = [...read.openSeams];
  if (kindRead.openSummary != null) {
    openSeams.push(new ResourceRecognitionOpen(
      KernelVocabulary.Resource.OpenKindExpression.key,
      kindRead.openSummary,
      kindRead.node ?? initializer,
      kindRead.openReasonKinds,
    ));
  }
  if (templateControllerRead?.openSummary != null) {
    openSeams.push(new ResourceRecognitionOpen(
      KernelVocabulary.Resource.OpenKindExpression.key,
      templateControllerRead.openSummary,
      templateControllerRead.node ?? initializer,
      templateControllerRead.openReasonKinds,
    ));
  }
  return [
    new ResourceRecognitionObservation(
      ResourceCarrierKind.StaticAu,
      initializer,
      initializer,
      read.definition,
      openSeams,
    ),
  ];
}

function recognizeConventions(
  context: ResourceRecognitionContext,
  classNode: ts.ClassLikeDeclarationBase,
  wantedKind: NamedResourceDefinitionKind | null,
  defineCallTargets: ReadonlySet<ts.ClassLikeDeclarationBase>,
): readonly ResourceRecognitionObservation[] {
  if (context.conventionTransformEvidenceHandles.length === 0) {
    return [];
  }
  if (!ts.isClassDeclaration(classNode) || classNode.name == null || hasDeclareModifier(classNode)) {
    return [];
  }
  if (hasExplicitResourceCarrier(classNode) || defineCallTargets.has(classNode)) {
    return [];
  }

  const convention = readResourceNameConvention(classNode.name.text);
  if (
    convention == null
    || !matchesNamedKind(convention.resourceKind, wantedKind)
  ) {
    return [];
  }
  const templateAdmission = convention.resourceKind === ResourceDefinitionKind.CustomElement
    ? readConventionalTemplateAdmission(context, classNode)
    : null;
  if (convention.resourceKind === ResourceDefinitionKind.CustomElement && templateAdmission == null) {
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
        new ResourceTargetObservation(target.localName, target.node, target.declarationNode),
        convention.name,
        [],
      ),
      [],
      [
        ...context.conventionTransformEvidenceHandles,
        ...(templateAdmission == null ? [] : [templateAdmission.evidenceHandle]),
      ],
    ),
  ];
}

function readDefineCallTargetClass(
  context: ResourceRecognitionContext,
  call: ts.CallExpression,
  wantedKind: NamedResourceDefinitionKind | null,
): ts.ClassLikeDeclarationBase | null {
  const resourceKind = readDefineCallResourceKind(context, call).value;
  if (
    resourceKind == null
    || resourceKind === ResourceDefinitionKind.AttributePattern
    || !matchesNamedKind(resourceKind, wantedKind)
  ) {
    return null;
  }
  const targetExpression = call.arguments[1] ?? null;
  if (targetExpression == null) {
    return null;
  }
  return resourceTargetClassLikeNode(readEvaluatedExpressionTarget(targetExpression, context.expressionReader));
}

function recognizeDefineCall(
  context: ResourceRecognitionContext,
  call: ts.CallExpression,
  wantedKind: NamedResourceDefinitionKind | null,
): ResourceRecognitionObservation | null {
  const resourceKindRead = readDefineCallResourceKind(context, call);
  const resourceKind = resourceKindRead.value;
  if (
    resourceKind == null
    || resourceKind === ResourceDefinitionKind.AttributePattern
    || !matchesNamedKind(resourceKind, wantedKind)
  ) {
    return null;
  }

  const definitionExpression = call.arguments[0] ?? null;
  const targetExpression = call.arguments[1] ?? null;
  const targetRead = targetExpression == null
    ? null
    : readEvaluatedExpressionTarget(targetExpression, context.expressionReader);
  const target = targetRead == null
    ? generatedDefineCallTarget(call, resourceKind)
    : resourceTargetObservation(targetRead);
  const read = readNamedResourceDefinition(
    resourceKind,
    target,
    definitionExpression,
    context.expressionReader,
    call,
    'Define call did not expose a static resource name.',
  );
  const openSeams: ResourceRecognitionOpen[] = [
    ...read.openSeams,
    ...(resourceKindRead.open == null ? [] : [resourceKindRead.open]),
  ];
  if (target == null || target.localName == null) {
    openSeams.push(new ResourceRecognitionOpen(
      KernelVocabulary.Resource.OpenTargetExpression.key,
      'Define call did not expose a statically named resource target.',
      targetExpression ?? call,
      targetRead?.openReasonKinds.length
        ? targetRead.openReasonKinds
        : [OpenSeamReasonKind.ResourceDefinitionTargetOpen],
    ));
  } else if (targetRead != null) {
    appendTargetReadOpen(openSeams, targetRead, 'Define-call target evaluation remained open.');
  }

  return new ResourceRecognitionObservation(
    ResourceCarrierKind.DefineCall,
    call,
    definitionExpression,
    read.definition,
    openSeams,
  );
}

function generatedDefineCallTarget(
  call: ts.CallExpression,
  resourceKind: NamedResourceDefinitionKind,
): ResourceTargetObservation | null {
  if (resourceKind !== ResourceDefinitionKind.CustomElement) {
    return null;
  }

  let carrier: ts.Node = call;
  while (
    carrier.parent != null
    && (
      ts.isAsExpression(carrier.parent)
      || ts.isTypeAssertionExpression(carrier.parent)
      || ts.isParenthesizedExpression(carrier.parent)
      || ts.isNonNullExpression(carrier.parent)
      || ts.isSatisfiesExpression(carrier.parent)
    )
  ) {
    carrier = carrier.parent;
  }
  const declaration = carrier.parent;
  return declaration != null
    && ts.isVariableDeclaration(declaration)
    && declaration.initializer === carrier
    && ts.isIdentifier(declaration.name)
    ? new ResourceTargetObservation(declaration.name.text, declaration.name, declaration)
    : new ResourceTargetObservation(null, call, null);
}

function resourceTargetObservation(
  target: ReturnType<typeof readEvaluatedExpressionTarget>,
): ResourceTargetObservation | null {
  return target == null || target.resolutionKind !== EvaluationTargetResolutionKind.ResolvedDeclaration
    ? null
    : new ResourceTargetObservation(target.localName, target.node, target.declarationNode);
}

interface DefineCallResourceKindRead {
  readonly value: ResourceDefinitionKind | null;
  readonly open: ResourceRecognitionOpen | null;
}

function readDefineCallResourceKind(
  context: ResourceRecognitionContext,
  call: ts.CallExpression,
): DefineCallResourceKindRead {
  const resourceKind = readDefineCallKind(call);
  if (resourceKind !== ResourceDefinitionKind.CustomAttribute) {
    return { value: resourceKind, open: null };
  }
  const flag = readTemplateControllerFlag(call.arguments[0] ?? call, context.expressionReader);
  return {
    value: flag.value === true ? ResourceDefinitionKind.TemplateController : resourceKind,
    open: flag.openSummary == null
      ? null
      : new ResourceRecognitionOpen(
          KernelVocabulary.Resource.OpenKindExpression.key,
          flag.openSummary,
          flag.node ?? call.arguments[0] ?? call,
          flag.openReasonKinds,
        ),
  };
}

function readNamedResourceDefinition(
  resourceKind: NamedResourceDefinitionKind,
  target: ResourceTargetObservation | null,
  definitionExpression: ts.Expression | null,
  expressionReader: StaticEvaluationExpressionReader,
  carrierNode: ts.Node,
  missingNameSummary: string,
): NamedResourceDefinitionRead {
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
      name?.openSummary ?? missingNameSummary,
      name?.node ?? definitionExpression ?? carrierNode,
      name?.openReasonKinds ?? [],
    ));
  } else if (name.openSummary != null) {
    openSeams.push(new ResourceRecognitionOpen(
      KernelVocabulary.Resource.OpenNameExpression.key,
      name.openSummary,
      name.node ?? definitionExpression,
      name.openReasonKinds,
    ));
  }
  if (aliases?.openSummary != null && aliases.node != null) {
    openSeams.push(new ResourceRecognitionOpen(
      KernelVocabulary.Resource.OpenAliasExpression.key,
      aliases.openSummary,
      aliases.node,
      aliases.openReasonKinds,
    ));
  }

  return {
    definition: createNamedResourceDefinitionHeader(
      resourceKind,
      target,
      name?.value ?? null,
      aliases?.value ?? [],
      name?.valueNode ?? null,
    ),
    openSeams,
  };
}

function appendTargetReadOpen(
  openSeams: ResourceRecognitionOpen[],
  target: EvaluationTargetRead,
  summary: string,
): void {
  const reasonKinds = target.openReasonKinds;
  if (reasonKinds.length === 0) {
    return;
  }
  const details = [
    ...target.openSeams.map((seam) => seam.summary),
    ...(target.abruptCompletion == null ? [] : [evaluationAbruptCompletionSummary(target.abruptCompletion)]),
  ];
  openSeams.push(new ResourceRecognitionOpen(
    KernelVocabulary.Resource.OpenTargetExpression.key,
    details.length === 0 ? summary : `${summary} ${details.join(' ')}`,
    target.node,
    reasonKinds,
  ));
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
