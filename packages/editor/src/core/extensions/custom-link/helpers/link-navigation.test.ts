/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isInternalAppLink, toAppRouterPath } from "./link-navigation.ts";

const BASE = "https://plane.example/bergam-home/projects/p1/pages/page-1/";

describe("isInternalAppLink", () => {
  it("treats relative paths and same-origin absolute URLs as internal", () => {
    assert.equal(isInternalAppLink("/bergam-home/projects/p1/pages/page-2", BASE), true);
    assert.equal(isInternalAppLink("page-2", BASE), true);
    assert.equal(isInternalAppLink("../pages/page-2", BASE), true);
    assert.equal(isInternalAppLink("#section", BASE), true);
    assert.equal(isInternalAppLink("https://plane.example/bergam-home/projects/p1/pages/page-2", BASE), true);
    assert.equal(isInternalAppLink("//plane.example/bergam-home/projects/p1/pages/page-2", BASE), true);
    assert.equal(isInternalAppLink("/bergam-home/projects/p/pages/q", BASE), true);
  });

  it("treats same-origin paths served outside the app router as external", () => {
    assert.equal(isInternalAppLink("/api/assets/x", BASE), false);
    assert.equal(isInternalAppLink("https://plane.example/api/assets/x", BASE), false);
    assert.equal(isInternalAppLink("/god-mode/", BASE), false);
    assert.equal(isInternalAppLink("/spaces/issues/abc", BASE), false);
    assert.equal(isInternalAppLink("/live/collaboration", BASE), false);
    assert.equal(isInternalAppLink("/uploads/file.png", BASE), false);
  });

  it("treats a different origin and non-http protocols as external", () => {
    assert.equal(isInternalAppLink("https://example.com/docs", BASE), false);
    assert.equal(isInternalAppLink("//example.com/docs", BASE), false);
    assert.equal(isInternalAppLink("mailto:jacob@example.com", BASE), false);
    assert.equal(isInternalAppLink("javascript:alert(1)", BASE), false);
  });
});

describe("toAppRouterPath", () => {
  it("strips the origin and keeps the path, query, and hash", () => {
    assert.equal(
      toAppRouterPath("https://plane.example/bergam-home/projects/p1/pages/page-2?ref=1#notes", BASE),
      "/bergam-home/projects/p1/pages/page-2?ref=1#notes"
    );
    assert.equal(
      toAppRouterPath("/bergam-home/projects/p1/pages/page-2", BASE),
      "/bergam-home/projects/p1/pages/page-2"
    );
  });
});
