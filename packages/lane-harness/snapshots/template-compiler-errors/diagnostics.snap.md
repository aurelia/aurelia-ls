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
  "diagnosticCount": 9,
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
          "character": 43,
          "line": 7
        },
        "start": {
          "character": 8,
          "line": 7
        }
      },
      "rangeText": "click.delegate=\"enabled = !enabled\"",
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
          "character": 39,
          "line": 8
        },
        "start": {
          "character": 8,
          "line": 8
        }
      },
      "rangeText": "click.call=\"enabled = !enabled\"",
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
        "groupKey": "row:diagnostic:6:template:template-compiler-error:framework-error-code:AUR0723:src/template-compiler-errors-app.html:5:22:template-compiler:AUR0723",
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
          "rowId": "diagnostic:6:template:template-compiler-error:framework-error-code:AUR0723:src/template-compiler-errors-app.html:5:22:template-compiler:AUR0723"
        },
        "primarySeverity": "error",
        "rawRowCount": 1,
        "related": [],
        "subject": null
      },
      {
        "groupKey": "row:diagnostic:8:template:template-compiler-error:framework-error-code:AUR0720:src/template-compiler-errors-app.html:63:94:template-compiler:AUR0720",
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
          "rowId": "diagnostic:8:template:template-compiler-error:framework-error-code:AUR0720:src/template-compiler-errors-app.html:63:94:template-compiler:AUR0720"
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
        "groupKey": "row:diagnostic:3:template:template-compiler-error:framework-error-code:AUR0707:src/template-compiler-errors-app.html:325:332:template-compiler:AUR0707",
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
          "rowId": "diagnostic:3:template:template-compiler-error:framework-error-code:AUR0707:src/template-compiler-errors-app.html:325:332:template-compiler:AUR0707"
        },
        "primarySeverity": "error",
        "rawRowCount": 1,
        "related": [],
        "subject": null
      },
      {
        "groupKey": "row:diagnostic:4:template:template-compiler-error:framework-error-code:AUR0704:src/template-compiler-errors-app.html:402:409:template-compiler:AUR0704",
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
          "rowId": "diagnostic:4:template:template-compiler-error:framework-error-code:AUR0704:src/template-compiler-errors-app.html:402:409:template-compiler:AUR0704"
        },
        "primarySeverity": "error",
        "rawRowCount": 1,
        "related": [],
        "subject": null
      },
      {
        "groupKey": "row:diagnostic:5:template:template-compiler-error:framework-error-code:AUR0713:src/template-compiler-errors-app.html:435:470:template-compiler:AUR0713",
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
              "end": 470,
              "start": 435
            },
            "spanText": "click.delegate=\"enabled = !enabled\"",
            "status": "primary",
            "uri": "fixtures://pressure/template-compiler-errors/src/template-compiler-errors-app.html"
          },
          "relation": null,
          "role": "primary",
          "rowId": "diagnostic:5:template:template-compiler-error:framework-error-code:AUR0713:src/template-compiler-errors-app.html:435:470:template-compiler:AUR0713"
        },
        "primarySeverity": "error",
        "rawRowCount": 1,
        "related": [],
        "subject": null
      },
      {
        "groupKey": "row:diagnostic:7:template:template-compiler-error:framework-error-code:AUR0713:src/template-compiler-errors-app.html:512:543:template-compiler:AUR0713",
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
              "end": 543,
              "start": 512
            },
            "spanText": "click.call=\"enabled = !enabled\"",
            "status": "primary",
            "uri": "fixtures://pressure/template-compiler-errors/src/template-compiler-errors-app.html"
          },
          "relation": null,
          "role": "primary",
          "rowId": "diagnostic:7:template:template-compiler-error:framework-error-code:AUR0713:src/template-compiler-errors-app.html:512:543:template-compiler:AUR0713"
        },
        "primarySeverity": "error",
        "rawRowCount": 1,
        "related": [],
        "subject": null
      }
    ],
    "primaryCount": 9,
    "rawRowCount": 9
  },
  "raw": {
    "diagnosticCount": 9,
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
          "end": 470,
          "start": 435
        },
        "spanText": "click.delegate=\"enabled = !enabled\"",
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
          "end": 543,
          "start": 512
        },
        "spanText": "click.call=\"enabled = !enabled\"",
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
      "diagnosticCount": 9,
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
            "end": 470,
            "start": 435
          },
          "spanText": "click.delegate=\"enabled = !enabled\"",
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
            "end": 543,
            "start": 512
          },
          "spanText": "click.call=\"enabled = !enabled\"",
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
  "customLspSurfaceCount": 9,
  "customOnly": [],
  "lspOnly": [],
  "lspPublishCount": 9,
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
  "diagnosticCount": 0,
  "diagnostics": [],
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
    "groups": [],
    "primaryCount": 0,
    "rawRowCount": 0
  },
  "raw": {
    "diagnosticCount": 0,
    "diagnostics": []
  },
  "suppressed": {
    "diagnosticCount": 0,
    "diagnostics": []
  },
  "surfaces": {
    "lsp": {
      "diagnosticCount": 0,
      "diagnostics": []
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
  "customLspSurfaceCount": 0,
  "customOnly": [],
  "lspOnly": [],
  "lspPublishCount": 0,
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
  "diagnosticCount": 0,
  "diagnostics": [],
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
    "groups": [],
    "primaryCount": 0,
    "rawRowCount": 0
  },
  "raw": {
    "diagnosticCount": 0,
    "diagnostics": []
  },
  "suppressed": {
    "diagnosticCount": 0,
    "diagnostics": []
  },
  "surfaces": {
    "lsp": {
      "diagnosticCount": 0,
      "diagnostics": []
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
  "customLspSurfaceCount": 0,
  "customOnly": [],
  "lspOnly": [],
  "lspPublishCount": 0,
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
  "diagnosticCount": 0,
  "diagnostics": [],
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
    "groups": [],
    "primaryCount": 0,
    "rawRowCount": 0
  },
  "raw": {
    "diagnosticCount": 0,
    "diagnostics": []
  },
  "suppressed": {
    "diagnosticCount": 0,
    "diagnostics": []
  },
  "surfaces": {
    "lsp": {
      "diagnosticCount": 0,
      "diagnostics": []
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
  "customLspSurfaceCount": 0,
  "customOnly": [],
  "lspOnly": [],
  "lspPublishCount": 0,
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
  "diagnosticCount": 0,
  "diagnostics": [],
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
    "groups": [],
    "primaryCount": 0,
    "rawRowCount": 0
  },
  "raw": {
    "diagnosticCount": 0,
    "diagnostics": []
  },
  "suppressed": {
    "diagnosticCount": 0,
    "diagnostics": []
  },
  "surfaces": {
    "lsp": {
      "diagnosticCount": 0,
      "diagnostics": []
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
  "customLspSurfaceCount": 0,
  "customOnly": [],
  "lspOnly": [],
  "lspPublishCount": 0,
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
  "diagnosticCount": 0,
  "diagnostics": [],
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
    "groups": [],
    "primaryCount": 0,
    "rawRowCount": 0
  },
  "raw": {
    "diagnosticCount": 0,
    "diagnostics": []
  },
  "suppressed": {
    "diagnosticCount": 0,
    "diagnostics": []
  },
  "surfaces": {
    "lsp": {
      "diagnosticCount": 0,
      "diagnostics": []
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
  "customLspSurfaceCount": 0,
  "customOnly": [],
  "lspOnly": [],
  "lspPublishCount": 0,
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
  "diagnosticCount": 0,
  "diagnostics": [],
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
    "groups": [],
    "primaryCount": 0,
    "rawRowCount": 0
  },
  "raw": {
    "diagnosticCount": 0,
    "diagnostics": []
  },
  "suppressed": {
    "diagnosticCount": 0,
    "diagnostics": []
  },
  "surfaces": {
    "lsp": {
      "diagnosticCount": 0,
      "diagnostics": []
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
  "customLspSurfaceCount": 0,
  "customOnly": [],
  "lspOnly": [],
  "lspPublishCount": 0,
  "suppressedCount": 0
}
```
