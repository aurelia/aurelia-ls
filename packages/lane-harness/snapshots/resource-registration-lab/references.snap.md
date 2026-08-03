# resource-registration-lab references lane snapshot

Fixture: `packages/semantic-runtime/fixtures/pressure/resource-registration-lab`
Probe file: `packages/lane-harness/probes/resource-registration-lab.probes.json`
Lane: `references`

This snapshot records observed language-server behavior. Operator verdicts live in the probe data.

## decorator-element-class-origin

### Probe

```json
{
  "anchor": "export class DecoratorCard",
  "at": "DecoratorCard",
  "atOccurrence": 1,
  "displayPosition": "src/resources.ts:27:14",
  "file": "src/resources.ts",
  "lspPosition": {
    "character": 13,
    "line": 26
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
          "character": 17,
          "line": 6
        },
        "start": {
          "character": 3,
          "line": 6
        }
      },
      "uri": "fixtures://pressure/resource-registration-lab/src/resource-lab-app.html"
    },
    {
      "range": {
        "end": {
          "character": 53,
          "line": 6
        },
        "start": {
          "character": 39,
          "line": 6
        }
      },
      "uri": "fixtures://pressure/resource-registration-lab/src/resource-lab-app.html"
    },
    {
      "range": {
        "end": {
          "character": 23,
          "line": 7
        },
        "start": {
          "character": 3,
          "line": 7
        }
      },
      "uri": "fixtures://pressure/resource-registration-lab/src/resource-lab-app.html"
    },
    {
      "range": {
        "end": {
          "character": 65,
          "line": 7
        },
        "start": {
          "character": 45,
          "line": 7
        }
      },
      "uri": "fixtures://pressure/resource-registration-lab/src/resource-lab-app.html"
    },
    {
      "range": {
        "end": {
          "character": 36,
          "line": 24
        },
        "start": {
          "character": 22,
          "line": 24
        }
      },
      "uri": "fixtures://pressure/resource-registration-lab/src/resource-lab-app.html"
    },
    {
      "range": {
        "end": {
          "character": 42,
          "line": 25
        },
        "start": {
          "character": 22,
          "line": 25
        }
      },
      "uri": "fixtures://pressure/resource-registration-lab/src/resource-lab-app.html"
    },
    {
      "range": {
        "end": {
          "character": 33,
          "line": 19
        },
        "start": {
          "character": 8,
          "line": 19
        }
      },
      "uri": "fixtures://pressure/resource-registration-lab/src/resources.ts"
    },
    {
      "range": {
        "end": {
          "character": 23,
          "line": 21
        },
        "start": {
          "character": 9,
          "line": 21
        }
      },
      "uri": "fixtures://pressure/resource-registration-lab/src/resources.ts"
    },
    {
      "range": {
        "end": {
          "character": 33,
          "line": 22
        },
        "start": {
          "character": 13,
          "line": 22
        }
      },
      "uri": "fixtures://pressure/resource-registration-lab/src/resources.ts"
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
      "file": "src/resource-lab-app.html",
      "range": {
        "end": {
          "character": 17,
          "line": 6
        },
        "start": {
          "character": 3,
          "line": 6
        }
      },
      "rangeText": "decorator-card",
      "uri": "fixtures://pressure/resource-registration-lab/src/resource-lab-app.html"
    },
    {
      "anomaly": null,
      "file": "src/resource-lab-app.html",
      "range": {
        "end": {
          "character": 53,
          "line": 6
        },
        "start": {
          "character": 39,
          "line": 6
        }
      },
      "rangeText": "decorator-card",
      "uri": "fixtures://pressure/resource-registration-lab/src/resource-lab-app.html"
    },
    {
      "anomaly": null,
      "file": "src/resource-lab-app.html",
      "range": {
        "end": {
          "character": 23,
          "line": 7
        },
        "start": {
          "character": 3,
          "line": 7
        }
      },
      "rangeText": "decorator-card-alias",
      "uri": "fixtures://pressure/resource-registration-lab/src/resource-lab-app.html"
    },
    {
      "anomaly": null,
      "file": "src/resource-lab-app.html",
      "range": {
        "end": {
          "character": 65,
          "line": 7
        },
        "start": {
          "character": 45,
          "line": 7
        }
      },
      "rangeText": "decorator-card-alias",
      "uri": "fixtures://pressure/resource-registration-lab/src/resource-lab-app.html"
    },
    {
      "anomaly": null,
      "file": "src/resource-lab-app.html",
      "range": {
        "end": {
          "character": 36,
          "line": 24
        },
        "start": {
          "character": 22,
          "line": 24
        }
      },
      "rangeText": "decorator-card",
      "uri": "fixtures://pressure/resource-registration-lab/src/resource-lab-app.html"
    },
    {
      "anomaly": null,
      "file": "src/resource-lab-app.html",
      "range": {
        "end": {
          "character": 42,
          "line": 25
        },
        "start": {
          "character": 22,
          "line": 25
        }
      },
      "rangeText": "decorator-card-alias",
      "uri": "fixtures://pressure/resource-registration-lab/src/resource-lab-app.html"
    },
    {
      "anomaly": null,
      "file": "src/resources.ts",
      "range": {
        "end": {
          "character": 33,
          "line": 19
        },
        "start": {
          "character": 8,
          "line": 19
        }
      },
      "rangeText": "decorator-card-annotation",
      "uri": "fixtures://pressure/resource-registration-lab/src/resources.ts"
    },
    {
      "anomaly": null,
      "file": "src/resources.ts",
      "range": {
        "end": {
          "character": 23,
          "line": 21
        },
        "start": {
          "character": 9,
          "line": 21
        }
      },
      "rangeText": "decorator-card",
      "uri": "fixtures://pressure/resource-registration-lab/src/resources.ts"
    },
    {
      "anomaly": null,
      "file": "src/resources.ts",
      "range": {
        "end": {
          "character": 33,
          "line": 22
        },
        "start": {
          "character": 13,
          "line": 22
        }
      },
      "rangeText": "decorator-card-alias",
      "uri": "fixtures://pressure/resource-registration-lab/src/resources.ts"
    }
  ]
}
```

