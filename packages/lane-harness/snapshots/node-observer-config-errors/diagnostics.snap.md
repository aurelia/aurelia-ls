# node-observer-config-errors diagnostics lane snapshot

Fixture: `packages/semantic-runtime/fixtures/pressure/node-observer-config-errors`
Probe file: `packages/lane-harness/probes/node-observer-config-errors.probes.json`
Lane: `diagnostics`

This snapshot records observed language-server behavior. Operator verdicts live in the probe data.

## node-observer-main-source

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
      "code": "AUR0653",
      "data": {
        "diagnosticAuthority": "framework-error-code",
        "diagnosticDomain": "configuration",
        "diagnosticKind": "node-observer-mapping-existed",
        "frameworkErrorCode": "AUR0653",
        "frameworkRawErrorAuthority": null,
        "missingInput": null,
        "missingInputs": [],
        "phase": "framework-service-customization",
        "relatedInformation": [],
        "relatedQueryKind": "configuration-issues",
        "repairAffordance": {
          "actionKind": "inspect-type-surface",
          "actionability": "manual",
          "changeDomain": "inspection",
          "planKind": "manual-inspection",
          "readiness": "inspection-required",
          "targetSourceCoverage": "not-applicable"
        },
        "sourceRole": "app-source",
        "subject": null,
        "typeScriptDiagnosticCode": null
      },
      "message": "Mapping for property value of <INPUT /> already exists.",
      "range": {
        "end": {
          "character": 64,
          "line": 19
        },
        "start": {
          "character": 6,
          "line": 19
        }
      },
      "rangeText": "locator.useConfig('INPUT', 'value', appNodeObserverConfig)",
      "relatedInformation": [],
      "severity": "error",
      "source": "aurelia"
    },
    {
      "anomaly": null,
      "code": "AUR0653",
      "data": {
        "diagnosticAuthority": "framework-error-code",
        "diagnosticDomain": "configuration",
        "diagnosticKind": "node-observer-mapping-existed",
        "frameworkErrorCode": "AUR0653",
        "frameworkRawErrorAuthority": null,
        "missingInput": null,
        "missingInputs": [],
        "phase": "framework-service-customization",
        "relatedInformation": [],
        "relatedQueryKind": "configuration-issues",
        "repairAffordance": {
          "actionKind": "inspect-type-surface",
          "actionability": "manual",
          "changeDomain": "inspection",
          "planKind": "manual-inspection",
          "readiness": "inspection-required",
          "targetSourceCoverage": "not-applicable"
        },
        "sourceRole": "app-source",
        "subject": null,
        "typeScriptDiagnosticCode": null
      },
      "message": "Mapping for property textContent of <* /> already exists.",
      "range": {
        "end": {
          "character": 67,
          "line": 20
        },
        "start": {
          "character": 6,
          "line": 20
        }
      },
      "rangeText": "locator.useConfigGlobal('textContent', appNodeObserverConfig)",
      "relatedInformation": [],
      "severity": "error",
      "source": "aurelia"
    },
    {
      "anomaly": null,
      "code": "AUR0653",
      "data": {
        "diagnosticAuthority": "framework-error-code",
        "diagnosticDomain": "configuration",
        "diagnosticKind": "node-observer-mapping-existed",
        "frameworkErrorCode": "AUR0653",
        "frameworkRawErrorAuthority": null,
        "missingInput": null,
        "missingInputs": [],
        "phase": "framework-service-customization",
        "relatedInformation": [],
        "relatedQueryKind": "configuration-issues",
        "repairAffordance": {
          "actionKind": "inspect-type-surface",
          "actionability": "manual",
          "changeDomain": "inspection",
          "planKind": "manual-inspection",
          "readiness": "inspection-required",
          "targetSourceCoverage": "not-applicable"
        },
        "sourceRole": "app-source",
        "subject": null,
        "typeScriptDiagnosticCode": null
      },
      "message": "Mapping for property value of <MY-ELEMENT /> already exists.",
      "range": {
        "end": {
          "character": 69,
          "line": 22
        },
        "start": {
          "character": 6,
          "line": 22
        }
      },
      "rangeText": "locator.useConfig('MY-ELEMENT', 'value', appNodeObserverConfig)",
      "relatedInformation": [],
      "severity": "error",
      "source": "aurelia"
    }
  ],
  "outcome": "full",
  "previousResultIdPresent": false,
  "resultIdPresent": true,
  "uri": "fixtures://pressure/node-observer-config-errors/src/main.ts"
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
  "uri": "fixtures://pressure/node-observer-config-errors/src/main.ts"
}
```
