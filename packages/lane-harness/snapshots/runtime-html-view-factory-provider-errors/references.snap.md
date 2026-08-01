# runtime-html-view-factory-provider-errors references lane snapshot

Fixture: `packages/semantic-runtime/fixtures/pressure/runtime-html-view-factory-provider-errors`
Probe file: `packages/lane-harness/probes/runtime-html-view-factory-provider-errors.probes.json`
Lane: `references`

This snapshot records observed language-server behavior. Operator verdicts live in the probe data.

## template-controller-view-factory-template

### Probe

```json
{
  "anchor": "<div view-factory-template>",
  "at": "view-factory-template",
  "atOccurrence": 1,
  "displayPosition": "src/runtime-html-view-factory-provider-errors-app.html:2:6",
  "file": "src/runtime-html-view-factory-provider-errors-app.html",
  "lspPosition": {
    "character": 5,
    "line": 1
  },
  "occurrence": 1
}
```

### references

```json
{
  "outcome": "result",
  "result": [
    {
      "range": {
        "end": {
          "character": 26,
          "line": 1
        },
        "start": {
          "character": 5,
          "line": 1
        }
      },
      "uri": "fixtures://pressure/runtime-html-view-factory-provider-errors/src/runtime-html-view-factory-provider-errors-app.html"
    },
    {
      "range": {
        "end": {
          "character": 30,
          "line": 31
        },
        "start": {
          "character": 9,
          "line": 31
        }
      },
      "uri": "fixtures://pressure/runtime-html-view-factory-provider-errors/src/runtime-html-view-factory-provider-errors-app.ts"
    }
  ]
}
```

### Notifications

```json
{
  "notificationCount": 0,
  "notifications": []
}
```

### Resolved locations

```json
{
  "locationCount": 2,
  "locations": [
    {
      "anomaly": null,
      "file": "src/runtime-html-view-factory-provider-errors-app.html",
      "range": {
        "end": {
          "character": 26,
          "line": 1
        },
        "start": {
          "character": 5,
          "line": 1
        }
      },
      "rangeText": "view-factory-template",
      "uri": "fixtures://pressure/runtime-html-view-factory-provider-errors/src/runtime-html-view-factory-provider-errors-app.html"
    },
    {
      "anomaly": null,
      "file": "src/runtime-html-view-factory-provider-errors-app.ts",
      "range": {
        "end": {
          "character": 30,
          "line": 31
        },
        "start": {
          "character": 9,
          "line": 31
        }
      },
      "rangeText": "view-factory-template",
      "uri": "fixtures://pressure/runtime-html-view-factory-provider-errors/src/runtime-html-view-factory-provider-errors-app.ts"
    }
  ]
}
```