## decorator-element-primary-name-origin

### Probe

```json
{
  "anchor": "name: 'decorator-card'",
  "at": "decorator-card",
  "atOccurrence": 1,
  "displayPosition": "src/resources.ts:22:10",
  "file": "src/resources.ts",
  "lspPosition": {
    "character": 9,
    "line": 21
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
          "character": 17,
          "line": 6
        },
        "start": {
          "character": 3,
          "line": 6
        }
      },
      "uri": "fixtures://pressure/resource-registration-lab/src/resource-lab-app.html"
    },
    {
      "range": {
        "end": {
          "character": 53,
          "line": 6
        },
        "start": {
          "character": 39,
          "line": 6
        }
      },
      "uri": "fixtures://pressure/resource-registration-lab/src/resource-lab-app.html"
    },
    {
      "range": {
        "end": {
          "character": 23,
          "line": 7
        },
        "start": {
          "character": 3,
          "line": 7
        }
      },
      "uri": "fixtures://pressure/resource-registration-lab/src/resource-lab-app.html"
    },
    {
      "range": {
        "end": {
          "character": 65,
          "line": 7
        },
        "start": {
          "character": 45,
          "line": 7
        }
      },
      "uri": "fixtures://pressure/resource-registration-lab/src/resource-lab-app.html"
    },
    {
      "range": {
        "end": {
          "character": 36,
          "line": 24
        },
        "start": {
          "character": 22,
          "line": 24
        }
      },
      "uri": "fixtures://pressure/resource-registration-lab/src/resource-lab-app.html"
    },
    {
      "range": {
        "end": {
          "character": 42,
          "line": 25
        },
        "start": {
          "character": 22,
          "line": 25
        }
      },
      "uri": "fixtures://pressure/resource-registration-lab/src/resource-lab-app.html"
    },
    {
      "range": {
        "end": {
          "character": 33,
          "line": 19
        },
        "start": {
          "character": 8,
          "line": 19
        }
      },
      "uri": "fixtures://pressure/resource-registration-lab/src/resources.ts"
    },
    {
      "range": {
        "end": {
          "character": 23,
          "line": 21
        },
        "start": {
          "character": 9,
          "line": 21
        }
      },
      "uri": "fixtures://pressure/resource-registration-lab/src/resources.ts"
    },
    {
      "range": {
        "end": {
          "character": 33,
          "line": 22
        },
        "start": {
          "character": 13,
          "line": 22
        }
      },
      "uri": "fixtures://pressure/resource-registration-lab/src/resources.ts"
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
      "file": "src/resource-lab-app.html",
      "range": {
        "end": {
          "character": 17,
          "line": 6
        },
        "start": {
          "character": 3,
          "line": 6
        }
      },
      "rangeText": "decorator-card",
      "uri": "fixtures://pressure/resource-registration-lab/src/resource-lab-app.html"
    },
    {
      "anomaly": null,
      "file": "src/resource-lab-app.html",
      "range": {
        "end": {
          "character": 53,
          "line": 6
        },
        "start": {
          "character": 39,
          "line": 6
        }
      },
      "rangeText": "decorator-card",
      "uri": "fixtures://pressure/resource-registration-lab/src/resource-lab-app.html"
    },
    {
      "anomaly": null,
      "file": "src/resource-lab-app.html",
      "range": {
        "end": {
          "character": 23,
          "line": 7
        },
        "start": {
          "character": 3,
          "line": 7
        }
      },
      "rangeText": "decorator-card-alias",
      "uri": "fixtures://pressure/resource-registration-lab/src/resource-lab-app.html"
    },
    {
      "anomaly": null,
      "file": "src/resource-lab-app.html",
      "range": {
        "end": {
          "character": 65,
          "line": 7
        },
        "start": {
          "character": 45,
          "line": 7
        }
      },
      "rangeText": "decorator-card-alias",
      "uri": "fixtures://pressure/resource-registration-lab/src/resource-lab-app.html"
    },
    {
      "anomaly": null,
      "file": "src/resource-lab-app.html",
      "range": {
        "end": {
          "character": 36,
          "line": 24
        },
        "start": {
          "character": 22,
          "line": 24
        }
      },
      "rangeText": "decorator-card",
      "uri": "fixtures://pressure/resource-registration-lab/src/resource-lab-app.html"
    },
    {
      "anomaly": null,
      "file": "src/resource-lab-app.html",
      "range": {
        "end": {
          "character": 42,
          "line": 25
        },
        "start": {
          "character": 22,
          "line": 25
        }
      },
      "rangeText": "decorator-card-alias",
      "uri": "fixtures://pressure/resource-registration-lab/src/resource-lab-app.html"
    },
    {
      "anomaly": null,
      "file": "src/resources.ts",
      "range": {
        "end": {
          "character": 33,
          "line": 19
        },
        "start": {
          "character": 8,
          "line": 19
        }
      },
      "rangeText": "decorator-card-annotation",
      "uri": "fixtures://pressure/resource-registration-lab/src/resources.ts"
    },
    {
      "anomaly": null,
      "file": "src/resources.ts",
      "range": {
        "end": {
          "character": 23,
          "line": 21
        },
        "start": {
          "character": 9,
          "line": 21
        }
      },
      "rangeText": "decorator-card",
      "uri": "fixtures://pressure/resource-registration-lab/src/resources.ts"
    },
    {
      "anomaly": null,
      "file": "src/resources.ts",
      "range": {
        "end": {
          "character": 33,
          "line": 22
        },
        "start": {
          "character": 13,
          "line": 22
        }
      },
      "rangeText": "decorator-card-alias",
      "uri": "fixtures://pressure/resource-registration-lab/src/resources.ts"
    }
  ]
}
```

