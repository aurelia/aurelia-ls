# router-configuration-root-ownership diagnostics lane snapshot

Fixture: `packages/semantic-runtime/fixtures/pressure/router-configuration-root-ownership`
Probe file: `packages/lane-harness/probes/router-configuration-root-ownership.probes.json`
Lane: `diagnostics`

This snapshot records observed language-server behavior. Operator verdicts live in the probe data.

## duplicate-router-configuration-one-causal-error

### Probe

```json
{
  "file": "src/main.ts"
}
```

### textDocument/diagnostic — full pull

```json
{
  "diagnosticCount": 1,
  "diagnostics": [
    {
      "anomaly": null,
      "code": "AUR3168",
      "data": {
        "diagnosticAuthority": "framework-error-code",
        "diagnosticDomain": "router",
        "diagnosticKind": "duplicate-router-configuration",
        "frameworkErrorCode": "AUR3168",
        "frameworkRawErrorAuthority": null,
        "missingInput": null,
        "missingInputs": [],
        "phase": "router-configuration-registration",
        "presentation": {
          "contextual": [
            {
              "diagnostic": {
                "diagnosticAuthority": "framework-error-code",
                "diagnosticDomain": "resource",
                "diagnosticKind": "custom-attribute-already-registered",
                "frameworkErrorCode": "AUR0154",
                "frameworkRawErrorAuthority": null,
                "missingInput": null,
                "missingInputs": [],
                "phase": "resource-registration",
                "relatedInformation": [
                  {
                    "message": "Resource was first registered here.",
                    "source": {
                      "anchor": {
                        "kind": "source-file-address",
                        "label": "src/main.ts",
                        "path": "src/main.ts",
                        "sourceFileRole": "app-source",
                        "sourceWorkspaceKey": "router-configuration-root-ownership"
                      },
                      "end": 2852,
                      "kind": "source-span-address",
                      "label": "src/main.ts@2787..2852",
                      "path": "src/main.ts",
                      "role": "range",
                      "sourceFileRole": "app-source",
                      "sourceWorkspaceKey": "router-configuration-root-ownership",
                      "start": 2787
                    }
                  }
                ],
                "relatedQueryKind": "resource-issues",
                "repairAffordance": null,
                "severity": "warning",
                "sourceRole": "app-source",
                "subject": null,
                "typeScriptDiagnosticCode": null
              },
              "relation": "runtime-consequence"
            },
            {
              "diagnostic": {
                "diagnosticAuthority": "framework-error-code",
                "diagnosticDomain": "resource",
                "diagnosticKind": "custom-attribute-already-registered",
                "frameworkErrorCode": "AUR0154",
                "frameworkRawErrorAuthority": null,
                "missingInput": null,
                "missingInputs": [],
                "phase": "resource-registration",
                "relatedInformation": [
                  {
                    "message": "Resource was first registered here.",
                    "source": {
                      "anchor": {
                        "kind": "source-file-address",
                        "label": "src/main.ts",
                        "path": "src/main.ts",
                        "sourceFileRole": "app-source",
                        "sourceWorkspaceKey": "router-configuration-root-ownership"
                      },
                      "end": 2852,
                      "kind": "source-span-address",
                      "label": "src/main.ts@2787..2852",
                      "path": "src/main.ts",
                      "role": "range",
                      "sourceFileRole": "app-source",
                      "sourceWorkspaceKey": "router-configuration-root-ownership",
                      "start": 2787
                    }
                  }
                ],
                "relatedQueryKind": "resource-issues",
                "repairAffordance": null,
                "severity": "warning",
                "sourceRole": "app-source",
                "subject": null,
                "typeScriptDiagnosticCode": null
              },
              "relation": "runtime-consequence"
            },
            {
              "diagnostic": {
                "diagnosticAuthority": "framework-error-code",
                "diagnosticDomain": "resource",
                "diagnosticKind": "custom-element-already-registered",
                "frameworkErrorCode": "AUR0153",
                "frameworkRawErrorAuthority": null,
                "missingInput": null,
                "missingInputs": [],
                "phase": "resource-registration",
                "relatedInformation": [
                  {
                    "message": "Resource was first registered here.",
                    "source": {
                      "anchor": {
                        "kind": "source-file-address",
                        "label": "src/main.ts",
                        "path": "src/main.ts",
                        "sourceFileRole": "app-source",
                        "sourceWorkspaceKey": "router-configuration-root-ownership"
                      },
                      "end": 2852,
                      "kind": "source-span-address",
                      "label": "src/main.ts@2787..2852",
                      "path": "src/main.ts",
                      "role": "range",
                      "sourceFileRole": "app-source",
                      "sourceWorkspaceKey": "router-configuration-root-ownership",
                      "start": 2787
                    }
                  }
                ],
                "relatedQueryKind": "resource-issues",
                "repairAffordance": null,
                "severity": "warning",
                "sourceRole": "app-source",
                "subject": null,
                "typeScriptDiagnosticCode": null
              },
              "relation": "runtime-consequence"
            }
          ],
          "maxRawSeverity": "error",
          "primarySeverity": "error",
          "rawRowCount": 4
        },
        "relatedInformation": [
          {
            "message": "The first RouterConfiguration registration in this application container tree is here.",
            "source": {
              "anchor": {
                "kind": "source-file-address",
                "label": "src/main.ts",
                "path": "src/main.ts",
                "sourceFileRole": "app-source",
                "sourceWorkspaceKey": "router-configuration-root-ownership"
              },
              "end": 2852,
              "kind": "source-span-address",
              "label": "src/main.ts@2787..2852",
              "path": "src/main.ts",
              "role": "range",
              "sourceFileRole": "app-source",
              "sourceWorkspaceKey": "router-configuration-root-ownership",
              "start": 2787
            }
          }
        ],
        "relatedQueryKind": "router-issues",
        "repairAffordance": null,
        "sourceRole": "app-source",
        "subject": null,
        "typeScriptDiagnosticCode": null
      },
      "message": "RouterConfiguration is registered more than once in the same application container tree; the root RouteContext cannot be installed unambiguously.",
      "range": {
        "end": {
          "character": 70,
          "line": 125
        },
        "start": {
          "character": 4,
          "line": 125
        }
      },
      "rangeText": "RouterConfiguration.customize({ activeClass: 'duplicate-second' })",
      "relatedInformation": [
        {
          "anomaly": null,
          "file": "src/main.ts",
          "message": "The first RouterConfiguration registration in this application container tree is here.",
          "range": {
            "end": {
              "character": 69,
              "line": 124
            },
            "start": {
              "character": 4,
              "line": 124
            }
          },
          "rangeText": "RouterConfiguration.customize({ activeClass: 'duplicate-first' })",
          "uri": "fixtures://pressure/router-configuration-root-ownership/src/main.ts"
        },
        {
          "anomaly": null,
          "file": "src/main.ts",
          "message": "Attribute \"load\" has already been registered.",
          "range": {
            "end": {
              "character": 70,
              "line": 125
            },
            "start": {
              "character": 4,
              "line": 125
            }
          },
          "rangeText": "RouterConfiguration.customize({ activeClass: 'duplicate-second' })",
          "uri": "fixtures://pressure/router-configuration-root-ownership/src/main.ts"
        },
        {
          "anomaly": null,
          "file": "src/main.ts",
          "message": "Resource was first registered here.",
          "range": {
            "end": {
              "character": 69,
              "line": 124
            },
            "start": {
              "character": 4,
              "line": 124
            }
          },
          "rangeText": "RouterConfiguration.customize({ activeClass: 'duplicate-first' })",
          "uri": "fixtures://pressure/router-configuration-root-ownership/src/main.ts"
        },
        {
          "anomaly": null,
          "file": "src/main.ts",
          "message": "Attribute \"href\" has already been registered.",
          "range": {
            "end": {
              "character": 70,
              "line": 125
            },
            "start": {
              "character": 4,
              "line": 125
            }
          },
          "rangeText": "RouterConfiguration.customize({ activeClass: 'duplicate-second' })",
          "uri": "fixtures://pressure/router-configuration-root-ownership/src/main.ts"
        },
        {
          "anomaly": null,
          "file": "src/main.ts",
          "message": "Element \"au-viewport\" has already been registered.",
          "range": {
            "end": {
              "character": 70,
              "line": 125
            },
            "start": {
              "character": 4,
              "line": 125
            }
          },
          "rangeText": "RouterConfiguration.customize({ activeClass: 'duplicate-second' })",
          "uri": "fixtures://pressure/router-configuration-root-ownership/src/main.ts"
        }
      ],
      "severity": "error",
      "source": "aurelia"
    }
  ],
  "outcome": "full",
  "previousResultIdPresent": false,
  "resultIdPresent": true,
  "uri": "fixtures://pressure/router-configuration-root-ownership/src/main.ts"
}
```

### textDocument/diagnostic — previousResultId reuse

```json
{
  "diagnosticCount": null,
  "diagnostics": [],
  "matchesPreviousResultId": true,
  "outcome": "unchanged",
  "previousResultIdPresent": true,
  "resultIdPresent": true,
  "uri": "fixtures://pressure/router-configuration-root-ownership/src/main.ts"
}
```
