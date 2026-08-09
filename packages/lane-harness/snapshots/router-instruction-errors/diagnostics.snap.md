# router-instruction-errors diagnostics lane snapshot

Fixture: `packages/semantic-runtime/fixtures/pressure/router-instruction-errors`
Probe file: `packages/lane-harness/probes/router-instruction-errors.probes.json`
Lane: `diagnostics`

This snapshot records observed language-server behavior. Operator verdicts live in the probe data.

## router-load-missing-route

### Probe

```json
{
  "file": "src/router-instruction-errors-app.html"
}
```

### textDocument/diagnostic — full pull

```json
{
  "diagnosticCount": 4,
  "diagnostics": [
    {
      "anomaly": null,
      "code": "AUR3401",
      "data": {
        "diagnosticAuthority": "framework-error-code",
        "diagnosticDomain": "router",
        "diagnosticKind": "instruction-no-fallback",
        "frameworkErrorCode": "AUR3401",
        "frameworkRawErrorAuthority": null,
        "missingInput": "router:instruction-no-fallback",
        "missingInputs": [
          "router:instruction-no-fallback"
        ],
        "phase": "route-recognition",
        "presentation": {
          "contextual": [],
          "maxRawSeverity": "error",
          "primarySeverity": "error",
          "rawRowCount": 1
        },
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
      "message": "Neither the route 'missing-route' matched any configured route nor is a fallback configured for the active route context.",
      "range": {
        "end": {
          "character": 27,
          "line": 0
        },
        "start": {
          "character": 14,
          "line": 0
        }
      },
      "rangeText": "missing-route",
      "relatedInformation": [],
      "severity": "error",
      "source": "aurelia"
    },
    {
      "anomaly": null,
      "code": "AUR3400",
      "data": {
        "diagnosticAuthority": "framework-error-code",
        "diagnosticDomain": "router",
        "diagnosticKind": "invalid-instruction",
        "frameworkErrorCode": "AUR3400",
        "frameworkRawErrorAuthority": null,
        "missingInput": "router:invalid-instruction",
        "missingInputs": [
          "router:invalid-instruction"
        ],
        "phase": "typed-navigation-instruction-creation",
        "presentation": {
          "contextual": [],
          "maxRawSeverity": "error",
          "primarySeverity": "error",
          "rawRowCount": 1
        },
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
      "message": "Invalid load router instruction value 'number'; expected a route string, routeable component, or viewport instruction.",
      "range": {
        "end": {
          "character": 21,
          "line": 2
        },
        "start": {
          "character": 19,
          "line": 2
        }
      },
      "rangeText": "42",
      "relatedInformation": [],
      "severity": "error",
      "source": "aurelia"
    },
    {
      "anomaly": null,
      "code": "AUR3500",
      "data": {
        "diagnosticAuthority": "framework-error-code",
        "diagnosticDomain": "router",
        "diagnosticKind": "route-expression-unexpected-segment",
        "frameworkErrorCode": "AUR3500",
        "frameworkRawErrorAuthority": null,
        "missingInput": "router:route-expression-unexpected-segment",
        "missingInputs": [
          "router:route-expression-unexpected-segment"
        ],
        "phase": "route-expression-parsing",
        "presentation": {
          "contextual": [],
          "maxRawSeverity": "error",
          "primarySeverity": "error",
          "rawRowCount": 1
        },
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
      "message": "Expected component name at route-expression offset 1 of '(', but got ''.",
      "range": {
        "end": {
          "character": 15,
          "line": 3
        },
        "start": {
          "character": 14,
          "line": 3
        }
      },
      "rangeText": "(",
      "relatedInformation": [],
      "severity": "error",
      "source": "aurelia"
    },
    {
      "anomaly": null,
      "code": "AUR3501",
      "data": {
        "diagnosticAuthority": "framework-error-code",
        "diagnosticDomain": "router",
        "diagnosticKind": "route-expression-not-done",
        "frameworkErrorCode": "AUR3501",
        "frameworkRawErrorAuthority": null,
        "missingInput": "router:route-expression-not-done",
        "missingInputs": [
          "router:route-expression-not-done"
        ],
        "phase": "route-expression-parsing",
        "presentation": {
          "contextual": [],
          "maxRawSeverity": "error",
          "primarySeverity": "error",
          "rawRowCount": 1
        },
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
      "message": "Unexpected ')' at route-expression offset 5 of 'known)'.",
      "range": {
        "end": {
          "character": 20,
          "line": 4
        },
        "start": {
          "character": 14,
          "line": 4
        }
      },
      "rangeText": "known)",
      "relatedInformation": [],
      "severity": "error",
      "source": "aurelia"
    }
  ],
  "outcome": "full",
  "previousResultIdPresent": false,
  "resultIdPresent": true,
  "uri": "fixtures://pressure/router-instruction-errors/src/router-instruction-errors-app.html"
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
  "uri": "fixtures://pressure/router-instruction-errors/src/router-instruction-errors-app.html"
}
```
