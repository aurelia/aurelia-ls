import {
  COMPILER_CASE_SCHEMA_VERSION,
  type CompilerCase,
  type CompilerElementDefinition,
  type CompilerOracleLaneId,
  type CompilerSetupFactory,
  type CompilerWorldRef,
} from "./compiler-case.js";
import { assertCompilerCaseData } from "./compiler-canonical-data.js";
import type { CompilerObligationCatalogEntry } from "./compiler-obligation-audit.js";
import {
  auditCompilerObligationCoverage,
  type CompilerObligationCoverageAudit,
} from "./compiler-obligation-coverage.js";

/** Validated descriptors. Construction runs neutral setup validation/description, never lane materialization or an oracle realm. */
export class CompilerCaseCatalog {
  readonly cases: readonly CompilerCase[];
  readonly setupFactories: readonly CompilerSetupFactory[];
  readonly obligations: readonly CompilerObligationCatalogEntry[];
  readonly obligationAudit: CompilerObligationCoverageAudit;

  public constructor(
    cases: readonly CompilerCase[],
    setupFactories: readonly CompilerSetupFactory[],
    obligations: readonly CompilerObligationCatalogEntry[],
    comparatorIds: readonly string[] = [],
  ) {
    requireUnique(comparatorIds, "Compiler comparator");
    for (const comparatorId of comparatorIds) {
      requireCanonicalToken(comparatorId, "compiler comparator id");
    }
    validateSetupManifests(setupFactories);
    const obligationAudit = auditCompilerObligationCoverage(obligations, cases);
    validateCompilerCases(cases, setupFactories, new Set(comparatorIds));
    this.cases = cases;
    this.setupFactories = setupFactories;
    this.obligations = obligations;
    this.obligationAudit = obligationAudit;
  }
}

function validateSetupManifests(manifests: readonly CompilerSetupFactory[]): void {
  const ids = new Set<string>();
  for (const manifest of manifests) {
    requireCanonicalToken(manifest.factoryId, "compiler setup factory id");
    if (ids.has(manifest.factoryId)) {
      throw new Error(`Duplicate compiler setup factory: ${manifest.factoryId}.`);
    }
    ids.add(manifest.factoryId);
    if (!Number.isSafeInteger(manifest.version) || manifest.version < 1) {
      throw new Error(`Compiler setup ${manifest.factoryId} must declare a positive integer version.`);
    }
    const exports = new Set<string>();
    for (const exportName of manifest.exports) {
      requireCanonicalToken(exportName, `compiler setup ${manifest.factoryId} export`);
      if (exports.has(exportName)) {
        throw new Error(`Compiler setup ${manifest.factoryId} declares duplicate export ${exportName}.`);
      }
      exports.add(exportName);
    }
  }
}

