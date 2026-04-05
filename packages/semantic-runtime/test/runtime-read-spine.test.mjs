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
import { createSemanticRuntime } from "../out/runtime/semantic-runtime.js";
import {
  RescanReasonKind,
  createCurrentWorldContextPort
} from "../out/workspace/handoff/current-world-context.js";
import { createEvaluatorReadPort, runPublishedEvaluators } from "../out/evaluators/kernel/evaluator-read-port.js";
import {
  createProofRecord,
  assertProofRecord
} from "../out/testing/obligation-harness.js";
import { createSubstrateReader } from "../out/substrate/substrate-reader.js";
import {
  createCurrentWorldSummaryClaim,
  createInMemorySubstrateStorage
} from "../out/substrate/storage/substrate-storage.js";

test("semantic-runtime local read assembles a structured semantic answer", () => {
  const worldFrame = createWorldFrame(7, WorldFrameKind.Current);
  const claimRoute = createClaimRoute(ClaimHomeKind.CurrentWorldSummary);
  const questionRoute = createQuestionRoute(
    claimRoute,
    Object.freeze({
      inquiryEpisode: SemanticInquiryEpisode.CurrentWorldRead,
      readMode: SemanticReadMode.Explain
    })
  );
  const runtime = createSemanticRuntime({
    introspection: createBufferedSemanticRuntimeIntrospection(),
    currentWorldContextPort: createCurrentWorldContextPort(
      Object.freeze({
        publishedClaimCount: 1,
        consultedPackageCount: 1,
        rescanReasonMask: RescanReasonKind.WorkspaceChanged
      })
    ),
    substrateStorage: createInMemorySubstrateStorage(
      Object.freeze([
        createCurrentWorldSummaryClaim(
          ClaimHomeKind.CurrentWorldSummary,
          7,
          Object.freeze({
            publishedClaimCount: 1,
            consultedPackageCount: 1
          })
        )
      ])
    )
  });
  const answer = runtime.readSemanticAnswer(
    Object.freeze({
      questionRoute,
      worldFrame
    })
  );
  const traceCaptureRequest = Object.freeze({
    questionRoute,
    worldFrame
  });
  const proofRecord = createProofRecord({
    pocket: SemanticRuntimeVerificationPocketKind.ModelQueryAnswerCore,
    proofClass: VerificationProofClassKind.ContractProof,
    verificationBasis: VerificationBasisKind.InventedProductObligation,
    surfaceRefs: Object.freeze([
      SemanticRuntimeSurfaceKind.ClaimModel,
      SemanticRuntimeSurfaceKind.SemanticApiModel,
      SemanticRuntimeSurfaceKind.QuestionRoute,
      SemanticRuntimeSurfaceKind.WorldFrame,
      SemanticRuntimeSurfaceKind.AnswerAssembler,
      SemanticRuntimeSurfaceKind.SemanticRuntime
    ]),
    closureStatusPressure: ClosureStatusKind.Closed,
    likelyReentryArea: ReentryAreaKind.VerificationBurden,
    expected: Object.freeze({
      answerCommitment: AnswerCommitmentKind.SemanticTruth,
      outcome: ClaimOutcomeKind.Present,
      qualification: ClaimQualifierKind.None,
      closureStatus: ClosureStatusKind.Closed,
      publishedClaimCount: 1
    }),
    actual: Object.freeze({
      answerCommitment: answer.answerCommitment.kind,
      outcome: answer.outcome,
      qualification: answer.qualification,
      closureStatus: answer.closureStatus,
      publishedClaimCount: answer.currentWorldSummary?.publishedClaimCount
    }),
    traceCapture: Object.freeze({
      request: traceCaptureRequest,
      events: runtime.captureTrace(traceCaptureRequest)
    })
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
  const currentWorldContext = createCurrentWorldContextPort(
    Object.freeze({
      publishedClaimCount: 2,
      consultedPackageCount: 1,
      rescanReasonMask: RescanReasonKind.WorkspaceChanged | RescanReasonKind.BoundaryPlanChanged
    })
  ).publishCurrentWorldContext(worldFrame);
  const handoff = createRuntimeWorldContextHandoff(questionRoute, currentWorldContext);
  const proofRecord = createProofRecord({
    pocket: SemanticRuntimeVerificationPocketKind.WorkspaceCurrentWorldHandoff,
    proofClass: VerificationProofClassKind.SeamProof,
    verificationBasis: VerificationBasisKind.InventedProductObligation,
    surfaceRefs: Object.freeze([
      SemanticRuntimeSurfaceKind.WorldFrame,
      SemanticRuntimeSurfaceKind.QuestionRoute,
      SemanticRuntimeSurfaceKind.WorldContextHandoff
    ]),
    closureStatusPressure: ClosureStatusKind.Closed,
    likelyReentryArea: ReentryAreaKind.ProjectionAndNaming,
    expected: Object.freeze({
      version: 9,
      publishedClaimCount: 2,
      consultedPackageCount: 1,
      rescanReasonMask: RescanReasonKind.WorkspaceChanged | RescanReasonKind.BoundaryPlanChanged
    }),
    actual: Object.freeze({
      version: handoff.worldFrameHandle.version,
      publishedClaimCount: handoff.snapshotSummary.publishedClaimCount,
      consultedPackageCount: handoff.snapshotSummary.consultedPackageCount,
      rescanReasonMask: handoff.rescanBasis.reasonMask
    }),
    traceCapture: Object.freeze({
      request: Object.freeze({ worldFrame, questionRoute }),
      events: Object.freeze([])
    })
  });

  assertProofRecord(proofRecord);
});

test("substrate and evaluator read stay publication-first and snapshot-first", () => {
  const worldFrame = createWorldFrame(12, WorldFrameKind.Current);
  const questionRoute = createQuestionRoute(
    createClaimRoute(ClaimHomeKind.CurrentWorldSummary),
    Object.freeze({
      inquiryEpisode: SemanticInquiryEpisode.CurrentWorldRead,
      readMode: SemanticReadMode.Observe
    })
  );
  const currentWorldContext = createCurrentWorldContextPort(
    Object.freeze({
      publishedClaimCount: 3,
      consultedPackageCount: 2
    })
  ).publishCurrentWorldContext(worldFrame);
  const handoff = createRuntimeWorldContextHandoff(questionRoute, currentWorldContext);
  const substrateReader = createSubstrateReader(
    createInMemorySubstrateStorage(
      Object.freeze([
        createCurrentWorldSummaryClaim(
          ClaimHomeKind.CurrentWorldSummary,
          12,
          Object.freeze({
            publishedClaimCount: 3,
            consultedPackageCount: 2
          })
        )
      ])
    )
  );
  const substrateRead = substrateReader.readSubstrateClaim(
    Object.freeze({
      claimRoute: questionRoute.claimRoute,
      worldFrameHandle: handoff.worldFrameHandle
    })
  );
  const evaluation = runPublishedEvaluators(
    Object.freeze({
      questionRoute,
      worldContext: handoff,
      claimRef: substrateRead.claimRef,
      publishedClaim: substrateRead.publishedClaim,
      lineageRef: substrateRead.lineageRef
    })
  );
  const proofRecord = createProofRecord({
    pocket: SemanticRuntimeVerificationPocketKind.SubstrateAndEvaluatorRead,
    proofClass: VerificationProofClassKind.SeamProof,
    verificationBasis: VerificationBasisKind.InventedProductObligation,
    surfaceRefs: Object.freeze([
      SemanticRuntimeSurfaceKind.SubstrateReader,
      SemanticRuntimeSurfaceKind.EvaluatorReadPort
    ]),
    closureStatusPressure: ClosureStatusKind.Closed,
    likelyReentryArea: ReentryAreaKind.SubjectOracle,
    expected: Object.freeze({
      outcome: ClaimOutcomeKind.Present,
      qualification: ClaimQualifierKind.None,
      closureStatus: ClosureStatusKind.Closed,
      claimHome: ClaimHomeKind.CurrentWorldSummary,
      worldVersion: 12
    }),
    actual: Object.freeze({
      outcome: evaluation.outcome,
      qualification: evaluation.qualifier,
      closureStatus: evaluation.closureStatus,
      claimHome: evaluation.claimRef.home,
      worldVersion: evaluation.claimRef.worldVersion
    }),
    traceCapture: Object.freeze({
      request: Object.freeze({ worldFrame, questionRoute }),
      events: Object.freeze([])
    })
  });

  assertProofRecord(proofRecord);
  assert.equal(evaluation.currentWorldSummary?.publishedClaimCount, 3);
  assert.equal(evaluation.currentWorldSummary?.consultedPackageCount, 2);
});
