# mixed-form-surfaces diagnostics lane snapshot

Fixture: `packages/semantic-runtime/fixtures/pressure/mixed-form-surfaces`
Probe file: `packages/lane-harness/probes/mixed-form-surfaces.probes.json`
Lane: `diagnostics`

This snapshot records observed language-server behavior. Operator verdicts live in the probe data.

## app-template-weakMetadata-and-shellTone

### Probe

```json
{
  "file": "src/app.html"
}
```

### publishDiagnostics

```json
{
  "diagnosticCount": 2,
  "diagnostics": [
    {
      "anomaly": null,
      "code": "weak-expression-member-owner",
      "data": {
        "diagnosticAuthority": "semantic-authoring-policy",
        "diagnosticDomain": "template",
        "diagnosticKind": "weak-expression-member-owner",
        "frameworkErrorCode": null,
        "frameworkRawErrorAuthority": null,
        "missingInput": "expression-member-owner-type:index-signature-only",
        "missingInputs": [
          "expression-member-owner-type:index-signature-only"
        ],
        "relatedQueryKind": "template-diagnostics",
        "repairAffordance": {
          "actionKind": "declare-missing-member",
          "actionability": "guided",
          "applicationKind": "none",
          "changeDomain": "app-source",
          "editPlanState": "not-available",
          "planKind": "source-member-declaration",
          "readiness": "ready-to-plan",
          "targetSourceCoverage": "all"
        },
        "subject": {
          "source": {
            "end": 497,
            "kind": "source-span-address",
            "label": "src/app.html@478..497",
            "path": "src/app.html",
            "role": "template-member-access",
            "start": 478
          },
          "span": null,
          "subjectKind": "template-member-access",
          "uri": null
        },
        "taxonomy": {
          "actionability": "guided",
          "category": "template-syntax",
          "confidence": null,
          "impact": "informational",
          "schema": "diagnostics-taxonomy/1"
        }
      },
      "message": "Member access is backed by an index signature, so completion cannot enumerate concrete property names.",
      "range": {
        "end": {
          "character": 51,
          "line": 10
        },
        "start": {
          "character": 45,
          "line": 10
        }
      },
      "rangeText": "source",
      "relatedInformation": [],
      "severity": "information",
      "source": "aurelia"
    },
    {
      "anomaly": null,
      "code": "missing-expression-member",
      "data": {
        "diagnosticAuthority": "semantic-authoring-policy",
        "diagnosticDomain": "template",
        "diagnosticKind": "missing-expression-member",
        "frameworkErrorCode": null,
        "frameworkRawErrorAuthority": null,
        "missingInput": "expression-member:selected-member-missing",
        "missingInputs": [
          "expression-member:selected-member-missing"
        ],
        "relatedQueryKind": "template-diagnostics",
        "repairAffordance": {
          "actionKind": "inspect-type-surface",
          "actionability": "manual",
          "applicationKind": "none",
          "changeDomain": "inspection",
          "editPlanState": "not-available",
          "planKind": "manual-inspection",
          "readiness": "inspection-required",
          "targetSourceCoverage": "all"
        },
        "subject": {
          "source": {
            "end": 527,
            "kind": "source-span-address",
            "label": "src/app.html@512..527",
            "path": "src/app.html",
            "role": "template-member-access",
            "start": 512
          },
          "span": null,
          "subjectKind": "template-member-access",
          "uri": null
        },
        "taxonomy": {
          "actionability": "manual",
          "category": "template-syntax",
          "confidence": null,
          "impact": "informational",
          "schema": "diagnostics-taxonomy/1"
        }
      },
      "message": "Member \"label\" is not projected on the owner type, so semantic tooling cannot validate or navigate it.",
      "range": {
        "end": {
          "character": 24,
          "line": 11
        },
        "start": {
          "character": 19,
          "line": 11
        }
      },
      "rangeText": "label",
      "relatedInformation": [
        {
          "anomaly": null,
          "file": "src/app.html",
          "message": "TS2339: Property 'label' does not exist on type 'string'.",
          "range": {
            "end": {
              "character": 24,
              "line": 11
            },
            "start": {
              "character": 19,
              "line": 11
            }
          },
          "rangeText": "label",
          "uri": "fixtures://pressure/mixed-form-surfaces/src/app.html"
        }
      ],
      "severity": "information",
      "source": "aurelia"
    }
  ],
  "outcome": "published",
  "uri": "fixtures://pressure/mixed-form-surfaces/src/app.html"
}
```

