import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
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
import { CurrentWorldContextPort } from "../out/workspace/handoff/current-world-context.js";
import { TypeScriptWorldConstruction } from "../out/workspace/registration/typescript-world-construction.js";
import {
  ConstructorArchetypeKind,
  RegistrationPathKind,
  WorldParticipationFrontierKind
} from "../out/workspace/registration/consulted-world.js";
import {
  ExtensionConfigurationProfileKind,
  ExtensionFamilyKind,
  GeneratedTemplateVocabularyKind
} from "../out/workspace/extensions/extension-activation.js";
import {
  CurrentWorldActivityStateKind,
  ResourceDeclarationClosureKind,
  ResourceDeclarationSurfaceKind,
  ResourceDefinitionKind
} from "../out/workspace/resources/resource-definition.js";
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
const QUALIFIED_FIXTURE_ROOT = path.join(
  __dirname,
  "fixtures",
  "aurelia-programs",
  "declaration-world-qualified"
);
const OPEN_FIXTURE_ROOT = path.join(
  __dirname,
  "fixtures",
  "aurelia-programs",
  "declaration-world-open"
);
const EXTENSION_FIXTURE_ROOT = path.join(
  __dirname,
  "fixtures",
  "aurelia-programs",
  "extension-world-basic"
);
const EXTENSION_QUALIFIED_FIXTURE_ROOT = path.join(
  __dirname,
  "fixtures",
  "aurelia-programs",
  "extension-world-qualified"
);
const EXTENSION_INACTIVE_FIXTURE_ROOT = path.join(
  __dirname,
  "fixtures",
  "aurelia-programs",
  "extension-world-inactive"
);

test("current-world handoff publishes a file-backed consulted world and resource neighborhood", () => {
  const questionRoute = createQuestionRoute(
    createClaimRoute(ClaimHomeKind.CurrentWorldSummary),
    {
      inquiryEpisode: SemanticInquiryEpisode.CurrentWorldRead,
      readMode: SemanticReadMode.Explain
    }
  );
  const worldFrame = createWorldFrame(41, WorldFrameKind.Current);
  const typescriptProjectPort = new TypeScriptProjectPort(
    {
      generation: 41,
      projectRoot: FIXTURE_ROOT
    }
  );
  const currentWorldContext = new CurrentWorldContextPort(
    {},
    new TypeScriptWorldConstruction(typescriptProjectPort)
  ).publishCurrentWorldContext(questionRoute, worldFrame);
  const publication = currentWorldContext.currentWorldPublication;
  const proofRecord = createProofRecord({
    pocket: SemanticRuntimeVerificationPocketKind.WorkspaceCurrentWorldHandoff,
    proofClass: VerificationProofClassKind.ContractProof,
    verificationBasis: VerificationBasisKind.InventedProductObligation,
    surfaceRefs: [
      SemanticRuntimeSurfaceKind.TypeScriptProjectPort,
      SemanticRuntimeSurfaceKind.WorldContextHandoff
    ],
    closureStatusPressure: ClosureStatusKind.Closed,
    likelyReentryArea: ReentryAreaKind.SubjectOracle,
    expected: {
      consultedPackageCount: 1,
      recognizedResourceCount: 5,
      admittedResourceCount: 5,
      activeResourceCount: 0,
      underclosedResourceCount: 0,
      activeExtensionCount: 0,
      admittedGeneratedVocabularyCount: 0,
      underclosedGeneratedVocabularyCount: 0,
      frontier: WorldParticipationFrontierKind.CurrentWorldSensitive,
      packageName: "@fixtures/declaration-world-basic",
      resourceNames: ["app-root", "feature-card", "info-panel", "inline-notice", "status-badge"],
      declarationSurfaces: [
        ResourceDeclarationSurfaceKind.Decorator,
        ResourceDeclarationSurfaceKind.DefineCall,
        ResourceDeclarationSurfaceKind.StaticMetadata,
        ResourceDeclarationSurfaceKind.Decorator,
        ResourceDeclarationSurfaceKind.Decorator
      ],
      declarationClosures: [
        ResourceDeclarationClosureKind.DeclaredExplicit,
        ResourceDeclarationClosureKind.DeclaredExplicit,
        ResourceDeclarationClosureKind.SourceAnalyzable,
        ResourceDeclarationClosureKind.SourceAnalyzable,
        ResourceDeclarationClosureKind.DeclaredExplicit
      ]
    },
    actual: {
      consultedPackageCount: currentWorldContext.snapshotSummary.consultedPackageCount,
      recognizedResourceCount: currentWorldContext.snapshotSummary.recognizedResourceCount,
      admittedResourceCount: currentWorldContext.snapshotSummary.admittedResourceCount,
      activeResourceCount: currentWorldContext.snapshotSummary.activeResourceCount,
      underclosedResourceCount: currentWorldContext.snapshotSummary.underclosedResourceCount,
      activeExtensionCount: currentWorldContext.snapshotSummary.activeExtensionCount,
      admittedGeneratedVocabularyCount: currentWorldContext.snapshotSummary.admittedGeneratedVocabularyCount,
      underclosedGeneratedVocabularyCount: currentWorldContext.snapshotSummary.underclosedGeneratedVocabularyCount,
      frontier: publication?.frontier,
      packageName: publication?.consultedPackage.packageName,
      resourceNames: publication?.resources.map((resource) => resource.resourceName),
      declarationSurfaces: publication?.resources.map((resource) => resource.declarationSurface),
      declarationClosures: publication?.resources.map((resource) => resource.declarationClosure)
    },
    traceCapture: {
      request: { questionRoute, worldFrame },
      events: []
    }
  });

  assertProofRecord(proofRecord);
  assert.equal(publication?.resources[0]?.kind, ResourceDefinitionKind.CustomElement);
  assert.equal(
    publication?.resources[0]?.currentWorldActivityState,
    CurrentWorldActivityStateKind.CurrentWorldSensitive
  );
  assert.equal(publication?.underclosedResourceCount, 0);
});

