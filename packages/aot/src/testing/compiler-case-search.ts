import type { CompilerCase } from "./compiler-case.js";

/** Exact corpus metadata admitted to free-text batch selection. */
export function compilerCaseSearchTerms(candidate: CompilerCase): readonly string[] {
  return [
    ...candidate.obligations.flatMap((witness) => [witness.id, witness.role, witness.summary]),
    ...candidate.provenance.flatMap((authority) => [
      authority.filePath,
      authority.symbolName ?? "",
      authority.suiteName ?? "",
      authority.testName ?? "",
    ]),
    ...candidate.effects.flatMap((effect) => [effect.id, effect.kind, effect.conservation]),
    ...candidate.closure.flatMap((closure) => [closure.dimension, closure.state]),
    ...candidate.world.setups.flatMap((setup) => [setup.symbol, setup.factory]),
    ...candidate.oracles.lanes.flatMap((lane) => [lane.id, lane.expectedProduct]),
  ];
}
