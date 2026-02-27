import fs from "node:fs";
import path from "node:path";

export interface CategoryCoverage {
  category: string;
  assertedVectors: number;
  totalVectors: number;
}

export interface StageCoverage {
  stage: string;
  totalVectors: number;
  categories: CategoryCoverage[];
}

export interface CanaryStatus {
  label: string;
  found: boolean;
  file: string;
  vectorName: string;
}

export interface VectorContractCoverageReport {
  stages: StageCoverage[];
  canaries: CanaryStatus[];
  gate: {
    passed: boolean;
    failures: string[];
  };
}

interface StageConfig {
  stage: string;
  dir: string;
  categories: readonly string[];
}

interface RequiredVector {
  label: string;
  file: string;
  name: string;
}

interface VectorEntry {
  name?: unknown;
  expect?: unknown;
}

const STAGES: readonly StageConfig[] = [
  {
    stage: "10-lower",
    dir: "packages/compiler/test/10-lower",
    categories: ["expressions", "attributeCommands", "controllers", "lets", "elements", "attributes", "diags"],
  },
  {
    stage: "20-link",
    dir: "packages/compiler/test/20-link",
    categories: ["items", "diags"],
  },
  {
    stage: "30-bind",
    dir: "packages/compiler/test/30-bind",
    categories: ["frames", "locals", "exprs", "diags"],
  },
  {
    stage: "40-typecheck",
    dir: "packages/compiler/test/40-typecheck",
    categories: ["expected", "contracts"],
  },
] as const;

const REQUIRED_CANARIES: readonly RequiredVector[] = [
  {
    label: "10-lower duplicate cardinality canary",
    file: "packages/compiler/test/10-lower/basics.json",
    name: "LB-60 duplicate text interpolation expressions preserve cardinality",
  },
  {
    label: "20-link duplicate cardinality canary",
    file: "packages/compiler/test/20-link/attrs.json",
    name: "R-A-31 duplicate native attr resolutions preserve cardinality",
  },
  {
    label: "30-bind duplicate cardinality canary",
    file: "packages/compiler/test/30-bind/bind-basic.json",
    name: "B-12 duplicate text expressions preserve cardinality in same frame",
  },
  {
    label: "40-typecheck duplicate cardinality canary",
    file: "packages/compiler/test/40-typecheck/basics.json",
    name: "TC-B-03 duplicate expression/type pairs preserve cardinality",
  },
];

export function buildVectorContractCoverageReport(rootDir: string = process.cwd()): VectorContractCoverageReport {
  const stages: StageCoverage[] = STAGES.map((stage) => {
    const vectors = loadVectorsFromDir(path.resolve(rootDir, stage.dir));
    return {
      stage: stage.stage,
      totalVectors: vectors.length,
      categories: stage.categories.map((category) => ({
        category,
        assertedVectors: vectors.reduce((count, vector) => {
          return hasExpectCategory(vector, category) ? count + 1 : count;
        }, 0),
        totalVectors: vectors.length,
      })),
    };
  });

  const canaries: CanaryStatus[] = REQUIRED_CANARIES.map((required) => {
    const fullPath = path.resolve(rootDir, required.file);
    const vectors = loadVectorsFromFile(fullPath);
    const found = vectors.some((vector) => vector.name === required.name);
    return {
      label: required.label,
      found,
      file: required.file,
      vectorName: required.name,
    };
  });

  const failures: string[] = [];
  for (const stage of stages) {
    if (stage.totalVectors === 0) {
      failures.push(`${stage.stage}: no vectors found.`);
      continue;
    }
    for (const category of stage.categories) {
      if (category.assertedVectors === 0) {
        failures.push(`${stage.stage}: category "${category.category}" is never asserted.`);
      }
    }
  }

  for (const canary of canaries) {
    if (!canary.found) {
      failures.push(`${canary.label}: missing vector "${canary.vectorName}" in ${canary.file}.`);
    }
  }

  return {
    stages,
    canaries,
    gate: {
      passed: failures.length === 0,
      failures,
    },
  };
}

function hasExpectCategory(vector: VectorEntry, category: string): boolean {
  if (!vector || typeof vector !== "object") return false;
  if (!("expect" in vector)) return false;
  const expectValue = vector.expect;
  if (!expectValue || typeof expectValue !== "object" || Array.isArray(expectValue)) return false;
  return Object.prototype.hasOwnProperty.call(expectValue, category);
}

function loadVectorsFromDir(dir: string): VectorEntry[] {
  if (!fs.existsSync(dir)) return [];
  const files = fs
    .readdirSync(dir)
    .filter((file) => file.endsWith(".json") && file !== "failures.json")
    .sort();

  return files.flatMap((file) => loadVectorsFromFile(path.join(dir, file)));
}

function loadVectorsFromFile(filePath: string): VectorEntry[] {
  if (!fs.existsSync(filePath)) return [];
  const payload = JSON.parse(fs.readFileSync(filePath, "utf8")) as unknown;
  if (!Array.isArray(payload)) return [];
  return payload.filter((entry): entry is VectorEntry => !!entry && typeof entry === "object");
}
