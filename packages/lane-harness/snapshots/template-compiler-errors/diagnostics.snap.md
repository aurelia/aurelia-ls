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

### publishDiagnostics

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
      "message": "Aurelia template compiler AUR0723 rejects this template syntax: Invalid class binding syntax..",
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
      "message": "Aurelia template compiler AUR0720 rejects this template syntax: Spreading syntax \"...xxx\" is reserved. Encountered \"...$element.bind\"..",
      "range": {
        "end": {
          "character": 36,
          "line": 1
        },
        "start": {
          "character": 5,
          "line": 1
        }
      },
      "rangeText": "...$element.bind=\"spreadSource\"",
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
      "message": "Aurelia template compiler AUR0721 rejects this template syntax: Usage of $bindables is only allowed on custom elements. Encountered \"$bindables.bind\"..",
      "range": {
        "end": {
          "character": 35,
          "line": 2
        },
        "start": {
          "character": 5,
          "line": 2
        }
      },
      "rangeText": "$bindables.bind=\"spreadSource\"",
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
      "message": "Aurelia template compiler AUR0706 rejects this template syntax: Template compilation error: detected projection with [au-slot=\"details\"] attempted on a non custom element div..",
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
      "message": "Aurelia template compiler AUR0717 rejects this template syntax: Template compilation error: detected a usage of \"<slot>\" element without specifying shadow DOM options in element: template-compiler-errors-app.",
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
        "taxonomy": {
          "actionability": "guided",
          "category": "template-syntax",
          "confidence": null,
          "impact": "degraded",
          "schema": "diagnostics-taxonomy/1"
        }
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
      "message": "Aurelia template compiler AUR0707 rejects this template syntax: Template compilation error in custom attribute \"template-probe\": property \"missing\" is not bindable..",
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
      "message": "Aurelia template compiler AUR0704 rejects this template syntax: Template compilation error: Invalid command \".trigger\" for <let>. Use .bind or remove the command.",
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
      "message": "Aurelia template compiler AUR0713 rejects this template syntax: Template compilation error: unknown binding command: \"delegate\". The \".delegate\" binding command has been removed in v2. Binding command \".trigger\" should be used instead. If you are migrating v1 application, install compat package to add back the \".delegate\" binding command for ease of migration..",
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
      "message": "Aurelia template compiler AUR0713 rejects this template syntax: Template compilation error: unknown binding command: \"call\". The \".call\" binding command has been removed in v2. If you want to pass a callback that preserves the context of the function call, you can use lambda instead. Refer to lambda expression doc for more details..",
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
  "outcome": "published",
  "uri": "fixtures://pressure/template-compiler-errors/src/template-compiler-errors-app.html"
}
```

### aurelia/getDiagnostics

```json
{
  "fingerprint": "semantic-runtime:hit",
  "outcome": "result",
  "presentation": {
    "complete": true,
    "contextualCount": 0,
    "groups": [
      {
        "groupKey": "row:diagnostic:7:template:template-compiler-error:framework-error-code:AUR0723:src/template-compiler-errors-app.html:5:22:template-compiler:AUR0723",
        "maxRawSeverity": "error",
        "primary": {
          "diagnostic": {
            "actionability": "guided",
            "anomaly": null,
            "category": "template-syntax",
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
              "sourceRole": null,
              "subject": null,
              "taxonomy": {
                "actionability": null,
                "category": null,
                "confidence": null,
                "impact": null,
                "schema": null
              }
            },
            "file": "src/template-compiler-errors-app.html",
            "impact": "blocking",
            "issues": [
              {
                "code": "AUR0723",
                "kind": "template-compiler-error",
                "message": "Aurelia template compiler AUR0723 rejects this template syntax: Invalid class binding syntax.."
              }
            ],
            "message": "Aurelia template compiler AUR0723 rejects this template syntax: Invalid class binding syntax..",
            "related": [],
            "severity": "error",
            "source": "semantic-runtime:template",
            "span": {
              "end": 22,
              "start": 5
            },
            "spanText": ",.class=\"enabled\"",
            "status": "primary",
            "uri": "fixtures://pressure/template-compiler-errors/src/template-compiler-errors-app.html"
          },
          "relation": null,
          "role": "primary",
          "rowId": "diagnostic:7:template:template-compiler-error:framework-error-code:AUR0723:src/template-compiler-errors-app.html:5:22:template-compiler:AUR0723"
        },
        "primarySeverity": "error",
        "rawRowCount": 1,
        "related": [],
        "subject": null
      },
      {
        "groupKey": "row:diagnostic:9:template:template-compiler-error:framework-error-code:AUR0720:src/template-compiler-errors-app.html:63:94:template-compiler:AUR0720",
        "maxRawSeverity": "error",
        "primary": {
          "diagnostic": {
            "actionability": "guided",
            "anomaly": null,
            "category": "template-syntax",
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
              "sourceRole": null,
              "subject": null,
              "taxonomy": {
                "actionability": null,
                "category": null,
                "confidence": null,
                "impact": null,
                "schema": null
              }
            },
            "file": "src/template-compiler-errors-app.html",
            "impact": "blocking",
            "issues": [
              {
                "code": "AUR0720",
                "kind": "template-compiler-error",
                "message": "Aurelia template compiler AUR0720 rejects this template syntax: Spreading syntax \"...xxx\" is reserved. Encountered \"...$element.bind\".."
              }
            ],
            "message": "Aurelia template compiler AUR0720 rejects this template syntax: Spreading syntax \"...xxx\" is reserved. Encountered \"...$element.bind\"..",
            "related": [],
            "severity": "error",
            "source": "semantic-runtime:template",
            "span": {
              "end": 94,
              "start": 63
            },
            "spanText": "...$element.bind=\"spreadSource\"",
            "status": "primary",
            "uri": "fixtures://pressure/template-compiler-errors/src/template-compiler-errors-app.html"
          },
          "relation": null,
          "role": "primary",
          "rowId": "diagnostic:9:template:template-compiler-error:framework-error-code:AUR0720:src/template-compiler-errors-app.html:63:94:template-compiler:AUR0720"
        },
        "primarySeverity": "error",
        "rawRowCount": 1,
        "related": [],
        "subject": null
      },
      {
        "groupKey": "row:diagnostic:0:template:template-compiler-error:framework-error-code:AUR0721:src/template-compiler-errors-app.html:129:159:template-compiler:AUR0721",
        "maxRawSeverity": "error",
        "primary": {
          "diagnostic": {
            "actionability": "guided",
            "anomaly": null,
            "category": "template-syntax",
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
              "sourceRole": null,
              "subject": null,
              "taxonomy": {
                "actionability": null,
                "category": null,
                "confidence": null,
                "impact": null,
                "schema": null
              }
            },
            "file": "src/template-compiler-errors-app.html",
            "impact": "blocking",
            "issues": [
              {
                "code": "AUR0721",
                "kind": "template-compiler-error",
                "message": "Aurelia template compiler AUR0721 rejects this template syntax: Usage of $bindables is only allowed on custom elements. Encountered \"$bindables.bind\".."
              }
            ],
            "message": "Aurelia template compiler AUR0721 rejects this template syntax: Usage of $bindables is only allowed on custom elements. Encountered \"$bindables.bind\"..",
            "related": [],
            "severity": "error",
            "source": "semantic-runtime:template",
            "span": {
              "end": 159,
              "start": 129
            },
            "spanText": "$bindables.bind=\"spreadSource\"",
            "status": "primary",
            "uri": "fixtures://pressure/template-compiler-errors/src/template-compiler-errors-app.html"
          },
          "relation": null,
          "role": "primary",
          "rowId": "diagnostic:0:template:template-compiler-error:framework-error-code:AUR0721:src/template-compiler-errors-app.html:129:159:template-compiler:AUR0721"
        },
        "primarySeverity": "error",
        "rawRowCount": 1,
        "related": [],
        "subject": null
      },
      {
        "groupKey": "row:diagnostic:1:template:template-compiler-error:framework-error-code:AUR0706:src/template-compiler-errors-app.html:203:220:template-compiler:AUR0706",
        "maxRawSeverity": "error",
        "primary": {
          "diagnostic": {
            "actionability": "guided",
            "anomaly": null,
            "category": "template-syntax",
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
              "sourceRole": null,
              "subject": null,
              "taxonomy": {
                "actionability": null,
                "category": null,
                "confidence": null,
                "impact": null,
                "schema": null
              }
            },
            "file": "src/template-compiler-errors-app.html",
            "impact": "blocking",
            "issues": [
              {
                "code": "AUR0706",
                "kind": "template-compiler-error",
                "message": "Aurelia template compiler AUR0706 rejects this template syntax: Template compilation error: detected projection with [au-slot=\"details\"] attempted on a non custom element div.."
              }
            ],
            "message": "Aurelia template compiler AUR0706 rejects this template syntax: Template compilation error: detected projection with [au-slot=\"details\"] attempted on a non custom element div..",
            "related": [],
            "severity": "error",
            "source": "semantic-runtime:template",
            "span": {
              "end": 220,
              "start": 203
            },
            "spanText": "au-slot=\"details\"",
            "status": "primary",
            "uri": "fixtures://pressure/template-compiler-errors/src/template-compiler-errors-app.html"
          },
          "relation": null,
          "role": "primary",
          "rowId": "diagnostic:1:template:template-compiler-error:framework-error-code:AUR0706:src/template-compiler-errors-app.html:203:220:template-compiler:AUR0706"
        },
        "primarySeverity": "error",
        "rawRowCount": 1,
        "related": [],
        "subject": null
      },
      {
        "groupKey": "row:diagnostic:2:template:template-compiler-error:framework-error-code:AUR0717:src/template-compiler-errors-app.html:269:282:template-compiler:AUR0717",
        "maxRawSeverity": "error",
        "primary": {
          "diagnostic": {
            "actionability": "guided",
            "anomaly": null,
            "category": "template-syntax",
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
              "sourceRole": null,
              "subject": null,
              "taxonomy": {
                "actionability": null,
                "category": null,
                "confidence": null,
                "impact": null,
                "schema": null
              }
            },
            "file": "src/template-compiler-errors-app.html",
            "impact": "blocking",
            "issues": [
              {
                "code": "AUR0717",
                "kind": "template-compiler-error",
                "message": "Aurelia template compiler AUR0717 rejects this template syntax: Template compilation error: detected a usage of \"<slot>\" element without specifying shadow DOM options in element: template-compiler-errors-app."
              }
            ],
            "message": "Aurelia template compiler AUR0717 rejects this template syntax: Template compilation error: detected a usage of \"<slot>\" element without specifying shadow DOM options in element: template-compiler-errors-app.",
            "related": [],
            "severity": "error",
            "source": "semantic-runtime:template",
            "span": {
              "end": 282,
              "start": 269
            },
            "spanText": "<slot></slot>",
            "status": "primary",
            "uri": "fixtures://pressure/template-compiler-errors/src/template-compiler-errors-app.html"
          },
          "relation": null,
          "role": "primary",
          "rowId": "diagnostic:2:template:template-compiler-error:framework-error-code:AUR0717:src/template-compiler-errors-app.html:269:282:template-compiler:AUR0717"
        },
        "primarySeverity": "error",
        "rawRowCount": 1,
        "related": [],
        "subject": null
      },
      {
        "groupKey": "row:diagnostic:3:template:binding-target-assignment-strictness:semantic-runtime-product:no-framework-code:src/template-compiler-errors-app.html:316:323:binding-target-assignment:source-to-target-type-mismatch",
        "maxRawSeverity": "warning",
        "primary": {
          "diagnostic": {
            "actionability": "guided",
            "anomaly": null,
            "category": "template-syntax",
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
              "sourceRole": null,
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
              "taxonomy": {
                "actionability": null,
                "category": null,
                "confidence": null,
                "impact": null,
                "schema": null
              }
            },
            "file": "src/template-compiler-errors-app.html",
            "impact": "degraded",
            "issues": [
              {
                "code": "binding-target-assignment-strictness",
                "kind": "binding-target-assignment-strictness",
                "message": "Binding source type boolean is not assignable to target 'value' of type string."
              }
            ],
            "message": "Binding source type boolean is not assignable to target 'value' of type string.",
            "related": [],
            "severity": "warning",
            "source": "semantic-runtime:template",
            "span": {
              "end": 323,
              "start": 316
            },
            "spanText": "enabled",
            "status": "primary",
            "uri": "fixtures://pressure/template-compiler-errors/src/template-compiler-errors-app.html"
          },
          "relation": null,
          "role": "primary",
          "rowId": "diagnostic:3:template:binding-target-assignment-strictness:semantic-runtime-product:no-framework-code:src/template-compiler-errors-app.html:316:323:binding-target-assignment:source-to-target-type-mismatch"
        },
        "primarySeverity": "warning",
        "rawRowCount": 1,
        "related": [],
        "subject": {
          "source": null,
          "span": {
            "end": 323,
            "start": 316
          },
          "subjectKind": "template-expression",
          "uri": "file:///c:/projects/aurelia-ls2/packages/semantic-runtime/fixtures/pressure/template-compiler-errors/src/template-compiler-errors-app.html"
        }
      },
      {
        "groupKey": "row:diagnostic:4:template:template-compiler-error:framework-error-code:AUR0707:src/template-compiler-errors-app.html:325:332:template-compiler:AUR0707",
        "maxRawSeverity": "error",
        "primary": {
          "diagnostic": {
            "actionability": "guided",
            "anomaly": null,
            "category": "template-syntax",
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
              "sourceRole": null,
              "subject": null,
              "taxonomy": {
                "actionability": null,
                "category": null,
                "confidence": null,
                "impact": null,
                "schema": null
              }
            },
            "file": "src/template-compiler-errors-app.html",
            "impact": "blocking",
            "issues": [
              {
                "code": "AUR0707",
                "kind": "template-compiler-error",
                "message": "Aurelia template compiler AUR0707 rejects this template syntax: Template compilation error in custom attribute \"template-probe\": property \"missing\" is not bindable.."
              }
            ],
            "message": "Aurelia template compiler AUR0707 rejects this template syntax: Template compilation error in custom attribute \"template-probe\": property \"missing\" is not bindable..",
            "related": [],
            "severity": "error",
            "source": "semantic-runtime:template",
            "span": {
              "end": 332,
              "start": 325
            },
            "spanText": "missing",
            "status": "primary",
            "uri": "fixtures://pressure/template-compiler-errors/src/template-compiler-errors-app.html"
          },
          "relation": null,
          "role": "primary",
          "rowId": "diagnostic:4:template:template-compiler-error:framework-error-code:AUR0707:src/template-compiler-errors-app.html:325:332:template-compiler:AUR0707"
        },
        "primarySeverity": "error",
        "rawRowCount": 1,
        "related": [],
        "subject": null
      },
      {
        "groupKey": "row:diagnostic:5:template:template-compiler-error:framework-error-code:AUR0704:src/template-compiler-errors-app.html:402:409:template-compiler:AUR0704",
        "maxRawSeverity": "error",
        "primary": {
          "diagnostic": {
            "actionability": "guided",
            "anomaly": null,
            "category": "template-syntax",
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
              "sourceRole": null,
              "subject": null,
              "taxonomy": {
                "actionability": null,
                "category": null,
                "confidence": null,
                "impact": null,
                "schema": null
              }
            },
            "file": "src/template-compiler-errors-app.html",
            "impact": "blocking",
            "issues": [
              {
                "code": "AUR0704",
                "kind": "template-compiler-error",
                "message": "Aurelia template compiler AUR0704 rejects this template syntax: Template compilation error: Invalid command \".trigger\" for <let>. Use .bind or remove the command."
              }
            ],
            "message": "Aurelia template compiler AUR0704 rejects this template syntax: Template compilation error: Invalid command \".trigger\" for <let>. Use .bind or remove the command.",
            "related": [],
            "severity": "error",
            "source": "semantic-runtime:template",
            "span": {
              "end": 409,
              "start": 402
            },
            "spanText": "trigger",
            "status": "primary",
            "uri": "fixtures://pressure/template-compiler-errors/src/template-compiler-errors-app.html"
          },
          "relation": null,
          "role": "primary",
          "rowId": "diagnostic:5:template:template-compiler-error:framework-error-code:AUR0704:src/template-compiler-errors-app.html:402:409:template-compiler:AUR0704"
        },
        "primarySeverity": "error",
        "rawRowCount": 1,
        "related": [],
        "subject": null
      },
      {
        "groupKey": "row:diagnostic:6:template:template-compiler-error:framework-error-code:AUR0713:src/template-compiler-errors-app.html:441:449:template-compiler:AUR0713",
        "maxRawSeverity": "error",
        "primary": {
          "diagnostic": {
            "actionability": "guided",
            "anomaly": null,
            "category": "template-syntax",
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
              "sourceRole": null,
              "subject": null,
              "taxonomy": {
                "actionability": null,
                "category": null,
                "confidence": null,
                "impact": null,
                "schema": null
              }
            },
            "file": "src/template-compiler-errors-app.html",
            "impact": "blocking",
            "issues": [
              {
                "code": "AUR0713",
                "kind": "template-compiler-error",
                "message": "Aurelia template compiler AUR0713 rejects this template syntax: Template compilation error: unknown binding command: \"delegate\". The \".delegate\" binding command has been removed in v2. Binding command \".trigger\" should be used instead. If you are migrating v1 application, install compat package to add back the \".delegate\" binding command for ease of migration.."
              }
            ],
            "message": "Aurelia template compiler AUR0713 rejects this template syntax: Template compilation error: unknown binding command: \"delegate\". The \".delegate\" binding command has been removed in v2. Binding command \".trigger\" should be used instead. If you are migrating v1 application, install compat package to add back the \".delegate\" binding command for ease of migration..",
            "related": [],
            "severity": "error",
            "source": "semantic-runtime:template",
            "span": {
              "end": 449,
              "start": 441
            },
            "spanText": "delegate",
            "status": "primary",
            "uri": "fixtures://pressure/template-compiler-errors/src/template-compiler-errors-app.html"
          },
          "relation": null,
          "role": "primary",
          "rowId": "diagnostic:6:template:template-compiler-error:framework-error-code:AUR0713:src/template-compiler-errors-app.html:441:449:template-compiler:AUR0713"
        },
        "primarySeverity": "error",
        "rawRowCount": 1,
        "related": [],
        "subject": null
      },
      {
        "groupKey": "row:diagnostic:8:template:template-compiler-error:framework-error-code:AUR0713:src/template-compiler-errors-app.html:518:522:template-compiler:AUR0713",
        "maxRawSeverity": "error",
        "primary": {
          "diagnostic": {
            "actionability": "guided",
            "anomaly": null,
            "category": "template-syntax",
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
              "sourceRole": null,
              "subject": null,
              "taxonomy": {
                "actionability": null,
                "category": null,
                "confidence": null,
                "impact": null,
                "schema": null
              }
            },
            "file": "src/template-compiler-errors-app.html",
            "impact": "blocking",
            "issues": [
              {
                "code": "AUR0713",
                "kind": "template-compiler-error",
                "message": "Aurelia template compiler AUR0713 rejects this template syntax: Template compilation error: unknown binding command: \"call\". The \".call\" binding command has been removed in v2. If you want to pass a callback that preserves the context of the function call, you can use lambda instead. Refer to lambda expression doc for more details.."
              }
            ],
            "message": "Aurelia template compiler AUR0713 rejects this template syntax: Template compilation error: unknown binding command: \"call\". The \".call\" binding command has been removed in v2. If you want to pass a callback that preserves the context of the function call, you can use lambda instead. Refer to lambda expression doc for more details..",
            "related": [],
            "severity": "error",
            "source": "semantic-runtime:template",
            "span": {
              "end": 522,
              "start": 518
            },
            "spanText": "call",
            "status": "primary",
            "uri": "fixtures://pressure/template-compiler-errors/src/template-compiler-errors-app.html"
          },
          "relation": null,
          "role": "primary",
          "rowId": "diagnostic:8:template:template-compiler-error:framework-error-code:AUR0713:src/template-compiler-errors-app.html:518:522:template-compiler:AUR0713"
        },
        "primarySeverity": "error",
        "rawRowCount": 1,
        "related": [],
        "subject": null
      }
    ],
    "primaryCount": 10,
    "rawRowCount": 10
  },
  "raw": {
    "diagnosticCount": 10,
    "diagnostics": [
      {
        "actionability": "guided",
        "anomaly": null,
        "category": "template-syntax",
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
          "sourceRole": null,
          "subject": null,
          "taxonomy": {
            "actionability": null,
            "category": null,
            "confidence": null,
            "impact": null,
            "schema": null
          }
        },
        "file": "src/template-compiler-errors-app.html",
        "impact": "blocking",
        "issues": [
          {
            "code": "AUR0721",
            "kind": "template-compiler-error",
            "message": "Aurelia template compiler AUR0721 rejects this template syntax: Usage of $bindables is only allowed on custom elements. Encountered \"$bindables.bind\".."
          }
        ],
        "message": "Aurelia template compiler AUR0721 rejects this template syntax: Usage of $bindables is only allowed on custom elements. Encountered \"$bindables.bind\"..",
        "related": [],
        "severity": "error",
        "source": "semantic-runtime:template",
        "span": {
          "end": 159,
          "start": 129
        },
        "spanText": "$bindables.bind=\"spreadSource\"",
        "status": "canonical",
        "uri": "fixtures://pressure/template-compiler-errors/src/template-compiler-errors-app.html"
      },
      {
        "actionability": "guided",
        "anomaly": null,
        "category": "template-syntax",
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
          "sourceRole": null,
          "subject": null,
          "taxonomy": {
            "actionability": null,
            "category": null,
            "confidence": null,
            "impact": null,
            "schema": null
          }
        },
        "file": "src/template-compiler-errors-app.html",
        "impact": "blocking",
        "issues": [
          {
            "code": "AUR0706",
            "kind": "template-compiler-error",
            "message": "Aurelia template compiler AUR0706 rejects this template syntax: Template compilation error: detected projection with [au-slot=\"details\"] attempted on a non custom element div.."
          }
        ],
        "message": "Aurelia template compiler AUR0706 rejects this template syntax: Template compilation error: detected projection with [au-slot=\"details\"] attempted on a non custom element div..",
        "related": [],
        "severity": "error",
        "source": "semantic-runtime:template",
        "span": {
          "end": 220,
          "start": 203
        },
        "spanText": "au-slot=\"details\"",
        "status": "canonical",
        "uri": "fixtures://pressure/template-compiler-errors/src/template-compiler-errors-app.html"
      },
      {
        "actionability": "guided",
        "anomaly": null,
        "category": "template-syntax",
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
          "sourceRole": null,
          "subject": null,
          "taxonomy": {
            "actionability": null,
            "category": null,
            "confidence": null,
            "impact": null,
            "schema": null
          }
        },
        "file": "src/template-compiler-errors-app.html",
        "impact": "blocking",
        "issues": [
          {
            "code": "AUR0717",
            "kind": "template-compiler-error",
            "message": "Aurelia template compiler AUR0717 rejects this template syntax: Template compilation error: detected a usage of \"<slot>\" element without specifying shadow DOM options in element: template-compiler-errors-app."
          }
        ],
        "message": "Aurelia template compiler AUR0717 rejects this template syntax: Template compilation error: detected a usage of \"<slot>\" element without specifying shadow DOM options in element: template-compiler-errors-app.",
        "related": [],
        "severity": "error",
        "source": "semantic-runtime:template",
        "span": {
          "end": 282,
          "start": 269
        },
        "spanText": "<slot></slot>",
        "status": "canonical",
        "uri": "fixtures://pressure/template-compiler-errors/src/template-compiler-errors-app.html"
      },
      {
        "actionability": "guided",
        "anomaly": null,
        "category": "template-syntax",
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
          "sourceRole": null,
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
          "taxonomy": {
            "actionability": null,
            "category": null,
            "confidence": null,
            "impact": null,
            "schema": null
          }
        },
        "file": "src/template-compiler-errors-app.html",
        "impact": "degraded",
        "issues": [
          {
            "code": "binding-target-assignment-strictness",
            "kind": "binding-target-assignment-strictness",
            "message": "Binding source type boolean is not assignable to target 'value' of type string."
          }
        ],
        "message": "Binding source type boolean is not assignable to target 'value' of type string.",
        "related": [],
        "severity": "warning",
        "source": "semantic-runtime:template",
        "span": {
          "end": 323,
          "start": 316
        },
        "spanText": "enabled",
        "status": "canonical",
        "uri": "fixtures://pressure/template-compiler-errors/src/template-compiler-errors-app.html"
      },
      {
        "actionability": "guided",
        "anomaly": null,
        "category": "template-syntax",
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
          "sourceRole": null,
          "subject": null,
          "taxonomy": {
            "actionability": null,
            "category": null,
            "confidence": null,
            "impact": null,
            "schema": null
          }
        },
        "file": "src/template-compiler-errors-app.html",
        "impact": "blocking",
        "issues": [
          {
            "code": "AUR0707",
            "kind": "template-compiler-error",
            "message": "Aurelia template compiler AUR0707 rejects this template syntax: Template compilation error in custom attribute \"template-probe\": property \"missing\" is not bindable.."
          }
        ],
        "message": "Aurelia template compiler AUR0707 rejects this template syntax: Template compilation error in custom attribute \"template-probe\": property \"missing\" is not bindable..",
        "related": [],
        "severity": "error",
        "source": "semantic-runtime:template",
        "span": {
          "end": 332,
          "start": 325
        },
        "spanText": "missing",
        "status": "canonical",
        "uri": "fixtures://pressure/template-compiler-errors/src/template-compiler-errors-app.html"
      },
      {
        "actionability": "guided",
        "anomaly": null,
        "category": "template-syntax",
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
          "sourceRole": null,
          "subject": null,
          "taxonomy": {
            "actionability": null,
            "category": null,
            "confidence": null,
            "impact": null,
            "schema": null
          }
        },
        "file": "src/template-compiler-errors-app.html",
        "impact": "blocking",
        "issues": [
          {
            "code": "AUR0704",
            "kind": "template-compiler-error",
            "message": "Aurelia template compiler AUR0704 rejects this template syntax: Template compilation error: Invalid command \".trigger\" for <let>. Use .bind or remove the command."
          }
        ],
        "message": "Aurelia template compiler AUR0704 rejects this template syntax: Template compilation error: Invalid command \".trigger\" for <let>. Use .bind or remove the command.",
        "related": [],
        "severity": "error",
        "source": "semantic-runtime:template",
        "span": {
          "end": 409,
          "start": 402
        },
        "spanText": "trigger",
        "status": "canonical",
        "uri": "fixtures://pressure/template-compiler-errors/src/template-compiler-errors-app.html"
      },
      {
        "actionability": "guided",
        "anomaly": null,
        "category": "template-syntax",
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
          "sourceRole": null,
          "subject": null,
          "taxonomy": {
            "actionability": null,
            "category": null,
            "confidence": null,
            "impact": null,
            "schema": null
          }
        },
        "file": "src/template-compiler-errors-app.html",
        "impact": "blocking",
        "issues": [
          {
            "code": "AUR0713",
            "kind": "template-compiler-error",
            "message": "Aurelia template compiler AUR0713 rejects this template syntax: Template compilation error: unknown binding command: \"delegate\". The \".delegate\" binding command has been removed in v2. Binding command \".trigger\" should be used instead. If you are migrating v1 application, install compat package to add back the \".delegate\" binding command for ease of migration.."
          }
        ],
        "message": "Aurelia template compiler AUR0713 rejects this template syntax: Template compilation error: unknown binding command: \"delegate\". The \".delegate\" binding command has been removed in v2. Binding command \".trigger\" should be used instead. If you are migrating v1 application, install compat package to add back the \".delegate\" binding command for ease of migration..",
        "related": [],
        "severity": "error",
        "source": "semantic-runtime:template",
        "span": {
          "end": 449,
          "start": 441
        },
        "spanText": "delegate",
        "status": "canonical",
        "uri": "fixtures://pressure/template-compiler-errors/src/template-compiler-errors-app.html"
      },
      {
        "actionability": "guided",
        "anomaly": null,
        "category": "template-syntax",
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
          "sourceRole": null,
          "subject": null,
          "taxonomy": {
            "actionability": null,
            "category": null,
            "confidence": null,
            "impact": null,
            "schema": null
          }
        },
        "file": "src/template-compiler-errors-app.html",
        "impact": "blocking",
        "issues": [
          {
            "code": "AUR0723",
            "kind": "template-compiler-error",
            "message": "Aurelia template compiler AUR0723 rejects this template syntax: Invalid class binding syntax.."
          }
        ],
        "message": "Aurelia template compiler AUR0723 rejects this template syntax: Invalid class binding syntax..",
        "related": [],
        "severity": "error",
        "source": "semantic-runtime:template",
        "span": {
          "end": 22,
          "start": 5
        },
        "spanText": ",.class=\"enabled\"",
        "status": "canonical",
        "uri": "fixtures://pressure/template-compiler-errors/src/template-compiler-errors-app.html"
      },
      {
        "actionability": "guided",
        "anomaly": null,
        "category": "template-syntax",
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
          "sourceRole": null,
          "subject": null,
          "taxonomy": {
            "actionability": null,
            "category": null,
            "confidence": null,
            "impact": null,
            "schema": null
          }
        },
        "file": "src/template-compiler-errors-app.html",
        "impact": "blocking",
        "issues": [
          {
            "code": "AUR0713",
            "kind": "template-compiler-error",
            "message": "Aurelia template compiler AUR0713 rejects this template syntax: Template compilation error: unknown binding command: \"call\". The \".call\" binding command has been removed in v2. If you want to pass a callback that preserves the context of the function call, you can use lambda instead. Refer to lambda expression doc for more details.."
          }
        ],
        "message": "Aurelia template compiler AUR0713 rejects this template syntax: Template compilation error: unknown binding command: \"call\". The \".call\" binding command has been removed in v2. If you want to pass a callback that preserves the context of the function call, you can use lambda instead. Refer to lambda expression doc for more details..",
        "related": [],
        "severity": "error",
        "source": "semantic-runtime:template",
        "span": {
          "end": 522,
          "start": 518
        },
        "spanText": "call",
        "status": "canonical",
        "uri": "fixtures://pressure/template-compiler-errors/src/template-compiler-errors-app.html"
      },
      {
        "actionability": "guided",
        "anomaly": null,
        "category": "template-syntax",
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
          "sourceRole": null,
          "subject": null,
          "taxonomy": {
            "actionability": null,
            "category": null,
            "confidence": null,
            "impact": null,
            "schema": null
          }
        },
        "file": "src/template-compiler-errors-app.html",
        "impact": "blocking",
        "issues": [
          {
            "code": "AUR0720",
            "kind": "template-compiler-error",
            "message": "Aurelia template compiler AUR0720 rejects this template syntax: Spreading syntax \"...xxx\" is reserved. Encountered \"...$element.bind\".."
          }
        ],
        "message": "Aurelia template compiler AUR0720 rejects this template syntax: Spreading syntax \"...xxx\" is reserved. Encountered \"...$element.bind\"..",
        "related": [],
        "severity": "error",
        "source": "semantic-runtime:template",
        "span": {
          "end": 94,
          "start": 63
        },
        "spanText": "...$element.bind=\"spreadSource\"",
        "status": "canonical",
        "uri": "fixtures://pressure/template-compiler-errors/src/template-compiler-errors-app.html"
      }
    ]
  },
  "suppressed": {
    "diagnosticCount": 0,
    "diagnostics": []
  },
  "surfaces": {
    "lsp": {
      "diagnosticCount": 10,
      "diagnostics": [
        {
          "actionability": "guided",
          "anomaly": null,
          "category": "template-syntax",
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
            "sourceRole": null,
            "subject": null,
            "taxonomy": {
              "actionability": null,
              "category": null,
              "confidence": null,
              "impact": null,
              "schema": null
            }
          },
          "file": "src/template-compiler-errors-app.html",
          "impact": "blocking",
          "issues": [
            {
              "code": "AUR0723",
              "kind": "template-compiler-error",
              "message": "Aurelia template compiler AUR0723 rejects this template syntax: Invalid class binding syntax.."
            }
          ],
          "message": "Aurelia template compiler AUR0723 rejects this template syntax: Invalid class binding syntax..",
          "related": [],
          "severity": "error",
          "source": "semantic-runtime:template",
          "span": {
            "end": 22,
            "start": 5
          },
          "spanText": ",.class=\"enabled\"",
          "status": "primary",
          "uri": "fixtures://pressure/template-compiler-errors/src/template-compiler-errors-app.html"
        },
        {
          "actionability": "guided",
          "anomaly": null,
          "category": "template-syntax",
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
            "sourceRole": null,
            "subject": null,
            "taxonomy": {
              "actionability": null,
              "category": null,
              "confidence": null,
              "impact": null,
              "schema": null
            }
          },
          "file": "src/template-compiler-errors-app.html",
          "impact": "blocking",
          "issues": [
            {
              "code": "AUR0720",
              "kind": "template-compiler-error",
              "message": "Aurelia template compiler AUR0720 rejects this template syntax: Spreading syntax \"...xxx\" is reserved. Encountered \"...$element.bind\".."
            }
          ],
          "message": "Aurelia template compiler AUR0720 rejects this template syntax: Spreading syntax \"...xxx\" is reserved. Encountered \"...$element.bind\"..",
          "related": [],
          "severity": "error",
          "source": "semantic-runtime:template",
          "span": {
            "end": 94,
            "start": 63
          },
          "spanText": "...$element.bind=\"spreadSource\"",
          "status": "primary",
          "uri": "fixtures://pressure/template-compiler-errors/src/template-compiler-errors-app.html"
        },
        {
          "actionability": "guided",
          "anomaly": null,
          "category": "template-syntax",
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
            "sourceRole": null,
            "subject": null,
            "taxonomy": {
              "actionability": null,
              "category": null,
              "confidence": null,
              "impact": null,
              "schema": null
            }
          },
          "file": "src/template-compiler-errors-app.html",
          "impact": "blocking",
          "issues": [
            {
              "code": "AUR0721",
              "kind": "template-compiler-error",
              "message": "Aurelia template compiler AUR0721 rejects this template syntax: Usage of $bindables is only allowed on custom elements. Encountered \"$bindables.bind\".."
            }
          ],
          "message": "Aurelia template compiler AUR0721 rejects this template syntax: Usage of $bindables is only allowed on custom elements. Encountered \"$bindables.bind\"..",
          "related": [],
          "severity": "error",
          "source": "semantic-runtime:template",
          "span": {
            "end": 159,
            "start": 129
          },
          "spanText": "$bindables.bind=\"spreadSource\"",
          "status": "primary",
          "uri": "fixtures://pressure/template-compiler-errors/src/template-compiler-errors-app.html"
        },
        {
          "actionability": "guided",
          "anomaly": null,
          "category": "template-syntax",
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
            "sourceRole": null,
            "subject": null,
            "taxonomy": {
              "actionability": null,
              "category": null,
              "confidence": null,
              "impact": null,
              "schema": null
            }
          },
          "file": "src/template-compiler-errors-app.html",
          "impact": "blocking",
          "issues": [
            {
              "code": "AUR0706",
              "kind": "template-compiler-error",
              "message": "Aurelia template compiler AUR0706 rejects this template syntax: Template compilation error: detected projection with [au-slot=\"details\"] attempted on a non custom element div.."
            }
          ],
          "message": "Aurelia template compiler AUR0706 rejects this template syntax: Template compilation error: detected projection with [au-slot=\"details\"] attempted on a non custom element div..",
          "related": [],
          "severity": "error",
          "source": "semantic-runtime:template",
          "span": {
            "end": 220,
            "start": 203
          },
          "spanText": "au-slot=\"details\"",
          "status": "primary",
          "uri": "fixtures://pressure/template-compiler-errors/src/template-compiler-errors-app.html"
        },
        {
          "actionability": "guided",
          "anomaly": null,
          "category": "template-syntax",
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
            "sourceRole": null,
            "subject": null,
            "taxonomy": {
              "actionability": null,
              "category": null,
              "confidence": null,
              "impact": null,
              "schema": null
            }
          },
          "file": "src/template-compiler-errors-app.html",
          "impact": "blocking",
          "issues": [
            {
              "code": "AUR0717",
              "kind": "template-compiler-error",
              "message": "Aurelia template compiler AUR0717 rejects this template syntax: Template compilation error: detected a usage of \"<slot>\" element without specifying shadow DOM options in element: template-compiler-errors-app."
            }
          ],
          "message": "Aurelia template compiler AUR0717 rejects this template syntax: Template compilation error: detected a usage of \"<slot>\" element without specifying shadow DOM options in element: template-compiler-errors-app.",
          "related": [],
          "severity": "error",
          "source": "semantic-runtime:template",
          "span": {
            "end": 282,
            "start": 269
          },
          "spanText": "<slot></slot>",
          "status": "primary",
          "uri": "fixtures://pressure/template-compiler-errors/src/template-compiler-errors-app.html"
        },
        {
          "actionability": "guided",
          "anomaly": null,
          "category": "template-syntax",
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
            "sourceRole": null,
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
            "taxonomy": {
              "actionability": null,
              "category": null,
              "confidence": null,
              "impact": null,
              "schema": null
            }
          },
          "file": "src/template-compiler-errors-app.html",
          "impact": "degraded",
          "issues": [
            {
              "code": "binding-target-assignment-strictness",
              "kind": "binding-target-assignment-strictness",
              "message": "Binding source type boolean is not assignable to target 'value' of type string."
            }
          ],
          "message": "Binding source type boolean is not assignable to target 'value' of type string.",
          "related": [],
          "severity": "warning",
          "source": "semantic-runtime:template",
          "span": {
            "end": 323,
            "start": 316
          },
          "spanText": "enabled",
          "status": "primary",
          "uri": "fixtures://pressure/template-compiler-errors/src/template-compiler-errors-app.html"
        },
        {
          "actionability": "guided",
          "anomaly": null,
          "category": "template-syntax",
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
            "sourceRole": null,
            "subject": null,
            "taxonomy": {
              "actionability": null,
              "category": null,
              "confidence": null,
              "impact": null,
              "schema": null
            }
          },
          "file": "src/template-compiler-errors-app.html",
          "impact": "blocking",
          "issues": [
            {
              "code": "AUR0707",
              "kind": "template-compiler-error",
              "message": "Aurelia template compiler AUR0707 rejects this template syntax: Template compilation error in custom attribute \"template-probe\": property \"missing\" is not bindable.."
            }
          ],
          "message": "Aurelia template compiler AUR0707 rejects this template syntax: Template compilation error in custom attribute \"template-probe\": property \"missing\" is not bindable..",
          "related": [],
          "severity": "error",
          "source": "semantic-runtime:template",
          "span": {
            "end": 332,
            "start": 325
          },
          "spanText": "missing",
          "status": "primary",
          "uri": "fixtures://pressure/template-compiler-errors/src/template-compiler-errors-app.html"
        },
        {
          "actionability": "guided",
          "anomaly": null,
          "category": "template-syntax",
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
            "sourceRole": null,
            "subject": null,
            "taxonomy": {
              "actionability": null,
              "category": null,
              "confidence": null,
              "impact": null,
              "schema": null
            }
          },
          "file": "src/template-compiler-errors-app.html",
          "impact": "blocking",
          "issues": [
            {
              "code": "AUR0704",
              "kind": "template-compiler-error",
              "message": "Aurelia template compiler AUR0704 rejects this template syntax: Template compilation error: Invalid command \".trigger\" for <let>. Use .bind or remove the command."
            }
          ],
          "message": "Aurelia template compiler AUR0704 rejects this template syntax: Template compilation error: Invalid command \".trigger\" for <let>. Use .bind or remove the command.",
          "related": [],
          "severity": "error",
          "source": "semantic-runtime:template",
          "span": {
            "end": 409,
            "start": 402
          },
          "spanText": "trigger",
          "status": "primary",
          "uri": "fixtures://pressure/template-compiler-errors/src/template-compiler-errors-app.html"
        },
        {
          "actionability": "guided",
          "anomaly": null,
          "category": "template-syntax",
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
            "sourceRole": null,
            "subject": null,
            "taxonomy": {
              "actionability": null,
              "category": null,
              "confidence": null,
              "impact": null,
              "schema": null
            }
          },
          "file": "src/template-compiler-errors-app.html",
          "impact": "blocking",
          "issues": [
            {
              "code": "AUR0713",
              "kind": "template-compiler-error",
              "message": "Aurelia template compiler AUR0713 rejects this template syntax: Template compilation error: unknown binding command: \"delegate\". The \".delegate\" binding command has been removed in v2. Binding command \".trigger\" should be used instead. If you are migrating v1 application, install compat package to add back the \".delegate\" binding command for ease of migration.."
            }
          ],
          "message": "Aurelia template compiler AUR0713 rejects this template syntax: Template compilation error: unknown binding command: \"delegate\". The \".delegate\" binding command has been removed in v2. Binding command \".trigger\" should be used instead. If you are migrating v1 application, install compat package to add back the \".delegate\" binding command for ease of migration..",
          "related": [],
          "severity": "error",
          "source": "semantic-runtime:template",
          "span": {
            "end": 449,
            "start": 441
          },
          "spanText": "delegate",
          "status": "primary",
          "uri": "fixtures://pressure/template-compiler-errors/src/template-compiler-errors-app.html"
        },
        {
          "actionability": "guided",
          "anomaly": null,
          "category": "template-syntax",
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
            "sourceRole": null,
            "subject": null,
            "taxonomy": {
              "actionability": null,
              "category": null,
              "confidence": null,
              "impact": null,
              "schema": null
            }
          },
          "file": "src/template-compiler-errors-app.html",
          "impact": "blocking",
          "issues": [
            {
              "code": "AUR0713",
              "kind": "template-compiler-error",
              "message": "Aurelia template compiler AUR0713 rejects this template syntax: Template compilation error: unknown binding command: \"call\". The \".call\" binding command has been removed in v2. If you want to pass a callback that preserves the context of the function call, you can use lambda instead. Refer to lambda expression doc for more details.."
            }
          ],
          "message": "Aurelia template compiler AUR0713 rejects this template syntax: Template compilation error: unknown binding command: \"call\". The \".call\" binding command has been removed in v2. If you want to pass a callback that preserves the context of the function call, you can use lambda instead. Refer to lambda expression doc for more details..",
          "related": [],
          "severity": "error",
          "source": "semantic-runtime:template",
          "span": {
            "end": 522,
            "start": 518
          },
          "spanText": "call",
          "status": "primary",
          "uri": "fixtures://pressure/template-compiler-errors/src/template-compiler-errors-app.html"
        }
      ]
    }
  },
  "uri": "fixtures://pressure/template-compiler-errors/src/template-compiler-errors-app.html"
}
```

### Alignment

```json
{
  "comparisonKey": "domain/kind/code/severity/text/message",
  "countsMatch": true,
  "customLspSurfaceCount": 10,
  "customOnly": [],
  "lspOnly": [],
  "lspPublishCount": 10,
  "suppressedCount": 0
}
```

## compiler-local-bindable-errors

### Probe

```json
{
  "file": "src/local-bindable-probe.html"
}
```

### publishDiagnostics

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
      "message": "Aurelia template compiler AUR0711 rejects this template syntax: Template compilation error: the attribute 'property' is missing in <bindable> in local element \"bindable-child\"..",
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
      "message": "Aurelia template compiler AUR0710 rejects this template syntax: Template compilation error: bindable properties of local element \"bindable-child\" template needs to be defined directly under <template>..",
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
      "message": "Aurelia template compiler AUR0712 rejects this template syntax: Template compilation error: Bindable property and attribute needs to be unique; found property: title, attribute: (none)..",
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
      "message": "Aurelia template compiler AUR0712 rejects this template syntax: Template compilation error: Bindable property and attribute needs to be unique; found property: other, attribute: label..",
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
      "message": "Aurelia template compiler AUR0715 rejects this template syntax: Template compilation error: the value of \"as-custom-element\" attribute cannot be empty for local element in element \"local-bindable-probe\"..",
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
      "message": "Aurelia template compiler AUR0716 rejects this template syntax: Template compilation error: duplicate definition of the local template named \"duplicate-child\" in element local-bindable-probe..",
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
  "outcome": "published",
  "uri": "fixtures://pressure/template-compiler-errors/src/local-bindable-probe.html"
}
```

