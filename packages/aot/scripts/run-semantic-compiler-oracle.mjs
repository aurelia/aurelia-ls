import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join, relative, resolve } from "node:path";
import { parseArgs } from "node:util";
import { fileURLToPath } from "node:url";

import { BatchCaseRegistry } from "../out/testing/batch-case-registry.js";
import { compilerCaseRegistryFingerprint } from "../out/testing/compiler-case-fingerprint.js";
import { compilerCaseSearchTerms } from "../out/testing/compiler-case-search.js";
import { JIT_ORACLE_CASES } from "../out/testing/jit-oracle-case-registry.js";
import { JIT_ORACLE_SETUP_FACTORIES } from "../out/testing/jit-oracle-setups.js";
import { SemanticCompilerGalleryOracle } from "../out/testing/semantic-compiler-gallery-oracle.js";
import { SemanticCompilerGalleryPlanner } from "../out/testing/semantic-compiler-gallery-plan.js";

const RECEIPT_VERSION = "aurelia-ls/aot-semantic-compiler-oracle-run/v1";
const LIST_VERSION = "aurelia-ls/aot-semantic-compiler-oracle-cases/v1";
const ERROR_VERSION = "aurelia-ls/aot-semantic-compiler-oracle-error/v1";
const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const workspaceRoot = resolve(packageRoot, "../..");
const frameworkRoot = resolve(workspaceRoot, "aurelia");
const galleryRoot = resolve(packageRoot, "fixtures/semantic-compiler-gallery");

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
      list: { type: "boolean", default: false },
      timing: { type: "boolean", default: false },
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

  const authorityBefore = buildAuthorityIdentity();
  const authorityProblem = compilerCatalogAuthorityProblem(authorityBefore);
  if (authorityProblem != null) throw new Error(authorityProblem);
  const registry = new BatchCaseRegistry(JIT_ORACLE_CASES, compilerCaseSearchTerms);
  const selectionOptions = {
    idPatterns: values.id,
    families: values.family == null ? undefined : new Set(values.family),
    tags: values.tag == null ? undefined : new Set(values.tag),
    query: values.query,
    shard: parseShard(values.shard),
  };
  const selection = registry.plan(selectionOptions);
  if (selection.eligible.length === 0) throw new Error("Semantic compiler selection matched zero cases.");
  const plan = new SemanticCompilerGalleryPlanner().plan(selection.selected);
  const registryFingerprint = compilerCaseRegistryFingerprint(JIT_ORACLE_CASES, JIT_ORACLE_SETUP_FACTORIES);
  if (values.list) {
    await publishReceipt({
      schemaVersion: LIST_VERSION,
      selection: selectionSummary(selection, selectionOptions.shard),
      caseRegistry: { count: JIT_ORACLE_CASES.length, fingerprint: registryFingerprint },
      gallery: gallerySummary(plan),
      cases: [
        ...plan.admitted.map((candidate) => ({
          id: candidate.candidate.id,
          family: candidate.candidate.family,
          status: "admitted",
          anticipatedWorldDifferences: candidate.anticipatedWorldDifferences,
        })),
        ...plan.unsupported.map((candidate) => ({
          id: candidate.caseId,
          family: candidate.family,
          status: "unsupported",
          reasons: candidate.reasons,
          notes: candidate.notes,
        })),
      ].sort((left, right) => left.id.localeCompare(right.id)),
    }, values);
    return;
  }

  const run = await new SemanticCompilerGalleryOracle({ workspaceRoot: galleryRoot }).execute(plan);
  const authorityAfter = buildAuthorityIdentity();
  if (JSON.stringify(authorityAfter) !== JSON.stringify(authorityBefore)) {
    throw new Error("Repository or framework authority changed while the semantic compiler gallery was running.");
  }
  const receipt = {
    schemaVersion: RECEIPT_VERSION,
    selection: selectionSummary(selection, selectionOptions.shard),
    environment: {
      node: process.version,
      platform: process.platform,
      arch: process.arch,
      buildId: values["build-id"] ?? null,
      authorityStable: true,
      reproducible: authorityBefore.aot.dirty === false && authorityBefore.framework.dirty === false,
      ...authorityBefore,
    },
    caseRegistry: { count: JIT_ORACLE_CASES.length, fingerprint: registryFingerprint },
    gallery: gallerySummary(plan),
    run,
  };
  await publishReceipt(receipt, values);
  process.exitCode = run.missingCaseIds.length === 0 ? 0 : 1;
}

