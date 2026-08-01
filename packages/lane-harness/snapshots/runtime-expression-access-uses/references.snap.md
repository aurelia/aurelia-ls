# runtime-expression-access-uses references lane snapshot

Fixture: `packages/semantic-runtime/fixtures/pressure/runtime-expression-access-uses`
Probe file: `packages/lane-harness/probes/runtime-expression-access-uses.probes.json`
Lane: `references`

This snapshot records observed language-server behavior. Operator verdicts live in the probe data.

## callback-local-filter-item

### Probe

```json
{
  "anchor": "filter(item => item.label)",
  "at": "item",
  "atOccurrence": 2,
  "displayPosition": "src/runtime-expression-access-uses-app.html:6:28",
  "file": "src/runtime-expression-access-uses-app.html",
  "lspPosition": {
    "character": 27,
    "line": 5
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
          "character": 23,
          "line": 5
        },
        "start": {
          "character": 19,
          "line": 5
        }
      },
      "uri": "fixtures://pressure/runtime-expression-access-uses/src/runtime-expression-access-uses-app.html"
    },
    {
      "range": {
        "end": {
          "character": 31,
          "line": 5
        },
        "start": {
          "character": 27,
          "line": 5
        }
      },
      "uri": "fixtures://pressure/runtime-expression-access-uses/src/runtime-expression-access-uses-app.html"
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
      "file": "src/runtime-expression-access-uses-app.html",
      "range": {
        "end": {
          "character": 23,
          "line": 5
        },
        "start": {
          "character": 19,
          "line": 5
        }
      },
      "rangeText": "item",
      "uri": "fixtures://pressure/runtime-expression-access-uses/src/runtime-expression-access-uses-app.html"
    },
    {
      "anomaly": null,
      "file": "src/runtime-expression-access-uses-app.html",
      "range": {
        "end": {
          "character": 31,
          "line": 5
        },
        "start": {
          "character": 27,
          "line": 5
        }
      },
      "rangeText": "item",
      "uri": "fixtures://pressure/runtime-expression-access-uses/src/runtime-expression-access-uses-app.html"
    }
  ]
}
```

## outer-shadowed-callback-item

### Probe

```json
{
  "anchor": "+ item.id).join('|')",
  "at": "item",
  "atOccurrence": 1,
  "displayPosition": "src/runtime-expression-access-uses-app.html:15:67",
  "file": "src/runtime-expression-access-uses-app.html",
  "lspPosition": {
    "character": 66,
    "line": 14
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
          "line": 14
        },
        "start": {
          "character": 16,
          "line": 14
        }
      },
      "uri": "fixtures://pressure/runtime-expression-access-uses/src/runtime-expression-access-uses-app.html"
    },
    {
      "range": {
        "end": {
          "character": 70,
          "line": 14
        },
        "start": {
          "character": 66,
          "line": 14
        }
      },
      "uri": "fixtures://pressure/runtime-expression-access-uses/src/runtime-expression-access-uses-app.html"
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
      "file": "src/runtime-expression-access-uses-app.html",
      "range": {
        "end": {
          "character": 20,
          "line": 14
        },
        "start": {
          "character": 16,
          "line": 14
        }
      },
      "rangeText": "item",
      "uri": "fixtures://pressure/runtime-expression-access-uses/src/runtime-expression-access-uses-app.html"
    },
    {
      "anomaly": null,
      "file": "src/runtime-expression-access-uses-app.html",
      "range": {
        "end": {
          "character": 70,
          "line": 14
        },
        "start": {
          "character": 66,
          "line": 14
        }
      },
      "rangeText": "item",
      "uri": "fixtures://pressure/runtime-expression-access-uses/src/runtime-expression-access-uses-app.html"
    }
  ]
}
```

## form-name-all-access-modes

### Probe

