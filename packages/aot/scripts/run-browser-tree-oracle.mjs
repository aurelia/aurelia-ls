import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { performance } from "node:perf_hooks";
import { parseArgs } from "node:util";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import {
  BROWSER_TREE_ORACLE_CASE_SCHEMA_VERSION,
  BROWSER_TREE_ORACLE_CASES,
  browserTreeOracleCaseDigest,
  validateBrowserTreeOracleCases,
} from "../out/testing/browser-tree-oracle-cases.js";
import {
  evaluateBrowserTreeCase,
  observeSemanticBrowserTrees,
} from "../out/testing/browser-tree-oracle.js";

const BROWSER_TREE_ORACLE_RECEIPT_VERSION = "aurelia-ls/aot-browser-tree-oracle-run/v1";
const BROWSER_TREE_ORACLE_ERROR_VERSION = "aurelia-ls/aot-browser-tree-oracle-error/v1";
const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const workspaceRoot = resolve(packageRoot, "../..");
const require = createRequire(import.meta.url);

try {
  await main();
} catch (error) {
  reportInfrastructureFailure(error);
  process.exitCode = 1;
}

async function main() {
  const { values } = parseArgs({
    options: {
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

  validateBrowserTreeOracleCases(BROWSER_TREE_ORACLE_CASES);
  const authorityBefore = repositoryIdentity();
  const startedAt = performance.now();

  const semanticStartedAt = performance.now();
  const semanticBatch = observeSemanticBrowserTrees(BROWSER_TREE_ORACLE_CASES);
  const semanticDurationMs = performance.now() - semanticStartedAt;

  const chromiumBatch = await observeChromiumBrowserTrees(BROWSER_TREE_ORACLE_CASES);
  const compareStartedAt = performance.now();
  const chromiumById = observationsById(chromiumBatch.observations, "Chromium");
  const semanticById = observationsById(semanticBatch.observations, "semantic-runtime");
  const cases = BROWSER_TREE_ORACLE_CASES.map((candidate) => evaluateBrowserTreeCase(
    candidate,
    requiredObservation(chromiumById, candidate.id, "Chromium"),
    requiredObservation(semanticById, candidate.id, "semantic-runtime"),
    {
      chromium: chromiumBatch.version,
      semanticRuntimeParser: semanticBatch.authority.parserVersion,
    },
  ));
  const comparisonDurationMs = performance.now() - compareStartedAt;

  const authorityAfter = repositoryIdentity();
  if (JSON.stringify(authorityAfter) !== JSON.stringify(authorityBefore)) {
    throw new Error("Repository authority changed while the browser-tree oracle batch was running.");
  }

  const failedCases = cases.filter((candidate) => candidate.outcome === "failed");
  const equivalentCases = cases.filter((candidate) => candidate.outcome === "matched-equivalence");
  const expectedDivergences = cases.filter((candidate) => candidate.outcome === "matched-expected-divergence");
  const receipt = {
    schemaVersion: BROWSER_TREE_ORACLE_RECEIPT_VERSION,
    environment: {
      node: process.version,
      platform: process.platform,
      arch: process.arch,
      buildId: values["build-id"] ?? null,
      repository: authorityBefore,
      reproducible: authorityBefore.revision != null && authorityBefore.dirty === false,
      aotVersion: packageVersion(packageRoot),
      semanticRuntimeVersion: packageVersion(resolve(workspaceRoot, "packages/semantic-runtime")),
    },
    authorities: {
      chromium: {
        engine: "chromium",
        version: chromiumBatch.version,
        playwrightVersion: playwrightVersion(),
        surface: "HTMLTemplateElement.innerHTML",
        context: "detached-html-template",
      },
      semanticRuntime: semanticBatch.authority,
    },
    caseRegistry: {
      schemaVersion: BROWSER_TREE_ORACLE_CASE_SCHEMA_VERSION,
      caseCount: BROWSER_TREE_ORACLE_CASES.length,
      digest: browserTreeOracleCaseDigest(BROWSER_TREE_ORACLE_CASES),
    },
    result: {
      outcome: failedCases.length === 0 ? "passed" : "failed",
      caseCount: cases.length,
      matchedEquivalentCount: equivalentCases.length,
      declaredExpectedDivergenceCount: BROWSER_TREE_ORACLE_CASES.filter(
        (candidate) => candidate.oracles.claims.some((claim) => claim.kind === "expected-divergence"),
      ).length,
      matchedExpectedDivergenceCount: expectedDivergences.length,
      failedCount: failedCases.length,
      durationMs: performance.now() - startedAt,
      stages: {
        semanticRuntimeMs: semanticDurationMs,
        chromiumLaunchAndPageMs: chromiumBatch.launchAndPageMs,
        chromiumEvaluateMs: chromiumBatch.evaluateMs,
        chromiumCloseMs: chromiumBatch.closeMs,
        comparisonMs: comparisonDurationMs,
      },
      cases,
    },
  };

  await publishReceipt(receipt, values);
  if (failedCases.length > 0) {
    process.exitCode = 1;
  }
}

async function observeChromiumBrowserTrees(cases) {
  const launchStartedAt = performance.now();
  const browser = await chromium.launch({ headless: true });
  let pageReadyAt;
  let evaluateDoneAt;
  let observations;
  const version = browser.version();
  try {
    const page = await browser.newPage();
    pageReadyAt = performance.now();
    observations = await page.evaluate((inputs) => {
      const browserDocument = globalThis.document;
      const nodeTypes = globalThis.Node;
      const structureNode = (node) => {
        switch (node.nodeType) {
          case nodeTypes.TEXT_NODE:
            return { kind: "text", value: node.data };
          case nodeTypes.COMMENT_NODE:
            return { kind: "comment", value: node.data };
          case nodeTypes.DOCUMENT_TYPE_NODE:
            return {
              kind: "doctype",
              name: node.name,
              publicId: node.publicId,
              systemId: node.systemId,
            };
          case nodeTypes.ELEMENT_NODE: {
            const element = node;
            const templateContent = element.namespaceURI === "http://www.w3.org/1999/xhtml"
              && element.localName === "template"
              ? element.content
              : null;
            return {
              kind: "element",
              tagName: element.localName,
              namespaceUri: element.namespaceURI,
              attributes: [...element.attributes].map((attribute) => ({
                name: attribute.localName,
                value: attribute.value,
                namespaceUri: attribute.namespaceURI,
                prefix: attribute.prefix,
              })),
              children: [...element.childNodes].map(structureNode),
              content: templateContent == null
                ? null
                : [...templateContent.childNodes].map(structureNode),
            };
          }
          default:
            throw new Error(`Unsupported browser-tree node type ${node.nodeType}.`);
        }
      };

      return inputs.map(({ id, markup }) => {
        const template = browserDocument.createElement("template");
        template.innerHTML = markup;
        return {
          id,
          serialized: template.innerHTML,
          structure: [...template.content.childNodes].map(structureNode),
        };
      });
    }, cases.map(({ id, markup }) => ({ id, markup })));
    evaluateDoneAt = performance.now();
  } finally {
    await browser.close();
  }
  const closedAt = performance.now();
  if (pageReadyAt == null || evaluateDoneAt == null || observations == null) {
    throw new Error("Chromium browser-tree batch ended without observations.");
  }
  return {
    version,
    observations,
    launchAndPageMs: pageReadyAt - launchStartedAt,
    evaluateMs: evaluateDoneAt - pageReadyAt,
    closeMs: closedAt - evaluateDoneAt,
  };
}

function observationsById(observations, authority) {
  const result = new Map();
  for (const observation of observations) {
    if (result.has(observation.id)) {
      throw new Error(`${authority} returned duplicate browser-tree observation ${observation.id}.`);
    }
    result.set(observation.id, observation);
  }
  if (result.size !== BROWSER_TREE_ORACLE_CASES.length) {
    throw new Error(
      `${authority} returned ${result.size} browser-tree observations for ${BROWSER_TREE_ORACLE_CASES.length} cases.`,
    );
  }
  return result;
}

function requiredObservation(observations, id, authority) {
  const observation = observations.get(id);
  if (observation == null) {
    throw new Error(`${authority} omitted browser-tree observation ${id}.`);
  }
  return observation;
}

async function publishReceipt(receipt, values) {
  const json = `${JSON.stringify(receipt)}\n`;
  if (values.output != null) {
    const outputPath = resolve(workspaceRoot, values.output);
    await mkdir(dirname(outputPath), { recursive: true });
    await writeFile(outputPath, json, "utf8");
  }
  if (values.json) {
    process.stdout.write(json);
    return;
  }
  process.stdout.write(
    `Browser-tree oracle ${receipt.result.outcome}: ${receipt.result.caseCount} cases, `
      + `${receipt.result.matchedEquivalentCount} equivalent, `
      + `${receipt.result.matchedExpectedDivergenceCount} expected divergence, `
      + `${receipt.result.failedCount} failed.\n`
      + `Chromium ${receipt.authorities.chromium.version}; `
      + `${receipt.authorities.semanticRuntime.parser} ${receipt.authorities.semanticRuntime.parserVersion} `
      + `(${receipt.authorities.semanticRuntime.context}, scripting=${receipt.authorities.semanticRuntime.scriptingEnabled}).\n`
      + `Case digest ${receipt.caseRegistry.digest}.\n`,
  );
  for (const candidate of receipt.result.cases.filter((item) => item.outcome === "failed")) {
    process.stderr.write(`${candidate.id}: ${candidate.problems.join(" ")}\n`);
  }
}

function repositoryIdentity() {
  try {
    const revision = execFileSync("git", ["-C", workspaceRoot, "rev-parse", "HEAD"], {
      encoding: "utf8",
      windowsHide: true,
    }).trim();
    const dirty = execFileSync("git", ["-C", workspaceRoot, "status", "--porcelain=v1"], {
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

function playwrightVersion() {
  const manifest = require("playwright/package.json");
  return typeof manifest.version === "string" ? manifest.version : null;
}

function reportInfrastructureFailure(error) {
  const errorName = error instanceof Error ? error.name : "ThrownValue";
  const message = error instanceof Error ? error.message : String(error);
  if (process.argv.includes("--json")) {
    process.stdout.write(`${JSON.stringify({
      schemaVersion: BROWSER_TREE_ORACLE_ERROR_VERSION,
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
  return `AOT browser-tree oracle\n\n`
    + `  --json                 Write one versioned JSON receipt to stdout.\n`
    + `  --output <path>        Write the same JSON receipt to a file.\n`
    + `  --build-id <value>     Optional caller-owned build/CI identity.\n`
    + `  -h, --help             Show this help.\n`;
}
