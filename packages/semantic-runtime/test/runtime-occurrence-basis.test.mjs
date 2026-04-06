import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  AuthoredOccurrenceTarget,
  ClaimHomeKind,
  SemanticInquiryEpisode,
  SemanticReadMode,
  SemanticRuntime,
  TypeScriptProjectPort,
  WorldFrameKind,
  createClaimRoute,
  createQuestionRoute,
  createWorldFrame
} from "../out/index.js";
import { ClaimQualifierKind } from "../out/model/claims/claim-model.js";
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
import {
  SyntaxCarrierKind
} from "../out/syntax/occurrences/authored-occurrence-basis.js";
import {
  TemplateSourceKind,
  TemplateViewStrategyKind
} from "../out/workspace/templates/template-source-association.js";
import {
  createProofRecord,
  assertProofRecord
} from "../out/testing/obligation-harness.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const FIXTURE_ROOT = path.join(
  __dirname,
  "fixtures",
  "aurelia-programs",
  "declaration-world-basic"
);

test("semantic-runtime publishes an authored occurrence basis from a template source without overclaiming syntax closure", () => {
  const runtime = new SemanticRuntime({
    introspection: createBufferedSemanticRuntimeIntrospection(),
    typescriptProjectPort: new TypeScriptProjectPort(
      {
        generation: 61,
        projectRoot: FIXTURE_ROOT
      }
    )
  });
  const worldFrame = createWorldFrame(61, WorldFrameKind.Current);
  const currentWorldRoute = createQuestionRoute(
    createClaimRoute(ClaimHomeKind.CurrentWorldSummary),
    {
      inquiryEpisode: SemanticInquiryEpisode.BoundedClosureExplanation,
      readMode: SemanticReadMode.Explain
    }
  );
  const currentWorldAnswer = runtime.readSemanticAnswer(
    {
      questionRoute: currentWorldRoute,
      worldFrame
    }
  );
  const appRoot = currentWorldAnswer.payload?.currentWorldPublication?.resources.find(
    (resource) => resource.resourceName === "app-root"
  );
  const templateSourceRef = appRoot?.templateAssociation?.templateSourceRef;
  assert.ok(templateSourceRef);
  const offset = 39;
  const questionRoute = createQuestionRoute(
    createClaimRoute(ClaimHomeKind.AuthoredOccurrenceBasis),
    {
      inquiryEpisode: SemanticInquiryEpisode.GoverningAnchorJump,
      readMode: SemanticReadMode.Explain,
      authoredOccurrenceTarget: new AuthoredOccurrenceTarget(
        templateSourceRef,
        offset
      )
    }
  );
  const answer = runtime.readSemanticAnswer(
    {
      questionRoute,
      worldFrame
    }
  );
  const proofRecord = createProofRecord({
    pocket: SemanticRuntimeVerificationPocketKind.TemplateWorldAndOccurrenceBasis,
    proofClass: VerificationProofClassKind.ContractProof,
    verificationBasis: VerificationBasisKind.InventedProductObligation,
    surfaceRefs: [
      SemanticRuntimeSurfaceKind.SemanticRuntime,
      SemanticRuntimeSurfaceKind.TypeScriptProjectPort,
      SemanticRuntimeSurfaceKind.TemplateSourceAssociationScanner,
      SemanticRuntimeSurfaceKind.AuthoredOccurrenceBasisPublisher,
      SemanticRuntimeSurfaceKind.SubstrateReader,
      SemanticRuntimeSurfaceKind.EvaluatorReadPort
    ],
    closureStatusPressure: ClosureStatusKind.Partial,
    likelyReentryArea: ReentryAreaKind.SubjectOracle,
    expected: {
      qualification: ClaimQualifierKind.WorldOpen,
      closureStatus: ClosureStatusKind.Partial,
      templateSourceRef,
      ownerResourceName: "app-root",
      carrierKind: SyntaxCarrierKind.TemplateSourceBasis,
      viewStrategy: TemplateViewStrategyKind.ConventionalFile,
      sourceKind: TemplateSourceKind.ExternalFile,
      offset
    },
    actual: {
      qualification: answer.qualificationRefs[0]?.kind,
      closureStatus: answer.closureStatus,
      templateSourceRef: answer.payload?.authoredOccurrenceBasis?.templateSourceRef,
      ownerResourceName: answer.payload?.authoredOccurrenceBasis?.ownerResourceName,
      carrierKind: answer.payload?.authoredOccurrenceBasis?.carrierKind,
      viewStrategy: answer.payload?.authoredOccurrenceBasis?.viewStrategy,
      sourceKind: answer.payload?.authoredOccurrenceBasis?.sourceKind,
      offset: answer.payload?.authoredOccurrenceBasis?.offset
    },
    traceCapture: {
      request: { questionRoute, worldFrame },
      events: runtime.captureTrace(
        {
          questionRoute,
          worldFrame
        }
      )
    }
  });

  assertProofRecord(proofRecord);
  assert.match(answer.payload?.authoredOccurrenceBasis?.occurrenceRef ?? "", /occurrence:/);
  assert.equal(answer.payload?.currentWorldPublication?.associatedTemplateCount, 4);
  assert.deepEqual(
    proofRecord.traceCapture.events.map((event) => event.kind),
    [
      SemanticRuntimeTraceEventKind.QueryPlanned,
      SemanticRuntimeTraceEventKind.WorldContextHandedOff,
      SemanticRuntimeTraceEventKind.SubstrateClaimRead,
      SemanticRuntimeTraceEventKind.EvaluatorResultPublished,
      SemanticRuntimeTraceEventKind.AnswerAssembled
    ]
  );
});

