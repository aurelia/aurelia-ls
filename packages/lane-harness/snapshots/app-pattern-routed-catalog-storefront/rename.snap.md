# app-pattern-routed-catalog-storefront rename lane snapshot

Fixture: `packages/semantic-runtime/fixtures/pressure/app-pattern-routed-catalog-storefront`
Probe file: `packages/lane-harness/probes/app-pattern-routed-catalog-storefront.probes.json`
Lane: `rename`

This snapshot records observed language-server behavior. Operator verdicts live in the probe data.

## template-member-searchText

### Probe

```json
{
  "anchor": "state.items.searchText",
  "at": "searchText",
  "atOccurrence": 1,
  "displayPosition": "src/routes/item-list-route.html:8:54",
  "file": "src/routes/item-list-route.html",
  "lspPosition": {
    "character": 53,
    "line": 7
  },
  "newName": "queryText",
  "occurrence": 1
}
```

### prepareRename

```json
{
  "outcome": "result",
  "result": {
    "placeholder": "searchText",
    "range": {
      "end": {
        "character": 63,
        "line": 7
      },
      "start": {
        "character": 53,
        "line": 7
      }
    }
  }
}
```

### rename

```json
{
  "outcome": "result",
  "result": {
    "changes": {
      "fixtures://pressure/app-pattern-routed-catalog-storefront/src/routes/item-list-route.html": [
        {
          "newText": "queryText",
          "range": {
            "end": {
              "character": 63,
              "line": 7
            },
            "start": {
              "character": 53,
              "line": 7
            }
          }
        }
      ],
      "fixtures://pressure/app-pattern-routed-catalog-storefront/src/state/catalog-state.ts": [
        {
          "newText": "queryText",
          "range": {
            "end": {
              "character": 12,
              "line": 7
            },
            "start": {
              "character": 2,
              "line": 7
            }
          }
        },
        {
          "newText": "queryText",
          "range": {
            "end": {
              "character": 33,
              "line": 15
            },
            "start": {
              "character": 23,
              "line": 15
            }
          }
        }
      ]
    }
  }
}
```

### Notifications

```json
{
  "notificationCount": 0,
  "notifications": []
}
```

### In-memory apply

```json
{
  "anomalies": [],
  "editCount": 3,
  "expectedOldTexts": [
    "searchText"
  ],
  "filesTouched": [
    "src/routes/item-list-route.html",
    "src/state/catalog-state.ts"
  ],
  "outcome": "applied",
  "validation": [
    {
      "file": "src/routes/item-list-route.html",
      "newText": "queryText",
      "oldText": "searchText",
      "range": {
        "end": {
          "character": 63,
          "line": 7
        },
        "start": {
          "character": 53,
          "line": 7
        }
      },
      "source": "changes",
      "status": "ok"
    },
    {
      "file": "src/state/catalog-state.ts",
      "newText": "queryText",
      "oldText": "searchText",
      "range": {
        "end": {
          "character": 12,
          "line": 7
        },
        "start": {
          "character": 2,
          "line": 7
        }
      },
      "source": "changes",
      "status": "ok"
    },
    {
      "file": "src/state/catalog-state.ts",
      "newText": "queryText",
      "oldText": "searchText",
      "range": {
        "end": {
          "character": 33,
          "line": 15
        },
        "start": {
          "character": 23,
          "line": 15
        }
      },
      "source": "changes",
      "status": "ok"
    }
  ]
}
```

### Applied diff

```diff
diff --git a/src/routes/item-list-route.html b/src/routes/item-list-route.html
--- a/src/routes/item-list-route.html
+++ b/src/routes/item-list-route.html
@@ -1,31 +1,31 @@
 <section>
   <h2>Featured items</h2>
   <p if.bind="state.items.isLoading">Loading items...</p>
   <div else>
     <form class="catalog-filters" submit.trigger="$event.preventDefault()">
       <label>
         Search
-        <input type="search" value.bind="state.items.searchText & debounce:150">
+        <input type="search" value.bind="state.items.queryText & debounce:150">
       </label>
       <label>
         <input type="checkbox" checked.bind="state.items.onlyInStock">
         In stock only
       </label>
       <label>
         Badge
         <select value.bind="state.items.badgeFilter">
           <option repeat.for="badge of state.items.badgeFilters" model.bind="badge">${badge}</option>
         </select>
       </label>
     </form>
     <p if.bind="!state.items.hasItems">No featured items are available yet.</p>
     <template else>
       <p if.bind="!state.items.hasVisibleItems">No items match the current filters.</p>
       <ul if.bind="state.items.hasVisibleItems" class="item-grid">
         <li repeat.for="item of state.items.visibleItems">
           <item-card item.bind="item"></item-card>
         </li>
       </ul>
     </template>
   </div>
 </section>
diff --git a/src/state/catalog-state.ts b/src/state/catalog-state.ts
--- a/src/state/catalog-state.ts
+++ b/src/state/catalog-state.ts
@@ -1,93 +1,93 @@
 import { resolve } from 'aurelia';
 import type { Item, ItemBadge } from '../models/item';
 import { ItemCatalogService } from '../services/item-catalog-service';

 export class ItemCollectionState {
   private readonly itemsById = new Map<string, Item>();

-  searchText = '';
+  queryText = '';
   onlyInStock = false;
   readonly badgeFilters: readonly (ItemBadge | 'all')[] = ["all", "core", "featured", "seasonal", "standard"];

   badgeFilter: ItemBadge | 'all' = 'all';
   isLoading = false;

   get visibleItems(): readonly Item[] {
-    const query = this.searchText.trim().toLowerCase();
+    const query = this.queryText.trim().toLowerCase();
     return [...this.itemsById.values()].filter((item) =>
       (query.length === 0 || item.name.toLowerCase().includes(query) || item.summary.toLowerCase().includes(query))
       && (!this.onlyInStock || item.inStock)
       && (this.badgeFilter === 'all' || item.badge === this.badgeFilter)
     );
   }

   get hasItems(): boolean {
     return this.itemsById.size > 0;
   }

   get hasVisibleItems(): boolean {
     return this.visibleItems.length > 0;
   }

   readItem(entityId: string): Item | null {
     return this.itemsById.get(entityId) ?? null;
   }

   replace(collection: readonly Item[]): void {
     this.itemsById.clear();
     for (const item of collection) {
       this.itemsById.set(item.id, item);
     }
   }
 }

 export class SelectionState {
   readonly selectedItemIds: string[] = [];

   get itemCount(): number {
     return this.selectedItemIds.length;
   }

   selectItem(entityId: string): void {
     if (!this.selectedItemIds.includes(entityId)) {
       this.selectedItemIds.push(entityId);
     }
   }
 }

 export class CatalogState {
   private readonly catalogService = resolve(ItemCatalogService);

   readonly items = new ItemCollectionState();
   readonly selection = new SelectionState();

   get selectionProgressPercent(): number {
     return Math.min(100, Math.round((this.selection.itemCount / 3) * 100));
   }

   get selectedItemNames(): readonly string[] {
     return this.selection.selectedItemIds.map((entityId) =>
       this.items.readItem(entityId)?.name ?? entityId
     );
   }

   async loadFeaturedItems(): Promise<void> {
     if (this.items.hasItems || this.items.isLoading) {
       return;
     }

     this.items.isLoading = true;
     try {
       this.items.replace(await this.catalogService.loadFeaturedItems());
     } finally {
       this.items.isLoading = false;
     }
   }

   selectItem(entityId: string): void {
     const item = this.items.readItem(entityId);
     if (item?.inStock === true) {
       this.selection.selectItem(entityId);
     }
   }
 }
```

## template-member-onlyInStock

### Probe

```json
{
  "anchor": "checked.bind=\"state.items.onlyInStock\"",
  "at": "onlyInStock",
  "atOccurrence": 1,
  "displayPosition": "src/routes/item-list-route.html:11:58",
  "file": "src/routes/item-list-route.html",
  "lspPosition": {
    "character": 57,
    "line": 10
  },
  "newName": "inStockOnly",
  "occurrence": 1
}
```

### prepareRename

```json
{
  "outcome": "result",
  "result": {
    "placeholder": "onlyInStock",
    "range": {
      "end": {
        "character": 68,
        "line": 10
      },
      "start": {
        "character": 57,
        "line": 10
      }
    }
  }
}
```

### rename

