import { test } from "vitest";
import assert from "node:assert/strict";

import { InMemorySourceStore } from "../../out/index.js";

test("InMemorySourceStore auto-increments versions and overwrites snapshots", () => {
  const store = new InMemorySourceStore();
  const uri = "/app/example.html";

  const first = store.set(uri, "<template>one</template>");
  assert.equal(first.version, 1);

  const second = store.set(uri, "<template>two</template>");
  assert.equal(second.version, 2);
  assert.equal(store.get(uri)?.text, "<template>two</template>");

  const explicit = store.set(uri, "<template>ten</template>", 10);
  assert.equal(explicit.version, 10);

  const implicit = store.set(uri, "<template>eleven</template>");
  assert.equal(implicit.version, 11);
});

test("InMemorySourceStore enumerates and deletes snapshots", () => {
  const store = new InMemorySourceStore();
  const uris = ["/a.html", "/b.html", "/c.html"];

  for (const uri of uris) store.set(uri, `<template>${uri}</template>`);

  const snapshots = Array.from(store.all());
  assert.equal(snapshots.length, uris.length);
  assert.ok(snapshots.some((snap) => snap.uri === "/b.html"));

  store.delete("/b.html");
  assert.equal(store.get("/b.html"), null);
  assert.equal(Array.from(store.all()).length, uris.length - 1);

  store.delete("/a.html");
  store.delete("/c.html");
  assert.equal(Array.from(store.all()).length, 0);
});
