# runtime-expression-access-uses documentHighlight lane snapshot

Fixture: `packages/semantic-runtime/fixtures/pressure/runtime-expression-access-uses`
Probe file: `packages/lane-harness/probes/runtime-expression-access-uses.probes.json`
Lane: `documentHighlight`

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

### documentHighlight

```json
{
  "outcome": "result",
  "result": [
    {
      "kind": 1,
      "range": {
        "end": {
          "character": 23,
          "line": 5
        },
        "start": {
          "character": 19,
          "line": 5
        }
      }
    },
    {
      "kind": 1,
      "range": {
        "end": {
          "character": 31,
          "line": 5
        },
        "start": {
          "character": 27,
          "line": 5
        }
      }
    }
  ]
}
```

### Resolved highlights

```json
{
  "highlightCount": 2,
  "highlights": [
    {
      "anomaly": null,
      "kind": "text",
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
      "rangeText": "item"
    },
    {
      "anomaly": null,
      "kind": "text",
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
      "rangeText": "item"
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

### documentHighlight

```json
{
  "outcome": "result",
  "result": [
    {
      "kind": 1,
      "range": {
        "end": {
          "character": 48,
          "line": 2
        },
        "start": {
          "character": 44,
          "line": 2
        }
      }
    },
    {
      "kind": 1,
      "range": {
        "end": {
          "character": 63,
          "line": 2
        },
        "start": {
          "character": 59,
          "line": 2
        }
      }
    },
    {
      "kind": 1,
      "range": {
        "end": {
          "character": 60,
          "line": 3
        },
        "start": {
          "character": 56,
          "line": 3
        }
      }
    },
    {
      "kind": 1,
      "range": {
        "end": {
          "character": 21,
          "line": 8
        },
        "start": {
          "character": 17,
          "line": 8
        }
      }
    },
    {
      "kind": 1,
      "range": {
        "end": {
          "character": 60,
          "line": 8
        },
        "start": {
          "character": 56,
          "line": 8
        }
      }
    },
    {
      "kind": 1,
      "range": {
        "end": {
          "character": 55,
          "line": 17
        },
        "start": {
          "character": 51,
          "line": 17
        }
      }
    },
    {
      "kind": 1,
      "range": {
        "end": {
          "character": 28,
          "line": 20
        },
        "start": {
          "character": 24,
          "line": 20
        }
      }
    },
    {
      "kind": 1,
      "range": {
        "end": {
          "character": 67,
          "line": 22
        },
        "start": {
          "character": 63,
          "line": 22
        }
      }
    },
    {
      "kind": 1,
      "range": {
        "end": {
          "character": 66,
          "line": 23
        },
        "start": {
          "character": 62,
          "line": 23
        }
      }
    }
  ]
}
```

### Resolved highlights

```json
{
  "highlightCount": 9,
  "highlights": [
    {
      "anomaly": null,
      "kind": "text",
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
      "rangeText": "name"
    },
    {
      "anomaly": null,
      "kind": "text",
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
      "rangeText": "name"
    },
    {
      "anomaly": null,
      "kind": "text",
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
      "rangeText": "name"
    },
    {
      "anomaly": null,
      "kind": "text",
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
      "rangeText": "name"
    },
    {
      "anomaly": null,
      "kind": "text",
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
      "rangeText": "name"
    },
    {
      "anomaly": null,
      "kind": "text",
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
      "rangeText": "name"
    },
    {
      "anomaly": null,
      "kind": "text",
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
      "rangeText": "name"
    },
    {
      "anomaly": null,
      "kind": "text",
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
      "rangeText": "name"
    },
    {
      "anomaly": null,
      "kind": "text",
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
      "rangeText": "name"
    }
  ]
}
```
