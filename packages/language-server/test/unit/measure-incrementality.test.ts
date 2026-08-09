import { describe, expect, test } from "vitest";

interface IncrementalityMeasurementModule {
  readonly incrementalityMeasurementSchemaVersion: string;
  parseIncrementalityArgs(argv: readonly string[]): {
    readonly fixture: string | null;
    readonly workspace: string | null;
    readonly requests: number;
    readonly cycles: number;
    readonly journey: "completion-first" | "diagnostics-first";
    readonly forceGc: boolean;
    readonly heapSnapshots: string | null;
    readonly cpuProfiles: string | null;
    readonly json: boolean;
  };
  editJourneyCurrentness(input: {
    readonly expectedEditedDocument: DocumentEvidence;
    readonly expectedQueryDocument: DocumentEvidence;
    readonly previousGeneration: GenerationEvidence;
    readonly operations: readonly OperationEvidence[];
  }): {
    readonly status: "pass" | "fail";
    readonly requestEpochAdvanced: boolean;
    readonly queryDocumentCurrent: boolean;
    readonly editedDocumentCurrent: boolean;
    readonly sameGeneration: boolean;
  };
  editJourneyDistributions(journeys: readonly unknown[]): readonly {
    readonly kind: string;
    readonly operation: string;
    readonly samples: number;
    readonly min: number;
    readonly p50: number;
    readonly p90: number;
    readonly p95: number;
    readonly max: number;
  }[];
}

interface DocumentEvidence {
  readonly uri: string;
  readonly languageId: string;
  readonly version: number;
}

interface GenerationEvidence {
  readonly requestEpoch: number;
  readonly workspaceGeneration: number;
  readonly sourceWorldRevision: string;
  readonly fingerprint: string;
}

interface OperationEvidence {
  readonly document: DocumentEvidence;
  readonly editedDocument: DocumentEvidence;
  readonly generation: GenerationEvidence;
}

const scriptUrl = new URL(
  "../../scripts/measure-incrementality.mjs",
  import.meta.url,
).href;

async function loadMeasurementModule(): Promise<IncrementalityMeasurementModule> {
  return await import(scriptUrl) as unknown as IncrementalityMeasurementModule;
}

