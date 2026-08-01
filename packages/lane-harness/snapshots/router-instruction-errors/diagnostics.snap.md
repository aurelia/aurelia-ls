# router-instruction-errors diagnostics lane snapshot

Fixture: `packages/semantic-runtime/fixtures/pressure/router-instruction-errors`
Probe file: `packages/lane-harness/probes/router-instruction-errors.probes.json`
Lane: `diagnostics`

This snapshot records observed language-server behavior. Operator verdicts live in the probe data.

## router-load-missing-route

### Probe

```json
{
  "file": "src/router-instruction-errors-app.html"
}
```

### publishDiagnostics

```json
{
  "diagnosticCount": 4,
  "diagnostics": [
    {
      "anomaly": null,
      "code": "AUR3401",
      "data": {
        "diagnosticAuthority": "framework-error-code",
        "diagnosticDomain": "router",
        "diagnosticKind": "instruction-no-fallback",
        "frameworkErrorCode": "AUR3401",
        "frameworkRawErrorAuthority": null,
        "missingInput": "router:instruction-no-fallback",
        "missingInputs": [
          "router:instruction-no-fallback"
        ],
        "phase": "route-recognition",
        "relatedInformation": [],
        "relatedQueryKind": "router-issues",
        "repairAffordance": {
          "actionKind": "rewrite-router-instruction",
          "actionability": "guided",
          "changeDomain": "app-source",
          "planKind": "router-instruction-rewrite",
          "readiness": "ready-to-plan",
          "targetSourceCoverage": "all"
        },
        "sourceRole": "template",
        "subject": null,
        "taxonomy": {
          "actionability": "guided",
          "category": "project",
          "confidence": null,
          "impact": "blocking",
          "schema": "diagnostics-taxonomy/1"
        }
      },
      "message": "Neither the route 'missing-route' matched any configured route nor is a fallback configured for the active route context.",
      "range": {
        "end": {
          "character": 27,
          "line": 0
        },
        "start": {
          "character": 14,
          "line": 0
        }
      },
      "rangeText": "missing-route",
      "relatedInformation": [],
      "severity": "error",
      "source": "aurelia"
    },
    {
      "anomaly": null,
      "code": "AUR3400",
      "data": {
        "diagnosticAuthority": "framework-error-code",
        "diagnosticDomain": "router",
        "diagnosticKind": "invalid-instruction",
        "frameworkErrorCode": "AUR3400",
        "frameworkRawErrorAuthority": null,
        "missingInput": "router:invalid-instruction",
        "missingInputs": [
          "router:invalid-instruction"
        ],
        "phase": "typed-navigation-instruction-creation",
        "relatedInformation": [],
        "relatedQueryKind": "router-issues",
        "repairAffordance": {
          "actionKind": "rewrite-router-instruction",
          "actionability": "guided",
          "changeDomain": "app-source",
          "planKind": "router-instruction-rewrite",
          "readiness": "ready-to-plan",
          "targetSourceCoverage": "all"
        },
        "sourceRole": "template",
        "subject": null,
        "taxonomy": {
          "actionability": "guided",
          "category": "project",
          "confidence": null,
          "impact": "blocking",
          "schema": "diagnostics-taxonomy/1"
        }
      },
      "message": "Invalid load router instruction value 'number'; expected a route string, routeable component, or viewport instruction.",
      "range": {
        "end": {
          "character": 21,
          "line": 2
        },
        "start": {
          "character": 19,
          "line": 2
        }
      },
      "rangeText": "42",
      "relatedInformation": [],
      "severity": "error",
      "source": "aurelia"
    },
    {
      "anomaly": null,
      "code": "AUR3500",
      "data": {
        "diagnosticAuthority": "framework-error-code",
        "diagnosticDomain": "router",
        "diagnosticKind": "route-expression-unexpected-segment",
        "frameworkErrorCode": "AUR3500",
        "frameworkRawErrorAuthority": null,
        "missingInput": "router:route-expression-unexpected-segment",
        "missingInputs": [
          "router:route-expression-unexpected-segment"
        ],
        "phase": "route-expression-parsing",
        "relatedInformation": [],
        "relatedQueryKind": "router-issues",
        "repairAffordance": {
          "actionKind": "rewrite-router-instruction",
          "actionability": "guided",
          "changeDomain": "app-source",
          "planKind": "router-instruction-rewrite",
          "readiness": "ready-to-plan",
          "targetSourceCoverage": "all"
        },
        "sourceRole": "template",
        "subject": null,
        "taxonomy": {
          "actionability": "guided",
          "category": "project",
          "confidence": null,
          "impact": "blocking",
          "schema": "diagnostics-taxonomy/1"
        }
      },
      "message": "Expected component name at route-expression offset 1 of '(', but got ''.",
      "range": {
        "end": {
          "character": 15,
          "line": 3
        },
        "start": {
          "character": 14,
          "line": 3
        }
      },
      "rangeText": "(",
      "relatedInformation": [],
      "severity": "error",
      "source": "aurelia"
    },
    {
      "anomaly": null,
      "code": "AUR3501",
      "data": {
        "diagnosticAuthority": "framework-error-code",
        "diagnosticDomain": "router",
        "diagnosticKind": "route-expression-not-done",
        "frameworkErrorCode": "AUR3501",
        "frameworkRawErrorAuthority": null,
        "missingInput": "router:route-expression-not-done",
        "missingInputs": [
          "router:route-expression-not-done"
        ],
        "phase": "route-expression-parsing",
        "relatedInformation": [],
        "relatedQueryKind": "router-issues",
        "repairAffordance": {
          "actionKind": "rewrite-router-instruction",
          "actionability": "guided",
          "changeDomain": "app-source",
          "planKind": "router-instruction-rewrite",
          "readiness": "ready-to-plan",
          "targetSourceCoverage": "all"
        },
        "sourceRole": "template",
        "subject": null,
        "taxonomy": {
          "actionability": "guided",
          "category": "project",
          "confidence": null,
          "impact": "blocking",
          "schema": "diagnostics-taxonomy/1"
        }
      },
      "message": "Unexpected ')' at route-expression offset 5 of 'known)'.",
      "range": {
        "end": {
          "character": 20,
          "line": 4
        },
        "start": {
          "character": 14,
          "line": 4
        }
      },
      "rangeText": "known)",
      "relatedInformation": [],
      "severity": "error",
      "source": "aurelia"
    }
  ],
  "outcome": "published",
  "uri": "fixtures://pressure/router-instruction-errors/src/router-instruction-errors-app.html"
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
            "filePath": "src/router-instruction-errors-app.html"
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
            "filePath": "src/router-instruction-errors-app.html"
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
            "filePath": "src/router-instruction-errors-app.html"
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
                  "label": "src/router-instruction-errors-app.html",
                  "path": "src/router-instruction-errors-app.html",
                  "sourceFileRole": "template",
                  "sourceWorkspaceKey": "router-instruction-errors"
                },
                "end": 131,
                "kind": "source-span-address",
                "label": "src/router-instruction-errors-app.html@129..131",
                "path": "src/router-instruction-errors-app.html",
                "role": "value",
                "sourceFileRole": "template",
                "sourceWorkspaceKey": "router-instruction-errors",
                "start": 129
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
                  "label": "src/router-instruction-errors-app.html",
                  "path": "src/router-instruction-errors-app.html",
                  "sourceFileRole": "template",
                  "sourceWorkspaceKey": "router-instruction-errors"
                },
                "end": 27,
                "kind": "source-span-address",
                "label": "src/router-instruction-errors-app.html@14..27",
                "path": "src/router-instruction-errors-app.html",
                "role": "value",
                "sourceFileRole": "template",
                "sourceWorkspaceKey": "router-instruction-errors",
                "start": 14
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
                  "label": "src/router-instruction-errors-app.html",
                  "path": "src/router-instruction-errors-app.html",
                  "sourceFileRole": "template",
                  "sourceWorkspaceKey": "router-instruction-errors"
                },
                "end": 177,
                "kind": "source-span-address",
                "label": "src/router-instruction-errors-app.html@176..177",
                "path": "src/router-instruction-errors-app.html",
                "role": "value",
                "sourceFileRole": "template",
                "sourceWorkspaceKey": "router-instruction-errors",
                "start": 176
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
                  "label": "src/router-instruction-errors-app.html",
                  "path": "src/router-instruction-errors-app.html",
                  "sourceFileRole": "template",
                  "sourceWorkspaceKey": "router-instruction-errors"
                },
                "end": 227,
                "kind": "source-span-address",
                "label": "src/router-instruction-errors-app.html@221..227",
                "path": "src/router-instruction-errors-app.html",
                "role": "value",
                "sourceFileRole": "template",
                "sourceWorkspaceKey": "router-instruction-errors",
                "start": 221
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
        "rationale": "Inspect router-issues rows referenced by returned diagnostics.",
        "targetQuery": {
          "kind": "router-issues",
          "page": {
            "size": 200
          }
        },
        "targetQueryKind": "router-issues"
      }
    ],
    "coverage": "complete",
    "page": null,
    "result": "answered",
    "schemaVersion": "0.2",
    "selection": "not-applicable",
    "summary": "Returned 4 app diagnostic(s)."
  },
  "outcome": "result",
  "presentation": {
    "complete": true,
    "contextualCount": 0,
    "groups": [
      {
        "groupKey": "row:diagnostic:1:router:instruction-no-fallback:framework-error-code:AUR3401:src/router-instruction-errors-app.html:14:27:router:instruction-no-fallback",
        "maxRawSeverity": "error",
        "primary": {
          "diagnostic": {
            "actionability": "guided",
            "anomaly": null,
            "category": "project",
            "code": "AUR3401",
            "data": {
              "diagnosticAuthority": "framework-error-code",
              "diagnosticDomain": "router",
              "diagnosticKind": "instruction-no-fallback",
              "frameworkErrorCode": "AUR3401",
              "frameworkRawErrorAuthority": null,
              "missingInput": "router:instruction-no-fallback",
              "missingInputs": [
                "router:instruction-no-fallback"
              ],
              "phase": "route-recognition",
              "relatedInformation": [],
              "relatedQueryKind": "router-issues",
              "repairAffordance": {
                "actionKind": "rewrite-router-instruction",
                "actionability": "guided",
                "changeDomain": "app-source",
                "planKind": "router-instruction-rewrite",
                "readiness": "ready-to-plan",
                "targetSourceCoverage": "all"
              },
              "sourceRole": "template",
              "subject": null,
              "taxonomy": {
                "actionability": "guided",
                "category": "project",
                "confidence": null,
                "impact": "blocking",
                "schema": "diagnostics-taxonomy/1"
              }
            },
            "file": "src/router-instruction-errors-app.html",
            "impact": "blocking",
            "issues": [
              {
                "code": "AUR3401",
                "kind": "instruction-no-fallback",
                "message": "Neither the route 'missing-route' matched any configured route nor is a fallback configured for the active route context."
              }
            ],
            "message": "Neither the route 'missing-route' matched any configured route nor is a fallback configured for the active route context.",
            "related": [],
            "severity": "error",
            "source": "semantic-runtime:router",
            "span": {
              "end": 27,
              "start": 14
            },
            "spanText": "missing-route",
            "status": "primary",
            "uri": "fixtures://pressure/router-instruction-errors/src/router-instruction-errors-app.html"
          },
          "relation": null,
          "role": "primary",
          "rowId": "diagnostic:1:router:instruction-no-fallback:framework-error-code:AUR3401:src/router-instruction-errors-app.html:14:27:router:instruction-no-fallback"
        },
        "primarySeverity": "error",
        "rawRowCount": 1,
        "related": [],
        "subject": null
      },
      {
        "groupKey": "row:diagnostic:0:router:invalid-instruction:framework-error-code:AUR3400:src/router-instruction-errors-app.html:129:131:router:invalid-instruction",
        "maxRawSeverity": "error",
        "primary": {
          "diagnostic": {
            "actionability": "guided",
            "anomaly": null,
            "category": "project",
            "code": "AUR3400",
            "data": {
              "diagnosticAuthority": "framework-error-code",
              "diagnosticDomain": "router",
              "diagnosticKind": "invalid-instruction",
              "frameworkErrorCode": "AUR3400",
              "frameworkRawErrorAuthority": null,
              "missingInput": "router:invalid-instruction",
              "missingInputs": [
                "router:invalid-instruction"
              ],
              "phase": "typed-navigation-instruction-creation",
              "relatedInformation": [],
              "relatedQueryKind": "router-issues",
              "repairAffordance": {
                "actionKind": "rewrite-router-instruction",
                "actionability": "guided",
                "changeDomain": "app-source",
                "planKind": "router-instruction-rewrite",
                "readiness": "ready-to-plan",
                "targetSourceCoverage": "all"
              },
              "sourceRole": "template",
              "subject": null,
              "taxonomy": {
                "actionability": "guided",
                "category": "project",
                "confidence": null,
                "impact": "blocking",
                "schema": "diagnostics-taxonomy/1"
              }
            },
            "file": "src/router-instruction-errors-app.html",
            "impact": "blocking",
            "issues": [
              {
                "code": "AUR3400",
                "kind": "invalid-instruction",
                "message": "Invalid load router instruction value 'number'; expected a route string, routeable component, or viewport instruction."
              }
            ],
            "message": "Invalid load router instruction value 'number'; expected a route string, routeable component, or viewport instruction.",
            "related": [],
            "severity": "error",
            "source": "semantic-runtime:router",
            "span": {
              "end": 131,
              "start": 129
            },
            "spanText": "42",
            "status": "primary",
            "uri": "fixtures://pressure/router-instruction-errors/src/router-instruction-errors-app.html"
          },
          "relation": null,
          "role": "primary",
          "rowId": "diagnostic:0:router:invalid-instruction:framework-error-code:AUR3400:src/router-instruction-errors-app.html:129:131:router:invalid-instruction"
        },
        "primarySeverity": "error",
        "rawRowCount": 1,
        "related": [],
        "subject": null
      },
      {
        "groupKey": "row:diagnostic:2:router:route-expression-unexpected-segment:framework-error-code:AUR3500:src/router-instruction-errors-app.html:176:177:router:route-expression-unexpected-segment",
        "maxRawSeverity": "error",
        "primary": {
          "diagnostic": {
            "actionability": "guided",
            "anomaly": null,
            "category": "project",
            "code": "AUR3500",
            "data": {
              "diagnosticAuthority": "framework-error-code",
              "diagnosticDomain": "router",
              "diagnosticKind": "route-expression-unexpected-segment",
              "frameworkErrorCode": "AUR3500",
              "frameworkRawErrorAuthority": null,
              "missingInput": "router:route-expression-unexpected-segment",
              "missingInputs": [
                "router:route-expression-unexpected-segment"
              ],
              "phase": "route-expression-parsing",
              "relatedInformation": [],
              "relatedQueryKind": "router-issues",
              "repairAffordance": {
                "actionKind": "rewrite-router-instruction",
                "actionability": "guided",
                "changeDomain": "app-source",
                "planKind": "router-instruction-rewrite",
                "readiness": "ready-to-plan",
                "targetSourceCoverage": "all"
              },
              "sourceRole": "template",
              "subject": null,
              "taxonomy": {
                "actionability": "guided",
                "category": "project",
                "confidence": null,
                "impact": "blocking",
                "schema": "diagnostics-taxonomy/1"
              }
            },
            "file": "src/router-instruction-errors-app.html",
            "impact": "blocking",
            "issues": [
              {
                "code": "AUR3500",
                "kind": "route-expression-unexpected-segment",
                "message": "Expected component name at route-expression offset 1 of '(', but got ''."
              }
            ],
            "message": "Expected component name at route-expression offset 1 of '(', but got ''.",
            "related": [],
            "severity": "error",
            "source": "semantic-runtime:router",
            "span": {
              "end": 177,
              "start": 176
            },
            "spanText": "(",
            "status": "primary",
            "uri": "fixtures://pressure/router-instruction-errors/src/router-instruction-errors-app.html"
          },
          "relation": null,
          "role": "primary",
          "rowId": "diagnostic:2:router:route-expression-unexpected-segment:framework-error-code:AUR3500:src/router-instruction-errors-app.html:176:177:router:route-expression-unexpected-segment"
        },
        "primarySeverity": "error",
        "rawRowCount": 1,
        "related": [],
        "subject": null
      },
      {
        "groupKey": "row:diagnostic:3:router:route-expression-not-done:framework-error-code:AUR3501:src/router-instruction-errors-app.html:221:227:router:route-expression-not-done",
        "maxRawSeverity": "error",
        "primary": {
          "diagnostic": {
            "actionability": "guided",
            "anomaly": null,
            "category": "project",
            "code": "AUR3501",
            "data": {
              "diagnosticAuthority": "framework-error-code",
              "diagnosticDomain": "router",
              "diagnosticKind": "route-expression-not-done",
              "frameworkErrorCode": "AUR3501",
              "frameworkRawErrorAuthority": null,
              "missingInput": "router:route-expression-not-done",
              "missingInputs": [
                "router:route-expression-not-done"
              ],
              "phase": "route-expression-parsing",
              "relatedInformation": [],
              "relatedQueryKind": "router-issues",
              "repairAffordance": {
                "actionKind": "rewrite-router-instruction",
                "actionability": "guided",
                "changeDomain": "app-source",
                "planKind": "router-instruction-rewrite",
                "readiness": "ready-to-plan",
                "targetSourceCoverage": "all"
              },
              "sourceRole": "template",
              "subject": null,
              "taxonomy": {
                "actionability": "guided",
                "category": "project",
                "confidence": null,
                "impact": "blocking",
                "schema": "diagnostics-taxonomy/1"
              }
            },
            "file": "src/router-instruction-errors-app.html",
            "impact": "blocking",
            "issues": [
              {
                "code": "AUR3501",
                "kind": "route-expression-not-done",
                "message": "Unexpected ')' at route-expression offset 5 of 'known)'."
              }
            ],
            "message": "Unexpected ')' at route-expression offset 5 of 'known)'.",
            "related": [],
            "severity": "error",
            "source": "semantic-runtime:router",
            "span": {
              "end": 227,
              "start": 221
            },
            "spanText": "known)",
            "status": "primary",
            "uri": "fixtures://pressure/router-instruction-errors/src/router-instruction-errors-app.html"
          },
          "relation": null,
          "role": "primary",
          "rowId": "diagnostic:3:router:route-expression-not-done:framework-error-code:AUR3501:src/router-instruction-errors-app.html:221:227:router:route-expression-not-done"
        },
        "primarySeverity": "error",
        "rawRowCount": 1,
        "related": [],
        "subject": null
      }
    ],
    "primaryCount": 4,
    "rawRowCount": 4
  },
  "raw": {
    "diagnosticCount": 4,
    "diagnostics": [
      {
        "actionability": "guided",
        "anomaly": null,
        "category": "project",
        "code": "AUR3400",
        "data": {
          "diagnosticAuthority": "framework-error-code",
          "diagnosticDomain": "router",
          "diagnosticKind": "invalid-instruction",
          "frameworkErrorCode": "AUR3400",
          "frameworkRawErrorAuthority": null,
          "missingInput": "router:invalid-instruction",
          "missingInputs": [
            "router:invalid-instruction"
          ],
          "phase": "typed-navigation-instruction-creation",
          "relatedInformation": [],
          "relatedQueryKind": "router-issues",
          "repairAffordance": {
            "actionKind": "rewrite-router-instruction",
            "actionability": "guided",
            "changeDomain": "app-source",
            "planKind": "router-instruction-rewrite",
            "readiness": "ready-to-plan",
            "targetSourceCoverage": "all"
          },
          "sourceRole": "template",
          "subject": null,
          "taxonomy": {
            "actionability": "guided",
            "category": "project",
            "confidence": null,
            "impact": "blocking",
            "schema": "diagnostics-taxonomy/1"
          }
        },
        "file": "src/router-instruction-errors-app.html",
        "impact": "blocking",
        "issues": [
          {
            "code": "AUR3400",
            "kind": "invalid-instruction",
            "message": "Invalid load router instruction value 'number'; expected a route string, routeable component, or viewport instruction."
          }
        ],
        "message": "Invalid load router instruction value 'number'; expected a route string, routeable component, or viewport instruction.",
        "related": [],
        "severity": "error",
        "source": "semantic-runtime:router",
        "span": {
          "end": 131,
          "start": 129
        },
        "spanText": "42",
        "status": "canonical",
        "uri": "fixtures://pressure/router-instruction-errors/src/router-instruction-errors-app.html"
      },
      {
        "actionability": "guided",
        "anomaly": null,
        "category": "project",
        "code": "AUR3401",
        "data": {
          "diagnosticAuthority": "framework-error-code",
          "diagnosticDomain": "router",
          "diagnosticKind": "instruction-no-fallback",
          "frameworkErrorCode": "AUR3401",
          "frameworkRawErrorAuthority": null,
          "missingInput": "router:instruction-no-fallback",
          "missingInputs": [
            "router:instruction-no-fallback"
          ],
          "phase": "route-recognition",
          "relatedInformation": [],
          "relatedQueryKind": "router-issues",
          "repairAffordance": {
            "actionKind": "rewrite-router-instruction",
            "actionability": "guided",
            "changeDomain": "app-source",
            "planKind": "router-instruction-rewrite",
            "readiness": "ready-to-plan",
            "targetSourceCoverage": "all"
          },
          "sourceRole": "template",
          "subject": null,
          "taxonomy": {
            "actionability": "guided",
            "category": "project",
            "confidence": null,
            "impact": "blocking",
            "schema": "diagnostics-taxonomy/1"
          }
        },
        "file": "src/router-instruction-errors-app.html",
        "impact": "blocking",
        "issues": [
          {
            "code": "AUR3401",
            "kind": "instruction-no-fallback",
            "message": "Neither the route 'missing-route' matched any configured route nor is a fallback configured for the active route context."
          }
        ],
        "message": "Neither the route 'missing-route' matched any configured route nor is a fallback configured for the active route context.",
        "related": [],
        "severity": "error",
        "source": "semantic-runtime:router",
        "span": {
          "end": 27,
          "start": 14
        },
        "spanText": "missing-route",
        "status": "canonical",
        "uri": "fixtures://pressure/router-instruction-errors/src/router-instruction-errors-app.html"
      },
      {
        "actionability": "guided",
        "anomaly": null,
        "category": "project",
        "code": "AUR3500",
        "data": {
          "diagnosticAuthority": "framework-error-code",
          "diagnosticDomain": "router",
          "diagnosticKind": "route-expression-unexpected-segment",
          "frameworkErrorCode": "AUR3500",
          "frameworkRawErrorAuthority": null,
          "missingInput": "router:route-expression-unexpected-segment",
          "missingInputs": [
            "router:route-expression-unexpected-segment"
          ],
          "phase": "route-expression-parsing",
          "relatedInformation": [],
          "relatedQueryKind": "router-issues",
          "repairAffordance": {
            "actionKind": "rewrite-router-instruction",
            "actionability": "guided",
            "changeDomain": "app-source",
            "planKind": "router-instruction-rewrite",
            "readiness": "ready-to-plan",
            "targetSourceCoverage": "all"
          },
          "sourceRole": "template",
          "subject": null,
          "taxonomy": {
            "actionability": "guided",
            "category": "project",
            "confidence": null,
            "impact": "blocking",
            "schema": "diagnostics-taxonomy/1"
          }
        },
        "file": "src/router-instruction-errors-app.html",
        "impact": "blocking",
        "issues": [
          {
            "code": "AUR3500",
            "kind": "route-expression-unexpected-segment",
            "message": "Expected component name at route-expression offset 1 of '(', but got ''."
          }
        ],
        "message": "Expected component name at route-expression offset 1 of '(', but got ''.",
        "related": [],
        "severity": "error",
        "source": "semantic-runtime:router",
        "span": {
          "end": 177,
          "start": 176
        },
        "spanText": "(",
        "status": "canonical",
        "uri": "fixtures://pressure/router-instruction-errors/src/router-instruction-errors-app.html"
      },
      {
        "actionability": "guided",
        "anomaly": null,
        "category": "project",
        "code": "AUR3501",
        "data": {
          "diagnosticAuthority": "framework-error-code",
          "diagnosticDomain": "router",
          "diagnosticKind": "route-expression-not-done",
          "frameworkErrorCode": "AUR3501",
          "frameworkRawErrorAuthority": null,
          "missingInput": "router:route-expression-not-done",
          "missingInputs": [
            "router:route-expression-not-done"
          ],
          "phase": "route-expression-parsing",
          "relatedInformation": [],
          "relatedQueryKind": "router-issues",
          "repairAffordance": {
            "actionKind": "rewrite-router-instruction",
            "actionability": "guided",
            "changeDomain": "app-source",
            "planKind": "router-instruction-rewrite",
            "readiness": "ready-to-plan",
            "targetSourceCoverage": "all"
          },
          "sourceRole": "template",
          "subject": null,
          "taxonomy": {
            "actionability": "guided",
            "category": "project",
            "confidence": null,
            "impact": "blocking",
            "schema": "diagnostics-taxonomy/1"
          }
        },
        "file": "src/router-instruction-errors-app.html",
        "impact": "blocking",
        "issues": [
          {
            "code": "AUR3501",
            "kind": "route-expression-not-done",
            "message": "Unexpected ')' at route-expression offset 5 of 'known)'."
          }
        ],
        "message": "Unexpected ')' at route-expression offset 5 of 'known)'.",
        "related": [],
        "severity": "error",
        "source": "semantic-runtime:router",
        "span": {
          "end": 227,
          "start": 221
        },
        "spanText": "known)",
        "status": "canonical",
        "uri": "fixtures://pressure/router-instruction-errors/src/router-instruction-errors-app.html"
      }
    ]
  },
  "surfaces": {
    "lsp": {
      "diagnosticCount": 4,
      "diagnostics": [
        {
          "actionability": "guided",
          "anomaly": null,
          "category": "project",
          "code": "AUR3401",
          "data": {
            "diagnosticAuthority": "framework-error-code",
            "diagnosticDomain": "router",
            "diagnosticKind": "instruction-no-fallback",
            "frameworkErrorCode": "AUR3401",
            "frameworkRawErrorAuthority": null,
            "missingInput": "router:instruction-no-fallback",
            "missingInputs": [
              "router:instruction-no-fallback"
            ],
            "phase": "route-recognition",
            "relatedInformation": [],
            "relatedQueryKind": "router-issues",
            "repairAffordance": {
              "actionKind": "rewrite-router-instruction",
              "actionability": "guided",
              "changeDomain": "app-source",
              "planKind": "router-instruction-rewrite",
              "readiness": "ready-to-plan",
              "targetSourceCoverage": "all"
            },
            "sourceRole": "template",
            "subject": null,
            "taxonomy": {
              "actionability": "guided",
              "category": "project",
              "confidence": null,
              "impact": "blocking",
              "schema": "diagnostics-taxonomy/1"
            }
          },
          "file": "src/router-instruction-errors-app.html",
          "impact": "blocking",
          "issues": [
            {
              "code": "AUR3401",
              "kind": "instruction-no-fallback",
              "message": "Neither the route 'missing-route' matched any configured route nor is a fallback configured for the active route context."
            }
          ],
          "message": "Neither the route 'missing-route' matched any configured route nor is a fallback configured for the active route context.",
          "related": [],
          "severity": "error",
          "source": "semantic-runtime:router",
          "span": {
            "end": 27,
            "start": 14
          },
          "spanText": "missing-route",
          "status": "primary",
          "uri": "fixtures://pressure/router-instruction-errors/src/router-instruction-errors-app.html"
        },
        {
          "actionability": "guided",
          "anomaly": null,
          "category": "project",
          "code": "AUR3400",
          "data": {
            "diagnosticAuthority": "framework-error-code",
            "diagnosticDomain": "router",
            "diagnosticKind": "invalid-instruction",
            "frameworkErrorCode": "AUR3400",
            "frameworkRawErrorAuthority": null,
            "missingInput": "router:invalid-instruction",
            "missingInputs": [
              "router:invalid-instruction"
            ],
            "phase": "typed-navigation-instruction-creation",
            "relatedInformation": [],
            "relatedQueryKind": "router-issues",
            "repairAffordance": {
              "actionKind": "rewrite-router-instruction",
              "actionability": "guided",
              "changeDomain": "app-source",
              "planKind": "router-instruction-rewrite",
              "readiness": "ready-to-plan",
              "targetSourceCoverage": "all"
            },
            "sourceRole": "template",
            "subject": null,
            "taxonomy": {
              "actionability": "guided",
              "category": "project",
              "confidence": null,
              "impact": "blocking",
              "schema": "diagnostics-taxonomy/1"
            }
          },
          "file": "src/router-instruction-errors-app.html",
          "impact": "blocking",
          "issues": [
            {
              "code": "AUR3400",
              "kind": "invalid-instruction",
              "message": "Invalid load router instruction value 'number'; expected a route string, routeable component, or viewport instruction."
            }
          ],
          "message": "Invalid load router instruction value 'number'; expected a route string, routeable component, or viewport instruction.",
          "related": [],
          "severity": "error",
          "source": "semantic-runtime:router",
          "span": {
            "end": 131,
            "start": 129
          },
          "spanText": "42",
          "status": "primary",
          "uri": "fixtures://pressure/router-instruction-errors/src/router-instruction-errors-app.html"
        },
        {
          "actionability": "guided",
          "anomaly": null,
          "category": "project",
          "code": "AUR3500",
          "data": {
            "diagnosticAuthority": "framework-error-code",
            "diagnosticDomain": "router",
            "diagnosticKind": "route-expression-unexpected-segment",
            "frameworkErrorCode": "AUR3500",
            "frameworkRawErrorAuthority": null,
            "missingInput": "router:route-expression-unexpected-segment",
            "missingInputs": [
              "router:route-expression-unexpected-segment"
            ],
            "phase": "route-expression-parsing",
            "relatedInformation": [],
            "relatedQueryKind": "router-issues",
            "repairAffordance": {
              "actionKind": "rewrite-router-instruction",
              "actionability": "guided",
              "changeDomain": "app-source",
              "planKind": "router-instruction-rewrite",
              "readiness": "ready-to-plan",
              "targetSourceCoverage": "all"
            },
            "sourceRole": "template",
            "subject": null,
            "taxonomy": {
              "actionability": "guided",
              "category": "project",
              "confidence": null,
              "impact": "blocking",
              "schema": "diagnostics-taxonomy/1"
            }
          },
          "file": "src/router-instruction-errors-app.html",
          "impact": "blocking",
          "issues": [
            {
              "code": "AUR3500",
              "kind": "route-expression-unexpected-segment",
              "message": "Expected component name at route-expression offset 1 of '(', but got ''."
            }
          ],
          "message": "Expected component name at route-expression offset 1 of '(', but got ''.",
          "related": [],
          "severity": "error",
          "source": "semantic-runtime:router",
          "span": {
            "end": 177,
            "start": 176
          },
          "spanText": "(",
          "status": "primary",
          "uri": "fixtures://pressure/router-instruction-errors/src/router-instruction-errors-app.html"
        },
        {
          "actionability": "guided",
          "anomaly": null,
          "category": "project",
          "code": "AUR3501",
          "data": {
            "diagnosticAuthority": "framework-error-code",
            "diagnosticDomain": "router",
            "diagnosticKind": "route-expression-not-done",
            "frameworkErrorCode": "AUR3501",
            "frameworkRawErrorAuthority": null,
            "missingInput": "router:route-expression-not-done",
            "missingInputs": [
              "router:route-expression-not-done"
            ],
            "phase": "route-expression-parsing",
            "relatedInformation": [],
            "relatedQueryKind": "router-issues",
            "repairAffordance": {
              "actionKind": "rewrite-router-instruction",
              "actionability": "guided",
              "changeDomain": "app-source",
              "planKind": "router-instruction-rewrite",
              "readiness": "ready-to-plan",
              "targetSourceCoverage": "all"
            },
            "sourceRole": "template",
            "subject": null,
            "taxonomy": {
              "actionability": "guided",
              "category": "project",
              "confidence": null,
              "impact": "blocking",
              "schema": "diagnostics-taxonomy/1"
            }
          },
          "file": "src/router-instruction-errors-app.html",
          "impact": "blocking",
          "issues": [
            {
              "code": "AUR3501",
              "kind": "route-expression-not-done",
              "message": "Unexpected ')' at route-expression offset 5 of 'known)'."
            }
          ],
          "message": "Unexpected ')' at route-expression offset 5 of 'known)'.",
          "related": [],
          "severity": "error",
          "source": "semantic-runtime:router",
          "span": {
            "end": 227,
            "start": 221
          },
          "spanText": "known)",
          "status": "primary",
          "uri": "fixtures://pressure/router-instruction-errors/src/router-instruction-errors-app.html"
        }
      ]
    }
  },
  "uri": "fixtures://pressure/router-instruction-errors/src/router-instruction-errors-app.html"
}
```

### Alignment

```json
{
  "comparisonKey": "domain/kind/code/severity/text/message",
  "countsMatch": true,
  "customLspSurfaceCount": 4,
  "customOnly": [],
  "lspOnly": [],
  "lspPublishCount": 4,
  "suppressedCount": 0
}
```
