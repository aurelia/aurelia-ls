# template-local-template-semantics references lane snapshot

Fixture: `packages/semantic-runtime/fixtures/pressure/template-local-template-semantics`
Probe file: `packages/lane-harness/probes/template-local-template-semantics.probes.json`
Lane: `references`

This snapshot records observed language-server behavior. Operator verdicts live in the probe data.

## local-resource-use-before-declaration

### Probe

```json
{
  "anchor": "<mode-panel\n    one-time-value.bind",
  "at": "mode-panel",
  "atOccurrence": 1,
  "displayPosition": "src/template-local-template-semantics-app.html:2:4",
  "file": "src/template-local-template-semantics-app.html",
  "lspPosition": {
    "character": 3,
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
          "character": 13,
          "line": 1
        },
        "start": {
          "character": 3,
          "line": 1
        }
      },
      "uri": "fixtures://pressure/template-local-template-semantics/src/template-local-template-semantics-app.html"
    },
    {
      "range": {
        "end": {
          "character": 14,
          "line": 9
        },
        "start": {
          "character": 4,
          "line": 9
        }
      },
      "uri": "fixtures://pressure/template-local-template-semantics/src/template-local-template-semantics-app.html"
    },
    {
      "range": {
        "end": {
          "character": 13,
          "line": 11
        },
        "start": {
          "character": 3,
          "line": 11
        }
      },
      "uri": "fixtures://pressure/template-local-template-semantics/src/template-local-template-semantics-app.html"
    },
    {
      "range": {
        "end": {
          "character": 14,
          "line": 20
        },
        "start": {
          "character": 4,
          "line": 20
        }
      },
      "uri": "fixtures://pressure/template-local-template-semantics/src/template-local-template-semantics-app.html"
    },
    {
      "range": {
        "end": {
          "character": 41,
          "line": 22
        },
        "start": {
          "character": 31,
          "line": 22
        }
      },
      "uri": "fixtures://pressure/template-local-template-semantics/src/template-local-template-semantics-app.html"
    }
  ]
}
```

### Resolved locations

```json
{
  "locationCount": 5,
  "locations": [
    {
      "anomaly": null,
      "file": "src/template-local-template-semantics-app.html",
      "range": {
        "end": {
          "character": 13,
          "line": 1
        },
        "start": {
          "character": 3,
          "line": 1
        }
      },
      "rangeText": "mode-panel",
      "uri": "fixtures://pressure/template-local-template-semantics/src/template-local-template-semantics-app.html"
    },
    {
      "anomaly": null,
      "file": "src/template-local-template-semantics-app.html",
      "range": {
        "end": {
          "character": 14,
          "line": 9
        },
        "start": {
          "character": 4,
          "line": 9
        }
      },
      "rangeText": "mode-panel",
      "uri": "fixtures://pressure/template-local-template-semantics/src/template-local-template-semantics-app.html"
    },
    {
      "anomaly": null,
      "file": "src/template-local-template-semantics-app.html",
      "range": {
        "end": {
          "character": 13,
          "line": 11
        },
        "start": {
          "character": 3,
          "line": 11
        }
      },
      "rangeText": "mode-panel",
      "uri": "fixtures://pressure/template-local-template-semantics/src/template-local-template-semantics-app.html"
    },
    {
      "anomaly": null,
      "file": "src/template-local-template-semantics-app.html",
      "range": {
        "end": {
          "character": 14,
          "line": 20
        },
        "start": {
          "character": 4,
          "line": 20
        }
      },
      "rangeText": "mode-panel",
      "uri": "fixtures://pressure/template-local-template-semantics/src/template-local-template-semantics-app.html"
    },
    {
      "anomaly": null,
      "file": "src/template-local-template-semantics-app.html",
      "range": {
        "end": {
          "character": 41,
          "line": 22
        },
        "start": {
          "character": 31,
          "line": 22
        }
      },
      "rangeText": "mode-panel",
      "uri": "fixtures://pressure/template-local-template-semantics/src/template-local-template-semantics-app.html"
    }
  ]
}
```

## local-bindable-property

### Probe

