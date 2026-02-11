import fs from "node:fs";
import path from "node:path";

const STAGES = [
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
    categories: ["expected", "inferred", "diags"],
  },
];

const REQUIRED_CANARIES = [
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

const report = buildVectorContractCoverageReport();
printReport(report);

if (!report.gate.passed) {
  process.exitCode = 1;
}

function printReport(value) {
  console.log("Compiler Vector Contract Coverage");
  console.log("");
  for (const stage of value.stages) {
    console.log(`- ${stage.stage}: ${stage.totalVectors} vectors`);
    for (const category of stage.categories) {
      const pct = stage.totalVectors === 0 ? 0 : Math.round((category.assertedVectors / stage.totalVectors) * 100);
      console.log(`  - ${category.category}: ${category.assertedVectors}/${category.totalVectors} (${pct}%)`);
    }
  }
  console.log("");
  console.log("Required canaries:");
  for (const canary of value.canaries) {
    console.log(`- [${canary.found ? "x" : " "}] ${canary.label} (${canary.file} :: ${canary.vectorName})`);
  }
  console.log("");
  if (value.gate.passed) {
    console.log("Gate: PASS");
  } else {
    console.log("Gate: FAIL");
    for (const failure of value.gate.failures) {
      console.log(`- ${failure}`);
    }
  }
}

function buildVectorContractCoverageReport(rootDir = process.cwd()) {
  const stages = STAGES.map((stage) => {
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

  const canaries = REQUIRED_CANARIES.map((required) => {
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

  const failures = [];
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

function hasExpectCategory(vector, category) {
  if (!vector || typeof vector !== "object") return false;
  if (!("expect" in vector)) return false;
  const expectValue = vector.expect;
  if (!expectValue || typeof expectValue !== "object" || Array.isArray(expectValue)) return false;
  return Object.prototype.hasOwnProperty.call(expectValue, category);
}

function loadVectorsFromDir(dir) {
  if (!fs.existsSync(dir)) return [];
  const files = fs
    .readdirSync(dir)
    .filter((file) => file.endsWith(".json") && file !== "failures.json")
    .sort();

  return files.flatMap((file) => loadVectorsFromFile(path.join(dir, file)));
}

function loadVectorsFromFile(filePath) {
  if (!fs.existsSync(filePath)) return [];
  const payload = JSON.parse(fs.readFileSync(filePath, "utf8"));
  if (!Array.isArray(payload)) return [];
  return payload.filter((entry) => !!entry && typeof entry === "object");
}
