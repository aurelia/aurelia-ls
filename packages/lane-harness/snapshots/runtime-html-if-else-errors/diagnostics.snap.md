# runtime-html-if-else-errors diagnostics lane snapshot

Fixture: `packages/semantic-runtime/fixtures/pressure/runtime-html-if-else-errors`
Probe file: `packages/lane-harness/probes/runtime-html-if-else-errors.probes.json`
Lane: `diagnostics`

This snapshot records observed language-server behavior. Operator verdicts live in the probe data.

## runtime-controller-if-else-template

### Probe

```json
{
  "file": "src/runtime-html-if-else-errors-app.html"
}
```

### textDocument/diagnostic — full pull

```json
{
  "diagnosticCount": 1,
  "diagnostics": [
    {
      "anomaly": null,
      "code": "AUR0810",
      "data": {
        "diagnosticAuthority": "framework-error-code",
        "diagnosticDomain": "template",
        "diagnosticKind": "runtime-controller-framework-error",
        "frameworkErrorCode": "AUR0810",
        "frameworkRawErrorAuthority": null,
        "missingInput": "runtime-controller:AUR0810",
        "missingInputs": [
          "runtime-controller:AUR0810"
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
      "message": "Aurelia runtime controller AUR0810 rejects this controller input: Invalid [else] usage. The previous controller sibling is not [if]..",
      "range": {
        "end": {
          "character": 14,
          "line": 0
        },
        "start": {
          "character": 10,
          "line": 0
        }
      },
      "rangeText": "else",
      "relatedInformation": [],
      "severity": "error",
      "source": "aurelia"
    }
  ],
  "outcome": "full",
  "previousResultIdPresent": false,
  "resultIdPresent": true,
  "uri": "fixtures://pressure/runtime-html-if-else-errors/src/runtime-html-if-else-errors-app.html"
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
  "uri": "fixtures://pressure/runtime-html-if-else-errors/src/runtime-html-if-else-errors-app.html"
}
```
