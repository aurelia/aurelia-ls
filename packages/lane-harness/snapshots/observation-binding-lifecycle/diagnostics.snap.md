# observation-binding-lifecycle diagnostics lane snapshot

Fixture: `packages/semantic-runtime/fixtures/pressure/observation-binding-lifecycle`
Probe file: `packages/lane-harness/probes/observation-binding-lifecycle.probes.json`
Lane: `diagnostics`

This snapshot records observed language-server behavior. Operator verdicts live in the probe data.

## binding-behavior-reachability-and-order

### Probe

```json
{
  "file": "src/observation-binding-lifecycle-app.html"
}
```

### textDocument/diagnostic — full pull

```json
{
  "diagnosticCount": 8,
  "diagnostics": [
    {
      "anomaly": null,
      "code": "AUR0801",
      "data": {
        "diagnosticAuthority": "framework-error-code",
        "diagnosticDomain": "template",
        "diagnosticKind": "runtime-binding-behavior-framework-error",
        "frameworkErrorCode": "AUR0801",
        "frameworkRawErrorAuthority": null,
        "missingInput": "runtime-binding-behavior:AUR0801",
        "missingInputs": [
          "runtime-binding-behavior:AUR0801"
        ],
        "phase": "bind",
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
      "message": "Aurelia runtime binding behavior AUR0801 rejects this binding: self can only be applied to listener bindings created by trigger or capture commands..",
      "range": {
        "end": {
          "character": 85,
          "line": 2
        },
        "start": {
          "character": 81,
          "line": 2
        }
      },
      "rangeText": "self",
      "relatedInformation": [],
      "severity": "error",
      "source": "aurelia"
    },
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
      "message": "Aurelia runtime binding behavior AUR0101 rejects this binding: Binding behavior 'missingBehavior' was not resolved through the current compiler resource scope..",
      "range": {
        "end": {
          "character": 96,
          "line": 3
        },
        "start": {
          "character": 81,
          "line": 3
        }
      },
      "rangeText": "missingBehavior",
      "relatedInformation": [],
      "severity": "error",
      "source": "aurelia"
    },
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
      "message": "Aurelia runtime binding behavior AUR0101 rejects this binding: Binding behavior 'missingBehavior' was not resolved through the current compiler resource scope..",
      "range": {
        "end": {
          "character": 98,
          "line": 6
        },
        "start": {
          "character": 83,
          "line": 6
        }
      },
      "rangeText": "missingBehavior",
      "relatedInformation": [],
      "severity": "error",
      "source": "aurelia"
    },
    {
      "anomaly": null,
      "code": "AUR0803",
      "data": {
        "diagnosticAuthority": "framework-error-code",
        "diagnosticDomain": "template",
        "diagnosticKind": "runtime-binding-behavior-framework-error",
        "frameworkErrorCode": "AUR0803",
        "frameworkRawErrorAuthority": null,
        "missingInput": "runtime-binding-behavior:AUR0803",
        "missingInputs": [
          "runtime-binding-behavior:AUR0803"
        ],
        "phase": "bind",
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
      "message": "Aurelia runtime binding behavior AUR0803 rejects this binding: updateTrigger can only be applied to two-way or from-view PropertyBinding instances..",
      "range": {
        "end": {
          "character": 95,
          "line": 16
        },
        "start": {
          "character": 82,
          "line": 16
        }
      },
      "rangeText": "updateTrigger",
      "relatedInformation": [],
      "severity": "error",
      "source": "aurelia"
    },
    {
      "anomaly": null,
      "code": "binding-source-assignment-strictness",
      "data": {
        "diagnosticAuthority": "semantic-runtime-product",
        "diagnosticDomain": "template",
        "diagnosticKind": "binding-source-assignment-strictness",
        "frameworkErrorCode": null,
        "frameworkRawErrorAuthority": null,
        "missingInput": "binding-source-assignment:target-to-source-type-mismatch",
        "missingInputs": [
          "binding-source-assignment:target-to-source-type-mismatch"
        ],
        "phase": null,
        "relatedInformation": [],
        "relatedQueryKind": "template-diagnostics",
        "repairAffordance": {
          "actionKind": "align-assignment-type",
          "actionability": "guided",
          "changeDomain": "app-source",
          "planKind": "source-assignment-type-alignment",
          "readiness": "ready-to-plan",
          "targetSourceCoverage": "all"
        },
        "sourceRole": "template",
        "subject": {
          "source": {
            "end": 2242,
            "kind": "source-span-address",
            "label": "src/observation-binding-lifecycle-app.html@2225..2242",
            "path": "src/observation-binding-lifecycle-app.html",
            "role": "binding-source-assignment",
            "start": 2225
          },
          "span": null,
          "subjectKind": "template-expression",
          "uri": null
        },
        "typeScriptDiagnosticCode": null
      },
      "message": "TypeChecker target-to-source assignment is not assignable after observer and value-converter writeback (number -> string); Aurelia runtime still passes the observer value to astAssign.",
      "range": {
        "end": {
          "character": 58,
          "line": 28
        },
        "start": {
          "character": 41,
          "line": 28
        }
      },
      "rangeText": "reachedChildValue",
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
        "missingInput": "binding-target-assignment:source-to-target-type-mismatch",
        "missingInputs": [
          "binding-target-assignment:source-to-target-type-mismatch"
        ],
        "phase": null,
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
            "end": 2242,
            "kind": "source-span-address",
            "label": "src/observation-binding-lifecycle-app.html@2225..2242",
            "path": "src/observation-binding-lifecycle-app.html",
            "role": "binding-source-assignment",
            "start": 2225
          },
          "span": null,
          "subjectKind": "template-expression",
          "uri": null
        },
        "typeScriptDiagnosticCode": null
      },
      "message": "Binding source type string is not assignable to target 'value' of type number.",
      "range": {
        "end": {
          "character": 58,
          "line": 28
        },
        "start": {
          "character": 41,
          "line": 28
        }
      },
      "rangeText": "reachedChildValue",
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
        "missingInput": "binding-target-assignment:source-to-target-type-mismatch",
        "missingInputs": [
          "binding-target-assignment:source-to-target-type-mismatch"
        ],
        "phase": null,
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
            "end": 2367,
            "kind": "source-span-address",
            "label": "src/observation-binding-lifecycle-app.html@2350..2367",
            "path": "src/observation-binding-lifecycle-app.html",
            "role": "binding-source-assignment",
            "start": 2350
          },
          "span": null,
          "subjectKind": "template-expression",
          "uri": null
        },
        "typeScriptDiagnosticCode": null
      },
      "message": "Binding source type string is not assignable to target 'value' of type number.",
      "range": {
        "end": {
          "character": 58,
          "line": 30
        },
        "start": {
          "character": 41,
          "line": 30
        }
      },
      "rangeText": "blockedChildValue",
      "relatedInformation": [],
      "severity": "warning",
      "source": "aurelia"
    },
    {
      "anomaly": null,
      "code": "AUR0801",
      "data": {
        "diagnosticAuthority": "framework-error-code",
        "diagnosticDomain": "template",
        "diagnosticKind": "runtime-binding-behavior-framework-error",
        "frameworkErrorCode": "AUR0801",
        "frameworkRawErrorAuthority": null,
        "missingInput": "runtime-binding-behavior:AUR0801",
        "missingInputs": [
          "runtime-binding-behavior:AUR0801"
        ],
        "phase": "bind",
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
      "message": "Aurelia runtime binding behavior AUR0801 rejects this binding: self can only be applied to listener bindings created by trigger or capture commands..",
      "range": {
        "end": {
          "character": 74,
          "line": 30
        },
        "start": {
          "character": 70,
          "line": 30
        }
      },
      "rangeText": "self",
      "relatedInformation": [],
      "severity": "error",
      "source": "aurelia"
    }
  ],
  "outcome": "full",
  "previousResultIdPresent": false,
  "resultIdPresent": true,
  "uri": "fixtures://pressure/observation-binding-lifecycle/src/observation-binding-lifecycle-app.html"
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
  "uri": "fixtures://pressure/observation-binding-lifecycle/src/observation-binding-lifecycle-app.html"
}
```
