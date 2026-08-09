# dialog-source-errors diagnostics lane snapshot

Fixture: `packages/semantic-runtime/fixtures/pressure/dialog-source-errors`
Probe file: `packages/lane-harness/probes/dialog-source-errors.probes.json`
Lane: `diagnostics`

This snapshot records observed language-server behavior. Operator verdicts live in the probe data.

## dialog-main-source

### Probe

```json
{
  "file": "src/main.ts"
}
```

### textDocument/diagnostic — full pull

```json
{
  "diagnosticCount": 7,
  "diagnostics": [
    {
      "anomaly": null,
      "code": "AUR0910",
      "data": {
        "diagnosticAuthority": "framework-runtime-behavior",
        "diagnosticDomain": "dialog",
        "diagnosticKind": "child-settings-not-found",
        "frameworkErrorCode": "AUR0910",
        "frameworkRawErrorAuthority": null,
        "missingInput": null,
        "missingInputs": [],
        "phase": "child-service-resolution",
        "presentation": {
          "contextual": [],
          "maxRawSeverity": "error",
          "primarySeverity": "error",
          "rawRowCount": 1
        },
        "relatedInformation": [],
        "relatedQueryKind": "dialog-issues",
        "repairAffordance": null,
        "sourceRole": "app-source",
        "subject": null,
        "typeScriptDiagnosticCode": null
      },
      "message": "Dialog child service resolver key has no matching DialogConfiguration.withChild(...) settings registration in the visible app source.",
      "range": {
        "end": {
          "character": 90,
          "line": 23
        },
        "start": {
          "character": 75,
          "line": 23
        }
      },
      "rangeText": "'missing-child'",
      "relatedInformation": [],
      "severity": "error",
      "source": "aurelia"
    },
    {
      "anomaly": null,
      "code": "AUR0903",
      "data": {
        "diagnosticAuthority": "framework-runtime-behavior",
        "diagnosticDomain": "dialog",
        "diagnosticKind": "settings-invalid",
        "frameworkErrorCode": "AUR0903",
        "frameworkRawErrorAuthority": null,
        "missingInput": null,
        "missingInputs": [],
        "phase": "service-open",
        "presentation": {
          "contextual": [],
          "maxRawSeverity": "error",
          "primarySeverity": "error",
          "rawRowCount": 1
        },
        "relatedInformation": [],
        "relatedQueryKind": "dialog-issues",
        "repairAffordance": null,
        "sourceRole": "app-source",
        "subject": null,
        "typeScriptDiagnosticCode": null
      },
      "message": "DialogService.open(...) settings statically provide neither component nor template.",
      "range": {
        "end": {
          "character": 35,
          "line": 38
        },
        "start": {
          "character": 33,
          "line": 38
        }
      },
      "rangeText": "{}",
      "relatedInformation": [],
      "severity": "error",
      "source": "aurelia"
    },
    {
      "anomaly": null,
      "code": "AUR0903",
      "data": {
        "diagnosticAuthority": "framework-runtime-behavior",
        "diagnosticDomain": "dialog",
        "diagnosticKind": "settings-invalid",
        "frameworkErrorCode": "AUR0903",
        "frameworkRawErrorAuthority": null,
        "missingInput": null,
        "missingInputs": [],
        "phase": "service-open",
        "presentation": {
          "contextual": [],
          "maxRawSeverity": "error",
          "primarySeverity": "error",
          "rawRowCount": 1
        },
        "relatedInformation": [],
        "relatedQueryKind": "dialog-issues",
        "repairAffordance": null,
        "sourceRole": "app-source",
        "subject": null,
        "typeScriptDiagnosticCode": null
      },
      "message": "DialogService.open(...) settings statically provide neither component nor template.",
      "range": {
        "end": {
          "character": 89,
          "line": 42
        },
        "start": {
          "character": 48,
          "line": 42
        }
      },
      "rangeText": "{ model: { source: 'configured-child' } }",
      "relatedInformation": [],
      "severity": "error",
      "source": "aurelia"
    },
    {
      "anomaly": null,
      "code": "AUR0903",
      "data": {
        "diagnosticAuthority": "framework-runtime-behavior",
        "diagnosticDomain": "dialog",
        "diagnosticKind": "settings-invalid",
        "frameworkErrorCode": "AUR0903",
        "frameworkRawErrorAuthority": null,
        "missingInput": null,
        "missingInputs": [],
        "phase": "service-open",
        "presentation": {
          "contextual": [],
          "maxRawSeverity": "error",
          "primarySeverity": "error",
          "rawRowCount": 1
        },
        "relatedInformation": [],
        "relatedQueryKind": "dialog-issues",
        "repairAffordance": null,
        "sourceRole": "app-source",
        "subject": null,
        "typeScriptDiagnosticCode": null
      },
      "message": "DialogService.open(...) settings statically provide neither component nor template.",
      "range": {
        "end": {
          "character": 57,
          "line": 46
        },
        "start": {
          "character": 55,
          "line": 46
        }
      },
      "rangeText": "{}",
      "relatedInformation": [],
      "severity": "error",
      "source": "aurelia"
    },
    {
      "anomaly": null,
      "code": "AUR0910",
      "data": {
        "diagnosticAuthority": "framework-runtime-behavior",
        "diagnosticDomain": "dialog",
        "diagnosticKind": "child-settings-not-found",
        "frameworkErrorCode": "AUR0910",
        "frameworkRawErrorAuthority": null,
        "missingInput": null,
        "missingInputs": [],
        "phase": "child-service-resolution",
        "presentation": {
          "contextual": [],
          "maxRawSeverity": "error",
          "primarySeverity": "error",
          "rawRowCount": 1
        },
        "relatedInformation": [],
        "relatedQueryKind": "dialog-issues",
        "repairAffordance": null,
        "sourceRole": "app-source",
        "subject": null,
        "typeScriptDiagnosticCode": null
      },
      "message": "Dialog child service resolver key has no matching DialogConfiguration.withChild(...) settings registration in the visible app source.",
      "range": {
        "end": {
          "character": 80,
          "line": 47
        },
        "start": {
          "character": 55,
          "line": 47
        }
      },
      "rangeText": "'missing-container-child'",
      "relatedInformation": [],
      "severity": "error",
      "source": "aurelia"
    },
    {
      "anomaly": null,
      "code": "AUR0903",
      "data": {
        "diagnosticAuthority": "framework-runtime-behavior",
        "diagnosticDomain": "dialog",
        "diagnosticKind": "settings-invalid",
        "frameworkErrorCode": "AUR0903",
        "frameworkRawErrorAuthority": null,
        "missingInput": null,
        "missingInputs": [],
        "phase": "service-open",
        "presentation": {
          "contextual": [],
          "maxRawSeverity": "error",
          "primarySeverity": "error",
          "rawRowCount": 1
        },
        "relatedInformation": [],
        "relatedQueryKind": "dialog-issues",
        "repairAffordance": null,
        "sourceRole": "app-source",
        "subject": null,
        "typeScriptDiagnosticCode": null
      },
      "message": "DialogService.open(...) settings statically provide neither component nor template.",
      "range": {
        "end": {
          "character": 62,
          "line": 51
        },
        "start": {
          "character": 60,
          "line": 51
        }
      },
      "rangeText": "{}",
      "relatedInformation": [],
      "severity": "error",
      "source": "aurelia"
    },
    {
      "anomaly": null,
      "code": "AUR0904",
      "data": {
        "diagnosticAuthority": "framework-runtime-behavior",
        "diagnosticDomain": "dialog",
        "diagnosticKind": "no-empty-default-configuration",
        "frameworkErrorCode": "AUR0904",
        "frameworkRawErrorAuthority": null,
        "missingInput": null,
        "missingInputs": [],
        "phase": "configuration-registration",
        "presentation": {
          "contextual": [],
          "maxRawSeverity": "error",
          "primarySeverity": "error",
          "rawRowCount": 1
        },
        "relatedInformation": [],
        "relatedQueryKind": "dialog-issues",
        "repairAffordance": null,
        "sourceRole": "app-source",
        "subject": null,
        "typeScriptDiagnosticCode": null
      },
      "message": "Bare DialogConfiguration was registered without a renderer-providing customize(...) call; Aurelia throws when the settings-provider AppTask runs.",
      "range": {
        "end": {
          "character": 23,
          "line": 86
        },
        "start": {
          "character": 4,
          "line": 86
        }
      },
      "rangeText": "DialogConfiguration",
      "relatedInformation": [],
      "severity": "error",
      "source": "aurelia"
    }
  ],
  "outcome": "full",
  "previousResultIdPresent": false,
  "resultIdPresent": true,
  "uri": "fixtures://pressure/dialog-source-errors/src/main.ts"
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
  "uri": "fixtures://pressure/dialog-source-errors/src/main.ts"
}
```