test("semantic-runtime publishes current-world resource admission from a curated Aurelia fixture", () => {
  const questionRoute = createQuestionRoute(
    createClaimRoute(ClaimHomeKind.CurrentWorldSummary),
    {
      inquiryEpisode: SemanticInquiryEpisode.CurrentWorldRead,
      readMode: SemanticReadMode.Explain
    }
  );
  const worldFrame = createWorldFrame(42, WorldFrameKind.Current);
  const runtime = new SemanticRuntime({
    introspection: createBufferedSemanticRuntimeIntrospection(),
    typescriptProjectPort: new TypeScriptProjectPort(
      {
        generation: 42,
        projectRoot: FIXTURE_ROOT
      }
    )
  });
  const answer = runtime.readSemanticAnswer(
    {
      questionRoute,
      worldFrame
    }
  );
  const proofRecord = createProofRecord({
    pocket: SemanticRuntimeVerificationPocketKind.SubstrateAndEvaluatorRead,
    proofClass: VerificationProofClassKind.ContractProof,
    verificationBasis: VerificationBasisKind.InventedProductObligation,
    surfaceRefs: [
      SemanticRuntimeSurfaceKind.TypeScriptProjectPort,
      SemanticRuntimeSurfaceKind.SubstrateReader,
      SemanticRuntimeSurfaceKind.EvaluatorReadPort,
      SemanticRuntimeSurfaceKind.SemanticRuntime
    ],
    closureStatusPressure: ClosureStatusKind.Closed,
    likelyReentryArea: ReentryAreaKind.SubjectOracle,
    expected: {
      recognizedResourceCount: 5,
      admittedResourceCount: 5,
      activeResourceCount: 0,
      underclosedResourceCount: 0,
      activeExtensionCount: 0,
      admittedGeneratedVocabularyCount: 0,
      underclosedGeneratedVocabularyCount: 0,
      resourceNames: ["app-root", "feature-card", "info-panel", "inline-notice", "status-badge"],
      packageName: "@fixtures/declaration-world-basic",
      frontier: WorldParticipationFrontierKind.CurrentWorldSensitive
    },
    actual: {
      recognizedResourceCount: answer.currentWorldSummary?.recognizedResourceCount,
      admittedResourceCount: answer.currentWorldSummary?.admittedResourceCount,
      activeResourceCount: answer.currentWorldSummary?.activeResourceCount,
      underclosedResourceCount: answer.currentWorldSummary?.underclosedResourceCount,
      activeExtensionCount: answer.currentWorldSummary?.activeExtensionCount,
      admittedGeneratedVocabularyCount: answer.currentWorldSummary?.admittedGeneratedVocabularyCount,
      underclosedGeneratedVocabularyCount: answer.currentWorldSummary?.underclosedGeneratedVocabularyCount,
      resourceNames: answer.currentWorldPublication?.resources.map((resource) => resource.resourceName),
      packageName: answer.currentWorldPublication?.consultedPackage.packageName,
      frontier: answer.currentWorldPublication?.frontier
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
  assert.equal(answer.currentWorldPublication?.resources.length, 5);
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

test("semantic-runtime keeps declaration-world publication qualified when recognizer breadth is still partial", () => {
  const questionRoute = createQuestionRoute(
    createClaimRoute(ClaimHomeKind.CurrentWorldSummary),
    {
      inquiryEpisode: SemanticInquiryEpisode.CurrentWorldRead,
      readMode: SemanticReadMode.Explain
    }
  );
  const worldFrame = createWorldFrame(43, WorldFrameKind.Current);
  const runtime = new SemanticRuntime(
    {
      introspection: createBufferedSemanticRuntimeIntrospection(),
      typescriptProjectPort: new TypeScriptProjectPort(
        {
          generation: 43,
          projectRoot: QUALIFIED_FIXTURE_ROOT
        }
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
    pocket: SemanticRuntimeVerificationPocketKind.SubstrateAndEvaluatorRead,
    proofClass: VerificationProofClassKind.SeamProof,
    verificationBasis: VerificationBasisKind.InventedProductObligation,
    surfaceRefs: [
      SemanticRuntimeSurfaceKind.TypeScriptProjectPort,
      SemanticRuntimeSurfaceKind.SubstrateReader,
      SemanticRuntimeSurfaceKind.EvaluatorReadPort,
      SemanticRuntimeSurfaceKind.SemanticRuntime
    ],
    closureStatusPressure: ClosureStatusKind.Qualified,
    likelyReentryArea: ReentryAreaKind.SubjectOracle,
    expected: {
      qualification: ClaimQualifierKind.WorldOpen,
      closureStatus: ClosureStatusKind.Qualified,
      frontier: WorldParticipationFrontierKind.WorldQualified,
      recognizedResourceCount: 1,
      underclosedResourceCount: 1,
      activeExtensionCount: 0,
      admittedGeneratedVocabularyCount: 0,
      underclosedGeneratedVocabularyCount: 0,
      resourceNames: ["resolved-panel"]
    },
    actual: {
      qualification: answer.qualification,
      closureStatus: answer.closureStatus,
      frontier: answer.currentWorldPublication?.frontier,
      recognizedResourceCount: answer.currentWorldSummary?.recognizedResourceCount,
      underclosedResourceCount: answer.currentWorldSummary?.underclosedResourceCount,
      activeExtensionCount: answer.currentWorldSummary?.activeExtensionCount,
      admittedGeneratedVocabularyCount: answer.currentWorldSummary?.admittedGeneratedVocabularyCount,
      underclosedGeneratedVocabularyCount: answer.currentWorldSummary?.underclosedGeneratedVocabularyCount,
      resourceNames: answer.currentWorldPublication?.resources.map((resource) => resource.resourceName)
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
  assert.equal(answer.currentWorldPublication?.underclosedResourceCount, 1);
});

test("semantic-runtime keeps declaration-world publication open when only underclosed candidates are present", () => {
  const questionRoute = createQuestionRoute(
    createClaimRoute(ClaimHomeKind.CurrentWorldSummary),
    {
      inquiryEpisode: SemanticInquiryEpisode.CurrentWorldRead,
      readMode: SemanticReadMode.Explain
    }
  );
  const worldFrame = createWorldFrame(44, WorldFrameKind.Current);
  const runtime = new SemanticRuntime(
    {
      introspection: createBufferedSemanticRuntimeIntrospection(),
      typescriptProjectPort: new TypeScriptProjectPort(
        {
          generation: 44,
          projectRoot: OPEN_FIXTURE_ROOT
        }
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
    pocket: SemanticRuntimeVerificationPocketKind.SubstrateAndEvaluatorRead,
    proofClass: VerificationProofClassKind.SeamProof,
    verificationBasis: VerificationBasisKind.InventedProductObligation,
    surfaceRefs: [
      SemanticRuntimeSurfaceKind.TypeScriptProjectPort,
      SemanticRuntimeSurfaceKind.SubstrateReader,
      SemanticRuntimeSurfaceKind.EvaluatorReadPort,
      SemanticRuntimeSurfaceKind.SemanticRuntime
    ],
    closureStatusPressure: ClosureStatusKind.Partial,
    likelyReentryArea: ReentryAreaKind.SubjectOracle,
    expected: {
      qualification: ClaimQualifierKind.WorldOpen,
      closureStatus: ClosureStatusKind.Partial,
      frontier: WorldParticipationFrontierKind.OpenPlaceholder,
      recognizedResourceCount: 0,
      underclosedResourceCount: 1,
      activeExtensionCount: 0,
      admittedGeneratedVocabularyCount: 0,
      underclosedGeneratedVocabularyCount: 0,
      resourceNames: []
    },
    actual: {
      qualification: answer.qualification,
      closureStatus: answer.closureStatus,
      frontier: answer.currentWorldPublication?.frontier,
      recognizedResourceCount: answer.currentWorldSummary?.recognizedResourceCount,
      underclosedResourceCount: answer.currentWorldSummary?.underclosedResourceCount,
      activeExtensionCount: answer.currentWorldSummary?.activeExtensionCount,
      admittedGeneratedVocabularyCount: answer.currentWorldSummary?.admittedGeneratedVocabularyCount,
      underclosedGeneratedVocabularyCount: answer.currentWorldSummary?.underclosedGeneratedVocabularyCount,
      resourceNames: answer.currentWorldPublication?.resources.map((resource) => resource.resourceName)
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
  assert.equal(answer.currentWorldPublication?.resources.length, 0);
  assert.equal(answer.currentWorldPublication?.underclosedResourceCount, 1);
});

test("current-world publication admits active extension-generated vocabulary from a curated configuration fixture", () => {
  const questionRoute = createQuestionRoute(
    createClaimRoute(ClaimHomeKind.CurrentWorldSummary),
    {
      inquiryEpisode: SemanticInquiryEpisode.CurrentWorldRead,
      readMode: SemanticReadMode.Explain
    }
  );
  const worldFrame = createWorldFrame(45, WorldFrameKind.Current);
  const currentWorldContext = new CurrentWorldContextPort(
    {},
    new TypeScriptWorldConstruction(
      new TypeScriptProjectPort(
        {
          generation: 45,
          projectRoot: EXTENSION_FIXTURE_ROOT
        }
      )
    )
  ).publishCurrentWorldContext(questionRoute, worldFrame);
  const publication = currentWorldContext.currentWorldPublication;
  const proofRecord = createProofRecord({
    pocket: SemanticRuntimeVerificationPocketKind.WorkspaceCurrentWorldHandoff,
    proofClass: VerificationProofClassKind.ContractProof,
    verificationBasis: VerificationBasisKind.InventedProductObligation,
    surfaceRefs: [
      SemanticRuntimeSurfaceKind.TypeScriptProjectPort,
      SemanticRuntimeSurfaceKind.WorldContextHandoff
    ],
    closureStatusPressure: ClosureStatusKind.Closed,
    likelyReentryArea: ReentryAreaKind.SubjectOracle,
    expected: {
      recognizedResourceCount: 0,
      activeExtensionCount: 1,
      admittedGeneratedVocabularyCount: 4,
      underclosedGeneratedVocabularyCount: 0,
      frontier: WorldParticipationFrontierKind.CurrentWorldSensitive,
      packageName: "@fixtures/extension-world-basic",
      registrationPath: RegistrationPathKind.ConfigurationEmission,
      constructorArchetypes: [
        ConstructorArchetypeKind.AggregateBundle,
        ConstructorArchetypeKind.CustomizedDefault,
        ConstructorArchetypeKind.GeneratedSyntax
      ],
      extensionFamilies: [ExtensionFamilyKind.I18n],
      extensionProfiles: [[
        ExtensionConfigurationProfileKind.CustomizedDefault,
        ExtensionConfigurationProfileKind.GeneratedSyntax
      ]],
      vocabularyKinds: [
        GeneratedTemplateVocabularyKind.AttributePattern,
        GeneratedTemplateVocabularyKind.BindingCommand,
        GeneratedTemplateVocabularyKind.AttributePattern,
        GeneratedTemplateVocabularyKind.BindingCommand
      ],
      vocabularyNames: ["t", "t.bind", "tx", "tx.bind"]
    },
    actual: {
      recognizedResourceCount: currentWorldContext.snapshotSummary.recognizedResourceCount,
      activeExtensionCount: currentWorldContext.snapshotSummary.activeExtensionCount,
      admittedGeneratedVocabularyCount: currentWorldContext.snapshotSummary.admittedGeneratedVocabularyCount,
      underclosedGeneratedVocabularyCount: currentWorldContext.snapshotSummary.underclosedGeneratedVocabularyCount,
      frontier: publication?.frontier,
      packageName: publication?.consultedPackage.packageName,
      registrationPath: publication?.consultedWorld.registrationPath,
      constructorArchetypes: publication?.consultedWorld.constructorArchetypes,
      extensionFamilies: publication?.activeExtensions.map((extension) => extension.family),
      extensionProfiles: publication?.activeExtensions.map((extension) => [...extension.profiles]),
      vocabularyKinds: publication?.generatedVocabulary.map((member) => member.kind),
      vocabularyNames: publication?.generatedVocabulary.map((member) => member.surfaceName)
    },
    traceCapture: {
      request: { questionRoute, worldFrame },
      events: []
    }
  });

  assertProofRecord(proofRecord);
  assert.equal(publication?.resources.length, 0);
  assert.equal(publication?.activeExtensions.length, 1);
  assert.equal(publication?.generatedVocabulary.length, 4);
});

test("semantic-runtime keeps extension-generated vocabulary qualified when builder-history aliases stay underclosed", () => {
  const questionRoute = createQuestionRoute(
    createClaimRoute(ClaimHomeKind.CurrentWorldSummary),
    {
      inquiryEpisode: SemanticInquiryEpisode.CurrentWorldRead,
      readMode: SemanticReadMode.Explain
    }
  );
  const worldFrame = createWorldFrame(46, WorldFrameKind.Current);
  const runtime = new SemanticRuntime(
    {
      introspection: createBufferedSemanticRuntimeIntrospection(),
      typescriptProjectPort: new TypeScriptProjectPort(
        {
          generation: 46,
          projectRoot: EXTENSION_QUALIFIED_FIXTURE_ROOT
        }
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
    pocket: SemanticRuntimeVerificationPocketKind.SubstrateAndEvaluatorRead,
    proofClass: VerificationProofClassKind.SeamProof,
    verificationBasis: VerificationBasisKind.InventedProductObligation,
    surfaceRefs: [
      SemanticRuntimeSurfaceKind.TypeScriptProjectPort,
      SemanticRuntimeSurfaceKind.SubstrateReader,
      SemanticRuntimeSurfaceKind.EvaluatorReadPort,
      SemanticRuntimeSurfaceKind.SemanticRuntime
    ],
    closureStatusPressure: ClosureStatusKind.Qualified,
    likelyReentryArea: ReentryAreaKind.SubjectOracle,
    expected: {
      qualification: ClaimQualifierKind.WorldOpen,
      closureStatus: ClosureStatusKind.Qualified,
      frontier: WorldParticipationFrontierKind.WorldQualified,
      activeExtensionCount: 1,
      admittedGeneratedVocabularyCount: 0,
      underclosedGeneratedVocabularyCount: 1,
      packageName: "@fixtures/extension-world-qualified"
    },
    actual: {
      qualification: answer.qualification,
      closureStatus: answer.closureStatus,
      frontier: answer.currentWorldPublication?.frontier,
      activeExtensionCount: answer.currentWorldSummary?.activeExtensionCount,
      admittedGeneratedVocabularyCount: answer.currentWorldSummary?.admittedGeneratedVocabularyCount,
      underclosedGeneratedVocabularyCount: answer.currentWorldSummary?.underclosedGeneratedVocabularyCount,
      packageName: answer.currentWorldPublication?.consultedPackage.packageName
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
  assert.equal(answer.currentWorldPublication?.activeExtensions.length, 1);
  assert.equal(answer.currentWorldPublication?.generatedVocabulary.length, 0);
  assert.equal(answer.currentWorldPublication?.underclosedExtensions.length, 1);
});

test("visible but unregistered extension configurations do not widen current-world closure", () => {
  const questionRoute = createQuestionRoute(
    createClaimRoute(ClaimHomeKind.CurrentWorldSummary),
    {
      inquiryEpisode: SemanticInquiryEpisode.CurrentWorldRead,
      readMode: SemanticReadMode.Explain
    }
  );
  const worldFrame = createWorldFrame(47, WorldFrameKind.Current);
  const runtime = new SemanticRuntime(
    {
      introspection: createBufferedSemanticRuntimeIntrospection(),
      typescriptProjectPort: new TypeScriptProjectPort(
        {
          generation: 47,
          projectRoot: EXTENSION_INACTIVE_FIXTURE_ROOT
        }
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
    pocket: SemanticRuntimeVerificationPocketKind.SubstrateAndEvaluatorRead,
    proofClass: VerificationProofClassKind.ContractProof,
    verificationBasis: VerificationBasisKind.InventedProductObligation,
    surfaceRefs: [
      SemanticRuntimeSurfaceKind.TypeScriptProjectPort,
      SemanticRuntimeSurfaceKind.SubstrateReader,
      SemanticRuntimeSurfaceKind.EvaluatorReadPort,
      SemanticRuntimeSurfaceKind.SemanticRuntime
    ],
    closureStatusPressure: ClosureStatusKind.Closed,
    likelyReentryArea: ReentryAreaKind.SubjectOracle,
    expected: {
      qualification: ClaimQualifierKind.None,
      closureStatus: ClosureStatusKind.Closed,
      frontier: WorldParticipationFrontierKind.ClosedBaseline,
      activeExtensionCount: 0,
      admittedGeneratedVocabularyCount: 0,
      underclosedGeneratedVocabularyCount: 0,
      packageName: "@fixtures/extension-world-inactive"
    },
    actual: {
      qualification: answer.qualification,
      closureStatus: answer.closureStatus,
      frontier: answer.currentWorldPublication?.frontier,
      activeExtensionCount: answer.currentWorldSummary?.activeExtensionCount,
      admittedGeneratedVocabularyCount: answer.currentWorldSummary?.admittedGeneratedVocabularyCount,
      underclosedGeneratedVocabularyCount: answer.currentWorldSummary?.underclosedGeneratedVocabularyCount,
      packageName: answer.currentWorldPublication?.consultedPackage.packageName
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
  assert.equal(answer.currentWorldPublication?.activeExtensions.length, 0);
  assert.equal(answer.currentWorldPublication?.generatedVocabulary.length, 0);
  assert.equal(answer.currentWorldPublication?.underclosedExtensions.length, 0);
});