function gallerySummary(plan) {
  return {
    adapterVersion: plan.adapterVersion,
    compilerTreeProfile: plan.compilerTreeProfile,
    sourceDigest: plan.sourceDigest,
    selectedCaseCount: plan.selectedCaseCount,
    admittedCaseCount: plan.admitted.length,
    unsupportedCaseCount: plan.unsupported.length,
  };
}

function selectionSummary(selection, shard) {
  return {
    discoveredCaseCount: selection.discoveredCaseCount,
    eligibleCaseCount: selection.eligible.length,
    selectedCaseCount: selection.selected.length,
    shard: shard == null ? null : { index: shard.index + 1, count: shard.count },
  };
}

async function publishReceipt(receipt, values) {
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
  if (receipt.schemaVersion === LIST_VERSION) {
    process.stdout.write(
      `AOT semantic compiler cases: admitted=${receipt.gallery.admittedCaseCount} `
        + `unsupported=${receipt.gallery.unsupportedCaseCount} selected=${receipt.gallery.selectedCaseCount}\n`,
    );
    for (const candidate of receipt.cases) {
      const detail = candidate.status === "admitted"
        ? candidate.anticipatedWorldDifferences.join(", ")
        : candidate.reasons.join(", ");
      process.stdout.write(`- ${candidate.id}: ${candidate.status}${detail.length === 0 ? "" : ` (${detail})`}\n`);
    }
    return;
  }
  const run = receipt.run;
  process.stdout.write("AOT semantic compiler gallery (observation only; no equivalence claim)\n");
  process.stdout.write(
    `selected=${run.selectedCaseCount} admitted=${run.admittedCaseCount} unsupported=${run.unsupported.length} `
      + `observed=${run.observations.length} missing=${run.missingCaseIds.length}\n`,
  );
  if (values.timing) {
    for (const [stage, duration] of Object.entries(run.stages)) {
      process.stdout.write(`stage ${stage}: ${duration.toFixed(2)}ms\n`);
    }
  }
  for (const unsupported of run.unsupported) {
    process.stdout.write(`- unsupported ${unsupported.caseId}: ${unsupported.reasons.join(", ")}\n`);
  }
  for (const observation of run.observations.filter((candidate) =>
    candidate.compiledTemplate.state !== "complete"
    || candidate.openSeams.length > 0
    || candidate.declaredEffects.some((effect) => effect.conservation === "open")
  )) {
    process.stdout.write(
      `- pressure ${observation.caseId}: state=${observation.compiledTemplate.state} `
        + `issues=${observation.issues.length} seams=${observation.openSeams.length} `
        + `declared-effects=${observation.declaredEffects.length}\n`,
    );
  }
}

function compilerCatalogAuthorityProblem(environment) {
  const frameworkRevision = environment.framework.revision;
  if (frameworkRevision == null) return "Cannot verify Aurelia compiler authority because its revision is unavailable.";
  const revisions = new Set(JIT_ORACLE_CASES.flatMap((candidate) => candidate.provenance)
    .filter((authority) => authority.repository === "aurelia")
    .map((authority) => authority.revision));
  const mismatches = [...revisions].filter((revision) => revision !== frameworkRevision);
  return mismatches.length === 0
    ? null
    : `Aurelia compiler authority is pinned to ${mismatches.join(", ")}, but the submodule is ${frameworkRevision}.`;
}

