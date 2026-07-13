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
  "diagnosticCount": 5,
  "diagnostics": [
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
          "line": 12
        },
        "start": {
          "character": 15,
          "line": 12
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
          "line": 13
        },
        "start": {
          "character": 15,
          "line": 13
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
          "line": 14
        },
        "start": {
          "character": 7,
          "line": 14
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
          "line": 15
        },
        "start": {
          "character": 7,
          "line": 15
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
          "line": 34
        },
        "start": {
          "character": 4,
          "line": 34
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
  "fingerprint": "semantic-runtime:hit",
  "outcome": "result",
  "presentation": {
    "complete": true,
    "contextualCount": 0,
    "groups": [
      {
        "groupKey": "row:diagnostic:1:template:template-compiler-error:framework-error-code:AUR0720:src/template-spread-capture-semantics-app.html:662:673:template-compiler:AUR0720",
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
              "sourceRole": null,
              "subject": null,
              "taxonomy": {
                "actionability": null,
                "category": null,
                "confidence": null,
                "impact": null,
                "schema": null
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
              "end": 673,
              "start": 662
            },
            "spanText": "...$element",
            "status": "primary",
            "uri": "fixtures://pressure/template-spread-capture-semantics/src/template-spread-capture-semantics-app.html"
          },
          "relation": null,
          "role": "primary",
          "rowId": "diagnostic:1:template:template-compiler-error:framework-error-code:AUR0720:src/template-spread-capture-semantics-app.html:662:673:template-compiler:AUR0720"
        },
        "primarySeverity": "error",
        "rawRowCount": 1,
        "related": [],
        "subject": null
      },
      {
        "groupKey": "row:diagnostic:2:template:runtime-renderer-framework-error:framework-error-code:AUR0820:src/template-spread-capture-semantics-app.html:718:726:runtime-renderer:AUR0820",
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
              "sourceRole": null,
              "subject": null,
              "taxonomy": {
                "actionability": null,
                "category": null,
                "confidence": null,
                "impact": null,
                "schema": null
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
              "end": 726,
              "start": 718
            },
            "spanText": "$element",
            "status": "primary",
            "uri": "fixtures://pressure/template-spread-capture-semantics/src/template-spread-capture-semantics-app.html"
          },
          "relation": null,
          "role": "primary",
          "rowId": "diagnostic:2:template:runtime-renderer-framework-error:framework-error-code:AUR0820:src/template-spread-capture-semantics-app.html:718:726:runtime-renderer:AUR0820"
        },
        "primarySeverity": "error",
        "rawRowCount": 1,
        "related": [],
        "subject": null
      },
      {
        "groupKey": "row:diagnostic:3:template:template-compiler-error:framework-error-code:AUR0720:src/template-spread-capture-semantics-app.html:770:783:template-compiler:AUR0720",
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
              "sourceRole": null,
              "subject": null,
              "taxonomy": {
                "actionability": null,
                "category": null,
                "confidence": null,
                "impact": null,
                "schema": null
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
              "end": 783,
              "start": 770
            },
            "spanText": "...$bindables",
            "status": "primary",
            "uri": "fixtures://pressure/template-spread-capture-semantics/src/template-spread-capture-semantics-app.html"
          },
          "relation": null,
          "role": "primary",
          "rowId": "diagnostic:3:template:template-compiler-error:framework-error-code:AUR0720:src/template-spread-capture-semantics-app.html:770:783:template-compiler:AUR0720"
        },
        "primarySeverity": "error",
        "rawRowCount": 1,
        "related": [],
        "subject": null
      },
      {
        "groupKey": "row:diagnostic:4:template:runtime-binding-framework-error:framework-error-code:AUR9999:src/template-spread-capture-semantics-app.html:812:821:runtime-binding:AUR9999",
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
              "sourceRole": null,
              "subject": null,
              "taxonomy": {
                "actionability": null,
                "category": null,
                "confidence": null,
                "impact": null,
                "schema": null
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
              "end": 821,
              "start": 812
            },
            "spanText": "...$attrs",
            "status": "primary",
            "uri": "fixtures://pressure/template-spread-capture-semantics/src/template-spread-capture-semantics-app.html"
          },
          "relation": null,
          "role": "primary",
          "rowId": "diagnostic:4:template:runtime-binding-framework-error:framework-error-code:AUR9999:src/template-spread-capture-semantics-app.html:812:821:runtime-binding:AUR9999"
        },
        "primarySeverity": "error",
        "rawRowCount": 1,
        "related": [],
        "subject": null
      },
      {
        "groupKey": "row:diagnostic:0:template:runtime-binding-framework-error:framework-error-code:AUR9998:src/template-spread-capture-semantics-app.html:1341:1370:runtime-binding:AUR9998",
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
              "sourceRole": null,
              "subject": null,
              "taxonomy": {
                "actionability": null,
                "category": null,
                "confidence": null,
                "impact": null,
                "schema": null
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
              "end": 1370,
              "start": 1341
            },
            "spanText": "inner-gate.bind=\"showCapture\"",
            "status": "primary",
            "uri": "fixtures://pressure/template-spread-capture-semantics/src/template-spread-capture-semantics-app.html"
          },
          "relation": null,
          "role": "primary",
          "rowId": "diagnostic:0:template:runtime-binding-framework-error:framework-error-code:AUR9998:src/template-spread-capture-semantics-app.html:1341:1370:runtime-binding:AUR9998"
        },
        "primarySeverity": "error",
        "rawRowCount": 1,
        "related": [],
        "subject": null
      }
    ],
    "primaryCount": 5,
    "rawRowCount": 5
  },
  "raw": {
    "diagnosticCount": 5,
    "diagnostics": [
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
          "sourceRole": null,
          "subject": null,
          "taxonomy": {
            "actionability": null,
            "category": null,
            "confidence": null,
            "impact": null,
            "schema": null
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
          "end": 1370,
          "start": 1341
        },
        "spanText": "inner-gate.bind=\"showCapture\"",
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
          "sourceRole": null,
          "subject": null,
          "taxonomy": {
            "actionability": null,
            "category": null,
            "confidence": null,
            "impact": null,
            "schema": null
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
          "end": 673,
          "start": 662
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
          "sourceRole": null,
          "subject": null,
          "taxonomy": {
            "actionability": null,
            "category": null,
            "confidence": null,
            "impact": null,
            "schema": null
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
          "end": 726,
          "start": 718
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
          "sourceRole": null,
          "subject": null,
          "taxonomy": {
            "actionability": null,
            "category": null,
            "confidence": null,
            "impact": null,
            "schema": null
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
          "end": 783,
          "start": 770
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
          "sourceRole": null,
          "subject": null,
          "taxonomy": {
            "actionability": null,
            "category": null,
            "confidence": null,
            "impact": null,
            "schema": null
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
          "end": 821,
          "start": 812
        },
        "spanText": "...$attrs",
        "status": "canonical",
        "uri": "fixtures://pressure/template-spread-capture-semantics/src/template-spread-capture-semantics-app.html"
      }
    ]
  },
  "suppressed": {
    "diagnosticCount": 0,
    "diagnostics": []
  },
  "surfaces": {
    "lsp": {
      "diagnosticCount": 5,
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
            "sourceRole": null,
            "subject": null,
            "taxonomy": {
              "actionability": null,
              "category": null,
              "confidence": null,
              "impact": null,
              "schema": null
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
            "end": 673,
            "start": 662
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
            "sourceRole": null,
            "subject": null,
            "taxonomy": {
              "actionability": null,
              "category": null,
              "confidence": null,
              "impact": null,
              "schema": null
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
            "end": 726,
            "start": 718
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
            "sourceRole": null,
            "subject": null,
            "taxonomy": {
              "actionability": null,
              "category": null,
              "confidence": null,
              "impact": null,
              "schema": null
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
            "end": 783,
            "start": 770
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
            "sourceRole": null,
            "subject": null,
            "taxonomy": {
              "actionability": null,
              "category": null,
              "confidence": null,
              "impact": null,
              "schema": null
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
            "end": 821,
            "start": 812
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
            "sourceRole": null,
            "subject": null,
            "taxonomy": {
              "actionability": null,
              "category": null,
              "confidence": null,
              "impact": null,
              "schema": null
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
            "end": 1370,
            "start": 1341
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
  "customLspSurfaceCount": 5,
  "customOnly": [],
  "lspOnly": [],
  "lspPublishCount": 5,
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
  "fingerprint": "semantic-runtime:hit",
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
  "suppressed": {
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
  "fingerprint": "semantic-runtime:hit",
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
  "suppressed": {
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
