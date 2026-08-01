# di-cyclic-dependency diagnostics lane snapshot

Fixture: `packages/semantic-runtime/fixtures/pressure/di-cyclic-dependency`
Probe file: `packages/lane-harness/probes/di-cyclic-dependency.probes.json`
Lane: `diagnostics`

This snapshot records observed language-server behavior. Operator verdicts live in the probe data.

## di-cyclic-main-source

### Probe

```json
{
  "file": "src/main.ts"
}
```

### publishDiagnostics

```json
{
  "diagnosticCount": 1,
  "diagnostics": [
    {
      "anomaly": null,
      "code": "AUR0003",
      "data": {
        "diagnosticAuthority": "framework-error-code",
        "diagnosticDomain": "di",
        "diagnosticKind": "cyclic-dependency",
        "frameworkErrorCode": "AUR0003",
        "frameworkRawErrorAuthority": null,
        "missingInput": null,
        "missingInputs": [],
        "phase": "dependency-cycle-analysis",
        "relatedInformation": [],
        "relatedQueryKind": "di-issues",
        "repairAffordance": {
          "actionKind": "inspect-type-surface",
          "actionability": "manual",
          "changeDomain": "inspection",
          "planKind": "manual-inspection",
          "readiness": "inspection-required",
          "targetSourceCoverage": "not-applicable"
        },
        "sourceRole": "app-source",
        "subject": {
          "source": {
            "end": 593,
            "kind": "source-span-address",
            "label": "src/main.ts@564..593",
            "path": "src/main.ts",
            "role": "primary",
            "start": 564
          },
          "span": null,
          "subjectKind": "dependency-cycle",
          "uri": null
        },
        "taxonomy": {
          "actionability": "manual",
          "category": "project",
          "confidence": null,
          "impact": "blocking",
          "schema": "diagnostics-taxonomy/1"
        }
      },
      "message": "Aurelia singleton resolver activation would re-enter \"IFoo\" before construction completes (IFoo->IFoo).",
      "range": {
        "end": {
          "character": 29,
          "line": 17
        },
        "start": {
          "character": 0,
          "line": 17
        }
      },
      "rangeText": "reexportedContainer.get(IFoo)",
      "relatedInformation": [],
      "severity": "error",
      "source": "aurelia"
    }
  ],
  "outcome": "published",
  "uri": "fixtures://pressure/di-cyclic-dependency/src/main.ts"
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
            "filePath": "src/main.ts"
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
            "filePath": "src/main.ts"
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
            "filePath": "src/main.ts"
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
                  "label": "src/main.ts",
                  "path": "src/main.ts",
                  "sourceFileRole": "app-source",
                  "sourceWorkspaceKey": "di-cyclic-dependency"
                },
                "end": 593,
                "kind": "source-span-address",
                "label": "src/main.ts@564..593",
                "path": "src/main.ts",
                "role": "primary",
                "sourceFileRole": "app-source",
                "sourceWorkspaceKey": "di-cyclic-dependency",
                "start": 564
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
        "rationale": "Inspect di-issues rows referenced by returned diagnostics.",
        "targetQuery": {
          "kind": "di-issues",
          "page": {
            "size": 200
          }
        },
        "targetQueryKind": "di-issues"
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
        "groupKey": "row:diagnostic:0:di:cyclic-dependency:framework-error-code:AUR0003:src/main.ts:564:593:no-missing-input",
        "maxRawSeverity": "error",
        "primary": {
          "diagnostic": {
            "actionability": "manual",
            "anomaly": null,
            "category": "project",
            "code": "AUR0003",
            "data": {
              "diagnosticAuthority": "framework-error-code",
              "diagnosticDomain": "di",
              "diagnosticKind": "cyclic-dependency",
              "frameworkErrorCode": "AUR0003",
              "frameworkRawErrorAuthority": null,
              "missingInput": null,
              "missingInputs": [],
              "phase": "dependency-cycle-analysis",
              "relatedInformation": [],
              "relatedQueryKind": "di-issues",
              "repairAffordance": {
                "actionKind": "inspect-type-surface",
                "actionability": "manual",
                "changeDomain": "inspection",
                "planKind": "manual-inspection",
                "readiness": "inspection-required",
                "targetSourceCoverage": "not-applicable"
              },
              "sourceRole": "app-source",
              "subject": {
                "source": {
                  "end": 593,
                  "kind": "source-span-address",
                  "label": "src/main.ts@564..593",
                  "path": "src/main.ts",
                  "role": "primary",
                  "start": 564
                },
                "span": null,
                "subjectKind": "dependency-cycle",
                "uri": null
              },
              "taxonomy": {
                "actionability": "manual",
                "category": "project",
                "confidence": null,
                "impact": "blocking",
                "schema": "diagnostics-taxonomy/1"
              }
            },
            "file": "src/main.ts",
            "impact": "blocking",
            "issues": [
              {
                "code": "AUR0003",
                "kind": "cyclic-dependency",
                "message": "Aurelia singleton resolver activation would re-enter \"IFoo\" before construction completes (IFoo->IFoo)."
              }
            ],
            "message": "Aurelia singleton resolver activation would re-enter \"IFoo\" before construction completes (IFoo->IFoo).",
            "related": [],
            "severity": "error",
            "source": "semantic-runtime:di",
            "span": {
              "end": 593,
              "start": 564
            },
            "spanText": "reexportedContainer.get(IFoo)",
            "status": "primary",
            "uri": "fixtures://pressure/di-cyclic-dependency/src/main.ts"
          },
          "relation": null,
          "role": "primary",
          "rowId": "diagnostic:0:di:cyclic-dependency:framework-error-code:AUR0003:src/main.ts:564:593:no-missing-input"
        },
        "primarySeverity": "error",
        "rawRowCount": 1,
        "related": [],
        "subject": {
          "source": null,
          "span": {
            "end": 593,
            "start": 564
          },
          "subjectKind": "dependency-cycle",
          "uri": "file:///c:/projects/aurelia-ls2/packages/semantic-runtime/fixtures/pressure/di-cyclic-dependency/src/main.ts"
        }
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
        "code": "AUR0003",
        "data": {
          "diagnosticAuthority": "framework-error-code",
          "diagnosticDomain": "di",
          "diagnosticKind": "cyclic-dependency",
          "frameworkErrorCode": "AUR0003",
          "frameworkRawErrorAuthority": null,
          "missingInput": null,
          "missingInputs": [],
          "phase": "dependency-cycle-analysis",
          "relatedInformation": [],
          "relatedQueryKind": "di-issues",
          "repairAffordance": {
            "actionKind": "inspect-type-surface",
            "actionability": "manual",
            "changeDomain": "inspection",
            "planKind": "manual-inspection",
            "readiness": "inspection-required",
            "targetSourceCoverage": "not-applicable"
          },
          "sourceRole": "app-source",
          "subject": {
            "source": {
              "end": 593,
              "kind": "source-span-address",
              "label": "src/main.ts@564..593",
              "path": "src/main.ts",
              "role": "primary",
              "start": 564
            },
            "span": null,
            "subjectKind": "dependency-cycle",
            "uri": null
          },
          "taxonomy": {
            "actionability": "manual",
            "category": "project",
            "confidence": null,
            "impact": "blocking",
            "schema": "diagnostics-taxonomy/1"
          }
        },
        "file": "src/main.ts",
        "impact": "blocking",
        "issues": [
          {
            "code": "AUR0003",
            "kind": "cyclic-dependency",
            "message": "Aurelia singleton resolver activation would re-enter \"IFoo\" before construction completes (IFoo->IFoo)."
          }
        ],
        "message": "Aurelia singleton resolver activation would re-enter \"IFoo\" before construction completes (IFoo->IFoo).",
        "related": [],
        "severity": "error",
        "source": "semantic-runtime:di",
        "span": {
          "end": 593,
          "start": 564
        },
        "spanText": "reexportedContainer.get(IFoo)",
        "status": "canonical",
        "uri": "fixtures://pressure/di-cyclic-dependency/src/main.ts"
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
          "code": "AUR0003",
          "data": {
            "diagnosticAuthority": "framework-error-code",
            "diagnosticDomain": "di",
            "diagnosticKind": "cyclic-dependency",
            "frameworkErrorCode": "AUR0003",
            "frameworkRawErrorAuthority": null,
            "missingInput": null,
            "missingInputs": [],
            "phase": "dependency-cycle-analysis",
            "relatedInformation": [],
            "relatedQueryKind": "di-issues",
            "repairAffordance": {
              "actionKind": "inspect-type-surface",
              "actionability": "manual",
              "changeDomain": "inspection",
              "planKind": "manual-inspection",
              "readiness": "inspection-required",
              "targetSourceCoverage": "not-applicable"
            },
            "sourceRole": "app-source",
            "subject": {
              "source": {
                "end": 593,
                "kind": "source-span-address",
                "label": "src/main.ts@564..593",
                "path": "src/main.ts",
                "role": "primary",
                "start": 564
              },
              "span": null,
              "subjectKind": "dependency-cycle",
              "uri": null
            },
            "taxonomy": {
              "actionability": "manual",
              "category": "project",
              "confidence": null,
              "impact": "blocking",
              "schema": "diagnostics-taxonomy/1"
            }
          },
          "file": "src/main.ts",
          "impact": "blocking",
          "issues": [
            {
              "code": "AUR0003",
              "kind": "cyclic-dependency",
              "message": "Aurelia singleton resolver activation would re-enter \"IFoo\" before construction completes (IFoo->IFoo)."
            }
          ],
          "message": "Aurelia singleton resolver activation would re-enter \"IFoo\" before construction completes (IFoo->IFoo).",
          "related": [],
          "severity": "error",
          "source": "semantic-runtime:di",
          "span": {
            "end": 593,
            "start": 564
          },
          "spanText": "reexportedContainer.get(IFoo)",
          "status": "primary",
          "uri": "fixtures://pressure/di-cyclic-dependency/src/main.ts"
        }
      ]
    }
  },
  "uri": "fixtures://pressure/di-cyclic-dependency/src/main.ts"
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
