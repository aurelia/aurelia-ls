# unregistered-shorthand-syntax diagnostics lane snapshot

Fixture: `packages/semantic-runtime/fixtures/pressure/unregistered-shorthand-syntax`
Probe file: `packages/lane-harness/probes/unregistered-shorthand-syntax.probes.json`
Lane: `diagnostics`

This snapshot records observed language-server behavior. Operator verdicts live in the probe data.

## unregistered-shorthand-syntax-template

### Probe

```json
{
  "file": "src/unregistered-shorthand-syntax-app.html"
}
```

### publishDiagnostics

```json
{
  "diagnosticCount": 2,
  "diagnostics": [
    {
      "anomaly": null,
      "code": "framework-capability-not-registered",
      "data": {
        "diagnosticAuthority": "semantic-authoring-policy",
        "diagnosticDomain": "template",
        "diagnosticKind": "framework-capability-not-registered",
        "frameworkErrorCode": null,
        "frameworkRawErrorAuthority": null,
        "missingInput": "runtime-html.short-hand-binding-syntax",
        "missingInputs": [
          "runtime-html.short-hand-binding-syntax"
        ],
        "phase": null,
        "relatedInformation": [],
        "relatedQueryKind": "template-diagnostics",
        "repairAffordance": {
          "actionKind": "register-framework-capability",
          "actionability": "guided",
          "changeDomain": "app-source",
          "planKind": "framework-capability-registration",
          "readiness": "source-edit-policy-open",
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
      "message": "Attribute \":value\" uses Aurelia shorthand binding syntax, but that framework capability is not registered in this app world.",
      "range": {
        "end": {
          "character": 21,
          "line": 0
        },
        "start": {
          "character": 7,
          "line": 0
        }
      },
      "rangeText": ":value=\"value\"",
      "relatedInformation": [],
      "severity": "error",
      "source": "aurelia"
    },
    {
      "anomaly": null,
      "code": "framework-capability-not-registered",
      "data": {
        "diagnosticAuthority": "semantic-authoring-policy",
        "diagnosticDomain": "template",
        "diagnosticKind": "framework-capability-not-registered",
        "frameworkErrorCode": null,
        "frameworkRawErrorAuthority": null,
        "missingInput": "runtime-html.short-hand-binding-syntax",
        "missingInputs": [
          "runtime-html.short-hand-binding-syntax"
        ],
        "phase": null,
        "relatedInformation": [],
        "relatedQueryKind": "template-diagnostics",
        "repairAffordance": {
          "actionKind": "register-framework-capability",
          "actionability": "guided",
          "changeDomain": "app-source",
          "planKind": "framework-capability-registration",
          "readiness": "source-edit-policy-open",
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
      "message": "Attribute \"@click\" uses Aurelia shorthand binding syntax, but that framework capability is not registered in this app world.",
      "range": {
        "end": {
          "character": 23,
          "line": 1
        },
        "start": {
          "character": 8,
          "line": 1
        }
      },
      "rangeText": "@click=\"save()\"",
      "relatedInformation": [],
      "severity": "error",
      "source": "aurelia"
    }
  ],
  "outcome": "published",
  "uri": "fixtures://pressure/unregistered-shorthand-syntax/src/unregistered-shorthand-syntax-app.html"
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
        "groupKey": "row:diagnostic:1:template:framework-capability-not-registered:semantic-authoring-policy:no-framework-code:src/unregistered-shorthand-syntax-app.html:7:21:runtime-html.short-hand-binding-syntax",
        "maxRawSeverity": "error",
        "primary": {
          "diagnostic": {
            "actionability": "guided",
            "anomaly": null,
            "category": "template-syntax",
            "code": "framework-capability-not-registered",
            "data": {
              "diagnosticAuthority": "semantic-authoring-policy",
              "diagnosticDomain": "template",
              "diagnosticKind": "framework-capability-not-registered",
              "frameworkErrorCode": null,
              "frameworkRawErrorAuthority": null,
              "missingInput": "runtime-html.short-hand-binding-syntax",
              "missingInputs": [
                "runtime-html.short-hand-binding-syntax"
              ],
              "phase": null,
              "relatedInformation": [],
              "relatedQueryKind": "template-diagnostics",
              "repairAffordance": {
                "actionKind": "register-framework-capability",
                "actionability": "guided",
                "changeDomain": "app-source",
                "planKind": "framework-capability-registration",
                "readiness": "source-edit-policy-open",
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
            "file": "src/unregistered-shorthand-syntax-app.html",
            "impact": "blocking",
            "issues": [
              {
                "code": "framework-capability-not-registered",
                "kind": "framework-capability-not-registered",
                "message": "Attribute \":value\" uses Aurelia shorthand binding syntax, but that framework capability is not registered in this app world."
              }
            ],
            "message": "Attribute \":value\" uses Aurelia shorthand binding syntax, but that framework capability is not registered in this app world.",
            "related": [],
            "severity": "error",
            "source": "semantic-runtime:template",
            "span": {
              "end": 21,
              "start": 7
            },
            "spanText": ":value=\"value\"",
            "status": "primary",
            "uri": "fixtures://pressure/unregistered-shorthand-syntax/src/unregistered-shorthand-syntax-app.html"
          },
          "relation": null,
          "role": "primary",
          "rowId": "diagnostic:1:template:framework-capability-not-registered:semantic-authoring-policy:no-framework-code:src/unregistered-shorthand-syntax-app.html:7:21:runtime-html.short-hand-binding-syntax"
        },
        "primarySeverity": "error",
        "rawRowCount": 1,
        "related": [],
        "subject": null
      },
      {
        "groupKey": "row:diagnostic:0:template:framework-capability-not-registered:semantic-authoring-policy:no-framework-code:src/unregistered-shorthand-syntax-app.html:31:46:runtime-html.short-hand-binding-syntax",
        "maxRawSeverity": "error",
        "primary": {
          "diagnostic": {
            "actionability": "guided",
            "anomaly": null,
            "category": "template-syntax",
            "code": "framework-capability-not-registered",
            "data": {
              "diagnosticAuthority": "semantic-authoring-policy",
              "diagnosticDomain": "template",
              "diagnosticKind": "framework-capability-not-registered",
              "frameworkErrorCode": null,
              "frameworkRawErrorAuthority": null,
              "missingInput": "runtime-html.short-hand-binding-syntax",
              "missingInputs": [
                "runtime-html.short-hand-binding-syntax"
              ],
              "phase": null,
              "relatedInformation": [],
              "relatedQueryKind": "template-diagnostics",
              "repairAffordance": {
                "actionKind": "register-framework-capability",
                "actionability": "guided",
                "changeDomain": "app-source",
                "planKind": "framework-capability-registration",
                "readiness": "source-edit-policy-open",
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
            "file": "src/unregistered-shorthand-syntax-app.html",
            "impact": "blocking",
            "issues": [
              {
                "code": "framework-capability-not-registered",
                "kind": "framework-capability-not-registered",
                "message": "Attribute \"@click\" uses Aurelia shorthand binding syntax, but that framework capability is not registered in this app world."
              }
            ],
            "message": "Attribute \"@click\" uses Aurelia shorthand binding syntax, but that framework capability is not registered in this app world.",
            "related": [],
            "severity": "error",
            "source": "semantic-runtime:template",
            "span": {
              "end": 46,
              "start": 31
            },
            "spanText": "@click=\"save()\"",
            "status": "primary",
            "uri": "fixtures://pressure/unregistered-shorthand-syntax/src/unregistered-shorthand-syntax-app.html"
          },
          "relation": null,
          "role": "primary",
          "rowId": "diagnostic:0:template:framework-capability-not-registered:semantic-authoring-policy:no-framework-code:src/unregistered-shorthand-syntax-app.html:31:46:runtime-html.short-hand-binding-syntax"
        },
        "primarySeverity": "error",
        "rawRowCount": 1,
        "related": [],
        "subject": null
      }
    ],
    "primaryCount": 2,
    "rawRowCount": 2
  },
  "raw": {
    "diagnosticCount": 2,
    "diagnostics": [
      {
        "actionability": "guided",
        "anomaly": null,
        "category": "template-syntax",
        "code": "framework-capability-not-registered",
        "data": {
          "diagnosticAuthority": "semantic-authoring-policy",
          "diagnosticDomain": "template",
          "diagnosticKind": "framework-capability-not-registered",
          "frameworkErrorCode": null,
          "frameworkRawErrorAuthority": null,
          "missingInput": "runtime-html.short-hand-binding-syntax",
          "missingInputs": [
            "runtime-html.short-hand-binding-syntax"
          ],
          "phase": null,
          "relatedInformation": [],
          "relatedQueryKind": "template-diagnostics",
          "repairAffordance": {
            "actionKind": "register-framework-capability",
            "actionability": "guided",
            "changeDomain": "app-source",
            "planKind": "framework-capability-registration",
            "readiness": "source-edit-policy-open",
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
        "file": "src/unregistered-shorthand-syntax-app.html",
        "impact": "blocking",
        "issues": [
          {
            "code": "framework-capability-not-registered",
            "kind": "framework-capability-not-registered",
            "message": "Attribute \"@click\" uses Aurelia shorthand binding syntax, but that framework capability is not registered in this app world."
          }
        ],
        "message": "Attribute \"@click\" uses Aurelia shorthand binding syntax, but that framework capability is not registered in this app world.",
        "related": [],
        "severity": "error",
        "source": "semantic-runtime:template",
        "span": {
          "end": 46,
          "start": 31
        },
        "spanText": "@click=\"save()\"",
        "status": "canonical",
        "uri": "fixtures://pressure/unregistered-shorthand-syntax/src/unregistered-shorthand-syntax-app.html"
      },
      {
        "actionability": "guided",
        "anomaly": null,
        "category": "template-syntax",
        "code": "framework-capability-not-registered",
        "data": {
          "diagnosticAuthority": "semantic-authoring-policy",
          "diagnosticDomain": "template",
          "diagnosticKind": "framework-capability-not-registered",
          "frameworkErrorCode": null,
          "frameworkRawErrorAuthority": null,
          "missingInput": "runtime-html.short-hand-binding-syntax",
          "missingInputs": [
            "runtime-html.short-hand-binding-syntax"
          ],
          "phase": null,
          "relatedInformation": [],
          "relatedQueryKind": "template-diagnostics",
          "repairAffordance": {
            "actionKind": "register-framework-capability",
            "actionability": "guided",
            "changeDomain": "app-source",
            "planKind": "framework-capability-registration",
            "readiness": "source-edit-policy-open",
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
        "file": "src/unregistered-shorthand-syntax-app.html",
        "impact": "blocking",
        "issues": [
          {
            "code": "framework-capability-not-registered",
            "kind": "framework-capability-not-registered",
            "message": "Attribute \":value\" uses Aurelia shorthand binding syntax, but that framework capability is not registered in this app world."
          }
        ],
        "message": "Attribute \":value\" uses Aurelia shorthand binding syntax, but that framework capability is not registered in this app world.",
        "related": [],
        "severity": "error",
        "source": "semantic-runtime:template",
        "span": {
          "end": 21,
          "start": 7
        },
        "spanText": ":value=\"value\"",
        "status": "canonical",
        "uri": "fixtures://pressure/unregistered-shorthand-syntax/src/unregistered-shorthand-syntax-app.html"
      }
    ]
  },
  "suppressed": {
    "diagnosticCount": 0,
    "diagnostics": []
  },
  "surfaces": {
    "lsp": {
      "diagnosticCount": 2,
      "diagnostics": [
        {
          "actionability": "guided",
          "anomaly": null,
          "category": "template-syntax",
          "code": "framework-capability-not-registered",
          "data": {
            "diagnosticAuthority": "semantic-authoring-policy",
            "diagnosticDomain": "template",
            "diagnosticKind": "framework-capability-not-registered",
            "frameworkErrorCode": null,
            "frameworkRawErrorAuthority": null,
            "missingInput": "runtime-html.short-hand-binding-syntax",
            "missingInputs": [
              "runtime-html.short-hand-binding-syntax"
            ],
            "phase": null,
            "relatedInformation": [],
            "relatedQueryKind": "template-diagnostics",
            "repairAffordance": {
              "actionKind": "register-framework-capability",
              "actionability": "guided",
              "changeDomain": "app-source",
              "planKind": "framework-capability-registration",
              "readiness": "source-edit-policy-open",
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
          "file": "src/unregistered-shorthand-syntax-app.html",
          "impact": "blocking",
          "issues": [
            {
              "code": "framework-capability-not-registered",
              "kind": "framework-capability-not-registered",
              "message": "Attribute \":value\" uses Aurelia shorthand binding syntax, but that framework capability is not registered in this app world."
            }
          ],
          "message": "Attribute \":value\" uses Aurelia shorthand binding syntax, but that framework capability is not registered in this app world.",
          "related": [],
          "severity": "error",
          "source": "semantic-runtime:template",
          "span": {
            "end": 21,
            "start": 7
          },
          "spanText": ":value=\"value\"",
          "status": "primary",
          "uri": "fixtures://pressure/unregistered-shorthand-syntax/src/unregistered-shorthand-syntax-app.html"
        },
        {
          "actionability": "guided",
          "anomaly": null,
          "category": "template-syntax",
          "code": "framework-capability-not-registered",
          "data": {
            "diagnosticAuthority": "semantic-authoring-policy",
            "diagnosticDomain": "template",
            "diagnosticKind": "framework-capability-not-registered",
            "frameworkErrorCode": null,
            "frameworkRawErrorAuthority": null,
            "missingInput": "runtime-html.short-hand-binding-syntax",
            "missingInputs": [
              "runtime-html.short-hand-binding-syntax"
            ],
            "phase": null,
            "relatedInformation": [],
            "relatedQueryKind": "template-diagnostics",
            "repairAffordance": {
              "actionKind": "register-framework-capability",
              "actionability": "guided",
              "changeDomain": "app-source",
              "planKind": "framework-capability-registration",
              "readiness": "source-edit-policy-open",
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
          "file": "src/unregistered-shorthand-syntax-app.html",
          "impact": "blocking",
          "issues": [
            {
              "code": "framework-capability-not-registered",
              "kind": "framework-capability-not-registered",
              "message": "Attribute \"@click\" uses Aurelia shorthand binding syntax, but that framework capability is not registered in this app world."
            }
          ],
          "message": "Attribute \"@click\" uses Aurelia shorthand binding syntax, but that framework capability is not registered in this app world.",
          "related": [],
          "severity": "error",
          "source": "semantic-runtime:template",
          "span": {
            "end": 46,
            "start": 31
          },
          "spanText": "@click=\"save()\"",
          "status": "primary",
          "uri": "fixtures://pressure/unregistered-shorthand-syntax/src/unregistered-shorthand-syntax-app.html"
        }
      ]
    }
  },
  "uri": "fixtures://pressure/unregistered-shorthand-syntax/src/unregistered-shorthand-syntax-app.html"
}
```

### Alignment

```json
{
  "comparisonKey": "domain/kind/code/severity/text/message",
  "countsMatch": true,
  "customLspSurfaceCount": 2,
  "customOnly": [],
  "lspOnly": [],
  "lspPublishCount": 2,
  "suppressedCount": 0
}
```
