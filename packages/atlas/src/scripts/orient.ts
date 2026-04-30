import type { Answer } from "../inquiry/answer.js";
import { createApi } from "../session/index.js";

const api = createApi({ idleTtlMs: 10 * 60 * 1000 });
const orientation = await api.orient();

console.log(JSON.stringify({
  session: {
    packageName: orientation.status.packageName,
    pid: orientation.status.pid,
    buildHash: orientation.status.buildHash,
    uptimeMs: orientation.status.uptimeMs,
    world: orientation.status.world,
    implementedLensIds: orientation.status.implementedLensIds,
  },
  answers: {
    map: summarizeAnswer(orientation.map),
    self: summarizeAnswer(orientation.self),
  },
  continuations: orientation.continuations.map((continuation) => ({
    id: continuation.id,
    kind: continuation.kind,
    priority: continuation.priority,
    lens: continuation.inquiry.lens,
    projection: continuation.inquiry.projection,
    rationale: continuation.rationale,
  })),
}, null, 2));

/** Return a compact, stable answer summary for Codex orientation output. */
function summarizeAnswer(answer: Answer): Record<string, unknown> {
  return {
    outcome: answer.outcome,
    lens: answer.inquiry.lens,
    projection: answer.inquiry.projection,
    summary: answer.summary,
    basis: answer.basis.map((basis) => basis.kind),
    evidence: answer.evidence.length,
    openSeams: answer.openSeams.map((seam) => seam.kind),
    continuations: answer.continuations.length,
  };
}