```json
{
  "outcome": "result",
  "result": {
    "changes": {
      "fixtures://pressure/app-pattern-routed-catalog-storefront/src/routes/item-list-route.html": [
        {
          "newText": "inStockOnly",
          "range": {
            "end": {
              "character": 68,
              "line": 10
            },
            "start": {
              "character": 57,
              "line": 10
            }
          }
        }
      ],
      "fixtures://pressure/app-pattern-routed-catalog-storefront/src/state/catalog-state.ts": [
        {
          "newText": "inStockOnly",
          "range": {
            "end": {
              "character": 13,
              "line": 8
            },
            "start": {
              "character": 2,
              "line": 8
            }
          }
        },
        {
          "newText": "inStockOnly",
          "range": {
            "end": {
              "character": 27,
              "line": 18
            },
            "start": {
              "character": 16,
              "line": 18
            }
          }
        }
      ]
    }
  }
}
```

### Notifications

```json
{
  "notificationCount": 0,
  "notifications": []
}
```

### In-memory apply

```json
{
  "anomalies": [],
  "editCount": 3,
  "expectedOldTexts": [
    "onlyInStock"
  ],
  "filesTouched": [
    "src/routes/item-list-route.html",
    "src/state/catalog-state.ts"
  ],
  "outcome": "applied",
  "validation": [
    {
      "file": "src/routes/item-list-route.html",
      "newText": "inStockOnly",
      "oldText": "onlyInStock",
      "range": {
        "end": {
          "character": 68,
          "line": 10
        },
        "start": {
          "character": 57,
          "line": 10
        }
      },
      "source": "changes",
      "status": "ok"
    },
    {
      "file": "src/state/catalog-state.ts",
      "newText": "inStockOnly",
      "oldText": "onlyInStock",
      "range": {
        "end": {
          "character": 13,
          "line": 8
        },
        "start": {
          "character": 2,
          "line": 8
        }
      },
      "source": "changes",
      "status": "ok"
    },
    {
      "file": "src/state/catalog-state.ts",
      "newText": "inStockOnly",
      "oldText": "onlyInStock",
      "range": {
        "end": {
          "character": 27,
          "line": 18
        },
        "start": {
          "character": 16,
          "line": 18
        }
      },
      "source": "changes",
      "status": "ok"
    }
  ]
}
```

### Applied diff

```diff
diff --git a/src/routes/item-list-route.html b/src/routes/item-list-route.html
--- a/src/routes/item-list-route.html
+++ b/src/routes/item-list-route.html
@@ -1,31 +1,31 @@
 <section>
   <h2>Featured items</h2>
   <p if.bind="state.items.isLoading">Loading items...</p>
   <div else>
     <form class="catalog-filters" submit.trigger="$event.preventDefault()">
       <label>
         Search
         <input type="search" value.bind="state.items.searchText & debounce:150">
       </label>
       <label>
-        <input type="checkbox" checked.bind="state.items.onlyInStock">
+        <input type="checkbox" checked.bind="state.items.inStockOnly">
         In stock only
       </label>
       <label>
         Badge
         <select value.bind="state.items.badgeFilter">
           <option repeat.for="badge of state.items.badgeFilters" model.bind="badge">${badge}</option>
         </select>
       </label>
     </form>
     <p if.bind="!state.items.hasItems">No featured items are available yet.</p>
     <template else>
       <p if.bind="!state.items.hasVisibleItems">No items match the current filters.</p>
       <ul if.bind="state.items.hasVisibleItems" class="item-grid">
         <li repeat.for="item of state.items.visibleItems">
           <item-card item.bind="item"></item-card>
         </li>
       </ul>
     </template>
   </div>
 </section>
diff --git a/src/state/catalog-state.ts b/src/state/catalog-state.ts
--- a/src/state/catalog-state.ts
+++ b/src/state/catalog-state.ts
@@ -1,93 +1,93 @@
 import { resolve } from 'aurelia';
 import type { Item, ItemBadge } from '../models/item';
 import { ItemCatalogService } from '../services/item-catalog-service';

 export class ItemCollectionState {
   private readonly itemsById = new Map<string, Item>();

   searchText = '';
-  onlyInStock = false;
+  inStockOnly = false;
   readonly badgeFilters: readonly (ItemBadge | 'all')[] = ["all", "core", "featured", "seasonal", "standard"];

   badgeFilter: ItemBadge | 'all' = 'all';
   isLoading = false;

   get visibleItems(): readonly Item[] {
     const query = this.searchText.trim().toLowerCase();
     return [...this.itemsById.values()].filter((item) =>
       (query.length === 0 || item.name.toLowerCase().includes(query) || item.summary.toLowerCase().includes(query))
-      && (!this.onlyInStock || item.inStock)
+      && (!this.inStockOnly || item.inStock)
       && (this.badgeFilter === 'all' || item.badge === this.badgeFilter)
     );
   }

   get hasItems(): boolean {
     return this.itemsById.size > 0;
   }

   get hasVisibleItems(): boolean {
     return this.visibleItems.length > 0;
   }

   readItem(entityId: string): Item | null {
     return this.itemsById.get(entityId) ?? null;
   }

   replace(collection: readonly Item[]): void {
     this.itemsById.clear();
     for (const item of collection) {
       this.itemsById.set(item.id, item);
     }
   }
 }

 export class SelectionState {
   readonly selectedItemIds: string[] = [];

   get itemCount(): number {
     return this.selectedItemIds.length;
   }

   selectItem(entityId: string): void {
     if (!this.selectedItemIds.includes(entityId)) {
       this.selectedItemIds.push(entityId);
     }
   }
 }

 export class CatalogState {
   private readonly catalogService = resolve(ItemCatalogService);

   readonly items = new ItemCollectionState();
   readonly selection = new SelectionState();

   get selectionProgressPercent(): number {
     return Math.min(100, Math.round((this.selection.itemCount / 3) * 100));
   }

   get selectedItemNames(): readonly string[] {
     return this.selection.selectedItemIds.map((entityId) =>
       this.items.readItem(entityId)?.name ?? entityId
     );
   }

   async loadFeaturedItems(): Promise<void> {
     if (this.items.hasItems || this.items.isLoading) {
       return;
     }

     this.items.isLoading = true;
     try {
       this.items.replace(await this.catalogService.loadFeaturedItems());
     } finally {
       this.items.isLoading = false;
     }
   }

   selectItem(entityId: string): void {
     const item = this.items.readItem(entityId);
     if (item?.inStock === true) {
       this.selection.selectItem(entityId);
     }
   }
 }
```

## template-getter-visibleItems

### Probe

```json
{
  "anchor": "repeat.for=\"item of state.items.visibleItems\"",
  "at": "visibleItems",
  "atOccurrence": 1,
  "displayPosition": "src/routes/item-list-route.html:25:45",
  "file": "src/routes/item-list-route.html",
  "lspPosition": {
    "character": 44,
    "line": 24
  },
  "newName": "filteredItems",
  "occurrence": 1
}
```

### prepareRename

```json
{
  "outcome": "result",
  "result": {
    "placeholder": "visibleItems",
    "range": {
      "end": {
        "character": 56,
        "line": 24
      },
      "start": {
        "character": 44,
        "line": 24
      }
    }
  }
}
```

### rename

```json
{
  "outcome": "result",
  "result": {
    "changes": {
      "fixtures://pressure/app-pattern-routed-catalog-storefront/src/routes/item-list-route.html": [
        {
          "newText": "filteredItems",
          "range": {
            "end": {
              "character": 56,
              "line": 24
            },
            "start": {
              "character": 44,
              "line": 24
            }
          }
        }
      ],
      "fixtures://pressure/app-pattern-routed-catalog-storefront/src/state/catalog-state.ts": [
        {
          "newText": "filteredItems",
          "range": {
            "end": {
              "character": 18,
              "line": 14
            },
            "start": {
              "character": 6,
              "line": 14
            }
          }
        },
        {
          "newText": "filteredItems",
          "range": {
            "end": {
              "character": 28,
              "line": 28
            },
            "start": {
              "character": 16,
              "line": 28
            }
          }
        }
      ]
    }
  }
}
```

### Notifications

```json
{
  "notificationCount": 0,
  "notifications": []
}
```

### In-memory apply