### aurelia/getDiagnostics

```json
{
  "fingerprint": "semantic-runtime:hit",
  "outcome": "result",
  "presentation": {
    "complete": true,
    "contextualCount": 0,
    "groups": [
      {
        "groupKey": "row:diagnostic:5:template:template-compiler-error:framework-error-code:AUR0711:src/local-bindable-probe.html:63:84:template-compiler:AUR0711",
        "maxRawSeverity": "error",
        "primary": {
          "diagnostic": {
            "actionability": "guided",
            "anomaly": null,
            "category": "template-syntax",
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
              "sourceRole": null,
              "subject": null,
              "taxonomy": {
                "actionability": null,
                "category": null,
                "confidence": null,
                "impact": null,
                "schema": null
              }
            },
            "file": "src/local-bindable-probe.html",
            "impact": "blocking",
            "issues": [
              {
                "code": "AUR0711",
                "kind": "template-compiler-error",
                "message": "Aurelia template compiler AUR0711 rejects this template syntax: Template compilation error: the attribute 'property' is missing in <bindable> in local element \"bindable-child\".."
              }
            ],
            "message": "Aurelia template compiler AUR0711 rejects this template syntax: Template compilation error: the attribute 'property' is missing in <bindable> in local element \"bindable-child\"..",
            "related": [],
            "severity": "error",
            "source": "semantic-runtime:template",
            "span": {
              "end": 84,
              "start": 63
            },
            "spanText": "<bindable></bindable>",
            "status": "primary",
            "uri": "fixtures://pressure/template-compiler-errors/src/local-bindable-probe.html"
          },
          "relation": null,
          "role": "primary",
          "rowId": "diagnostic:5:template:template-compiler-error:framework-error-code:AUR0711:src/local-bindable-probe.html:63:84:template-compiler:AUR0711"
        },
        "primarySeverity": "error",
        "rawRowCount": 1,
        "related": [],
        "subject": null
      },
      {
        "groupKey": "row:diagnostic:0:template:template-compiler-error:framework-error-code:AUR0710:src/local-bindable-probe.html:101:136:template-compiler:AUR0710",
        "maxRawSeverity": "error",
        "primary": {
          "diagnostic": {
            "actionability": "guided",
            "anomaly": null,
            "category": "template-syntax",
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
              "sourceRole": null,
              "subject": null,
              "taxonomy": {
                "actionability": null,
                "category": null,
                "confidence": null,
                "impact": null,
                "schema": null
              }
            },
            "file": "src/local-bindable-probe.html",
            "impact": "blocking",
            "issues": [
              {
                "code": "AUR0710",
                "kind": "template-compiler-error",
                "message": "Aurelia template compiler AUR0710 rejects this template syntax: Template compilation error: bindable properties of local element \"bindable-child\" template needs to be defined directly under <template>.."
              }
            ],
            "message": "Aurelia template compiler AUR0710 rejects this template syntax: Template compilation error: bindable properties of local element \"bindable-child\" template needs to be defined directly under <template>..",
            "related": [],
            "severity": "error",
            "source": "semantic-runtime:template",
            "span": {
              "end": 136,
              "start": 101
            },
            "spanText": "<bindable name=\"nested\"></bindable>",
            "status": "primary",
            "uri": "fixtures://pressure/template-compiler-errors/src/local-bindable-probe.html"
          },
          "relation": null,
          "role": "primary",
          "rowId": "diagnostic:0:template:template-compiler-error:framework-error-code:AUR0710:src/local-bindable-probe.html:101:136:template-compiler:AUR0710"
        },
        "primarySeverity": "error",
        "rawRowCount": 1,
        "related": [],
        "subject": null
      },
      {
        "groupKey": "row:diagnostic:1:template:template-compiler-error:framework-error-code:AUR0712:src/local-bindable-probe.html:225:230:template-compiler:AUR0712",
        "maxRawSeverity": "error",
        "primary": {
          "diagnostic": {
            "actionability": "guided",
            "anomaly": null,
            "category": "template-syntax",
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
              "sourceRole": null,
              "subject": null,
              "taxonomy": {
                "actionability": null,
                "category": null,
                "confidence": null,
                "impact": null,
                "schema": null
              }
            },
            "file": "src/local-bindable-probe.html",
            "impact": "blocking",
            "issues": [
              {
                "code": "AUR0712",
                "kind": "template-compiler-error",
                "message": "Aurelia template compiler AUR0712 rejects this template syntax: Template compilation error: Bindable property and attribute needs to be unique; found property: title, attribute: (none).."
              }
            ],
            "message": "Aurelia template compiler AUR0712 rejects this template syntax: Template compilation error: Bindable property and attribute needs to be unique; found property: title, attribute: (none)..",
            "related": [],
            "severity": "error",
            "source": "semantic-runtime:template",
            "span": {
              "end": 230,
              "start": 225
            },
            "spanText": "title",
            "status": "primary",
            "uri": "fixtures://pressure/template-compiler-errors/src/local-bindable-probe.html"
          },
          "relation": null,
          "role": "primary",
          "rowId": "diagnostic:1:template:template-compiler-error:framework-error-code:AUR0712:src/local-bindable-probe.html:225:230:template-compiler:AUR0712"
        },
        "primarySeverity": "error",
        "rawRowCount": 1,
        "related": [],
        "subject": null
      },
      {
        "groupKey": "row:diagnostic:2:template:template-compiler-error:framework-error-code:AUR0712:src/local-bindable-probe.html:282:287:template-compiler:AUR0712",
        "maxRawSeverity": "error",
        "primary": {
          "diagnostic": {
            "actionability": "guided",
            "anomaly": null,
            "category": "template-syntax",
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
              "sourceRole": null,
              "subject": null,
              "taxonomy": {
                "actionability": null,
                "category": null,
                "confidence": null,
                "impact": null,
                "schema": null
              }
            },
            "file": "src/local-bindable-probe.html",
            "impact": "blocking",
            "issues": [
              {
                "code": "AUR0712",
                "kind": "template-compiler-error",
                "message": "Aurelia template compiler AUR0712 rejects this template syntax: Template compilation error: Bindable property and attribute needs to be unique; found property: other, attribute: label.."
              }
            ],
            "message": "Aurelia template compiler AUR0712 rejects this template syntax: Template compilation error: Bindable property and attribute needs to be unique; found property: other, attribute: label..",
            "related": [],
            "severity": "error",
            "source": "semantic-runtime:template",
            "span": {
              "end": 287,
              "start": 282
            },
            "spanText": "label",
            "status": "primary",
            "uri": "fixtures://pressure/template-compiler-errors/src/local-bindable-probe.html"
          },
          "relation": null,
          "role": "primary",
          "rowId": "diagnostic:2:template:template-compiler-error:framework-error-code:AUR0712:src/local-bindable-probe.html:282:287:template-compiler:AUR0712"
        },
        "primarySeverity": "error",
        "rawRowCount": 1,
        "related": [],
        "subject": null
      },
      {
        "groupKey": "row:diagnostic:3:template:template-compiler-error:framework-error-code:AUR0715:src/local-bindable-probe.html:327:347:template-compiler:AUR0715",
        "maxRawSeverity": "error",
        "primary": {
          "diagnostic": {
            "actionability": "guided",
            "anomaly": null,
            "category": "template-syntax",
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
              "sourceRole": null,
              "subject": null,
              "taxonomy": {
                "actionability": null,
                "category": null,
                "confidence": null,
                "impact": null,
                "schema": null
              }
            },
            "file": "src/local-bindable-probe.html",
            "impact": "blocking",
            "issues": [
              {
                "code": "AUR0715",
                "kind": "template-compiler-error",
                "message": "Aurelia template compiler AUR0715 rejects this template syntax: Template compilation error: the value of \"as-custom-element\" attribute cannot be empty for local element in element \"local-bindable-probe\".."
              }
            ],
            "message": "Aurelia template compiler AUR0715 rejects this template syntax: Template compilation error: the value of \"as-custom-element\" attribute cannot be empty for local element in element \"local-bindable-probe\"..",
            "related": [],
            "severity": "error",
            "source": "semantic-runtime:template",
            "span": {
              "end": 347,
              "start": 327
            },
            "spanText": "as-custom-element=\"\"",
            "status": "primary",
            "uri": "fixtures://pressure/template-compiler-errors/src/local-bindable-probe.html"
          },
          "relation": null,
          "role": "primary",
          "rowId": "diagnostic:3:template:template-compiler-error:framework-error-code:AUR0715:src/local-bindable-probe.html:327:347:template-compiler:AUR0715"
        },
        "primarySeverity": "error",
        "rawRowCount": 1,
        "related": [],
        "subject": null
      },
      {
        "groupKey": "row:diagnostic:4:template:template-compiler-error:framework-error-code:AUR0716:src/local-bindable-probe.html:469:484:template-compiler:AUR0716",
        "maxRawSeverity": "error",
        "primary": {
          "diagnostic": {
            "actionability": "guided",
            "anomaly": null,
            "category": "template-syntax",
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
              "sourceRole": null,
              "subject": null,
              "taxonomy": {
                "actionability": null,
                "category": null,
                "confidence": null,
                "impact": null,
                "schema": null
              }
            },
            "file": "src/local-bindable-probe.html",
            "impact": "blocking",
            "issues": [
              {
                "code": "AUR0716",
                "kind": "template-compiler-error",
                "message": "Aurelia template compiler AUR0716 rejects this template syntax: Template compilation error: duplicate definition of the local template named \"duplicate-child\" in element local-bindable-probe.."
              }
            ],
            "message": "Aurelia template compiler AUR0716 rejects this template syntax: Template compilation error: duplicate definition of the local template named \"duplicate-child\" in element local-bindable-probe..",
            "related": [],
            "severity": "error",
            "source": "semantic-runtime:template",
            "span": {
              "end": 484,
              "start": 469
            },
            "spanText": "duplicate-child",
            "status": "primary",
            "uri": "fixtures://pressure/template-compiler-errors/src/local-bindable-probe.html"
          },
          "relation": null,
          "role": "primary",
          "rowId": "diagnostic:4:template:template-compiler-error:framework-error-code:AUR0716:src/local-bindable-probe.html:469:484:template-compiler:AUR0716"
        },
        "primarySeverity": "error",
        "rawRowCount": 1,
        "related": [],
        "subject": null
      }
    ],
    "primaryCount": 6,
    "rawRowCount": 6
  },
  "raw": {
    "diagnosticCount": 6,
    "diagnostics": [
      {
        "actionability": "guided",
        "anomaly": null,
        "category": "template-syntax",
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
          "sourceRole": null,
          "subject": null,
          "taxonomy": {
            "actionability": null,
            "category": null,
            "confidence": null,
            "impact": null,
            "schema": null
          }
        },
        "file": "src/local-bindable-probe.html",
        "impact": "blocking",
        "issues": [
          {
            "code": "AUR0710",
            "kind": "template-compiler-error",
            "message": "Aurelia template compiler AUR0710 rejects this template syntax: Template compilation error: bindable properties of local element \"bindable-child\" template needs to be defined directly under <template>.."
          }
        ],
        "message": "Aurelia template compiler AUR0710 rejects this template syntax: Template compilation error: bindable properties of local element \"bindable-child\" template needs to be defined directly under <template>..",
        "related": [],
        "severity": "error",
        "source": "semantic-runtime:template",
        "span": {
          "end": 136,
          "start": 101
        },
        "spanText": "<bindable name=\"nested\"></bindable>",
        "status": "canonical",
        "uri": "fixtures://pressure/template-compiler-errors/src/local-bindable-probe.html"
      },
      {
        "actionability": "guided",
        "anomaly": null,
        "category": "template-syntax",
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
          "sourceRole": null,
          "subject": null,
          "taxonomy": {
            "actionability": null,
            "category": null,
            "confidence": null,
            "impact": null,
            "schema": null
          }
        },
        "file": "src/local-bindable-probe.html",
        "impact": "blocking",
        "issues": [
          {
            "code": "AUR0712",
            "kind": "template-compiler-error",
            "message": "Aurelia template compiler AUR0712 rejects this template syntax: Template compilation error: Bindable property and attribute needs to be unique; found property: title, attribute: (none).."
          }
        ],
        "message": "Aurelia template compiler AUR0712 rejects this template syntax: Template compilation error: Bindable property and attribute needs to be unique; found property: title, attribute: (none)..",
        "related": [],
        "severity": "error",
        "source": "semantic-runtime:template",
        "span": {
          "end": 230,
          "start": 225
        },
        "spanText": "title",
        "status": "canonical",
        "uri": "fixtures://pressure/template-compiler-errors/src/local-bindable-probe.html"
      },
      {
        "actionability": "guided",
        "anomaly": null,
        "category": "template-syntax",
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
          "sourceRole": null,
          "subject": null,
          "taxonomy": {
            "actionability": null,
            "category": null,
            "confidence": null,
            "impact": null,
            "schema": null
          }
        },
        "file": "src/local-bindable-probe.html",
        "impact": "blocking",
        "issues": [
          {
            "code": "AUR0712",
            "kind": "template-compiler-error",
            "message": "Aurelia template compiler AUR0712 rejects this template syntax: Template compilation error: Bindable property and attribute needs to be unique; found property: other, attribute: label.."
          }
        ],
        "message": "Aurelia template compiler AUR0712 rejects this template syntax: Template compilation error: Bindable property and attribute needs to be unique; found property: other, attribute: label..",
        "related": [],
        "severity": "error",
        "source": "semantic-runtime:template",
        "span": {
          "end": 287,
          "start": 282
        },
        "spanText": "label",
        "status": "canonical",
        "uri": "fixtures://pressure/template-compiler-errors/src/local-bindable-probe.html"
      },
      {
        "actionability": "guided",
        "anomaly": null,
        "category": "template-syntax",
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
          "sourceRole": null,
          "subject": null,
          "taxonomy": {
            "actionability": null,
            "category": null,
            "confidence": null,
            "impact": null,
            "schema": null
          }
        },
        "file": "src/local-bindable-probe.html",
        "impact": "blocking",
        "issues": [
          {
            "code": "AUR0715",
            "kind": "template-compiler-error",
            "message": "Aurelia template compiler AUR0715 rejects this template syntax: Template compilation error: the value of \"as-custom-element\" attribute cannot be empty for local element in element \"local-bindable-probe\".."
          }
        ],
        "message": "Aurelia template compiler AUR0715 rejects this template syntax: Template compilation error: the value of \"as-custom-element\" attribute cannot be empty for local element in element \"local-bindable-probe\"..",
        "related": [],
        "severity": "error",
        "source": "semantic-runtime:template",
        "span": {
          "end": 347,
          "start": 327
        },
        "spanText": "as-custom-element=\"\"",
        "status": "canonical",
        "uri": "fixtures://pressure/template-compiler-errors/src/local-bindable-probe.html"
      },
      {
        "actionability": "guided",
        "anomaly": null,
        "category": "template-syntax",
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
          "sourceRole": null,
          "subject": null,
          "taxonomy": {
            "actionability": null,
            "category": null,
            "confidence": null,
            "impact": null,
            "schema": null
          }
        },
        "file": "src/local-bindable-probe.html",
        "impact": "blocking",
        "issues": [
          {
            "code": "AUR0716",
            "kind": "template-compiler-error",
            "message": "Aurelia template compiler AUR0716 rejects this template syntax: Template compilation error: duplicate definition of the local template named \"duplicate-child\" in element local-bindable-probe.."
          }
        ],
        "message": "Aurelia template compiler AUR0716 rejects this template syntax: Template compilation error: duplicate definition of the local template named \"duplicate-child\" in element local-bindable-probe..",
        "related": [],
        "severity": "error",
        "source": "semantic-runtime:template",
        "span": {
          "end": 484,
          "start": 469
        },
        "spanText": "duplicate-child",
        "status": "canonical",
        "uri": "fixtures://pressure/template-compiler-errors/src/local-bindable-probe.html"
      },
      {
        "actionability": "guided",
        "anomaly": null,
        "category": "template-syntax",
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
          "sourceRole": null,
          "subject": null,
          "taxonomy": {
            "actionability": null,
            "category": null,
            "confidence": null,
            "impact": null,
            "schema": null
          }
        },
        "file": "src/local-bindable-probe.html",
        "impact": "blocking",
        "issues": [
          {
            "code": "AUR0711",
            "kind": "template-compiler-error",
            "message": "Aurelia template compiler AUR0711 rejects this template syntax: Template compilation error: the attribute 'property' is missing in <bindable> in local element \"bindable-child\".."
          }
        ],
        "message": "Aurelia template compiler AUR0711 rejects this template syntax: Template compilation error: the attribute 'property' is missing in <bindable> in local element \"bindable-child\"..",
        "related": [],
        "severity": "error",
        "source": "semantic-runtime:template",
        "span": {
          "end": 84,
          "start": 63
        },
        "spanText": "<bindable></bindable>",
        "status": "canonical",
        "uri": "fixtures://pressure/template-compiler-errors/src/local-bindable-probe.html"
      }
    ]
  },
  "suppressed": {
    "diagnosticCount": 0,
    "diagnostics": []
  },
  "surfaces": {
    "lsp": {
      "diagnosticCount": 6,
      "diagnostics": [
        {
          "actionability": "guided",
          "anomaly": null,
          "category": "template-syntax",
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
            "sourceRole": null,
            "subject": null,
            "taxonomy": {
              "actionability": null,
              "category": null,
              "confidence": null,
              "impact": null,
              "schema": null
            }
          },
          "file": "src/local-bindable-probe.html",
          "impact": "blocking",
          "issues": [
            {
              "code": "AUR0711",
              "kind": "template-compiler-error",
              "message": "Aurelia template compiler AUR0711 rejects this template syntax: Template compilation error: the attribute 'property' is missing in <bindable> in local element \"bindable-child\".."
            }
          ],
          "message": "Aurelia template compiler AUR0711 rejects this template syntax: Template compilation error: the attribute 'property' is missing in <bindable> in local element \"bindable-child\"..",
          "related": [],
          "severity": "error",
          "source": "semantic-runtime:template",
          "span": {
            "end": 84,
            "start": 63
          },
          "spanText": "<bindable></bindable>",
          "status": "primary",
          "uri": "fixtures://pressure/template-compiler-errors/src/local-bindable-probe.html"
        },
        {
          "actionability": "guided",
          "anomaly": null,
          "category": "template-syntax",
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
            "sourceRole": null,
            "subject": null,
            "taxonomy": {
              "actionability": null,
              "category": null,
              "confidence": null,
              "impact": null,
              "schema": null
            }
          },
          "file": "src/local-bindable-probe.html",
          "impact": "blocking",
          "issues": [
            {
              "code": "AUR0710",
              "kind": "template-compiler-error",
              "message": "Aurelia template compiler AUR0710 rejects this template syntax: Template compilation error: bindable properties of local element \"bindable-child\" template needs to be defined directly under <template>.."
            }
          ],
          "message": "Aurelia template compiler AUR0710 rejects this template syntax: Template compilation error: bindable properties of local element \"bindable-child\" template needs to be defined directly under <template>..",
          "related": [],
          "severity": "error",
          "source": "semantic-runtime:template",
          "span": {
            "end": 136,
            "start": 101
          },
          "spanText": "<bindable name=\"nested\"></bindable>",
          "status": "primary",
          "uri": "fixtures://pressure/template-compiler-errors/src/local-bindable-probe.html"
        },
        {
          "actionability": "guided",
          "anomaly": null,
          "category": "template-syntax",
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
            "sourceRole": null,
            "subject": null,
            "taxonomy": {
              "actionability": null,
              "category": null,
              "confidence": null,
              "impact": null,
              "schema": null
            }
          },
          "file": "src/local-bindable-probe.html",
          "impact": "blocking",
          "issues": [
            {
              "code": "AUR0712",
              "kind": "template-compiler-error",
              "message": "Aurelia template compiler AUR0712 rejects this template syntax: Template compilation error: Bindable property and attribute needs to be unique; found property: title, attribute: (none).."
            }
          ],
          "message": "Aurelia template compiler AUR0712 rejects this template syntax: Template compilation error: Bindable property and attribute needs to be unique; found property: title, attribute: (none)..",
          "related": [],
          "severity": "error",
          "source": "semantic-runtime:template",
          "span": {
            "end": 230,
            "start": 225
          },
          "spanText": "title",
          "status": "primary",
          "uri": "fixtures://pressure/template-compiler-errors/src/local-bindable-probe.html"
        },
        {
          "actionability": "guided",
          "anomaly": null,
          "category": "template-syntax",
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
            "sourceRole": null,
            "subject": null,
            "taxonomy": {
              "actionability": null,
              "category": null,
              "confidence": null,
              "impact": null,
              "schema": null
            }
          },
          "file": "src/local-bindable-probe.html",
          "impact": "blocking",
          "issues": [
            {
              "code": "AUR0712",
              "kind": "template-compiler-error",
              "message": "Aurelia template compiler AUR0712 rejects this template syntax: Template compilation error: Bindable property and attribute needs to be unique; found property: other, attribute: label.."
            }
          ],
          "message": "Aurelia template compiler AUR0712 rejects this template syntax: Template compilation error: Bindable property and attribute needs to be unique; found property: other, attribute: label..",
          "related": [],
          "severity": "error",
          "source": "semantic-runtime:template",
          "span": {
            "end": 287,
            "start": 282
          },
          "spanText": "label",
          "status": "primary",
          "uri": "fixtures://pressure/template-compiler-errors/src/local-bindable-probe.html"
        },
        {
          "actionability": "guided",
          "anomaly": null,
          "category": "template-syntax",
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
            "sourceRole": null,
            "subject": null,
            "taxonomy": {
              "actionability": null,
              "category": null,
              "confidence": null,
              "impact": null,
              "schema": null
            }
          },
          "file": "src/local-bindable-probe.html",
          "impact": "blocking",
          "issues": [
            {
              "code": "AUR0715",
              "kind": "template-compiler-error",
              "message": "Aurelia template compiler AUR0715 rejects this template syntax: Template compilation error: the value of \"as-custom-element\" attribute cannot be empty for local element in element \"local-bindable-probe\".."
            }
          ],
          "message": "Aurelia template compiler AUR0715 rejects this template syntax: Template compilation error: the value of \"as-custom-element\" attribute cannot be empty for local element in element \"local-bindable-probe\"..",
          "related": [],
          "severity": "error",
          "source": "semantic-runtime:template",
          "span": {
            "end": 347,
            "start": 327
          },
          "spanText": "as-custom-element=\"\"",
          "status": "primary",
          "uri": "fixtures://pressure/template-compiler-errors/src/local-bindable-probe.html"
        },
        {
          "actionability": "guided",
          "anomaly": null,
          "category": "template-syntax",
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
            "sourceRole": null,
            "subject": null,
            "taxonomy": {
              "actionability": null,
              "category": null,
              "confidence": null,
              "impact": null,
              "schema": null
            }
          },
          "file": "src/local-bindable-probe.html",
          "impact": "blocking",
          "issues": [
            {
              "code": "AUR0716",
              "kind": "template-compiler-error",
              "message": "Aurelia template compiler AUR0716 rejects this template syntax: Template compilation error: duplicate definition of the local template named \"duplicate-child\" in element local-bindable-probe.."
            }
          ],
          "message": "Aurelia template compiler AUR0716 rejects this template syntax: Template compilation error: duplicate definition of the local template named \"duplicate-child\" in element local-bindable-probe..",
          "related": [],
          "severity": "error",
          "source": "semantic-runtime:template",
          "span": {
            "end": 484,
            "start": 469
          },
          "spanText": "duplicate-child",
          "status": "primary",
          "uri": "fixtures://pressure/template-compiler-errors/src/local-bindable-probe.html"
        }
      ]
    }
  },
  "uri": "fixtures://pressure/template-compiler-errors/src/local-bindable-probe.html"
}
```

