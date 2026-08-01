# router-viewport-resolution-errors diagnostics lane snapshot

Fixture: `packages/semantic-runtime/fixtures/pressure/router-viewport-resolution-errors`
Probe file: `packages/lane-harness/probes/router-viewport-resolution-errors.probes.json`
Lane: `diagnostics`

This snapshot records observed language-server behavior. Operator verdicts live in the probe data.

## router-load-side-only

### Probe

```json
{
  "file": "src/router-viewport-resolution-errors-app.html"
}
```

### publishDiagnostics

```json
{
  "diagnosticCount": 1,
  "diagnostics": [
    {
      "anomaly": null,
      "code": "AUR3174",
      "data": {
        "diagnosticAuthority": "framework-error-code",
        "diagnosticDomain": "router",
        "diagnosticKind": "no-available-viewport-agent",
        "frameworkErrorCode": "AUR3174",
        "frameworkRawErrorAuthority": null,
        "missingInput": "router:no-available-viewport-agent",
        "missingInputs": [
          "router:no-available-viewport-agent"
        ],
        "phase": "route-tree-viewport-resolution",
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
      "message": "Failed to resolve ViewportRequest(viewport:'side',component:'side-only-route') from RouteContext 'router-viewport-resolution-errors-app'.",
      "range": {
        "end": {
          "character": 23,
          "line": 0
        },
        "start": {
          "character": 14,
          "line": 0
        }
      },
      "rangeText": "side-only",
      "relatedInformation": [],
      "severity": "error",
      "source": "aurelia"
    }
  ],
  "outcome": "published",
  "uri": "fixtures://pressure/router-viewport-resolution-errors/src/router-viewport-resolution-errors-app.html"
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
            "filePath": "src/router-viewport-resolution-errors-app.html"
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
            "filePath": "src/router-viewport-resolution-errors-app.html"
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
            "filePath": "src/router-viewport-resolution-errors-app.html"
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
                  "label": "src/router-viewport-resolution-errors-app.html",
                  "path": "src/router-viewport-resolution-errors-app.html",
                  "sourceFileRole": "template",
                  "sourceWorkspaceKey": "router-viewport-resolution-errors"
                },
                "end": 23,
                "kind": "source-span-address",
                "label": "src/router-viewport-resolution-errors-app.html@14..23",
                "path": "src/router-viewport-resolution-errors-app.html",
                "role": "value",
                "sourceFileRole": "template",
                "sourceWorkspaceKey": "router-viewport-resolution-errors",
                "start": 14
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
    "summary": "Returned 1 app diagnostic(s)."
  },
  "outcome": "result",
  "presentation": {
    "complete": true,
    "contextualCount": 0,
    "groups": [
      {
        "groupKey": "row:diagnostic:0:router:no-available-viewport-agent:framework-error-code:AUR3174:src/router-viewport-resolution-errors-app.html:14:23:router:no-available-viewport-agent",
        "maxRawSeverity": "error",
        "primary": {
          "diagnostic": {
            "actionability": "guided",
            "anomaly": null,
            "category": "project",
            "code": "AUR3174",
            "data": {
              "diagnosticAuthority": "framework-error-code",
              "diagnosticDomain": "router",
              "diagnosticKind": "no-available-viewport-agent",
              "frameworkErrorCode": "AUR3174",
              "frameworkRawErrorAuthority": null,
              "missingInput": "router:no-available-viewport-agent",
              "missingInputs": [
                "router:no-available-viewport-agent"
              ],
              "phase": "route-tree-viewport-resolution",
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
            "file": "src/router-viewport-resolution-errors-app.html",
            "impact": "blocking",
            "issues": [
              {
                "code": "AUR3174",
                "kind": "no-available-viewport-agent",
                "message": "Failed to resolve ViewportRequest(viewport:'side',component:'side-only-route') from RouteContext 'router-viewport-resolution-errors-app'."
              }
            ],
            "message": "Failed to resolve ViewportRequest(viewport:'side',component:'side-only-route') from RouteContext 'router-viewport-resolution-errors-app'.",
            "related": [],
            "severity": "error",
            "source": "semantic-runtime:router",
            "span": {
              "end": 23,
              "start": 14
            },
            "spanText": "side-only",
            "status": "primary",
            "uri": "fixtures://pressure/router-viewport-resolution-errors/src/router-viewport-resolution-errors-app.html"
          },
          "relation": null,
          "role": "primary",
          "rowId": "diagnostic:0:router:no-available-viewport-agent:framework-error-code:AUR3174:src/router-viewport-resolution-errors-app.html:14:23:router:no-available-viewport-agent"
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
        "category": "project",
        "code": "AUR3174",
        "data": {
          "diagnosticAuthority": "framework-error-code",
          "diagnosticDomain": "router",
          "diagnosticKind": "no-available-viewport-agent",
          "frameworkErrorCode": "AUR3174",
          "frameworkRawErrorAuthority": null,
          "missingInput": "router:no-available-viewport-agent",
          "missingInputs": [
            "router:no-available-viewport-agent"
          ],
          "phase": "route-tree-viewport-resolution",
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
        "file": "src/router-viewport-resolution-errors-app.html",
        "impact": "blocking",
        "issues": [
          {
            "code": "AUR3174",
            "kind": "no-available-viewport-agent",
            "message": "Failed to resolve ViewportRequest(viewport:'side',component:'side-only-route') from RouteContext 'router-viewport-resolution-errors-app'."
          }
        ],
        "message": "Failed to resolve ViewportRequest(viewport:'side',component:'side-only-route') from RouteContext 'router-viewport-resolution-errors-app'.",
        "related": [],
        "severity": "error",
        "source": "semantic-runtime:router",
        "span": {
          "end": 23,
          "start": 14
        },
        "spanText": "side-only",
        "status": "canonical",
        "uri": "fixtures://pressure/router-viewport-resolution-errors/src/router-viewport-resolution-errors-app.html"
      }
    ]
  },
  "surfaces": {
    "lsp": {
      "diagnosticCount": 1,
      "diagnostics": [
        {
          "actionability": "guided",
          "anomaly": null,
          "category": "project",
          "code": "AUR3174",
          "data": {
            "diagnosticAuthority": "framework-error-code",
            "diagnosticDomain": "router",
            "diagnosticKind": "no-available-viewport-agent",
            "frameworkErrorCode": "AUR3174",
            "frameworkRawErrorAuthority": null,
            "missingInput": "router:no-available-viewport-agent",
            "missingInputs": [
              "router:no-available-viewport-agent"
            ],
            "phase": "route-tree-viewport-resolution",
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
          "file": "src/router-viewport-resolution-errors-app.html",
          "impact": "blocking",
          "issues": [
            {
              "code": "AUR3174",
              "kind": "no-available-viewport-agent",
              "message": "Failed to resolve ViewportRequest(viewport:'side',component:'side-only-route') from RouteContext 'router-viewport-resolution-errors-app'."
            }
          ],
          "message": "Failed to resolve ViewportRequest(viewport:'side',component:'side-only-route') from RouteContext 'router-viewport-resolution-errors-app'.",
          "related": [],
          "severity": "error",
          "source": "semantic-runtime:router",
          "span": {
            "end": 23,
            "start": 14
          },
          "spanText": "side-only",
          "status": "primary",
          "uri": "fixtures://pressure/router-viewport-resolution-errors/src/router-viewport-resolution-errors-app.html"
        }
      ]
    }
  },
  "uri": "fixtures://pressure/router-viewport-resolution-errors/src/router-viewport-resolution-errors-app.html"
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
