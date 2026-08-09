# typescript-project-diagnostics diagnostics lane snapshot

Fixture: `packages/semantic-runtime/fixtures/pressure/typescript-project-diagnostics`
Probe file: `packages/lane-harness/probes/typescript-project-diagnostics.probes.json`
Lane: `diagnostics`

This snapshot records observed language-server behavior. Operator verdicts live in the probe data.

## typescript-state-source-file

### Probe

```json
{
  "file": "src/typescript-project-diagnostics-state.ts"
}
```

### textDocument/diagnostic — full pull

```json
{
  "diagnosticCount": 2,
  "diagnostics": [
    {
      "anomaly": null,
      "code": "TS2322",
      "data": {
        "diagnosticAuthority": "typescript",
        "diagnosticDomain": "typescript",
        "diagnosticKind": "TS2322",
        "frameworkErrorCode": null,
        "frameworkRawErrorAuthority": null,
        "missingInput": null,
        "missingInputs": [],
        "phase": "semantic",
        "relatedInformation": [],
        "relatedQueryKind": "typescript-diagnostics",
        "repairAffordance": {
          "actionKind": "inspect-type-surface",
          "actionability": "manual",
          "changeDomain": "inspection",
          "planKind": "manual-inspection",
          "readiness": "inspection-required",
          "targetSourceCoverage": "not-applicable"
        },
        "sourceRole": "app-source",
        "subject": null,
        "typeScriptDiagnosticCode": 2322
      },
      "message": "Type 'number' is not assignable to type 'string'.",
      "range": {
        "end": {
          "character": 18,
          "line": 1
        },
        "start": {
          "character": 11,
          "line": 1
        }
      },
      "rangeText": "summary",
      "relatedInformation": [],
      "severity": "error",
      "source": "typescript"
    },
    {
      "anomaly": null,
      "code": "TS2769",
      "data": {
        "diagnosticAuthority": "typescript",
        "diagnosticDomain": "typescript",
        "diagnosticKind": "TS2769",
        "frameworkErrorCode": null,
        "frameworkRawErrorAuthority": null,
        "missingInput": null,
        "missingInputs": [],
        "phase": "semantic",
        "relatedInformation": [],
        "relatedQueryKind": "typescript-diagnostics",
        "repairAffordance": {
          "actionKind": "inspect-type-surface",
          "actionability": "manual",
          "changeDomain": "inspection",
          "planKind": "manual-inspection",
          "readiness": "inspection-required",
          "targetSourceCoverage": "not-applicable"
        },
        "sourceRole": "app-source",
        "subject": null,
        "typeScriptDiagnosticCode": 2769
      },
      "message": "No overload matches this call.\nOverload 1 of 2, '(type: \"click\", listener: (this: Document, ev: PointerEvent) => any, options?: boolean | AddEventListenerOptions | undefined): void', gave the following error.\nArgument of type 'number' is not assignable to parameter of type '(this: Document, ev: PointerEvent) => any'.\nOverload 2 of 2, '(type: string, listener: EventListenerOrEventListenerObject, options?: boolean | AddEventListenerOptions | undefined): void', gave the following error.\nArgument of type 'number' is not assignable to parameter of type 'EventListenerOrEventListenerObject'.",
      "range": {
        "end": {
          "character": 42,
          "line": 4
        },
        "start": {
          "character": 39,
          "line": 4
        }
      },
      "rangeText": "123",
      "relatedInformation": [],
      "severity": "error",
      "source": "typescript"
    }
  ],
  "outcome": "full",
  "previousResultIdPresent": false,
  "resultIdPresent": true,
  "uri": "fixtures://pressure/typescript-project-diagnostics/src/typescript-project-diagnostics-state.ts"
}
```

### textDocument/diagnostic — previousResultId reuse

```json
{
  "diagnosticCount": null,
  "diagnostics": [],
  "matchesPreviousResultId": true,
  "outcome": "unchanged",
  "previousResultIdPresent": true,
  "resultIdPresent": true,
  "uri": "fixtures://pressure/typescript-project-diagnostics/src/typescript-project-diagnostics-state.ts"
}
```

## typescript-related-information-cross-file

### Probe

```json
{
  "file": "src/typescript-related-information.ts"
}
```

### textDocument/diagnostic — full pull

```json
{
  "diagnosticCount": 1,
  "diagnostics": [
    {
      "anomaly": null,
      "code": "TS2741",
      "data": {
        "diagnosticAuthority": "typescript",
        "diagnosticDomain": "typescript",
        "diagnosticKind": "TS2741",
        "frameworkErrorCode": null,
        "frameworkRawErrorAuthority": null,
        "missingInput": null,
        "missingInputs": [],
        "phase": "semantic",
        "relatedInformation": [
          {
            "code": "TS2728",
            "message": "'requiredName' is declared here.",
            "source": {
              "end": 57,
              "kind": "typescript-diagnostic",
              "label": "repo:///packages/semantic-runtime/fixtures/pressure/typescript-project-diagnostics/src/diagnostic-contract.ts@45..57",
              "path": "repo:///packages/semantic-runtime/fixtures/pressure/typescript-project-diagnostics/src/diagnostic-contract.ts",
              "role": "line:1:character:2",
              "start": 45
            },
            "sourceRole": "app-source"
          }
        ],
        "relatedQueryKind": "typescript-diagnostics",
        "repairAffordance": {
          "actionKind": "inspect-type-surface",
          "actionability": "manual",
          "changeDomain": "inspection",
          "planKind": "manual-inspection",
          "readiness": "inspection-required",
          "targetSourceCoverage": "not-applicable"
        },
        "sourceRole": "app-source",
        "subject": null,
        "typeScriptDiagnosticCode": 2741
      },
      "message": "Property 'requiredName' is missing in type '{}' but required in type 'RequiredProjectContract'.",
      "range": {
        "end": {
          "character": 32,
          "line": 2
        },
        "start": {
          "character": 13,
          "line": 2
        }
      },
      "rangeText": "relatedInfoContract",
      "relatedInformation": [
        {
          "anomaly": null,
          "file": "src/diagnostic-contract.ts",
          "message": "'requiredName' is declared here.",
          "range": {
            "end": {
              "character": 14,
              "line": 1
            },
            "start": {
              "character": 2,
              "line": 1
            }
          },
          "rangeText": "requiredName",
          "uri": "fixtures://pressure/typescript-project-diagnostics/src/diagnostic-contract.ts"
        }
      ],
      "severity": "error",
      "source": "typescript"
    }
  ],
  "outcome": "full",
  "previousResultIdPresent": false,
  "resultIdPresent": true,
  "uri": "fixtures://pressure/typescript-project-diagnostics/src/typescript-related-information.ts"
}
```

### textDocument/diagnostic — previousResultId reuse

```json
{
  "diagnosticCount": null,
  "diagnostics": [],
  "matchesPreviousResultId": true,
  "outcome": "unchanged",
  "previousResultIdPresent": true,
  "resultIdPresent": true,
  "uri": "fixtures://pressure/typescript-project-diagnostics/src/typescript-related-information.ts"
}
```
