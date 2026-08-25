# template-compiler-errors diagnostics lane snapshot

Fixture: `packages/semantic-runtime/fixtures/pressure/template-compiler-errors`
Probe file: `packages/lane-harness/probes/template-compiler-errors.probes.json`
Lane: `diagnostics`

This snapshot records observed language-server behavior. Operator verdicts live in the probe data.

## compiler-main-template-errors

### Probe

```json
{
  "file": "src/template-compiler-errors-app.html"
}
```

### textDocument/diagnostic — full pull

```json
{
  "diagnosticCount": 10,
  "diagnostics": [
    {
      "anomaly": null,
      "code": "AUR0723",
      "data": {
        "diagnosticAuthority": "framework-error-code",
        "diagnosticDomain": "template",
        "diagnosticKind": "template-compiler-error",
        "frameworkErrorCode": "AUR0723",
        "frameworkRawErrorAuthority": null,
        "missingInput": "template-compiler:AUR0723",
        "missingInputs": [
          "template-compiler:AUR0723"
        ],
        "phase": "binding-command-lowering",
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
      "message": "Invalid class binding syntax.",
      "range": {
        "end": {
          "character": 22,
          "line": 0
        },
        "start": {
          "character": 5,
          "line": 0
        }
      },
      "rangeText": ",.class=\"enabled\"",
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
      "message": "Spreading syntax \"...xxx\" is reserved. Encountered \"...$element.bind\".",
      "range": {
        "end": {
          "character": 21,
          "line": 1
        },
        "start": {
          "character": 5,
          "line": 1
        }
      },
      "rangeText": "...$element.bind",
      "relatedInformation": [],
      "severity": "error",
      "source": "aurelia"
    },
    {
      "anomaly": null,
      "code": "AUR0721",
      "data": {
        "diagnosticAuthority": "framework-error-code",
        "diagnosticDomain": "template",
        "diagnosticKind": "template-compiler-error",
        "frameworkErrorCode": "AUR0721",
        "frameworkRawErrorAuthority": null,
        "missingInput": "template-compiler:AUR0721",
        "missingInputs": [
          "template-compiler:AUR0721"
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
      "message": "Usage of $bindables is only allowed on custom elements. Encountered \"$bindables.bind\".",
      "range": {
        "end": {
          "character": 15,
          "line": 2
        },
        "start": {
          "character": 5,
          "line": 2
        }
      },
      "rangeText": "$bindables",
      "relatedInformation": [],
      "severity": "error",
      "source": "aurelia"
    },
    {
      "anomaly": null,
      "code": "AUR0706",
      "data": {
        "diagnosticAuthority": "framework-error-code",
        "diagnosticDomain": "template",
        "diagnosticKind": "template-compiler-error",
        "frameworkErrorCode": "AUR0706",
        "frameworkRawErrorAuthority": null,
        "missingInput": "template-compiler:AUR0706",
        "missingInputs": [
          "template-compiler:AUR0706"
        ],
        "phase": "compiled-template",
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
      "message": "Detected projection with [au-slot=\"details\"] attempted on a non custom element div.",
      "range": {
        "end": {
          "character": 28,
          "line": 3
        },
        "start": {
          "character": 11,
          "line": 3
        }
      },
      "rangeText": "au-slot=\"details\"",
      "relatedInformation": [],
      "severity": "error",
      "source": "aurelia"
    },
    {
      "anomaly": null,
      "code": "AUR0717",
      "data": {
        "diagnosticAuthority": "framework-error-code",
        "diagnosticDomain": "template",
        "diagnosticKind": "template-compiler-error",
        "frameworkErrorCode": "AUR0717",
        "frameworkRawErrorAuthority": null,
        "missingInput": "template-compiler:AUR0717",
        "missingInputs": [
          "template-compiler:AUR0717"
        ],
        "phase": "compiled-template",
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
      "message": "Detected a usage of \"<slot>\" element without specifying shadow DOM options in element: template-compiler-errors-app.",
      "range": {
        "end": {
          "character": 13,
          "line": 4
        },
        "start": {
          "character": 0,
          "line": 4
        }
      },
      "rangeText": "<slot></slot>",
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
        "missingInput": "binding-target-assignment:source-to-target-type-mismatch",
        "missingInputs": [
          "binding-target-assignment:source-to-target-type-mismatch"
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
            "end": 323,
            "kind": "source-span-address",
            "label": "src/template-compiler-errors-app.html@316..323",
            "path": "src/template-compiler-errors-app.html",
            "role": "binding-source-assignment",
            "start": 316
          },
          "span": null,
          "subjectKind": "template-expression",
          "uri": null
        },
        "typeScriptDiagnosticCode": null
      },
      "message": "Binding source type boolean is not assignable to target 'value' of type string.",
      "range": {
        "end": {
          "character": 40,
          "line": 5
        },
        "start": {
          "character": 33,
          "line": 5
        }
      },
      "rangeText": "enabled",
      "relatedInformation": [],
      "severity": "warning",
      "source": "aurelia"
    },
    {
      "anomaly": null,
      "code": "AUR0707",
      "data": {
        "diagnosticAuthority": "framework-error-code",
        "diagnosticDomain": "template",
        "diagnosticKind": "template-compiler-error",
        "frameworkErrorCode": "AUR0707",
        "frameworkRawErrorAuthority": null,
        "missingInput": "template-compiler:AUR0707",
        "missingInputs": [
          "template-compiler:AUR0707"
        ],
        "phase": "binding-command-lowering",
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
      "message": "In custom attribute \"template-probe\": property \"missing\" is not bindable.",
      "range": {
        "end": {
          "character": 49,
          "line": 5
        },
        "start": {
          "character": 42,
          "line": 5
        }
      },
      "rangeText": "missing",
      "relatedInformation": [],
      "severity": "error",
      "source": "aurelia"
    },
    {
      "anomaly": null,
      "code": "AUR0704",
      "data": {
        "diagnosticAuthority": "framework-error-code",
        "diagnosticDomain": "template",
        "diagnosticKind": "template-compiler-error",
        "frameworkErrorCode": "AUR0704",
        "frameworkRawErrorAuthority": null,
        "missingInput": "template-compiler:AUR0704",
        "missingInputs": [
          "template-compiler:AUR0704"
        ],
        "phase": "compiled-template",
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
      "message": "Invalid command \".trigger\" for <let>. Use .bind or remove the command.",
      "range": {
        "end": {
          "character": 17,
          "line": 6
        },
        "start": {
          "character": 10,
          "line": 6
        }
      },
      "rangeText": "trigger",
      "relatedInformation": [],
      "severity": "error",
      "source": "aurelia"
    },
    {
      "anomaly": null,
      "code": "AUR0713",
      "data": {
        "diagnosticAuthority": "framework-error-code",
        "diagnosticDomain": "template",
        "diagnosticKind": "template-compiler-error",
        "frameworkErrorCode": "AUR0713",
        "frameworkRawErrorAuthority": null,
        "missingInput": "template-compiler:AUR0713",
        "missingInputs": [
          "template-compiler:AUR0713"
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
      "message": "Unknown binding command: \"delegate\". The \".delegate\" binding command has been removed in v2. Binding command \".trigger\" should be used instead. If you are migrating v1 application, install compat package to add back the \".delegate\" binding command for ease of migration.",
      "range": {
        "end": {
          "character": 22,
          "line": 7
        },
        "start": {
          "character": 14,
          "line": 7
        }
      },
      "rangeText": "delegate",
      "relatedInformation": [],
      "severity": "error",
      "source": "aurelia"
    },
    {
      "anomaly": null,
      "code": "AUR0713",
      "data": {
        "diagnosticAuthority": "framework-error-code",
        "diagnosticDomain": "template",
        "diagnosticKind": "template-compiler-error",
        "frameworkErrorCode": "AUR0713",
        "frameworkRawErrorAuthority": null,
        "missingInput": "template-compiler:AUR0713",
        "missingInputs": [
          "template-compiler:AUR0713"
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
      "message": "Unknown binding command: \"call\". The \".call\" binding command has been removed in v2. If you want to pass a callback that preserves the context of the function call, you can use lambda instead. Refer to lambda expression doc for more details.",
      "range": {
        "end": {
          "character": 18,
          "line": 8
        },
        "start": {
          "character": 14,
          "line": 8
        }
      },
      "rangeText": "call",
      "relatedInformation": [],
      "severity": "error",
      "source": "aurelia"
    }
  ],
  "outcome": "full",
  "previousResultIdPresent": false,
  "resultIdPresent": true,
  "uri": "fixtures://pressure/template-compiler-errors/src/template-compiler-errors-app.html"
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
  "uri": "fixtures://pressure/template-compiler-errors/src/template-compiler-errors-app.html"
}
```

