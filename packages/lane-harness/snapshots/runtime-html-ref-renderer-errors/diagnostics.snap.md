# runtime-html-ref-renderer-errors diagnostics lane snapshot

Fixture: `packages/semantic-runtime/fixtures/pressure/runtime-html-ref-renderer-errors`
Probe file: `packages/lane-harness/probes/runtime-html-ref-renderer-errors.probes.json`
Lane: `diagnostics`

This snapshot records observed language-server behavior. Operator verdicts live in the probe data.

## runtime-renderer-ref-template

### Probe

```json
{
  "file": "src/runtime-html-ref-renderer-errors-app.html"
}
```

### publishDiagnostics

```json
{
  "diagnosticCount": 4,
  "diagnostics": [
    {
      "anomaly": null,
      "code": "AUR0750",
      "data": {
        "diagnosticAuthority": "framework-error-code",
        "diagnosticDomain": "template",
        "diagnosticKind": "runtime-renderer-framework-error",
        "frameworkErrorCode": "AUR0750",
        "frameworkRawErrorAuthority": null,
        "missingInput": "runtime-renderer:AUR0750",
        "missingInputs": [
          "runtime-renderer:AUR0750"
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
        "subject": {
          "source": {
            "end": 46,
            "kind": "source-span-address",
            "label": "src/runtime-html-ref-renderer-errors-app.html@42..46",
            "path": "src/runtime-html-ref-renderer-errors-app.html",
            "role": "name",
            "start": 42
          },
          "span": null,
          "subjectKind": "template-syntax",
          "uri": null
        },
        "taxonomy": {
          "actionability": "guided",
          "category": "template-syntax",
          "confidence": null,
          "impact": "blocking",
          "schema": "diagnostics-taxonomy/1"
        }
      },
      "message": "Aurelia runtime renderer AUR0750 rejects this instruction input: view.ref is not supported by runtime-html..",
      "range": {
        "end": {
          "character": 9,
          "line": 1
        },
        "start": {
          "character": 5,
          "line": 1
        }
      },
      "rangeText": "view",
      "relatedInformation": [],
      "severity": "error",
      "source": "aurelia"
    },
    {
      "anomaly": null,
      "code": "AUR0762",
      "data": {
        "diagnosticAuthority": "framework-error-code",
        "diagnosticDomain": "template",
        "diagnosticKind": "runtime-renderer-framework-error",
        "frameworkErrorCode": "AUR0762",
        "frameworkRawErrorAuthority": null,
        "missingInput": "runtime-renderer:AUR0762",
        "missingInputs": [
          "runtime-renderer:AUR0762"
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
        "subject": {
          "source": {
            "end": 86,
            "kind": "source-span-address",
            "label": "src/runtime-html-ref-renderer-errors-app.html@76..86",
            "path": "src/runtime-html-ref-renderer-errors-app.html",
            "role": "name",
            "start": 76
          },
          "span": null,
          "subjectKind": "template-syntax",
          "uri": null
        },
        "taxonomy": {
          "actionability": "guided",
          "category": "template-syntax",
          "confidence": null,
          "impact": "blocking",
          "schema": "diagnostics-taxonomy/1"
        }
      },
      "message": "Aurelia runtime renderer AUR0762 rejects this instruction input: controller.ref requires a custom element or containerless host..",
      "range": {
        "end": {
          "character": 15,
          "line": 2
        },
        "start": {
          "character": 5,
          "line": 2
        }
      },
      "rangeText": "controller",
      "relatedInformation": [],
      "severity": "error",
      "source": "aurelia"
    },
    {
      "anomaly": null,
      "code": "AUR0763",
      "data": {
        "diagnosticAuthority": "framework-error-code",
        "diagnosticDomain": "template",
        "diagnosticKind": "runtime-renderer-framework-error",
        "frameworkErrorCode": "AUR0763",
        "frameworkRawErrorAuthority": null,
        "missingInput": "runtime-renderer:AUR0763",
        "missingInputs": [
          "runtime-renderer:AUR0763"
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
        "subject": {
          "source": {
            "end": 129,
            "kind": "source-span-address",
            "label": "src/runtime-html-ref-renderer-errors-app.html@124..129",
            "path": "src/runtime-html-ref-renderer-errors-app.html",
            "role": "name",
            "start": 124
          },
          "span": null,
          "subjectKind": "template-syntax",
          "uri": null
        },
        "taxonomy": {
          "actionability": "guided",
          "category": "template-syntax",
          "confidence": null,
          "impact": "blocking",
          "schema": "diagnostics-taxonomy/1"
        }
      },
      "message": "Aurelia runtime renderer AUR0763 rejects this instruction input: Ref target 'ghost' could not fall back to a custom element controller because the ref host is not a custom element..",
      "range": {
        "end": {
          "character": 10,
          "line": 3
        },
        "start": {
          "character": 5,
          "line": 3
        }
      },
      "rangeText": "ghost",
      "relatedInformation": [],
      "severity": "error",
      "source": "aurelia"
    },
    {
      "anomaly": null,
      "code": "AUR0751",
      "data": {
        "diagnosticAuthority": "framework-error-code",
        "diagnosticDomain": "template",
        "diagnosticKind": "runtime-renderer-framework-error",
        "frameworkErrorCode": "AUR0751",
        "frameworkRawErrorAuthority": null,
        "missingInput": "runtime-renderer:AUR0751",
        "missingInputs": [
          "runtime-renderer:AUR0751"
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
        "subject": {
          "source": {
            "end": 311,
            "kind": "source-span-address",
            "label": "src/runtime-html-ref-renderer-errors-app.html@306..311",
            "path": "src/runtime-html-ref-renderer-errors-app.html",
            "role": "name",
            "start": 306
          },
          "span": null,
          "subjectKind": "template-syntax",
          "uri": null
        },
        "taxonomy": {
          "actionability": "guided",
          "category": "template-syntax",
          "confidence": null,
          "impact": "blocking",
          "schema": "diagnostics-taxonomy/1"
        }
      },
      "message": "Aurelia runtime renderer AUR0751 rejects this instruction input: Ref target 'ghost' was not found amongst the target API..",
      "range": {
        "end": {
          "character": 24,
          "line": 6
        },
        "start": {
          "character": 19,
          "line": 6
        }
      },
      "rangeText": "ghost",
      "relatedInformation": [],
      "severity": "error",
      "source": "aurelia"
    }
  ],
  "outcome": "published",
  "uri": "fixtures://pressure/runtime-html-ref-renderer-errors/src/runtime-html-ref-renderer-errors-app.html"
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
        "groupKey": "row:diagnostic:2:template:runtime-renderer-framework-error:framework-error-code:AUR0750:src/runtime-html-ref-renderer-errors-app.html:42:46:runtime-renderer:AUR0750",
        "maxRawSeverity": "error",
        "primary": {
          "diagnostic": {
            "actionability": "guided",
            "anomaly": null,
            "category": "template-syntax",
            "code": "AUR0750",
            "data": {
              "diagnosticAuthority": "framework-error-code",
              "diagnosticDomain": "template",
              "diagnosticKind": "runtime-renderer-framework-error",
              "frameworkErrorCode": "AUR0750",
              "frameworkRawErrorAuthority": null,
              "missingInput": "runtime-renderer:AUR0750",
              "missingInputs": [
                "runtime-renderer:AUR0750"
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
              "subject": {
                "source": {
                  "end": 46,
                  "kind": "source-span-address",
                  "label": "src/runtime-html-ref-renderer-errors-app.html@42..46",
                  "path": "src/runtime-html-ref-renderer-errors-app.html",
                  "role": "name",
                  "start": 42
                },
                "span": null,
                "subjectKind": "template-syntax",
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
            "file": "src/runtime-html-ref-renderer-errors-app.html",
            "impact": "blocking",
            "issues": [
              {
                "code": "AUR0750",
                "kind": "runtime-renderer-framework-error",
                "message": "Aurelia runtime renderer AUR0750 rejects this instruction input: view.ref is not supported by runtime-html.."
              }
            ],
            "message": "Aurelia runtime renderer AUR0750 rejects this instruction input: view.ref is not supported by runtime-html..",
            "related": [],
            "severity": "error",
            "source": "semantic-runtime:template",
            "span": {
              "end": 46,
              "start": 42
            },
            "spanText": "view",
            "status": "primary",
            "uri": "fixtures://pressure/runtime-html-ref-renderer-errors/src/runtime-html-ref-renderer-errors-app.html"
          },
          "relation": null,
          "role": "primary",
          "rowId": "diagnostic:2:template:runtime-renderer-framework-error:framework-error-code:AUR0750:src/runtime-html-ref-renderer-errors-app.html:42:46:runtime-renderer:AUR0750"
        },
        "primarySeverity": "error",
        "rawRowCount": 1,
        "related": [],
        "subject": {
          "source": null,
          "span": {
            "end": 46,
            "start": 42
          },
          "subjectKind": "template-syntax",
          "uri": "file:///c:/projects/aurelia-ls2/packages/semantic-runtime/fixtures/pressure/runtime-html-ref-renderer-errors/src/runtime-html-ref-renderer-errors-app.html"
        }
      },
      {
        "groupKey": "row:diagnostic:3:template:runtime-renderer-framework-error:framework-error-code:AUR0762:src/runtime-html-ref-renderer-errors-app.html:76:86:runtime-renderer:AUR0762",
        "maxRawSeverity": "error",
        "primary": {
          "diagnostic": {
            "actionability": "guided",
            "anomaly": null,
            "category": "template-syntax",
            "code": "AUR0762",
            "data": {
              "diagnosticAuthority": "framework-error-code",
              "diagnosticDomain": "template",
              "diagnosticKind": "runtime-renderer-framework-error",
              "frameworkErrorCode": "AUR0762",
              "frameworkRawErrorAuthority": null,
              "missingInput": "runtime-renderer:AUR0762",
              "missingInputs": [
                "runtime-renderer:AUR0762"
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
              "subject": {
                "source": {
                  "end": 86,
                  "kind": "source-span-address",
                  "label": "src/runtime-html-ref-renderer-errors-app.html@76..86",
                  "path": "src/runtime-html-ref-renderer-errors-app.html",
                  "role": "name",
                  "start": 76
                },
                "span": null,
                "subjectKind": "template-syntax",
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
            "file": "src/runtime-html-ref-renderer-errors-app.html",
            "impact": "blocking",
            "issues": [
              {
                "code": "AUR0762",
                "kind": "runtime-renderer-framework-error",
                "message": "Aurelia runtime renderer AUR0762 rejects this instruction input: controller.ref requires a custom element or containerless host.."
              }
            ],
            "message": "Aurelia runtime renderer AUR0762 rejects this instruction input: controller.ref requires a custom element or containerless host..",
            "related": [],
            "severity": "error",
            "source": "semantic-runtime:template",
            "span": {
              "end": 86,
              "start": 76
            },
            "spanText": "controller",
            "status": "primary",
            "uri": "fixtures://pressure/runtime-html-ref-renderer-errors/src/runtime-html-ref-renderer-errors-app.html"
          },
          "relation": null,
          "role": "primary",
          "rowId": "diagnostic:3:template:runtime-renderer-framework-error:framework-error-code:AUR0762:src/runtime-html-ref-renderer-errors-app.html:76:86:runtime-renderer:AUR0762"
        },
        "primarySeverity": "error",
        "rawRowCount": 1,
        "related": [],
        "subject": {
          "source": null,
          "span": {
            "end": 86,
            "start": 76
          },
          "subjectKind": "template-syntax",
          "uri": "file:///c:/projects/aurelia-ls2/packages/semantic-runtime/fixtures/pressure/runtime-html-ref-renderer-errors/src/runtime-html-ref-renderer-errors-app.html"
        }
      },
      {
        "groupKey": "row:diagnostic:0:template:runtime-renderer-framework-error:framework-error-code:AUR0763:src/runtime-html-ref-renderer-errors-app.html:124:129:runtime-renderer:AUR0763",
        "maxRawSeverity": "error",
        "primary": {
          "diagnostic": {
            "actionability": "guided",
            "anomaly": null,
            "category": "template-syntax",
            "code": "AUR0763",
            "data": {
              "diagnosticAuthority": "framework-error-code",
              "diagnosticDomain": "template",
              "diagnosticKind": "runtime-renderer-framework-error",
              "frameworkErrorCode": "AUR0763",
              "frameworkRawErrorAuthority": null,
              "missingInput": "runtime-renderer:AUR0763",
              "missingInputs": [
                "runtime-renderer:AUR0763"
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
              "subject": {
                "source": {
                  "end": 129,
                  "kind": "source-span-address",
                  "label": "src/runtime-html-ref-renderer-errors-app.html@124..129",
                  "path": "src/runtime-html-ref-renderer-errors-app.html",
                  "role": "name",
                  "start": 124
                },
                "span": null,
                "subjectKind": "template-syntax",
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
            "file": "src/runtime-html-ref-renderer-errors-app.html",
            "impact": "blocking",
            "issues": [
              {
                "code": "AUR0763",
                "kind": "runtime-renderer-framework-error",
                "message": "Aurelia runtime renderer AUR0763 rejects this instruction input: Ref target 'ghost' could not fall back to a custom element controller because the ref host is not a custom element.."
              }
            ],
            "message": "Aurelia runtime renderer AUR0763 rejects this instruction input: Ref target 'ghost' could not fall back to a custom element controller because the ref host is not a custom element..",
            "related": [],
            "severity": "error",
            "source": "semantic-runtime:template",
            "span": {
              "end": 129,
              "start": 124
            },
            "spanText": "ghost",
            "status": "primary",
            "uri": "fixtures://pressure/runtime-html-ref-renderer-errors/src/runtime-html-ref-renderer-errors-app.html"
          },
          "relation": null,
          "role": "primary",
          "rowId": "diagnostic:0:template:runtime-renderer-framework-error:framework-error-code:AUR0763:src/runtime-html-ref-renderer-errors-app.html:124:129:runtime-renderer:AUR0763"
        },
        "primarySeverity": "error",
        "rawRowCount": 1,
        "related": [],
        "subject": {
          "source": null,
          "span": {
            "end": 129,
            "start": 124
          },
          "subjectKind": "template-syntax",
          "uri": "file:///c:/projects/aurelia-ls2/packages/semantic-runtime/fixtures/pressure/runtime-html-ref-renderer-errors/src/runtime-html-ref-renderer-errors-app.html"
        }
      },
      {
        "groupKey": "row:diagnostic:1:template:runtime-renderer-framework-error:framework-error-code:AUR0751:src/runtime-html-ref-renderer-errors-app.html:306:311:runtime-renderer:AUR0751",
        "maxRawSeverity": "error",
        "primary": {
          "diagnostic": {
            "actionability": "guided",
            "anomaly": null,
            "category": "template-syntax",
            "code": "AUR0751",
            "data": {
              "diagnosticAuthority": "framework-error-code",
              "diagnosticDomain": "template",
              "diagnosticKind": "runtime-renderer-framework-error",
              "frameworkErrorCode": "AUR0751",
              "frameworkRawErrorAuthority": null,
              "missingInput": "runtime-renderer:AUR0751",
              "missingInputs": [
                "runtime-renderer:AUR0751"
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
              "subject": {
                "source": {
                  "end": 311,
                  "kind": "source-span-address",
                  "label": "src/runtime-html-ref-renderer-errors-app.html@306..311",
                  "path": "src/runtime-html-ref-renderer-errors-app.html",
                  "role": "name",
                  "start": 306
                },
                "span": null,
                "subjectKind": "template-syntax",
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
            "file": "src/runtime-html-ref-renderer-errors-app.html",
            "impact": "blocking",
            "issues": [
              {
                "code": "AUR0751",
                "kind": "runtime-renderer-framework-error",
                "message": "Aurelia runtime renderer AUR0751 rejects this instruction input: Ref target 'ghost' was not found amongst the target API.."
              }
            ],
            "message": "Aurelia runtime renderer AUR0751 rejects this instruction input: Ref target 'ghost' was not found amongst the target API..",
            "related": [],
            "severity": "error",
            "source": "semantic-runtime:template",
            "span": {
              "end": 311,
              "start": 306
            },
            "spanText": "ghost",
            "status": "primary",
            "uri": "fixtures://pressure/runtime-html-ref-renderer-errors/src/runtime-html-ref-renderer-errors-app.html"
          },
          "relation": null,
          "role": "primary",
          "rowId": "diagnostic:1:template:runtime-renderer-framework-error:framework-error-code:AUR0751:src/runtime-html-ref-renderer-errors-app.html:306:311:runtime-renderer:AUR0751"
        },
        "primarySeverity": "error",
        "rawRowCount": 1,
        "related": [],
        "subject": {
          "source": null,
          "span": {
            "end": 311,
            "start": 306
          },
          "subjectKind": "template-syntax",
          "uri": "file:///c:/projects/aurelia-ls2/packages/semantic-runtime/fixtures/pressure/runtime-html-ref-renderer-errors/src/runtime-html-ref-renderer-errors-app.html"
        }
      }
    ],
    "primaryCount": 4,
    "rawRowCount": 4
  },
  "raw": {
    "diagnosticCount": 4,
    "diagnostics": [
      {
        "actionability": "guided",
        "anomaly": null,
        "category": "template-syntax",
        "code": "AUR0763",
        "data": {
          "diagnosticAuthority": "framework-error-code",
          "diagnosticDomain": "template",
          "diagnosticKind": "runtime-renderer-framework-error",
          "frameworkErrorCode": "AUR0763",
          "frameworkRawErrorAuthority": null,
          "missingInput": "runtime-renderer:AUR0763",
          "missingInputs": [
            "runtime-renderer:AUR0763"
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
          "subject": {
            "source": {
              "end": 129,
              "kind": "source-span-address",
              "label": "src/runtime-html-ref-renderer-errors-app.html@124..129",
              "path": "src/runtime-html-ref-renderer-errors-app.html",
              "role": "name",
              "start": 124
            },
            "span": null,
            "subjectKind": "template-syntax",
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
        "file": "src/runtime-html-ref-renderer-errors-app.html",
        "impact": "blocking",
        "issues": [
          {
            "code": "AUR0763",
            "kind": "runtime-renderer-framework-error",
            "message": "Aurelia runtime renderer AUR0763 rejects this instruction input: Ref target 'ghost' could not fall back to a custom element controller because the ref host is not a custom element.."
          }
        ],
        "message": "Aurelia runtime renderer AUR0763 rejects this instruction input: Ref target 'ghost' could not fall back to a custom element controller because the ref host is not a custom element..",
        "related": [],
        "severity": "error",
        "source": "semantic-runtime:template",
        "span": {
          "end": 129,
          "start": 124
        },
        "spanText": "ghost",
        "status": "canonical",
        "uri": "fixtures://pressure/runtime-html-ref-renderer-errors/src/runtime-html-ref-renderer-errors-app.html"
      },
      {
        "actionability": "guided",
        "anomaly": null,
        "category": "template-syntax",
        "code": "AUR0751",
        "data": {
          "diagnosticAuthority": "framework-error-code",
          "diagnosticDomain": "template",
          "diagnosticKind": "runtime-renderer-framework-error",
          "frameworkErrorCode": "AUR0751",
          "frameworkRawErrorAuthority": null,
          "missingInput": "runtime-renderer:AUR0751",
          "missingInputs": [
            "runtime-renderer:AUR0751"
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
          "subject": {
            "source": {
              "end": 311,
              "kind": "source-span-address",
              "label": "src/runtime-html-ref-renderer-errors-app.html@306..311",
              "path": "src/runtime-html-ref-renderer-errors-app.html",
              "role": "name",
              "start": 306
            },
            "span": null,
            "subjectKind": "template-syntax",
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
        "file": "src/runtime-html-ref-renderer-errors-app.html",
        "impact": "blocking",
        "issues": [
          {
            "code": "AUR0751",
            "kind": "runtime-renderer-framework-error",
            "message": "Aurelia runtime renderer AUR0751 rejects this instruction input: Ref target 'ghost' was not found amongst the target API.."
          }
        ],
        "message": "Aurelia runtime renderer AUR0751 rejects this instruction input: Ref target 'ghost' was not found amongst the target API..",
        "related": [],
        "severity": "error",
        "source": "semantic-runtime:template",
        "span": {
          "end": 311,
          "start": 306
        },
        "spanText": "ghost",
        "status": "canonical",
        "uri": "fixtures://pressure/runtime-html-ref-renderer-errors/src/runtime-html-ref-renderer-errors-app.html"
      },
      {
        "actionability": "guided",
        "anomaly": null,
        "category": "template-syntax",
        "code": "AUR0750",
        "data": {
          "diagnosticAuthority": "framework-error-code",
          "diagnosticDomain": "template",
          "diagnosticKind": "runtime-renderer-framework-error",
          "frameworkErrorCode": "AUR0750",
          "frameworkRawErrorAuthority": null,
          "missingInput": "runtime-renderer:AUR0750",
          "missingInputs": [
            "runtime-renderer:AUR0750"
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
          "subject": {
            "source": {
              "end": 46,
              "kind": "source-span-address",
              "label": "src/runtime-html-ref-renderer-errors-app.html@42..46",
              "path": "src/runtime-html-ref-renderer-errors-app.html",
              "role": "name",
              "start": 42
            },
            "span": null,
            "subjectKind": "template-syntax",
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
        "file": "src/runtime-html-ref-renderer-errors-app.html",
        "impact": "blocking",
        "issues": [
          {
            "code": "AUR0750",
            "kind": "runtime-renderer-framework-error",
            "message": "Aurelia runtime renderer AUR0750 rejects this instruction input: view.ref is not supported by runtime-html.."
          }
        ],
        "message": "Aurelia runtime renderer AUR0750 rejects this instruction input: view.ref is not supported by runtime-html..",
        "related": [],
        "severity": "error",
        "source": "semantic-runtime:template",
        "span": {
          "end": 46,
          "start": 42
        },
        "spanText": "view",
        "status": "canonical",
        "uri": "fixtures://pressure/runtime-html-ref-renderer-errors/src/runtime-html-ref-renderer-errors-app.html"
      },
      {
        "actionability": "guided",
        "anomaly": null,
        "category": "template-syntax",
        "code": "AUR0762",
        "data": {
          "diagnosticAuthority": "framework-error-code",
          "diagnosticDomain": "template",
          "diagnosticKind": "runtime-renderer-framework-error",
          "frameworkErrorCode": "AUR0762",
          "frameworkRawErrorAuthority": null,
          "missingInput": "runtime-renderer:AUR0762",
          "missingInputs": [
            "runtime-renderer:AUR0762"
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
          "subject": {
            "source": {
              "end": 86,
              "kind": "source-span-address",
              "label": "src/runtime-html-ref-renderer-errors-app.html@76..86",
              "path": "src/runtime-html-ref-renderer-errors-app.html",
              "role": "name",
              "start": 76
            },
            "span": null,
            "subjectKind": "template-syntax",
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
        "file": "src/runtime-html-ref-renderer-errors-app.html",
        "impact": "blocking",
        "issues": [
          {
            "code": "AUR0762",
            "kind": "runtime-renderer-framework-error",
            "message": "Aurelia runtime renderer AUR0762 rejects this instruction input: controller.ref requires a custom element or containerless host.."
          }
        ],
        "message": "Aurelia runtime renderer AUR0762 rejects this instruction input: controller.ref requires a custom element or containerless host..",
        "related": [],
        "severity": "error",
        "source": "semantic-runtime:template",
        "span": {
          "end": 86,
          "start": 76
        },
        "spanText": "controller",
        "status": "canonical",
        "uri": "fixtures://pressure/runtime-html-ref-renderer-errors/src/runtime-html-ref-renderer-errors-app.html"
      }
    ]
  },
  "suppressed": {
    "diagnosticCount": 0,
    "diagnostics": []
  },
  "surfaces": {
    "lsp": {
      "diagnosticCount": 4,
      "diagnostics": [
        {
          "actionability": "guided",
          "anomaly": null,
          "category": "template-syntax",
          "code": "AUR0750",
          "data": {
            "diagnosticAuthority": "framework-error-code",
            "diagnosticDomain": "template",
            "diagnosticKind": "runtime-renderer-framework-error",
            "frameworkErrorCode": "AUR0750",
            "frameworkRawErrorAuthority": null,
            "missingInput": "runtime-renderer:AUR0750",
            "missingInputs": [
              "runtime-renderer:AUR0750"
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
            "subject": {
              "source": {
                "end": 46,
                "kind": "source-span-address",
                "label": "src/runtime-html-ref-renderer-errors-app.html@42..46",
                "path": "src/runtime-html-ref-renderer-errors-app.html",
                "role": "name",
                "start": 42
              },
              "span": null,
              "subjectKind": "template-syntax",
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
          "file": "src/runtime-html-ref-renderer-errors-app.html",
          "impact": "blocking",
          "issues": [
            {
              "code": "AUR0750",
              "kind": "runtime-renderer-framework-error",
              "message": "Aurelia runtime renderer AUR0750 rejects this instruction input: view.ref is not supported by runtime-html.."
            }
          ],
          "message": "Aurelia runtime renderer AUR0750 rejects this instruction input: view.ref is not supported by runtime-html..",
          "related": [],
          "severity": "error",
          "source": "semantic-runtime:template",
          "span": {
            "end": 46,
            "start": 42
          },
          "spanText": "view",
          "status": "primary",
          "uri": "fixtures://pressure/runtime-html-ref-renderer-errors/src/runtime-html-ref-renderer-errors-app.html"
        },
        {
          "actionability": "guided",
          "anomaly": null,
          "category": "template-syntax",
          "code": "AUR0762",
          "data": {
            "diagnosticAuthority": "framework-error-code",
            "diagnosticDomain": "template",
            "diagnosticKind": "runtime-renderer-framework-error",
            "frameworkErrorCode": "AUR0762",
            "frameworkRawErrorAuthority": null,
            "missingInput": "runtime-renderer:AUR0762",
            "missingInputs": [
              "runtime-renderer:AUR0762"
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
            "subject": {
              "source": {
                "end": 86,
                "kind": "source-span-address",
                "label": "src/runtime-html-ref-renderer-errors-app.html@76..86",
                "path": "src/runtime-html-ref-renderer-errors-app.html",
                "role": "name",
                "start": 76
              },
              "span": null,
              "subjectKind": "template-syntax",
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
          "file": "src/runtime-html-ref-renderer-errors-app.html",
          "impact": "blocking",
          "issues": [
            {
              "code": "AUR0762",
              "kind": "runtime-renderer-framework-error",
              "message": "Aurelia runtime renderer AUR0762 rejects this instruction input: controller.ref requires a custom element or containerless host.."
            }
          ],
          "message": "Aurelia runtime renderer AUR0762 rejects this instruction input: controller.ref requires a custom element or containerless host..",
          "related": [],
          "severity": "error",
          "source": "semantic-runtime:template",
          "span": {
            "end": 86,
            "start": 76
          },
          "spanText": "controller",
          "status": "primary",
          "uri": "fixtures://pressure/runtime-html-ref-renderer-errors/src/runtime-html-ref-renderer-errors-app.html"
        },
        {
          "actionability": "guided",
          "anomaly": null,
          "category": "template-syntax",
          "code": "AUR0763",
          "data": {
            "diagnosticAuthority": "framework-error-code",
            "diagnosticDomain": "template",
            "diagnosticKind": "runtime-renderer-framework-error",
            "frameworkErrorCode": "AUR0763",
            "frameworkRawErrorAuthority": null,
            "missingInput": "runtime-renderer:AUR0763",
            "missingInputs": [
              "runtime-renderer:AUR0763"
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
            "subject": {
              "source": {
                "end": 129,
                "kind": "source-span-address",
                "label": "src/runtime-html-ref-renderer-errors-app.html@124..129",
                "path": "src/runtime-html-ref-renderer-errors-app.html",
                "role": "name",
                "start": 124
              },
              "span": null,
              "subjectKind": "template-syntax",
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
          "file": "src/runtime-html-ref-renderer-errors-app.html",
          "impact": "blocking",
          "issues": [
            {
              "code": "AUR0763",
              "kind": "runtime-renderer-framework-error",
              "message": "Aurelia runtime renderer AUR0763 rejects this instruction input: Ref target 'ghost' could not fall back to a custom element controller because the ref host is not a custom element.."
            }
          ],
          "message": "Aurelia runtime renderer AUR0763 rejects this instruction input: Ref target 'ghost' could not fall back to a custom element controller because the ref host is not a custom element..",
          "related": [],
          "severity": "error",
          "source": "semantic-runtime:template",
          "span": {
            "end": 129,
            "start": 124
          },
          "spanText": "ghost",
          "status": "primary",
          "uri": "fixtures://pressure/runtime-html-ref-renderer-errors/src/runtime-html-ref-renderer-errors-app.html"
        },
        {
          "actionability": "guided",
          "anomaly": null,
          "category": "template-syntax",
          "code": "AUR0751",
          "data": {
            "diagnosticAuthority": "framework-error-code",
            "diagnosticDomain": "template",
            "diagnosticKind": "runtime-renderer-framework-error",
            "frameworkErrorCode": "AUR0751",
            "frameworkRawErrorAuthority": null,
            "missingInput": "runtime-renderer:AUR0751",
            "missingInputs": [
              "runtime-renderer:AUR0751"
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
            "subject": {
              "source": {
                "end": 311,
                "kind": "source-span-address",
                "label": "src/runtime-html-ref-renderer-errors-app.html@306..311",
                "path": "src/runtime-html-ref-renderer-errors-app.html",
                "role": "name",
                "start": 306
              },
              "span": null,
              "subjectKind": "template-syntax",
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
          "file": "src/runtime-html-ref-renderer-errors-app.html",
          "impact": "blocking",
          "issues": [
            {
              "code": "AUR0751",
              "kind": "runtime-renderer-framework-error",
              "message": "Aurelia runtime renderer AUR0751 rejects this instruction input: Ref target 'ghost' was not found amongst the target API.."
            }
          ],
          "message": "Aurelia runtime renderer AUR0751 rejects this instruction input: Ref target 'ghost' was not found amongst the target API..",
          "related": [],
          "severity": "error",
          "source": "semantic-runtime:template",
          "span": {
            "end": 311,
            "start": 306
          },
          "spanText": "ghost",
          "status": "primary",
          "uri": "fixtures://pressure/runtime-html-ref-renderer-errors/src/runtime-html-ref-renderer-errors-app.html"
        }
      ]
    }
  },
  "uri": "fixtures://pressure/runtime-html-ref-renderer-errors/src/runtime-html-ref-renderer-errors-app.html"
}
```

### Alignment

```json
{
  "comparisonKey": "domain/kind/code/severity/text/message",
  "countsMatch": true,
  "customLspSurfaceCount": 4,
  "customOnly": [],
  "lspOnly": [],
  "lspPublishCount": 4,
  "suppressedCount": 0
}
```
