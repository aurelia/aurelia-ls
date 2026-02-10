#!/usr/bin/env node
/**
 * Dump template analysis (hovers, diagnostics) to separate files for review.
 *
 * Usage:
 *   node scripts/dump-template.mjs <project-root> <template-path> <output-dir>
 *
 * Example:
 *   node scripts/dump-template.mjs ../cortex-device-list src/cortex-devices.html dumps/cortex-devices
 *
 * Output files:
 *   <output-dir>/meta.json         — summary stats
 *   <output-dir>/hovers.json       — deduplicated hover cards
 *   <output-dir>/diagnostics.json  — review diagnostics (deduped across surfaces)
 *   <output-dir>/suppressed.json   — suppressed diagnostics
 */

import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

// Dynamic imports from compiled output
const semanticWorkspaceMod = await import(
  pathToFileURL(
    path.resolve(process.cwd(), "packages/semantic-workspace/out/engine.js")
  ).href
);
const compilerMod = await import(
  pathToFileURL(
    path.resolve(process.cwd(), "packages/compiler/out/index.js")
  ).href
);

const { createSemanticWorkspace } = semanticWorkspaceMod;
const { createNodeFileSystem, asDocumentUri } = compilerMod;

// --------------------------------------------------------------------------
// Args
// --------------------------------------------------------------------------

const args = process.argv.slice(2);
if (args.length < 3) {
  console.error("Usage: dump-template.mjs <project-root> <template-path> <output-dir>");
  console.error("Example: dump-template.mjs ../cortex-device-list src/cortex-devices.html dumps/cortex-devices");
  process.exit(1);
}

const [projectRootArg, templatePathArg, outputDirArg] = args;
const projectRoot = path.resolve(process.cwd(), projectRootArg);
const templatePath = path.isAbsolute(templatePathArg)
  ? templatePathArg
  : path.join(projectRoot, templatePathArg);
const outputDir = path.resolve(process.cwd(), outputDirArg);

if (!fs.existsSync(projectRoot)) {
  console.error(`Project root not found: ${projectRoot}`);
  process.exit(1);
}

if (!fs.existsSync(templatePath)) {
  console.error(`Template not found: ${templatePath}`);
  process.exit(1);
}

const tsconfigPath = path.join(projectRoot, "tsconfig.json");
if (!fs.existsSync(tsconfigPath)) {
  console.warn(`Warning: tsconfig.json not found at ${tsconfigPath}`);
}

// --------------------------------------------------------------------------
// Workspace setup
// --------------------------------------------------------------------------

const TAG = "[dump-template]";

console.error(`${TAG} Project root: ${projectRoot}`);
console.error(`${TAG} Template: ${templatePath}`);
console.error(`${TAG} Output dir: ${outputDir}`);
console.error(`${TAG} Initializing workspace...`);

const logger = {
  log: (...a) => console.error("[log]", ...a),
  info: (...a) => console.error("[info]", ...a),
  warn: (...a) => console.error("[warn]", ...a),
  error: (...a) => console.error("[error]", ...a),
};

const workspace = createSemanticWorkspace({
  logger,
  workspaceRoot: projectRoot,
  tsconfigPath: fs.existsSync(tsconfigPath) ? tsconfigPath : null,
  resolution: {
    packagePath: projectRoot,
    fileSystem: createNodeFileSystem({ root: projectRoot }),
    stripSourcedNodes: true,
  },
  // Use the workspace's default TS adapter (do not pass a boolean here).
});

// Run third-party npm analysis to discover resources from node_modules
console.error(`${TAG} Running third-party npm analysis...`);
await workspace.initThirdParty();

// --------------------------------------------------------------------------
// Template processing
// --------------------------------------------------------------------------

const templateText = fs.readFileSync(templatePath, "utf8");
const templateUri = asDocumentUri(templatePath);

console.error(`${TAG} Opening template (${templateText.length} chars)...`);
workspace.open(templateUri, templateText);

// --------------------------------------------------------------------------
// Helpers
// --------------------------------------------------------------------------

function samplePositions(text, everyN = 5) {
  const positions = new Set();
  positions.add(0);
  positions.add(text.length);

  let lineStart = 0;
  for (let i = 0; i < text.length; i++) {
    if (text[i] === "\n") {
      positions.add(lineStart);
      positions.add(i);
      lineStart = i + 1;
    }
  }
  positions.add(lineStart);

  const isWs = (ch) => ch === " " || ch === "\t" || ch === "\n" || ch === "\r";
  for (let i = 1; i < text.length; i++) {
    if (isWs(text[i - 1]) !== isWs(text[i])) {
      positions.add(i);
    }
  }

  const special = new Set(["<", ">", "=", '"', "'", "{", "}", "$", ".", ":"]);
  for (let i = 0; i < text.length; i++) {
    if (special.has(text[i])) {
      positions.add(i);
      positions.add(i + 1);
    }
  }

  for (let i = 0; i < text.length; i += everyN) {
    positions.add(i);
  }

  return Array.from(positions).sort((a, b) => a - b);
}

function offsetToPosition(text, offset) {
  let line = 0;
  let col = 0;
  for (let i = 0; i < offset && i < text.length; i++) {
    if (text[i] === "\n") {
      line++;
      col = 0;
    } else {
      col++;
    }
  }
  return { line, character: col };
}

function getPreview(text, offset, radius = 20) {
  const start = Math.max(0, offset - radius);
  const end = Math.min(text.length, offset + radius);
  const before = text.slice(start, offset).replace(/\n/g, "\\n");
  const after = text.slice(offset, end).replace(/\n/g, "\\n");
  return `${before}|${after}`;
}

