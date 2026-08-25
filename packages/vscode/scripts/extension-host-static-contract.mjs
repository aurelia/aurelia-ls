import { createHash } from "node:crypto";
import { lstatSync, readFileSync } from "node:fs";
import { isAbsolute, join, relative, resolve } from "node:path";

export const extensionHostStaticContractSchema =
  "aurelia-extension-host-static-contract/1";
export const extensionHostStaticContractFiles = Object.freeze([
  "dist/extension.cjs",
  "dist/server/main.cjs",
  "package.json",
]);

/** Hash the exact product bytes launched by one Extension Development Host. */
export function extensionHostStaticContractSha256(extensionRoot) {
  const normalizedRoot = resolve(extensionRoot);
  const rootRecord = lstatSync(normalizedRoot);
  if (!rootRecord.isDirectory() || rootRecord.isSymbolicLink()) {
    throw new Error("Static contract extension root must be a regular non-symbolic directory.");
  }
  const hash = createHash("sha256");
  hash.update(Buffer.from(`${extensionHostStaticContractSchema}\0`, "utf8"));

  for (const relativePath of extensionHostStaticContractFiles) {
    const absolutePath = resolve(normalizedRoot, ...relativePath.split("/"));
    const pathFromRoot = relative(normalizedRoot, absolutePath);
    if (
      pathFromRoot.length === 0
      || pathFromRoot.startsWith("..")
      || isAbsolute(pathFromRoot)
    ) {
      throw new Error(`Static contract path escapes the extension root: ${relativePath}`);
    }
    let ancestor = normalizedRoot;
    for (const segment of relativePath.split("/").slice(0, -1)) {
      ancestor = join(ancestor, segment);
      const ancestorRecord = lstatSync(ancestor);
      if (!ancestorRecord.isDirectory() || ancestorRecord.isSymbolicLink()) {
        throw new Error(`Static contract path has a symbolic or non-directory ancestor: ${relativePath}`);
      }
    }

    let file;
    try {
      file = lstatSync(absolutePath);
    } catch (error) {
      throw new Error(`Static contract file is missing: ${relativePath}`, { cause: error });
    }
    if (!file.isFile() || file.isSymbolicLink()) {
      throw new Error(`Static contract path must be a regular non-symbolic file: ${relativePath}`);
    }

    const pathBytes = Buffer.from(relativePath, "utf8");
    const content = readFileSync(absolutePath);
    hash.update(unsignedBigEndian(pathBytes.length, 4));
    hash.update(pathBytes);
    hash.update(unsignedBigEndian(content.length, 8));
    hash.update(content);
  }

  return hash.digest("hex");
}

function unsignedBigEndian(value, byteLength) {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new Error(`Static contract frame length is invalid: ${value}`);
  }
  const frame = Buffer.alloc(byteLength);
  if (byteLength === 4) {
    frame.writeUInt32BE(value);
  } else {
    frame.writeBigUInt64BE(BigInt(value));
  }
  return frame;
}
