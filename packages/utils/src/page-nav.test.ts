/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildDocsNavigationTree, mergeExpandedPageIds, parentIdsInTree } from "./page-nav.ts";

const docsFixture = [
  { id: "index", name: "Docs index", parent: null },
  { id: "specs", name: "Product specs", parent: "index" },
  { id: "coach", name: "AI coach v1", parent: "specs" },
  { id: "old", name: "Retired spec", parent: "specs", archivedAt: "2024-01-01T00:00:00Z" },
];

describe("buildDocsNavigationTree", () => {
  it("nests a three-level docs tree and leaves archived pages out", () => {
    const tree = buildDocsNavigationTree(docsFixture);

    assert.deepEqual(tree.rootIds, ["index"]);
    assert.deepEqual(tree.childIdsByParent.index, ["specs"]);
    assert.deepEqual(tree.childIdsByParent.specs, ["coach"]);
    assert.equal(JSON.stringify(tree).includes("old"), false);
  });

  it("keeps a search hit under Docs index > Product specs", () => {
    const tree = buildDocsNavigationTree(docsFixture, "coach");

    assert.deepEqual(tree.rootIds, ["index"]);
    assert.deepEqual(tree.childIdsByParent.index, ["specs"]);
    assert.deepEqual(tree.childIdsByParent.specs, ["coach"]);
    const parents = new Set(parentIdsInTree(tree));
    assert.equal(parents.size, 2);
    assert.equal(parents.has("index"), true);
    assert.equal(parents.has("specs"), true);
  });

  it("promotes a page whose parent is archived", () => {
    const tree = buildDocsNavigationTree([
      { id: "archived-parent", name: "Old folder", parent: null, archivedAt: "2024-01-01" },
      { id: "living", name: "Still here", parent: "archived-parent" },
    ]);

    assert.deepEqual(tree.rootIds, ["living"]);
    assert.deepEqual(tree.childIdsByParent, {});
  });
});

describe("mergeExpandedPageIds", () => {
  it("keeps the remembered ids and adds ancestors of the current page", () => {
    assert.deepEqual(mergeExpandedPageIds(["notes"], ["index", "specs"]), ["notes", "index", "specs"]);
    assert.deepEqual(mergeExpandedPageIds(["index", "specs"], ["index"]), ["index", "specs"]);
  });
});
