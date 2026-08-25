# mixed-form-surfaces diagnostics lane snapshot

Fixture: `packages/semantic-runtime/fixtures/pressure/mixed-form-surfaces`
Probe file: `packages/lane-harness/probes/mixed-form-surfaces.probes.json`
Lane: `diagnostics`

This snapshot records observed language-server behavior. Operator verdicts live in the probe data.

## app-template-weakMetadata-and-shellTone

### Probe

```json
{
  "file": "src/app.html"
}
```

### textDocument/diagnostic — full pull

```json
{
  "diagnosticCount": 1,
  "diagnostics": [
    {
      "anomaly": null,
      "code": "missing-expression-member",
      "data": {
        "diagnosticAuthority": "semantic-authoring-policy",
        "diagnosticDomain": "template",
        "diagnosticKind": "missing-expression-member",
        "frameworkErrorCode": null,
        "frameworkRawErrorAuthority": null,
        "missingInput": "expression-member:selected-member-missing",
        "missingInputs": [
          "expression-member:selected-member-missing"
        ],
        "phase": null,
        "presentation": {
          "contextual": [
            {
              "diagnostic": {
                "diagnosticAuthority": "typescript",
                "diagnosticDomain": "template",
                "diagnosticKind": "template-expression-typescript-diagnostic",
                "frameworkErrorCode": null,
                "frameworkRawErrorAuthority": null,
                "missingInput": "typescript:TS2339",
                "missingInputs": [
                  "typescript:TS2339"
                ],
                "phase": "semantic",
                "relatedInformation": [],
                "relatedQueryKind": "template-diagnostics",
                "repairAffordance": {
                  "actionKind": "inspect-type-surface",
                  "actionability": "manual",
                  "changeDomain": "inspection",
                  "planKind": "manual-inspection",
                  "readiness": "inspection-required",
                  "targetSourceCoverage": "all"
                },
                "severity": "error",
                "sourceRole": "template",
                "subject": {
                  "source": {
                    "end": 527,
                    "kind": "source-span-address",
                    "label": "src/app.html@512..527",
                    "path": "src/app.html",
                    "role": "template-member-access",
                    "start": 512
                  },
                  "span": null,
                  "subjectKind": "template-member-access",
                  "uri": null
                },
                "typeScriptDiagnosticCode": 2339
              },
              "relation": "checker-evidence"
            }
          ],
          "maxRawSeverity": "error",
          "primarySeverity": "warning",
          "rawRowCount": 2
        },
        "relatedInformation": [],
        "relatedQueryKind": "template-diagnostics",
        "repairAffordance": {
          "actionKind": "inspect-type-surface",
          "actionability": "manual",
          "changeDomain": "inspection",
          "planKind": "manual-inspection",
          "readiness": "inspection-required",
          "targetSourceCoverage": "all"
        },
        "sourceRole": "template",
        "subject": {
          "source": {
            "end": 527,
            "kind": "source-span-address",
            "label": "src/app.html@512..527",
            "path": "src/app.html",
            "role": "template-member-access",
            "start": 512
          },
          "span": null,
          "subjectKind": "template-member-access",
          "uri": null
        },
        "typeScriptDiagnosticCode": null
      },
      "message": "Member \"label\" is not projected on the owner type, so semantic tooling cannot validate or navigate it.",
      "range": {
        "end": {
          "character": 24,
          "line": 11
        },
        "start": {
          "character": 19,
          "line": 11
        }
      },
      "rangeText": "label",
      "relatedInformation": [
        {
          "anomaly": null,
          "file": "src/app.html",
          "message": "TS2339: Property 'label' does not exist on type 'string'.",
          "range": {
            "end": {
              "character": 24,
              "line": 11
            },
            "start": {
              "character": 19,
              "line": 11
            }
          },
          "rangeText": "label",
          "uri": "fixtures://pressure/mixed-form-surfaces/src/app.html"
        }
      ],
      "severity": "warning",
      "source": "aurelia"
    }
  ],
  "outcome": "full",
  "previousResultIdPresent": false,
  "resultIdPresent": true,
  "uri": "fixtures://pressure/mixed-form-surfaces/src/app.html"
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
  "uri": "fixtures://pressure/mixed-form-surfaces/src/app.html"
}
```

## loose-picklist-parent-specialized-option-label

### Probe

```json
{
  "file": "src/components/loose-picklist.html"
}
```

### textDocument/diagnostic — full pull

```json
{
  "diagnosticCount": 0,
  "diagnostics": [],
  "outcome": "full",
  "previousResultIdPresent": false,
  "resultIdPresent": true,
  "uri": "fixtures://pressure/mixed-form-surfaces/src/components/loose-picklist.html"
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
  "uri": "fixtures://pressure/mixed-form-surfaces/src/components/loose-picklist.html"
}
```
