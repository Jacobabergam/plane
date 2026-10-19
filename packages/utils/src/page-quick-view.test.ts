/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { htmlToExcerpt, parsePageLinkPath } from "./page-quick-view.ts";

const projectId = "0f8c3a52-6c1e-4d4b-9a51-2f7d3e1b9c10";
const pageId = "7a1d9e44-2b3c-4f5a-8e6d-1c2b3a4d5e6f";

describe("parsePageLinkPath", () => {
  it("reads a project page path", () => {
    assert.deepEqual(parsePageLinkPath(`/bergam-home/projects/${projectId}/pages/${pageId}`), {
      workspaceSlug: "bergam-home",
      projectId,
      pageId,
    });
  });

  it("ignores a trailing slash, query and hash", () => {
    const expected = { workspaceSlug: "bergam-home", projectId, pageId };
    assert.deepEqual(parsePageLinkPath(`/bergam-home/projects/${projectId}/pages/${pageId}/`), expected);
    assert.deepEqual(parsePageLinkPath(`/bergam-home/projects/${projectId}/pages/${pageId}?peek=1#intro`), expected);
  });

  it("reads the path of an absolute URL and lowercases ids", () => {
    const upper = pageId.toUpperCase();
    assert.deepEqual(parsePageLinkPath(`https://plane.lan/bergam-home/projects/${projectId}/pages/${upper}`), {
      workspaceSlug: "bergam-home",
      projectId,
      pageId,
    });
  });

  it("returns null for other routes", () => {
    assert.equal(parsePageLinkPath(`/bergam-home/projects/${projectId}/pages`), null);
    assert.equal(parsePageLinkPath(`/bergam-home/projects/${projectId}/pages/archived`), null);
    assert.equal(parsePageLinkPath(`/bergam-home/projects/${projectId}/issues/${pageId}`), null);
    assert.equal(parsePageLinkPath(`/bergam-home/projects/${projectId}/pages/${pageId}/extra`), null);
    assert.equal(parsePageLinkPath(`bergam-home/projects/${projectId}/pages/${pageId}`), null);
    assert.equal(parsePageLinkPath(""), null);
    assert.equal(parsePageLinkPath("mailto:someone@example.com"), null);
  });
});

describe("htmlToExcerpt", () => {
  it("strips tags, separates blocks and decodes entities", () => {
    const html =
      "<h1>Plan</h1><p>Ship <strong>fast</strong> &amp; safe</p><ul><li>One</li><li>Two&nbsp;items</li></ul>";
    assert.equal(htmlToExcerpt(html, 280), "Plan Ship fast & safe One Two items");
  });

  it("keeps inline tags joined and drops scripts, styles and comments", () => {
    const html = "<p>wo<em>rd</em><!-- note --><script>alert(1)</script><style>p{}</style> end&#33; &#x2014;</p>";
    assert.equal(htmlToExcerpt(html, 280), "word end! —");
  });

  it("returns an empty string for empty bodies", () => {
    assert.equal(htmlToExcerpt(undefined, 280), "");
    assert.equal(htmlToExcerpt("", 280), "");
    assert.equal(htmlToExcerpt('<p></p><p class="editor-paragraph-block"></p>', 280), "");
  });

  it("cuts long text at a word and adds an ellipsis", () => {
    const html = `<p>${"alpha beta gamma ".repeat(10)}</p>`;
    const excerpt = htmlToExcerpt(html, 40);
    assert.ok(excerpt.endsWith("…"));
    assert.ok(excerpt.length <= 41);
    assert.equal(excerpt, "alpha beta gamma alpha beta gamma alpha…");
  });

  it("cuts inside a long word when there is no space near the limit", () => {
    assert.equal(htmlToExcerpt(`<p>${"x".repeat(50)}</p>`, 10), `${"x".repeat(10)}…`);
  });

  it("does not decode an entity twice", () => {
    assert.equal(htmlToExcerpt("<p>&amp;lt;tag&amp;gt;</p>", 280), "&lt;tag&gt;");
  });
});
