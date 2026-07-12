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
            "end": 486,
            "kind": "source-span-address",
            "label": "src/main.ts@467..486",
            "path": "src/main.ts",
            "role": "primary",
            "start": 467
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
      "message": "Aurelia singleton resolver activation would re-enter \"IFoo\" before construction completes (IFoo->IFoo, IFoo->IFoo).",
      "range": {
        "end": {
          "character": 19,
          "line": 16
        },
        "start": {
          "character": 0,
          "line": 16
        }
      },
      "rangeText": "container.get(IFoo)",
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
  "fingerprint": "semantic-runtime:hit",
  "outcome": "result",
  "presentation": {
    "complete": true,
    "contextualCount": 0,
    "groups": [
      {
        "groupKey": "row:diagnostic:0:di:cyclic-dependency:framework-error-code:AUR0003:src/main.ts:467:486:no-missing-input",
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
              "sourceRole": null,
              "subject": {
                "source": {
                  "end": 486,
                  "kind": "source-span-address",
                  "label": "src/main.ts@467..486",
                  "path": "src/main.ts",
                  "role": "primary",
                  "start": 467
                },
                "span": null,
                "subjectKind": "dependency-cycle",
                "uri": null
              },
              "taxonomy": {
                "actionability": null,
                "category": null,
                "confidence": null,
                "impact": null,
                "schema": null
              }
            },
            "file": "src/main.ts",
            "impact": "blocking",
            "issues": [
              {
                "code": "AUR0003",
                "kind": "cyclic-dependency",
                "message": "Aurelia singleton resolver activation would re-enter \"IFoo\" before construction completes (IFoo->IFoo, IFoo->IFoo)."
              }
            ],
            "message": "Aurelia singleton resolver activation would re-enter \"IFoo\" before construction completes (IFoo->IFoo, IFoo->IFoo).",
            "related": [],
            "severity": "error",
            "source": "semantic-runtime:di",
            "span": {
              "end": 486,
              "start": 467
            },
            "spanText": "container.get(IFoo)",
            "status": "primary",
            "uri": "fixtures://pressure/di-cyclic-dependency/src/main.ts"
          },
          "relation": null,
          "role": "primary",
          "rowId": "diagnostic:0:di:cyclic-dependency:framework-error-code:AUR0003:src/main.ts:467:486:no-missing-input"
        },
        "primarySeverity": "error",
        "rawRowCount": 1,
        "related": [],
        "subject": {
          "source": null,
          "span": {
            "end": 486,
            "start": 467
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
          "sourceRole": null,
          "subject": {
            "source": {
              "end": 486,
              "kind": "source-span-address",
              "label": "src/main.ts@467..486",
              "path": "src/main.ts",
              "role": "primary",
              "start": 467
            },
            "span": null,
            "subjectKind": "dependency-cycle",
            "uri": null
          },
          "taxonomy": {
            "actionability": null,
            "category": null,
            "confidence": null,
            "impact": null,
            "schema": null
          }
        },
        "file": "src/main.ts",
        "impact": "blocking",
        "issues": [
          {
            "code": "AUR0003",
            "kind": "cyclic-dependency",
            "message": "Aurelia singleton resolver activation would re-enter \"IFoo\" before construction completes (IFoo->IFoo, IFoo->IFoo)."
          }
        ],
        "message": "Aurelia singleton resolver activation would re-enter \"IFoo\" before construction completes (IFoo->IFoo, IFoo->IFoo).",
        "related": [],
        "severity": "error",
        "source": "semantic-runtime:di",
        "span": {
          "end": 486,
          "start": 467
        },
        "spanText": "container.get(IFoo)",
        "status": "canonical",
        "uri": "fixtures://pressure/di-cyclic-dependency/src/main.ts"
      }
    ]
  },
  "suppressed": {
    "diagnosticCount": 0,
    "diagnostics": []
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
            "sourceRole": null,
            "subject": {
              "source": {
                "end": 486,
                "kind": "source-span-address",
                "label": "src/main.ts@467..486",
                "path": "src/main.ts",
                "role": "primary",
                "start": 467
              },
              "span": null,
              "subjectKind": "dependency-cycle",
              "uri": null
            },
            "taxonomy": {
              "actionability": null,
              "category": null,
              "confidence": null,
              "impact": null,
              "schema": null
            }
          },
          "file": "src/main.ts",
          "impact": "blocking",
          "issues": [
            {
              "code": "AUR0003",
              "kind": "cyclic-dependency",
              "message": "Aurelia singleton resolver activation would re-enter \"IFoo\" before construction completes (IFoo->IFoo, IFoo->IFoo)."
            }
          ],
          "message": "Aurelia singleton resolver activation would re-enter \"IFoo\" before construction completes (IFoo->IFoo, IFoo->IFoo).",
          "related": [],
          "severity": "error",
          "source": "semantic-runtime:di",
          "span": {
            "end": 486,
            "start": 467
          },
          "spanText": "container.get(IFoo)",
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
