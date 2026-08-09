# template-spread-capture-semantics codeAction lane snapshot

Fixture: `packages/semantic-runtime/fixtures/pressure/template-spread-capture-semantics`
Probe file: `packages/lane-harness/probes/template-spread-capture-semantics.probes.json`
Lane: `codeAction`

This snapshot records observed language-server behavior. Operator verdicts live in the probe data.

## reserved-element-shorthand

### Probe

```json
{
  "anchor": "...$element=\"spreadState\"",
  "at": "...$element",
  "atOccurrence": 1,
  "displayPosition": "src/template-spread-capture-semantics-app.html:24:16",
  "file": "src/template-spread-capture-semantics-app.html",
  "lspPosition": {
    "character": 15,
    "line": 23
  },
  "occurrence": 1
}
```

### Diagnostic pull

```json
{
  "diagnosticCount": 8,
  "outcome": "full",
  "previousResultIdPresent": false,
  "resultIdPresent": true,
  "uri": "fixtures://pressure/template-spread-capture-semantics/src/template-spread-capture-semantics-app.html"
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
      "code": "AUR0720",
      "data": {
        "diagnosticAuthority": "framework-error-code",
        "diagnosticDomain": "template",
        "diagnosticKind": "template-compiler-error",
        "frameworkErrorCode": "AUR0720",
        "frameworkRawErrorAuthority": null,
        "missingInput": "template-compiler:AUR0720",
        "missingInputs": [
          "template-compiler:AUR0720"
        ],
        "phase": "attribute-classification",
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
        "typeScriptDiagnosticCode": null
      },
      "message": "Aurelia template compiler AUR0720 rejects this template syntax: Spreading syntax \"...xxx\" is reserved. Encountered \"...$element\"..",
      "range": {
        "end": {
          "character": 26,
          "line": 23
        },
        "start": {
          "character": 15,
          "line": 23
        }
      },
      "rangeText": "...$element",
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

## app-root-attrs-spread

### Probe

```json
{
  "anchor": "<div ...$attrs>",
  "at": "...$attrs",
  "atOccurrence": 1,
  "displayPosition": "src/template-spread-capture-semantics-app.html:27:8",
  "file": "src/template-spread-capture-semantics-app.html",
  "lspPosition": {
    "character": 7,
    "line": 26
  },
  "occurrence": 1
}
```

### Diagnostic pull

```json
{
  "diagnosticCount": 8,
  "outcome": "full",
  "previousResultIdPresent": false,
  "resultIdPresent": true,
  "uri": "fixtures://pressure/template-spread-capture-semantics/src/template-spread-capture-semantics-app.html"
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
      "code": "AUR9999",
      "data": {
        "diagnosticAuthority": "framework-error-code",
        "diagnosticDomain": "template",
        "diagnosticKind": "runtime-binding-framework-error",
        "frameworkErrorCode": "AUR9999",
        "frameworkRawErrorAuthority": null,
        "missingInput": "runtime-binding:AUR9999",
        "missingInputs": [
          "runtime-binding:AUR9999"
        ],
        "phase": "spread-bind",
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
        "typeScriptDiagnosticCode": null
      },
      "message": "Aurelia runtime binding AUR9999 rejects this binding input: SpreadBinding.bind requires the hydration-context controller scope to have a parent scope..",
      "range": {
        "end": {
          "character": 16,
          "line": 26
        },
        "start": {
          "character": 7,
          "line": 26
        }
      },
      "rangeText": "...$attrs",
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

## captured-template-controller

### Probe

```json
{
  "anchor": "inner-gate.bind=\"showCapture\"",
  "at": "inner-gate",
  "atOccurrence": 1,
  "displayPosition": "src/template-spread-capture-semantics-app.html:46:5",
  "file": "src/template-spread-capture-semantics-app.html",
  "lspPosition": {
    "character": 4,
    "line": 45
  },
  "occurrence": 1
}
```

### Diagnostic pull

```json
{
  "diagnosticCount": 8,
  "outcome": "full",
  "previousResultIdPresent": false,
  "resultIdPresent": true,
  "uri": "fixtures://pressure/template-spread-capture-semantics/src/template-spread-capture-semantics-app.html"
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
      "code": "AUR9998",
      "data": {
        "diagnosticAuthority": "framework-error-code",
        "diagnosticDomain": "template",
        "diagnosticKind": "runtime-binding-framework-error",
        "frameworkErrorCode": "AUR9998",
        "frameworkRawErrorAuthority": null,
        "missingInput": "runtime-binding:AUR9998",
        "missingInputs": [
          "runtime-binding:AUR9998"
        ],
        "phase": "spread-child-admission",
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
        "typeScriptDiagnosticCode": null
      },
      "message": "Aurelia runtime binding AUR9998 rejects this binding input: SpreadBinding.addChild cannot admit captured template controller \"inner-gate\" on \"input\"..",
      "range": {
        "end": {
          "character": 33,
          "line": 45
        },
        "start": {
          "character": 4,
          "line": 45
        }
      },
      "rangeText": "inner-gate.bind=\"showCapture\"",
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