### aurelia/getDiagnostics

```json
{
  "fingerprint": "semantic-runtime:hit",
  "outcome": "result",
  "presentation": {
    "complete": true,
    "contextualCount": 1,
    "groups": [
      {
        "groupKey": "row:diagnostic:0:template:weak-expression-member-owner:semantic-authoring-policy:no-framework-code:src/app.html:491:497:expression-member-owner-type:index-signature-only",
        "maxRawSeverity": "info",
        "primary": {
          "diagnostic": {
            "actionability": "guided",
            "anomaly": null,
            "category": "template-syntax",
            "code": "weak-expression-member-owner",
            "data": {
              "diagnosticAuthority": "semantic-authoring-policy",
              "diagnosticDomain": "template",
              "diagnosticKind": "weak-expression-member-owner",
              "frameworkErrorCode": null,
              "frameworkRawErrorAuthority": null,
              "missingInput": "expression-member-owner-type:index-signature-only",
              "missingInputs": [
                "expression-member-owner-type:index-signature-only"
              ],
              "relatedQueryKind": "template-diagnostics",
              "repairAffordance": {
                "actionKind": "declare-missing-member",
                "actionability": "guided",
                "applicationKind": "none",
                "changeDomain": "app-source",
                "editPlanState": "not-available",
                "planKind": "source-member-declaration",
                "readiness": "ready-to-plan",
                "targetSourceCoverage": "all"
              },
              "subject": {
                "source": {
                  "end": 497,
                  "kind": "source-span-address",
                  "label": "src/app.html@478..497",
                  "path": "src/app.html",
                  "role": "template-member-access",
                  "start": 478
                },
                "span": null,
                "subjectKind": "template-member-access",
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
            "file": "src/app.html",
            "impact": "informational",
            "issues": [
              {
                "code": "weak-expression-member-owner",
                "kind": "weak-expression-member-owner",
                "message": "Member access is backed by an index signature, so completion cannot enumerate concrete property names."
              }
            ],
            "message": "Member access is backed by an index signature, so completion cannot enumerate concrete property names.",
            "related": [],
            "severity": "info",
            "source": "semantic-runtime:template",
            "span": {
              "end": 497,
              "start": 491
            },
            "spanText": "source",
            "status": "primary",
            "uri": "fixtures://pressure/mixed-form-surfaces/src/app.html"
          },
          "relation": null,
          "role": "primary",
          "rowId": "diagnostic:0:template:weak-expression-member-owner:semantic-authoring-policy:no-framework-code:src/app.html:491:497:expression-member-owner-type:index-signature-only"
        },
        "primarySeverity": "info",
        "rawRowCount": 1,
        "related": [],
        "subject": {
          "source": null,
          "span": {
            "end": 497,
            "start": 478
          },
          "subjectKind": "template-member-access",
          "uri": "file:///c:/projects/aurelia-ls2/packages/semantic-runtime/fixtures/pressure/mixed-form-surfaces/src/app.html"
        }
      },
      {
        "groupKey": "checker-agreement:missing-member:template-member-access:src/app.html:512:527:diagnostic:1:template:missing-expression-member:semantic-authoring-policy:no-framework-code:src/app.html:522:527:expression-member:selected-member-missing",
        "maxRawSeverity": "error",
        "primary": {
          "diagnostic": {
            "actionability": "manual",
            "anomaly": null,
            "category": "template-syntax",
            "code": "missing-expression-member",
            "data": {
              "diagnosticAuthority": "semantic-authoring-policy",
              "diagnosticDomain": "template",
              "diagnosticKind": "missing-expression-member",
              "frameworkErrorCode": null,
              "frameworkRawErrorAuthority": null,
              "missingInput": "expression-member:selected-member-missing",
              "missingInputs": [
                "expression-member:selected-member-missing"
              ],
              "relatedQueryKind": "template-diagnostics",
              "repairAffordance": {
                "actionKind": "inspect-type-surface",
                "actionability": "manual",
                "applicationKind": "none",
                "changeDomain": "inspection",
                "editPlanState": "not-available",
                "planKind": "manual-inspection",
                "readiness": "inspection-required",
                "targetSourceCoverage": "all"
              },
              "subject": {
                "source": {
                  "end": 527,
                  "kind": "source-span-address",
                  "label": "src/app.html@512..527",
                  "path": "src/app.html",
                  "role": "template-member-access",
                  "start": 512
                },
                "span": null,
                "subjectKind": "template-member-access",
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
            "file": "src/app.html",
            "impact": "informational",
            "issues": [
              {
                "code": "missing-expression-member",
                "kind": "missing-expression-member",
                "message": "Member \"label\" is not projected on the owner type, so semantic tooling cannot validate or navigate it."
              }
            ],
            "message": "Member \"label\" is not projected on the owner type, so semantic tooling cannot validate or navigate it.",
            "related": [],
            "severity": "info",
            "source": "semantic-runtime:template",
            "span": {
              "end": 527,
              "start": 522
            },
            "spanText": "label",
            "status": "primary",
            "uri": "fixtures://pressure/mixed-form-surfaces/src/app.html"
          },
          "relation": null,
          "role": "primary",
          "rowId": "diagnostic:1:template:missing-expression-member:semantic-authoring-policy:no-framework-code:src/app.html:522:527:expression-member:selected-member-missing"
        },
        "primarySeverity": "info",
        "rawRowCount": 2,
        "related": [
          {
            "diagnostic": {
              "actionability": "manual",
              "anomaly": null,
              "category": "template-syntax",
              "code": "TS2339",
              "data": {
                "diagnosticAuthority": "typescript",
                "diagnosticDomain": "template",
                "diagnosticKind": "template-expression-typescript-diagnostic",
                "frameworkErrorCode": null,
                "frameworkRawErrorAuthority": null,
                "missingInput": "typescript:TS2339",
                "missingInputs": [
                  "typescript:TS2339"
                ],
                "relatedQueryKind": "template-diagnostics",
                "repairAffordance": {
                  "actionKind": "inspect-type-surface",
                  "actionability": "manual",
                  "applicationKind": "none",
                  "changeDomain": "inspection",
                  "editPlanState": "not-available",
                  "planKind": "manual-inspection",
                  "readiness": "inspection-required",
                  "targetSourceCoverage": "all"
                },
                "subject": {
                  "source": {
                    "end": 527,
                    "kind": "source-span-address",
                    "label": "src/app.html@512..527",
                    "path": "src/app.html",
                    "role": "template-member-access",
                    "start": 512
                  },
                  "span": null,
                  "subjectKind": "template-member-access",
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
              "file": "src/app.html",
              "impact": "blocking",
              "issues": [
                {
                  "code": "TS2339",
                  "kind": "template-expression-typescript-diagnostic",
                  "message": "TS2339: Property 'label' does not exist on type 'string'."
                }
              ],
              "message": "TS2339: Property 'label' does not exist on type 'string'.",
              "related": [],
              "severity": "error",
              "source": "semantic-runtime:template",
              "span": {
                "end": 527,
                "start": 522
              },
              "spanText": "label",
              "status": "contextual",
              "uri": "fixtures://pressure/mixed-form-surfaces/src/app.html"
            },
            "relation": "checker-evidence",
            "role": "contextual",
            "rowId": "diagnostic:2:template:template-expression-typescript-diagnostic:typescript:no-framework-code:src/app.html:522:527:typescript:TS2339"
          }
        ],
        "subject": {
          "source": null,
          "span": {
            "end": 527,
            "start": 512
          },
          "subjectKind": "template-member-access",
          "uri": "file:///c:/projects/aurelia-ls2/packages/semantic-runtime/fixtures/pressure/mixed-form-surfaces/src/app.html"
        }
      }
    ],
    "primaryCount": 2,
    "rawRowCount": 3
  },
  "raw": {
    "diagnosticCount": 3,
    "diagnostics": [
      {
        "actionability": "guided",
        "anomaly": null,
        "category": "template-syntax",
        "code": "weak-expression-member-owner",
        "data": {
          "diagnosticAuthority": "semantic-authoring-policy",
          "diagnosticDomain": "template",
          "diagnosticKind": "weak-expression-member-owner",
          "frameworkErrorCode": null,
          "frameworkRawErrorAuthority": null,
          "missingInput": "expression-member-owner-type:index-signature-only",
          "missingInputs": [
            "expression-member-owner-type:index-signature-only"
          ],
          "relatedQueryKind": "template-diagnostics",
          "repairAffordance": {
            "actionKind": "declare-missing-member",
            "actionability": "guided",
            "applicationKind": "none",
            "changeDomain": "app-source",
            "editPlanState": "not-available",
            "planKind": "source-member-declaration",
            "readiness": "ready-to-plan",
            "targetSourceCoverage": "all"
          },
          "subject": {
            "source": {
              "end": 497,
              "kind": "source-span-address",
              "label": "src/app.html@478..497",
              "path": "src/app.html",
              "role": "template-member-access",
              "start": 478
            },
            "span": null,
            "subjectKind": "template-member-access",
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
        "file": "src/app.html",
        "impact": "informational",
        "issues": [
          {
            "code": "weak-expression-member-owner",
            "kind": "weak-expression-member-owner",
            "message": "Member access is backed by an index signature, so completion cannot enumerate concrete property names."
          }
        ],
        "message": "Member access is backed by an index signature, so completion cannot enumerate concrete property names.",
        "related": [],
        "severity": "info",
        "source": "semantic-runtime:template",
        "span": {
          "end": 497,
          "start": 491
        },
        "spanText": "source",
        "status": "canonical",
        "uri": "fixtures://pressure/mixed-form-surfaces/src/app.html"
      },
      {
        "actionability": "manual",
        "anomaly": null,
        "category": "template-syntax",
        "code": "missing-expression-member",
        "data": {
          "diagnosticAuthority": "semantic-authoring-policy",
          "diagnosticDomain": "template",
          "diagnosticKind": "missing-expression-member",
          "frameworkErrorCode": null,
          "frameworkRawErrorAuthority": null,
          "missingInput": "expression-member:selected-member-missing",
          "missingInputs": [
            "expression-member:selected-member-missing"
          ],
          "relatedQueryKind": "template-diagnostics",
          "repairAffordance": {
            "actionKind": "inspect-type-surface",
            "actionability": "manual",
            "applicationKind": "none",
            "changeDomain": "inspection",
            "editPlanState": "not-available",
            "planKind": "manual-inspection",
            "readiness": "inspection-required",
            "targetSourceCoverage": "all"
          },
          "subject": {
            "source": {
              "end": 527,
              "kind": "source-span-address",
              "label": "src/app.html@512..527",
              "path": "src/app.html",
              "role": "template-member-access",
              "start": 512
            },
            "span": null,
            "subjectKind": "template-member-access",
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
        "file": "src/app.html",
        "impact": "informational",
        "issues": [
          {
            "code": "missing-expression-member",
            "kind": "missing-expression-member",
            "message": "Member \"label\" is not projected on the owner type, so semantic tooling cannot validate or navigate it."
          }
        ],
        "message": "Member \"label\" is not projected on the owner type, so semantic tooling cannot validate or navigate it.",
        "related": [],
        "severity": "info",
        "source": "semantic-runtime:template",
        "span": {
          "end": 527,
          "start": 522
        },
        "spanText": "label",
        "status": "canonical",
        "uri": "fixtures://pressure/mixed-form-surfaces/src/app.html"
      },
      {
        "actionability": "manual",
        "anomaly": null,
        "category": "template-syntax",
        "code": "TS2339",
        "data": {
          "diagnosticAuthority": "typescript",
          "diagnosticDomain": "template",
          "diagnosticKind": "template-expression-typescript-diagnostic",
          "frameworkErrorCode": null,
          "frameworkRawErrorAuthority": null,
          "missingInput": "typescript:TS2339",
          "missingInputs": [
            "typescript:TS2339"
          ],
          "relatedQueryKind": "template-diagnostics",
          "repairAffordance": {
            "actionKind": "inspect-type-surface",
            "actionability": "manual",
            "applicationKind": "none",
            "changeDomain": "inspection",
            "editPlanState": "not-available",
            "planKind": "manual-inspection",
            "readiness": "inspection-required",
            "targetSourceCoverage": "all"
          },
          "subject": {
            "source": {
              "end": 527,
              "kind": "source-span-address",
              "label": "src/app.html@512..527",
              "path": "src/app.html",
              "role": "template-member-access",
              "start": 512
            },
            "span": null,
            "subjectKind": "template-member-access",
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
        "file": "src/app.html",
        "impact": "blocking",
        "issues": [
          {
            "code": "TS2339",
            "kind": "template-expression-typescript-diagnostic",
            "message": "TS2339: Property 'label' does not exist on type 'string'."
          }
        ],
        "message": "TS2339: Property 'label' does not exist on type 'string'.",
        "related": [],
        "severity": "error",
        "source": "semantic-runtime:template",
        "span": {
          "end": 527,
          "start": 522
        },
        "spanText": "label",
        "status": "canonical",
        "uri": "fixtures://pressure/mixed-form-surfaces/src/app.html"
      }
    ]
  },
  "suppressed": {
    "diagnosticCount": 0,
    "diagnostics": []
  },
  "surfaces": {
    "lsp": {
      "diagnosticCount": 2,
      "diagnostics": [
        {
          "actionability": "guided",
          "anomaly": null,
          "category": "template-syntax",
          "code": "weak-expression-member-owner",
          "data": {
            "diagnosticAuthority": "semantic-authoring-policy",
            "diagnosticDomain": "template",
            "diagnosticKind": "weak-expression-member-owner",
            "frameworkErrorCode": null,
            "frameworkRawErrorAuthority": null,
            "missingInput": "expression-member-owner-type:index-signature-only",
            "missingInputs": [
              "expression-member-owner-type:index-signature-only"
            ],
            "relatedQueryKind": "template-diagnostics",
            "repairAffordance": {
              "actionKind": "declare-missing-member",
              "actionability": "guided",
              "applicationKind": "none",
              "changeDomain": "app-source",
              "editPlanState": "not-available",
              "planKind": "source-member-declaration",
              "readiness": "ready-to-plan",
              "targetSourceCoverage": "all"
            },
            "subject": {
              "source": {
                "end": 497,
                "kind": "source-span-address",
                "label": "src/app.html@478..497",
                "path": "src/app.html",
                "role": "template-member-access",
                "start": 478
              },
              "span": null,
              "subjectKind": "template-member-access",
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
          "file": "src/app.html",
          "impact": "informational",
          "issues": [
            {
              "code": "weak-expression-member-owner",
              "kind": "weak-expression-member-owner",
              "message": "Member access is backed by an index signature, so completion cannot enumerate concrete property names."
            }
          ],
          "message": "Member access is backed by an index signature, so completion cannot enumerate concrete property names.",
          "related": [],
          "severity": "info",
          "source": "semantic-runtime:template",
          "span": {
            "end": 497,
            "start": 491
          },
          "spanText": "source",
          "status": "primary",
          "uri": "fixtures://pressure/mixed-form-surfaces/src/app.html"
        },
        {
          "actionability": "manual",
          "anomaly": null,
          "category": "template-syntax",
          "code": "missing-expression-member",
          "data": {
            "diagnosticAuthority": "semantic-authoring-policy",
            "diagnosticDomain": "template",
            "diagnosticKind": "missing-expression-member",
            "frameworkErrorCode": null,
            "frameworkRawErrorAuthority": null,
            "missingInput": "expression-member:selected-member-missing",
            "missingInputs": [
              "expression-member:selected-member-missing"
            ],
            "relatedQueryKind": "template-diagnostics",
            "repairAffordance": {
              "actionKind": "inspect-type-surface",
              "actionability": "manual",
              "applicationKind": "none",
              "changeDomain": "inspection",
              "editPlanState": "not-available",
              "planKind": "manual-inspection",
              "readiness": "inspection-required",
              "targetSourceCoverage": "all"
            },
            "subject": {
              "source": {
                "end": 527,
                "kind": "source-span-address",
                "label": "src/app.html@512..527",
                "path": "src/app.html",
                "role": "template-member-access",
                "start": 512
              },
              "span": null,
              "subjectKind": "template-member-access",
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
          "file": "src/app.html",
          "impact": "informational",
          "issues": [
            {
              "code": "missing-expression-member",
              "kind": "missing-expression-member",
              "message": "Member \"label\" is not projected on the owner type, so semantic tooling cannot validate or navigate it."
            }
          ],
          "message": "Member \"label\" is not projected on the owner type, so semantic tooling cannot validate or navigate it.",
          "related": [],
          "severity": "info",
          "source": "semantic-runtime:template",
          "span": {
            "end": 527,
            "start": 522
          },
          "spanText": "label",
          "status": "primary",
          "uri": "fixtures://pressure/mixed-form-surfaces/src/app.html"
        }
      ]
    }
  },
  "uri": "fixtures://pressure/mixed-form-surfaces/src/app.html"
}
```

