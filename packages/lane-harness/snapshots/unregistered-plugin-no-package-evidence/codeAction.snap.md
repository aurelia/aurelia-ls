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
        "relatedQueryKind": "template-diagnostics",
        "repairAffordance": {
          "actionKind": "register-framework-capability",
          "actionability": "guided",
          "applicationKind": "none",
          "changeDomain": "app-source",
          "editPlanState": "not-available",
          "planKind": "framework-capability-registration",
          "readiness": "source-edit-policy-open",
          "targetSourceCoverage": "all"
        },
        "subject": null,
        "taxonomy": {
          "actionability": "guided",
          "category": "template-syntax",
          "confidence": null,
          "impact": "blocking",
          "schema": "diagnostics-taxonomy/1"
        }
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
