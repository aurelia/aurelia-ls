# mixed-form-surfaces references lane snapshot

Fixture: `packages/semantic-runtime/fixtures/pressure/mixed-form-surfaces`
Probe file: `packages/lane-harness/probes/mixed-form-surfaces.probes.json`
Lane: `references`

This snapshot records observed language-server behavior. Operator verdicts live in the probe data.

## bindable-member-label

### Probe

```json
{
  "anchor": "${label}",
  "at": "label",
  "atOccurrence": 1,
  "displayPosition": "src/components/loose-picklist.html:2:5",
  "file": "src/components/loose-picklist.html",
  "lspPosition": {
    "character": 4,
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
          "character": 9,
          "line": 1
        },
        "start": {
          "character": 4,
          "line": 1
        }
      },
      "uri": "fixtures://pressure/mixed-form-surfaces/src/components/loose-picklist.html"
    },
    {
      "range": {
        "end": {
          "character": 17,
          "line": 10
        },
        "start": {
          "character": 12,
          "line": 10
        }
      },
      "uri": "fixtures://pressure/mixed-form-surfaces/src/components/loose-picklist.ts"
    },
    {
      "range": {
        "end": {
          "character": 9,
          "line": 17
        },
        "start": {
          "character": 4,
          "line": 17
        }
      },
      "uri": "fixtures://pressure/mixed-form-surfaces/src/components/ticket-editor.html"
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
      "file": "src/components/loose-picklist.html",
      "range": {
        "end": {
          "character": 9,
          "line": 1
        },
        "start": {
          "character": 4,
          "line": 1
        }
      },
      "rangeText": "label",
      "uri": "fixtures://pressure/mixed-form-surfaces/src/components/loose-picklist.html"
    },
    {
      "anomaly": null,
      "file": "src/components/loose-picklist.ts",
      "range": {
        "end": {
          "character": 17,
          "line": 10
        },
        "start": {
          "character": 12,
          "line": 10
        }
      },
      "rangeText": "label",
      "uri": "fixtures://pressure/mixed-form-surfaces/src/components/loose-picklist.ts"
    },
    {
      "anomaly": null,
      "file": "src/components/ticket-editor.html",
      "range": {
        "end": {
          "character": 9,
          "line": 17
        },
        "start": {
          "character": 4,
          "line": 17
        }
      },
      "rangeText": "label",
      "uri": "fixtures://pressure/mixed-form-surfaces/src/components/ticket-editor.html"
    }
  ]
}
```

## parent-specialized-option-label

### Probe

```json
{
  "anchor": "${option.label || option}",
  "at": "label",
  "atOccurrence": 1,
  "displayPosition": "src/components/loose-picklist.html:5:16",
  "file": "src/components/loose-picklist.html",
  "lspPosition": {
    "character": 15,
    "line": 4
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
          "character": 20,
          "line": 4
        },
        "start": {
          "character": 15,
          "line": 4
        }
      },
      "uri": "fixtures://pressure/mixed-form-surfaces/src/components/loose-picklist.html"
    },
    {
      "range": {
        "end": {
          "character": 18,
          "line": 19
        },
        "start": {
          "character": 13,
          "line": 19
        }
      },
      "uri": "fixtures://pressure/mixed-form-surfaces/src/models/ticket.ts"
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
      "file": "src/components/loose-picklist.html",
      "range": {
        "end": {
          "character": 20,
          "line": 4
        },
        "start": {
          "character": 15,
          "line": 4
        }
      },
      "rangeText": "label",
      "uri": "fixtures://pressure/mixed-form-surfaces/src/components/loose-picklist.html"
    },
    {
      "anomaly": null,
      "file": "src/models/ticket.ts",
      "range": {
        "end": {
          "character": 18,
          "line": 19
        },
        "start": {
          "character": 13,
          "line": 19
        }
      },
      "rangeText": "label",
      "uri": "fixtures://pressure/mixed-form-surfaces/src/models/ticket.ts"
    }
  ]
}
```