## decorator-element-alias-origin

### Probe

```json
{
  "anchor": "aliases: ['decorator-card-alias']",
  "at": "decorator-card-alias",
  "atOccurrence": 1,
  "displayPosition": "src/resources.ts:23:14",
  "file": "src/resources.ts",
  "lspPosition": {
    "character": 13,
    "line": 22
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
          "character": 17,
          "line": 6
        },
        "start": {
          "character": 3,
          "line": 6
        }
      },
      "uri": "fixtures://pressure/resource-registration-lab/src/resource-lab-app.html"
    },
    {
      "range": {
        "end": {
          "character": 53,
          "line": 6
        },
        "start": {
          "character": 39,
          "line": 6
        }
      },
      "uri": "fixtures://pressure/resource-registration-lab/src/resource-lab-app.html"
    },
    {
      "range": {
        "end": {
          "character": 23,
          "line": 7
        },
        "start": {
          "character": 3,
          "line": 7
        }
      },
      "uri": "fixtures://pressure/resource-registration-lab/src/resource-lab-app.html"
    },
    {
      "range": {
        "end": {
          "character": 65,
          "line": 7
        },
        "start": {
          "character": 45,
          "line": 7
        }
      },
      "uri": "fixtures://pressure/resource-registration-lab/src/resource-lab-app.html"
    },
    {
      "range": {
        "end": {
          "character": 36,
          "line": 24
        },
        "start": {
          "character": 22,
          "line": 24
        }
      },
      "uri": "fixtures://pressure/resource-registration-lab/src/resource-lab-app.html"
    },
    {
      "range": {
        "end": {
          "character": 42,
          "line": 25
        },
        "start": {
          "character": 22,
          "line": 25
        }
      },
      "uri": "fixtures://pressure/resource-registration-lab/src/resource-lab-app.html"
    },
    {
      "range": {
        "end": {
          "character": 33,
          "line": 19
        },
        "start": {
          "character": 8,
          "line": 19
        }
      },
      "uri": "fixtures://pressure/resource-registration-lab/src/resources.ts"
    },
    {
      "range": {
        "end": {
          "character": 23,
          "line": 21
        },
        "start": {
          "character": 9,
          "line": 21
        }
      },
      "uri": "fixtures://pressure/resource-registration-lab/src/resources.ts"
    },
    {
      "range": {
        "end": {
          "character": 33,
          "line": 22
        },
        "start": {
          "character": 13,
          "line": 22
        }
      },
      "uri": "fixtures://pressure/resource-registration-lab/src/resources.ts"
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
      "file": "src/resource-lab-app.html",
      "range": {
        "end": {
          "character": 17,
          "line": 6
        },
        "start": {
          "character": 3,
          "line": 6
        }
      },
      "rangeText": "decorator-card",
      "uri": "fixtures://pressure/resource-registration-lab/src/resource-lab-app.html"
    },
    {
      "anomaly": null,
      "file": "src/resource-lab-app.html",
      "range": {
        "end": {
          "character": 53,
          "line": 6
        },
        "start": {
          "character": 39,
          "line": 6
        }
      },
      "rangeText": "decorator-card",
      "uri": "fixtures://pressure/resource-registration-lab/src/resource-lab-app.html"
    },
    {
      "anomaly": null,
      "file": "src/resource-lab-app.html",
      "range": {
        "end": {
          "character": 23,
          "line": 7
        },
        "start": {
          "character": 3,
          "line": 7
        }
      },
      "rangeText": "decorator-card-alias",
      "uri": "fixtures://pressure/resource-registration-lab/src/resource-lab-app.html"
    },
    {
      "anomaly": null,
      "file": "src/resource-lab-app.html",
      "range": {
        "end": {
          "character": 65,
          "line": 7
        },
        "start": {
          "character": 45,
          "line": 7
        }
      },
      "rangeText": "decorator-card-alias",
      "uri": "fixtures://pressure/resource-registration-lab/src/resource-lab-app.html"
    },
    {
      "anomaly": null,
      "file": "src/resource-lab-app.html",
      "range": {
        "end": {
          "character": 36,
          "line": 24
        },
        "start": {
          "character": 22,
          "line": 24
        }
      },
      "rangeText": "decorator-card",
      "uri": "fixtures://pressure/resource-registration-lab/src/resource-lab-app.html"
    },
    {
      "anomaly": null,
      "file": "src/resource-lab-app.html",
      "range": {
        "end": {
          "character": 42,
          "line": 25
        },
        "start": {
          "character": 22,
          "line": 25
        }
      },
      "rangeText": "decorator-card-alias",
      "uri": "fixtures://pressure/resource-registration-lab/src/resource-lab-app.html"
    },
    {
      "anomaly": null,
      "file": "src/resources.ts",
      "range": {
        "end": {
          "character": 33,
          "line": 19
        },
        "start": {
          "character": 8,
          "line": 19
        }
      },
      "rangeText": "decorator-card-annotation",
      "uri": "fixtures://pressure/resource-registration-lab/src/resources.ts"
    },
    {
      "anomaly": null,
      "file": "src/resources.ts",
      "range": {
        "end": {
          "character": 23,
          "line": 21
        },
        "start": {
          "character": 9,
          "line": 21
        }
      },
      "rangeText": "decorator-card",
      "uri": "fixtures://pressure/resource-registration-lab/src/resources.ts"
    },
    {
      "anomaly": null,
      "file": "src/resources.ts",
      "range": {
        "end": {
          "character": 33,
          "line": 22
        },
        "start": {
          "character": 13,
          "line": 22
        }
      },
      "rangeText": "decorator-card-alias",
      "uri": "fixtures://pressure/resource-registration-lab/src/resources.ts"
    }
  ]
}
```

