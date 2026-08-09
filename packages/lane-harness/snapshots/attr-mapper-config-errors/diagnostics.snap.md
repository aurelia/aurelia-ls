# attr-mapper-config-errors diagnostics lane snapshot

Fixture: `packages/semantic-runtime/fixtures/pressure/attr-mapper-config-errors`
Probe file: `packages/lane-harness/probes/attr-mapper-config-errors.probes.json`
Lane: `diagnostics`

This snapshot records observed language-server behavior. Operator verdicts live in the probe data.

## attr-mapper-main-source

### Probe

```json
{
  "file": "src/main.ts"
}
```

### textDocument/diagnostic — full pull

```json
{
  "diagnosticCount": 3,
  "diagnostics": [
    {
      "anomaly": null,
      "code": "AUR0719",
      "data": {
        "diagnosticAuthority": "framework-error-code",
        "diagnosticDomain": "configuration",
        "diagnosticKind": "attr-mapper-duplicate-mapping",
        "frameworkErrorCode": "AUR0719",
        "frameworkRawErrorAuthority": null,
        "missingInput": null,
        "missingInputs": [],
        "phase": "framework-service-customization",
        "presentation": {
          "contextual": [],
          "maxRawSeverity": "error",
          "primarySeverity": "error",
          "rawRowCount": 1
        },
        "relatedInformation": [],
        "relatedQueryKind": "configuration-issues",
        "repairAffordance": null,
        "sourceRole": "app-source",
        "subject": null,
        "typeScriptDiagnosticCode": null
      },
      "message": "Attribute mapper already has a mapping for maxlength on INPUT.",
      "range": {
        "end": {
          "character": 62,
          "line": 12
        },
        "start": {
          "character": 6,
          "line": 12
        }
      },
      "rangeText": "mapper.useMapping({ INPUT: { maxlength: 'maxLength' } })",
      "relatedInformation": [],
      "severity": "error",
      "source": "aurelia"
    },
    {
      "anomaly": null,
      "code": "AUR0719",
      "data": {
        "diagnosticAuthority": "framework-error-code",
        "diagnosticDomain": "configuration",
        "diagnosticKind": "attr-mapper-duplicate-mapping",
        "frameworkErrorCode": "AUR0719",
        "frameworkRawErrorAuthority": null,
        "missingInput": null,
        "missingInputs": [],
        "phase": "framework-service-customization",
        "presentation": {
          "contextual": [],
          "maxRawSeverity": "error",
          "primarySeverity": "error",
          "rawRowCount": 1
        },
        "relatedInformation": [],
        "relatedQueryKind": "configuration-issues",
        "repairAffordance": null,
        "sourceRole": "app-source",
        "subject": null,
        "typeScriptDiagnosticCode": null
      },
      "message": "Attribute mapper already has a mapping for tabindex on *.",
      "range": {
        "end": {
          "character": 55,
          "line": 13
        },
        "start": {
          "character": 6,
          "line": 13
        }
      },
      "rangeText": "mapper.useGlobalMapping({ tabindex: 'tabIndex' })",
      "relatedInformation": [],
      "severity": "error",
      "source": "aurelia"
    },
    {
      "anomaly": null,
      "code": "AUR0719",
      "data": {
        "diagnosticAuthority": "framework-error-code",
        "diagnosticDomain": "configuration",
        "diagnosticKind": "attr-mapper-duplicate-mapping",
        "frameworkErrorCode": "AUR0719",
        "frameworkRawErrorAuthority": null,
        "missingInput": null,
        "missingInputs": [],
        "phase": "framework-service-customization",
        "presentation": {
          "contextual": [],
          "maxRawSeverity": "error",
          "primarySeverity": "error",
          "rawRowCount": 1
        },
        "relatedInformation": [],
        "relatedQueryKind": "configuration-issues",
        "repairAffordance": null,
        "sourceRole": "app-source",
        "subject": null,
        "typeScriptDiagnosticCode": null
      },
      "message": "Attribute mapper already has a mapping for thing on MY-ELEMENT.",
      "range": {
        "end": {
          "character": 66,
          "line": 15
        },
        "start": {
          "character": 6,
          "line": 15
        }
      },
      "rangeText": "mapper.useMapping({ 'MY-ELEMENT': { thing: 'otherThing' } })",
      "relatedInformation": [],
      "severity": "error",
      "source": "aurelia"
    }
  ],
  "outcome": "full",
  "previousResultIdPresent": false,
  "resultIdPresent": true,
  "uri": "fixtures://pressure/attr-mapper-config-errors/src/main.ts"
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
  "uri": "fixtures://pressure/attr-mapper-config-errors/src/main.ts"
}
```
