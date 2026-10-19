/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { getPageDropValidity, isDescendant } from "./page-dnd.ts";

const childIdsByParent: Record<string, string[]> = {
  root: ["child", "sibling"],
  child: ["grand"],
  grand: ["great"],
};

describe("isDescendant", () => {
  it("finds children and deeper descendants", () => {
    assert.equal(isDescendant(childIdsByParent, "root", "child"), true);
    assert.equal(isDescendant(childIdsByParent, "root", "great"), true);
    assert.equal(isDescendant(childIdsByParent, "child", "great"), true);
  });

  it("is false for the page itself, ancestors, siblings and unknown ids", () => {
    assert.equal(isDescendant(childIdsByParent, "root", "root"), false);
    assert.equal(isDescendant(childIdsByParent, "grand", "root"), false);
    assert.equal(isDescendant(childIdsByParent, "child", "sibling"), false);
    assert.equal(isDescendant(childIdsByParent, "missing", "child"), false);
  });

  it("does not loop when the input cycles", () => {
    const cycled = { a: ["b"], b: ["a"] };
    assert.equal(isDescendant(cycled, "a", "b"), true);
    assert.equal(isDescendant(cycled, "a", "c"), false);
  });
});

describe("getPageDropValidity", () => {
  const validity = (draggedId: string, currentParentId: string | null | undefined, targetParentId: string | null) =>
    getPageDropValidity({ childIdsByParent, draggedId, currentParentId, targetParentId });

  it("allows a move to an unrelated page or to the top level", () => {
    assert.equal(validity("grand", "child", "sibling"), "valid");
    assert.equal(validity("grand", "child", null), "valid");
    assert.equal(validity("child", "root", "sibling"), "valid");
  });

  it("rejects the page itself and its descendants", () => {
    assert.equal(validity("child", "root", "child"), "self");
    assert.equal(validity("root", null, "great"), "descendant");
    assert.equal(validity("root", null, "child"), "descendant");
  });

  it("treats the current parent as a no-op, including top level for a root page", () => {
    assert.equal(validity("grand", "child", "child"), "same-parent");
    assert.equal(validity("root", undefined, null), "same-parent");
    assert.equal(validity("root", null, null), "same-parent");
  });
});
