import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  constants as fsConstants,
  copyFileSync,
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  realpathSync,
  rmSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { TextDecoder } from "node:util";
import { inflateRawSync } from "node:zlib";

export const artifactSchemaVersion = "aurelia-ls/vscode-vsix-artifact/v1";
export const archiveLimits = Object.freeze({
  maximumCompressedBytes: 32 * 1024 * 1024,
  maximumUncompressedBytes: 64 * 1024 * 1024,
  maximumLargestFileBytes: 16 * 1024 * 1024,
  maximumFileCount: 512,
});

const require = createRequire(import.meta.url);
const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
export const extensionRoot = path.resolve(scriptDirectory, "..");
export const repoRoot = path.resolve(extensionRoot, "../..");
export const releaseRoot = path.join(extensionRoot, ".release");
export const expectedTypeScriptVersion = "6.0.3";
const fixedLocalFiles = Object.freeze([
  ["extension/package.json", "package.json", "local"],
  ["extension/readme.md", "README.md", "local"],
  ["extension/changelog.md", "CHANGELOG.md", "local"],
  ["extension/LICENSE.txt", "LICENSE", "local"],
  ["extension/images/logo.png", "images/logo.png", "local"],
  ["extension/language-configuration.json", "language-configuration.json", "local"],
  ["extension/snippets/html.code-snippets", "snippets/html.code-snippets", "local"],
  ["extension/syntaxes/aurelia-html.tmLanguage.json", "syntaxes/aurelia-html.tmLanguage.json", "local"],
]);
const controlEntries = Object.freeze(["[Content_Types].xml", "extension.vsixmanifest"]);
const bundleOutputs = Object.freeze([
  "dist/extension.cjs",
  "dist/extension.cjs.map",
  "dist/server/main.cjs",
  "dist/server/main.cjs.map",
]);
const projectSchemaRelativePath = "dist/schemas/aurelia.project.schema.json";
const projectDialectSchemaRelativePath = "dist/schemas/aurelia.project.jsonc.schema.json";
const utf8Decoder = new TextDecoder("utf-8", { fatal: true });

export function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

export function assertInside(parent, child, label) {
  const parentPath = path.resolve(parent);
  const childPath = path.resolve(child);
  const relative = path.relative(parentPath, childPath);
  if (relative === "" || relative === "." || relative.startsWith(`..${path.sep}`) || relative === ".." || path.isAbsolute(relative)) {
    throw new Error(`${label} must be a strict child of ${parentPath}: ${childPath}`);
  }
  return childPath;
}

function sameAbsolutePath(left, right) {
  const relative = path.relative(path.resolve(left), path.resolve(right));
  return relative === "" || relative === ".";
}

function assertCanonicalDescendant(parent, child, label) {
  const childPath = assertInside(parent, child, label);
  const lexicalRelative = path.relative(path.resolve(parent), childPath);
  const expected = path.resolve(realpathSync(parent), lexicalRelative);
  const actual = realpathSync(childPath);
  if (!sameAbsolutePath(actual, expected)) {
    throw new Error(`${label} resolved unexpectedly below its trusted parent: ${childPath}`);
  }
}

function captureDirectoryWitness(directoryPath, label) {
  const resolved = path.resolve(directoryPath);
  const info = lstatSync(resolved);
  if (info.isSymbolicLink() || !info.isDirectory()) {
    throw new Error(`${label} must be a regular non-symlink directory: ${resolved}`);
  }
  return Object.freeze({
    path: resolved,
    realPath: realpathSync(resolved),
    dev: info.dev,
    ino: info.ino,
    birthtimeMs: info.birthtimeMs,
  });
}

function assertDirectoryWitness(witness, label) {
  const current = captureDirectoryWitness(witness.path, label);
  if (
    !sameAbsolutePath(current.realPath, witness.realPath)
    || current.dev !== witness.dev
    || current.ino !== witness.ino
    || current.birthtimeMs !== witness.birthtimeMs
  ) {
    throw new Error(`${label} identity changed during the release operation: ${witness.path}`);
  }
}

function assertExactTrustedFile(parent, filePath, label, expectedBytes) {
  assertRegularUnlinkedFile(filePath, label);
  assertCanonicalDescendant(parent, filePath, label);
  const expected = Buffer.isBuffer(expectedBytes) ? expectedBytes : Buffer.from(expectedBytes);
  if (!readFileSync(filePath).equals(expected)) {
    throw new Error(`${label} bytes changed during the release operation: ${filePath}`);
  }
}

function canonicalEvidencePath(root, candidate) {
  return path.relative(realpathSync(root), realpathSync(candidate)).split(path.sep).join("/");
}

function assertRegularUnlinkedFile(filePath, label) {
  const info = lstatSync(filePath);
  if (info.isSymbolicLink() || !info.isFile()) {
    throw new Error(`${label} must be a regular non-symlink file: ${filePath}`);
  }
}

function walkRegularFiles(root) {
  const result = [];
  const visit = (directory) => {
    const directoryInfo = lstatSync(directory);
    if (directoryInfo.isSymbolicLink() || !directoryInfo.isDirectory()) {
      throw new Error(`Release input directory must be a regular directory: ${directory}`);
    }
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const absolute = path.join(directory, entry.name);
      if (entry.isSymbolicLink()) {
        throw new Error(`Release input must not contain symlinks: ${absolute}`);
      }
      if (entry.isDirectory()) {
        visit(absolute);
      } else if (entry.isFile()) {
        result.push(absolute);
      } else {
        throw new Error(`Unsupported release input entry: ${absolute}`);
      }
    }
  };
  visit(root);
  return result.sort();
}

function assertEqualFiles(left, right, label) {
  const leftBytes = readFileSync(left);
  const rightBytes = readFileSync(right);
  if (!leftBytes.equals(rightBytes)) {
    throw new Error(`${label} differs from its source authority: ${left} != ${right}`);
  }
}

function sourceEntry(sourcePath, kind, authorityPath = null) {
  return Object.freeze({ sourcePath, kind, authorityPath });
}