function validateCompilerCases(
  cases: readonly CompilerCase[],
  manifests: readonly CompilerSetupFactory[],
  comparatorIds: ReadonlySet<string>,
): void {
  const caseIds = new Set(cases.map((candidate) => candidate.id));
  if (caseIds.size !== cases.length) {
    throw new Error("Compiler case ids must be unique.");
  }
  const manifestById = new Map(manifests.map((manifest) => [manifest.factoryId, manifest]));
  for (const candidate of cases) {
    requireCanonicalToken(candidate.id, "compiler case id");
    requireCanonicalToken(candidate.family, `compiler case ${candidate.id} family`);
    if (candidate.requirement.trim().length === 0) {
      throw new Error(`Compiler case ${candidate.id} must declare a requirement.`);
    }
    if (candidate.tags.length === 0) {
      throw new Error(`Compiler case ${candidate.id} must declare at least one tag.`);
    }
    requireUnique(candidate.tags, `Compiler case ${candidate.id} tag`);
    for (const tag of candidate.tags) {
      requireCanonicalToken(tag, `compiler case ${candidate.id} tag`);
    }
    const schemaVersion: unknown = candidate.schemaVersion;
    if (schemaVersion !== COMPILER_CASE_SCHEMA_VERSION) {
      throw new Error(`Compiler case ${candidate.id} has an unsupported schema.`);
    }
    if (candidate.provenance.length === 0) {
      throw new Error(`Compiler case ${candidate.id} must cite source authority.`);
    }
    for (const authority of candidate.provenance) {
      if (authority.startLine < 1 || (authority.endLine != null && authority.endLine < authority.startLine)) {
        throw new Error(`Compiler case ${candidate.id} has an invalid authority range for ${authority.filePath}.`);
      }
      if (authority.filePath.length === 0 || authority.filePath.startsWith("/") || authority.filePath.includes("..")) {
        throw new Error(`Compiler case ${candidate.id} authority paths must be repository-relative.`);
      }
    }

    requireUnique(candidate.obligations.map((row) => row.id), `Compiler case ${candidate.id} obligation`);
    requireUnique(candidate.effects.map((row) => row.id), `Compiler case ${candidate.id} effect`);
    requireUnique(candidate.closure.map((row) => row.dimension), `Compiler case ${candidate.id} closure dimension`);
    requireUnique(candidate.invariants.map((row) => row.id), `Compiler case ${candidate.id} invariant`);
    requireUnique(candidate.world.setups.map((row) => row.symbol), `Compiler case ${candidate.id} setup symbol`);
    requireUnique(candidate.oracles.lanes.map((row) => row.id), `Compiler case ${candidate.id} oracle lane`);
    requireUnique(candidate.oracles.claims.map((row) => row.id), `Compiler case ${candidate.id} oracle claim`);

    const effectIds = new Set(candidate.effects.map((row) => row.id));
    const claimIds = new Set(candidate.oracles.claims.map((row) => row.id));
    for (const closure of candidate.closure) {
      if (closure.state === "closed" && (closure.evidenceClaimIds?.length ?? 0) === 0) {
        throw new Error(`Compiler case ${candidate.id} closes ${closure.dimension} without an oracle claim.`);
      }
      for (const claimId of closure.evidenceClaimIds ?? []) {
        if (!claimIds.has(claimId)) {
          throw new Error(`Compiler case ${candidate.id} closure references unknown claim ${claimId}.`);
        }
      }
      if (closure.state === "open" && (closure.blockerEffectIds?.length ?? 0) === 0) {
        throw new Error(`Compiler case ${candidate.id} opens ${closure.dimension} without a blocker effect.`);
      }
      for (const effectId of closure.blockerEffectIds ?? []) {
        if (!effectIds.has(effectId)) {
          throw new Error(`Compiler case ${candidate.id} closure references unknown effect ${effectId}.`);
        }
      }
    }

    const laneById = new Map(candidate.oracles.lanes.map((lane) => [lane.id, lane]));
    const laneIds = new Set(laneById.keys());
    for (const claim of candidate.oracles.claims) {
      requireLane(candidate.id, laneIds, claim.left.lane);
      requireLane(candidate.id, laneIds, claim.right.lane);
      if (claim.left.lane === claim.right.lane) {
        throw new Error(`Compiler case ${candidate.id} claim ${claim.id} cannot compare one lane with itself.`);
      }
      if (laneById.get(claim.left.lane)!.expectedProduct !== claim.left.product) {
        throw new Error(`Compiler case ${candidate.id} claim ${claim.id} left product does not match its lane.`);
      }
      if (laneById.get(claim.right.lane)!.expectedProduct !== claim.right.product) {
        throw new Error(`Compiler case ${candidate.id} claim ${claim.id} right product does not match its lane.`);
      }
      if (!comparatorIds.has(claim.comparator)) {
        throw new Error(`Compiler case ${candidate.id} claim ${claim.id} references unknown comparator ${claim.comparator}.`);
      }
    }
    for (const invariant of candidate.invariants) {
      requireCanonicalToken(invariant.id, `compiler case ${candidate.id} invariant id`);
      if (invariant.lanes.length === 0) {
        throw new Error(`Compiler case ${candidate.id} invariant ${invariant.id} has no oracle lane.`);
      }
      for (const lane of invariant.lanes) {
        requireLane(candidate.id, laneIds, lane);
        validateSelectorProduct(candidate.id, invariant.id, invariant.selector.kind, laneById.get(lane)!.expectedProduct);
      }
      if (invariant.assertion.kind === "equal") {
        assertCompilerCaseData(invariant.assertion.expected, `${candidate.id}/${invariant.id}`);
      }
    }

    const jitLane = laneById.get("framework-jit");
    for (const lane of candidate.oracles.lanes) {
      if (!candidate.invariants.some((invariant) => invariant.lanes.includes(lane.id))) {
        throw new Error(`Compiler case ${candidate.id} oracle lane ${lane.id} has no focused invariant.`);
      }
    }
    if (jitLane?.expectedProduct === "compiler-error") {
      const errorCodeInvariants = candidate.invariants.filter((invariant) =>
        invariant.lanes.includes("framework-jit")
        && invariant.selector.kind === "compiler-error-code"
        && invariant.assertion.kind === "equal"
        && typeof invariant.assertion.expected === "string"
        && /^AUR\d{4}$/u.test(invariant.assertion.expected)
      );
      if (errorCodeInvariants.length !== 1) {
        throw new Error(`Compiler case ${candidate.id} must assert one exact framework JIT error code.`);
      }
    }

    const setupBySymbol = new Map<string, CompilerSetupFactory>();
    for (const setup of candidate.world.setups) {
      requireCanonicalToken(setup.symbol, `compiler case ${candidate.id} setup symbol`);
      const manifest = manifestById.get(setup.factory);
      if (manifest == null) {
        throw new Error(`Compiler case ${candidate.id} references unknown setup factory ${setup.factory}.`);
      }
      if (setup.args !== undefined) {
        assertCompilerCaseData(setup.args, `${candidate.id}/${setup.symbol}/args`);
      }
      manifest.validate(setup.args);
      assertCompilerCaseData(manifest.describe(setup.args), `${candidate.id}/${setup.symbol}/description`);
      setupBySymbol.set(setup.symbol, manifest);
    }
    for (const registration of candidate.world.registrations) {
      validateWorldRef(candidate.id, registration.value, setupBySymbol);
    }
    validateDefinitionRefs(candidate.id, entryDefinition(candidate), setupBySymbol);
    if (candidate.world.entry.kind === "compile-spread") {
      if (candidate.world.entry.target.kind === "setup-ref") {
        validateWorldRef(candidate.id, candidate.world.entry.target.value, setupBySymbol);
      }
      if (candidate.world.entry.targetDefinition != null) {
        validateDefinitionRefs(candidate.id, candidate.world.entry.targetDefinition, setupBySymbol);
      }
    }
    for (const effect of candidate.effects) {
      if (effect.introducedBy != null) {
        validateWorldRef(candidate.id, effect.introducedBy, setupBySymbol);
      }
    }
    const referencedSetups = referencedSetupSymbols(candidate);
    for (const setup of candidate.world.setups) {
      if (!referencedSetups.has(setup.symbol)) {
        throw new Error(`Compiler case ${candidate.id} declares unused setup ${setup.symbol}.`);
      }
    }
    for (const contrast of candidate.contrasts) {
      if (!caseIds.has(contrast.caseId)) {
        throw new Error(`Compiler case ${candidate.id} contrasts unknown case ${contrast.caseId}.`);
      }
      if (contrast.caseId === candidate.id) {
        throw new Error(`Compiler case ${candidate.id} cannot contrast itself.`);
      }
    }

    validateOperationProduct(candidate);
  }
}

