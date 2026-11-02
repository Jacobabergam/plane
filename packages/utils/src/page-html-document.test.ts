/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  HTML_DOCUMENT_SANDBOX,
  getHtmlDocumentLabel,
  isClaudeArtifactUrl,
  isHtmlDocumentFile,
  normalizeHtmlDocumentSourceUrl,
} from "./page-html-document.ts";

describe("HTML_DOCUMENT_SANDBOX", () => {
  it("runs scripts in an opaque origin that cannot navigate the Plane tab", () => {
    const tokens = HTML_DOCUMENT_SANDBOX.split(" ");
    assert.ok(tokens.includes("allow-scripts"));
    for (const forbidden of ["allow-same-origin", "allow-top-navigation", "allow-top-navigation-by-user-activation"]) {
      assert.equal(tokens.includes(forbidden), false, forbidden);
    }
  });
});

describe("isHtmlDocumentFile", () => {
  it("accepts .html, .htm and text/html", () => {
    assert.equal(isHtmlDocumentFile({ name: "Mock.HTML", type: "" }), true);
    assert.equal(isHtmlDocumentFile({ name: "mock.htm", type: "application/octet-stream" }), true);
    assert.equal(isHtmlDocumentFile({ name: "artifact", type: "text/html" }), true);
  });

  it("refuses other files", () => {
    assert.equal(isHtmlDocumentFile({ name: "mock.png", type: "image/png" }), false);
    assert.equal(isHtmlDocumentFile({ name: "mock.html.zip", type: "application/zip" }), false);
  });
});

describe("normalizeHtmlDocumentSourceUrl", () => {
  it("keeps http(s) links and maps blank to none", () => {
    assert.equal(normalizeHtmlDocumentSourceUrl("  https://claude.ai/artifact/abc  "), "https://claude.ai/artifact/abc");
    assert.equal(normalizeHtmlDocumentSourceUrl("http://plane.lan/x"), "http://plane.lan/x");
    assert.equal(normalizeHtmlDocumentSourceUrl("   "), "");
  });

  it("refuses other schemes and non-URLs", () => {
    assert.equal(normalizeHtmlDocumentSourceUrl("javascript:alert(1)"), null);
    assert.equal(normalizeHtmlDocumentSourceUrl("claude.ai/artifact/abc"), null);
    assert.equal(normalizeHtmlDocumentSourceUrl("data:text/html,hi"), null);
  });
});

describe("isClaudeArtifactUrl", () => {
  it("matches claude.ai artifact links only", () => {
    assert.equal(isClaudeArtifactUrl("https://claude.ai/artifact/abc"), true);
    assert.equal(isClaudeArtifactUrl("https://claude.ai/code/artifact/0f1e"), true);
    assert.equal(isClaudeArtifactUrl("https://claude.ai/chat/abc"), false);
    assert.equal(isClaudeArtifactUrl("https://claude.ai.evil.example/artifact/abc"), false);
    assert.equal(isClaudeArtifactUrl(""), false);
    assert.equal(isClaudeArtifactUrl(undefined), false);
  });
});

describe("getHtmlDocumentLabel", () => {
  it("prefers the title, then the file name without extension", () => {
    assert.equal(getHtmlDocumentLabel({ title: " Workout summary ", name: "a.html" }), "Workout summary");
    assert.equal(getHtmlDocumentLabel({ title: "", name: "home-screen.HTM" }), "home-screen");
    assert.equal(getHtmlDocumentLabel({ title: null, name: "" }), "HTML design");
  });
});
