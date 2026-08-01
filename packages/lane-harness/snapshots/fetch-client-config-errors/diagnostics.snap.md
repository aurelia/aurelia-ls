# fetch-client-config-errors diagnostics lane snapshot

Fixture: `packages/semantic-runtime/fixtures/pressure/fetch-client-config-errors`
Probe file: `packages/lane-harness/probes/fetch-client-config-errors.probes.json`
Lane: `diagnostics`

This snapshot records observed language-server behavior. Operator verdicts live in the probe data.

## fetch-client-app-source

### Probe

```json
{
  "file": "src/fetch-client-config-errors-app.ts"
}
```

### publishDiagnostics

```json
{
  "diagnosticCount": 8,
  "diagnostics": [
    {
      "anomaly": null,
      "code": "AUR5002",
      "data": {
        "diagnosticAuthority": "framework-runtime-behavior",
        "diagnosticDomain": "fetch-client",
        "diagnosticKind": "configure-invalid-config",
        "frameworkErrorCode": "AUR5002",
        "frameworkRawErrorAuthority": null,
        "missingInput": null,
        "missingInputs": [],
        "phase": "http-client-configuration",
        "relatedInformation": [],
        "relatedQueryKind": "fetch-client-issues",
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
          "impact": "blocking",
          "schema": "diagnostics-taxonomy/1"
        }
      },
      "message": "HttpClient.configure(...) received a statically closed value that is neither an object nor a configuration callback.",
      "range": {
        "end": {
          "character": 35,
          "line": 29
        },
        "start": {
          "character": 26,
          "line": 29
        }
      },
      "rangeText": "42 as any",
      "relatedInformation": [],
      "severity": "error",
      "source": "aurelia"
    },
    {
      "anomaly": null,
      "code": "AUR5001",
      "data": {
        "diagnosticAuthority": "framework-runtime-behavior",
        "diagnosticDomain": "fetch-client",
        "diagnosticKind": "configure-invalid-return",
        "frameworkErrorCode": "AUR5001",
        "frameworkRawErrorAuthority": null,
        "missingInput": null,
        "missingInputs": [],
        "phase": "http-client-configuration",
        "relatedInformation": [],
        "relatedQueryKind": "fetch-client-issues",
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
          "impact": "blocking",
          "schema": "diagnostics-taxonomy/1"
        }
      },
      "message": "HttpClient.configure(...) callback returned a statically closed non-object value.",
      "range": {
        "end": {
          "character": 33,
          "line": 30
        },
        "start": {
          "character": 32,
          "line": 30
        }
      },
      "rangeText": "1",
      "relatedInformation": [],
      "severity": "error",
      "source": "aurelia"
    },
    {
      "anomaly": null,
      "code": "AUR5003",
      "data": {
        "diagnosticAuthority": "framework-runtime-behavior",
        "diagnosticDomain": "fetch-client",
        "diagnosticKind": "configure-invalid-header",
        "frameworkErrorCode": "AUR5003",
        "frameworkRawErrorAuthority": null,
        "missingInput": null,
        "missingInputs": [],
        "phase": "http-client-configuration",
        "relatedInformation": [],
        "relatedQueryKind": "fetch-client-issues",
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
          "impact": "blocking",
          "schema": "diagnostics-taxonomy/1"
        }
      },
      "message": "HttpClient.configure(...) defaults.headers is a Headers instance; Aurelia requires a plain object for default header merging.",
      "range": {
        "end": {
          "character": 50,
          "line": 31
        },
        "start": {
          "character": 37,
          "line": 31
        }
      },
      "rangeText": "new Headers()",
      "relatedInformation": [],
      "severity": "error",
      "source": "aurelia"
    },
    {
      "anomaly": null,
      "code": "AUR5004",
      "data": {
        "diagnosticAuthority": "framework-runtime-behavior",
        "diagnosticDomain": "fetch-client",
        "diagnosticKind": "more-than-one-retry-interceptor",
        "frameworkErrorCode": "AUR5004",
        "frameworkRawErrorAuthority": null,
        "missingInput": null,
        "missingInputs": [],
        "phase": "http-client-configuration",
        "relatedInformation": [],
        "relatedQueryKind": "fetch-client-issues",
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
          "impact": "blocking",
          "schema": "diagnostics-taxonomy/1"
        }
      },
      "message": "HttpClient.configure(...) statically configures more than one RetryInterceptor.",
      "range": {
        "end": {
          "character": 89,
          "line": 33
        },
        "start": {
          "character": 67,
          "line": 33
        }
      },
      "rangeText": "new RetryInterceptor()",
      "relatedInformation": [],
      "severity": "error",
      "source": "aurelia"
    },
    {
      "anomaly": null,
      "code": "AUR5005",
      "data": {
        "diagnosticAuthority": "framework-runtime-behavior",
        "diagnosticDomain": "fetch-client",
        "diagnosticKind": "retry-interceptor-not-last",
        "frameworkErrorCode": "AUR5005",
        "frameworkRawErrorAuthority": null,
        "missingInput": null,
        "missingInputs": [],
        "phase": "http-client-configuration",
        "relatedInformation": [],
        "relatedQueryKind": "fetch-client-issues",
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
          "impact": "blocking",
          "schema": "diagnostics-taxonomy/1"
        }
      },
      "message": "HttpClient.configure(...) statically configures a RetryInterceptor before another interceptor.",
      "range": {
        "end": {
          "character": 54,
          "line": 34
        },
        "start": {
          "character": 36,
          "line": 34
        }
      },
      "rangeText": "config.withRetry()",
      "relatedInformation": [],
      "severity": "error",
      "source": "aurelia"
    },
    {
      "anomaly": null,
      "code": "AUR5007",
      "data": {
        "diagnosticAuthority": "framework-runtime-behavior",
        "diagnosticDomain": "fetch-client",
        "diagnosticKind": "retry-interceptor-invalid-exponential-interval",
        "frameworkErrorCode": "AUR5007",
        "frameworkRawErrorAuthority": null,
        "missingInput": null,
        "missingInputs": [],
        "phase": "retry-interceptor-configuration",
        "relatedInformation": [],
        "relatedQueryKind": "fetch-client-issues",
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
          "impact": "blocking",
          "schema": "diagnostics-taxonomy/1"
        }
      },
      "message": "RetryInterceptor exponential strategy uses an interval less than or equal to one second.",
      "range": {
        "end": {
          "character": 106,
          "line": 35
        },
        "start": {
          "character": 102,
          "line": 35
        }
      },
      "rangeText": "1000",
      "relatedInformation": [],
      "severity": "error",
      "source": "aurelia"
    },
    {
      "anomaly": null,
      "code": "AUR5008",
      "data": {
        "diagnosticAuthority": "framework-runtime-behavior",
        "diagnosticDomain": "fetch-client",
        "diagnosticKind": "retry-interceptor-invalid-strategy",
        "frameworkErrorCode": "AUR5008",
        "frameworkRawErrorAuthority": null,
        "missingInput": null,
        "missingInputs": [],
        "phase": "retry-interceptor-configuration",
        "relatedInformation": [],
        "relatedQueryKind": "fetch-client-issues",
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
          "impact": "blocking",
          "schema": "diagnostics-taxonomy/1"
        }
      },
      "message": "RetryInterceptor strategy is statically outside Aurelia fetch-client RetryStrategy.",
      "range": {
        "end": {
          "character": 67,
          "line": 36
        },
        "start": {
          "character": 65,
          "line": 36
        }
      },
      "rangeText": "42",
      "relatedInformation": [],
      "severity": "error",
      "source": "aurelia"
    },
    {
      "anomaly": null,
      "code": "AUR5002",
      "data": {
        "diagnosticAuthority": "framework-runtime-behavior",
        "diagnosticDomain": "fetch-client",
        "diagnosticKind": "configure-invalid-config",
        "frameworkErrorCode": "AUR5002",
        "frameworkRawErrorAuthority": null,
        "missingInput": null,
        "missingInputs": [],
        "phase": "http-client-configuration",
        "relatedInformation": [],
        "relatedQueryKind": "fetch-client-issues",
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
          "impact": "blocking",
          "schema": "diagnostics-taxonomy/1"
        }
      },
      "message": "HttpClient.configure(...) received a statically closed value that is neither an object nor a configuration callback.",
      "range": {
        "end": {
          "character": 61,
          "line": 37
        },
        "start": {
          "character": 52,
          "line": 37
        }
      },
      "rangeText": "42 as any",
      "relatedInformation": [],
      "severity": "error",
      "source": "aurelia"
    }
  ],
  "outcome": "published",
  "uri": "fixtures://pressure/fetch-client-config-errors/src/fetch-client-config-errors-app.ts"
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
            "filePath": "src/fetch-client-config-errors-app.ts"
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
            "filePath": "src/fetch-client-config-errors-app.ts"
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
            "filePath": "src/fetch-client-config-errors-app.ts"
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
                  "label": "src/fetch-client-config-errors-app.ts",
                  "path": "src/fetch-client-config-errors-app.ts",
                  "sourceFileRole": "app-source",
                  "sourceWorkspaceKey": "fetch-client-config-errors"
                },
                "end": 1016,
                "kind": "source-span-address",
                "label": "src/fetch-client-config-errors-app.ts@1003..1016",
                "path": "src/fetch-client-config-errors-app.ts",
                "role": "primary",
                "sourceFileRole": "app-source",
                "sourceWorkspaceKey": "fetch-client-config-errors",
                "start": 1003
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
                  "label": "src/fetch-client-config-errors-app.ts",
                  "path": "src/fetch-client-config-errors-app.ts",
                  "sourceFileRole": "app-source",
                  "sourceWorkspaceKey": "fetch-client-config-errors"
                },
                "end": 1190,
                "kind": "source-span-address",
                "label": "src/fetch-client-config-errors-app.ts@1168..1190",
                "path": "src/fetch-client-config-errors-app.ts",
                "role": "primary",
                "sourceFileRole": "app-source",
                "sourceWorkspaceKey": "fetch-client-config-errors",
                "start": 1168
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
                  "label": "src/fetch-client-config-errors-app.ts",
                  "path": "src/fetch-client-config-errors-app.ts",
                  "sourceFileRole": "app-source",
                  "sourceWorkspaceKey": "fetch-client-config-errors"
                },
                "end": 1257,
                "kind": "source-span-address",
                "label": "src/fetch-client-config-errors-app.ts@1239..1257",
                "path": "src/fetch-client-config-errors-app.ts",
                "role": "primary",
                "sourceFileRole": "app-source",
                "sourceWorkspaceKey": "fetch-client-config-errors",
                "start": 1239
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
                  "label": "src/fetch-client-config-errors-app.ts",
                  "path": "src/fetch-client-config-errors-app.ts",
                  "sourceFileRole": "app-source",
                  "sourceWorkspaceKey": "fetch-client-config-errors"
                },
                "end": 1415,
                "kind": "source-span-address",
                "label": "src/fetch-client-config-errors-app.ts@1411..1415",
                "path": "src/fetch-client-config-errors-app.ts",
                "role": "primary",
                "sourceFileRole": "app-source",
                "sourceWorkspaceKey": "fetch-client-config-errors",
                "start": 1411
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
                  "label": "src/fetch-client-config-errors-app.ts",
                  "path": "src/fetch-client-config-errors-app.ts",
                  "sourceFileRole": "app-source",
                  "sourceWorkspaceKey": "fetch-client-config-errors"
                },
                "end": 1495,
                "kind": "source-span-address",
                "label": "src/fetch-client-config-errors-app.ts@1493..1495",
                "path": "src/fetch-client-config-errors-app.ts",
                "role": "primary",
                "sourceFileRole": "app-source",
                "sourceWorkspaceKey": "fetch-client-config-errors",
                "start": 1493
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
                  "label": "src/fetch-client-config-errors-app.ts",
                  "path": "src/fetch-client-config-errors-app.ts",
                  "sourceFileRole": "app-source",
                  "sourceWorkspaceKey": "fetch-client-config-errors"
                },
                "end": 1569,
                "kind": "source-span-address",
                "label": "src/fetch-client-config-errors-app.ts@1560..1569",
                "path": "src/fetch-client-config-errors-app.ts",
                "role": "primary",
                "sourceFileRole": "app-source",
                "sourceWorkspaceKey": "fetch-client-config-errors",
                "start": 1560
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
                  "label": "src/fetch-client-config-errors-app.ts",
                  "path": "src/fetch-client-config-errors-app.ts",
                  "sourceFileRole": "app-source",
                  "sourceWorkspaceKey": "fetch-client-config-errors"
                },
                "end": 920,
                "kind": "source-span-address",
                "label": "src/fetch-client-config-errors-app.ts@911..920",
                "path": "src/fetch-client-config-errors-app.ts",
                "role": "primary",
                "sourceFileRole": "app-source",
                "sourceWorkspaceKey": "fetch-client-config-errors",
                "start": 911
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
                  "label": "src/fetch-client-config-errors-app.ts",
                  "path": "src/fetch-client-config-errors-app.ts",
                  "sourceFileRole": "app-source",
                  "sourceWorkspaceKey": "fetch-client-config-errors"
                },
                "end": 956,
                "kind": "source-span-address",
                "label": "src/fetch-client-config-errors-app.ts@955..956",
                "path": "src/fetch-client-config-errors-app.ts",
                "role": "primary",
                "sourceFileRole": "app-source",
                "sourceWorkspaceKey": "fetch-client-config-errors",
                "start": 955
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
        "rationale": "Inspect fetch-client-issues rows referenced by returned diagnostics.",
        "targetQuery": {
          "kind": "fetch-client-issues",
          "page": {
            "size": 200
          }
        },
        "targetQueryKind": "fetch-client-issues"
      }
    ],
    "coverage": "complete",
    "page": null,
    "result": "answered",
    "schemaVersion": "0.2",
    "selection": "not-applicable",
    "summary": "Returned 8 app diagnostic(s)."
  },
  "outcome": "result",
  "presentation": {
    "complete": true,
    "contextualCount": 0,
    "groups": [
      {
        "groupKey": "row:diagnostic:6:fetch-client:configure-invalid-config:framework-runtime-behavior:AUR5002:src/fetch-client-config-errors-app.ts:911:920:no-missing-input",
        "maxRawSeverity": "error",
        "primary": {
          "diagnostic": {
            "actionability": "manual",
            "anomaly": null,
            "category": "project",
            "code": "AUR5002",
            "data": {
              "diagnosticAuthority": "framework-runtime-behavior",
              "diagnosticDomain": "fetch-client",
              "diagnosticKind": "configure-invalid-config",
              "frameworkErrorCode": "AUR5002",
              "frameworkRawErrorAuthority": null,
              "missingInput": null,
              "missingInputs": [],
              "phase": "http-client-configuration",
              "relatedInformation": [],
              "relatedQueryKind": "fetch-client-issues",
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
                "impact": "blocking",
                "schema": "diagnostics-taxonomy/1"
              }
            },
            "file": "src/fetch-client-config-errors-app.ts",
            "impact": "blocking",
            "issues": [
              {
                "code": "AUR5002",
                "kind": "configure-invalid-config",
                "message": "HttpClient.configure(...) received a statically closed value that is neither an object nor a configuration callback."
              }
            ],
            "message": "HttpClient.configure(...) received a statically closed value that is neither an object nor a configuration callback.",
            "related": [],
            "severity": "error",
            "source": "semantic-runtime:fetch-client",
            "span": {
              "end": 920,
              "start": 911
            },
            "spanText": "42 as any",
            "status": "primary",
            "uri": "fixtures://pressure/fetch-client-config-errors/src/fetch-client-config-errors-app.ts"
          },
          "relation": null,
          "role": "primary",
          "rowId": "diagnostic:6:fetch-client:configure-invalid-config:framework-runtime-behavior:AUR5002:src/fetch-client-config-errors-app.ts:911:920:no-missing-input"
        },
        "primarySeverity": "error",
        "rawRowCount": 1,
        "related": [],
        "subject": null
      },
      {
        "groupKey": "row:diagnostic:7:fetch-client:configure-invalid-return:framework-runtime-behavior:AUR5001:src/fetch-client-config-errors-app.ts:955:956:no-missing-input",
        "maxRawSeverity": "error",
        "primary": {
          "diagnostic": {
            "actionability": "manual",
            "anomaly": null,
            "category": "project",
            "code": "AUR5001",
            "data": {
              "diagnosticAuthority": "framework-runtime-behavior",
              "diagnosticDomain": "fetch-client",
              "diagnosticKind": "configure-invalid-return",
              "frameworkErrorCode": "AUR5001",
              "frameworkRawErrorAuthority": null,
              "missingInput": null,
              "missingInputs": [],
              "phase": "http-client-configuration",
              "relatedInformation": [],
              "relatedQueryKind": "fetch-client-issues",
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
                "impact": "blocking",
                "schema": "diagnostics-taxonomy/1"
              }
            },
            "file": "src/fetch-client-config-errors-app.ts",
            "impact": "blocking",
            "issues": [
              {
                "code": "AUR5001",
                "kind": "configure-invalid-return",
                "message": "HttpClient.configure(...) callback returned a statically closed non-object value."
              }
            ],
            "message": "HttpClient.configure(...) callback returned a statically closed non-object value.",
            "related": [],
            "severity": "error",
            "source": "semantic-runtime:fetch-client",
            "span": {
              "end": 956,
              "start": 955
            },
            "spanText": "1",
            "status": "primary",
            "uri": "fixtures://pressure/fetch-client-config-errors/src/fetch-client-config-errors-app.ts"
          },
          "relation": null,
          "role": "primary",
          "rowId": "diagnostic:7:fetch-client:configure-invalid-return:framework-runtime-behavior:AUR5001:src/fetch-client-config-errors-app.ts:955:956:no-missing-input"
        },
        "primarySeverity": "error",
        "rawRowCount": 1,
        "related": [],
        "subject": null
      },
      {
        "groupKey": "row:diagnostic:0:fetch-client:configure-invalid-header:framework-runtime-behavior:AUR5003:src/fetch-client-config-errors-app.ts:1003:1016:no-missing-input",
        "maxRawSeverity": "error",
        "primary": {
          "diagnostic": {
            "actionability": "manual",
            "anomaly": null,
            "category": "project",
            "code": "AUR5003",
            "data": {
              "diagnosticAuthority": "framework-runtime-behavior",
              "diagnosticDomain": "fetch-client",
              "diagnosticKind": "configure-invalid-header",
              "frameworkErrorCode": "AUR5003",
              "frameworkRawErrorAuthority": null,
              "missingInput": null,
              "missingInputs": [],
              "phase": "http-client-configuration",
              "relatedInformation": [],
              "relatedQueryKind": "fetch-client-issues",
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
                "impact": "blocking",
                "schema": "diagnostics-taxonomy/1"
              }
            },
            "file": "src/fetch-client-config-errors-app.ts",
            "impact": "blocking",
            "issues": [
              {
                "code": "AUR5003",
                "kind": "configure-invalid-header",
                "message": "HttpClient.configure(...) defaults.headers is a Headers instance; Aurelia requires a plain object for default header merging."
              }
            ],
            "message": "HttpClient.configure(...) defaults.headers is a Headers instance; Aurelia requires a plain object for default header merging.",
            "related": [],
            "severity": "error",
            "source": "semantic-runtime:fetch-client",
            "span": {
              "end": 1016,
              "start": 1003
            },
            "spanText": "new Headers()",
            "status": "primary",
            "uri": "fixtures://pressure/fetch-client-config-errors/src/fetch-client-config-errors-app.ts"
          },
          "relation": null,
          "role": "primary",
          "rowId": "diagnostic:0:fetch-client:configure-invalid-header:framework-runtime-behavior:AUR5003:src/fetch-client-config-errors-app.ts:1003:1016:no-missing-input"
        },
        "primarySeverity": "error",
        "rawRowCount": 1,
        "related": [],
        "subject": null
      },
      {
        "groupKey": "row:diagnostic:1:fetch-client:more-than-one-retry-interceptor:framework-runtime-behavior:AUR5004:src/fetch-client-config-errors-app.ts:1168:1190:no-missing-input",
        "maxRawSeverity": "error",
        "primary": {
          "diagnostic": {
            "actionability": "manual",
            "anomaly": null,
            "category": "project",
            "code": "AUR5004",
            "data": {
              "diagnosticAuthority": "framework-runtime-behavior",
              "diagnosticDomain": "fetch-client",
              "diagnosticKind": "more-than-one-retry-interceptor",
              "frameworkErrorCode": "AUR5004",
              "frameworkRawErrorAuthority": null,
              "missingInput": null,
              "missingInputs": [],
              "phase": "http-client-configuration",
              "relatedInformation": [],
              "relatedQueryKind": "fetch-client-issues",
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
                "impact": "blocking",
                "schema": "diagnostics-taxonomy/1"
              }
            },
            "file": "src/fetch-client-config-errors-app.ts",
            "impact": "blocking",
            "issues": [
              {
                "code": "AUR5004",
                "kind": "more-than-one-retry-interceptor",
                "message": "HttpClient.configure(...) statically configures more than one RetryInterceptor."
              }
            ],
            "message": "HttpClient.configure(...) statically configures more than one RetryInterceptor.",
            "related": [],
            "severity": "error",
            "source": "semantic-runtime:fetch-client",
            "span": {
              "end": 1190,
              "start": 1168
            },
            "spanText": "new RetryInterceptor()",
            "status": "primary",
            "uri": "fixtures://pressure/fetch-client-config-errors/src/fetch-client-config-errors-app.ts"
          },
          "relation": null,
          "role": "primary",
          "rowId": "diagnostic:1:fetch-client:more-than-one-retry-interceptor:framework-runtime-behavior:AUR5004:src/fetch-client-config-errors-app.ts:1168:1190:no-missing-input"
        },
        "primarySeverity": "error",
        "rawRowCount": 1,
        "related": [],
        "subject": null
      },
      {
        "groupKey": "row:diagnostic:2:fetch-client:retry-interceptor-not-last:framework-runtime-behavior:AUR5005:src/fetch-client-config-errors-app.ts:1239:1257:no-missing-input",
        "maxRawSeverity": "error",
        "primary": {
          "diagnostic": {
            "actionability": "manual",
            "anomaly": null,
            "category": "project",
            "code": "AUR5005",
            "data": {
              "diagnosticAuthority": "framework-runtime-behavior",
              "diagnosticDomain": "fetch-client",
              "diagnosticKind": "retry-interceptor-not-last",
              "frameworkErrorCode": "AUR5005",
              "frameworkRawErrorAuthority": null,
              "missingInput": null,
              "missingInputs": [],
              "phase": "http-client-configuration",
              "relatedInformation": [],
              "relatedQueryKind": "fetch-client-issues",
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
                "impact": "blocking",
                "schema": "diagnostics-taxonomy/1"
              }
            },
            "file": "src/fetch-client-config-errors-app.ts",
            "impact": "blocking",
            "issues": [
              {
                "code": "AUR5005",
                "kind": "retry-interceptor-not-last",
                "message": "HttpClient.configure(...) statically configures a RetryInterceptor before another interceptor."
              }
            ],
            "message": "HttpClient.configure(...) statically configures a RetryInterceptor before another interceptor.",
            "related": [],
            "severity": "error",
            "source": "semantic-runtime:fetch-client",
            "span": {
              "end": 1257,
              "start": 1239
            },
            "spanText": "config.withRetry()",
            "status": "primary",
            "uri": "fixtures://pressure/fetch-client-config-errors/src/fetch-client-config-errors-app.ts"
          },
          "relation": null,
          "role": "primary",
          "rowId": "diagnostic:2:fetch-client:retry-interceptor-not-last:framework-runtime-behavior:AUR5005:src/fetch-client-config-errors-app.ts:1239:1257:no-missing-input"
        },
        "primarySeverity": "error",
        "rawRowCount": 1,
        "related": [],
        "subject": null
      },
      {
        "groupKey": "row:diagnostic:3:fetch-client:retry-interceptor-invalid-exponential-interval:framework-runtime-behavior:AUR5007:src/fetch-client-config-errors-app.ts:1411:1415:no-missing-input",
        "maxRawSeverity": "error",
        "primary": {
          "diagnostic": {
            "actionability": "manual",
            "anomaly": null,
            "category": "project",
            "code": "AUR5007",
            "data": {
              "diagnosticAuthority": "framework-runtime-behavior",
              "diagnosticDomain": "fetch-client",
              "diagnosticKind": "retry-interceptor-invalid-exponential-interval",
              "frameworkErrorCode": "AUR5007",
              "frameworkRawErrorAuthority": null,
              "missingInput": null,
              "missingInputs": [],
              "phase": "retry-interceptor-configuration",
              "relatedInformation": [],
              "relatedQueryKind": "fetch-client-issues",
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
                "impact": "blocking",
                "schema": "diagnostics-taxonomy/1"
              }
            },
            "file": "src/fetch-client-config-errors-app.ts",
            "impact": "blocking",
            "issues": [
              {
                "code": "AUR5007",
                "kind": "retry-interceptor-invalid-exponential-interval",
                "message": "RetryInterceptor exponential strategy uses an interval less than or equal to one second."
              }
            ],
            "message": "RetryInterceptor exponential strategy uses an interval less than or equal to one second.",
            "related": [],
            "severity": "error",
            "source": "semantic-runtime:fetch-client",
            "span": {
              "end": 1415,
              "start": 1411
            },
            "spanText": "1000",
            "status": "primary",
            "uri": "fixtures://pressure/fetch-client-config-errors/src/fetch-client-config-errors-app.ts"
          },
          "relation": null,
          "role": "primary",
          "rowId": "diagnostic:3:fetch-client:retry-interceptor-invalid-exponential-interval:framework-runtime-behavior:AUR5007:src/fetch-client-config-errors-app.ts:1411:1415:no-missing-input"
        },
        "primarySeverity": "error",
        "rawRowCount": 1,
        "related": [],
        "subject": null
      },
      {
        "groupKey": "row:diagnostic:4:fetch-client:retry-interceptor-invalid-strategy:framework-runtime-behavior:AUR5008:src/fetch-client-config-errors-app.ts:1493:1495:no-missing-input",
        "maxRawSeverity": "error",
        "primary": {
          "diagnostic": {
            "actionability": "manual",
            "anomaly": null,
            "category": "project",
            "code": "AUR5008",
            "data": {
              "diagnosticAuthority": "framework-runtime-behavior",
              "diagnosticDomain": "fetch-client",
              "diagnosticKind": "retry-interceptor-invalid-strategy",
              "frameworkErrorCode": "AUR5008",
              "frameworkRawErrorAuthority": null,
              "missingInput": null,
              "missingInputs": [],
              "phase": "retry-interceptor-configuration",
              "relatedInformation": [],
              "relatedQueryKind": "fetch-client-issues",
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
                "impact": "blocking",
                "schema": "diagnostics-taxonomy/1"
              }
            },
            "file": "src/fetch-client-config-errors-app.ts",
            "impact": "blocking",
            "issues": [
              {
                "code": "AUR5008",
                "kind": "retry-interceptor-invalid-strategy",
                "message": "RetryInterceptor strategy is statically outside Aurelia fetch-client RetryStrategy."
              }
            ],
            "message": "RetryInterceptor strategy is statically outside Aurelia fetch-client RetryStrategy.",
            "related": [],
            "severity": "error",
            "source": "semantic-runtime:fetch-client",
            "span": {
              "end": 1495,
              "start": 1493
            },
            "spanText": "42",
            "status": "primary",
            "uri": "fixtures://pressure/fetch-client-config-errors/src/fetch-client-config-errors-app.ts"
          },
          "relation": null,
          "role": "primary",
          "rowId": "diagnostic:4:fetch-client:retry-interceptor-invalid-strategy:framework-runtime-behavior:AUR5008:src/fetch-client-config-errors-app.ts:1493:1495:no-missing-input"
        },
        "primarySeverity": "error",
        "rawRowCount": 1,
        "related": [],
        "subject": null
      },
      {
        "groupKey": "row:diagnostic:5:fetch-client:configure-invalid-config:framework-runtime-behavior:AUR5002:src/fetch-client-config-errors-app.ts:1560:1569:no-missing-input",
        "maxRawSeverity": "error",
        "primary": {
          "diagnostic": {
            "actionability": "manual",
            "anomaly": null,
            "category": "project",
            "code": "AUR5002",
            "data": {
              "diagnosticAuthority": "framework-runtime-behavior",
              "diagnosticDomain": "fetch-client",
              "diagnosticKind": "configure-invalid-config",
              "frameworkErrorCode": "AUR5002",
              "frameworkRawErrorAuthority": null,
              "missingInput": null,
              "missingInputs": [],
              "phase": "http-client-configuration",
              "relatedInformation": [],
              "relatedQueryKind": "fetch-client-issues",
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
                "impact": "blocking",
                "schema": "diagnostics-taxonomy/1"
              }
            },
            "file": "src/fetch-client-config-errors-app.ts",
            "impact": "blocking",
            "issues": [
              {
                "code": "AUR5002",
                "kind": "configure-invalid-config",
                "message": "HttpClient.configure(...) received a statically closed value that is neither an object nor a configuration callback."
              }
            ],
            "message": "HttpClient.configure(...) received a statically closed value that is neither an object nor a configuration callback.",
            "related": [],
            "severity": "error",
            "source": "semantic-runtime:fetch-client",
            "span": {
              "end": 1569,
              "start": 1560
            },
            "spanText": "42 as any",
            "status": "primary",
            "uri": "fixtures://pressure/fetch-client-config-errors/src/fetch-client-config-errors-app.ts"
          },
          "relation": null,
          "role": "primary",
          "rowId": "diagnostic:5:fetch-client:configure-invalid-config:framework-runtime-behavior:AUR5002:src/fetch-client-config-errors-app.ts:1560:1569:no-missing-input"
        },
        "primarySeverity": "error",
        "rawRowCount": 1,
        "related": [],
        "subject": null
      }
    ],
    "primaryCount": 8,
    "rawRowCount": 8
  },
  "raw": {
    "diagnosticCount": 8,
    "diagnostics": [
      {
        "actionability": "manual",
        "anomaly": null,
        "category": "project",
        "code": "AUR5003",
        "data": {
          "diagnosticAuthority": "framework-runtime-behavior",
          "diagnosticDomain": "fetch-client",
          "diagnosticKind": "configure-invalid-header",
          "frameworkErrorCode": "AUR5003",
          "frameworkRawErrorAuthority": null,
          "missingInput": null,
          "missingInputs": [],
          "phase": "http-client-configuration",
          "relatedInformation": [],
          "relatedQueryKind": "fetch-client-issues",
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
            "impact": "blocking",
            "schema": "diagnostics-taxonomy/1"
          }
        },
        "file": "src/fetch-client-config-errors-app.ts",
        "impact": "blocking",
        "issues": [
          {
            "code": "AUR5003",
            "kind": "configure-invalid-header",
            "message": "HttpClient.configure(...) defaults.headers is a Headers instance; Aurelia requires a plain object for default header merging."
          }
        ],
        "message": "HttpClient.configure(...) defaults.headers is a Headers instance; Aurelia requires a plain object for default header merging.",
        "related": [],
        "severity": "error",
        "source": "semantic-runtime:fetch-client",
        "span": {
          "end": 1016,
          "start": 1003
        },
        "spanText": "new Headers()",
        "status": "canonical",
        "uri": "fixtures://pressure/fetch-client-config-errors/src/fetch-client-config-errors-app.ts"
      },
      {
        "actionability": "manual",
        "anomaly": null,
        "category": "project",
        "code": "AUR5004",
        "data": {
          "diagnosticAuthority": "framework-runtime-behavior",
          "diagnosticDomain": "fetch-client",
          "diagnosticKind": "more-than-one-retry-interceptor",
          "frameworkErrorCode": "AUR5004",
          "frameworkRawErrorAuthority": null,
          "missingInput": null,
          "missingInputs": [],
          "phase": "http-client-configuration",
          "relatedInformation": [],
          "relatedQueryKind": "fetch-client-issues",
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
            "impact": "blocking",
            "schema": "diagnostics-taxonomy/1"
          }
        },
        "file": "src/fetch-client-config-errors-app.ts",
        "impact": "blocking",
        "issues": [
          {
            "code": "AUR5004",
            "kind": "more-than-one-retry-interceptor",
            "message": "HttpClient.configure(...) statically configures more than one RetryInterceptor."
          }
        ],
        "message": "HttpClient.configure(...) statically configures more than one RetryInterceptor.",
        "related": [],
        "severity": "error",
        "source": "semantic-runtime:fetch-client",
        "span": {
          "end": 1190,
          "start": 1168
        },
        "spanText": "new RetryInterceptor()",
        "status": "canonical",
        "uri": "fixtures://pressure/fetch-client-config-errors/src/fetch-client-config-errors-app.ts"
      },
      {
        "actionability": "manual",
        "anomaly": null,
        "category": "project",
        "code": "AUR5005",
        "data": {
          "diagnosticAuthority": "framework-runtime-behavior",
          "diagnosticDomain": "fetch-client",
          "diagnosticKind": "retry-interceptor-not-last",
          "frameworkErrorCode": "AUR5005",
          "frameworkRawErrorAuthority": null,
          "missingInput": null,
          "missingInputs": [],
          "phase": "http-client-configuration",
          "relatedInformation": [],
          "relatedQueryKind": "fetch-client-issues",
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
            "impact": "blocking",
            "schema": "diagnostics-taxonomy/1"
          }
        },
        "file": "src/fetch-client-config-errors-app.ts",
        "impact": "blocking",
        "issues": [
          {
            "code": "AUR5005",
            "kind": "retry-interceptor-not-last",
            "message": "HttpClient.configure(...) statically configures a RetryInterceptor before another interceptor."
          }
        ],
        "message": "HttpClient.configure(...) statically configures a RetryInterceptor before another interceptor.",
        "related": [],
        "severity": "error",
        "source": "semantic-runtime:fetch-client",
        "span": {
          "end": 1257,
          "start": 1239
        },
        "spanText": "config.withRetry()",
        "status": "canonical",
        "uri": "fixtures://pressure/fetch-client-config-errors/src/fetch-client-config-errors-app.ts"
      },
      {
        "actionability": "manual",
        "anomaly": null,
        "category": "project",
        "code": "AUR5007",
        "data": {
          "diagnosticAuthority": "framework-runtime-behavior",
          "diagnosticDomain": "fetch-client",
          "diagnosticKind": "retry-interceptor-invalid-exponential-interval",
          "frameworkErrorCode": "AUR5007",
          "frameworkRawErrorAuthority": null,
          "missingInput": null,
          "missingInputs": [],
          "phase": "retry-interceptor-configuration",
          "relatedInformation": [],
          "relatedQueryKind": "fetch-client-issues",
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
            "impact": "blocking",
            "schema": "diagnostics-taxonomy/1"
          }
        },
        "file": "src/fetch-client-config-errors-app.ts",
        "impact": "blocking",
        "issues": [
          {
            "code": "AUR5007",
            "kind": "retry-interceptor-invalid-exponential-interval",
            "message": "RetryInterceptor exponential strategy uses an interval less than or equal to one second."
          }
        ],
        "message": "RetryInterceptor exponential strategy uses an interval less than or equal to one second.",
        "related": [],
        "severity": "error",
        "source": "semantic-runtime:fetch-client",
        "span": {
          "end": 1415,
          "start": 1411
        },
        "spanText": "1000",
        "status": "canonical",
        "uri": "fixtures://pressure/fetch-client-config-errors/src/fetch-client-config-errors-app.ts"
      },
      {
        "actionability": "manual",
        "anomaly": null,
        "category": "project",
        "code": "AUR5008",
        "data": {
          "diagnosticAuthority": "framework-runtime-behavior",
          "diagnosticDomain": "fetch-client",
          "diagnosticKind": "retry-interceptor-invalid-strategy",
          "frameworkErrorCode": "AUR5008",
          "frameworkRawErrorAuthority": null,
          "missingInput": null,
          "missingInputs": [],
          "phase": "retry-interceptor-configuration",
          "relatedInformation": [],
          "relatedQueryKind": "fetch-client-issues",
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
            "impact": "blocking",
            "schema": "diagnostics-taxonomy/1"
          }
        },
        "file": "src/fetch-client-config-errors-app.ts",
        "impact": "blocking",
        "issues": [
          {
            "code": "AUR5008",
            "kind": "retry-interceptor-invalid-strategy",
            "message": "RetryInterceptor strategy is statically outside Aurelia fetch-client RetryStrategy."
          }
        ],
        "message": "RetryInterceptor strategy is statically outside Aurelia fetch-client RetryStrategy.",
        "related": [],
        "severity": "error",
        "source": "semantic-runtime:fetch-client",
        "span": {
          "end": 1495,
          "start": 1493
        },
        "spanText": "42",
        "status": "canonical",
        "uri": "fixtures://pressure/fetch-client-config-errors/src/fetch-client-config-errors-app.ts"
      },
      {
        "actionability": "manual",
        "anomaly": null,
        "category": "project",
        "code": "AUR5002",
        "data": {
          "diagnosticAuthority": "framework-runtime-behavior",
          "diagnosticDomain": "fetch-client",
          "diagnosticKind": "configure-invalid-config",
          "frameworkErrorCode": "AUR5002",
          "frameworkRawErrorAuthority": null,
          "missingInput": null,
          "missingInputs": [],
          "phase": "http-client-configuration",
          "relatedInformation": [],
          "relatedQueryKind": "fetch-client-issues",
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
            "impact": "blocking",
            "schema": "diagnostics-taxonomy/1"
          }
        },
        "file": "src/fetch-client-config-errors-app.ts",
        "impact": "blocking",
        "issues": [
          {
            "code": "AUR5002",
            "kind": "configure-invalid-config",
            "message": "HttpClient.configure(...) received a statically closed value that is neither an object nor a configuration callback."
          }
        ],
        "message": "HttpClient.configure(...) received a statically closed value that is neither an object nor a configuration callback.",
        "related": [],
        "severity": "error",
        "source": "semantic-runtime:fetch-client",
        "span": {
          "end": 1569,
          "start": 1560
        },
        "spanText": "42 as any",
        "status": "canonical",
        "uri": "fixtures://pressure/fetch-client-config-errors/src/fetch-client-config-errors-app.ts"
      },
      {
        "actionability": "manual",
        "anomaly": null,
        "category": "project",
        "code": "AUR5002",
        "data": {
          "diagnosticAuthority": "framework-runtime-behavior",
          "diagnosticDomain": "fetch-client",
          "diagnosticKind": "configure-invalid-config",
          "frameworkErrorCode": "AUR5002",
          "frameworkRawErrorAuthority": null,
          "missingInput": null,
          "missingInputs": [],
          "phase": "http-client-configuration",
          "relatedInformation": [],
          "relatedQueryKind": "fetch-client-issues",
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
            "impact": "blocking",
            "schema": "diagnostics-taxonomy/1"
          }
        },
        "file": "src/fetch-client-config-errors-app.ts",
        "impact": "blocking",
        "issues": [
          {
            "code": "AUR5002",
            "kind": "configure-invalid-config",
            "message": "HttpClient.configure(...) received a statically closed value that is neither an object nor a configuration callback."
          }
        ],
        "message": "HttpClient.configure(...) received a statically closed value that is neither an object nor a configuration callback.",
        "related": [],
        "severity": "error",
        "source": "semantic-runtime:fetch-client",
        "span": {
          "end": 920,
          "start": 911
        },
        "spanText": "42 as any",
        "status": "canonical",
        "uri": "fixtures://pressure/fetch-client-config-errors/src/fetch-client-config-errors-app.ts"
      },
      {
        "actionability": "manual",
        "anomaly": null,
        "category": "project",
        "code": "AUR5001",
        "data": {
          "diagnosticAuthority": "framework-runtime-behavior",
          "diagnosticDomain": "fetch-client",
          "diagnosticKind": "configure-invalid-return",
          "frameworkErrorCode": "AUR5001",
          "frameworkRawErrorAuthority": null,
          "missingInput": null,
          "missingInputs": [],
          "phase": "http-client-configuration",
          "relatedInformation": [],
          "relatedQueryKind": "fetch-client-issues",
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
            "impact": "blocking",
            "schema": "diagnostics-taxonomy/1"
          }
        },
        "file": "src/fetch-client-config-errors-app.ts",
        "impact": "blocking",
        "issues": [
          {
            "code": "AUR5001",
            "kind": "configure-invalid-return",
            "message": "HttpClient.configure(...) callback returned a statically closed non-object value."
          }
        ],
        "message": "HttpClient.configure(...) callback returned a statically closed non-object value.",
        "related": [],
        "severity": "error",
        "source": "semantic-runtime:fetch-client",
        "span": {
          "end": 956,
          "start": 955
        },
        "spanText": "1",
        "status": "canonical",
        "uri": "fixtures://pressure/fetch-client-config-errors/src/fetch-client-config-errors-app.ts"
      }
    ]
  },
  "surfaces": {
    "lsp": {
      "diagnosticCount": 8,
      "diagnostics": [
        {
          "actionability": "manual",
          "anomaly": null,
          "category": "project",
          "code": "AUR5002",
          "data": {
            "diagnosticAuthority": "framework-runtime-behavior",
            "diagnosticDomain": "fetch-client",
            "diagnosticKind": "configure-invalid-config",
            "frameworkErrorCode": "AUR5002",
            "frameworkRawErrorAuthority": null,
            "missingInput": null,
            "missingInputs": [],
            "phase": "http-client-configuration",
            "relatedInformation": [],
            "relatedQueryKind": "fetch-client-issues",
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
              "impact": "blocking",
              "schema": "diagnostics-taxonomy/1"
            }
          },
          "file": "src/fetch-client-config-errors-app.ts",
          "impact": "blocking",
          "issues": [
            {
              "code": "AUR5002",
              "kind": "configure-invalid-config",
              "message": "HttpClient.configure(...) received a statically closed value that is neither an object nor a configuration callback."
            }
          ],
          "message": "HttpClient.configure(...) received a statically closed value that is neither an object nor a configuration callback.",
          "related": [],
          "severity": "error",
          "source": "semantic-runtime:fetch-client",
          "span": {
            "end": 920,
            "start": 911
          },
          "spanText": "42 as any",
          "status": "primary",
          "uri": "fixtures://pressure/fetch-client-config-errors/src/fetch-client-config-errors-app.ts"
        },
        {
          "actionability": "manual",
          "anomaly": null,
          "category": "project",
          "code": "AUR5001",
          "data": {
            "diagnosticAuthority": "framework-runtime-behavior",
            "diagnosticDomain": "fetch-client",
            "diagnosticKind": "configure-invalid-return",
            "frameworkErrorCode": "AUR5001",
            "frameworkRawErrorAuthority": null,
            "missingInput": null,
            "missingInputs": [],
            "phase": "http-client-configuration",
            "relatedInformation": [],
            "relatedQueryKind": "fetch-client-issues",
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
              "impact": "blocking",
              "schema": "diagnostics-taxonomy/1"
            }
          },
          "file": "src/fetch-client-config-errors-app.ts",
          "impact": "blocking",
          "issues": [
            {
              "code": "AUR5001",
              "kind": "configure-invalid-return",
              "message": "HttpClient.configure(...) callback returned a statically closed non-object value."
            }
          ],
          "message": "HttpClient.configure(...) callback returned a statically closed non-object value.",
          "related": [],
          "severity": "error",
          "source": "semantic-runtime:fetch-client",
          "span": {
            "end": 956,
            "start": 955
          },
          "spanText": "1",
          "status": "primary",
          "uri": "fixtures://pressure/fetch-client-config-errors/src/fetch-client-config-errors-app.ts"
        },
        {
          "actionability": "manual",
          "anomaly": null,
          "category": "project",
          "code": "AUR5003",
          "data": {
            "diagnosticAuthority": "framework-runtime-behavior",
            "diagnosticDomain": "fetch-client",
            "diagnosticKind": "configure-invalid-header",
            "frameworkErrorCode": "AUR5003",
            "frameworkRawErrorAuthority": null,
            "missingInput": null,
            "missingInputs": [],
            "phase": "http-client-configuration",
            "relatedInformation": [],
            "relatedQueryKind": "fetch-client-issues",
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
              "impact": "blocking",
              "schema": "diagnostics-taxonomy/1"
            }
          },
          "file": "src/fetch-client-config-errors-app.ts",
          "impact": "blocking",
          "issues": [
            {
              "code": "AUR5003",
              "kind": "configure-invalid-header",
              "message": "HttpClient.configure(...) defaults.headers is a Headers instance; Aurelia requires a plain object for default header merging."
            }
          ],
          "message": "HttpClient.configure(...) defaults.headers is a Headers instance; Aurelia requires a plain object for default header merging.",
          "related": [],
          "severity": "error",
          "source": "semantic-runtime:fetch-client",
          "span": {
            "end": 1016,
            "start": 1003
          },
          "spanText": "new Headers()",
          "status": "primary",
          "uri": "fixtures://pressure/fetch-client-config-errors/src/fetch-client-config-errors-app.ts"
        },
        {
          "actionability": "manual",
          "anomaly": null,
          "category": "project",
          "code": "AUR5004",
          "data": {
            "diagnosticAuthority": "framework-runtime-behavior",
            "diagnosticDomain": "fetch-client",
            "diagnosticKind": "more-than-one-retry-interceptor",
            "frameworkErrorCode": "AUR5004",
            "frameworkRawErrorAuthority": null,
            "missingInput": null,
            "missingInputs": [],
            "phase": "http-client-configuration",
            "relatedInformation": [],
            "relatedQueryKind": "fetch-client-issues",
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
              "impact": "blocking",
              "schema": "diagnostics-taxonomy/1"
            }
          },
          "file": "src/fetch-client-config-errors-app.ts",
          "impact": "blocking",
          "issues": [
            {
              "code": "AUR5004",
              "kind": "more-than-one-retry-interceptor",
              "message": "HttpClient.configure(...) statically configures more than one RetryInterceptor."
            }
          ],
          "message": "HttpClient.configure(...) statically configures more than one RetryInterceptor.",
          "related": [],
          "severity": "error",
          "source": "semantic-runtime:fetch-client",
          "span": {
            "end": 1190,
            "start": 1168
          },
          "spanText": "new RetryInterceptor()",
          "status": "primary",
          "uri": "fixtures://pressure/fetch-client-config-errors/src/fetch-client-config-errors-app.ts"
        },
        {
          "actionability": "manual",
          "anomaly": null,
          "category": "project",
          "code": "AUR5005",
          "data": {
            "diagnosticAuthority": "framework-runtime-behavior",
            "diagnosticDomain": "fetch-client",
            "diagnosticKind": "retry-interceptor-not-last",
            "frameworkErrorCode": "AUR5005",
            "frameworkRawErrorAuthority": null,
            "missingInput": null,
            "missingInputs": [],
            "phase": "http-client-configuration",
            "relatedInformation": [],
            "relatedQueryKind": "fetch-client-issues",
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
              "impact": "blocking",
              "schema": "diagnostics-taxonomy/1"
            }
          },
          "file": "src/fetch-client-config-errors-app.ts",
          "impact": "blocking",
          "issues": [
            {
              "code": "AUR5005",
              "kind": "retry-interceptor-not-last",
              "message": "HttpClient.configure(...) statically configures a RetryInterceptor before another interceptor."
            }
          ],
          "message": "HttpClient.configure(...) statically configures a RetryInterceptor before another interceptor.",
          "related": [],
          "severity": "error",
          "source": "semantic-runtime:fetch-client",
          "span": {
            "end": 1257,
            "start": 1239
          },
          "spanText": "config.withRetry()",
          "status": "primary",
          "uri": "fixtures://pressure/fetch-client-config-errors/src/fetch-client-config-errors-app.ts"
        },
        {
          "actionability": "manual",
          "anomaly": null,
          "category": "project",
          "code": "AUR5007",
          "data": {
            "diagnosticAuthority": "framework-runtime-behavior",
            "diagnosticDomain": "fetch-client",
            "diagnosticKind": "retry-interceptor-invalid-exponential-interval",
            "frameworkErrorCode": "AUR5007",
            "frameworkRawErrorAuthority": null,
            "missingInput": null,
            "missingInputs": [],
            "phase": "retry-interceptor-configuration",
            "relatedInformation": [],
            "relatedQueryKind": "fetch-client-issues",
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
              "impact": "blocking",
              "schema": "diagnostics-taxonomy/1"
            }
          },
          "file": "src/fetch-client-config-errors-app.ts",
          "impact": "blocking",
          "issues": [
            {
              "code": "AUR5007",
              "kind": "retry-interceptor-invalid-exponential-interval",
              "message": "RetryInterceptor exponential strategy uses an interval less than or equal to one second."
            }
          ],
          "message": "RetryInterceptor exponential strategy uses an interval less than or equal to one second.",
          "related": [],
          "severity": "error",
          "source": "semantic-runtime:fetch-client",
          "span": {
            "end": 1415,
            "start": 1411
          },
          "spanText": "1000",
          "status": "primary",
          "uri": "fixtures://pressure/fetch-client-config-errors/src/fetch-client-config-errors-app.ts"
        },
        {
          "actionability": "manual",
          "anomaly": null,
          "category": "project",
          "code": "AUR5008",
          "data": {
            "diagnosticAuthority": "framework-runtime-behavior",
            "diagnosticDomain": "fetch-client",
            "diagnosticKind": "retry-interceptor-invalid-strategy",
            "frameworkErrorCode": "AUR5008",
            "frameworkRawErrorAuthority": null,
            "missingInput": null,
            "missingInputs": [],
            "phase": "retry-interceptor-configuration",
            "relatedInformation": [],
            "relatedQueryKind": "fetch-client-issues",
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
              "impact": "blocking",
              "schema": "diagnostics-taxonomy/1"
            }
          },
          "file": "src/fetch-client-config-errors-app.ts",
          "impact": "blocking",
          "issues": [
            {
              "code": "AUR5008",
              "kind": "retry-interceptor-invalid-strategy",
              "message": "RetryInterceptor strategy is statically outside Aurelia fetch-client RetryStrategy."
            }
          ],
          "message": "RetryInterceptor strategy is statically outside Aurelia fetch-client RetryStrategy.",
          "related": [],
          "severity": "error",
          "source": "semantic-runtime:fetch-client",
          "span": {
            "end": 1495,
            "start": 1493
          },
          "spanText": "42",
          "status": "primary",
          "uri": "fixtures://pressure/fetch-client-config-errors/src/fetch-client-config-errors-app.ts"
        },
        {
          "actionability": "manual",
          "anomaly": null,
          "category": "project",
          "code": "AUR5002",
          "data": {
            "diagnosticAuthority": "framework-runtime-behavior",
            "diagnosticDomain": "fetch-client",
            "diagnosticKind": "configure-invalid-config",
            "frameworkErrorCode": "AUR5002",
            "frameworkRawErrorAuthority": null,
            "missingInput": null,
            "missingInputs": [],
            "phase": "http-client-configuration",
            "relatedInformation": [],
            "relatedQueryKind": "fetch-client-issues",
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
              "impact": "blocking",
              "schema": "diagnostics-taxonomy/1"
            }
          },
          "file": "src/fetch-client-config-errors-app.ts",
          "impact": "blocking",
          "issues": [
            {
              "code": "AUR5002",
              "kind": "configure-invalid-config",
              "message": "HttpClient.configure(...) received a statically closed value that is neither an object nor a configuration callback."
            }
          ],
          "message": "HttpClient.configure(...) received a statically closed value that is neither an object nor a configuration callback.",
          "related": [],
          "severity": "error",
          "source": "semantic-runtime:fetch-client",
          "span": {
            "end": 1569,
            "start": 1560
          },
          "spanText": "42 as any",
          "status": "primary",
          "uri": "fixtures://pressure/fetch-client-config-errors/src/fetch-client-config-errors-app.ts"
        }
      ]
    }
  },
  "uri": "fixtures://pressure/fetch-client-config-errors/src/fetch-client-config-errors-app.ts"
}
```

### Alignment

```json
{
  "comparisonKey": "domain/kind/code/severity/text/message",
  "countsMatch": true,
  "customLspSurfaceCount": 8,
  "customOnly": [],
  "lspOnly": [],
  "lspPublishCount": 8,
  "suppressedCount": 0
}
```
