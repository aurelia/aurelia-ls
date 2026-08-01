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
        "phase": null,
        "relatedInformation": [],
        "relatedQueryKind": "template-diagnostics",
        "repairAffordance": {
          "actionKind": "declare-missing-member",
          "actionability": "guided",
          "changeDomain": "app-source",
          "planKind": "source-member-declaration",
          "readiness": "ready-to-plan",
          "targetSourceCoverage": "all"
        },
        "sourceRole": "template",
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
        "phase": null,
        "relatedInformation": [],
        "relatedQueryKind": "template-diagnostics",
        "repairAffordance": {
          "actionKind": "inspect-type-surface",
          "actionability": "manual",
          "changeDomain": "inspection",
          "planKind": "manual-inspection",
          "readiness": "inspection-required",
          "targetSourceCoverage": "all"
        },
        "sourceRole": "template",
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
            "filePath": "src/app.html"
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
            "filePath": "src/app.html"
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
            "filePath": "src/app.html"
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
                "exact-authored-span"
              ],
              "source": {
                "end": 497,
                "kind": "source-span-address",
                "label": "src/app.html@491..497",
                "path": "src/app.html",
                "role": "name",
                "start": 491
              }
            },
            {
              "count": 1,
              "facets": [
                "authored-source",
                "exact-authored-span"
              ],
              "source": {
                "end": 527,
                "kind": "source-span-address",
                "label": "src/app.html@522..527",
                "path": "src/app.html",
                "role": "name",
                "start": 522
              }
            },
            {
              "count": 1,
              "facets": [
                "authored-source",
                "exact-authored-span"
              ],
              "source": {
                "end": 527,
                "kind": "source-span-address",
                "label": "src/app.html@522..527",
                "path": "src/app.html",
                "role": "typescript-overlay:semantic",
                "sourceFileRole": "template",
                "sourceWorkspaceKey": "mixed-form-surfaces",
                "start": 522
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
              "phase": null,
              "relatedInformation": [],
              "relatedQueryKind": "template-diagnostics",
              "repairAffordance": {
                "actionKind": "declare-missing-member",
                "actionability": "guided",
                "changeDomain": "app-source",
                "planKind": "source-member-declaration",
                "readiness": "ready-to-plan",
                "targetSourceCoverage": "all"
              },
              "sourceRole": "template",
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
              "phase": null,
              "relatedInformation": [],
              "relatedQueryKind": "template-diagnostics",
              "repairAffordance": {
                "actionKind": "inspect-type-surface",
                "actionability": "manual",
                "changeDomain": "inspection",
                "planKind": "manual-inspection",
                "readiness": "inspection-required",
                "targetSourceCoverage": "all"
              },
              "sourceRole": "template",
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
                "phase": "semantic",
                "relatedInformation": [],
                "relatedQueryKind": "template-diagnostics",
                "repairAffordance": {
                  "actionKind": "inspect-type-surface",
                  "actionability": "manual",
                  "changeDomain": "inspection",
                  "planKind": "manual-inspection",
                  "readiness": "inspection-required",
                  "targetSourceCoverage": "all"
                },
                "sourceRole": "template",
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
                  "impact": "blocking",
                  "schema": "diagnostics-taxonomy/1"
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
          "phase": null,
          "relatedInformation": [],
          "relatedQueryKind": "template-diagnostics",
          "repairAffordance": {
            "actionKind": "declare-missing-member",
            "actionability": "guided",
            "changeDomain": "app-source",
            "planKind": "source-member-declaration",
            "readiness": "ready-to-plan",
            "targetSourceCoverage": "all"
          },
          "sourceRole": "template",
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
          "phase": null,
          "relatedInformation": [],
          "relatedQueryKind": "template-diagnostics",
          "repairAffordance": {
            "actionKind": "inspect-type-surface",
            "actionability": "manual",
            "changeDomain": "inspection",
            "planKind": "manual-inspection",
            "readiness": "inspection-required",
            "targetSourceCoverage": "all"
          },
          "sourceRole": "template",
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
          "phase": "semantic",
          "relatedInformation": [],
          "relatedQueryKind": "template-diagnostics",
          "repairAffordance": {
            "actionKind": "inspect-type-surface",
            "actionability": "manual",
            "changeDomain": "inspection",
            "planKind": "manual-inspection",
            "readiness": "inspection-required",
            "targetSourceCoverage": "all"
          },
          "sourceRole": "template",
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
            "impact": "blocking",
            "schema": "diagnostics-taxonomy/1"
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
            "phase": null,
            "relatedInformation": [],
            "relatedQueryKind": "template-diagnostics",
            "repairAffordance": {
              "actionKind": "declare-missing-member",
              "actionability": "guided",
              "changeDomain": "app-source",
              "planKind": "source-member-declaration",
              "readiness": "ready-to-plan",
              "targetSourceCoverage": "all"
            },
            "sourceRole": "template",
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
            "phase": null,
            "relatedInformation": [],
            "relatedQueryKind": "template-diagnostics",
            "repairAffordance": {
              "actionKind": "inspect-type-surface",
              "actionability": "manual",
              "changeDomain": "inspection",
              "planKind": "manual-inspection",
              "readiness": "inspection-required",
              "targetSourceCoverage": "all"
            },
            "sourceRole": "template",
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

## loose-picklist-parent-specialized-option-label

### Probe

```json
{
  "file": "src/components/loose-picklist.html"
}
```

### publishDiagnostics

```json
{
  "diagnosticCount": 0,
  "diagnostics": [],
  "outcome": "published",
  "uri": "fixtures://pressure/mixed-form-surfaces/src/components/loose-picklist.html"
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
            "filePath": "src/components/loose-picklist.html"
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
            "filePath": "src/components/loose-picklist.html"
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
            "filePath": "src/components/loose-picklist.html"
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
  "uri": "fixtures://pressure/mixed-form-surfaces/src/components/loose-picklist.html"
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