function parseShard(value) {
  if (value == null) return undefined;
  const match = /^(\d+)\/(\d+)$/u.exec(value);
  if (match == null) throw new Error(`shard must use one-based index/count syntax such as 1/4; received ${value}.`);
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
    const status = execFileSync("git", ["-C", root, "status", "--porcelain=v1"], {
      encoding: "utf8",
      windowsHide: true,
    });
    return {
      revision,
      dirty: status.trim().length > 0,
      worktreeDigest: gitWorktreeDigest(root),
    };
  } catch {
    return { revision: null, dirty: null, worktreeDigest: null };
  }
}

function gitWorktreeDigest(root) {
  const hash = createHash("sha256");
  const diff = execFileSync("git", ["-C", root, "diff", "--binary", "HEAD", "--"], {
    encoding: "buffer",
    windowsHide: true,
    maxBuffer: 64 * 1024 * 1024,
  });
  hash.update("tracked\0");
  hash.update(diff);
  const untracked = execFileSync("git", ["-C", root, "ls-files", "--others", "--exclude-standard", "-z"], {
    encoding: "utf8",
    windowsHide: true,
    maxBuffer: 16 * 1024 * 1024,
  }).split("\0").filter((file) => file.length > 0).sort();
  for (const file of untracked) {
    hash.update("untracked\0");
    hash.update(file);
    hash.update("\0");
    hash.update(readFileSync(resolve(root, file)));
  }
  return `sha256:${hash.digest("hex")}`;
}

function javascriptArtifactDigest(root) {
  const hash = createHash("sha256");
  let fileCount = 0;
  const visit = (directory) => {
    for (const entry of readdirSync(directory, { withFileTypes: true })
      .sort((left, right) => left.name.localeCompare(right.name))) {
      const fullPath = join(directory, entry.name);
      if (entry.isDirectory()) {
        visit(fullPath);
      } else if (entry.isFile() && entry.name.endsWith(".js")) {
        const localPath = relative(root, fullPath).replaceAll("\\", "/");
        hash.update(localPath);
        hash.update("\0");
        hash.update(readFileSync(fullPath));
        ++fileCount;
      }
    }
  };
  visit(root);
  return { fileCount, digest: `sha256:${hash.digest("hex")}` };
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
    aot: { version: packageVersion(packageRoot), ...repositoryIdentity },
    semanticRuntime: {
      version: packageVersion(resolve(workspaceRoot, "packages/semantic-runtime")),
      repositoryRevision: repositoryIdentity.revision,
    },
    framework: { version: packageVersion(resolve(frameworkRoot, "packages/template-compiler")), ...gitIdentity(frameworkRoot) },
    executedArtifacts: {
      aot: javascriptArtifactDigest(resolve(packageRoot, "out")),
      semanticRuntime: javascriptArtifactDigest(resolve(workspaceRoot, "packages/semantic-runtime/out")),
    },
  };
}

function reportInfrastructureFailure(error) {
  const name = error instanceof Error ? error.name : "ThrownValue";
  const message = error instanceof Error ? error.message : String(error);
  if (process.argv.includes("--json")) {
    process.stdout.write(`${JSON.stringify({
      schemaVersion: ERROR_VERSION,
      outcome: "infrastructure-failure",
      error: { name, message, stack: error instanceof Error ? error.stack?.split(/\r?\n/u).slice(0, 12) ?? [] : [] },
    })}\n`);
    return;
  }
  process.stderr.write(`${name}: ${message}\n`);
}

function helpText() {
  return `AOT semantic compiler gallery\n\n`
    + `  --id <substring>       Repeatable case-id filter.\n`
    + `  --family <exact>       Repeatable family filter.\n`
    + `  --tag <exact>          Repeatable tag filter.\n`
    + `  --query <text>         All tokens must match canonical case metadata.\n`
    + `  --shard <index/count>  Stable one-based case shard.\n`
    + `  --list                 List admission and unsupported reasons without opening semantic-runtime.\n`
    + `  --timing               Print semantic boot/analysis/projection timings.\n`
    + `  --json                 Write one versioned JSON receipt to stdout.\n`
    + `  --output <path>        Write the same JSON receipt to a file.\n`
    + `  --build-id <value>     Optional caller-owned build/CI identity.\n`
    + `  -h, --help             Show this help.\n`;
}