```json
{
  "anomalies": [],
  "editCount": 3,
  "expectedOldTexts": [
    "visibleItems"
  ],
  "filesTouched": [
    "src/routes/item-list-route.html",
    "src/state/catalog-state.ts"
  ],
  "outcome": "applied",
  "validation": [
    {
      "file": "src/routes/item-list-route.html",
      "newText": "filteredItems",
      "oldText": "visibleItems",
      "range": {
        "end": {
          "character": 56,
          "line": 24
        },
        "start": {
          "character": 44,
          "line": 24
        }
      },
      "source": "changes",
      "status": "ok"
    },
    {
      "file": "src/state/catalog-state.ts",
      "newText": "filteredItems",
      "oldText": "visibleItems",
      "range": {
        "end": {
          "character": 18,
          "line": 14
        },
        "start": {
          "character": 6,
          "line": 14
        }
      },
      "source": "changes",
      "status": "ok"
    },
    {
      "file": "src/state/catalog-state.ts",
      "newText": "filteredItems",
      "oldText": "visibleItems",
      "range": {
        "end": {
          "character": 28,
          "line": 28
        },
        "start": {
          "character": 16,
          "line": 28
        }
      },
      "source": "changes",
      "status": "ok"
    }
  ]
}
```

### Applied diff

```diff
diff --git a/src/routes/item-list-route.html b/src/routes/item-list-route.html
--- a/src/routes/item-list-route.html
+++ b/src/routes/item-list-route.html
@@ -1,31 +1,31 @@
 <section>
   <h2>Featured items</h2>
   <p if.bind="state.items.isLoading">Loading items...</p>
   <div else>
     <form class="catalog-filters" submit.trigger="$event.preventDefault()">
       <label>
         Search
         <input type="search" value.bind="state.items.searchText & debounce:150">
       </label>
       <label>
         <input type="checkbox" checked.bind="state.items.onlyInStock">
         In stock only
       </label>
       <label>
         Badge
         <select value.bind="state.items.badgeFilter">
           <option repeat.for="badge of state.items.badgeFilters" model.bind="badge">${badge}</option>
         </select>
       </label>
     </form>
     <p if.bind="!state.items.hasItems">No featured items are available yet.</p>
     <template else>
       <p if.bind="!state.items.hasVisibleItems">No items match the current filters.</p>
       <ul if.bind="state.items.hasVisibleItems" class="item-grid">
-        <li repeat.for="item of state.items.visibleItems">
+        <li repeat.for="item of state.items.filteredItems">
           <item-card item.bind="item"></item-card>
         </li>
       </ul>
     </template>
   </div>
 </section>
diff --git a/src/state/catalog-state.ts b/src/state/catalog-state.ts
--- a/src/state/catalog-state.ts
+++ b/src/state/catalog-state.ts
@@ -1,93 +1,93 @@
 import { resolve } from 'aurelia';
 import type { Item, ItemBadge } from '../models/item';
 import { ItemCatalogService } from '../services/item-catalog-service';

 export class ItemCollectionState {
   private readonly itemsById = new Map<string, Item>();

   searchText = '';
   onlyInStock = false;
   readonly badgeFilters: readonly (ItemBadge | 'all')[] = ["all", "core", "featured", "seasonal", "standard"];

   badgeFilter: ItemBadge | 'all' = 'all';
   isLoading = false;

-  get visibleItems(): readonly Item[] {
+  get filteredItems(): readonly Item[] {
     const query = this.searchText.trim().toLowerCase();
     return [...this.itemsById.values()].filter((item) =>
       (query.length === 0 || item.name.toLowerCase().includes(query) || item.summary.toLowerCase().includes(query))
       && (!this.onlyInStock || item.inStock)
       && (this.badgeFilter === 'all' || item.badge === this.badgeFilter)
     );
   }

   get hasItems(): boolean {
     return this.itemsById.size > 0;
   }

   get hasVisibleItems(): boolean {
-    return this.visibleItems.length > 0;
+    return this.filteredItems.length > 0;
   }

   readItem(entityId: string): Item | null {
     return this.itemsById.get(entityId) ?? null;
   }

   replace(collection: readonly Item[]): void {
     this.itemsById.clear();
     for (const item of collection) {
       this.itemsById.set(item.id, item);
     }
   }
 }

 export class SelectionState {
   readonly selectedItemIds: string[] = [];

   get itemCount(): number {
     return this.selectedItemIds.length;
   }

   selectItem(entityId: string): void {
     if (!this.selectedItemIds.includes(entityId)) {
       this.selectedItemIds.push(entityId);
     }
   }
 }

 export class CatalogState {
   private readonly catalogService = resolve(ItemCatalogService);

   readonly items = new ItemCollectionState();
   readonly selection = new SelectionState();

   get selectionProgressPercent(): number {
     return Math.min(100, Math.round((this.selection.itemCount / 3) * 100));
   }

   get selectedItemNames(): readonly string[] {
     return this.selection.selectedItemIds.map((entityId) =>
       this.items.readItem(entityId)?.name ?? entityId
     );
   }

   async loadFeaturedItems(): Promise<void> {
     if (this.items.hasItems || this.items.isLoading) {
       return;
     }

     this.items.isLoading = true;
     try {
       this.items.replace(await this.catalogService.loadFeaturedItems());
     } finally {
       this.items.isLoading = false;
     }
   }

   selectItem(entityId: string): void {
     const item = this.items.readItem(entityId);
     if (item?.inStock === true) {
       this.selection.selectItem(entityId);
     }
   }
 }
```

## repeat-local-item

### Probe

```json
{
  "anchor": "repeat.for=\"item of state.items.visibleItems\"",
  "at": "item",
  "atOccurrence": 1,
  "displayPosition": "src/routes/item-list-route.html:25:25",
  "file": "src/routes/item-list-route.html",
  "lspPosition": {
    "character": 24,
    "line": 24
  },
  "newName": "entry",
  "occurrence": 1
}
```

### prepareRename

```json
{
  "outcome": "result",
  "result": {
    "placeholder": "item",
    "range": {
      "end": {
        "character": 28,
        "line": 24
      },
      "start": {
        "character": 24,
        "line": 24
      }
    }
  }
}
```

### rename

```json
{
  "outcome": "result",
  "result": {
    "changes": {
      "fixtures://pressure/app-pattern-routed-catalog-storefront/src/routes/item-list-route.html": [
        {
          "newText": "entry",
          "range": {
            "end": {
              "character": 28,
              "line": 24
            },
            "start": {
              "character": 24,
              "line": 24
            }
          }
        },
        {
          "newText": "entry",
          "range": {
            "end": {
              "character": 36,
              "line": 25
            },
            "start": {
              "character": 32,
              "line": 25
            }
          }
        }
      ]
    }
  }
}
```

### Notifications

```json
{
  "notificationCount": 0,
  "notifications": []
}
```

### In-memory apply

```json
{
  "anomalies": [],
  "editCount": 2,
  "expectedOldTexts": [
    "item"
  ],
  "filesTouched": [
    "src/routes/item-list-route.html"
  ],
  "outcome": "applied",
  "validation": [
    {
      "file": "src/routes/item-list-route.html",
      "newText": "entry",
      "oldText": "item",
      "range": {
        "end": {
          "character": 28,
          "line": 24
        },
        "start": {
          "character": 24,
          "line": 24
        }
      },
      "source": "changes",
      "status": "ok"
    },
    {
      "file": "src/routes/item-list-route.html",
      "newText": "entry",
      "oldText": "item",
      "range": {
        "end": {
          "character": 36,
          "line": 25
        },
        "start": {
          "character": 32,
          "line": 25
        }
      },
      "source": "changes",
      "status": "ok"
    }
  ]
}
```

### Applied diff

```diff
diff --git a/src/routes/item-list-route.html b/src/routes/item-list-route.html
--- a/src/routes/item-list-route.html
+++ b/src/routes/item-list-route.html
@@ -1,31 +1,31 @@
 <section>
   <h2>Featured items</h2>
   <p if.bind="state.items.isLoading">Loading items...</p>
   <div else>
     <form class="catalog-filters" submit.trigger="$event.preventDefault()">
       <label>
         Search
         <input type="search" value.bind="state.items.searchText & debounce:150">
       </label>
       <label>
         <input type="checkbox" checked.bind="state.items.onlyInStock">
         In stock only
       </label>
       <label>
         Badge
         <select value.bind="state.items.badgeFilter">
           <option repeat.for="badge of state.items.badgeFilters" model.bind="badge">${badge}</option>
         </select>
       </label>
     </form>
     <p if.bind="!state.items.hasItems">No featured items are available yet.</p>
     <template else>
       <p if.bind="!state.items.hasVisibleItems">No items match the current filters.</p>
       <ul if.bind="state.items.hasVisibleItems" class="item-grid">
-        <li repeat.for="item of state.items.visibleItems">
-          <item-card item.bind="item"></item-card>
+        <li repeat.for="entry of state.items.visibleItems">
+          <item-card item.bind="entry"></item-card>
         </li>
       </ul>
     </template>
   </div>
 </section>
```

