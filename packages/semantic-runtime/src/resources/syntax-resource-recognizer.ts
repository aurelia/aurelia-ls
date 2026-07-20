import ts from 'typescript';
import { evaluationAbruptCompletionSummary } from '../evaluation/completion.js';
import {
  EvaluationTargetResolutionKind,
  readClassTarget,
} from '../evaluation/expression-reader.js';
import { KernelVocabulary } from '../kernel/vocabulary.js';
import type { ResourceRecognitionContext } from './resource-recognition-context.js';
import { AttributePatternDefinitionHeader } from './resource-definition.js';
import {
  readAttributePatternEntry,
  isAttributePatternCreateCall,
  readAttributePatternEntries,
  readDecoratorCalleeName,
  readEvaluatedExpressionTarget,
} from './resource-field-readers.js';
import {
  ResourceRecognitionObservation,
  ResourceRecognitionOpen,
  ResourceTargetObservation,
} from './resource-observation.js';
import { ResourceCarrierKind } from './resource-kind.js';

/** Combined recognizer for resources that alter syntax recognition rather than ordinary resource lookup alone. */
export class SyntaxResourceRecognizer {
  recognize(context: ResourceRecognitionContext): readonly ResourceRecognitionObservation[] {
    return recognizeAttributePatterns(context);
  }
}

function recognizeAttributePatterns(
  context: ResourceRecognitionContext,
): readonly ResourceRecognitionObservation[] {
  const reachedCalls = new Set(context.evaluation.invocations.map((invocation) => invocation.node).filter(ts.isCallExpression));
  const observations: ResourceRecognitionObservation[] = [];
  const visit = (node: ts.Node): void => {
    if (ts.isClassDeclaration(node) || ts.isClassExpression(node)) {
      observations.push(...recognizeAttributePatternDecorators(context, node));
    }
    if (ts.isCallExpression(node) && reachedCalls.has(node) && isAttributePatternCreateCall(node)) {
      observations.push(recognizeAttributePatternCreate(context, node));
    }
    ts.forEachChild(node, visit);
  };

  visit(context.sourceFile);
  return observations;
}

function recognizeAttributePatternDecorators(
  context: ResourceRecognitionContext,
  classNode: ts.ClassLikeDeclarationBase,
): readonly ResourceRecognitionObservation[] {
  const decorators = ts.canHaveDecorators(classNode)
    ? ts.getDecorators(classNode) ?? []
    : [];
  const observations: ResourceRecognitionObservation[] = [];

  for (const decorator of decorators) {
    if (readDecoratorCalleeName(decorator) !== 'attributePattern') {
      continue;
    }
    const expression = decorator.expression;
    const call = ts.isCallExpression(expression) ? expression : null;
    const target = readClassTarget(classNode);
    const patternReads = call == null
      ? []
      : call.arguments.map((argument) => readAttributePatternEntry(argument, context.expressionReader));
    const patterns = patternReads.flatMap((read) => read.value == null ? [] : [read.value]);
    const openSeams: ResourceRecognitionOpen[] = [];

    if (call == null || call.arguments.length === 0) {
      openSeams.push(new ResourceRecognitionOpen(
        KernelVocabulary.Resource.OpenPatternExpression.key,
        'Attribute pattern decorator did not expose only static pattern entries.',
        call ?? decorator,
        [],
      ));
    }
    patternReads.forEach((read, index) => {
      if (read.value != null && read.openSummary == null) {
        return;
      }
      openSeams.push(new ResourceRecognitionOpen(
        KernelVocabulary.Resource.OpenPatternExpression.key,
        read.openSummary ?? 'Attribute pattern decorator entry did not close.',
        read.node ?? call?.arguments[index] ?? decorator,
        read.openReasonKinds,
      ));
    });

    const definition = new AttributePatternDefinitionHeader(
      new ResourceTargetObservation(target.localName, target.node, target.declarationNode),
      patterns,
    );
    observations.push(new ResourceRecognitionObservation(
      ResourceCarrierKind.Decorator,
      decorator,
      call?.arguments[0] ?? null,
      definition,
      openSeams,
    ));
  }

  return observations;
}

function recognizeAttributePatternCreate(
  context: ResourceRecognitionContext,
  call: ts.CallExpression,
): ResourceRecognitionObservation {
  const patternExpression = call.arguments[0] ?? null;
  const targetExpression = call.arguments[1] ?? null;
  const patterns = patternExpression == null
    ? null
    : readAttributePatternEntries(patternExpression, context.expressionReader);
  const target = targetExpression == null
    ? null
    : readEvaluatedExpressionTarget(targetExpression, context.expressionReader);
  const openSeams: ResourceRecognitionOpen[] = [];

  if (patternExpression == null || patterns == null || patterns.value == null || patterns.value.length === 0) {
    openSeams.push(new ResourceRecognitionOpen(
      KernelVocabulary.Resource.OpenPatternExpression.key,
      patterns?.openSummary ?? 'AttributePattern.create(...) did not expose static pattern entries.',
      patterns?.node ?? patternExpression ?? call,
      patterns?.openReasonKinds ?? [],
    ));
  } else if (patterns.openSummary != null) {
    openSeams.push(new ResourceRecognitionOpen(
      KernelVocabulary.Resource.OpenPatternExpression.key,
      patterns.openSummary,
      patterns.node ?? patternExpression,
      patterns.openReasonKinds,
    ));
  }

  if (
    target == null
    || target.resolutionKind !== EvaluationTargetResolutionKind.ResolvedDeclaration
    || target.localName == null
  ) {
    openSeams.push(new ResourceRecognitionOpen(
      KernelVocabulary.Resource.OpenTargetExpression.key,
      'AttributePattern.create(...) did not expose a statically named pattern target.',
      targetExpression ?? call,
      target?.openReasonKinds ?? [],
    ));
  } else if (target.openReasonKinds.length > 0) {
    const details = [
      ...target.openSeams.map((seam) => seam.summary),
      ...(target.abruptCompletion == null ? [] : [evaluationAbruptCompletionSummary(target.abruptCompletion)]),
    ];
    openSeams.push(new ResourceRecognitionOpen(
      KernelVocabulary.Resource.OpenTargetExpression.key,
      `AttributePattern.create(...) target evaluation remained open. ${details.join(' ')}`.trim(),
      target.node,
      target.openReasonKinds,
    ));
  }

  const definition = new AttributePatternDefinitionHeader(
    target?.resolutionKind === EvaluationTargetResolutionKind.ResolvedDeclaration
      ? new ResourceTargetObservation(target.localName, target.node, target.declarationNode)
      : null,
    patterns?.value ?? [],
  );
  return new ResourceRecognitionObservation(
    ResourceCarrierKind.AttributePatternCreate,
    call,
    patternExpression,
    definition,
    openSeams,
  );
}
