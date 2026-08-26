import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { performance } from "node:perf_hooks";
import { parseArgs } from "node:util";
import { fileURLToPath } from "node:url";
import { BatchRunner } from "../out/testing/batch-runner.js";
import { CompilerCaseCatalog } from "../out/testing/compiler-case-catalog.js";
import {
  BROWSER_TREE_ORACLE_CASES,
  BROWSER_TREE_ORACLE_COMPARATOR_ID,
  browserTreeOracleCaseDigest,
  validateBrowserTreeOracleCases,
} from "../out/testing/browser-tree-oracle-cases.js";
import {
  compilerCaseRegistryFingerprint,
  compilerObligationCatalogFingerprint,
} from "../out/testing/compiler-case-fingerprint.js";
import { compilerCaseSearchTerms } from "../out/testing/compiler-case-search.js";
import {
  JitCompilerCaseExecutor,
  validateJitCharacterizationCases,
} from "../out/testing/jit-compiler-case-executor.js";
import { createJitCompilerOracle } from "../out/testing/jit-compiler-oracle.js";
import { JIT_ORACLE_CASES } from "../out/testing/jit-oracle-case-registry.js";
import {
  JIT_ORACLE_SETUP_FACTORIES,
  JIT_ORACLE_SETUP_MATERIALIZERS,
} from "../out/testing/jit-oracle-setups.js";
import { COMPILER_OBLIGATION_CATALOG } from "../out/testing/compiler-obligation-catalog.js";

const JIT_ORACLE_RECEIPT_VERSION = "aurelia-ls/aot-jit-oracle-run/v1";
const JIT_ORACLE_CASE_LIST_VERSION = "aurelia-ls/aot-jit-oracle-cases/v1";
const JIT_ORACLE_OBLIGATION_AUDIT_VERSION = "aurelia-ls/aot-compiler-obligation-audit/v1";
const JIT_ORACLE_ERROR_VERSION = "aurelia-ls/aot-jit-oracle-error/v1";
const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const workspaceRoot = resolve(packageRoot, "../..");
const frameworkRoot = resolve(workspaceRoot, "aurelia");

try {
  await main();
} catch (error) {
  reportInfrastructureFailure(error);
  process.exitCode = 1;
}

