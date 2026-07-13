# template-local-template-semantics documentHighlight lane snapshot

Fixture: `packages/semantic-runtime/fixtures/pressure/template-local-template-semantics`
Probe file: `packages/lane-harness/probes/template-local-template-semantics.probes.json`
Lane: `documentHighlight`

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

### documentHighlight

```json
{
  "outcome": "result",
  "result": [
    {
      "kind": 1,
      "range": {
        "end": {
          "character": 13,
          "line": 1
        },
        "start": {
          "character": 3,
          "line": 1
        }
      }
    },
    {
      "kind": 1,
      "range": {
        "end": {
          "character": 14,
          "line": 9
        },
        "start": {
          "character": 4,
          "line": 9
        }
      }
    },
    {
      "kind": 1,
      "range": {
        "end": {
          "character": 13,
          "line": 11
        },
        "start": {
          "character": 3,
          "line": 11
        }
      }
    },
    {
      "kind": 1,
      "range": {
        "end": {
          "character": 14,
          "line": 20
        },
        "start": {
          "character": 4,
          "line": 20
        }
      }
    },
    {
      "kind": 1,
      "range": {
        "end": {
          "character": 41,
          "line": 22
        },
        "start": {
          "character": 31,
          "line": 22
        }
      }
    }
  ]
}
```

### Resolved highlights

```json
{
  "highlightCount": 5,
  "highlights": [
    {
      "anomaly": null,
      "kind": "text",
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
      "rangeText": "mode-panel"
    },
    {
      "anomaly": null,
      "kind": "text",
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
      "rangeText": "mode-panel"
    },
    {
      "anomaly": null,
      "kind": "text",
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
      "rangeText": "mode-panel"
    },
    {
      "anomaly": null,
      "kind": "text",
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
      "rangeText": "mode-panel"
    },
    {
      "anomaly": null,
      "kind": "text",
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
      "rangeText": "mode-panel"
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

### documentHighlight

```json
{
  "outcome": "result",
  "result": [
    {
      "kind": 1,
      "range": {
        "end": {
          "character": 18,
          "line": 2
        },
        "start": {
          "character": 4,
          "line": 2
        }
      }
    },
    {
      "kind": 1,
      "range": {
        "end": {
          "character": 18,
          "line": 13
        },
        "start": {
          "character": 4,
          "line": 13
        }
      }
    },
    {
      "kind": 1,
      "range": {
        "end": {
          "character": 32,
          "line": 23
        },
        "start": {
          "character": 20,
          "line": 23
        }
      }
    },
    {
      "kind": 1,
      "range": {
        "end": {
          "character": 24,
          "line": 33
        },
        "start": {
          "character": 12,
          "line": 33
        }
      }
    },
    {
      "kind": 1,
      "range": {
        "end": {
          "character": 41,
          "line": 43
        },
        "start": {
          "character": 29,
          "line": 43
        }
      }
    }
  ]
}
```

### Resolved highlights

```json
{
  "highlightCount": 5,
  "highlights": [
    {
      "anomaly": null,
      "kind": "text",
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
      "rangeText": "one-time-value"
    },
    {
      "anomaly": null,
      "kind": "text",
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
      "rangeText": "one-time-value"
    },
    {
      "anomaly": null,
      "kind": "text",
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
      "rangeText": "oneTimeValue"
    },
    {
      "anomaly": null,
      "kind": "text",
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
      "rangeText": "oneTimeValue"
    },
    {
      "anomaly": null,
      "kind": "text",
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
      "rangeText": "oneTimeValue"
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

### documentHighlight

```json
{
  "outcome": "result",
  "result": [
    {
      "kind": 1,
      "range": {
        "end": {
          "character": 18,
          "line": 2
        },
        "start": {
          "character": 4,
          "line": 2
        }
      }
    },
    {
      "kind": 1,
      "range": {
        "end": {
          "character": 18,
          "line": 13
        },
        "start": {
          "character": 4,
          "line": 13
        }
      }
    },
    {
      "kind": 1,
      "range": {
        "end": {
          "character": 59,
          "line": 23
        },
        "start": {
          "character": 45,
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
  "highlightCount": 3,
  "highlights": [
    {
      "anomaly": null,
      "kind": "text",
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
      "rangeText": "one-time-value"
    },
    {
      "anomaly": null,
      "kind": "text",
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
      "rangeText": "one-time-value"
    },
    {
      "anomaly": null,
      "kind": "text",
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
      "rangeText": "one-time-value"
    }
  ]
}
```
