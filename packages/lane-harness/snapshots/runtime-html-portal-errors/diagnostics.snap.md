# runtime-html-portal-errors diagnostics lane snapshot

Fixture: `packages/semantic-runtime/fixtures/pressure/runtime-html-portal-errors`
Probe file: `packages/lane-harness/probes/runtime-html-portal-errors.probes.json`
Lane: `diagnostics`

This snapshot records observed language-server behavior. Operator verdicts live in the probe data.

## runtime-controller-portal-template

### Probe

```json
{
  "file": "src/runtime-html-portal-errors-app.html"
}
```

### publishDiagnostics

```json
{
  "diagnosticCount": 3,
  "diagnostics": [
    {
      "anomaly": null,
      "code": "AUR0779",
      "data": {
        "diagnosticAuthority": "framework-error-code",
        "diagnosticDomain": "template",
        "diagnosticKind": "runtime-controller-framework-error",
        "frameworkErrorCode": "AUR0779",
        "frameworkRawErrorAuthority": null,
        "missingInput": "runtime-controller:AUR0779",
        "missingInputs": [
          "runtime-controller:AUR0779"
        ],
        "phase": "template-controller-activation",
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
      "message": "Aurelia runtime controller AUR0779 rejects this controller input: Invalid portal insertion position \"middle\"..",
      "range": {
        "end": {
          "character": 51,
          "line": 0
        },
        "start": {
          "character": 45,
          "line": 0
        }
      },
      "rangeText": "middle",
      "relatedInformation": [],
      "severity": "error",
      "source": "aurelia"
    },
    {
      "anomaly": null,
      "code": "AUR0811",
      "data": {
        "diagnosticAuthority": "framework-error-code",
        "diagnosticDomain": "template",
        "diagnosticKind": "runtime-controller-framework-error",
        "frameworkErrorCode": "AUR0811",
        "frameworkRawErrorAuthority": null,
        "missingInput": "runtime-controller:AUR0811",
        "missingInputs": [
          "runtime-controller:AUR0811"
        ],
        "phase": "template-controller-activation",
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
      "message": "Aurelia runtime controller AUR0811 rejects this controller input: Invalid strict portal target query: empty query..",
      "range": {
        "end": {
          "character": 26,
          "line": 1
        },
        "start": {
          "character": 26,
          "line": 1
        }
      },
      "rangeText": "",
      "relatedInformation": [],
      "severity": "error",
      "source": "aurelia"
    },
    {
      "anomaly": null,
      "code": "AUR0812",
      "data": {
        "diagnosticAuthority": "framework-error-code",
        "diagnosticDomain": "template",
        "diagnosticKind": "runtime-controller-framework-error",
        "frameworkErrorCode": "AUR0812",
        "frameworkRawErrorAuthority": null,
        "missingInput": "runtime-controller:AUR0812",
        "missingInputs": [
          "runtime-controller:AUR0812"
        ],
        "phase": "template-controller-activation",
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
      "message": "Aurelia runtime controller AUR0812 rejects this controller input: Invalid strict portal target resolution: no static target was supplied..",
      "range": {
        "end": {
          "character": 30,
          "line": 2
        },
        "start": {
          "character": 26,
          "line": 2
        }
      },
      "rangeText": "true",
      "relatedInformation": [],
      "severity": "error",
      "source": "aurelia"
    }
  ],
  "outcome": "published",
  "uri": "fixtures://pressure/runtime-html-portal-errors/src/runtime-html-portal-errors-app.html"
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
            "filePath": "src/runtime-html-portal-errors-app.html"
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
            "filePath": "src/runtime-html-portal-errors-app.html"
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
            "filePath": "src/runtime-html-portal-errors-app.html"
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
                  "label": "src/runtime-html-portal-errors-app.html",
                  "path": "src/runtime-html-portal-errors-app.html",
                  "sourceFileRole": "template",
                  "sourceWorkspaceKey": "runtime-html-portal-errors"
                },
                "end": 103,
                "kind": "source-span-address",
                "label": "src/runtime-html-portal-errors-app.html@103..103",
                "path": "src/runtime-html-portal-errors-app.html",
                "role": "value",
                "sourceFileRole": "template",
                "sourceWorkspaceKey": "runtime-html-portal-errors",
                "start": 103
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
                  "label": "src/runtime-html-portal-errors-app.html",
                  "path": "src/runtime-html-portal-errors-app.html",
                  "sourceFileRole": "template",
                  "sourceWorkspaceKey": "runtime-html-portal-errors"
                },
                "end": 180,
                "kind": "source-span-address",
                "label": "src/runtime-html-portal-errors-app.html@176..180",
                "path": "src/runtime-html-portal-errors-app.html",
                "role": "value",
                "sourceFileRole": "template",
                "sourceWorkspaceKey": "runtime-html-portal-errors",
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
                  "label": "src/runtime-html-portal-errors-app.html",
                  "path": "src/runtime-html-portal-errors-app.html",
                  "sourceFileRole": "template",
                  "sourceWorkspaceKey": "runtime-html-portal-errors"
                },
                "end": 51,
                "kind": "source-span-address",
                "label": "src/runtime-html-portal-errors-app.html@45..51",
                "path": "src/runtime-html-portal-errors-app.html",
                "role": "value",
                "sourceFileRole": "template",
                "sourceWorkspaceKey": "runtime-html-portal-errors",
                "start": 45
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
        "groupKey": "row:diagnostic:2:template:runtime-controller-framework-error:framework-error-code:AUR0779:src/runtime-html-portal-errors-app.html:45:51:runtime-controller:AUR0779",
        "maxRawSeverity": "error",
        "primary": {
          "diagnostic": {
            "actionability": "guided",
            "anomaly": null,
            "category": "template-syntax",
            "code": "AUR0779",
            "data": {
              "diagnosticAuthority": "framework-error-code",
              "diagnosticDomain": "template",
              "diagnosticKind": "runtime-controller-framework-error",
              "frameworkErrorCode": "AUR0779",
              "frameworkRawErrorAuthority": null,
              "missingInput": "runtime-controller:AUR0779",
              "missingInputs": [
                "runtime-controller:AUR0779"
              ],
              "phase": "template-controller-activation",
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
            "file": "src/runtime-html-portal-errors-app.html",
            "impact": "blocking",
            "issues": [
              {
                "code": "AUR0779",
                "kind": "runtime-controller-framework-error",
                "message": "Aurelia runtime controller AUR0779 rejects this controller input: Invalid portal insertion position \"middle\".."
              }
            ],
            "message": "Aurelia runtime controller AUR0779 rejects this controller input: Invalid portal insertion position \"middle\"..",
            "related": [],
            "severity": "error",
            "source": "semantic-runtime:template",
            "span": {
              "end": 51,
              "start": 45
            },
            "spanText": "middle",
            "status": "primary",
            "uri": "fixtures://pressure/runtime-html-portal-errors/src/runtime-html-portal-errors-app.html"
          },
          "relation": null,
          "role": "primary",
          "rowId": "diagnostic:2:template:runtime-controller-framework-error:framework-error-code:AUR0779:src/runtime-html-portal-errors-app.html:45:51:runtime-controller:AUR0779"
        },
        "primarySeverity": "error",
        "rawRowCount": 1,
        "related": [],
        "subject": null
      },
      {
        "groupKey": "row:diagnostic:0:template:runtime-controller-framework-error:framework-error-code:AUR0811:src/runtime-html-portal-errors-app.html:103:103:runtime-controller:AUR0811",
        "maxRawSeverity": "error",
        "primary": {
          "diagnostic": {
            "actionability": "guided",
            "anomaly": null,
            "category": "template-syntax",
            "code": "AUR0811",
            "data": {
              "diagnosticAuthority": "framework-error-code",
              "diagnosticDomain": "template",
              "diagnosticKind": "runtime-controller-framework-error",
              "frameworkErrorCode": "AUR0811",
              "frameworkRawErrorAuthority": null,
              "missingInput": "runtime-controller:AUR0811",
              "missingInputs": [
                "runtime-controller:AUR0811"
              ],
              "phase": "template-controller-activation",
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
            "file": "src/runtime-html-portal-errors-app.html",
            "impact": "blocking",
            "issues": [
              {
                "code": "AUR0811",
                "kind": "runtime-controller-framework-error",
                "message": "Aurelia runtime controller AUR0811 rejects this controller input: Invalid strict portal target query: empty query.."
              }
            ],
            "message": "Aurelia runtime controller AUR0811 rejects this controller input: Invalid strict portal target query: empty query..",
            "related": [],
            "severity": "error",
            "source": "semantic-runtime:template",
            "span": {
              "end": 103,
              "start": 103
            },
            "spanText": "",
            "status": "primary",
            "uri": "fixtures://pressure/runtime-html-portal-errors/src/runtime-html-portal-errors-app.html"
          },
          "relation": null,
          "role": "primary",
          "rowId": "diagnostic:0:template:runtime-controller-framework-error:framework-error-code:AUR0811:src/runtime-html-portal-errors-app.html:103:103:runtime-controller:AUR0811"
        },
        "primarySeverity": "error",
        "rawRowCount": 1,
        "related": [],
        "subject": null
      },
      {
        "groupKey": "row:diagnostic:1:template:runtime-controller-framework-error:framework-error-code:AUR0812:src/runtime-html-portal-errors-app.html:176:180:runtime-controller:AUR0812",
        "maxRawSeverity": "error",
        "primary": {
          "diagnostic": {
            "actionability": "guided",
            "anomaly": null,
            "category": "template-syntax",
            "code": "AUR0812",
            "data": {
              "diagnosticAuthority": "framework-error-code",
              "diagnosticDomain": "template",
              "diagnosticKind": "runtime-controller-framework-error",
              "frameworkErrorCode": "AUR0812",
              "frameworkRawErrorAuthority": null,
              "missingInput": "runtime-controller:AUR0812",
              "missingInputs": [
                "runtime-controller:AUR0812"
              ],
              "phase": "template-controller-activation",
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
            "file": "src/runtime-html-portal-errors-app.html",
            "impact": "blocking",
            "issues": [
              {
                "code": "AUR0812",
                "kind": "runtime-controller-framework-error",
                "message": "Aurelia runtime controller AUR0812 rejects this controller input: Invalid strict portal target resolution: no static target was supplied.."
              }
            ],
            "message": "Aurelia runtime controller AUR0812 rejects this controller input: Invalid strict portal target resolution: no static target was supplied..",
            "related": [],
            "severity": "error",
            "source": "semantic-runtime:template",
            "span": {
              "end": 180,
              "start": 176
            },
            "spanText": "true",
            "status": "primary",
            "uri": "fixtures://pressure/runtime-html-portal-errors/src/runtime-html-portal-errors-app.html"
          },
          "relation": null,
          "role": "primary",
          "rowId": "diagnostic:1:template:runtime-controller-framework-error:framework-error-code:AUR0812:src/runtime-html-portal-errors-app.html:176:180:runtime-controller:AUR0812"
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
        "code": "AUR0811",
        "data": {
          "diagnosticAuthority": "framework-error-code",
          "diagnosticDomain": "template",
          "diagnosticKind": "runtime-controller-framework-error",
          "frameworkErrorCode": "AUR0811",
          "frameworkRawErrorAuthority": null,
          "missingInput": "runtime-controller:AUR0811",
          "missingInputs": [
            "runtime-controller:AUR0811"
          ],
          "phase": "template-controller-activation",
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
        "file": "src/runtime-html-portal-errors-app.html",
        "impact": "blocking",
        "issues": [
          {
            "code": "AUR0811",
            "kind": "runtime-controller-framework-error",
            "message": "Aurelia runtime controller AUR0811 rejects this controller input: Invalid strict portal target query: empty query.."
          }
        ],
        "message": "Aurelia runtime controller AUR0811 rejects this controller input: Invalid strict portal target query: empty query..",
        "related": [],
        "severity": "error",
        "source": "semantic-runtime:template",
        "span": {
          "end": 103,
          "start": 103
        },
        "spanText": "",
        "status": "canonical",
        "uri": "fixtures://pressure/runtime-html-portal-errors/src/runtime-html-portal-errors-app.html"
      },
      {
        "actionability": "guided",
        "anomaly": null,
        "category": "template-syntax",
        "code": "AUR0812",
        "data": {
          "diagnosticAuthority": "framework-error-code",
          "diagnosticDomain": "template",
          "diagnosticKind": "runtime-controller-framework-error",
          "frameworkErrorCode": "AUR0812",
          "frameworkRawErrorAuthority": null,
          "missingInput": "runtime-controller:AUR0812",
          "missingInputs": [
            "runtime-controller:AUR0812"
          ],
          "phase": "template-controller-activation",
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
        "file": "src/runtime-html-portal-errors-app.html",
        "impact": "blocking",
        "issues": [
          {
            "code": "AUR0812",
            "kind": "runtime-controller-framework-error",
            "message": "Aurelia runtime controller AUR0812 rejects this controller input: Invalid strict portal target resolution: no static target was supplied.."
          }
        ],
        "message": "Aurelia runtime controller AUR0812 rejects this controller input: Invalid strict portal target resolution: no static target was supplied..",
        "related": [],
        "severity": "error",
        "source": "semantic-runtime:template",
        "span": {
          "end": 180,
          "start": 176
        },
        "spanText": "true",
        "status": "canonical",
        "uri": "fixtures://pressure/runtime-html-portal-errors/src/runtime-html-portal-errors-app.html"
      },
      {
        "actionability": "guided",
        "anomaly": null,
        "category": "template-syntax",
        "code": "AUR0779",
        "data": {
          "diagnosticAuthority": "framework-error-code",
          "diagnosticDomain": "template",
          "diagnosticKind": "runtime-controller-framework-error",
          "frameworkErrorCode": "AUR0779",
          "frameworkRawErrorAuthority": null,
          "missingInput": "runtime-controller:AUR0779",
          "missingInputs": [
            "runtime-controller:AUR0779"
          ],
          "phase": "template-controller-activation",
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
        "file": "src/runtime-html-portal-errors-app.html",
        "impact": "blocking",
        "issues": [
          {
            "code": "AUR0779",
            "kind": "runtime-controller-framework-error",
            "message": "Aurelia runtime controller AUR0779 rejects this controller input: Invalid portal insertion position \"middle\".."
          }
        ],
        "message": "Aurelia runtime controller AUR0779 rejects this controller input: Invalid portal insertion position \"middle\"..",
        "related": [],
        "severity": "error",
        "source": "semantic-runtime:template",
        "span": {
          "end": 51,
          "start": 45
        },
        "spanText": "middle",
        "status": "canonical",
        "uri": "fixtures://pressure/runtime-html-portal-errors/src/runtime-html-portal-errors-app.html"
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
          "code": "AUR0779",
          "data": {
            "diagnosticAuthority": "framework-error-code",
            "diagnosticDomain": "template",
            "diagnosticKind": "runtime-controller-framework-error",
            "frameworkErrorCode": "AUR0779",
            "frameworkRawErrorAuthority": null,
            "missingInput": "runtime-controller:AUR0779",
            "missingInputs": [
              "runtime-controller:AUR0779"
            ],
            "phase": "template-controller-activation",
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
          "file": "src/runtime-html-portal-errors-app.html",
          "impact": "blocking",
          "issues": [
            {
              "code": "AUR0779",
              "kind": "runtime-controller-framework-error",
              "message": "Aurelia runtime controller AUR0779 rejects this controller input: Invalid portal insertion position \"middle\".."
            }
          ],
          "message": "Aurelia runtime controller AUR0779 rejects this controller input: Invalid portal insertion position \"middle\"..",
          "related": [],
          "severity": "error",
          "source": "semantic-runtime:template",
          "span": {
            "end": 51,
            "start": 45
          },
          "spanText": "middle",
          "status": "primary",
          "uri": "fixtures://pressure/runtime-html-portal-errors/src/runtime-html-portal-errors-app.html"
        },
        {
          "actionability": "guided",
          "anomaly": null,
          "category": "template-syntax",
          "code": "AUR0811",
          "data": {
            "diagnosticAuthority": "framework-error-code",
            "diagnosticDomain": "template",
            "diagnosticKind": "runtime-controller-framework-error",
            "frameworkErrorCode": "AUR0811",
            "frameworkRawErrorAuthority": null,
            "missingInput": "runtime-controller:AUR0811",
            "missingInputs": [
              "runtime-controller:AUR0811"
            ],
            "phase": "template-controller-activation",
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
          "file": "src/runtime-html-portal-errors-app.html",
          "impact": "blocking",
          "issues": [
            {
              "code": "AUR0811",
              "kind": "runtime-controller-framework-error",
              "message": "Aurelia runtime controller AUR0811 rejects this controller input: Invalid strict portal target query: empty query.."
            }
          ],
          "message": "Aurelia runtime controller AUR0811 rejects this controller input: Invalid strict portal target query: empty query..",
          "related": [],
          "severity": "error",
          "source": "semantic-runtime:template",
          "span": {
            "end": 103,
            "start": 103
          },
          "spanText": "",
          "status": "primary",
          "uri": "fixtures://pressure/runtime-html-portal-errors/src/runtime-html-portal-errors-app.html"
        },
        {
          "actionability": "guided",
          "anomaly": null,
          "category": "template-syntax",
          "code": "AUR0812",
          "data": {
            "diagnosticAuthority": "framework-error-code",
            "diagnosticDomain": "template",
            "diagnosticKind": "runtime-controller-framework-error",
            "frameworkErrorCode": "AUR0812",
            "frameworkRawErrorAuthority": null,
            "missingInput": "runtime-controller:AUR0812",
            "missingInputs": [
              "runtime-controller:AUR0812"
            ],
            "phase": "template-controller-activation",
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
          "file": "src/runtime-html-portal-errors-app.html",
          "impact": "blocking",
          "issues": [
            {
              "code": "AUR0812",
              "kind": "runtime-controller-framework-error",
              "message": "Aurelia runtime controller AUR0812 rejects this controller input: Invalid strict portal target resolution: no static target was supplied.."
            }
          ],
          "message": "Aurelia runtime controller AUR0812 rejects this controller input: Invalid strict portal target resolution: no static target was supplied..",
          "related": [],
          "severity": "error",
          "source": "semantic-runtime:template",
          "span": {
            "end": 180,
            "start": 176
          },
          "spanText": "true",
          "status": "primary",
          "uri": "fixtures://pressure/runtime-html-portal-errors/src/runtime-html-portal-errors-app.html"
        }
      ]
    }
  },
  "uri": "fixtures://pressure/runtime-html-portal-errors/src/runtime-html-portal-errors-app.html"
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