async function main() {
  const { values } = parseArgs({
    options: {
      id: { type: "string", multiple: true },
      family: { type: "string", multiple: true },
      tag: { type: "string", multiple: true },
      query: { type: "string" },
      shard: { type: "string" },
      repeat: { type: "string", default: "1" },
      "max-failures": { type: "string", default: "20" },
      "max-executions": { type: "string", default: "100000" },
      slowest: { type: "string", default: "10" },
      "fail-fast": { type: "boolean", default: false },
      list: { type: "boolean", default: false },
      audit: { type: "boolean", default: false },
      timing: { type: "boolean", default: false },
      verbose: { type: "boolean", default: false },
      json: { type: "boolean", default: false },
      output: { type: "string" },
      "build-id": { type: "string" },
      help: { type: "boolean", short: "h", default: false },
    },
    allowPositionals: false,
    strict: true,
  });

  if (values.help) {
    process.stdout.write(helpText());
    return;
  }

  const { compilerCaseCatalog, batchRunner } = createHarness();

  const authorityBefore = buildAuthorityIdentity();
  const catalogAuthorityProblem = compilerCatalogAuthorityProblem(
    authorityBefore,
    compilerCaseCatalog.conservationCases,
  );
  const obligationFingerprint = compilerObligationCatalogFingerprint(COMPILER_OBLIGATION_CATALOG);
  const evidenceFingerprint = browserTreeOracleCaseDigest(BROWSER_TREE_ORACLE_CASES);
  if (values.audit) {
    await publishReceipt({
      schemaVersion: JIT_ORACLE_OBLIGATION_AUDIT_VERSION,
      environment: authorityBefore,
      catalogAuthority: {
        matched: catalogAuthorityProblem == null,
        problem: catalogAuthorityProblem,
      },
      obligationCatalog: {
        fingerprint: obligationFingerprint,
        evidenceFingerprint,
        ...compilerCaseCatalog.obligationAudit,
      },
    }, values);
    return;
  }
  if (catalogAuthorityProblem != null) {
    throw new Error(catalogAuthorityProblem);
  }

  const shard = parseShard(values.shard);
  const selectionOptions = {
    idPatterns: values.id,
    families: values.family == null ? undefined : new Set(values.family),
    tags: values.tag == null ? undefined : new Set(values.tag),
    query: values.query,
    shard,
  };
  const plan = batchRunner.plan(selectionOptions);
  if (plan.eligible.length === 0) {
    throw new Error("JIT oracle selection matched zero cases.");
  }
  const selected = plan.selected;

  const selection = {
    ids: values.id ?? [],
    families: values.family ?? [],
    tags: values.tag ?? [],
    query: values.query ?? null,
    shard: shard == null ? null : { index: shard.index + 1, count: shard.count },
    repeat: parsePositiveInteger(values.repeat, "repeat"),
  };
  const slowestLimit = parseNonNegativeInteger(values.slowest, "slowest");
  const executionLimit = parsePositiveInteger(values["max-executions"], "max-executions");

  if (values.list) {
    const receipt = {
      schemaVersion: JIT_ORACLE_CASE_LIST_VERSION,
      selection,
      discoveredCaseCount: JIT_ORACLE_CASES.length,
      eligibleCaseCount: plan.eligible.length,
      selectedCaseCount: selected.length,
      cases: selected.map(({ id, family, tags, requirement }) => ({ id, family, tags, requirement })),
      obligationCatalog: compactObligationAudit(
        compilerCaseCatalog,
        obligationFingerprint,
        evidenceFingerprint,
      ),
    };
    await publishReceipt(receipt, values);
    return;
  }

  const registryFingerprint = compilerCaseRegistryFingerprint(
    JIT_ORACLE_CASES,
    JIT_ORACLE_SETUP_FACTORIES,
  );
  const setupStartedAt = performance.now();
  const oracle = selected.length === 0 ? undefined : createJitCompilerOracle();
  const sharedSetupMs = performance.now() - setupStartedAt;
  try {
    const result = await batchRunner.run(oracle, {
      ...selectionOptions,
      repeat: selection.repeat,
      executionLimit,
      failFast: values["fail-fast"],
      failureLimit: parseNonNegativeInteger(values["max-failures"], "max-failures"),
      onProgress: values.verbose
        ? (event) => {
            process.stderr.write(
              `[${event.execution}/${event.executionCount}] ${event.phase} ${event.id}#${event.iteration}\n`,
            );
          }
        : undefined,
    });
    const authorityAfter = buildAuthorityIdentity();
    if (JSON.stringify(authorityAfter) !== JSON.stringify(authorityBefore)) {
      throw new Error("Repository or framework authority changed while the JIT oracle batch was running.");
    }
    const receipt = {
      schemaVersion: JIT_ORACLE_RECEIPT_VERSION,
      selection,
      environment: {
        node: process.version,
        platform: process.platform,
        arch: process.arch,
        buildId: values["build-id"] ?? null,
        authorityStable: true,
        reproducible: authorityBefore.aot.dirty === false && authorityBefore.framework.dirty === false,
        ...authorityBefore,
      },
      caseRegistry: {
        count: JIT_ORACLE_CASES.length,
        fingerprint: registryFingerprint,
      },
      obligationCatalog: compactObligationAudit(
        compilerCaseCatalog,
        obligationFingerprint,
        evidenceFingerprint,
      ),
      sharedSetupMs,
      result,
    };
    await publishReceipt(receipt, values, slowestLimit);
    process.exitCode = result.failedCount === 0 ? 0 : 1;
  } finally {
    oracle?.dispose();
  }
}

async function publishReceipt(receipt, values, slowestLimit = 10) {
  let json;
  if (values.output != null) {
    json ??= `${JSON.stringify(receipt)}\n`;
    const outputPath = resolve(values.output);
    await mkdir(dirname(outputPath), { recursive: true });
    await writeFile(outputPath, json, "utf8");
  }

  if (values.json) {
    json ??= `${JSON.stringify(receipt)}\n`;
    process.stdout.write(json);
    return;
  }

  if (receipt.schemaVersion === JIT_ORACLE_OBLIGATION_AUDIT_VERSION) {
    const audit = receipt.obligationCatalog;
    process.stdout.write(
      `AOT compiler obligation audit: total=${audit.obligationCount} witnessed=${audit.witnessedCount} `
        + `unwitnessed=${audit.unwitnessedCount} not-claimed=${audit.notClaimedCount} `
        + `open=${audit.openCount} closed=${audit.closedCount}\n`,
    );
    for (const family of audit.families) {
      process.stdout.write(
        `- ${family.family}: total=${family.obligationCount} witnessed=${family.witnessedCount} `
          + `unwitnessed=${family.unwitnessedCount} open=${family.openCount} closed=${family.closedCount}\n`,
      );
    }
    process.stdout.write("Unwitnessed obligations:\n");
    for (const row of audit.rows.filter((candidate) => candidate.state === "unwitnessed")) {
      process.stdout.write(`- ${row.id}: ${row.requirement}\n`);
    }
    return;
  }

  if (receipt.schemaVersion === JIT_ORACLE_CASE_LIST_VERSION) {
    process.stdout.write(
      `AOT JIT oracle cases (${receipt.selectedCaseCount} selected, ${receipt.eligibleCaseCount} eligible, `
        + `${receipt.discoveredCaseCount} discovered)\n`,
    );
    for (const candidate of receipt.cases) {
      process.stdout.write(`- ${candidate.id} (${candidate.family}) [${candidate.tags.join(", ")}]\n`);
    }
    return;
  }

  printRunReceipt(receipt, values, slowestLimit);
}

