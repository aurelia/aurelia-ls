import assert from "node:assert/strict";
import test from "node:test";

import {
  ClaimHomeKind,
  createClaimRoute,
  SemanticInquiryEpisode,
  SemanticReadMode,
  SemanticRuntime,
  TypeScriptProjectPort,
  TypedEnrichmentOutcomeKind,
  TypedEnrichmentRequest,
  TypedOperationIntentKind,
  TypedTargetLocator,
  TypedUnavailabilityReasonKind,
  WorldFrameKind,
  createQuestionRoute,
  createWorldFrame
} from "../out/index.js";
import {
  BoundaryRouteKind
} from "../out/model/boundary-routes/boundary-routes.js";
import {
  ClosureStatusKind,
  ReentryAreaKind,
  SemanticRuntimeSurfaceKind,
  SemanticRuntimeVerificationPocketKind,
  VerificationBasisKind,
  VerificationProofClassKind
} from "../out/model/semantic-runtime-handles.js";
import {
  SemanticRuntimeTraceEventKind,
  createBufferedSemanticRuntimeIntrospection
} from "../out/runtime/introspection/runtime-introspection.js";
import { SummaryStatusKind } from "../out/workspace/handoff/current-world-context.js";
import {
  createProofRecord,
  assertProofRecord
} from "../out/testing/obligation-harness.js";
import { BoundaryOutcomeKind } from "../out/boundaries/consequence-basis/boundary-consequence-basis.js";

test("semantic-runtime contextual typed readout resolves live checker evidence", () => {
  const fileName = "C:/virtual/semantic-runtime/answer.ts";
  const sourceText = [
    "export const answer = 42;",
    "export const alias = answer;"
  ].join("\n");
  const targetPosition = sourceText.lastIndexOf("answer");
  const questionRoute = createQuestionRoute(
    createClaimRoute(ClaimHomeKind.CurrentWorldSummary),
    {
      inquiryEpisode: SemanticInquiryEpisode.BoundedClosureExplanation,
      readMode: SemanticReadMode.Explain
    }
  );
  const worldFrame = createWorldFrame(21, WorldFrameKind.Current);
  const runtime = new SemanticRuntime({
    introspection: createBufferedSemanticRuntimeIntrospection(),
    typescriptProjectPort: new TypeScriptProjectPort(
      {
        generation: 21,
        files: {
          [fileName]: sourceText
        }
      }
    )
  });
  const request = new TypedEnrichmentRequest(
    questionRoute,
    worldFrame,
    TypedOperationIntentKind.ContextualReadout,
    new TypedTargetLocator(fileName, targetPosition)
  );
  const outcome = runtime.readTypedEnrichment(request);
  const proofRecord = createProofRecord({
    pocket: SemanticRuntimeVerificationPocketKind.TypeScriptLocalTypedService,
    proofClass: VerificationProofClassKind.ContractProof,
    verificationBasis: VerificationBasisKind.InventedProductObligation,
    surfaceRefs: [
      SemanticRuntimeSurfaceKind.SemanticRuntime,
      SemanticRuntimeSurfaceKind.WorldContextHandoff,
      SemanticRuntimeSurfaceKind.TypedEnrichmentPort
    ],
    closureStatusPressure: ClosureStatusKind.Closed,
    likelyReentryArea: ReentryAreaKind.VerificationBurden,
    expected: {
      kind: TypedEnrichmentOutcomeKind.TypedEvidence,
      closureStatus: ClosureStatusKind.Closed,
      projectGeneration: 21,
      symbolName: "answer",
      typeText: "42"
    },
    actual: {
      kind: outcome.kind,
      closureStatus: outcome.closureStatus,
      projectGeneration: outcome.projectGeneration,
      symbolName: outcome.evidence?.symbolName,
      typeText: outcome.evidence?.typeText
    },
    traceCapture: {
      request: {
        questionRoute,
        worldFrame
      },
      events: runtime.captureTrace(
        {
          questionRoute,
          worldFrame
        }
      )
    }
  });

  assertProofRecord(proofRecord);
  assert.match(outcome.evidence?.displayText ?? "", /answer/);
  assert.deepEqual(
    proofRecord.traceCapture.events.map((event) => event.kind),
    [
      SemanticRuntimeTraceEventKind.TypedEnrichmentRequested,
      SemanticRuntimeTraceEventKind.WorldContextHandedOff,
      SemanticRuntimeTraceEventKind.TypedEnrichmentProduced
    ]
  );
  const handoffEvent = proofRecord.traceCapture.events.find(
    (event) => event.kind === SemanticRuntimeTraceEventKind.WorldContextHandedOff
  );
  assert.equal(handoffEvent?.currentWorld?.summary.consultedPackageCount, 1);
  assert.equal(
    handoffEvent?.currentWorld?.summary.recognitionStatus,
    SummaryStatusKind.OpenPlaceholder
  );
  assert.equal(
    handoffEvent?.currentWorld?.worldFrameHandle?.version,
    worldFrame.version
  );
});

