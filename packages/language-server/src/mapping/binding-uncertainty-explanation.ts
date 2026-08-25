import type {
  SemanticBindingDataFlowRow,
  SemanticBindingUncertaintyExplanation,
  SemanticBindingUncertaintyExplanationContender,
  SemanticBindingUncertaintyExplanationResult,
  SemanticRuntimeAnswer,
  SemanticSourceReference,
} from "@aurelia-ls/semantic-runtime";
import {
  CodeActionKind,
  type CodeAction,
  type Position,
} from "vscode-languageserver/node";
import type { TextDocument } from "vscode-languageserver-textdocument";
import type {
  BindingUncertaintyExplanationParams,
  BindingUncertaintyExplanation,
  BindingUncertaintyExplanationAnswerTransport,
  BindingUncertaintyExplanationContender,
  BindingUncertaintyExplanationLane,
  BindingUncertaintyExplanationSourceTarget,
  BindingUncertaintyExplanationSubject,
} from "../protocol.js";
import { AureliaProtocolCommand } from "../protocol.js";
import {
  mapFrameworkCapabilityExplanationAnswer,
  mapFrameworkCapabilityExplanationAppQuery,
  mapFrameworkCapabilityExplanationSourceTarget,
  type FrameworkCapabilityExplanationMappingContext,
} from "./framework-capability-explanation.js";
import { codeActionKindMatchesOnly } from "./lsp-types.js";

export type BindingUncertaintyExplanationMappingContext =
  FrameworkCapabilityExplanationMappingContext;

/** Preserve semantic absence separately from URI, text, and range projection failure. */
export function mapBindingUncertaintyExplanationSourceTarget(
  source: SemanticSourceReference | null,
  context: BindingUncertaintyExplanationMappingContext,
): BindingUncertaintyExplanationSourceTarget {
  return mapFrameworkCapabilityExplanationSourceTarget(source, context);
}

/**
 * Project one current, exact, materially uncertain binding into an invoked-only
 * command affordance. The command seed contains no semantic conclusion; command
 * execution must query the engine again and re-prove the exact binding carrier.
 */
export function mapBindingUncertaintyExplanationCodeAction(
  answer: SemanticRuntimeAnswer<SemanticBindingUncertaintyExplanationResult>,
  originDocument: TextDocument,
  position: Position,
  only: readonly CodeActionKind[] | undefined,
  context: BindingUncertaintyExplanationMappingContext,
): CodeAction | null {
  if (!codeActionKindMatchesOnly(CodeActionKind.QuickFix, only)) return null;
  if (`${answer.result}` !== "answered" || `${answer.selection}` !== "exact") return null;
  const semanticExplanation = answer.value.explanation;
  if (semanticExplanation == null || !bindingUncertaintyIsMaterial(semanticExplanation)) return null;
  const subject = mapBindingUncertaintyExplanationSubject(semanticExplanation.subject, context);
  const source = subject.source;
  if (
    source.state !== "available"
    || !context.documentUris.sameDocument(source.location.uri, originDocument.uri)
    || !protocolPositionWithinRange(position, source.location.range)
    || answer.value.projectKey !== subject.projectKey
  ) {
    return null;
  }
  const seed: BindingUncertaintyExplanationParams = {
    uri: originDocument.uri,
    position,
    range: source.location.range,
    documentVersion: originDocument.version,
    projectKey: subject.projectKey,
  };
  return {
    title: "Explain this Aurelia binding",
    kind: CodeActionKind.QuickFix,
    isPreferred: false,
    command: {
      title: "Explain Aurelia binding",
      command: AureliaProtocolCommand.ExplainBindingUncertainty,
      arguments: [seed],
    },
    data: {
      semanticRuntime: {
        queryKind: "binding-uncertainty-explanation",
        explanationSeed: seed,
      },
    },
  };
}

export function mapBindingUncertaintyExplanation(
  explanation: SemanticBindingUncertaintyExplanation,
  context: BindingUncertaintyExplanationMappingContext,
): BindingUncertaintyExplanation {
  return {
    ...explanation,
    subject: mapBindingUncertaintyExplanationSubject(explanation.subject, context),
    evidence: {
      lanes: explanation.evidence.lanes.map((lane) =>
        mapBindingUncertaintyExplanationLane(lane, context)
      ),
      blockers: explanation.evidence.blockers.map((blocker) => ({
        ...blocker,
        sources: blocker.sources.map((source) =>
          mapBindingUncertaintyExplanationSourceTarget(source, context)
        ),
      })),
    },
    nextSteps: explanation.nextSteps.map((step) => ({
      ...step,
      source: mapBindingUncertaintyExplanationSourceTarget(step.source, context),
      targetQuery: step.targetQuery == null
        ? null
        : mapFrameworkCapabilityExplanationAppQuery(step.targetQuery, context),
    })),
  };
}

export function mapBindingUncertaintyExplanationAnswer(
  answer: SemanticRuntimeAnswer<unknown>,
  context: BindingUncertaintyExplanationMappingContext,
): BindingUncertaintyExplanationAnswerTransport {
  return mapFrameworkCapabilityExplanationAnswer(answer, context);
}

export function mapBindingUncertaintyExplanationContender(
  contender: SemanticBindingUncertaintyExplanationContender,
  context: BindingUncertaintyExplanationMappingContext,
): BindingUncertaintyExplanationContender {
  return {
    ...contender,
    subject: mapBindingUncertaintyExplanationSubject(contender.subject, context),
  };
}

export function mapBindingUncertaintyExplanationSubject(
  subject: SemanticBindingUncertaintyExplanation["subject"],
  context: BindingUncertaintyExplanationMappingContext,
): BindingUncertaintyExplanationSubject {
  return {
    ...subject,
    source: mapBindingUncertaintyExplanationSourceTarget(subject.source, context),
    expressionSource: mapBindingUncertaintyExplanationSourceTarget(subject.expressionSource, context),
    templateSource: mapBindingUncertaintyExplanationSourceTarget(subject.templateSource, context),
  };
}

function mapBindingUncertaintyExplanationLane(
  lane: SemanticBindingDataFlowRow,
  context: BindingUncertaintyExplanationMappingContext,
): BindingUncertaintyExplanationLane {
  const { handles: _handles, valueConverterWritebackStages, ...transport } = lane;
  return {
    ...transport,
    sourceAssignmentOccurrenceSource: mapBindingUncertaintyExplanationSourceTarget(
      lane.sourceAssignmentOccurrenceSource,
      context,
    ),
    sourceAssignmentTargetSource: mapBindingUncertaintyExplanationSourceTarget(
      lane.sourceAssignmentTargetSource,
      context,
    ),
    valueConverterWritebackStages: valueConverterWritebackStages.map((stage) => {
      const { handles: _stageHandles, ...stageTransport } = stage;
      return {
        ...stageTransport,
        inputTypeSource: mapBindingUncertaintyExplanationSourceTarget(stage.inputTypeSource, context),
        outputTypeSource: mapBindingUncertaintyExplanationSourceTarget(stage.outputTypeSource, context),
        source: mapBindingUncertaintyExplanationSourceTarget(stage.source, context),
      };
    }),
    expressionSource: mapBindingUncertaintyExplanationSourceTarget(lane.expressionSource, context),
    source: mapBindingUncertaintyExplanationSourceTarget(lane.source, context),
  };
}

function bindingUncertaintyIsMaterial(
  explanation: SemanticBindingUncertaintyExplanation,
): boolean {
  return explanation.uncertainty.state !== "closed"
    || explanation.conclusion.kind !== "flow-proved";
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
