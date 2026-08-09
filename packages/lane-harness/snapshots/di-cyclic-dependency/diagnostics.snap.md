# di-cyclic-dependency diagnostics lane snapshot

Fixture: `packages/semantic-runtime/fixtures/pressure/di-cyclic-dependency`
Probe file: `packages/lane-harness/probes/di-cyclic-dependency.probes.json`
Lane: `diagnostics`

This snapshot records observed language-server behavior. Operator verdicts live in the probe data.

## di-cyclic-main-source

### Probe

```json
{
  "file": "src/main.ts"
}
```

### textDocument/diagnostic — full pull

```json
{
  "diagnosticCount": 1,
  "diagnostics": [
    {
      "anomaly": null,
      "code": "AUR0003",
      "data": {
        "diagnosticAuthority": "framework-error-code",
        "diagnosticDomain": "di",
        "diagnosticKind": "cyclic-dependency",
        "frameworkErrorCode": "AUR0003",
        "frameworkRawErrorAuthority": null,
        "missingInput": null,
        "missingInputs": [],
        "phase": "dependency-cycle-analysis",
        "relatedInformation": [],
        "relatedQueryKind": "di-issues",
        "repairAffordance": {
          "actionKind": "inspect-type-surface",
          "actionability": "manual",
          "changeDomain": "inspection",
          "planKind": "manual-inspection",
          "readiness": "inspection-required",
          "targetSourceCoverage": "not-applicable"
        },
        "sourceRole": "app-source",
        "subject": {
          "source": {
            "end": 593,
            "kind": "source-span-address",
            "label": "src/main.ts@564..593",
            "path": "src/main.ts",
            "role": "primary",
            "start": 564
          },
          "span": null,
          "subjectKind": "dependency-cycle",
          "uri": null
        },
        "typeScriptDiagnosticCode": null
      },
      "message": "Aurelia singleton resolver activation would re-enter \"IFoo\" before construction completes (IFoo->IFoo).",
      "range": {
        "end": {
          "character": 29,
          "line": 17
        },
        "start": {
          "character": 0,
          "line": 17
        }
      },
      "rangeText": "reexportedContainer.get(IFoo)",
      "relatedInformation": [],
      "severity": "error",
      "source": "aurelia"
    }
  ],
  "outcome": "full",
  "previousResultIdPresent": false,
  "resultIdPresent": true,
  "uri": "fixtures://pressure/di-cyclic-dependency/src/main.ts"
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
  "uri": "fixtures://pressure/di-cyclic-dependency/src/main.ts"
}
```