### Alignment

```json
{
  "comparisonKey": "domain/kind/code/severity/text/message",
  "countsMatch": true,
  "customLspSurfaceCount": 2,
  "customOnly": [],
  "lspOnly": [],
  "lspPublishCount": 2,
  "suppressedCount": 0
}
```

## loose-picklist-unknown-option-label

### Probe

```json
{
  "file": "src/components/loose-picklist.html"
}
```

### publishDiagnostics

```json
{
  "diagnosticCount": 1,
  "diagnostics": [
    {
      "anomaly": null,
      "code": "TS18046",
      "data": {
        "diagnosticAuthority": "typescript",
        "diagnosticDomain": "template",
        "diagnosticKind": "template-expression-typescript-diagnostic",
        "frameworkErrorCode": null,
        "frameworkRawErrorAuthority": null,
        "missingInput": "typescript:TS18046",
        "missingInputs": [
          "typescript:TS18046"
        ],
        "relatedQueryKind": "template-diagnostics",
        "repairAffordance": {
          "actionKind": "inspect-type-surface",
          "actionability": "manual",
          "applicationKind": "none",
          "changeDomain": "inspection",
          "editPlanState": "not-available",
          "planKind": "manual-inspection",
          "readiness": "inspection-required",
          "targetSourceCoverage": "all"
        },
        "subject": {
          "source": {
            "end": 133,
            "kind": "source-span-address",
            "label": "src/components/loose-picklist.html@121..133",
            "path": "src/components/loose-picklist.html",
            "role": "template-member-access",
            "start": 121
          },
          "span": null,
          "subjectKind": "template-member-access",
          "uri": null
        },
        "taxonomy": {
          "actionability": "manual",
          "category": "template-syntax",
          "confidence": null,
          "impact": "blocking",
          "schema": "diagnostics-taxonomy/1"
        }
      },
      "message": "TS18046: 'option' is of type 'unknown'.",
      "range": {
        "end": {
          "character": 14,
          "line": 4
        },
        "start": {
          "character": 8,
          "line": 4
        }
      },
      "rangeText": "option",
      "relatedInformation": [
        {
          "anomaly": null,
          "file": "src/components/loose-picklist.html",
          "message": "The owner type has no projected members at this cursor, so the selected member cannot be validated or navigated.",
          "range": {
            "end": {
              "character": 20,
              "line": 4
            },
            "start": {
              "character": 15,
              "line": 4
            }
          },
          "rangeText": "label",
          "uri": "fixtures://pressure/mixed-form-surfaces/src/components/loose-picklist.html"
        }
      ],
      "severity": "error",
      "source": "aurelia"
    }
  ],
  "outcome": "published",
  "uri": "fixtures://pressure/mixed-form-surfaces/src/components/loose-picklist.html"
}
```

