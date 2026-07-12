# router-instruction-errors codeAction lane snapshot

Fixture: `packages/semantic-runtime/fixtures/pressure/router-instruction-errors`
Probe file: `packages/lane-harness/probes/router-instruction-errors.probes.json`
Lane: `codeAction`

This snapshot records observed language-server behavior. Operator verdicts live in the probe data.

## router-load-missing-route-no-edit-action

### Probe

```json
{
  "anchor": "load=\"missing-route\"",
  "at": "missing-route",
  "atOccurrence": 1,
  "displayPosition": "src/router-instruction-errors-app.html:1:15",
  "file": "src/router-instruction-errors-app.html",
  "lspPosition": {
    "character": 14,
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
      "code": "AUR3401",
      "data": {
        "diagnosticAuthority": "framework-error-code",
        "diagnosticDomain": "router",
        "diagnosticKind": "instruction-no-fallback",
        "frameworkErrorCode": "AUR3401",
        "frameworkRawErrorAuthority": null,
        "missingInput": "router:instruction-no-fallback",
        "missingInputs": [
          "router:instruction-no-fallback"
        ],
        "phase": "route-recognition",
        "relatedInformation": [],
        "relatedQueryKind": "router-issues",
        "repairAffordance": {
          "actionKind": "rewrite-router-instruction",
          "actionability": "guided",
          "changeDomain": "app-source",
          "planKind": "router-instruction-rewrite",
          "readiness": "ready-to-plan",
          "targetSourceCoverage": "all"
        },
        "sourceRole": "template",
        "subject": null,
        "taxonomy": {
          "actionability": "guided",
          "category": "project",
          "confidence": null,
          "impact": "blocking",
          "schema": "diagnostics-taxonomy/1"
        }
      },
      "message": "Neither the route 'missing-route' matched any configured route nor is a fallback configured for the active route context.",
      "range": {
        "end": {
          "character": 27,
          "line": 0
        },
        "start": {
          "character": 14,
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