describe("incrementality measurement", () => {
  test("publishes a schema and defaults to the historical completion-first journey", async () => {
    const {
      incrementalityMeasurementSchemaVersion,
      parseIncrementalityArgs,
    } = await loadMeasurementModule();

    expect(incrementalityMeasurementSchemaVersion).toBe("aurelia-ls/incrementality/v1");
    expect(parseIncrementalityArgs([])).toEqual({
      fixture: null,
      workspace: null,
      requests: 20,
      cycles: 8,
      journey: "completion-first",
      forceGc: false,
      heapSnapshots: null,
      cpuProfiles: null,
      json: false,
    });
  });

  test("normalizes the diagnostics-first and forced-GC measurement arguments", async () => {
    const { parseIncrementalityArgs } = await loadMeasurementModule();

    expect(parseIncrementalityArgs([
      "--fixture=app-pattern-minimal-app",
      "--requests", "1",
      "--cycles=0",
      "--journey", "diagnostics-first",
      "--force-gc",
      "--heap-snapshots", "C:\\evidence\\heap",
      "--cpu-profiles=C:\\evidence\\cpu",
      "--json", "true",
    ])).toEqual({
      fixture: "app-pattern-minimal-app",
      workspace: null,
      requests: 1,
      cycles: 0,
      journey: "diagnostics-first",
      forceGc: true,
      heapSnapshots: "C:\\evidence\\heap",
      cpuProfiles: "C:\\evidence\\cpu",
      json: true,
    });
  });

  test.each([
    [["fixture"], "Unexpected positional argument"],
    [["--unknown"], "Unknown argument"],
    [["--fixture"], "requires a value"],
    [["--workspace="], "requires a non-empty value"],
    [["--requests", "0"], "must be a positive integer"],
    [["--cycles", "-1"], "must be a non-negative integer"],
    [["--cycles", "1.5"], "must be a non-negative integer"],
    [["--journey", "completion-and-diagnostics"], "must be 'completion-first' or 'diagnostics-first'"],
    [["--json", "sometimes"], "must be 'true' or 'false'"],
    [["--cycles", "1", "--cycles", "2"], "may only be supplied once"],
    [["--fixture", "small", "--workspace", "C:\\workspace"], "mutually exclusive"],
  ] as const)("rejects malformed argv %#", async (argv, message) => {
    const { parseIncrementalityArgs } = await loadMeasurementModule();

    expect(() => parseIncrementalityArgs(argv)).toThrow(message);
  });

  test("requires an advanced request epoch, current query and edited documents, and one exact generation", async () => {
    const { editJourneyCurrentness } = await loadMeasurementModule();
    const editedDocument = document("file:///workspace/src/state.ts", "typescript", 4);
    const queryDocument = document("file:///workspace/src/app.html", "html", 7);
    const previousGeneration = generation(10, "before");
    const currentGeneration = generation(11, "after");
    const operations = [
      { document: queryDocument, editedDocument, generation: currentGeneration },
      { document: queryDocument, editedDocument, generation: currentGeneration },
    ];

    expect(editJourneyCurrentness({
      expectedEditedDocument: editedDocument,
      expectedQueryDocument: queryDocument,
      previousGeneration,
      operations,
    })).toMatchObject({
      status: "pass",
      requestEpochAdvanced: true,
      queryDocumentCurrent: true,
      editedDocumentCurrent: true,
      sameGeneration: true,
    });

    expect(editJourneyCurrentness({
      expectedEditedDocument: editedDocument,
      expectedQueryDocument: queryDocument,
      previousGeneration,
      operations: [
        operations[0],
        {
          document: { ...queryDocument, version: 6 },
          editedDocument,
          generation: generation(12, "later"),
        },
      ],
    })).toMatchObject({
      status: "fail",
      queryDocumentCurrent: false,
      sameGeneration: false,
    });

    expect(editJourneyCurrentness({
      expectedEditedDocument: editedDocument,
      expectedQueryDocument: queryDocument,
      previousGeneration,
      operations: [
        operations[0],
        {
          ...operations[1],
          editedDocument: { ...editedDocument, version: editedDocument.version - 1 },
        },
      ],
    })).toMatchObject({
      status: "fail",
      requestEpochAdvanced: true,
      queryDocumentCurrent: true,
      editedDocumentCurrent: false,
      sameGeneration: true,
    });
  });

  test("aggregates diagnostics-first rows without inventing completion samples", async () => {
    const { editJourneyDistributions } = await loadMeasurementModule();
    const journeys = [1, 2, 3, 4, 100].map((milliseconds) => ({
      kind: "html",
      firstDiagnostics: { elapsedMilliseconds: milliseconds },
      warmDiagnostics: { elapsedMilliseconds: milliseconds / 2 },
    }));

    expect(editJourneyDistributions(journeys)).toEqual([
      {
        kind: "html",
        operation: "first diagnostics",
        samples: 5,
        min: 1,
        p50: 3,
        p90: 100,
        p95: 100,
        max: 100,
      },
      {
        kind: "html",
        operation: "warm diagnostics",
        samples: 5,
        min: 0.5,
        p50: 1.5,
        p90: 50,
        p95: 50,
        max: 50,
      },
    ]);
  });
});

function document(uri: string, languageId: string, version: number): DocumentEvidence {
  return { uri, languageId, version };
}

function generation(requestEpoch: number, fingerprint: string): GenerationEvidence {
  return {
    requestEpoch,
    workspaceGeneration: 0,
    sourceWorldRevision: "source-world",
    fingerprint,
  };
}
