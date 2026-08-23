# template-spread-capture-semantics references lane snapshot

Fixture: `packages/semantic-runtime/fixtures/pressure/template-spread-capture-semantics`
Probe file: `packages/lane-harness/probes/template-spread-capture-semantics.probes.json`
Lane: `references`

This snapshot records observed language-server behavior. Operator verdicts live in the probe data.

## spread-root-member

### Probe

```json
{
  "anchor": "<spread-card ...$bindables='spreadState'>",
  "at": "spreadState",
  "atOccurrence": 1,
  "displayPosition": "src/template-spread-capture-semantics-app.html:2:31",
  "file": "src/template-spread-capture-semantics-app.html",
  "lspPosition": {
    "character": 30,
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
          "character": 41,
          "line": 1
        },
        "start": {
          "character": 30,
          "line": 1
        }
      },
      "uri": "fixtures://pressure/template-spread-capture-semantics/src/template-spread-capture-semantics-app.html"
    },
    {
      "range": {
        "end": {
          "character": 41,
          "line": 3
        },
        "start": {
          "character": 30,
          "line": 3
        }
      },
      "uri": "fixtures://pressure/template-spread-capture-semantics/src/template-spread-capture-semantics-app.html"
    },
    {
      "range": {
        "end": {
          "character": 41,
          "line": 4
        },
        "start": {
          "character": 30,
          "line": 4
        }
      },
      "uri": "fixtures://pressure/template-spread-capture-semantics/src/template-spread-capture-semantics-app.html"
    },
    {
      "range": {
        "end": {
          "character": 45,
          "line": 5
        },
        "start": {
          "character": 34,
          "line": 5
        }
      },
      "uri": "fixtures://pressure/template-spread-capture-semantics/src/template-spread-capture-semantics-app.html"
    },
    {
      "range": {
        "end": {
          "character": 41,
          "line": 6
        },
        "start": {
          "character": 30,
          "line": 6
        }
      },
      "uri": "fixtures://pressure/template-spread-capture-semantics/src/template-spread-capture-semantics-app.html"
    },
    {
      "range": {
        "end": {
          "character": 50,
          "line": 7
        },
        "start": {
          "character": 39,
          "line": 7
        }
      },
      "uri": "fixtures://pressure/template-spread-capture-semantics/src/template-spread-capture-semantics-app.html"
    },
    {
      "range": {
        "end": {
          "character": 76,
          "line": 7
        },
        "start": {
          "character": 65,
          "line": 7
        }
      },
      "uri": "fixtures://pressure/template-spread-capture-semantics/src/template-spread-capture-semantics-app.html"
    },
    {
      "range": {
        "end": {
          "character": 101,
          "line": 7
        },
        "start": {
          "character": 90,
          "line": 7
        }
      },
      "uri": "fixtures://pressure/template-spread-capture-semantics/src/template-spread-capture-semantics-app.html"
    },
    {
      "range": {
        "end": {
          "character": 13,
          "line": 35
        },
        "start": {
          "character": 2,
          "line": 35
        }
      },
      "uri": "fixtures://pressure/template-spread-capture-semantics/src/template-spread-capture-semantics-app.ts"
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
  "locationCount": 9,
  "locations": [
    {
      "anomaly": null,
      "file": "src/template-spread-capture-semantics-app.html",
      "range": {
        "end": {
          "character": 41,
          "line": 1
        },
        "start": {
          "character": 30,
          "line": 1
        }
      },
      "rangeText": "spreadState",
      "uri": "fixtures://pressure/template-spread-capture-semantics/src/template-spread-capture-semantics-app.html"
    },
    {
      "anomaly": null,
      "file": "src/template-spread-capture-semantics-app.html",
      "range": {
        "end": {
          "character": 41,
          "line": 3
        },
        "start": {
          "character": 30,
          "line": 3
        }
      },
      "rangeText": "spreadState",
      "uri": "fixtures://pressure/template-spread-capture-semantics/src/template-spread-capture-semantics-app.html"
    },
    {
      "anomaly": null,
      "file": "src/template-spread-capture-semantics-app.html",
      "range": {
        "end": {
          "character": 41,
          "line": 4
        },
        "start": {
          "character": 30,
          "line": 4
        }
      },
      "rangeText": "spreadState",
      "uri": "fixtures://pressure/template-spread-capture-semantics/src/template-spread-capture-semantics-app.html"
    },
    {
      "anomaly": null,
      "file": "src/template-spread-capture-semantics-app.html",
      "range": {
        "end": {
          "character": 45,
          "line": 5
        },
        "start": {
          "character": 34,
          "line": 5
        }
      },
      "rangeText": "spreadState",
      "uri": "fixtures://pressure/template-spread-capture-semantics/src/template-spread-capture-semantics-app.html"
    },
    {
      "anomaly": null,
      "file": "src/template-spread-capture-semantics-app.html",
      "range": {
        "end": {
          "character": 41,
          "line": 6
        },
        "start": {
          "character": 30,
          "line": 6
        }
      },
      "rangeText": "spreadState",
      "uri": "fixtures://pressure/template-spread-capture-semantics/src/template-spread-capture-semantics-app.html"
    },
    {
      "anomaly": null,
      "file": "src/template-spread-capture-semantics-app.html",
      "range": {
        "end": {
          "character": 50,
          "line": 7
        },
        "start": {
          "character": 39,
          "line": 7
        }
      },
      "rangeText": "spreadState",
      "uri": "fixtures://pressure/template-spread-capture-semantics/src/template-spread-capture-semantics-app.html"
    },
    {
      "anomaly": null,
      "file": "src/template-spread-capture-semantics-app.html",
      "range": {
        "end": {
          "character": 76,
          "line": 7
        },
        "start": {
          "character": 65,
          "line": 7
        }
      },
      "rangeText": "spreadState",
      "uri": "fixtures://pressure/template-spread-capture-semantics/src/template-spread-capture-semantics-app.html"
    },
    {
      "anomaly": null,
      "file": "src/template-spread-capture-semantics-app.html",
      "range": {
        "end": {
          "character": 101,
          "line": 7
        },
        "start": {
          "character": 90,
          "line": 7
        }
      },
      "rangeText": "spreadState",
      "uri": "fixtures://pressure/template-spread-capture-semantics/src/template-spread-capture-semantics-app.html"
    },
    {
      "anomaly": null,
      "file": "src/template-spread-capture-semantics-app.ts",
      "range": {
        "end": {
          "character": 13,
          "line": 35
        },
        "start": {
          "character": 2,
          "line": 35
        }
      },
      "rangeText": "spreadState",
      "uri": "fixtures://pressure/template-spread-capture-semantics/src/template-spread-capture-semantics-app.ts"
    }
  ]
}
```

