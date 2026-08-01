# template-spread-capture-semantics diagnostics lane snapshot

Fixture: `packages/semantic-runtime/fixtures/pressure/template-spread-capture-semantics`
Probe file: `packages/lane-harness/probes/template-spread-capture-semantics.probes.json`
Lane: `diagnostics`

This snapshot records observed language-server behavior. Operator verdicts live in the probe data.

## spread-capture-app-template

### Probe

```json
{
  "file": "src/template-spread-capture-semantics-app.html"
}
```

### publishDiagnostics

```json
{
  "diagnosticCount": 8,
  "diagnostics": [
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
      "message": "Aurelia runtime binding behavior AUR0101 rejects this binding: Binding behavior 'missingSpreadBehavior' was not resolved through the current compiler resource scope..",
      "range": {
        "end": {
          "character": 65,
          "line": 4
        },
        "start": {
          "character": 44,
          "line": 4
        }
      },
      "rangeText": "missingSpreadBehavior",
      "relatedInformation": [],
      "severity": "error",
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
        "missingInput": "binding-target-assignment:source-nullish-to-required-target",
        "missingInputs": [
          "binding-target-assignment:source-nullish-to-required-target"
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
            "end": 711,
            "kind": "source-span-address",
            "label": "src/template-spread-capture-semantics-app.html@697..711",
            "path": "src/template-spread-capture-semantics-app.html",
            "role": "binding-source-assignment",
            "start": 697
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
      "message": "Binding source type string | undefined may be nullish, but target 'title' requires string.",
      "range": {
        "end": {
          "character": 32,
          "line": 11
        },
        "start": {
          "character": 18,
          "line": 11
        }
      },
      "rangeText": "optionalSpread",
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
        "missingInput": "binding-target-assignment:source-nullish-to-required-target",
        "missingInputs": [
          "binding-target-assignment:source-nullish-to-required-target"
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
            "end": 767,
            "kind": "source-span-address",
            "label": "src/template-spread-capture-semantics-app.html@745..767",
            "path": "src/template-spread-capture-semantics-app.html",
            "role": "binding-source-assignment",
            "start": 745
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
      "message": "Binding source type string | undefined may be nullish, but target 'title' requires string.",
      "range": {
        "end": {
          "character": 40,
          "line": 12
        },
        "start": {
          "character": 18,
          "line": 12
        }
      },
      "rangeText": "presentUndefinedSpread",
      "relatedInformation": [],
      "severity": "warning",
      "source": "aurelia"
    },
    {
      "anomaly": null,
      "code": "AUR0720",
      "data": {
        "diagnosticAuthority": "framework-error-code",
        "diagnosticDomain": "template",
        "diagnosticKind": "template-compiler-error",
        "frameworkErrorCode": "AUR0720",
        "frameworkRawErrorAuthority": null,
        "missingInput": "template-compiler:AUR0720",
        "missingInputs": [
          "template-compiler:AUR0720"
        ],
        "phase": "attribute-classification",
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
      "message": "Aurelia template compiler AUR0720 rejects this template syntax: Spreading syntax \"...xxx\" is reserved. Encountered \"...$element\"..",
      "range": {
        "end": {
          "character": 26,
          "line": 23
        },
        "start": {
          "character": 15,
          "line": 23
        }
      },
      "rangeText": "...$element",
      "relatedInformation": [],
      "severity": "error",
      "source": "aurelia"
    },
    {
      "anomaly": null,
      "code": "AUR0820",
      "data": {
        "diagnosticAuthority": "framework-error-code",
        "diagnosticDomain": "template",
        "diagnosticKind": "runtime-renderer-framework-error",
        "frameworkErrorCode": "AUR0820",
        "frameworkRawErrorAuthority": null,
        "missingInput": "runtime-renderer:AUR0820",
        "missingInputs": [
          "runtime-renderer:AUR0820"
        ],
        "phase": "render",
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
      "message": "Aurelia runtime renderer AUR0820 rejects this instruction input: Invalid spread target $element..",
      "range": {
        "end": {
          "character": 23,
          "line": 24
        },
        "start": {
          "character": 15,
          "line": 24
        }
      },
      "rangeText": "$element",
      "relatedInformation": [],
      "severity": "error",
      "source": "aurelia"
    },
    {
      "anomaly": null,
      "code": "AUR0720",
      "data": {
        "diagnosticAuthority": "framework-error-code",
        "diagnosticDomain": "template",
        "diagnosticKind": "template-compiler-error",
        "frameworkErrorCode": "AUR0720",
        "frameworkRawErrorAuthority": null,
        "missingInput": "template-compiler:AUR0720",
        "missingInputs": [
          "template-compiler:AUR0720"
        ],
        "phase": "attribute-classification",
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
      "message": "Aurelia template compiler AUR0720 rejects this template syntax: Spreading syntax \"...xxx\" is reserved. Encountered \"...$bindables\"..",
      "range": {
        "end": {
          "character": 20,
          "line": 25
        },
        "start": {
          "character": 7,
          "line": 25
        }
      },
      "rangeText": "...$bindables",
      "relatedInformation": [],
      "severity": "error",
      "source": "aurelia"
    },
    {
      "anomaly": null,
      "code": "AUR9999",
      "data": {
        "diagnosticAuthority": "framework-error-code",
        "diagnosticDomain": "template",
        "diagnosticKind": "runtime-binding-framework-error",
        "frameworkErrorCode": "AUR9999",
        "frameworkRawErrorAuthority": null,
        "missingInput": "runtime-binding:AUR9999",
        "missingInputs": [
          "runtime-binding:AUR9999"
        ],
        "phase": "spread-bind",
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
      "message": "Aurelia runtime binding AUR9999 rejects this binding input: SpreadBinding.bind requires the hydration-context controller scope to have a parent scope..",
      "range": {
        "end": {
          "character": 16,
          "line": 26
        },
        "start": {
          "character": 7,
          "line": 26
        }
      },
      "rangeText": "...$attrs",
      "relatedInformation": [],
      "severity": "error",
      "source": "aurelia"
    },
    {
      "anomaly": null,
      "code": "AUR9998",
      "data": {
        "diagnosticAuthority": "framework-error-code",
        "diagnosticDomain": "template",
        "diagnosticKind": "runtime-binding-framework-error",
        "frameworkErrorCode": "AUR9998",
        "frameworkRawErrorAuthority": null,
        "missingInput": "runtime-binding:AUR9998",
        "missingInputs": [
          "runtime-binding:AUR9998"
        ],
        "phase": "spread-child-admission",
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
      "message": "Aurelia runtime binding AUR9998 rejects this binding input: SpreadBinding.addChild cannot admit captured template controller \"inner-gate\" on \"input\"..",
      "range": {
        "end": {
          "character": 33,
          "line": 45
        },
        "start": {
          "character": 4,
          "line": 45
        }
      },
      "rangeText": "inner-gate.bind=\"showCapture\"",
      "relatedInformation": [],
      "severity": "error",
      "source": "aurelia"
    }
  ],
  "outcome": "published",
  "uri": "fixtures://pressure/template-spread-capture-semantics/src/template-spread-capture-semantics-app.html"
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
            "filePath": "src/template-spread-capture-semantics-app.html"
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
            "filePath": "src/template-spread-capture-semantics-app.html"
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
            "filePath": "src/template-spread-capture-semantics-app.html"
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
                  "label": "src/template-spread-capture-semantics-app.html",
                  "path": "src/template-spread-capture-semantics-app.html",
                  "sourceFileRole": "template",
                  "sourceWorkspaceKey": "template-spread-capture-semantics"
                },
                "end": 1265,
                "kind": "source-span-address",
                "label": "src/template-spread-capture-semantics-app.html@1254..1265",
                "path": "src/template-spread-capture-semantics-app.html",
                "role": "name",
                "sourceFileRole": "template",
                "sourceWorkspaceKey": "template-spread-capture-semantics",
                "start": 1254
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
                  "label": "src/template-spread-capture-semantics-app.html",
                  "path": "src/template-spread-capture-semantics-app.html",
                  "sourceFileRole": "template",
                  "sourceWorkspaceKey": "template-spread-capture-semantics"
                },
                "end": 1318,
                "kind": "source-span-address",
                "label": "src/template-spread-capture-semantics-app.html@1310..1318",
                "path": "src/template-spread-capture-semantics-app.html",
                "role": "name",
                "sourceFileRole": "template",
                "sourceWorkspaceKey": "template-spread-capture-semantics",
                "start": 1310
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
                  "label": "src/template-spread-capture-semantics-app.html",
                  "path": "src/template-spread-capture-semantics-app.html",
                  "sourceFileRole": "template",
                  "sourceWorkspaceKey": "template-spread-capture-semantics"
                },
                "end": 1375,
                "kind": "source-span-address",
                "label": "src/template-spread-capture-semantics-app.html@1362..1375",
                "path": "src/template-spread-capture-semantics-app.html",
                "role": "name",
                "sourceFileRole": "template",
                "sourceWorkspaceKey": "template-spread-capture-semantics",
                "start": 1362
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
                  "label": "src/template-spread-capture-semantics-app.html",
                  "path": "src/template-spread-capture-semantics-app.html",
                  "sourceFileRole": "template",
                  "sourceWorkspaceKey": "template-spread-capture-semantics"
                },
                "end": 1413,
                "kind": "source-span-address",
                "label": "src/template-spread-capture-semantics-app.html@1404..1413",
                "path": "src/template-spread-capture-semantics-app.html",
                "role": "range",
                "sourceFileRole": "template",
                "sourceWorkspaceKey": "template-spread-capture-semantics",
                "start": 1404
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
                  "label": "src/template-spread-capture-semantics-app.html",
                  "path": "src/template-spread-capture-semantics-app.html",
                  "sourceFileRole": "template",
                  "sourceWorkspaceKey": "template-spread-capture-semantics"
                },
                "end": 1962,
                "kind": "source-span-address",
                "label": "src/template-spread-capture-semantics-app.html@1933..1962",
                "path": "src/template-spread-capture-semantics-app.html",
                "role": "range",
                "sourceFileRole": "template",
                "sourceWorkspaceKey": "template-spread-capture-semantics",
                "start": 1933
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
                  "label": "src/template-spread-capture-semantics-app.html",
                  "path": "src/template-spread-capture-semantics-app.html",
                  "sourceFileRole": "template",
                  "sourceWorkspaceKey": "template-spread-capture-semantics"
                },
                "end": 236,
                "kind": "source-span-address",
                "label": "src/template-spread-capture-semantics-app.html@215..236",
                "path": "src/template-spread-capture-semantics-app.html",
                "role": "name",
                "sourceFileRole": "template",
                "sourceWorkspaceKey": "template-spread-capture-semantics",
                "start": 215
              }
            },
            {
              "count": 1,
              "facets": [
                "authored-source",
                "exact-authored-span"
              ],
              "source": {
                "end": 711,
                "kind": "source-span-address",
                "label": "src/template-spread-capture-semantics-app.html@697..711",
                "path": "src/template-spread-capture-semantics-app.html",
                "role": "binding-source-assignment",
                "start": 697
              }
            },
            {
              "count": 1,
              "facets": [
                "authored-source",
                "exact-authored-span"
              ],
              "source": {
                "end": 767,
                "kind": "source-span-address",
                "label": "src/template-spread-capture-semantics-app.html@745..767",
                "path": "src/template-spread-capture-semantics-app.html",
                "role": "binding-source-assignment",
                "start": 745
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
        "groupKey": "row:diagnostic:5:template:runtime-binding-behavior-framework-error:framework-error-code:AUR0101:src/template-spread-capture-semantics-app.html:215:236:runtime-binding-behavior:AUR0101",
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
            "file": "src/template-spread-capture-semantics-app.html",
            "impact": "blocking",
            "issues": [
              {
                "code": "AUR0101",
                "kind": "runtime-binding-behavior-framework-error",
                "message": "Aurelia runtime binding behavior AUR0101 rejects this binding: Binding behavior 'missingSpreadBehavior' was not resolved through the current compiler resource scope.."
              }
            ],
            "message": "Aurelia runtime binding behavior AUR0101 rejects this binding: Binding behavior 'missingSpreadBehavior' was not resolved through the current compiler resource scope..",
            "related": [],
            "severity": "error",
            "source": "semantic-runtime:template",
            "span": {
              "end": 236,
              "start": 215
            },
            "spanText": "missingSpreadBehavior",
            "status": "primary",
            "uri": "fixtures://pressure/template-spread-capture-semantics/src/template-spread-capture-semantics-app.html"
          },
          "relation": null,
          "role": "primary",
          "rowId": "diagnostic:5:template:runtime-binding-behavior-framework-error:framework-error-code:AUR0101:src/template-spread-capture-semantics-app.html:215:236:runtime-binding-behavior:AUR0101"
        },
        "primarySeverity": "error",
        "rawRowCount": 1,
        "related": [],
        "subject": null
      },
      {
        "groupKey": "row:diagnostic:6:template:binding-target-assignment-strictness:semantic-runtime-product:no-framework-code:src/template-spread-capture-semantics-app.html:697:711:binding-target-assignment:source-nullish-to-required-target",
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
              "missingInput": "binding-target-assignment:source-nullish-to-required-target",
              "missingInputs": [
                "binding-target-assignment:source-nullish-to-required-target"
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
                  "end": 711,
                  "kind": "source-span-address",
                  "label": "src/template-spread-capture-semantics-app.html@697..711",
                  "path": "src/template-spread-capture-semantics-app.html",
                  "role": "binding-source-assignment",
                  "start": 697
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
            "file": "src/template-spread-capture-semantics-app.html",
            "impact": "degraded",
            "issues": [
              {
                "code": "binding-target-assignment-strictness",
                "kind": "binding-target-assignment-strictness",
                "message": "Binding source type string | undefined may be nullish, but target 'title' requires string."
              }
            ],
            "message": "Binding source type string | undefined may be nullish, but target 'title' requires string.",
            "related": [],
            "severity": "warning",
            "source": "semantic-runtime:template",
            "span": {
              "end": 711,
              "start": 697
            },
            "spanText": "optionalSpread",
            "status": "primary",
            "uri": "fixtures://pressure/template-spread-capture-semantics/src/template-spread-capture-semantics-app.html"
          },
          "relation": null,
          "role": "primary",
          "rowId": "diagnostic:6:template:binding-target-assignment-strictness:semantic-runtime-product:no-framework-code:src/template-spread-capture-semantics-app.html:697:711:binding-target-assignment:source-nullish-to-required-target"
        },
        "primarySeverity": "warning",
        "rawRowCount": 1,
        "related": [],
        "subject": {
          "source": null,
          "span": {
            "end": 711,
            "start": 697
          },
          "subjectKind": "template-expression",
          "uri": "file:///c:/projects/aurelia-ls2/packages/semantic-runtime/fixtures/pressure/template-spread-capture-semantics/src/template-spread-capture-semantics-app.html"
        }
      },
      {
        "groupKey": "row:diagnostic:7:template:binding-target-assignment-strictness:semantic-runtime-product:no-framework-code:src/template-spread-capture-semantics-app.html:745:767:binding-target-assignment:source-nullish-to-required-target",
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
              "missingInput": "binding-target-assignment:source-nullish-to-required-target",
              "missingInputs": [
                "binding-target-assignment:source-nullish-to-required-target"
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
                  "end": 767,
                  "kind": "source-span-address",
                  "label": "src/template-spread-capture-semantics-app.html@745..767",
                  "path": "src/template-spread-capture-semantics-app.html",
                  "role": "binding-source-assignment",
                  "start": 745
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
            "file": "src/template-spread-capture-semantics-app.html",
            "impact": "degraded",
            "issues": [
              {
                "code": "binding-target-assignment-strictness",
                "kind": "binding-target-assignment-strictness",
                "message": "Binding source type string | undefined may be nullish, but target 'title' requires string."
              }
            ],
            "message": "Binding source type string | undefined may be nullish, but target 'title' requires string.",
            "related": [],
            "severity": "warning",
            "source": "semantic-runtime:template",
            "span": {
              "end": 767,
              "start": 745
            },
            "spanText": "presentUndefinedSpread",
            "status": "primary",
            "uri": "fixtures://pressure/template-spread-capture-semantics/src/template-spread-capture-semantics-app.html"
          },
          "relation": null,
          "role": "primary",
          "rowId": "diagnostic:7:template:binding-target-assignment-strictness:semantic-runtime-product:no-framework-code:src/template-spread-capture-semantics-app.html:745:767:binding-target-assignment:source-nullish-to-required-target"
        },
        "primarySeverity": "warning",
        "rawRowCount": 1,
        "related": [],
        "subject": {
          "source": null,
          "span": {
            "end": 767,
            "start": 745
          },
          "subjectKind": "template-expression",
          "uri": "file:///c:/projects/aurelia-ls2/packages/semantic-runtime/fixtures/pressure/template-spread-capture-semantics/src/template-spread-capture-semantics-app.html"
        }
      },
      {
        "groupKey": "row:diagnostic:0:template:template-compiler-error:framework-error-code:AUR0720:src/template-spread-capture-semantics-app.html:1254:1265:template-compiler:AUR0720",
        "maxRawSeverity": "error",
        "primary": {
          "diagnostic": {
            "actionability": "guided",
            "anomaly": null,
            "category": "template-syntax",
            "code": "AUR0720",
            "data": {
              "diagnosticAuthority": "framework-error-code",
              "diagnosticDomain": "template",
              "diagnosticKind": "template-compiler-error",
              "frameworkErrorCode": "AUR0720",
              "frameworkRawErrorAuthority": null,
              "missingInput": "template-compiler:AUR0720",
              "missingInputs": [
                "template-compiler:AUR0720"
              ],
              "phase": "attribute-classification",
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
            "file": "src/template-spread-capture-semantics-app.html",
            "impact": "blocking",
            "issues": [
              {
                "code": "AUR0720",
                "kind": "template-compiler-error",
                "message": "Aurelia template compiler AUR0720 rejects this template syntax: Spreading syntax \"...xxx\" is reserved. Encountered \"...$element\".."
              }
            ],
            "message": "Aurelia template compiler AUR0720 rejects this template syntax: Spreading syntax \"...xxx\" is reserved. Encountered \"...$element\"..",
            "related": [],
            "severity": "error",
            "source": "semantic-runtime:template",
            "span": {
              "end": 1265,
              "start": 1254
            },
            "spanText": "...$element",
            "status": "primary",
            "uri": "fixtures://pressure/template-spread-capture-semantics/src/template-spread-capture-semantics-app.html"
          },
          "relation": null,
          "role": "primary",
          "rowId": "diagnostic:0:template:template-compiler-error:framework-error-code:AUR0720:src/template-spread-capture-semantics-app.html:1254:1265:template-compiler:AUR0720"
        },
        "primarySeverity": "error",
        "rawRowCount": 1,
        "related": [],
        "subject": null
      },
      {
        "groupKey": "row:diagnostic:1:template:runtime-renderer-framework-error:framework-error-code:AUR0820:src/template-spread-capture-semantics-app.html:1310:1318:runtime-renderer:AUR0820",
        "maxRawSeverity": "error",
        "primary": {
          "diagnostic": {
            "actionability": "guided",
            "anomaly": null,
            "category": "template-syntax",
            "code": "AUR0820",
            "data": {
              "diagnosticAuthority": "framework-error-code",
              "diagnosticDomain": "template",
              "diagnosticKind": "runtime-renderer-framework-error",
              "frameworkErrorCode": "AUR0820",
              "frameworkRawErrorAuthority": null,
              "missingInput": "runtime-renderer:AUR0820",
              "missingInputs": [
                "runtime-renderer:AUR0820"
              ],
              "phase": "render",
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
            "file": "src/template-spread-capture-semantics-app.html",
            "impact": "blocking",
            "issues": [
              {
                "code": "AUR0820",
                "kind": "runtime-renderer-framework-error",
                "message": "Aurelia runtime renderer AUR0820 rejects this instruction input: Invalid spread target $element.."
              }
            ],
            "message": "Aurelia runtime renderer AUR0820 rejects this instruction input: Invalid spread target $element..",
            "related": [],
            "severity": "error",
            "source": "semantic-runtime:template",
            "span": {
              "end": 1318,
              "start": 1310
            },
            "spanText": "$element",
            "status": "primary",
            "uri": "fixtures://pressure/template-spread-capture-semantics/src/template-spread-capture-semantics-app.html"
          },
          "relation": null,
          "role": "primary",
          "rowId": "diagnostic:1:template:runtime-renderer-framework-error:framework-error-code:AUR0820:src/template-spread-capture-semantics-app.html:1310:1318:runtime-renderer:AUR0820"
        },
        "primarySeverity": "error",
        "rawRowCount": 1,
        "related": [],
        "subject": null
      },
      {
        "groupKey": "row:diagnostic:2:template:template-compiler-error:framework-error-code:AUR0720:src/template-spread-capture-semantics-app.html:1362:1375:template-compiler:AUR0720",
        "maxRawSeverity": "error",
        "primary": {
          "diagnostic": {
            "actionability": "guided",
            "anomaly": null,
            "category": "template-syntax",
            "code": "AUR0720",
            "data": {
              "diagnosticAuthority": "framework-error-code",
              "diagnosticDomain": "template",
              "diagnosticKind": "template-compiler-error",
              "frameworkErrorCode": "AUR0720",
              "frameworkRawErrorAuthority": null,
              "missingInput": "template-compiler:AUR0720",
              "missingInputs": [
                "template-compiler:AUR0720"
              ],
              "phase": "attribute-classification",
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
            "file": "src/template-spread-capture-semantics-app.html",
            "impact": "blocking",
            "issues": [
              {
                "code": "AUR0720",
                "kind": "template-compiler-error",
                "message": "Aurelia template compiler AUR0720 rejects this template syntax: Spreading syntax \"...xxx\" is reserved. Encountered \"...$bindables\".."
              }
            ],
            "message": "Aurelia template compiler AUR0720 rejects this template syntax: Spreading syntax \"...xxx\" is reserved. Encountered \"...$bindables\"..",
            "related": [],
            "severity": "error",
            "source": "semantic-runtime:template",
            "span": {
              "end": 1375,
              "start": 1362
            },
            "spanText": "...$bindables",
            "status": "primary",
            "uri": "fixtures://pressure/template-spread-capture-semantics/src/template-spread-capture-semantics-app.html"
          },
          "relation": null,
          "role": "primary",
          "rowId": "diagnostic:2:template:template-compiler-error:framework-error-code:AUR0720:src/template-spread-capture-semantics-app.html:1362:1375:template-compiler:AUR0720"
        },
        "primarySeverity": "error",
        "rawRowCount": 1,
        "related": [],
        "subject": null
      },
      {
        "groupKey": "row:diagnostic:3:template:runtime-binding-framework-error:framework-error-code:AUR9999:src/template-spread-capture-semantics-app.html:1404:1413:runtime-binding:AUR9999",
        "maxRawSeverity": "error",
        "primary": {
          "diagnostic": {
            "actionability": "guided",
            "anomaly": null,
            "category": "template-syntax",
            "code": "AUR9999",
            "data": {
              "diagnosticAuthority": "framework-error-code",
              "diagnosticDomain": "template",
              "diagnosticKind": "runtime-binding-framework-error",
              "frameworkErrorCode": "AUR9999",
              "frameworkRawErrorAuthority": null,
              "missingInput": "runtime-binding:AUR9999",
              "missingInputs": [
                "runtime-binding:AUR9999"
              ],
              "phase": "spread-bind",
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
            "file": "src/template-spread-capture-semantics-app.html",
            "impact": "blocking",
            "issues": [
              {
                "code": "AUR9999",
                "kind": "runtime-binding-framework-error",
                "message": "Aurelia runtime binding AUR9999 rejects this binding input: SpreadBinding.bind requires the hydration-context controller scope to have a parent scope.."
              }
            ],
            "message": "Aurelia runtime binding AUR9999 rejects this binding input: SpreadBinding.bind requires the hydration-context controller scope to have a parent scope..",
            "related": [],
            "severity": "error",
            "source": "semantic-runtime:template",
            "span": {
              "end": 1413,
              "start": 1404
            },
            "spanText": "...$attrs",
            "status": "primary",
            "uri": "fixtures://pressure/template-spread-capture-semantics/src/template-spread-capture-semantics-app.html"
          },
          "relation": null,
          "role": "primary",
          "rowId": "diagnostic:3:template:runtime-binding-framework-error:framework-error-code:AUR9999:src/template-spread-capture-semantics-app.html:1404:1413:runtime-binding:AUR9999"
        },
        "primarySeverity": "error",
        "rawRowCount": 1,
        "related": [],
        "subject": null
      },
      {
        "groupKey": "row:diagnostic:4:template:runtime-binding-framework-error:framework-error-code:AUR9998:src/template-spread-capture-semantics-app.html:1933:1962:runtime-binding:AUR9998",
        "maxRawSeverity": "error",
        "primary": {
          "diagnostic": {
            "actionability": "guided",
            "anomaly": null,
            "category": "template-syntax",
            "code": "AUR9998",
            "data": {
              "diagnosticAuthority": "framework-error-code",
              "diagnosticDomain": "template",
              "diagnosticKind": "runtime-binding-framework-error",
              "frameworkErrorCode": "AUR9998",
              "frameworkRawErrorAuthority": null,
              "missingInput": "runtime-binding:AUR9998",
              "missingInputs": [
                "runtime-binding:AUR9998"
              ],
              "phase": "spread-child-admission",
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
            "file": "src/template-spread-capture-semantics-app.html",
            "impact": "blocking",
            "issues": [
              {
                "code": "AUR9998",
                "kind": "runtime-binding-framework-error",
                "message": "Aurelia runtime binding AUR9998 rejects this binding input: SpreadBinding.addChild cannot admit captured template controller \"inner-gate\" on \"input\".."
              }
            ],
            "message": "Aurelia runtime binding AUR9998 rejects this binding input: SpreadBinding.addChild cannot admit captured template controller \"inner-gate\" on \"input\"..",
            "related": [],
            "severity": "error",
            "source": "semantic-runtime:template",
            "span": {
              "end": 1962,
              "start": 1933
            },
            "spanText": "inner-gate.bind=\"showCapture\"",
            "status": "primary",
            "uri": "fixtures://pressure/template-spread-capture-semantics/src/template-spread-capture-semantics-app.html"
          },
          "relation": null,
          "role": "primary",
          "rowId": "diagnostic:4:template:runtime-binding-framework-error:framework-error-code:AUR9998:src/template-spread-capture-semantics-app.html:1933:1962:runtime-binding:AUR9998"
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
        "code": "AUR0720",
        "data": {
          "diagnosticAuthority": "framework-error-code",
          "diagnosticDomain": "template",
          "diagnosticKind": "template-compiler-error",
          "frameworkErrorCode": "AUR0720",
          "frameworkRawErrorAuthority": null,
          "missingInput": "template-compiler:AUR0720",
          "missingInputs": [
            "template-compiler:AUR0720"
          ],
          "phase": "attribute-classification",
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
        "file": "src/template-spread-capture-semantics-app.html",
        "impact": "blocking",
        "issues": [
          {
            "code": "AUR0720",
            "kind": "template-compiler-error",
            "message": "Aurelia template compiler AUR0720 rejects this template syntax: Spreading syntax \"...xxx\" is reserved. Encountered \"...$element\".."
          }
        ],
        "message": "Aurelia template compiler AUR0720 rejects this template syntax: Spreading syntax \"...xxx\" is reserved. Encountered \"...$element\"..",
        "related": [],
        "severity": "error",
        "source": "semantic-runtime:template",
        "span": {
          "end": 1265,
          "start": 1254
        },
        "spanText": "...$element",
        "status": "canonical",
        "uri": "fixtures://pressure/template-spread-capture-semantics/src/template-spread-capture-semantics-app.html"
      },
      {
        "actionability": "guided",
        "anomaly": null,
        "category": "template-syntax",
        "code": "AUR0820",
        "data": {
          "diagnosticAuthority": "framework-error-code",
          "diagnosticDomain": "template",
          "diagnosticKind": "runtime-renderer-framework-error",
          "frameworkErrorCode": "AUR0820",
          "frameworkRawErrorAuthority": null,
          "missingInput": "runtime-renderer:AUR0820",
          "missingInputs": [
            "runtime-renderer:AUR0820"
          ],
          "phase": "render",
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
        "file": "src/template-spread-capture-semantics-app.html",
        "impact": "blocking",
        "issues": [
          {
            "code": "AUR0820",
            "kind": "runtime-renderer-framework-error",
            "message": "Aurelia runtime renderer AUR0820 rejects this instruction input: Invalid spread target $element.."
          }
        ],
        "message": "Aurelia runtime renderer AUR0820 rejects this instruction input: Invalid spread target $element..",
        "related": [],
        "severity": "error",
        "source": "semantic-runtime:template",
        "span": {
          "end": 1318,
          "start": 1310
        },
        "spanText": "$element",
        "status": "canonical",
        "uri": "fixtures://pressure/template-spread-capture-semantics/src/template-spread-capture-semantics-app.html"
      },
      {
        "actionability": "guided",
        "anomaly": null,
        "category": "template-syntax",
        "code": "AUR0720",
        "data": {
          "diagnosticAuthority": "framework-error-code",
          "diagnosticDomain": "template",
          "diagnosticKind": "template-compiler-error",
          "frameworkErrorCode": "AUR0720",
          "frameworkRawErrorAuthority": null,
          "missingInput": "template-compiler:AUR0720",
          "missingInputs": [
            "template-compiler:AUR0720"
          ],
          "phase": "attribute-classification",
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
        "file": "src/template-spread-capture-semantics-app.html",
        "impact": "blocking",
        "issues": [
          {
            "code": "AUR0720",
            "kind": "template-compiler-error",
            "message": "Aurelia template compiler AUR0720 rejects this template syntax: Spreading syntax \"...xxx\" is reserved. Encountered \"...$bindables\".."
          }
        ],
        "message": "Aurelia template compiler AUR0720 rejects this template syntax: Spreading syntax \"...xxx\" is reserved. Encountered \"...$bindables\"..",
        "related": [],
        "severity": "error",
        "source": "semantic-runtime:template",
        "span": {
          "end": 1375,
          "start": 1362
        },
        "spanText": "...$bindables",
        "status": "canonical",
        "uri": "fixtures://pressure/template-spread-capture-semantics/src/template-spread-capture-semantics-app.html"
      },
      {
        "actionability": "guided",
        "anomaly": null,
        "category": "template-syntax",
        "code": "AUR9999",
        "data": {
          "diagnosticAuthority": "framework-error-code",
          "diagnosticDomain": "template",
          "diagnosticKind": "runtime-binding-framework-error",
          "frameworkErrorCode": "AUR9999",
          "frameworkRawErrorAuthority": null,
          "missingInput": "runtime-binding:AUR9999",
          "missingInputs": [
            "runtime-binding:AUR9999"
          ],
          "phase": "spread-bind",
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
        "file": "src/template-spread-capture-semantics-app.html",
        "impact": "blocking",
        "issues": [
          {
            "code": "AUR9999",
            "kind": "runtime-binding-framework-error",
            "message": "Aurelia runtime binding AUR9999 rejects this binding input: SpreadBinding.bind requires the hydration-context controller scope to have a parent scope.."
          }
        ],
        "message": "Aurelia runtime binding AUR9999 rejects this binding input: SpreadBinding.bind requires the hydration-context controller scope to have a parent scope..",
        "related": [],
        "severity": "error",
        "source": "semantic-runtime:template",
        "span": {
          "end": 1413,
          "start": 1404
        },
        "spanText": "...$attrs",
        "status": "canonical",
        "uri": "fixtures://pressure/template-spread-capture-semantics/src/template-spread-capture-semantics-app.html"
      },
      {
        "actionability": "guided",
        "anomaly": null,
        "category": "template-syntax",
        "code": "AUR9998",
        "data": {
          "diagnosticAuthority": "framework-error-code",
          "diagnosticDomain": "template",
          "diagnosticKind": "runtime-binding-framework-error",
          "frameworkErrorCode": "AUR9998",
          "frameworkRawErrorAuthority": null,
          "missingInput": "runtime-binding:AUR9998",
          "missingInputs": [
            "runtime-binding:AUR9998"
          ],
          "phase": "spread-child-admission",
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
        "file": "src/template-spread-capture-semantics-app.html",
        "impact": "blocking",
        "issues": [
          {
            "code": "AUR9998",
            "kind": "runtime-binding-framework-error",
            "message": "Aurelia runtime binding AUR9998 rejects this binding input: SpreadBinding.addChild cannot admit captured template controller \"inner-gate\" on \"input\".."
          }
        ],
        "message": "Aurelia runtime binding AUR9998 rejects this binding input: SpreadBinding.addChild cannot admit captured template controller \"inner-gate\" on \"input\"..",
        "related": [],
        "severity": "error",
        "source": "semantic-runtime:template",
        "span": {
          "end": 1962,
          "start": 1933
        },
        "spanText": "inner-gate.bind=\"showCapture\"",
        "status": "canonical",
        "uri": "fixtures://pressure/template-spread-capture-semantics/src/template-spread-capture-semantics-app.html"
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
        "file": "src/template-spread-capture-semantics-app.html",
        "impact": "blocking",
        "issues": [
          {
            "code": "AUR0101",
            "kind": "runtime-binding-behavior-framework-error",
            "message": "Aurelia runtime binding behavior AUR0101 rejects this binding: Binding behavior 'missingSpreadBehavior' was not resolved through the current compiler resource scope.."
          }
        ],
        "message": "Aurelia runtime binding behavior AUR0101 rejects this binding: Binding behavior 'missingSpreadBehavior' was not resolved through the current compiler resource scope..",
        "related": [],
        "severity": "error",
        "source": "semantic-runtime:template",
        "span": {
          "end": 236,
          "start": 215
        },
        "spanText": "missingSpreadBehavior",
        "status": "canonical",
        "uri": "fixtures://pressure/template-spread-capture-semantics/src/template-spread-capture-semantics-app.html"
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
          "missingInput": "binding-target-assignment:source-nullish-to-required-target",
          "missingInputs": [
            "binding-target-assignment:source-nullish-to-required-target"
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
              "end": 711,
              "kind": "source-span-address",
              "label": "src/template-spread-capture-semantics-app.html@697..711",
              "path": "src/template-spread-capture-semantics-app.html",
              "role": "binding-source-assignment",
              "start": 697
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
        "file": "src/template-spread-capture-semantics-app.html",
        "impact": "degraded",
        "issues": [
          {
            "code": "binding-target-assignment-strictness",
            "kind": "binding-target-assignment-strictness",
            "message": "Binding source type string | undefined may be nullish, but target 'title' requires string."
          }
        ],
        "message": "Binding source type string | undefined may be nullish, but target 'title' requires string.",
        "related": [],
        "severity": "warning",
        "source": "semantic-runtime:template",
        "span": {
          "end": 711,
          "start": 697
        },
        "spanText": "optionalSpread",
        "status": "canonical",
        "uri": "fixtures://pressure/template-spread-capture-semantics/src/template-spread-capture-semantics-app.html"
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
          "missingInput": "binding-target-assignment:source-nullish-to-required-target",
          "missingInputs": [
            "binding-target-assignment:source-nullish-to-required-target"
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
              "end": 767,
              "kind": "source-span-address",
              "label": "src/template-spread-capture-semantics-app.html@745..767",
              "path": "src/template-spread-capture-semantics-app.html",
              "role": "binding-source-assignment",
              "start": 745
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
        "file": "src/template-spread-capture-semantics-app.html",
        "impact": "degraded",
        "issues": [
          {
            "code": "binding-target-assignment-strictness",
            "kind": "binding-target-assignment-strictness",
            "message": "Binding source type string | undefined may be nullish, but target 'title' requires string."
          }
        ],
        "message": "Binding source type string | undefined may be nullish, but target 'title' requires string.",
        "related": [],
        "severity": "warning",
        "source": "semantic-runtime:template",
        "span": {
          "end": 767,
          "start": 745
        },
        "spanText": "presentUndefinedSpread",
        "status": "canonical",
        "uri": "fixtures://pressure/template-spread-capture-semantics/src/template-spread-capture-semantics-app.html"
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
          "file": "src/template-spread-capture-semantics-app.html",
          "impact": "blocking",
          "issues": [
            {
              "code": "AUR0101",
              "kind": "runtime-binding-behavior-framework-error",
              "message": "Aurelia runtime binding behavior AUR0101 rejects this binding: Binding behavior 'missingSpreadBehavior' was not resolved through the current compiler resource scope.."
            }
          ],
          "message": "Aurelia runtime binding behavior AUR0101 rejects this binding: Binding behavior 'missingSpreadBehavior' was not resolved through the current compiler resource scope..",
          "related": [],
          "severity": "error",
          "source": "semantic-runtime:template",
          "span": {
            "end": 236,
            "start": 215
          },
          "spanText": "missingSpreadBehavior",
          "status": "primary",
          "uri": "fixtures://pressure/template-spread-capture-semantics/src/template-spread-capture-semantics-app.html"
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
            "missingInput": "binding-target-assignment:source-nullish-to-required-target",
            "missingInputs": [
              "binding-target-assignment:source-nullish-to-required-target"
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
                "end": 711,
                "kind": "source-span-address",
                "label": "src/template-spread-capture-semantics-app.html@697..711",
                "path": "src/template-spread-capture-semantics-app.html",
                "role": "binding-source-assignment",
                "start": 697
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
          "file": "src/template-spread-capture-semantics-app.html",
          "impact": "degraded",
          "issues": [
            {
              "code": "binding-target-assignment-strictness",
              "kind": "binding-target-assignment-strictness",
              "message": "Binding source type string | undefined may be nullish, but target 'title' requires string."
            }
          ],
          "message": "Binding source type string | undefined may be nullish, but target 'title' requires string.",
          "related": [],
          "severity": "warning",
          "source": "semantic-runtime:template",
          "span": {
            "end": 711,
            "start": 697
          },
          "spanText": "optionalSpread",
          "status": "primary",
          "uri": "fixtures://pressure/template-spread-capture-semantics/src/template-spread-capture-semantics-app.html"
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
            "missingInput": "binding-target-assignment:source-nullish-to-required-target",
            "missingInputs": [
              "binding-target-assignment:source-nullish-to-required-target"
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
                "end": 767,
                "kind": "source-span-address",
                "label": "src/template-spread-capture-semantics-app.html@745..767",
                "path": "src/template-spread-capture-semantics-app.html",
                "role": "binding-source-assignment",
                "start": 745
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
          "file": "src/template-spread-capture-semantics-app.html",
          "impact": "degraded",
          "issues": [
            {
              "code": "binding-target-assignment-strictness",
              "kind": "binding-target-assignment-strictness",
              "message": "Binding source type string | undefined may be nullish, but target 'title' requires string."
            }
          ],
          "message": "Binding source type string | undefined may be nullish, but target 'title' requires string.",
          "related": [],
          "severity": "warning",
          "source": "semantic-runtime:template",
          "span": {
            "end": 767,
            "start": 745
          },
          "spanText": "presentUndefinedSpread",
          "status": "primary",
          "uri": "fixtures://pressure/template-spread-capture-semantics/src/template-spread-capture-semantics-app.html"
        },
        {
          "actionability": "guided",
          "anomaly": null,
          "category": "template-syntax",
          "code": "AUR0720",
          "data": {
            "diagnosticAuthority": "framework-error-code",
            "diagnosticDomain": "template",
            "diagnosticKind": "template-compiler-error",
            "frameworkErrorCode": "AUR0720",
            "frameworkRawErrorAuthority": null,
            "missingInput": "template-compiler:AUR0720",
            "missingInputs": [
              "template-compiler:AUR0720"
            ],
            "phase": "attribute-classification",
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
          "file": "src/template-spread-capture-semantics-app.html",
          "impact": "blocking",
          "issues": [
            {
              "code": "AUR0720",
              "kind": "template-compiler-error",
              "message": "Aurelia template compiler AUR0720 rejects this template syntax: Spreading syntax \"...xxx\" is reserved. Encountered \"...$element\".."
            }
          ],
          "message": "Aurelia template compiler AUR0720 rejects this template syntax: Spreading syntax \"...xxx\" is reserved. Encountered \"...$element\"..",
          "related": [],
          "severity": "error",
          "source": "semantic-runtime:template",
          "span": {
            "end": 1265,
            "start": 1254
          },
          "spanText": "...$element",
          "status": "primary",
          "uri": "fixtures://pressure/template-spread-capture-semantics/src/template-spread-capture-semantics-app.html"
        },
        {
          "actionability": "guided",
          "anomaly": null,
          "category": "template-syntax",
          "code": "AUR0820",
          "data": {
            "diagnosticAuthority": "framework-error-code",
            "diagnosticDomain": "template",
            "diagnosticKind": "runtime-renderer-framework-error",
            "frameworkErrorCode": "AUR0820",
            "frameworkRawErrorAuthority": null,
            "missingInput": "runtime-renderer:AUR0820",
            "missingInputs": [
              "runtime-renderer:AUR0820"
            ],
            "phase": "render",
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
          "file": "src/template-spread-capture-semantics-app.html",
          "impact": "blocking",
          "issues": [
            {
              "code": "AUR0820",
              "kind": "runtime-renderer-framework-error",
              "message": "Aurelia runtime renderer AUR0820 rejects this instruction input: Invalid spread target $element.."
            }
          ],
          "message": "Aurelia runtime renderer AUR0820 rejects this instruction input: Invalid spread target $element..",
          "related": [],
          "severity": "error",
          "source": "semantic-runtime:template",
          "span": {
            "end": 1318,
            "start": 1310
          },
          "spanText": "$element",
          "status": "primary",
          "uri": "fixtures://pressure/template-spread-capture-semantics/src/template-spread-capture-semantics-app.html"
        },
        {
          "actionability": "guided",
          "anomaly": null,
          "category": "template-syntax",
          "code": "AUR0720",
          "data": {
            "diagnosticAuthority": "framework-error-code",
            "diagnosticDomain": "template",
            "diagnosticKind": "template-compiler-error",
            "frameworkErrorCode": "AUR0720",
            "frameworkRawErrorAuthority": null,
            "missingInput": "template-compiler:AUR0720",
            "missingInputs": [
              "template-compiler:AUR0720"
            ],
            "phase": "attribute-classification",
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
          "file": "src/template-spread-capture-semantics-app.html",
          "impact": "blocking",
          "issues": [
            {
              "code": "AUR0720",
              "kind": "template-compiler-error",
              "message": "Aurelia template compiler AUR0720 rejects this template syntax: Spreading syntax \"...xxx\" is reserved. Encountered \"...$bindables\".."
            }
          ],
          "message": "Aurelia template compiler AUR0720 rejects this template syntax: Spreading syntax \"...xxx\" is reserved. Encountered \"...$bindables\"..",
          "related": [],
          "severity": "error",
          "source": "semantic-runtime:template",
          "span": {
            "end": 1375,
            "start": 1362
          },
          "spanText": "...$bindables",
          "status": "primary",
          "uri": "fixtures://pressure/template-spread-capture-semantics/src/template-spread-capture-semantics-app.html"
        },
        {
          "actionability": "guided",
          "anomaly": null,
          "category": "template-syntax",
          "code": "AUR9999",
          "data": {
            "diagnosticAuthority": "framework-error-code",
            "diagnosticDomain": "template",
            "diagnosticKind": "runtime-binding-framework-error",
            "frameworkErrorCode": "AUR9999",
            "frameworkRawErrorAuthority": null,
            "missingInput": "runtime-binding:AUR9999",
            "missingInputs": [
              "runtime-binding:AUR9999"
            ],
            "phase": "spread-bind",
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
          "file": "src/template-spread-capture-semantics-app.html",
          "impact": "blocking",
          "issues": [
            {
              "code": "AUR9999",
              "kind": "runtime-binding-framework-error",
              "message": "Aurelia runtime binding AUR9999 rejects this binding input: SpreadBinding.bind requires the hydration-context controller scope to have a parent scope.."
            }
          ],
          "message": "Aurelia runtime binding AUR9999 rejects this binding input: SpreadBinding.bind requires the hydration-context controller scope to have a parent scope..",
          "related": [],
          "severity": "error",
          "source": "semantic-runtime:template",
          "span": {
            "end": 1413,
            "start": 1404
          },
          "spanText": "...$attrs",
          "status": "primary",
          "uri": "fixtures://pressure/template-spread-capture-semantics/src/template-spread-capture-semantics-app.html"
        },
        {
          "actionability": "guided",
          "anomaly": null,
          "category": "template-syntax",
          "code": "AUR9998",
          "data": {
            "diagnosticAuthority": "framework-error-code",
            "diagnosticDomain": "template",
            "diagnosticKind": "runtime-binding-framework-error",
            "frameworkErrorCode": "AUR9998",
            "frameworkRawErrorAuthority": null,
            "missingInput": "runtime-binding:AUR9998",
            "missingInputs": [
              "runtime-binding:AUR9998"
            ],
            "phase": "spread-child-admission",
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
          "file": "src/template-spread-capture-semantics-app.html",
          "impact": "blocking",
          "issues": [
            {
              "code": "AUR9998",
              "kind": "runtime-binding-framework-error",
              "message": "Aurelia runtime binding AUR9998 rejects this binding input: SpreadBinding.addChild cannot admit captured template controller \"inner-gate\" on \"input\".."
            }
          ],
          "message": "Aurelia runtime binding AUR9998 rejects this binding input: SpreadBinding.addChild cannot admit captured template controller \"inner-gate\" on \"input\"..",
          "related": [],
          "severity": "error",
          "source": "semantic-runtime:template",
          "span": {
            "end": 1962,
            "start": 1933
          },
          "spanText": "inner-gate.bind=\"showCapture\"",
          "status": "primary",
          "uri": "fixtures://pressure/template-spread-capture-semantics/src/template-spread-capture-semantics-app.html"
        }
      ]
    }
  },
  "uri": "fixtures://pressure/template-spread-capture-semantics/src/template-spread-capture-semantics-app.html"
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

## capture-shell-reusable-template

### Probe

```json
{
  "file": "src/capture-shell.html"
}
```

### publishDiagnostics

```json
{
  "diagnosticCount": 0,
  "diagnostics": [],
  "outcome": "published",
  "uri": "fixtures://pressure/template-spread-capture-semantics/src/capture-shell.html"
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
            "filePath": "src/capture-shell.html"
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
            "filePath": "src/capture-shell.html"
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
            "filePath": "src/capture-shell.html"
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
  "uri": "fixtures://pressure/template-spread-capture-semantics/src/capture-shell.html"
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

## capture-shell-inline-templates

### Probe

```json
{
  "file": "src/capture-shell.ts"
}
```

### publishDiagnostics

```json
{
  "diagnosticCount": 0,
  "diagnostics": [],
  "outcome": "published",
  "uri": "fixtures://pressure/template-spread-capture-semantics/src/capture-shell.ts"
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
            "filePath": "src/capture-shell.ts"
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
            "filePath": "src/capture-shell.ts"
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
            "filePath": "src/capture-shell.ts"
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
  "uri": "fixtures://pressure/template-spread-capture-semantics/src/capture-shell.ts"
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