### Alignment

```json
{
  "comparisonKey": "domain/kind/code/severity/text/message",
  "countsMatch": true,
  "customLspSurfaceCount": 6,
  "customOnly": [],
  "lspOnly": [],
  "lspPublishCount": 6,
  "suppressedCount": 0
}
```

## compiler-local-nested-error

### Probe

```json
{
  "file": "src/local-nested-probe.html"
}
```

### publishDiagnostics

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
      "message": "Aurelia template compiler AUR0709 rejects this template syntax: Template compilation error: local element template needs to be defined directly under root of element \"local-nested-probe\"..",
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
  "outcome": "published",
  "uri": "fixtures://pressure/template-compiler-errors/src/local-nested-probe.html"
}
```

### aurelia/getDiagnostics

```json
{
  "fingerprint": "semantic-runtime:hit",
  "outcome": "result",
  "presentation": {
    "complete": true,
    "contextualCount": 0,
    "groups": [
      {
        "groupKey": "row:diagnostic:0:template:template-compiler-error:framework-error-code:AUR0709:src/local-nested-probe.html:23:114:template-compiler:AUR0709",
        "maxRawSeverity": "error",
        "primary": {
          "diagnostic": {
            "actionability": "guided",
            "anomaly": null,
            "category": "template-syntax",
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
              "sourceRole": null,
              "subject": null,
              "taxonomy": {
                "actionability": null,
                "category": null,
                "confidence": null,
                "impact": null,
                "schema": null
              }
            },
            "file": "src/local-nested-probe.html",
            "impact": "blocking",
            "issues": [
              {
                "code": "AUR0709",
                "kind": "template-compiler-error",
                "message": "Aurelia template compiler AUR0709 rejects this template syntax: Template compilation error: local element template needs to be defined directly under root of element \"local-nested-probe\".."
              }
            ],
            "message": "Aurelia template compiler AUR0709 rejects this template syntax: Template compilation error: local element template needs to be defined directly under root of element \"local-nested-probe\"..",
            "related": [],
            "severity": "error",
            "source": "semantic-runtime:template",
            "span": {
              "end": 114,
              "start": 23
            },
            "spanText": "<template as-custom-element=\"nested-child\">\n      <p>Nested local child</p>\n    </template>",
            "status": "primary",
            "uri": "fixtures://pressure/template-compiler-errors/src/local-nested-probe.html"
          },
          "relation": null,
          "role": "primary",
          "rowId": "diagnostic:0:template:template-compiler-error:framework-error-code:AUR0709:src/local-nested-probe.html:23:114:template-compiler:AUR0709"
        },
        "primarySeverity": "error",
        "rawRowCount": 1,
        "related": [],
        "subject": null
      }
    ],
    "primaryCount": 1,
    "rawRowCount": 1
  },
  "raw": {
    "diagnosticCount": 1,
    "diagnostics": [
      {
        "actionability": "guided",
        "anomaly": null,
        "category": "template-syntax",
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
          "sourceRole": null,
          "subject": null,
          "taxonomy": {
            "actionability": null,
            "category": null,
            "confidence": null,
            "impact": null,
            "schema": null
          }
        },
        "file": "src/local-nested-probe.html",
        "impact": "blocking",
        "issues": [
          {
            "code": "AUR0709",
            "kind": "template-compiler-error",
            "message": "Aurelia template compiler AUR0709 rejects this template syntax: Template compilation error: local element template needs to be defined directly under root of element \"local-nested-probe\".."
          }
        ],
        "message": "Aurelia template compiler AUR0709 rejects this template syntax: Template compilation error: local element template needs to be defined directly under root of element \"local-nested-probe\"..",
        "related": [],
        "severity": "error",
        "source": "semantic-runtime:template",
        "span": {
          "end": 114,
          "start": 23
        },
        "spanText": "<template as-custom-element=\"nested-child\">\n      <p>Nested local child</p>\n    </template>",
        "status": "canonical",
        "uri": "fixtures://pressure/template-compiler-errors/src/local-nested-probe.html"
      }
    ]
  },
  "suppressed": {
    "diagnosticCount": 0,
    "diagnostics": []
  },
  "surfaces": {
    "lsp": {
      "diagnosticCount": 1,
      "diagnostics": [
        {
          "actionability": "guided",
          "anomaly": null,
          "category": "template-syntax",
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
            "sourceRole": null,
            "subject": null,
            "taxonomy": {
              "actionability": null,
              "category": null,
              "confidence": null,
              "impact": null,
              "schema": null
            }
          },
          "file": "src/local-nested-probe.html",
          "impact": "blocking",
          "issues": [
            {
              "code": "AUR0709",
              "kind": "template-compiler-error",
              "message": "Aurelia template compiler AUR0709 rejects this template syntax: Template compilation error: local element template needs to be defined directly under root of element \"local-nested-probe\".."
            }
          ],
          "message": "Aurelia template compiler AUR0709 rejects this template syntax: Template compilation error: local element template needs to be defined directly under root of element \"local-nested-probe\"..",
          "related": [],
          "severity": "error",
          "source": "semantic-runtime:template",
          "span": {
            "end": 114,
            "start": 23
          },
          "spanText": "<template as-custom-element=\"nested-child\">\n      <p>Nested local child</p>\n    </template>",
          "status": "primary",
          "uri": "fixtures://pressure/template-compiler-errors/src/local-nested-probe.html"
        }
      ]
    }
  },
  "uri": "fixtures://pressure/template-compiler-errors/src/local-nested-probe.html"
}
```

### Alignment

```json
{
  "comparisonKey": "domain/kind/code/severity/text/message",
  "countsMatch": true,
  "customLspSurfaceCount": 1,
  "customOnly": [],
  "lspOnly": [],
  "lspPublishCount": 1,
  "suppressedCount": 0
}
```

## compiler-local-only-error

### Probe

```json
{
  "file": "src/local-only-probe.html"
}
```

### publishDiagnostics

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
      "message": "Aurelia template compiler AUR0708 rejects this template syntax: Template compilation error: the custom element \"local-only-probe\" does not have any content other than local template(s)..",
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
  "outcome": "published",
  "uri": "fixtures://pressure/template-compiler-errors/src/local-only-probe.html"
}
```

