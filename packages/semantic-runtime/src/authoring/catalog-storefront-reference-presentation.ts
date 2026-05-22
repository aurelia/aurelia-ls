import { sourceText } from './source-template.js';

export const CATALOG_STOREFRONT_ROOT_STYLE_SOURCE = sourceText(`.catalog-shell {
  display: grid;
  gap: 1rem;
  max-width: 64rem;
  margin: 0 auto;
  padding: 2rem;
}

.catalog-filters {
  align-items: end;
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
}

.catalog-filters label {
  display: grid;
  gap: 0.25rem;
}

.__ENTITY_KEBAB__-grid {
  display: grid;
  gap: 1rem;
  grid-template-columns: repeat(auto-fit, minmax(12rem, 1fr));
  padding: 0;
  list-style: none;
}

.__ENTITY_KEBAB__-card {
  border: 1px solid #d0d7de;
  border-radius: 0.5rem;
  padding: 1rem;
}

.selection-progress {
  background: #eef2f7;
  height: 0.375rem;
}

.selection-progress span {
  background: #0f766e;
  display: block;
  height: 100%;
}

.sale {
  border-color: #0f766e;
}

.new {
  border-color: #7c3aed;
}

.highlighted {
  box-shadow: 0 0 0 0.125rem rgba(15, 118, 110, 0.16);
}
`);

export const ROUTED_CATALOG_STOREFRONT_ROOT_STYLE_SOURCE = sourceText(`main {
  display: grid;
  gap: 1.5rem;
  max-width: 72rem;
  margin: 0 auto;
  padding: 2rem;
}

header {
  display: grid;
  gap: 0.75rem;
}

nav {
  display: flex;
  gap: 1rem;
}

nav a {
  color: #1f2937;
}

nav a.active-route {
  font-weight: 700;
}

.routed-layout {
  min-height: 20rem;
}

.__ENTITY_KEBAB__-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(14rem, 1fr));
  gap: 1rem;
  padding: 0;
  list-style: none;
}

.__ENTITY_KEBAB__-card,
.__ENTITY_KEBAB__-detail {
  border: 1px solid #d0d7de;
  border-radius: 0.5rem;
  padding: 1rem;
}

.selection-progress {
  height: 0.5rem;
  background: #eaeef2;
}

.selection-progress span {
  display: block;
  height: 100%;
  background: #2563eb;
}
`);