## spread-inferred-member

### Probe

```json
{
  "anchor": "...$bindables='spreadContainer.details'",
  "at": "details",
  "atOccurrence": 1,
  "displayPosition": "src/template-spread-capture-semantics-app.html:3:47",
  "file": "src/template-spread-capture-semantics-app.html",
  "lspPosition": {
    "character": 46,
    "line": 2
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
          "character": 53,
          "line": 2
        },
        "start": {
          "character": 46,
          "line": 2
        }
      },
      "uri": "fixtures://pressure/template-spread-capture-semantics/src/template-spread-capture-semantics-app.html"
    },
    {
      "range": {
        "end": {
          "character": 11,
          "line": 42
        },
        "start": {
          "character": 4,
          "line": 42
        }
      },
      "uri": "fixtures://pressure/template-spread-capture-semantics/src/template-spread-capture-semantics-app.ts"
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
      "file": "src/template-spread-capture-semantics-app.html",
      "range": {
        "end": {
          "character": 53,
          "line": 2
        },
        "start": {
          "character": 46,
          "line": 2
        }
      },
      "rangeText": "details",
      "uri": "fixtures://pressure/template-spread-capture-semantics/src/template-spread-capture-semantics-app.html"
    },
    {
      "anomaly": null,
      "file": "src/template-spread-capture-semantics-app.ts",
      "range": {
        "end": {
          "character": 11,
          "line": 42
        },
        "start": {
          "character": 4,
          "line": 42
        }
      },
      "rangeText": "details",
      "uri": "fixtures://pressure/template-spread-capture-semantics/src/template-spread-capture-semantics-app.ts"
    }
  ]
}
```

## spread-repeat-local

### Probe

