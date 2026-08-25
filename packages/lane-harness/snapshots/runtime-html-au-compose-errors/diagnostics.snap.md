# runtime-html-au-compose-errors diagnostics lane snapshot

Fixture: `packages/semantic-runtime/fixtures/pressure/runtime-html-au-compose-errors`
Probe file: `packages/lane-harness/probes/runtime-html-au-compose-errors.probes.json`
Lane: `diagnostics`

This snapshot records observed language-server behavior. Operator verdicts live in the probe data.

## runtime-controller-au-compose-template

### Probe

```json
{
  "file": "src/runtime-html-au-compose-errors-app.html"
}
```

### textDocument/diagnostic — full pull

```json
{
  "diagnosticCount": 3,
  "diagnostics": [
    {
      "anomaly": null,
      "code": "AUR0805",
      "data": {
        "diagnosticAuthority": "framework-error-code",
        "diagnosticDomain": "template",
        "diagnosticKind": "runtime-controller-framework-error",
        "frameworkErrorCode": "AUR0805",
        "frameworkRawErrorAuthority": null,
        "missingInput": "runtime-controller:AUR0805",
        "missingInputs": [
          "runtime-controller:AUR0805"
        ],
        "phase": "bindable-set",
        "presentation": {
          "contextual": [],
          "maxRawSeverity": "error",
          "primarySeverity": "error",
          "rawRowCount": 1
        },
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
      "message": "Invalid au-compose scopeBehavior value \"global\". Expected \"scoped\" or \"auto\".",
      "range": {
        "end": {
          "character": 34,
          "line": 0
        },
        "start": {
          "character": 28,
          "line": 0
        }
      },
      "rangeText": "global",
      "relatedInformation": [],
      "severity": "error",
      "source": "aurelia"
    },
    {
      "anomaly": null,
      "code": "AUR0809",
      "data": {
        "diagnosticAuthority": "framework-error-code",
        "diagnosticDomain": "template",
        "diagnosticKind": "runtime-controller-framework-error",
        "frameworkErrorCode": "AUR0809",
        "frameworkRawErrorAuthority": null,
        "missingInput": "runtime-controller:AUR0809",
        "missingInputs": [
          "runtime-controller:AUR0809"
        ],
        "phase": "bindable-set",
        "presentation": {
          "contextual": [],
          "maxRawSeverity": "error",
          "primarySeverity": "error",
          "rawRowCount": 1
        },
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
      "message": "Invalid au-compose flushMode value \"deferred\". Expected \"sync\" or \"async\".",
      "range": {
        "end": {
          "character": 56,
          "line": 0
        },
        "start": {
          "character": 48,
          "line": 0
        }
      },
      "rangeText": "deferred",
      "relatedInformation": [],
      "severity": "error",
      "source": "aurelia"
    },
    {
      "anomaly": null,
      "code": "AUR0806",
      "data": {
        "diagnosticAuthority": "framework-error-code",
        "diagnosticDomain": "template",
        "diagnosticKind": "runtime-controller-framework-error",
        "frameworkErrorCode": "AUR0806",
        "frameworkRawErrorAuthority": null,
        "missingInput": "runtime-controller:AUR0806",
        "missingInputs": [
          "runtime-controller:AUR0806"
        ],
        "phase": "composition-component-lookup",
        "presentation": {
          "contextual": [],
          "maxRawSeverity": "error",
          "primarySeverity": "error",
          "rawRowCount": 1
        },
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
      "message": "No au-compose custom element named \"missing-widget\" is registered in the construction hydration context container.",
      "range": {
        "end": {
          "character": 37,
          "line": 1
        },
        "start": {
          "character": 23,
          "line": 1
        }
      },
      "rangeText": "missing-widget",
      "relatedInformation": [],
      "severity": "error",
      "source": "aurelia"
    }
  ],
  "outcome": "full",
  "previousResultIdPresent": false,
  "resultIdPresent": true,
  "uri": "fixtures://pressure/runtime-html-au-compose-errors/src/runtime-html-au-compose-errors-app.html"
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
  "uri": "fixtures://pressure/runtime-html-au-compose-errors/src/runtime-html-au-compose-errors-app.html"
}
```
