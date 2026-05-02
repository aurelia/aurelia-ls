import { OutcomeKind } from "../inquiry/answer.js";
import { LensId, LensStage } from "../inquiry/lens.js";
import { RepoRootLocus } from "../inquiry/locus.js";
import { NavigationRelation } from "../inquiry/navigation.js";
import { RepoAreaId } from "../inquiry/terrain.js";
import { createApi } from "../session/index.js";
import { SourcePackageId } from "../source/index.js";

const api = createApi({ idleTtlMs: 30_000 });
const mapAnswer = await api.map();
const map = mapAnswer.value;
const status = await api.status();

if (mapAnswer.outcome !== OutcomeKind.Hit || map === undefined) {
  throw new Error("The inquiry API did not return a surface map hit.");
}

if (map.packageName !== "@aurelia-ls/atlas") {
  throw new Error("Unexpected package identity.");
}

if (
  !map.lenses.some(
    (lens) =>
      lens.id === LensId.RepoMap && lens.stage === LensStage.Implemented,
  )
) {
  throw new Error("The active repo.map lens is missing.");
}

if (
  !map.lenses.some(
    (lens) =>
      lens.id === LensId.RepoTerrain && lens.stage === LensStage.Implemented,
  )
) {
  throw new Error("The active repo.terrain lens is missing.");
}

if (
  !map.lenses.some(
    (lens) =>
      lens.id === LensId.AtlasSelf && lens.stage === LensStage.Implemented,
  )
) {
  throw new Error("The active atlas.self lens is missing.");
}

if (
  !map.lenses.some(
    (lens) =>
      lens.id === LensId.FrameworkDiscovery &&
      lens.stage === LensStage.Implemented,
  )
) {
  throw new Error("The active framework.discovery lens is missing.");
}

if (!map.lenses.some((lens) => lens.id === LensId.FrameworkDi)) {
  throw new Error("The planned framework.di lens is missing.");
}

if (
  !map.lenses.some(
    (lens) =>
      lens.id === LensId.FrameworkAdmission &&
      lens.stage === LensStage.Implemented,
  )
) {
  throw new Error("The active framework.admission lens is missing.");
}

if (
  !map.navigation.routes.some(
    (route) => route.relation === NavigationRelation.MirrorTargetOf,
  )
) {
  throw new Error(
    "The navigation grammar must expose auLink mirror target routes.",
  );
}

const navigationRelations = new Set(
  map.navigation.routes.map((route) => route.relation),
);

for (const lens of map.lenses) {
  if (
    lens.stage === LensStage.Implemented &&
    !(await api.isImplemented(lens.id))
  ) {
    throw new Error(
      `Lens ${lens.id} is marked implemented but is missing a runtime implementation.`,
    );
  }

  for (const substrateId of lens.requiredSubstrates) {
    if (!map.substrates.some((substrate) => substrate.id === substrateId)) {
      throw new Error(
        `Lens ${lens.id} requires unknown substrate ${substrateId}.`,
      );
    }
  }
}

const vocabularyKeys = new Set<string>();
for (const definition of map.vocabulary) {
  if (vocabularyKeys.has(definition.key)) {
    throw new Error(`Duplicate Atlas vocabulary key: ${definition.key}`);
  }
  vocabularyKeys.add(definition.key);
}

if (!map.activeTerrain.some((area) => area.id === RepoAreaId.SemanticRuntime)) {
  throw new Error("The semantic-runtime terrain is not active.");
}

if (
  !status.world.sourceProject.packages.some(
    (entry) => entry.id === SourcePackageId.Atlas && entry.sourceFileCount > 0,
  )
) {
  throw new Error(
    "The hot source project did not admit inquiry package source files.",
  );
}

if (
  !status.world.sourceProject.packages.some(
    (entry) =>
      entry.id === SourcePackageId.SemanticRuntime && entry.sourceFileCount > 0,
  )
) {
  throw new Error(
    "The hot source project did not admit semantic-runtime source files.",
  );
}

if (!map.contractShape.outcomes.includes(OutcomeKind.Open)) {
  throw new Error("The answer algebra must keep open seams first-class.");
}

const terrainAnswer = await api.ask({
  lens: LensId.RepoTerrain,
  locus: RepoRootLocus,
  projection: "areas",
});

if (terrainAnswer.outcome !== OutcomeKind.Hit) {
  throw new Error("The repo.terrain runtime lens did not return a hit.");
}

