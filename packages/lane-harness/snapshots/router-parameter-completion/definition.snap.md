# router-parameter-completion definition lane snapshot

Fixture: `packages/semantic-runtime/fixtures/pressure/router-parameter-completion`
Probe file: `packages/lane-harness/probes/router-parameter-completion.probes.json`
Lane: `definition`

This snapshot records observed language-server behavior. Operator verdicts live in the probe data.

## router-inline-route-id

### Probe

```json
{
  "anchor": "route: product-detail; params.bind: { productId: 'coffee' }",
  "at": "product-detail",
  "atOccurrence": 1,
  "displayPosition": "src/routes/parameter-workspace.html:2:19",
  "file": "src/routes/parameter-workspace.html",
  "lspPosition": {
    "character": 18,
    "line": 1
  },
  "occurrence": 1
}
```

### definition

```json
{
  "outcome": "result",
  "result": [
    {
      "targetRange": {
        "end": {
          "character": 5,
          "line": 14
        },
        "start": {
          "character": 4,
          "line": 7
        }
      },
      "targetSelectionRange": {
        "end": {
          "character": 26,
          "line": 8
        },
        "start": {
          "character": 10,
          "line": 8
        }
      },
      "targetUri": "fixtures://pressure/router-parameter-completion/src/routes/parameter-workspace.ts"
    }
  ]
}
```

### Resolved locations

```json
{
  "locationCount": 1,
  "locations": [
    {
      "anomaly": null,
      "file": "src/routes/parameter-workspace.ts",
      "range": {
        "end": {
          "character": 26,
          "line": 8
        },
        "start": {
          "character": 10,
          "line": 8
        }
      },
      "rangeText": "'product-detail'",
      "uri": "fixtures://pressure/router-parameter-completion/src/routes/parameter-workspace.ts"
    }
  ]
}
```

## router-bound-literal-route-id

### Probe

```json
{
  "anchor": "route.bind: 'product-detail'; params.bind: { }",
  "at": "product-detail",
  "atOccurrence": 1,
  "displayPosition": "src/routes/parameter-workspace.html:7:25",
  "file": "src/routes/parameter-workspace.html",
  "lspPosition": {
    "character": 24,
    "line": 6
  },
  "occurrence": 1
}
```

### definition

```json
{
  "outcome": "result",
  "result": [
    {
      "targetRange": {
        "end": {
          "character": 5,
          "line": 14
        },
        "start": {
          "character": 4,
          "line": 7
        }
      },
      "targetSelectionRange": {
        "end": {
          "character": 26,
          "line": 8
        },
        "start": {
          "character": 10,
          "line": 8
        }
      },
      "targetUri": "fixtures://pressure/router-parameter-completion/src/routes/parameter-workspace.ts"
    }
  ]
}
```

### Resolved locations

```json
{
  "locationCount": 1,
  "locations": [
    {
      "anomaly": null,
      "file": "src/routes/parameter-workspace.ts",
      "range": {
        "end": {
          "character": 26,
          "line": 8
        },
        "start": {
          "character": 10,
          "line": 8
        }
      },
      "rangeText": "'product-detail'",
      "uri": "fixtures://pressure/router-parameter-completion/src/routes/parameter-workspace.ts"
    }
  ]
}
```