function printRunReceipt(receipt, values, slowestLimit) {
  const result = receipt.result;
  process.stdout.write("AOT JIT oracle batch\n");
  process.stdout.write(
    `cases=${result.selectedCaseCount}/${result.eligibleCaseCount}/${result.discoveredCaseCount} `
      + `executions=${result.executionCount} `
      + `passed=${result.passedCount} failed=${result.failedCount} duration=${result.durationMs.toFixed(1)}ms\n`,
  );

  if (result.failures.length > 0) {
    process.stdout.write(`failures (${result.failures.length}, suppressed=${result.suppressedFailureCount})\n`);
    for (const failure of result.failures) {
      process.stdout.write(`- ${failure.id}#${failure.iteration}: ${failure.errorName}: ${failure.message}\n`);
      for (const line of failure.stack.slice(1)) {
        process.stdout.write(`  ${line.trim()}\n`);
      }
      for (const line of failure.logs) {
        process.stdout.write(`  ${line}\n`);
      }
      if (failure.logsTruncated) {
        process.stdout.write("  [captured logs truncated]\n");
      }
    }
  }

  if (values.timing) {
    process.stdout.write(`shared setup=${receipt.sharedSetupMs.toFixed(2)}ms\n`);
    for (const [stage, timing] of Object.entries(result.stages)) {
      process.stdout.write(
        `stage ${stage}: cold=${timing.coldMs.toFixed(2)}ms median=${timing.medianMs.toFixed(2)}ms `
          + `p95=${timing.p95Ms.toFixed(2)}ms max=${timing.maxMs.toFixed(2)}ms samples=${timing.samples}\n`,
      );
    }
    const slowest = [...result.caseResults]
      .filter((candidate) => candidate.timing != null)
      .sort((left, right) => right.timing.p95Ms - left.timing.p95Ms || left.id.localeCompare(right.id))
      .slice(0, slowestLimit);
    if (slowest.length > 0) {
      process.stdout.write(`slowest cases (${slowest.length})\n`);
      for (const candidate of slowest) {
        process.stdout.write(
          `- ${candidate.id}: cold=${candidate.timing.coldMs.toFixed(2)}ms `
            + `median=${candidate.timing.medianMs.toFixed(2)}ms p95=${candidate.timing.p95Ms.toFixed(2)}ms `
            + `runs=${candidate.executionCount}\n`,
        );
      }
    }
  }
}

function createHarness() {
  validateBrowserTreeOracleCases(BROWSER_TREE_ORACLE_CASES);
  const compilerCaseCatalog = new CompilerCaseCatalog(
    JIT_ORACLE_CASES,
    JIT_ORACLE_SETUP_FACTORIES,
    COMPILER_OBLIGATION_CATALOG,
    [BROWSER_TREE_ORACLE_COMPARATOR_ID],
    BROWSER_TREE_ORACLE_CASES,
  );
  validateJitCharacterizationCases(compilerCaseCatalog.cases);
  const jitCaseExecutor = new JitCompilerCaseExecutor(
    JIT_ORACLE_SETUP_FACTORIES,
    JIT_ORACLE_SETUP_MATERIALIZERS,
  );
  const batchRunner = new BatchRunner(
    compilerCaseCatalog.cases,
    (candidate, oracle) => {
      if (oracle == null) {
        throw new Error(`JIT oracle context is absent while executing ${candidate.id}.`);
      }
      return jitCaseExecutor.execute(candidate, oracle);
    },
    compilerCaseSearchTerms,
  );
  return { compilerCaseCatalog, batchRunner };
}

function compactObligationAudit(compilerCaseCatalog, fingerprint, evidenceFingerprint) {
  const audit = compilerCaseCatalog.obligationAudit;
  return {
    fingerprint,
    evidenceFingerprint,
    obligationCount: audit.obligationCount,
    witnessedCount: audit.witnessedCount,
    unwitnessedCount: audit.unwitnessedCount,
    notClaimedCount: audit.notClaimedCount,
    openCount: audit.openCount,
    closedCount: audit.closedCount,
  };
}

