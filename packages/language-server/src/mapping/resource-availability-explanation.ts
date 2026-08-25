import type {
  SemanticResourceAvailabilityExplanation,
  SemanticResourceAvailabilityExplanationContender,
  SemanticRuntimeAnswer,
} from "@aurelia-ls/semantic-runtime";
import type {
  ResourceAvailabilityExplanation,
  ResourceAvailabilityExplanationAnswerTransport,
  ResourceAvailabilityExplanationContender,
  ResourceAvailabilityExplanationSubject,
} from "../protocol.js";
import {
  mapFrameworkCapabilityExplanationAnswer,
  mapFrameworkCapabilityExplanationAppQuery,
  mapFrameworkCapabilityExplanationSourceTarget,
  type FrameworkCapabilityExplanationMappingContext,
} from "./framework-capability-explanation.js";
import {
  mapResourceInventoryItem,
  mapTemplateResourceScopeCandidate,
} from "./resource-discovery.js";

export type ResourceAvailabilityExplanationMappingContext =
  FrameworkCapabilityExplanationMappingContext;

export function mapResourceAvailabilityExplanation(
  explanation: SemanticResourceAvailabilityExplanation,
  context: ResourceAvailabilityExplanationMappingContext,
): ResourceAvailabilityExplanation {
  return {
    subject: mapResourceAvailabilityExplanationSubject(explanation.subject, context),
    conclusion: {
      kind: explanation.conclusion.kind,
      title: explanation.conclusion.title,
      explanation: explanation.conclusion.explanation,
      action: explanation.conclusion.action,
    },
    evidence: {
      effectiveResource: explanation.evidence.effectiveResource == null
        ? null
        : mapResourceInventoryItem(explanation.evidence.effectiveResource, context),
      availabilitySource: mapFrameworkCapabilityExplanationSourceTarget(
        explanation.evidence.availabilitySource,
        context,
      ),
      exclusion: explanation.evidence.exclusion == null
        ? null
        : {
            reason: explanation.evidence.exclusion.reason,
            lookupKeys: explanation.evidence.exclusion.lookupKeys,
            contenderLane: explanation.evidence.exclusion.contenderLane,
            contenderSource: mapFrameworkCapabilityExplanationSourceTarget(
              explanation.evidence.exclusion.contenderSource,
              context,
            ),
            winnerSource: mapFrameworkCapabilityExplanationSourceTarget(
              explanation.evidence.exclusion.winnerSource,
              context,
            ),
          },
      configuration: {
        state: explanation.evidence.configuration.state,
        requiredCapability: explanation.evidence.configuration.requiredCapability,
        sources: explanation.evidence.configuration.sources.map((source) =>
          mapFrameworkCapabilityExplanationSourceTarget(source, context)
        ),
      },
      blockers: explanation.evidence.blockers.map((blocker) => ({
        kind: blocker.kind,
        seamKindKey: blocker.seamKindKey,
        summary: blocker.summary,
        reasonKinds: blocker.reasonKinds,
        boundaryKinds: blocker.boundaryKinds,
        sources: blocker.sources.map((source) =>
          mapFrameworkCapabilityExplanationSourceTarget(source, context)
        ),
      })),
    },
    uncertainty: {
      state: explanation.uncertainty.state,
      reasons: explanation.uncertainty.reasons,
      explanation: explanation.uncertainty.explanation,
    },
    currentness: {
      authority: explanation.currentness.authority,
      explanation: explanation.currentness.explanation,
    },
    nextSteps: explanation.nextSteps.map((step) => ({
      kind: step.kind,
      label: step.label,
      source: mapFrameworkCapabilityExplanationSourceTarget(step.source, context),
      relatedQueryKind: step.relatedQueryKind,
      targetQuery: step.targetQuery == null
        ? null
        : mapFrameworkCapabilityExplanationAppQuery(step.targetQuery, context),
    })),
  };
}

export function mapResourceAvailabilityExplanationAnswer(
  answer: SemanticRuntimeAnswer<unknown>,
  context: ResourceAvailabilityExplanationMappingContext,
): ResourceAvailabilityExplanationAnswerTransport {
  return mapFrameworkCapabilityExplanationAnswer(answer, context);
}

export function mapResourceAvailabilityExplanationContender(
  contender: SemanticResourceAvailabilityExplanationContender,
  context: ResourceAvailabilityExplanationMappingContext,
): ResourceAvailabilityExplanationContender {
  return {
    conclusionKind: contender.conclusionKind,
    subject: mapResourceAvailabilityExplanationSubject(contender.subject, context),
  };
}

function mapResourceAvailabilityExplanationSubject(
  subject: SemanticResourceAvailabilityExplanation["subject"],
  context: ResourceAvailabilityExplanationMappingContext,
): ResourceAvailabilityExplanationSubject {
  return {
    subjectKey: subject.subjectKey,
    projectKey: subject.projectKey,
    resourceIdentityKey: subject.resourceIdentityKey,
    resourceKind: `${subject.resourceKind}`,
    name: subject.name,
    lookupKind: subject.lookupKind,
    registrationKey: subject.registrationKey,
    resource: mapResourceInventoryItem(subject.resource, context),
    template: mapTemplateResourceScopeCandidate(subject.template, context),
  };
}
