import type {
  CompilerConservationCase,
  CompilerObligationWitness,
  CompilerObligationWitnessRole,
} from "./compiler-case.js";
import type {
  CompilerObligationAuditDisposition,
  CompilerObligationCatalogEntry,
  CompilerObligationFamily,
} from "./compiler-obligation-audit.js";

export interface CompilerObligationCaseWitness {
  readonly caseId: string;
  readonly evidenceKind: "compiler-world" | "validated-evidence";
  readonly role: CompilerObligationWitnessRole;
  readonly summary: string;
  readonly closureEvidence: CompilerObligationWitness["closureEvidence"] | null;
}

/** Successful claim ids from an authority/currentness-validated execution receipt. */
export interface CompilerEvaluatedCaseEvidence {
  readonly caseId: string;
  readonly satisfiedClaimIds: readonly string[];
}

export type CompilerObligationCoverageState =
  | "unwitnessed"
  | "witnessed-not-claimed"
  | "witnessed-open"
  | "witnessed-closed";

/** One obligation with its independent audit axes and executable witnesses kept side by side. */
export interface CompilerObligationCoverageRow {
  readonly id: string;
  readonly family: CompilerObligationFamily;
  readonly requirement: string;
  readonly state: CompilerObligationCoverageState;
  readonly disposition: CompilerObligationAuditDisposition;
  readonly witnesses: readonly CompilerObligationCaseWitness[];
}

export interface CompilerObligationFamilyCoverage {
  readonly family: CompilerObligationFamily;
  readonly obligationCount: number;
  readonly witnessedCount: number;
  readonly unwitnessedCount: number;
  readonly openCount: number;
  readonly closedCount: number;
}

/** Explicit ledger; counts describe outstanding work and are never a conservation score. */
export interface CompilerObligationCoverageAudit {
  readonly obligationCount: number;
  readonly witnessedCount: number;
  readonly unwitnessedCount: number;
  readonly notClaimedCount: number;
  readonly openCount: number;
  readonly closedCount: number;
  readonly families: readonly CompilerObligationFamilyCoverage[];
  readonly rows: readonly CompilerObligationCoverageRow[];
}

export function auditCompilerObligationCoverage(
  obligations: readonly CompilerObligationCatalogEntry[],
  cases: readonly CompilerConservationCase[],
  evaluatedEvidence: readonly CompilerEvaluatedCaseEvidence[] = [],
): CompilerObligationCoverageAudit {
  const obligationById = new Map(obligations.map((obligation) => [obligation.id, obligation]));
  if (obligationById.size !== obligations.length) {
    throw new Error("Compiler obligation catalog ids must be unique.");
  }

  const witnessesByObligation = new Map<string, CompilerObligationCaseWitness[]>();
  const caseById = new Map(cases.map((candidate) => [candidate.id, candidate]));
  const evaluatedByCase = new Map(evaluatedEvidence.map((candidate) => [candidate.caseId, candidate]));
  if (evaluatedByCase.size !== evaluatedEvidence.length) {
    throw new Error("Evaluated compiler evidence case ids must be unique.");
  }
  for (const candidate of cases) {
    for (const witness of candidate.obligations) {
      if (!obligationById.has(witness.id)) {
        throw new Error(`Compiler case ${candidate.id} witnesses unknown obligation ${witness.id}.`);
      }
      const row = {
        caseId: candidate.id,
        evidenceKind: candidate.caseKind === "compiler-world" ? "compiler-world" as const : "validated-evidence" as const,
        role: witness.role,
        summary: witness.summary,
        closureEvidence: witness.closureEvidence ?? null,
      };
      const existing = witnessesByObligation.get(witness.id);
      if (existing == null) {
        witnessesByObligation.set(witness.id, [row]);
      } else {
        existing.push(row);
      }
    }
  }

  const rows = obligations
    .map((obligation): CompilerObligationCoverageRow => {
      const witnesses = (witnessesByObligation.get(obligation.id) ?? [])
        .sort((left, right) => left.caseId.localeCompare(right.caseId));
      return {
        id: obligation.id,
        family: obligation.family,
        requirement: obligation.requirement,
        state: coverageState(obligation, witnesses, caseById, evaluatedByCase),
        disposition: obligation.disposition,
        witnesses,
      };
    })
    .sort((left, right) => left.id.localeCompare(right.id));

  const families = [...new Set(obligations.map((obligation) => obligation.family))]
    .sort()
    .map((family): CompilerObligationFamilyCoverage => {
      const familyRows = rows.filter((row) => row.family === family);
      return {
        family,
        obligationCount: familyRows.length,
        witnessedCount: familyRows.filter((row) => row.witnesses.length > 0).length,
        unwitnessedCount: familyRows.filter((row) => row.state === "unwitnessed").length,
        openCount: familyRows.filter((row) => row.state === "witnessed-open").length,
        closedCount: familyRows.filter((row) => row.state === "witnessed-closed").length,
      };
    });

  return {
    obligationCount: rows.length,
    witnessedCount: rows.filter((row) => row.witnesses.length > 0).length,
    unwitnessedCount: rows.filter((row) => row.state === "unwitnessed").length,
    notClaimedCount: rows.filter((row) => row.state === "witnessed-not-claimed").length,
    openCount: rows.filter((row) => row.state === "witnessed-open").length,
    closedCount: rows.filter((row) => row.state === "witnessed-closed").length,
    families,
    rows,
  };
}

function coverageState(
  obligation: CompilerObligationCatalogEntry,
  witnesses: readonly CompilerObligationCaseWitness[],
  caseById: ReadonlyMap<string, CompilerConservationCase>,
  evaluatedByCase: ReadonlyMap<string, CompilerEvaluatedCaseEvidence>,
): CompilerObligationCoverageState {
  if (witnesses.length === 0) {
    return "unwitnessed";
  }
  switch (obligation.disposition.closure.state) {
    case "not-claimed":
      return "witnessed-not-claimed";
    case "open":
      return "witnessed-open";
    case "closed":
      return witnesses.some((witness) => caseHasClosedEvidence(
        caseById.get(witness.caseId),
        witness,
        evaluatedByCase.get(witness.caseId),
      ))
        ? "witnessed-closed"
        : "witnessed-not-claimed";
  }
}

function caseHasClosedEvidence(
  candidate: CompilerConservationCase | undefined,
  witness: CompilerObligationCaseWitness,
  evaluated: CompilerEvaluatedCaseEvidence | undefined,
): boolean {
  const evidence = witness.closureEvidence;
  if (candidate == null || evaluated == null || evidence == null || evidence.claimIds.length === 0) {
    return false;
  }
  const equivalenceClaimIds = new Set(candidate.oracles.claims
    .filter((claim) => claim.kind === "equivalent")
    .map((claim) => claim.id));
  const satisfiedClaimIds = new Set(evaluated.satisfiedClaimIds);
  const closure = candidate.closure.find((row) => row.dimension === evidence.dimension);
  return closure?.state === "closed"
    && evidence.claimIds.every((claimId) =>
      equivalenceClaimIds.has(claimId)
      && closure.evidenceClaimIds?.includes(claimId) === true
      && satisfiedClaimIds.has(claimId)
    );
}