## decorator-element-ts-use-origin

### Probe

```json
{
  "anchor": "    DecoratorCard,",
  "at": "DecoratorCard",
  "atOccurrence": 1,
  "displayPosition": "src/resource-lab-app.ts:25:5",
  "file": "src/resource-lab-app.ts",
  "lspPosition": {
    "character": 4,
    "line": 24
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
          "character": 17,
          "line": 6
        },
        "start": {
          "character": 3,
          "line": 6
        }
      },
      "uri": "fixtures://pressure/resource-registration-lab/src/resource-lab-app.html"
    },
    {
      "range": {
        "end": {
          "character": 53,
          "line": 6
        },
        "start": {
          "character": 39,
          "line": 6
        }
      },
      "uri": "fixtures://pressure/resource-registration-lab/src/resource-lab-app.html"
    },
    {
      "range": {
        "end": {
          "character": 23,
          "line": 7
        },
        "start": {
          "character": 3,
          "line": 7
        }
      },
      "uri": "fixtures://pressure/resource-registration-lab/src/resource-lab-app.html"
    },
    {
      "range": {
        "end": {
          "character": 65,
          "line": 7
        },
        "start": {
          "character": 45,
          "line": 7
        }
      },
      "uri": "fixtures://pressure/resource-registration-lab/src/resource-lab-app.html"
    },
    {
      "range": {
        "end": {
          "character": 36,
          "line": 24
        },
        "start": {
          "character": 22,
          "line": 24
        }
      },
      "uri": "fixtures://pressure/resource-registration-lab/src/resource-lab-app.html"
    },
    {
      "range": {
        "end": {
          "character": 42,
          "line": 25
        },
        "start": {
          "character": 22,
          "line": 25
        }
      },
      "uri": "fixtures://pressure/resource-registration-lab/src/resource-lab-app.html"
    },
    {
      "range": {
        "end": {
          "character": 33,
          "line": 19
        },
        "start": {
          "character": 8,
          "line": 19
        }
      },
      "uri": "fixtures://pressure/resource-registration-lab/src/resources.ts"
    },
    {
      "range": {
        "end": {
          "character": 23,
          "line": 21
        },
        "start": {
          "character": 9,
          "line": 21
        }
      },
      "uri": "fixtures://pressure/resource-registration-lab/src/resources.ts"
    },
    {
      "range": {
        "end": {
          "character": 33,
          "line": 22
        },
        "start": {
          "character": 13,
          "line": 22
        }
      },
      "uri": "fixtures://pressure/resource-registration-lab/src/resources.ts"
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
      "file": "src/resource-lab-app.html",
      "range": {
        "end": {
          "character": 17,
          "line": 6
        },
        "start": {
          "character": 3,
          "line": 6
        }
      },
      "rangeText": "decorator-card",
      "uri": "fixtures://pressure/resource-registration-lab/src/resource-lab-app.html"
    },
    {
      "anomaly": null,
      "file": "src/resource-lab-app.html",
      "range": {
        "end": {
          "character": 53,
          "line": 6
        },
        "start": {
          "character": 39,
          "line": 6
        }
      },
      "rangeText": "decorator-card",
      "uri": "fixtures://pressure/resource-registration-lab/src/resource-lab-app.html"
    },
    {
      "anomaly": null,
      "file": "src/resource-lab-app.html",
      "range": {
        "end": {
          "character": 23,
          "line": 7
        },
        "start": {
          "character": 3,
          "line": 7
        }
      },
      "rangeText": "decorator-card-alias",
      "uri": "fixtures://pressure/resource-registration-lab/src/resource-lab-app.html"
    },
    {
      "anomaly": null,
      "file": "src/resource-lab-app.html",
      "range": {
        "end": {
          "character": 65,
          "line": 7
        },
        "start": {
          "character": 45,
          "line": 7
        }
      },
      "rangeText": "decorator-card-alias",
      "uri": "fixtures://pressure/resource-registration-lab/src/resource-lab-app.html"
    },
    {
      "anomaly": null,
      "file": "src/resource-lab-app.html",
      "range": {
        "end": {
          "character": 36,
          "line": 24
        },
        "start": {
          "character": 22,
          "line": 24
        }
      },
      "rangeText": "decorator-card",
      "uri": "fixtures://pressure/resource-registration-lab/src/resource-lab-app.html"
    },
    {
      "anomaly": null,
      "file": "src/resource-lab-app.html",
      "range": {
        "end": {
          "character": 42,
          "line": 25
        },
        "start": {
          "character": 22,
          "line": 25
        }
      },
      "rangeText": "decorator-card-alias",
      "uri": "fixtures://pressure/resource-registration-lab/src/resource-lab-app.html"
    },
    {
      "anomaly": null,
      "file": "src/resources.ts",
      "range": {
        "end": {
          "character": 33,
          "line": 19
        },
        "start": {
          "character": 8,
          "line": 19
        }
      },
      "rangeText": "decorator-card-annotation",
      "uri": "fixtures://pressure/resource-registration-lab/src/resources.ts"
    },
    {
      "anomaly": null,
      "file": "src/resources.ts",
      "range": {
        "end": {
          "character": 23,
          "line": 21
        },
        "start": {
          "character": 9,
          "line": 21
        }
      },
      "rangeText": "decorator-card",
      "uri": "fixtures://pressure/resource-registration-lab/src/resources.ts"
    },
    {
      "anomaly": null,
      "file": "src/resources.ts",
      "range": {
        "end": {
          "character": 33,
          "line": 22
        },
        "start": {
          "character": 13,
          "line": 22
        }
      },
      "rangeText": "decorator-card-alias",
      "uri": "fixtures://pressure/resource-registration-lab/src/resources.ts"
    }
  ]
}
```

