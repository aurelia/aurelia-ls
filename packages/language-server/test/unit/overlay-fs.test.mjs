import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
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
    assert.equal(first.version, 1);
    assert.equal(overlay.snapshot(diskFile)?.text, "export const fromOverlay = 1;");
    assert.equal(overlay.readFile(diskFile), "export const fromOverlay = 1;");

    const second = overlay.upsert(diskFile, "export const bumped = 2;");
    assert.equal(second.version, 2);
    assert.equal(overlay.snapshot(diskFile)?.version, 2);

    overlay.delete(diskFile);
    assert.equal(overlay.snapshot(diskFile), undefined);
    assert.equal(overlay.readFile(diskFile), "export const fromDisk = 1;");
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
    assert.deepEqual(new Set(overlay.listScriptRoots()), new Set([
      paths.canonical(baseA),
      paths.canonical(baseB),
    ]));

    const virtual = path.join(root, ".aurelia", "overlay.ts");
    overlay.upsert(virtual, "// overlay root");
    assert.deepEqual(new Set(overlay.listScriptRoots()), new Set([
      paths.canonical(baseA),
      paths.canonical(baseB),
      paths.canonical(virtual),
    ]));
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