```json
{
  "anchor": "repeat.for=\"card of spreadCards\" ...card",
  "at": "card",
  "atOccurrence": 2,
  "displayPosition": "src/template-spread-capture-semantics-app.html:9:52",
  "file": "src/template-spread-capture-semantics-app.html",
  "lspPosition": {
    "character": 51,
    "line": 8
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
          "character": 31,
          "line": 8
        },
        "start": {
          "character": 27,
          "line": 8
        }
      },
      "uri": "fixtures://pressure/template-spread-capture-semantics/src/template-spread-capture-semantics-app.html"
    },
    {
      "range": {
        "end": {
          "character": 55,
          "line": 8
        },
        "start": {
          "character": 51,
          "line": 8
        }
      },
      "uri": "fixtures://pressure/template-spread-capture-semantics/src/template-spread-capture-semantics-app.html"
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
      "file": "src/template-spread-capture-semantics-app.html",
      "range": {
        "end": {
          "character": 31,
          "line": 8
        },
        "start": {
          "character": 27,
          "line": 8
        }
      },
      "rangeText": "card",
      "uri": "fixtures://pressure/template-spread-capture-semantics/src/template-spread-capture-semantics-app.html"
    },
    {
      "anomaly": null,
      "file": "src/template-spread-capture-semantics-app.html",
      "range": {
        "end": {
          "character": 55,
          "line": 8
        },
        "start": {
          "character": 51,
          "line": 8
        }
      },
      "rangeText": "card",
      "uri": "fixtures://pressure/template-spread-capture-semantics/src/template-spread-capture-semantics-app.html"
    }
  ]
}
```

## spread-value-converter-resource

### Probe

```json
{
  "anchor": "spreadState | spreadIdentity",
  "at": "spreadIdentity",
  "atOccurrence": 1,
  "displayPosition": "src/template-spread-capture-semantics-app.html:7:45",
  "file": "src/template-spread-capture-semantics-app.html",
  "lspPosition": {
    "character": 44,
    "line": 6
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
          "character": 31,
          "line": 32
        },
        "start": {
          "character": 17,
          "line": 32
        }
      },
      "uri": "fixtures://pressure/template-spread-capture-semantics/src/spread-card.ts"
    },
    {
      "range": {
        "end": {
          "character": 58,
          "line": 6
        },
        "start": {
          "character": 44,
          "line": 6
        }
      },
      "uri": "fixtures://pressure/template-spread-capture-semantics/src/template-spread-capture-semantics-app.html"
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
      "file": "src/spread-card.ts",
      "range": {
        "end": {
          "character": 31,
          "line": 32
        },
        "start": {
          "character": 17,
          "line": 32
        }
      },
      "rangeText": "spreadIdentity",
      "uri": "fixtures://pressure/template-spread-capture-semantics/src/spread-card.ts"
    },
    {
      "anomaly": null,
      "file": "src/template-spread-capture-semantics-app.html",
      "range": {
        "end": {
          "character": 58,
          "line": 6
        },
        "start": {
          "character": 44,
          "line": 6
        }
      },
      "rangeText": "spreadIdentity",
      "uri": "fixtures://pressure/template-spread-capture-semantics/src/template-spread-capture-semantics-app.html"
    }
  ]
}
```

## captured-expression-member

### Probe

