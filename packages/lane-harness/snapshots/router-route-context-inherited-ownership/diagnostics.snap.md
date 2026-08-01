# router-route-context-inherited-ownership diagnostics lane snapshot

Fixture: `packages/semantic-runtime/fixtures/pressure/router-route-context-inherited-ownership`
Probe file: `packages/lane-harness/probes/router-route-context-inherited-ownership.probes.json`
Lane: `diagnostics`

This snapshot records observed language-server behavior. Operator verdicts live in the probe data.

## shared-base-route-context-read

### Probe

```json
{
  "file": "src/route-parameters/shared-route-parameters.ts"
}
```

### publishDiagnostics

```json
{
  "diagnosticCount": 1,
  "diagnostics": [
    {
      "anomaly": null,
      "code": "shared-base-route-context-parameter-read",
      "data": {
        "diagnosticAuthority": "semantic-authoring-policy",
        "diagnosticDomain": "router",
        "diagnosticKind": "shared-base-route-context-parameter-read",
        "frameworkErrorCode": null,
        "frameworkRawErrorAuthority": null,
        "missingInput": null,
        "missingInputs": [],
        "phase": "route-context-parameter-read-ownership",
        "relatedInformation": [
          {
            "message": "Routed component 'account-route' inherits this RouteContext parameter read.",
            "source": {
              "anchor": {
                "kind": "source-file-address",
                "label": "src/router-route-context-inherited-ownership-app.ts",
                "path": "src/router-route-context-inherited-ownership-app.ts",
                "sourceFileRole": "app-source",
                "sourceWorkspaceKey": "router-route-context-inherited-ownership"
              },
              "end": 508,
              "kind": "source-span-address",
              "label": "src/router-route-context-inherited-ownership-app.ts@496..508",
              "path": "src/router-route-context-inherited-ownership-app.ts",
              "role": "range",
              "sourceFileRole": "app-source",
              "sourceWorkspaceKey": "router-route-context-inherited-ownership",
              "start": 496
            }
          },
          {
            "message": "Routed component 'project-route' inherits this RouteContext parameter read.",
            "source": {
              "anchor": {
                "kind": "source-file-address",
                "label": "src/router-route-context-inherited-ownership-app.ts",
                "path": "src/router-route-context-inherited-ownership-app.ts",
                "sourceFileRole": "app-source",
                "sourceWorkspaceKey": "router-route-context-inherited-ownership"
              },
              "end": 608,
              "kind": "source-span-address",
              "label": "src/router-route-context-inherited-ownership-app.ts@596..608",
              "path": "src/router-route-context-inherited-ownership-app.ts",
              "role": "range",
              "sourceFileRole": "app-source",
              "sourceWorkspaceKey": "router-route-context-inherited-ownership",
              "start": 596
            }
          }
        ],
        "relatedQueryKind": "router-issues",
        "repairAffordance": {
          "actionKind": "inspect-type-surface",
          "actionability": "manual",
          "changeDomain": "inspection",
          "planKind": "manual-inspection",
          "readiness": "inspection-required",
          "targetSourceCoverage": "not-applicable"
        },
        "sourceRole": "app-source",
        "subject": null,
        "taxonomy": {
          "actionability": "manual",
          "category": "project",
          "confidence": null,
          "impact": "degraded",
          "schema": "diagnostics-taxonomy/1"
        }
      },
      "message": "RouteContext parameter read on 'SharedRouteParameters' is shared by 2 routed components; declare the read on each concrete routed component or pass parameters into shared logic.",
      "range": {
        "end": {
          "character": 104,
          "line": 4
        },
        "start": {
          "character": 39,
          "line": 4
        }
      },
      "rangeText": "resolve(IRouteContext).getRouteParameters<{ sharedId: string }>()",
      "relatedInformation": [
        {
          "anomaly": null,
          "file": "src/router-route-context-inherited-ownership-app.ts",
          "message": "Routed component 'account-route' inherits this RouteContext parameter read.",
          "range": {
            "end": {
              "character": 29,
              "line": 15
            },
            "start": {
              "character": 17,
              "line": 15
            }
          },
          "rangeText": "AccountRoute",
          "uri": "fixtures://pressure/router-route-context-inherited-ownership/src/router-route-context-inherited-ownership-app.ts"
        },
        {
          "anomaly": null,
          "file": "src/router-route-context-inherited-ownership-app.ts",
          "message": "Routed component 'project-route' inherits this RouteContext parameter read.",
          "range": {
            "end": {
              "character": 29,
              "line": 20
            },
            "start": {
              "character": 17,
              "line": 20
            }
          },
          "rangeText": "ProjectRoute",
          "uri": "fixtures://pressure/router-route-context-inherited-ownership/src/router-route-context-inherited-ownership-app.ts"
        }
      ],
      "severity": "warning",
      "source": "aurelia"
    }
  ],
  "outcome": "published",
  "uri": "fixtures://pressure/router-route-context-inherited-ownership/src/route-parameters/shared-route-parameters.ts"
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
            "filePath": "src/route-parameters/shared-route-parameters.ts"
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
            "filePath": "src/route-parameters/shared-route-parameters.ts"
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
            "filePath": "src/route-parameters/shared-route-parameters.ts"
          }
        },
        "targetQueryKind": "template-diagnostics"
      },
      {
        "blockers": [
          "No framework, TypeScript, or semantic-runtime diagnostic authority was returned for this related diagnostic family."
        ],
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
                  "label": "src/route-parameters/shared-route-parameters.ts",
                  "path": "src/route-parameters/shared-route-parameters.ts",
                  "sourceFileRole": "app-source",
                  "sourceWorkspaceKey": "router-route-context-inherited-ownership"
                },
                "end": 243,
                "kind": "source-span-address",
                "label": "src/route-parameters/shared-route-parameters.ts@178..243",
                "path": "src/route-parameters/shared-route-parameters.ts",
                "role": "primary",
                "sourceFileRole": "app-source",
                "sourceWorkspaceKey": "router-route-context-inherited-ownership",
                "start": 178
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
        "groupKey": "row:diagnostic:0:router:shared-base-route-context-parameter-read:semantic-authoring-policy:no-framework-code:src/route-parameters/shared-route-parameters.ts:178:243:no-missing-input",
        "maxRawSeverity": "warning",
        "primary": {
          "diagnostic": {
            "actionability": "manual",
            "anomaly": null,
            "category": "project",
            "code": "shared-base-route-context-parameter-read",
            "data": {
              "diagnosticAuthority": "semantic-authoring-policy",
              "diagnosticDomain": "router",
              "diagnosticKind": "shared-base-route-context-parameter-read",
              "frameworkErrorCode": null,
              "frameworkRawErrorAuthority": null,
              "missingInput": null,
              "missingInputs": [],
              "phase": "route-context-parameter-read-ownership",
              "relatedInformation": [
                {
                  "message": "Routed component 'account-route' inherits this RouteContext parameter read.",
                  "source": {
                    "anchor": {
                      "kind": "source-file-address",
                      "label": "src/router-route-context-inherited-ownership-app.ts",
                      "path": "src/router-route-context-inherited-ownership-app.ts",
                      "sourceFileRole": "app-source",
                      "sourceWorkspaceKey": "router-route-context-inherited-ownership"
                    },
                    "end": 508,
                    "kind": "source-span-address",
                    "label": "src/router-route-context-inherited-ownership-app.ts@496..508",
                    "path": "src/router-route-context-inherited-ownership-app.ts",
                    "role": "range",
                    "sourceFileRole": "app-source",
                    "sourceWorkspaceKey": "router-route-context-inherited-ownership",
                    "start": 496
                  }
                },
                {
                  "message": "Routed component 'project-route' inherits this RouteContext parameter read.",
                  "source": {
                    "anchor": {
                      "kind": "source-file-address",
                      "label": "src/router-route-context-inherited-ownership-app.ts",
                      "path": "src/router-route-context-inherited-ownership-app.ts",
                      "sourceFileRole": "app-source",
                      "sourceWorkspaceKey": "router-route-context-inherited-ownership"
                    },
                    "end": 608,
                    "kind": "source-span-address",
                    "label": "src/router-route-context-inherited-ownership-app.ts@596..608",
                    "path": "src/router-route-context-inherited-ownership-app.ts",
                    "role": "range",
                    "sourceFileRole": "app-source",
                    "sourceWorkspaceKey": "router-route-context-inherited-ownership",
                    "start": 596
                  }
                }
              ],
              "relatedQueryKind": "router-issues",
              "repairAffordance": {
                "actionKind": "inspect-type-surface",
                "actionability": "manual",
                "changeDomain": "inspection",
                "planKind": "manual-inspection",
                "readiness": "inspection-required",
                "targetSourceCoverage": "not-applicable"
              },
              "sourceRole": "app-source",
              "subject": null,
              "taxonomy": {
                "actionability": "manual",
                "category": "project",
                "confidence": null,
                "impact": "degraded",
                "schema": "diagnostics-taxonomy/1"
              }
            },
            "file": "src/route-parameters/shared-route-parameters.ts",
            "impact": "degraded",
            "issues": [
              {
                "code": "shared-base-route-context-parameter-read",
                "kind": "shared-base-route-context-parameter-read",
                "message": "RouteContext parameter read on 'SharedRouteParameters' is shared by 2 routed components; declare the read on each concrete routed component or pass parameters into shared logic."
              }
            ],
            "message": "RouteContext parameter read on 'SharedRouteParameters' is shared by 2 routed components; declare the read on each concrete routed component or pass parameters into shared logic.",
            "related": [
              {
                "anomaly": null,
                "code": null,
                "file": "src/router-route-context-inherited-ownership-app.ts",
                "message": "Routed component 'account-route' inherits this RouteContext parameter read.",
                "sourceRole": null,
                "span": {
                  "end": 508,
                  "start": 496
                },
                "spanText": "AccountRoute",
                "uri": "fixtures://pressure/router-route-context-inherited-ownership/src/router-route-context-inherited-ownership-app.ts"
              },
              {
                "anomaly": null,
                "code": null,
                "file": "src/router-route-context-inherited-ownership-app.ts",
                "message": "Routed component 'project-route' inherits this RouteContext parameter read.",
                "sourceRole": null,
                "span": {
                  "end": 608,
                  "start": 596
                },
                "spanText": "ProjectRoute",
                "uri": "fixtures://pressure/router-route-context-inherited-ownership/src/router-route-context-inherited-ownership-app.ts"
              }
            ],
            "severity": "warning",
            "source": "semantic-runtime:router",
            "span": {
              "end": 243,
              "start": 178
            },
            "spanText": "resolve(IRouteContext).getRouteParameters<{ sharedId: string }>()",
            "status": "primary",
            "uri": "fixtures://pressure/router-route-context-inherited-ownership/src/route-parameters/shared-route-parameters.ts"
          },
          "relation": null,
          "role": "primary",
          "rowId": "diagnostic:0:router:shared-base-route-context-parameter-read:semantic-authoring-policy:no-framework-code:src/route-parameters/shared-route-parameters.ts:178:243:no-missing-input"
        },
        "primarySeverity": "warning",
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
        "actionability": "manual",
        "anomaly": null,
        "category": "project",
        "code": "shared-base-route-context-parameter-read",
        "data": {
          "diagnosticAuthority": "semantic-authoring-policy",
          "diagnosticDomain": "router",
          "diagnosticKind": "shared-base-route-context-parameter-read",
          "frameworkErrorCode": null,
          "frameworkRawErrorAuthority": null,
          "missingInput": null,
          "missingInputs": [],
          "phase": "route-context-parameter-read-ownership",
          "relatedInformation": [
            {
              "message": "Routed component 'account-route' inherits this RouteContext parameter read.",
              "source": {
                "anchor": {
                  "kind": "source-file-address",
                  "label": "src/router-route-context-inherited-ownership-app.ts",
                  "path": "src/router-route-context-inherited-ownership-app.ts",
                  "sourceFileRole": "app-source",
                  "sourceWorkspaceKey": "router-route-context-inherited-ownership"
                },
                "end": 508,
                "kind": "source-span-address",
                "label": "src/router-route-context-inherited-ownership-app.ts@496..508",
                "path": "src/router-route-context-inherited-ownership-app.ts",
                "role": "range",
                "sourceFileRole": "app-source",
                "sourceWorkspaceKey": "router-route-context-inherited-ownership",
                "start": 496
              }
            },
            {
              "message": "Routed component 'project-route' inherits this RouteContext parameter read.",
              "source": {
                "anchor": {
                  "kind": "source-file-address",
                  "label": "src/router-route-context-inherited-ownership-app.ts",
                  "path": "src/router-route-context-inherited-ownership-app.ts",
                  "sourceFileRole": "app-source",
                  "sourceWorkspaceKey": "router-route-context-inherited-ownership"
                },
                "end": 608,
                "kind": "source-span-address",
                "label": "src/router-route-context-inherited-ownership-app.ts@596..608",
                "path": "src/router-route-context-inherited-ownership-app.ts",
                "role": "range",
                "sourceFileRole": "app-source",
                "sourceWorkspaceKey": "router-route-context-inherited-ownership",
                "start": 596
              }
            }
          ],
          "relatedQueryKind": "router-issues",
          "repairAffordance": {
            "actionKind": "inspect-type-surface",
            "actionability": "manual",
            "changeDomain": "inspection",
            "planKind": "manual-inspection",
            "readiness": "inspection-required",
            "targetSourceCoverage": "not-applicable"
          },
          "sourceRole": "app-source",
          "subject": null,
          "taxonomy": {
            "actionability": "manual",
            "category": "project",
            "confidence": null,
            "impact": "degraded",
            "schema": "diagnostics-taxonomy/1"
          }
        },
        "file": "src/route-parameters/shared-route-parameters.ts",
        "impact": "degraded",
        "issues": [
          {
            "code": "shared-base-route-context-parameter-read",
            "kind": "shared-base-route-context-parameter-read",
            "message": "RouteContext parameter read on 'SharedRouteParameters' is shared by 2 routed components; declare the read on each concrete routed component or pass parameters into shared logic."
          }
        ],
        "message": "RouteContext parameter read on 'SharedRouteParameters' is shared by 2 routed components; declare the read on each concrete routed component or pass parameters into shared logic.",
        "related": [
          {
            "anomaly": null,
            "code": null,
            "file": "src/router-route-context-inherited-ownership-app.ts",
            "message": "Routed component 'account-route' inherits this RouteContext parameter read.",
            "sourceRole": null,
            "span": {
              "end": 508,
              "start": 496
            },
            "spanText": "AccountRoute",
            "uri": "fixtures://pressure/router-route-context-inherited-ownership/src/router-route-context-inherited-ownership-app.ts"
          },
          {
            "anomaly": null,
            "code": null,
            "file": "src/router-route-context-inherited-ownership-app.ts",
            "message": "Routed component 'project-route' inherits this RouteContext parameter read.",
            "sourceRole": null,
            "span": {
              "end": 608,
              "start": 596
            },
            "spanText": "ProjectRoute",
            "uri": "fixtures://pressure/router-route-context-inherited-ownership/src/router-route-context-inherited-ownership-app.ts"
          }
        ],
        "severity": "warning",
        "source": "semantic-runtime:router",
        "span": {
          "end": 243,
          "start": 178
        },
        "spanText": "resolve(IRouteContext).getRouteParameters<{ sharedId: string }>()",
        "status": "canonical",
        "uri": "fixtures://pressure/router-route-context-inherited-ownership/src/route-parameters/shared-route-parameters.ts"
      }
    ]
  },
  "surfaces": {
    "lsp": {
      "diagnosticCount": 1,
      "diagnostics": [
        {
          "actionability": "manual",
          "anomaly": null,
          "category": "project",
          "code": "shared-base-route-context-parameter-read",
          "data": {
            "diagnosticAuthority": "semantic-authoring-policy",
            "diagnosticDomain": "router",
            "diagnosticKind": "shared-base-route-context-parameter-read",
            "frameworkErrorCode": null,
            "frameworkRawErrorAuthority": null,
            "missingInput": null,
            "missingInputs": [],
            "phase": "route-context-parameter-read-ownership",
            "relatedInformation": [
              {
                "message": "Routed component 'account-route' inherits this RouteContext parameter read.",
                "source": {
                  "anchor": {
                    "kind": "source-file-address",
                    "label": "src/router-route-context-inherited-ownership-app.ts",
                    "path": "src/router-route-context-inherited-ownership-app.ts",
                    "sourceFileRole": "app-source",
                    "sourceWorkspaceKey": "router-route-context-inherited-ownership"
                  },
                  "end": 508,
                  "kind": "source-span-address",
                  "label": "src/router-route-context-inherited-ownership-app.ts@496..508",
                  "path": "src/router-route-context-inherited-ownership-app.ts",
                  "role": "range",
                  "sourceFileRole": "app-source",
                  "sourceWorkspaceKey": "router-route-context-inherited-ownership",
                  "start": 496
                }
              },
              {
                "message": "Routed component 'project-route' inherits this RouteContext parameter read.",
                "source": {
                  "anchor": {
                    "kind": "source-file-address",
                    "label": "src/router-route-context-inherited-ownership-app.ts",
                    "path": "src/router-route-context-inherited-ownership-app.ts",
                    "sourceFileRole": "app-source",
                    "sourceWorkspaceKey": "router-route-context-inherited-ownership"
                  },
                  "end": 608,
                  "kind": "source-span-address",
                  "label": "src/router-route-context-inherited-ownership-app.ts@596..608",
                  "path": "src/router-route-context-inherited-ownership-app.ts",
                  "role": "range",
                  "sourceFileRole": "app-source",
                  "sourceWorkspaceKey": "router-route-context-inherited-ownership",
                  "start": 596
                }
              }
            ],
            "relatedQueryKind": "router-issues",
            "repairAffordance": {
              "actionKind": "inspect-type-surface",
              "actionability": "manual",
              "changeDomain": "inspection",
              "planKind": "manual-inspection",
              "readiness": "inspection-required",
              "targetSourceCoverage": "not-applicable"
            },
            "sourceRole": "app-source",
            "subject": null,
            "taxonomy": {
              "actionability": "manual",
              "category": "project",
              "confidence": null,
              "impact": "degraded",
              "schema": "diagnostics-taxonomy/1"
            }
          },
          "file": "src/route-parameters/shared-route-parameters.ts",
          "impact": "degraded",
          "issues": [
            {
              "code": "shared-base-route-context-parameter-read",
              "kind": "shared-base-route-context-parameter-read",
              "message": "RouteContext parameter read on 'SharedRouteParameters' is shared by 2 routed components; declare the read on each concrete routed component or pass parameters into shared logic."
            }
          ],
          "message": "RouteContext parameter read on 'SharedRouteParameters' is shared by 2 routed components; declare the read on each concrete routed component or pass parameters into shared logic.",
          "related": [
            {
              "anomaly": null,
              "code": null,
              "file": "src/router-route-context-inherited-ownership-app.ts",
              "message": "Routed component 'account-route' inherits this RouteContext parameter read.",
              "sourceRole": null,
              "span": {
                "end": 508,
                "start": 496
              },
              "spanText": "AccountRoute",
              "uri": "fixtures://pressure/router-route-context-inherited-ownership/src/router-route-context-inherited-ownership-app.ts"
            },
            {
              "anomaly": null,
              "code": null,
              "file": "src/router-route-context-inherited-ownership-app.ts",
              "message": "Routed component 'project-route' inherits this RouteContext parameter read.",
              "sourceRole": null,
              "span": {
                "end": 608,
                "start": 596
              },
              "spanText": "ProjectRoute",
              "uri": "fixtures://pressure/router-route-context-inherited-ownership/src/router-route-context-inherited-ownership-app.ts"
            }
          ],
          "severity": "warning",
          "source": "semantic-runtime:router",
          "span": {
            "end": 243,
            "start": 178
          },
          "spanText": "resolve(IRouteContext).getRouteParameters<{ sharedId: string }>()",
          "status": "primary",
          "uri": "fixtures://pressure/router-route-context-inherited-ownership/src/route-parameters/shared-route-parameters.ts"
        }
      ]
    }
  },
  "uri": "fixtures://pressure/router-route-context-inherited-ownership/src/route-parameters/shared-route-parameters.ts"
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

## single-descendant-base-route-context-read

### Probe

```json
{
  "file": "src/route-parameters/single-route-parameters.ts"
}
```

### publishDiagnostics

```json
{
  "diagnosticCount": 0,
  "diagnostics": [],
  "outcome": "published",
  "uri": "fixtures://pressure/router-route-context-inherited-ownership/src/route-parameters/single-route-parameters.ts"
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
            "filePath": "src/route-parameters/single-route-parameters.ts"
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
            "filePath": "src/route-parameters/single-route-parameters.ts"
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
            "filePath": "src/route-parameters/single-route-parameters.ts"
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
    "summary": "Returned 0 app diagnostic(s)."
  },
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
  "surfaces": {
    "lsp": {
      "diagnosticCount": 0,
      "diagnostics": []
    }
  },
  "uri": "fixtures://pressure/router-route-context-inherited-ownership/src/route-parameters/single-route-parameters.ts"
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
