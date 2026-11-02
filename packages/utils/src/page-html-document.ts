/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

/**
 * Helpers for a page's HTML document (a design mockup, e.g. a Claude artifact), shown at the top of the page in a
 * sandboxed iframe. Kept free of React and the store so the rules can be tested on their own.
 */

/**
 * The iframe sandbox for a page's HTML document. Scripts run (artifacts are interactive) but without
 * `allow-same-origin` the document gets an opaque origin: it cannot read Plane's cookies, storage or API, and
 * without `allow-top-navigation` it cannot navigate the Plane tab. Links and `window.open` still open new tabs.
 */
export const HTML_DOCUMENT_SANDBOX = [
  "allow-scripts",
  "allow-forms",
  "allow-modals",
  "allow-popups",
  "allow-popups-to-escape-sandbox",
  "allow-downloads",
].join(" ");

export const HTML_DOCUMENT_ACCEPT = ".html,.htm,text/html";

export type THtmlDocumentViewport = "desktop" | "tablet" | "phone";

/** Frame width per preview size; null fills the available width. */
export const HTML_DOCUMENT_VIEWPORT_WIDTHS: Record<THtmlDocumentViewport, number | null> = {
  desktop: null,
  tablet: 820,
  phone: 390,
};

/** True for a file the HTML upload accepts: an .html/.htm name, or a text/html type. */
export const isHtmlDocumentFile = (file: { name: string; type: string }): boolean => {
  const name = file.name.toLowerCase();
  return name.endsWith(".html") || name.endsWith(".htm") || file.type === "text/html";
};

/**
 * The source link as the API stores it: "" for none, a trimmed http(s) URL otherwise. Returns null when the
 * input is not an http(s) URL, so the form can say so before uploading.
 */
export const normalizeHtmlDocumentSourceUrl = (input: string): string | null => {
  const value = input.trim();
  if (!value) return "";
  try {
    const url = new URL(value);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return value;
  } catch {
    return null;
  }
};

/** True for a claude.ai artifact link (the toolbar labels it "Open in Claude"). */
export const isClaudeArtifactUrl = (value: string | null | undefined): boolean => {
  if (!value) return false;
  try {
    const url = new URL(value);
    return url.hostname === "claude.ai" && url.pathname.includes("/artifact");
  } catch {
    return false;
  }
};

/** What the toolbar calls the document: its title, else the file name without the extension. */
export const getHtmlDocumentLabel = (document: { title?: string | null; name?: string | null }): string => {
  const title = document.title?.trim();
  if (title) return title;
  const name = document.name?.trim() ?? "";
  return name.replace(/\.html?$/i, "") || "HTML design";
};
