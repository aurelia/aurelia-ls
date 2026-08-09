import {
  appendFileSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, test } from "vitest";
import JSZip from "jszip";

interface ExpectedEntry {
  readonly sourcePath: string;
  readonly kind: string;
  readonly authorityPath: string | null;
}

interface ArchiveInspection {
  readonly artifactBytes: number;
  readonly artifactSha256: string;
  readonly fileCount: number;
  readonly uncompressedBytes: number;
  readonly largestFileBytes: number;
  readonly identity: Readonly<Record<string, string>>;
  readonly entries: readonly Readonly<Record<string, unknown>>[];
}

interface ArtifactPaths {
  readonly releaseRoot: string;
  readonly vsix: string;
  readonly receipt: string;
  readonly checksum: string;
}

interface VsixArtifactModule {
  readonly artifactSchemaVersion: string;
  readonly archiveLimits: {
    readonly maximumCompressedBytes: number;
    readonly maximumUncompressedBytes: number;
    readonly maximumLargestFileBytes: number;
    readonly maximumFileCount: number;
  };
  readonly extensionRoot: string;
  readonly repoRoot: string;
  readonly expectedArchiveEntries: (
    root?: string,
    options?: {
      readonly repoRoot?: string;
      readonly typescriptRoot?: string;
      readonly projectSchemaSource?: string;
      readonly projectDialectSchemaSource?: string;
      readonly expectedTypeScriptVersion?: string;
    },
  ) => Map<string, ExpectedEntry>;
  readonly validateArchivePath: (entryPath: string) => string;
  readonly centralDirectoryNames: (buffer: Buffer) => readonly string[];
  readonly inspectVsixBuffer: (
    buffer: Buffer,
    options?: {
      readonly expectedEntries?: Map<string, ExpectedEntry>;
      readonly extensionRoot?: string;
      readonly repoRoot?: string;
      readonly packageJson?: Record<string, any>;
      readonly loadZip?: (buffer: Buffer, options: Record<string, unknown>) => Promise<any>;
    },
  ) => Promise<ArchiveInspection>;
  readonly artifactPaths: (
    packageJson: Record<string, any>,
    root: string | undefined,
    repositoryHead: string,
  ) => ArtifactPaths;
  readonly gitState: (
    dependencies?: { readonly execFileSync?: (...args: any[]) => string },
    context?: { readonly repoRoot?: string },
  ) => Readonly<Record<string, string>>;
  readonly pnpmRuntimeEvidence: (
    context: { readonly repoRoot: string },
    dependencies?: Record<string, any>,
  ) => {
    readonly version: string;
    readonly executable: Readonly<Record<string, unknown>>;
  };
  readonly packVsix: (dependencies?: Record<string, any>) => Promise<Record<string, any>>;
  readonly verifyVsix: (dependencies?: Record<string, any>) => Promise<Record<string, any>>;
  readonly sha256: (value: Buffer | string) => string;
}

interface SyntheticFixture {
  readonly root: string;
  readonly packageJson: Record<string, any>;
  readonly expectedEntries: Map<string, ExpectedEntry>;
  readonly payloads: Map<string, Buffer>;
}

interface CentralRecord {
  readonly centralOffset: number;
  readonly localOffset: number;
  readonly name: string;
  readonly nameOffset: number;
  readonly nameBytes: number;
  readonly compressedBytes: number;
}

const artifactModuleUrl = new URL("../scripts/vsix-artifact.mjs", import.meta.url);
const vscodePackageUrl = new URL("../package.json", import.meta.url);
const rootPackageUrl = new URL("../../../package.json", import.meta.url);
const ignoreUrl = new URL("../.vscodeignore", import.meta.url);
const temporaryRoots: string[] = [];

const packageManifest = Object.freeze({
  name: "aurelia-2",
  publisher: "AureliaEffect",
  version: "0.4.4",
  main: "./dist/extension.cjs",
  engines: { vscode: "^1.91.0" },
});

const defaultPayloads = Object.freeze({
  "extension/package.json": `${JSON.stringify(packageManifest, null, 2)}\n`,
  "extension/readme.md": "# Aurelia 2\n",
  "extension/changelog.md": "# Changelog\n",
  "extension/LICENSE.txt": "MIT\n",
  "extension/images/logo.png": "synthetic-png",
  "extension/dist/extension.cjs": "exports.activate = () => {};\n",
  "extension/dist/server/main.cjs": "exports.main = () => {};\n",
  "extension/dist/schemas/aurelia.project.schema.json": "{}\n",
  "extension/dist/schemas/aurelia.project.jsonc.schema.json": "{}\n",
  "extension/dist/node_modules/typescript/package.json": "{\"name\":\"typescript\",\"version\":\"6.0.3\"}\n",
  "extension/dist/node_modules/typescript/lib/typescript.js": "exports.version = '6.0.3';\n",
});

afterEach(() => {
  for (const root of temporaryRoots.splice(0)) {
    rmSync(root, { recursive: true, force: true });
  }
});