## static-element-class-origin

### Probe

```json
{
  "anchor": "export class StaticPanel",
  "at": "StaticPanel",
  "atOccurrence": 1,
  "displayPosition": "src/resources.ts:31:14",
  "file": "src/resources.ts",
  "lspPosition": {
    "character": 13,
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
          "character": 15,
          "line": 8
        },
        "start": {
          "character": 3,
          "line": 8
        }
      },
      "uri": "fixtures://pressure/resource-registration-lab/src/resource-lab-app.html"
    },
    {
      "range": {
        "end": {
          "character": 49,
          "line": 8
        },
        "start": {
          "character": 37,
          "line": 8
        }
      },
      "uri": "fixtures://pressure/resource-registration-lab/src/resource-lab-app.html"
    },
    {
      "range": {
        "end": {
          "character": 21,
          "line": 9
        },
        "start": {
          "character": 3,
          "line": 9
        }
      },
      "uri": "fixtures://pressure/resource-registration-lab/src/resource-lab-app.html"
    },
    {
      "range": {
        "end": {
          "character": 61,
          "line": 9
        },
        "start": {
          "character": 43,
          "line": 9
        }
      },
      "uri": "fixtures://pressure/resource-registration-lab/src/resource-lab-app.html"
    },
    {
      "range": {
        "end": {
          "character": 23,
          "line": 33
        },
        "start": {
          "character": 11,
          "line": 33
        }
      },
      "uri": "fixtures://pressure/resource-registration-lab/src/resources.ts"
    },
    {
      "range": {
        "end": {
          "character": 33,
          "line": 34
        },
        "start": {
          "character": 15,
          "line": 34
        }
      },
      "uri": "fixtures://pressure/resource-registration-lab/src/resources.ts"
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
  "locationCount": 6,
  "locations": [
    {
      "anomaly": null,
      "file": "src/resource-lab-app.html",
      "range": {
        "end": {
          "character": 15,
          "line": 8
        },
        "start": {
          "character": 3,
          "line": 8
        }
      },
      "rangeText": "static-panel",
      "uri": "fixtures://pressure/resource-registration-lab/src/resource-lab-app.html"
    },
    {
      "anomaly": null,
      "file": "src/resource-lab-app.html",
      "range": {
        "end": {
          "character": 49,
          "line": 8
        },
        "start": {
          "character": 37,
          "line": 8
        }
      },
      "rangeText": "static-panel",
      "uri": "fixtures://pressure/resource-registration-lab/src/resource-lab-app.html"
    },
    {
      "anomaly": null,
      "file": "src/resource-lab-app.html",
      "range": {
        "end": {
          "character": 21,
          "line": 9
        },
        "start": {
          "character": 3,
          "line": 9
        }
      },
      "rangeText": "static-panel-alias",
      "uri": "fixtures://pressure/resource-registration-lab/src/resource-lab-app.html"
    },
    {
      "anomaly": null,
      "file": "src/resource-lab-app.html",
      "range": {
        "end": {
          "character": 61,
          "line": 9
        },
        "start": {
          "character": 43,
          "line": 9
        }
      },
      "rangeText": "static-panel-alias",
      "uri": "fixtures://pressure/resource-registration-lab/src/resource-lab-app.html"
    },
    {
      "anomaly": null,
      "file": "src/resources.ts",
      "range": {
        "end": {
          "character": 23,
          "line": 33
        },
        "start": {
          "character": 11,
          "line": 33
        }
      },
      "rangeText": "static-panel",
      "uri": "fixtures://pressure/resource-registration-lab/src/resources.ts"
    },
    {
      "anomaly": null,
      "file": "src/resources.ts",
      "range": {
        "end": {
          "character": 33,
          "line": 34
        },
        "start": {
          "character": 15,
          "line": 34
        }
      },
      "rangeText": "static-panel-alias",
      "uri": "fixtures://pressure/resource-registration-lab/src/resources.ts"
    }
  ]
}
```

## define-call-element-class-origin

### Probe

