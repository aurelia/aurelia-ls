#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const INDENT = "  ";
const MAX_INLINE = Number(240);

function isScalar(v) {
  return v === null || typeof v === "string" || typeof v === "number" || typeof v === "boolean";
}

function inlineObjectOrNull(obj, maxLen = MAX_INLINE) {
  if (obj === null || Array.isArray(obj) || typeof obj !== "object") return null;
  const parts = [];
  for (const k of Object.keys(obj)) {
    const v = obj[k];
    if (!isScalar(v)) return null; // only inline if all values are scalars
    parts.push(`${JSON.stringify(k)}: ${JSON.stringify(v)}`);
  }
  const s = `{ ${parts.join(", ")} }`;
  return s.length <= maxLen ? s : null;
}

function format(value, depth = 0) {
  const pad = INDENT.repeat(depth);
  const pad1 = INDENT.repeat(depth + 1);

  if (Array.isArray(value)) {
    if (value.length === 0) return "[]";

    // If the array is all inlineable objects, print one object per line
    const inlineables = value.map(v =>
      typeof v === "object" && v !== null ? inlineObjectOrNull(v) : null
    );
    if (inlineables.length > 0 && inlineables.every(Boolean)) {
      const lines = inlineables.map(s => `${pad1}${s}`);
      return `[\n${lines.join(",\n")}\n${pad}]`;
    }

    // Otherwise, standard pretty array
    const lines = value.map(v => `${pad1}${format(v, depth + 1)}`);
    return `[\n${lines.join(",\n")}\n${pad}]`;
  }

  if (value && typeof value === "object") {
    const keys = Object.keys(value);
    if (keys.length === 0) return "{}";

    const maybeInline = inlineObjectOrNull(value);
    if (maybeInline) return maybeInline;

    const lines = keys.map(k => `${pad1}${JSON.stringify(k)}: ${format(value[k], depth + 1)}`);
    return `{\n${lines.join(",\n")}\n${pad}}`;
  }

  return JSON.stringify(value);
}

function processPath(p) {
  const stat = fs.statSync(p);
  if (stat.isDirectory()) {
    for (const entry of fs.readdirSync(p)) {
      if (entry === "node_modules" || entry.startsWith(".")) continue;
      processPath(path.join(p, entry));
    }
  } else if (p.endsWith(".json")) {
    const raw = fs.readFileSync(p, "utf8");
    const json = JSON.parse(raw);
    const out = format(json, 0) + "\n";
    if (out !== raw) fs.writeFileSync(p, out, "utf8");
    console.log(`formatted: ${p}`);
  }
}

const args = process.argv.slice(2);
if (args.length === 0) {
  console.error("Usage: node scripts/fmt-json-vectors.mjs <file-or-dir> [...]");
  process.exit(1);
}
for (const p of args) processPath(path.resolve(p));
