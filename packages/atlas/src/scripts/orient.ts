import type { Answer } from "../inquiry/answer.js";
import { createApi } from "../session/index.js";

const api = createApi({ idleTtlMs: 10 * 60 * 1000 });
const orientation = await api.orient();

console.log(JSON.stringify({
  guide: orientation.guide,
  session: {
    packageName: orientation.status.packageName,
    pid: orientation.status.pid,
    buildHash: orientation.status.buildHash,
    uptimeMs: orientation.status.uptimeMs,
    world: summarizeWorld(orientation.status.world),
    implementedLensIds: orientation.status.implementedLensIds,
  },
  answers: {
    map: summarizeAnswer(orientation.map),
    self: summarizeAnswer(orientation.self),
  },
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
    openSeams: answer.openSeams.map((seam) => ({
      id: seam.id,
      kind: seam.kind,
      summary: seam.summary,
    })),
    continuations: answer.continuations.map((continuation) => ({
      id: continuation.id,
      kind: continuation.kind,
      priority: continuation.priority,
      lens: continuation.inquiry.lens,
      projection: continuation.inquiry.projection,
      rationale: continuation.rationale,
    })),
  };
}

/** Return a compact world summary; the full package root list lives in guide.sourceProject. */
function summarizeWorld(world: typeof orientation.status.world): Record<string, unknown> {
  const { sourceProject, ...counts } = world;
  return {
    ...counts,
    sourceProject: {
      snapshotKind: sourceProject.snapshotKind,
      identity: sourceProject.identity,
      packageCount: sourceProject.packageCount,
      rootFileCount: sourceProject.rootFileCount,
      programSourceFileCount: sourceProject.programSourceFileCount,
      ownedSourceFileCount: sourceProject.ownedSourceFileCount,
      declarationCount: sourceProject.declarationCount,
      topLevelDeclarationCount: sourceProject.topLevelDeclarationCount,
      configDiagnosticCount: sourceProject.configDiagnosticCount,
    },
  };
}