const selfAnswer = await api.ask({
  lens: LensId.AtlasSelf,
  locus: RepoRootLocus,
  projection: "summary",
});

if (
  selfAnswer.outcome !== OutcomeKind.Hit &&
  selfAnswer.outcome !== OutcomeKind.Partial
) {
  throw new Error(
    "The atlas.self runtime lens did not return a coherent maintenance answer.",
  );
}

const selfTaxonomyAnswer = await api.ask({
  lens: LensId.AtlasSelf,
  locus: RepoRootLocus,
  projection: "taxonomy",
});

if (selfTaxonomyAnswer.outcome !== OutcomeKind.Hit) {
  throw new Error("The atlas.self taxonomy projection did not return a hit.");
}

const selfTaxonomyValue = selfTaxonomyAnswer.value as
  | {
      readonly taxonomy?: {
        readonly rollup?: {
          readonly enumCount?: number;
          readonly relationshipSurfaceCount?: number;
        };
      };
    }
  | undefined;
if ((selfTaxonomyValue?.taxonomy?.rollup?.enumCount ?? 0) === 0) {
  throw new Error(
    "The atlas.self taxonomy projection did not index Atlas enum declarations.",
  );
}
if (
  (selfTaxonomyValue?.taxonomy?.rollup?.relationshipSurfaceCount ?? 0) === 0
) {
  throw new Error(
    "The atlas.self taxonomy projection did not index relationship-like surfaces.",
  );
}

const selfRowSurfaceAnswer = await api.ask({
  lens: LensId.AtlasSelf,
  locus: RepoRootLocus,
  projection: "row-surfaces",
  filters: { query: "AtlasSelfContinuationRow", surfaceKind: "row" },
  budget: { rows: 5, evidencePerSubject: 1 },
});

if (selfRowSurfaceAnswer.outcome !== OutcomeKind.Hit) {
  throw new Error(
    "The atlas.self row-surface projection did not return AtlasSelfContinuationRow.",
  );
}

const selfRowSurfaceRows =
  (
    selfRowSurfaceAnswer.value as
      | {
          readonly rowSurfaces?: readonly {
            readonly name: string;
            readonly surfaceKind: string;
            readonly hasRelation: boolean;
          }[];
        }
      | undefined
  )?.rowSurfaces ?? [];
if (
  !selfRowSurfaceRows.some(
    (row) =>
      row.name === "AtlasSelfContinuationRow" &&
      row.surfaceKind === "row" &&
      !row.hasRelation,
  )
) {
  throw new Error(
    "The atlas.self row-surface projection conflated AtlasSelfContinuationRow with relationship surfaces.",
  );
}

const frameworkEntitySurfaceAnswer = await api.ask({
  lens: LensId.AtlasSelf,
  locus: RepoRootLocus,
  projection: "row-surfaces",
  filters: { query: "FrameworkDiscoveryValue", surfaceKind: "row" },
  budget: { rows: 5, evidencePerSubject: 1 },
});

if (frameworkEntitySurfaceAnswer.outcome !== OutcomeKind.Hit) {
  throw new Error(
    "The atlas.self row-surface projection did not return FrameworkDiscoveryValue.",
  );
}

const frameworkEntitySurfaceRows =
  (
    frameworkEntitySurfaceAnswer.value as
      | {
          readonly rowSurfaces?: readonly {
            readonly name: string;
            readonly source: { readonly filePath: string };
          }[];
        }
      | undefined
  )?.rowSurfaces ?? [];
if (
  !frameworkEntitySurfaceRows.some(
    (row) =>
      row.name === "FrameworkDiscoveryValue" &&
      row.source.filePath.endsWith("framework-entities.ts"),
  )
) {
  throw new Error(
    "Framework discovery answer values should stay in framework-entities.ts instead of collapsing back into lens code.",
  );
}

const selfClassSurfaceAnswer = await api.ask({
  lens: LensId.AtlasSelf,
  locus: RepoRootLocus,
  projection: "classes",
  filters: { className: "AtlasSelfAnalysisBuilder", methodName: "build" },
  budget: { rows: 5, evidencePerSubject: 1 },
});

if (selfClassSurfaceAnswer.outcome !== OutcomeKind.Hit) {
  throw new Error(
    "The atlas.self class-surface projection did not return AtlasSelfAnalysisBuilder.",
  );
}