## template-controller-repeat-refusal

### Probe

```json
{
  "anchor": "repeat.for=\"item of state.items.visibleItems\"",
  "at": "repeat",
  "atOccurrence": 1,
  "displayPosition": "src/routes/item-list-route.html:25:13",
  "file": "src/routes/item-list-route.html",
  "lspPosition": {
    "character": 12,
    "line": 24
  },
  "newName": "loop",
  "occurrence": 1
}
```

### prepareRename

```json
{
  "outcome": "result",
  "result": null
}
```

### rename

```json
{
  "error": {
    "code": 0,
    "message": "No source-backed template member is selected at this cursor."
  },
  "outcome": "error"
}
```

### Notifications

```json
{
  "notificationCount": 0,
  "notifications": []
}
```

### In-memory apply

```json
{
  "anomalies": [],
  "editCount": 0,
  "expectedOldTexts": [
    "repeat"
  ],
  "filesTouched": [],
  "outcome": "rename-error",
  "validation": []
}
```

### Applied diff

_No in-memory diff._

## let-local-item-target

### Probe

```json
{
  "anchor": "<let item.bind=\"state.items.readItem(routeParams.itemId)\">",
  "at": "item.bind",
  "atOccurrence": 1,
  "displayPosition": "src/routes/item-detail-route.html:4:8",
  "file": "src/routes/item-detail-route.html",
  "lspPosition": {
    "character": 7,
    "line": 3
  },
  "newName": "detailItem",
  "occurrence": 1
}
```

### prepareRename

```json
{
  "outcome": "result",
  "result": {
    "placeholder": "item",
    "range": {
      "end": {
        "character": 11,
        "line": 3
      },
      "start": {
        "character": 7,
        "line": 3
      }
    }
  }
}
```

### rename

```json
{
  "outcome": "result",
  "result": {
    "changes": {
      "fixtures://pressure/app-pattern-routed-catalog-storefront/src/routes/item-detail-route.html": [
        {
          "newText": "detailItem",
          "range": {
            "end": {
              "character": 11,
              "line": 3
            },
            "start": {
              "character": 7,
              "line": 3
            }
          }
        },
        {
          "newText": "detailItem",
          "range": {
            "end": {
              "character": 25,
              "line": 4
            },
            "start": {
              "character": 21,
              "line": 4
            }
          }
        },
        {
          "newText": "detailItem",
          "range": {
            "end": {
              "character": 14,
              "line": 5
            },
            "start": {
              "character": 10,
              "line": 5
            }
          }
        },
        {
          "newText": "detailItem",
          "range": {
            "end": {
              "character": 13,
              "line": 6
            },
            "start": {
              "character": 9,
              "line": 6
            }
          }
        },
        {
          "newText": "detailItem",
          "range": {
            "end": {
              "character": 16,
              "line": 9
            },
            "start": {
              "character": 12,
              "line": 9
            }
          }
        },
        {
          "newText": "detailItem",
          "range": {
            "end": {
              "character": 16,
              "line": 11
            },
            "start": {
              "character": 12,
              "line": 11
            }
          }
        },
        {
          "newText": "detailItem",
          "range": {
            "end": {
              "character": 16,
              "line": 13
            },
            "start": {
              "character": 12,
              "line": 13
            }
          }
        },
        {
          "newText": "detailItem",
          "range": {
            "end": {
              "character": 16,
              "line": 15
            },
            "start": {
              "character": 12,
              "line": 15
            }
          }
        },
        {
          "newText": "detailItem",
          "range": {
            "end": {
              "character": 16,
              "line": 17
            },
            "start": {
              "character": 12,
              "line": 17
            }
          }
        },
        {
          "newText": "detailItem",
          "range": {
            "end": {
              "character": 62,
              "line": 21
            },
            "start": {
              "character": 58,
              "line": 21
            }
          }
        },
        {
          "newText": "detailItem",
          "range": {
            "end": {
              "character": 88,
              "line": 21
            },
            "start": {
              "character": 84,
              "line": 21
            }
          }
        }
      ]
    }
  }
}
```

### Notifications

```json
{
  "notificationCount": 0,
  "notifications": []
}
```

### In-memory apply

```json
{
  "anomalies": [],
  "editCount": 11,
  "expectedOldTexts": [
    "item"
  ],
  "filesTouched": [
    "src/routes/item-detail-route.html"
  ],
  "outcome": "applied",
  "validation": [
    {
      "file": "src/routes/item-detail-route.html",
      "newText": "detailItem",
      "oldText": "item",
      "range": {
        "end": {
          "character": 11,
          "line": 3
        },
        "start": {
          "character": 7,
          "line": 3
        }
      },
      "source": "changes",
      "status": "ok"
    },
    {
      "file": "src/routes/item-detail-route.html",
      "newText": "detailItem",
      "oldText": "item",
      "range": {
        "end": {
          "character": 25,
          "line": 4
        },
        "start": {
          "character": 21,
          "line": 4
        }
      },
      "source": "changes",
      "status": "ok"
    },
    {
      "file": "src/routes/item-detail-route.html",
      "newText": "detailItem",
      "oldText": "item",
      "range": {
        "end": {
          "character": 14,
          "line": 5
        },
        "start": {
          "character": 10,
          "line": 5
        }
      },
      "source": "changes",
      "status": "ok"
    },
    {
      "file": "src/routes/item-detail-route.html",
      "newText": "detailItem",
      "oldText": "item",
      "range": {
        "end": {
          "character": 13,
          "line": 6
        },
        "start": {
          "character": 9,
          "line": 6
        }
      },
      "source": "changes",
      "status": "ok"
    },
    {
      "file": "src/routes/item-detail-route.html",
      "newText": "detailItem",
      "oldText": "item",
      "range": {
        "end": {
          "character": 16,
          "line": 9
        },
        "start": {
          "character": 12,
          "line": 9
        }
      },
      "source": "changes",
      "status": "ok"
    },
    {
      "file": "src/routes/item-detail-route.html",
      "newText": "detailItem",
      "oldText": "item",
      "range": {
        "end": {
          "character": 16,
          "line": 11
        },
        "start": {
          "character": 12,
          "line": 11
        }
      },
      "source": "changes",
      "status": "ok"
    },
    {
      "file": "src/routes/item-detail-route.html",
      "newText": "detailItem",
      "oldText": "item",
      "range": {
        "end": {
          "character": 16,
          "line": 13
        },
        "start": {
          "character": 12,
          "line": 13
        }
      },
      "source": "changes",
      "status": "ok"
    },
    {
      "file": "src/routes/item-detail-route.html",
      "newText": "detailItem",
      "oldText": "item",
      "range": {
        "end": {
          "character": 16,
          "line": 15
        },
        "start": {
          "character": 12,
          "line": 15
        }
      },
      "source": "changes",
      "status": "ok"
    },
    {
      "file": "src/routes/item-detail-route.html",
      "newText": "detailItem",
      "oldText": "item",
      "range": {
        "end": {
          "character": 16,
          "line": 17
        },
        "start": {
          "character": 12,
          "line": 17
        }
      },
      "source": "changes",
      "status": "ok"
    },
    {
      "file": "src/routes/item-detail-route.html",
      "newText": "detailItem",
      "oldText": "item",
      "range": {
        "end": {
          "character": 62,
          "line": 21
        },
        "start": {
          "character": 58,
          "line": 21
        }
      },
      "source": "changes",
      "status": "ok"
    },
    {
      "file": "src/routes/item-detail-route.html",
      "newText": "detailItem",
      "oldText": "item",
      "range": {
        "end": {
          "character": 88,
          "line": 21
        },
        "start": {
          "character": 84,
          "line": 21
        }
      },
      "source": "changes",
      "status": "ok"
    }
  ]
}
```

### Applied diff

