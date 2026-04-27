import ts from 'typescript';
import { readClassTarget } from '../evaluation/expression-reader.js';
import type { ResourceRecognitionContext } from './resource-recognition-context.js';
import { RecognizedAttributePatternDefinition } from './resource-definition.js';
import {
  readAttributePatternEntry,
  isAttributePatternCreateCall,
  readAttributePatternEntries,
  readDecoratorCalleeName,
  readEvaluatedExpressionTarget,
} from './resource-field-readers.js';
import {
  ResourceCarrierKind,
  ResourceRecognitionObservation,
  ResourceRecognitionOpen,
  ResourceOpenKind,
  ResourceTargetObservation,
} from './resource-observation.js';

/** Combined producer for resources that alter syntax recognition rather than ordinary resource lookup alone. */
export class SyntaxResourceRecognitionProducer {
  recognize(context: ResourceRecognitionContext): readonly ResourceRecognitionObservation[] {
    return recognizeAttributePatterns(context);
  }
}

function recognizeAttributePatterns(
  context: ResourceRecognitionContext,
): readonly ResourceRecognitionObservation[] {
  const observations: ResourceRecognitionObservation[] = [];
  const visit = (node: ts.Node): void => {
    if (ts.isClassDeclaration(node) || ts.isClassExpression(node)) {
      observations.push(...recognizeAttributePatternDecorators(context, node));
    }
    if (ts.isCallExpression(node) && isAttributePatternCreateCall(node)) {
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
    const patterns = call == null
      ? []
      : call.arguments.flatMap((argument) => {
        const read = readAttributePatternEntry(argument, context.expressionReader);
        return read.value == null ? [] : [read.value];
      });
    const openSeams: ResourceRecognitionOpen[] = [];

    if (call == null || call.arguments.length === 0 || patterns.length !== call.arguments.length) {
      openSeams.push(new ResourceRecognitionOpen(
        ResourceOpenKind.Pattern,
        'Attribute pattern decorator did not expose only static pattern entries.',
        call ?? decorator,
      ));
    }

    const definition = new RecognizedAttributePatternDefinition(
      new ResourceTargetObservation(target.localName, target.node, target.isDeclaration),
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
      ResourceOpenKind.Pattern,
      patterns?.openSummary ?? 'AttributePattern.create(...) did not expose static pattern entries.',
      patterns?.node ?? patternExpression ?? call,
    ));
  } else if (patterns.openSummary != null) {
    openSeams.push(new ResourceRecognitionOpen(ResourceOpenKind.Pattern, patterns.openSummary, patterns.node ?? patternExpression));
  }

  if (target == null || target.localName == null) {
    openSeams.push(new ResourceRecognitionOpen(
      ResourceOpenKind.Target,
      'AttributePattern.create(...) did not expose a statically named pattern target.',
      targetExpression ?? call,
    ));
  }

  const definition = new RecognizedAttributePatternDefinition(
    target == null ? null : new ResourceTargetObservation(target.localName, target.node, target.isDeclaration),
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
