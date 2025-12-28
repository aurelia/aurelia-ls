import { test, expect } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { OverlayFs } from "../../out/services/overlay-fs.js";
import { createPathUtils } from "../../out/services/paths.js";

const paths = createPathUtils();

test("overlay snapshots are versioned and preferred over disk", () => {
  const overlay = new OverlayFs(paths);
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "au-overlay-"));
  const diskFile = path.join(tmp, "disk.ts");
  fs.writeFileSync(diskFile, "export const fromDisk = 1;", "utf8");

  try {
    const first = overlay.upsert(diskFile, "export const fromOverlay = 1;");
    expect(first.version).toBe(1);
    expect(overlay.snapshot(diskFile)?.text).toBe("export const fromOverlay = 1;");
    expect(overlay.readFile(diskFile)).toBe("export const fromOverlay = 1;");

    const second = overlay.upsert(diskFile, "export const bumped = 2;");
    expect(second.version).toBe(2);
    expect(overlay.snapshot(diskFile)?.version).toBe(2);

    overlay.delete(diskFile);
    expect(overlay.snapshot(diskFile)).toBe(undefined);
    expect(overlay.readFile(diskFile)).toBe("export const fromDisk = 1;");
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test("script roots merge base files with overlays", () => {
  const overlay = new OverlayFs(paths);
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "au-overlay-roots-"));
  const baseA = path.join(root, "src", "a.ts");
  const baseB = path.join(root, "src", "b.ts");
  try {
    overlay.setBaseRoots([baseA, baseB]);
    expect(new Set(overlay.listScriptRoots())).toEqual(new Set([
      paths.canonical(baseA),
      paths.canonical(baseB),
    ]));

    const virtual = path.join(root, ".aurelia", "overlay.ts");
    overlay.upsert(virtual, "// overlay root");
    expect(new Set(overlay.listScriptRoots())).toEqual(new Set([
      paths.canonical(baseA),
      paths.canonical(baseB),
      paths.canonical(virtual),
    ]));
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
