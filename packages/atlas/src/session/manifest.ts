import { mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { isProcessAlive } from "./process.js";

import {
  INQUIRY_SESSION_MANIFEST_VERSION,
  type InquirySessionManifest,
} from "./protocol.js";

/** Read a session manifest if it exists and has the expected broad shape. */
export function readInquirySessionManifest(
  /** Manifest path to read. */
  manifestPath: string,
): InquirySessionManifest | undefined {
  let contents: string;
  try {
    contents = readFileSync(manifestPath, "utf8");
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") return undefined;
    throw error;
  }

  try {
    const parsed = JSON.parse(contents) as Partial<InquirySessionManifest>;
    if (
      parsed.schemaVersion !== INQUIRY_SESSION_MANIFEST_VERSION
      || parsed.packageName !== "@aurelia-ls/atlas"
      || typeof parsed.pid !== "number" || !Number.isSafeInteger(parsed.pid) || parsed.pid <= 0
      || typeof parsed.endpoint?.port !== "number" || !Number.isInteger(parsed.endpoint.port)
      || parsed.endpoint.port <= 0 || parsed.endpoint.port > 65_535
      || typeof parsed.startedAt !== "string"
      || typeof parsed.manifestPath !== "string"
      || parsed.endpoint.host !== "127.0.0.1"
      || typeof parsed.buildHash !== "string"
    ) {
      return undefined;
    }
    return parsed as InquirySessionManifest;
  } catch {
    return undefined;
  }
}

/** Atomically write the active session manifest. */
export function writeInquirySessionManifest(
  /** Manifest path to write. */
  manifestPath: string,
  /** Manifest contents to persist. */
  manifest: InquirySessionManifest,
): void {
  mkdirSync(dirname(manifestPath), { recursive: true });
  const tempPath = `${manifestPath}.${process.pid}.tmp`;
  writeFileSync(tempPath, `${JSON.stringify(manifest, null, 2)}\n`);
  renameSync(tempPath, manifestPath);
}

/** Test the actual daemon lease for pinned reads and shutdown, including when root hashes match after a dependency edit. */
export function ownsInquirySessionManifest(manifest: InquirySessionManifest): boolean {
  const current = readInquirySessionManifest(manifest.manifestPath);
  return current?.pid === manifest.pid && current.startedAt === manifest.startedAt
    && current.endpoint.port === manifest.endpoint.port && isProcessAlive(manifest.pid);
}

/** Remove the active manifest only when it still belongs to the expected process. */
export function removeInquirySessionManifest(
  /** Manifest path to remove. */
  manifestPath: string,
  /** Process id expected to own the manifest. */
  expectedPid: number,
): void {
  const current = readInquirySessionManifest(manifestPath);
  if (current?.pid === expectedPid) {
    rmSync(manifestPath, { force: true });
  }
}