### aurelia/getDiagnostics

```json
{
  "fingerprint": "semantic-runtime:hit",
  "outcome": "result",
  "presentation": {
    "complete": true,
    "contextualCount": 0,
    "groups": [
      {
        "groupKey": "row:diagnostic:0:template:template-compiler-error:framework-error-code:AUR0708:src/local-only-probe.html:0:109:template-compiler:AUR0708",
        "maxRawSeverity": "error",
        "primary": {
          "diagnostic": {
            "actionability": "guided",
            "anomaly": null,
            "category": "template-syntax",
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
              "sourceRole": null,
              "subject": null,
              "taxonomy": {
                "actionability": null,
                "category": null,
                "confidence": null,
                "impact": null,
                "schema": null
              }
            },
            "file": "src/local-only-probe.html",
            "impact": "blocking",
            "issues": [
              {
                "code": "AUR0708",
                "kind": "template-compiler-error",
                "message": "Aurelia template compiler AUR0708 rejects this template syntax: Template compilation error: the custom element \"local-only-probe\" does not have any content other than local template(s).."
              }
            ],
            "message": "Aurelia template compiler AUR0708 rejects this template syntax: Template compilation error: the custom element \"local-only-probe\" does not have any content other than local template(s)..",
            "related": [],
            "severity": "error",
            "source": "semantic-runtime:template",
            "span": {
              "end": 109,
              "start": 0
            },
            "spanText": "<template>\n  <template as-custom-element=\"only-child\">\n    <p>Only local child</p>\n  </template>\n</template>\n",
            "status": "primary",
            "uri": "fixtures://pressure/template-compiler-errors/src/local-only-probe.html"
          },
          "relation": null,
          "role": "primary",
          "rowId": "diagnostic:0:template:template-compiler-error:framework-error-code:AUR0708:src/local-only-probe.html:0:109:template-compiler:AUR0708"
        },
        "primarySeverity": "error",
        "rawRowCount": 1,
        "related": [],
        "subject": null
      }
    ],
    "primaryCount": 1,
    "rawRowCount": 1
  },
  "raw": {
    "diagnosticCount": 1,
    "diagnostics": [
      {
        "actionability": "guided",
        "anomaly": null,
        "category": "template-syntax",
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
          "sourceRole": null,
          "subject": null,
          "taxonomy": {
            "actionability": null,
            "category": null,
            "confidence": null,
            "impact": null,
            "schema": null
          }
        },
        "file": "src/local-only-probe.html",
        "impact": "blocking",
        "issues": [
          {
            "code": "AUR0708",
            "kind": "template-compiler-error",
            "message": "Aurelia template compiler AUR0708 rejects this template syntax: Template compilation error: the custom element \"local-only-probe\" does not have any content other than local template(s).."
          }
        ],
        "message": "Aurelia template compiler AUR0708 rejects this template syntax: Template compilation error: the custom element \"local-only-probe\" does not have any content other than local template(s)..",
        "related": [],
        "severity": "error",
        "source": "semantic-runtime:template",
        "span": {
          "end": 109,
          "start": 0
        },
        "spanText": "<template>\n  <template as-custom-element=\"only-child\">\n    <p>Only local child</p>\n  </template>\n</template>\n",
        "status": "canonical",
        "uri": "fixtures://pressure/template-compiler-errors/src/local-only-probe.html"
      }
    ]
  },
  "suppressed": {
    "diagnosticCount": 0,
    "diagnostics": []
  },
  "surfaces": {
    "lsp": {
      "diagnosticCount": 1,
      "diagnostics": [
        {
          "actionability": "guided",
          "anomaly": null,
          "category": "template-syntax",
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
            "sourceRole": null,
            "subject": null,
            "taxonomy": {
              "actionability": null,
              "category": null,
              "confidence": null,
              "impact": null,
              "schema": null
            }
          },
          "file": "src/local-only-probe.html",
          "impact": "blocking",
          "issues": [
            {
              "code": "AUR0708",
              "kind": "template-compiler-error",
              "message": "Aurelia template compiler AUR0708 rejects this template syntax: Template compilation error: the custom element \"local-only-probe\" does not have any content other than local template(s).."
            }
          ],
          "message": "Aurelia template compiler AUR0708 rejects this template syntax: Template compilation error: the custom element \"local-only-probe\" does not have any content other than local template(s)..",
          "related": [],
          "severity": "error",
          "source": "semantic-runtime:template",
          "span": {
            "end": 109,
            "start": 0
          },
          "spanText": "<template>\n  <template as-custom-element=\"only-child\">\n    <p>Only local child</p>\n  </template>\n</template>\n",
          "status": "primary",
          "uri": "fixtures://pressure/template-compiler-errors/src/local-only-probe.html"
        }
      ]
    }
  },
  "uri": "fixtures://pressure/template-compiler-errors/src/local-only-probe.html"
}
```

