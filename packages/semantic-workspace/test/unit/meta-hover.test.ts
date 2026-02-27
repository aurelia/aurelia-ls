import { describe, it, expect } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { asDocumentUri } from "@aurelia-ls/compiler";
import { createSemanticWorkspace } from "../../out/engine.js";

const logger = {
  log() {},
  info() {},
  warn() {},
  error() {},
};

function computeLineStarts(text: string): number[] {
  const starts = [0];
  for (let i = 0; i < text.length; i += 1) {
    const ch = text.charCodeAt(i);
    if (ch === 13 /* CR */ || ch === 10 /* LF */) {
      if (ch === 13 /* CR */ && text.charCodeAt(i + 1) === 10 /* LF */) i += 1;
      starts.push(i + 1);
    }
  }
  return starts;
}

function positionAt(text: string, offset: number): { line: number; character: number } {
  const clamped = Math.max(0, Math.min(offset, text.length));
  const starts = computeLineStarts(text);
  let line = 0;
  while (line + 1 < starts.length && (starts[line + 1] ?? Number.POSITIVE_INFINITY) <= clamped) {
    line += 1;
  }
  const lineStart = starts[line] ?? 0;
  return { line, character: clamped - lineStart };
}

function findPosition(text: string, needle: string, delta = 0): { line: number; character: number } {
  const index = text.indexOf(needle);
  if (index < 0) {
    throw new Error(`Marker not found: ${needle}`);
  }
  return positionAt(text, index + delta);
}

describe("semantic workspace meta hover", () => {
  it("returns hover content for import and bindable metadata", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "au-meta-hover-"));
    const tsconfigPath = path.join(root, "tsconfig.json");
    const modulePath = path.join(root, "nav-bar.ts");
    const templatePath = path.join(root, "component.html");

    try {
      fs.writeFileSync(tsconfigPath, JSON.stringify({ compilerOptions: { target: "ES2022" }, include: [] }));
      fs.writeFileSync(modulePath, "export class NavBar {}");

      const workspace = createSemanticWorkspace({
        logger,
        workspaceRoot: root,
        tsconfigPath,
        typescript: false,
      });

      const markup = [
        "<template>",
        "  <import from=\"./nav-bar\"></import>",
        "  <bindable name=\"title\" mode=\"two-way\"></bindable>",
        "</template>",
        "",
      ].join("\n");

      const uri = asDocumentUri(templatePath);
      workspace.open(uri, markup);

      const query = workspace.query(uri);
      const importHover = query.hover(findPosition(markup, "<import", 1));
      expect(importHover?.contents).toContain("<import>");

      const bindableHover = query.hover(findPosition(markup, "title", 1));
      expect(bindableHover?.contents).toContain("(bindable)");

      const modeHover = query.hover(findPosition(markup, "two-way", 1));
      expect(modeHover?.contents).toContain("(binding mode)");

      const def = query.definition(findPosition(markup, "./nav-bar", 1));
      expect(def[0]?.uri).toContain("nav-bar.ts");
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });
});
