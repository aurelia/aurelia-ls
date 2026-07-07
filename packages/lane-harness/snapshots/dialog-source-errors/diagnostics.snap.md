# dialog-source-errors diagnostics lane snapshot

Fixture: `packages/semantic-runtime/fixtures/pressure/dialog-source-errors`
Probe file: `packages/lane-harness/probes/dialog-source-errors.probes.json`
Lane: `diagnostics`

This snapshot records observed language-server behavior. Operator verdicts live in the probe data.

## dialog-main-source

### Probe

```json
{
  "file": "src/main.ts"
}
```

### publishDiagnostics

```json
{
  "diagnosticCount": 7,
  "diagnostics": [
    {
      "anomaly": null,
      "code": "AUR0910",
      "data": {
        "diagnosticAuthority": "framework-runtime-behavior",
        "diagnosticDomain": "dialog",
        "diagnosticKind": "child-settings-not-found",
        "frameworkErrorCode": "AUR0910",
        "frameworkRawErrorAuthority": null,
        "missingInput": null,
        "missingInputs": [],
        "relatedQueryKind": "dialog-issues",
        "subject": null,
        "taxonomy": {
          "actionability": "manual",
          "category": "project",
          "confidence": null,
          "impact": "blocking",
          "schema": "diagnostics-taxonomy/1"
        }
      },
      "message": "Dialog child service resolver key has no matching DialogConfiguration.withChild(...) settings registration in the visible app source.",
      "range": {
        "end": {
          "character": 90,
          "line": 23
        },
        "start": {
          "character": 75,
          "line": 23
        }
      },
      "rangeText": "'missing-child'",
      "relatedInformation": [],
      "severity": "error",
      "source": "aurelia"
    },
    {
      "anomaly": null,
      "code": "AUR0903",
      "data": {
        "diagnosticAuthority": "framework-runtime-behavior",
        "diagnosticDomain": "dialog",
        "diagnosticKind": "settings-invalid",
        "frameworkErrorCode": "AUR0903",
        "frameworkRawErrorAuthority": null,
        "missingInput": null,
        "missingInputs": [],
        "relatedQueryKind": "dialog-issues",
        "subject": null,
        "taxonomy": {
          "actionability": "manual",
          "category": "project",
          "confidence": null,
          "impact": "blocking",
          "schema": "diagnostics-taxonomy/1"
        }
      },
      "message": "DialogService.open(...) settings statically provide neither component nor template.",
      "range": {
        "end": {
          "character": 35,
          "line": 38
        },
        "start": {
          "character": 33,
          "line": 38
        }
      },
      "rangeText": "{}",
      "relatedInformation": [],
      "severity": "error",
      "source": "aurelia"
    },
    {
      "anomaly": null,
      "code": "AUR0903",
      "data": {
        "diagnosticAuthority": "framework-runtime-behavior",
        "diagnosticDomain": "dialog",
        "diagnosticKind": "settings-invalid",
        "frameworkErrorCode": "AUR0903",
        "frameworkRawErrorAuthority": null,
        "missingInput": null,
        "missingInputs": [],
        "relatedQueryKind": "dialog-issues",
        "subject": null,
        "taxonomy": {
          "actionability": "manual",
          "category": "project",
          "confidence": null,
          "impact": "blocking",
          "schema": "diagnostics-taxonomy/1"
        }
      },
      "message": "DialogService.open(...) settings statically provide neither component nor template.",
      "range": {
        "end": {
          "character": 89,
          "line": 42
        },
        "start": {
          "character": 48,
          "line": 42
        }
      },
      "rangeText": "{ model: { source: 'configured-child' } }",
      "relatedInformation": [],
      "severity": "error",
      "source": "aurelia"
    },
    {
      "anomaly": null,
      "code": "AUR0903",
      "data": {
        "diagnosticAuthority": "framework-runtime-behavior",
        "diagnosticDomain": "dialog",
        "diagnosticKind": "settings-invalid",
        "frameworkErrorCode": "AUR0903",
        "frameworkRawErrorAuthority": null,
        "missingInput": null,
        "missingInputs": [],
        "relatedQueryKind": "dialog-issues",
        "subject": null,
        "taxonomy": {
          "actionability": "manual",
          "category": "project",
          "confidence": null,
          "impact": "blocking",
          "schema": "diagnostics-taxonomy/1"
        }
      },
      "message": "DialogService.open(...) settings statically provide neither component nor template.",
      "range": {
        "end": {
          "character": 57,
          "line": 46
        },
        "start": {
          "character": 55,
          "line": 46
        }
      },
      "rangeText": "{}",
      "relatedInformation": [],
      "severity": "error",
      "source": "aurelia"
    },
    {
      "anomaly": null,
      "code": "AUR0910",
      "data": {
        "diagnosticAuthority": "framework-runtime-behavior",
        "diagnosticDomain": "dialog",
        "diagnosticKind": "child-settings-not-found",
        "frameworkErrorCode": "AUR0910",
        "frameworkRawErrorAuthority": null,
        "missingInput": null,
        "missingInputs": [],
        "relatedQueryKind": "dialog-issues",
        "subject": null,
        "taxonomy": {
          "actionability": "manual",
          "category": "project",
          "confidence": null,
          "impact": "blocking",
          "schema": "diagnostics-taxonomy/1"
        }
      },
      "message": "Dialog child service resolver key has no matching DialogConfiguration.withChild(...) settings registration in the visible app source.",
      "range": {
        "end": {
          "character": 80,
          "line": 47
        },
        "start": {
          "character": 55,
          "line": 47
        }
      },
      "rangeText": "'missing-container-child'",
      "relatedInformation": [],
      "severity": "error",
      "source": "aurelia"
    },
    {
      "anomaly": null,
      "code": "AUR0903",
      "data": {
        "diagnosticAuthority": "framework-runtime-behavior",
        "diagnosticDomain": "dialog",
        "diagnosticKind": "settings-invalid",
        "frameworkErrorCode": "AUR0903",
        "frameworkRawErrorAuthority": null,
        "missingInput": null,
        "missingInputs": [],
        "relatedQueryKind": "dialog-issues",
        "subject": null,
        "taxonomy": {
          "actionability": "manual",
          "category": "project",
          "confidence": null,
          "impact": "blocking",
          "schema": "diagnostics-taxonomy/1"
        }
      },
      "message": "DialogService.open(...) settings statically provide neither component nor template.",
      "range": {
        "end": {
          "character": 62,
          "line": 51
        },
        "start": {
          "character": 60,
          "line": 51
        }
      },
      "rangeText": "{}",
      "relatedInformation": [],
      "severity": "error",
      "source": "aurelia"
    },
    {
      "anomaly": null,
      "code": "AUR0904",
      "data": {
        "diagnosticAuthority": "framework-runtime-behavior",
        "diagnosticDomain": "dialog",
        "diagnosticKind": "no-empty-default-configuration",
        "frameworkErrorCode": "AUR0904",
        "frameworkRawErrorAuthority": null,
        "missingInput": null,
        "missingInputs": [],
        "relatedQueryKind": "dialog-issues",
        "subject": null,
        "taxonomy": {
          "actionability": "manual",
          "category": "project",
          "confidence": null,
          "impact": "blocking",
          "schema": "diagnostics-taxonomy/1"
        }
      },
      "message": "Bare DialogConfiguration was registered without a renderer-providing customize(...) call; Aurelia throws when the settings-provider AppTask runs.",
      "range": {
        "end": {
          "character": 23,
          "line": 86
        },
        "start": {
          "character": 4,
          "line": 86
        }
      },
      "rangeText": "DialogConfiguration",
      "relatedInformation": [],
      "severity": "error",
      "source": "aurelia"
    }
  ],
  "outcome": "published",
  "uri": "fixtures://pressure/dialog-source-errors/src/main.ts"
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
        "groupKey": "row:diagnostic:0:dialog:child-settings-not-found:framework-runtime-behavior:AUR0910:src/main.ts:1096:1111:no-missing-input",
        "maxRawSeverity": "error",
        "primary": {
          "diagnostic": {
            "actionability": "manual",
            "anomaly": null,
            "category": "project",
            "code": "AUR0910",
            "data": {
              "diagnosticAuthority": "framework-runtime-behavior",
              "diagnosticDomain": "dialog",
              "diagnosticKind": "child-settings-not-found",
              "frameworkErrorCode": "AUR0910",
              "frameworkRawErrorAuthority": null,
              "missingInput": null,
              "missingInputs": [],
              "relatedQueryKind": "dialog-issues",
              "subject": null,
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
                "code": "AUR0910",
                "kind": "child-settings-not-found",
                "message": "Dialog child service resolver key has no matching DialogConfiguration.withChild(...) settings registration in the visible app source."
              }
            ],
            "message": "Dialog child service resolver key has no matching DialogConfiguration.withChild(...) settings registration in the visible app source.",
            "related": [],
            "severity": "error",
            "source": "semantic-runtime:dialog",
            "span": {
              "end": 1111,
              "start": 1096
            },
            "spanText": "'missing-child'",
            "status": "primary",
            "uri": "fixtures://pressure/dialog-source-errors/src/main.ts"
          },
          "relation": null,
          "role": "primary",
          "rowId": "diagnostic:0:dialog:child-settings-not-found:framework-runtime-behavior:AUR0910:src/main.ts:1096:1111:no-missing-input"
        },
        "primarySeverity": "error",
        "rawRowCount": 1,
        "related": [],
        "subject": null
      },
      {
        "groupKey": "row:diagnostic:1:dialog:settings-invalid:framework-runtime-behavior:AUR0903:src/main.ts:1582:1584:no-missing-input",
        "maxRawSeverity": "error",
        "primary": {
          "diagnostic": {
            "actionability": "manual",
            "anomaly": null,
            "category": "project",
            "code": "AUR0903",
            "data": {
              "diagnosticAuthority": "framework-runtime-behavior",
              "diagnosticDomain": "dialog",
              "diagnosticKind": "settings-invalid",
              "frameworkErrorCode": "AUR0903",
              "frameworkRawErrorAuthority": null,
              "missingInput": null,
              "missingInputs": [],
              "relatedQueryKind": "dialog-issues",
              "subject": null,
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
                "code": "AUR0903",
                "kind": "settings-invalid",
                "message": "DialogService.open(...) settings statically provide neither component nor template."
              }
            ],
            "message": "DialogService.open(...) settings statically provide neither component nor template.",
            "related": [],
            "severity": "error",
            "source": "semantic-runtime:dialog",
            "span": {
              "end": 1584,
              "start": 1582
            },
            "spanText": "{}",
            "status": "primary",
            "uri": "fixtures://pressure/dialog-source-errors/src/main.ts"
          },
          "relation": null,
          "role": "primary",
          "rowId": "diagnostic:1:dialog:settings-invalid:framework-runtime-behavior:AUR0903:src/main.ts:1582:1584:no-missing-input"
        },
        "primarySeverity": "error",
        "rawRowCount": 1,
        "related": [],
        "subject": null
      },
      {
        "groupKey": "row:diagnostic:2:dialog:settings-invalid:framework-runtime-behavior:AUR0903:src/main.ts:1698:1739:no-missing-input",
        "maxRawSeverity": "error",
        "primary": {
          "diagnostic": {
            "actionability": "manual",
            "anomaly": null,
            "category": "project",
            "code": "AUR0903",
            "data": {
              "diagnosticAuthority": "framework-runtime-behavior",
              "diagnosticDomain": "dialog",
              "diagnosticKind": "settings-invalid",
              "frameworkErrorCode": "AUR0903",
              "frameworkRawErrorAuthority": null,
              "missingInput": null,
              "missingInputs": [],
              "relatedQueryKind": "dialog-issues",
              "subject": null,
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
                "code": "AUR0903",
                "kind": "settings-invalid",
                "message": "DialogService.open(...) settings statically provide neither component nor template."
              }
            ],
            "message": "DialogService.open(...) settings statically provide neither component nor template.",
            "related": [],
            "severity": "error",
            "source": "semantic-runtime:dialog",
            "span": {
              "end": 1739,
              "start": 1698
            },
            "spanText": "{ model: { source: 'configured-child' } }",
            "status": "primary",
            "uri": "fixtures://pressure/dialog-source-errors/src/main.ts"
          },
          "relation": null,
          "role": "primary",
          "rowId": "diagnostic:2:dialog:settings-invalid:framework-runtime-behavior:AUR0903:src/main.ts:1698:1739:no-missing-input"
        },
        "primarySeverity": "error",
        "rawRowCount": 1,
        "related": [],
        "subject": null
      },
      {
        "groupKey": "row:diagnostic:3:dialog:settings-invalid:framework-runtime-behavior:AUR0903:src/main.ts:1841:1843:no-missing-input",
        "maxRawSeverity": "error",
        "primary": {
          "diagnostic": {
            "actionability": "manual",
            "anomaly": null,
            "category": "project",
            "code": "AUR0903",
            "data": {
              "diagnosticAuthority": "framework-runtime-behavior",
              "diagnosticDomain": "dialog",
              "diagnosticKind": "settings-invalid",
              "frameworkErrorCode": "AUR0903",
              "frameworkRawErrorAuthority": null,
              "missingInput": null,
              "missingInputs": [],
              "relatedQueryKind": "dialog-issues",
              "subject": null,
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
                "code": "AUR0903",
                "kind": "settings-invalid",
                "message": "DialogService.open(...) settings statically provide neither component nor template."
              }
            ],
            "message": "DialogService.open(...) settings statically provide neither component nor template.",
            "related": [],
            "severity": "error",
            "source": "semantic-runtime:dialog",
            "span": {
              "end": 1843,
              "start": 1841
            },
            "spanText": "{}",
            "status": "primary",
            "uri": "fixtures://pressure/dialog-source-errors/src/main.ts"
          },
          "relation": null,
          "role": "primary",
          "rowId": "diagnostic:3:dialog:settings-invalid:framework-runtime-behavior:AUR0903:src/main.ts:1841:1843:no-missing-input"
        },
        "primarySeverity": "error",
        "rawRowCount": 1,
        "related": [],
        "subject": null
      },
      {
        "groupKey": "row:diagnostic:4:dialog:child-settings-not-found:framework-runtime-behavior:AUR0910:src/main.ts:1901:1926:no-missing-input",
        "maxRawSeverity": "error",
        "primary": {
          "diagnostic": {
            "actionability": "manual",
            "anomaly": null,
            "category": "project",
            "code": "AUR0910",
            "data": {
              "diagnosticAuthority": "framework-runtime-behavior",
              "diagnosticDomain": "dialog",
              "diagnosticKind": "child-settings-not-found",
              "frameworkErrorCode": "AUR0910",
              "frameworkRawErrorAuthority": null,
              "missingInput": null,
              "missingInputs": [],
              "relatedQueryKind": "dialog-issues",
              "subject": null,
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
                "code": "AUR0910",
                "kind": "child-settings-not-found",
                "message": "Dialog child service resolver key has no matching DialogConfiguration.withChild(...) settings registration in the visible app source."
              }
            ],
            "message": "Dialog child service resolver key has no matching DialogConfiguration.withChild(...) settings registration in the visible app source.",
            "related": [],
            "severity": "error",
            "source": "semantic-runtime:dialog",
            "span": {
              "end": 1926,
              "start": 1901
            },
            "spanText": "'missing-container-child'",
            "status": "primary",
            "uri": "fixtures://pressure/dialog-source-errors/src/main.ts"
          },
          "relation": null,
          "role": "primary",
          "rowId": "diagnostic:4:dialog:child-settings-not-found:framework-runtime-behavior:AUR0910:src/main.ts:1901:1926:no-missing-input"
        },
        "primarySeverity": "error",
        "rawRowCount": 1,
        "related": [],
        "subject": null
      },
      {
        "groupKey": "row:diagnostic:5:dialog:settings-invalid:framework-runtime-behavior:AUR0903:src/main.ts:2045:2047:no-missing-input",
        "maxRawSeverity": "error",
        "primary": {
          "diagnostic": {
            "actionability": "manual",
            "anomaly": null,
            "category": "project",
            "code": "AUR0903",
            "data": {
              "diagnosticAuthority": "framework-runtime-behavior",
              "diagnosticDomain": "dialog",
              "diagnosticKind": "settings-invalid",
              "frameworkErrorCode": "AUR0903",
              "frameworkRawErrorAuthority": null,
              "missingInput": null,
              "missingInputs": [],
              "relatedQueryKind": "dialog-issues",
              "subject": null,
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
                "code": "AUR0903",
                "kind": "settings-invalid",
                "message": "DialogService.open(...) settings statically provide neither component nor template."
              }
            ],
            "message": "DialogService.open(...) settings statically provide neither component nor template.",
            "related": [],
            "severity": "error",
            "source": "semantic-runtime:dialog",
            "span": {
              "end": 2047,
              "start": 2045
            },
            "spanText": "{}",
            "status": "primary",
            "uri": "fixtures://pressure/dialog-source-errors/src/main.ts"
          },
          "relation": null,
          "role": "primary",
          "rowId": "diagnostic:5:dialog:settings-invalid:framework-runtime-behavior:AUR0903:src/main.ts:2045:2047:no-missing-input"
        },
        "primarySeverity": "error",
        "rawRowCount": 1,
        "related": [],
        "subject": null
      },
      {
        "groupKey": "row:diagnostic:6:dialog:no-empty-default-configuration:framework-runtime-behavior:AUR0904:src/main.ts:2942:2961:no-missing-input",
        "maxRawSeverity": "error",
        "primary": {
          "diagnostic": {
            "actionability": "manual",
            "anomaly": null,
            "category": "project",
            "code": "AUR0904",
            "data": {
              "diagnosticAuthority": "framework-runtime-behavior",
              "diagnosticDomain": "dialog",
              "diagnosticKind": "no-empty-default-configuration",
              "frameworkErrorCode": "AUR0904",
              "frameworkRawErrorAuthority": null,
              "missingInput": null,
              "missingInputs": [],
              "relatedQueryKind": "dialog-issues",
              "subject": null,
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
                "code": "AUR0904",
                "kind": "no-empty-default-configuration",
                "message": "Bare DialogConfiguration was registered without a renderer-providing customize(...) call; Aurelia throws when the settings-provider AppTask runs."
              }
            ],
            "message": "Bare DialogConfiguration was registered without a renderer-providing customize(...) call; Aurelia throws when the settings-provider AppTask runs.",
            "related": [],
            "severity": "error",
            "source": "semantic-runtime:dialog",
            "span": {
              "end": 2961,
              "start": 2942
            },
            "spanText": "DialogConfiguration",
            "status": "primary",
            "uri": "fixtures://pressure/dialog-source-errors/src/main.ts"
          },
          "relation": null,
          "role": "primary",
          "rowId": "diagnostic:6:dialog:no-empty-default-configuration:framework-runtime-behavior:AUR0904:src/main.ts:2942:2961:no-missing-input"
        },
        "primarySeverity": "error",
        "rawRowCount": 1,
        "related": [],
        "subject": null
      }
    ],
    "primaryCount": 7,
    "rawRowCount": 7
  },
  "raw": {
    "diagnosticCount": 7,
    "diagnostics": [
      {
        "actionability": "manual",
        "anomaly": null,
        "category": "project",
        "code": "AUR0910",
        "data": {
          "diagnosticAuthority": "framework-runtime-behavior",
          "diagnosticDomain": "dialog",
          "diagnosticKind": "child-settings-not-found",
          "frameworkErrorCode": "AUR0910",
          "frameworkRawErrorAuthority": null,
          "missingInput": null,
          "missingInputs": [],
          "relatedQueryKind": "dialog-issues",
          "subject": null,
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
            "code": "AUR0910",
            "kind": "child-settings-not-found",
            "message": "Dialog child service resolver key has no matching DialogConfiguration.withChild(...) settings registration in the visible app source."
          }
        ],
        "message": "Dialog child service resolver key has no matching DialogConfiguration.withChild(...) settings registration in the visible app source.",
        "related": [],
        "severity": "error",
        "source": "semantic-runtime:dialog",
        "span": {
          "end": 1111,
          "start": 1096
        },
        "spanText": "'missing-child'",
        "status": "canonical",
        "uri": "fixtures://pressure/dialog-source-errors/src/main.ts"
      },
      {
        "actionability": "manual",
        "anomaly": null,
        "category": "project",
        "code": "AUR0903",
        "data": {
          "diagnosticAuthority": "framework-runtime-behavior",
          "diagnosticDomain": "dialog",
          "diagnosticKind": "settings-invalid",
          "frameworkErrorCode": "AUR0903",
          "frameworkRawErrorAuthority": null,
          "missingInput": null,
          "missingInputs": [],
          "relatedQueryKind": "dialog-issues",
          "subject": null,
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
            "code": "AUR0903",
            "kind": "settings-invalid",
            "message": "DialogService.open(...) settings statically provide neither component nor template."
          }
        ],
        "message": "DialogService.open(...) settings statically provide neither component nor template.",
        "related": [],
        "severity": "error",
        "source": "semantic-runtime:dialog",
        "span": {
          "end": 1584,
          "start": 1582
        },
        "spanText": "{}",
        "status": "canonical",
        "uri": "fixtures://pressure/dialog-source-errors/src/main.ts"
      },
      {
        "actionability": "manual",
        "anomaly": null,
        "category": "project",
        "code": "AUR0903",
        "data": {
          "diagnosticAuthority": "framework-runtime-behavior",
          "diagnosticDomain": "dialog",
          "diagnosticKind": "settings-invalid",
          "frameworkErrorCode": "AUR0903",
          "frameworkRawErrorAuthority": null,
          "missingInput": null,
          "missingInputs": [],
          "relatedQueryKind": "dialog-issues",
          "subject": null,
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
            "code": "AUR0903",
            "kind": "settings-invalid",
            "message": "DialogService.open(...) settings statically provide neither component nor template."
          }
        ],
        "message": "DialogService.open(...) settings statically provide neither component nor template.",
        "related": [],
        "severity": "error",
        "source": "semantic-runtime:dialog",
        "span": {
          "end": 1739,
          "start": 1698
        },
        "spanText": "{ model: { source: 'configured-child' } }",
        "status": "canonical",
        "uri": "fixtures://pressure/dialog-source-errors/src/main.ts"
      },
      {
        "actionability": "manual",
        "anomaly": null,
        "category": "project",
        "code": "AUR0903",
        "data": {
          "diagnosticAuthority": "framework-runtime-behavior",
          "diagnosticDomain": "dialog",
          "diagnosticKind": "settings-invalid",
          "frameworkErrorCode": "AUR0903",
          "frameworkRawErrorAuthority": null,
          "missingInput": null,
          "missingInputs": [],
          "relatedQueryKind": "dialog-issues",
          "subject": null,
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
            "code": "AUR0903",
            "kind": "settings-invalid",
            "message": "DialogService.open(...) settings statically provide neither component nor template."
          }
        ],
        "message": "DialogService.open(...) settings statically provide neither component nor template.",
        "related": [],
        "severity": "error",
        "source": "semantic-runtime:dialog",
        "span": {
          "end": 1843,
          "start": 1841
        },
        "spanText": "{}",
        "status": "canonical",
        "uri": "fixtures://pressure/dialog-source-errors/src/main.ts"
      },
      {
        "actionability": "manual",
        "anomaly": null,
        "category": "project",
        "code": "AUR0910",
        "data": {
          "diagnosticAuthority": "framework-runtime-behavior",
          "diagnosticDomain": "dialog",
          "diagnosticKind": "child-settings-not-found",
          "frameworkErrorCode": "AUR0910",
          "frameworkRawErrorAuthority": null,
          "missingInput": null,
          "missingInputs": [],
          "relatedQueryKind": "dialog-issues",
          "subject": null,
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
            "code": "AUR0910",
            "kind": "child-settings-not-found",
            "message": "Dialog child service resolver key has no matching DialogConfiguration.withChild(...) settings registration in the visible app source."
          }
        ],
        "message": "Dialog child service resolver key has no matching DialogConfiguration.withChild(...) settings registration in the visible app source.",
        "related": [],
        "severity": "error",
        "source": "semantic-runtime:dialog",
        "span": {
          "end": 1926,
          "start": 1901
        },
        "spanText": "'missing-container-child'",
        "status": "canonical",
        "uri": "fixtures://pressure/dialog-source-errors/src/main.ts"
      },
      {
        "actionability": "manual",
        "anomaly": null,
        "category": "project",
        "code": "AUR0903",
        "data": {
          "diagnosticAuthority": "framework-runtime-behavior",
          "diagnosticDomain": "dialog",
          "diagnosticKind": "settings-invalid",
          "frameworkErrorCode": "AUR0903",
          "frameworkRawErrorAuthority": null,
          "missingInput": null,
          "missingInputs": [],
          "relatedQueryKind": "dialog-issues",
          "subject": null,
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
            "code": "AUR0903",
            "kind": "settings-invalid",
            "message": "DialogService.open(...) settings statically provide neither component nor template."
          }
        ],
        "message": "DialogService.open(...) settings statically provide neither component nor template.",
        "related": [],
        "severity": "error",
        "source": "semantic-runtime:dialog",
        "span": {
          "end": 2047,
          "start": 2045
        },
        "spanText": "{}",
        "status": "canonical",
        "uri": "fixtures://pressure/dialog-source-errors/src/main.ts"
      },
      {
        "actionability": "manual",
        "anomaly": null,
        "category": "project",
        "code": "AUR0904",
        "data": {
          "diagnosticAuthority": "framework-runtime-behavior",
          "diagnosticDomain": "dialog",
          "diagnosticKind": "no-empty-default-configuration",
          "frameworkErrorCode": "AUR0904",
          "frameworkRawErrorAuthority": null,
          "missingInput": null,
          "missingInputs": [],
          "relatedQueryKind": "dialog-issues",
          "subject": null,
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
            "code": "AUR0904",
            "kind": "no-empty-default-configuration",
            "message": "Bare DialogConfiguration was registered without a renderer-providing customize(...) call; Aurelia throws when the settings-provider AppTask runs."
          }
        ],
        "message": "Bare DialogConfiguration was registered without a renderer-providing customize(...) call; Aurelia throws when the settings-provider AppTask runs.",
        "related": [],
        "severity": "error",
        "source": "semantic-runtime:dialog",
        "span": {
          "end": 2961,
          "start": 2942
        },
        "spanText": "DialogConfiguration",
        "status": "canonical",
        "uri": "fixtures://pressure/dialog-source-errors/src/main.ts"
      }
    ]
  },
  "suppressed": {
    "diagnosticCount": 0,
    "diagnostics": []
  },
  "surfaces": {
    "lsp": {
      "diagnosticCount": 7,
      "diagnostics": [
        {
          "actionability": "manual",
          "anomaly": null,
          "category": "project",
          "code": "AUR0910",
          "data": {
            "diagnosticAuthority": "framework-runtime-behavior",
            "diagnosticDomain": "dialog",
            "diagnosticKind": "child-settings-not-found",
            "frameworkErrorCode": "AUR0910",
            "frameworkRawErrorAuthority": null,
            "missingInput": null,
            "missingInputs": [],
            "relatedQueryKind": "dialog-issues",
            "subject": null,
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
              "code": "AUR0910",
              "kind": "child-settings-not-found",
              "message": "Dialog child service resolver key has no matching DialogConfiguration.withChild(...) settings registration in the visible app source."
            }
          ],
          "message": "Dialog child service resolver key has no matching DialogConfiguration.withChild(...) settings registration in the visible app source.",
          "related": [],
          "severity": "error",
          "source": "semantic-runtime:dialog",
          "span": {
            "end": 1111,
            "start": 1096
          },
          "spanText": "'missing-child'",
          "status": "primary",
          "uri": "fixtures://pressure/dialog-source-errors/src/main.ts"
        },
        {
          "actionability": "manual",
          "anomaly": null,
          "category": "project",
          "code": "AUR0903",
          "data": {
            "diagnosticAuthority": "framework-runtime-behavior",
            "diagnosticDomain": "dialog",
            "diagnosticKind": "settings-invalid",
            "frameworkErrorCode": "AUR0903",
            "frameworkRawErrorAuthority": null,
            "missingInput": null,
            "missingInputs": [],
            "relatedQueryKind": "dialog-issues",
            "subject": null,
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
              "code": "AUR0903",
              "kind": "settings-invalid",
              "message": "DialogService.open(...) settings statically provide neither component nor template."
            }
          ],
          "message": "DialogService.open(...) settings statically provide neither component nor template.",
          "related": [],
          "severity": "error",
          "source": "semantic-runtime:dialog",
          "span": {
            "end": 1584,
            "start": 1582
          },
          "spanText": "{}",
          "status": "primary",
          "uri": "fixtures://pressure/dialog-source-errors/src/main.ts"
        },
        {
          "actionability": "manual",
          "anomaly": null,
          "category": "project",
          "code": "AUR0903",
          "data": {
            "diagnosticAuthority": "framework-runtime-behavior",
            "diagnosticDomain": "dialog",
            "diagnosticKind": "settings-invalid",
            "frameworkErrorCode": "AUR0903",
            "frameworkRawErrorAuthority": null,
            "missingInput": null,
            "missingInputs": [],
            "relatedQueryKind": "dialog-issues",
            "subject": null,
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
              "code": "AUR0903",
              "kind": "settings-invalid",
              "message": "DialogService.open(...) settings statically provide neither component nor template."
            }
          ],
          "message": "DialogService.open(...) settings statically provide neither component nor template.",
          "related": [],
          "severity": "error",
          "source": "semantic-runtime:dialog",
          "span": {
            "end": 1739,
            "start": 1698
          },
          "spanText": "{ model: { source: 'configured-child' } }",
          "status": "primary",
          "uri": "fixtures://pressure/dialog-source-errors/src/main.ts"
        },
        {
          "actionability": "manual",
          "anomaly": null,
          "category": "project",
          "code": "AUR0903",
          "data": {
            "diagnosticAuthority": "framework-runtime-behavior",
            "diagnosticDomain": "dialog",
            "diagnosticKind": "settings-invalid",
            "frameworkErrorCode": "AUR0903",
            "frameworkRawErrorAuthority": null,
            "missingInput": null,
            "missingInputs": [],
            "relatedQueryKind": "dialog-issues",
            "subject": null,
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
              "code": "AUR0903",
              "kind": "settings-invalid",
              "message": "DialogService.open(...) settings statically provide neither component nor template."
            }
          ],
          "message": "DialogService.open(...) settings statically provide neither component nor template.",
          "related": [],
          "severity": "error",
          "source": "semantic-runtime:dialog",
          "span": {
            "end": 1843,
            "start": 1841
          },
          "spanText": "{}",
          "status": "primary",
          "uri": "fixtures://pressure/dialog-source-errors/src/main.ts"
        },
        {
          "actionability": "manual",
          "anomaly": null,
          "category": "project",
          "code": "AUR0910",
          "data": {
            "diagnosticAuthority": "framework-runtime-behavior",
            "diagnosticDomain": "dialog",
            "diagnosticKind": "child-settings-not-found",
            "frameworkErrorCode": "AUR0910",
            "frameworkRawErrorAuthority": null,
            "missingInput": null,
            "missingInputs": [],
            "relatedQueryKind": "dialog-issues",
            "subject": null,
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
              "code": "AUR0910",
              "kind": "child-settings-not-found",
              "message": "Dialog child service resolver key has no matching DialogConfiguration.withChild(...) settings registration in the visible app source."
            }
          ],
          "message": "Dialog child service resolver key has no matching DialogConfiguration.withChild(...) settings registration in the visible app source.",
          "related": [],
          "severity": "error",
          "source": "semantic-runtime:dialog",
          "span": {
            "end": 1926,
            "start": 1901
          },
          "spanText": "'missing-container-child'",
          "status": "primary",
          "uri": "fixtures://pressure/dialog-source-errors/src/main.ts"
        },
        {
          "actionability": "manual",
          "anomaly": null,
          "category": "project",
          "code": "AUR0903",
          "data": {
            "diagnosticAuthority": "framework-runtime-behavior",
            "diagnosticDomain": "dialog",
            "diagnosticKind": "settings-invalid",
            "frameworkErrorCode": "AUR0903",
            "frameworkRawErrorAuthority": null,
            "missingInput": null,
            "missingInputs": [],
            "relatedQueryKind": "dialog-issues",
            "subject": null,
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
              "code": "AUR0903",
              "kind": "settings-invalid",
              "message": "DialogService.open(...) settings statically provide neither component nor template."
            }
          ],
          "message": "DialogService.open(...) settings statically provide neither component nor template.",
          "related": [],
          "severity": "error",
          "source": "semantic-runtime:dialog",
          "span": {
            "end": 2047,
            "start": 2045
          },
          "spanText": "{}",
          "status": "primary",
          "uri": "fixtures://pressure/dialog-source-errors/src/main.ts"
        },
        {
          "actionability": "manual",
          "anomaly": null,
          "category": "project",
          "code": "AUR0904",
          "data": {
            "diagnosticAuthority": "framework-runtime-behavior",
            "diagnosticDomain": "dialog",
            "diagnosticKind": "no-empty-default-configuration",
            "frameworkErrorCode": "AUR0904",
            "frameworkRawErrorAuthority": null,
            "missingInput": null,
            "missingInputs": [],
            "relatedQueryKind": "dialog-issues",
            "subject": null,
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
              "code": "AUR0904",
              "kind": "no-empty-default-configuration",
              "message": "Bare DialogConfiguration was registered without a renderer-providing customize(...) call; Aurelia throws when the settings-provider AppTask runs."
            }
          ],
          "message": "Bare DialogConfiguration was registered without a renderer-providing customize(...) call; Aurelia throws when the settings-provider AppTask runs.",
          "related": [],
          "severity": "error",
          "source": "semantic-runtime:dialog",
          "span": {
            "end": 2961,
            "start": 2942
          },
          "spanText": "DialogConfiguration",
          "status": "primary",
          "uri": "fixtures://pressure/dialog-source-errors/src/main.ts"
        }
      ]
    }
  },
  "uri": "fixtures://pressure/dialog-source-errors/src/main.ts"
}
```

### Alignment

```json
{
  "comparisonKey": "domain/kind/code/severity/text/message",
  "countsMatch": true,
  "customLspSurfaceCount": 7,
  "customOnly": [],
  "lspOnly": [],
  "lspPublishCount": 7,
  "suppressedCount": 0
}
```