## compiler-local-bindable-errors

### Probe

```json
{
  "file": "src/local-bindable-probe.html"
}
```

### textDocument/diagnostic — full pull

```json
{
  "diagnosticCount": 6,
  "diagnostics": [
    {
      "anomaly": null,
      "code": "AUR0711",
      "data": {
        "diagnosticAuthority": "framework-error-code",
        "diagnosticDomain": "template",
        "diagnosticKind": "template-compiler-error",
        "frameworkErrorCode": "AUR0711",
        "frameworkRawErrorAuthority": null,
        "missingInput": "template-compiler:AUR0711",
        "missingInputs": [
          "template-compiler:AUR0711"
        ],
        "phase": "compiled-template",
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
      "message": "The attribute 'property' is missing in <bindable> in local element \"bindable-child\".",
      "range": {
        "end": {
          "character": 25,
          "line": 2
        },
        "start": {
          "character": 4,
          "line": 2
        }
      },
      "rangeText": "<bindable></bindable>",
      "relatedInformation": [],
      "severity": "error",
      "source": "aurelia"
    },
    {
      "anomaly": null,
      "code": "AUR0710",
      "data": {
        "diagnosticAuthority": "framework-error-code",
        "diagnosticDomain": "template",
        "diagnosticKind": "template-compiler-error",
        "frameworkErrorCode": "AUR0710",
        "frameworkRawErrorAuthority": null,
        "missingInput": "template-compiler:AUR0710",
        "missingInputs": [
          "template-compiler:AUR0710"
        ],
        "phase": "compiled-template",
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
      "message": "Bindable properties of local element \"bindable-child\" template needs to be defined directly under <template>.",
      "range": {
        "end": {
          "character": 41,
          "line": 4
        },
        "start": {
          "character": 6,
          "line": 4
        }
      },
      "rangeText": "<bindable name=\"nested\"></bindable>",
      "relatedInformation": [],
      "severity": "error",
      "source": "aurelia"
    },
    {
      "anomaly": null,
      "code": "AUR0712",
      "data": {
        "diagnosticAuthority": "framework-error-code",
        "diagnosticDomain": "template",
        "diagnosticKind": "template-compiler-error",
        "frameworkErrorCode": "AUR0712",
        "frameworkRawErrorAuthority": null,
        "missingInput": "template-compiler:AUR0712",
        "missingInputs": [
          "template-compiler:AUR0712"
        ],
        "phase": "compiled-template",
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
      "message": "Bindable property and attribute needs to be unique; found property: title, attribute: (none).",
      "range": {
        "end": {
          "character": 25,
          "line": 7
        },
        "start": {
          "character": 20,
          "line": 7
        }
      },
      "rangeText": "title",
      "relatedInformation": [],
      "severity": "error",
      "source": "aurelia"
    },
    {
      "anomaly": null,
      "code": "AUR0712",
      "data": {
        "diagnosticAuthority": "framework-error-code",
        "diagnosticDomain": "template",
        "diagnosticKind": "template-compiler-error",
        "frameworkErrorCode": "AUR0712",
        "frameworkRawErrorAuthority": null,
        "missingInput": "template-compiler:AUR0712",
        "missingInputs": [
          "template-compiler:AUR0712"
        ],
        "phase": "compiled-template",
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
      "message": "Bindable property and attribute needs to be unique; found property: other, attribute: label.",
      "range": {
        "end": {
          "character": 43,
          "line": 8
        },
        "start": {
          "character": 38,
          "line": 8
        }
      },
      "rangeText": "label",
      "relatedInformation": [],
      "severity": "error",
      "source": "aurelia"
    },
    {
      "anomaly": null,
      "code": "AUR0715",
      "data": {
        "diagnosticAuthority": "framework-error-code",
        "diagnosticDomain": "template",
        "diagnosticKind": "template-compiler-error",
        "frameworkErrorCode": "AUR0715",
        "frameworkRawErrorAuthority": null,
        "missingInput": "template-compiler:AUR0715",
        "missingInputs": [
          "template-compiler:AUR0715"
        ],
        "phase": "compiled-template",
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
      "message": "The value of \"as-custom-element\" attribute cannot be empty for local element in element \"local-bindable-probe\".",
      "range": {
        "end": {
          "character": 32,
          "line": 10
        },
        "start": {
          "character": 12,
          "line": 10
        }
      },
      "rangeText": "as-custom-element=\"\"",
      "relatedInformation": [],
      "severity": "error",
      "source": "aurelia"
    },
    {
      "anomaly": null,
      "code": "AUR0716",
      "data": {
        "diagnosticAuthority": "framework-error-code",
        "diagnosticDomain": "template",
        "diagnosticKind": "template-compiler-error",
        "frameworkErrorCode": "AUR0716",
        "frameworkRawErrorAuthority": null,
        "missingInput": "template-compiler:AUR0716",
        "missingInputs": [
          "template-compiler:AUR0716"
        ],
        "phase": "compiled-template",
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
      "message": "Duplicate definition of the local template named \"duplicate-child\" in element local-bindable-probe.",
      "range": {
        "end": {
          "character": 46,
          "line": 14
        },
        "start": {
          "character": 31,
          "line": 14
        }
      },
      "rangeText": "duplicate-child",
      "relatedInformation": [],
      "severity": "error",
      "source": "aurelia"
    }
  ],
  "outcome": "full",
  "previousResultIdPresent": false,
  "resultIdPresent": true,
  "uri": "fixtures://pressure/template-compiler-errors/src/local-bindable-probe.html"
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
  "uri": "fixtures://pressure/template-compiler-errors/src/local-bindable-probe.html"
}
```