export function expectedArchiveEntries(root = extensionRoot, options = {}) {
  const entries = new Map();
  for (const [archivePath, relativePath, kind] of fixedLocalFiles) {
    const sourcePath = path.join(root, relativePath);
    assertRegularUnlinkedFile(sourcePath, `Required VSIX input ${relativePath}`);
    entries.set(archivePath, sourceEntry(sourcePath, kind));
  }

  const distRoot = path.join(root, "dist");
  if (!existsSync(distRoot)) {
    throw new Error(`Required VS Code dist directory is missing: ${distRoot}`);
  }

  const expectedDistFiles = new Map();
  for (const relativePath of bundleOutputs) {
    const generatedPath = path.join(root, ...relativePath.split("/"));
    expectedDistFiles.set(relativePath, sourceEntry(generatedPath, "generated"));
  }

  const schemaAuthority = path.resolve(
    options.projectSchemaSource ?? path.join(root, "../semantic-runtime/schema/aurelia.project.schema.json"),
  );
  assertRegularUnlinkedFile(schemaAuthority, "Aurelia project schema authority");
  expectedDistFiles.set(
    projectSchemaRelativePath,
    sourceEntry(path.join(root, ...projectSchemaRelativePath.split("/")), "generated", schemaAuthority),
  );
  const dialectSchemaAuthority = path.resolve(
    options.projectDialectSchemaSource ?? path.join(root, "src/schemas/aurelia.project.jsonc.schema.json"),
  );
  assertRegularUnlinkedFile(dialectSchemaAuthority, "Aurelia project JSONC dialect schema authority");
  expectedDistFiles.set(
    projectDialectSchemaRelativePath,
    sourceEntry(
      path.join(root, ...projectDialectSchemaRelativePath.split("/")),
      "generated",
      dialectSchemaAuthority,
    ),
  );

  const typescriptRoot = realpathSync(options.typescriptRoot ?? path.join(root, "node_modules/typescript"));
  const canonicalRepoRoot = realpathSync(options.repoRoot ?? repoRoot);
  assertInside(canonicalRepoRoot, typescriptRoot, "TypeScript runtime source");
  const typescriptPackage = JSON.parse(readFileSync(path.join(typescriptRoot, "package.json"), "utf8"));
  const packageJson = JSON.parse(readFileSync(path.join(root, "package.json"), "utf8"));
  const requiredTypeScriptVersion = options.expectedTypeScriptVersion ?? expectedTypeScriptVersion;
  if (typescriptPackage.version !== requiredTypeScriptVersion || packageJson.dependencies?.typescript !== requiredTypeScriptVersion) {
    throw new Error(
      `TypeScript runtime must be pinned to ${requiredTypeScriptVersion}; package=${packageJson.dependencies?.typescript}, resolved=${typescriptPackage.version}.`,
    );
  }
  for (const authorityPath of walkRegularFiles(typescriptRoot)) {
    const relativeTypeScriptPath = path.relative(typescriptRoot, authorityPath).split(path.sep).join("/");
    const relativePath = `dist/node_modules/typescript/${relativeTypeScriptPath}`;
    expectedDistFiles.set(
      relativePath,
      sourceEntry(path.join(root, ...relativePath.split("/")), "generated", authorityPath),
    );
  }

  for (const [relativePath, source] of expectedDistFiles) {
    assertRegularUnlinkedFile(source.sourcePath, `Required generated VSIX input ${relativePath}`);
    if (source.authorityPath != null) {
      assertEqualFiles(source.sourcePath, source.authorityPath, `Generated VSIX input ${relativePath}`);
    }
  }
  const actualDistFiles = walkRegularFiles(distRoot)
    .map((sourcePath) => path.relative(root, sourcePath).split(path.sep).join("/"));
  const missingDistFiles = [...expectedDistFiles.keys()].filter((relativePath) => !actualDistFiles.includes(relativePath));
  const extraDistFiles = actualDistFiles.filter((relativePath) => !expectedDistFiles.has(relativePath));
  if (missingDistFiles.length > 0 || extraDistFiles.length > 0) {
    throw new Error(
      `Generated VS Code dist inventory mismatch; missing=[${missingDistFiles.join(", ")}], extra=[${extraDistFiles.join(", ")}].`,
    );
  }

  for (const [relativePath, source] of expectedDistFiles) {
    if (relativePath.endsWith(".map")) continue;
    entries.set(`extension/${relativePath}`, source);
  }
  return entries;
}

export function validateArchivePath(entryPath) {
  if (typeof entryPath !== "string" || entryPath.length === 0) {
    throw new Error("VSIX entry path must be a non-empty string.");
  }
  if (entryPath.includes("\0")) throw new Error(`VSIX entry path contains NUL: ${entryPath}`);
  if (entryPath.includes("\\")) throw new Error(`VSIX entry path contains a backslash: ${entryPath}`);
  if (entryPath.startsWith("/") || /^[A-Za-z]:/u.test(entryPath)) {
    throw new Error(`VSIX entry path is absolute or drive-qualified: ${entryPath}`);
  }
  const segments = entryPath.split("/");
  if (segments.some((segment) => segment === "" || segment === "." || segment === "..")) {
    throw new Error(`VSIX entry path is empty or traversing: ${entryPath}`);
  }
  return entryPath;
}