const selfClassSurfaceRows =
  (
    selfClassSurfaceAnswer.value as
      | {
          readonly classSurfaces?: readonly {
            readonly name: string;
            readonly methods: readonly string[];
            readonly constructorCount: number;
          }[];
        }
      | undefined
  )?.classSurfaces ?? [];
if (
  !selfClassSurfaceRows.some(
    (row) =>
      row.name === "AtlasSelfAnalysisBuilder" &&
      row.methods.includes("build") &&
      row.constructorCount > 0,
  )
) {
  throw new Error(
    "The atlas.self class-surface projection did not expose AtlasSelfAnalysisBuilder.build.",
  );
}

const selfAnswererClassAnswer = await api.ask({
  lens: LensId.AtlasSelf,
  locus: RepoRootLocus,
  projection: "classes",
  filters: { className: "AtlasSelfAnswerer", methodName: "answer" },
  budget: { rows: 5, evidencePerSubject: 1 },
});

if (selfAnswererClassAnswer.outcome !== OutcomeKind.Hit) {
  throw new Error(
    "The atlas.self class-surface projection did not return AtlasSelfAnswerer.",
  );
}

const frameworkAnswererClassAnswer = await api.ask({
  lens: LensId.AtlasSelf,
  locus: RepoRootLocus,
  projection: "classes",
  filters: { query: "Framework", methodName: "answer" },
  budget: { rows: 20, evidencePerSubject: 1 },
});

if (frameworkAnswererClassAnswer.outcome !== OutcomeKind.Hit) {
  throw new Error(
    "The atlas.self class-surface projection did not return framework answerers.",
  );
}

const frameworkAnswererRows =
  (
    frameworkAnswererClassAnswer.value as
      | {
          readonly classSurfaces?: readonly {
            readonly name: string;
            readonly methods: readonly string[];
          }[];
        }
      | undefined
  )?.classSurfaces ?? [];
if (
  !frameworkAnswererRows.some(
    (row) =>
      row.name === "FrameworkDiscoveryAnswerer" &&
      row.methods.includes("answer"),
  )
) {
  throw new Error(
    "The atlas.self class-surface projection did not expose FrameworkDiscoveryAnswerer.answer.",
  );
}
if (
  !frameworkAnswererRows.some(
    (row) =>
      row.name === "FrameworkRenderingAnswerer" &&
      row.methods.includes("answer"),
  )
) {
  throw new Error(
    "The atlas.self class-surface projection did not expose FrameworkRenderingAnswerer.answer.",
  );
}

const selfFunctionSurfaceAnswer = await api.ask({
  lens: LensId.AtlasSelf,
  locus: RepoRootLocus,
  projection: "functions",
  filters: { functionName: "answerSelf", functionKind: "top-level" },
  budget: { rows: 5, evidencePerSubject: 1 },
});

if (selfFunctionSurfaceAnswer.outcome !== OutcomeKind.Hit) {
  throw new Error(
    "The atlas.self function-surface projection did not return answerSelf.",
  );
}

const selfFunctionSurfaceRows =
  (
    selfFunctionSurfaceAnswer.value as
      | {
          readonly functionSurfaces?: readonly {
            readonly name: string;
            readonly functionKind: string;
            readonly filePath: string;
          }[];
        }
      | undefined
  )?.functionSurfaces ?? [];
if (
  !selfFunctionSurfaceRows.some(
    (row) =>
      row.name === "answerSelf" &&
      row.functionKind === "top-level" &&
      row.filePath.endsWith("lenses.ts"),
  )
) {
  throw new Error(
    "The atlas.self function-surface projection did not expose answerSelf as a top-level function.",
  );
}

const selfContractAnswer = await api.ask({
  lens: LensId.AtlasSelf,
  locus: RepoRootLocus,
  projection: "contracts",
  filters: { lensId: "atlas.self" },
  budget: { rows: 5, evidencePerSubject: 1 },
});

if (selfContractAnswer.outcome !== OutcomeKind.Hit) {
  throw new Error(
    "The atlas.self contract projection did not return atlas.self.",
  );
}

const selfContractRows =
  (
    selfContractAnswer.value as
      | {
          readonly contracts?: readonly {
            readonly lensId: string;
            readonly implementationFunction: string | null;
            readonly observedProjectionIds: readonly string[];
            readonly extraRuntimeProjectionIds: readonly string[];
          }[];
        }
      | undefined
  )?.contracts ?? [];