```json
{
  "anchor": "export class DefinedBadge",
  "at": "DefinedBadge",
  "atOccurrence": 1,
  "displayPosition": "src/resources.ts:43:14",
  "file": "src/resources.ts",
  "lspPosition": {
    "character": 13,
    "line": 42
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
          "character": 16,
          "line": 10
        },
        "start": {
          "character": 3,
          "line": 10
        }
      },
      "uri": "fixtures://pressure/resource-registration-lab/src/resource-lab-app.html"
    },
    {
      "range": {
        "end": {
          "character": 51,
          "line": 10
        },
        "start": {
          "character": 38,
          "line": 10
        }
      },
      "uri": "fixtures://pressure/resource-registration-lab/src/resource-lab-app.html"
    },
    {
      "range": {
        "end": {
          "character": 22,
          "line": 11
        },
        "start": {
          "character": 3,
          "line": 11
        }
      },
      "uri": "fixtures://pressure/resource-registration-lab/src/resource-lab-app.html"
    },
    {
      "range": {
        "end": {
          "character": 63,
          "line": 11
        },
        "start": {
          "character": 44,
          "line": 11
        }
      },
      "uri": "fixtures://pressure/resource-registration-lab/src/resource-lab-app.html"
    },
    {
      "range": {
        "end": {
          "character": 22,
          "line": 47
        },
        "start": {
          "character": 9,
          "line": 47
        }
      },
      "uri": "fixtures://pressure/resource-registration-lab/src/resources.ts"
    },
    {
      "range": {
        "end": {
          "character": 32,
          "line": 48
        },
        "start": {
          "character": 13,
          "line": 48
        }
      },
      "uri": "fixtures://pressure/resource-registration-lab/src/resources.ts"
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
  "locationCount": 6,
  "locations": [
    {
      "anomaly": null,
      "file": "src/resource-lab-app.html",
      "range": {
        "end": {
          "character": 16,
          "line": 10
        },
        "start": {
          "character": 3,
          "line": 10
        }
      },
      "rangeText": "defined-badge",
      "uri": "fixtures://pressure/resource-registration-lab/src/resource-lab-app.html"
    },
    {
      "anomaly": null,
      "file": "src/resource-lab-app.html",
      "range": {
        "end": {
          "character": 51,
          "line": 10
        },
        "start": {
          "character": 38,
          "line": 10
        }
      },
      "rangeText": "defined-badge",
      "uri": "fixtures://pressure/resource-registration-lab/src/resource-lab-app.html"
    },
    {
      "anomaly": null,
      "file": "src/resource-lab-app.html",
      "range": {
        "end": {
          "character": 22,
          "line": 11
        },
        "start": {
          "character": 3,
          "line": 11
        }
      },
      "rangeText": "defined-badge-alias",
      "uri": "fixtures://pressure/resource-registration-lab/src/resource-lab-app.html"
    },
    {
      "anomaly": null,
      "file": "src/resource-lab-app.html",
      "range": {
        "end": {
          "character": 63,
          "line": 11
        },
        "start": {
          "character": 44,
          "line": 11
        }
      },
      "rangeText": "defined-badge-alias",
      "uri": "fixtures://pressure/resource-registration-lab/src/resource-lab-app.html"
    },
    {
      "anomaly": null,
      "file": "src/resources.ts",
      "range": {
        "end": {
          "character": 22,
          "line": 47
        },
        "start": {
          "character": 9,
          "line": 47
        }
      },
      "rangeText": "defined-badge",
      "uri": "fixtures://pressure/resource-registration-lab/src/resources.ts"
    },
    {
      "anomaly": null,
      "file": "src/resources.ts",
      "range": {
        "end": {
          "character": 32,
          "line": 48
        },
        "start": {
          "character": 13,
          "line": 48
        }
      },
      "rangeText": "defined-badge-alias",
      "uri": "fixtures://pressure/resource-registration-lab/src/resources.ts"
    }
  ]
}
```

## unadmitted-convention-class-stays-typescript-only

### Probe

```json
{
  "anchor": "export class ConventionPanel",
  "at": "ConventionPanel",
  "atOccurrence": 1,
  "displayPosition": "src/convention-panel.ts:1:14",
  "file": "src/convention-panel.ts",
  "lspPosition": {
    "character": 13,
    "line": 0
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
          "line": 0
        },
        "start": {
          "character": 13,
          "line": 0
        }
      },
      "uri": "fixtures://pressure/resource-registration-lab/src/convention-panel.ts"
    },
    {
      "range": {
        "end": {
          "character": 24,
          "line": 2
        },
        "start": {
          "character": 9,
          "line": 2
        }
      },
      "uri": "fixtures://pressure/resource-registration-lab/src/resource-lab-app.ts"
    },
    {
      "range": {
        "end": {
          "character": 19,
          "line": 23
        },
        "start": {
          "character": 4,
          "line": 23
        }
      },
      "uri": "fixtures://pressure/resource-registration-lab/src/resource-lab-app.ts"
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
      "file": "src/convention-panel.ts",
      "range": {
        "end": {
          "character": 28,
          "line": 0
        },
        "start": {
          "character": 13,
          "line": 0
        }
      },
      "rangeText": "ConventionPanel",
      "uri": "fixtures://pressure/resource-registration-lab/src/convention-panel.ts"
    },
    {
      "anomaly": null,
      "file": "src/resource-lab-app.ts",
      "range": {
        "end": {
          "character": 24,
          "line": 2
        },
        "start": {
          "character": 9,
          "line": 2
        }
      },
      "rangeText": "ConventionPanel",
      "uri": "fixtures://pressure/resource-registration-lab/src/resource-lab-app.ts"
    },
    {
      "anomaly": null,
      "file": "src/resource-lab-app.ts",
      "range": {
        "end": {
          "character": 19,
          "line": 23
        },
        "start": {
          "character": 4,
          "line": 23
        }
      },
      "rangeText": "ConventionPanel",
      "uri": "fixtures://pressure/resource-registration-lab/src/resource-lab-app.ts"
    }
  ]
}
```

