# unregistered-plugin-syntax diagnostics lane snapshot

Fixture: `packages/semantic-runtime/fixtures/pressure/unregistered-plugin-syntax`
Probe file: `packages/lane-harness/probes/unregistered-plugin-syntax.probes.json`
Lane: `diagnostics`

This snapshot records observed language-server behavior. Operator verdicts live in the probe data.

## unregistered-plugin-syntax-template

### Probe

```json
{
  "file": "src/unregistered-plugin-syntax-app.html"
}
```

### publishDiagnostics

```json
{
  "diagnosticCount": 3,
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
        "missingInput": "i18n.translation-syntax",
        "missingInputs": [
          "i18n.translation-syntax"
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
      "message": "Attribute \"t\" uses Aurelia i18n translation syntax, but that framework capability is not registered in this app world.",
      "range": {
        "end": {
          "character": 23,
          "line": 0
        },
        "start": {
          "character": 4,
          "line": 0
        }
      },
      "rangeText": "t=\"dashboard.title\"",
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
        "missingInput": "i18n.translation-syntax",
        "missingInputs": [
          "i18n.translation-syntax"
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
      "message": "Attribute \"t.bind\" uses Aurelia i18n translation syntax, but that framework capability is not registered in this app world.",
      "range": {
        "end": {
          "character": 20,
          "line": 1
        },
        "start": {
          "character": 3,
          "line": 1
        }
      },
      "rangeText": "t.bind=\"titleKey\"",
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
        "missingInput": "state.binding-syntax",
        "missingInputs": [
          "state.binding-syntax"
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
      "message": "Attribute \"click.dispatch:main\" uses Aurelia state binding syntax, but that framework capability is not registered in this app world.",
      "range": {
        "end": {
          "character": 40,
          "line": 2
        },
        "start": {
          "character": 8,
          "line": 2
        }
      },
      "rangeText": "click.dispatch:main=\"dispatch()\"",
      "relatedInformation": [],
      "severity": "error",
      "source": "aurelia"
    }
  ],
  "outcome": "published",
  "uri": "fixtures://pressure/unregistered-plugin-syntax/src/unregistered-plugin-syntax-app.html"
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
            "filePath": "src/unregistered-plugin-syntax-app.html"
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
            "filePath": "src/unregistered-plugin-syntax-app.html"
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
            "filePath": "src/unregistered-plugin-syntax-app.html"
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
                  "label": "src/unregistered-plugin-syntax-app.html",
                  "path": "src/unregistered-plugin-syntax-app.html",
                  "sourceFileRole": "template",
                  "sourceWorkspaceKey": "unregistered-plugin-syntax"
                },
                "end": 50,
                "kind": "source-span-address",
                "label": "src/unregistered-plugin-syntax-app.html@33..50",
                "path": "src/unregistered-plugin-syntax-app.html",
                "role": "range",
                "sourceFileRole": "template",
                "sourceWorkspaceKey": "unregistered-plugin-syntax",
                "start": 33
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
                  "label": "src/unregistered-plugin-syntax-app.html",
                  "path": "src/unregistered-plugin-syntax-app.html",
                  "sourceFileRole": "template",
                  "sourceWorkspaceKey": "unregistered-plugin-syntax"
                },
                "end": 23,
                "kind": "source-span-address",
                "label": "src/unregistered-plugin-syntax-app.html@4..23",
                "path": "src/unregistered-plugin-syntax-app.html",
                "role": "range",
                "sourceFileRole": "template",
                "sourceWorkspaceKey": "unregistered-plugin-syntax",
                "start": 4
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
                  "label": "src/unregistered-plugin-syntax-app.html",
                  "path": "src/unregistered-plugin-syntax-app.html",
                  "sourceFileRole": "template",
                  "sourceWorkspaceKey": "unregistered-plugin-syntax"
                },
                "end": 96,
                "kind": "source-span-address",
                "label": "src/unregistered-plugin-syntax-app.html@64..96",
                "path": "src/unregistered-plugin-syntax-app.html",
                "role": "range",
                "sourceFileRole": "template",
                "sourceWorkspaceKey": "unregistered-plugin-syntax",
                "start": 64
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
                  "label": "src/unregistered-plugin-syntax-app.html",
                  "path": "src/unregistered-plugin-syntax-app.html",
                  "sourceFileRole": "template",
                  "sourceWorkspaceKey": "unregistered-plugin-syntax"
                },
                "end": 50,
                "kind": "source-span-address",
                "label": "src/unregistered-plugin-syntax-app.html@33..50",
                "path": "src/unregistered-plugin-syntax-app.html",
                "role": "range",
                "sourceFileRole": "template",
                "sourceWorkspaceKey": "unregistered-plugin-syntax",
                "start": 33
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
                  "label": "src/unregistered-plugin-syntax-app.html",
                  "path": "src/unregistered-plugin-syntax-app.html",
                  "sourceFileRole": "template",
                  "sourceWorkspaceKey": "unregistered-plugin-syntax"
                },
                "end": 23,
                "kind": "source-span-address",
                "label": "src/unregistered-plugin-syntax-app.html@4..23",
                "path": "src/unregistered-plugin-syntax-app.html",
                "role": "range",
                "sourceFileRole": "template",
                "sourceWorkspaceKey": "unregistered-plugin-syntax",
                "start": 4
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
                  "label": "src/unregistered-plugin-syntax-app.html",
                  "path": "src/unregistered-plugin-syntax-app.html",
                  "sourceFileRole": "template",
                  "sourceWorkspaceKey": "unregistered-plugin-syntax"
                },
                "end": 96,
                "kind": "source-span-address",
                "label": "src/unregistered-plugin-syntax-app.html@64..96",
                "path": "src/unregistered-plugin-syntax-app.html",
                "role": "range",
                "sourceFileRole": "template",
                "sourceWorkspaceKey": "unregistered-plugin-syntax",
                "start": 64
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
            "filePath": "src/unregistered-plugin-syntax-app.html"
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
    "summary": "Returned 3 app diagnostic(s)."
  },
  "outcome": "result",
  "presentation": {
    "complete": true,
    "contextualCount": 0,
    "groups": [
      {
        "groupKey": "row:diagnostic:1:template:framework-capability-not-registered:semantic-authoring-policy:no-framework-code:src/unregistered-plugin-syntax-app.html:4:23:i18n.translation-syntax",
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
              "missingInput": "i18n.translation-syntax",
              "missingInputs": [
                "i18n.translation-syntax"
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
            "file": "src/unregistered-plugin-syntax-app.html",
            "impact": "blocking",
            "issues": [
              {
                "code": "framework-capability-not-registered",
                "kind": "framework-capability-not-registered",
                "message": "Attribute \"t\" uses Aurelia i18n translation syntax, but that framework capability is not registered in this app world."
              }
            ],
            "message": "Attribute \"t\" uses Aurelia i18n translation syntax, but that framework capability is not registered in this app world.",
            "related": [],
            "severity": "error",
            "source": "semantic-runtime:template",
            "span": {
              "end": 23,
              "start": 4
            },
            "spanText": "t=\"dashboard.title\"",
            "status": "primary",
            "uri": "fixtures://pressure/unregistered-plugin-syntax/src/unregistered-plugin-syntax-app.html"
          },
          "relation": null,
          "role": "primary",
          "rowId": "diagnostic:1:template:framework-capability-not-registered:semantic-authoring-policy:no-framework-code:src/unregistered-plugin-syntax-app.html:4:23:i18n.translation-syntax"
        },
        "primarySeverity": "error",
        "rawRowCount": 1,
        "related": [],
        "subject": null
      },
      {
        "groupKey": "row:diagnostic:0:template:framework-capability-not-registered:semantic-authoring-policy:no-framework-code:src/unregistered-plugin-syntax-app.html:33:50:i18n.translation-syntax",
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
              "missingInput": "i18n.translation-syntax",
              "missingInputs": [
                "i18n.translation-syntax"
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
            "file": "src/unregistered-plugin-syntax-app.html",
            "impact": "blocking",
            "issues": [
              {
                "code": "framework-capability-not-registered",
                "kind": "framework-capability-not-registered",
                "message": "Attribute \"t.bind\" uses Aurelia i18n translation syntax, but that framework capability is not registered in this app world."
              }
            ],
            "message": "Attribute \"t.bind\" uses Aurelia i18n translation syntax, but that framework capability is not registered in this app world.",
            "related": [],
            "severity": "error",
            "source": "semantic-runtime:template",
            "span": {
              "end": 50,
              "start": 33
            },
            "spanText": "t.bind=\"titleKey\"",
            "status": "primary",
            "uri": "fixtures://pressure/unregistered-plugin-syntax/src/unregistered-plugin-syntax-app.html"
          },
          "relation": null,
          "role": "primary",
          "rowId": "diagnostic:0:template:framework-capability-not-registered:semantic-authoring-policy:no-framework-code:src/unregistered-plugin-syntax-app.html:33:50:i18n.translation-syntax"
        },
        "primarySeverity": "error",
        "rawRowCount": 1,
        "related": [],
        "subject": null
      },
      {
        "groupKey": "row:diagnostic:2:template:framework-capability-not-registered:semantic-authoring-policy:no-framework-code:src/unregistered-plugin-syntax-app.html:64:96:state.binding-syntax",
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
              "missingInput": "state.binding-syntax",
              "missingInputs": [
                "state.binding-syntax"
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
            "file": "src/unregistered-plugin-syntax-app.html",
            "impact": "blocking",
            "issues": [
              {
                "code": "framework-capability-not-registered",
                "kind": "framework-capability-not-registered",
                "message": "Attribute \"click.dispatch:main\" uses Aurelia state binding syntax, but that framework capability is not registered in this app world."
              }
            ],
            "message": "Attribute \"click.dispatch:main\" uses Aurelia state binding syntax, but that framework capability is not registered in this app world.",
            "related": [],
            "severity": "error",
            "source": "semantic-runtime:template",
            "span": {
              "end": 96,
              "start": 64
            },
            "spanText": "click.dispatch:main=\"dispatch()\"",
            "status": "primary",
            "uri": "fixtures://pressure/unregistered-plugin-syntax/src/unregistered-plugin-syntax-app.html"
          },
          "relation": null,
          "role": "primary",
          "rowId": "diagnostic:2:template:framework-capability-not-registered:semantic-authoring-policy:no-framework-code:src/unregistered-plugin-syntax-app.html:64:96:state.binding-syntax"
        },
        "primarySeverity": "error",
        "rawRowCount": 1,
        "related": [],
        "subject": null
      }
    ],
    "primaryCount": 3,
    "rawRowCount": 3
  },
  "raw": {
    "diagnosticCount": 3,
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
          "missingInput": "i18n.translation-syntax",
          "missingInputs": [
            "i18n.translation-syntax"
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
        "file": "src/unregistered-plugin-syntax-app.html",
        "impact": "blocking",
        "issues": [
          {
            "code": "framework-capability-not-registered",
            "kind": "framework-capability-not-registered",
            "message": "Attribute \"t.bind\" uses Aurelia i18n translation syntax, but that framework capability is not registered in this app world."
          }
        ],
        "message": "Attribute \"t.bind\" uses Aurelia i18n translation syntax, but that framework capability is not registered in this app world.",
        "related": [],
        "severity": "error",
        "source": "semantic-runtime:template",
        "span": {
          "end": 50,
          "start": 33
        },
        "spanText": "t.bind=\"titleKey\"",
        "status": "canonical",
        "uri": "fixtures://pressure/unregistered-plugin-syntax/src/unregistered-plugin-syntax-app.html"
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
          "missingInput": "i18n.translation-syntax",
          "missingInputs": [
            "i18n.translation-syntax"
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
        "file": "src/unregistered-plugin-syntax-app.html",
        "impact": "blocking",
        "issues": [
          {
            "code": "framework-capability-not-registered",
            "kind": "framework-capability-not-registered",
            "message": "Attribute \"t\" uses Aurelia i18n translation syntax, but that framework capability is not registered in this app world."
          }
        ],
        "message": "Attribute \"t\" uses Aurelia i18n translation syntax, but that framework capability is not registered in this app world.",
        "related": [],
        "severity": "error",
        "source": "semantic-runtime:template",
        "span": {
          "end": 23,
          "start": 4
        },
        "spanText": "t=\"dashboard.title\"",
        "status": "canonical",
        "uri": "fixtures://pressure/unregistered-plugin-syntax/src/unregistered-plugin-syntax-app.html"
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
          "missingInput": "state.binding-syntax",
          "missingInputs": [
            "state.binding-syntax"
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
        "file": "src/unregistered-plugin-syntax-app.html",
        "impact": "blocking",
        "issues": [
          {
            "code": "framework-capability-not-registered",
            "kind": "framework-capability-not-registered",
            "message": "Attribute \"click.dispatch:main\" uses Aurelia state binding syntax, but that framework capability is not registered in this app world."
          }
        ],
        "message": "Attribute \"click.dispatch:main\" uses Aurelia state binding syntax, but that framework capability is not registered in this app world.",
        "related": [],
        "severity": "error",
        "source": "semantic-runtime:template",
        "span": {
          "end": 96,
          "start": 64
        },
        "spanText": "click.dispatch:main=\"dispatch()\"",
        "status": "canonical",
        "uri": "fixtures://pressure/unregistered-plugin-syntax/src/unregistered-plugin-syntax-app.html"
      }
    ]
  },
  "surfaces": {
    "lsp": {
      "diagnosticCount": 3,
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
            "missingInput": "i18n.translation-syntax",
            "missingInputs": [
              "i18n.translation-syntax"
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
          "file": "src/unregistered-plugin-syntax-app.html",
          "impact": "blocking",
          "issues": [
            {
              "code": "framework-capability-not-registered",
              "kind": "framework-capability-not-registered",
              "message": "Attribute \"t\" uses Aurelia i18n translation syntax, but that framework capability is not registered in this app world."
            }
          ],
          "message": "Attribute \"t\" uses Aurelia i18n translation syntax, but that framework capability is not registered in this app world.",
          "related": [],
          "severity": "error",
          "source": "semantic-runtime:template",
          "span": {
            "end": 23,
            "start": 4
          },
          "spanText": "t=\"dashboard.title\"",
          "status": "primary",
          "uri": "fixtures://pressure/unregistered-plugin-syntax/src/unregistered-plugin-syntax-app.html"
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
            "missingInput": "i18n.translation-syntax",
            "missingInputs": [
              "i18n.translation-syntax"
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
          "file": "src/unregistered-plugin-syntax-app.html",
          "impact": "blocking",
          "issues": [
            {
              "code": "framework-capability-not-registered",
              "kind": "framework-capability-not-registered",
              "message": "Attribute \"t.bind\" uses Aurelia i18n translation syntax, but that framework capability is not registered in this app world."
            }
          ],
          "message": "Attribute \"t.bind\" uses Aurelia i18n translation syntax, but that framework capability is not registered in this app world.",
          "related": [],
          "severity": "error",
          "source": "semantic-runtime:template",
          "span": {
            "end": 50,
            "start": 33
          },
          "spanText": "t.bind=\"titleKey\"",
          "status": "primary",
          "uri": "fixtures://pressure/unregistered-plugin-syntax/src/unregistered-plugin-syntax-app.html"
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
            "missingInput": "state.binding-syntax",
            "missingInputs": [
              "state.binding-syntax"
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
          "file": "src/unregistered-plugin-syntax-app.html",
          "impact": "blocking",
          "issues": [
            {
              "code": "framework-capability-not-registered",
              "kind": "framework-capability-not-registered",
              "message": "Attribute \"click.dispatch:main\" uses Aurelia state binding syntax, but that framework capability is not registered in this app world."
            }
          ],
          "message": "Attribute \"click.dispatch:main\" uses Aurelia state binding syntax, but that framework capability is not registered in this app world.",
          "related": [],
          "severity": "error",
          "source": "semantic-runtime:template",
          "span": {
            "end": 96,
            "start": 64
          },
          "spanText": "click.dispatch:main=\"dispatch()\"",
          "status": "primary",
          "uri": "fixtures://pressure/unregistered-plugin-syntax/src/unregistered-plugin-syntax-app.html"
        }
      ]
    }
  },
  "uri": "fixtures://pressure/unregistered-plugin-syntax/src/unregistered-plugin-syntax-app.html"
}
```

### Alignment

```json
{
  "comparisonKey": "domain/kind/code/severity/text/message",
  "countsMatch": true,
  "customLspSurfaceCount": 3,
  "customOnly": [],
  "lspOnly": [],
  "lspPublishCount": 3,
  "suppressedCount": 0
}
```