if (
  !selfContractRows.some(
    (row) =>
      row.lensId === "atlas.self" &&
      row.implementationFunction === "answerSelf" &&
      row.observedProjectionIds.includes("contracts") &&
      row.extraRuntimeProjectionIds.length === 0,
  )
) {
  throw new Error(
    "The atlas.self contract projection did not join atlas.self to answerSelf and observed projection branches.",
  );
}

const selfContinuationAnswer = await api.ask({
  lens: LensId.AtlasSelf,
  locus: RepoRootLocus,
  projection: "continuations",
  filters: { lensId: "atlas.self" },
  budget: { rows: 10, evidencePerSubject: 1 },
});

if (selfContinuationAnswer.outcome !== OutcomeKind.Hit) {
  throw new Error(
    "The atlas.self continuation projection did not return atlas.self continuations.",
  );
}

const selfContinuationRows =
  (
    selfContinuationAnswer.value as
      | {
          readonly continuationRows?: readonly {
            readonly kind: string | null;
            readonly targetLens: string | null;
            readonly targetProjection: string | null;
            readonly lensIds: readonly string[];
          }[];
        }
      | undefined
  )?.continuationRows ?? [];
if (
  !selfContinuationRows.some(
    (row) =>
      row.kind === "InspectEvidence" &&
      row.targetLens === "TsSource" &&
      row.targetProjection === "text" &&
      row.lensIds.includes("atlas.self"),
  )
) {
  throw new Error(
    "The atlas.self continuation projection did not expose source inspection continuations.",
  );
}

const selfModuleAnswer = await api.ask({
  lens: LensId.AtlasSelf,
  locus: RepoRootLocus,
  projection: "modules",
  filters: { crossesArea: true },
  budget: { rows: 10, evidencePerSubject: 1 },
});

if (selfModuleAnswer.outcome !== OutcomeKind.Hit) {
  throw new Error(
    "The atlas.self module projection did not return cross-area module dependencies.",
  );
}

const selfModuleRows =
  (
    selfModuleAnswer.value as
      | {
          readonly moduleDependencies?: readonly {
            readonly fromArea: string;
            readonly toArea: string | null;
            readonly crossesArea: boolean;
          }[];
        }
      | undefined
  )?.moduleDependencies ?? [];
if (
  !selfModuleRows.some((row) => row.crossesArea && row.fromArea !== row.toArea)
) {
  throw new Error(
    "The atlas.self module projection did not classify cross-area dependencies.",
  );
}

const selfIndexAnswer = await api.ask({
  lens: LensId.AtlasSelf,
  locus: RepoRootLocus,
  projection: "indexes",
  filters: { query: "FRAMEWORK_DI_RELATIONSHIP_CACHE_FAMILY_VERSION" },
  budget: { rows: 5, evidencePerSubject: 1 },
});

if (selfIndexAnswer.outcome !== OutcomeKind.Hit) {
  throw new Error(
    "The atlas.self index projection did not return framework DI cache schema provenance.",
  );
}

const selfIndexRows =
  (
    selfIndexAnswer.value as
      | {
          readonly indexProvenance?: readonly {
            readonly name: string;
            readonly kind: string;
            readonly value: string | null;
          }[];
        }
      | undefined
  )?.indexProvenance ?? [];
if (
  !selfIndexRows.some(
    (row) =>
      row.name === "FRAMEWORK_DI_RELATIONSHIP_CACHE_FAMILY_VERSION" &&
      row.kind === "schema-version" &&
      row.value !== null,
  )
) {
  throw new Error(
    "The atlas.self index projection did not classify framework DI cache schema version.",
  );
}

const selfContractStringAnswer = await api.ask({
  lens: LensId.AtlasSelf,
  locus: RepoRootLocus,
  projection: "contract-strings",
  filters: { class: "lens-id" },
  budget: { rows: 20, evidencePerSubject: 1 },
});

if (selfContractStringAnswer.outcome !== OutcomeKind.Hit) {
  throw new Error(
    "The atlas.self contract-string projection did not return lens id strings.",
  );
}

const selfContractStringRows =
  (
    selfContractStringAnswer.value as
      | {
          readonly contractStrings?: readonly {
            readonly value: string;
            readonly classes: readonly string[];
          }[];
        }
      | undefined
  )?.contractStrings ?? [];
if (
  !selfContractStringRows.some(
    (row) => row.value === "atlas.self" && row.classes.includes("lens-id"),
  )
) {
  throw new Error(
    "The atlas.self contract-string projection did not classify atlas.self as a lens id.",
  );
}

