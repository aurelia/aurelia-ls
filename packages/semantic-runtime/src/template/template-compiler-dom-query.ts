import type {
  TemplateCompilerAttributeOccurrence,
  TemplateCompilerElementOccurrence,
  TemplateCompilerParentOccurrence,
} from './template-compiler-occurrence.js';
import {
  TemplateCompilerElementOccurrence as ElementOccurrence,
} from './template-compiler-occurrence.js';

export type TemplateCompilerElementQuery = (
  element: TemplateCompilerElementOccurrence,
) => boolean;

/**
 * Snapshot descendant elements in DOM `querySelectorAll(...)` order.
 *
 * Template content is a separate DOM fragment, not a child edge of its `<template>` carrier. Traversal therefore
 * follows ordinary child edges only. Callers query a nested template by passing its `templateContent` explicitly.
 */
export function snapshotTemplateCompilerDescendantElements(
  root: TemplateCompilerParentOccurrence,
  query: TemplateCompilerElementQuery | null = null,
): readonly TemplateCompilerElementOccurrence[] {
  const elements: TemplateCompilerElementOccurrence[] = [];
  const visit = (parent: TemplateCompilerParentOccurrence): void => {
    for (const child of parent.readChildren()) {
      if (!(child instanceof ElementOccurrence)) continue;
      elements.push(child);
      visit(child);
    }
  };
  visit(root);
  return query == null ? elements : elements.filter(query);
}

/** Exact DOM `childElementCount` over the root's ordinary child edge. */
export function templateCompilerDirectElementCount(
  root: TemplateCompilerParentOccurrence,
): number {
  let count = 0;
  for (const child of root.readChildren()) {
    if (child instanceof ElementOccurrence) count++;
  }
  return count;
}

/** Find the live attribute occurrence with one exact browser/runtime name spelling. */
export function templateCompilerElementAttribute(
  element: TemplateCompilerElementOccurrence,
  name: string,
): TemplateCompilerAttributeOccurrence | null {
  return element.readAttributes().find((attribute) => attribute.name === name) ?? null;
}