### Alignment

```json
{
  "comparisonKey": "domain/kind/code/severity/text/message",
  "countsMatch": true,
  "customLspSurfaceCount": 1,
  "customOnly": [],
  "lspOnly": [],
  "lspPublishCount": 1,
  "suppressedCount": 0
}
```

## compiler-local-root-error

### Probe

```json
{
  "file": "src/local-root-probe.html"
}
```

### publishDiagnostics

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
      "message": "Aurelia template compiler AUR0701 rejects this template syntax: Template compilation error in element \"local-root-probe\": the root <template> cannot be a local element template..",
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
  "outcome": "published",
  "uri": "fixtures://pressure/template-compiler-errors/src/local-root-probe.html"
}
```

### aurelia/getDiagnostics

```json
{
  "fingerprint": "semantic-runtime:hit",
  "outcome": "result",
  "presentation": {
    "complete": true,
    "contextualCount": 0,
    "groups": [
      {
        "groupKey": "row:diagnostic:0:template:template-compiler-error:framework-error-code:AUR0701:src/local-root-probe.html:10:46:template-compiler:AUR0701",
        "maxRawSeverity": "error",
        "primary": {
          "diagnostic": {
            "actionability": "guided",
            "anomaly": null,
            "category": "template-syntax",
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
              "sourceRole": null,
              "subject": null,
              "taxonomy": {
                "actionability": null,
                "category": null,
                "confidence": null,
                "impact": null,
                "schema": null
              }
            },
            "file": "src/local-root-probe.html",
            "impact": "blocking",
            "issues": [
              {
                "code": "AUR0701",
                "kind": "template-compiler-error",
                "message": "Aurelia template compiler AUR0701 rejects this template syntax: Template compilation error in element \"local-root-probe\": the root <template> cannot be a local element template.."
              }
            ],
            "message": "Aurelia template compiler AUR0701 rejects this template syntax: Template compilation error in element \"local-root-probe\": the root <template> cannot be a local element template..",
            "related": [],
            "severity": "error",
            "source": "semantic-runtime:template",
            "span": {
              "end": 46,
              "start": 10
            },
            "spanText": "as-custom-element=\"root-local-probe\"",
            "status": "primary",
            "uri": "fixtures://pressure/template-compiler-errors/src/local-root-probe.html"
          },
          "relation": null,
          "role": "primary",
          "rowId": "diagnostic:0:template:template-compiler-error:framework-error-code:AUR0701:src/local-root-probe.html:10:46:template-compiler:AUR0701"
        },
        "primarySeverity": "error",
        "rawRowCount": 1,
        "related": [],
        "subject": null
      }
    ],
    "primaryCount": 1,
    "rawRowCount": 1
  },
  "raw": {
    "diagnosticCount": 1,
    "diagnostics": [
      {
        "actionability": "guided",
        "anomaly": null,
        "category": "template-syntax",
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
          "sourceRole": null,
          "subject": null,
          "taxonomy": {
            "actionability": null,
            "category": null,
            "confidence": null,
            "impact": null,
            "schema": null
          }
        },
        "file": "src/local-root-probe.html",
        "impact": "blocking",
        "issues": [
          {
            "code": "AUR0701",
            "kind": "template-compiler-error",
            "message": "Aurelia template compiler AUR0701 rejects this template syntax: Template compilation error in element \"local-root-probe\": the root <template> cannot be a local element template.."
          }
        ],
        "message": "Aurelia template compiler AUR0701 rejects this template syntax: Template compilation error in element \"local-root-probe\": the root <template> cannot be a local element template..",
        "related": [],
        "severity": "error",
        "source": "semantic-runtime:template",
        "span": {
          "end": 46,
          "start": 10
        },
        "spanText": "as-custom-element=\"root-local-probe\"",
        "status": "canonical",
        "uri": "fixtures://pressure/template-compiler-errors/src/local-root-probe.html"
      }
    ]
  },
  "suppressed": {
    "diagnosticCount": 0,
    "diagnostics": []
  },
  "surfaces": {
    "lsp": {
      "diagnosticCount": 1,
      "diagnostics": [
        {
          "actionability": "guided",
          "anomaly": null,
          "category": "template-syntax",
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
            "sourceRole": null,
            "subject": null,
            "taxonomy": {
              "actionability": null,
              "category": null,
              "confidence": null,
              "impact": null,
              "schema": null
            }
          },
          "file": "src/local-root-probe.html",
          "impact": "blocking",
          "issues": [
            {
              "code": "AUR0701",
              "kind": "template-compiler-error",
              "message": "Aurelia template compiler AUR0701 rejects this template syntax: Template compilation error in element \"local-root-probe\": the root <template> cannot be a local element template.."
            }
          ],
          "message": "Aurelia template compiler AUR0701 rejects this template syntax: Template compilation error in element \"local-root-probe\": the root <template> cannot be a local element template..",
          "related": [],
          "severity": "error",
          "source": "semantic-runtime:template",
          "span": {
            "end": 46,
            "start": 10
          },
          "spanText": "as-custom-element=\"root-local-probe\"",
          "status": "primary",
          "uri": "fixtures://pressure/template-compiler-errors/src/local-root-probe.html"
        }
      ]
    }
  },
  "uri": "fixtures://pressure/template-compiler-errors/src/local-root-probe.html"
}
```

### Alignment

```json
{
  "comparisonKey": "domain/kind/code/severity/text/message",
  "countsMatch": true,
  "customLspSurfaceCount": 1,
  "customOnly": [],
  "lspOnly": [],
  "lspPublishCount": 1,
  "suppressedCount": 0
}
```

## compiler-surrogate-invalid-attribute-error

### Probe

```json
{
  "file": "src/surrogate-invalid-attribute.html"
}
```

### publishDiagnostics

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
  "outcome": "published",
  "uri": "fixtures://pressure/template-compiler-errors/src/surrogate-invalid-attribute.html"
}
```

