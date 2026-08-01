# runtime-html-if-else-errors diagnostics lane snapshot

Fixture: `packages/semantic-runtime/fixtures/pressure/runtime-html-if-else-errors`
Probe file: `packages/lane-harness/probes/runtime-html-if-else-errors.probes.json`
Lane: `diagnostics`

This snapshot records observed language-server behavior. Operator verdicts live in the probe data.

## runtime-controller-if-else-template

### Probe

```json
{
  "file": "src/runtime-html-if-else-errors-app.html"
}
```

### publishDiagnostics

```json
{
  "diagnosticCount": 1,
  "diagnostics": [
    {
      "anomaly": null,
      "code": "AUR0810",
      "data": {
        "diagnosticAuthority": "framework-error-code",
        "diagnosticDomain": "template",
        "diagnosticKind": "runtime-controller-framework-error",
        "frameworkErrorCode": "AUR0810",
        "frameworkRawErrorAuthority": null,
        "missingInput": "runtime-controller:AUR0810",
        "missingInputs": [
          "runtime-controller:AUR0810"
        ],
        "phase": "template-controller-link",
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
      "message": "Aurelia runtime controller AUR0810 rejects this controller input: Invalid [else] usage. The previous controller sibling is not [if]..",
      "range": {
        "end": {
          "character": 14,
          "line": 0
        },
        "start": {
          "character": 10,
          "line": 0
        }
      },
      "rangeText": "else",
      "relatedInformation": [],
      "severity": "error",
      "source": "aurelia"
    }
  ],
  "outcome": "published",
  "uri": "fixtures://pressure/runtime-html-if-else-errors/src/runtime-html-if-else-errors-app.html"
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
            "filePath": "src/runtime-html-if-else-errors-app.html"
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
            "filePath": "src/runtime-html-if-else-errors-app.html"
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
            "filePath": "src/runtime-html-if-else-errors-app.html"
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
                  "label": "src/runtime-html-if-else-errors-app.html",
                  "path": "src/runtime-html-if-else-errors-app.html",
                  "sourceFileRole": "template",
                  "sourceWorkspaceKey": "runtime-html-if-else-errors"
                },
                "end": 14,
                "kind": "source-span-address",
                "label": "src/runtime-html-if-else-errors-app.html@10..14",
                "path": "src/runtime-html-if-else-errors-app.html",
                "role": "range",
                "sourceFileRole": "template",
                "sourceWorkspaceKey": "runtime-html-if-else-errors",
                "start": 10
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
    "summary": "Returned 1 app diagnostic(s)."
  },
  "outcome": "result",
  "presentation": {
    "complete": true,
    "contextualCount": 0,
    "groups": [
      {
        "groupKey": "row:diagnostic:0:template:runtime-controller-framework-error:framework-error-code:AUR0810:src/runtime-html-if-else-errors-app.html:10:14:runtime-controller:AUR0810",
        "maxRawSeverity": "error",
        "primary": {
          "diagnostic": {
            "actionability": "guided",
            "anomaly": null,
            "category": "template-syntax",
            "code": "AUR0810",
            "data": {
              "diagnosticAuthority": "framework-error-code",
              "diagnosticDomain": "template",
              "diagnosticKind": "runtime-controller-framework-error",
              "frameworkErrorCode": "AUR0810",
              "frameworkRawErrorAuthority": null,
              "missingInput": "runtime-controller:AUR0810",
              "missingInputs": [
                "runtime-controller:AUR0810"
              ],
              "phase": "template-controller-link",
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
            "file": "src/runtime-html-if-else-errors-app.html",
            "impact": "blocking",
            "issues": [
              {
                "code": "AUR0810",
                "kind": "runtime-controller-framework-error",
                "message": "Aurelia runtime controller AUR0810 rejects this controller input: Invalid [else] usage. The previous controller sibling is not [if].."
              }
            ],
            "message": "Aurelia runtime controller AUR0810 rejects this controller input: Invalid [else] usage. The previous controller sibling is not [if]..",
            "related": [],
            "severity": "error",
            "source": "semantic-runtime:template",
            "span": {
              "end": 14,
              "start": 10
            },
            "spanText": "else",
            "status": "primary",
            "uri": "fixtures://pressure/runtime-html-if-else-errors/src/runtime-html-if-else-errors-app.html"
          },
          "relation": null,
          "role": "primary",
          "rowId": "diagnostic:0:template:runtime-controller-framework-error:framework-error-code:AUR0810:src/runtime-html-if-else-errors-app.html:10:14:runtime-controller:AUR0810"
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
        "category": "template-syntax",
        "code": "AUR0810",
        "data": {
          "diagnosticAuthority": "framework-error-code",
          "diagnosticDomain": "template",
          "diagnosticKind": "runtime-controller-framework-error",
          "frameworkErrorCode": "AUR0810",
          "frameworkRawErrorAuthority": null,
          "missingInput": "runtime-controller:AUR0810",
          "missingInputs": [
            "runtime-controller:AUR0810"
          ],
          "phase": "template-controller-link",
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
        "file": "src/runtime-html-if-else-errors-app.html",
        "impact": "blocking",
        "issues": [
          {
            "code": "AUR0810",
            "kind": "runtime-controller-framework-error",
            "message": "Aurelia runtime controller AUR0810 rejects this controller input: Invalid [else] usage. The previous controller sibling is not [if].."
          }
        ],
        "message": "Aurelia runtime controller AUR0810 rejects this controller input: Invalid [else] usage. The previous controller sibling is not [if]..",
        "related": [],
        "severity": "error",
        "source": "semantic-runtime:template",
        "span": {
          "end": 14,
          "start": 10
        },
        "spanText": "else",
        "status": "canonical",
        "uri": "fixtures://pressure/runtime-html-if-else-errors/src/runtime-html-if-else-errors-app.html"
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
          "category": "template-syntax",
          "code": "AUR0810",
          "data": {
            "diagnosticAuthority": "framework-error-code",
            "diagnosticDomain": "template",
            "diagnosticKind": "runtime-controller-framework-error",
            "frameworkErrorCode": "AUR0810",
            "frameworkRawErrorAuthority": null,
            "missingInput": "runtime-controller:AUR0810",
            "missingInputs": [
              "runtime-controller:AUR0810"
            ],
            "phase": "template-controller-link",
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
          "file": "src/runtime-html-if-else-errors-app.html",
          "impact": "blocking",
          "issues": [
            {
              "code": "AUR0810",
              "kind": "runtime-controller-framework-error",
              "message": "Aurelia runtime controller AUR0810 rejects this controller input: Invalid [else] usage. The previous controller sibling is not [if].."
            }
          ],
          "message": "Aurelia runtime controller AUR0810 rejects this controller input: Invalid [else] usage. The previous controller sibling is not [if]..",
          "related": [],
          "severity": "error",
          "source": "semantic-runtime:template",
          "span": {
            "end": 14,
            "start": 10
          },
          "spanText": "else",
          "status": "primary",
          "uri": "fixtures://pressure/runtime-html-if-else-errors/src/runtime-html-if-else-errors-app.html"
        }
      ]
    }
  },
  "uri": "fixtures://pressure/runtime-html-if-else-errors/src/runtime-html-if-else-errors-app.html"
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