function referencedSetupSymbols(candidate: CompilerCase): ReadonlySet<string> {
  const symbols = new Set<string>();
  const add = (ref: CompilerWorldRef | undefined | null): void => {
    if (ref != null) {
      symbols.add(ref.setup);
    }
  };
  const addDefinition = (definition: CompilerElementDefinition): void => {
    if (definition.template?.kind === "setup-ref") {
      add(definition.template.value);
    }
    if (typeof definition.capture === "object") {
      add(definition.capture);
    }
    add(definition.processContent);
    add(definition.Type);
    for (const bindable of definition.bindables ?? []) {
      add(bindable.set);
    }
  };
  addDefinition(entryDefinition(candidate));
  for (const registration of candidate.world.registrations) {
    add(registration.value);
  }
  if (candidate.world.entry.kind === "compile-spread") {
    if (candidate.world.entry.target.kind === "setup-ref") {
      add(candidate.world.entry.target.value);
    }
    if (candidate.world.entry.targetDefinition != null) {
      addDefinition(candidate.world.entry.targetDefinition);
    }
  }
  for (const effect of candidate.effects) {
    add(effect.introducedBy);
  }
  return symbols;
}

function entryDefinition(candidate: CompilerCase): CompilerElementDefinition {
  return candidate.world.entry.kind === "compile"
    ? candidate.world.entry.definition
    : candidate.world.entry.requestor;
}