describe("VSIX archive attestation", () => {
  test("accepts the exact bounded inventory and records stable entry hashes", async () => {
    const artifact = await loadArtifactModule();
    const fixture = syntheticFixture();
    const archive = await archiveForFixture(fixture);

    const inspection = await artifact.inspectVsixBuffer(archive, fixture);

    expect(inspection.identity).toEqual({
      id: "AureliaEffect.aurelia-2",
      publisher: "AureliaEffect",
      name: "aurelia-2",
      version: "0.4.4",
      main: "./dist/extension.cjs",
      vscodeEngine: "^1.91.0",
    });
    expect(inspection.entries.map((entry) => entry.path)).toEqual(
      [...inspection.entries.map((entry) => entry.path)].sort((left, right) =>
        String(left) < String(right) ? -1 : String(left) > String(right) ? 1 : 0
      ),
    );
    for (const entry of inspection.entries) {
      expect(entry).toEqual(expect.objectContaining({
        path: expect.any(String),
        bytes: expect.any(Number),
        sha256: expect.stringMatching(/^[0-9a-f]{64}$/u),
      }));
    }
    expect(inspection.artifactSha256).toBe(artifact.sha256(archive));
    expect(inspection.fileCount).toBe(fixture.expectedEntries.size + 2);
  });

  test.each([
    ["traversal", "../evil.cjs", /travers/u],
    ["backslash", "extension\\evil.cjs", /backslash/u],
    ["absolute", "/extension/evil.cjs", /absolute/u],
    ["drive-qualified", "C:/extension/evil.cjs", /drive/u],
    ["NUL", "extension/evil\0.cjs", /NUL/u],
  ])("rejects a %s entry path", async (_label, entryPath, expectedMessage) => {
    const artifact = await loadArtifactModule();
    expect(() => artifact.validateArchivePath(entryPath)).toThrow(expectedMessage);
  });

  test("rejects traversal from the raw archive name before JSZip sanitization", async () => {
    const artifact = await loadArtifactModule();
    const fixture = syntheticFixture({ "../evil.cjs": "bad" });
    const archive = await archiveForFixture(fixture);

    await expect(artifact.inspectVsixBuffer(archive, fixture)).rejects.toThrow(/travers/u);
  });

  test("rejects duplicate raw central-directory names before JSZip overwrites them", async () => {
    const artifact = await loadArtifactModule();
    const fixture = syntheticFixture({
      "extension/dist/dupa.cjs": "a",
      "extension/dist/dupb.cjs": "b",
    });
    const archive = await archiveForFixture(fixture);
    const duplicate = replaceEntryName(archive, "extension/dist/dupb.cjs", "extension/dist/dupa.cjs");

    await expect(artifact.inspectVsixBuffer(duplicate, fixture)).rejects.toThrow(/duplicate/u);
  });

  test("rejects case-colliding archive names", async () => {
    const artifact = await loadArtifactModule();
    const fixture = syntheticFixture({
      "extension/dist/Case.cjs": "upper",
      "extension/dist/case.cjs": "lower",
    });

    await expect(artifact.inspectVsixBuffer(await archiveForFixture(fixture), fixture))
      .rejects.toThrow(/case-colliding/u);
  });

  test("rejects a central filename that disagrees with its local header", async () => {
    const artifact = await loadArtifactModule();
    const fixture = syntheticFixture();
    const archive = await archiveForFixture(fixture);
    const mismatched = replaceCentralName(
      archive,
      "extension/readme.md",
      "extension/READMX.md",
    );

    await expect(artifact.inspectVsixBuffer(mismatched, fixture))
      .rejects.toThrow(/local|header|filename.*match|name.*match/iu);
  });

  test("rejects an undeclared EOCD trailer", async () => {
    const artifact = await loadArtifactModule();
    const fixture = syntheticFixture();
    const archive = await archiveForFixture(fixture);

    await expect(artifact.inspectVsixBuffer(Buffer.concat([archive, Buffer.from([0x42])]), fixture))
      .rejects.toThrow(/end|EOCD|comment|trailing/iu);
  });

  test.each([
    ["encrypted flag", (archive: Buffer) => setEntryFlags(archive, "extension/dist/extension.cjs", 0x0001)],
    ["data-descriptor flag", (archive: Buffer) => setEntryFlags(archive, "extension/dist/extension.cjs", 0x0008)],
    ["bad local offset", (archive: Buffer) => setLocalOffset(archive, "extension/dist/extension.cjs", 1)],
    ["overlapping local record", (archive: Buffer) => overlapLocalRecords(archive)],
  ])("rejects a ZIP with an unsupported %s", async (_label, mutate) => {
    const artifact = await loadArtifactModule();
    const fixture = syntheticFixture();
    const archive = mutate(await archiveForFixture(fixture));

    await expect(artifact.inspectVsixBuffer(archive, fixture)).rejects.toThrow();
  });

  test("accepts pinned streamed data descriptors and rejects descriptor corruption", async () => {
    const artifact = await loadArtifactModule();
    const fixture = syntheticFixture();
    const archive = await archiveForFixture(
      fixture,
      {},
      new Set(),
      new Map(),
      { streamFiles: true },
    );

    await expect(artifact.inspectVsixBuffer(archive, fixture)).resolves.toEqual(
      expect.objectContaining({ artifactSha256: artifact.sha256(archive) }),
    );
    await expect(artifact.inspectVsixBuffer(
      mutateDataDescriptorCrc(archive, "extension/dist/extension.cjs"),
      fixture,
    )).rejects.toThrow(/descriptor/iu);
  });

  test("rejects UNIX symlink entries", async () => {
    const artifact = await loadArtifactModule();
    const fixture = syntheticFixture();
    const archive = await archiveForFixture(fixture, {
      "extension/dist/extension.cjs": { unixPermissions: 0o120777 },
    });

    await expect(artifact.inspectVsixBuffer(archive, fixture))
      .rejects.toThrow(/symbolic|symlink|regular Unix-mode/iu);
  });

  test("rejects malformed local headers and CRC drift", async () => {
    const artifact = await loadArtifactModule();
    const fixture = syntheticFixture();
    const archive = await archiveForFixture(fixture);
    const localSignature = mutateLocalSignature(archive, "extension/dist/extension.cjs");
    const crcDrift = mutateCentralCrc(archive, "extension/dist/extension.cjs");

    await expect(artifact.inspectVsixBuffer(localSignature, fixture)).rejects.toThrow();
    await expect(artifact.inspectVsixBuffer(crcDrift, fixture)).rejects.toThrow();
  });

  test("rejects missing, unexpected, and byte-drifted release payloads", async () => {
    const artifact = await loadArtifactModule();
    const fixture = syntheticFixture();
    const missingServer = await archiveForFixture(fixture, {}, new Set([
      "extension/dist/server/main.cjs",
    ]));
    const staleFixture = syntheticFixture({ "extension/dist/stale.cjs": "stale" }, false);
    const driftedPackage = await archiveForFixture(fixture, {}, new Set(), new Map([
      ["extension/package.json", Buffer.from(`${defaultPayloads["extension/package.json"]} `)],
    ]));
    const driftedReadme = await archiveForFixture(fixture, {}, new Set(), new Map([
      ["extension/readme.md", Buffer.from("# mutated\n")],
    ]));
    const driftedDist = await archiveForFixture(fixture, {}, new Set(), new Map([
      ["extension/dist/extension.cjs", Buffer.from("malicious\n")],
    ]));

    await expect(artifact.inspectVsixBuffer(missingServer, fixture)).rejects.toThrow(/missing/u);
    await expect(artifact.inspectVsixBuffer(await archiveForFixture(staleFixture), staleFixture))
      .rejects.toThrow(/unexpected/u);
    await expect(artifact.inspectVsixBuffer(driftedPackage, fixture))
      .rejects.toThrow(/differs|package/u);
    await expect(artifact.inspectVsixBuffer(driftedReadme, fixture))
      .rejects.toThrow(/differs|readme/iu);
    await expect(artifact.inspectVsixBuffer(driftedDist, fixture))
      .rejects.toThrow(/differs|extension\.cjs/iu);
  });

  test("rejects raw and expanded archive limits", async () => {
    const artifact = await loadArtifactModule();
    const fixture = syntheticFixture();
    const tooLargeCompressed = Buffer.alloc(artifact.archiveLimits.maximumCompressedBytes + 1);
    await expect(artifact.inspectVsixBuffer(tooLargeCompressed, fixture))
      .rejects.toThrow(/compressed size/u);

    const largestFixture = syntheticFixture({
      "extension/dist/large.bin": Buffer.alloc(
        artifact.archiveLimits.maximumLargestFileBytes + 1,
        0x61,
      ),
    });
    await expect(artifact.inspectVsixBuffer(await archiveForFixture(largestFixture), largestFixture))
      .rejects.toThrow(/size|largest file/u);

    const countPayloads: Record<string, string> = {};
    for (let index = 0; index < artifact.archiveLimits.maximumFileCount; index += 1) {
      countPayloads[`extension/dist/count/${String(index).padStart(3, "0")}.txt`] = "x";
    }
    const countFixture = syntheticFixture(countPayloads);
    await expect(artifact.inspectVsixBuffer(await archiveForFixture(countFixture), countFixture))
      .rejects.toThrow(/file count/u);
  }, 30_000);

  test("rejects oversized declared expansion before accepting the payload", async () => {
    const artifact = await loadArtifactModule();
    const fixture = syntheticFixture();
    const archive = await archiveForFixture(fixture);
    const declaredOversize = setDeclaredUncompressedBytes(
      archive,
      "extension/dist/extension.cjs",
      artifact.archiveLimits.maximumLargestFileBytes + 1,
    );

    await expect(artifact.inspectVsixBuffer(declaredOversize, fixture)).rejects.toThrow();
  });

  test("rejects understated declared expansion before invoking the ZIP inflater", async () => {
    const artifact = await loadArtifactModule();
    const fixture = syntheticFixture();
    const archive = await archiveForFixture(fixture);
    const forged = setDeclaredUncompressedBytes(
      archive,
      "extension/dist/extension.cjs",
      1,
    );
    let loadCalls = 0;

    await expect(artifact.inspectVsixBuffer(forged, {
      extensionRoot: fixture.root,
      repoRoot: fixture.root,
      packageJson: fixture.packageJson,
      expectedEntries: fixture.expectedEntries,
      loadZip: async () => {
        loadCalls += 1;
        throw new Error("ZIP inflater must not run for forged declared sizes");
      },
    })).rejects.toThrow(/declared|release input|size/iu);
    expect(loadCalls).toBe(0);
  });
});

