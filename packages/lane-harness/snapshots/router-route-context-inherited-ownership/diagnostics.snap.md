# router-route-context-inherited-ownership diagnostics lane snapshot

Fixture: `packages/semantic-runtime/fixtures/pressure/router-route-context-inherited-ownership`
Probe file: `packages/lane-harness/probes/router-route-context-inherited-ownership.probes.json`
Lane: `diagnostics`

This snapshot records observed language-server behavior. Operator verdicts live in the probe data.

## shared-base-route-context-read

### Probe

```json
{
  "file": "src/route-parameters/shared-route-parameters.ts"
}
```

### textDocument/diagnostic — full pull

```json
{
  "diagnosticCount": 1,
  "diagnostics": [
    {
      "anomaly": null,
      "code": "shared-base-route-context-parameter-read",
      "data": {
        "diagnosticAuthority": "semantic-authoring-policy",
        "diagnosticDomain": "router",
        "diagnosticKind": "shared-base-route-context-parameter-read",
        "frameworkErrorCode": null,
        "frameworkRawErrorAuthority": null,
        "missingInput": null,
        "missingInputs": [],
        "phase": "route-context-parameter-read-ownership",
        "relatedInformation": [
          {
            "message": "Routed component 'account-route' inherits this RouteContext parameter read.",
            "source": {
              "anchor": {
                "kind": "source-file-address",
                "label": "src/router-route-context-inherited-ownership-app.ts",
                "path": "src/router-route-context-inherited-ownership-app.ts",
                "sourceFileRole": "app-source",
                "sourceWorkspaceKey": "router-route-context-inherited-ownership"
              },
              "end": 508,
              "kind": "source-span-address",
              "label": "src/router-route-context-inherited-ownership-app.ts@496..508",
              "path": "src/router-route-context-inherited-ownership-app.ts",
              "role": "range",
              "sourceFileRole": "app-source",
              "sourceWorkspaceKey": "router-route-context-inherited-ownership",
              "start": 496
            }
          },
          {
            "message": "Routed component 'project-route' inherits this RouteContext parameter read.",
            "source": {
              "anchor": {
                "kind": "source-file-address",
                "label": "src/router-route-context-inherited-ownership-app.ts",
                "path": "src/router-route-context-inherited-ownership-app.ts",
                "sourceFileRole": "app-source",
                "sourceWorkspaceKey": "router-route-context-inherited-ownership"
              },
              "end": 608,
              "kind": "source-span-address",
              "label": "src/router-route-context-inherited-ownership-app.ts@596..608",
              "path": "src/router-route-context-inherited-ownership-app.ts",
              "role": "range",
              "sourceFileRole": "app-source",
              "sourceWorkspaceKey": "router-route-context-inherited-ownership",
              "start": 596
            }
          }
        ],
        "relatedQueryKind": "router-issues",
        "repairAffordance": {
          "actionKind": "inspect-type-surface",
          "actionability": "manual",
          "changeDomain": "inspection",
          "planKind": "manual-inspection",
          "readiness": "inspection-required",
          "targetSourceCoverage": "not-applicable"
        },
        "sourceRole": "app-source",
        "subject": null,
        "typeScriptDiagnosticCode": null
      },
      "message": "RouteContext parameter read on 'SharedRouteParameters' is shared by 2 routed components; declare the read on each concrete routed component or pass parameters into shared logic.",
      "range": {
        "end": {
          "character": 104,
          "line": 4
        },
        "start": {
          "character": 39,
          "line": 4
        }
      },
      "rangeText": "resolve(IRouteContext).getRouteParameters<{ sharedId: string }>()",
      "relatedInformation": [
        {
          "anomaly": null,
          "file": "src/router-route-context-inherited-ownership-app.ts",
          "message": "Routed component 'account-route' inherits this RouteContext parameter read.",
          "range": {
            "end": {
              "character": 29,
              "line": 15
            },
            "start": {
              "character": 17,
              "line": 15
            }
          },
          "rangeText": "AccountRoute",
          "uri": "fixtures://pressure/router-route-context-inherited-ownership/src/router-route-context-inherited-ownership-app.ts"
        },
        {
          "anomaly": null,
          "file": "src/router-route-context-inherited-ownership-app.ts",
          "message": "Routed component 'project-route' inherits this RouteContext parameter read.",
          "range": {
            "end": {
              "character": 29,
              "line": 20
            },
            "start": {
              "character": 17,
              "line": 20
            }
          },
          "rangeText": "ProjectRoute",
          "uri": "fixtures://pressure/router-route-context-inherited-ownership/src/router-route-context-inherited-ownership-app.ts"
        }
      ],
      "severity": "warning",
      "source": "aurelia"
    }
  ],
  "outcome": "full",
  "previousResultIdPresent": false,
  "resultIdPresent": true,
  "uri": "fixtures://pressure/router-route-context-inherited-ownership/src/route-parameters/shared-route-parameters.ts"
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
  "uri": "fixtures://pressure/router-route-context-inherited-ownership/src/route-parameters/shared-route-parameters.ts"
}
```

## single-descendant-base-route-context-read

### Probe

```json
{
  "file": "src/route-parameters/single-route-parameters.ts"
}
```

### textDocument/diagnostic — full pull

```json
{
  "diagnosticCount": 0,
  "diagnostics": [],
  "outcome": "full",
  "previousResultIdPresent": false,
  "resultIdPresent": true,
  "uri": "fixtures://pressure/router-route-context-inherited-ownership/src/route-parameters/single-route-parameters.ts"
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
  "uri": "fixtures://pressure/router-route-context-inherited-ownership/src/route-parameters/single-route-parameters.ts"
}
```