```json
{
  "anchor": "value.one-time=\"form.name\"",
  "at": "name",
  "atOccurrence": 1,
  "displayPosition": "src/runtime-expression-access-uses-app.html:18:52",
  "file": "src/runtime-expression-access-uses-app.html",
  "lspPosition": {
    "character": 51,
    "line": 17
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
          "character": 48,
          "line": 2
        },
        "start": {
          "character": 44,
          "line": 2
        }
      },
      "uri": "fixtures://pressure/runtime-expression-access-uses/src/runtime-expression-access-uses-app.html"
    },
    {
      "range": {
        "end": {
          "character": 63,
          "line": 2
        },
        "start": {
          "character": 59,
          "line": 2
        }
      },
      "uri": "fixtures://pressure/runtime-expression-access-uses/src/runtime-expression-access-uses-app.html"
    },
    {
      "range": {
        "end": {
          "character": 60,
          "line": 3
        },
        "start": {
          "character": 56,
          "line": 3
        }
      },
      "uri": "fixtures://pressure/runtime-expression-access-uses/src/runtime-expression-access-uses-app.html"
    },
    {
      "range": {
        "end": {
          "character": 21,
          "line": 8
        },
        "start": {
          "character": 17,
          "line": 8
        }
      },
      "uri": "fixtures://pressure/runtime-expression-access-uses/src/runtime-expression-access-uses-app.html"
    },
    {
      "range": {
        "end": {
          "character": 60,
          "line": 8
        },
        "start": {
          "character": 56,
          "line": 8
        }
      },
      "uri": "fixtures://pressure/runtime-expression-access-uses/src/runtime-expression-access-uses-app.html"
    },
    {
      "range": {
        "end": {
          "character": 55,
          "line": 17
        },
        "start": {
          "character": 51,
          "line": 17
        }
      },
      "uri": "fixtures://pressure/runtime-expression-access-uses/src/runtime-expression-access-uses-app.html"
    },
    {
      "range": {
        "end": {
          "character": 28,
          "line": 20
        },
        "start": {
          "character": 24,
          "line": 20
        }
      },
      "uri": "fixtures://pressure/runtime-expression-access-uses/src/runtime-expression-access-uses-app.html"
    },
    {
      "range": {
        "end": {
          "character": 67,
          "line": 22
        },
        "start": {
          "character": 63,
          "line": 22
        }
      },
      "uri": "fixtures://pressure/runtime-expression-access-uses/src/runtime-expression-access-uses-app.html"
    },
    {
      "range": {
        "end": {
          "character": 66,
          "line": 23
        },
        "start": {
          "character": 62,
          "line": 23
        }
      },
      "uri": "fixtures://pressure/runtime-expression-access-uses/src/runtime-expression-access-uses-app.html"
    },
    {
      "range": {
        "end": {
          "character": 8,
          "line": 34
        },
        "start": {
          "character": 4,
          "line": 34
        }
      },
      "uri": "fixtures://pressure/runtime-expression-access-uses/src/runtime-expression-access-uses-app.ts"
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
  "locationCount": 10,
  "locations": [
    {
      "anomaly": null,
      "file": "src/runtime-expression-access-uses-app.html",
      "range": {
        "end": {
          "character": 48,
          "line": 2
        },
        "start": {
          "character": 44,
          "line": 2
        }
      },
      "rangeText": "name",
      "uri": "fixtures://pressure/runtime-expression-access-uses/src/runtime-expression-access-uses-app.html"
    },
    {
      "anomaly": null,
      "file": "src/runtime-expression-access-uses-app.html",
      "range": {
        "end": {
          "character": 63,
          "line": 2
        },
        "start": {
          "character": 59,
          "line": 2
        }
      },
      "rangeText": "name",
      "uri": "fixtures://pressure/runtime-expression-access-uses/src/runtime-expression-access-uses-app.html"
    },
    {
      "anomaly": null,
      "file": "src/runtime-expression-access-uses-app.html",
      "range": {
        "end": {
          "character": 60,
          "line": 3
        },
        "start": {
          "character": 56,
          "line": 3
        }
      },
      "rangeText": "name",
      "uri": "fixtures://pressure/runtime-expression-access-uses/src/runtime-expression-access-uses-app.html"
    },
    {
      "anomaly": null,
      "file": "src/runtime-expression-access-uses-app.html",
      "range": {
        "end": {
          "character": 21,
          "line": 8
        },
        "start": {
          "character": 17,
          "line": 8
        }
      },
      "rangeText": "name",
      "uri": "fixtures://pressure/runtime-expression-access-uses/src/runtime-expression-access-uses-app.html"
    },
    {
      "anomaly": null,
      "file": "src/runtime-expression-access-uses-app.html",
      "range": {
        "end": {
          "character": 60,
          "line": 8
        },
        "start": {
          "character": 56,
          "line": 8
        }
      },
      "rangeText": "name",
      "uri": "fixtures://pressure/runtime-expression-access-uses/src/runtime-expression-access-uses-app.html"
    },
    {
      "anomaly": null,
      "file": "src/runtime-expression-access-uses-app.html",
      "range": {
        "end": {
          "character": 55,
          "line": 17
        },
        "start": {
          "character": 51,
          "line": 17
        }
      },
      "rangeText": "name",
      "uri": "fixtures://pressure/runtime-expression-access-uses/src/runtime-expression-access-uses-app.html"
    },
    {
      "anomaly": null,
      "file": "src/runtime-expression-access-uses-app.html",
      "range": {
        "end": {
          "character": 28,
          "line": 20
        },
        "start": {
          "character": 24,
          "line": 20
        }
      },
      "rangeText": "name",
      "uri": "fixtures://pressure/runtime-expression-access-uses/src/runtime-expression-access-uses-app.html"
    },
    {
      "anomaly": null,
      "file": "src/runtime-expression-access-uses-app.html",
      "range": {
        "end": {
          "character": 67,
          "line": 22
        },
        "start": {
          "character": 63,
          "line": 22
        }
      },
      "rangeText": "name",
      "uri": "fixtures://pressure/runtime-expression-access-uses/src/runtime-expression-access-uses-app.html"
    },
    {
      "anomaly": null,
      "file": "src/runtime-expression-access-uses-app.html",
      "range": {
        "end": {
          "character": 66,
          "line": 23
        },
        "start": {
          "character": 62,
          "line": 23
        }
      },
      "rangeText": "name",
      "uri": "fixtures://pressure/runtime-expression-access-uses/src/runtime-expression-access-uses-app.html"
    },
    {
      "anomaly": null,
      "file": "src/runtime-expression-access-uses-app.ts",
      "range": {
        "end": {
          "character": 8,
          "line": 34
        },
        "start": {
          "character": 4,
          "line": 34
        }
      },
      "rangeText": "name",
      "uri": "fixtures://pressure/runtime-expression-access-uses/src/runtime-expression-access-uses-app.ts"
    }
  ]
}
```
