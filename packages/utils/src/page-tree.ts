/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

export type TPageTreeSource = {
  id: string;
  parent?: string | null;
};

export type TPageTree = {
  rootIds: string[];
  childIdsByParent: Record<string, string[]>;
};

export type TPageAncestry = {
  /** Root first, immediate parent last. Does not include the starting page. */
  ancestorIds: string[];
  /** Set when the chain stops because a parent id is not in the lookup. */
  missingParentId?: string;
};

export type TBreadcrumbSegment<T> = { kind: "item"; item: T } | { kind: "ellipsis"; hidden: T[] };

const normalizeParentId = (parent: string | null | undefined): string | null => {
  if (!parent) return null;
  return parent;
};

/**
 * Walk `parent` toward the root.
 * `getPage` returns undefined when that page has not been loaded yet.
 */
export const walkPageAncestors = (
  startParentId: string | null | undefined,
  getPage: (id: string) => { parent?: string | null } | undefined
): TPageAncestry => {
  const chain: string[] = [];
  const seen = new Set<string>();
  let parentId = normalizeParentId(startParentId) ?? undefined;

  while (parentId) {
    if (seen.has(parentId)) break;
    seen.add(parentId);
    const parent = getPage(parentId);
    if (!parent) return { ancestorIds: chain.toReversed(), missingParentId: parentId };
    chain.push(parentId);
    parentId = normalizeParentId(parent.parent) ?? undefined;
  }

  return { ancestorIds: chain.toReversed() };
};

const createsCycle = (pageId: string, parentId: string, parentOf: Map<string, string>): boolean => {
  const seen = new Set<string>([pageId]);
  let current: string | undefined = parentId;
  while (current) {
    if (seen.has(current)) return true;
    seen.add(current);
    current = parentOf.get(current);
  }
  return false;
};

/**
 * Build a tree from a flat list of pages that each store a `parent` id.
 * Pages are ordered as given, so sibling order follows the caller's sort.
 * A page whose parent is missing from the set becomes a root (another tab, or not loaded).
 * When `matchIds` is set, only matches and their in-set ancestors are kept, so a search
 * hit still renders under its path.
 * `flat` skips nesting (archived tab).
 */
export const buildPageTree = (
  orderedPages: TPageTreeSource[],
  options?: {
    matchIds?: ReadonlySet<string> | null;
    flat?: boolean;
  }
): TPageTree => {
  const pagesById = new Map<string, TPageTreeSource>();
  for (const page of orderedPages) {
    if (!pagesById.has(page.id)) pagesById.set(page.id, page);
  }

  const included = new Set<string>();
  const matchIds = options?.matchIds;
  if (matchIds) {
    for (const matchId of matchIds) {
      if (!pagesById.has(matchId)) continue;
      included.add(matchId);
      const { ancestorIds } = walkPageAncestors(pagesById.get(matchId)?.parent, (id) => pagesById.get(id));
      for (const ancestorId of ancestorIds) included.add(ancestorId);
    }
  } else {
    for (const page of orderedPages) included.add(page.id);
  }

  if (options?.flat) {
    // Archived rows stay flat. A search hit keeps its own row; the path is a label, not extra ancestors.
    const visibleIds = matchIds ?? included;
    return {
      rootIds: orderedPages.filter((page) => visibleIds.has(page.id)).map((page) => page.id),
      childIdsByParent: {},
    };
  }

  const childIdsByParent: Record<string, string[]> = {};
  const rootIds: string[] = [];
  const parentOf = new Map<string, string>();

  for (const page of orderedPages) {
    if (!included.has(page.id)) continue;
    const parentId = normalizeParentId(page.parent);
    const canNest =
      !!parentId && parentId !== page.id && included.has(parentId) && !createsCycle(page.id, parentId, parentOf);

    if (parentId && canNest) {
      const siblings = childIdsByParent[parentId] ?? [];
      siblings.push(page.id);
      childIdsByParent[parentId] = siblings;
      parentOf.set(page.id, parentId);
    } else {
      rootIds.push(page.id);
    }
  }

  return { rootIds, childIdsByParent };
};

/**
 * Collapse the middle of a long breadcrumb.
 * `maxVisible` includes the first item and the tail; everything between becomes one ellipsis.
 */
export const collapseBreadcrumbMiddle = <T>(items: T[], maxVisible = 3): TBreadcrumbSegment<T>[] => {
  if (maxVisible < 2 || items.length <= maxVisible) {
    return items.map((item) => ({ kind: "item", item }));
  }

  const tailCount = maxVisible - 1;
  const hidden = items.slice(1, items.length - tailCount);
  const tail = items.slice(items.length - tailCount);

  return [
    { kind: "item", item: items[0] as T },
    { kind: "ellipsis", hidden },
    ...tail.map((item) => ({ kind: "item" as const, item })),
  ];
};
