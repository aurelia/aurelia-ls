import type { Answer } from "../inquiry/answer.js";
import { LensId } from "../inquiry/lens.js";
import { RepoRootLocus } from "../inquiry/locus.js";
import { createAtlasApi } from "../session/index.js";

const api = createAtlasApi({ idleTtlMs: 30_000 });

const status = await api.status();
const mapAnswer = await api.map("playground");
const terrainAnswer = await api.ask({
  lens: LensId.RepoTerrain,
  locus: RepoRootLocus,
  projection: "areas",
});
const selfAnswer = await api.ask({
  lens: LensId.AtlasSelf,
  locus: RepoRootLocus,
  projection: "summary",
});
const followedAnswer = mapAnswer.continuations[0] === undefined
  ? undefined
  : await api.follow(mapAnswer.continuations[0]);

console.log(JSON.stringify({
  world: {
    packageName: status.packageName,
    pid: status.pid,
    terrainAreas: status.world.terrainAreas,
    activeTerrainAreas: status.world.activeTerrainAreas,
    substrates: status.world.substrateContracts,
    lenses: status.world.lensContracts,
    implementedLenses: status.implementedLensIds,
    vocabularyTerms: status.world.vocabularyDefinitions,
  },
  answers: {
    map: summarizeAnswer(mapAnswer),
    terrain: summarizeAnswer(terrainAnswer),
    self: summarizeAnswer(selfAnswer),
    followed: followedAnswer === undefined ? undefined : summarizeAnswer(followedAnswer),
  },
}, null, 2));

/** Return a stable compact summary for playground output. */
function summarizeAnswer(answer: Answer): Record<string, unknown> {
  return {
    outcome: answer.outcome,
    lens: answer.inquiry.lens,
    projection: answer.inquiry.projection,
    summary: answer.summary,
    valueKeys: answer.value === undefined || answer.value === null || typeof answer.value !== "object"
      ? []
      : Object.keys(answer.value),
    basis: answer.basis.map((basis) => basis.kind),
    evidence: answer.evidence.length,
    openSeams: answer.openSeams.map((seam) => seam.kind),
    continuations: answer.continuations.map((continuation) => continuation.inquiry.lens),
  };
}
