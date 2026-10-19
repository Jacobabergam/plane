/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import type { MutableRefObject } from "react";
// plane imports
import type { TPageLinkTarget } from "@plane/utils";
import { parsePageLinkPath } from "@plane/utils";

/** Marks a container whose page links use the quick view. The editor skips its own hover preview there. */
export const PAGE_LINK_QUICK_VIEW_ATTRIBUTE = "data-page-link-quick-view";

const DEFAULT_OPEN_DELAY_MS = 450;
const DEFAULT_CLOSE_DELAY_MS = 200;
/** A touch tap synthesizes mouseover; ignore hovers this long after a touch. */
const TOUCH_HOVER_SUPPRESS_MS = 800;

export type TPageQuickViewTarget = TPageLinkTarget & {
  anchor: HTMLAnchorElement;
};

export type TPageLinkQuickView = {
  /** Callback ref for the element whose links trigger the quick view. */
  containerRef: (node: HTMLElement | null) => void;
  /** Attach to the card so a pointer down inside it does not close it. */
  cardRef: MutableRefObject<HTMLElement | null>;
  target: TPageQuickViewTarget | null;
  close: () => void;
  onCardMouseEnter: () => void;
  onCardMouseLeave: () => void;
};

type TOptions = {
  /** Only links into this workspace open the card. */
  workspaceSlug: string;
  openDelay?: number;
  closeDelay?: number;
  enabled?: boolean;
};

const readPageLink = (anchor: HTMLAnchorElement, workspaceSlug: string): TPageLinkTarget | null => {
  const href = anchor.getAttribute("href");
  if (!href || !workspaceSlug) return null;
  let url: URL;
  try {
    url = new URL(href, window.location.href);
  } catch {
    return null;
  }
  if (url.origin !== window.location.origin) return null;
  const parsed = parsePageLinkPath(url.pathname);
  if (!parsed || parsed.workspaceSlug !== workspaceSlug) return null;
  return parsed;
};

const anchorWithin = (node: EventTarget | null, container: HTMLElement): HTMLAnchorElement | null => {
  if (!(node instanceof Element)) return null;
  const anchor = node.closest("a");
  if (!(anchor instanceof HTMLAnchorElement) || !container.contains(anchor)) return null;
  return anchor;
};

/**
 * Hover quick view for links to project pages inside a container.
 * The card opens after the pointer rests on a link for `openDelay`, and closes `closeDelay`
 * after the pointer has left both the link and the card. Escape or a pointer down
 * outside the card closes it at once.
 */
