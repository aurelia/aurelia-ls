# observation-binding-lifecycle references lane snapshot

Fixture: `packages/semantic-runtime/fixtures/pressure/observation-binding-lifecycle`
Probe file: `packages/lane-harness/probes/observation-binding-lifecycle.probes.json`
Lane: `references`

This snapshot records observed language-server behavior. Operator verdicts live in the probe data.

## inert-attribute-source-member

### Probe

```json
{
  "anchor": "data-lifecycle.attr=\"attributeFromView & fromView\"",
  "at": "attributeFromView",
  "atOccurrence": 1,
  "displayPosition": "src/observation-binding-lifecycle-app.html:8:61",
  "file": "src/observation-binding-lifecycle-app.html",
  "lspPosition": {
    "character": 60,
    "line": 7
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
          "character": 77,
          "line": 7
        },
        "start": {
          "character": 60,
          "line": 7
        }
      },
      "uri": "fixtures://pressure/observation-binding-lifecycle/src/observation-binding-lifecycle-app.html"
    },
    {
      "range": {
        "end": {
          "character": 97,
          "line": 8
        },
        "start": {
          "character": 80,
          "line": 8
        }
      },
      "uri": "fixtures://pressure/observation-binding-lifecycle/src/observation-binding-lifecycle-app.html"
    },
    {
      "range": {
        "end": {
          "character": 19,
          "line": 32
        },
        "start": {
          "character": 2,
          "line": 32
        }
      },
      "uri": "fixtures://pressure/observation-binding-lifecycle/src/observation-binding-lifecycle-app.ts"
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
  "locationCount": 3,
  "locations": [
    {
      "anomaly": null,
      "file": "src/observation-binding-lifecycle-app.html",
      "range": {
        "end": {
          "character": 77,
          "line": 7
        },
        "start": {
          "character": 60,
          "line": 7
        }
      },
      "rangeText": "attributeFromView",
      "uri": "fixtures://pressure/observation-binding-lifecycle/src/observation-binding-lifecycle-app.html"
    },
    {
      "anomaly": null,
      "file": "src/observation-binding-lifecycle-app.html",
      "range": {
        "end": {
          "character": 97,
          "line": 8
        },
        "start": {
          "character": 80,
          "line": 8
        }
      },
      "rangeText": "attributeFromView",
      "uri": "fixtures://pressure/observation-binding-lifecycle/src/observation-binding-lifecycle-app.html"
    },
    {
      "anomaly": null,
      "file": "src/observation-binding-lifecycle-app.ts",
      "range": {
        "end": {
          "character": 19,
          "line": 32
        },
        "start": {
          "character": 2,
          "line": 32
        }
      },
      "rangeText": "attributeFromView",
      "uri": "fixtures://pressure/observation-binding-lifecycle/src/observation-binding-lifecycle-app.ts"
    }
  ]
}
```
