import assert from "node:assert/strict";
import test from "node:test";

import { BoundaryOutcomeKind } from "../out/boundaries/consequence-basis/boundary-consequence-basis.js";
import { BoundaryRouteKind } from "../out/model/boundary-routes/boundary-routes.js";
import { ClaimHomeKind, ClaimOutcomeKind, ClaimQualifierKind, createClaimRoute } from "../out/model/claims/index.js";
import {
  ClosureStatusKind,
  ReentryAreaKind,
  SemanticRuntimeSurfaceKind,
  SemanticRuntimeVerificationPocketKind,
  VerificationBasisKind,
  VerificationProofClassKind
} from "../out/model/semantic-runtime-handles.js";
import { createQuestionRoute } from "../out/query/framing/question-route.js";
import { createWorldFrame } from "../out/query/framing/world-frame.js";
import {
  SemanticRuntimeTraceEventKind,
  createBufferedSemanticRuntimeIntrospection
} from "../out/runtime/introspection/runtime-introspection.js";
import { createSemanticRuntime } from "../out/runtime/semantic-runtime.js";
import {
  assertProofRecord,
  createProofRecord
} from "../out/testing/obligation-harness.js";

test("semantic-runtime ingress routes a deferred owner with structured proof and trace", () => {
  const runtime = createSemanticRuntime({
    boundaryPorts: {
      typedEnrichment: Object.freeze({
        route: BoundaryRouteKind.TypedEnrichment
      })
    },
    introspection: createBufferedSemanticRuntimeIntrospection()
  });

  const questionRoute = createQuestionRoute(
    createClaimRoute(ClaimHomeKind.BoundaryFrontier),
    Object.freeze({
      boundaryRoute: BoundaryRouteKind.TypedEnrichment
    })
  );
  const worldFrame = createWorldFrame(1);
  const answer = runtime.readSemanticAnswer({
    questionRoute,
    worldFrame
  });
  const traceCaptureRequest = Object.freeze({
    worldFrame,
    questionRoute,
    boundaryRoute: BoundaryRouteKind.TypedEnrichment
  });
  const proofRecord = createProofRecord({
    pocket: SemanticRuntimeVerificationPocketKind.RuntimeReadFacadeAndServices,
    proofClass: VerificationProofClassKind.SeamProof,
    verificationBasis: VerificationBasisKind.InventedProductObligation,
    surfaceRefs: Object.freeze([
      SemanticRuntimeSurfaceKind.SemanticRuntime,
      SemanticRuntimeSurfaceKind.BoundaryRouter,
      SemanticRuntimeSurfaceKind.BoundaryPorts
    ]),
    closureStatusPressure: ClosureStatusKind.Qualified,
    likelyReentryArea: ReentryAreaKind.VerificationBurden,
    expected: Object.freeze({
      boundaryOutcomeKind: BoundaryOutcomeKind.RouteToOwner,
      boundaryRoute: BoundaryRouteKind.TypedEnrichment,
      closureStatus: ClosureStatusKind.Qualified,
      outcome: ClaimOutcomeKind.BoundaryDeferred,
      qualification: ClaimQualifierKind.BoundaryQualified
    }),
    actual: Object.freeze({
      boundaryOutcomeKind: answer.boundaryOutcome.kind,
      boundaryRoute: answer.boundaryOutcome.route,
      closureStatus: answer.boundaryOutcome.closureStatus,
      outcome: answer.outcome,
      qualification: answer.qualification
    }),
    traceCapture: Object.freeze({
      request: traceCaptureRequest,
      events: runtime.captureTrace(traceCaptureRequest)
    })
  });
  const verifiedRecord = assertProofRecord(proofRecord);

  assert.equal(answer.deltaBasis.mayReuse, true);
  assert.deepEqual(
    verifiedRecord.traceCapture.events.map((event) => event.kind),
    [
      SemanticRuntimeTraceEventKind.QueryPlanned,
      SemanticRuntimeTraceEventKind.WorldContextHandedOff,
      SemanticRuntimeTraceEventKind.SubstrateClaimRead,
      SemanticRuntimeTraceEventKind.BoundaryOutcomeProduced,
      SemanticRuntimeTraceEventKind.AnswerAssembled
    ]
  );
});
