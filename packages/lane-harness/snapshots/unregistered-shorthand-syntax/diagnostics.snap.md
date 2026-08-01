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
  "answer": {
    "analysisDepth": "binding-observation",
    "continuations": [
      {
        "blockers": [],
        "cost": "query-type-projection",
        "evidence": {
          "epochDependencies": [
            "project-input",
            "app-world",
            "source-input"
          ],
          "sourceFacts": [],
          "sourceRequirement": "authored-source"
        },
        "intents": [
          "orient",
          "inspect"
        ],
        "kind": "follow-query",
        "rationale": "Cluster detailed diagnostics back into a summary view.",
        "targetQuery": {
          "diagnosticProjection": "type-projection",
          "kind": "app-diagnostic-summary",
          "page": {
            "size": 200
          },
          "sourceFile": {
            "filePath": "src/unregistered-shorthand-syntax-app.html"
          }
        },
        "targetQueryKind": "app-diagnostic-summary"
      },
      {
        "blockers": [],
        "cost": "query-type-projection",
        "evidence": {
          "epochDependencies": [
            "project-input",
            "app-world",
            "source-input"
          ],
          "sourceFacts": [],
          "sourceRequirement": "authored-source"
        },
        "intents": [
          "diagnose"
        ],
        "kind": "follow-query",
        "rationale": "Compare unified diagnostics with ordinary TypeScript diagnostics.",
        "targetQuery": {
          "kind": "typescript-diagnostics",
          "page": {
            "size": 200
          },
          "sourceFile": {
            "filePath": "src/unregistered-shorthand-syntax-app.html"
          }
        },
        "targetQueryKind": "typescript-diagnostics"
      },
      {
        "blockers": [],
        "cost": "query-type-projection",
        "evidence": {
          "epochDependencies": [
            "project-input",
            "app-world",
            "source-input"
          ],
          "sourceFacts": [],
          "sourceRequirement": "authored-source"
        },
        "intents": [
          "diagnose"
        ],
        "kind": "follow-query",
        "rationale": "Compare unified diagnostics with template diagnostics.",
        "targetQuery": {
          "diagnosticProjection": "type-projection",
          "kind": "template-diagnostics",
          "page": {
            "size": 200
          },
          "sourceFile": {
            "filePath": "src/unregistered-shorthand-syntax-app.html"
          }
        },
        "targetQueryKind": "template-diagnostics"
      },
      {
        "blockers": [
          "No framework, TypeScript, or semantic-runtime diagnostic authority was returned for this related diagnostic family."
        ],
        "cost": "query-type-projection",
        "evidence": {
          "epochDependencies": [
            "project-input",
            "app-world"
          ],
          "sourceFacts": [
            {
              "count": 1,
              "facets": [
                "authored-source",
                "carrier-span",
                "exact-authored-span"
              ],
              "source": {
                "anchor": {
                  "kind": "source-file-address",
                  "label": "src/unregistered-shorthand-syntax-app.html",
                  "path": "src/unregistered-shorthand-syntax-app.html",
                  "sourceFileRole": "template",
                  "sourceWorkspaceKey": "unregistered-shorthand-syntax"
                },
                "end": 46,
                "kind": "source-span-address",
                "label": "src/unregistered-shorthand-syntax-app.html@31..46",
                "path": "src/unregistered-shorthand-syntax-app.html",
                "role": "range",
                "sourceFileRole": "template",
                "sourceWorkspaceKey": "unregistered-shorthand-syntax",
                "start": 31
              }
            },
            {
              "count": 1,
              "facets": [
                "authored-source",
                "carrier-span",
                "exact-authored-span"
              ],
              "source": {
                "anchor": {
                  "kind": "source-file-address",
                  "label": "src/unregistered-shorthand-syntax-app.html",
                  "path": "src/unregistered-shorthand-syntax-app.html",
                  "sourceFileRole": "template",
                  "sourceWorkspaceKey": "unregistered-shorthand-syntax"
                },
                "end": 21,
                "kind": "source-span-address",
                "label": "src/unregistered-shorthand-syntax-app.html@7..21",
                "path": "src/unregistered-shorthand-syntax-app.html",
                "role": "range",
                "sourceFileRole": "template",
                "sourceWorkspaceKey": "unregistered-shorthand-syntax",
                "start": 7
              }
            }
          ],
          "sourceRequirement": "exact-authored-span"
        },
        "intents": [
          "diagnose",
          "repair"
        ],
        "kind": "follow-query",
        "rationale": "Inspect template-diagnostics rows referenced by returned diagnostics.",
        "targetQuery": {
          "diagnosticProjection": "type-projection",
          "kind": "template-diagnostics",
          "page": {
            "size": 200
          }
        },
        "targetQueryKind": "template-diagnostics"
      },
      {
        "blockers": [],
        "cost": "app-world",
        "evidence": {
          "epochDependencies": [
            "project-input",
            "app-world",
            "source-input"
          ],
          "sourceFacts": [
            {
              "count": 1,
              "facets": [
                "authored-source",
                "carrier-span",
                "exact-authored-span"
              ],
              "source": {
                "anchor": {
                  "kind": "source-file-address",
                  "label": "src/unregistered-shorthand-syntax-app.html",
                  "path": "src/unregistered-shorthand-syntax-app.html",
                  "sourceFileRole": "template",
                  "sourceWorkspaceKey": "unregistered-shorthand-syntax"
                },
                "end": 46,
                "kind": "source-span-address",
                "label": "src/unregistered-shorthand-syntax-app.html@31..46",
                "path": "src/unregistered-shorthand-syntax-app.html",
                "role": "range",
                "sourceFileRole": "template",
                "sourceWorkspaceKey": "unregistered-shorthand-syntax",
                "start": 31
              }
            },
            {
              "count": 1,
              "facets": [
                "authored-source",
                "carrier-span",
                "exact-authored-span"
              ],
              "source": {
                "anchor": {
                  "kind": "source-file-address",
                  "label": "src/unregistered-shorthand-syntax-app.html",
                  "path": "src/unregistered-shorthand-syntax-app.html",
                  "sourceFileRole": "template",
                  "sourceWorkspaceKey": "unregistered-shorthand-syntax"
                },
                "end": 21,
                "kind": "source-span-address",
                "label": "src/unregistered-shorthand-syntax-app.html@7..21",
                "path": "src/unregistered-shorthand-syntax-app.html",
                "role": "range",
                "sourceFileRole": "template",
                "sourceWorkspaceKey": "unregistered-shorthand-syntax",
                "start": 7
              }
            }
          ],
          "sourceRequirement": "authored-source"
        },
        "intents": [
          "inspect"
        ],
        "kind": "follow-query",
        "rationale": "Inspect framework capability-demand rows behind returned registration diagnostics.",
        "targetQuery": {
          "kind": "framework-capability-demands",
          "page": {
            "size": 200
          },
          "sourceFile": {
            "filePath": "src/unregistered-shorthand-syntax-app.html"
          }
        },
        "targetQueryKind": "framework-capability-demands"
      }
    ],
    "coverage": "complete",
    "page": null,
    "result": "answered",
    "schemaVersion": "0.2",
    "selection": "not-applicable",
    "summary": "Returned 2 app diagnostic(s)."
  },
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