export function centralDirectoryEntries(buffer) {
  const minimumEocdBytes = 22;
  if (buffer.length < minimumEocdBytes) throw new Error("VSIX archive has no end-of-central-directory record.");
  const eocd = buffer.length - minimumEocdBytes;
  if (buffer.readUInt32LE(eocd) !== 0x06054b50) {
    throw new Error("VSIX archive must end with an uncommented end-of-central-directory record.");
  }
  if (buffer.readUInt16LE(eocd + 20) !== 0) throw new Error("VSIX archive comments are not allowed.");
  const disk = buffer.readUInt16LE(eocd + 4);
  const centralDisk = buffer.readUInt16LE(eocd + 6);
  const diskEntries = buffer.readUInt16LE(eocd + 8);
  const totalEntries = buffer.readUInt16LE(eocd + 10);
  const centralBytes = buffer.readUInt32LE(eocd + 12);
  const centralOffset = buffer.readUInt32LE(eocd + 16);
  if (disk !== 0 || centralDisk !== 0 || diskEntries !== totalEntries) {
    throw new Error("VSIX archive must use one non-spanned ZIP disk.");
  }
  if (totalEntries === 0xffff || centralBytes === 0xffffffff || centralOffset === 0xffffffff) {
    throw new Error("ZIP64 VSIX archives are outside the bounded release contract.");
  }
  if (totalEntries > archiveLimits.maximumFileCount) {
    throw new Error(`VSIX file count ${totalEntries} exceeds ${archiveLimits.maximumFileCount}.`);
  }
  if (centralOffset + centralBytes !== eocd) {
    throw new Error("VSIX central directory does not end immediately before its end record.");
  }
  const records = [];
  let totalCompressedBytes = 0;
  let totalUncompressedBytes = 0;
  let offset = centralOffset;
  for (let index = 0; index < totalEntries; index += 1) {
    if (offset + 46 > buffer.length || buffer.readUInt32LE(offset) !== 0x02014b50) {
      throw new Error(`VSIX central-directory entry ${index} is malformed.`);
    }
    const versionMadeBy = buffer.readUInt16LE(offset + 4);
    const flags = buffer.readUInt16LE(offset + 8);
    const method = buffer.readUInt16LE(offset + 10);
    const crc32 = buffer.readUInt32LE(offset + 16);
    const compressedBytes = buffer.readUInt32LE(offset + 20);
    const uncompressedBytes = buffer.readUInt32LE(offset + 24);
    const nameBytes = buffer.readUInt16LE(offset + 28);
    const extraBytes = buffer.readUInt16LE(offset + 30);
    const commentBytes = buffer.readUInt16LE(offset + 32);
    const diskStart = buffer.readUInt16LE(offset + 34);
    const externalAttributes = buffer.readUInt32LE(offset + 38);
    const localOffset = buffer.readUInt32LE(offset + 42);
    const nameStart = offset + 46;
    const nameEnd = nameStart + nameBytes;
    const next = nameEnd + extraBytes + commentBytes;
    if (next > buffer.length || next > centralOffset + centralBytes) {
      throw new Error(`VSIX central-directory entry ${index} exceeds its declared bounds.`);
    }
    if (extraBytes !== 0 || commentBytes !== 0) {
      throw new Error(`VSIX central-directory entry ${index} must not have extra data or a comment.`);
    }
    if (flags !== 0x0800 && flags !== 0x0808) {
      throw new Error(`VSIX entry ${index} has unsupported flags 0x${flags.toString(16)}.`);
    }
    if (method !== 0 && method !== 8) throw new Error(`VSIX entry ${index} has unsupported compression method ${method}.`);
    if (diskStart !== 0) throw new Error(`VSIX entry ${index} starts on a different ZIP disk.`);
    if (
      compressedBytes === 0xffffffff
      || uncompressedBytes === 0xffffffff
      || localOffset === 0xffffffff
    ) {
      throw new Error("ZIP64 VSIX entries are outside the bounded release contract.");
    }
    const madeByHost = versionMadeBy >>> 8;
    const unixMode = externalAttributes >>> 16;
    const unixType = unixMode & 0o170000;
    if (madeByHost !== 3 || unixType !== 0o100000) {
      throw new Error(`VSIX entry ${index} must be a regular Unix-mode file.`);
    }
    if (uncompressedBytes > archiveLimits.maximumLargestFileBytes) {
      throw new Error(`VSIX entry ${index} size ${uncompressedBytes} exceeds ${archiveLimits.maximumLargestFileBytes}.`);
    }
    totalCompressedBytes += compressedBytes;
    totalUncompressedBytes += uncompressedBytes;
    if (totalCompressedBytes > archiveLimits.maximumCompressedBytes) {
      throw new Error(`VSIX declared compressed payload exceeds ${archiveLimits.maximumCompressedBytes}.`);
    }
    if (totalUncompressedBytes > archiveLimits.maximumUncompressedBytes) {
      throw new Error(`VSIX declared uncompressed payload exceeds ${archiveLimits.maximumUncompressedBytes}.`);
    }
    const rawName = Buffer.from(buffer.subarray(nameStart, nameEnd));
    let name;
    try {
      name = utf8Decoder.decode(rawName);
    } catch {
      throw new Error(`VSIX entry ${index} has an invalid UTF-8 filename.`);
    }
    records.push({
      name,
      rawName,
      flags,
      method,
      crc32,
      compressedBytes,
      uncompressedBytes,
      localOffset,
    });
    offset = next;
  }
  if (offset !== centralOffset + centralBytes) {
    throw new Error("VSIX central-directory size does not match its entries.");
  }
  const byLocalOffset = [...records].sort((left, right) => left.localOffset - right.localOffset);
  if (byLocalOffset.length > 0 && byLocalOffset[0].localOffset !== 0) {
    throw new Error("VSIX local records must begin at byte zero.");
  }
  const validatedRecords = [];
  for (let index = 0; index < byLocalOffset.length; index += 1) {
    const record = byLocalOffset[index];
    const localOffset = record.localOffset;
    if (localOffset + 30 > centralOffset || buffer.readUInt32LE(localOffset) !== 0x04034b50) {
      throw new Error(`VSIX local record ${record.name} is malformed.`);
    }
    const localFlags = buffer.readUInt16LE(localOffset + 6);
    const localMethod = buffer.readUInt16LE(localOffset + 8);
    const localCrc32 = buffer.readUInt32LE(localOffset + 14);
    const localCompressedBytes = buffer.readUInt32LE(localOffset + 18);
    const localUncompressedBytes = buffer.readUInt32LE(localOffset + 22);
    const localNameBytes = buffer.readUInt16LE(localOffset + 26);
    const localExtraBytes = buffer.readUInt16LE(localOffset + 28);
    const localNameStart = localOffset + 30;
    const localNameEnd = localNameStart + localNameBytes;
    if (localExtraBytes !== 0 || localNameEnd > centralOffset) {
      throw new Error(`VSIX local record ${record.name} has unsupported extra data or bounds.`);
    }
    const localName = buffer.subarray(localNameStart, localNameEnd);
    if (
      localFlags !== record.flags
      || localMethod !== record.method
      || !record.rawName.equals(localName)
    ) {
      throw new Error(`VSIX local record ${record.name} does not match its central record.`);
    }
    const dataEnd = localNameEnd + record.compressedBytes;
    let recordEnd = dataEnd;
    if ((record.flags & 0x0008) !== 0) {
      if (localCrc32 !== 0 || localCompressedBytes !== 0 || localUncompressedBytes !== 0 || dataEnd + 16 > centralOffset) {
        throw new Error(`VSIX local record ${record.name} has an invalid data-descriptor header.`);
      }
      if (
        buffer.readUInt32LE(dataEnd) !== 0x08074b50
        || buffer.readUInt32LE(dataEnd + 4) !== record.crc32
        || buffer.readUInt32LE(dataEnd + 8) !== record.compressedBytes
        || buffer.readUInt32LE(dataEnd + 12) !== record.uncompressedBytes
      ) {
        throw new Error(`VSIX local record ${record.name} has an invalid data descriptor.`);
      }
      recordEnd += 16;
    } else if (
      localCrc32 !== record.crc32
      || localCompressedBytes !== record.compressedBytes
      || localUncompressedBytes !== record.uncompressedBytes
    ) {
      throw new Error(`VSIX local record ${record.name} sizes or CRC do not match its central record.`);
    }
    const nextOffset = byLocalOffset[index + 1]?.localOffset ?? centralOffset;
    if (recordEnd !== nextOffset) {
      throw new Error(`VSIX local record ${record.name} is overlapping, gapped, or outside archive bounds.`);
    }
    validatedRecords.push(Object.freeze({ ...record, dataStart: localNameEnd, dataEnd }));
  }
  return validatedRecords;
}

