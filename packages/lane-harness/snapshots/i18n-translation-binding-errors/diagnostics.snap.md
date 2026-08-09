# i18n-translation-binding-errors diagnostics lane snapshot

Fixture: `packages/semantic-runtime/fixtures/pressure/i18n-translation-binding-errors`
Probe file: `packages/lane-harness/probes/i18n-translation-binding-errors.probes.json`
Lane: `diagnostics`

This snapshot records observed language-server behavior. Operator verdicts live in the probe data.

## i18n-translation-binding-template

### Probe

```json
{
  "file": "src/i18n-translation-binding-errors-app.html"
}
```

### textDocument/diagnostic — full pull

```json
{
  "diagnosticCount": 4,
  "diagnostics": [
    {
      "anomaly": null,
      "code": "AUR4000",
      "data": {
        "diagnosticAuthority": "framework-error-code",
        "diagnosticDomain": "template",
        "diagnosticKind": "runtime-binding-framework-error",
        "frameworkErrorCode": "AUR4000",
        "frameworkRawErrorAuthority": null,
        "missingInput": "runtime-binding:AUR4000",
        "missingInputs": [
          "runtime-binding:AUR4000"
        ],
        "phase": "translation-bind",
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
      "message": "TranslationBinding.bind would run with parameters but without a translation-key expression on the same element.",
      "range": {
        "end": {
          "character": 45,
          "line": 1
        },
        "start": {
          "character": 7,
          "line": 1
        }
      },
      "rangeText": "t-params.bind=\"{ name: customerName }\"",
      "relatedInformation": [],
      "severity": "error",
      "source": "aurelia"
    },
    {
      "anomaly": null,
      "code": "AUR4002",
      "data": {
        "diagnosticAuthority": "framework-error-code",
        "diagnosticDomain": "template",
        "diagnosticKind": "runtime-binding-framework-error",
        "frameworkErrorCode": "AUR4002",
        "frameworkRawErrorAuthority": null,
        "missingInput": "runtime-binding:AUR4002",
        "missingInputs": [
          "runtime-binding:AUR4002"
        ],
        "phase": "translation-bind",
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
      "message": "TranslationBinding._ensureKeyExpression would reject this key expression because its TypeChecker type is not assignable to string.",
      "range": {
        "end": {
          "character": 24,
          "line": 2
        },
        "start": {
          "character": 5,
          "line": 2
        }
      },
      "rangeText": "t.bind=\"numericKey\"",
      "relatedInformation": [],
      "severity": "error",
      "source": "aurelia"
    },
    {
      "anomaly": null,
      "code": "AUR4002",
      "data": {
        "diagnosticAuthority": "framework-error-code",
        "diagnosticDomain": "template",
        "diagnosticKind": "runtime-binding-framework-error",
        "frameworkErrorCode": "AUR4002",
        "frameworkRawErrorAuthority": null,
        "missingInput": "runtime-binding:AUR4002",
        "missingInputs": [
          "runtime-binding:AUR4002"
        ],
        "phase": "translation-bind",
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
      "message": "TranslationBinding._ensureKeyExpression would reject this key expression because its TypeChecker type is not assignable to string.",
      "range": {
        "end": {
          "character": 32,
          "line": 3
        },
        "start": {
          "character": 5,
          "line": 3
        }
      },
      "rangeText": "t.bind=\"numericKey & state\"",
      "relatedInformation": [],
      "severity": "error",
      "source": "aurelia"
    },
    {
      "anomaly": null,
      "code": "AUR4001",
      "data": {
        "diagnosticAuthority": "framework-error-code",
        "diagnosticDomain": "template",
        "diagnosticKind": "runtime-binding-framework-error",
        "frameworkErrorCode": "AUR4001",
        "frameworkRawErrorAuthority": null,
        "missingInput": "runtime-binding:AUR4001",
        "missingInputs": [
          "runtime-binding:AUR4001"
        ],
        "phase": "translation-create",
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
      "message": "TranslationBinding.useParameter can only attach one t-params binding to the same translated element.",
      "range": {
        "end": {
          "character": 40,
          "line": 16
        },
        "start": {
          "character": 4,
          "line": 16
        }
      },
      "rangeText": "t-params.bind=\"{ other: otherName }\"",
      "relatedInformation": [],
      "severity": "error",
      "source": "aurelia"
    }
  ],
  "outcome": "full",
  "previousResultIdPresent": false,
  "resultIdPresent": true,
  "uri": "fixtures://pressure/i18n-translation-binding-errors/src/i18n-translation-binding-errors-app.html"
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
  "uri": "fixtures://pressure/i18n-translation-binding-errors/src/i18n-translation-binding-errors-app.html"
}
```