function stableStringify(value) {
  if (value === null || value === undefined) return "null";
  if (Array.isArray(value)) return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  if (typeof value === "object") {
    const record = value;
    const keys = Object.keys(record).sort();
    return `{${keys.map((k) => `${JSON.stringify(k)}:${stableStringify(record[k])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

function spanKey(span) {
  if (!span) return "null";
  return `${span.file ?? ""}:${span.start}:${span.end}`;
}

// --------------------------------------------------------------------------
// Hover collection
// --------------------------------------------------------------------------

console.error(`${TAG} Collecting hovers...`);

const positions = samplePositions(templateText);
console.error(`${TAG} Sampling ${positions.length} positions`);

const query = workspace.query(templateUri);
const hoverResults = [];
let hoverCount = 0;

for (const offset of positions) {
  const pos = offsetToPosition(templateText, offset);
  const hover = query.hover(pos);

  if (hover && hover.contents) {
    hoverCount++;
    hoverResults.push({
      offset,
      line: pos.line + 1,
      character: pos.character + 1,
      preview: getPreview(templateText, offset),
      contents: hover.contents,
      span: hover.location?.span ?? null,
      exprId: hover.location?.exprId ?? null,
      nodeId: hover.location?.nodeId ?? null,
    });
  }
}

console.error(`${TAG} Found ${hoverCount} hovers at ${positions.length} positions`);

// Deduplication (consecutive identical hovers)
const hovers = [];
let lastContents = null;
let lastSpanKey = null;

for (const r of hoverResults) {
  const spanKey = r.span ? `${r.span.start}-${r.span.end}` : null;
  if (r.contents === lastContents && spanKey === lastSpanKey) continue;
  hovers.push(r);
  lastContents = r.contents;
  lastSpanKey = spanKey;
}

console.error(`${TAG} After dedup: ${hovers.length} unique hovers`);

// --------------------------------------------------------------------------
// Diagnostics collection
// --------------------------------------------------------------------------

console.error(`${TAG} Collecting diagnostics...`);

const routed = workspace.diagnostics(templateUri);
const diagnosticsRaw = [];
const diagnosticSurfaceCounts = {};

for (const [surface, diags] of routed.bySurface) {
  diagnosticSurfaceCounts[surface] = (diagnosticSurfaceCounts[surface] ?? 0) + diags.length;
  for (const d of diags) {
    diagnosticsRaw.push({
      surface,
      code: d.code,
      severity: d.severity,
      message: d.message,
      span: d.span ?? null,
      preview: d.span ? getPreview(templateText, d.span.start) : null,
      stage: d.stage ?? null,
      impact: d.impact,
      actionability: d.actionability,
      data: d.data,
    });
  }
}

const diagnosticGroups = new Map();
for (const d of diagnosticsRaw) {
  const key = [
    d.code,
    d.severity,
    d.message,
    d.stage ?? "",
    d.impact ?? "",
    d.actionability ?? "",
    spanKey(d.span),
    stableStringify(d.data ?? null),
  ].join("|");
  const existing = diagnosticGroups.get(key);
  if (existing) {
    if (!existing.surfaces.includes(d.surface)) existing.surfaces.push(d.surface);
    continue;
  }
  diagnosticGroups.set(key, {
    code: d.code,
    severity: d.severity,
    message: d.message,
    span: d.span,
    preview: d.preview,
    stage: d.stage,
    impact: d.impact,
    actionability: d.actionability,
    data: d.data,
    surfaces: [d.surface],
  });
}

const diagnostics = Array.from(diagnosticGroups.values())
  .map((d) => ({ ...d, surfaces: [...d.surfaces].sort() }))
  .sort((a, b) => {
    const aStart = a.span?.start ?? -1;
    const bStart = b.span?.start ?? -1;
    if (aStart !== bStart) return aStart - bStart;
    const aEnd = a.span?.end ?? -1;
    const bEnd = b.span?.end ?? -1;
    if (aEnd !== bEnd) return aEnd - bEnd;
    return String(a.code).localeCompare(String(b.code));
  });

const suppressed = (routed.suppressed ?? []).map((d) => ({
  code: d.code,
  severity: d.severity,
  message: d.message,
  span: d.span ?? null,
  preview: d.span ? getPreview(templateText, d.span.start) : null,
  suppressionReason: d.suppressionReason ?? null,
}));

console.error(`${TAG} Found ${diagnostics.length} diagnostics (${diagnosticsRaw.length} raw), ${suppressed.length} suppressed`);

// --------------------------------------------------------------------------
// Output — separate files
// --------------------------------------------------------------------------

fs.mkdirSync(outputDir, { recursive: true });

const meta = {
  projectRoot,
  templatePath,
  templateUri,
  templateLength: templateText.length,
  positionsSampled: positions.length,
  hoversFound: hoverCount,
  uniqueHovers: hovers.length,
  diagnosticRawCount: diagnosticsRaw.length,
  diagnosticCount: diagnostics.length,
  diagnosticSurfaceCounts,
  suppressedCount: suppressed.length,
  timestamp: new Date().toISOString(),
};

const write = (name, data) => {
  const p = path.join(outputDir, name);
  fs.writeFileSync(p, JSON.stringify(data, null, 2), "utf8");
  console.error(`${TAG} Written ${p}`);
};

write("meta.json", meta);
write("hovers.json", hovers);
write("diagnostics.json", diagnostics);
write("suppressed.json", suppressed);

console.error(`${TAG} Done.`);