const frameworkDiscoveryAnswer = await api.ask({
  lens: LensId.FrameworkDiscovery,
  locus: RepoRootLocus,
  projection: "anchors",
  filters: { packageId: "runtime-html" },
  budget: { rows: 3 },
});

if (frameworkDiscoveryAnswer.outcome !== OutcomeKind.Hit) {
  throw new Error(
    "The framework.discovery runtime lens did not return seed anchors.",
  );
}

const frameworkDiscoveryValue = frameworkDiscoveryAnswer.value as
  | { readonly anchorResolution?: { readonly resolved?: number } }
  | undefined;
if ((frameworkDiscoveryValue?.anchorResolution?.resolved ?? 0) === 0) {
  throw new Error(
    "The framework.discovery lens did not resolve any seed anchors through the source index.",
  );
}

if (
  !frameworkDiscoveryAnswer.continuations.some(
    (continuation) =>
      continuation.route?.relation === NavigationRelation.SourceFor,
  )
) {
  throw new Error(
    "The framework.discovery lens must expose source navigation route claims.",
  );
}

const frameworkDiProviderAnswer = await api.ask({
  lens: LensId.FrameworkDi,
  locus: RepoRootLocus,
  projection: "providers",
  filters: { query: "IHttpClient" },
  budget: { rows: 5, evidencePerSubject: 1 },
});

if (frameworkDiProviderAnswer.outcome !== OutcomeKind.Hit) {
  throw new Error(
    "The framework.di lens did not return provider relationship atoms.",
  );
}

const frameworkDiProviderRows =
  (
    frameworkDiProviderAnswer.value as
      | {
          readonly relationships?: readonly {
            readonly relation: string;
            readonly key?: string;
            readonly value?: string;
            readonly to: { readonly expression?: { readonly type?: string } };
          }[];
        }
      | undefined
  )?.relationships ?? [];
if (
  !frameworkDiProviderRows.some(
    (row) =>
      row.relation === "aliases-key" &&
      row.key === "IHttpClient" &&
      row.value === "HttpClient" &&
      row.to.expression?.type === "typeof HttpClient",
  )
) {
  throw new Error(
    "The framework.di provider projection did not expose fetch-client:IHttpClient -> HttpClient.",
  );
}

const frameworkMaterializationAnswer = await api.ask({
  lens: LensId.FrameworkMaterialization,
  locus: RepoRootLocus,
  projection: "routes",
  filters: { key: "IHttpClient" },
  budget: { rows: 5, evidencePerSubject: 1 },
});

if (frameworkMaterializationAnswer.outcome !== OutcomeKind.Hit) {
  throw new Error(
    "The framework.materialization lens did not return DI provider routes.",
  );
}

const frameworkMaterializationRows =
  (
    frameworkMaterializationAnswer.value as
      | {
          readonly routes?: readonly {
            readonly key: string;
            readonly routeKind: string;
            readonly providerType?: string;
          }[];
        }
      | undefined
  )?.routes ?? [];
if (
  !frameworkMaterializationRows.some(
    (row) =>
      row.key === "IHttpClient" &&
      row.routeKind === "alias-delegation" &&
      row.providerType === "typeof HttpClient",
  )
) {
  throw new Error(
    "The framework.materialization route projection did not expose IHttpClient alias delegation.",
  );
}

const frameworkMaterializationDependencyAnswer = await api.ask({
  lens: LensId.FrameworkMaterialization,
  locus: RepoRootLocus,
  projection: "dependencies",
  filters: { key: "IEventTarget" },
  budget: { rows: 10, evidencePerSubject: 1 },
});

if (frameworkMaterializationDependencyAnswer.outcome !== OutcomeKind.Hit) {
  throw new Error(
    "The framework.materialization lens did not return callback dependency rows.",
  );
}

const frameworkMaterializationDependencyRows =
  (
    frameworkMaterializationDependencyAnswer.value as
      | {
          readonly dependencies?: readonly {
            readonly key: string;
            readonly access: string;
            readonly dependencyKey: string;
            readonly policy: string;
            readonly certainty: string;
          }[];
        }
      | undefined
  )?.dependencies ?? [];
