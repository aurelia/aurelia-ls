# template-spread-capture-semantics diagnostics lane snapshot

Fixture: `packages/semantic-runtime/fixtures/pressure/template-spread-capture-semantics`
Probe file: `packages/lane-harness/probes/template-spread-capture-semantics.probes.json`
Lane: `diagnostics`

This snapshot records observed language-server behavior. Operator verdicts live in the probe data.

## spread-capture-app-template

### Probe

```json
{
  "file": "src/template-spread-capture-semantics-app.html"
}
```

### textDocument/diagnostic — full pull

```json
{
  "diagnosticCount": 8,
  "diagnostics": [
    {
      "anomaly": null,
      "code": "AUR0101",
      "data": {
        "diagnosticAuthority": "framework-error-code",
        "diagnosticDomain": "template",
        "diagnosticKind": "runtime-binding-behavior-framework-error",
        "frameworkErrorCode": "AUR0101",
        "frameworkRawErrorAuthority": null,
        "missingInput": "runtime-binding-behavior:AUR0101",
        "missingInputs": [
          "runtime-binding-behavior:AUR0101"
        ],
        "phase": "bind",
        "presentation": {
          "contextual": [],
          "maxRawSeverity": "error",
          "primarySeverity": "error",
          "rawRowCount": 1
        },
        "relatedInformation": [],
        "relatedQueryKind": "template-diagnostics",
        "repairAffordance": {
          "actionKind": "register-resource",
          "actionability": "guided",
          "changeDomain": "app-source",
          "planKind": "resource-registration",
          "readiness": "ready-to-plan",
          "targetSourceCoverage": "all"
        },
        "sourceRole": "template",
        "subject": null,
        "typeScriptDiagnosticCode": null
      },
      "message": "Binding behavior 'missingSpreadBehavior' was not resolved through the current compiler resource scope.",
      "range": {
        "end": {
          "character": 65,
          "line": 4
        },
        "start": {
          "character": 44,
          "line": 4
        }
      },
      "rangeText": "missingSpreadBehavior",
      "relatedInformation": [],
      "severity": "error",
      "source": "aurelia"
    },
    {
      "anomaly": null,
      "code": "binding-target-assignment-strictness",
      "data": {
        "diagnosticAuthority": "semantic-runtime-product",
        "diagnosticDomain": "template",
        "diagnosticKind": "binding-target-assignment-strictness",
        "frameworkErrorCode": null,
        "frameworkRawErrorAuthority": null,
        "missingInput": "binding-target-assignment:source-nullish-to-required-target",
        "missingInputs": [
          "binding-target-assignment:source-nullish-to-required-target"
        ],
        "phase": null,
        "presentation": {
          "contextual": [],
          "maxRawSeverity": "warning",
          "primarySeverity": "warning",
          "rawRowCount": 1
        },
        "relatedInformation": [],
        "relatedQueryKind": "template-diagnostics",
        "repairAffordance": {
          "actionKind": "rewrite-expression",
          "actionability": "guided",
          "changeDomain": "app-source",
          "planKind": "template-expression-rewrite",
          "readiness": "ready-to-plan",
          "targetSourceCoverage": "all"
        },
        "sourceRole": "template",
        "subject": {
          "source": {
            "end": 711,
            "kind": "source-span-address",
            "label": "src/template-spread-capture-semantics-app.html@697..711",
            "path": "src/template-spread-capture-semantics-app.html",
            "role": "binding-source-assignment",
            "start": 697
          },
          "span": null,
          "subjectKind": "template-expression",
          "uri": null
        },
        "typeScriptDiagnosticCode": null
      },
      "message": "Binding source type string | undefined may be nullish, but target 'title' requires string.",
      "range": {
        "end": {
          "character": 32,
          "line": 11
        },
        "start": {
          "character": 18,
          "line": 11
        }
      },
      "rangeText": "optionalSpread",
      "relatedInformation": [],
      "severity": "warning",
      "source": "aurelia"
    },
    {
      "anomaly": null,
      "code": "binding-target-assignment-strictness",
      "data": {
        "diagnosticAuthority": "semantic-runtime-product",
        "diagnosticDomain": "template",
        "diagnosticKind": "binding-target-assignment-strictness",
        "frameworkErrorCode": null,
        "frameworkRawErrorAuthority": null,
        "missingInput": "binding-target-assignment:source-nullish-to-required-target",
        "missingInputs": [
          "binding-target-assignment:source-nullish-to-required-target"
        ],
        "phase": null,
        "presentation": {
          "contextual": [],
          "maxRawSeverity": "warning",
          "primarySeverity": "warning",
          "rawRowCount": 1
        },
        "relatedInformation": [],
        "relatedQueryKind": "template-diagnostics",
        "repairAffordance": {
          "actionKind": "rewrite-expression",
          "actionability": "guided",
          "changeDomain": "app-source",
          "planKind": "template-expression-rewrite",
          "readiness": "ready-to-plan",
          "targetSourceCoverage": "all"
        },
        "sourceRole": "template",
        "subject": {
          "source": {
            "end": 767,
            "kind": "source-span-address",
            "label": "src/template-spread-capture-semantics-app.html@745..767",
            "path": "src/template-spread-capture-semantics-app.html",
            "role": "binding-source-assignment",
            "start": 745
          },
          "span": null,
          "subjectKind": "template-expression",
          "uri": null
        },
        "typeScriptDiagnosticCode": null
      },
      "message": "Binding source type string | undefined may be nullish, but target 'title' requires string.",
      "range": {
        "end": {
          "character": 40,
          "line": 12
        },
        "start": {
          "character": 18,
          "line": 12
        }
      },
      "rangeText": "presentUndefinedSpread",
      "relatedInformation": [],
      "severity": "warning",
      "source": "aurelia"
    },
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
        "presentation": {
          "contextual": [],
          "maxRawSeverity": "error",
          "primarySeverity": "error",
          "rawRowCount": 1
        },
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
      "message": "Spreading syntax \"...xxx\" is reserved. Encountered \"...$element\".",
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
    },
    {
      "anomaly": null,
      "code": "AUR0820",
      "data": {
        "diagnosticAuthority": "framework-error-code",
        "diagnosticDomain": "template",
        "diagnosticKind": "runtime-renderer-framework-error",
        "frameworkErrorCode": "AUR0820",
        "frameworkRawErrorAuthority": null,
        "missingInput": "runtime-renderer:AUR0820",
        "missingInputs": [
          "runtime-renderer:AUR0820"
        ],
        "phase": "render",
        "presentation": {
          "contextual": [],
          "maxRawSeverity": "error",
          "primarySeverity": "error",
          "rawRowCount": 1
        },
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
      "message": "Invalid spread target $element.",
      "range": {
        "end": {
          "character": 23,
          "line": 24
        },
        "start": {
          "character": 15,
          "line": 24
        }
      },
      "rangeText": "$element",
      "relatedInformation": [],
      "severity": "error",
      "source": "aurelia"
    },
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
        "presentation": {
          "contextual": [],
          "maxRawSeverity": "error",
          "primarySeverity": "error",
          "rawRowCount": 1
        },
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
      "message": "Spreading syntax \"...xxx\" is reserved. Encountered \"...$bindables\".",
      "range": {
        "end": {
          "character": 20,
          "line": 25
        },
        "start": {
          "character": 7,
          "line": 25
        }
      },
      "rangeText": "...$bindables",
      "relatedInformation": [],
      "severity": "error",
      "source": "aurelia"
    },
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
        "presentation": {
          "contextual": [],
          "maxRawSeverity": "error",
          "primarySeverity": "error",
          "rawRowCount": 1
        },
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
      "message": "SpreadBinding.bind requires the hydration-context controller scope to have a parent scope.",
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
    },
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
        "presentation": {
          "contextual": [],
          "maxRawSeverity": "error",
          "primarySeverity": "error",
          "rawRowCount": 1
        },
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
      "message": "SpreadBinding.addChild cannot admit captured template controller \"inner-gate\" on \"input\".",
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
  ],
  "outcome": "full",
  "previousResultIdPresent": false,
  "resultIdPresent": true,
  "uri": "fixtures://pressure/template-spread-capture-semantics/src/template-spread-capture-semantics-app.html"
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
  "uri": "fixtures://pressure/template-spread-capture-semantics/src/template-spread-capture-semantics-app.html"
}
```

## capture-shell-reusable-template

### Probe

```json
{
  "file": "src/capture-shell.html"
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
  "uri": "fixtures://pressure/template-spread-capture-semantics/src/capture-shell.html"
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
  "uri": "fixtures://pressure/template-spread-capture-semantics/src/capture-shell.html"
}
```

## capture-shell-inline-templates

### Probe

```json
{
  "file": "src/capture-shell.ts"
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
  "uri": "fixtures://pressure/template-spread-capture-semantics/src/capture-shell.ts"
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
  "uri": "fixtures://pressure/template-spread-capture-semantics/src/capture-shell.ts"
}
```