export function centralDirectoryNames(buffer) {
  return centralDirectoryEntries(buffer).map((record) => record.name);
}

function assertUniqueArchiveNames(names) {
  const exact = new Set();
  const folded = new Map();
  for (const name of names) {
    validateArchivePath(name);
    if (exact.has(name)) throw new Error(`VSIX archive contains duplicate entry: ${name}`);
    exact.add(name);
    const key = name.toLowerCase();
    const previous = folded.get(key);
    if (previous !== undefined && previous !== name) {
      throw new Error(`VSIX archive contains case-colliding entries: ${previous} and ${name}`);
    }
    folded.set(key, name);
  }
}

function manifestIdentity(vsixManifest) {
  const identities = [...vsixManifest.matchAll(/<Identity\b([^>]*)\/>/gu)];
  if (identities.length !== 1) throw new Error("VSIX manifest must have exactly one Identity element.");
  const identity = identities[0][1];
  const attribute = (name) => {
    const matches = [...identity.matchAll(new RegExp(`\\b${name}="([^"]+)"`, "gu"))];
    if (matches.length !== 1) throw new Error(`VSIX Identity must have exactly one ${name} attribute.`);
    return matches[0][1];
  };
  return Object.freeze({
    publisher: attribute("Publisher"),
    name: attribute("Id"),
    version: attribute("Version"),
  });
}