if (
  !frameworkMaterializationDependencyRows.some(
    (row) =>
      row.key === "IEventTarget" &&
      row.access === "get" &&
      row.dependencyKey === "IPlatform" &&
      row.policy === "direct" &&
      row.certainty === "unconditional",
  )
) {
  throw new Error(
    "The framework.materialization dependency projection did not expose IEventTarget -> IPlatform.",
  );
}
if (
  !frameworkMaterializationDependencyRows.some(
    (row) =>
      row.key === "IEventTarget" &&
      row.access === "get" &&
      row.dependencyKey === "IAppRoot" &&
      row.policy === "guarded" &&
      row.certainty === "potential",
  )
) {
  throw new Error(
    "The framework.materialization dependency projection did not classify IEventTarget -> IAppRoot as guarded.",
  );
}

const frameworkMaterializationRelationshipAnswer = await api.ask({
  lens: LensId.FrameworkMaterialization,
  locus: RepoRootLocus,
  projection: "relationships",
  filters: {
    key: "IEventTarget",
    relation: "depends-on-key",
    dependencyKey: "IPlatform",
  },
  budget: { rows: 10, evidencePerSubject: 1 },
});

if (frameworkMaterializationRelationshipAnswer.outcome !== OutcomeKind.Hit) {
  throw new Error(
    "The framework.materialization lens did not return callback dependency relationship rows.",
  );
}

const frameworkMaterializationRelationshipRows =
  (
    frameworkMaterializationRelationshipAnswer.value as
      | {
          readonly relationships?: readonly {
            readonly key: string;
            readonly relation: string;
            readonly to: { readonly name: string };
            readonly policy?: string;
            readonly certainty?: string;
          }[];
        }
      | undefined
  )?.relationships ?? [];
if (
  !frameworkMaterializationRelationshipRows.some(
    (row) =>
      row.key === "IEventTarget" &&
      row.relation === "depends-on-key" &&
      row.to.name === "IPlatform" &&
      row.policy === "direct" &&
      row.certainty === "unconditional",
  )
) {
  throw new Error(
    "The framework.materialization relationship projection did not expose IEventTarget depends-on-key IPlatform.",
  );
}

const frameworkAdmissionAnswer = await api.ask({
  lens: LensId.FrameworkAdmission,
  locus: RepoRootLocus,
  projection: "relationships",
  filters: { packageId: "runtime-html", exportName: "StandardConfiguration" },
  budget: { rows: 100, evidencePerSubject: 2 },
});

if (frameworkAdmissionAnswer.outcome !== OutcomeKind.Hit) {
  throw new Error(
    "The framework.admission lens did not return StandardConfiguration admission relationships.",
  );
}

const frameworkAdmissionRows =
  (
    frameworkAdmissionAnswer.value as
      | {
          readonly relationships?: readonly {
            readonly relation: string;
            readonly mechanism: string;
            readonly to: {
              readonly name: string;
              readonly resourceKind?: string;
            };
          }[];
        }
      | undefined
  )?.relationships ?? [];
if (
  !frameworkAdmissionRows.some(
    (row) =>
      row.relation === "admits-di-key" &&
      row.to.name === "ICoercionConfiguration" &&
      row.mechanism === "registration-helper",
  )
) {
  throw new Error(
    "The framework.admission lens did not expose StandardConfiguration -> ICoercionConfiguration.",
  );
}
if (
  !frameworkAdmissionRows.some(
    (row) =>
      row.relation === "admits-resource" &&
      row.to.name === "DebounceBindingBehavior" &&
      row.to.resourceKind === "binding-behavior",
  )
) {
  throw new Error(
    "The framework.admission lens did not expose StandardConfiguration -> DebounceBindingBehavior.",
  );
}

const frameworkCallEdgesAnswer = await api.ask({
  lens: LensId.FrameworkDiscovery,
  locus: RepoRootLocus,
  projection: "call-edges",
  filters: { flow: "world-formation" },
  budget: { rows: 3 },
});

if (frameworkCallEdgesAnswer.outcome !== OutcomeKind.Hit) {
  throw new Error(
    "The framework.discovery lens did not return precomputed world-formation call edges.",
  );
}

const frameworkCallTargetsAnswer = await api.ask({
  lens: LensId.FrameworkDiscovery,
  locus: RepoRootLocus,
  projection: "call-targets",
  filters: { flow: "world-formation", direction: "outgoing" },
  budget: { rows: 3 },
});

if (frameworkCallTargetsAnswer.outcome !== OutcomeKind.Hit) {
  throw new Error(
    "The framework.discovery lens did not return grouped world-formation call targets.",
  );
}

