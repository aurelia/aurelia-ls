import * as fs from "node:fs";
import type { NormalizedPath } from "@aurelia-ls/compiler/model/identity.js";
import type { PathUtils } from "./paths.js";

export interface Snapshot {
  text: string;
  version: number;
}

export class OverlayFs {
  #paths: PathUtils;
  #files = new Map<NormalizedPath, Snapshot>();
  #scriptRoots = new Set<NormalizedPath>();
  #baseRoots = new Set<NormalizedPath>();

  constructor(paths: PathUtils) {
    this.#paths = paths;
  }

  has(file: string): boolean {
    return this.#files.has(this.#paths.canonical(file));
  }

  snapshot(file: string): Snapshot | undefined {
    return this.#files.get(this.#paths.canonical(file));
  }

  delete(fileAbs: string): void {
    const key = this.#paths.canonical(fileAbs);
    this.#files.delete(key);
    this.#scriptRoots.delete(key);
  }

  upsert(fileAbs: string, text: string): Snapshot {
    const key = this.#paths.canonical(fileAbs);
    const prev = this.#files.get(key);
    const next: Snapshot = { text, version: (prev?.version ?? 0) + 1 };
    this.#files.set(key, next);
    this.#scriptRoots.add(key);
    return next;
  }

  setBaseRoots(files: Iterable<string>): void {
    this.#baseRoots.clear();
    for (const file of files) {
      this.#baseRoots.add(this.#paths.canonical(file));
    }
  }

  listScriptRoots(): string[] {
    const roots = new Set<NormalizedPath>();
    for (const base of this.#baseRoots) roots.add(base);
    for (const overlay of this.#scriptRoots) roots.add(overlay);
    return Array.from(roots);
  }

  listOverlays(): string[] {
    return Array.from(this.#files.keys());
  }

  clear(): void {
    this.#files.clear();
    this.#scriptRoots.clear();
    this.#baseRoots.clear();
  }

  fileExists(file: string): boolean {
    const key = this.#paths.canonical(file);
    return this.#files.has(key) || fs.existsSync(file);
  }

  readFile(file: string): string | undefined {
    const fromOverlay = this.snapshot(file);
    if (fromOverlay) return fromOverlay.text;
    return fs.existsSync(file) ? fs.readFileSync(file, "utf8") : undefined;
  }
}
