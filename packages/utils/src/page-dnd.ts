/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

/**
 * Why a drop can or cannot re-parent a page.
 * - `valid`: the move changes the page's parent and keeps the tree acyclic.
 * - `self`: the page would become its own parent.
 * - `descendant`: the new parent sits inside the page's own subtree (a cycle).
 * - `same-parent`: the page already lives there, so the drop is a no-op.
 */
export type TPageDropValidity = "valid" | "self" | "descendant" | "same-parent";

const normalizeParentId = (parent: string | null | undefined): string | null => parent || null;

/**
 * True when `pageId` is somewhere below `ancestorId` (not the ancestor itself).
 * Walks `childIdsByParent` breadth first and tolerates cycles in the input.
 */
export const isDescendant = (
  childIdsByParent: Readonly<Record<string, readonly string[]>>,
  ancestorId: string,
  pageId: string
): boolean => {
  if (ancestorId === pageId) return false;
  const seen = new Set<string>([ancestorId]);
  const queue: string[] = [ancestorId];

  while (queue.length > 0) {
    const currentId = queue.shift();
    if (currentId === undefined) break;
    for (const childId of childIdsByParent[currentId] ?? []) {
      if (childId === pageId) return true;
      if (seen.has(childId)) continue;
      seen.add(childId);
      queue.push(childId);
    }
  }

  return false;
};

/**
 * Decide whether `draggedId` may move under `targetParentId` (`null` = top level).
 * `childIdsByParent` should come from the full, unfiltered tree so a search cannot hide a cycle.
 */
export const getPageDropValidity = (args: {
  childIdsByParent: Readonly<Record<string, readonly string[]>>;
  draggedId: string;
  currentParentId: string | null | undefined;
  targetParentId: string | null;
}): TPageDropValidity => {
  const { childIdsByParent, draggedId, currentParentId, targetParentId } = args;
  if (targetParentId === draggedId) return "self";
  if (normalizeParentId(currentParentId) === normalizeParentId(targetParentId)) return "same-parent";
  if (targetParentId && isDescendant(childIdsByParent, draggedId, targetParentId)) return "descendant";
  return "valid";
};