### aurelia/getDiagnostics

```json
{
  "fingerprint": "semantic-runtime:hit",
  "outcome": "result",
  "presentation": {
    "complete": true,
    "contextualCount": 1,
    "groups": [
      {
        "groupKey": "template-member-access:src/components/loose-picklist.html:121:133",
        "maxRawSeverity": "error",
        "primary": {
          "diagnostic": {
            "actionability": "manual",
            "anomaly": null,
            "category": "template-syntax",
            "code": "TS18046",
            "data": {
              "diagnosticAuthority": "typescript",
              "diagnosticDomain": "template",
              "diagnosticKind": "template-expression-typescript-diagnostic",
              "frameworkErrorCode": null,
              "frameworkRawErrorAuthority": null,
              "missingInput": "typescript:TS18046",
              "missingInputs": [
                "typescript:TS18046"
              ],
              "relatedQueryKind": "template-diagnostics",
              "repairAffordance": {
                "actionKind": "inspect-type-surface",
                "actionability": "manual",
                "applicationKind": "none",
                "changeDomain": "inspection",
                "editPlanState": "not-available",
                "planKind": "manual-inspection",
                "readiness": "inspection-required",
                "targetSourceCoverage": "all"
              },
              "subject": {
                "source": {
                  "end": 133,
                  "kind": "source-span-address",
                  "label": "src/components/loose-picklist.html@121..133",
                  "path": "src/components/loose-picklist.html",
                  "role": "template-member-access",
                  "start": 121
                },
                "span": null,
                "subjectKind": "template-member-access",
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
            "file": "src/components/loose-picklist.html",
            "impact": "blocking",
            "issues": [
              {
                "code": "TS18046",
                "kind": "template-expression-typescript-diagnostic",
                "message": "TS18046: 'option' is of type 'unknown'."
              }
            ],
            "message": "TS18046: 'option' is of type 'unknown'.",
            "related": [],
            "severity": "error",
            "source": "semantic-runtime:template",
            "span": {
              "end": 127,
              "start": 121
            },
            "spanText": "option",
            "status": "primary",
            "uri": "fixtures://pressure/mixed-form-surfaces/src/components/loose-picklist.html"
          },
          "relation": null,
          "role": "primary",
          "rowId": "diagnostic:0:template:template-expression-typescript-diagnostic:typescript:no-framework-code:src/components/loose-picklist.html:121:127:typescript:TS18046"
        },
        "primarySeverity": "error",
        "rawRowCount": 2,
        "related": [
          {
            "diagnostic": {
              "actionability": "manual",
              "anomaly": null,
              "category": "template-syntax",
              "code": "weak-expression-member-owner",
              "data": {
                "diagnosticAuthority": "semantic-authoring-policy",
                "diagnosticDomain": "template",
                "diagnosticKind": "weak-expression-member-owner",
                "frameworkErrorCode": null,
                "frameworkRawErrorAuthority": null,
                "missingInput": "expression-member-owner-type:no-members",
                "missingInputs": [
                  "expression-member-owner-type:no-members"
                ],
                "relatedQueryKind": "template-diagnostics",
                "repairAffordance": {
                  "actionKind": "inspect-type-surface",
                  "actionability": "manual",
                  "applicationKind": "none",
                  "changeDomain": "inspection",
                  "editPlanState": "not-available",
                  "planKind": "manual-inspection",
                  "readiness": "inspection-required",
                  "targetSourceCoverage": "all"
                },
                "subject": {
                  "source": {
                    "end": 133,
                    "kind": "source-span-address",
                    "label": "src/components/loose-picklist.html@121..133",
                    "path": "src/components/loose-picklist.html",
                    "role": "template-member-access",
                    "start": 121
                  },
                  "span": null,
                  "subjectKind": "template-member-access",
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
              "file": "src/components/loose-picklist.html",
              "impact": "informational",
              "issues": [
                {
                  "code": "weak-expression-member-owner",
                  "kind": "weak-expression-member-owner",
                  "message": "The owner type has no projected members at this cursor, so the selected member cannot be validated or navigated."
                }
              ],
              "message": "The owner type has no projected members at this cursor, so the selected member cannot be validated or navigated.",
              "related": [],
              "severity": "info",
              "source": "semantic-runtime:template",
              "span": {
                "end": 133,
                "start": 128
              },
              "spanText": "label",
              "status": "contextual",
              "uri": "fixtures://pressure/mixed-form-surfaces/src/components/loose-picklist.html"
            },
            "relation": "semantic-explanation",
            "role": "contextual",
            "rowId": "diagnostic:1:template:weak-expression-member-owner:semantic-authoring-policy:no-framework-code:src/components/loose-picklist.html:128:133:expression-member-owner-type:no-members"
          }
        ],
        "subject": {
          "source": null,
          "span": {
            "end": 133,
            "start": 121
          },
          "subjectKind": "template-member-access",
          "uri": "file:///c:/projects/aurelia-ls2/packages/semantic-runtime/fixtures/pressure/mixed-form-surfaces/src/components/loose-picklist.html"
        }
      }
    ],
    "primaryCount": 1,
    "rawRowCount": 2
  },
  "raw": {
    "diagnosticCount": 2,
    "diagnostics": [
      {
        "actionability": "manual",
        "anomaly": null,
        "category": "template-syntax",
        "code": "TS18046",
        "data": {
          "diagnosticAuthority": "typescript",
          "diagnosticDomain": "template",
          "diagnosticKind": "template-expression-typescript-diagnostic",
          "frameworkErrorCode": null,
          "frameworkRawErrorAuthority": null,
          "missingInput": "typescript:TS18046",
          "missingInputs": [
            "typescript:TS18046"
          ],
          "relatedQueryKind": "template-diagnostics",
          "repairAffordance": {
            "actionKind": "inspect-type-surface",
            "actionability": "manual",
            "applicationKind": "none",
            "changeDomain": "inspection",
            "editPlanState": "not-available",
            "planKind": "manual-inspection",
            "readiness": "inspection-required",
            "targetSourceCoverage": "all"
          },
          "subject": {
            "source": {
              "end": 133,
              "kind": "source-span-address",
              "label": "src/components/loose-picklist.html@121..133",
              "path": "src/components/loose-picklist.html",
              "role": "template-member-access",
              "start": 121
            },
            "span": null,
            "subjectKind": "template-member-access",
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
        "file": "src/components/loose-picklist.html",
        "impact": "blocking",
        "issues": [
          {
            "code": "TS18046",
            "kind": "template-expression-typescript-diagnostic",
            "message": "TS18046: 'option' is of type 'unknown'."
          }
        ],
        "message": "TS18046: 'option' is of type 'unknown'.",
        "related": [],
        "severity": "error",
        "source": "semantic-runtime:template",
        "span": {
          "end": 127,
          "start": 121
        },
        "spanText": "option",
        "status": "canonical",
        "uri": "fixtures://pressure/mixed-form-surfaces/src/components/loose-picklist.html"
      },
      {
        "actionability": "manual",
        "anomaly": null,
        "category": "template-syntax",
        "code": "weak-expression-member-owner",
        "data": {
          "diagnosticAuthority": "semantic-authoring-policy",
          "diagnosticDomain": "template",
          "diagnosticKind": "weak-expression-member-owner",
          "frameworkErrorCode": null,
          "frameworkRawErrorAuthority": null,
          "missingInput": "expression-member-owner-type:no-members",
          "missingInputs": [
            "expression-member-owner-type:no-members"
          ],
          "relatedQueryKind": "template-diagnostics",
          "repairAffordance": {
            "actionKind": "inspect-type-surface",
            "actionability": "manual",
            "applicationKind": "none",
            "changeDomain": "inspection",
            "editPlanState": "not-available",
            "planKind": "manual-inspection",
            "readiness": "inspection-required",
            "targetSourceCoverage": "all"
          },
          "subject": {
            "source": {
              "end": 133,
              "kind": "source-span-address",
              "label": "src/components/loose-picklist.html@121..133",
              "path": "src/components/loose-picklist.html",
              "role": "template-member-access",
              "start": 121
            },
            "span": null,
            "subjectKind": "template-member-access",
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
        "file": "src/components/loose-picklist.html",
        "impact": "informational",
        "issues": [
          {
            "code": "weak-expression-member-owner",
            "kind": "weak-expression-member-owner",
            "message": "The owner type has no projected members at this cursor, so the selected member cannot be validated or navigated."
          }
        ],
        "message": "The owner type has no projected members at this cursor, so the selected member cannot be validated or navigated.",
        "related": [],
        "severity": "info",
        "source": "semantic-runtime:template",
        "span": {
          "end": 133,
          "start": 128
        },
        "spanText": "label",
        "status": "canonical",
        "uri": "fixtures://pressure/mixed-form-surfaces/src/components/loose-picklist.html"
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
          "category": "template-syntax",
          "code": "TS18046",
          "data": {
            "diagnosticAuthority": "typescript",
            "diagnosticDomain": "template",
            "diagnosticKind": "template-expression-typescript-diagnostic",
            "frameworkErrorCode": null,
            "frameworkRawErrorAuthority": null,
            "missingInput": "typescript:TS18046",
            "missingInputs": [
              "typescript:TS18046"
            ],
            "relatedQueryKind": "template-diagnostics",
            "repairAffordance": {
              "actionKind": "inspect-type-surface",
              "actionability": "manual",
              "applicationKind": "none",
              "changeDomain": "inspection",
              "editPlanState": "not-available",
              "planKind": "manual-inspection",
              "readiness": "inspection-required",
              "targetSourceCoverage": "all"
            },
            "subject": {
              "source": {
                "end": 133,
                "kind": "source-span-address",
                "label": "src/components/loose-picklist.html@121..133",
                "path": "src/components/loose-picklist.html",
                "role": "template-member-access",
                "start": 121
              },
              "span": null,
              "subjectKind": "template-member-access",
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
          "file": "src/components/loose-picklist.html",
          "impact": "blocking",
          "issues": [
            {
              "code": "TS18046",
              "kind": "template-expression-typescript-diagnostic",
              "message": "TS18046: 'option' is of type 'unknown'."
            }
          ],
          "message": "TS18046: 'option' is of type 'unknown'.",
          "related": [],
          "severity": "error",
          "source": "semantic-runtime:template",
          "span": {
            "end": 127,
            "start": 121
          },
          "spanText": "option",
          "status": "primary",
          "uri": "fixtures://pressure/mixed-form-surfaces/src/components/loose-picklist.html"
        }
      ]
    }
  },
  "uri": "fixtures://pressure/mixed-form-surfaces/src/components/loose-picklist.html"
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