### aurelia/getDiagnostics

```json
{
  "fingerprint": "semantic-runtime:hit",
  "outcome": "result",
  "presentation": {
    "complete": true,
    "contextualCount": 0,
    "groups": [
      {
        "groupKey": "row:diagnostic:0:template:template-compiler-error:framework-error-code:AUR0702:src/surrogate-invalid-attribute.html:10:32:template-compiler:AUR0702",
        "maxRawSeverity": "error",
        "primary": {
          "diagnostic": {
            "actionability": "guided",
            "anomaly": null,
            "category": "template-syntax",
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
              "sourceRole": null,
              "subject": null,
              "taxonomy": {
                "actionability": null,
                "category": null,
                "confidence": null,
                "impact": null,
                "schema": null
              }
            },
            "file": "src/surrogate-invalid-attribute.html",
            "impact": "blocking",
            "issues": [
              {
                "code": "AUR0702",
                "kind": "template-compiler-error",
                "message": "Aurelia template compiler AUR0702 rejects this template syntax: Template compilation error: attribute \"id\" is invalid on element surrogate.."
              }
            ],
            "message": "Aurelia template compiler AUR0702 rejects this template syntax: Template compilation error: attribute \"id\" is invalid on element surrogate..",
            "related": [],
            "severity": "error",
            "source": "semantic-runtime:template",
            "span": {
              "end": 32,
              "start": 10
            },
            "spanText": "id=\"invalid-surrogate\"",
            "status": "primary",
            "uri": "fixtures://pressure/template-compiler-errors/src/surrogate-invalid-attribute.html"
          },
          "relation": null,
          "role": "primary",
          "rowId": "diagnostic:0:template:template-compiler-error:framework-error-code:AUR0702:src/surrogate-invalid-attribute.html:10:32:template-compiler:AUR0702"
        },
        "primarySeverity": "error",
        "rawRowCount": 1,
        "related": [],
        "subject": null
      }
    ],
    "primaryCount": 1,
    "rawRowCount": 1
  },
  "raw": {
    "diagnosticCount": 1,
    "diagnostics": [
      {
        "actionability": "guided",
        "anomaly": null,
        "category": "template-syntax",
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
          "sourceRole": null,
          "subject": null,
          "taxonomy": {
            "actionability": null,
            "category": null,
            "confidence": null,
            "impact": null,
            "schema": null
          }
        },
        "file": "src/surrogate-invalid-attribute.html",
        "impact": "blocking",
        "issues": [
          {
            "code": "AUR0702",
            "kind": "template-compiler-error",
            "message": "Aurelia template compiler AUR0702 rejects this template syntax: Template compilation error: attribute \"id\" is invalid on element surrogate.."
          }
        ],
        "message": "Aurelia template compiler AUR0702 rejects this template syntax: Template compilation error: attribute \"id\" is invalid on element surrogate..",
        "related": [],
        "severity": "error",
        "source": "semantic-runtime:template",
        "span": {
          "end": 32,
          "start": 10
        },
        "spanText": "id=\"invalid-surrogate\"",
        "status": "canonical",
        "uri": "fixtures://pressure/template-compiler-errors/src/surrogate-invalid-attribute.html"
      }
    ]
  },
  "suppressed": {
    "diagnosticCount": 0,
    "diagnostics": []
  },
  "surfaces": {
    "lsp": {
      "diagnosticCount": 1,
      "diagnostics": [
        {
          "actionability": "guided",
          "anomaly": null,
          "category": "template-syntax",
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
            "sourceRole": null,
            "subject": null,
            "taxonomy": {
              "actionability": null,
              "category": null,
              "confidence": null,
              "impact": null,
              "schema": null
            }
          },
          "file": "src/surrogate-invalid-attribute.html",
          "impact": "blocking",
          "issues": [
            {
              "code": "AUR0702",
              "kind": "template-compiler-error",
              "message": "Aurelia template compiler AUR0702 rejects this template syntax: Template compilation error: attribute \"id\" is invalid on element surrogate.."
            }
          ],
          "message": "Aurelia template compiler AUR0702 rejects this template syntax: Template compilation error: attribute \"id\" is invalid on element surrogate..",
          "related": [],
          "severity": "error",
          "source": "semantic-runtime:template",
          "span": {
            "end": 32,
            "start": 10
          },
          "spanText": "id=\"invalid-surrogate\"",
          "status": "primary",
          "uri": "fixtures://pressure/template-compiler-errors/src/surrogate-invalid-attribute.html"
        }
      ]
    }
  },
  "uri": "fixtures://pressure/template-compiler-errors/src/surrogate-invalid-attribute.html"
}
```