describe("VSIX package-once lifecycle", () => {
  test("calls the pinned VSCE API exactly once with the release lifecycle enabled", async () => {
    const artifact = await loadArtifactModule();
    const harness = await lifecycleHarness(artifact, "pack");

    const receipt = await artifact.packVsix(harness.dependencies);

    expect(harness.vsceCalls).toHaveLength(1);
    expect(harness.vsceCalls[0]).toEqual(expect.objectContaining({
      cwd: harness.extensionRoot,
      dependencies: false,
      useYarn: false,
      gitTagVersion: false,
      updatePackageJson: false,
      rewriteRelativeLinks: false,
      followSymlinks: false,
    }));
    expect(path.relative(harness.releaseRoot, harness.vsceCalls[0]!.packagePath))
      .toMatch(/^\.staging-[^/\\]+[/\\]candidate\.vsix$/u);
    expect(harness.gitReads()).toBeGreaterThanOrEqual(2);
    expect(receipt.schemaVersion).toBe(artifact.artifactSchemaVersion);
    expect(receipt.artifact.sha256).toBe(artifact.sha256(readFileSync(harness.paths.vsix)));
    expect(receipt.toolsAndInputs).toEqual(expect.objectContaining({
      vsceVersion: "3.9.2",
      jszipVersion: "3.10.1",
      pnpmVersion: "11.5.2",
      packageJsonSha256: expect.stringMatching(/^[0-9a-f]{64}$/u),
      pnpmLockSha256: expect.stringMatching(/^[0-9a-f]{64}$/u),
      vscodeIgnoreSha256: expect.stringMatching(/^[0-9a-f]{64}$/u),
    }));
    expect(receipt.entries.map((entry: Record<string, unknown>) => entry.path)).toEqual(
      [...receipt.entries.map((entry: Record<string, unknown>) => entry.path)].sort((left, right) =>
        String(left) < String(right) ? -1 : String(left) > String(right) ? 1 : 0
      ),
    );
    for (const entry of receipt.entries.filter((candidate: Record<string, unknown>) =>
      String(candidate.path).startsWith("extension/")
    )) {
      expect(entry).toEqual(expect.objectContaining({
        source: expect.objectContaining({
          kind: "synthetic",
          path: expect.any(String),
          sha256: expect.stringMatching(/^[0-9a-f]{64}$/u),
          equal: true,
        }),
      }));
    }
  }, 30_000);

  test("refuses dirty state before invoking VSCE", async () => {
    const artifact = await loadArtifactModule();
    const harness = await lifecycleHarness(artifact, "dirty");

    await expect(artifact.packVsix({
      ...harness.dependencies,
      gitState: () => { throw new Error("untracked release input"); },
    })).rejects.toThrow(/untracked/u);
    expect(harness.vsceCalls).toHaveLength(0);
  });

  test("rejects wrong declared and resolved tool pins before invoking VSCE", async () => {
    const artifact = await loadArtifactModule();
    const cases = [
      { label: "declared VSCE", declaredVsce: "3.9.1" },
      { label: "resolved VSCE", resolvedVsce: "3.9.1" },
      { label: "declared JSZip", declaredJszip: "3.10.0" },
      { label: "resolved JSZip", resolvedJszip: "3.10.0" },
      { label: "actual pnpm", pnpmVersion: "11.5.1" },
    ];

    for (const testCase of cases) {
      const harness = await toolPinHarness(artifact, testCase.label, testCase);
      await expect(artifact.packVsix(harness.dependencies), testCase.label)
        .rejects.toThrow(/must be pinned|Actual pnpm/iu);
      expect(harness.vsceCalls, testCase.label).toHaveLength(0);
    }
  });

  test("refuses existing and symlink artifact outputs before invoking VSCE", async () => {
    const artifact = await loadArtifactModule();
    const existing = await lifecycleHarness(artifact, "existing");
    mkdirSync(existing.releaseRoot);
    writeFileSync(existing.paths.vsix, "existing", { flag: "wx" });
    await expect(artifact.packVsix(existing.dependencies))
      .rejects.toThrow(/overwrite/u);

    const symlink = await lifecycleHarness(artifact, "symlink");
    mkdirSync(symlink.releaseRoot);
    const target = path.join(symlink.releaseRoot, "target");
    mkdirSync(target);
    symlinkSync(target, symlink.paths.vsix, process.platform === "win32" ? "junction" : "dir");
    expect(lstatSync(symlink.paths.vsix).isSymbolicLink()).toBe(true);
    await expect(artifact.packVsix(symlink.dependencies))
      .rejects.toThrow(/symlink/u);
    expect(existing.vsceCalls).toHaveLength(0);
    expect(symlink.vsceCalls).toHaveLength(0);
  });

  test("rereads promoted bytes before writing their receipt", async () => {
    const artifact = await loadArtifactModule();
    const harness = await lifecycleHarness(artifact, "promotion-drift");

    await expect(artifact.packVsix({
      ...harness.dependencies,
      afterArtifactPromotion: (paths: ArtifactPaths) => {
        appendFileSync(paths.vsix, Buffer.from([0x42]));
      },
    })).rejects.toThrow(/promoted.*differ/iu);
    expect(harness.vsceCalls).toHaveLength(1);
    expect(() => lstatSync(harness.paths.vsix)).toThrow();
    expect(() => lstatSync(harness.paths.receipt)).toThrow();
  });

  test("revalidates exact artifact, receipt, and checksum bytes without repackaging", async () => {
    const artifact = await loadArtifactModule();
    const harness = await lifecycleHarness(artifact, "verify");
    await artifact.packVsix(harness.dependencies);

    await expect(artifact.verifyVsix(harness.dependencies)).resolves.toEqual(
      expect.objectContaining({ schemaVersion: artifact.artifactSchemaVersion }),
    );
    expect(harness.vsceCalls).toHaveLength(1);

    const receipt = JSON.parse(readFileSync(harness.paths.receipt, "utf8"));
    receipt.artifact.bytes += 1;
    writeFileSync(harness.paths.receipt, `${JSON.stringify(receipt, null, 2)}\n`);
    await expect(artifact.verifyVsix(harness.dependencies)).rejects.toThrow(/receipt/u);
    expect(harness.vsceCalls).toHaveLength(1);
  });

  test("rejects whitespace-only receipt byte drift", async () => {
    const artifact = await loadArtifactModule();
    const harness = await lifecycleHarness(artifact, "receipt-whitespace");
    await artifact.packVsix(harness.dependencies);
    appendFileSync(harness.paths.receipt, " \n");

    await expect(artifact.verifyVsix(harness.dependencies)).rejects.toThrow(/receipt/iu);
    expect(harness.vsceCalls).toHaveLength(1);
  });

  test("rejects final artifact and checksum drift", async () => {
    const artifact = await loadArtifactModule();
    const artifactDrift = await lifecycleHarness(artifact, "artifact-drift");
    await artifact.packVsix(artifactDrift.dependencies);
    appendFileSync(artifactDrift.paths.vsix, Buffer.from([0x42]));
    await expect(artifact.verifyVsix(artifactDrift.dependencies)).rejects.toThrow();

    const checksumDrift = await lifecycleHarness(artifact, "checksum-drift");
    await artifact.packVsix(checksumDrift.dependencies);
    appendFileSync(checksumDrift.paths.checksum, "drift\n");
    await expect(artifact.verifyVsix(checksumDrift.dependencies))
      .rejects.toThrow(/checksum/u);
  });
});

