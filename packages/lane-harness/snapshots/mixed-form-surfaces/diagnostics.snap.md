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
  "diagnosticCount": 2,
  "diagnostics": [
    {
      "anomaly": null,
      "code": "weak-expression-member-owner",
      "data": {
        "diagnosticAuthority": "semantic-authoring-policy",
        "diagnosticDomain": "template",
        "diagnosticKind": "weak-expression-member-owner",
        "frameworkErrorCode": null,
        "frameworkRawErrorAuthority": null,
        "missingInput": "expression-member-owner-type:index-signature-only",
        "missingInputs": [
          "expression-member-owner-type:index-signature-only"
        ],
        "phase": null,
        "relatedInformation": [],
        "relatedQueryKind": "template-diagnostics",
        "repairAffordance": {
          "actionKind": "declare-missing-member",
          "actionability": "guided",
          "changeDomain": "app-source",
          "planKind": "source-member-declaration",
          "readiness": "ready-to-plan",
          "targetSourceCoverage": "all"
        },
        "sourceRole": "template",
        "subject": {
          "source": {
            "end": 497,
            "kind": "source-span-address",
            "label": "src/app.html@478..497",
            "path": "src/app.html",
            "role": "template-member-access",
            "start": 478
          },
          "span": null,
          "subjectKind": "template-member-access",
          "uri": null
        },
        "typeScriptDiagnosticCode": null
      },
      "message": "Member access is backed by an index signature, so completion cannot enumerate concrete property names.",
      "range": {
        "end": {
          "character": 51,
          "line": 10
        },
        "start": {
          "character": 45,
          "line": 10
        }
      },
      "rangeText": "source",
      "relatedInformation": [],
      "severity": "information",
      "source": "aurelia"
    },
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
      "severity": "information",
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