## compiler-local-nested-error

### Probe

```json
{
  "file": "src/local-nested-probe.html"
}
```

### textDocument/diagnostic — full pull

```json
{
  "diagnosticCount": 1,
  "diagnostics": [
    {
      "anomaly": null,
      "code": "AUR0709",
      "data": {
        "diagnosticAuthority": "framework-error-code",
        "diagnosticDomain": "template",
        "diagnosticKind": "template-compiler-error",
        "frameworkErrorCode": "AUR0709",
        "frameworkRawErrorAuthority": null,
        "missingInput": "template-compiler:AUR0709",
        "missingInputs": [
          "template-compiler:AUR0709"
        ],
        "phase": "compiled-template",
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
      "message": "Local element template needs to be defined directly under root of element \"local-nested-probe\".",
      "range": {
        "end": {
          "character": 15,
          "line": 4
        },
        "start": {
          "character": 4,
          "line": 2
        }
      },
      "rangeText": "<template as-custom-element=\"nested-child\">\n      <p>Nested local child</p>\n    </template>",
      "relatedInformation": [],
      "severity": "error",
      "source": "aurelia"
    }
  ],
  "outcome": "full",
  "previousResultIdPresent": false,
  "resultIdPresent": true,
  "uri": "fixtures://pressure/template-compiler-errors/src/local-nested-probe.html"
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
  "uri": "fixtures://pressure/template-compiler-errors/src/local-nested-probe.html"
}
```

