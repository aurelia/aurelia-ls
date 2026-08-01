# runtime-expression-access-uses completions lane snapshot

Fixture: `packages/semantic-runtime/fixtures/pressure/runtime-expression-access-uses`
Probe file: `packages/lane-harness/probes/runtime-expression-access-uses.probes.json`
Lane: `completions`

This snapshot records observed language-server behavior. Operator verdicts live in the probe data.

## callback-local-expression-scope

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

### completion

```json
{
  "gapMarker": false,
  "isIncomplete": false,
  "kindCounts": {
    "keyword": 1,
    "method": 1,
    "property": 9
  },
  "outcome": "result",
  "totalItems": 11
}
```

### Membership

```json
{
  "mismatches": 0,
  "watched": [
    {
      "details": [
        "binding-context-slot | string | public"
      ],
      "expectation": "present",
      "found": true,
      "kinds": [
        "property"
      ],
      "label": "fallbackName"
    },
    {
      "details": [
        "binding-context-slot | { name: string; } | public | readonly"
      ],
      "expectation": "present",
      "found": true,
      "kinds": [
        "property"
      ],
      "label": "form"
    },
    {
      "details": [
        "binding-context-slot | AccessUseItem"
      ],
      "expectation": "present",
      "found": true,
      "kinds": [
        "property"
      ],
      "label": "item"
    },
    {
      "details": [
        "binding-context-slot | readonly AccessUseItem[] | public | readonly"
      ],
      "expectation": "present",
      "found": true,
      "kinds": [
        "property"
      ],
      "label": "items"
    },
    {
      "details": [],
      "expectation": "absent",
      "found": false,
      "kinds": [],
      "label": "entry"
    }
  ]
}
```
