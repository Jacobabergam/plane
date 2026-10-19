/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

export type TPageLinkTarget = {
  workspaceSlug: string;
  projectId: string;
  pageId: string;
};

const UUID = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";
const PAGE_PATH = new RegExp(`^/([^/]+)/projects/(${UUID})/pages/(${UUID})/?$`, "i");

const safeDecode = (value: string): string => {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
};

/**
 * Reads `/{workspaceSlug}/projects/{projectId}/pages/{pageId}`. A query string or hash is
 * ignored. An absolute URL is accepted and only its path is read; the caller checks the origin.
 * Anything else, such as the pages list or a work item, returns null.
 */
export const parsePageLinkPath = (pathname: string): TPageLinkTarget | null => {
  let path = pathname.trim();
  if (!path) return null;
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(path)) {
    try {
      path = new URL(path).pathname;
    } catch {
      return null;
    }
  }
  path = path.split(/[?#]/, 1)[0] ?? "";

  const match = PAGE_PATH.exec(path);
  if (!match) return null;
  const [, workspaceSlug, projectId, pageId] = match;
  if (!workspaceSlug || !projectId || !pageId) return null;

  return {
    workspaceSlug: safeDecode(workspaceSlug),
    projectId: projectId.toLowerCase(),
    pageId: pageId.toLowerCase(),
  };
};

const NAMED_ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  hellip: "…",
  mdash: "—",
  ndash: "–",
};

const decodeEntities = (text: string): string =>
  text.replace(/&(#x[0-9a-f]+|#[0-9]+|[a-z]+);/gi, (entity, body: string) => {
    if (body.startsWith("#")) {
      const isHex = body[1] === "x" || body[1] === "X";
      const code = Number.parseInt(body.slice(isHex ? 2 : 1), isHex ? 16 : 10);
      if (!Number.isFinite(code) || code < 0 || code > 0x10ffff) return entity;
      try {
        return String.fromCodePoint(code);
      } catch {
        return entity;
      }
    }
    return NAMED_ENTITIES[body.toLowerCase()] ?? entity;
  });

const BLOCK_TAGS =
  "address|article|aside|blockquote|br|dd|details|div|dl|dt|figcaption|figure|footer|h[1-6]|header|hr|li|main|nav|ol|p|pre|section|summary|table|tbody|td|tfoot|th|thead|tr|ul";
const BLOCK_BOUNDARY = new RegExp(`<\\/?(?:${BLOCK_TAGS})\\b[^>]*>`, "gi");

/**
 * Plain-text start of an HTML body, for previews. Tags are removed, blocks become spaces,
 * entities are decoded and whitespace is collapsed. A longer text is cut at a word near
 * `max` characters and ends with an ellipsis.
 */
export const htmlToExcerpt = (html: string | null | undefined, max = 280): string => {
  if (!html || max <= 0) return "";

  const text = decodeEntities(
    html
      .replace(/<!--[\s\S]*?-->/g, " ")
      .replace(/<(script|style|template)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, " ")
      .replace(BLOCK_BOUNDARY, " ")
      .replace(/<[^>]*>/g, "")
  )
    .replace(/\s+/g, " ")
    .trim();

  if (text.length <= max) return text;

  const cut = text.slice(0, max);
  const lastSpace = cut.lastIndexOf(" ");
  const head = lastSpace >= max * 0.6 ? cut.slice(0, lastSpace) : cut;
  return `${head.replace(/[\s.,;:!?-]+$/, "")}…`;
};
