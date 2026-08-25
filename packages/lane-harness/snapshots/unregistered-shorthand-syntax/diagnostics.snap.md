# unregistered-shorthand-syntax diagnostics lane snapshot

Fixture: `packages/semantic-runtime/fixtures/pressure/unregistered-shorthand-syntax`
Probe file: `packages/lane-harness/probes/unregistered-shorthand-syntax.probes.json`
Lane: `diagnostics`

This snapshot records observed language-server behavior. Operator verdicts live in the probe data.

## unregistered-shorthand-syntax-template

### Probe

```json
{
  "file": "src/unregistered-shorthand-syntax-app.html"
}
```

### textDocument/diagnostic — full pull

```json
{
  "diagnosticCount": 2,
  "diagnostics": [
    {
      "anomaly": null,
      "code": "framework-capability-not-registered",
      "data": {
        "diagnosticAuthority": "semantic-authoring-policy",
        "diagnosticDomain": "template",
        "diagnosticKind": "framework-capability-not-registered",
        "frameworkErrorCode": null,
        "frameworkRawErrorAuthority": null,
        "missingInput": "runtime-html.short-hand-binding-syntax",
        "missingInputs": [
          "runtime-html.short-hand-binding-syntax"
        ],
        "phase": null,
        "presentation": {
          "contextual": [],
          "maxRawSeverity": "error",
          "primarySeverity": "error",
          "rawRowCount": 1
        },
        "relatedInformation": [],
        "relatedQueryKind": "template-diagnostics",
        "repairAffordance": {
          "actionKind": "register-framework-capability",
          "actionability": "guided",
          "changeDomain": "app-source",
          "planKind": "framework-capability-registration",
          "readiness": "source-edit-policy-open",
          "targetSourceCoverage": "all"
        },
        "sourceRole": "template",
        "subject": null,
        "typeScriptDiagnosticCode": null
      },
      "message": "Attribute \":value\" uses Aurelia shorthand binding syntax, but that framework capability is not registered in this app world.",
      "range": {
        "end": {
          "character": 21,
          "line": 0
        },
        "start": {
          "character": 7,
          "line": 0
        }
      },
      "rangeText": ":value=\"value\"",
      "relatedInformation": [],
      "severity": "error",
      "source": "aurelia"
    },
    {
      "anomaly": null,
      "code": "framework-capability-not-registered",
      "data": {
        "diagnosticAuthority": "semantic-authoring-policy",
        "diagnosticDomain": "template",
        "diagnosticKind": "framework-capability-not-registered",
        "frameworkErrorCode": null,
        "frameworkRawErrorAuthority": null,
        "missingInput": "runtime-html.short-hand-binding-syntax",
        "missingInputs": [
          "runtime-html.short-hand-binding-syntax"
        ],
        "phase": null,
        "presentation": {
          "contextual": [],
          "maxRawSeverity": "error",
          "primarySeverity": "error",
          "rawRowCount": 1
        },
        "relatedInformation": [],
        "relatedQueryKind": "template-diagnostics",
        "repairAffordance": {
          "actionKind": "register-framework-capability",
          "actionability": "guided",
          "changeDomain": "app-source",
          "planKind": "framework-capability-registration",
          "readiness": "source-edit-policy-open",
          "targetSourceCoverage": "all"
        },
        "sourceRole": "template",
        "subject": null,
        "typeScriptDiagnosticCode": null
      },
      "message": "Attribute \"@click\" uses Aurelia shorthand binding syntax, but that framework capability is not registered in this app world.",
      "range": {
        "end": {
          "character": 23,
          "line": 1
        },
        "start": {
          "character": 8,
          "line": 1
        }
      },
      "rangeText": "@click=\"save()\"",
      "relatedInformation": [],
      "severity": "error",
      "source": "aurelia"
    }
  ],
  "outcome": "full",
  "previousResultIdPresent": false,
  "resultIdPresent": true,
  "uri": "fixtures://pressure/unregistered-shorthand-syntax/src/unregistered-shorthand-syntax-app.html"
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
  "uri": "fixtures://pressure/unregistered-shorthand-syntax/src/unregistered-shorthand-syntax-app.html"
}
```