export const usePageLinkQuickView = (options: TOptions): TPageLinkQuickView => {
  const {
    workspaceSlug,
    openDelay = DEFAULT_OPEN_DELAY_MS,
    closeDelay = DEFAULT_CLOSE_DELAY_MS,
    enabled = true,
  } = options;
  const [container, setContainer] = useState<HTMLElement | null>(null);
  const [target, setTarget] = useState<TPageQuickViewTarget | null>(null);
  const cardRef = useRef<HTMLElement | null>(null);
  const targetRef = useRef<TPageQuickViewTarget | null>(null);
  const pendingAnchorRef = useRef<HTMLAnchorElement | null>(null);
  const openTimerRef = useRef<number | null>(null);
  const closeTimerRef = useRef<number | null>(null);
  const suppressUntilRef = useRef(0);
  const settingsRef = useRef({ workspaceSlug, openDelay, closeDelay });
  settingsRef.current = { workspaceSlug, openDelay, closeDelay };

  const clearOpenTimer = useCallback(() => {
    if (openTimerRef.current !== null) window.clearTimeout(openTimerRef.current);
    openTimerRef.current = null;
    pendingAnchorRef.current = null;
  }, []);

  const clearCloseTimer = useCallback(() => {
    if (closeTimerRef.current !== null) window.clearTimeout(closeTimerRef.current);
    closeTimerRef.current = null;
  }, []);

  const close = useCallback(() => {
    clearOpenTimer();
    clearCloseTimer();
    targetRef.current = null;
    setTarget(null);
  }, [clearCloseTimer, clearOpenTimer]);

  const scheduleClose = useCallback(() => {
    if (!targetRef.current) return;
    clearCloseTimer();
    closeTimerRef.current = window.setTimeout(() => {
      closeTimerRef.current = null;
      targetRef.current = null;
      setTarget(null);
    }, settingsRef.current.closeDelay);
  }, [clearCloseTimer]);

  const containerRef = useCallback((node: HTMLElement | null) => setContainer(node), []);

  // Hover tracking on the container's links.
  useEffect(() => {
    if (!container || !enabled) return;

    const onMouseOver = (event: MouseEvent) => {
      if (Date.now() < suppressUntilRef.current) return;
      const anchor = anchorWithin(event.target, container);
      // Back on the link whose card is open: keep it.
      if (anchor && targetRef.current?.anchor === anchor) {
        clearCloseTimer();
        return;
      }
      // Anywhere else in the container lets an open card go, even when its link was re-rendered away.
      if (targetRef.current && closeTimerRef.current === null) scheduleClose();
      if (!anchor) return;
      // mouseover fires again for each child of the same link.
      if (pendingAnchorRef.current === anchor) return;
      const link = readPageLink(anchor, settingsRef.current.workspaceSlug);
      if (!link) return;

      clearOpenTimer();
      pendingAnchorRef.current = anchor;
      openTimerRef.current = window.setTimeout(() => {
        openTimerRef.current = null;
        pendingAnchorRef.current = null;
        if (!anchor.isConnected) return;
        clearCloseTimer();
        const next = { ...link, anchor };
        targetRef.current = next;
        setTarget(next);
      }, settingsRef.current.openDelay);
    };

    const onMouseOut = (event: MouseEvent) => {
      const anchor = anchorWithin(event.target, container);
      if (!anchor) return;
      // Moving between children of the same link is not a leave.
      if (event.relatedTarget instanceof Node && anchor.contains(event.relatedTarget)) return;
      if (pendingAnchorRef.current === anchor) clearOpenTimer();
      if (targetRef.current?.anchor === anchor) scheduleClose();
    };

    container.addEventListener("mouseover", onMouseOver);
    container.addEventListener("mouseout", onMouseOut);
    return () => {
      container.removeEventListener("mouseover", onMouseOver);
      container.removeEventListener("mouseout", onMouseOut);
    };
  }, [clearCloseTimer, clearOpenTimer, container, enabled, scheduleClose]);

  // The marker tells the editor which workspace's page links the card handles.
  useEffect(() => {
    if (!container || !enabled || !workspaceSlug) return;
    container.setAttribute(PAGE_LINK_QUICK_VIEW_ATTRIBUTE, workspaceSlug);
    return () => container.removeAttribute(PAGE_LINK_QUICK_VIEW_ATTRIBUTE);
  }, [container, enabled, workspaceSlug]);

  // Escape, a pointer down outside the card, or a touch close the card and cancel a pending one.
  useEffect(() => {
    if (!enabled) return;

    const onPointerDown = (event: PointerEvent) => {
      if (event.pointerType === "touch") suppressUntilRef.current = Date.now() + TOUCH_HOVER_SUPPRESS_MS;
      const card = cardRef.current;
      if (card && event.target instanceof Node && card.contains(event.target)) return;
      if (targetRef.current || pendingAnchorRef.current) close();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (targetRef.current || pendingAnchorRef.current) close();
    };

    document.addEventListener("pointerdown", onPointerDown, true);
    document.addEventListener("keydown", onKeyDown, true);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown, true);
      document.removeEventListener("keydown", onKeyDown, true);
    };
  }, [close, enabled]);

  // Disabling or unmounting drops the card and any timers.
  useEffect(() => {
    if (enabled) return;
    close();
  }, [close, enabled]);

  useEffect(
    () => () => {
      if (openTimerRef.current !== null) window.clearTimeout(openTimerRef.current);
      if (closeTimerRef.current !== null) window.clearTimeout(closeTimerRef.current);
    },
    []
  );

  return {
    containerRef,
    cardRef,
    target,
    close,
    onCardMouseEnter: clearCloseTimer,
    onCardMouseLeave: scheduleClose,
  };
};
