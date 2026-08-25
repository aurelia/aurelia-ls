# template-overlay-value-converter diagnostics lane snapshot

Fixture: `packages/semantic-runtime/fixtures/pressure/template-overlay-value-converter`
Probe file: `packages/lane-harness/probes/template-overlay-value-converter.probes.json`
Lane: `diagnostics`

This snapshot records observed language-server behavior. Operator verdicts live in the probe data.

## overlay-value-converter-template

### Probe

```json
{
  "file": "src/template-overlay-value-converter-app.html"
}
```

### textDocument/diagnostic — full pull

```json
{
  "diagnosticCount": 1,
  "diagnostics": [
    {
      "anomaly": null,
      "code": "TS2345",
      "data": {
        "diagnosticAuthority": "typescript",
        "diagnosticDomain": "template",
        "diagnosticKind": "template-expression-typescript-diagnostic",
        "frameworkErrorCode": null,
        "frameworkRawErrorAuthority": null,
        "missingInput": "typescript:TS2345",
        "missingInputs": [
          "typescript:TS2345"
        ],
        "phase": "semantic",
        "presentation": {
          "contextual": [],
          "maxRawSeverity": "error",
          "primarySeverity": "error",
          "rawRowCount": 1
        },
        "relatedInformation": [],
        "relatedQueryKind": "template-diagnostics",
        "repairAffordance": {
          "actionKind": "inspect-type-surface",
          "actionability": "manual",
          "changeDomain": "inspection",
          "planKind": "manual-inspection",
          "readiness": "inspection-required",
          "targetSourceCoverage": "all"
        },
        "sourceRole": "template",
        "subject": {
          "source": {
            "end": 94,
            "kind": "source-span-address",
            "label": "src/template-overlay-value-converter-app.html@83..94",
            "path": "src/template-overlay-value-converter-app.html",
            "role": "typescript-overlay:semantic",
            "start": 83
          },
          "span": null,
          "subjectKind": "template-expression",
          "uri": null
        },
        "typeScriptDiagnosticCode": 2345
      },
      "message": "TS2345: Argument of type 'string' is not assignable to parameter of type 'number'.",
      "range": {
        "end": {
          "character": 38,
          "line": 2
        },
        "start": {
          "character": 27,
          "line": 2
        }
      },
      "rangeText": "minimumText",
      "relatedInformation": [],
      "severity": "error",
      "source": "aurelia"
    }
  ],
  "outcome": "full",
  "previousResultIdPresent": false,
  "resultIdPresent": true,
  "uri": "fixtures://pressure/template-overlay-value-converter/src/template-overlay-value-converter-app.html"
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
  "uri": "fixtures://pressure/template-overlay-value-converter/src/template-overlay-value-converter-app.html"
}
```
