import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

import {
  INQUIRY_SESSION_MANIFEST_VERSION,
  type InquirySessionManifest,
} from "./protocol.js";

/** Read a session manifest if it exists and has the expected broad shape. */
export function readInquirySessionManifest(
  /** Manifest path to read. */
  manifestPath: string,
): InquirySessionManifest | undefined {
  if (!existsSync(manifestPath)) {
    return undefined;
  }

  try {
    const parsed = JSON.parse(readFileSync(manifestPath, "utf8")) as Partial<InquirySessionManifest>;
    if (
      parsed.schemaVersion !== INQUIRY_SESSION_MANIFEST_VERSION
      || parsed.packageName !== "@aurelia-ls/atlas"
      || typeof parsed.pid !== "number"
      || typeof parsed.endpoint?.port !== "number"
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