```json
{
  "anchor": "<bindable name=\"oneTimeValue\"",
  "at": "oneTimeValue",
  "atOccurrence": 1,
  "displayPosition": "src/template-local-template-semantics-app.html:24:21",
  "file": "src/template-local-template-semantics-app.html",
  "lspPosition": {
    "character": 20,
    "line": 23
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
          "character": 18,
          "line": 2
        },
        "start": {
          "character": 4,
          "line": 2
        }
      },
      "uri": "fixtures://pressure/template-local-template-semantics/src/template-local-template-semantics-app.html"
    },
    {
      "range": {
        "end": {
          "character": 18,
          "line": 13
        },
        "start": {
          "character": 4,
          "line": 13
        }
      },
      "uri": "fixtures://pressure/template-local-template-semantics/src/template-local-template-semantics-app.html"
    },
    {
      "range": {
        "end": {
          "character": 32,
          "line": 23
        },
        "start": {
          "character": 20,
          "line": 23
        }
      },
      "uri": "fixtures://pressure/template-local-template-semantics/src/template-local-template-semantics-app.html"
    },
    {
      "range": {
        "end": {
          "character": 24,
          "line": 33
        },
        "start": {
          "character": 12,
          "line": 33
        }
      },
      "uri": "fixtures://pressure/template-local-template-semantics/src/template-local-template-semantics-app.html"
    },
    {
      "range": {
        "end": {
          "character": 41,
          "line": 43
        },
        "start": {
          "character": 29,
          "line": 43
        }
      },
      "uri": "fixtures://pressure/template-local-template-semantics/src/template-local-template-semantics-app.html"
    }
  ]
}
```

### Resolved locations

```json
{
  "locationCount": 5,
  "locations": [
    {
      "anomaly": null,
      "file": "src/template-local-template-semantics-app.html",
      "range": {
        "end": {
          "character": 18,
          "line": 2
        },
        "start": {
          "character": 4,
          "line": 2
        }
      },
      "rangeText": "one-time-value",
      "uri": "fixtures://pressure/template-local-template-semantics/src/template-local-template-semantics-app.html"
    },
    {
      "anomaly": null,
      "file": "src/template-local-template-semantics-app.html",
      "range": {
        "end": {
          "character": 18,
          "line": 13
        },
        "start": {
          "character": 4,
          "line": 13
        }
      },
      "rangeText": "one-time-value",
      "uri": "fixtures://pressure/template-local-template-semantics/src/template-local-template-semantics-app.html"
    },
    {
      "anomaly": null,
      "file": "src/template-local-template-semantics-app.html",
      "range": {
        "end": {
          "character": 32,
          "line": 23
        },
        "start": {
          "character": 20,
          "line": 23
        }
      },
      "rangeText": "oneTimeValue",
      "uri": "fixtures://pressure/template-local-template-semantics/src/template-local-template-semantics-app.html"
    },
    {
      "anomaly": null,
      "file": "src/template-local-template-semantics-app.html",
      "range": {
        "end": {
          "character": 24,
          "line": 33
        },
        "start": {
          "character": 12,
          "line": 33
        }
      },
      "rangeText": "oneTimeValue",
      "uri": "fixtures://pressure/template-local-template-semantics/src/template-local-template-semantics-app.html"
    },
    {
      "anomaly": null,
      "file": "src/template-local-template-semantics-app.html",
      "range": {
        "end": {
          "character": 41,
          "line": 43
        },
        "start": {
          "character": 29,
          "line": 43
        }
      },
      "rangeText": "oneTimeValue",
      "uri": "fixtures://pressure/template-local-template-semantics/src/template-local-template-semantics-app.html"
    }
  ]
}
```

## local-bindable-alias

### Probe