describe("VSIX release surface", () => {
  test("addresses immutable artifact names by the clean repository HEAD", async () => {
    const artifact = await loadArtifactModule();
    const root = temporaryRoot("aurelia-vsix-paths-");
    const first = artifact.artifactPaths(packageManifest, root, "0123456789abcdef0123456789abcdef01234567");
    const second = artifact.artifactPaths(packageManifest, root, "fedcba9876543210fedcba9876543210fedcba98");

    expect(path.basename(first.vsix)).toBe("aurelia-2-0.4.4-0123456789ab.vsix");
    expect(second.vsix).not.toBe(first.vsix);
    expect(() => artifact.artifactPaths(packageManifest, root, "0123456789ab")).toThrow(/repository HEAD/u);
    expect(() => artifact.artifactPaths(packageManifest, root, "not-a-head")).toThrow(/repository HEAD/u);
  });

  test("pins the package-local tools and keeps VSCE's minified prepublish lifecycle", async () => {
    const rootPackage = JSON.parse(readFileSync(rootPackageUrl, "utf8"));
    const vscodePackage = JSON.parse(readFileSync(vscodePackageUrl, "utf8"));

    expect(vscodePackage.scripts).toEqual(expect.objectContaining({
      "vscode:prepublish": "pnpm run bundle:minify",
      "release:pack": "node scripts/vsix-artifact.mjs pack",
      "release:verify": "node scripts/vsix-artifact.mjs verify",
    }));
    expect(rootPackage.scripts).toEqual(expect.objectContaining({
      "package:ide:vsix": "tsc -b --force packages/semantic-runtime packages/language-server packages/vscode && pnpm --filter aurelia-2 run release:pack",
      "verify:ide:vsix": "pnpm --filter aurelia-2 run release:verify",
    }));
    expect(vscodePackage.devDependencies).toEqual(expect.objectContaining({
      "@vscode/vsce": "3.9.2",
      "jszip": "3.10.1",
      "@vscode/test-electron": "3.0.0",
      "esbuild": "0.24.2",
    }));
    expect(vscodePackage.dependencies.typescript).toBe("6.0.3");
  });

  test("uses root-scoped development rules and excludes VSIX files at every depth", () => {
    const ignore = readFileSync(ignoreUrl, "utf8");
    for (const rule of [
      ".vscode-test/**",
      ".release/**",
      "scripts/**",
      "src/**",
      "out/**",
      "test/**",
      "node_modules/**",
      "**/*.vsix",
      "tsconfig*.json",
      "*.tsbuildinfo",
      "esbuild.mjs",
      ".vscodeignore",
      "**/*.map",
    ]) {
      expect(ignore.split(/\r?\n/u)).toContain(rule);
    }
    const rules = ignore.split(/\r?\n/u)
      .map((line) => line.trim())
      .filter((line) => line !== "" && !line.startsWith("#"));
    const packageRequire = createRequire(vscodePackageUrl);
    const vsceRequire = createRequire(packageRequire.resolve("@vscode/vsce/package.json"));
    const { minimatch } = vsceRequire("minimatch") as {
      readonly minimatch: (
        candidate: string,
        pattern: string,
        options: { readonly dot: boolean },
      ) => boolean;
    };
    const excluded = (candidate: string) => rules.some((rule) =>
      minimatch(candidate, rule, { dot: true })
    );
    for (const candidate of [
      ".vscode-test/scripts/code.js",
      ".release/aurelia-2.vsix",
      "scripts/vsix-artifact.mjs",
      "src/extension.ts",
      "out/extension.js",
      "test/vsix-release-contract.test.ts",
      "node_modules/typescript/lib/typescript.js",
      "dist/extension.cjs.map",
      "nested/aurelia-2.vsix",
      "aurelia-2.vsix",
      "tsconfig.json",
      "tsconfig.test.json",
      "tsconfig.tsbuildinfo",
      "esbuild.mjs",
      ".vscodeignore",
    ]) {
      expect(excluded(candidate), `expected ${candidate} to be excluded`).toBe(true);
    }
    for (const candidate of [
      "dist/extension.cjs",
      "dist/server/main.cjs",
      "dist/node_modules/typescript/lib/typescript.js",
      "package.json",
      "README.md",
      "CHANGELOG.md",
      "LICENSE",
      "images/logo.png",
    ]) {
      expect(excluded(candidate), `expected ${candidate} to remain included`).toBe(false);
    }
  });

  test("uses authentic VSCE metadata paths and a canonical dist inventory", async () => {
    const artifact = await loadArtifactModule();
    const entries = artifact.expectedArchiveEntries();
    for (const required of [
      "extension/package.json",
      "extension/readme.md",
      "extension/changelog.md",
      "extension/LICENSE.txt",
      "extension/images/logo.png",
      "extension/dist/extension.cjs",
      "extension/dist/server/main.cjs",
      "extension/dist/schemas/aurelia.project.schema.json",
      "extension/dist/schemas/aurelia.project.jsonc.schema.json",
      "extension/dist/node_modules/typescript/package.json",
      "extension/dist/node_modules/typescript/lib/typescript.js",
    ]) {
      expect(entries.has(required), `missing canonical archive input ${required}`).toBe(true);
    }
    expect([...entries.keys()]).not.toContain(expect.stringMatching(/\.map$/u));
  });

  test("rejects missing canonical TypeScript inputs and unexpected dist files", async () => {
    const artifact = await loadArtifactModule();
    const valid = canonicalInputFixture();
    expect(() => artifact.expectedArchiveEntries(valid.extensionRoot, valid.options)).not.toThrow();

    const missingSource = canonicalInputFixture();
    unlinkSync(path.join(missingSource.typescriptRoot, "lib", "typescript.js"));
    expect(() => artifact.expectedArchiveEntries(missingSource.extensionRoot, missingSource.options))
      .toThrow(/inventory mismatch|extra/iu);

    const missingCopy = canonicalInputFixture();
    unlinkSync(path.join(
      missingCopy.extensionRoot,
      "dist",
      "node_modules",
      "typescript",
      "lib",
      "typescript.js",
    ));
    expect(() => artifact.expectedArchiveEntries(missingCopy.extensionRoot, missingCopy.options))
      .toThrow(/Required generated|missing|ENOENT/iu);

    const extraDist = canonicalInputFixture();
    writeFileSync(path.join(extraDist.extensionRoot, "dist", "stale.cjs"), "stale\n");
    expect(() => artifact.expectedArchiveEntries(extraDist.extensionRoot, extraDist.options))
      .toThrow(/inventory mismatch.*extra/iu);
  });

  test("checks untracked files and exact submodule state through the real Git seam", async () => {
    const artifact = await loadArtifactModule();
    const calls: { readonly command: string; readonly args: readonly string[] }[] = [];
    const execFileSync = (command: string, args: readonly string[]): string => {
      calls.push({ command, args });
      if (args[0] === "rev-parse") return "0123456789abcdef0123456789abcdef01234567\n";
      if (args[0] === "status") return "?? untracked-release-input\n";
      throw new Error(`Unexpected Git call: ${args.join(" ")}`);
    };

    expect(() => artifact.gitState({ execFileSync }, { repoRoot: temporaryRoot("aurelia-vsix-git-") }))
      .toThrow(/untracked-release-input/u);
    expect(calls).toContainEqual({
      command: "git",
      args: ["status", "--porcelain=v1", "--untracked-files=all", "--ignore-submodules=none"],
    });

    const submoduleCalls: readonly string[][] = [];
    expect(() => artifact.gitState({
      execFileSync: (_command: string, args: string[]) => {
        (submoduleCalls as string[][]).push(args);
        if (args[0] === "rev-parse") return "0123456789abcdef0123456789abcdef01234567\n";
        if (args[0] === "status") return "";
        if (args[0] === "submodule") return "-deadbeef external\n";
        throw new Error(`Unexpected Git call: ${args.join(" ")}`);
      },
    }, { repoRoot: temporaryRoot("aurelia-vsix-submodule-") }))
      .toThrow(/initialized submodules/u);
    expect(submoduleCalls).toContainEqual(["submodule", "status", "--recursive"]);
  });

  test("authenticates the lifecycle pnpm entrypoint without a shell or PATH lookup", async () => {
    const artifact = await loadArtifactModule();
    const repoRoot = temporaryRoot("aurelia-vsix-pnpm-");
    const executable = path.join(repoRoot, "pnpm.mjs");
    writeFileSync(executable, "// synthetic pnpm entrypoint\n");
    const calls: { readonly command: string; readonly args: readonly string[]; readonly cwd: string }[] = [];

    const evidence = artifact.pnpmRuntimeEvidence({ repoRoot }, {
      pnpmExecPath: executable,
      execFileSync: (command: string, args: readonly string[], options: { readonly cwd: string }) => {
        calls.push({ command, args, cwd: options.cwd });
        return "11.5.2\n";
      },
    });

    expect(calls).toEqual([{ command: process.execPath, args: [executable, "--version"], cwd: repoRoot }]);
    expect(evidence).toEqual({
      version: "11.5.2",
      executable: {
        kind: "pnpm-node-entrypoint",
        path: executable.split(path.sep).join("/"),
        bytes: readFileSync(executable).length,
        sha256: artifact.sha256(readFileSync(executable)),
      },
    });
  });
});

