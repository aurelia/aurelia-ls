import { OutcomeKind } from "../inquiry/answer.js";
import { LensId, LensStage } from "../inquiry/lens.js";
import { createApi } from "../session/index.js";

const api = createApi({ idleTtlMs: 30_000 });

const mapAnswer = await api.map("script-self-check");
const map = mapAnswer.value;
const sessionCheck = await api.selfCheck();

if (mapAnswer.outcome !== OutcomeKind.Hit || map === undefined) {
  throw new Error("Atlas did not return a surface map hit.");
}

if (map.packageName !== "@aurelia-ls/atlas") {
  throw new Error("Unexpected Atlas package identity.");
}

for (const lens of map.lenses) {
  if (
    lens.stage === LensStage.Implemented &&
    !(await api.isImplemented(lens.id))
  ) {
    throw new Error(
      `Lens ${lens.id} is marked implemented but has no runtime implementation.`,
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

for (const requiredLens of [
  LensId.RepoMap,
  LensId.RepoTerrain,
  LensId.AtlasSelf,
  LensId.FrameworkDiscovery,
  LensId.FrameworkDi,
  LensId.FrameworkAdmission,
] as const) {
  if (
    !map.lenses.some(
      (lens) =>
        lens.id === requiredLens && lens.stage === LensStage.Implemented,
    )
  ) {
    throw new Error(`Required Atlas lens ${requiredLens} is not implemented.`);
  }
}

if (sessionCheck.mapOutcome !== OutcomeKind.Hit) {
  throw new Error("Session self-check did not return a map hit.");
}

if (sessionCheck.terrainOutcome !== OutcomeKind.Hit) {
  throw new Error("Session self-check did not return a terrain hit.");
}

if (
  sessionCheck.selfOutcome !== OutcomeKind.Hit &&
  sessionCheck.selfOutcome !== OutcomeKind.Partial
) {
  throw new Error("Session self-check did not return a coherent self answer.");
}

console.log(
  `atlas self-check passed through session ${sessionCheck.status.pid}: ${map.lenses.length} lens contract(s), ${map.substrates.length} substrate contract(s), ${map.terrain.length} terrain area(s), ${map.vocabulary.length} vocabulary definition(s), ${map.navigation.routes.length} navigation route(s).`,
);