function validateDefinitionRefs(
  caseId: string,
  definition: CompilerElementDefinition,
  setupBySymbol: ReadonlyMap<string, CompilerSetupFactory>,
): void {
  if (definition.template?.kind === "setup-ref") {
    validateWorldRef(caseId, definition.template.value, setupBySymbol);
  }
  if (typeof definition.capture === "object") {
    validateWorldRef(caseId, definition.capture, setupBySymbol);
  }
  if (definition.processContent != null) {
    validateWorldRef(caseId, definition.processContent, setupBySymbol);
  }
  if (definition.Type != null) {
    validateWorldRef(caseId, definition.Type, setupBySymbol);
  }
  for (const bindable of definition.bindables ?? []) {
    if (bindable.set != null) {
      validateWorldRef(caseId, bindable.set, setupBySymbol);
    }
  }
}

function validateWorldRef(
  caseId: string,
  ref: CompilerWorldRef,
  setupBySymbol: ReadonlyMap<string, CompilerSetupFactory>,
): void {
  const manifest = setupBySymbol.get(ref.setup);
  if (manifest == null) {
    throw new Error(`Compiler case ${caseId} references unknown setup symbol ${ref.setup}.`);
  }
  if (!manifest.exports.includes(ref.export)) {
    throw new Error(`Compiler case ${caseId} setup ${ref.setup} has no declared export ${ref.export}.`);
  }
}

function validateOperationProduct(candidate: CompilerCase): void {
  const jitLane = candidate.oracles.lanes.find((lane) => lane.id === "framework-jit");
  if (jitLane == null) {
    return;
  }
  const expected = jitLane.expectedProduct;
  if (candidate.world.entry.kind === "compile" && expected === "spread-instructions") {
    throw new Error(`Compiler case ${candidate.id} cannot expect spread instructions from compile.`);
  }
  if (candidate.world.entry.kind === "compile-spread" && expected === "compiled-definition") {
    throw new Error(`Compiler case ${candidate.id} cannot expect a compiled definition from compileSpread.`);
  }
  if (candidate.world.entry.kind === "compile-spread" && expected === "unchanged-definition") {
    throw new Error(`Compiler case ${candidate.id} cannot expect an unchanged definition from compileSpread.`);
  }
}

function validateSelectorProduct(
  caseId: string,
  invariantId: string,
  selector: CompilerCase["invariants"][number]["selector"]["kind"],
  product: CompilerCase["oracles"]["lanes"][number]["expectedProduct"],
): void {
  const compatible: readonly string[] = selector.startsWith("compiler-error-")
    ? ["compiler-error"]
    : selector.startsWith("spread-instruction-")
      ? ["spread-instructions"]
      : ["compiled-definition", "unchanged-definition"];
  if (!compatible.includes(product)) {
    throw new Error(
      `Compiler case ${caseId} invariant ${invariantId} selector ${selector} cannot read ${product}.`,
    );
  }
}

function requireLane(caseId: string, lanes: ReadonlySet<CompilerOracleLaneId>, lane: CompilerOracleLaneId): void {
  if (!lanes.has(lane)) {
    throw new Error(`Compiler case ${caseId} references inactive oracle lane ${lane}.`);
  }
}

function requireUnique(values: readonly string[], label: string): void {
  if (new Set(values).size !== values.length) {
    throw new Error(`${label} ids must be unique.`);
  }
}

function requireCanonicalToken(value: string, label: string): void {
  if (!/^[a-z0-9]+(?:[._-][a-z0-9]+)*$/u.test(value)) {
    throw new Error(`${label} must be a canonical lowercase token: ${value || "<empty>"}.`);
  }
}