export async function inspectVsixBuffer(buffer, options = {}) {
  const expected = options.expectedEntries ?? expectedArchiveEntries(options.extensionRoot ?? extensionRoot);
  if (buffer.length > archiveLimits.maximumCompressedBytes) {
    throw new Error(`VSIX compressed size ${buffer.length} exceeds ${archiveLimits.maximumCompressedBytes}.`);
  }
  const rawRecords = centralDirectoryEntries(buffer);
  const rawNames = rawRecords.map((record) => record.name);
  assertUniqueArchiveNames(rawNames);
  let decodedBytes = 0;
  for (const record of rawRecords) {
    const payload = buffer.subarray(record.dataStart, record.dataEnd);
    let actualBytes;
    if (record.method === 0) {
      if (record.compressedBytes !== record.uncompressedBytes) {
        throw new Error(`Stored VSIX entry has unequal compressed and uncompressed sizes: ${record.name}`);
      }
      actualBytes = payload.length;
    } else {
      try {
        actualBytes = inflateRawSync(payload, {
          maxOutputLength: Math.min(
            record.uncompressedBytes + 1,
            archiveLimits.maximumLargestFileBytes + 1,
          ),
        }).length;
      } catch (error) {
        throw new Error(`VSIX entry could not be decoded within its declared bounds: ${record.name}`, { cause: error });
      }
    }
    if (actualBytes !== record.uncompressedBytes) {
      throw new Error(`VSIX entry decoded size does not match its declaration: ${record.name}`);
    }
    decodedBytes += actualBytes;
    if (decodedBytes > archiveLimits.maximumUncompressedBytes) {
      throw new Error(`VSIX decoded payload exceeds ${archiveLimits.maximumUncompressedBytes}.`);
    }
  }
  const loadZip = options.loadZip ?? ((value, loadOptions) => require("jszip").loadAsync(value, loadOptions));
  const zip = await loadZip(buffer, { checkCRC32: true, createFolders: false });
  const zipEntries = Object.values(zip.files).filter((entry) => !entry.dir);
  const zipNames = zipEntries.map((entry) => entry.unsafeOriginalName ?? entry.name);
  assertUniqueArchiveNames(zipNames);
  const rawSorted = [...rawNames].sort();
  const zipSorted = [...zipNames].sort();
  if (JSON.stringify(rawSorted) !== JSON.stringify(zipSorted)) {
    throw new Error("VSIX raw central-directory entries do not match JSZip entries.");
  }
  const allowed = new Set([...controlEntries, ...expected.keys()]);
  const actual = new Set(zipNames);
  const missing = [...allowed].filter((name) => !actual.has(name));
  const unexpected = [...actual].filter((name) => !allowed.has(name));
  if (missing.length > 0 || unexpected.length > 0) {
    throw new Error(`VSIX inventory mismatch; missing=[${missing.join(", ")}], unexpected=[${unexpected.join(", ")}].`);
  }
  const entries = [];
  let uncompressedBytes = 0;
  let largestFileBytes = 0;
  const rawByName = new Map(rawRecords.map((record) => [record.name, record]));
  for (const entry of zipEntries.sort((left, right) => (left.name < right.name ? -1 : left.name > right.name ? 1 : 0))) {
    const archivePath = entry.unsafeOriginalName ?? entry.name;
    const data = await entry.async("nodebuffer");
    const rawRecord = rawByName.get(archivePath);
    if (rawRecord == null || data.length !== rawRecord.uncompressedBytes) {
      throw new Error(`VSIX inflated size does not match the raw record: ${archivePath}`);
    }
    uncompressedBytes += data.length;
    largestFileBytes = Math.max(largestFileBytes, data.length);
    const expectedEntry = expected.get(archivePath);
    const sourceBytes = expectedEntry == null ? null : readFileSync(expectedEntry.sourcePath);
    if (sourceBytes != null && !sourceBytes.equals(data)) {
      throw new Error(`VSIX entry differs from release input: ${archivePath}`);
    }
    const authorityBytes = expectedEntry?.authorityPath == null
      ? null
      : readFileSync(expectedEntry.authorityPath);
    if (sourceBytes != null && authorityBytes != null && !sourceBytes.equals(authorityBytes)) {
      throw new Error(`VSIX release input lost equality with its source authority: ${archivePath}`);
    }
    const source = expectedEntry == null
      ? Object.freeze({ kind: "generated-control" })
      : Object.freeze({
        kind: expectedEntry.kind,
        path: canonicalEvidencePath(options.repoRoot ?? repoRoot, expectedEntry.sourcePath),
        bytes: data.length,
        sha256: sha256(sourceBytes),
        equal: true,
        ...(expectedEntry.authorityPath == null ? {} : {
          authority: Object.freeze({
            path: canonicalEvidencePath(options.repoRoot ?? repoRoot, expectedEntry.authorityPath),
            bytes: authorityBytes.length,
            sha256: sha256(authorityBytes),
            equal: true,
          }),
        }),
      });
    entries.push(Object.freeze({ path: archivePath, bytes: data.length, sha256: sha256(data), source }));
  }
  if (uncompressedBytes > archiveLimits.maximumUncompressedBytes) {
    throw new Error(`VSIX uncompressed size ${uncompressedBytes} exceeds ${archiveLimits.maximumUncompressedBytes}.`);
  }
  if (largestFileBytes > archiveLimits.maximumLargestFileBytes) {
    throw new Error(`VSIX largest file ${largestFileBytes} exceeds ${archiveLimits.maximumLargestFileBytes}.`);
  }
  const packageEntry = zip.file("extension/package.json");
  const manifestEntry = zip.file("extension.vsixmanifest");
  if (packageEntry == null || manifestEntry == null) throw new Error("VSIX identity files are missing.");
  const archivedPackage = JSON.parse(await packageEntry.async("string"));
  const localPackage = options.packageJson ?? JSON.parse(readFileSync(path.join(options.extensionRoot ?? extensionRoot, "package.json"), "utf8"));
  for (const key of ["name", "publisher", "version", "main"]) {
    if (archivedPackage[key] !== localPackage[key]) throw new Error(`VSIX package ${key} does not match the release input.`);
  }
  if (archivedPackage.engines?.vscode !== localPackage.engines?.vscode) {
    throw new Error("VSIX package engines.vscode does not match the release input.");
  }
  const vsixIdentity = manifestIdentity(await manifestEntry.async("string"));
  if (
    vsixIdentity.publisher !== localPackage.publisher
    || vsixIdentity.name !== localPackage.name
    || vsixIdentity.version !== localPackage.version
  ) {
    throw new Error("VSIX control manifest identity does not match package.json.");
  }
  return Object.freeze({
    artifactBytes: buffer.length,
    artifactSha256: sha256(buffer),
    fileCount: entries.length,
    uncompressedBytes,
    largestFileBytes,
    identity: Object.freeze({
      id: `${localPackage.publisher}.${localPackage.name}`,
      publisher: localPackage.publisher,
      name: localPackage.name,
      version: localPackage.version,
      main: localPackage.main,
      vscodeEngine: localPackage.engines.vscode,
    }),
    entries: Object.freeze(entries),
  });
}

