/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { buildPageTree, type TPageTree } from "./page-tree";

export type TDocsNavSource = {
  id: string;
  parent?: string | null;
  name?: string;
  /** Set when the page is archived. Archived pages are left out of the docs tree. */
  archivedAt?: string | null;
};

const pageLabel = (name: string | undefined): string => {
  if (!name || name.trim() === "") return "Untitled";
  return name;
};

/**
 * Docs sidebar tree: non-archived pages, nested by `parent`, siblings sorted by title.
 * A search keeps each match under its ancestors. An archived parent is skipped, so a
 * living child is shown at the root.
 */
export const buildDocsNavigationTree = (pages: readonly TDocsNavSource[], query = ""): TPageTree => {
  const active = pages
    .filter((page) => !page.archivedAt)
    .toSorted((a, b) => pageLabel(a.name).localeCompare(pageLabel(b.name)));

  const trimmed = query.trim().toLowerCase();
  const matchIds = trimmed
    ? new Set(active.filter((page) => pageLabel(page.name).toLowerCase().includes(trimmed)).map((page) => page.id))
    : null;

  return buildPageTree(
    active.map((page) => ({ id: page.id, parent: page.parent })),
    { matchIds }
  );
};

/** Parents that actually have children in this tree. Used to open a search result's path. */
export const parentIdsInTree = (tree: TPageTree): string[] =>
  Object.entries(tree.childIdsByParent)
    .filter(([, childIds]) => childIds.length > 0)
    .map(([parentId]) => parentId);

/**
 * Remembered expanded ids, plus ids that must be open (the current page's ancestors).
 * Order is persisted ids first, then any required id that was not already stored.
 */
export const mergeExpandedPageIds = (persistedIds: readonly string[], requiredIds: readonly string[]): string[] => {
  const merged: string[] = [];
  const seen = new Set<string>();
  for (const id of [...persistedIds, ...requiredIds]) {
    if (seen.has(id)) continue;
    seen.add(id);
    merged.push(id);
  }
  return merged;
};
