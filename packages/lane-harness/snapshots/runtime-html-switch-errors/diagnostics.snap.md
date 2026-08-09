# runtime-html-switch-errors diagnostics lane snapshot

Fixture: `packages/semantic-runtime/fixtures/pressure/runtime-html-switch-errors`
Probe file: `packages/lane-harness/probes/runtime-html-switch-errors.probes.json`
Lane: `diagnostics`

This snapshot records observed language-server behavior. Operator verdicts live in the probe data.

## runtime-controller-switch-template

### Probe

```json
{
  "file": "src/runtime-html-switch-errors-app.html"
}
```

### textDocument/diagnostic — full pull

```json
{
  "diagnosticCount": 2,
  "diagnostics": [
    {
      "anomaly": null,
      "code": "AUR0815",
      "data": {
        "diagnosticAuthority": "framework-error-code",
        "diagnosticDomain": "template",
        "diagnosticKind": "runtime-controller-framework-error",
        "frameworkErrorCode": "AUR0815",
        "frameworkRawErrorAuthority": null,
        "missingInput": "runtime-controller:AUR0815",
        "missingInputs": [
          "runtime-controller:AUR0815"
        ],
        "phase": "template-controller-link",
        "relatedInformation": [],
        "relatedQueryKind": "template-diagnostics",
        "repairAffordance": {
          "actionKind": "rewrite-template-syntax",
          "actionability": "guided",
          "changeDomain": "app-source",
          "planKind": "template-syntax-rewrite",
          "readiness": "ready-to-plan",
          "targetSourceCoverage": "all"
        },
        "sourceRole": "template",
        "subject": null,
        "typeScriptDiagnosticCode": null
      },
      "message": "Aurelia runtime controller AUR0815 rejects this controller input: Invalid [case] usage. The parent [switch] controller was not found..",
      "range": {
        "end": {
          "character": 20,
          "line": 0
        },
        "start": {
          "character": 5,
          "line": 0
        }
      },
      "rangeText": "case=\"'orphan'\"",
      "relatedInformation": [],
      "severity": "error",
      "source": "aurelia"
    },
    {
      "anomaly": null,
      "code": "AUR0816",
      "data": {
        "diagnosticAuthority": "framework-error-code",
        "diagnosticDomain": "template",
        "diagnosticKind": "runtime-controller-framework-error",
        "frameworkErrorCode": "AUR0816",
        "frameworkRawErrorAuthority": null,
        "missingInput": "runtime-controller:AUR0816",
        "missingInputs": [
          "runtime-controller:AUR0816"
        ],
        "phase": "template-controller-link",
        "relatedInformation": [],
        "relatedQueryKind": "template-diagnostics",
        "repairAffordance": {
          "actionKind": "rewrite-template-syntax",
          "actionability": "guided",
          "changeDomain": "app-source",
          "planKind": "template-syntax-rewrite",
          "readiness": "ready-to-plan",
          "targetSourceCoverage": "all"
        },
        "sourceRole": "template",
        "subject": null,
        "typeScriptDiagnosticCode": null
      },
      "message": "Aurelia runtime controller AUR0816 rejects this controller input: Invalid [default-case] usage. Multiple default-case controllers are linked to the same [switch]..",
      "range": {
        "end": {
          "character": 24,
          "line": 5
        },
        "start": {
          "character": 12,
          "line": 5
        }
      },
      "rangeText": "default-case",
      "relatedInformation": [],
      "severity": "error",
      "source": "aurelia"
    }
  ],
  "outcome": "full",
  "previousResultIdPresent": false,
  "resultIdPresent": true,
  "uri": "fixtures://pressure/runtime-html-switch-errors/src/runtime-html-switch-errors-app.html"
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
  "uri": "fixtures://pressure/runtime-html-switch-errors/src/runtime-html-switch-errors-app.html"
}
```
