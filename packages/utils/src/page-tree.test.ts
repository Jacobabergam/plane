/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildPageTree,
  collapseBreadcrumbMiddle,
  collectPageDescendantIds,
  isAllowedPageParent,
  walkPageAncestors,
} from "./page-tree.ts";

describe("walkPageAncestors", () => {
  const pages = new Map<string, { parent?: string | null }>([
    ["root", { parent: null }],
    ["child", { parent: "root" }],
    ["grand", { parent: "child" }],
  ]);

  it("returns ancestors root-first and stops on a missing parent", () => {
    const loaded = walkPageAncestors("child", (id) => pages.get(id));
    assert.deepEqual(loaded, { ancestorIds: ["root", "child"] });

    const missing = walkPageAncestors("missing", (id) => pages.get(id));
    assert.deepEqual(missing, { ancestorIds: [], missingParentId: "missing" });
  });

  it("does not loop when parents cycle", () => {
    const cycled = new Map<string, { parent?: string | null }>([
      ["a", { parent: "b" }],
      ["b", { parent: "a" }],
    ]);
    const ancestry = walkPageAncestors("b", (id) => cycled.get(id));
    assert.deepEqual(ancestry.ancestorIds, ["a", "b"]);
    assert.equal(ancestry.missingParentId, undefined);
  });
});

describe("buildPageTree", () => {
  const pages = [
    { id: "root", parent: null },
    { id: "child", parent: "root" },
    { id: "grand", parent: "child" },
    { id: "orphan", parent: "outside" },
  ];

  it("nests children and promotes pages whose parent is not in the set", () => {
    const tree = buildPageTree(pages);
    assert.deepEqual(tree.rootIds, ["root", "orphan"]);
    assert.deepEqual(tree.childIdsByParent, {
      root: ["child"],
      child: ["grand"],
    });
  });

  it("keeps a search match under its ancestor path", () => {
    const tree = buildPageTree(pages, { matchIds: new Set(["grand"]) });
    assert.deepEqual(tree.rootIds, ["root"]);
    assert.deepEqual(tree.childIdsByParent.root, ["child"]);
    assert.deepEqual(tree.childIdsByParent.child, ["grand"]);
  });

  it("returns a flat list for archived pages", () => {
    const tree = buildPageTree(pages, { flat: true });
    assert.deepEqual(tree.rootIds, ["root", "child", "grand", "orphan"]);
    assert.deepEqual(tree.childIdsByParent, {});
  });

  it("flattens a search match without also listing ancestors that missed the query", () => {
    const tree = buildPageTree(pages, { flat: true, matchIds: new Set(["grand"]) });
    assert.deepEqual(tree.rootIds, ["grand"]);
    assert.deepEqual(tree.childIdsByParent, {});
  });

  it("does not recurse forever when two pages parent each other", () => {
    const tree = buildPageTree([
      { id: "a", parent: "b" },
      { id: "b", parent: "a" },
    ]);
    assert.equal(tree.rootIds.length, 1);
    const root = tree.rootIds[0];
    assert.ok(root);
    assert.deepEqual(tree.childIdsByParent[root], [root === "a" ? "b" : "a"]);
  });
});

describe("collapseBreadcrumbMiddle", () => {
  it("leaves short chains intact and collapses the middle", () => {
    assert.deepEqual(
      collapseBreadcrumbMiddle(["a", "b", "c"]).map((segment) => segment.kind),
      ["item", "item", "item"]
    );

    const collapsed = collapseBreadcrumbMiddle(["a", "b", "c", "d", "e"]);
    assert.deepEqual(collapsed, [
      { kind: "item", item: "a" },
      { kind: "ellipsis", hidden: ["b", "c"] },
      { kind: "item", item: "d" },
      { kind: "item", item: "e" },
    ]);
  });
});

describe("collectPageDescendantIds", () => {
  const pages = [
    { id: "root", parent: null },
    { id: "child", parent: "root" },
    { id: "grand", parent: "child" },
    { id: "sibling", parent: "root" },
    { id: "other", parent: null },
  ];

  it("returns every page below the given one, at any depth", () => {
    const descendants = collectPageDescendantIds("root", pages);
    assert.deepEqual([...descendants].toSorted(), ["child", "grand", "sibling"]);
    assert.deepEqual([...collectPageDescendantIds("child", pages)], ["grand"]);
    assert.equal(collectPageDescendantIds("other", pages).size, 0);
  });

  it("terminates when the data already cycles", () => {
    const cycled = [
      { id: "a", parent: "b" },
      { id: "b", parent: "a" },
    ];
    assert.deepEqual([...collectPageDescendantIds("a", cycled)], ["b"]);
  });
});

describe("isAllowedPageParent", () => {
  const pages = [
    { id: "root", parent: null },
    { id: "child", parent: "root" },
    { id: "grand", parent: "child" },
    { id: "other", parent: null },
  ];

  it("allows the top level, a sibling tree and an ancestor", () => {
    assert.equal(isAllowedPageParent("child", null, pages), true);
    assert.equal(isAllowedPageParent("child", undefined, pages), true);
    assert.equal(isAllowedPageParent("child", "other", pages), true);
    assert.equal(isAllowedPageParent("grand", "root", pages), true);
  });

  it("refuses the page itself and its descendants", () => {
    assert.equal(isAllowedPageParent("root", "root", pages), false);
    assert.equal(isAllowedPageParent("root", "child", pages), false);
    assert.equal(isAllowedPageParent("root", "grand", pages), false);
  });
});