### Alignment

```json
{
  "comparisonKey": "domain/kind/code/severity/text/message",
  "countsMatch": true,
  "customLspSurfaceCount": 1,
  "customOnly": [],
  "lspOnly": [],
  "lspPublishCount": 1,
  "suppressedCount": 0
}
```

## compiler-surrogate-template-controller-error

### Probe

```json
{
  "file": "src/surrogate-template-probe.html"
}
```

### publishDiagnostics

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
  "outcome": "published",
  "uri": "fixtures://pressure/template-compiler-errors/src/surrogate-template-probe.html"
}
```

### aurelia/getDiagnostics

```json
{
  "fingerprint": "semantic-runtime:hit",
  "outcome": "result",
  "presentation": {
    "complete": true,
    "contextualCount": 0,
    "groups": [
      {
        "groupKey": "row:diagnostic:0:template:template-compiler-error:framework-error-code:AUR0703:src/surrogate-template-probe.html:10:12:template-compiler:AUR0703",
        "maxRawSeverity": "error",
        "primary": {
          "diagnostic": {
            "actionability": "guided",
            "anomaly": null,
            "category": "template-syntax",
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
              "sourceRole": null,
              "subject": null,
              "taxonomy": {
                "actionability": null,
                "category": null,
                "confidence": null,
                "impact": null,
                "schema": null
              }
            },
            "file": "src/surrogate-template-probe.html",
            "impact": "blocking",
            "issues": [
              {
                "code": "AUR0703",
                "kind": "template-compiler-error",
                "message": "Aurelia template compiler AUR0703 rejects this template syntax: Template compilation error: template controller \"if\" is invalid on element surrogate.."
              }
            ],
            "message": "Aurelia template compiler AUR0703 rejects this template syntax: Template compilation error: template controller \"if\" is invalid on element surrogate..",
            "related": [],
            "severity": "error",
            "source": "semantic-runtime:template",
            "span": {
              "end": 12,
              "start": 10
            },
            "spanText": "if",
            "status": "primary",
            "uri": "fixtures://pressure/template-compiler-errors/src/surrogate-template-probe.html"
          },
          "relation": null,
          "role": "primary",
          "rowId": "diagnostic:0:template:template-compiler-error:framework-error-code:AUR0703:src/surrogate-template-probe.html:10:12:template-compiler:AUR0703"
        },
        "primarySeverity": "error",
        "rawRowCount": 1,
        "related": [],
        "subject": null
      }
    ],
    "primaryCount": 1,
    "rawRowCount": 1
  },
  "raw": {
    "diagnosticCount": 1,
    "diagnostics": [
      {
        "actionability": "guided",
        "anomaly": null,
        "category": "template-syntax",
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
          "sourceRole": null,
          "subject": null,
          "taxonomy": {
            "actionability": null,
            "category": null,
            "confidence": null,
            "impact": null,
            "schema": null
          }
        },
        "file": "src/surrogate-template-probe.html",
        "impact": "blocking",
        "issues": [
          {
            "code": "AUR0703",
            "kind": "template-compiler-error",
            "message": "Aurelia template compiler AUR0703 rejects this template syntax: Template compilation error: template controller \"if\" is invalid on element surrogate.."
          }
        ],
        "message": "Aurelia template compiler AUR0703 rejects this template syntax: Template compilation error: template controller \"if\" is invalid on element surrogate..",
        "related": [],
        "severity": "error",
        "source": "semantic-runtime:template",
        "span": {
          "end": 12,
          "start": 10
        },
        "spanText": "if",
        "status": "canonical",
        "uri": "fixtures://pressure/template-compiler-errors/src/surrogate-template-probe.html"
      }
    ]
  },
  "suppressed": {
    "diagnosticCount": 0,
    "diagnostics": []
  },
  "surfaces": {
    "lsp": {
      "diagnosticCount": 1,
      "diagnostics": [
        {
          "actionability": "guided",
          "anomaly": null,
          "category": "template-syntax",
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
            "sourceRole": null,
            "subject": null,
            "taxonomy": {
              "actionability": null,
              "category": null,
              "confidence": null,
              "impact": null,
              "schema": null
            }
          },
          "file": "src/surrogate-template-probe.html",
          "impact": "blocking",
          "issues": [
            {
              "code": "AUR0703",
              "kind": "template-compiler-error",
              "message": "Aurelia template compiler AUR0703 rejects this template syntax: Template compilation error: template controller \"if\" is invalid on element surrogate.."
            }
          ],
          "message": "Aurelia template compiler AUR0703 rejects this template syntax: Template compilation error: template controller \"if\" is invalid on element surrogate..",
          "related": [],
          "severity": "error",
          "source": "semantic-runtime:template",
          "span": {
            "end": 12,
            "start": 10
          },
          "spanText": "if",
          "status": "primary",
          "uri": "fixtures://pressure/template-compiler-errors/src/surrogate-template-probe.html"
        }
      ]
    }
  },
  "uri": "fixtures://pressure/template-compiler-errors/src/surrogate-template-probe.html"
}
```

### Alignment

```json
{
  "comparisonKey": "domain/kind/code/severity/text/message",
  "countsMatch": true,
  "customLspSurfaceCount": 1,
  "customOnly": [],
  "lspOnly": [],
  "lspPublishCount": 1,
  "suppressedCount": 0
}
```