```diff
diff --git a/src/routes/item-detail-route.html b/src/routes/item-detail-route.html
--- a/src/routes/item-detail-route.html
+++ b/src/routes/item-detail-route.html
@@ -1,25 +1,25 @@
 <section class="item-detail">
   <a load="items">All items</a>

-  <let item.bind="state.items.readItem(routeParams.itemId)"></let>
-  <template if.bind="item">
-    <h1>${item.name}</h1>
-    <p>${item.summary}</p>
+  <let detailItem.bind="state.items.readItem(routeParams.itemId)"></let>
+  <template if.bind="detailItem">
+    <h1>${detailItem.name}</h1>
+    <p>${detailItem.summary}</p>
     <dl>
       <dt>Title</dt>
-      <dd>${item.titleLabel}</dd>
+      <dd>${detailItem.titleLabel}</dd>
       <dt>Description</dt>
-      <dd>${item.descriptionLabel}</dd>
+      <dd>${detailItem.descriptionLabel}</dd>
       <dt>Category</dt>
-      <dd>${item.categoryLabel}</dd>
+      <dd>${detailItem.categoryLabel}</dd>
       <dt>Monthly Price</dt>
-      <dd>${item.monthlyPriceLabel}</dd>
+      <dd>${detailItem.monthlyPriceLabel}</dd>
       <dt>Available</dt>
-      <dd>${item.availableLabel}</dd>
+      <dd>${detailItem.availableLabel}</dd>
       <dt>Opened from</dt>
       <dd>${routeParams.ref ?? 'catalog'}</dd>
     </dl>
-    <button type="button" click.trigger="state.selectItem(item.id)" disabled.bind="!item.inStock">Select</button>
+    <button type="button" click.trigger="state.selectItem(detailItem.id)" disabled.bind="!detailItem.inStock">Select</button>
   </template>
   <p else>Loading Item ${routeParams.itemId}...</p>
 </section>
```

## let-local-item-usage

### Probe

```json
{
  "anchor": "${item.name}",
  "at": "item",
  "atOccurrence": 1,
  "displayPosition": "src/routes/item-detail-route.html:6:11",
  "file": "src/routes/item-detail-route.html",
  "lspPosition": {
    "character": 10,
    "line": 5
  },
  "newName": "detailItem",
  "occurrence": 1
}
```

### prepareRename

```json
{
  "outcome": "result",
  "result": {
    "placeholder": "item",
    "range": {
      "end": {
        "character": 14,
        "line": 5
      },
      "start": {
        "character": 10,
        "line": 5
      }
    }
  }
}
```

### rename

```json
{
  "outcome": "result",
  "result": {
    "changes": {
      "fixtures://pressure/app-pattern-routed-catalog-storefront/src/routes/item-detail-route.html": [
        {
          "newText": "detailItem",
          "range": {
            "end": {
              "character": 11,
              "line": 3
            },
            "start": {
              "character": 7,
              "line": 3
            }
          }
        },
        {
          "newText": "detailItem",
          "range": {
            "end": {
              "character": 25,
              "line": 4
            },
            "start": {
              "character": 21,
              "line": 4
            }
          }
        },
        {
          "newText": "detailItem",
          "range": {
            "end": {
              "character": 14,
              "line": 5
            },
            "start": {
              "character": 10,
              "line": 5
            }
          }
        },
        {
          "newText": "detailItem",
          "range": {
            "end": {
              "character": 13,
              "line": 6
            },
            "start": {
              "character": 9,
              "line": 6
            }
          }
        },
        {
          "newText": "detailItem",
          "range": {
            "end": {
              "character": 16,
              "line": 9
            },
            "start": {
              "character": 12,
              "line": 9
            }
          }
        },
        {
          "newText": "detailItem",
          "range": {
            "end": {
              "character": 16,
              "line": 11
            },
            "start": {
              "character": 12,
              "line": 11
            }
          }
        },
        {
          "newText": "detailItem",
          "range": {
            "end": {
              "character": 16,
              "line": 13
            },
            "start": {
              "character": 12,
              "line": 13
            }
          }
        },
        {
          "newText": "detailItem",
          "range": {
            "end": {
              "character": 16,
              "line": 15
            },
            "start": {
              "character": 12,
              "line": 15
            }
          }
        },
        {
          "newText": "detailItem",
          "range": {
            "end": {
              "character": 16,
              "line": 17
            },
            "start": {
              "character": 12,
              "line": 17
            }
          }
        },
        {
          "newText": "detailItem",
          "range": {
            "end": {
              "character": 62,
              "line": 21
            },
            "start": {
              "character": 58,
              "line": 21
            }
          }
        },
        {
          "newText": "detailItem",
          "range": {
            "end": {
              "character": 88,
              "line": 21
            },
            "start": {
              "character": 84,
              "line": 21
            }
          }
        }
      ]
    }
  }
}
```

### Notifications

```json
{
  "notificationCount": 0,
  "notifications": []
}
```

### In-memory apply

```json
{
  "anomalies": [],
  "editCount": 11,
  "expectedOldTexts": [
    "item"
  ],
  "filesTouched": [
    "src/routes/item-detail-route.html"
  ],
  "outcome": "applied",
  "validation": [
    {
      "file": "src/routes/item-detail-route.html",
      "newText": "detailItem",
      "oldText": "item",
      "range": {
        "end": {
          "character": 11,
          "line": 3
        },
        "start": {
          "character": 7,
          "line": 3
        }
      },
      "source": "changes",
      "status": "ok"
    },
    {
      "file": "src/routes/item-detail-route.html",
      "newText": "detailItem",
      "oldText": "item",
      "range": {
        "end": {
          "character": 25,
          "line": 4
        },
        "start": {
          "character": 21,
          "line": 4
        }
      },
      "source": "changes",
      "status": "ok"
    },
    {
      "file": "src/routes/item-detail-route.html",
      "newText": "detailItem",
      "oldText": "item",
      "range": {
        "end": {
          "character": 14,
          "line": 5
        },
        "start": {
          "character": 10,
          "line": 5
        }
      },
      "source": "changes",
      "status": "ok"
    },
    {
      "file": "src/routes/item-detail-route.html",
      "newText": "detailItem",
      "oldText": "item",
      "range": {
        "end": {
          "character": 13,
          "line": 6
        },
        "start": {
          "character": 9,
          "line": 6
        }
      },
      "source": "changes",
      "status": "ok"
    },
    {
      "file": "src/routes/item-detail-route.html",
      "newText": "detailItem",
      "oldText": "item",
      "range": {
        "end": {
          "character": 16,
          "line": 9
        },
        "start": {
          "character": 12,
          "line": 9
        }
      },
      "source": "changes",
      "status": "ok"
    },
    {
      "file": "src/routes/item-detail-route.html",
      "newText": "detailItem",
      "oldText": "item",
      "range": {
        "end": {
          "character": 16,
          "line": 11
        },
        "start": {
          "character": 12,
          "line": 11
        }
      },
      "source": "changes",
      "status": "ok"
    },
    {
      "file": "src/routes/item-detail-route.html",
      "newText": "detailItem",
      "oldText": "item",
      "range": {
        "end": {
          "character": 16,
          "line": 13
        },
        "start": {
          "character": 12,
          "line": 13
        }
      },
      "source": "changes",
      "status": "ok"
    },
    {
      "file": "src/routes/item-detail-route.html",
      "newText": "detailItem",
      "oldText": "item",
      "range": {
        "end": {
          "character": 16,
          "line": 15
        },
        "start": {
          "character": 12,
          "line": 15
        }
      },
      "source": "changes",
      "status": "ok"
    },
    {
      "file": "src/routes/item-detail-route.html",
      "newText": "detailItem",
      "oldText": "item",
      "range": {
        "end": {
          "character": 16,
          "line": 17
        },
        "start": {
          "character": 12,
          "line": 17
        }
      },
      "source": "changes",
      "status": "ok"
    },
    {
      "file": "src/routes/item-detail-route.html",
      "newText": "detailItem",
      "oldText": "item",
      "range": {
        "end": {
          "character": 62,
          "line": 21
        },
        "start": {
          "character": 58,
          "line": 21
        }
      },
      "source": "changes",
      "status": "ok"
    },
    {
      "file": "src/routes/item-detail-route.html",
      "newText": "detailItem",
      "oldText": "item",
      "range": {
        "end": {
          "character": 88,
          "line": 21
        },
        "start": {
          "character": 84,
          "line": 21
        }
      },
      "source": "changes",
      "status": "ok"
    }
  ]
}
```

### Applied diff

