# resource-definition-api-errors diagnostics lane snapshot

Fixture: `packages/semantic-runtime/fixtures/pressure/resource-definition-api-errors`
Probe file: `packages/lane-harness/probes/resource-definition-api-errors.probes.json`
Lane: `diagnostics`

This snapshot records observed language-server behavior. Operator verdicts live in the probe data.

## resource-definition-api-main

### Probe

```json
{
  "file": "src/main.ts"
}
```

### textDocument/diagnostic — full pull

```json
{
  "diagnosticCount": 5,
  "diagnostics": [
    {
      "anomaly": null,
      "code": "AUR0761",
      "data": {
        "diagnosticAuthority": "framework-error-code",
        "diagnosticDomain": "resource",
        "diagnosticKind": "custom-element-definition-only-name",
        "frameworkErrorCode": "AUR0761",
        "frameworkRawErrorAuthority": null,
        "missingInput": null,
        "missingInputs": [],
        "phase": "resource-definition-api",
        "presentation": {
          "contextual": [],
          "maxRawSeverity": "error",
          "primarySeverity": "error",
          "rawRowCount": 1
        },
        "relatedInformation": [],
        "relatedQueryKind": "resource-issues",
        "repairAffordance": null,
        "sourceRole": "app-source",
        "subject": null,
        "typeScriptDiagnosticCode": null
      },
      "message": "Cannot create a custom element definition with only a name and no type.",
      "range": {
        "end": {
          "character": 50,
          "line": 13
        },
        "start": {
          "character": 0,
          "line": 13
        }
      },
      "rangeText": "CustomElementDefinition.create('name-only' as any)",
      "relatedInformation": [],
      "severity": "error",
      "source": "aurelia"
    },
    {
      "anomaly": null,
      "code": "AUR0760",
      "data": {
        "diagnosticAuthority": "framework-error-code",
        "diagnosticDomain": "resource",
        "diagnosticKind": "custom-element-definition-not-found",
        "frameworkErrorCode": "AUR0760",
        "frameworkRawErrorAuthority": null,
        "missingInput": null,
        "missingInputs": [],
        "phase": "resource-definition-api",
        "presentation": {
          "contextual": [],
          "maxRawSeverity": "error",
          "primarySeverity": "error",
          "rawRowCount": 1
        },
        "relatedInformation": [],
        "relatedQueryKind": "resource-issues",
        "repairAffordance": null,
        "sourceRole": "app-source",
        "subject": null,
        "typeScriptDiagnosticCode": null
      },
      "message": "No custom element definition found for type PlainThing.",
      "range": {
        "end": {
          "character": 39,
          "line": 14
        },
        "start": {
          "character": 0,
          "line": 14
        }
      },
      "rangeText": "CustomElement.getDefinition(PlainThing)",
      "relatedInformation": [],
      "severity": "error",
      "source": "aurelia"
    },
    {
      "anomaly": null,
      "code": "AUR0759",
      "data": {
        "diagnosticAuthority": "framework-error-code",
        "diagnosticDomain": "resource",
        "diagnosticKind": "custom-attribute-definition-not-found",
        "frameworkErrorCode": "AUR0759",
        "frameworkRawErrorAuthority": null,
        "missingInput": null,
        "missingInputs": [],
        "phase": "resource-definition-api",
        "presentation": {
          "contextual": [],
          "maxRawSeverity": "error",
          "primarySeverity": "error",
          "rawRowCount": 1
        },
        "relatedInformation": [],
        "relatedQueryKind": "resource-issues",
        "repairAffordance": null,
        "sourceRole": "app-source",
        "subject": null,
        "typeScriptDiagnosticCode": null
      },
      "message": "No custom attribute definition found for type PlainThing.",
      "range": {
        "end": {
          "character": 41,
          "line": 15
        },
        "start": {
          "character": 0,
          "line": 15
        }
      },
      "rangeText": "CustomAttribute.getDefinition(PlainThing)",
      "relatedInformation": [],
      "severity": "error",
      "source": "aurelia"
    },
    {
      "anomaly": null,
      "code": "AUR0152",
      "data": {
        "diagnosticAuthority": "framework-error-code",
        "diagnosticDomain": "resource",
        "diagnosticKind": "value-converter-definition-not-found",
        "frameworkErrorCode": "AUR0152",
        "frameworkRawErrorAuthority": null,
        "missingInput": null,
        "missingInputs": [],
        "phase": "resource-definition-api",
        "presentation": {
          "contextual": [],
          "maxRawSeverity": "error",
          "primarySeverity": "error",
          "rawRowCount": 1
        },
        "relatedInformation": [],
        "relatedQueryKind": "resource-issues",
        "repairAffordance": null,
        "sourceRole": "app-source",
        "subject": null,
        "typeScriptDiagnosticCode": null
      },
      "message": "No value converter definition found for type PlainThing.",
      "range": {
        "end": {
          "character": 40,
          "line": 16
        },
        "start": {
          "character": 0,
          "line": 16
        }
      },
      "rangeText": "ValueConverter.getDefinition(PlainThing)",
      "relatedInformation": [],
      "severity": "error",
      "source": "aurelia"
    },
    {
      "anomaly": null,
      "code": "AUR0151",
      "data": {
        "diagnosticAuthority": "framework-error-code",
        "diagnosticDomain": "resource",
        "diagnosticKind": "binding-behavior-definition-not-found",
        "frameworkErrorCode": "AUR0151",
        "frameworkRawErrorAuthority": null,
        "missingInput": null,
        "missingInputs": [],
        "phase": "resource-definition-api",
        "presentation": {
          "contextual": [],
          "maxRawSeverity": "error",
          "primarySeverity": "error",
          "rawRowCount": 1
        },
        "relatedInformation": [],
        "relatedQueryKind": "resource-issues",
        "repairAffordance": null,
        "sourceRole": "app-source",
        "subject": null,
        "typeScriptDiagnosticCode": null
      },
      "message": "No binding behavior definition found for type PlainThing.",
      "range": {
        "end": {
          "character": 41,
          "line": 17
        },
        "start": {
          "character": 0,
          "line": 17
        }
      },
      "rangeText": "BindingBehavior.getDefinition(PlainThing)",
      "relatedInformation": [],
      "severity": "error",
      "source": "aurelia"
    }
  ],
  "outcome": "full",
  "previousResultIdPresent": false,
  "resultIdPresent": true,
  "uri": "fixtures://pressure/resource-definition-api-errors/src/main.ts"
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
  "uri": "fixtures://pressure/resource-definition-api-errors/src/main.ts"
}
```
