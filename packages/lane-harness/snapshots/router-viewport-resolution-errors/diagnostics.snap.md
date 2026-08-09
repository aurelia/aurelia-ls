# router-viewport-resolution-errors diagnostics lane snapshot

Fixture: `packages/semantic-runtime/fixtures/pressure/router-viewport-resolution-errors`
Probe file: `packages/lane-harness/probes/router-viewport-resolution-errors.probes.json`
Lane: `diagnostics`

This snapshot records observed language-server behavior. Operator verdicts live in the probe data.

## router-load-side-only

### Probe

```json
{
  "file": "src/router-viewport-resolution-errors-app.html"
}
```

### textDocument/diagnostic — full pull

```json
{
  "diagnosticCount": 1,
  "diagnostics": [
    {
      "anomaly": null,
      "code": "AUR3174",
      "data": {
        "diagnosticAuthority": "framework-error-code",
        "diagnosticDomain": "router",
        "diagnosticKind": "no-available-viewport-agent",
        "frameworkErrorCode": "AUR3174",
        "frameworkRawErrorAuthority": null,
        "missingInput": "router:no-available-viewport-agent",
        "missingInputs": [
          "router:no-available-viewport-agent"
        ],
        "phase": "route-tree-viewport-resolution",
        "relatedInformation": [],
        "relatedQueryKind": "router-issues",
        "repairAffordance": {
          "actionKind": "rewrite-router-instruction",
          "actionability": "guided",
          "changeDomain": "app-source",
          "planKind": "router-instruction-rewrite",
          "readiness": "ready-to-plan",
          "targetSourceCoverage": "all"
        },
        "sourceRole": "template",
        "subject": null,
        "typeScriptDiagnosticCode": null
      },
      "message": "Failed to resolve ViewportRequest(viewport:'side',component:'side-only-route') from RouteContext 'router-viewport-resolution-errors-app'.",
      "range": {
        "end": {
          "character": 23,
          "line": 0
        },
        "start": {
          "character": 14,
          "line": 0
        }
      },
      "rangeText": "side-only",
      "relatedInformation": [],
      "severity": "error",
      "source": "aurelia"
    }
  ],
  "outcome": "full",
  "previousResultIdPresent": false,
  "resultIdPresent": true,
  "uri": "fixtures://pressure/router-viewport-resolution-errors/src/router-viewport-resolution-errors-app.html"
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
  "uri": "fixtures://pressure/router-viewport-resolution-errors/src/router-viewport-resolution-errors-app.html"
}
```
