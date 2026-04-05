import assert from "node:assert/strict";
import test from "node:test";

import { ClaimHomeKind, ClaimOutcomeKind, ClaimQualifierKind, createClaimRoute } from "../out/model/claims/index.js";
import { AnswerCommitmentKind, SemanticInquiryEpisode, SemanticReadMode } from "../out/model/semantic-api/index.js";
import {
  ClosureStatusKind,
  ReentryAreaKind,
  SemanticRuntimeSurfaceKind,
  SemanticRuntimeVerificationPocketKind,
  VerificationBasisKind,
  VerificationProofClassKind
} from "../out/model/semantic-runtime-handles.js";
import { createQuestionRoute } from "../out/query/framing/question-route.js";
import { WorldFrameKind, createWorldFrame } from "../out/query/framing/world-frame.js";
import { createRuntimeWorldContextHandoff } from "../out/runtime/handoff/world-context-handoff.js";
import {
  SemanticRuntimeTraceEventKind,
  createBufferedSemanticRuntimeIntrospection
} from "../out/runtime/introspection/runtime-introspection.js";
import { SemanticRuntime } from "../out/runtime/semantic-runtime.js";
import {
  RescanReasonKind,
  CurrentWorldContextPort
} from "../out/workspace/handoff/current-world-context.js";
import { EvaluatorReadPort } from "../out/evaluators/kernel/evaluator-read-port.js";
import {
  createProofRecord,
  assertProofRecord
} from "../out/testing/obligation-harness.js";
import { SubstrateReader } from "../out/substrate/substrate-reader.js";
import {
  createCurrentWorldSummaryClaim,
  createInMemorySubstrateStorage
} from "../out/substrate/storage/substrate-storage.js";

test("semantic-runtime local read assembles a structured semantic answer", () => {
  const worldFrame = createWorldFrame(7, WorldFrameKind.Current);
  const claimRoute = createClaimRoute(ClaimHomeKind.CurrentWorldSummary);
  const questionRoute = createQuestionRoute(
    claimRoute,
    {
      inquiryEpisode: SemanticInquiryEpisode.CurrentWorldRead,
      readMode: SemanticReadMode.Explain
    }
  );
  const runtime = new SemanticRuntime({
    introspection: createBufferedSemanticRuntimeIntrospection(),
    currentWorldContextPort: new CurrentWorldContextPort(
      {
        publishedClaimCount: 1,
        consultedPackageCount: 1,
        rescanReasonMask: RescanReasonKind.WorkspaceChanged
      }
    ),
    substrateStorage: createInMemorySubstrateStorage(
      [
        createCurrentWorldSummaryClaim(
          ClaimHomeKind.CurrentWorldSummary,
          7,
          {
            publishedClaimCount: 1,
            consultedPackageCount: 1
          }
        )
      ]
    )
  });
  const answer = runtime.readSemanticAnswer(
    {
      questionRoute,
      worldFrame
    }
  );
  const traceCaptureRequest = {
    questionRoute,
    worldFrame
  };
  const proofRecord = createProofRecord({
    pocket: SemanticRuntimeVerificationPocketKind.ModelQueryAnswerCore,
    proofClass: VerificationProofClassKind.ContractProof,
    verificationBasis: VerificationBasisKind.InventedProductObligation,
    surfaceRefs: [
      SemanticRuntimeSurfaceKind.ClaimModel,
      SemanticRuntimeSurfaceKind.SemanticApiModel,
      SemanticRuntimeSurfaceKind.QuestionRoute,
      SemanticRuntimeSurfaceKind.WorldFrame,
      SemanticRuntimeSurfaceKind.AnswerAssembler,
      SemanticRuntimeSurfaceKind.SemanticRuntime
    ],
    closureStatusPressure: ClosureStatusKind.Closed,
    likelyReentryArea: ReentryAreaKind.VerificationBurden,
    expected: {
      answerCommitment: AnswerCommitmentKind.SemanticTruth,
      outcome: ClaimOutcomeKind.Present,
      qualification: ClaimQualifierKind.None,
      closureStatus: ClosureStatusKind.Closed,
      publishedClaimCount: 1
    },
    actual: {
      answerCommitment: answer.answerCommitment.kind,
      outcome: answer.outcome,
      qualification: answer.qualification,
      closureStatus: answer.closureStatus,
      publishedClaimCount: answer.currentWorldSummary?.publishedClaimCount
    },
    traceCapture: {
      request: traceCaptureRequest,
      events: runtime.captureTrace(traceCaptureRequest)
    }
  });
  const verifiedRecord = assertProofRecord(proofRecord);

  assert.equal(answer.provenance.surface, SemanticRuntimeSurfaceKind.EvaluatorReadPort);
  assert.equal(answer.deltaBasis.mayReuse, true);
  assert.deepEqual(
    verifiedRecord.traceCapture.events.map((event) => event.kind),
    [
      SemanticRuntimeTraceEventKind.QueryPlanned,
      SemanticRuntimeTraceEventKind.WorldContextHandedOff,
      SemanticRuntimeTraceEventKind.SubstrateClaimRead,
      SemanticRuntimeTraceEventKind.EvaluatorResultPublished,
      SemanticRuntimeTraceEventKind.AnswerAssembled
    ]
  );
});