async function loadArtifactModule(): Promise<VsixArtifactModule> {
  return import(`${artifactModuleUrl.href}?contract=${Date.now()}-${Math.random()}`) as Promise<VsixArtifactModule>;
}

function temporaryRoot(prefix: string): string {
  const root = mkdtempSync(path.join(tmpdir(), prefix));
  temporaryRoots.push(root);
  return root;
}

async function lifecycleHarness(artifact: VsixArtifactModule, label: string) {
  const repoRoot = temporaryRoot(`aurelia-vsix-${label}-`);
  const extensionRoot = path.join(repoRoot, "packages", "vscode");
  const releaseRoot = path.join(extensionRoot, ".release");
  mkdirSync(extensionRoot, { recursive: true });
  const fixture = syntheticFixture();
  const archive = await archiveForFixture(fixture);
  const paths = artifact.artifactPaths(
    fixture.packageJson,
    releaseRoot,
    "0123456789abcdef0123456789abcdef01234567",
  );
  const vsceCalls: Record<string, any>[] = [];
  let repositoryReads = 0;
  const evidenceHash = artifact.sha256(`synthetic-${label}`);
  const repository = Object.freeze({
    head: "0123456789abcdef0123456789abcdef01234567",
    status: "",
    submodules: " deadbeef aurelia\n deadbeef aurelia2-plugins\n",
  });
  const toolsAndInputs = Object.freeze({
    nodeVersion: process.version,
    declaredPackageManager: "pnpm@11.5.2",
    pnpmVersion: "11.5.2",
    vsceVersion: "3.9.2",
    jszipVersion: "3.10.1",
    vscePackageJsonSha256: evidenceHash,
    jszipPackageJsonSha256: evidenceHash,
    packageJsonSha256: evidenceHash,
    pnpmLockSha256: evidenceHash,
    vscodeIgnoreSha256: evidenceHash,
  });
  const dependencies = {
    extensionRoot,
    repoRoot,
    releaseRoot,
    packageJson: fixture.packageJson,
    expectedEntries: fixture.expectedEntries,
    inspectVsixBuffer: artifact.inspectVsixBuffer,
    inputEvidence: toolsAndInputs,
    gitState: () => {
      repositoryReads += 1;
      return repository;
    },
    createVSIX: async (options: Record<string, any>) => {
      vsceCalls.push(options);
      writeFileSync(options.packagePath, archive, { flag: "wx" });
    },
  };
  return Object.freeze({
    dependencies,
    extensionRoot,
    releaseRoot,
    repoRoot,
    paths,
    vsceCalls,
    gitReads: () => repositoryReads,
  });
}

