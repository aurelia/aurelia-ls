# resource-registration-local-template-errors diagnostics lane snapshot

Fixture: `packages/semantic-runtime/fixtures/pressure/resource-registration-local-template-errors`
Probe file: `packages/lane-harness/probes/resource-registration-local-template-errors.probes.json`
Lane: `diagnostics`

This snapshot records observed language-server behavior. Operator verdicts live in the probe data.

## forbidden-host-attribute

### Probe

```json
{
  "file": "src/local-surrogate-invalid-attribute.html"
}
```

### publishDiagnostics

```json
{
  "diagnosticCount": 1,
  "diagnostics": [
    {
      "anomaly": null,
      "code": "AUR0702",
      "data": {
        "diagnosticAuthority": "framework-error-code",
        "diagnosticDomain": "template",
        "diagnosticKind": "template-compiler-error",
        "frameworkErrorCode": "AUR0702",
        "frameworkRawErrorAuthority": null,
        "missingInput": "template-compiler:AUR0702",
        "missingInputs": [
          "template-compiler:AUR0702"
        ],
        "phase": "compiled-template",
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
      "message": "Aurelia template compiler AUR0702 rejects this template syntax: Template compilation error: attribute \"id\" is invalid on element surrogate..",
      "range": {
        "end": {
          "character": 78,
          "line": 3
        },
        "start": {
          "character": 56,
          "line": 3
        }
      },
      "rangeText": "id=\"forbidden-host-id\"",
      "relatedInformation": [],
      "severity": "error",
      "source": "aurelia"
    }
  ],
  "outcome": "published",
  "uri": "fixtures://pressure/resource-registration-local-template-errors/src/local-surrogate-invalid-attribute.html"
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
            "filePath": "src/local-surrogate-invalid-attribute.html"
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
            "filePath": "src/local-surrogate-invalid-attribute.html"
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
            "filePath": "src/local-surrogate-invalid-attribute.html"
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
                  "label": "src/local-surrogate-invalid-attribute.html",
                  "path": "src/local-surrogate-invalid-attribute.html",
                  "sourceFileRole": "template",
                  "sourceWorkspaceKey": "resource-registration-local-template-errors"
                },
                "end": 144,
                "kind": "source-span-address",
                "label": "src/local-surrogate-invalid-attribute.html@122..144",
                "path": "src/local-surrogate-invalid-attribute.html",
                "role": "range",
                "sourceFileRole": "template",
                "sourceWorkspaceKey": "resource-registration-local-template-errors",
                "start": 122
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
        "groupKey": "row:diagnostic:0:template:template-compiler-error:framework-error-code:AUR0702:src/local-surrogate-invalid-attribute.html:122:144:template-compiler:AUR0702",
        "maxRawSeverity": "error",
        "primary": {
          "diagnostic": {
            "actionability": "guided",
            "anomaly": null,
            "category": "template-syntax",
            "code": "AUR0702",
            "data": {
              "diagnosticAuthority": "framework-error-code",
              "diagnosticDomain": "template",
              "diagnosticKind": "template-compiler-error",
              "frameworkErrorCode": "AUR0702",
              "frameworkRawErrorAuthority": null,
              "missingInput": "template-compiler:AUR0702",
              "missingInputs": [
                "template-compiler:AUR0702"
              ],
              "phase": "compiled-template",
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
            "file": "src/local-surrogate-invalid-attribute.html",
            "impact": "blocking",
            "issues": [
              {
                "code": "AUR0702",
                "kind": "template-compiler-error",
                "message": "Aurelia template compiler AUR0702 rejects this template syntax: Template compilation error: attribute \"id\" is invalid on element surrogate.."
              }
            ],
            "message": "Aurelia template compiler AUR0702 rejects this template syntax: Template compilation error: attribute \"id\" is invalid on element surrogate..",
            "related": [],
            "severity": "error",
            "source": "semantic-runtime:template",
            "span": {
              "end": 144,
              "start": 122
            },
            "spanText": "id=\"forbidden-host-id\"",
            "status": "primary",
            "uri": "fixtures://pressure/resource-registration-local-template-errors/src/local-surrogate-invalid-attribute.html"
          },
          "relation": null,
          "role": "primary",
          "rowId": "diagnostic:0:template:template-compiler-error:framework-error-code:AUR0702:src/local-surrogate-invalid-attribute.html:122:144:template-compiler:AUR0702"
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
        "code": "AUR0702",
        "data": {
          "diagnosticAuthority": "framework-error-code",
          "diagnosticDomain": "template",
          "diagnosticKind": "template-compiler-error",
          "frameworkErrorCode": "AUR0702",
          "frameworkRawErrorAuthority": null,
          "missingInput": "template-compiler:AUR0702",
          "missingInputs": [
            "template-compiler:AUR0702"
          ],
          "phase": "compiled-template",
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
        "file": "src/local-surrogate-invalid-attribute.html",
        "impact": "blocking",
        "issues": [
          {
            "code": "AUR0702",
            "kind": "template-compiler-error",
            "message": "Aurelia template compiler AUR0702 rejects this template syntax: Template compilation error: attribute \"id\" is invalid on element surrogate.."
          }
        ],
        "message": "Aurelia template compiler AUR0702 rejects this template syntax: Template compilation error: attribute \"id\" is invalid on element surrogate..",
        "related": [],
        "severity": "error",
        "source": "semantic-runtime:template",
        "span": {
          "end": 144,
          "start": 122
        },
        "spanText": "id=\"forbidden-host-id\"",
        "status": "canonical",
        "uri": "fixtures://pressure/resource-registration-local-template-errors/src/local-surrogate-invalid-attribute.html"
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
          "code": "AUR0702",
          "data": {
            "diagnosticAuthority": "framework-error-code",
            "diagnosticDomain": "template",
            "diagnosticKind": "template-compiler-error",
            "frameworkErrorCode": "AUR0702",
            "frameworkRawErrorAuthority": null,
            "missingInput": "template-compiler:AUR0702",
            "missingInputs": [
              "template-compiler:AUR0702"
            ],
            "phase": "compiled-template",
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
          "file": "src/local-surrogate-invalid-attribute.html",
          "impact": "blocking",
          "issues": [
            {
              "code": "AUR0702",
              "kind": "template-compiler-error",
              "message": "Aurelia template compiler AUR0702 rejects this template syntax: Template compilation error: attribute \"id\" is invalid on element surrogate.."
            }
          ],
          "message": "Aurelia template compiler AUR0702 rejects this template syntax: Template compilation error: attribute \"id\" is invalid on element surrogate..",
          "related": [],
          "severity": "error",
          "source": "semantic-runtime:template",
          "span": {
            "end": 144,
            "start": 122
          },
          "spanText": "id=\"forbidden-host-id\"",
          "status": "primary",
          "uri": "fixtures://pressure/resource-registration-local-template-errors/src/local-surrogate-invalid-attribute.html"
        }
      ]
    }
  },
  "uri": "fixtures://pressure/resource-registration-local-template-errors/src/local-surrogate-invalid-attribute.html"
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

## host-template-controller

### Probe

```json
{
  "file": "src/local-surrogate-template-controller.html"
}
```

### publishDiagnostics

```json
{
  "diagnosticCount": 1,
  "diagnostics": [
    {
      "anomaly": null,
      "code": "AUR0703",
      "data": {
        "diagnosticAuthority": "framework-error-code",
        "diagnosticDomain": "template",
        "diagnosticKind": "template-compiler-error",
        "frameworkErrorCode": "AUR0703",
        "frameworkRawErrorAuthority": null,
        "missingInput": "template-compiler:AUR0703",
        "missingInputs": [
          "template-compiler:AUR0703"
        ],
        "phase": "compiled-template",
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
      "message": "Aurelia template compiler AUR0703 rejects this template syntax: Template compilation error: template controller \"if\" is invalid on element surrogate..",
      "range": {
        "end": {
          "character": 50,
          "line": 1
        },
        "start": {
          "character": 48,
          "line": 1
        }
      },
      "rangeText": "if",
      "relatedInformation": [],
      "severity": "error",
      "source": "aurelia"
    }
  ],
  "outcome": "published",
  "uri": "fixtures://pressure/resource-registration-local-template-errors/src/local-surrogate-template-controller.html"
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
            "filePath": "src/local-surrogate-template-controller.html"
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
            "filePath": "src/local-surrogate-template-controller.html"
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
            "filePath": "src/local-surrogate-template-controller.html"
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
                  "label": "src/local-surrogate-template-controller.html",
                  "path": "src/local-surrogate-template-controller.html",
                  "sourceFileRole": "template",
                  "sourceWorkspaceKey": "resource-registration-local-template-errors"
                },
                "end": 61,
                "kind": "source-span-address",
                "label": "src/local-surrogate-template-controller.html@59..61",
                "path": "src/local-surrogate-template-controller.html",
                "role": "name",
                "sourceFileRole": "template",
                "sourceWorkspaceKey": "resource-registration-local-template-errors",
                "start": 59
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
        "groupKey": "row:diagnostic:0:template:template-compiler-error:framework-error-code:AUR0703:src/local-surrogate-template-controller.html:59:61:template-compiler:AUR0703",
        "maxRawSeverity": "error",
        "primary": {
          "diagnostic": {
            "actionability": "guided",
            "anomaly": null,
            "category": "template-syntax",
            "code": "AUR0703",
            "data": {
              "diagnosticAuthority": "framework-error-code",
              "diagnosticDomain": "template",
              "diagnosticKind": "template-compiler-error",
              "frameworkErrorCode": "AUR0703",
              "frameworkRawErrorAuthority": null,
              "missingInput": "template-compiler:AUR0703",
              "missingInputs": [
                "template-compiler:AUR0703"
              ],
              "phase": "compiled-template",
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
            "file": "src/local-surrogate-template-controller.html",
            "impact": "blocking",
            "issues": [
              {
                "code": "AUR0703",
                "kind": "template-compiler-error",
                "message": "Aurelia template compiler AUR0703 rejects this template syntax: Template compilation error: template controller \"if\" is invalid on element surrogate.."
              }
            ],
            "message": "Aurelia template compiler AUR0703 rejects this template syntax: Template compilation error: template controller \"if\" is invalid on element surrogate..",
            "related": [],
            "severity": "error",
            "source": "semantic-runtime:template",
            "span": {
              "end": 61,
              "start": 59
            },
            "spanText": "if",
            "status": "primary",
            "uri": "fixtures://pressure/resource-registration-local-template-errors/src/local-surrogate-template-controller.html"
          },
          "relation": null,
          "role": "primary",
          "rowId": "diagnostic:0:template:template-compiler-error:framework-error-code:AUR0703:src/local-surrogate-template-controller.html:59:61:template-compiler:AUR0703"
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
        "code": "AUR0703",
        "data": {
          "diagnosticAuthority": "framework-error-code",
          "diagnosticDomain": "template",
          "diagnosticKind": "template-compiler-error",
          "frameworkErrorCode": "AUR0703",
          "frameworkRawErrorAuthority": null,
          "missingInput": "template-compiler:AUR0703",
          "missingInputs": [
            "template-compiler:AUR0703"
          ],
          "phase": "compiled-template",
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
        "file": "src/local-surrogate-template-controller.html",
        "impact": "blocking",
        "issues": [
          {
            "code": "AUR0703",
            "kind": "template-compiler-error",
            "message": "Aurelia template compiler AUR0703 rejects this template syntax: Template compilation error: template controller \"if\" is invalid on element surrogate.."
          }
        ],
        "message": "Aurelia template compiler AUR0703 rejects this template syntax: Template compilation error: template controller \"if\" is invalid on element surrogate..",
        "related": [],
        "severity": "error",
        "source": "semantic-runtime:template",
        "span": {
          "end": 61,
          "start": 59
        },
        "spanText": "if",
        "status": "canonical",
        "uri": "fixtures://pressure/resource-registration-local-template-errors/src/local-surrogate-template-controller.html"
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
          "code": "AUR0703",
          "data": {
            "diagnosticAuthority": "framework-error-code",
            "diagnosticDomain": "template",
            "diagnosticKind": "template-compiler-error",
            "frameworkErrorCode": "AUR0703",
            "frameworkRawErrorAuthority": null,
            "missingInput": "template-compiler:AUR0703",
            "missingInputs": [
              "template-compiler:AUR0703"
            ],
            "phase": "compiled-template",
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
          "file": "src/local-surrogate-template-controller.html",
          "impact": "blocking",
          "issues": [
            {
              "code": "AUR0703",
              "kind": "template-compiler-error",
              "message": "Aurelia template compiler AUR0703 rejects this template syntax: Template compilation error: template controller \"if\" is invalid on element surrogate.."
            }
          ],
          "message": "Aurelia template compiler AUR0703 rejects this template syntax: Template compilation error: template controller \"if\" is invalid on element surrogate..",
          "related": [],
          "severity": "error",
          "source": "semantic-runtime:template",
          "span": {
            "end": 61,
            "start": 59
          },
          "spanText": "if",
          "status": "primary",
          "uri": "fixtures://pressure/resource-registration-local-template-errors/src/local-surrogate-template-controller.html"
        }
      ]
    }
  },
  "uri": "fixtures://pressure/resource-registration-local-template-errors/src/local-surrogate-template-controller.html"
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