```json
{
  "anchor": "attribute=\"one-time-value\"",
  "at": "one-time-value",
  "atOccurrence": 1,
  "displayPosition": "src/template-local-template-semantics-app.html:24:46",
  "file": "src/template-local-template-semantics-app.html",
  "lspPosition": {
    "character": 45,
    "line": 23
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
          "character": 18,
          "line": 2
        },
        "start": {
          "character": 4,
          "line": 2
        }
      },
      "uri": "fixtures://pressure/template-local-template-semantics/src/template-local-template-semantics-app.html"
    },
    {
      "range": {
        "end": {
          "character": 18,
          "line": 13
        },
        "start": {
          "character": 4,
          "line": 13
        }
      },
      "uri": "fixtures://pressure/template-local-template-semantics/src/template-local-template-semantics-app.html"
    },
    {
      "range": {
        "end": {
          "character": 59,
          "line": 23
        },
        "start": {
          "character": 45,
          "line": 23
        }
      },
      "uri": "fixtures://pressure/template-local-template-semantics/src/template-local-template-semantics-app.html"
    }
  ]
}
```

### Resolved locations

```json
{
  "locationCount": 3,
  "locations": [
    {
      "anomaly": null,
      "file": "src/template-local-template-semantics-app.html",
      "range": {
        "end": {
          "character": 18,
          "line": 2
        },
        "start": {
          "character": 4,
          "line": 2
        }
      },
      "rangeText": "one-time-value",
      "uri": "fixtures://pressure/template-local-template-semantics/src/template-local-template-semantics-app.html"
    },
    {
      "anomaly": null,
      "file": "src/template-local-template-semantics-app.html",
      "range": {
        "end": {
          "character": 18,
          "line": 13
        },
        "start": {
          "character": 4,
          "line": 13
        }
      },
      "rangeText": "one-time-value",
      "uri": "fixtures://pressure/template-local-template-semantics/src/template-local-template-semantics-app.html"
    },
    {
      "anomaly": null,
      "file": "src/template-local-template-semantics-app.html",
      "range": {
        "end": {
          "character": 59,
          "line": 23
        },
        "start": {
          "character": 45,
          "line": 23
        }
      },
      "rangeText": "one-time-value",
      "uri": "fixtures://pressure/template-local-template-semantics/src/template-local-template-semantics-app.html"
    }
  ]
}
```

## nested-local-resource

### Probe

```json
{
  "anchor": "<nested-note note.bind",
  "at": "nested-note",
  "atOccurrence": 1,
  "displayPosition": "src/template-local-template-semantics-app.html:41:8",
  "file": "src/template-local-template-semantics-app.html",
  "lspPosition": {
    "character": 7,
    "line": 40
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
          "character": 18,
          "line": 40
        },
        "start": {
          "character": 7,
          "line": 40
        }
      },
      "uri": "fixtures://pressure/template-local-template-semantics/src/template-local-template-semantics-app.html"
    },
    {
      "range": {
        "end": {
          "character": 56,
          "line": 40
        },
        "start": {
          "character": 45,
          "line": 40
        }
      },
      "uri": "fixtures://pressure/template-local-template-semantics/src/template-local-template-semantics-app.html"
    },
    {
      "range": {
        "end": {
          "character": 44,
          "line": 47
        },
        "start": {
          "character": 33,
          "line": 47
        }
      },
      "uri": "fixtures://pressure/template-local-template-semantics/src/template-local-template-semantics-app.html"
    }
  ]
}
```

### Resolved locations

```json
{
  "locationCount": 3,
  "locations": [
    {
      "anomaly": null,
      "file": "src/template-local-template-semantics-app.html",
      "range": {
        "end": {
          "character": 18,
          "line": 40
        },
        "start": {
          "character": 7,
          "line": 40
        }
      },
      "rangeText": "nested-note",
      "uri": "fixtures://pressure/template-local-template-semantics/src/template-local-template-semantics-app.html"
    },
    {
      "anomaly": null,
      "file": "src/template-local-template-semantics-app.html",
      "range": {
        "end": {
          "character": 56,
          "line": 40
        },
        "start": {
          "character": 45,
          "line": 40
        }
      },
      "rangeText": "nested-note",
      "uri": "fixtures://pressure/template-local-template-semantics/src/template-local-template-semantics-app.html"
    },
    {
      "anomaly": null,
      "file": "src/template-local-template-semantics-app.html",
      "range": {
        "end": {
          "character": 44,
          "line": 47
        },
        "start": {
          "character": 33,
          "line": 47
        }
      },
      "rangeText": "nested-note",
      "uri": "fixtures://pressure/template-local-template-semantics/src/template-local-template-semantics-app.html"
    }
  ]
}
```
