/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

const NON_NAVIGABLE_PROTOCOLS = ["javascript:", "data:", "vbscript:", "mailto:", "tel:", "file:", "about:"];
/** Same-origin paths served by other processes, not the app router. */
const NON_APP_PATH_PREFIXES = ["/api/", "/god-mode/", "/spaces/", "/live/", "/uploads/"];

const isNonAppPath = (pathname: string): boolean =>
  NON_APP_PATH_PREFIXES.some((prefix) => pathname === prefix.slice(0, -1) || pathname.startsWith(prefix));

export type NavigateInternalLink = (path: string) => void;

const resolveBaseHref = (baseHref?: string): string | undefined => {
  if (baseHref) return baseHref;
  if (typeof window !== "undefined" && window.location?.href) return window.location.href;
  return undefined;
};

const hasBlockedProtocol = (href: string): boolean => {
  const lower = href.trim().toLowerCase();
  return NON_NAVIGABLE_PROTOCOLS.some((protocol) => lower.startsWith(protocol));
};

/**
 * Relative paths and same-origin http(s) URLs stay inside the Plane app.
 * A different origin, or a non-http protocol such as mailto, is external.
 */
export const isInternalAppLink = (href: string, baseHref?: string): boolean => {
  const trimmed = href.trim();
  if (!trimmed || hasBlockedProtocol(trimmed)) return false;

  const base = resolveBaseHref(baseHref);
  if (!base) return trimmed.startsWith("/") && !trimmed.startsWith("//") && !isNonAppPath(trimmed);

  try {
    const url = new URL(trimmed, base);
    if (url.protocol !== "http:" && url.protocol !== "https:") return false;
    if (url.origin !== new URL(base).origin) return false;
    return !isNonAppPath(url.pathname);
  } catch {
    return false;
  }
};

/** Path, query, and hash the client router can push without a document reload. */
export const toAppRouterPath = (href: string, baseHref?: string): string => {
  const trimmed = href.trim();
  const base = resolveBaseHref(baseHref) ?? "http://localhost/";
  try {
    const url = new URL(trimmed, base);
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return trimmed;
  }
};

export const findLinkAnchor = (target: EventTarget | null, boundary?: Node | null): HTMLAnchorElement | null => {
  if (!(target instanceof Element)) return null;
  const anchor = target.closest("a");
  if (!(anchor instanceof HTMLAnchorElement)) return null;
  if (boundary && !boundary.contains(anchor)) return null;
  return anchor;
};

/**
 * True when the anchor is a node view's own chrome (a mention, an embed card), not a link mark
 * inside a node view's editable content such as a callout paragraph.
 */
export const isNodeViewChrome = (anchor: Element): boolean => {
  const host = anchor.closest("[data-node-view-wrapper],[data-node-view-content]");
  return !!host?.hasAttribute("data-node-view-wrapper");
};

export type FollowEditorLinkArgs = {
  href: string;
  navigateInternalLink?: NavigateInternalLink | null;
};

export type FollowEditorLinkResult = "internal" | "external" | "ignored";

/**
 * Internal links navigate the current tab. When the app injected a router callback,
 * that callback is used so React Router updates without a reload. External links
 * keep opening in a new tab.
 */
export const followEditorLink = (args: FollowEditorLinkArgs): FollowEditorLinkResult => {
  const href = args.href.trim();
  if (!href || hasBlockedProtocol(href)) return "ignored";

  if (isInternalAppLink(href)) {
    if (href.startsWith("#")) {
      if (typeof window !== "undefined") window.location.hash = href;
      return "internal";
    }
    const path = toAppRouterPath(href);
    if (args.navigateInternalLink) {
      args.navigateInternalLink(path);
    } else if (typeof window !== "undefined") {
      window.location.assign(path);
    }
    return "internal";
  }

  if (typeof window !== "undefined") {
    const destination = (() => {
      try {
        return new URL(href, window.location.href).href;
      } catch {
        return href;
      }
    })();
    window.open(destination, "_blank", "noopener,noreferrer");
  }
  return "external";
};