```diff
diff --git a/src/routes/item-detail-route.html b/src/routes/item-detail-route.html
--- a/src/routes/item-detail-route.html
+++ b/src/routes/item-detail-route.html
@@ -1,25 +1,25 @@
 <section class="item-detail">
   <a load="items">All items</a>

-  <let item.bind="state.items.readItem(routeParams.itemId)"></let>
-  <template if.bind="item">
-    <h1>${item.name}</h1>
-    <p>${item.summary}</p>
+  <let detailItem.bind="state.items.readItem(routeParams.itemId)"></let>
+  <template if.bind="detailItem">
+    <h1>${detailItem.name}</h1>
+    <p>${detailItem.summary}</p>
     <dl>
       <dt>Title</dt>
-      <dd>${item.titleLabel}</dd>
+      <dd>${detailItem.titleLabel}</dd>
       <dt>Description</dt>
-      <dd>${item.descriptionLabel}</dd>
+      <dd>${detailItem.descriptionLabel}</dd>
       <dt>Category</dt>
-      <dd>${item.categoryLabel}</dd>
+      <dd>${detailItem.categoryLabel}</dd>
       <dt>Monthly Price</dt>
-      <dd>${item.monthlyPriceLabel}</dd>
+      <dd>${detailItem.monthlyPriceLabel}</dd>
       <dt>Available</dt>
-      <dd>${item.availableLabel}</dd>
+      <dd>${detailItem.availableLabel}</dd>
       <dt>Opened from</dt>
       <dd>${routeParams.ref ?? 'catalog'}</dd>
     </dl>
-    <button type="button" click.trigger="state.selectItem(item.id)" disabled.bind="!item.inStock">Select</button>
+    <button type="button" click.trigger="state.selectItem(detailItem.id)" disabled.bind="!detailItem.inStock">Select</button>
   </template>
   <p else>Loading Item ${routeParams.itemId}...</p>
 </section>
```

## bindable-attr-item

### Probe

```json
{
  "anchor": "<item-card item.bind=\"item\">",
  "at": "item.bind",
  "atOccurrence": 1,
  "displayPosition": "src/routes/item-list-route.html:26:22",
  "file": "src/routes/item-list-route.html",
  "lspPosition": {
    "character": 21,
    "line": 25
  },
  "newName": "product",
  "occurrence": 1
}
```

### prepareRename

```json
{
  "outcome": "result",
  "result": {
    "placeholder": "item",
    "range": {
      "end": {
        "character": 25,
        "line": 25
      },
      "start": {
        "character": 21,
        "line": 25
      }
    }
  }
}
```

### rename

```json
{
  "outcome": "result",
  "result": {
    "changes": {
      "fixtures://pressure/app-pattern-routed-catalog-storefront/src/components/item-card.html": [
        {
          "newText": "product",
          "range": {
            "end": {
              "character": 23,
              "line": 0
            },
            "start": {
              "character": 19,
              "line": 0
            }
          }
        },
        {
          "newText": "product",
          "range": {
            "end": {
              "character": 45,
              "line": 1
            },
            "start": {
              "character": 41,
              "line": 1
            }
          }
        },
        {
          "newText": "product",
          "range": {
            "end": {
              "character": 76,
              "line": 1
            },
            "start": {
              "character": 72,
              "line": 1
            }
          }
        },
        {
          "newText": "product",
          "range": {
            "end": {
              "character": 111,
              "line": 1
            },
            "start": {
              "character": 107,
              "line": 1
            }
          }
        },
        {
          "newText": "product",
          "range": {
            "end": {
              "character": 149,
              "line": 1
            },
            "start": {
              "character": 145,
              "line": 1
            }
          }
        },
        {
          "newText": "product",
          "range": {
            "end": {
              "character": 14,
              "line": 2
            },
            "start": {
              "character": 10,
              "line": 2
            }
          }
        },
        {
          "newText": "product",
          "range": {
            "end": {
              "character": 13,
              "line": 3
            },
            "start": {
              "character": 9,
              "line": 3
            }
          }
        },
        {
          "newText": "product",
          "range": {
            "end": {
              "character": 13,
              "line": 4
            },
            "start": {
              "character": 9,
              "line": 4
            }
          }
        },
        {
          "newText": "product",
          "range": {
            "end": {
              "character": 13,
              "line": 5
            },
            "start": {
              "character": 9,
              "line": 5
            }
          }
        },
        {
          "newText": "product",
          "range": {
            "end": {
              "character": 31,
              "line": 6
            },
            "start": {
              "character": 27,
              "line": 6
            }
          }
        },
        {
          "newText": "product",
          "range": {
            "end": {
              "character": 34,
              "line": 11
            },
            "start": {
              "character": 30,
              "line": 11
            }
          }
        },
        {
          "newText": "product",
          "range": {
            "end": {
              "character": 62,
              "line": 12
            },
            "start": {
              "character": 58,
              "line": 12
            }
          }
        },
        {
          "newText": "product",
          "range": {
            "end": {
              "character": 88,
              "line": 12
            },
            "start": {
              "character": 84,
              "line": 12
            }
          }
        }
      ],
      "fixtures://pressure/app-pattern-routed-catalog-storefront/src/components/item-card.ts": [
        {
          "newText": "product",
          "range": {
            "end": {
              "character": 16,
              "line": 12
            },
            "start": {
              "character": 12,
              "line": 12
            }
          }
        }
      ],
      "fixtures://pressure/app-pattern-routed-catalog-storefront/src/routes/item-list-route.html": [
        {
          "newText": "product",
          "range": {
            "end": {
              "character": 25,
              "line": 25
            },
            "start": {
              "character": 21,
              "line": 25
            }
          }
        }
      ]
    }
  }
}
```

### Notifications

```json
{
  "notificationCount": 0,
  "notifications": []
}
```

### In-memory apply

```json
{
  "anomalies": [],
  "editCount": 15,
  "expectedOldTexts": [
    "item"
  ],
  "filesTouched": [
    "src/components/item-card.html",
    "src/components/item-card.ts",
    "src/routes/item-list-route.html"
  ],
  "outcome": "applied",
  "validation": [
    {
      "file": "src/components/item-card.html",
      "newText": "product",
      "oldText": "item",
      "range": {
        "end": {
          "character": 23,
          "line": 0
        },
        "start": {
          "character": 19,
          "line": 0
        }
      },
      "source": "changes",
      "status": "ok"
    },
    {
      "file": "src/components/item-card.html",
      "newText": "product",
      "oldText": "item",
      "range": {
        "end": {
          "character": 45,
          "line": 1
        },
        "start": {
          "character": 41,
          "line": 1
        }
      },
      "source": "changes",
      "status": "ok"
    },
    {
      "file": "src/components/item-card.html",
      "newText": "product",
      "oldText": "item",
      "range": {
        "end": {
          "character": 76,
          "line": 1
        },
        "start": {
          "character": 72,
          "line": 1
        }
      },
      "source": "changes",
      "status": "ok"
    },
    {
      "file": "src/components/item-card.html",
      "newText": "product",
      "oldText": "item",
      "range": {
        "end": {
          "character": 111,
          "line": 1
        },
        "start": {
          "character": 107,
          "line": 1
        }
      },
      "source": "changes",
      "status": "ok"
    },
    {
      "file": "src/components/item-card.html",
      "newText": "product",
      "oldText": "item",
      "range": {
        "end": {
          "character": 149,
          "line": 1
        },
        "start": {
          "character": 145,
          "line": 1
        }
      },
      "source": "changes",
      "status": "ok"
    },
    {
      "file": "src/components/item-card.html",
      "newText": "product",
      "oldText": "item",
      "range": {
        "end": {
          "character": 14,
          "line": 2
        },
        "start": {
          "character": 10,
          "line": 2
        }
      },
      "source": "changes",
      "status": "ok"
    },
    {
      "file": "src/components/item-card.html",
      "newText": "product",
      "oldText": "item",
      "range": {
        "end": {
          "character": 13,
          "line": 3
        },
        "start": {
          "character": 9,
          "line": 3
        }
      },
      "source": "changes",
      "status": "ok"
    },
    {
      "file": "src/components/item-card.html",
      "newText": "product",
      "oldText": "item",
      "range": {
        "end": {
          "character": 13,
          "line": 4
        },
        "start": {
          "character": 9,
          "line": 4
        }
      },
      "source": "changes",
      "status": "ok"
    },
    {
      "file": "src/components/item-card.html",
      "newText": "product",
      "oldText": "item",
      "range": {
        "end": {
          "character": 13,
          "line": 5
        },
        "start": {
          "character": 9,
          "line": 5
        }
      },
      "source": "changes",
      "status": "ok"
    },
    {
      "file": "src/components/item-card.html",
      "newText": "product",
      "oldText": "item",
      "range": {
        "end": {
          "character": 31,
          "line": 6
        },
        "start": {
          "character": 27,
          "line": 6
        }
      },
      "source": "changes",
      "status": "ok"
    },
    {
      "file": "src/components/item-card.html",
      "newText": "product",
      "oldText": "item",
      "range": {
        "end": {
          "character": 34,
          "line": 11
        },
        "start": {
          "character": 30,
          "line": 11
        }
      },
      "source": "changes",
      "status": "ok"
    },
    {
      "file": "src/components/item-card.html",
      "newText": "product",
      "oldText": "item",
      "range": {
        "end": {
          "character": 62,
          "line": 12
        },
        "start": {
          "character": 58,
          "line": 12
        }
      },
      "source": "changes",
      "status": "ok"
    },
    {
      "file": "src/components/item-card.html",
      "newText": "product",
      "oldText": "item",
      "range": {
        "end": {
          "character": 88,
          "line": 12
        },
        "start": {
          "character": 84,
          "line": 12
        }
      },
      "source": "changes",
      "status": "ok"
    },
    {
      "file": "src/components/item-card.ts",
      "newText": "product",
      "oldText": "item",
      "range": {
        "end": {
          "character": 16,
          "line": 12
        },
        "start": {
          "character": 12,
          "line": 12
        }
      },
      "source": "changes",
      "status": "ok"
    },
    {
      "file": "src/routes/item-list-route.html",
      "newText": "product",
      "oldText": "item",
      "range": {
        "end": {
          "character": 25,
          "line": 25
        },
        "start": {
          "character": 21,
          "line": 25
        }
      },
      "source": "changes",
      "status": "ok"
    }
  ]
}
```

