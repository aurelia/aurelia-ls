# observation-binding-lifecycle diagnostics lane snapshot

Fixture: `packages/semantic-runtime/fixtures/pressure/observation-binding-lifecycle`
Probe file: `packages/lane-harness/probes/observation-binding-lifecycle.probes.json`
Lane: `diagnostics`

This snapshot records observed language-server behavior. Operator verdicts live in the probe data.

## binding-behavior-reachability-and-order

### Probe

```json
{
  "file": "src/observation-binding-lifecycle-app.html"
}
```

### publishDiagnostics

```json
{
  "diagnosticCount": 8,
  "diagnostics": [
    {
      "anomaly": null,
      "code": "AUR0801",
      "data": {
        "diagnosticAuthority": "framework-error-code",
        "diagnosticDomain": "template",
        "diagnosticKind": "runtime-binding-behavior-framework-error",
        "frameworkErrorCode": "AUR0801",
        "frameworkRawErrorAuthority": null,
        "missingInput": "runtime-binding-behavior:AUR0801",
        "missingInputs": [
          "runtime-binding-behavior:AUR0801"
        ],
        "phase": "bind",
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
      "message": "Aurelia runtime binding behavior AUR0801 rejects this binding: self can only be applied to listener bindings created by trigger or capture commands..",
      "range": {
        "end": {
          "character": 85,
          "line": 2
        },
        "start": {
          "character": 81,
          "line": 2
        }
      },
      "rangeText": "self",
      "relatedInformation": [],
      "severity": "error",
      "source": "aurelia"
    },
    {
      "anomaly": null,
      "code": "AUR0101",
      "data": {
        "diagnosticAuthority": "framework-error-code",
        "diagnosticDomain": "template",
        "diagnosticKind": "runtime-binding-behavior-framework-error",
        "frameworkErrorCode": "AUR0101",
        "frameworkRawErrorAuthority": null,
        "missingInput": "runtime-binding-behavior:AUR0101",
        "missingInputs": [
          "runtime-binding-behavior:AUR0101"
        ],
        "phase": "bind",
        "relatedInformation": [],
        "relatedQueryKind": "template-diagnostics",
        "repairAffordance": {
          "actionKind": "register-resource",
          "actionability": "guided",
          "changeDomain": "app-source",
          "planKind": "resource-registration",
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
      "message": "Aurelia runtime binding behavior AUR0101 rejects this binding: Binding behavior 'missingBehavior' was not resolved through the current compiler resource scope..",
      "range": {
        "end": {
          "character": 96,
          "line": 3
        },
        "start": {
          "character": 81,
          "line": 3
        }
      },
      "rangeText": "missingBehavior",
      "relatedInformation": [],
      "severity": "error",
      "source": "aurelia"
    },
    {
      "anomaly": null,
      "code": "AUR0101",
      "data": {
        "diagnosticAuthority": "framework-error-code",
        "diagnosticDomain": "template",
        "diagnosticKind": "runtime-binding-behavior-framework-error",
        "frameworkErrorCode": "AUR0101",
        "frameworkRawErrorAuthority": null,
        "missingInput": "runtime-binding-behavior:AUR0101",
        "missingInputs": [
          "runtime-binding-behavior:AUR0101"
        ],
        "phase": "bind",
        "relatedInformation": [],
        "relatedQueryKind": "template-diagnostics",
        "repairAffordance": {
          "actionKind": "register-resource",
          "actionability": "guided",
          "changeDomain": "app-source",
          "planKind": "resource-registration",
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
      "message": "Aurelia runtime binding behavior AUR0101 rejects this binding: Binding behavior 'missingBehavior' was not resolved through the current compiler resource scope..",
      "range": {
        "end": {
          "character": 98,
          "line": 6
        },
        "start": {
          "character": 83,
          "line": 6
        }
      },
      "rangeText": "missingBehavior",
      "relatedInformation": [],
      "severity": "error",
      "source": "aurelia"
    },
    {
      "anomaly": null,
      "code": "AUR0803",
      "data": {
        "diagnosticAuthority": "framework-error-code",
        "diagnosticDomain": "template",
        "diagnosticKind": "runtime-binding-behavior-framework-error",
        "frameworkErrorCode": "AUR0803",
        "frameworkRawErrorAuthority": null,
        "missingInput": "runtime-binding-behavior:AUR0803",
        "missingInputs": [
          "runtime-binding-behavior:AUR0803"
        ],
        "phase": "bind",
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
      "message": "Aurelia runtime binding behavior AUR0803 rejects this binding: updateTrigger can only be applied to two-way or from-view PropertyBinding instances..",
      "range": {
        "end": {
          "character": 95,
          "line": 16
        },
        "start": {
          "character": 82,
          "line": 16
        }
      },
      "rangeText": "updateTrigger",
      "relatedInformation": [],
      "severity": "error",
      "source": "aurelia"
    },
    {
      "anomaly": null,
      "code": "binding-source-assignment-strictness",
      "data": {
        "diagnosticAuthority": "semantic-runtime-product",
        "diagnosticDomain": "template",
        "diagnosticKind": "binding-source-assignment-strictness",
        "frameworkErrorCode": null,
        "frameworkRawErrorAuthority": null,
        "missingInput": "binding-source-assignment:target-to-source-type-mismatch",
        "missingInputs": [
          "binding-source-assignment:target-to-source-type-mismatch"
        ],
        "phase": null,
        "relatedInformation": [],
        "relatedQueryKind": "template-diagnostics",
        "repairAffordance": {
          "actionKind": "align-assignment-type",
          "actionability": "guided",
          "changeDomain": "app-source",
          "planKind": "source-assignment-type-alignment",
          "readiness": "ready-to-plan",
          "targetSourceCoverage": "all"
        },
        "sourceRole": "template",
        "subject": {
          "source": {
            "end": 2242,
            "kind": "source-span-address",
            "label": "src/observation-binding-lifecycle-app.html@2225..2242",
            "path": "src/observation-binding-lifecycle-app.html",
            "role": "binding-source-assignment",
            "start": 2225
          },
          "span": null,
          "subjectKind": "template-expression",
          "uri": null
        },
        "taxonomy": {
          "actionability": "guided",
          "category": "template-syntax",
          "confidence": null,
          "impact": "degraded",
          "schema": "diagnostics-taxonomy/1"
        }
      },
      "message": "TypeChecker target-to-source assignment is not assignable after observer and value-converter writeback (number -> string); Aurelia runtime still passes the observer value to astAssign.",
      "range": {
        "end": {
          "character": 58,
          "line": 28
        },
        "start": {
          "character": 41,
          "line": 28
        }
      },
      "rangeText": "reachedChildValue",
      "relatedInformation": [],
      "severity": "warning",
      "source": "aurelia"
    },
    {
      "anomaly": null,
      "code": "binding-target-assignment-strictness",
      "data": {
        "diagnosticAuthority": "semantic-runtime-product",
        "diagnosticDomain": "template",
        "diagnosticKind": "binding-target-assignment-strictness",
        "frameworkErrorCode": null,
        "frameworkRawErrorAuthority": null,
        "missingInput": "binding-target-assignment:source-to-target-type-mismatch",
        "missingInputs": [
          "binding-target-assignment:source-to-target-type-mismatch"
        ],
        "phase": null,
        "relatedInformation": [],
        "relatedQueryKind": "template-diagnostics",
        "repairAffordance": {
          "actionKind": "rewrite-expression",
          "actionability": "guided",
          "changeDomain": "app-source",
          "planKind": "template-expression-rewrite",
          "readiness": "ready-to-plan",
          "targetSourceCoverage": "all"
        },
        "sourceRole": "template",
        "subject": {
          "source": {
            "end": 2242,
            "kind": "source-span-address",
            "label": "src/observation-binding-lifecycle-app.html@2225..2242",
            "path": "src/observation-binding-lifecycle-app.html",
            "role": "binding-source-assignment",
            "start": 2225
          },
          "span": null,
          "subjectKind": "template-expression",
          "uri": null
        },
        "taxonomy": {
          "actionability": "guided",
          "category": "template-syntax",
          "confidence": null,
          "impact": "degraded",
          "schema": "diagnostics-taxonomy/1"
        }
      },
      "message": "Binding source type string is not assignable to target 'value' of type number.",
      "range": {
        "end": {
          "character": 58,
          "line": 28
        },
        "start": {
          "character": 41,
          "line": 28
        }
      },
      "rangeText": "reachedChildValue",
      "relatedInformation": [],
      "severity": "warning",
      "source": "aurelia"
    },
    {
      "anomaly": null,
      "code": "binding-target-assignment-strictness",
      "data": {
        "diagnosticAuthority": "semantic-runtime-product",
        "diagnosticDomain": "template",
        "diagnosticKind": "binding-target-assignment-strictness",
        "frameworkErrorCode": null,
        "frameworkRawErrorAuthority": null,
        "missingInput": "binding-target-assignment:source-to-target-type-mismatch",
        "missingInputs": [
          "binding-target-assignment:source-to-target-type-mismatch"
        ],
        "phase": null,
        "relatedInformation": [],
        "relatedQueryKind": "template-diagnostics",
        "repairAffordance": {
          "actionKind": "rewrite-expression",
          "actionability": "guided",
          "changeDomain": "app-source",
          "planKind": "template-expression-rewrite",
          "readiness": "ready-to-plan",
          "targetSourceCoverage": "all"
        },
        "sourceRole": "template",
        "subject": {
          "source": {
            "end": 2367,
            "kind": "source-span-address",
            "label": "src/observation-binding-lifecycle-app.html@2350..2367",
            "path": "src/observation-binding-lifecycle-app.html",
            "role": "binding-source-assignment",
            "start": 2350
          },
          "span": null,
          "subjectKind": "template-expression",
          "uri": null
        },
        "taxonomy": {
          "actionability": "guided",
          "category": "template-syntax",
          "confidence": null,
          "impact": "degraded",
          "schema": "diagnostics-taxonomy/1"
        }
      },
      "message": "Binding source type string is not assignable to target 'value' of type number.",
      "range": {
        "end": {
          "character": 58,
          "line": 30
        },
        "start": {
          "character": 41,
          "line": 30
        }
      },
      "rangeText": "blockedChildValue",
      "relatedInformation": [],
      "severity": "warning",
      "source": "aurelia"
    },
    {
      "anomaly": null,
      "code": "AUR0801",
      "data": {
        "diagnosticAuthority": "framework-error-code",
        "diagnosticDomain": "template",
        "diagnosticKind": "runtime-binding-behavior-framework-error",
        "frameworkErrorCode": "AUR0801",
        "frameworkRawErrorAuthority": null,
        "missingInput": "runtime-binding-behavior:AUR0801",
        "missingInputs": [
          "runtime-binding-behavior:AUR0801"
        ],
        "phase": "bind",
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
      "message": "Aurelia runtime binding behavior AUR0801 rejects this binding: self can only be applied to listener bindings created by trigger or capture commands..",
      "range": {
        "end": {
          "character": 74,
          "line": 30
        },
        "start": {
          "character": 70,
          "line": 30
        }
      },
      "rangeText": "self",
      "relatedInformation": [],
      "severity": "error",
      "source": "aurelia"
    }
  ],
  "outcome": "published",
  "uri": "fixtures://pressure/observation-binding-lifecycle/src/observation-binding-lifecycle-app.html"
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
            "filePath": "src/observation-binding-lifecycle-app.html"
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
            "filePath": "src/observation-binding-lifecycle-app.html"
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
            "filePath": "src/observation-binding-lifecycle-app.html"
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
                  "label": "src/observation-binding-lifecycle-app.html",
                  "path": "src/observation-binding-lifecycle-app.html",
                  "sourceFileRole": "template",
                  "sourceWorkspaceKey": "observation-binding-lifecycle"
                },
                "end": 1411,
                "kind": "source-span-address",
                "label": "src/observation-binding-lifecycle-app.html@1398..1411",
                "path": "src/observation-binding-lifecycle-app.html",
                "role": "name",
                "sourceFileRole": "template",
                "sourceWorkspaceKey": "observation-binding-lifecycle",
                "start": 1398
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
                  "label": "src/observation-binding-lifecycle-app.html",
                  "path": "src/observation-binding-lifecycle-app.html",
                  "sourceFileRole": "template",
                  "sourceWorkspaceKey": "observation-binding-lifecycle"
                },
                "end": 164,
                "kind": "source-span-address",
                "label": "src/observation-binding-lifecycle-app.html@160..164",
                "path": "src/observation-binding-lifecycle-app.html",
                "role": "name",
                "sourceFileRole": "template",
                "sourceWorkspaceKey": "observation-binding-lifecycle",
                "start": 160
              }
            },
            {
              "count": 2,
              "facets": [
                "authored-source",
                "exact-authored-span"
              ],
              "source": {
                "end": 2242,
                "kind": "source-span-address",
                "label": "src/observation-binding-lifecycle-app.html@2225..2242",
                "path": "src/observation-binding-lifecycle-app.html",
                "role": "binding-source-assignment",
                "start": 2225
              }
            },
            {
              "count": 1,
              "facets": [
                "authored-source",
                "exact-authored-span"
              ],
              "source": {
                "end": 2367,
                "kind": "source-span-address",
                "label": "src/observation-binding-lifecycle-app.html@2350..2367",
                "path": "src/observation-binding-lifecycle-app.html",
                "role": "binding-source-assignment",
                "start": 2350
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
                  "label": "src/observation-binding-lifecycle-app.html",
                  "path": "src/observation-binding-lifecycle-app.html",
                  "sourceFileRole": "template",
                  "sourceWorkspaceKey": "observation-binding-lifecycle"
                },
                "end": 2383,
                "kind": "source-span-address",
                "label": "src/observation-binding-lifecycle-app.html@2379..2383",
                "path": "src/observation-binding-lifecycle-app.html",
                "role": "name",
                "sourceFileRole": "template",
                "sourceWorkspaceKey": "observation-binding-lifecycle",
                "start": 2379
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
                  "label": "src/observation-binding-lifecycle-app.html",
                  "path": "src/observation-binding-lifecycle-app.html",
                  "sourceFileRole": "template",
                  "sourceWorkspaceKey": "observation-binding-lifecycle"
                },
                "end": 263,
                "kind": "source-span-address",
                "label": "src/observation-binding-lifecycle-app.html@248..263",
                "path": "src/observation-binding-lifecycle-app.html",
                "role": "name",
                "sourceFileRole": "template",
                "sourceWorkspaceKey": "observation-binding-lifecycle",
                "start": 248
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
                  "label": "src/observation-binding-lifecycle-app.html",
                  "path": "src/observation-binding-lifecycle-app.html",
                  "sourceFileRole": "template",
                  "sourceWorkspaceKey": "observation-binding-lifecycle"
                },
                "end": 534,
                "kind": "source-span-address",
                "label": "src/observation-binding-lifecycle-app.html@519..534",
                "path": "src/observation-binding-lifecycle-app.html",
                "role": "name",
                "sourceFileRole": "template",
                "sourceWorkspaceKey": "observation-binding-lifecycle",
                "start": 519
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
    "summary": "Returned 8 app diagnostic(s)."
  },
  "outcome": "result",
  "presentation": {
    "complete": true,
    "contextualCount": 0,
    "groups": [
      {
        "groupKey": "row:diagnostic:1:template:runtime-binding-behavior-framework-error:framework-error-code:AUR0801:src/observation-binding-lifecycle-app.html:160:164:runtime-binding-behavior:AUR0801",
        "maxRawSeverity": "error",
        "primary": {
          "diagnostic": {
            "actionability": "guided",
            "anomaly": null,
            "category": "template-syntax",
            "code": "AUR0801",
            "data": {
              "diagnosticAuthority": "framework-error-code",
              "diagnosticDomain": "template",
              "diagnosticKind": "runtime-binding-behavior-framework-error",
              "frameworkErrorCode": "AUR0801",
              "frameworkRawErrorAuthority": null,
              "missingInput": "runtime-binding-behavior:AUR0801",
              "missingInputs": [
                "runtime-binding-behavior:AUR0801"
              ],
              "phase": "bind",
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
            "file": "src/observation-binding-lifecycle-app.html",
            "impact": "blocking",
            "issues": [
              {
                "code": "AUR0801",
                "kind": "runtime-binding-behavior-framework-error",
                "message": "Aurelia runtime binding behavior AUR0801 rejects this binding: self can only be applied to listener bindings created by trigger or capture commands.."
              }
            ],
            "message": "Aurelia runtime binding behavior AUR0801 rejects this binding: self can only be applied to listener bindings created by trigger or capture commands..",
            "related": [],
            "severity": "error",
            "source": "semantic-runtime:template",
            "span": {
              "end": 164,
              "start": 160
            },
            "spanText": "self",
            "status": "primary",
            "uri": "fixtures://pressure/observation-binding-lifecycle/src/observation-binding-lifecycle-app.html"
          },
          "relation": null,
          "role": "primary",
          "rowId": "diagnostic:1:template:runtime-binding-behavior-framework-error:framework-error-code:AUR0801:src/observation-binding-lifecycle-app.html:160:164:runtime-binding-behavior:AUR0801"
        },
        "primarySeverity": "error",
        "rawRowCount": 1,
        "related": [],
        "subject": null
      },
      {
        "groupKey": "row:diagnostic:6:template:runtime-binding-behavior-framework-error:framework-error-code:AUR0101:src/observation-binding-lifecycle-app.html:248:263:runtime-binding-behavior:AUR0101",
        "maxRawSeverity": "error",
        "primary": {
          "diagnostic": {
            "actionability": "guided",
            "anomaly": null,
            "category": "template-syntax",
            "code": "AUR0101",
            "data": {
              "diagnosticAuthority": "framework-error-code",
              "diagnosticDomain": "template",
              "diagnosticKind": "runtime-binding-behavior-framework-error",
              "frameworkErrorCode": "AUR0101",
              "frameworkRawErrorAuthority": null,
              "missingInput": "runtime-binding-behavior:AUR0101",
              "missingInputs": [
                "runtime-binding-behavior:AUR0101"
              ],
              "phase": "bind",
              "relatedInformation": [],
              "relatedQueryKind": "template-diagnostics",
              "repairAffordance": {
                "actionKind": "register-resource",
                "actionability": "guided",
                "changeDomain": "app-source",
                "planKind": "resource-registration",
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
            "file": "src/observation-binding-lifecycle-app.html",
            "impact": "blocking",
            "issues": [
              {
                "code": "AUR0101",
                "kind": "runtime-binding-behavior-framework-error",
                "message": "Aurelia runtime binding behavior AUR0101 rejects this binding: Binding behavior 'missingBehavior' was not resolved through the current compiler resource scope.."
              }
            ],
            "message": "Aurelia runtime binding behavior AUR0101 rejects this binding: Binding behavior 'missingBehavior' was not resolved through the current compiler resource scope..",
            "related": [],
            "severity": "error",
            "source": "semantic-runtime:template",
            "span": {
              "end": 263,
              "start": 248
            },
            "spanText": "missingBehavior",
            "status": "primary",
            "uri": "fixtures://pressure/observation-binding-lifecycle/src/observation-binding-lifecycle-app.html"
          },
          "relation": null,
          "role": "primary",
          "rowId": "diagnostic:6:template:runtime-binding-behavior-framework-error:framework-error-code:AUR0101:src/observation-binding-lifecycle-app.html:248:263:runtime-binding-behavior:AUR0101"
        },
        "primarySeverity": "error",
        "rawRowCount": 1,
        "related": [],
        "subject": null
      },
      {
        "groupKey": "row:diagnostic:7:template:runtime-binding-behavior-framework-error:framework-error-code:AUR0101:src/observation-binding-lifecycle-app.html:519:534:runtime-binding-behavior:AUR0101",
        "maxRawSeverity": "error",
        "primary": {
          "diagnostic": {
            "actionability": "guided",
            "anomaly": null,
            "category": "template-syntax",
            "code": "AUR0101",
            "data": {
              "diagnosticAuthority": "framework-error-code",
              "diagnosticDomain": "template",
              "diagnosticKind": "runtime-binding-behavior-framework-error",
              "frameworkErrorCode": "AUR0101",
              "frameworkRawErrorAuthority": null,
              "missingInput": "runtime-binding-behavior:AUR0101",
              "missingInputs": [
                "runtime-binding-behavior:AUR0101"
              ],
              "phase": "bind",
              "relatedInformation": [],
              "relatedQueryKind": "template-diagnostics",
              "repairAffordance": {
                "actionKind": "register-resource",
                "actionability": "guided",
                "changeDomain": "app-source",
                "planKind": "resource-registration",
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
            "file": "src/observation-binding-lifecycle-app.html",
            "impact": "blocking",
            "issues": [
              {
                "code": "AUR0101",
                "kind": "runtime-binding-behavior-framework-error",
                "message": "Aurelia runtime binding behavior AUR0101 rejects this binding: Binding behavior 'missingBehavior' was not resolved through the current compiler resource scope.."
              }
            ],
            "message": "Aurelia runtime binding behavior AUR0101 rejects this binding: Binding behavior 'missingBehavior' was not resolved through the current compiler resource scope..",
            "related": [],
            "severity": "error",
            "source": "semantic-runtime:template",
            "span": {
              "end": 534,
              "start": 519
            },
            "spanText": "missingBehavior",
            "status": "primary",
            "uri": "fixtures://pressure/observation-binding-lifecycle/src/observation-binding-lifecycle-app.html"
          },
          "relation": null,
          "role": "primary",
          "rowId": "diagnostic:7:template:runtime-binding-behavior-framework-error:framework-error-code:AUR0101:src/observation-binding-lifecycle-app.html:519:534:runtime-binding-behavior:AUR0101"
        },
        "primarySeverity": "error",
        "rawRowCount": 1,
        "related": [],
        "subject": null
      },
      {
        "groupKey": "row:diagnostic:0:template:runtime-binding-behavior-framework-error:framework-error-code:AUR0803:src/observation-binding-lifecycle-app.html:1398:1411:runtime-binding-behavior:AUR0803",
        "maxRawSeverity": "error",
        "primary": {
          "diagnostic": {
            "actionability": "guided",
            "anomaly": null,
            "category": "template-syntax",
            "code": "AUR0803",
            "data": {
              "diagnosticAuthority": "framework-error-code",
              "diagnosticDomain": "template",
              "diagnosticKind": "runtime-binding-behavior-framework-error",
              "frameworkErrorCode": "AUR0803",
              "frameworkRawErrorAuthority": null,
              "missingInput": "runtime-binding-behavior:AUR0803",
              "missingInputs": [
                "runtime-binding-behavior:AUR0803"
              ],
              "phase": "bind",
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
            "file": "src/observation-binding-lifecycle-app.html",
            "impact": "blocking",
            "issues": [
              {
                "code": "AUR0803",
                "kind": "runtime-binding-behavior-framework-error",
                "message": "Aurelia runtime binding behavior AUR0803 rejects this binding: updateTrigger can only be applied to two-way or from-view PropertyBinding instances.."
              }
            ],
            "message": "Aurelia runtime binding behavior AUR0803 rejects this binding: updateTrigger can only be applied to two-way or from-view PropertyBinding instances..",
            "related": [],
            "severity": "error",
            "source": "semantic-runtime:template",
            "span": {
              "end": 1411,
              "start": 1398
            },
            "spanText": "updateTrigger",
            "status": "primary",
            "uri": "fixtures://pressure/observation-binding-lifecycle/src/observation-binding-lifecycle-app.html"
          },
          "relation": null,
          "role": "primary",
          "rowId": "diagnostic:0:template:runtime-binding-behavior-framework-error:framework-error-code:AUR0803:src/observation-binding-lifecycle-app.html:1398:1411:runtime-binding-behavior:AUR0803"
        },
        "primarySeverity": "error",
        "rawRowCount": 1,
        "related": [],
        "subject": null
      },
      {
        "groupKey": "row:diagnostic:2:template:binding-source-assignment-strictness:semantic-runtime-product:no-framework-code:src/observation-binding-lifecycle-app.html:2225:2242:binding-source-assignment:target-to-source-type-mismatch",
        "maxRawSeverity": "warning",
        "primary": {
          "diagnostic": {
            "actionability": "guided",
            "anomaly": null,
            "category": "template-syntax",
            "code": "binding-source-assignment-strictness",
            "data": {
              "diagnosticAuthority": "semantic-runtime-product",
              "diagnosticDomain": "template",
              "diagnosticKind": "binding-source-assignment-strictness",
              "frameworkErrorCode": null,
              "frameworkRawErrorAuthority": null,
              "missingInput": "binding-source-assignment:target-to-source-type-mismatch",
              "missingInputs": [
                "binding-source-assignment:target-to-source-type-mismatch"
              ],
              "phase": null,
              "relatedInformation": [],
              "relatedQueryKind": "template-diagnostics",
              "repairAffordance": {
                "actionKind": "align-assignment-type",
                "actionability": "guided",
                "changeDomain": "app-source",
                "planKind": "source-assignment-type-alignment",
                "readiness": "ready-to-plan",
                "targetSourceCoverage": "all"
              },
              "sourceRole": "template",
              "subject": {
                "source": {
                  "end": 2242,
                  "kind": "source-span-address",
                  "label": "src/observation-binding-lifecycle-app.html@2225..2242",
                  "path": "src/observation-binding-lifecycle-app.html",
                  "role": "binding-source-assignment",
                  "start": 2225
                },
                "span": null,
                "subjectKind": "template-expression",
                "uri": null
              },
              "taxonomy": {
                "actionability": "guided",
                "category": "template-syntax",
                "confidence": null,
                "impact": "degraded",
                "schema": "diagnostics-taxonomy/1"
              }
            },
            "file": "src/observation-binding-lifecycle-app.html",
            "impact": "degraded",
            "issues": [
              {
                "code": "binding-source-assignment-strictness",
                "kind": "binding-source-assignment-strictness",
                "message": "TypeChecker target-to-source assignment is not assignable after observer and value-converter writeback (number -> string); Aurelia runtime still passes the observer value to astAssign."
              }
            ],
            "message": "TypeChecker target-to-source assignment is not assignable after observer and value-converter writeback (number -> string); Aurelia runtime still passes the observer value to astAssign.",
            "related": [],
            "severity": "warning",
            "source": "semantic-runtime:template",
            "span": {
              "end": 2242,
              "start": 2225
            },
            "spanText": "reachedChildValue",
            "status": "primary",
            "uri": "fixtures://pressure/observation-binding-lifecycle/src/observation-binding-lifecycle-app.html"
          },
          "relation": null,
          "role": "primary",
          "rowId": "diagnostic:2:template:binding-source-assignment-strictness:semantic-runtime-product:no-framework-code:src/observation-binding-lifecycle-app.html:2225:2242:binding-source-assignment:target-to-source-type-mismatch"
        },
        "primarySeverity": "warning",
        "rawRowCount": 1,
        "related": [],
        "subject": {
          "source": null,
          "span": {
            "end": 2242,
            "start": 2225
          },
          "subjectKind": "template-expression",
          "uri": "file:///c:/projects/aurelia-ls2/packages/semantic-runtime/fixtures/pressure/observation-binding-lifecycle/src/observation-binding-lifecycle-app.html"
        }
      },
      {
        "groupKey": "row:diagnostic:3:template:binding-target-assignment-strictness:semantic-runtime-product:no-framework-code:src/observation-binding-lifecycle-app.html:2225:2242:binding-target-assignment:source-to-target-type-mismatch",
        "maxRawSeverity": "warning",
        "primary": {
          "diagnostic": {
            "actionability": "guided",
            "anomaly": null,
            "category": "template-syntax",
            "code": "binding-target-assignment-strictness",
            "data": {
              "diagnosticAuthority": "semantic-runtime-product",
              "diagnosticDomain": "template",
              "diagnosticKind": "binding-target-assignment-strictness",
              "frameworkErrorCode": null,
              "frameworkRawErrorAuthority": null,
              "missingInput": "binding-target-assignment:source-to-target-type-mismatch",
              "missingInputs": [
                "binding-target-assignment:source-to-target-type-mismatch"
              ],
              "phase": null,
              "relatedInformation": [],
              "relatedQueryKind": "template-diagnostics",
              "repairAffordance": {
                "actionKind": "rewrite-expression",
                "actionability": "guided",
                "changeDomain": "app-source",
                "planKind": "template-expression-rewrite",
                "readiness": "ready-to-plan",
                "targetSourceCoverage": "all"
              },
              "sourceRole": "template",
              "subject": {
                "source": {
                  "end": 2242,
                  "kind": "source-span-address",
                  "label": "src/observation-binding-lifecycle-app.html@2225..2242",
                  "path": "src/observation-binding-lifecycle-app.html",
                  "role": "binding-source-assignment",
                  "start": 2225
                },
                "span": null,
                "subjectKind": "template-expression",
                "uri": null
              },
              "taxonomy": {
                "actionability": "guided",
                "category": "template-syntax",
                "confidence": null,
                "impact": "degraded",
                "schema": "diagnostics-taxonomy/1"
              }
            },
            "file": "src/observation-binding-lifecycle-app.html",
            "impact": "degraded",
            "issues": [
              {
                "code": "binding-target-assignment-strictness",
                "kind": "binding-target-assignment-strictness",
                "message": "Binding source type string is not assignable to target 'value' of type number."
              }
            ],
            "message": "Binding source type string is not assignable to target 'value' of type number.",
            "related": [],
            "severity": "warning",
            "source": "semantic-runtime:template",
            "span": {
              "end": 2242,
              "start": 2225
            },
            "spanText": "reachedChildValue",
            "status": "primary",
            "uri": "fixtures://pressure/observation-binding-lifecycle/src/observation-binding-lifecycle-app.html"
          },
          "relation": null,
          "role": "primary",
          "rowId": "diagnostic:3:template:binding-target-assignment-strictness:semantic-runtime-product:no-framework-code:src/observation-binding-lifecycle-app.html:2225:2242:binding-target-assignment:source-to-target-type-mismatch"
        },
        "primarySeverity": "warning",
        "rawRowCount": 1,
        "related": [],
        "subject": {
          "source": null,
          "span": {
            "end": 2242,
            "start": 2225
          },
          "subjectKind": "template-expression",
          "uri": "file:///c:/projects/aurelia-ls2/packages/semantic-runtime/fixtures/pressure/observation-binding-lifecycle/src/observation-binding-lifecycle-app.html"
        }
      },
      {
        "groupKey": "row:diagnostic:4:template:binding-target-assignment-strictness:semantic-runtime-product:no-framework-code:src/observation-binding-lifecycle-app.html:2350:2367:binding-target-assignment:source-to-target-type-mismatch",
        "maxRawSeverity": "warning",
        "primary": {
          "diagnostic": {
            "actionability": "guided",
            "anomaly": null,
            "category": "template-syntax",
            "code": "binding-target-assignment-strictness",
            "data": {
              "diagnosticAuthority": "semantic-runtime-product",
              "diagnosticDomain": "template",
              "diagnosticKind": "binding-target-assignment-strictness",
              "frameworkErrorCode": null,
              "frameworkRawErrorAuthority": null,
              "missingInput": "binding-target-assignment:source-to-target-type-mismatch",
              "missingInputs": [
                "binding-target-assignment:source-to-target-type-mismatch"
              ],
              "phase": null,
              "relatedInformation": [],
              "relatedQueryKind": "template-diagnostics",
              "repairAffordance": {
                "actionKind": "rewrite-expression",
                "actionability": "guided",
                "changeDomain": "app-source",
                "planKind": "template-expression-rewrite",
                "readiness": "ready-to-plan",
                "targetSourceCoverage": "all"
              },
              "sourceRole": "template",
              "subject": {
                "source": {
                  "end": 2367,
                  "kind": "source-span-address",
                  "label": "src/observation-binding-lifecycle-app.html@2350..2367",
                  "path": "src/observation-binding-lifecycle-app.html",
                  "role": "binding-source-assignment",
                  "start": 2350
                },
                "span": null,
                "subjectKind": "template-expression",
                "uri": null
              },
              "taxonomy": {
                "actionability": "guided",
                "category": "template-syntax",
                "confidence": null,
                "impact": "degraded",
                "schema": "diagnostics-taxonomy/1"
              }
            },
            "file": "src/observation-binding-lifecycle-app.html",
            "impact": "degraded",
            "issues": [
              {
                "code": "binding-target-assignment-strictness",
                "kind": "binding-target-assignment-strictness",
                "message": "Binding source type string is not assignable to target 'value' of type number."
              }
            ],
            "message": "Binding source type string is not assignable to target 'value' of type number.",
            "related": [],
            "severity": "warning",
            "source": "semantic-runtime:template",
            "span": {
              "end": 2367,
              "start": 2350
            },
            "spanText": "blockedChildValue",
            "status": "primary",
            "uri": "fixtures://pressure/observation-binding-lifecycle/src/observation-binding-lifecycle-app.html"
          },
          "relation": null,
          "role": "primary",
          "rowId": "diagnostic:4:template:binding-target-assignment-strictness:semantic-runtime-product:no-framework-code:src/observation-binding-lifecycle-app.html:2350:2367:binding-target-assignment:source-to-target-type-mismatch"
        },
        "primarySeverity": "warning",
        "rawRowCount": 1,
        "related": [],
        "subject": {
          "source": null,
          "span": {
            "end": 2367,
            "start": 2350
          },
          "subjectKind": "template-expression",
          "uri": "file:///c:/projects/aurelia-ls2/packages/semantic-runtime/fixtures/pressure/observation-binding-lifecycle/src/observation-binding-lifecycle-app.html"
        }
      },
      {
        "groupKey": "row:diagnostic:5:template:runtime-binding-behavior-framework-error:framework-error-code:AUR0801:src/observation-binding-lifecycle-app.html:2379:2383:runtime-binding-behavior:AUR0801",
        "maxRawSeverity": "error",
        "primary": {
          "diagnostic": {
            "actionability": "guided",
            "anomaly": null,
            "category": "template-syntax",
            "code": "AUR0801",
            "data": {
              "diagnosticAuthority": "framework-error-code",
              "diagnosticDomain": "template",
              "diagnosticKind": "runtime-binding-behavior-framework-error",
              "frameworkErrorCode": "AUR0801",
              "frameworkRawErrorAuthority": null,
              "missingInput": "runtime-binding-behavior:AUR0801",
              "missingInputs": [
                "runtime-binding-behavior:AUR0801"
              ],
              "phase": "bind",
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
            "file": "src/observation-binding-lifecycle-app.html",
            "impact": "blocking",
            "issues": [
              {
                "code": "AUR0801",
                "kind": "runtime-binding-behavior-framework-error",
                "message": "Aurelia runtime binding behavior AUR0801 rejects this binding: self can only be applied to listener bindings created by trigger or capture commands.."
              }
            ],
            "message": "Aurelia runtime binding behavior AUR0801 rejects this binding: self can only be applied to listener bindings created by trigger or capture commands..",
            "related": [],
            "severity": "error",
            "source": "semantic-runtime:template",
            "span": {
              "end": 2383,
              "start": 2379
            },
            "spanText": "self",
            "status": "primary",
            "uri": "fixtures://pressure/observation-binding-lifecycle/src/observation-binding-lifecycle-app.html"
          },
          "relation": null,
          "role": "primary",
          "rowId": "diagnostic:5:template:runtime-binding-behavior-framework-error:framework-error-code:AUR0801:src/observation-binding-lifecycle-app.html:2379:2383:runtime-binding-behavior:AUR0801"
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
        "actionability": "guided",
        "anomaly": null,
        "category": "template-syntax",
        "code": "AUR0803",
        "data": {
          "diagnosticAuthority": "framework-error-code",
          "diagnosticDomain": "template",
          "diagnosticKind": "runtime-binding-behavior-framework-error",
          "frameworkErrorCode": "AUR0803",
          "frameworkRawErrorAuthority": null,
          "missingInput": "runtime-binding-behavior:AUR0803",
          "missingInputs": [
            "runtime-binding-behavior:AUR0803"
          ],
          "phase": "bind",
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
        "file": "src/observation-binding-lifecycle-app.html",
        "impact": "blocking",
        "issues": [
          {
            "code": "AUR0803",
            "kind": "runtime-binding-behavior-framework-error",
            "message": "Aurelia runtime binding behavior AUR0803 rejects this binding: updateTrigger can only be applied to two-way or from-view PropertyBinding instances.."
          }
        ],
        "message": "Aurelia runtime binding behavior AUR0803 rejects this binding: updateTrigger can only be applied to two-way or from-view PropertyBinding instances..",
        "related": [],
        "severity": "error",
        "source": "semantic-runtime:template",
        "span": {
          "end": 1411,
          "start": 1398
        },
        "spanText": "updateTrigger",
        "status": "canonical",
        "uri": "fixtures://pressure/observation-binding-lifecycle/src/observation-binding-lifecycle-app.html"
      },
      {
        "actionability": "guided",
        "anomaly": null,
        "category": "template-syntax",
        "code": "AUR0801",
        "data": {
          "diagnosticAuthority": "framework-error-code",
          "diagnosticDomain": "template",
          "diagnosticKind": "runtime-binding-behavior-framework-error",
          "frameworkErrorCode": "AUR0801",
          "frameworkRawErrorAuthority": null,
          "missingInput": "runtime-binding-behavior:AUR0801",
          "missingInputs": [
            "runtime-binding-behavior:AUR0801"
          ],
          "phase": "bind",
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
        "file": "src/observation-binding-lifecycle-app.html",
        "impact": "blocking",
        "issues": [
          {
            "code": "AUR0801",
            "kind": "runtime-binding-behavior-framework-error",
            "message": "Aurelia runtime binding behavior AUR0801 rejects this binding: self can only be applied to listener bindings created by trigger or capture commands.."
          }
        ],
        "message": "Aurelia runtime binding behavior AUR0801 rejects this binding: self can only be applied to listener bindings created by trigger or capture commands..",
        "related": [],
        "severity": "error",
        "source": "semantic-runtime:template",
        "span": {
          "end": 164,
          "start": 160
        },
        "spanText": "self",
        "status": "canonical",
        "uri": "fixtures://pressure/observation-binding-lifecycle/src/observation-binding-lifecycle-app.html"
      },
      {
        "actionability": "guided",
        "anomaly": null,
        "category": "template-syntax",
        "code": "binding-source-assignment-strictness",
        "data": {
          "diagnosticAuthority": "semantic-runtime-product",
          "diagnosticDomain": "template",
          "diagnosticKind": "binding-source-assignment-strictness",
          "frameworkErrorCode": null,
          "frameworkRawErrorAuthority": null,
          "missingInput": "binding-source-assignment:target-to-source-type-mismatch",
          "missingInputs": [
            "binding-source-assignment:target-to-source-type-mismatch"
          ],
          "phase": null,
          "relatedInformation": [],
          "relatedQueryKind": "template-diagnostics",
          "repairAffordance": {
            "actionKind": "align-assignment-type",
            "actionability": "guided",
            "changeDomain": "app-source",
            "planKind": "source-assignment-type-alignment",
            "readiness": "ready-to-plan",
            "targetSourceCoverage": "all"
          },
          "sourceRole": "template",
          "subject": {
            "source": {
              "end": 2242,
              "kind": "source-span-address",
              "label": "src/observation-binding-lifecycle-app.html@2225..2242",
              "path": "src/observation-binding-lifecycle-app.html",
              "role": "binding-source-assignment",
              "start": 2225
            },
            "span": null,
            "subjectKind": "template-expression",
            "uri": null
          },
          "taxonomy": {
            "actionability": "guided",
            "category": "template-syntax",
            "confidence": null,
            "impact": "degraded",
            "schema": "diagnostics-taxonomy/1"
          }
        },
        "file": "src/observation-binding-lifecycle-app.html",
        "impact": "degraded",
        "issues": [
          {
            "code": "binding-source-assignment-strictness",
            "kind": "binding-source-assignment-strictness",
            "message": "TypeChecker target-to-source assignment is not assignable after observer and value-converter writeback (number -> string); Aurelia runtime still passes the observer value to astAssign."
          }
        ],
        "message": "TypeChecker target-to-source assignment is not assignable after observer and value-converter writeback (number -> string); Aurelia runtime still passes the observer value to astAssign.",
        "related": [],
        "severity": "warning",
        "source": "semantic-runtime:template",
        "span": {
          "end": 2242,
          "start": 2225
        },
        "spanText": "reachedChildValue",
        "status": "canonical",
        "uri": "fixtures://pressure/observation-binding-lifecycle/src/observation-binding-lifecycle-app.html"
      },
      {
        "actionability": "guided",
        "anomaly": null,
        "category": "template-syntax",
        "code": "binding-target-assignment-strictness",
        "data": {
          "diagnosticAuthority": "semantic-runtime-product",
          "diagnosticDomain": "template",
          "diagnosticKind": "binding-target-assignment-strictness",
          "frameworkErrorCode": null,
          "frameworkRawErrorAuthority": null,
          "missingInput": "binding-target-assignment:source-to-target-type-mismatch",
          "missingInputs": [
            "binding-target-assignment:source-to-target-type-mismatch"
          ],
          "phase": null,
          "relatedInformation": [],
          "relatedQueryKind": "template-diagnostics",
          "repairAffordance": {
            "actionKind": "rewrite-expression",
            "actionability": "guided",
            "changeDomain": "app-source",
            "planKind": "template-expression-rewrite",
            "readiness": "ready-to-plan",
            "targetSourceCoverage": "all"
          },
          "sourceRole": "template",
          "subject": {
            "source": {
              "end": 2242,
              "kind": "source-span-address",
              "label": "src/observation-binding-lifecycle-app.html@2225..2242",
              "path": "src/observation-binding-lifecycle-app.html",
              "role": "binding-source-assignment",
              "start": 2225
            },
            "span": null,
            "subjectKind": "template-expression",
            "uri": null
          },
          "taxonomy": {
            "actionability": "guided",
            "category": "template-syntax",
            "confidence": null,
            "impact": "degraded",
            "schema": "diagnostics-taxonomy/1"
          }
        },
        "file": "src/observation-binding-lifecycle-app.html",
        "impact": "degraded",
        "issues": [
          {
            "code": "binding-target-assignment-strictness",
            "kind": "binding-target-assignment-strictness",
            "message": "Binding source type string is not assignable to target 'value' of type number."
          }
        ],
        "message": "Binding source type string is not assignable to target 'value' of type number.",
        "related": [],
        "severity": "warning",
        "source": "semantic-runtime:template",
        "span": {
          "end": 2242,
          "start": 2225
        },
        "spanText": "reachedChildValue",
        "status": "canonical",
        "uri": "fixtures://pressure/observation-binding-lifecycle/src/observation-binding-lifecycle-app.html"
      },
      {
        "actionability": "guided",
        "anomaly": null,
        "category": "template-syntax",
        "code": "binding-target-assignment-strictness",
        "data": {
          "diagnosticAuthority": "semantic-runtime-product",
          "diagnosticDomain": "template",
          "diagnosticKind": "binding-target-assignment-strictness",
          "frameworkErrorCode": null,
          "frameworkRawErrorAuthority": null,
          "missingInput": "binding-target-assignment:source-to-target-type-mismatch",
          "missingInputs": [
            "binding-target-assignment:source-to-target-type-mismatch"
          ],
          "phase": null,
          "relatedInformation": [],
          "relatedQueryKind": "template-diagnostics",
          "repairAffordance": {
            "actionKind": "rewrite-expression",
            "actionability": "guided",
            "changeDomain": "app-source",
            "planKind": "template-expression-rewrite",
            "readiness": "ready-to-plan",
            "targetSourceCoverage": "all"
          },
          "sourceRole": "template",
          "subject": {
            "source": {
              "end": 2367,
              "kind": "source-span-address",
              "label": "src/observation-binding-lifecycle-app.html@2350..2367",
              "path": "src/observation-binding-lifecycle-app.html",
              "role": "binding-source-assignment",
              "start": 2350
            },
            "span": null,
            "subjectKind": "template-expression",
            "uri": null
          },
          "taxonomy": {
            "actionability": "guided",
            "category": "template-syntax",
            "confidence": null,
            "impact": "degraded",
            "schema": "diagnostics-taxonomy/1"
          }
        },
        "file": "src/observation-binding-lifecycle-app.html",
        "impact": "degraded",
        "issues": [
          {
            "code": "binding-target-assignment-strictness",
            "kind": "binding-target-assignment-strictness",
            "message": "Binding source type string is not assignable to target 'value' of type number."
          }
        ],
        "message": "Binding source type string is not assignable to target 'value' of type number.",
        "related": [],
        "severity": "warning",
        "source": "semantic-runtime:template",
        "span": {
          "end": 2367,
          "start": 2350
        },
        "spanText": "blockedChildValue",
        "status": "canonical",
        "uri": "fixtures://pressure/observation-binding-lifecycle/src/observation-binding-lifecycle-app.html"
      },
      {
        "actionability": "guided",
        "anomaly": null,
        "category": "template-syntax",
        "code": "AUR0801",
        "data": {
          "diagnosticAuthority": "framework-error-code",
          "diagnosticDomain": "template",
          "diagnosticKind": "runtime-binding-behavior-framework-error",
          "frameworkErrorCode": "AUR0801",
          "frameworkRawErrorAuthority": null,
          "missingInput": "runtime-binding-behavior:AUR0801",
          "missingInputs": [
            "runtime-binding-behavior:AUR0801"
          ],
          "phase": "bind",
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
        "file": "src/observation-binding-lifecycle-app.html",
        "impact": "blocking",
        "issues": [
          {
            "code": "AUR0801",
            "kind": "runtime-binding-behavior-framework-error",
            "message": "Aurelia runtime binding behavior AUR0801 rejects this binding: self can only be applied to listener bindings created by trigger or capture commands.."
          }
        ],
        "message": "Aurelia runtime binding behavior AUR0801 rejects this binding: self can only be applied to listener bindings created by trigger or capture commands..",
        "related": [],
        "severity": "error",
        "source": "semantic-runtime:template",
        "span": {
          "end": 2383,
          "start": 2379
        },
        "spanText": "self",
        "status": "canonical",
        "uri": "fixtures://pressure/observation-binding-lifecycle/src/observation-binding-lifecycle-app.html"
      },
      {
        "actionability": "guided",
        "anomaly": null,
        "category": "template-syntax",
        "code": "AUR0101",
        "data": {
          "diagnosticAuthority": "framework-error-code",
          "diagnosticDomain": "template",
          "diagnosticKind": "runtime-binding-behavior-framework-error",
          "frameworkErrorCode": "AUR0101",
          "frameworkRawErrorAuthority": null,
          "missingInput": "runtime-binding-behavior:AUR0101",
          "missingInputs": [
            "runtime-binding-behavior:AUR0101"
          ],
          "phase": "bind",
          "relatedInformation": [],
          "relatedQueryKind": "template-diagnostics",
          "repairAffordance": {
            "actionKind": "register-resource",
            "actionability": "guided",
            "changeDomain": "app-source",
            "planKind": "resource-registration",
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
        "file": "src/observation-binding-lifecycle-app.html",
        "impact": "blocking",
        "issues": [
          {
            "code": "AUR0101",
            "kind": "runtime-binding-behavior-framework-error",
            "message": "Aurelia runtime binding behavior AUR0101 rejects this binding: Binding behavior 'missingBehavior' was not resolved through the current compiler resource scope.."
          }
        ],
        "message": "Aurelia runtime binding behavior AUR0101 rejects this binding: Binding behavior 'missingBehavior' was not resolved through the current compiler resource scope..",
        "related": [],
        "severity": "error",
        "source": "semantic-runtime:template",
        "span": {
          "end": 263,
          "start": 248
        },
        "spanText": "missingBehavior",
        "status": "canonical",
        "uri": "fixtures://pressure/observation-binding-lifecycle/src/observation-binding-lifecycle-app.html"
      },
      {
        "actionability": "guided",
        "anomaly": null,
        "category": "template-syntax",
        "code": "AUR0101",
        "data": {
          "diagnosticAuthority": "framework-error-code",
          "diagnosticDomain": "template",
          "diagnosticKind": "runtime-binding-behavior-framework-error",
          "frameworkErrorCode": "AUR0101",
          "frameworkRawErrorAuthority": null,
          "missingInput": "runtime-binding-behavior:AUR0101",
          "missingInputs": [
            "runtime-binding-behavior:AUR0101"
          ],
          "phase": "bind",
          "relatedInformation": [],
          "relatedQueryKind": "template-diagnostics",
          "repairAffordance": {
            "actionKind": "register-resource",
            "actionability": "guided",
            "changeDomain": "app-source",
            "planKind": "resource-registration",
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
        "file": "src/observation-binding-lifecycle-app.html",
        "impact": "blocking",
        "issues": [
          {
            "code": "AUR0101",
            "kind": "runtime-binding-behavior-framework-error",
            "message": "Aurelia runtime binding behavior AUR0101 rejects this binding: Binding behavior 'missingBehavior' was not resolved through the current compiler resource scope.."
          }
        ],
        "message": "Aurelia runtime binding behavior AUR0101 rejects this binding: Binding behavior 'missingBehavior' was not resolved through the current compiler resource scope..",
        "related": [],
        "severity": "error",
        "source": "semantic-runtime:template",
        "span": {
          "end": 534,
          "start": 519
        },
        "spanText": "missingBehavior",
        "status": "canonical",
        "uri": "fixtures://pressure/observation-binding-lifecycle/src/observation-binding-lifecycle-app.html"
      }
    ]
  },
  "surfaces": {
    "lsp": {
      "diagnosticCount": 8,
      "diagnostics": [
        {
          "actionability": "guided",
          "anomaly": null,
          "category": "template-syntax",
          "code": "AUR0801",
          "data": {
            "diagnosticAuthority": "framework-error-code",
            "diagnosticDomain": "template",
            "diagnosticKind": "runtime-binding-behavior-framework-error",
            "frameworkErrorCode": "AUR0801",
            "frameworkRawErrorAuthority": null,
            "missingInput": "runtime-binding-behavior:AUR0801",
            "missingInputs": [
              "runtime-binding-behavior:AUR0801"
            ],
            "phase": "bind",
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
          "file": "src/observation-binding-lifecycle-app.html",
          "impact": "blocking",
          "issues": [
            {
              "code": "AUR0801",
              "kind": "runtime-binding-behavior-framework-error",
              "message": "Aurelia runtime binding behavior AUR0801 rejects this binding: self can only be applied to listener bindings created by trigger or capture commands.."
            }
          ],
          "message": "Aurelia runtime binding behavior AUR0801 rejects this binding: self can only be applied to listener bindings created by trigger or capture commands..",
          "related": [],
          "severity": "error",
          "source": "semantic-runtime:template",
          "span": {
            "end": 164,
            "start": 160
          },
          "spanText": "self",
          "status": "primary",
          "uri": "fixtures://pressure/observation-binding-lifecycle/src/observation-binding-lifecycle-app.html"
        },
        {
          "actionability": "guided",
          "anomaly": null,
          "category": "template-syntax",
          "code": "AUR0101",
          "data": {
            "diagnosticAuthority": "framework-error-code",
            "diagnosticDomain": "template",
            "diagnosticKind": "runtime-binding-behavior-framework-error",
            "frameworkErrorCode": "AUR0101",
            "frameworkRawErrorAuthority": null,
            "missingInput": "runtime-binding-behavior:AUR0101",
            "missingInputs": [
              "runtime-binding-behavior:AUR0101"
            ],
            "phase": "bind",
            "relatedInformation": [],
            "relatedQueryKind": "template-diagnostics",
            "repairAffordance": {
              "actionKind": "register-resource",
              "actionability": "guided",
              "changeDomain": "app-source",
              "planKind": "resource-registration",
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
          "file": "src/observation-binding-lifecycle-app.html",
          "impact": "blocking",
          "issues": [
            {
              "code": "AUR0101",
              "kind": "runtime-binding-behavior-framework-error",
              "message": "Aurelia runtime binding behavior AUR0101 rejects this binding: Binding behavior 'missingBehavior' was not resolved through the current compiler resource scope.."
            }
          ],
          "message": "Aurelia runtime binding behavior AUR0101 rejects this binding: Binding behavior 'missingBehavior' was not resolved through the current compiler resource scope..",
          "related": [],
          "severity": "error",
          "source": "semantic-runtime:template",
          "span": {
            "end": 263,
            "start": 248
          },
          "spanText": "missingBehavior",
          "status": "primary",
          "uri": "fixtures://pressure/observation-binding-lifecycle/src/observation-binding-lifecycle-app.html"
        },
        {
          "actionability": "guided",
          "anomaly": null,
          "category": "template-syntax",
          "code": "AUR0101",
          "data": {
            "diagnosticAuthority": "framework-error-code",
            "diagnosticDomain": "template",
            "diagnosticKind": "runtime-binding-behavior-framework-error",
            "frameworkErrorCode": "AUR0101",
            "frameworkRawErrorAuthority": null,
            "missingInput": "runtime-binding-behavior:AUR0101",
            "missingInputs": [
              "runtime-binding-behavior:AUR0101"
            ],
            "phase": "bind",
            "relatedInformation": [],
            "relatedQueryKind": "template-diagnostics",
            "repairAffordance": {
              "actionKind": "register-resource",
              "actionability": "guided",
              "changeDomain": "app-source",
              "planKind": "resource-registration",
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
          "file": "src/observation-binding-lifecycle-app.html",
          "impact": "blocking",
          "issues": [
            {
              "code": "AUR0101",
              "kind": "runtime-binding-behavior-framework-error",
              "message": "Aurelia runtime binding behavior AUR0101 rejects this binding: Binding behavior 'missingBehavior' was not resolved through the current compiler resource scope.."
            }
          ],
          "message": "Aurelia runtime binding behavior AUR0101 rejects this binding: Binding behavior 'missingBehavior' was not resolved through the current compiler resource scope..",
          "related": [],
          "severity": "error",
          "source": "semantic-runtime:template",
          "span": {
            "end": 534,
            "start": 519
          },
          "spanText": "missingBehavior",
          "status": "primary",
          "uri": "fixtures://pressure/observation-binding-lifecycle/src/observation-binding-lifecycle-app.html"
        },
        {
          "actionability": "guided",
          "anomaly": null,
          "category": "template-syntax",
          "code": "AUR0803",
          "data": {
            "diagnosticAuthority": "framework-error-code",
            "diagnosticDomain": "template",
            "diagnosticKind": "runtime-binding-behavior-framework-error",
            "frameworkErrorCode": "AUR0803",
            "frameworkRawErrorAuthority": null,
            "missingInput": "runtime-binding-behavior:AUR0803",
            "missingInputs": [
              "runtime-binding-behavior:AUR0803"
            ],
            "phase": "bind",
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
          "file": "src/observation-binding-lifecycle-app.html",
          "impact": "blocking",
          "issues": [
            {
              "code": "AUR0803",
              "kind": "runtime-binding-behavior-framework-error",
              "message": "Aurelia runtime binding behavior AUR0803 rejects this binding: updateTrigger can only be applied to two-way or from-view PropertyBinding instances.."
            }
          ],
          "message": "Aurelia runtime binding behavior AUR0803 rejects this binding: updateTrigger can only be applied to two-way or from-view PropertyBinding instances..",
          "related": [],
          "severity": "error",
          "source": "semantic-runtime:template",
          "span": {
            "end": 1411,
            "start": 1398
          },
          "spanText": "updateTrigger",
          "status": "primary",
          "uri": "fixtures://pressure/observation-binding-lifecycle/src/observation-binding-lifecycle-app.html"
        },
        {
          "actionability": "guided",
          "anomaly": null,
          "category": "template-syntax",
          "code": "binding-source-assignment-strictness",
          "data": {
            "diagnosticAuthority": "semantic-runtime-product",
            "diagnosticDomain": "template",
            "diagnosticKind": "binding-source-assignment-strictness",
            "frameworkErrorCode": null,
            "frameworkRawErrorAuthority": null,
            "missingInput": "binding-source-assignment:target-to-source-type-mismatch",
            "missingInputs": [
              "binding-source-assignment:target-to-source-type-mismatch"
            ],
            "phase": null,
            "relatedInformation": [],
            "relatedQueryKind": "template-diagnostics",
            "repairAffordance": {
              "actionKind": "align-assignment-type",
              "actionability": "guided",
              "changeDomain": "app-source",
              "planKind": "source-assignment-type-alignment",
              "readiness": "ready-to-plan",
              "targetSourceCoverage": "all"
            },
            "sourceRole": "template",
            "subject": {
              "source": {
                "end": 2242,
                "kind": "source-span-address",
                "label": "src/observation-binding-lifecycle-app.html@2225..2242",
                "path": "src/observation-binding-lifecycle-app.html",
                "role": "binding-source-assignment",
                "start": 2225
              },
              "span": null,
              "subjectKind": "template-expression",
              "uri": null
            },
            "taxonomy": {
              "actionability": "guided",
              "category": "template-syntax",
              "confidence": null,
              "impact": "degraded",
              "schema": "diagnostics-taxonomy/1"
            }
          },
          "file": "src/observation-binding-lifecycle-app.html",
          "impact": "degraded",
          "issues": [
            {
              "code": "binding-source-assignment-strictness",
              "kind": "binding-source-assignment-strictness",
              "message": "TypeChecker target-to-source assignment is not assignable after observer and value-converter writeback (number -> string); Aurelia runtime still passes the observer value to astAssign."
            }
          ],
          "message": "TypeChecker target-to-source assignment is not assignable after observer and value-converter writeback (number -> string); Aurelia runtime still passes the observer value to astAssign.",
          "related": [],
          "severity": "warning",
          "source": "semantic-runtime:template",
          "span": {
            "end": 2242,
            "start": 2225
          },
          "spanText": "reachedChildValue",
          "status": "primary",
          "uri": "fixtures://pressure/observation-binding-lifecycle/src/observation-binding-lifecycle-app.html"
        },
        {
          "actionability": "guided",
          "anomaly": null,
          "category": "template-syntax",
          "code": "binding-target-assignment-strictness",
          "data": {
            "diagnosticAuthority": "semantic-runtime-product",
            "diagnosticDomain": "template",
            "diagnosticKind": "binding-target-assignment-strictness",
            "frameworkErrorCode": null,
            "frameworkRawErrorAuthority": null,
            "missingInput": "binding-target-assignment:source-to-target-type-mismatch",
            "missingInputs": [
              "binding-target-assignment:source-to-target-type-mismatch"
            ],
            "phase": null,
            "relatedInformation": [],
            "relatedQueryKind": "template-diagnostics",
            "repairAffordance": {
              "actionKind": "rewrite-expression",
              "actionability": "guided",
              "changeDomain": "app-source",
              "planKind": "template-expression-rewrite",
              "readiness": "ready-to-plan",
              "targetSourceCoverage": "all"
            },
            "sourceRole": "template",
            "subject": {
              "source": {
                "end": 2242,
                "kind": "source-span-address",
                "label": "src/observation-binding-lifecycle-app.html@2225..2242",
                "path": "src/observation-binding-lifecycle-app.html",
                "role": "binding-source-assignment",
                "start": 2225
              },
              "span": null,
              "subjectKind": "template-expression",
              "uri": null
            },
            "taxonomy": {
              "actionability": "guided",
              "category": "template-syntax",
              "confidence": null,
              "impact": "degraded",
              "schema": "diagnostics-taxonomy/1"
            }
          },
          "file": "src/observation-binding-lifecycle-app.html",
          "impact": "degraded",
          "issues": [
            {
              "code": "binding-target-assignment-strictness",
              "kind": "binding-target-assignment-strictness",
              "message": "Binding source type string is not assignable to target 'value' of type number."
            }
          ],
          "message": "Binding source type string is not assignable to target 'value' of type number.",
          "related": [],
          "severity": "warning",
          "source": "semantic-runtime:template",
          "span": {
            "end": 2242,
            "start": 2225
          },
          "spanText": "reachedChildValue",
          "status": "primary",
          "uri": "fixtures://pressure/observation-binding-lifecycle/src/observation-binding-lifecycle-app.html"
        },
        {
          "actionability": "guided",
          "anomaly": null,
          "category": "template-syntax",
          "code": "binding-target-assignment-strictness",
          "data": {
            "diagnosticAuthority": "semantic-runtime-product",
            "diagnosticDomain": "template",
            "diagnosticKind": "binding-target-assignment-strictness",
            "frameworkErrorCode": null,
            "frameworkRawErrorAuthority": null,
            "missingInput": "binding-target-assignment:source-to-target-type-mismatch",
            "missingInputs": [
              "binding-target-assignment:source-to-target-type-mismatch"
            ],
            "phase": null,
            "relatedInformation": [],
            "relatedQueryKind": "template-diagnostics",
            "repairAffordance": {
              "actionKind": "rewrite-expression",
              "actionability": "guided",
              "changeDomain": "app-source",
              "planKind": "template-expression-rewrite",
              "readiness": "ready-to-plan",
              "targetSourceCoverage": "all"
            },
            "sourceRole": "template",
            "subject": {
              "source": {
                "end": 2367,
                "kind": "source-span-address",
                "label": "src/observation-binding-lifecycle-app.html@2350..2367",
                "path": "src/observation-binding-lifecycle-app.html",
                "role": "binding-source-assignment",
                "start": 2350
              },
              "span": null,
              "subjectKind": "template-expression",
              "uri": null
            },
            "taxonomy": {
              "actionability": "guided",
              "category": "template-syntax",
              "confidence": null,
              "impact": "degraded",
              "schema": "diagnostics-taxonomy/1"
            }
          },
          "file": "src/observation-binding-lifecycle-app.html",
          "impact": "degraded",
          "issues": [
            {
              "code": "binding-target-assignment-strictness",
              "kind": "binding-target-assignment-strictness",
              "message": "Binding source type string is not assignable to target 'value' of type number."
            }
          ],
          "message": "Binding source type string is not assignable to target 'value' of type number.",
          "related": [],
          "severity": "warning",
          "source": "semantic-runtime:template",
          "span": {
            "end": 2367,
            "start": 2350
          },
          "spanText": "blockedChildValue",
          "status": "primary",
          "uri": "fixtures://pressure/observation-binding-lifecycle/src/observation-binding-lifecycle-app.html"
        },
        {
          "actionability": "guided",
          "anomaly": null,
          "category": "template-syntax",
          "code": "AUR0801",
          "data": {
            "diagnosticAuthority": "framework-error-code",
            "diagnosticDomain": "template",
            "diagnosticKind": "runtime-binding-behavior-framework-error",
            "frameworkErrorCode": "AUR0801",
            "frameworkRawErrorAuthority": null,
            "missingInput": "runtime-binding-behavior:AUR0801",
            "missingInputs": [
              "runtime-binding-behavior:AUR0801"
            ],
            "phase": "bind",
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
          "file": "src/observation-binding-lifecycle-app.html",
          "impact": "blocking",
          "issues": [
            {
              "code": "AUR0801",
              "kind": "runtime-binding-behavior-framework-error",
              "message": "Aurelia runtime binding behavior AUR0801 rejects this binding: self can only be applied to listener bindings created by trigger or capture commands.."
            }
          ],
          "message": "Aurelia runtime binding behavior AUR0801 rejects this binding: self can only be applied to listener bindings created by trigger or capture commands..",
          "related": [],
          "severity": "error",
          "source": "semantic-runtime:template",
          "span": {
            "end": 2383,
            "start": 2379
          },
          "spanText": "self",
          "status": "primary",
          "uri": "fixtures://pressure/observation-binding-lifecycle/src/observation-binding-lifecycle-app.html"
        }
      ]
    }
  },
  "uri": "fixtures://pressure/observation-binding-lifecycle/src/observation-binding-lifecycle-app.html"
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