const frameworkObserverAnswer = await api.ask({
  lens: LensId.FrameworkDiscovery,
  locus: RepoRootLocus,
  projection: "observers",
  filters: { observerKind: "observer-locator" },
  budget: { rows: 10, evidencePerSubject: 2 },
});

if (frameworkObserverAnswer.outcome !== OutcomeKind.Hit) {
  throw new Error(
    "The framework.discovery lens did not return observer-locator entity rows.",
  );
}

const frameworkObserverRows =
  (
    frameworkObserverAnswer.value as
      | {
          readonly observers?: readonly {
            readonly packageId: string;
            readonly exportEntry: { readonly exportName: string };
          }[];
        }
      | undefined
  )?.observers ?? [];
if (
  !frameworkObserverRows.some(
    (row) =>
      row.packageId === "runtime" &&
      row.exportEntry.exportName === "IObserverLocator",
  )
) {
  throw new Error(
    "The framework.discovery observer catalog did not include runtime:IObserverLocator.",
  );
}
if (
  !frameworkObserverRows.some(
    (row) =>
      row.packageId === "runtime" &&
      row.exportEntry.exportName === "ObserverLocator",
  )
) {
  throw new Error(
    "The framework.discovery observer catalog did not include runtime:ObserverLocator.",
  );
}

const frameworkAppTaskAnswer = await api.ask({
  lens: LensId.FrameworkDiscovery,
  locus: RepoRootLocus,
  projection: "app-tasks",
  filters: { appTaskKind: "app-task-factory" },
  budget: { rows: 10, evidencePerSubject: 1 },
});
if (frameworkAppTaskAnswer.outcome !== OutcomeKind.Hit) {
  throw new Error(
    "The framework.discovery lens did not return AppTask entity rows.",
  );
}
const frameworkAppTaskRows =
  (
    frameworkAppTaskAnswer.value as
      | {
          readonly appTasks?: readonly {
            readonly packageId: string;
            readonly exportEntry: { readonly exportName: string };
          }[];
        }
      | undefined
  )?.appTasks ?? [];
if (
  !frameworkAppTaskRows.some(
    (row) =>
      row.packageId === "runtime-html" &&
      row.exportEntry.exportName === "AppTask",
  )
) {
  throw new Error(
    "The framework.discovery AppTask catalog did not include runtime-html:AppTask.",
  );
}

const frameworkRouterAnswer = await api.ask({
  lens: LensId.FrameworkDiscovery,
  locus: RepoRootLocus,
  projection: "router-entities",
  filters: { routerKind: "router" },
  budget: { rows: 20, evidencePerSubject: 1 },
});
if (frameworkRouterAnswer.outcome !== OutcomeKind.Hit) {
  throw new Error(
    "The framework.discovery lens did not return router entity rows.",
  );
}
const frameworkRouterRows =
  (
    frameworkRouterAnswer.value as
      | {
          readonly routerEntities?: readonly {
            readonly packageId: string;
            readonly exportEntry: { readonly exportName: string };
          }[];
        }
      | undefined
  )?.routerEntities ?? [];
if (
  !frameworkRouterRows.some(
    (row) =>
      row.packageId === "router" && row.exportEntry.exportName === "Router",
  )
) {
  throw new Error(
    "The framework.discovery router catalog did not include router:Router.",
  );
}

const frameworkExpressionAnswer = await api.ask({
  lens: LensId.FrameworkDiscovery,
  locus: RepoRootLocus,
  projection: "expression-entities",
  filters: { expressionKind: "parser" },
  budget: { rows: 20, evidencePerSubject: 1 },
});
if (frameworkExpressionAnswer.outcome !== OutcomeKind.Hit) {
  throw new Error(
    "The framework.discovery lens did not return expression entity rows.",
  );
}
const frameworkExpressionRows =
  (
    frameworkExpressionAnswer.value as
      | {
          readonly expressionEntities?: readonly {
            readonly packageId: string;
            readonly exportEntry: { readonly exportName: string };
          }[];
        }
      | undefined
  )?.expressionEntities ?? [];
if (
  !frameworkExpressionRows.some(
    (row) =>
      row.packageId === "expression-parser" &&
      row.exportEntry.exportName === "ExpressionParser",
  )
) {
  throw new Error(
    "The framework.discovery expression catalog did not include expression-parser:ExpressionParser.",
  );
}