### Applied diff

```diff
diff --git a/src/components/item-card.html b/src/components/item-card.html
--- a/src/components/item-card.html
+++ b/src/components/item-card.html
@@ -1,18 +1,18 @@
-<template if.bind="item">
-  <article class="item-card" class.bind="item.badge" highlighted.class="item.isHighlighted" padding.style="item.cardPadding" border-color.style="item.cardAccentColor">
-    <h3>${item.name}</h3>
-    <p>${item.summary}</p>
-    <p>${item.priceLabel}</p>
-    <p>${item.stockLabel}</p>
-    <template switch.bind="item.availability">
+<template if.bind="product">
+  <article class="item-card" class.bind="product.badge" highlighted.class="product.isHighlighted" padding.style="product.cardPadding" border-color.style="product.cardAccentColor">
+    <h3>${product.name}</h3>
+    <p>${product.summary}</p>
+    <p>${product.priceLabel}</p>
+    <p>${product.stockLabel}</p>
+    <template switch.bind="product.availability">
       <p case="in-stock">Ready to ship.</p>
       <p case="limited">Limited stock.</p>
       <p default-case>Available by backorder.</p>
     </template>
-    <a load.bind="'/items/' + item.id">View details</a>
-    <button type="button" click.trigger="state.selectItem(item.id)" disabled.bind="!item.inStock">Select</button>
+    <a load.bind="'/items/' + product.id">View details</a>
+    <button type="button" click.trigger="state.selectItem(product.id)" disabled.bind="!product.inStock">Select</button>
   </article>
 </template>
 <article else class="item-card">
   <p>Loading Item...</p>
 </article>
diff --git a/src/components/item-card.ts b/src/components/item-card.ts
--- a/src/components/item-card.ts
+++ b/src/components/item-card.ts
@@ -1,14 +1,14 @@
 import { bindable, customElement, resolve } from 'aurelia';
 import type { Item } from '../models/item';
 import { CatalogState } from '../state/catalog-state';
 import template from './item-card.html';

 @customElement({
   name: 'item-card',
   template,
 })
 export class ItemCard {
   readonly state = resolve(CatalogState);

-  @bindable item: Item | null = null;
+  @bindable product: Item | null = null;
 }
diff --git a/src/routes/item-list-route.html b/src/routes/item-list-route.html
--- a/src/routes/item-list-route.html
+++ b/src/routes/item-list-route.html
@@ -1,31 +1,31 @@
 <section>
   <h2>Featured items</h2>
   <p if.bind="state.items.isLoading">Loading items...</p>
   <div else>
     <form class="catalog-filters" submit.trigger="$event.preventDefault()">
       <label>
         Search
         <input type="search" value.bind="state.items.searchText & debounce:150">
       </label>
       <label>
         <input type="checkbox" checked.bind="state.items.onlyInStock">
         In stock only
       </label>
       <label>
         Badge
         <select value.bind="state.items.badgeFilter">
           <option repeat.for="badge of state.items.badgeFilters" model.bind="badge">${badge}</option>
         </select>
       </label>
     </form>
     <p if.bind="!state.items.hasItems">No featured items are available yet.</p>
     <template else>
       <p if.bind="!state.items.hasVisibleItems">No items match the current filters.</p>
       <ul if.bind="state.items.hasVisibleItems" class="item-grid">
         <li repeat.for="item of state.items.visibleItems">
-          <item-card item.bind="item"></item-card>
+          <item-card product.bind="item"></item-card>
         </li>
       </ul>
     </template>
   </div>
 </section>
```

## resource-element-item-card

### Probe

```json
{
  "anchor": "<item-card item.bind=\"item\">",
  "at": "item-card",
  "atOccurrence": 1,
  "displayPosition": "src/routes/item-list-route.html:26:12",
  "file": "src/routes/item-list-route.html",
  "lspPosition": {
    "character": 11,
    "line": 25
  },
  "newName": "product-card",
  "occurrence": 1
}
```

### prepareRename

```json
{
  "outcome": "result",
  "result": {
    "placeholder": "item-card",
    "range": {
      "end": {
        "character": 20,
        "line": 25
      },
      "start": {
        "character": 11,
        "line": 25
      }
    }
  }
}
```

### rename

```json
{
  "outcome": "result",
  "result": {
    "changes": {
      "fixtures://pressure/app-pattern-routed-catalog-storefront/src/components/item-card.ts": [
        {
          "newText": "product-card",
          "range": {
            "end": {
              "character": 18,
              "line": 6
            },
            "start": {
              "character": 9,
              "line": 6
            }
          }
        }
      ],
      "fixtures://pressure/app-pattern-routed-catalog-storefront/src/routes/item-list-route.html": [
        {
          "newText": "product-card",
          "range": {
            "end": {
              "character": 20,
              "line": 25
            },
            "start": {
              "character": 11,
              "line": 25
            }
          }
        },
        {
          "newText": "product-card",
          "range": {
            "end": {
              "character": 49,
              "line": 25
            },
            "start": {
              "character": 40,
              "line": 25
            }
          }
        }
      ]
    }
  }
}
```

### Notifications

```json
{
  "notificationCount": 0,
  "notifications": []
}
```

### In-memory apply

```json
{
  "anomalies": [],
  "editCount": 3,
  "expectedOldTexts": [
    "item-card",
    "item"
  ],
  "filesTouched": [
    "src/components/item-card.ts",
    "src/routes/item-list-route.html"
  ],
  "outcome": "applied",
  "validation": [
    {
      "file": "src/components/item-card.ts",
      "newText": "product-card",
      "oldText": "item-card",
      "range": {
        "end": {
          "character": 18,
          "line": 6
        },
        "start": {
          "character": 9,
          "line": 6
        }
      },
      "source": "changes",
      "status": "ok"
    },
    {
      "file": "src/routes/item-list-route.html",
      "newText": "product-card",
      "oldText": "item-card",
      "range": {
        "end": {
          "character": 20,
          "line": 25
        },
        "start": {
          "character": 11,
          "line": 25
        }
      },
      "source": "changes",
      "status": "ok"
    },
    {
      "file": "src/routes/item-list-route.html",
      "newText": "product-card",
      "oldText": "item-card",
      "range": {
        "end": {
          "character": 49,
          "line": 25
        },
        "start": {
          "character": 40,
          "line": 25
        }
      },
      "source": "changes",
      "status": "ok"
    }
  ]
}
```

### Applied diff

```diff
diff --git a/src/components/item-card.ts b/src/components/item-card.ts
--- a/src/components/item-card.ts
+++ b/src/components/item-card.ts
@@ -1,14 +1,14 @@
 import { bindable, customElement, resolve } from 'aurelia';
 import type { Item } from '../models/item';
 import { CatalogState } from '../state/catalog-state';
 import template from './item-card.html';

 @customElement({
-  name: 'item-card',
+  name: 'product-card',
   template,
 })
 export class ItemCard {
   readonly state = resolve(CatalogState);

   @bindable item: Item | null = null;
 }
diff --git a/src/routes/item-list-route.html b/src/routes/item-list-route.html
--- a/src/routes/item-list-route.html
+++ b/src/routes/item-list-route.html
@@ -1,31 +1,31 @@
 <section>
   <h2>Featured items</h2>
   <p if.bind="state.items.isLoading">Loading items...</p>
   <div else>
     <form class="catalog-filters" submit.trigger="$event.preventDefault()">
       <label>
         Search
         <input type="search" value.bind="state.items.searchText & debounce:150">
       </label>
       <label>
         <input type="checkbox" checked.bind="state.items.onlyInStock">
         In stock only
       </label>
       <label>
         Badge
         <select value.bind="state.items.badgeFilter">
           <option repeat.for="badge of state.items.badgeFilters" model.bind="badge">${badge}</option>
         </select>
       </label>
     </form>
     <p if.bind="!state.items.hasItems">No featured items are available yet.</p>
     <template else>
       <p if.bind="!state.items.hasVisibleItems">No items match the current filters.</p>
       <ul if.bind="state.items.hasVisibleItems" class="item-grid">
         <li repeat.for="item of state.items.visibleItems">
-          <item-card item.bind="item"></item-card>
+          <product-card item.bind="item"></product-card>
         </li>
       </ul>
     </template>
   </div>
 </section>
```

