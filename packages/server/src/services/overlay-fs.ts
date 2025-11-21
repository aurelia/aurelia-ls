import * as fs from "node:fs";
import { PathUtils } from "./paths.js";

export interface Snapshot {
  text: string;
  version: number;
}

export class OverlayFs {
  #paths: PathUtils;
  #files = new Map<string, Snapshot>();
  #scriptRoots = new Set<string>();

  constructor(paths: PathUtils) {
    this.#paths = paths;
  }

  has(file: string): boolean {
    return this.#files.has(this.#paths.canonical(file));
  }

  snapshot(file: string): Snapshot | undefined {
    return this.#files.get(this.#paths.canonical(file));
  }

  upsert(fileAbs: string, text: string): Snapshot {
    const key = this.#paths.canonical(fileAbs);
    const prev = this.#files.get(key);
    const next: Snapshot = { text, version: (prev?.version ?? 0) + 1 };
    this.#files.set(key, next);
    this.#scriptRoots.add(key);
    return next;
  }

  listScriptRoots(): string[] {
    return Array.from(this.#scriptRoots);
  }

  listOverlays(): string[] {
    return Array.from(this.#files.keys());
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
