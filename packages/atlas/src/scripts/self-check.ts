import { OutcomeKind } from "../inquiry/answer.js";
import { LensId, LensStage } from "../inquiry/lens.js";
import { RepoRootLocus } from "../inquiry/locus.js";
import { RepoAreaId } from "../inquiry/terrain.js";
import { createAtlasApi } from "../session/index.js";

const api = createAtlasApi({ idleTtlMs: 30_000 });
const mapAnswer = await api.map();
const map = mapAnswer.value;
const status = await api.status();

if (mapAnswer.outcome !== OutcomeKind.Hit || map === undefined) {
  throw new Error("The inquiry API did not return a surface map hit.");
}

if (map.packageName !== "@aurelia-ls/atlas") {
  throw new Error("Unexpected package identity.");
}

if (!map.lenses.some((lens) => lens.id === LensId.RepoMap && lens.stage === LensStage.Implemented)) {
  throw new Error("The active repo.map lens is missing.");
}

if (!map.lenses.some((lens) => lens.id === LensId.RepoTerrain && lens.stage === LensStage.Implemented)) {
  throw new Error("The active repo.terrain lens is missing.");
}

if (!map.lenses.some((lens) => lens.id === LensId.AtlasSelf && lens.stage === LensStage.Implemented)) {
  throw new Error("The active atlas.self lens is missing.");
}

if (!map.lenses.some((lens) => lens.id === LensId.FrameworkDi)) {
  throw new Error("The planned framework.di lens is missing.");
}

for (const lens of map.lenses) {
  if (lens.stage === LensStage.Implemented && !(await api.isImplemented(lens.id))) {
    throw new Error(`Lens ${lens.id} is marked implemented but is missing a runtime implementation.`);
  }

  for (const substrateId of lens.requiredSubstrates) {
    if (!map.substrates.some((substrate) => substrate.id === substrateId)) {
      throw new Error(`Lens ${lens.id} requires unknown substrate ${substrateId}.`);
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

if (!map.activeTerrain.some((area) => area.id === RepoAreaId.SourceAnalysisAurelia)) {
  throw new Error("The source-analysis aurelia terrain is not active.");
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

if (selfAnswer.outcome !== OutcomeKind.Hit && selfAnswer.outcome !== OutcomeKind.Partial) {
  throw new Error("The atlas.self runtime lens did not return a coherent maintenance answer.");
}

const firstContinuation = mapAnswer.continuations[0];
if (firstContinuation === undefined) {
  throw new Error("The surface map must expose at least one continuation.");
}

const followedAnswer = await api.follow(firstContinuation);
if (followedAnswer.outcome !== OutcomeKind.Hit && followedAnswer.outcome !== OutcomeKind.Partial) {
  throw new Error("The inquiry API could not follow a surface-map continuation.");
}

console.log(
  `atlas self-check passed through session ${status.pid}: ${map.lenses.length} lens contract(s), ${map.substrates.length} substrate contract(s), ${map.terrain.length} terrain area(s), ${map.vocabulary.length} vocabulary definition(s).`,
);