## custom-attribute-class-origin

### Probe

```json
{
  "anchor": "export class DecoratorTooltip",
  "at": "DecoratorTooltip",
  "atOccurrence": 1,
  "displayPosition": "src/resources.ts:60:14",
  "file": "src/resources.ts",
  "lspPosition": {
    "character": 13,
    "line": 59
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
          "line": 14
        },
        "start": {
          "character": 11,
          "line": 14
        }
      },
      "uri": "fixtures://pressure/resource-registration-lab/src/resource-lab-app.html"
    },
    {
      "range": {
        "end": {
          "character": 24,
          "line": 15
        },
        "start": {
          "character": 11,
          "line": 15
        }
      },
      "uri": "fixtures://pressure/resource-registration-lab/src/resource-lab-app.html"
    },
    {
      "range": {
        "end": {
          "character": 26,
          "line": 54
        },
        "start": {
          "character": 9,
          "line": 54
        }
      },
      "uri": "fixtures://pressure/resource-registration-lab/src/resources.ts"
    },
    {
      "range": {
        "end": {
          "character": 26,
          "line": 55
        },
        "start": {
          "character": 13,
          "line": 55
        }
      },
      "uri": "fixtures://pressure/resource-registration-lab/src/resources.ts"
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
      "file": "src/resource-lab-app.html",
      "range": {
        "end": {
          "character": 28,
          "line": 14
        },
        "start": {
          "character": 11,
          "line": 14
        }
      },
      "rangeText": "decorator-tooltip",
      "uri": "fixtures://pressure/resource-registration-lab/src/resource-lab-app.html"
    },
    {
      "anomaly": null,
      "file": "src/resource-lab-app.html",
      "range": {
        "end": {
          "character": 24,
          "line": 15
        },
        "start": {
          "character": 11,
          "line": 15
        }
      },
      "rangeText": "decorator-tip",
      "uri": "fixtures://pressure/resource-registration-lab/src/resource-lab-app.html"
    },
    {
      "anomaly": null,
      "file": "src/resources.ts",
      "range": {
        "end": {
          "character": 26,
          "line": 54
        },
        "start": {
          "character": 9,
          "line": 54
        }
      },
      "rangeText": "decorator-tooltip",
      "uri": "fixtures://pressure/resource-registration-lab/src/resources.ts"
    },
    {
      "anomaly": null,
      "file": "src/resources.ts",
      "range": {
        "end": {
          "character": 26,
          "line": 55
        },
        "start": {
          "character": 13,
          "line": 55
        }
      },
      "rangeText": "decorator-tip",
      "uri": "fixtures://pressure/resource-registration-lab/src/resources.ts"
    }
  ]
}
```

## template-controller-class-origin

### Probe

```json
{
  "anchor": "export class SurfaceGate",
  "at": "SurfaceGate",
  "atOccurrence": 1,
  "displayPosition": "src/resources.ts:93:14",
  "file": "src/resources.ts",
  "lspPosition": {
    "character": 13,
    "line": 92
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
          "line": 20
        },
        "start": {
          "character": 11,
          "line": 20
        }
      },
      "uri": "fixtures://pressure/resource-registration-lab/src/resource-lab-app.html"
    },
    {
      "range": {
        "end": {
          "character": 23,
          "line": 21
        },
        "start": {
          "character": 11,
          "line": 21
        }
      },
      "uri": "fixtures://pressure/resource-registration-lab/src/resource-lab-app.html"
    },
    {
      "range": {
        "end": {
          "character": 21,
          "line": 87
        },
        "start": {
          "character": 9,
          "line": 87
        }
      },
      "uri": "fixtures://pressure/resource-registration-lab/src/resources.ts"
    },
    {
      "range": {
        "end": {
          "character": 25,
          "line": 88
        },
        "start": {
          "character": 13,
          "line": 88
        }
      },
      "uri": "fixtures://pressure/resource-registration-lab/src/resources.ts"
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
      "file": "src/resource-lab-app.html",
      "range": {
        "end": {
          "character": 23,
          "line": 20
        },
        "start": {
          "character": 11,
          "line": 20
        }
      },
      "rangeText": "surface-gate",
      "uri": "fixtures://pressure/resource-registration-lab/src/resource-lab-app.html"
    },
    {
      "anomaly": null,
      "file": "src/resource-lab-app.html",
      "range": {
        "end": {
          "character": 23,
          "line": 21
        },
        "start": {
          "character": 11,
          "line": 21
        }
      },
      "rangeText": "surface-door",
      "uri": "fixtures://pressure/resource-registration-lab/src/resource-lab-app.html"
    },
    {
      "anomaly": null,
      "file": "src/resources.ts",
      "range": {
        "end": {
          "character": 21,
          "line": 87
        },
        "start": {
          "character": 9,
          "line": 87
        }
      },
      "rangeText": "surface-gate",
      "uri": "fixtures://pressure/resource-registration-lab/src/resources.ts"
    },
    {
      "anomaly": null,
      "file": "src/resources.ts",
      "range": {
        "end": {
          "character": 25,
          "line": 88
        },
        "start": {
          "character": 13,
          "line": 88
        }
      },
      "rangeText": "surface-door",
      "uri": "fixtures://pressure/resource-registration-lab/src/resources.ts"
    }
  ]
}
```

