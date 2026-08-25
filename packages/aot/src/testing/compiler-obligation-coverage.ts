import type { CompilerCase, CompilerObligationWitnessRole } from "./compiler-case.js";
import type {
  CompilerObligationAuditDisposition,
  CompilerObligationCatalogEntry,
  CompilerObligationFamily,
} from "./compiler-obligation-audit.js";

export interface CompilerObligationCaseWitness {
  readonly caseId: string;
  readonly role: CompilerObligationWitnessRole;
  readonly summary: string;
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
  cases: readonly CompilerCase[],
): CompilerObligationCoverageAudit {
  const obligationById = new Map(obligations.map((obligation) => [obligation.id, obligation]));
  if (obligationById.size !== obligations.length) {
    throw new Error("Compiler obligation catalog ids must be unique.");
  }

  const witnessesByObligation = new Map<string, CompilerObligationCaseWitness[]>();
  const caseById = new Map(cases.map((candidate) => [candidate.id, candidate]));
  for (const candidate of cases) {
    for (const witness of candidate.obligations) {
      if (!obligationById.has(witness.id)) {
        throw new Error(`Compiler case ${candidate.id} witnesses unknown obligation ${witness.id}.`);
      }
      const row = {
        caseId: candidate.id,
        role: witness.role,
        summary: witness.summary,
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
        state: coverageState(obligation, witnesses, caseById),
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
  caseById: ReadonlyMap<string, CompilerCase>,
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
      return witnesses.some((witness) => caseHasClosedEvidence(caseById.get(witness.caseId)))
        ? "witnessed-closed"
        : "witnessed-not-claimed";
  }
}

function caseHasClosedEvidence(candidate: CompilerCase | undefined): boolean {
  if (candidate == null) {
    return false;
  }
  const claimIds = new Set(candidate.oracles.claims.map((claim) => claim.id));
  return candidate.closure.some((closure) =>
    closure.state === "closed"
    && (closure.evidenceClaimIds?.length ?? 0) > 0
    && closure.evidenceClaimIds!.every((claimId) => claimIds.has(claimId))
  );
}