## compiler-local-only-error

### Probe

```json
{
  "file": "src/local-only-probe.html"
}
```

### textDocument/diagnostic — full pull

```json
{
  "diagnosticCount": 1,
  "diagnostics": [
    {
      "anomaly": null,
      "code": "AUR0708",
      "data": {
        "diagnosticAuthority": "framework-error-code",
        "diagnosticDomain": "template",
        "diagnosticKind": "template-compiler-error",
        "frameworkErrorCode": "AUR0708",
        "frameworkRawErrorAuthority": null,
        "missingInput": "template-compiler:AUR0708",
        "missingInputs": [
          "template-compiler:AUR0708"
        ],
        "phase": "compiled-template",
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
      "message": "The custom element \"local-only-probe\" does not have any content other than local template(s).",
      "range": {
        "end": {
          "character": 0,
          "line": 5
        },
        "start": {
          "character": 0,
          "line": 0
        }
      },
      "rangeText": "<template>\n  <template as-custom-element=\"only-child\">\n    <p>Only local child</p>\n  </template>\n</template>\n",
      "relatedInformation": [],
      "severity": "error",
      "source": "aurelia"
    }
  ],
  "outcome": "full",
  "previousResultIdPresent": false,
  "resultIdPresent": true,
  "uri": "fixtures://pressure/template-compiler-errors/src/local-only-probe.html"
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
  "uri": "fixtures://pressure/template-compiler-errors/src/local-only-probe.html"
}
```

