import type {
  SemanticAttributeInterpretationExplanation,
  SemanticAttributeInterpretationExplanationContender,
  SemanticAttributeInterpretationExplanationResult,
  SemanticRuntimeAnswer,
} from "@aurelia-ls/semantic-runtime";
import { CodeActionKind, type CodeAction, type Position } from "vscode-languageserver/node";
import type { TextDocument } from "vscode-languageserver-textdocument";
import type {
  AttributeInterpretationExplanation,
  AttributeInterpretationExplanationAnswerTransport,
  AttributeInterpretationExplanationContender,
  AttributeInterpretationExplanationParams,
  AttributeInterpretationExplanationSubject,
} from "../protocol.js";
import { AureliaProtocolCommand } from "../protocol.js";
import {
  mapFrameworkCapabilityExplanationAnswer,
  mapFrameworkCapabilityExplanationAppQuery,
  mapFrameworkCapabilityExplanationSourceTarget,
  type FrameworkCapabilityExplanationMappingContext,
} from "./framework-capability-explanation.js";
import { codeActionKindMatchesOnly } from "./lsp-types.js";

export type AttributeInterpretationExplanationMappingContext =
  FrameworkCapabilityExplanationMappingContext;

/**
 * Project only an engine-selected Aurelia-shaped attribute. The command seed is
 * the exact authored name range; execution must query and re-prove it again.
 */
export function mapAttributeInterpretationExplanationCodeAction(
  answer: SemanticRuntimeAnswer<SemanticAttributeInterpretationExplanationResult>,
  originDocument: TextDocument,
  position: Position,
  only: readonly CodeActionKind[] | undefined,
  context: AttributeInterpretationExplanationMappingContext,
): CodeAction | null {
  if (!codeActionKindMatchesOnly(CodeActionKind.QuickFix, only)) return null;
  if (`${answer.result}` !== "answered" || `${answer.selection}` !== "exact") return null;
  const explanation = answer.value.explanation;
  if (explanation == null || explanation.conclusion.kind === "plain-attribute") return null;
  const subject = mapAttributeInterpretationExplanationSubject(explanation.subject, context);
  if (
    subject.nameSource.state !== "available"
    || !context.documentUris.sameDocument(subject.nameSource.location.uri, originDocument.uri)
    || !protocolPositionWithinRange(position, subject.nameSource.location.range)
    || answer.value.projectKey !== subject.projectKey
  ) {
    return null;
  }
  const range = subject.nameSource.location.range;
  const seed: AttributeInterpretationExplanationParams = {
    uri: originDocument.uri,
    position: range.start,
    range,
    documentVersion: originDocument.version,
    projectKey: subject.projectKey,
  };
  return {
    title: "Explain how Aurelia uses this attribute",
    kind: CodeActionKind.QuickFix,
    isPreferred: false,
    command: {
      title: "Explain how Aurelia uses this attribute",
      command: AureliaProtocolCommand.ExplainAttributeInterpretation,
      arguments: [seed],
    },
    data: {
      semanticRuntime: {
        queryKind: "attribute-interpretation-explanation",
        explanationSeed: seed,
      },
    },
  };
}

function protocolPositionWithinRange(
  position: Position,
  range: { readonly start: Position; readonly end: Position },
): boolean {
  return compareProtocolPositions(position, range.start) >= 0
    && compareProtocolPositions(position, range.end) <= 0;
}

function compareProtocolPositions(left: Position, right: Position): number {
  return left.line - right.line || left.character - right.character;
}

export function mapAttributeInterpretationExplanation(
  explanation: SemanticAttributeInterpretationExplanation,
  context: AttributeInterpretationExplanationMappingContext,
): AttributeInterpretationExplanation {
  return {
    ...explanation,
    subject: mapAttributeInterpretationExplanationSubject(explanation.subject, context),
    evidence: {
      syntax: {
        ...explanation.evidence.syntax,
        nameSource: mapFrameworkCapabilityExplanationSourceTarget(
          explanation.evidence.syntax.nameSource,
          context,
        ),
        targetSource: mapFrameworkCapabilityExplanationSourceTarget(
          explanation.evidence.syntax.targetSource,
          context,
        ),
        commandSource: mapFrameworkCapabilityExplanationSourceTarget(
          explanation.evidence.syntax.commandSource,
          context,
        ),
      },
      classification: explanation.evidence.classification,
      valueSites: explanation.evidence.valueSites.map((site) => ({
        ...site,
        source: mapFrameworkCapabilityExplanationSourceTarget(site.source, context),
      })),
      lowerings: explanation.evidence.lowerings.map((lowering) => ({
        ...lowering,
        source: mapFrameworkCapabilityExplanationSourceTarget(lowering.source, context),
      })),
      effects: explanation.evidence.effects.map((effect) => ({
        ...effect,
        source: mapFrameworkCapabilityExplanationSourceTarget(effect.source, context),
      })),
      issues: explanation.evidence.issues.map((issue) => ({
        ...issue,
        source: mapFrameworkCapabilityExplanationSourceTarget(issue.source, context),
        relatedSources: issue.relatedSources.map((source) =>
          mapFrameworkCapabilityExplanationSourceTarget(source, context)
        ),
      })),
      blockers: explanation.evidence.blockers.map((blocker) => ({
        ...blocker,
        sources: blocker.sources.map((source) =>
          mapFrameworkCapabilityExplanationSourceTarget(source, context)
        ),
      })),
    },
    nextSteps: explanation.nextSteps.map((step) => ({
      ...step,
      source: mapFrameworkCapabilityExplanationSourceTarget(step.source, context),
      targetQuery: step.targetQuery == null
        ? null
        : mapFrameworkCapabilityExplanationAppQuery(step.targetQuery, context),
    })),
  };
}

export function mapAttributeInterpretationExplanationAnswer(
  answer: SemanticRuntimeAnswer<unknown>,
  context: AttributeInterpretationExplanationMappingContext,
): AttributeInterpretationExplanationAnswerTransport {
  return mapFrameworkCapabilityExplanationAnswer(answer, context);
}

export function mapAttributeInterpretationExplanationContender(
  contender: SemanticAttributeInterpretationExplanationContender,
  context: AttributeInterpretationExplanationMappingContext,
): AttributeInterpretationExplanationContender {
  return {
    ...contender,
    subject: mapAttributeInterpretationExplanationSubject(contender.subject, context),
  };
}

export function mapAttributeInterpretationExplanationSubject(
  subject: SemanticAttributeInterpretationExplanation["subject"],
  context: AttributeInterpretationExplanationMappingContext,
): AttributeInterpretationExplanationSubject {
  return {
    ...subject,
    source: mapFrameworkCapabilityExplanationSourceTarget(subject.source, context),
    nameSource: mapFrameworkCapabilityExplanationSourceTarget(subject.nameSource, context),
    valueSource: mapFrameworkCapabilityExplanationSourceTarget(subject.valueSource, context),
    templateSource: mapFrameworkCapabilityExplanationSourceTarget(subject.templateSource, context),
  };
}
