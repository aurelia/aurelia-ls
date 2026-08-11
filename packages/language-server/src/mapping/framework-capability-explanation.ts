import {
  semanticExactSourceReference,
  SemanticObservedDependencyLocusKind,
  type SemanticAppQuery,
  type SemanticFrameworkCapabilityExplanation,
  type SemanticFrameworkCapabilityExplanationContender,
  type SemanticRuntimeAnswer,
  type SemanticRuntimeContinuationRow,
  type SemanticSourceReference,
} from "@aurelia-ls/semantic-runtime";
import { TextDocument } from "vscode-languageserver-textdocument";
import type {
  FrameworkCapabilityExplanation,
  FrameworkCapabilityExplanationAnswerTransport,
  FrameworkCapabilityExplanationAppQuery,
  FrameworkCapabilityExplanationContender,
  FrameworkCapabilityExplanationFileTarget,
  FrameworkCapabilityExplanationSourceTarget,
  FrameworkCapabilityExplanationSubject,
} from "../protocol.js";
import { languageIdForSource } from "../utils/document-kind.js";
import type { WorkspaceDocumentUris } from "../utils/document-uri.js";
import {
  semanticSourceRangeForDocument,
  semanticSourceReferenceUri,
} from "./source-locations.js";
import { mapRuntimeAnswer } from "./resource-discovery.js";

export interface FrameworkCapabilityExplanationMappingContext {
  readonly documentUris: WorkspaceDocumentUris;
  readonly lookupText: (uri: string) => string | null;
}

