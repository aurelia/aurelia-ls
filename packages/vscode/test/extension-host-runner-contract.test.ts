import { createHash, randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";
import {
  cpSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  realpathSync,
  renameSync,
  rmSync,
  symlinkSync,
  truncateSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { dirname, isAbsolute, join, relative, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { describe, expect, test } from "vitest";

interface PackageManifest {
  readonly engines?: Readonly<Record<string, string>>;
  readonly scripts?: Readonly<Record<string, string>>;
}

interface RunnerPlan {
  readonly transport: "worker" | "ipc";
  readonly version: "stable" | "1.91.0";
  readonly versionLane: "current-stable" | "minimum";
  readonly minimumVSCodeVersion: "1.91.0";
  readonly shards: readonly string[];
  readonly launchCount: number;
  readonly launches: readonly {
    readonly shard: string;
    readonly disposableRoot: string;
    readonly productSupportAcceptance: {
      readonly enabled: boolean;
      readonly authoritative?: boolean;
      readonly sourceManifest?: string;
      readonly workspaceRoot?: string;
      readonly descriptor?: string;
      readonly fixtureManifest?: string;
      readonly ledger?: string;
      readonly report?: string;
      readonly requiresBuiltStaticContract?: boolean;
      readonly sourceManifestPresent?: boolean;
      readonly builtStaticContractPresent?: boolean;
    };
  }[];
}

interface ExecutionProbe {
  readonly downloadCount: number;
  readonly launches: readonly {
    readonly shard: string;
    readonly expectedActualVersion: string;
    readonly expectedTransport: string;
    readonly routedWorkspace: string | null;
    readonly tailObservation: string | null;
    readonly acceptance: string | null;
    readonly descriptor: string | null;
    readonly fixtureManifest: string | null;
    readonly ledger: string | null;
    readonly report: string | null;
    readonly resourceDiscoveryEnvironmentNames: readonly string[];
    readonly testWorkspace: string;
    readonly userDataArgument: string;
  }[];
  readonly maxConcurrentLaunches: number;
  readonly preparedShards: readonly string[];
  readonly preparedLanes: readonly string[];
  readonly authenticatedShards: readonly string[];
}

interface MutableFixtureManifest extends Record<string, unknown> {
  generatedInputs: { id: string; lanes: string[] }[];
  witnesses: Record<string, Record<string, unknown>>;
}

interface MutableAmbiguityScope {
  rowCount: number;
  selectableRowCount: number;
  navigationUnavailableIdentityKeys: string[];
  navigationUnavailableReason: string;
  resourceIdentityKeys: string[];
}

const runnerPath = fileURLToPath(
  new URL("../scripts/run-extension-host-tests.mjs", import.meta.url),
);
const staticContractPath = fileURLToPath(
  new URL("../scripts/extension-host-static-contract.mjs", import.meta.url),
);
const committedFixturePath = fileURLToPath(
  new URL("fixtures/resource-discovery-host.json", import.meta.url),
);
const contractTempRoot = resolve(
  dirname(runnerPath),
  "../../../.temp/vscode-extension-host/runner-contract",
);
const extensionManifest = readManifest(new URL("../package.json", import.meta.url));
const rootManifest = readManifest(new URL("../../../package.json", import.meta.url));

describe("Extension Host support runner", () => {
  test("pins and enforces the bounded Resource Discovery observation ledger size", async () => {
    const root = join(contractTempRoot, randomUUID());
    try {
      mkdirSync(root, { recursive: true });
      const runner = await import(pathToFileURL(runnerPath).href);
      expect(runner.resourceDiscoveryObservationLedgerMaxBytes).toBe(201_326_592);

      const file = join(root, "bounded-observations.jsonl");
      const bytes = Buffer.from("{}\n", "utf8");
      writeFileSync(file, bytes);
      expect(runner.readBoundedRegularFile(
        file,
        bytes.length,
        "bounded observation ledger probe",
        root,
      )).toEqual(bytes);
      expect(() => runner.readBoundedRegularFile(
        file,
        bytes.length - 1,
        "bounded observation ledger probe",
        root,
      )).toThrow(/no larger than 2 bytes/u);
    } finally {
      assertContractTempPath(root);
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("matches file URIs to exact lexical host paths without collapsing raw workspace identity", async () => {
    const root = join(contractTempRoot, randomUUID());
    try {
      mkdirSync(root, { recursive: true });
      const runner = await import(pathToFileURL(runnerPath).href);
      const matches = runner.fileUriMatchesHostPath;
      const currentPath = join(root, "current-stable", "source.ts");
      const minimumPath = join(root, "minimum", "source.ts");
      for (const expectedPath of [currentPath, minimumPath]) {
        expect(matches(pathToFileURL(expectedPath).href, expectedPath)).toBe(true);
      }

      const encodedPath = join(root, "space directory", "λ-source.ts");
      const encodedUri = pathToFileURL(encodedPath).href;
      expect(encodedUri).toContain("%20");
      expect(matches(encodedUri, encodedPath)).toBe(true);

      if (process.platform === "win32") {
        const attempt9Path = resolve(
          "C:/projects/aurelia-ls2/.temp/vscode-extension-host/current-stable/worker/"
            + "product-support/routed-catalog-storefront/host-corpus/overlap/src/shared-plugin-app.ts",
        );
        const attempt9LowerDriveUri =
          "file:///c:/projects/aurelia-ls2/.temp/vscode-extension-host/current-stable/worker/"
          + "product-support/routed-catalog-storefront/host-corpus/overlap/src/shared-plugin-app.ts";
        const attempt9EncodedDriveUri = attempt9LowerDriveUri.replace("c:", "c%3A");
        expect(matches(attempt9LowerDriveUri, attempt9Path)).toBe(true);
        expect(matches(attempt9EncodedDriveUri, attempt9Path)).toBe(true);
        expect(matches(
          "file:///c:/projects/aurelia-ls2/source.ts",
          resolve("C:/Projects/Aurelia-LS2/Source.ts"),
        )).toBe(true);
        expect(matches(attempt9LowerDriveUri.replace("file:///c:", "file:///d:"), attempt9Path))
          .toBe(false);
        const workspacePath = resolve(
          "C:/projects/aurelia-ls2/.temp/vscode-extension-host/current-stable/worker/"
            + "product-support/routed-catalog-storefront",
        );
        const rawWorkspaceKey =
          "file:///c:/projects/aurelia-ls2/.temp/vscode-extension-host/current-stable/worker/"
          + "product-support/routed-catalog-storefront";
        const encodedWorkspaceKey = rawWorkspaceKey.replace("c:", "c%3A");
        expect(matches(rawWorkspaceKey, workspacePath)).toBe(true);
        expect(matches(encodedWorkspaceKey, workspacePath)).toBe(true);
        expect(createHash("sha256").update(rawWorkspaceKey).digest("hex"))
          .not.toBe(createHash("sha256").update(encodedWorkspaceKey).digest("hex"));
      } else {
        const caseSensitivePath = join(root, "Case-Sensitive", "Source.ts");
        expect(matches(
          pathToFileURL(join(root, "case-sensitive", "source.ts")).href,
          caseSensitivePath,
        )).toBe(false);
        const rawWorkspaceUri = pathToFileURL(join(root, "workspace")).href;
        const encodedWorkspaceUri = rawWorkspaceUri.replace(/workspace$/u, "%77orkspace");
        expect(matches(rawWorkspaceUri, join(root, "workspace"))).toBe(true);
        expect(matches(encodedWorkspaceUri, join(root, "workspace"))).toBe(true);
        expect(createHash("sha256").update(rawWorkspaceUri).digest("hex"))
          .not.toBe(createHash("sha256").update(encodedWorkspaceUri).digest("hex"));
      }

      const adjacentPath = join(root, "adjacent", "source.ts");
      expect(matches(pathToFileURL(adjacentPath).href, currentPath)).toBe(false);
      expect(matches("not a URI", currentPath)).toBe(false);
      expect(matches("https://example.test/source.ts", currentPath)).toBe(false);
      expect(matches(pathToFileURL(currentPath).href, "relative/source.ts")).toBe(false);
      expect(matches(`${pathToFileURL(currentPath).href}?version=1`, currentPath)).toBe(false);
      expect(matches(`${pathToFileURL(currentPath).href}#selection`, currentPath)).toBe(false);
      expect(matches("file://user:password@server/share/source.ts", currentPath)).toBe(false);
      expect(matches("file://server:8080/share/source.ts", currentPath)).toBe(false);
      expect(matches("file://server/share/source.ts", currentPath)).toBe(false);
      expect(matches("file:///malformed/%ZZ/source.ts", currentPath)).toBe(false);
      const canonicalUri = pathToFileURL(currentPath).href;
      expect(matches(canonicalUri.replace(/\/source\.ts$/u, "%2Fsource.ts"), currentPath)).toBe(false);
      expect(matches(canonicalUri.replace(/\/source\.ts$/u, "%5Csource.ts"), currentPath)).toBe(false);

      const targetDirectory = join(root, "target");
      const aliasDirectory = join(root, "alias");
      const targetFile = join(targetDirectory, "source.ts");
      mkdirSync(targetDirectory, { recursive: true });
      writeFileSync(targetFile, "export const value = 1;\n");
      symlinkSync(targetDirectory, aliasDirectory, process.platform === "win32" ? "junction" : "dir");
      const aliasFile = join(aliasDirectory, "source.ts");
      expect(realpathSync(aliasFile)).toBe(realpathSync(targetFile));
      expect(matches(pathToFileURL(aliasFile).href, targetFile)).toBe(false);
    } finally {
      assertContractTempPath(root);
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("projects exact package-origin facts into strict opened-witness facts", async () => {
    const runner = await import(pathToFileURL(runnerPath).href);
    const fixture = JSON.parse(readFileSync(committedFixturePath, "utf8"));
    const rows = fixture.witnesses.packageOrigins.rows as readonly Record<string, unknown>[];
    const facts = rows.map((row, index) => ({
      identityKey: row.identityKey,
      relativePath: row.relativePath,
      originKind: row.originKind,
      packageName: row.packageName,
      start: (row.publicName as { start: number; end: number }).start,
      end: (row.publicName as { start: number; end: number }).end,
      opened: {
        eventOrdinal: index + 1,
        observationId: `resource-navigation:${index + 1}`,
        phase: "opened",
      },
    }));
    const project = runner.packageOriginOpenedWitnessFact;
    const projectedKeys = ["end", "identityKey", "opened", "relativePath", "start"];
    const runnerSource = readFileSync(runnerPath, "utf8");
    const genericStart = runnerSource.indexOf("function validateOpenedWitnessFact(");
    const genericEnd = runnerSource.indexOf(
      "function validateOpenedEventLocation(",
      genericStart,
    );
    expect(genericStart).toBeGreaterThanOrEqual(0);
    expect(genericEnd).toBeGreaterThan(genericStart);
    const genericSource = runnerSource.slice(genericStart, genericEnd);
    expect(genericSource).toContain(
      `const fact = exactObject(factValue, [
    "identityKey",
    "relativePath",
    "start",
    "end",
    "opened",
  ], label);`,
    );
    expect(genericSource).not.toContain("originKind");
    expect(genericSource).not.toContain("packageName");

    const factsStart = runnerSource.indexOf("export function validateFactsReceipt(");
    const factsEnd = runnerSource.indexOf("function exactLaneFactObject(", factsStart);
    const factsSource = runnerSource.slice(factsStart, factsEnd);
    const navigationIndex = factsSource.indexOf("validateNavigationFacts(");
    const cancellationIndex = factsSource.indexOf("validateCancellationFacts(");
    const conservationIndex = factsSource.indexOf("validateFactConservation(");
    expect(navigationIndex).toBeGreaterThanOrEqual(0);
    expect(cancellationIndex).toBeGreaterThan(navigationIndex);
    expect(conservationIndex).toBeGreaterThan(cancellationIndex);

    for (const [index, fact] of facts.entries()) {
      const projected = project(fact, rows[index], `packageOrigins[${index}]`);
      expect(projected).toEqual({
        identityKey: fact.identityKey,
        relativePath: fact.relativePath,
        start: fact.start,
        end: fact.end,
        opened: fact.opened,
      });
      expect(Object.keys(projected).sort()).toEqual(projectedKeys);
      expect(Object.isFrozen(projected)).toBe(true);
    }

    const installed = facts[0];
    const installedWitness = rows[0];
    const linked = facts[1];
    const projectFact = facts[2];
    const without = (value: Record<string, unknown>, field: string) => Object.fromEntries(
      Object.entries(value).filter(([key]) => key !== field),
    );
    expect(() => project(without(installed, "originKind"), installedWitness, "installed"))
      .toThrow(/fields must be exactly/u);
    expect(() => project(without(installed, "packageName"), installedWitness, "installed"))
      .toThrow(/fields must be exactly/u);
    expect(() => project({ ...installed, padding: true }, installedWitness, "installed"))
      .toThrow(/fields must be exactly/u);
    expect(() => project({ ...installed, originKind: "project" }, installedWitness, "installed"))
      .toThrow(/installed\.originKind/u);
    expect(() => project({ ...installed, packageName: "@acme/wrong" }, installedWitness, "installed"))
      .toThrow(/installed\.packageName/u);
    expect(() => project({ ...installed, packageName: null }, installedWitness, "installed"))
      .toThrow(/installed\.packageName/u);
    expect(() => project({ ...projectFact, packageName: "@acme/project" }, rows[2], "project"))
      .toThrow(/project\.packageName/u);
    expect(() => project(installed, rows[1], "swapped-witness"))
      .toThrow(/swapped-witness\.identityKey/u);
    expect(() => project({ ...installed, identityKey: linked.identityKey }, installedWitness, "identity"))
      .toThrow(/identity\.identityKey/u);
    expect(() => project({ ...installed, relativePath: linked.relativePath }, installedWitness, "path"))
      .toThrow(/path\.relativePath/u);
    expect(() => project({ ...installed, start: Number(installed.start) + 1 }, installedWitness, "start"))
      .toThrow(/start\.start/u);
    expect(() => project({ ...installed, end: Number(installed.end) - 1 }, installedWitness, "end"))
      .toThrow(/end\.end/u);
  });

  test("authenticates canonical same-world restart fingerprint progression", async () => {
    const runner = await import(pathToFileURL(runnerPath).href);
    const sessionIdentity = "8dd64564-76fb-4950-b783-eb1715e5a0d2";
    const alternateSessionIdentity = "9dd64564-76fb-4950-b783-eb1715e5a0d2";
    const sourceWorldRevision =
      "semantic-source-world/1:g1Isnfi3oLhqD6pZ1oqa1bVbOSOuA4vG3z8ucoJpcTg";
    const alternateSourceWorldRevision =
      "semantic-source-world/1:g1Isnfi3oLhqD6pZ1oqa1bVbOSOuA4vG3z8ucoJpcTk";
    type CanonicalInteger = string | number | bigint;
    const fingerprint = (
      requestEpoch: CanonicalInteger,
      authority: {
        readonly sessionIdentity?: string;
        readonly workspaceGeneration?: CanonicalInteger;
        readonly sourceWorldRevision?: string;
      } = {},
    ): string => `semantic-runtime:${authority.sessionIdentity ?? sessionIdentity}`
      + `:workspace-${authority.workspaceGeneration ?? 1}`
      + `:source-world-${authority.sourceWorldRevision ?? sourceWorldRevision}`
      + `:request-${requestEpoch}`;
    const validate = (
      epochs: readonly [CanonicalInteger, CanonicalInteger, CanonicalInteger, CanonicalInteger],
    ) =>
      runner.validateRaceRestartFingerprintSequence(
        fingerprint(epochs[0]),
        fingerprint(epochs[1]),
        fingerprint(epochs[2]),
        fingerprint(epochs[3]),
        "restart",
      );

    const parsed = runner.parseSemanticRuntimeFingerprint(fingerprint(17), "parsed");
    expect(parsed).toEqual({
      sessionIdentity,
      workspaceGeneration: 1n,
      sourceWorldRevision,
      requestEpoch: 17n,
    });
    expect(Object.isFrozen(parsed)).toBe(true);
    expect(runner.parseSemanticRuntimeFingerprint(fingerprint(0), "epoch zero").requestEpoch)
      .toBe(0n);
    const hugeInteger = 900719925474099212345678901234567890n;
    const hugeWorkspace = runner.parseSemanticRuntimeFingerprint(
      fingerprint(hugeInteger, { workspaceGeneration: hugeInteger }),
      "huge workspace and request",
    );
    expect(hugeWorkspace.workspaceGeneration).toBe(hugeInteger);
    expect(hugeWorkspace.requestEpoch).toBe(hugeInteger);
    for (const epochs of [
      [29, 30, 30, 30],
      [30, 31, 31, 31],
      [17, 18, 19, 19],
      [20, 21, 21, 22],
    ] as const) {
      expect(() => validate(epochs)).not.toThrow();
    }
    expect(() => validate([17, 17, 17, 17]))
      .toThrow(/navigationCurrent request epoch must be strictly newer/u);
    expect(() => validate([17, 19, 18, 19]))
      .toThrow(/retiredReproof request epoch must not regress/u);
    expect(() => validate([17, 18, 19, 18]))
      .toThrow(/restartedCurrent request epoch must not regress/u);
    expect(() => validate([
      hugeInteger,
      hugeInteger + 1n,
      hugeInteger + 1n,
      hugeInteger + 2n,
    ])).not.toThrow();
    expect(() => validate([
      hugeInteger,
      hugeInteger + 2n,
      hugeInteger + 1n,
      hugeInteger + 2n,
    ])).toThrow(/retiredReproof request epoch must not regress/u);

    const epochs = [17, 18, 19, 19] as const;
    const authorityDrifts = [
      { sessionIdentity: alternateSessionIdentity },
      { workspaceGeneration: 2 },
      { sourceWorldRevision: alternateSourceWorldRevision },
    ] as const;
    for (const authority of authorityDrifts) {
      for (const index of [1, 2, 3] as const) {
        const sequence = epochs.map((epoch) => fingerprint(epoch));
        sequence[index] = fingerprint(epochs[index], authority);
        expect(() => runner.validateRaceRestartFingerprintSequence(
          sequence[0],
          sequence[1],
          sequence[2],
          sequence[3],
          `authority drift ${index}`,
        )).toThrow(/durable authority/u);
      }
    }

    const malformed: readonly unknown[] = [
      null,
      undefined,
      1,
      "",
      fingerprint("one"),
      fingerprint(""),
      fingerprint("01"),
      fingerprint("-1"),
      fingerprint("+1"),
      fingerprint("1.0"),
      fingerprint("1e1"),
      fingerprint("١"),
      fingerprint("１"),
      `${fingerprint(1)}suffix`,
      fingerprint(1).replace(/:request-1$/u, ""),
      fingerprint(1).replace(/:request-1$/u, ":request-1:request-2"),
      fingerprint(1).replace(/^semantic-runtime:/u, "semanticRuntime:"),
      ` ${fingerprint(1)}`,
      `${fingerprint(1)} `,
      `${fingerprint(1)}\t`,
      `${fingerprint(1)}\n`,
      `${fingerprint(1)}\r\n`,
    ];
    for (const [index, value] of malformed.entries()) {
      expect(() => runner.parseSemanticRuntimeFingerprint(value, `malformed[${index}]`))
        .toThrow(/nonempty string|canonical semantic-runtime fingerprint/u);
    }
    for (const workspaceGeneration of ["", "01", "-1", "+1", "1.0", "1e1", "١", "１"]) {
      expect(() => runner.parseSemanticRuntimeFingerprint(
        fingerprint(1, { workspaceGeneration }),
        `workspace ${workspaceGeneration}`,
      )).toThrow(/canonical semantic-runtime fingerprint/u);
    }
    for (const [label, value] of [
      ["uppercase UUID", fingerprint(1, { sessionIdentity: sessionIdentity.toUpperCase() })],
      ["wrong UUID version", fingerprint(1, { sessionIdentity: sessionIdentity.replace("-4", "-5") })],
      ["wrong UUID variant", fingerprint(1, { sessionIdentity: sessionIdentity.replace("-b", "-7") })],
      ["wrong source-world marker", fingerprint(1).replace(":source-world-", ":sourceWorld-")],
      ["wrong source-world version", fingerprint(1, {
        sourceWorldRevision: sourceWorldRevision.replace("/1:", "/2:"),
      })],
      ["short digest", fingerprint(1, { sourceWorldRevision: sourceWorldRevision.slice(0, -1) })],
      ["long digest", fingerprint(1, { sourceWorldRevision: `${sourceWorldRevision}A` })],
      ["plus in digest", fingerprint(1, {
        sourceWorldRevision: sourceWorldRevision.replace(/.$/u, "+"),
      })],
      ["slash in digest", fingerprint(1, {
        sourceWorldRevision: sourceWorldRevision.replace(/.$/u, "/"),
      })],
      ["padding in digest", fingerprint(1, {
        sourceWorldRevision: sourceWorldRevision.replace(/.$/u, "="),
      })],
      ["noncanonical digest tail", fingerprint(1, {
        sourceWorldRevision: sourceWorldRevision.replace(/.$/u, "h"),
      })],
    ] as const) {
      expect(() => runner.parseSemanticRuntimeFingerprint(value, label))
        .toThrow(/canonical semantic-runtime fingerprint/u);
    }
  });

  test("uses monotone fingerprints only across restart request boundaries", () => {
    const runnerSource = readFileSync(runnerPath, "utf8");
    const restartStart = runnerSource.indexOf("function validateRaceRestartFact(");
    const restartEnd = runnerSource.indexOf(
      "function validateCurrentAvailabilityModelItems(",
      restartStart,
    );
    expect(restartStart).toBeGreaterThanOrEqual(0);
    expect(restartEnd).toBeGreaterThan(restartStart);
    const restartSource = runnerSource.slice(restartStart, restartEnd);
    expect(restartSource.match(/validateRaceRestartFingerprintSequence\(/gu) ?? [])
      .toHaveLength(1);
    expect(restartSource).toContain(`validateRaceRestartFingerprintSequence(
    freshAvailable.event.fingerprint,
    snapshotRefused.event.currentFingerprint,
    retiredScopeResponse.event.fingerprint,
    currentResponse.event.fingerprint,`);
    expect(restartSource).toContain(`snapshotRefused.event.requestedFingerprint,
    freshAvailable.event.fingerprint,`);
    expect(restartSource).toContain(
      "requireEqual(staleRetry.event.currentFingerprint, snapshotRefused.event.currentFingerprint",
    );
    expect(restartSource).toContain(
      "requireEqual(revalidated.event.fingerprint, retiredScopeResponse.event.fingerprint",
    );
    expect(restartSource).not.toContain(
      "snapshotRefused.event.currentFingerprint === freshAvailable.event.fingerprint",
    );
    expect(restartSource).not.toContain(`retiredScopeResponse.event.fingerprint,
    snapshotRefused.event.currentFingerprint,`);
    expect(restartSource).not.toContain(
      "requireEqual(currentResponse.event.fingerprint, retiredScopeResponse.event.fingerprint",
    );
  });

  test("plans three fresh Worker processes on current stable by default", () => {
    const plan = readPlan();
    expect(plan).toMatchObject({
      transport: "worker",
      version: "stable",
      versionLane: "current-stable",
      minimumVSCodeVersion: "1.91.0",
      shards: [
        "worker-lifecycle",
        "rename-reliability",
        "product-support",
      ],
      launchCount: 3,
    });
    expect(plan.launches.map((launch) => launch.shard)).toEqual(plan.shards);
    expect(plan.launches.map((launch) => normalize(launch.disposableRoot))).toEqual([
      "current-stable/worker/worker-lifecycle",
      "current-stable/worker/rename-reliability",
      "current-stable/worker/product-support",
    ]);
    expect(plan.launches.map((launch) => launch.productSupportAcceptance.enabled))
      .toEqual([false, false, true]);
    expect(plan.launches[2]?.productSupportAcceptance).toMatchObject({
      authoritative: true,
      requiresBuiltStaticContract: true,
      sourceManifestPresent: true,
    });
  });

  test("keeps forced IPC as a focused product/support control", () => {
    const plan = readPlan("--ipc");
    expect(plan).toEqual(expect.objectContaining({
      transport: "ipc",
      version: "stable",
      shards: ["product-support"],
      launchCount: 1,
    }));
    expect(normalize(plan.launches[0]?.disposableRoot ?? ""))
      .toBe("current-stable/ipc/product-support");
    expect(plan.launches[0]?.productSupportAcceptance.authoritative).toBe(false);
  });

  test("selects the exact minimum and individual Worker shards explicitly", () => {
    const plan = readPlan("--worker", "--minimum", "--shard=rename-reliability");
    expect(plan).toEqual(expect.objectContaining({
        transport: "worker",
        version: "1.91.0",
        versionLane: "minimum",
        shards: ["rename-reliability"],
        launchCount: 1,
      }));
    expect(normalize(plan.launches[0]?.disposableRoot ?? ""))
      .toBe("minimum/worker/rename-reliability");
  });

  test("rejects ambiguous, unknown, and over-broad IPC requests", () => {
    expect(readFailure("--worker", "--ipc")).toContain("transport may only be selected once");
    expect(readFailure("--shard=unknown")).toContain("Unknown Extension Host shard");
    expect(readFailure("--ipc", "--minimum")).toContain("current-stable control lane");
    expect(readFailure("--ipc", "--shard=rename-reliability"))
      .toContain("may only run the product-support shard");
  });

  test("rejects a minimum download that does not resolve exactly to 1.91.0", () => {
    expect(readMinimumResolutionFailure()).toContain(
      "minimum Extension Host lane resolved 1.92.0; expected exactly 1.91.0",
    );
  });

  test("resolves once and serially launches three isolated authenticated processes", () => {
    const probe = readExecutionProbe();

    expect(probe.downloadCount).toBe(1);
    expect(probe.maxConcurrentLaunches).toBe(1);
    expect(probe.preparedShards).toEqual([
      "worker-lifecycle",
      "rename-reliability",
      "product-support",
    ]);
    expect(probe.launches.map((launch) => launch.shard)).toEqual(probe.preparedShards);
    expect(new Set(probe.launches.map((launch) => launch.testWorkspace)).size).toBe(3);
    expect(new Set(probe.launches.map((launch) => launch.userDataArgument)).size).toBe(3);
    expect(probe.preparedLanes).toEqual([
      "current-stable/worker",
      "current-stable/worker",
      "current-stable/worker",
    ]);
    expect(probe.launches.every((launch) => (
      launch.expectedActualVersion === "1.123.4"
        && launch.expectedTransport === "worker"
    ))).toBe(true);
    expect(probe.launches.map((launch) => [launch.shard, launch.tailObservation])).toEqual([
      ["worker-lifecycle", null],
      ["rename-reliability", null],
      ["product-support", "1"],
    ]);
    expect(probe.launches.map((launch) => [launch.shard, launch.routedWorkspace])).toEqual([
      ["worker-lifecycle", null],
      ["rename-reliability", null],
      ["product-support", "/mock/product-support/routed"],
    ]);
    expect(probe.launches.map((launch) => [launch.shard, launch.acceptance])).toEqual([
      ["worker-lifecycle", null],
      ["rename-reliability", null],
      ["product-support", "1"],
    ]);
    expect(probe.launches[2]).toMatchObject({
      descriptor: "/mock/product-support/routed/semantic-workspace.json",
      fixtureManifest: "/mock/product-support/routed/fixture-manifest.json",
      ledger: "/mock/product-support/routed/resource-discovery.observations.jsonl",
      report: "/mock/product-support/routed/resource-discovery.acceptance.json",
    });
    expect(probe.launches.slice(0, 2).every((launch) => (
      launch.descriptor == null
        && launch.fixtureManifest == null
        && launch.ledger == null
        && launch.report == null
    ))).toBe(true);
    expect(probe.launches.map((launch) => launch.resourceDiscoveryEnvironmentNames)).toEqual([
      [],
      [],
      [
        "AURELIA_LS_RESOURCE_DISCOVERY_HOST_ACCEPTANCE",
        "AURELIA_LS_RESOURCE_DISCOVERY_HOST_DESCRIPTOR",
        "AURELIA_LS_RESOURCE_DISCOVERY_HOST_FIXTURE_MANIFEST",
        "AURELIA_LS_RESOURCE_DISCOVERY_HOST_LEDGER",
        "AURELIA_LS_RESOURCE_DISCOVERY_HOST_REPORT",
      ],
    ]);
    expect(probe.authenticatedShards).toEqual(["product-support"]);
  });

  test("hashes the exact built product contract with canonical framing and rejects symlinks", () => {
    const root = join(contractTempRoot, randomUUID());
    try {
      writeContractFiles(root, {
        "package.json": "{\"name\":\"fixture\"}\n",
        "dist/extension.cjs": "module.exports = 'extension';\n",
        "dist/server/main.cjs": "module.exports = 'server';\n",
      });
      const baseline = readStaticContractHash(root);
      expect(baseline).toMatch(/^[a-f0-9]{64}$/u);
      expect(baseline).toBe(expectedStaticContractHash(root));

      writeFileSync(join(root, "dist", "server", "main.cjs"), "module.exports = 'changed';\n");
      expect(readStaticContractHash(root)).not.toBe(baseline);

      const ancestorRoot = join(root, "ancestor-contract");
      writeContractFiles(ancestorRoot, {
        "package.json": "{\"name\":\"ancestor\"}\n",
        "dist/extension.cjs": "module.exports = 'extension';\n",
        "dist/server/main.cjs": "module.exports = 'server';\n",
      });
      const realDist = join(ancestorRoot, "dist-real");
      renameSync(join(ancestorRoot, "dist"), realDist);
      symlinkSync(realDist, join(ancestorRoot, "dist"), "junction");
      expect(readStaticContractFailure(ancestorRoot)).toContain("symbolic or non-directory ancestor");

      rmSync(join(root, "dist", "extension.cjs"));
      symlinkSync(
        join(root, "dist", "server"),
        join(root, "dist", "extension.cjs"),
        "junction",
      );
      expect(readStaticContractFailure(root)).toContain("regular non-symbolic file");
    } finally {
      assertContractTempPath(root);
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("recomputes the static contract after a product-support launch", async () => {
    const root = join(contractTempRoot, randomUUID());
    try {
      writeContractFiles(root, {
        "package.json": "{\"name\":\"fixture\"}\n",
        "dist/extension.cjs": "module.exports = 'extension';\n",
        "dist/server/main.cjs": "module.exports = 'server';\n",
      });
      const runner = await import(pathToFileURL(runnerPath).href);
      const contract = await import(pathToFileURL(staticContractPath).href);
      const plan = runner.parseRunnerArguments([
        "--worker",
        "--current-stable",
        "--shard=product-support",
      ]);
      await expect(runner.runExtensionHostTests(plan, {
        electron: {
          ProgressReportStage: { ResolvedVersion: "resolvedVersion" },
          makeConsoleReporter: async () => ({ error() {}, report() {} }),
          downloadAndUnzipVSCode: async ({ reporter }: { reporter: { report(value: unknown): void } }) => {
            reporter.report({ stage: "resolvedVersion", version: "1.123.4" });
            return "mock-vscode";
          },
          runTests: async () => {
            writeFileSync(join(root, "dist", "server", "main.cjs"), "module.exports = 'mutated';\n");
          },
        },
        staticContractHasher: () => contract.extensionHostStaticContractSha256(root),
        authenticateReport: () => { throw new Error("report authentication must not run"); },
        prepareWorkspace: () => mockProductSupportWorkspace(root),
      })).rejects.toThrow(/static contract changed during launch/u);
    } finally {
      assertContractTempPath(root);
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("fails plan validation closed on generator and exact witness drift", async () => {
    const root = join(contractTempRoot, randomUUID());
    try {
      mkdirSync(root, { recursive: true });
      const runner = await import(pathToFileURL(runnerPath).href);
      expect(() => runner.validateResourceDiscoveryPlanInputs({ generators: {} }))
        .toThrow(/No Resource Discovery generator is registered/u);

      const baseline = JSON.parse(readFileSync(committedFixturePath, "utf8"));
      const cases: readonly [string, (manifest: MutableFixtureManifest) => void, RegExp][] = [
        ["unknown-generator", (manifest) => { manifest.generatedInputs[0].id = "unknown-generator"; }, /No Resource Discovery generator is registered/u],
        ["empty-lanes", (manifest) => { manifest.generatedInputs[0].lanes = []; }, /lanes must not be empty/u],
        ["missing-witness", (manifest) => { delete manifest.witnesses.openCoverage; }, /witnesses fields must be exactly/u],
        ["unknown-witness", (manifest) => { manifest.witnesses.unknown = {}; }, /witnesses fields must be exactly/u],
        ["nested-witness-field", (manifest) => {
          (manifest.witnesses.openCoverage?.availability as Record<string, unknown>).unknown = true;
        }, /fields must be exactly/u],
        ["ambiguity-row-count", (manifest) => {
          ambiguityScope(manifest, 0, 0).rowCount = 35;
        }, /projectTemplateAmbiguity\.projects\[0\]\.scopes\[0\]\.rowCount/u],
        ["ambiguity-selectable-count", (manifest) => {
          ambiguityScope(manifest, 0, 0).selectableRowCount = 2;
        }, /projectTemplateAmbiguity\.projects\[0\]\.scopes\[0\]\.selectableRowCount/u],
        ["ambiguity-unavailable-reason", (manifest) => {
          ambiguityScope(manifest, 0, 0).navigationUnavailableReason = "self-attested";
        }, /navigationUnavailableReason/u],
        ["ambiguity-unavailable-boundary", (manifest) => {
          ambiguityScope(manifest, 0, 0).navigationUnavailableIdentityKeys.pop();
        }, /navigationUnavailableIdentityKeys count/u],
        ["ambiguity-selectable-identity", (manifest) => {
          ambiguityScope(manifest, 0, 0).resourceIdentityKeys[0] =
            "typescript-resource:v1:not-the-admitted-resource";
        }, /selectable identity partition/u],
      ];
      for (const [name, mutate, expected] of cases) {
        const manifest = structuredClone(baseline) as MutableFixtureManifest;
        mutate(manifest);
        const manifestPath = join(root, `${name}.json`);
        writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
        expect(() => runner.validateResourceDiscoveryPlanInputs({ sourceManifestPath: manifestPath }))
          .toThrow(expected);
      }

      const witnessDrift = structuredClone(baseline) as MutableFixtureManifest;
      (witnessDrift.witnesses.projectTemplateAmbiguity?.source as Record<string, unknown>).sha256 =
        "0".repeat(64);
      const witnessDriftPath = join(root, "witness-byte-drift.json");
      writeFileSync(witnessDriftPath, `${JSON.stringify(witnessDrift, null, 2)}\n`);
      expect(() => runner.validateResourceDiscoveryPlanInputs({
        sourceManifestPath: witnessDriftPath,
        lane: {
          transport: "worker",
          version: "1.91.0",
          versionLane: "minimum",
          resolvedVersion: "1.91.0",
        },
      })).toThrow(/projectTemplateAmbiguity source sha256/u);

      const commonGenerator = runner.resourceDiscoveryGeneratedInputWriters["long-suffix-duplicates"];
      expect(() => runner.validateResourceDiscoveryPlanInputs({
        generators: {
          ...runner.resourceDiscoveryGeneratedInputWriters,
          "long-suffix-duplicates": (context: { lane: { versionLane: string } }) => {
            if (context.lane.versionLane === "minimum") {
              throw new Error("minimum common generator was invoked");
            }
            return commonGenerator(context);
          },
        },
        lane: {
          transport: "worker",
          version: "1.91.0",
          versionLane: "minimum",
          resolvedVersion: "1.91.0",
        },
      })).toThrow(/minimum common generator was invoked/u);

      expect(() => runner.validateResourceDiscoveryPlanInputs({
        generators: {
          ...runner.resourceDiscoveryGeneratedInputWriters,
          "long-suffix-duplicates": (context: {
            write(relativePath: string, content: string): void;
          }) => commonGenerator({
            ...context,
            write(relativePath: string, content: string) {
              context.write(
                relativePath,
                relativePath === "src/main.ts" ? `${content}// generated drift\n` : content,
              );
            },
          }),
        },
        lane: {
          transport: "worker",
          version: "1.91.0",
          versionLane: "minimum",
          resolvedVersion: "1.91.0",
        },
      })).toThrow(/availabilityRace\.template\.(?:size|sha256)/u);
    } finally {
      assertContractTempPath(root);
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("rejects symbolic disposable ancestors without touching their external targets", async () => {
    const runner = await import(pathToFileURL(runnerPath).href);
    const componentIndexes = [0, 1, 2, 3, 4];
    for (const componentIndex of componentIndexes) {
      const root = join(contractTempRoot, randomUUID());
      const externalRoot = join(root, "external-target");
      const sentinel = join(externalRoot, "sentinel.txt");
      const disposableBase = join(root, "disposable-container");
      const components = [
        disposableBase,
        join(disposableBase, "current-stable"),
        join(disposableBase, "current-stable", "worker"),
        join(disposableBase, "current-stable", "worker", "product-support"),
        join(
          disposableBase,
          "current-stable",
          "worker",
          "product-support",
          "routed-catalog-storefront",
        ),
      ];
      const symbolicComponent = components[componentIndex];
      try {
        mkdirSync(externalRoot, { recursive: true });
        writeFileSync(sentinel, `sentinel-${componentIndex}\n`);
        mkdirSync(dirname(symbolicComponent), { recursive: true });
        symlinkSync(
          externalRoot,
          symbolicComponent,
          process.platform === "win32" ? "junction" : "dir",
        );
        const shardRoot = components[3];
        const workspaceRoot = components[4];
        expect(() => runner.materializeResourceDiscoveryHostWorkspace({
          lane: {
            transport: "worker",
            version: "stable",
            versionLane: "current-stable",
            resolvedVersion: "1.123.4",
          },
          shardRoot,
          workspaceRoot,
        })).toThrow(/symbolic disposable path component/u);
        expect(readFileSync(sentinel, "utf8")).toBe(`sentinel-${componentIndex}\n`);
        expect(readdirSync(externalRoot)).toEqual(["sentinel.txt"]);
      } finally {
        try {
          unlinkSync(symbolicComponent);
        } catch (error) {
          if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
        }
        assertContractTempPath(root);
        rmSync(root, { recursive: true, force: true });
      }
    }
  });

  test("removes ordinary disposable trees without following approved symbolic leaves", async () => {
    const root = join(contractTempRoot, randomUUID());
    try {
      const runner = await import(pathToFileURL(runnerPath).href);
      const cleanupRoot = join(root, "cleanup-root");
      const externalRoot = join(root, "external-target");
      const sentinel = join(externalRoot, "sentinel.txt");
      mkdirSync(join(cleanupRoot, "ordinary"), { recursive: true });
      mkdirSync(externalRoot, { recursive: true });
      writeFileSync(join(cleanupRoot, "ordinary", "fixture.txt"), "fixture\n");
      writeFileSync(sentinel, "preserve me\n");
      symlinkSync(
        externalRoot,
        join(cleanupRoot, "approved-link"),
        process.platform === "win32" ? "junction" : "dir",
      );
      runner.removeDisposableTreeSafely(cleanupRoot, {
        allowedSymbolicLeaves: ["approved-link"],
      });
      expect(readFileSync(sentinel, "utf8")).toBe("preserve me\n");
      expect(readdirSync(root)).toEqual(["external-target"]);
    } finally {
      assertContractTempPath(root);
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("materializes a sealed composite fixture and normalized explicit descriptor", async () => {
    const root = join(contractTempRoot, randomUUID());
    try {
      const setup = writeSyntheticFixture(root);
      const runner = await import(pathToFileURL(runnerPath).href);
      const evidence = runner.materializeResourceDiscoveryHostWorkspace({
        lane: {
          transport: "worker",
          version: "1.91.0",
          versionLane: "minimum",
          resolvedVersion: "1.91.0",
        },
        shardRoot: setup.shardRoot,
        workspaceRoot: setup.workspaceRoot,
        sourceManifestPath: setup.sourceManifestPath,
        sourceFixturesRoot: setup.sourceFixturesRoot,
        manifestValidator: () => {},
        witnessAuthenticator: () => {},
      });

      const descriptor = JSON.parse(readFileSync(evidence.descriptor, "utf8"));
      const rendered = JSON.parse(readFileSync(evidence.fixtureManifest, "utf8"));
      expect(descriptor).toMatchObject({
        schemaVersion: "semantic-workspace/1",
        workspaceRoot: resolve(setup.workspaceRoot),
        excludedWorkspaceRoots: [],
        projectTopology: {
          kind: "explicit",
          projects: [{
            projectKey: "host-alpha",
            rootDir: resolve(setup.workspaceRoot),
            sourceInput: {
              kind: "supplied",
              files: [
                { path: join(resolve(setup.workspaceRoot), "package.json") },
                { path: join(resolve(setup.workspaceRoot), "src", "app.ts") },
                { path: join(resolve(setup.workspaceRoot), "tsconfig.json") },
              ],
            },
          }],
        },
      });
      expect(rendered).toMatchObject({
        schemaVersion: "aurelia-resource-discovery-host-fixture-rendered/1",
        lane: "minimum",
        transport: "worker",
        workspaceRoot: resolve(setup.workspaceRoot),
        descriptorRelativePath: "semantic-workspace.json",
        links: [],
      });
      expect(rendered.files.map((file: { relativePath: string }) => file.relativePath)).toEqual([
        "package.json",
        "src/app.ts",
        "tsconfig.json",
      ]);
      expect(rendered.files.every((file: { sha256: string }) => /^[a-f0-9]{64}$/u.test(file.sha256)))
        .toBe(true);
      expect(rendered.sourceManifestSha256).toBe(sha256File(setup.sourceManifestPath));
      expect(rendered.descriptorSha256).toBe(sha256File(evidence.descriptor));
      expect(readFileSync(evidence.fixtureManifest, "utf8")).not.toContain("semantic-fixture.json");
    } finally {
      assertContractTempPath(root);
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("renders the exact discovered-source guardrail branch and rejects mixed project fields", async () => {
    const root = join(contractTempRoot, randomUUID());
    try {
      const setup = writeSyntheticFixture(root);
      writeContractFiles(join(setup.sourceFixturesRoot, "guardrail-pressure"), {
        "src/a-main.ts": "export const admitted = true;\n",
        "src/z-over-limit.ts": "export const truncated = true;\n",
      });
      const sourceManifest = JSON.parse(readFileSync(setup.sourceManifestPath, "utf8"));
      sourceManifest.copyInputs.push({
        sourceFixture: "guardrail-pressure",
        include: ["src/**"],
        destination: "host-corpus/guardrail",
      });
      sourceManifest.projects.push({
        projectKey: "host-guardrail",
        relativeRoot: "host-corpus/guardrail",
        sourceInput: "discover",
        sourceDiscoveryOptions: { extensions: [".ts"], maxFiles: 1 },
        excludedRelativeRoots: [],
      });
      sourceManifest.witnesses.guardrail = {
        admission: "required",
        result: "answered",
        coverage: "truncated",
      };
      writeFileSync(setup.sourceManifestPath, `${JSON.stringify(sourceManifest, null, 2)}\n`);

      const runner = await import(pathToFileURL(runnerPath).href);
      const evidence = runner.materializeResourceDiscoveryHostWorkspace({
        lane: {
          transport: "worker",
          version: "1.91.0",
          versionLane: "minimum",
          resolvedVersion: "1.91.0",
        },
        shardRoot: setup.shardRoot,
        workspaceRoot: setup.workspaceRoot,
        sourceManifestPath: setup.sourceManifestPath,
        sourceFixturesRoot: setup.sourceFixturesRoot,
        manifestValidator: () => {},
        witnessAuthenticator: () => {},
      });
      const descriptor = JSON.parse(readFileSync(evidence.descriptor, "utf8"));
      expect(descriptor.projectTopology.projects[1]).toMatchObject({
        projectKey: "host-guardrail",
        sourceInput: {
          kind: "discover",
          options: {
            extensions: [".ts"],
            excludedDirectories: null,
            maxFiles: 1,
          },
        },
      });

      const mixedRoot = join(root, "mixed-case");
      const mixed = writeSyntheticFixture(mixedRoot);
      const mixedManifest = JSON.parse(readFileSync(mixed.sourceManifestPath, "utf8"));
      mixedManifest.projects[0].sourceDiscoveryOptions = { extensions: [".ts"], maxFiles: 1 };
      writeFileSync(mixed.sourceManifestPath, `${JSON.stringify(mixedManifest, null, 2)}\n`);
      expect(() => runner.materializeResourceDiscoveryHostWorkspace({
        lane: {
          transport: "worker",
          version: "1.91.0",
          versionLane: "minimum",
          resolvedVersion: "1.91.0",
        },
        shardRoot: mixed.shardRoot,
        workspaceRoot: mixed.workspaceRoot,
        sourceManifestPath: mixed.sourceManifestPath,
        sourceFixturesRoot: mixed.sourceFixturesRoot,
        witnessAuthenticator: () => {},
      })).toThrow(/fields must be exactly/u);
    } finally {
      assertContractTempPath(root);
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("rejects unregistered generators and symbolic source-fixture escapes", async () => {
    const root = join(contractTempRoot, randomUUID());
    try {
      const runner = await import(pathToFileURL(runnerPath).href);
      const unknown = writeSyntheticFixture(join(root, "unknown-generator"));
      const unknownManifest = JSON.parse(readFileSync(unknown.sourceManifestPath, "utf8"));
      unknownManifest.generatedInputs = [{
        id: "unproven-candidate",
        destination: "host-corpus/unproven",
        generatorVersion: "unproven/1",
        lanes: ["current-stable", "minimum"],
      }];
      writeFileSync(unknown.sourceManifestPath, `${JSON.stringify(unknownManifest, null, 2)}\n`);
      expect(() => runner.materializeResourceDiscoveryHostWorkspace({
        lane: {
          transport: "worker",
          version: "1.91.0",
          versionLane: "minimum",
          resolvedVersion: "1.91.0",
        },
        shardRoot: unknown.shardRoot,
        workspaceRoot: unknown.workspaceRoot,
        sourceManifestPath: unknown.sourceManifestPath,
        sourceFixturesRoot: unknown.sourceFixturesRoot,
        manifestValidator: () => {},
        witnessAuthenticator: () => {},
      })).toThrow(/No Resource Discovery generator is registered/u);

      const escaped = writeSyntheticFixture(join(root, "source-escape"));
      const sourceFixture = join(escaped.sourceFixturesRoot, "synthetic-pressure");
      const outsideFixture = join(root, "outside-fixture");
      writeContractFiles(outsideFixture, {
        "package.json": "{\"name\":\"escaped\"}\n",
        "src/app.ts": "export class Escaped {}\n",
        "tsconfig.json": "{}\n",
      });
      rmSync(sourceFixture, { recursive: true });
      symlinkSync(outsideFixture, sourceFixture, "junction");
      expect(() => runner.materializeResourceDiscoveryHostWorkspace({
        lane: {
          transport: "worker",
          version: "1.91.0",
          versionLane: "minimum",
          resolvedVersion: "1.91.0",
        },
        shardRoot: escaped.shardRoot,
        workspaceRoot: escaped.workspaceRoot,
        sourceManifestPath: escaped.sourceManifestPath,
        sourceFixturesRoot: escaped.sourceFixturesRoot,
        manifestValidator: () => {},
        witnessAuthenticator: () => {},
      })).toThrow(/non-symbolic directory/u);
    } finally {
      assertContractTempPath(root);
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("generates long-suffix and package-origin inputs with authenticated physical links", async () => {
    const root = join(contractTempRoot, randomUUID());
    try {
      const setup = writeSyntheticFixture(root);
      const sourceManifest = JSON.parse(readFileSync(setup.sourceManifestPath, "utf8"));
      sourceManifest.generatedInputs = [
        {
          id: "long-suffix-duplicates",
          destination: "host-corpus/long-scent",
          generatorVersion: "resource-discovery-long-suffix/1",
          lanes: ["current-stable", "minimum"],
        },
        {
          id: "package-origins",
          destination: "host-corpus/package-origin",
          generatorVersion: "resource-discovery-package-origins/1",
          lanes: ["current-stable"],
        },
        {
          id: "page-drain",
          destination: "host-corpus/page-drain",
          generatorVersion: "resource-discovery-page-drain/1",
          lanes: ["current-stable"],
        },
        {
          id: "guardrail",
          destination: "host-corpus/guardrail",
          generatorVersion: "resource-discovery-guardrail/1",
          lanes: ["current-stable", "minimum"],
        },
      ];
      sourceManifest.projects[0].relativeFiles = [
        "host-corpus/long-scent/left/shared/duplicate-card.ts",
        "host-corpus/long-scent/right/shared/duplicate-card.ts",
        "host-corpus/long-scent/src/main.ts",
        "host-corpus/package-origin/app/src/main.ts",
        "host-corpus/page-drain/src/main.ts",
        "package.json",
        "src/app.ts",
        "tsconfig.json",
      ].sort((left, right) => left.localeCompare(right));
      sourceManifest.projects[0].excludedRelativeRoots = [
        ".host-packages",
        "host-corpus/guardrail",
        "host-corpus/package-origin/app/node_modules",
      ];
      sourceManifest.projects.push({
        projectKey: "host-guardrail",
        relativeRoot: "host-corpus/guardrail",
        sourceInput: "discover",
        sourceDiscoveryOptions: { extensions: [".ts"], maxFiles: 1 },
        excludedRelativeRoots: [],
      });
      sourceManifest.witnesses.longSuffixDuplicates = { admission: "required", count: 2 };
      sourceManifest.witnesses.packageOrigins = { admission: "current-only", count: 3 };
      sourceManifest.witnesses.pageDrain = { admission: "current-only", rowCount: 604 };
      sourceManifest.witnesses.guardrail = { admission: "required", coverage: "truncated" };
      sourceManifest.lanePolicy.currentStableOnlyWitnesses = ["packageOrigins", "pageDrain"];
      writeFileSync(setup.sourceManifestPath, `${JSON.stringify(sourceManifest, null, 2)}\n`);

      const runner = await import(pathToFileURL(runnerPath).href);
      const evidence = runner.materializeResourceDiscoveryHostWorkspace({
        lane: {
          transport: "worker",
          version: "stable",
          versionLane: "current-stable",
          resolvedVersion: "1.123.4",
        },
        shardRoot: setup.shardRoot,
        workspaceRoot: setup.workspaceRoot,
        sourceManifestPath: setup.sourceManifestPath,
        sourceFixturesRoot: setup.sourceFixturesRoot,
        manifestValidator: () => {},
        witnessAuthenticator: () => {},
      });
      const rendered = JSON.parse(readFileSync(evidence.fixtureManifest, "utf8"));
      expect(rendered.links.map((link: { relativePath: string }) => link.relativePath)).toEqual([
        "host-corpus/package-origin/app/node_modules/@acme/linked-resource-kit",
        "host-corpus/package-origin/app/node_modules/@aurelia/runtime-html",
      ]);
      expect(rendered.links.every((link: { kind: string }) => (
        link.kind === (process.platform === "win32" ? "junction" : "directory-symbolic-link")
      ))).toBe(true);
      const frameworkLink = rendered.links.find((link: { relativePath: string }) => (
        link.relativePath.endsWith("/@aurelia/runtime-html")
      ));
      expect(frameworkLink.target.replaceAll("\\", "/"))
        .toContain("packages/semantic-runtime/node_modules/@aurelia/runtime-html");
      expect(frameworkLink.realPath.replaceAll("\\", "/"))
        .toContain("aurelia/packages/runtime-html");
      expect(realpathSync(join(
        setup.workspaceRoot,
        "host-corpus",
        "package-origin",
        "app",
        "node_modules",
        "@acme",
        "linked-resource-kit",
      ))).toBe(realpathSync(join(setup.workspaceRoot, ".host-packages", "linked-resource-kit")));
      expect(readFileSync(join(
        setup.workspaceRoot,
        "host-corpus",
        "long-scent",
        "left",
        "shared",
        "duplicate-card.ts",
      ), "utf8")).toContain("LeftLongSuffixDuplicateCard");
      expect(rendered.files.map((file: { relativePath: string }) => file.relativePath)).toContain(
        ".host-packages/linked-resource-kit/src/index.ts",
      );
      const pageDrainSource = readFileSync(join(
        setup.workspaceRoot,
        "host-corpus",
        "page-drain",
        "src",
        "main.ts",
      ), "utf8");
      expect(pageDrainSource.slice(75, 89)).toBe("page-drain-000");
      expect(pageDrainSource.slice(65_075, 65_089)).toBe("page-drain-500");
      expect(readFileSync(join(
        setup.workspaceRoot,
        "host-corpus",
        "guardrail",
        "src",
        "a-main.ts",
      ), "utf8")).toContain("Aurelia.app(GuardrailApp).start();");

      const minimumShardRoot = join(root, "minimum-filter", "minimum", "worker", "product-support");
      const minimumWorkspaceRoot = join(minimumShardRoot, "routed-catalog-storefront");
      const minimumEvidence = runner.materializeResourceDiscoveryHostWorkspace({
        lane: {
          transport: "worker",
          version: "1.91.0",
          versionLane: "minimum",
          resolvedVersion: "1.91.0",
        },
        shardRoot: minimumShardRoot,
        workspaceRoot: minimumWorkspaceRoot,
        sourceManifestPath: setup.sourceManifestPath,
        sourceFixturesRoot: setup.sourceFixturesRoot,
        manifestValidator: () => {},
        witnessAuthenticator: () => {},
      });
      const minimumDescriptor = JSON.parse(readFileSync(minimumEvidence.descriptor, "utf8"));
      const minimumSourcePaths = minimumDescriptor.projectTopology.projects[0].sourceInput.files
        .map((file: { path: string }) => file.path.replaceAll("\\", "/"));
      expect(minimumSourcePaths.some((path: string) => path.includes("/package-origin/"))).toBe(false);
      expect(minimumSourcePaths.some((path: string) => path.includes("/page-drain/"))).toBe(false);
      const minimumRendered = JSON.parse(readFileSync(minimumEvidence.fixtureManifest, "utf8"));
      expect(minimumRendered.files.some((file: { relativePath: string }) => (
        file.relativePath.startsWith("host-corpus/package-origin/")
          || file.relativePath.startsWith("host-corpus/page-drain/")
      ))).toBe(false);
      expect(minimumRendered.links).toEqual([]);
    } finally {
      assertContractTempPath(root);
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("materializes the frozen committed fixture in both authoritative Worker lanes", async () => {
    const root = join(contractTempRoot, randomUUID());
    try {
      const runner = await import(pathToFileURL(runnerPath).href);
      const sourceManifest = JSON.parse(readFileSync(committedFixturePath, "utf8"));
      expect(sourceManifest.generatedInputs).toEqual(expect.arrayContaining([
        expect.objectContaining({ id: "package-origins", lanes: ["current-stable"] }),
        expect.objectContaining({ id: "page-drain", lanes: ["current-stable"] }),
        expect.objectContaining({
          id: "long-suffix-duplicates",
          lanes: ["current-stable", "minimum"],
        }),
        expect.objectContaining({ id: "guardrail", lanes: ["current-stable", "minimum"] }),
        expect.objectContaining({ id: "open-coverage", lanes: ["current-stable", "minimum"] }),
      ]));

      const renderLane = (versionLane: "current-stable" | "minimum") => {
        const shardRoot = join(root, versionLane, "worker", "product-support");
        const workspaceRoot = join(shardRoot, "routed-catalog-storefront");
        const evidence = runner.materializeResourceDiscoveryHostWorkspace({
          lane: versionLane === "minimum"
            ? {
                transport: "worker",
                version: "1.91.0",
                versionLane,
                resolvedVersion: "1.91.0",
              }
            : {
                transport: "worker",
                version: "stable",
                versionLane,
                resolvedVersion: "1.123.4",
              },
          shardRoot,
          workspaceRoot,
        });
        return {
          descriptor: JSON.parse(readFileSync(evidence.descriptor, "utf8")),
          rendered: JSON.parse(readFileSync(evidence.fixtureManifest, "utf8")),
          evidence,
        };
      };

      const current = renderLane("current-stable");
      const minimum = renderLane("minimum");
      for (const receipt of [current, minimum]) {
        expect(receipt.rendered.witnesses).toEqual(sourceManifest.witnesses);
        expect(receipt.rendered.projects).toEqual(sourceManifest.projects);
        expect(receipt.rendered.sourceManifestSha256).toBe(sha256File(committedFixturePath));
        expect(receipt.rendered.descriptorSha256).toBe(sha256File(receipt.evidence.descriptor));
        expect(receipt.descriptor.projectTopology.projects.map(
          (project: { projectKey: string }) => project.projectKey,
        )).toEqual(["host-alpha", "host-beta", "host-guardrail", "host-open"]);
      }

      const currentPaths = current.rendered.files.map(
        (file: { relativePath: string }) => file.relativePath,
      );
      const minimumPaths = minimum.rendered.files.map(
        (file: { relativePath: string }) => file.relativePath,
      );
      expect(currentPaths).toContain("host-corpus/package-origin/app/src/main.ts");
      expect(currentPaths).toContain("host-corpus/page-drain/src/main.ts");
      expect(minimumPaths).not.toContain("host-corpus/package-origin/app/src/main.ts");
      expect(minimumPaths).not.toContain("host-corpus/page-drain/src/main.ts");
      for (const paths of [currentPaths, minimumPaths]) {
        expect(paths).toContain("host-corpus/guardrail/src/a-main.ts");
        expect(paths).toContain("host-corpus/open/src/a-main.ts");
        expect(paths).toContain("host-corpus/long-scent/src/main.ts");
      }
      expect(current.rendered.links.map(
        (link: { relativePath: string }) => link.relativePath,
      )).toEqual([
        "host-corpus/package-origin/app/node_modules/@acme/linked-resource-kit",
        "host-corpus/package-origin/app/node_modules/@aurelia/runtime-html",
      ]);
      expect(minimum.rendered.links).toEqual([]);

      const currentHostAlpha = current.descriptor.projectTopology.projects[0].sourceInput.files;
      const minimumHostAlpha = minimum.descriptor.projectTopology.projects[0].sourceInput.files;
      expect(currentHostAlpha).toHaveLength(sourceManifest.projects[0].relativeFiles.length);
      expect(minimumHostAlpha).toHaveLength(sourceManifest.projects[0].relativeFiles.length - 2);
      expect(current.descriptor.projectTopology.projects[2].sourceInput).toEqual({
        kind: "discover",
        options: { extensions: [".ts"], excludedDirectories: null, maxFiles: 1 },
      });
    } finally {
      assertContractTempPath(root);
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("rejects exact-corpus extras and symbolic ancestors while preserving recorded link leaves", async () => {
    const root = join(contractTempRoot, randomUUID());
    try {
      const runner = await import(pathToFileURL(runnerPath).href);
      const shardRoot = join(root, "current-stable", "worker", "product-support");
      const workspaceRoot = join(shardRoot, "routed-catalog-storefront");
      const evidence = runner.materializeResourceDiscoveryHostWorkspace({
        lane: {
          transport: "worker",
          version: "stable",
          versionLane: "current-stable",
          resolvedVersion: "1.123.4",
        },
        shardRoot,
        workspaceRoot,
      });
      writeFileSync(evidence.ledger, "{}\n");
      writeFileSync(evidence.report, "{}\n");
      const rendered = JSON.parse(readFileSync(evidence.fixtureManifest, "utf8"));
      expect(() => runner.authenticateRenderedCorpus(rendered, workspaceRoot)).not.toThrow();

      const unexpected = join(workspaceRoot, "host-corpus", "guardrail", "src", "0-before-limit.ts");
      writeFileSync(unexpected, "export const unexpected = true;\n");
      expect(() => runner.authenticateRenderedCorpus(rendered, workspaceRoot))
        .toThrow(/unexpected file 'host-corpus\/guardrail\/src\/0-before-limit\.ts'/u);
      rmSync(unexpected);

      const openRoot = join(workspaceRoot, "host-corpus", "open");
      const openSource = join(openRoot, "src");
      const openMirror = join(openRoot, ".src-mirror");
      renameSync(openSource, openMirror);
      symlinkSync(openMirror, openSource, "junction");
      expect(() => runner.authenticateRenderedCorpus(rendered, workspaceRoot))
        .toThrow(/symbolic ancestor/u);
      rmSync(openSource, { recursive: true });
      renameSync(openMirror, openSource);

      const packageModules = join(workspaceRoot, "host-corpus", "package-origin", "app", "node_modules");
      const acmeRoot = join(packageModules, "@acme");
      const acmeMirror = join(packageModules, ".acme-mirror");
      renameSync(acmeRoot, acmeMirror);
      symlinkSync(acmeMirror, acmeRoot, "junction");
      expect(() => runner.authenticateRenderedCorpus(rendered, workspaceRoot))
        .toThrow(/symbolic ancestor/u);
      rmSync(acmeRoot, { recursive: true });
      renameSync(acmeMirror, acmeRoot);

      const aureliaRoot = join(packageModules, "@aurelia");
      const aureliaMirror = join(packageModules, ".aurelia-mirror");
      renameSync(aureliaRoot, aureliaMirror);
      symlinkSync(aureliaMirror, aureliaRoot, "junction");
      expect(() => runner.authenticateRenderedCorpus(rendered, workspaceRoot))
        .toThrow(/symbolic ancestor/u);
      rmSync(aureliaRoot, { recursive: true });
      renameSync(aureliaMirror, aureliaRoot);

      const unexpectedLink = join(workspaceRoot, "unexpected-link");
      symlinkSync(join(workspaceRoot, "host-corpus", "open"), unexpectedLink, "junction");
      expect(() => runner.authenticateRenderedCorpus(rendered, workspaceRoot))
        .toThrow(/unexpected symbolic link 'unexpected-link'/u);
    } finally {
      assertContractTempPath(root);
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("authenticates the sealed report and rejects ledger tampering", async () => {
    const root = join(contractTempRoot, randomUUID());
    try {
      const setup = writeSyntheticFixture(root);
      const runner = await import(pathToFileURL(runnerPath).href);
      const evidence = runner.materializeResourceDiscoveryHostWorkspace({
        lane: {
          transport: "worker",
          version: "1.91.0",
          versionLane: "minimum",
          resolvedVersion: "1.91.0",
        },
        shardRoot: setup.shardRoot,
        workspaceRoot: setup.workspaceRoot,
        sourceManifestPath: setup.sourceManifestPath,
        sourceFixturesRoot: setup.sourceFixturesRoot,
        manifestValidator: () => {},
        witnessAuthenticator: () => {},
      });
      const ledger = [
        "tree",
        "quick-pick",
        "recovery",
        "output",
        "navigation",
        "cancellation",
      ].map((source, index) => JSON.stringify({
        source,
        observationId: `receipt:${index + 1}`,
        phase: "passed",
        count: 1,
      })).join("\n") + "\n";
      writeFileSync(evidence.ledger, ledger);
      const staticContractSha256 = "a".repeat(64);
      writeFileSync(evidence.report, `${JSON.stringify({
        schemaVersion: "aurelia-resource-discovery-host-acceptance/1",
        requestedVersion: "1.91.0",
        versionLane: "minimum",
        resolvedVersion: "1.91.0",
        actualVersion: "1.91.0",
        transport: "worker",
        authoritative: true,
        platform: process.platform,
        arch: process.arch,
        staticContractSha256,
        fixture: {
          path: evidence.fixtureManifest,
          sha256: sha256File(evidence.fixtureManifest),
          descriptorSha256: sha256File(evidence.descriptor),
        },
        ledger: {
          path: evidence.ledger,
          sha256: sha256File(evidence.ledger),
          eventCount: 6,
        },
        journeys: runner.resourceDiscoveryRequiredJourneyIds.minimum.map((id: string) => ({
          id,
          status: "passed",
        })),
        facts: {
          tree: { count: 1 },
          quickPick: { count: 1 },
          recovery: { count: 1 },
          output: { count: 1 },
          navigation: { count: 1 },
          cancellation: { count: 1 },
        },
        result: "passed",
      }, null, 2)}\n`);
      const workspace = {
        routedAureliaWorkspace: setup.workspaceRoot,
        resourceDiscoverySourceManifest: setup.sourceManifestPath,
        resourceDiscoveryDescriptor: evidence.descriptor,
        resourceDiscoveryFixtureManifest: evidence.fixtureManifest,
        resourceDiscoveryLedger: evidence.ledger,
        resourceDiscoveryReport: evidence.report,
        resourceDiscoverySourceManifestSha256: evidence.sourceManifestSha256,
        resourceDiscoveryFixtureSha256: evidence.fixtureSha256,
        resourceDiscoveryDescriptorSha256: evidence.descriptorSha256,
      };
      expect(() => runner.authenticateProductSupportReport({
        plan: { transport: "worker", version: "1.91.0", versionLane: "minimum" },
        resolvedVersion: "1.91.0",
        staticContractSha256,
        workspace,
        manifestValidator: () => {},
      })).toThrow(/acceptance report facts\.tree fields must be exactly/u);
      expect(runner.authenticateProductSupportReport({
        plan: { transport: "worker", version: "1.91.0", versionLane: "minimum" },
        resolvedVersion: "1.91.0",
        staticContractSha256,
        workspace,
        manifestValidator: () => {},
        factsValidator: () => {},
      })).toMatchObject({ ledgerEventCount: 6, staticContractSha256 });

      let oversizedFactsValidatorCalled = false;
      truncateSync(
        evidence.ledger,
        runner.resourceDiscoveryObservationLedgerMaxBytes + 1,
      );
      expect(() => runner.authenticateProductSupportReport({
        plan: { transport: "worker", version: "1.91.0", versionLane: "minimum" },
        resolvedVersion: "1.91.0",
        staticContractSha256,
        workspace,
        manifestValidator: () => {},
        factsValidator: () => {
          oversizedFactsValidatorCalled = true;
        },
      })).toThrow(
        /Resource Discovery observation ledger must be a nonempty regular file no larger than 201326592 bytes/u,
      );
      expect(oversizedFactsValidatorCalled).toBe(false);
      writeFileSync(evidence.ledger, ledger);

      const sealedReport = readFileSync(evidence.report, "utf8");
      const reportWithUnknownJourney = JSON.parse(sealedReport);
      reportWithUnknownJourney.journeys.push({ id: "unapproved-padding", status: "passed" });
      writeFileSync(evidence.report, `${JSON.stringify(reportWithUnknownJourney)}\n`);
      expect(() => runner.authenticateProductSupportReport({
        plan: { transport: "worker", version: "1.91.0", versionLane: "minimum" },
        resolvedVersion: "1.91.0",
        staticContractSha256,
        workspace,
        manifestValidator: () => {},
        factsValidator: () => {},
      })).toThrow(/unknown journey 'unapproved-padding'/u);
      writeFileSync(evidence.report, sealedReport);

      writeFileSync(evidence.ledger, `${ledger}{"tampered":true}\n`);
      expect(() => runner.authenticateProductSupportReport({
        plan: { transport: "worker", version: "1.91.0", versionLane: "minimum" },
        resolvedVersion: "1.91.0",
        staticContractSha256,
        workspace,
        manifestValidator: () => {},
        factsValidator: () => {},
      })).toThrow(/ledger receipt sha256/u);

      writeFileSync(
        evidence.fixtureManifest,
        `${readFileSync(evidence.fixtureManifest, "utf8")} `,
      );
      expect(() => runner.authenticateProductSupportReport({
        plan: { transport: "worker", version: "1.91.0", versionLane: "minimum" },
        resolvedVersion: "1.91.0",
        staticContractSha256,
        workspace,
        manifestValidator: () => {},
        factsValidator: () => {},
      })).toThrow(/pre-launch rendered fixture sha256/u);

      rmSync(evidence.report);
      const escapedReport = join(root, "escaped-report");
      mkdirSync(escapedReport, { recursive: true });
      symlinkSync(escapedReport, evidence.report, "junction");
      expect(() => runner.authenticateProductSupportReport({
        plan: { transport: "worker", version: "1.91.0", versionLane: "minimum" },
        resolvedVersion: "1.91.0",
        staticContractSha256,
        workspace,
        manifestValidator: () => {},
        factsValidator: () => {},
      })).toThrow(/outside/u);
    } finally {
      assertContractTempPath(root);
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("authenticates witness bytes before launch", async () => {
    const root = join(contractTempRoot, randomUUID());
    try {
      const runner = await import(pathToFileURL(runnerPath).href);
      const sourceManifest = JSON.parse(readFileSync(committedFixturePath, "utf8")) as {
        copyInputs: readonly { sourceFixture: string }[];
      };
      const sourceFixturesRoot = join(root, "pressure");
      const committedPressureRoot = resolve(
        dirname(committedFixturePath),
        "../../../semantic-runtime/fixtures/pressure",
      );
      for (const input of sourceManifest.copyInputs) {
        cpSync(
          join(committedPressureRoot, input.sourceFixture),
          join(sourceFixturesRoot, input.sourceFixture),
          { recursive: true },
        );
      }
      const overlapSource = join(
        sourceFixturesRoot,
        "plugin-capability-app-root-isolation",
        "src",
        "shared-plugin-app.html",
      );
      writeFileSync(overlapSource, `${readFileSync(overlapSource, "utf8")}<!-- drift -->\n`);
      const shardRoot = join(root, "minimum", "worker", "product-support");
      expect(() => runner.materializeResourceDiscoveryHostWorkspace({
        lane: {
          transport: "worker",
          version: "1.91.0",
          versionLane: "minimum",
          resolvedVersion: "1.91.0",
        },
        shardRoot,
        workspaceRoot: join(shardRoot, "routed-catalog-storefront"),
        sourceFixturesRoot,
      })).toThrow(/projectTemplateAmbiguity source (?:size|sha256)/u);
    } finally {
      assertContractTempPath(root);
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("resolves one-based ledger references exactly once", async () => {
    const runner = await import(pathToFileURL(runnerPath).href);
    const records = runner.validateObservationLedger(Buffer.from([
      JSON.stringify({ source: "resource-explorer", observationId: "view:1", phase: "publish-node" }),
      JSON.stringify({ source: "resource-navigation", observationId: "nav:1", phase: "opened" }),
      "",
    ].join("\n"), "utf8"));
    const context = { ledgerRecords: records, referencedOrdinals: new Set<number>() };
    expect(runner.resolveLedgerReference(
      { eventOrdinal: 1, observationId: "view:1", phase: "publish-node" },
      "baseline",
      context,
      "resource-explorer",
      "publish-node",
    ).eventOrdinal).toBe(1);
    expect(() => runner.resolveLedgerReference(
      { eventOrdinal: 1, observationId: "view:1", phase: "publish-node" },
      "duplicate",
      context,
      "resource-explorer",
      "publish-node",
    )).toThrow(/duplicates ledger eventOrdinal 1/u);
    expect(() => runner.resolveLedgerReference(
      { eventOrdinal: 0, observationId: "view:1", phase: "publish-node" },
      "zero",
      { ledgerRecords: records, referencedOrdinals: new Set<number>() },
      "resource-explorer",
      "publish-node",
    )).toThrow(/eventOrdinal/u);
    expect(() => runner.resolveLedgerReference(
      { eventOrdinal: 2, observationId: "nav:1", phase: "opened" },
      "wrong source",
      { ledgerRecords: records, referencedOrdinals: new Set<number>() },
      "resource-explorer",
      "opened",
    )).toThrow(/must reference source resource-explorer/u);
    expect(() => runner.resolveLedgerReference(
      { eventOrdinal: 2, observationId: "different", phase: "opened" },
      "wrong observation",
      { ledgerRecords: records, referencedOrdinals: new Set<number>() },
      "resource-navigation",
      "opened",
    )).toThrow(/observationId/u);
    expect(() => runner.resolveLedgerReference(
      { eventOrdinal: 2, observationId: "nav:1", phase: "refused" },
      "wrong phase",
      { ledgerRecords: records, referencedOrdinals: new Set<number>() },
      "resource-navigation",
      "opened",
    )).toThrow(/phase receipt/u);
  });

  test("correlates publication nodes by kind within a shared generation", async () => {
    const runner = await import(pathToFileURL(runnerPath).href);
    const ledgerRecords = [
      {
        eventOrdinal: 1,
        event: {
          source: "resource-explorer",
          observationId: "view:shared-generation",
          phase: "publish-node",
          generation: 7,
          publicationKind: "updating",
          ordinal: 0,
          nodeKind: "resource",
          nodeId: "updating-node",
        },
      },
      {
        eventOrdinal: 2,
        event: {
          source: "resource-explorer",
          observationId: "view:shared-generation",
          phase: "publish-node",
          generation: 7,
          publicationKind: "current",
          ordinal: 0,
          nodeKind: "resource",
          nodeId: "retained-node",
          rowStates: "out-of-date",
        },
      },
    ];
    const published = {
      eventOrdinal: 3,
      event: {
        source: "resource-explorer",
        observationId: "view:shared-generation",
        phase: "publish-complete",
        generation: 7,
        publicationKind: "current",
      },
    };
    expect(runner.publicationNodes({ ledgerRecords }, published, "shared generation"))
      .toEqual([ledgerRecords[1]]);
  });

  test("conserves intentional incomplete-project issue rows across recovery", async () => {
    const runner = await import(pathToFileURL(runnerPath).href);
    const baselineIssue = {
      eventOrdinal: 1,
      event: {
        source: "resource-explorer",
        observationId: "view:baseline",
        phase: "publish-node",
        generation: 3,
        publicationKind: "current",
        ordinal: 7,
        parentId: "tree-node:routed-workspace",
        nodeId: "tree-node:host-guardrail-project",
        nodeKind: "project",
        label: "host-guardrail",
        description: "Source discovery reached its configured limit",
        accessibilityLabel: "Resource discovery is incomplete",
        contextValue: "resourceProjectIssue",
        command: null,
        collapsible: false,
        defaultExpanded: false,
        rowStates: "discovery-incomplete",
        answerResult: "answered",
        answerCoverage: "truncated",
        answerRowCount: 28,
      },
    };
    const unrelated = {
      eventOrdinal: 2,
      event: {
        ...baselineIssue.event,
        ordinal: 8,
        nodeId: "tree-node:resource",
        nodeKind: "resource",
        contextValue: "resource",
      },
    };
    const baseline = [baselineIssue, unrelated];
    const recovered = [
      { ...baselineIssue, eventOrdinal: 11, event: { ...baselineIssue.event } },
      { ...unrelated, eventOrdinal: 12, event: { ...unrelated.event } },
    ];

    const secondIssue = {
      ...baselineIssue,
      eventOrdinal: 3,
      event: {
        ...baselineIssue.event,
        ordinal: 9,
        nodeId: "tree-node:host-open-project",
        label: "host-open",
        description: "Resource visibility is incomplete",
        answerCoverage: "open",
      },
    };
    const exactBaseline = [baselineIssue, unrelated, secondIssue];
    const exactRecovered = [
      { ...baselineIssue, eventOrdinal: 11, event: { ...baselineIssue.event } },
      { ...unrelated, eventOrdinal: 12, event: { ...unrelated.event } },
      { ...secondIssue, eventOrdinal: 13, event: { ...secondIssue.event } },
    ];

    const baselineShapes = runner.issuePublicationDurableShapes(exactBaseline);
    expect(baselineShapes).toHaveLength(2);
    expect(() => runner.validateIssuePublicationConservation(
      exactRecovered,
      exactBaseline,
      "recovered issues",
    )).not.toThrow();
    for (const changed of [
      exactRecovered.slice(0, -1),
      [
        ...exactRecovered,
        {
          ...baselineIssue,
          event: { ...baselineIssue.event, nodeId: "tree-node:added-issue" },
        },
      ],
      [
        {
          ...baselineIssue,
          event: { ...baselineIssue.event, description: "Different incomplete state" },
        },
        unrelated,
        secondIssue,
      ],
      [secondIssue, unrelated, baselineIssue],
    ]) {
      expect(() => runner.validateIssuePublicationConservation(
        changed,
        exactBaseline,
        "recovered issues",
      )).toThrow(/recovered issues/u);
    }

    const newFailure = {
      ...baselineIssue,
      event: {
        ...baselineIssue.event,
        nodeId: "tree-node:host-alpha-project",
        label: "host-alpha",
        rowStates: "out-of-date",
      },
    };
    const staleHealthyIssue = {
      ...baselineIssue,
      event: { ...baselineIssue.event, rowStates: "discovery-incomplete|out-of-date" },
    };
    expect([...runner.recoveryOutputTargetNodeIds(
      [staleHealthyIssue, newFailure],
      new Set([baselineIssue.event.nodeId]),
    )]).toEqual(["tree-node:host-alpha-project"]);

    const affectedProjects = [
      { group: { projects: [{ nodeId: "primary-app" }] } },
      { group: { projects: [{ nodeId: "host-alpha" }, { nodeId: "host-open" }] } },
    ];
    expect(runner.expectedRecoveryIssueProjectNodeIds(
      affectedProjects,
      0,
      ["host-open", "host-guardrail"],
    )).toEqual(["host-alpha", "host-guardrail", "host-open"]);
    expect(runner.expectedRecoveryIssueProjectNodeIds(
      affectedProjects,
      1,
      ["host-open", "host-guardrail"],
    )).toEqual(["host-guardrail", "host-open"]);
  });

  test("requires a null aggregate baseline fingerprint", async () => {
    const runner = await import(pathToFileURL(runnerPath).href);
    expect(() => runner.validateAggregatePublicationFingerprint(
      null,
      null,
      "baseline",
    )).not.toThrow();
    expect(() => runner.validateAggregatePublicationFingerprint(
      "self-attested-fingerprint",
      null,
      "baseline",
    )).toThrow(/baseline fact/u);
    expect(() => runner.validateAggregatePublicationFingerprint(
      null,
      "self-attested-fingerprint",
      "baseline",
    )).toThrow(/baseline event/u);
  });

  test("requires the current baseline and predecessor evidence schemas", async () => {
    const runner = await import(pathToFileURL(runnerPath).href);
    const baseline = {
      published: null,
      generation: 1,
      fingerprint: null,
      nodeCount: 2,
      rootCount: 2,
    };
    expect(() => runner.baselineTreeFact(baseline, "baseline")).not.toThrow();
    expect(() => runner.baselineTreeFact({ ...baseline, loadingState: null }, "baseline"))
      .toThrow(/fields must be exactly/u);

    const predecessor = runnerPredecessorRaceFact();
    expect(() => runner.predecessorRaceFact(predecessor, "predecessor")).not.toThrow();
    const { updatingInvalidated: _omitted, ...missingInvalidation } = predecessor;
    expect(() => runner.predecessorRaceFact(missingInvalidation, "predecessor"))
      .toThrow(/fields must be exactly/u);
    expect(() => runner.predecessorRaceFact({
      ...predecessor,
      extraUpdatingInvalidated: null,
    }, "predecessor")).toThrow(/fields must be exactly/u);
    expect(() => runner.predecessorRaceFact({ ...predecessor, forged: null }, "predecessor"))
      .toThrow(/fields must be exactly/u);
  });

  test("authenticates one-use scoped predecessor updating evidence", async () => {
    const runner = await import(pathToFileURL(runnerPath).href);
    const evidence = runnerUpdatingEvidence();
    expect(() => runner.resolvePredecessorUpdatingEvidence(
      evidence.race,
      evidence.context,
      "predecessor",
    )).not.toThrow();

    const duplicate = runnerUpdatingEvidence();
    expect(() => runner.resolvePredecessorUpdatingEvidence(
      {
        ...duplicate.race,
        updatingUnrelated: duplicate.race.updatingTarget,
      },
      duplicate.context,
      "predecessor",
    )).toThrow(/duplicates ledger eventOrdinal/u);

    const swappedInvalidations = runnerUpdatingEvidence();
    expect(() => runner.resolvePredecessorUpdatingEvidence(
      {
        ...swappedInvalidations.race,
        updatingInvalidated: swappedInvalidations.race.invalidated,
        invalidated: swappedInvalidations.race.updatingInvalidated,
      },
      swappedInvalidations.context,
      "predecessor",
    )).toThrow(/strict event order/u);

    for (const field of ["scope", "workspaceKey"] as const) {
      const forged = runnerUpdatingEvidence();
      forged.records.updatingInvalidated.event[field] = field === "scope"
        ? "all"
        : "file:///workspace/forged";
      expect(() => runner.resolvePredecessorUpdatingEvidence(
        forged.race,
        forged.context,
        "predecessor",
      )).toThrow(field === "scope" ? /updatingInvalidated\.scope/u : /updatingInvalidated workspace/u);
    }

    for (const variant of [
      "duplicate-publication",
      "alternate-publication",
      "duplicate-state",
      "alternate-state",
      "out-of-order",
    ] as const) {
      const forged = runnerUpdatingEvidence(variant);
      expect(() => runner.resolvePredecessorUpdatingEvidence(
        forged.race,
        forged.context,
        "predecessor",
      )).toThrow(variant === "out-of-order" ? /strict event order/u : /count/u);
    }

    for (const mutate of [
      (value: ReturnType<typeof runnerUpdatingEvidence>) => {
        value.records.updatingState.event.message = "Updating — showing previous results";
      },
      (value: ReturnType<typeof runnerUpdatingEvidence>) => {
        value.records.updatingState.event.description = "3 known resources";
      },
      (value: ReturnType<typeof runnerUpdatingEvidence>) => {
        value.records.updatingPublished.event.workspaceIdentity = "workspace:forged";
      },
      (value: ReturnType<typeof runnerUpdatingEvidence>) => {
        value.records.updatingUnrelated.event.navigationFingerprint = "epoch:forged";
      },
      (value: ReturnType<typeof runnerUpdatingEvidence>) => {
        value.records.updatingUnrelated.event.implementationFingerprint = "epoch:forged";
      },
      (value: ReturnType<typeof runnerUpdatingEvidence>) => {
        value.records.updatingTarget.event.observationId = "resource-explorer:forged";
      },
    ]) {
      const forged = runnerUpdatingEvidence();
      mutate(forged);
      expect(() => runner.resolvePredecessorUpdatingEvidence(
        forged.race,
        forged.context,
        "predecessor",
      )).toThrow();
    }
  });

  test("compares durable rows across epochs while rejecting incoherent scoped tokens", async () => {
    const runner = await import(pathToFileURL(runnerPath).href);
    const oldNode = runnerPublicationNode(1, "target", "workspace:a", "epoch:old", "epoch:old");
    const currentNode = runnerPublicationNode(1, "target", "workspace:a", "epoch:new", "epoch:new");
    expect(runner.publicationNodeDurableShape(currentNode))
      .toEqual(runner.publicationNodeDurableShape(oldNode));
    const publication = runnerPublication(3, "resource-explorer:current", 7, "workspace:a", "epoch:new");
    const unrelated = runnerPublicationNode(2, "unrelated", "workspace:b", "epoch:b", null);
    expect(() => runner.validateScopedPublicationFingerprintCoherence(
      publication,
      [currentNode, unrelated],
      "recovered",
    )).not.toThrow();

    for (const event of [
      { ...currentNode.event, navigationFingerprint: "epoch:old" },
      { ...currentNode.event, navigationFingerprint: null },
      { ...currentNode.event, implementationFingerprint: "epoch:old" },
      { ...currentNode.event, implementationFingerprint: null },
    ]) {
      expect(() => runner.validateScopedPublicationFingerprintCoherence(
        publication,
        [{ ...currentNode, event }, unrelated],
        "recovered",
      )).toThrow();
    }
    expect(runner.publicationNodeDurableShape({
      ...currentNode,
      event: { ...currentNode.event, nodeId: "changed" },
    })).not.toEqual(runner.publicationNodeDurableShape(oldNode));
  });

  test("requires the final serial recovery map to use both latest workspace tokens", async () => {
    const runner = await import(pathToFileURL(runnerPath).href);
    const nodes = [
      runnerPublicationNode(1, "a", "workspace:a", "epoch:a:new", "epoch:a:new"),
      runnerPublicationNode(2, "b", "workspace:b", "epoch:b:new", null),
    ];
    const recoveries = [
      { workspaceIdentity: "workspace:a", fingerprint: "epoch:a:new" },
      { workspaceIdentity: "workspace:b", fingerprint: "epoch:b:new" },
    ];
    expect(() => runner.validateFinalRecoveredWorkspaceFingerprints(nodes, recoveries, "final"))
      .not.toThrow();
    expect(() => runner.validateFinalRecoveredWorkspaceFingerprints([
      { ...nodes[0], event: { ...nodes[0].event, implementationFingerprint: "epoch:a:old" } },
      nodes[1],
    ], recoveries, "final")).toThrow(/latest fingerprint/u);
    expect(() => runner.validateFinalRecoveredWorkspaceFingerprints(nodes, [
      recoveries[0],
      { workspaceIdentity: "workspace:b", fingerprint: "epoch:b:old" },
    ], "final")).toThrow(/latest fingerprint/u);
  });

  test("rejects an unrelated Quick Pick Back receipt", async () => {
    const runner = await import(pathToFileURL(runnerPath).href);
    const firstTemplate = {
      eventOrdinal: 1,
      event: {
        source: "resource-quick-pick",
        observationId: "ambiguity-flow:1",
        phase: "model-ready",
        modelOrdinal: 2,
      },
    };
    const back = {
      eventOrdinal: 2,
      event: {
        source: "resource-quick-pick",
        observationId: "ambiguity-flow:1",
        phase: "back",
        modelOrdinal: 2,
      },
    };
    const retainedProject = {
      eventOrdinal: 3,
      event: {
        source: "resource-quick-pick",
        observationId: "ambiguity-flow:1",
        phase: "model-ready",
        modelOrdinal: 3,
      },
    };
    const context = { ledgerRecords: [firstTemplate, back, retainedProject] };
    expect(() => runner.validateQuickPickBackCorrelation(
      back,
      retainedProject,
      context,
      "Back",
    )).not.toThrow();
    expect(() => runner.validateQuickPickBackCorrelation(
      {
        ...back,
        event: { ...back.event, observationId: "unrelated-flow:1" },
      },
      retainedProject,
      context,
      "Back",
    )).toThrow(/Back\.observationId/u);
  });

  test("correlates Quick Pick acceptance to the exact model item", async () => {
    const runner = await import(pathToFileURL(runnerPath).href);
    const ready = {
      eventOrdinal: 1,
      event: {
        source: "resource-quick-pick",
        observationId: "ambiguity-flow:accept",
        phase: "model-ready",
        modelOrdinal: 4,
      },
    };
    const accept = {
      eventOrdinal: 2,
      event: {
        source: "resource-quick-pick",
        observationId: "ambiguity-flow:accept",
        phase: "accept",
        modelOrdinal: 4,
        itemOrdinal: 1,
        selectedLabel: "shared-plugin-app",
      },
    };
    const selection = {
      eventOrdinal: 3,
      event: {
        source: "go-to-available-resource",
        observationId: "ambiguity-flow:accept",
        phase: "availability-selection",
      },
    };
    const model = {
      ready,
      selection,
      fact: { modelOrdinal: 4 },
      items: [
        { event: { label: "shared-plugin-app" } },
        { event: { label: "shared-plugin-app" } },
      ],
    };
    expect(() => runner.validateQuickPickAcceptCorrelation(
      model,
      1,
      { ledgerRecords: [ready, accept, selection] },
      "template accept",
    )).not.toThrow();
    expect(() => runner.validateQuickPickAcceptCorrelation(
      model,
      0,
      { ledgerRecords: [ready, accept, selection] },
      "template accept",
    )).toThrow(/itemOrdinal/u);
    expect(() => runner.validateQuickPickAcceptCorrelation(
      model,
      1,
      {
        ledgerRecords: [
          ready,
          { ...accept, event: { ...accept.event, observationId: "unrelated-flow:accept" } },
          selection,
        ],
      },
      "template accept",
    )).toThrow(/correlated accept count/u);
  });

  test("correlates Quick Pick current evidence across baseline and current request epochs", async () => {
    const runner = await import(pathToFileURL(runnerPath).href);
    const evidence = runnerQuickPickCurrentEvidence();
    const result = runner.validateQuickPickCurrentEvidence(
      evidence.resource,
      evidence.selectedProject,
      evidence.selectedScope,
      evidence.context,
      "Quick Pick current evidence",
    );
    expect(result).toMatchObject({
      currentPublication: evidence.records.currentPublication,
      currentNode: evidence.records.currentNode,
      freshResponse: evidence.records.freshResponse,
      revalidation: evidence.records.revalidation,
      navigationStart: evidence.records.navigationStart,
    });
    expect(evidence.records.baselineNode.event.navigationFingerprint).toBe("epoch:request-4");
    expect(evidence.records.currentNode.event.navigationFingerprint).toBe("epoch:request-14");
    expect(runner.publicationNodeDurableShape(evidence.records.currentNode))
      .toEqual(runner.publicationNodeDurableShape(evidence.records.baselineNode));

    const unrelatedInvalidation = runnerQuickPickCurrentEvidence("unrelated-invalidation");
    expect(() => runner.validateQuickPickCurrentEvidence(
      unrelatedInvalidation.resource,
      unrelatedInvalidation.selectedProject,
      unrelatedInvalidation.selectedScope,
      unrelatedInvalidation.context,
      "Quick Pick current evidence",
    )).not.toThrow();
  });

  test("rejects stale or malformed Quick Pick current publication evidence", async () => {
    const runner = await import(pathToFileURL(runnerPath).href);
    const validate = (variant: RunnerQuickPickCurrentVariant) => {
      const evidence = runnerQuickPickCurrentEvidence(variant);
      return () => runner.validateQuickPickCurrentEvidence(
        evidence.resource,
        evidence.selectedProject,
        evidence.selectedScope,
        evidence.context,
        "Quick Pick current evidence",
      );
    };
    for (const [variant, pattern] of [
      ["wrong-current-token", /target workspace fingerprints/u],
      ["wrong-publication-token", /target workspace fingerprints/u],
      ["latest-wrong-token-with-older-match", /response publication fingerprint/u],
      ["missing-current-membership", /selected node count/u],
      ["duplicate-current-membership", /selected node count/u],
      ["missing-frame-start", /start count/u],
      ["duplicate-frame-start", /start count/u],
      ["duplicate-frame-complete", /completion count/u],
      ["late-frame-node", /global nodeCount|global frame membership/u],
      ["noncontiguous-node-ordinal", /nodes\[0\]\.ordinal/u],
      ["wrong-frame-order", /strict event order/u],
      ["workspace-invalidation", /relevant invalidation count/u],
      ["all-invalidation", /relevant invalidation count/u],
    ] as const) {
      expect(validate(variant)).toThrow(pattern);
    }
  });

  test("rejects missing, duplicate, malformed, or reordered Quick Pick fresh reproof", async () => {
    const runner = await import(pathToFileURL(runnerPath).href);
    const validate = (evidence: ReturnType<typeof runnerQuickPickCurrentEvidence>) => () =>
      runner.validateQuickPickCurrentEvidence(
        evidence.resource,
        evidence.selectedProject,
        evidence.selectedScope,
        evidence.context,
        "Quick Pick current evidence",
      );
    for (const [variant, pattern] of [
      ["missing-fresh", /fresh response count/u],
      ["duplicate-fresh", /fresh response count/u],
      ["missing-revalidation", /revalidation count/u],
      ["duplicate-revalidation", /revalidation count/u],
      ["wrong-reproof-order", /strict event order/u],
    ] as const) {
      expect(validate(runnerQuickPickCurrentEvidence(variant))).toThrow(pattern);
    }

    for (const [field, forged] of Object.entries({
      answerResult: "unanswered",
      answerCoverage: "open",
      answerSelection: "absent",
      selectedProjectKey: "other-project",
      selectedTemplateScopeIdentity: "scope:other",
      templateCandidateCount: 2,
      soleTemplateCandidateScopeIdentity: "scope:other",
      resourceIdentitySetSha256: "f".repeat(64),
      fingerprint: "epoch:request-13",
      count: 1,
      status: "restart",
    })) {
      const evidence = runnerQuickPickCurrentEvidence();
      evidence.records.freshResponse.event[field] = forged;
      expect(validate(evidence)).toThrow(new RegExp(`freshResponse\\.${field}`, "u"));
    }
    for (const [field, forged] of Object.entries({
      fingerprint: "epoch:request-13",
      editorUnchanged: false,
      outcome: "restart",
      rowCount: 1,
    })) {
      const evidence = runnerQuickPickCurrentEvidence();
      evidence.records.revalidation.event[field] = forged;
      expect(validate(evidence)).toThrow(new RegExp(`revalidation\\.${field}`, "u"));
    }
  });

  test("correlates Quick Pick cancellation to the open-coverage model", async () => {
    const runner = await import(pathToFileURL(runnerPath).href);
    const availability = {
      eventOrdinal: 1,
      event: {
        source: "go-to-available-resource",
        observationId: "open-coverage:1",
        phase: "initial-request-response",
        count: 3,
      },
    };
    const model = {
      eventOrdinal: 2,
      event: {
        source: "resource-quick-pick",
        observationId: "open-coverage:1",
        phase: "model-ready",
        modelOrdinal: 1,
        itemCount: 3,
      },
    };
    const cancel = {
      eventOrdinal: 3,
      event: {
        source: "resource-quick-pick",
        observationId: "open-coverage:1",
        phase: "cancelled",
        modelOrdinal: 1,
      },
    };
    const context = { ledgerRecords: [availability, model, cancel] };
    expect(() => runner.validateQuickPickCancelCorrelation(
      cancel,
      availability,
      context,
      "cancel",
    )).not.toThrow();
    expect(() => runner.validateQuickPickCancelCorrelation(
      { ...cancel, event: { ...cancel.event, observationId: "unrelated:1" } },
      availability,
      context,
      "cancel",
    )).toThrow(/cancel\.observationId/u);
  });

  test("authenticates distinct unowned and admitted no-cursor empty models", async () => {
    const runner = await import(pathToFileURL(runnerPath).href);
    const reference = (eventOrdinal: number, phase: string) => ({
      eventOrdinal,
      observationId: "empty-state:1",
      phase,
    });
    const records = (response: Record<string, unknown>, ready: Record<string, unknown>) =>
      runner.validateObservationLedger(Buffer.from([
        JSON.stringify({
          source: "go-to-available-resource",
          observationId: "empty-state:1",
          phase: "initial-request-response",
          ...response,
        }),
        JSON.stringify({
          source: "resource-quick-pick",
          observationId: "empty-state:1",
          phase: "model-ready",
          itemCount: 0,
          ...ready,
        }),
        "",
      ].join("\n"), "utf8"));
    const context = (ledgerRecords: readonly unknown[]) => ({
      ledgerRecords,
      referencedOrdinals: new Set<number>(),
    });
    const fact = {
      response: reference(1, "initial-request-response"),
      ready: reference(2, "model-ready"),
    };
    const unownedResponse = {
      answerResult: null,
      answerCoverage: null,
      answerSelection: null,
      selectedProjectKey: null,
      selectedTemplateScopeIdentity: null,
      templateCandidateCount: null,
      soleTemplateCandidateScopeIdentity: null,
      resourceIdentitySetSha256: null,
      fingerprint: null,
      projectSelection: "null",
      templateSelection: "unavailable",
      status: "empty",
      count: 0,
      resourceCount: 0,
    };
    const unownedReady = {
      title: "Go to Resource Available to Active Template",
      placeholder: "Open an analyzed Aurelia template to see its available resources",
    };
    expect(() => runner.validateEmptyQuickPickState(
      fact,
      context(records(unownedResponse, unownedReady)),
      "unowned",
      "unowned",
    )).not.toThrow();
    expect(() => runner.validateEmptyQuickPickState(
      fact,
      context(records(unownedResponse, unownedReady)),
      "no-cursor",
      "no-cursor",
    )).toThrow(/projectSelection/u);

    const noCursorResponse = {
      answerResult: "answered",
      answerCoverage: "complete",
      answerSelection: "absent",
      selectedProjectKey: "host-alpha",
      selectedTemplateScopeIdentity: null,
      templateCandidateCount: 0,
      soleTemplateCandidateScopeIdentity: null,
      resourceIdentitySetSha256:
        "327fd628cccfccf19e15da66a13fecc7d024224d58d78510a9677f3f10256d3a",
      fingerprint: "host-alpha:fingerprint",
      projectSelection: "exact",
      templateSelection: "absent",
      status: "empty",
      count: 0,
      resourceCount: 0,
    };
    const noCursorReady = {
      title: "No Aurelia template at the cursor",
      placeholder: "Move the cursor into an analyzed Aurelia template and try again",
    };
    expect(() => runner.validateEmptyQuickPickState(
      fact,
      context(records(noCursorResponse, noCursorReady)),
      "no-cursor",
      "no-cursor",
    )).not.toThrow();
    expect(() => runner.validateEmptyQuickPickState(
      { ready: fact.ready },
      context(records(noCursorResponse, noCursorReady)),
      "no-cursor",
      "no-cursor",
    )).toThrow(/fields must be exactly/u);
    expect(() => runner.validateEmptyQuickPickState(
      fact,
      context(records({ ...noCursorResponse, templateCandidateCount: 1 }, noCursorReady)),
      "no-cursor",
      "no-cursor",
    )).toThrow(/templateCandidateCount/u);
  });

  test("requires one ordered total-failure recovery per affected workspace", async () => {
    const runner = await import(pathToFileURL(runnerPath).href);
    const workspaceKey = (name: string) => `file:///C:/disposable/${name}`;
    const workspaceIdentity = (name: string) => `workspace:${createHash("sha256")
      .update(workspaceKey(name), "utf8")
      .digest("hex")}`;
    const affectedProjects = ["primary", "routed"].map((name, index) => ({
      workspaceIdentity: workspaceIdentity(name),
      nodeId: `project-node:${index}`,
    }));
    const recoveries = ["primary", "routed"].map((name, index) => ({
      workspaceIdentity: workspaceIdentity(name),
      targetNodeId: `project-node:${index}`,
      retry: { event: { workspaceKey: workspaceKey(name) } },
    }));
    expect(() => runner.validateTotalRecoveryWorkspaceSequence(
      affectedProjects,
      recoveries,
      "total",
    )).not.toThrow();
    expect(() => runner.validateTotalRecoveryWorkspaceSequence(
      affectedProjects,
      recoveries.slice(0, 1),
      "total",
    )).toThrow(/one serial recovery for each affected workspace boundary/u);
    expect(() => runner.validateTotalRecoveryWorkspaceSequence(
      affectedProjects,
      [recoveries[0], { ...recoveries[1], workspaceIdentity: recoveries[0].workspaceIdentity }],
      "total",
    )).toThrow(/recoveries\[1\]\.workspaceIdentity/u);
  });

  test("pins the resource identity set receipt preimage", async () => {
    const runner = await import(pathToFileURL(runnerPath).href);
    const manifest = JSON.parse(readFileSync(committedFixturePath, "utf8"));
    const race = manifest.witnesses.shiftedAndRemovedNavigation.availabilityRace;
    const digest = (rows: readonly { identityKey: string }[]) =>
      runner.resourceIdentitySetSha256(rows.map((row) => row.identityKey));
    expect(digest(race.baseline.rows))
      .toBe("a80c1585be956bec2899d73e16ce07645786186b852f9e30e2cf475bb9e37e3f");
    expect(digest(race.scopeEdit.restartWithoutSelection.response.rows))
      .toBe("aefe1114f11b8cf017acee13575dc078b61ac6e0ce1f0d64b4fb2bc064d4146f");
    expect(digest(race.afterRemoval.restartWithoutSelection.response.rows))
      .toBe("a80c1585be956bec2899d73e16ce07645786186b852f9e30e2cf475bb9e37e3f");
    expect(runner.resourceIdentitySetSha256([]))
      .toBe("327fd628cccfccf19e15da66a13fecc7d024224d58d78510a9677f3f10256d3a");
  });

  test("rejects unknown and lane-inapplicable facts before trusting values", async () => {
    const runner = await import(pathToFileURL(runnerPath).href);
    const commonTree = {
      baseline: null,
      lifecycle: null,
      predecessorRace: null,
      unrelatedStability: null,
      headerOnlyPublished: null,
      openCoverage: null,
      guardrail: null,
    };
    const commonFacts = {
      tree: commonTree,
      quickPick: {},
      recovery: {},
      output: {},
      navigation: {},
      cancellation: {},
    };
    const validate = (facts: unknown, lane: "minimum" | "current-stable") =>
      runner.validateFactsReceipt(facts, [], {}, lane, contractTempRoot);
    expect(() => validate({ ...commonFacts, padding: { count: 1 } }, "minimum"))
      .toThrow(/acceptance report facts fields must be exactly/u);
    expect(() => validate({
      ...commonFacts,
      tree: { ...commonTree, unknown: true },
    }, "minimum")).toThrow(/acceptance report facts\.tree fields must be exactly/u);
    expect(() => validate({
      ...commonFacts,
      tree: { ...commonTree, pageDrain: null },
    }, "minimum")).toThrow(/acceptance report facts\.tree fields must be exactly/u);
    expect(() => validate(commonFacts, "current-stable"))
      .toThrow(/acceptance report facts\.tree fields must be exactly/u);
  });

  test("exposes default, Worker, IPC, current-stable, and exact-minimum package entry points", () => {
    const minimumPlan = readPlan("--minimum");

    expect(extensionManifest.engines?.vscode)
      .toBe(`^${minimumPlan.minimumVSCodeVersion}`);
    expect(extensionManifest.scripts?.["test:extension-host"])
      .toContain("--worker --current-stable");
    expect(extensionManifest.scripts?.["test:extension-host:worker"])
      .toBe("pnpm run test:extension-host");
    expect(extensionManifest.scripts?.["test:extension-host:ipc"])
      .toContain("--ipc --current-stable");
    expect(extensionManifest.scripts?.["test:extension-host:current-stable"])
      .toBe("pnpm run test:extension-host");
    expect(extensionManifest.scripts?.["test:extension-host:minimum"])
      .toContain("--worker --minimum");
    expect(rootManifest.scripts).toMatchObject({
      "test:vscode:extension-host": "pnpm --filter aurelia-2 test:extension-host",
      "test:vscode:extension-host:worker": "pnpm --filter aurelia-2 test:extension-host:worker",
      "test:vscode:extension-host:ipc": "pnpm --filter aurelia-2 test:extension-host:ipc",
      "test:vscode:extension-host:current-stable": "pnpm --filter aurelia-2 test:extension-host:current-stable",
      "test:vscode:extension-host:minimum": "pnpm --filter aurelia-2 test:extension-host:minimum",
    });
  });
});

function ambiguityScope(
  manifest: MutableFixtureManifest,
  projectIndex: number,
  scopeIndex: number,
): MutableAmbiguityScope {
  const witness = manifest.witnesses.projectTemplateAmbiguity as {
    projects: { scopes: MutableAmbiguityScope[] }[];
  };
  return witness.projects[projectIndex].scopes[scopeIndex];
}

function readManifest(url: URL): PackageManifest {
  return JSON.parse(readFileSync(url, "utf8")) as PackageManifest;
}

function readPlan(...args: string[]): RunnerPlan {
  const result = runRunner(...args, "--plan");
  expect(result.status).toBe(0);
  return JSON.parse(result.stdout.trim()) as RunnerPlan;
}

function readFailure(...args: string[]): string {
  const result = runRunner(...args, "--plan");
  expect(result.status).not.toBe(0);
  return `${result.stdout}\n${result.stderr}`;
}

function runRunner(...args: string[]) {
  return spawnSync(process.execPath, [runnerPath, ...args], {
    encoding: "utf8",
    windowsHide: true,
  });
}

function readExecutionProbe(): ExecutionProbe {
  const runnerUrl = new URL("../scripts/run-extension-host-tests.mjs", import.meta.url).href;
  const probeSource = `
    const runner = await import(${JSON.stringify(runnerUrl)});
    const preparedShards = [];
    const preparedLanes = [];
    const authenticatedShards = [];
    const launches = [];
    let downloadCount = 0;
    let activeLaunches = 0;
    let maxConcurrentLaunches = 0;
    const plan = runner.parseRunnerArguments(["--worker", "--current-stable"]);
    await runner.runExtensionHostTests(plan, {
      electron: {
        ProgressReportStage: { ResolvedVersion: "resolvedVersion" },
        makeConsoleReporter: async () => ({ error() {}, report() {} }),
        downloadAndUnzipVSCode: async ({ reporter }) => {
          downloadCount += 1;
          reporter.report({ stage: "resolvedVersion", version: "1.123.4" });
          return "mock-vscode";
        },
        runTests: async (options) => {
          activeLaunches += 1;
          maxConcurrentLaunches = Math.max(maxConcurrentLaunches, activeLaunches);
          launches.push({
            shard: options.extensionTestsEnv.AURELIA_LS_EXTENSION_HOST_SHARD,
            expectedActualVersion:
              options.extensionTestsEnv.AURELIA_LS_EXTENSION_HOST_EXPECTED_ACTUAL_VERSION,
            expectedTransport:
              options.extensionTestsEnv.AURELIA_LS_EXTENSION_HOST_EXPECTED_TRANSPORT,
            routedWorkspace:
              options.extensionTestsEnv.AURELIA_LS_EXTENSION_HOST_ROUTED_WORKSPACE ?? null,
            tailObservation:
              options.extensionTestsEnv.AURELIA_LS_EXTENSION_HOST_TAIL_OBSERVATION ?? null,
            acceptance:
              options.extensionTestsEnv.AURELIA_LS_RESOURCE_DISCOVERY_HOST_ACCEPTANCE ?? null,
            descriptor:
              options.extensionTestsEnv.AURELIA_LS_RESOURCE_DISCOVERY_HOST_DESCRIPTOR ?? null,
            fixtureManifest:
              options.extensionTestsEnv.AURELIA_LS_RESOURCE_DISCOVERY_HOST_FIXTURE_MANIFEST ?? null,
            ledger:
              options.extensionTestsEnv.AURELIA_LS_RESOURCE_DISCOVERY_HOST_LEDGER ?? null,
            report:
              options.extensionTestsEnv.AURELIA_LS_RESOURCE_DISCOVERY_HOST_REPORT ?? null,
            resourceDiscoveryEnvironmentNames: Object.keys(options.extensionTestsEnv)
              .filter((name) => name.startsWith("AURELIA_LS_RESOURCE_DISCOVERY_HOST_"))
              .sort(),
            testWorkspace: options.launchArgs[0],
            userDataArgument: options.launchArgs.find((argument) =>
              argument.startsWith("--user-data-dir=")),
          });
          await new Promise((resolve) => setImmediate(resolve));
          activeLaunches -= 1;
        },
      },
      staticContractSha256: "a".repeat(64),
      authenticateReport: ({ workspace }) => {
        authenticatedShards.push(workspace.shard);
      },
      prepareWorkspace: (shard, lane) => {
        preparedShards.push(shard);
        preparedLanes.push(lane.versionLane + "/" + lane.transport);
        const root = "/mock/" + shard;
        return {
          shard,
          aureliaWorkspace: root + "/aurelia",
          secondaryAureliaWorkspace: root + "/secondary",
          excludedAureliaWorkspace: root + "/excluded",
          plainTypeScriptWorkspace: root + "/plain",
          routedAureliaWorkspace: root + "/routed",
          resourceDiscoverySourceManifest: root + "/resource-discovery-host.json",
          resourceDiscoveryDescriptor: root + "/routed/semantic-workspace.json",
          resourceDiscoveryFixtureManifest: root + "/routed/fixture-manifest.json",
          resourceDiscoveryLedger: root + "/routed/resource-discovery.observations.jsonl",
          resourceDiscoveryReport: root + "/routed/resource-discovery.acceptance.json",
          testWorkspace: root + "/workspace.code-workspace",
          userDataDirectory: root + "/profile/user-data",
          extensionsDirectory: root + "/profile/extensions",
        };
      },
    });
    console.log(JSON.stringify({
      downloadCount,
      launches,
      maxConcurrentLaunches,
      preparedShards,
      preparedLanes,
      authenticatedShards,
    }));
  `;
  const result = spawnSync(process.execPath, ["--input-type=module", "--eval", probeSource], {
    encoding: "utf8",
    windowsHide: true,
  });
  expect(result.status).toBe(0);
  const outputLines = result.stdout.trim().split(/\r?\n/u);
  return JSON.parse(outputLines.at(-1) ?? "") as ExecutionProbe;
}

function readMinimumResolutionFailure(): string {
  const runnerUrl = new URL("../scripts/run-extension-host-tests.mjs", import.meta.url).href;
  const source = `
    const runner = await import(${JSON.stringify(runnerUrl)});
    const plan = runner.parseRunnerArguments([
      "--worker", "--minimum", "--shard=rename-reliability",
    ]);
    await runner.runExtensionHostTests(plan, {
      electron: {
        ProgressReportStage: { ResolvedVersion: "resolvedVersion" },
        makeConsoleReporter: async () => ({ error() {}, report() {} }),
        downloadAndUnzipVSCode: async ({ reporter }) => {
          reporter.report({ stage: "resolvedVersion", version: "1.92.0" });
          return "mock-vscode";
        },
        runTests: async () => { throw new Error("launch must not run"); },
      },
      prepareWorkspace: () => { throw new Error("workspace must not materialize"); },
    });
  `;
  const result = spawnSync(process.execPath, ["--input-type=module", "--eval", source], {
    encoding: "utf8",
    windowsHide: true,
  });
  expect(result.status).not.toBe(0);
  return `${result.stdout}\n${result.stderr}`;
}

function writeContractFiles(root: string, files: Readonly<Record<string, string>>): void {
  for (const [relativePath, content] of Object.entries(files)) {
    const filePath = join(root, ...relativePath.split("/"));
    mkdirSync(dirname(filePath), { recursive: true });
    writeFileSync(filePath, content);
  }
}

function readStaticContractHash(root: string): string {
  const source = `
    const contract = await import(${JSON.stringify(pathToFileURL(staticContractPath).href)});
    console.log(contract.extensionHostStaticContractSha256(${JSON.stringify(root)}));
  `;
  const result = spawnSync(process.execPath, ["--input-type=module", "--eval", source], {
    encoding: "utf8",
    windowsHide: true,
  });
  expect(result.status).toBe(0);
  return result.stdout.trim();
}

function readStaticContractFailure(root: string): string {
  const source = `
    const contract = await import(${JSON.stringify(pathToFileURL(staticContractPath).href)});
    console.log(contract.extensionHostStaticContractSha256(${JSON.stringify(root)}));
  `;
  const result = spawnSync(process.execPath, ["--input-type=module", "--eval", source], {
    encoding: "utf8",
    windowsHide: true,
  });
  expect(result.status).not.toBe(0);
  return `${result.stdout}\n${result.stderr}`;
}

function assertContractTempPath(root: string): void {
  const resolvedRoot = resolve(root);
  const child = relative(resolve(contractTempRoot), resolvedRoot);
  expect(child.startsWith("..")).toBe(false);
  expect(isAbsolute(child)).toBe(false);
}

function normalize(value: string): string {
  const marker = ".temp/vscode-extension-host/";
  const normalized = value.replaceAll("\\", "/");
  const index = normalized.indexOf(marker);
  return index < 0 ? normalized : normalized.slice(index + marker.length);
}

function expectedStaticContractHash(root: string): string {
  const hash = createHash("sha256");
  hash.update(Buffer.from("aurelia-extension-host-static-contract/1\0", "utf8"));
  for (const relativePath of ["dist/extension.cjs", "dist/server/main.cjs", "package.json"]) {
    const pathBytes = Buffer.from(relativePath, "utf8");
    const contents = readFileSync(join(root, ...relativePath.split("/")));
    const pathLength = Buffer.alloc(4);
    pathLength.writeUInt32BE(pathBytes.length);
    const contentLength = Buffer.alloc(8);
    contentLength.writeBigUInt64BE(BigInt(contents.length));
    hash.update(pathLength);
    hash.update(pathBytes);
    hash.update(contentLength);
    hash.update(contents);
  }
  return hash.digest("hex");
}

function writeSyntheticFixture(root: string): {
  readonly shardRoot: string;
  readonly workspaceRoot: string;
  readonly sourceFixturesRoot: string;
  readonly sourceManifestPath: string;
} {
  const shardRoot = join(root, "minimum", "worker", "product-support");
  const workspaceRoot = join(shardRoot, "routed-catalog-storefront");
  const sourceFixturesRoot = join(root, "source-fixtures");
  const fixtureRoot = join(sourceFixturesRoot, "synthetic-pressure");
  const sourceManifestPath = join(root, "resource-discovery-host.json");
  writeContractFiles(fixtureRoot, {
    "package.json": "{\"name\":\"synthetic-resource-discovery\",\"private\":true}\n",
    "semantic-fixture.json": "{\"mustNotCopy\":true}\n",
    "src/app.ts": "export class App {}\n",
    "tsconfig.json": "{\"compilerOptions\":{\"strict\":true}}\n",
  });
  writeFileSync(sourceManifestPath, `${JSON.stringify({
    schemaVersion: "aurelia-resource-discovery-host-fixture/1",
    copyInputs: [{
      sourceFixture: "synthetic-pressure",
      include: ["package.json", "src/**", "tsconfig.json"],
      destination: ".",
    }],
    generatedInputs: [],
    projects: [{
      projectKey: "host-alpha",
      relativeRoot: ".",
      sourceInput: "supplied",
      relativeFiles: ["package.json", "src/app.ts", "tsconfig.json"],
      excludedRelativeRoots: [],
    }],
    witnesses: {
      copiedSource: {
        admission: "required",
        expectedProjectKey: "host-alpha",
        expectedRelativePath: "src/app.ts",
      },
    },
    lanePolicy: {
      requiredWorkerLanes: ["current-stable", "minimum"],
      minimumVersion: "1.91.0",
      authoritativeTransport: "worker",
      optionalTransports: ["ipc"],
      currentStableOnlyWitnesses: [],
    },
  }, null, 2)}\n`);
  return { shardRoot, workspaceRoot, sourceFixturesRoot, sourceManifestPath };
}

function mockProductSupportWorkspace(root: string) {
  return {
    shard: "product-support",
    aureliaWorkspace: join(root, "aurelia"),
    secondaryAureliaWorkspace: join(root, "secondary"),
    excludedAureliaWorkspace: join(root, "excluded"),
    plainTypeScriptWorkspace: join(root, "plain"),
    routedAureliaWorkspace: join(root, "routed"),
    resourceDiscoverySourceManifest: join(root, "resource-discovery-host.json"),
    resourceDiscoveryDescriptor: join(root, "routed", "semantic-workspace.json"),
    resourceDiscoveryFixtureManifest: join(root, "routed", "fixture-manifest.json"),
    resourceDiscoveryLedger: join(root, "routed", "resource-discovery.observations.jsonl"),
    resourceDiscoveryReport: join(root, "routed", "resource-discovery.acceptance.json"),
    testWorkspace: join(root, "workspace.code-workspace"),
    userDataDirectory: join(root, "profile", "user-data"),
    extensionsDirectory: join(root, "profile", "extensions"),
  };
}

interface MutableRunnerLedgerRecord {
  eventOrdinal: number;
  readonly event: Record<string, unknown>;
}

type RunnerQuickPickCurrentVariant =
  | "normal"
  | "wrong-current-token"
  | "wrong-publication-token"
  | "latest-wrong-token-with-older-match"
  | "missing-current-membership"
  | "duplicate-current-membership"
  | "missing-frame-start"
  | "duplicate-frame-start"
  | "duplicate-frame-complete"
  | "late-frame-node"
  | "noncontiguous-node-ordinal"
  | "wrong-frame-order"
  | "workspace-invalidation"
  | "all-invalidation"
  | "unrelated-invalidation"
  | "missing-fresh"
  | "duplicate-fresh"
  | "missing-revalidation"
  | "duplicate-revalidation"
  | "wrong-reproof-order";

function runnerPublicationNode(
  eventOrdinal: number,
  nodeId: string,
  workspaceIdentity: string,
  navigationFingerprint: string,
  implementationFingerprint: string | null,
): MutableRunnerLedgerRecord {
  return {
    eventOrdinal,
    event: {
      source: "resource-explorer",
      observationId: "resource-explorer:current",
      phase: "publish-node",
      generation: 7,
      publicationKind: "current",
      ordinal: nodeId === "unrelated" ? 0 : 1,
      parentId: null,
      nodeId,
      nodeKind: "resource",
      label: nodeId,
      description: "resource",
      accessibilityLabel: `Resource ${nodeId}`,
      contextValue: "resource",
      command: "aurelia.openResourceDeclaration",
      navigationWorkspaceIdentity: workspaceIdentity,
      navigationProjectKey: "app",
      navigationFingerprint,
      navigationResourceIdentity: `resource:${nodeId}`,
      navigationChildIdentity: null,
      navigationRole: "resource",
      navigationPlacement: "preview",
      implementationAvailable: implementationFingerprint != null,
      implementationWorkspaceIdentity: implementationFingerprint == null ? null : workspaceIdentity,
      implementationProjectKey: implementationFingerprint == null ? null : "app",
      implementationFingerprint,
      implementationResourceIdentity: implementationFingerprint == null ? null : `resource:${nodeId}`,
      implementationRole: implementationFingerprint == null ? null : "implementation",
      implementationPlacement: implementationFingerprint == null ? null : "preview",
      collapsible: false,
      defaultExpanded: false,
      rowStates: "",
      answerResult: "answered",
      answerCoverage: "complete",
      answerRowCount: 1,
    },
  };
}

function runnerPublication(
  eventOrdinal: number,
  observationId: string,
  generation: number,
  workspaceIdentity: string,
  fingerprint: string,
): MutableRunnerLedgerRecord {
  return {
    eventOrdinal,
    event: {
      source: "resource-explorer",
      observationId,
      phase: "publish-complete",
      generation,
      publicationKind: "current",
      workspaceIdentity,
      fingerprint,
      nodeCount: 2,
      rootCount: 2,
    },
  };
}

function runnerQuickPickCurrentEvidence(
  variant: RunnerQuickPickCurrentVariant = "normal",
) {
  const workspaceKey = "file:///workspace/routed";
  const workspaceIdentity = `workspace:${createHash("sha256").update(workspaceKey, "utf8").digest("hex")}`;
  const selectedProject = { projectKey: "app" };
  const selectedScope = {
    scopeIdentityKey: "scope:selected",
    rowCount: 2,
    selectableRowCount: 1,
    resourceIdentityKeys: ["resource:target", "resource:unavailable"],
  };
  const resourceIdentityDigest = runnerResourceIdentitySetSha256(selectedScope.resourceIdentityKeys);
  const flowObservationId = "go-to-available-resource:current";
  const navigationObservationId = "resource-navigation:current";
  const responseFingerprint = "epoch:request-14";
  const record = (event: Record<string, unknown>): MutableRunnerLedgerRecord => ({
    eventOrdinal: 0,
    event,
  });
  const publicationNode = (
    observationId: string,
    generation: number,
    fingerprint: string,
    nodeId = "target",
    resourceIdentity = "resource:target",
    ordinal = 0,
  ) => {
    const base = runnerPublicationNode(0, nodeId, workspaceIdentity, fingerprint, fingerprint);
    return record({
      ...base.event,
      observationId,
      generation,
      ordinal,
      navigationResourceIdentity: resourceIdentity,
      implementationResourceIdentity: resourceIdentity,
    });
  };
  const publicationStart = (
    observationId: string,
    generation: number,
    fingerprint: string,
    rootCount: number,
  ) => record({
    source: "resource-explorer",
    observationId,
    phase: "publish-start",
    generation,
    publicationKind: "current",
    workspaceIdentity,
    fingerprint,
    rootCount,
  });
  const publicationComplete = (
    observationId: string,
    generation: number,
    fingerprint: string,
    nodeCount: number,
  ) => record({
    source: "resource-explorer",
    observationId,
    phase: "publish-complete",
    generation,
    publicationKind: "current",
    workspaceIdentity,
    fingerprint,
    nodeCount,
    rootCount: nodeCount,
  });

  const baselineNode = publicationNode(
    "resource-explorer:baseline",
    4,
    "epoch:request-4",
  );
  const olderFingerprint = variant === "latest-wrong-token-with-older-match"
    ? responseFingerprint
    : "epoch:request-4";
  const olderStart = publicationStart("resource-explorer:older", 6, olderFingerprint, 1);
  const olderNode = publicationNode("resource-explorer:older", 6, olderFingerprint);
  const olderPublication = publicationComplete("resource-explorer:older", 6, olderFingerprint, 1);

  const currentNodeFingerprint = variant === "wrong-current-token"
    || variant === "latest-wrong-token-with-older-match"
    ? "epoch:request-13"
    : responseFingerprint;
  const currentPublicationFingerprint = variant === "wrong-publication-token"
    || variant === "latest-wrong-token-with-older-match"
    ? "epoch:request-13"
    : responseFingerprint;
  const currentNode = variant === "missing-current-membership"
    ? publicationNode(
        "resource-explorer:current",
        7,
        currentNodeFingerprint,
        "other",
        "resource:other",
      )
    : publicationNode(
        "resource-explorer:current",
        7,
        currentNodeFingerprint,
        "target",
        "resource:target",
        variant === "noncontiguous-node-ordinal" ? 1 : 0,
      );
  const duplicateCurrentNode = publicationNode(
    "resource-explorer:current",
    7,
    currentNodeFingerprint,
    "target-duplicate",
    "resource:target",
    1,
  );
  const currentNodes = variant === "duplicate-current-membership"
    ? [currentNode, duplicateCurrentNode]
    : [currentNode];
  const currentStart = publicationStart(
    "resource-explorer:current",
    7,
    currentPublicationFingerprint,
    currentNodes.length,
  );
  const duplicateCurrentStart = record({ ...currentStart.event });
  const currentPublication = publicationComplete(
    "resource-explorer:current",
    7,
    currentPublicationFingerprint,
    currentNodes.length,
  );
  const duplicateCurrentPublication = record({ ...currentPublication.event });
  const lateNode = publicationNode(
    "resource-explorer:current",
    7,
    currentNodeFingerprint,
    "late",
    "resource:late",
    currentNodes.length,
  );

  const response = record({
    source: "go-to-available-resource",
    observationId: flowObservationId,
    phase: "initial-request-response",
    answerResult: "answered",
    answerCoverage: "complete",
    answerSelection: "exact",
    projectSelection: "exact",
    templateSelection: "exact",
    selectedProjectKey: selectedProject.projectKey,
    selectedTemplateScopeIdentity: selectedScope.scopeIdentityKey,
    templateCandidateCount: 1,
    soleTemplateCandidateScopeIdentity: selectedScope.scopeIdentityKey,
    resourceIdentitySetSha256: resourceIdentityDigest,
    fingerprint: responseFingerprint,
    resourceCount: selectedScope.rowCount,
    count: selectedScope.selectableRowCount,
    status: "ready",
  });
  const ready = record({
    source: "resource-quick-pick",
    observationId: flowObservationId,
    phase: "model-ready",
    modelOrdinal: 5,
    itemCount: 1,
  });
  const selection = record({
    source: "go-to-available-resource",
    observationId: flowObservationId,
    phase: "availability-selection",
    selectionKind: "resource",
    projectKey: selectedProject.projectKey,
    templateScopeIdentity: selectedScope.scopeIdentityKey,
    resourceIdentity: "resource:target",
  });
  const freshResponse = record({
    source: "go-to-available-resource",
    observationId: flowObservationId,
    phase: "fresh-request-response",
    answerResult: "answered",
    answerCoverage: "complete",
    answerSelection: "exact",
    selectedProjectKey: selectedProject.projectKey,
    selectedTemplateScopeIdentity: selectedScope.scopeIdentityKey,
    templateCandidateCount: 1,
    soleTemplateCandidateScopeIdentity: selectedScope.scopeIdentityKey,
    resourceIdentitySetSha256: resourceIdentityDigest,
    fingerprint: responseFingerprint,
    count: selectedScope.rowCount,
    status: "available",
  });
  const duplicateFreshResponse = record({ ...freshResponse.event });
  const revalidation = record({
    source: "go-to-available-resource",
    observationId: flowObservationId,
    phase: "revalidation",
    fingerprint: responseFingerprint,
    editorUnchanged: true,
    outcome: "available",
    rowCount: selectedScope.rowCount,
  });
  const duplicateRevalidation = record({ ...revalidation.event });
  const navigationStart = record({
    source: "resource-navigation",
    observationId: navigationObservationId,
    phase: "start",
    requestedFingerprint: responseFingerprint,
    resourceIdentity: "resource:target",
    childIdentity: null,
    role: "resource",
    placement: "preview",
    workspaceKey,
    projectKey: selectedProject.projectKey,
  });
  const opened = record({
    source: "resource-navigation",
    observationId: navigationObservationId,
    phase: "opened",
    requestedFingerprint: responseFingerprint,
    currentFingerprint: responseFingerprint,
    resourceIdentity: "resource:target",
    childIdentity: null,
    role: "resource",
    placement: "preview",
  });
  const completed = record({
    source: "go-to-available-resource",
    observationId: flowObservationId,
    phase: "navigation-complete",
    status: "opened",
  });
  const invalidation = record({
    source: "resource-explorer-view",
    observationId: "resource-explorer-view:current",
    phase: "invalidation",
    scope: variant === "all-invalidation" ? "all" : "workspace",
    workspaceKey: variant === "unrelated-invalidation"
      ? "file:///workspace/unrelated"
      : workspaceKey,
  });

  const currentFrameStart = variant === "missing-frame-start"
    ? []
    : variant === "duplicate-frame-start"
      ? [currentStart, duplicateCurrentStart]
      : [currentStart];
  const currentFramePrefix = variant === "wrong-frame-order"
    ? [currentNode, ...currentFrameStart]
    : [...currentFrameStart, ...currentNodes];
  const completionRecords = variant === "duplicate-frame-complete"
    ? [currentPublication, duplicateCurrentPublication]
    : [currentPublication];
  const freshRecords = variant === "missing-fresh"
    ? []
    : variant === "duplicate-fresh"
      ? [freshResponse, duplicateFreshResponse]
      : [freshResponse];
  const revalidationRecords = variant === "missing-revalidation"
    ? []
    : variant === "duplicate-revalidation"
      ? [revalidation, duplicateRevalidation]
      : [revalidation];
  const reproofRecords = variant === "wrong-reproof-order"
    ? [...revalidationRecords, ...freshRecords]
    : [...freshRecords, ...revalidationRecords];
  const ledgerRecords = [
    olderStart,
    olderNode,
    olderPublication,
    ...currentFramePrefix,
    ...completionRecords,
    ...(variant === "late-frame-node" ? [lateNode] : []),
    ...(variant === "all-invalidation" ? [invalidation] : []),
    response,
    ready,
    selection,
    ...(variant === "workspace-invalidation" || variant === "unrelated-invalidation"
      ? [invalidation]
      : []),
    ...reproofRecords,
    navigationStart,
    opened,
    completed,
  ];
  for (const [index, ledgerRecord] of ledgerRecords.entries()) {
    ledgerRecord.eventOrdinal = index + 1;
  }
  return {
    resource: {
      fact: { selectedResourceIdentity: "resource:target" },
      response,
      ready,
      selection,
      opened,
      completed,
    },
    selectedProject,
    selectedScope,
    records: {
      baselineNode,
      olderPublication,
      currentNode,
      currentPublication: completionRecords.at(-1)!,
      freshResponse,
      revalidation,
      navigationStart,
    },
    context: {
      ledgerRecords,
      baseline: { nodes: [baselineNode] },
    },
  };
}

function runnerResourceIdentitySetSha256(identityKeys: readonly string[]): string {
  const sorted = [...identityKeys].sort((left, right) => left < right ? -1 : left > right ? 1 : 0);
  return createHash("sha256").update(Buffer.from(
    `aurelia-resource-identity-set/1\n${JSON.stringify(sorted)}`,
    "utf8",
  )).digest("hex");
}

function runnerLedgerReference(record: MutableRunnerLedgerRecord) {
  return {
    eventOrdinal: record.eventOrdinal,
    observationId: record.event.observationId,
    phase: record.event.phase,
  };
}

function runnerPredecessorRaceFact() {
  return {
    updatingInvalidated: null,
    updatingTarget: null,
    updatingUnrelated: null,
    updatingPublished: null,
    updatingState: null,
    blocked: null,
    invalidated: null,
    released: null,
    discarded: null,
    successorPublished: null,
    predecessorGeneration: 1,
    successorGeneration: 2,
    predecessorFingerprint: "epoch:old",
    successorFingerprint: "epoch:new",
    latePredecessorPublishCount: 0,
  };
}

function runnerUpdatingEvidence(
  variant:
    | "normal"
    | "duplicate-publication"
    | "alternate-publication"
    | "duplicate-state"
    | "alternate-state"
    | "out-of-order" = "normal",
) {
  const workspaceKey = "file:///workspace/routed";
  const workspaceIdentity = `workspace:${createHash("sha256").update(workspaceKey, "utf8").digest("hex")}`;
  const baselineUnrelated = runnerPublicationNode(100, "unrelated", "workspace:primary", "epoch:primary", null);
  const updatingInvalidatedEvent = {
    source: "resource-explorer-view",
    observationId: "resource-explorer-view:e1",
    phase: "invalidation",
    scope: "workspace",
    workspaceKey,
  };
  const updatingUnrelatedEvent = {
    ...baselineUnrelated.event,
    observationId: "resource-explorer:updating",
    generation: 52,
    publicationKind: "updating",
  };
  const updatingTargetEvent = {
    ...runnerPublicationNode(2, "target", workspaceIdentity, "epoch:routed", "epoch:routed").event,
    observationId: "resource-explorer:updating",
    generation: 52,
    publicationKind: "updating",
    navigationResourceIdentity: "resource:shifted",
    rowStates: "updating",
  };
  const updatingPublishedEvent = {
    source: "resource-explorer",
    observationId: "resource-explorer:updating",
    phase: "publish-complete",
    generation: 52,
    publicationKind: "updating",
    nodeCount: 2,
    rootCount: 2,
    workspaceIdentity,
    fingerprint: null,
  };
  const updatingStateEvent = {
    source: "resource-explorer",
    observationId: "resource-explorer:updating",
    phase: "view-state",
    generation: 52,
    state: "current",
    message: null,
    description: "2 known resources",
    hasIssues: true,
    updatingAll: false,
    updatingWorkspaceCount: 1,
    staleWorkspaceCount: 0,
  };
  const blockedEvent = {
    source: "resource-discovery-host-control",
    observationId: "c2-tree-predecessor",
    phase: "blocked",
    workspaceKey,
  };
  const invalidatedEvent = {
    source: "resource-explorer-view",
    observationId: "resource-explorer-view:e2",
    phase: "invalidation",
    scope: "workspace",
    workspaceKey,
  };
  const updatingEntries: [string, Record<string, unknown>][] = variant === "out-of-order"
    ? [
      ["updatingState", updatingStateEvent],
      ["updatingPublished", updatingPublishedEvent],
    ]
    : [
      ["updatingPublished", updatingPublishedEvent],
      ...(variant === "duplicate-publication"
        ? [["duplicatePublication", { ...updatingPublishedEvent }] as [string, Record<string, unknown>]]
        : []),
      ...(variant === "alternate-publication"
        ? [["alternatePublication", {
            ...updatingPublishedEvent,
            observationId: "resource-explorer:alternate-updating",
            generation: 53,
          }] as [string, Record<string, unknown>]]
        : []),
      ["updatingState", updatingStateEvent],
      ...(variant === "duplicate-state"
        ? [["duplicateState", { ...updatingStateEvent }] as [string, Record<string, unknown>]]
        : []),
      ...(variant === "alternate-state"
        ? [["alternateState", {
            ...updatingStateEvent,
            observationId: "resource-explorer:alternate-updating",
            generation: 53,
          }] as [string, Record<string, unknown>]]
        : []),
    ];
  const entries: [string, Record<string, unknown>][] = [
    ["updatingInvalidated", updatingInvalidatedEvent],
    ["updatingUnrelated", updatingUnrelatedEvent],
    ["updatingTarget", updatingTargetEvent],
    ...updatingEntries,
    ["blocked", blockedEvent],
    ["invalidated", invalidatedEvent],
  ];
  const ledgerRecords = entries.map(([, event], index) => ({ eventOrdinal: index + 1, event }));
  const recordsByName = new Map(entries.map(([name], index) => [name, ledgerRecords[index]]));
  const record = (name: string): MutableRunnerLedgerRecord => {
    const value = recordsByName.get(name);
    if (value == null) throw new Error(`Missing synthetic runner evidence '${name}'.`);
    return value;
  };
  const records = {
    updatingInvalidated: record("updatingInvalidated"),
    updatingUnrelated: record("updatingUnrelated"),
    updatingTarget: record("updatingTarget"),
    updatingPublished: record("updatingPublished"),
    updatingState: record("updatingState"),
    blocked: record("blocked"),
    invalidated: record("invalidated"),
  };
  const race = {
    ...runnerPredecessorRaceFact(),
    updatingInvalidated: runnerLedgerReference(records.updatingInvalidated),
    updatingTarget: runnerLedgerReference(records.updatingTarget),
    updatingUnrelated: runnerLedgerReference(records.updatingUnrelated),
    updatingPublished: runnerLedgerReference(records.updatingPublished),
    updatingState: runnerLedgerReference(records.updatingState),
    blocked: runnerLedgerReference(records.blocked),
    invalidated: runnerLedgerReference(records.invalidated),
  };
  return {
    ledgerRecords,
    records,
    race,
    context: {
      ledgerRecords,
      referencedOrdinals: new Set<number>(),
      baseline: { nodes: [baselineUnrelated] },
      fixture: {
        witnesses: {
          shiftedAndRemovedNavigation: { shifted: { identityKey: "resource:shifted" } },
        },
      },
    },
  };
}

function sha256File(path: string): string {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}