const frameworkRenderingStructureAnswer = await api.ask({
  lens: LensId.FrameworkDiscovery,
  locus: RepoRootLocus,
  projection: "rendering-structures",
  filters: { renderingStructureKind: "view-factory" },
  budget: { rows: 20, evidencePerSubject: 1 },
});
if (frameworkRenderingStructureAnswer.outcome !== OutcomeKind.Hit) {
  throw new Error(
    "The framework.discovery lens did not return rendering structure entity rows.",
  );
}
const frameworkRenderingStructureRows =
  (
    frameworkRenderingStructureAnswer.value as
      | {
          readonly renderingStructures?: readonly {
            readonly packageId: string;
            readonly exportEntry: { readonly exportName: string };
          }[];
        }
      | undefined
  )?.renderingStructures ?? [];
if (
  !frameworkRenderingStructureRows.some(
    (row) =>
      row.packageId === "runtime-html" &&
      row.exportEntry.exportName === "ViewFactory",
  )
) {
  throw new Error(
    "The framework.discovery rendering structure catalog did not include runtime-html:ViewFactory.",
  );
}

for (const continuation of frameworkDiscoveryAnswer.continuations) {
  if (
    continuation.route !== undefined &&
    !navigationRelations.has(continuation.route.relation)
  ) {
    throw new Error(
      `Continuation ${
        continuation.id ?? continuation.kind
      } claims undeclared route relation ${continuation.route.relation}.`,
    );
  }
}

for (const continuation of frameworkCallEdgesAnswer.continuations) {
  if (
    continuation.route !== undefined &&
    !navigationRelations.has(continuation.route.relation)
  ) {
    throw new Error(
      `Framework call-edge continuation ${
        continuation.id ?? continuation.kind
      } claims undeclared route relation ${continuation.route.relation}.`,
    );
  }
}

for (const continuation of frameworkCallTargetsAnswer.continuations) {
  if (
    continuation.route !== undefined &&
    !navigationRelations.has(continuation.route.relation)
  ) {
    throw new Error(
      `Framework call-target continuation ${
        continuation.id ?? continuation.kind
      } claims undeclared route relation ${continuation.route.relation}.`,
    );
  }
}

for (const continuation of frameworkObserverAnswer.continuations) {
  if (
    continuation.route !== undefined &&
    !navigationRelations.has(continuation.route.relation)
  ) {
    throw new Error(
      `Framework observer continuation ${
        continuation.id ?? continuation.kind
      } claims undeclared route relation ${continuation.route.relation}.`,
    );
  }
}

for (const continuation of frameworkAdmissionAnswer.continuations) {
  if (
    continuation.route !== undefined &&
    !navigationRelations.has(continuation.route.relation)
  ) {
    throw new Error(
      `Framework admission continuation ${
        continuation.id ?? continuation.kind
      } claims undeclared route relation ${continuation.route.relation}.`,
    );
  }
}

for (const answer of [
  frameworkAppTaskAnswer,
  frameworkRouterAnswer,
  frameworkExpressionAnswer,
  frameworkRenderingStructureAnswer,
]) {
  for (const continuation of answer.continuations) {
    if (
      continuation.route !== undefined &&
      !navigationRelations.has(continuation.route.relation)
    ) {
      throw new Error(
        `Framework catalog continuation ${
          continuation.id ?? continuation.kind
        } claims undeclared route relation ${continuation.route.relation}.`,
      );
    }
  }
}

const firstContinuation = mapAnswer.continuations[0];
if (firstContinuation === undefined) {
  throw new Error("The surface map must expose at least one continuation.");
}

for (const continuation of mapAnswer.continuations) {
  if (
    continuation.route !== undefined &&
    !navigationRelations.has(continuation.route.relation)
  ) {
    throw new Error(
      `Surface-map continuation ${
        continuation.id ?? continuation.kind
      } claims undeclared route relation ${continuation.route.relation}.`,
    );
  }
}

const followedAnswer = await api.follow(firstContinuation);
if (
  followedAnswer.outcome !== OutcomeKind.Hit &&
  followedAnswer.outcome !== OutcomeKind.Partial
) {
  throw new Error(
    "The inquiry API could not follow a surface-map continuation.",
  );
}

console.log(
  `atlas self-check passed through session ${status.pid}: ${map.lenses.length} lens contract(s), ${map.substrates.length} substrate contract(s), ${map.terrain.length} terrain area(s), ${map.vocabulary.length} vocabulary definition(s), ${map.navigation.routes.length} navigation route(s).`,
);