export function gitState(dependencies = {}, context = {}) {
  const exec = dependencies.execFileSync ?? execFileSync;
  const root = context.repoRoot ?? repoRoot;
  const head = exec("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim();
  const status = exec(
    "git",
    ["status", "--porcelain=v1", "--untracked-files=all", "--ignore-submodules=none"],
    { cwd: root, encoding: "utf8" },
  );
  if (status !== "") throw new Error(`VSIX packaging requires a clean repository including untracked files and submodules:\n${status}`);
  const submodules = exec("git", ["submodule", "status", "--recursive"], { cwd: root, encoding: "utf8" });
  const invalidSubmodule = submodules.split(/\r?\n/u).find((line) => line !== "" && !line.startsWith(" "));
  if (invalidSubmodule != null) throw new Error(`VSIX packaging requires exact initialized submodules: ${invalidSubmodule}`);
  return Object.freeze({ head, status, submodules });
}

export function artifactPaths(packageJson, root = releaseRoot, repositoryHead) {
  if (typeof repositoryHead !== "string" || !/^(?:[0-9a-f]{40}|[0-9a-f]{64})$/u.test(repositoryHead)) {
    throw new Error("VSIX artifact paths require a full lowercase hexadecimal repository HEAD.");
  }
  const stem = `${packageJson.name}-${packageJson.version}-${repositoryHead.slice(0, 12)}`;
  return Object.freeze({
    releaseRoot: root,
    vsix: path.join(root, `${stem}.vsix`),
    receipt: path.join(root, `${stem}.manifest.json`),
    checksum: path.join(root, `${stem}.sha256`),
  });
}

function assertReleasePath(paths, candidate, label) {
  const resolved = assertInside(paths.releaseRoot, candidate, label);
  if (existsSync(candidate)) {
    const info = lstatSync(candidate);
    if (info.isSymbolicLink()) throw new Error(`${label} must not be a symlink: ${candidate}`);
  }
  return resolved;
}

export function pnpmRuntimeEvidence(context, dependencies = {}) {
  if (dependencies.pnpmVersion != null) {
    return Object.freeze({
      version: dependencies.pnpmVersion,
      executable: Object.freeze({ kind: "injected-test-seam" }),
    });
  }
  const candidate = dependencies.pnpmExecPath ?? process.env.npm_execpath;
  if (candidate == null || candidate === "") {
    throw new Error("VSIX packaging must run from a pnpm lifecycle with npm_execpath available.");
  }
  const candidateInfo = lstatSync(candidate);
  if (candidateInfo.isSymbolicLink() || !candidateInfo.isFile()) {
    throw new Error(`pnpm lifecycle executable must be a regular non-symlink file: ${candidate}`);
  }
  const realExecutable = realpathSync(candidate);
  const executableInfo = lstatSync(realExecutable);
  if (!executableInfo.isFile() || !/^pnpm\.(?:c?js|mjs)$/iu.test(path.basename(realExecutable))) {
    throw new Error(`pnpm lifecycle executable has an unsupported identity: ${realExecutable}`);
  }
  const exec = dependencies.execFileSync ?? execFileSync;
  const version = exec(process.execPath, [realExecutable, "--version"], {
    cwd: context.repoRoot,
    encoding: "utf8",
  }).trim();
  return Object.freeze({
    version,
    executable: Object.freeze({
      kind: "pnpm-node-entrypoint",
      path: realExecutable.split(path.sep).join("/"),
      bytes: executableInfo.size,
      sha256: sha256(readFileSync(realExecutable)),
    }),
  });
}

function inputEvidence(context, dependencies = {}) {
  if (dependencies.inputEvidence != null) {
    return typeof dependencies.inputEvidence === "function"
      ? dependencies.inputEvidence(context, dependencies)
      : dependencies.inputEvidence;
  }
  const vscePackagePath = dependencies.vscePackageJsonPath ?? require.resolve("@vscode/vsce/package.json");
  const jszipPackagePath = dependencies.jszipPackageJsonPath ?? require.resolve("jszip/package.json");
  const vscePackage = JSON.parse(readFileSync(vscePackagePath, "utf8"));
  const jszipPackage = JSON.parse(readFileSync(jszipPackagePath, "utf8"));
  const extensionPackage = context.packageJson;
  const repositoryPackage = JSON.parse(readFileSync(path.join(context.repoRoot, "package.json"), "utf8"));
  const pnpmRuntime = pnpmRuntimeEvidence(context, dependencies);
  const pnpmVersion = pnpmRuntime.version;
  const declaredPackageManager = repositoryPackage.packageManager;
  const expectedTools = Object.freeze({ vsce: "3.9.2", jszip: "3.10.1" });
  if (
    extensionPackage.devDependencies?.["@vscode/vsce"] !== expectedTools.vsce
    || vscePackage.version !== expectedTools.vsce
  ) {
    throw new Error(`@vscode/vsce must be pinned and resolved to ${expectedTools.vsce}.`);
  }
  if (extensionPackage.devDependencies?.jszip !== expectedTools.jszip || jszipPackage.version !== expectedTools.jszip) {
    throw new Error(`jszip must be pinned and resolved to ${expectedTools.jszip}.`);
  }
  if (declaredPackageManager !== `pnpm@${pnpmVersion}`) {
    throw new Error(`Actual pnpm ${pnpmVersion} does not match declared package manager ${declaredPackageManager}.`);
  }
  return Object.freeze({
    nodeVersion: process.version,
    declaredPackageManager,
    pnpmVersion,
    pnpmExecutable: pnpmRuntime.executable,
    vsceVersion: vscePackage.version,
    jszipVersion: jszipPackage.version,
    vscePackageJsonSha256: sha256(readFileSync(vscePackagePath)),
    jszipPackageJsonSha256: sha256(readFileSync(jszipPackagePath)),
    packageJsonSha256: sha256(readFileSync(path.join(context.extensionRoot, "package.json"))),
    pnpmLockSha256: sha256(readFileSync(path.join(context.repoRoot, "pnpm-lock.yaml"))),
    vscodeIgnoreSha256: sha256(readFileSync(path.join(context.extensionRoot, ".vscodeignore"))),
  });
}

export function receiptFor(inspection, repository, paths, context, toolsAndInputs) {
  return Object.freeze({
    schemaVersion: artifactSchemaVersion,
    artifact: Object.freeze({
      path: path.relative(context.repoRoot, paths.vsix).split(path.sep).join("/"),
      bytes: inspection.artifactBytes,
      sha256: inspection.artifactSha256,
      fileCount: inspection.fileCount,
      uncompressedBytes: inspection.uncompressedBytes,
      largestFileBytes: inspection.largestFileBytes,
    }),
    repository,
    toolsAndInputs,
    identity: inspection.identity,
    limits: archiveLimits,
    entries: inspection.entries,
  });
}

function releaseContext(dependencies = {}) {
  const contextExtensionRoot = path.resolve(dependencies.extensionRoot ?? extensionRoot);
  const contextRepoRoot = path.resolve(dependencies.repoRoot ?? repoRoot);
  const packageJson = dependencies.packageJson
    ?? JSON.parse(readFileSync(path.join(contextExtensionRoot, "package.json"), "utf8"));
  const contextReleaseRoot = path.resolve(dependencies.releaseRoot ?? path.join(contextExtensionRoot, ".release"));
  assertInside(contextExtensionRoot, contextReleaseRoot, "VSIX release root");
  return Object.freeze({
    extensionRoot: contextExtensionRoot,
    repoRoot: contextRepoRoot,
    releaseRoot: contextReleaseRoot,
    packageJson,
  });
}

function equalRepositoryState(left, right) {
  return left.head === right.head && left.status === right.status && left.submodules === right.submodules;
}

function readRepositoryState(dependencies, context) {
  return (dependencies.gitState ?? gitState)(dependencies, context);
}

function requireUnchangedRepository(before, after, boundary) {
  if (!equalRepositoryState(before, after)) {
    throw new Error(`Repository state changed ${boundary}.`);
  }
}

function ensureReleaseRoot(context) {
  if (!existsSync(context.releaseRoot)) mkdirSync(context.releaseRoot);
  return captureReleaseRoots(context);
}

function captureReleaseRoots(context) {
  const extension = captureDirectoryWitness(context.extensionRoot, "VSIX extension root");
  const release = captureDirectoryWitness(context.releaseRoot, "VSIX release root");
  assertCanonicalDescendant(context.extensionRoot, context.releaseRoot, "VSIX release root");
  return Object.freeze({ extension, release });
}

function assertReleaseRoots(context, roots) {
  assertDirectoryWitness(roots.extension, "VSIX extension root");
  assertDirectoryWitness(roots.release, "VSIX release root");
  assertCanonicalDescendant(context.extensionRoot, context.releaseRoot, "VSIX release root");
}

function removePromotedFilesSafely(promoted, paths, context, roots) {
  for (const promotedPath of [...promoted].reverse()) {
    try {
      assertReleaseRoots(context, roots);
      assertReleasePath(paths, promotedPath, "Promoted VSIX output cleanup");
      if (!existsSync(promotedPath)) continue;
      assertRegularUnlinkedFile(promotedPath, "Promoted VSIX output cleanup");
      assertCanonicalDescendant(paths.releaseRoot, promotedPath, "Promoted VSIX output cleanup");
      unlinkSync(promotedPath);
    } catch {
      // Cleanup must never follow a release path whose identity changed across an async boundary.
    }
  }
}

function removeOwnStagingDirectorySafely(stagingDirectory, paths, context, roots, stagingWitness) {
  try {
    assertReleaseRoots(context, roots);
    assertDirectoryWitness(stagingWitness, "VSIX staging directory");
    const resolved = assertInside(paths.releaseRoot, stagingDirectory, "VSIX staging directory");
    if (!path.basename(resolved).startsWith(".staging-")) return;
    assertCanonicalDescendant(paths.releaseRoot, resolved, "VSIX staging directory");
    rmSync(resolved, { recursive: true, force: true });
  } catch {
    // Leave the staging directory for the enclosing trusted workspace cleanup when identity is uncertain.
  }
}

export async function packVsix(dependencies = {}) {
  const context = releaseContext(dependencies);
  const before = readRepositoryState(dependencies, context);
  const paths = artifactPaths(context.packageJson, context.releaseRoot, before.head);
  const toolsAndInputs = inputEvidence(context, dependencies);
  const roots = ensureReleaseRoot(context);
  for (const [label, candidate] of [["VSIX artifact", paths.vsix], ["VSIX receipt", paths.receipt], ["VSIX checksum", paths.checksum]]) {
    assertReleasePath(paths, candidate, label);
    if (existsSync(candidate)) throw new Error(`Refusing to overwrite ${label}: ${candidate}`);
  }
  const stagingDirectory = mkdtempSync(path.join(paths.releaseRoot, ".staging-"));
  assertCanonicalDescendant(paths.releaseRoot, stagingDirectory, "VSIX staging directory");
  const stagingWitness = captureDirectoryWitness(stagingDirectory, "VSIX staging directory");
  const stagingVsix = path.join(stagingDirectory, "candidate.vsix");
  try {
    assertReleaseRoots(context, roots);
    assertDirectoryWitness(stagingWitness, "VSIX staging directory");
    const packageOnce = dependencies.createVSIX ?? require("@vscode/vsce").createVSIX;
    await packageOnce({
      cwd: context.extensionRoot,
      packagePath: stagingVsix,
      dependencies: false,
      useYarn: false,
      gitTagVersion: false,
      updatePackageJson: false,
      rewriteRelativeLinks: false,
      followSymlinks: false,
    });
    assertReleaseRoots(context, roots);
    assertDirectoryWitness(stagingWitness, "VSIX staging directory");
    assertCanonicalDescendant(stagingDirectory, stagingVsix, "Staged VSIX artifact");
    assertRegularUnlinkedFile(stagingVsix, "Staged VSIX artifact");
    const expectedEntries = dependencies.expectedEntries
      ?? expectedArchiveEntries(context.extensionRoot, { repoRoot: context.repoRoot });
    const inspect = dependencies.inspectVsixBuffer ?? inspectVsixBuffer;
    const stagedBytes = readFileSync(stagingVsix);
    const stagedInspection = await inspect(stagedBytes, {
      extensionRoot: context.extensionRoot,
      repoRoot: context.repoRoot,
      packageJson: context.packageJson,
      expectedEntries,
    });
    assertReleaseRoots(context, roots);
    assertDirectoryWitness(stagingWitness, "VSIX staging directory");
    assertExactTrustedFile(stagingDirectory, stagingVsix, "Staged VSIX artifact", stagedBytes);
    const afterPackage = readRepositoryState(dependencies, context);
    requireUnchangedRepository(before, afterPackage, "while packaging the VSIX");
    const promoted = [];
    try {
      assertReleaseRoots(context, roots);
      assertDirectoryWitness(stagingWitness, "VSIX staging directory");
      assertExactTrustedFile(stagingDirectory, stagingVsix, "Staged VSIX artifact", stagedBytes);
      copyFileSync(stagingVsix, paths.vsix, fsConstants.COPYFILE_EXCL);
      promoted.push(paths.vsix);
      await dependencies.afterArtifactPromotion?.(paths);
      assertReleaseRoots(context, roots);
      assertRegularUnlinkedFile(paths.vsix, "Promoted VSIX artifact");
      assertCanonicalDescendant(paths.releaseRoot, paths.vsix, "Promoted VSIX artifact");
      const finalBytes = readFileSync(paths.vsix);
      if (!finalBytes.equals(stagedBytes)) throw new Error("Promoted VSIX bytes differ from the inspected staged artifact.");
      const inspection = await inspect(finalBytes, {
        extensionRoot: context.extensionRoot,
        repoRoot: context.repoRoot,
        packageJson: context.packageJson,
        expectedEntries,
      });
      assertReleaseRoots(context, roots);
      assertExactTrustedFile(paths.releaseRoot, paths.vsix, "Promoted VSIX artifact", finalBytes);
      if (
        inspection.artifactSha256 !== stagedInspection.artifactSha256
        || inspection.artifactBytes !== stagedInspection.artifactBytes
      ) {
        throw new Error("Promoted VSIX inspection differs from the staged artifact.");
      }
      const afterPromotion = readRepositoryState(dependencies, context);
      requireUnchangedRepository(before, afterPromotion, "while promoting the VSIX");
      assertReleaseRoots(context, roots);
      assertExactTrustedFile(paths.releaseRoot, paths.vsix, "Promoted VSIX artifact", finalBytes);
      const receipt = receiptFor(inspection, Object.freeze({ before, after: afterPromotion }), paths, context, toolsAndInputs);
      const receiptText = `${JSON.stringify(receipt, null, 2)}\n`;
      const checksumText = `${inspection.artifactSha256}  ${path.basename(paths.vsix)}\n`;
      assertReleaseRoots(context, roots);
      writeFileSync(paths.receipt, receiptText, { encoding: "utf8", flag: "wx" });
      promoted.push(paths.receipt);
      writeFileSync(paths.checksum, checksumText, { encoding: "utf8", flag: "wx" });
      promoted.push(paths.checksum);
      assertReleaseRoots(context, roots);
      assertExactTrustedFile(paths.releaseRoot, paths.receipt, "Promoted VSIX receipt", receiptText);
      assertExactTrustedFile(paths.releaseRoot, paths.checksum, "Promoted VSIX checksum", checksumText);
      const complete = readRepositoryState(dependencies, context);
      requireUnchangedRepository(before, complete, "while writing VSIX evidence");
      assertReleaseRoots(context, roots);
      assertExactTrustedFile(paths.releaseRoot, paths.vsix, "Promoted VSIX artifact", finalBytes);
      assertExactTrustedFile(paths.releaseRoot, paths.receipt, "Promoted VSIX receipt", receiptText);
      assertExactTrustedFile(paths.releaseRoot, paths.checksum, "Promoted VSIX checksum", checksumText);
      return receipt;
    } catch (error) {
      removePromotedFilesSafely(promoted, paths, context, roots);
      throw error;
    }
  } finally {
    removeOwnStagingDirectorySafely(stagingDirectory, paths, context, roots, stagingWitness);
  }
}

export async function verifyVsix(dependencies = {}) {
  const context = releaseContext(dependencies);
  const before = readRepositoryState(dependencies, context);
  const paths = artifactPaths(context.packageJson, context.releaseRoot, before.head);
  const toolsAndInputs = inputEvidence(context, dependencies);
  const roots = existsSync(context.releaseRoot) ? captureReleaseRoots(context) : null;
  for (const [label, candidate] of [["VSIX artifact", paths.vsix], ["VSIX receipt", paths.receipt], ["VSIX checksum", paths.checksum]]) {
    assertReleasePath(paths, candidate, label);
    if (!existsSync(candidate)) throw new Error(`${label} is missing: ${candidate}`);
    assertRegularUnlinkedFile(candidate, label);
    assertCanonicalDescendant(paths.releaseRoot, candidate, label);
  }
  const expectedEntries = dependencies.expectedEntries
    ?? expectedArchiveEntries(context.extensionRoot, { repoRoot: context.repoRoot });
  const inspect = dependencies.inspectVsixBuffer ?? inspectVsixBuffer;
  const artifactBytes = readFileSync(paths.vsix);
  const inspection = await inspect(artifactBytes, {
    extensionRoot: context.extensionRoot,
    repoRoot: context.repoRoot,
    packageJson: context.packageJson,
    expectedEntries,
  });
  if (roots == null) throw new Error(`VSIX release root is missing: ${context.releaseRoot}`);
  assertReleaseRoots(context, roots);
  assertExactTrustedFile(paths.releaseRoot, paths.vsix, "VSIX artifact", artifactBytes);
  const after = readRepositoryState(dependencies, context);
  requireUnchangedRepository(before, after, "while verifying the VSIX");
  assertReleaseRoots(context, roots);
  assertExactTrustedFile(paths.releaseRoot, paths.vsix, "VSIX artifact", artifactBytes);
  const expectedReceipt = receiptFor(
    inspection,
    Object.freeze({ before, after }),
    paths,
    context,
    toolsAndInputs,
  );
  const receiptText = readFileSync(paths.receipt, "utf8");
  const expectedReceiptText = `${JSON.stringify(expectedReceipt, null, 2)}\n`;
  const receipt = JSON.parse(receiptText);
  if (receiptText !== expectedReceiptText) {
    throw new Error("VSIX receipt does not match the current artifact, inputs, and repository HEAD.");
  }
  const expectedChecksum = `${inspection.artifactSha256}  ${path.basename(paths.vsix)}\n`;
  const checksumText = readFileSync(paths.checksum, "utf8");
  if (checksumText !== expectedChecksum) {
    throw new Error("VSIX checksum sidecar does not match the artifact.");
  }
  assertReleaseRoots(context, roots);
  assertExactTrustedFile(paths.releaseRoot, paths.vsix, "VSIX artifact", artifactBytes);
  assertExactTrustedFile(paths.releaseRoot, paths.receipt, "VSIX receipt", receiptText);
  assertExactTrustedFile(paths.releaseRoot, paths.checksum, "VSIX checksum", checksumText);
  return receipt;
}

async function main() {
  const command = process.argv[2];
  if (command === "pack") {
    console.log(JSON.stringify(await packVsix(), null, 2));
    return;
  }
  if (command === "verify") {
    console.log(JSON.stringify(await verifyVsix(), null, 2));
    return;
  }
  throw new Error("Usage: node scripts/vsix-artifact.mjs <pack|verify>");
}

if (path.resolve(process.argv[1] ?? "") === fileURLToPath(import.meta.url)) {
  await main();
}