async function toolPinHarness(
  artifact: VsixArtifactModule,
  label: string,
  versions: {
    readonly declaredVsce?: string;
    readonly resolvedVsce?: string;
    readonly declaredJszip?: string;
    readonly resolvedJszip?: string;
    readonly pnpmVersion?: string;
  },
) {
  const harness = await lifecycleHarness(artifact, `pin-${label.replaceAll(" ", "-")}`);
  const packageJson = {
    ...packageManifest,
    dependencies: { typescript: "6.0.3" },
    devDependencies: {
      "@vscode/vsce": versions.declaredVsce ?? "3.9.2",
      jszip: versions.declaredJszip ?? "3.10.1",
    },
  };
  const vscePackageJsonPath = path.join(harness.repoRoot, "tools", "vsce", "package.json");
  const jszipPackageJsonPath = path.join(harness.repoRoot, "tools", "jszip", "package.json");
  mkdirSync(path.dirname(vscePackageJsonPath), { recursive: true });
  mkdirSync(path.dirname(jszipPackageJsonPath), { recursive: true });
  writeFileSync(path.join(harness.extensionRoot, "package.json"), `${JSON.stringify(packageJson, null, 2)}\n`);
  writeFileSync(path.join(harness.extensionRoot, ".vscodeignore"), "src/**\n");
  writeFileSync(path.join(harness.repoRoot, "package.json"), `${JSON.stringify({
    private: true,
    packageManager: "pnpm@11.5.2",
  }, null, 2)}\n`);
  writeFileSync(path.join(harness.repoRoot, "pnpm-lock.yaml"), "lockfileVersion: '9.0'\n");
  writeFileSync(vscePackageJsonPath, `${JSON.stringify({
    name: "@vscode/vsce",
    version: versions.resolvedVsce ?? "3.9.2",
  })}\n`);
  writeFileSync(jszipPackageJsonPath, `${JSON.stringify({
    name: "jszip",
    version: versions.resolvedJszip ?? "3.10.1",
  })}\n`);
  return {
    ...harness,
    dependencies: {
      ...harness.dependencies,
      packageJson,
      inputEvidence: undefined,
      pnpmVersion: versions.pnpmVersion ?? "11.5.2",
      vscePackageJsonPath,
      jszipPackageJsonPath,
    },
  };
}

