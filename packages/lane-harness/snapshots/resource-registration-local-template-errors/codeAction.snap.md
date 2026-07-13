# resource-registration-local-template-errors codeAction lane snapshot

Fixture: `packages/semantic-runtime/fixtures/pressure/resource-registration-local-template-errors`
Probe file: `packages/lane-harness/probes/resource-registration-local-template-errors.probes.json`
Lane: `codeAction`

This snapshot records observed language-server behavior. Operator verdicts live in the probe data.

## forbidden-host-attribute

### Probe

```json
{
  "anchor": "id=\"forbidden-host-id\"",
  "at": "id",
  "atOccurrence": 1,
  "displayPosition": "src/local-surrogate-invalid-attribute.html:4:57",
  "file": "src/local-surrogate-invalid-attribute.html",
  "lspPosition": {
    "character": 56,
    "line": 3
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
      "code": "AUR0702",
      "data": {
        "diagnosticAuthority": "framework-error-code",
        "diagnosticDomain": "template",
        "diagnosticKind": "template-compiler-error",
        "frameworkErrorCode": "AUR0702",
        "frameworkRawErrorAuthority": null,
        "missingInput": "template-compiler:AUR0702",
        "missingInputs": [
          "template-compiler:AUR0702"
        ],
        "phase": "compiled-template",
        "relatedInformation": [],
        "relatedQueryKind": "template-diagnostics",
        "repairAffordance": {
          "actionKind": "rewrite-template-syntax",
          "actionability": "guided",
          "changeDomain": "app-source",
          "planKind": "template-syntax-rewrite",
          "readiness": "ready-to-plan",
          "targetSourceCoverage": "all"
        },
        "sourceRole": "template",
        "subject": null,
        "taxonomy": {
          "actionability": "guided",
          "category": "template-syntax",
          "confidence": null,
          "impact": "blocking",
          "schema": "diagnostics-taxonomy/1"
        }
      },
      "message": "Aurelia template compiler AUR0702 rejects this template syntax: Template compilation error: attribute \"id\" is invalid on element surrogate..",
      "range": {
        "end": {
          "character": 78,
          "line": 3
        },
        "start": {
          "character": 56,
          "line": 3
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

## host-template-controller

### Probe

```json
{
  "anchor": "if.bind=\"true\"",
  "at": "if",
  "atOccurrence": 1,
  "displayPosition": "src/local-surrogate-template-controller.html:2:49",
  "file": "src/local-surrogate-template-controller.html",
  "lspPosition": {
    "character": 48,
    "line": 1
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
      "code": "AUR0703",
      "data": {
        "diagnosticAuthority": "framework-error-code",
        "diagnosticDomain": "template",
        "diagnosticKind": "template-compiler-error",
        "frameworkErrorCode": "AUR0703",
        "frameworkRawErrorAuthority": null,
        "missingInput": "template-compiler:AUR0703",
        "missingInputs": [
          "template-compiler:AUR0703"
        ],
        "phase": "compiled-template",
        "relatedInformation": [],
        "relatedQueryKind": "template-diagnostics",
        "repairAffordance": {
          "actionKind": "rewrite-template-syntax",
          "actionability": "guided",
          "changeDomain": "app-source",
          "planKind": "template-syntax-rewrite",
          "readiness": "ready-to-plan",
          "targetSourceCoverage": "all"
        },
        "sourceRole": "template",
        "subject": null,
        "taxonomy": {
          "actionability": "guided",
          "category": "template-syntax",
          "confidence": null,
          "impact": "blocking",
          "schema": "diagnostics-taxonomy/1"
        }
      },
      "message": "Aurelia template compiler AUR0703 rejects this template syntax: Template compilation error: template controller \"if\" is invalid on element surrogate..",
      "range": {
        "end": {
          "character": 50,
          "line": 1
        },
        "start": {
          "character": 48,
          "line": 1
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
