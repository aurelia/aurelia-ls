# runtime-html-au-compose-errors diagnostics lane snapshot

Fixture: `packages/semantic-runtime/fixtures/pressure/runtime-html-au-compose-errors`
Probe file: `packages/lane-harness/probes/runtime-html-au-compose-errors.probes.json`
Lane: `diagnostics`

This snapshot records observed language-server behavior. Operator verdicts live in the probe data.

## runtime-controller-au-compose-template

### Probe

```json
{
  "file": "src/runtime-html-au-compose-errors-app.html"
}
```

### publishDiagnostics

```json
{
  "diagnosticCount": 3,
  "diagnostics": [
    {
      "anomaly": null,
      "code": "AUR0805",
      "data": {
        "diagnosticAuthority": "framework-error-code",
        "diagnosticDomain": "template",
        "diagnosticKind": "runtime-controller-framework-error",
        "frameworkErrorCode": "AUR0805",
        "frameworkRawErrorAuthority": null,
        "missingInput": "runtime-controller:AUR0805",
        "missingInputs": [
          "runtime-controller:AUR0805"
        ],
        "phase": "bindable-set",
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
      "message": "Aurelia runtime controller AUR0805 rejects this controller input: Invalid au-compose scopeBehavior value \"global\". Expected \"scoped\" or \"auto\"..",
      "range": {
        "end": {
          "character": 34,
          "line": 0
        },
        "start": {
          "character": 28,
          "line": 0
        }
      },
      "rangeText": "global",
      "relatedInformation": [],
      "severity": "error",
      "source": "aurelia"
    },
    {
      "anomaly": null,
      "code": "AUR0809",
      "data": {
        "diagnosticAuthority": "framework-error-code",
        "diagnosticDomain": "template",
        "diagnosticKind": "runtime-controller-framework-error",
        "frameworkErrorCode": "AUR0809",
        "frameworkRawErrorAuthority": null,
        "missingInput": "runtime-controller:AUR0809",
        "missingInputs": [
          "runtime-controller:AUR0809"
        ],
        "phase": "bindable-set",
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
      "message": "Aurelia runtime controller AUR0809 rejects this controller input: Invalid au-compose flushMode value \"deferred\". Expected \"sync\" or \"async\"..",
      "range": {
        "end": {
          "character": 56,
          "line": 0
        },
        "start": {
          "character": 48,
          "line": 0
        }
      },
      "rangeText": "deferred",
      "relatedInformation": [],
      "severity": "error",
      "source": "aurelia"
    },
    {
      "anomaly": null,
      "code": "AUR0806",
      "data": {
        "diagnosticAuthority": "framework-error-code",
        "diagnosticDomain": "template",
        "diagnosticKind": "runtime-controller-framework-error",
        "frameworkErrorCode": "AUR0806",
        "frameworkRawErrorAuthority": null,
        "missingInput": "runtime-controller:AUR0806",
        "missingInputs": [
          "runtime-controller:AUR0806"
        ],
        "phase": "composition-component-lookup",
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
      "message": "Aurelia runtime controller AUR0806 rejects this controller input: No au-compose custom element named \"missing-widget\" is registered in the construction hydration context container..",
      "range": {
        "end": {
          "character": 37,
          "line": 1
        },
        "start": {
          "character": 23,
          "line": 1
        }
      },
      "rangeText": "missing-widget",
      "relatedInformation": [],
      "severity": "error",
      "source": "aurelia"
    }
  ],
  "outcome": "published",
  "uri": "fixtures://pressure/runtime-html-au-compose-errors/src/runtime-html-au-compose-errors-app.html"
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
            "filePath": "src/runtime-html-au-compose-errors-app.html"
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
            "filePath": "src/runtime-html-au-compose-errors-app.html"
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
            "filePath": "src/runtime-html-au-compose-errors-app.html"
          }
        },
        "targetQueryKind": "template-diagnostics"
      },
      {
        "blockers": [],
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
                  "label": "src/runtime-html-au-compose-errors-app.html",
                  "path": "src/runtime-html-au-compose-errors-app.html",
                  "sourceFileRole": "template",
                  "sourceWorkspaceKey": "runtime-html-au-compose-errors"
                },
                "end": 34,
                "kind": "source-span-address",
                "label": "src/runtime-html-au-compose-errors-app.html@28..34",
                "path": "src/runtime-html-au-compose-errors-app.html",
                "role": "value",
                "sourceFileRole": "template",
                "sourceWorkspaceKey": "runtime-html-au-compose-errors",
                "start": 28
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
                  "label": "src/runtime-html-au-compose-errors-app.html",
                  "path": "src/runtime-html-au-compose-errors-app.html",
                  "sourceFileRole": "template",
                  "sourceWorkspaceKey": "runtime-html-au-compose-errors"
                },
                "end": 56,
                "kind": "source-span-address",
                "label": "src/runtime-html-au-compose-errors-app.html@48..56",
                "path": "src/runtime-html-au-compose-errors-app.html",
                "role": "value",
                "sourceFileRole": "template",
                "sourceWorkspaceKey": "runtime-html-au-compose-errors",
                "start": 48
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
                  "label": "src/runtime-html-au-compose-errors-app.html",
                  "path": "src/runtime-html-au-compose-errors-app.html",
                  "sourceFileRole": "template",
                  "sourceWorkspaceKey": "runtime-html-au-compose-errors"
                },
                "end": 109,
                "kind": "source-span-address",
                "label": "src/runtime-html-au-compose-errors-app.html@95..109",
                "path": "src/runtime-html-au-compose-errors-app.html",
                "role": "value",
                "sourceFileRole": "template",
                "sourceWorkspaceKey": "runtime-html-au-compose-errors",
                "start": 95
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
        "groupKey": "row:diagnostic:0:template:runtime-controller-framework-error:framework-error-code:AUR0805:src/runtime-html-au-compose-errors-app.html:28:34:runtime-controller:AUR0805",
        "maxRawSeverity": "error",
        "primary": {
          "diagnostic": {
            "actionability": "guided",
            "anomaly": null,
            "category": "template-syntax",
            "code": "AUR0805",
            "data": {
              "diagnosticAuthority": "framework-error-code",
              "diagnosticDomain": "template",
              "diagnosticKind": "runtime-controller-framework-error",
              "frameworkErrorCode": "AUR0805",
              "frameworkRawErrorAuthority": null,
              "missingInput": "runtime-controller:AUR0805",
              "missingInputs": [
                "runtime-controller:AUR0805"
              ],
              "phase": "bindable-set",
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
            "file": "src/runtime-html-au-compose-errors-app.html",
            "impact": "blocking",
            "issues": [
              {
                "code": "AUR0805",
                "kind": "runtime-controller-framework-error",
                "message": "Aurelia runtime controller AUR0805 rejects this controller input: Invalid au-compose scopeBehavior value \"global\". Expected \"scoped\" or \"auto\".."
              }
            ],
            "message": "Aurelia runtime controller AUR0805 rejects this controller input: Invalid au-compose scopeBehavior value \"global\". Expected \"scoped\" or \"auto\"..",
            "related": [],
            "severity": "error",
            "source": "semantic-runtime:template",
            "span": {
              "end": 34,
              "start": 28
            },
            "spanText": "global",
            "status": "primary",
            "uri": "fixtures://pressure/runtime-html-au-compose-errors/src/runtime-html-au-compose-errors-app.html"
          },
          "relation": null,
          "role": "primary",
          "rowId": "diagnostic:0:template:runtime-controller-framework-error:framework-error-code:AUR0805:src/runtime-html-au-compose-errors-app.html:28:34:runtime-controller:AUR0805"
        },
        "primarySeverity": "error",
        "rawRowCount": 1,
        "related": [],
        "subject": null
      },
      {
        "groupKey": "row:diagnostic:1:template:runtime-controller-framework-error:framework-error-code:AUR0809:src/runtime-html-au-compose-errors-app.html:48:56:runtime-controller:AUR0809",
        "maxRawSeverity": "error",
        "primary": {
          "diagnostic": {
            "actionability": "guided",
            "anomaly": null,
            "category": "template-syntax",
            "code": "AUR0809",
            "data": {
              "diagnosticAuthority": "framework-error-code",
              "diagnosticDomain": "template",
              "diagnosticKind": "runtime-controller-framework-error",
              "frameworkErrorCode": "AUR0809",
              "frameworkRawErrorAuthority": null,
              "missingInput": "runtime-controller:AUR0809",
              "missingInputs": [
                "runtime-controller:AUR0809"
              ],
              "phase": "bindable-set",
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
            "file": "src/runtime-html-au-compose-errors-app.html",
            "impact": "blocking",
            "issues": [
              {
                "code": "AUR0809",
                "kind": "runtime-controller-framework-error",
                "message": "Aurelia runtime controller AUR0809 rejects this controller input: Invalid au-compose flushMode value \"deferred\". Expected \"sync\" or \"async\".."
              }
            ],
            "message": "Aurelia runtime controller AUR0809 rejects this controller input: Invalid au-compose flushMode value \"deferred\". Expected \"sync\" or \"async\"..",
            "related": [],
            "severity": "error",
            "source": "semantic-runtime:template",
            "span": {
              "end": 56,
              "start": 48
            },
            "spanText": "deferred",
            "status": "primary",
            "uri": "fixtures://pressure/runtime-html-au-compose-errors/src/runtime-html-au-compose-errors-app.html"
          },
          "relation": null,
          "role": "primary",
          "rowId": "diagnostic:1:template:runtime-controller-framework-error:framework-error-code:AUR0809:src/runtime-html-au-compose-errors-app.html:48:56:runtime-controller:AUR0809"
        },
        "primarySeverity": "error",
        "rawRowCount": 1,
        "related": [],
        "subject": null
      },
      {
        "groupKey": "row:diagnostic:2:template:runtime-controller-framework-error:framework-error-code:AUR0806:src/runtime-html-au-compose-errors-app.html:95:109:runtime-controller:AUR0806",
        "maxRawSeverity": "error",
        "primary": {
          "diagnostic": {
            "actionability": "guided",
            "anomaly": null,
            "category": "template-syntax",
            "code": "AUR0806",
            "data": {
              "diagnosticAuthority": "framework-error-code",
              "diagnosticDomain": "template",
              "diagnosticKind": "runtime-controller-framework-error",
              "frameworkErrorCode": "AUR0806",
              "frameworkRawErrorAuthority": null,
              "missingInput": "runtime-controller:AUR0806",
              "missingInputs": [
                "runtime-controller:AUR0806"
              ],
              "phase": "composition-component-lookup",
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
            "file": "src/runtime-html-au-compose-errors-app.html",
            "impact": "blocking",
            "issues": [
              {
                "code": "AUR0806",
                "kind": "runtime-controller-framework-error",
                "message": "Aurelia runtime controller AUR0806 rejects this controller input: No au-compose custom element named \"missing-widget\" is registered in the construction hydration context container.."
              }
            ],
            "message": "Aurelia runtime controller AUR0806 rejects this controller input: No au-compose custom element named \"missing-widget\" is registered in the construction hydration context container..",
            "related": [],
            "severity": "error",
            "source": "semantic-runtime:template",
            "span": {
              "end": 109,
              "start": 95
            },
            "spanText": "missing-widget",
            "status": "primary",
            "uri": "fixtures://pressure/runtime-html-au-compose-errors/src/runtime-html-au-compose-errors-app.html"
          },
          "relation": null,
          "role": "primary",
          "rowId": "diagnostic:2:template:runtime-controller-framework-error:framework-error-code:AUR0806:src/runtime-html-au-compose-errors-app.html:95:109:runtime-controller:AUR0806"
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
        "code": "AUR0805",
        "data": {
          "diagnosticAuthority": "framework-error-code",
          "diagnosticDomain": "template",
          "diagnosticKind": "runtime-controller-framework-error",
          "frameworkErrorCode": "AUR0805",
          "frameworkRawErrorAuthority": null,
          "missingInput": "runtime-controller:AUR0805",
          "missingInputs": [
            "runtime-controller:AUR0805"
          ],
          "phase": "bindable-set",
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
        "file": "src/runtime-html-au-compose-errors-app.html",
        "impact": "blocking",
        "issues": [
          {
            "code": "AUR0805",
            "kind": "runtime-controller-framework-error",
            "message": "Aurelia runtime controller AUR0805 rejects this controller input: Invalid au-compose scopeBehavior value \"global\". Expected \"scoped\" or \"auto\".."
          }
        ],
        "message": "Aurelia runtime controller AUR0805 rejects this controller input: Invalid au-compose scopeBehavior value \"global\". Expected \"scoped\" or \"auto\"..",
        "related": [],
        "severity": "error",
        "source": "semantic-runtime:template",
        "span": {
          "end": 34,
          "start": 28
        },
        "spanText": "global",
        "status": "canonical",
        "uri": "fixtures://pressure/runtime-html-au-compose-errors/src/runtime-html-au-compose-errors-app.html"
      },
      {
        "actionability": "guided",
        "anomaly": null,
        "category": "template-syntax",
        "code": "AUR0809",
        "data": {
          "diagnosticAuthority": "framework-error-code",
          "diagnosticDomain": "template",
          "diagnosticKind": "runtime-controller-framework-error",
          "frameworkErrorCode": "AUR0809",
          "frameworkRawErrorAuthority": null,
          "missingInput": "runtime-controller:AUR0809",
          "missingInputs": [
            "runtime-controller:AUR0809"
          ],
          "phase": "bindable-set",
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
        "file": "src/runtime-html-au-compose-errors-app.html",
        "impact": "blocking",
        "issues": [
          {
            "code": "AUR0809",
            "kind": "runtime-controller-framework-error",
            "message": "Aurelia runtime controller AUR0809 rejects this controller input: Invalid au-compose flushMode value \"deferred\". Expected \"sync\" or \"async\".."
          }
        ],
        "message": "Aurelia runtime controller AUR0809 rejects this controller input: Invalid au-compose flushMode value \"deferred\". Expected \"sync\" or \"async\"..",
        "related": [],
        "severity": "error",
        "source": "semantic-runtime:template",
        "span": {
          "end": 56,
          "start": 48
        },
        "spanText": "deferred",
        "status": "canonical",
        "uri": "fixtures://pressure/runtime-html-au-compose-errors/src/runtime-html-au-compose-errors-app.html"
      },
      {
        "actionability": "guided",
        "anomaly": null,
        "category": "template-syntax",
        "code": "AUR0806",
        "data": {
          "diagnosticAuthority": "framework-error-code",
          "diagnosticDomain": "template",
          "diagnosticKind": "runtime-controller-framework-error",
          "frameworkErrorCode": "AUR0806",
          "frameworkRawErrorAuthority": null,
          "missingInput": "runtime-controller:AUR0806",
          "missingInputs": [
            "runtime-controller:AUR0806"
          ],
          "phase": "composition-component-lookup",
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
        "file": "src/runtime-html-au-compose-errors-app.html",
        "impact": "blocking",
        "issues": [
          {
            "code": "AUR0806",
            "kind": "runtime-controller-framework-error",
            "message": "Aurelia runtime controller AUR0806 rejects this controller input: No au-compose custom element named \"missing-widget\" is registered in the construction hydration context container.."
          }
        ],
        "message": "Aurelia runtime controller AUR0806 rejects this controller input: No au-compose custom element named \"missing-widget\" is registered in the construction hydration context container..",
        "related": [],
        "severity": "error",
        "source": "semantic-runtime:template",
        "span": {
          "end": 109,
          "start": 95
        },
        "spanText": "missing-widget",
        "status": "canonical",
        "uri": "fixtures://pressure/runtime-html-au-compose-errors/src/runtime-html-au-compose-errors-app.html"
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
          "code": "AUR0805",
          "data": {
            "diagnosticAuthority": "framework-error-code",
            "diagnosticDomain": "template",
            "diagnosticKind": "runtime-controller-framework-error",
            "frameworkErrorCode": "AUR0805",
            "frameworkRawErrorAuthority": null,
            "missingInput": "runtime-controller:AUR0805",
            "missingInputs": [
              "runtime-controller:AUR0805"
            ],
            "phase": "bindable-set",
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
          "file": "src/runtime-html-au-compose-errors-app.html",
          "impact": "blocking",
          "issues": [
            {
              "code": "AUR0805",
              "kind": "runtime-controller-framework-error",
              "message": "Aurelia runtime controller AUR0805 rejects this controller input: Invalid au-compose scopeBehavior value \"global\". Expected \"scoped\" or \"auto\".."
            }
          ],
          "message": "Aurelia runtime controller AUR0805 rejects this controller input: Invalid au-compose scopeBehavior value \"global\". Expected \"scoped\" or \"auto\"..",
          "related": [],
          "severity": "error",
          "source": "semantic-runtime:template",
          "span": {
            "end": 34,
            "start": 28
          },
          "spanText": "global",
          "status": "primary",
          "uri": "fixtures://pressure/runtime-html-au-compose-errors/src/runtime-html-au-compose-errors-app.html"
        },
        {
          "actionability": "guided",
          "anomaly": null,
          "category": "template-syntax",
          "code": "AUR0809",
          "data": {
            "diagnosticAuthority": "framework-error-code",
            "diagnosticDomain": "template",
            "diagnosticKind": "runtime-controller-framework-error",
            "frameworkErrorCode": "AUR0809",
            "frameworkRawErrorAuthority": null,
            "missingInput": "runtime-controller:AUR0809",
            "missingInputs": [
              "runtime-controller:AUR0809"
            ],
            "phase": "bindable-set",
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
          "file": "src/runtime-html-au-compose-errors-app.html",
          "impact": "blocking",
          "issues": [
            {
              "code": "AUR0809",
              "kind": "runtime-controller-framework-error",
              "message": "Aurelia runtime controller AUR0809 rejects this controller input: Invalid au-compose flushMode value \"deferred\". Expected \"sync\" or \"async\".."
            }
          ],
          "message": "Aurelia runtime controller AUR0809 rejects this controller input: Invalid au-compose flushMode value \"deferred\". Expected \"sync\" or \"async\"..",
          "related": [],
          "severity": "error",
          "source": "semantic-runtime:template",
          "span": {
            "end": 56,
            "start": 48
          },
          "spanText": "deferred",
          "status": "primary",
          "uri": "fixtures://pressure/runtime-html-au-compose-errors/src/runtime-html-au-compose-errors-app.html"
        },
        {
          "actionability": "guided",
          "anomaly": null,
          "category": "template-syntax",
          "code": "AUR0806",
          "data": {
            "diagnosticAuthority": "framework-error-code",
            "diagnosticDomain": "template",
            "diagnosticKind": "runtime-controller-framework-error",
            "frameworkErrorCode": "AUR0806",
            "frameworkRawErrorAuthority": null,
            "missingInput": "runtime-controller:AUR0806",
            "missingInputs": [
              "runtime-controller:AUR0806"
            ],
            "phase": "composition-component-lookup",
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
          "file": "src/runtime-html-au-compose-errors-app.html",
          "impact": "blocking",
          "issues": [
            {
              "code": "AUR0806",
              "kind": "runtime-controller-framework-error",
              "message": "Aurelia runtime controller AUR0806 rejects this controller input: No au-compose custom element named \"missing-widget\" is registered in the construction hydration context container.."
            }
          ],
          "message": "Aurelia runtime controller AUR0806 rejects this controller input: No au-compose custom element named \"missing-widget\" is registered in the construction hydration context container..",
          "related": [],
          "severity": "error",
          "source": "semantic-runtime:template",
          "span": {
            "end": 109,
            "start": 95
          },
          "spanText": "missing-widget",
          "status": "primary",
          "uri": "fixtures://pressure/runtime-html-au-compose-errors/src/runtime-html-au-compose-errors-app.html"
        }
      ]
    }
  },
  "uri": "fixtures://pressure/runtime-html-au-compose-errors/src/runtime-html-au-compose-errors-app.html"
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