function canonicalInputFixture() {
  const repoRoot = temporaryRoot("aurelia-vsix-canonical-");
  const extensionRoot = path.join(repoRoot, "packages", "vscode");
  const typescriptRoot = path.join(extensionRoot, "node_modules", "typescript");
  const projectSchemaSource = path.join(
    repoRoot,
    "packages",
    "semantic-runtime",
    "schema",
    "aurelia.project.schema.json",
  );
  const projectDialectSchemaSource = path.join(
    extensionRoot,
    "src",
    "schemas",
    "aurelia.project.jsonc.schema.json",
  );
  const packageJson = {
    ...packageManifest,
    dependencies: { typescript: "6.0.3" },
  };
  const localInputs: Record<string, string> = {
    "package.json": `${JSON.stringify(packageJson, null, 2)}\n`,
    "README.md": "# Aurelia 2\n",
    "CHANGELOG.md": "# Changelog\n",
    LICENSE: "MIT\n",
    "images/logo.png": "synthetic-png",
    "dist/extension.cjs": "extension\n",
    "dist/extension.cjs.map": "{}\n",
    "dist/server/main.cjs": "server\n",
    "dist/server/main.cjs.map": "{}\n",
  };
  for (const [relativePath, value] of Object.entries(localInputs)) {
    const filePath = path.join(extensionRoot, ...relativePath.split("/"));
    mkdirSync(path.dirname(filePath), { recursive: true });
    writeFileSync(filePath, value);
  }
  const schema = "{\"$schema\":\"https://json-schema.org/draft/2020-12/schema\"}\n";
  mkdirSync(path.dirname(projectSchemaSource), { recursive: true });
  writeFileSync(projectSchemaSource, schema);
  const copiedSchema = path.join(extensionRoot, "dist", "schemas", "aurelia.project.schema.json");
  mkdirSync(path.dirname(copiedSchema), { recursive: true });
  writeFileSync(copiedSchema, schema);
  const dialectSchema = '{"allowComments":true,"allowTrailingCommas":true}\n';
  mkdirSync(path.dirname(projectDialectSchemaSource), { recursive: true });
  writeFileSync(projectDialectSchemaSource, dialectSchema);
  const copiedDialectSchema = path.join(
    extensionRoot,
    "dist",
    "schemas",
    "aurelia.project.jsonc.schema.json",
  );
  writeFileSync(copiedDialectSchema, dialectSchema);

  const typescriptFiles: Record<string, string> = {
    "package.json": "{\"name\":\"typescript\",\"version\":\"6.0.3\"}\n",
    "lib/typescript.js": "exports.version = '6.0.3';\n",
  };
  for (const [relativePath, value] of Object.entries(typescriptFiles)) {
    const authorityPath = path.join(typescriptRoot, ...relativePath.split("/"));
    const copiedPath = path.join(
      extensionRoot,
      "dist",
      "node_modules",
      "typescript",
      ...relativePath.split("/"),
    );
    mkdirSync(path.dirname(authorityPath), { recursive: true });
    mkdirSync(path.dirname(copiedPath), { recursive: true });
    writeFileSync(authorityPath, value);
    writeFileSync(copiedPath, value);
  }
  return {
    repoRoot,
    extensionRoot,
    typescriptRoot,
    projectSchemaSource,
    projectDialectSchemaSource,
    options: {
      repoRoot,
      typescriptRoot,
      projectSchemaSource,
      projectDialectSchemaSource,
      expectedTypeScriptVersion: "6.0.3",
    },
  };
}

function syntheticFixture(
  extraPayloads: Record<string, string | Buffer> = {},
  includeExtraInExpected = true,
): SyntheticFixture {
  const root = temporaryRoot("aurelia-vsix-synthetic-");
  const payloads = new Map<string, Buffer>();
  for (const [archivePath, value] of Object.entries({ ...defaultPayloads, ...extraPayloads })) {
    payloads.set(archivePath, Buffer.isBuffer(value) ? value : Buffer.from(value));
  }
  const expectedEntries = new Map<string, ExpectedEntry>();
  let index = 0;
  for (const [archivePath, bytes] of payloads) {
    if (!includeExtraInExpected && archivePath in extraPayloads) continue;
    const sourcePath = path.join(root, "sources", `${String(index).padStart(3, "0")}.bin`);
    mkdirSync(path.dirname(sourcePath), { recursive: true });
    writeFileSync(sourcePath, bytes);
    expectedEntries.set(archivePath, Object.freeze({
      sourcePath,
      kind: "synthetic",
      authorityPath: null,
    }));
    index += 1;
  }
  return { root, packageJson: { ...packageManifest }, expectedEntries, payloads };
}

async function archiveForFixture(
  fixture: SyntheticFixture,
  entryOptions: Record<string, JSZip.JSZipFileOptions> = {},
  omitted = new Set<string>(),
  overrides = new Map<string, Buffer>(),
  generation: { readonly streamFiles?: boolean } = {},
): Promise<Buffer> {
  const zip = new JSZip();
  const regularFile = { unixPermissions: 0o100644, createFolders: false } satisfies JSZip.JSZipFileOptions;
  const unixModes = new Map<string, number>([
    ["[Content_Types].xml", 0o100644],
    ["extension.vsixmanifest", 0o100644],
  ]);
  zip.file("[Content_Types].xml", "<Types></Types>\n", regularFile);
  zip.file("extension.vsixmanifest", vsixManifest(fixture.packageJson), regularFile);
  for (const [archivePath, original] of fixture.payloads) {
    if (omitted.has(archivePath)) continue;
    const configuredMode = entryOptions[archivePath]?.unixPermissions;
    unixModes.set(archivePath, typeof configuredMode === "number" ? configuredMode : 0o100644);
    zip.file(archivePath, overrides.get(archivePath) ?? original, {
      ...regularFile,
      ...entryOptions[archivePath],
    });
  }
  const archive = await zip.generateAsync({
    type: "nodebuffer",
    compression: "DEFLATE",
    compressionOptions: { level: 6 },
    platform: "UNIX",
    streamFiles: generation.streamFiles ?? false,
  });
  return normalizePinnedWriterShape(archive, unixModes);
}

function vsixManifest(manifest: Record<string, any>): string {
  return [
    "<?xml version=\"1.0\" encoding=\"utf-8\"?>",
    "<PackageManifest Version=\"2.0.0\" xmlns=\"http://schemas.microsoft.com/developer/vsx-schema/2011\">",
    "  <Metadata>",
    `    <Identity Id="${manifest.name}" Version="${manifest.version}" Publisher="${manifest.publisher}" />`,
    "  </Metadata>",
    "</PackageManifest>",
    "",
  ].join("\n");
}

