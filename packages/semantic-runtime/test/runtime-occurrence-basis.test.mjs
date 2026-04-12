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
import {
  ClaimOutcomeKind,
  ClaimQualifierKind,
  ClaimTruthStatusKind
} from "../out/model/claims/claim-model.js";
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
  AnchoredSupportOpenReasonKind,
  AnchoredSupportSectionKind
} from "../out/substrate/claims/substrate-claim-ref.js";
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
      outcome: ClaimOutcomeKind.ClosedQualified,
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
      outcome: answer.outcome,
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

test("semantic-runtime publishes an anchored-support basis from an occurrence-guided focus without inventing a closed support bundle", () => {
  const discoveryRuntime = new SemanticRuntime({
    introspection: createBufferedSemanticRuntimeIntrospection(),
    typescriptProjectPort: new TypeScriptProjectPort(
      {
        generation: 62,
        projectRoot: FIXTURE_ROOT
      }
    )
  });
  const worldFrame = createWorldFrame(62, WorldFrameKind.Current);
  const currentWorldRoute = createQuestionRoute(
    createClaimRoute(ClaimHomeKind.CurrentWorldSummary),
    {
      inquiryEpisode: SemanticInquiryEpisode.BoundedClosureExplanation,
      readMode: SemanticReadMode.Explain
    }
  );
  const currentWorldAnswer = discoveryRuntime.readSemanticAnswer(
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
  const runtime = new SemanticRuntime({
    introspection: createBufferedSemanticRuntimeIntrospection(),
    typescriptProjectPort: new TypeScriptProjectPort(
      {
        generation: 62,
        projectRoot: FIXTURE_ROOT
      }
    )
  });

  const questionRoute = createQuestionRoute(
    createClaimRoute(ClaimHomeKind.AnchoredSupport),
    {
      inquiryEpisode: SemanticInquiryEpisode.BoundedClosureExplanation,
      readMode: SemanticReadMode.Explain,
      authoredOccurrenceTarget: new AuthoredOccurrenceTarget(
        templateSourceRef,
        39
      )
    }
  );
  const answer = runtime.readSemanticAnswer(
    {
      questionRoute,
      worldFrame
    }
  );
  const publication = answer.payload?.currentWorldPublication;
  const expectedAnchorRef = [
    "anchor",
    publication?.consultedWorld.worldRef,
    "custom-element",
    "app-root"
  ].join(":");
  const proofRecord = createProofRecord({
    pocket: SemanticRuntimeVerificationPocketKind.SubstrateAndEvaluatorRead,
    proofClass: VerificationProofClassKind.ContractProof,
    verificationBasis: VerificationBasisKind.InventedProductObligation,
    surfaceRefs: [
      SemanticRuntimeSurfaceKind.SemanticRuntime,
      SemanticRuntimeSurfaceKind.TypeScriptProjectPort,
      SemanticRuntimeSurfaceKind.SubstrateReader,
      SemanticRuntimeSurfaceKind.EvaluatorReadPort,
      SemanticRuntimeSurfaceKind.AnswerAssembler
    ],
    closureStatusPressure: ClosureStatusKind.Partial,
    likelyReentryArea: ReentryAreaKind.SubjectOracle,
    expected: {
      truthStatus: ClaimTruthStatusKind.OpenPlaceholder,
      outcome: ClaimOutcomeKind.DeferredOrPlaceholderOpen,
      qualification: ClaimQualifierKind.WorldOpen,
      closureStatus: ClosureStatusKind.Partial,
      claimHome: ClaimHomeKind.AnchoredSupport,
      anchorRef: expectedAnchorRef,
      resolvedIdentityRefs: ["app-root"],
      openReasonKinds: [
        AnchoredSupportOpenReasonKind.SectionSupportOpen,
        AnchoredSupportOpenReasonKind.CurrentWorldSensitive
      ],
      blockedSupportSections: [
        AnchoredSupportSectionKind.PolicyConfig,
        AnchoredSupportSectionKind.StructuredSupportBundle,
        AnchoredSupportSectionKind.OpaqueHooks
      ]
    },
    actual: {
      truthStatus: answer.truthStatus?.kind,
      outcome: answer.outcome,
      qualification: answer.qualificationRefs[0]?.kind,
      closureStatus: answer.closureStatus,
      claimHome: answer.provenance.claimRef.home,
      anchorRef: answer.payload?.anchoredSupportBasis?.anchorRef,
      resolvedIdentityRefs: answer.payload?.anchoredSupportBasis?.resolvedIdentityRefs,
      openReasonKinds: answer.payload?.anchoredSupportBasis?.openReasonKinds,
      blockedSupportSections: answer.payload?.anchoredSupportBasis?.blockedSupportSections
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
  assert.equal(answer.provenance.claimRef.localIdentity, expectedAnchorRef);
  assert.equal(
    answer.payload?.anchoredSupportBasis?.inheritedDeclarationWitnessRef,
    publication?.declarationWitnessRef
  );
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

