# unregistered-plugin-no-package-evidence codeAction lane snapshot

Fixture: `packages/semantic-runtime/fixtures/pressure/unregistered-plugin-no-package-evidence`
Probe file: `packages/lane-harness/probes/unregistered-plugin-no-package-evidence.probes.json`
Lane: `codeAction`

This snapshot records observed language-server behavior. Operator verdicts live in the probe data.

## router-resource-no-package-evidence

### Probe

```json
{
  "anchor": "<au-viewport>",
  "at": "au-viewport",
  "atOccurrence": 1,
  "displayPosition": "src/unregistered-plugin-no-package-evidence-app.html:1:2",
  "file": "src/unregistered-plugin-no-package-evidence-app.html",
  "lspPosition": {
    "character": 1,
    "line": 0
  },
  "occurrence": 1
}
```

### Diagnostic pull

```json
{
  "diagnosticCount": 1,
  "outcome": "full",
  "previousResultIdPresent": false,
  "resultIdPresent": true,
  "uri": "fixtures://pressure/unregistered-plugin-no-package-evidence/src/unregistered-plugin-no-package-evidence-app.html"
}
```

### codeAction

```json
{
  "outcome": "result",
  "result": null
}
```

### Context diagnostics

```json
{
  "diagnosticCount": 1,
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
        "missingInput": "router.default-resources",
        "missingInputs": [
          "router.default-resources"
        ],
        "phase": null,
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
      "message": "Element \"au-viewport\" uses Aurelia router default resources, but that framework capability is not registered in this app world.",
      "range": {
        "end": {
          "character": 27,
          "line": 0
        },
        "start": {
          "character": 0,
          "line": 0
        }
      },
      "rangeText": "<au-viewport></au-viewport>",
      "relatedInformation": [],
      "severity": "error",
      "source": "aurelia"
    }
  ]
}
```

### Actions

```json
{
  "actionCount": 0,
  "actions": []
}
```

### In-memory apply

```json
{
  "actions": [],
  "expectedOldTexts": [
    ""
  ]
}
```

### Applied diffs

_No in-memory diff._