test("semantic-runtime typed enrichment stays explicit when no live project is available", () => {
  const questionRoute = createQuestionRoute(
    createClaimRoute(ClaimHomeKind.CurrentWorldSummary)
  );
  const worldFrame = createWorldFrame(22, WorldFrameKind.Current);
  const outcome = new SemanticRuntime({}).readTypedEnrichment(
    new TypedEnrichmentRequest(
      questionRoute,
      worldFrame,
      TypedOperationIntentKind.ContextualReadout,
      new TypedTargetLocator("C:/virtual/semantic-runtime/missing.ts", 0)
    )
  );
  const proofRecord = createProofRecord({
    pocket: SemanticRuntimeVerificationPocketKind.TypeScriptLocalTypedService,
    proofClass: VerificationProofClassKind.SeamProof,
    verificationBasis: VerificationBasisKind.InventedProductObligation,
    surfaceRefs: [
      SemanticRuntimeSurfaceKind.SemanticRuntime,
      SemanticRuntimeSurfaceKind.TypedEnrichmentPort
    ],
    closureStatusPressure: ClosureStatusKind.Open,
    likelyReentryArea: ReentryAreaKind.IntrospectionArchitecture,
    expected: {
      kind: TypedEnrichmentOutcomeKind.TypedUnavailable,
      closureStatus: ClosureStatusKind.Open,
      reason: TypedUnavailabilityReasonKind.NoLiveProject
    },
    actual: {
      kind: outcome.kind,
      closureStatus: outcome.closureStatus,
      reason: outcome.unavailabilityReason
    },
    traceCapture: {
      request: {
        questionRoute,
        worldFrame
      },
      events: []
    }
  });

  assertProofRecord(proofRecord);
});

test("semantic-runtime member completion routes outward through the candidate-discovery seam", () => {
  const questionRoute = createQuestionRoute(
    createClaimRoute(ClaimHomeKind.CurrentWorldSummary),
    {
      inquiryEpisode: SemanticInquiryEpisode.TransformOrRemediateHandoff,
      readMode: SemanticReadMode.Complete
    }
  );
  const worldFrame = createWorldFrame(23, WorldFrameKind.Current);
  const runtime = new SemanticRuntime({
    boundaryPorts: {
      candidateDiscovery: {
        route: BoundaryRouteKind.CandidateDiscovery
      }
    }
  });
  const outcome = runtime.readTypedEnrichment(
    new TypedEnrichmentRequest(
      questionRoute,
      worldFrame,
      TypedOperationIntentKind.MemberCompletion,
      new TypedTargetLocator("C:/virtual/semantic-runtime/completion.ts", 0)
    )
  );
  const proofRecord = createProofRecord({
    pocket: SemanticRuntimeVerificationPocketKind.TypeScriptLocalTypedService,
    proofClass: VerificationProofClassKind.SeamProof,
    verificationBasis: VerificationBasisKind.InventedProductObligation,
    surfaceRefs: [
      SemanticRuntimeSurfaceKind.SemanticRuntime,
      SemanticRuntimeSurfaceKind.BoundaryRouter,
      SemanticRuntimeSurfaceKind.TypedEnrichmentPort
    ],
    closureStatusPressure: ClosureStatusKind.Qualified,
    likelyReentryArea: ReentryAreaKind.ProjectionAndNaming,
    expected: {
      kind: TypedEnrichmentOutcomeKind.RoutedToOwner,
      closureStatus: ClosureStatusKind.Qualified,
      boundaryRoute: BoundaryRouteKind.CandidateDiscovery,
      boundaryKind: BoundaryOutcomeKind.RouteToOwner
    },
    actual: {
      kind: outcome.kind,
      closureStatus: outcome.closureStatus,
      boundaryRoute: outcome.boundaryRoute,
      boundaryKind: outcome.boundaryOutcome?.kind
    },
    traceCapture: {
      request: {
        questionRoute,
        worldFrame
      },
      events: []
    }
  });

  assertProofRecord(proofRecord);
});