export function mapFrameworkCapabilityExplanation(
  explanation: SemanticFrameworkCapabilityExplanation,
  context: FrameworkCapabilityExplanationMappingContext,
): FrameworkCapabilityExplanation {
  return {
    ...explanation,
    subject: mapFrameworkCapabilityExplanationSubject(explanation.subject, context),
    evidence: {
      admission: {
        ...explanation.evidence.admission,
        sources: explanation.evidence.admission.sources.map((source) =>
          mapFrameworkCapabilityExplanationSourceTarget(source, context)
        ),
      },
      configuration: {
        ...explanation.evidence.configuration,
        sources: explanation.evidence.configuration.sources.map((source) =>
          mapFrameworkCapabilityExplanationSourceTarget(source, context)
        ),
      },
      package: {
        ...explanation.evidence.package,
        evidence: explanation.evidence.package.evidence.map((row) => ({
          evidenceKind: row.evidenceKind,
          packageName: row.packageName,
          moduleName: row.moduleName,
          scope: row.scope,
          source: mapFrameworkCapabilityExplanationSourceTarget(row.source, context),
        })),
      },
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

export function mapFrameworkCapabilityExplanationAnswer(
  answer: SemanticRuntimeAnswer<unknown>,
  context: FrameworkCapabilityExplanationMappingContext,
): FrameworkCapabilityExplanationAnswerTransport {
  const transport = mapRuntimeAnswer(answer);
  return {
    ...transport,
    continuations: answer.continuations?.map((continuation) =>
      mapFrameworkCapabilityExplanationContinuation(continuation, context)
    ),
  };
}

function mapFrameworkCapabilityExplanationContinuation(
  continuation: SemanticRuntimeContinuationRow,
  context: FrameworkCapabilityExplanationMappingContext,
) {
  return {
    ...continuation,
    targetQuery: continuation.targetQuery == null
      ? continuation.targetQuery
      : mapFrameworkCapabilityExplanationAppQuery(continuation.targetQuery, context),
    evidence: continuation.evidence == null
      ? null
      : {
          ...continuation.evidence,
          sourceFacts: continuation.evidence.sourceFacts.map((fact) => ({
            ...fact,
            source: mapFrameworkCapabilityExplanationSourceTarget(fact.source, context),
          })),
        },
  };
}

export function mapFrameworkCapabilityExplanationAppQuery(
  query: SemanticAppQuery,
  context: FrameworkCapabilityExplanationMappingContext,
): FrameworkCapabilityExplanationAppQuery {
  const { sourceFile, cursor, observedDependencyLocus, ...transport } = query;
  return {
    ...transport,
    ...(sourceFile === undefined
      ? {}
      : {
          sourceFile: sourceFile == null
            ? null
            : mapFrameworkCapabilityExplanationFileTarget(sourceFile.filePath, context),
        }),
    ...(cursor === undefined
      ? {}
      : {
          cursor: cursor == null
            ? null
            : {
                sourceFile: mapFrameworkCapabilityExplanationFileTarget(cursor.filePath, context),
                line: cursor.line,
                character: cursor.character,
                ...(cursor.offset === undefined ? {} : { offset: cursor.offset }),
              },
        }),
    ...(observedDependencyLocus === undefined
      ? {}
      : {
          observedDependencyLocus: observedDependencyLocus == null
            ? null
            : observedDependencyLocus.kind !== SemanticObservedDependencyLocusKind.SourceFile
              ? observedDependencyLocus
              : {
                  kind: observedDependencyLocus.kind,
                  sourceFile: mapFrameworkCapabilityExplanationFileTarget(
                    observedDependencyLocus.sourceFile.filePath,
                    context,
                  ),
                },
        }),
  };
}

function mapFrameworkCapabilityExplanationFileTarget(
  filePath: string,
  context: FrameworkCapabilityExplanationMappingContext,
): FrameworkCapabilityExplanationFileTarget {
  try {
    const uri = semanticSourceReferenceUri({
      kind: "source-file",
      label: filePath,
      path: filePath,
    }, context.documentUris);
    return uri == null
      ? { state: "unavailable", reason: "source-uri-unavailable" }
      : { state: "available", uri };
  } catch {
    return { state: "unavailable", reason: "source-uri-unavailable" };
  }
}

export function mapFrameworkCapabilityExplanationContender(
  contender: SemanticFrameworkCapabilityExplanationContender,
  context: FrameworkCapabilityExplanationMappingContext,
): FrameworkCapabilityExplanationContender {
  return {
    ...contender,
    subject: mapFrameworkCapabilityExplanationSubject(contender.subject, context),
  };
}

function mapFrameworkCapabilityExplanationSubject(
  subject: SemanticFrameworkCapabilityExplanation["subject"],
  context: FrameworkCapabilityExplanationMappingContext,
): FrameworkCapabilityExplanationSubject {
  return {
    ...subject,
    source: mapFrameworkCapabilityExplanationSourceTarget(subject.source, context),
    templateSource: mapFrameworkCapabilityExplanationSourceTarget(subject.templateSource, context),
  };
}

/** Preserve semantic absence separately from URI, text, and range projection failure. */
export function mapFrameworkCapabilityExplanationSourceTarget(
  source: SemanticSourceReference | null,
  context: FrameworkCapabilityExplanationMappingContext,
): FrameworkCapabilityExplanationSourceTarget {
  if (source == null) return { state: "absent" };
  const exact = semanticExactSourceReference(source);
  if (exact == null) return { state: "unavailable", reason: "source-range-unavailable" };
  let uri: string | null;
  try {
    uri = semanticSourceReferenceUri(exact, context.documentUris);
  } catch {
    return { state: "unavailable", reason: "source-uri-unavailable" };
  }
  if (uri == null) return { state: "unavailable", reason: "source-uri-unavailable" };
  let text: string | null;
  try {
    text = context.lookupText(uri);
  } catch {
    return { state: "unavailable", reason: "source-text-unavailable" };
  }
  if (text == null) return { state: "unavailable", reason: "source-text-unavailable" };
  let range: ReturnType<typeof semanticSourceRangeForDocument>;
  try {
    const document = TextDocument.create(uri, languageIdForSource(uri), 0, text);
    range = semanticSourceRangeForDocument(exact, document);
  } catch {
    return { state: "unavailable", reason: "source-range-unavailable" };
  }
  if (range == null) return { state: "unavailable", reason: "source-range-unavailable" };
  return {
    state: "available",
    location: { uri, range, label: exact.label },
  };
}