## resource-element-uppercase-refusal

### Probe

```json
{
  "anchor": "<item-card item.bind=\"item\">",
  "at": "item-card",
  "atOccurrence": 1,
  "displayPosition": "src/routes/item-list-route.html:26:12",
  "file": "src/routes/item-list-route.html",
  "lspPosition": {
    "character": 11,
    "line": 25
  },
  "newName": "ItemCard",
  "occurrence": 1
}
```

### prepareRename

```json
{
  "outcome": "result",
  "result": {
    "placeholder": "item-card",
    "range": {
      "end": {
        "character": 20,
        "line": 25
      },
      "start": {
        "character": 11,
        "line": 25
      }
    }
  }
}
```

### rename

```json
{
  "error": {
    "code": 0,
    "message": "Rename target 'ItemCard' is not a valid Aurelia template resource name. Use lowercase letters, digits, '_' or '-' because Aurelia resolves template element and attribute names from lowercased HTML."
  },
  "outcome": "error"
}
```

### Notifications

```json
{
  "notificationCount": 0,
  "notifications": []
}
```

### In-memory apply

```json
{
  "anomalies": [],
  "editCount": 0,
  "expectedOldTexts": [
    "item-card",
    "item"
  ],
  "filesTouched": [],
  "outcome": "rename-error",
  "validation": []
}
```

### Applied diff

_No in-memory diff._

## repeat-local-badge-three-sites

### Probe

```json
{
  "anchor": "repeat.for=\"badge of state.items.badgeFilters\"",
  "at": "badge",
  "atOccurrence": 1,
  "displayPosition": "src/routes/item-list-route.html:17:31",
  "file": "src/routes/item-list-route.html",
  "lspPosition": {
    "character": 30,
    "line": 16
  },
  "newName": "badgeOption",
  "occurrence": 1
}
```

### prepareRename

```json
{
  "outcome": "result",
  "result": {
    "placeholder": "badge",
    "range": {
      "end": {
        "character": 35,
        "line": 16
      },
      "start": {
        "character": 30,
        "line": 16
      }
    }
  }
}
```

### rename

```json
{
  "outcome": "result",
  "result": {
    "changes": {
      "fixtures://pressure/app-pattern-routed-catalog-storefront/src/routes/item-list-route.html": [
        {
          "newText": "badgeOption",
          "range": {
            "end": {
              "character": 35,
              "line": 16
            },
            "start": {
              "character": 30,
              "line": 16
            }
          }
        },
        {
          "newText": "badgeOption",
          "range": {
            "end": {
              "character": 82,
              "line": 16
            },
            "start": {
              "character": 77,
              "line": 16
            }
          }
        },
        {
          "newText": "badgeOption",
          "range": {
            "end": {
              "character": 91,
              "line": 16
            },
            "start": {
              "character": 86,
              "line": 16
            }
          }
        }
      ]
    }
  }
}
```

### Notifications

```json
{
  "notificationCount": 0,
  "notifications": []
}
```

### In-memory apply

```json
{
  "anomalies": [],
  "editCount": 3,
  "expectedOldTexts": [
    "badge"
  ],
  "filesTouched": [
    "src/routes/item-list-route.html"
  ],
  "outcome": "applied",
  "validation": [
    {
      "file": "src/routes/item-list-route.html",
      "newText": "badgeOption",
      "oldText": "badge",
      "range": {
        "end": {
          "character": 35,
          "line": 16
        },
        "start": {
          "character": 30,
          "line": 16
        }
      },
      "source": "changes",
      "status": "ok"
    },
    {
      "file": "src/routes/item-list-route.html",
      "newText": "badgeOption",
      "oldText": "badge",
      "range": {
        "end": {
          "character": 82,
          "line": 16
        },
        "start": {
          "character": 77,
          "line": 16
        }
      },
      "source": "changes",
      "status": "ok"
    },
    {
      "file": "src/routes/item-list-route.html",
      "newText": "badgeOption",
      "oldText": "badge",
      "range": {
        "end": {
          "character": 91,
          "line": 16
        },
        "start": {
          "character": 86,
          "line": 16
        }
      },
      "source": "changes",
      "status": "ok"
    }
  ]
}
```

### Applied diff

```diff
diff --git a/src/routes/item-list-route.html b/src/routes/item-list-route.html
--- a/src/routes/item-list-route.html
+++ b/src/routes/item-list-route.html
@@ -1,31 +1,31 @@
 <section>
   <h2>Featured items</h2>
   <p if.bind="state.items.isLoading">Loading items...</p>
   <div else>
     <form class="catalog-filters" submit.trigger="$event.preventDefault()">
       <label>
         Search
         <input type="search" value.bind="state.items.searchText & debounce:150">
       </label>
       <label>
         <input type="checkbox" checked.bind="state.items.onlyInStock">
         In stock only
       </label>
       <label>
         Badge
         <select value.bind="state.items.badgeFilter">
-          <option repeat.for="badge of state.items.badgeFilters" model.bind="badge">${badge}</option>
+          <option repeat.for="badgeOption of state.items.badgeFilters" model.bind="badgeOption">${badgeOption}</option>
         </select>
       </label>
     </form>
     <p if.bind="!state.items.hasItems">No featured items are available yet.</p>
     <template else>
       <p if.bind="!state.items.hasVisibleItems">No items match the current filters.</p>
       <ul if.bind="state.items.hasVisibleItems" class="item-grid">
         <li repeat.for="item of state.items.visibleItems">
           <item-card item.bind="item"></item-card>
         </li>
       </ul>
     </template>
   </div>
 </section>
```

## ts-property-state

### Probe

```json
{
  "anchor": "readonly state = resolve(CatalogState)",
  "at": "state",
  "atOccurrence": 1,
  "displayPosition": "src/routes/item-list-route.ts:12:12",
  "file": "src/routes/item-list-route.ts",
  "lspPosition": {
    "character": 11,
    "line": 11
  },
  "newName": "catalog",
  "occurrence": 1
}
```

### prepareRename

```json
{
  "outcome": "result",
  "result": null
}
```

### rename

```json
{
  "outcome": "result",
  "result": null
}
```

### Notifications

```json
{
  "notificationCount": 0,
  "notifications": []
}
```

### In-memory apply

```json
{
  "anomalies": [],
  "editCount": 0,
  "expectedOldTexts": [
    "state"
  ],
  "filesTouched": [],
  "outcome": "no-workspace-edit",
  "validation": []
}
```

### Applied diff

_No in-memory diff._

## refusal-invalid-new-name

### Probe

```json
{
  "anchor": "state.items.searchText",
  "at": "searchText",
  "atOccurrence": 1,
  "displayPosition": "src/routes/item-list-route.html:8:54",
  "file": "src/routes/item-list-route.html",
  "lspPosition": {
    "character": 53,
    "line": 7
  },
  "newName": "not-valid-name",
  "occurrence": 1
}
```

### prepareRename

```json
{
  "outcome": "result",
  "result": {
    "placeholder": "searchText",
    "range": {
      "end": {
        "character": 63,
        "line": 7
      },
      "start": {
        "character": 53,
        "line": 7
      }
    }
  }
}
```

### rename

```json
{
  "error": {
    "code": 0,
    "message": "Rename target 'not-valid-name' is not a valid TypeScript identifier."
  },
  "outcome": "error"
}
```

### Notifications

```json
{
  "notificationCount": 0,
  "notifications": []
}
```

### In-memory apply

```json
{
  "anomalies": [],
  "editCount": 0,
  "expectedOldTexts": [
    "searchText"
  ],
  "filesTouched": [],
  "outcome": "rename-error",
  "validation": []
}
```

### Applied diff

_No in-memory diff._
