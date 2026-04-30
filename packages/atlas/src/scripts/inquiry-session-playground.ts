import { LensId } from "../inquiry/lens.js";
import { RepoRootLocus } from "../inquiry/locus.js";
import { createApi } from "../session/index.js";

const api = createApi({
  idleTtlMs: 30_000,
  startupTimeoutMs: 10_000,
});
const firstStatus = await api.status();
const secondStatus = await api.status();
const mapAnswer = await api.map("session-playground");
const terrainAnswer = await api.ask({
  lens: LensId.RepoTerrain,
  locus: RepoRootLocus,
  projection: "areas",
});
const selfCheck = await api.selfCheck();
const followedAnswer = mapAnswer.continuations[0] === undefined
  ? undefined
  : await api.follow(mapAnswer.continuations[0]);
const shutdown = await api.shutdown("session playground complete");

console.log(JSON.stringify({
  reusedPid: firstStatus.pid === secondStatus.pid,
  status: {
    pid: secondStatus.pid,
    buildHash: secondStatus.buildHash,
    endpoint: secondStatus.endpoint,
    world: secondStatus.world,
    implementedLensIds: secondStatus.implementedLensIds,
  },
  answers: {
    mapOutcome: mapAnswer.outcome,
    terrainOutcome: terrainAnswer.outcome,
    followedOutcome: followedAnswer?.outcome,
    selfCheck,
  },
  shutdown,
}, null, 2));
