# router-viewport-resolution-errors diagnostics lane snapshot

Fixture: `packages/semantic-runtime/fixtures/pressure/router-viewport-resolution-errors`
Probe file: `packages/lane-harness/probes/router-viewport-resolution-errors.probes.json`
Lane: `diagnostics`

This snapshot records observed language-server behavior. Operator verdicts live in the probe data.

## router-load-side-only

### Probe

```json
{
  "file": "src/router-viewport-resolution-errors-app.html"
}
```

### publishDiagnostics

```json
{
  "diagnosticCount": 1,
  "diagnostics": [
    {
      "anomaly": null,
      "code": "AUR3174",
      "data": {
        "diagnosticAuthority": "framework-error-code",
        "diagnosticDomain": "router",
        "diagnosticKind": "no-available-viewport-agent",
        "frameworkErrorCode": "AUR3174",
        "frameworkRawErrorAuthority": null,
        "missingInput": null,
        "missingInputs": [],
        "relatedQueryKind": "router-issues",
        "repairAffordance": {
          "actionKind": "inspect-type-surface",
          "actionability": "manual",
          "applicationKind": "none",
          "changeDomain": "inspection",
          "editPlanState": "not-available",
          "planKind": "manual-inspection",
          "readiness": "inspection-required",
          "targetSourceCoverage": "not-applicable"
        },
        "subject": null,
        "taxonomy": {
          "actionability": "manual",
          "category": "project",
          "confidence": null,
          "impact": "blocking",
          "schema": "diagnostics-taxonomy/1"
        }
      },
      "message": "Failed to resolve ViewportRequest(viewport:'side',component:'SideOnlyRoute') from RouteContext 'RouterViewportResolutionErrorsApp'.",
      "range": {
        "end": {
          "character": 23,
          "line": 0
        },
        "start": {
          "character": 14,
          "line": 0
        }
      },
      "rangeText": "side-only",
      "relatedInformation": [],
      "severity": "error",
      "source": "aurelia"
    }
  ],
  "outcome": "published",
  "uri": "fixtures://pressure/router-viewport-resolution-errors/src/router-viewport-resolution-errors-app.html"
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
        "groupKey": "row:diagnostic:0:router:no-available-viewport-agent:framework-error-code:AUR3174:src/router-viewport-resolution-errors-app.html:14:23:no-missing-input",
        "maxRawSeverity": "error",
        "primary": {
          "diagnostic": {
            "actionability": "manual",
            "anomaly": null,
            "category": "project",
            "code": "AUR3174",
            "data": {
              "diagnosticAuthority": "framework-error-code",
              "diagnosticDomain": "router",
              "diagnosticKind": "no-available-viewport-agent",
              "frameworkErrorCode": "AUR3174",
              "frameworkRawErrorAuthority": null,
              "missingInput": null,
              "missingInputs": [],
              "relatedQueryKind": "router-issues",
              "repairAffordance": {
                "actionKind": "inspect-type-surface",
                "actionability": "manual",
                "applicationKind": "none",
                "changeDomain": "inspection",
                "editPlanState": "not-available",
                "planKind": "manual-inspection",
                "readiness": "inspection-required",
                "targetSourceCoverage": "not-applicable"
              },
              "subject": null,
              "taxonomy": {
                "actionability": null,
                "category": null,
                "confidence": null,
                "impact": null,
                "schema": null
              }
            },
            "file": "src/router-viewport-resolution-errors-app.html",
            "impact": "blocking",
            "issues": [
              {
                "code": "AUR3174",
                "kind": "no-available-viewport-agent",
                "message": "Failed to resolve ViewportRequest(viewport:'side',component:'SideOnlyRoute') from RouteContext 'RouterViewportResolutionErrorsApp'."
              }
            ],
            "message": "Failed to resolve ViewportRequest(viewport:'side',component:'SideOnlyRoute') from RouteContext 'RouterViewportResolutionErrorsApp'.",
            "related": [],
            "severity": "error",
            "source": "semantic-runtime:router",
            "span": {
              "end": 23,
              "start": 14
            },
            "spanText": "side-only",
            "status": "primary",
            "uri": "fixtures://pressure/router-viewport-resolution-errors/src/router-viewport-resolution-errors-app.html"
          },
          "relation": null,
          "role": "primary",
          "rowId": "diagnostic:0:router:no-available-viewport-agent:framework-error-code:AUR3174:src/router-viewport-resolution-errors-app.html:14:23:no-missing-input"
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
        "actionability": "manual",
        "anomaly": null,
        "category": "project",
        "code": "AUR3174",
        "data": {
          "diagnosticAuthority": "framework-error-code",
          "diagnosticDomain": "router",
          "diagnosticKind": "no-available-viewport-agent",
          "frameworkErrorCode": "AUR3174",
          "frameworkRawErrorAuthority": null,
          "missingInput": null,
          "missingInputs": [],
          "relatedQueryKind": "router-issues",
          "repairAffordance": {
            "actionKind": "inspect-type-surface",
            "actionability": "manual",
            "applicationKind": "none",
            "changeDomain": "inspection",
            "editPlanState": "not-available",
            "planKind": "manual-inspection",
            "readiness": "inspection-required",
            "targetSourceCoverage": "not-applicable"
          },
          "subject": null,
          "taxonomy": {
            "actionability": null,
            "category": null,
            "confidence": null,
            "impact": null,
            "schema": null
          }
        },
        "file": "src/router-viewport-resolution-errors-app.html",
        "impact": "blocking",
        "issues": [
          {
            "code": "AUR3174",
            "kind": "no-available-viewport-agent",
            "message": "Failed to resolve ViewportRequest(viewport:'side',component:'SideOnlyRoute') from RouteContext 'RouterViewportResolutionErrorsApp'."
          }
        ],
        "message": "Failed to resolve ViewportRequest(viewport:'side',component:'SideOnlyRoute') from RouteContext 'RouterViewportResolutionErrorsApp'.",
        "related": [],
        "severity": "error",
        "source": "semantic-runtime:router",
        "span": {
          "end": 23,
          "start": 14
        },
        "spanText": "side-only",
        "status": "canonical",
        "uri": "fixtures://pressure/router-viewport-resolution-errors/src/router-viewport-resolution-errors-app.html"
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
          "code": "AUR3174",
          "data": {
            "diagnosticAuthority": "framework-error-code",
            "diagnosticDomain": "router",
            "diagnosticKind": "no-available-viewport-agent",
            "frameworkErrorCode": "AUR3174",
            "frameworkRawErrorAuthority": null,
            "missingInput": null,
            "missingInputs": [],
            "relatedQueryKind": "router-issues",
            "repairAffordance": {
              "actionKind": "inspect-type-surface",
              "actionability": "manual",
              "applicationKind": "none",
              "changeDomain": "inspection",
              "editPlanState": "not-available",
              "planKind": "manual-inspection",
              "readiness": "inspection-required",
              "targetSourceCoverage": "not-applicable"
            },
            "subject": null,
            "taxonomy": {
              "actionability": null,
              "category": null,
              "confidence": null,
              "impact": null,
              "schema": null
            }
          },
          "file": "src/router-viewport-resolution-errors-app.html",
          "impact": "blocking",
          "issues": [
            {
              "code": "AUR3174",
              "kind": "no-available-viewport-agent",
              "message": "Failed to resolve ViewportRequest(viewport:'side',component:'SideOnlyRoute') from RouteContext 'RouterViewportResolutionErrorsApp'."
            }
          ],
          "message": "Failed to resolve ViewportRequest(viewport:'side',component:'SideOnlyRoute') from RouteContext 'RouterViewportResolutionErrorsApp'.",
          "related": [],
          "severity": "error",
          "source": "semantic-runtime:router",
          "span": {
            "end": 23,
            "start": 14
          },
          "spanText": "side-only",
          "status": "primary",
          "uri": "fixtures://pressure/router-viewport-resolution-errors/src/router-viewport-resolution-errors-app.html"
        }
      ]
    }
  },
  "uri": "fixtures://pressure/router-viewport-resolution-errors/src/router-viewport-resolution-errors-app.html"
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