function centralRecords(buffer: Buffer): CentralRecord[] {
  const eocd = findSignatureBackwards(buffer, 0x06054b50);
  const count = buffer.readUInt16LE(eocd + 10);
  let offset = buffer.readUInt32LE(eocd + 16);
  const records: CentralRecord[] = [];
  for (let index = 0; index < count; index += 1) {
    expect(buffer.readUInt32LE(offset)).toBe(0x02014b50);
    const nameBytes = buffer.readUInt16LE(offset + 28);
    const extraBytes = buffer.readUInt16LE(offset + 30);
    const commentBytes = buffer.readUInt16LE(offset + 32);
    const nameOffset = offset + 46;
    records.push({
      centralOffset: offset,
      localOffset: buffer.readUInt32LE(offset + 42),
      name: buffer.subarray(nameOffset, nameOffset + nameBytes).toString("utf8"),
      nameOffset,
      nameBytes,
      compressedBytes: buffer.readUInt32LE(offset + 20),
    });
    offset = nameOffset + nameBytes + extraBytes + commentBytes;
  }
  return records;
}

function findSignatureBackwards(buffer: Buffer, signature: number): number {
  for (let offset = buffer.length - 4; offset >= 0; offset -= 1) {
    if (buffer.readUInt32LE(offset) === signature) return offset;
  }
  throw new Error(`Synthetic ZIP signature ${signature.toString(16)} was not found.`);
}

function recordFor(buffer: Buffer, name: string): CentralRecord {
  const record = centralRecords(buffer).find((candidate) => candidate.name === name);
  if (record == null) throw new Error(`Synthetic ZIP has no entry ${name}.`);
  return record;
}

function replaceCentralName(buffer: Buffer, from: string, to: string): Buffer {
  const result = Buffer.from(buffer);
  const record = recordFor(result, from);
  const replacement = Buffer.from(to);
  if (replacement.length !== record.nameBytes) throw new Error("Replacement ZIP names must have equal byte length.");
  replacement.copy(result, record.nameOffset);
  return result;
}

function replaceEntryName(buffer: Buffer, from: string, to: string): Buffer {
  const result = replaceCentralName(buffer, from, to);
  const record = recordFor(buffer, from);
  const replacement = Buffer.from(to);
  const localNameBytes = result.readUInt16LE(record.localOffset + 26);
  if (replacement.length !== localNameBytes) throw new Error("Replacement local ZIP names must have equal byte length.");
  replacement.copy(result, record.localOffset + 30);
  return result;
}

function setEntryFlags(buffer: Buffer, name: string, flags: number): Buffer {
  const result = Buffer.from(buffer);
  const record = recordFor(result, name);
  result.writeUInt16LE(result.readUInt16LE(record.centralOffset + 8) | flags, record.centralOffset + 8);
  result.writeUInt16LE(result.readUInt16LE(record.localOffset + 6) | flags, record.localOffset + 6);
  return result;
}

function setLocalOffset(buffer: Buffer, name: string, localOffset: number): Buffer {
  const result = Buffer.from(buffer);
  const record = recordFor(result, name);
  result.writeUInt32LE(localOffset, record.centralOffset + 42);
  return result;
}

function overlapLocalRecords(buffer: Buffer): Buffer {
  const result = Buffer.from(buffer);
  const records = centralRecords(result);
  const first = records[0]!;
  const second = records[1]!;
  result.writeUInt32LE(first.localOffset, second.centralOffset + 42);
  return result;
}

function mutateLocalSignature(buffer: Buffer, name: string): Buffer {
  const result = Buffer.from(buffer);
  const record = recordFor(result, name);
  result.writeUInt32LE(0, record.localOffset);
  return result;
}

function mutateCentralCrc(buffer: Buffer, name: string): Buffer {
  const result = Buffer.from(buffer);
  const record = recordFor(result, name);
  result.writeUInt32LE((result.readUInt32LE(record.centralOffset + 16) ^ 0xffffffff) >>> 0, record.centralOffset + 16);
  return result;
}

function mutateDataDescriptorCrc(buffer: Buffer, name: string): Buffer {
  const result = Buffer.from(buffer);
  const record = recordFor(result, name);
  const localNameBytes = result.readUInt16LE(record.localOffset + 26);
  const localExtraBytes = result.readUInt16LE(record.localOffset + 28);
  const descriptorOffset = record.localOffset + 30 + localNameBytes + localExtraBytes + record.compressedBytes;
  if (result.readUInt32LE(descriptorOffset) !== 0x08074b50) {
    throw new Error(`Synthetic streamed ZIP has no signed descriptor for ${name}.`);
  }
  result.writeUInt32LE((result.readUInt32LE(descriptorOffset + 4) ^ 0xffffffff) >>> 0, descriptorOffset + 4);
  return result;
}

function setDeclaredUncompressedBytes(buffer: Buffer, name: string, bytes: number): Buffer {
  const result = Buffer.from(buffer);
  const record = recordFor(result, name);
  result.writeUInt32LE(bytes, record.centralOffset + 24);
  result.writeUInt32LE(bytes, record.localOffset + 22);
  return result;
}

function normalizePinnedWriterShape(buffer: Buffer, unixModes: ReadonlyMap<string, number>): Buffer {
  const result = Buffer.from(buffer);
  for (const record of centralRecords(result)) {
    const mode = unixModes.get(record.name);
    if (mode == null) throw new Error(`Synthetic ZIP has no Unix mode for ${record.name}.`);
    const centralFlags = result.readUInt16LE(record.centralOffset + 8) | 0x0800;
    const localFlags = result.readUInt16LE(record.localOffset + 6) | 0x0800;
    result.writeUInt16LE(centralFlags, record.centralOffset + 8);
    result.writeUInt16LE(localFlags, record.localOffset + 6);
    result.writeUInt16LE((3 << 8) | (result.readUInt16LE(record.centralOffset + 4) & 0x00ff), record.centralOffset + 4);
    result.writeUInt32LE(((mode << 16) | (result.readUInt32LE(record.centralOffset + 38) & 0xffff)) >>> 0, record.centralOffset + 38);
  }
  return result;
}