## value-converter-class-origin

### Probe

```json
{
  "anchor": "export class FormatNameValueConverter",
  "at": "FormatNameValueConverter",
  "atOccurrence": 1,
  "displayPosition": "src/resources.ts:101:14",
  "file": "src/resources.ts",
  "lspPosition": {
    "character": 13,
    "line": 100
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
          "line": 27
        },
        "start": {
          "character": 18,
          "line": 27
        }
      },
      "uri": "fixtures://pressure/resource-registration-lab/src/resource-lab-app.html"
    },
    {
      "range": {
        "end": {
          "character": 25,
          "line": 28
        },
        "start": {
          "character": 18,
          "line": 28
        }
      },
      "uri": "fixtures://pressure/resource-registration-lab/src/resource-lab-app.html"
    },
    {
      "range": {
        "end": {
          "character": 19,
          "line": 97
        },
        "start": {
          "character": 9,
          "line": 97
        }
      },
      "uri": "fixtures://pressure/resource-registration-lab/src/resources.ts"
    },
    {
      "range": {
        "end": {
          "character": 20,
          "line": 98
        },
        "start": {
          "character": 13,
          "line": 98
        }
      },
      "uri": "fixtures://pressure/resource-registration-lab/src/resources.ts"
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
      "file": "src/resource-lab-app.html",
      "range": {
        "end": {
          "character": 28,
          "line": 27
        },
        "start": {
          "character": 18,
          "line": 27
        }
      },
      "rangeText": "formatName",
      "uri": "fixtures://pressure/resource-registration-lab/src/resource-lab-app.html"
    },
    {
      "anomaly": null,
      "file": "src/resource-lab-app.html",
      "range": {
        "end": {
          "character": 25,
          "line": 28
        },
        "start": {
          "character": 18,
          "line": 28
        }
      },
      "rangeText": "fmtName",
      "uri": "fixtures://pressure/resource-registration-lab/src/resource-lab-app.html"
    },
    {
      "anomaly": null,
      "file": "src/resources.ts",
      "range": {
        "end": {
          "character": 19,
          "line": 97
        },
        "start": {
          "character": 9,
          "line": 97
        }
      },
      "rangeText": "formatName",
      "uri": "fixtures://pressure/resource-registration-lab/src/resources.ts"
    },
    {
      "anomaly": null,
      "file": "src/resources.ts",
      "range": {
        "end": {
          "character": 20,
          "line": 98
        },
        "start": {
          "character": 13,
          "line": 98
        }
      },
      "rangeText": "fmtName",
      "uri": "fixtures://pressure/resource-registration-lab/src/resources.ts"
    }
  ]
}
```

## binding-behavior-class-origin

### Probe

```json
{
  "anchor": "export class TrackEditBindingBehavior",
  "at": "TrackEditBindingBehavior",
  "atOccurrence": 1,
  "displayPosition": "src/resources.ts:134:14",
  "file": "src/resources.ts",
  "lspPosition": {
    "character": 13,
    "line": 133
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
          "character": 38,
          "line": 33
        },
        "start": {
          "character": 29,
          "line": 33
        }
      },
      "uri": "fixtures://pressure/resource-registration-lab/src/resource-lab-app.html"
    },
    {
      "range": {
        "end": {
          "character": 34,
          "line": 34
        },
        "start": {
          "character": 29,
          "line": 34
        }
      },
      "uri": "fixtures://pressure/resource-registration-lab/src/resource-lab-app.html"
    },
    {
      "range": {
        "end": {
          "character": 18,
          "line": 130
        },
        "start": {
          "character": 9,
          "line": 130
        }
      },
      "uri": "fixtures://pressure/resource-registration-lab/src/resources.ts"
    },
    {
      "range": {
        "end": {
          "character": 18,
          "line": 131
        },
        "start": {
          "character": 13,
          "line": 131
        }
      },
      "uri": "fixtures://pressure/resource-registration-lab/src/resources.ts"
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
      "file": "src/resource-lab-app.html",
      "range": {
        "end": {
          "character": 38,
          "line": 33
        },
        "start": {
          "character": 29,
          "line": 33
        }
      },
      "rangeText": "trackEdit",
      "uri": "fixtures://pressure/resource-registration-lab/src/resource-lab-app.html"
    },
    {
      "anomaly": null,
      "file": "src/resource-lab-app.html",
      "range": {
        "end": {
          "character": 34,
          "line": 34
        },
        "start": {
          "character": 29,
          "line": 34
        }
      },
      "rangeText": "track",
      "uri": "fixtures://pressure/resource-registration-lab/src/resource-lab-app.html"
    },
    {
      "anomaly": null,
      "file": "src/resources.ts",
      "range": {
        "end": {
          "character": 18,
          "line": 130
        },
        "start": {
          "character": 9,
          "line": 130
        }
      },
      "rangeText": "trackEdit",
      "uri": "fixtures://pressure/resource-registration-lab/src/resources.ts"
    },
    {
      "anomaly": null,
      "file": "src/resources.ts",
      "range": {
        "end": {
          "character": 18,
          "line": 131
        },
        "start": {
          "character": 13,
          "line": 131
        }
      },
      "rangeText": "track",
      "uri": "fixtures://pressure/resource-registration-lab/src/resources.ts"
    }
  ]
}
```