function compilerCatalogAuthorityProblem(environment, conservationCases) {
  // Aurelia authorities describe the live compiler under test. Workspace authorities are committed historical
  // evidence for the harness itself and intentionally remain valid after later workspace commits.
  const frameworkRevision = environment.framework.revision;
  if (frameworkRevision == null) {
    return "Cannot verify aurelia compiler authority because its revision is unavailable.";
  }
  const declaredFrameworkRevisions = new Set([
    ...conservationCases.flatMap((candidate) => candidate.provenance),
    ...COMPILER_OBLIGATION_CATALOG.flatMap((obligation) => obligation.authorities),
  ].filter((authority) => authority.repository === "aurelia").map((authority) => authority.revision));
  const mismatches = [...declaredFrameworkRevisions].filter((revision) => revision !== frameworkRevision);
  return mismatches.length === 0
    ? null
    : `Aurelia compiler authority is pinned to ${mismatches.join(", ")}, but the submodule is ${frameworkRevision}.`;
}

function parsePositiveInteger(value, name) {
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 1) {
    throw new Error(`${name} must be a positive integer; received ${value}.`);
  }
  return parsed;
}

function parseNonNegativeInteger(value, name) {
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 0) {
    throw new Error(`${name} must be a non-negative integer; received ${value}.`);
  }
  return parsed;
}

function parseShard(value) {
  if (value == null) {
    return undefined;
  }
  const match = /^(\d+)\/(\d+)$/u.exec(value);
  if (match == null) {
    throw new Error(`shard must use one-based index/count syntax such as 1/4; received ${value}.`);
  }
  const oneBasedIndex = Number(match[1]);
  const count = Number(match[2]);
  if (!Number.isInteger(oneBasedIndex) || !Number.isInteger(count) || count < 1) {
    throw new Error(`shard must use positive integer index/count syntax; received ${value}.`);
  }
  return { index: oneBasedIndex - 1, count };
}

function gitIdentity(root) {
  try {
    const revision = execFileSync("git", ["-C", root, "rev-parse", "HEAD"], {
      encoding: "utf8",
      windowsHide: true,
    }).trim();
    const dirty = execFileSync("git", ["-C", root, "status", "--porcelain=v1"], {
      encoding: "utf8",
      windowsHide: true,
    }).trim().length > 0;
    return { revision, dirty };
  } catch {
    return { revision: null, dirty: null };
  }
}

function packageVersion(root) {
  try {
    const manifest = JSON.parse(readFileSync(resolve(root, "package.json"), "utf8"));
    return typeof manifest.version === "string" ? manifest.version : null;
  } catch {
    return null;
  }
}

function buildAuthorityIdentity() {
  const repositoryIdentity = gitIdentity(workspaceRoot);
  return {
    aot: {
      version: packageVersion(packageRoot),
      ...repositoryIdentity,
    },
    semanticRuntime: {
      version: packageVersion(resolve(workspaceRoot, "packages/semantic-runtime")),
      repositoryRevision: repositoryIdentity.revision,
    },
    framework: {
      version: frameworkVersion(),
      ...gitIdentity(frameworkRoot),
    },
  };
}

function frameworkVersion() {
  return packageVersion(resolve(frameworkRoot, "packages/template-compiler"));
}

function reportInfrastructureFailure(error) {
  const errorName = error instanceof Error ? error.name : "ThrownValue";
  const message = error instanceof Error ? error.message : String(error);
  if (process.argv.includes("--json")) {
    process.stdout.write(`${JSON.stringify({
      schemaVersion: JIT_ORACLE_ERROR_VERSION,
      outcome: "infrastructure-failure",
      error: {
        name: errorName,
        message,
        stack: error instanceof Error ? error.stack?.split(/\r?\n/u).slice(0, 12) ?? [] : [],
      },
    })}\n`);
    return;
  }
  process.stderr.write(`${errorName}: ${message}\n`);
}

function helpText() {
  return `AOT JIT oracle\n\n`
    + `  --id <substring>       Repeatable; OR within the id dimension.\n`
    + `  --family <exact>       Repeatable; OR within the family dimension.\n`
    + `  --tag <exact>          Repeatable; OR within the tag dimension.\n`
    + `  --query <text>         All tokens must match case metadata.\n`
    + `  --shard <index/count>  Stable one-based hash shard, for example 1/4.\n`
    + `  --repeat <n>           Repeat the complete selected sequence.\n`
    + `  --max-failures <n>     Bound retained failure details (default 20).\n`
    + `  --max-executions <n>   Bound selected cases × repeat (default 100000).\n`
    + `  --fail-fast            Stop after the first failure.\n`
    + `  --list                 List selected case metadata without creating JSDOM.\n`
    + `  --audit                Print the source-reviewed obligation and witness ledger.\n`
    + `  --timing               Print stage distributions and slowest cases.\n`
    + `  --slowest <n>          Number of slow cases printed with --timing.\n`
    + `  --verbose              Write per-case progress to stderr.\n`
    + `  --json                 Write one versioned JSON receipt to stdout.\n`
    + `  --output <path>        Write the same JSON receipt to a file.\n`
    + `  --build-id <value>     Optional caller-owned build/CI identity.\n`
    + `  -h, --help             Show this help.\n`;
}