test("workspace current-world handoff stays layered and route-safe", () => {
  const worldFrame = createWorldFrame(9, WorldFrameKind.Current);
  const questionRoute = createQuestionRoute(
    createClaimRoute(ClaimHomeKind.CurrentWorldSummary)
  );
  const currentWorldContext = new CurrentWorldContextPort(
    {
      publishedClaimCount: 2,
      consultedPackageCount: 1,
      rescanReasonMask: RescanReasonKind.WorkspaceChanged | RescanReasonKind.BoundaryPlanChanged
    }
  ).publishCurrentWorldContext(worldFrame);
  const handoff = createRuntimeWorldContextHandoff(questionRoute, currentWorldContext);
  const proofRecord = createProofRecord({
    pocket: SemanticRuntimeVerificationPocketKind.WorkspaceCurrentWorldHandoff,
    proofClass: VerificationProofClassKind.SeamProof,
    verificationBasis: VerificationBasisKind.InventedProductObligation,
    surfaceRefs: [
      SemanticRuntimeSurfaceKind.WorldFrame,
      SemanticRuntimeSurfaceKind.QuestionRoute,
      SemanticRuntimeSurfaceKind.WorldContextHandoff
    ],
    closureStatusPressure: ClosureStatusKind.Closed,
    likelyReentryArea: ReentryAreaKind.ProjectionAndNaming,
    expected: {
      version: 9,
      publishedClaimCount: 2,
      consultedPackageCount: 1,
      rescanReasonMask: RescanReasonKind.WorkspaceChanged | RescanReasonKind.BoundaryPlanChanged
    },
    actual: {
      version: handoff.worldFrameHandle.version,
      publishedClaimCount: handoff.snapshotSummary.publishedClaimCount,
      consultedPackageCount: handoff.snapshotSummary.consultedPackageCount,
      rescanReasonMask: handoff.rescanBasis.reasonMask
    },
    traceCapture: {
      request: { worldFrame, questionRoute },
      events: []
    }
  });

  assertProofRecord(proofRecord);
});

test("substrate and evaluator read stay publication-first and snapshot-first", () => {
  const worldFrame = createWorldFrame(12, WorldFrameKind.Current);
  const questionRoute = createQuestionRoute(
    createClaimRoute(ClaimHomeKind.CurrentWorldSummary),
    {
      inquiryEpisode: SemanticInquiryEpisode.CurrentWorldRead,
      readMode: SemanticReadMode.Observe
    }
  );
  const currentWorldContext = new CurrentWorldContextPort(
    {
      publishedClaimCount: 3,
      consultedPackageCount: 2
    }
  ).publishCurrentWorldContext(worldFrame);
  const handoff = createRuntimeWorldContextHandoff(questionRoute, currentWorldContext);
  const substrateReader = new SubstrateReader(
    createInMemorySubstrateStorage(
      [
        createCurrentWorldSummaryClaim(
          ClaimHomeKind.CurrentWorldSummary,
          12,
          {
            publishedClaimCount: 3,
            consultedPackageCount: 2
          }
        )
      ]
    )
  );
  const substrateRead = substrateReader.readSubstrateClaim(
    {
      claimRoute: questionRoute.claimRoute,
      worldFrameHandle: handoff.worldFrameHandle
    }
  );
  const evaluation = new EvaluatorReadPort().runPublishedEvaluators(
    {
      questionRoute,
      worldContext: handoff,
      claimRef: substrateRead.claimRef,
      publishedClaim: substrateRead.publishedClaim,
      lineageRef: substrateRead.lineageRef
    }
  );
  const proofRecord = createProofRecord({
    pocket: SemanticRuntimeVerificationPocketKind.SubstrateAndEvaluatorRead,
    proofClass: VerificationProofClassKind.SeamProof,
    verificationBasis: VerificationBasisKind.InventedProductObligation,
    surfaceRefs: [
      SemanticRuntimeSurfaceKind.SubstrateReader,
      SemanticRuntimeSurfaceKind.EvaluatorReadPort
    ],
    closureStatusPressure: ClosureStatusKind.Closed,
    likelyReentryArea: ReentryAreaKind.SubjectOracle,
    expected: {
      outcome: ClaimOutcomeKind.Present,
      qualification: ClaimQualifierKind.None,
      closureStatus: ClosureStatusKind.Closed,
      claimHome: ClaimHomeKind.CurrentWorldSummary,
      worldVersion: 12
    },
    actual: {
      outcome: evaluation.outcome,
      qualification: evaluation.qualifier,
      closureStatus: evaluation.closureStatus,
      claimHome: evaluation.claimRef.home,
      worldVersion: evaluation.claimRef.worldVersion
    },
    traceCapture: {
      request: { worldFrame, questionRoute },
      events: []
    }
  });

  assertProofRecord(proofRecord);
  assert.equal(evaluation.currentWorldSummary?.publishedClaimCount, 3);
  assert.equal(evaluation.currentWorldSummary?.consultedPackageCount, 2);
});
