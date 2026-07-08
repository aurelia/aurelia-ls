# mixed-form-surfaces codeAction lane snapshot

Fixture: `packages/semantic-runtime/fixtures/pressure/mixed-form-surfaces`
Probe file: `packages/lane-harness/probes/mixed-form-surfaces.probes.json`
Lane: `codeAction`

This snapshot records observed language-server behavior. Operator verdicts live in the probe data.

## weakMetadata-source-owner-type-no-viewmodel-edit

### Probe

```json
{
  "anchor": "weakMetadata.source",
  "at": "source",
  "atOccurrence": 1,
  "displayPosition": "src/app.html:11:46",
  "file": "src/app.html",
  "lspPosition": {
    "character": 45,
    "line": 10
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
        "relatedQueryKind": "template-diagnostics",
        "repairAffordance": {
          "actionKind": "declare-missing-member",
          "actionability": "guided",
          "applicationKind": "none",
          "changeDomain": "app-source",
          "editPlanState": "not-available",
          "planKind": "source-member-declaration",
          "readiness": "ready-to-plan",
          "targetSourceCoverage": "all"
        },
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
        "taxonomy": {
          "actionability": "guided",
          "category": "template-syntax",
          "confidence": null,
          "impact": "informational",
          "schema": "diagnostics-taxonomy/1"
        }
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