## compiler-local-root-error

### Probe

```json
{
  "file": "src/local-root-probe.html"
}
```

### textDocument/diagnostic — full pull

```json
{
  "diagnosticCount": 1,
  "diagnostics": [
    {
      "anomaly": null,
      "code": "AUR0701",
      "data": {
        "diagnosticAuthority": "framework-error-code",
        "diagnosticDomain": "template",
        "diagnosticKind": "template-compiler-error",
        "frameworkErrorCode": "AUR0701",
        "frameworkRawErrorAuthority": null,
        "missingInput": "template-compiler:AUR0701",
        "missingInputs": [
          "template-compiler:AUR0701"
        ],
        "phase": "compiled-template",
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
      "message": "In element \"local-root-probe\": the root <template> cannot be a local element template.",
      "range": {
        "end": {
          "character": 46,
          "line": 0
        },
        "start": {
          "character": 10,
          "line": 0
        }
      },
      "rangeText": "as-custom-element=\"root-local-probe\"",
      "relatedInformation": [],
      "severity": "error",
      "source": "aurelia"
    }
  ],
  "outcome": "full",
  "previousResultIdPresent": false,
  "resultIdPresent": true,
  "uri": "fixtures://pressure/template-compiler-errors/src/local-root-probe.html"
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
  "uri": "fixtures://pressure/template-compiler-errors/src/local-root-probe.html"
}
```

## compiler-surrogate-invalid-attribute-error

### Probe

```json
{
  "file": "src/surrogate-invalid-attribute.html"
}
```

### textDocument/diagnostic — full pull

```json
{
  "diagnosticCount": 1,
  "diagnostics": [
    {
      "anomaly": null,
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
      "message": "Attribute \"id\" is invalid on element surrogate.",
      "range": {
        "end": {
          "character": 32,
          "line": 0
        },
        "start": {
          "character": 10,
          "line": 0
        }
      },
      "rangeText": "id=\"invalid-surrogate\"",
      "relatedInformation": [],
      "severity": "error",
      "source": "aurelia"
    }
  ],
  "outcome": "full",
  "previousResultIdPresent": false,
  "resultIdPresent": true,
  "uri": "fixtures://pressure/template-compiler-errors/src/surrogate-invalid-attribute.html"
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
  "uri": "fixtures://pressure/template-compiler-errors/src/surrogate-invalid-attribute.html"
}
```

## compiler-surrogate-template-controller-error

### Probe

```json
{
  "file": "src/surrogate-template-probe.html"
}
```

### textDocument/diagnostic — full pull

```json
{
  "diagnosticCount": 1,
  "diagnostics": [
    {
      "anomaly": null,
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
      "message": "Template controller \"if\" is invalid on element surrogate.",
      "range": {
        "end": {
          "character": 12,
          "line": 0
        },
        "start": {
          "character": 10,
          "line": 0
        }
      },
      "rangeText": "if",
      "relatedInformation": [],
      "severity": "error",
      "source": "aurelia"
    }
  ],
  "outcome": "full",
  "previousResultIdPresent": false,
  "resultIdPresent": true,
  "uri": "fixtures://pressure/template-compiler-errors/src/surrogate-template-probe.html"
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
  "uri": "fixtures://pressure/template-compiler-errors/src/surrogate-template-probe.html"
}
```