```json
{
  "anchor": "value.bind=\"capturedValue\"",
  "at": "capturedValue",
  "atOccurrence": 1,
  "displayPosition": "src/template-spread-capture-semantics-app.html:31:17",
  "file": "src/template-spread-capture-semantics-app.html",
  "lspPosition": {
    "character": 16,
    "line": 30
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
          "character": 29,
          "line": 30
        },
        "start": {
          "character": 16,
          "line": 30
        }
      },
      "uri": "fixtures://pressure/template-spread-capture-semantics/src/template-spread-capture-semantics-app.html"
    },
    {
      "range": {
        "end": {
          "character": 45,
          "line": 51
        },
        "start": {
          "character": 32,
          "line": 51
        }
      },
      "uri": "fixtures://pressure/template-spread-capture-semantics/src/template-spread-capture-semantics-app.html"
    },
    {
      "range": {
        "end": {
          "character": 49,
          "line": 53
        },
        "start": {
          "character": 36,
          "line": 53
        }
      },
      "uri": "fixtures://pressure/template-spread-capture-semantics/src/template-spread-capture-semantics-app.html"
    },
    {
      "range": {
        "end": {
          "character": 15,
          "line": 84
        },
        "start": {
          "character": 2,
          "line": 84
        }
      },
      "uri": "fixtures://pressure/template-spread-capture-semantics/src/template-spread-capture-semantics-app.ts"
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
  "locationCount": 4,
  "locations": [
    {
      "anomaly": null,
      "file": "src/template-spread-capture-semantics-app.html",
      "range": {
        "end": {
          "character": 29,
          "line": 30
        },
        "start": {
          "character": 16,
          "line": 30
        }
      },
      "rangeText": "capturedValue",
      "uri": "fixtures://pressure/template-spread-capture-semantics/src/template-spread-capture-semantics-app.html"
    },
    {
      "anomaly": null,
      "file": "src/template-spread-capture-semantics-app.html",
      "range": {
        "end": {
          "character": 45,
          "line": 51
        },
        "start": {
          "character": 32,
          "line": 51
        }
      },
      "rangeText": "capturedValue",
      "uri": "fixtures://pressure/template-spread-capture-semantics/src/template-spread-capture-semantics-app.html"
    },
    {
      "anomaly": null,
      "file": "src/template-spread-capture-semantics-app.html",
      "range": {
        "end": {
          "character": 49,
          "line": 53
        },
        "start": {
          "character": 36,
          "line": 53
        }
      },
      "rangeText": "capturedValue",
      "uri": "fixtures://pressure/template-spread-capture-semantics/src/template-spread-capture-semantics-app.html"
    },
    {
      "anomaly": null,
      "file": "src/template-spread-capture-semantics-app.ts",
      "range": {
        "end": {
          "character": 15,
          "line": 84
        },
        "start": {
          "character": 2,
          "line": 84
        }
      },
      "rangeText": "capturedValue",
      "uri": "fixtures://pressure/template-spread-capture-semantics/src/template-spread-capture-semantics-app.ts"
    }
  ]
}
```

## receiver-local-custom-attribute

### Probe

```json
{
  "anchor": "input-mark=\"receiver-local-mark\"",
  "at": "input-mark",
  "atOccurrence": 1,
  "displayPosition": "src/template-spread-capture-semantics-app.html:36:5",
  "file": "src/template-spread-capture-semantics-app.html",
  "lspPosition": {
    "character": 4,
    "line": 35
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
          "character": 28,
          "line": 6
        },
        "start": {
          "character": 18,
          "line": 6
        }
      },
      "uri": "fixtures://pressure/template-spread-capture-semantics/src/capture-resources.ts"
    },
    {
      "range": {
        "end": {
          "character": 19,
          "line": 2
        },
        "start": {
          "character": 9,
          "line": 2
        }
      },
      "uri": "fixtures://pressure/template-spread-capture-semantics/src/capture-shell.html"
    },
    {
      "range": {
        "end": {
          "character": 14,
          "line": 35
        },
        "start": {
          "character": 4,
          "line": 35
        }
      },
      "uri": "fixtures://pressure/template-spread-capture-semantics/src/template-spread-capture-semantics-app.html"
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
      "file": "src/capture-resources.ts",
      "range": {
        "end": {
          "character": 28,
          "line": 6
        },
        "start": {
          "character": 18,
          "line": 6
        }
      },
      "rangeText": "input-mark",
      "uri": "fixtures://pressure/template-spread-capture-semantics/src/capture-resources.ts"
    },
    {
      "anomaly": null,
      "file": "src/capture-shell.html",
      "range": {
        "end": {
          "character": 19,
          "line": 2
        },
        "start": {
          "character": 9,
          "line": 2
        }
      },
      "rangeText": "input-mark",
      "uri": "fixtures://pressure/template-spread-capture-semantics/src/capture-shell.html"
    },
    {
      "anomaly": null,
      "file": "src/template-spread-capture-semantics-app.html",
      "range": {
        "end": {
          "character": 14,
          "line": 35
        },
        "start": {
          "character": 4,
          "line": 35
        }
      },
      "rangeText": "input-mark",
      "uri": "fixtures://pressure/template-spread-capture-semantics/src/template-spread-capture-semantics-app.html"
    }
  ]
}
```
