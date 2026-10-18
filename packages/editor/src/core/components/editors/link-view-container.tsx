/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { autoUpdate, flip, hide, shift, useDismiss, useFloating, useInteractions } from "@floating-ui/react";
import type { Editor } from "@tiptap/react";
import { useEditorState } from "@tiptap/react";
import { useCallback, useEffect, useRef, useState } from "react";

// components
import type { LinkViewProps } from "@/components/links";
import { LinkView } from "@/components/links";
// helpers
import { findLinkAnchor, followEditorLink, isNodeViewChrome } from "@/extensions/custom-link/helpers/link-navigation";

const TOUCH_LONG_PRESS_MS = 450;
const TOUCH_MOVE_TOLERANCE_PX = 10;

type Props = {
  editor: Editor;
  containerRef: React.RefObject<HTMLDivElement>;
};

export function LinkViewContainer({ editor, containerRef }: Props) {
  const [linkViewProps, setLinkViewProps] = useState<LinkViewProps>();
  const [isOpen, setIsOpen] = useState(false);
  const [virtualElement, setVirtualElement] = useState<Element | null>(null);
  const hoverTimeoutRef = useRef<number | null>(null);
  const suppressHoverRef = useRef(false);
  const openedFromTouchRef = useRef(false);
  const touchStateRef = useRef({
    pointerId: -1,
    startX: 0,
    startY: 0,
    longPressTimer: null as number | null,
    longPressFired: false,
    moved: false,
    anchor: null as HTMLAnchorElement | null,
  });
  const consumeClickTokenRef = useRef(0);

  const editorState = useEditorState({
    editor,
    selector: ({ editor }: { editor: Editor }) => ({
      linkExtensionStorage: editor.storage.link,
    }),
  });

  const { refs, floatingStyles, context } = useFloating({
    open: isOpen,
    onOpenChange: setIsOpen,
    elements: {
      reference: virtualElement,
    },
    middleware: [
      flip({
        fallbackPlacements: ["top", "bottom"],
      }),
      shift({
        padding: 5,
      }),
      hide(),
    ],
    whileElementsMounted: autoUpdate,
    placement: "bottom-start",
  });

  const dismiss = useDismiss(context);

  const { getReferenceProps, getFloatingProps } = useInteractions([dismiss]);

  // Clear any existing timeout
  const clearHoverTimeout = useCallback(() => {
    if (hoverTimeoutRef.current) {
      window.clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
  }, []);

  // Set timeout to close link view after delay
  const setCloseTimeout = useCallback(() => {
    clearHoverTimeout();
    hoverTimeoutRef.current = window.setTimeout(() => {
      openedFromTouchRef.current = false;
      setIsOpen(false);
      editorState.linkExtensionStorage.isPreviewOpen = false;
    }, 400);
  }, [clearHoverTimeout, editorState.linkExtensionStorage]);

  const closeLinkView = useCallback(() => {
    openedFromTouchRef.current = false;
    setIsOpen(false);
    editorState.linkExtensionStorage.isPreviewOpen = false;
  }, [editorState.linkExtensionStorage]);

  const presentLinkPreview = useCallback(
    (target: HTMLAnchorElement, source: "hover" | "touch") => {
      if (!editor || editorState.linkExtensionStorage?.isBubbleMenuOpen) return;

      const referenceProps = getReferenceProps();
      Object.entries(referenceProps).forEach(([key, value]) => {
        target.setAttribute(key, value as string);
      });

      const view = editor.view;
      if (!view) return;

      try {
        const pos = view.posAtDOM(target, 0);
        if (pos === undefined || pos < 0) return;

        const node = view.state.doc.nodeAt(pos);
        if (!node) return;

        const linkMark = node.marks?.find((mark) => mark.type.name === "link");
        if (!linkMark) return;

        openedFromTouchRef.current = source === "touch";
        setVirtualElement(target);
        clearHoverTimeout();

        if (!isOpen || (linkViewProps && (linkViewProps.from !== pos || linkViewProps.to !== pos + node.nodeSize))) {
          setLinkViewProps({
            view: "LinkPreview",
            url: linkMark.attrs.href,
            text: node.text || "",
            editor: editor,
            from: pos,
            to: pos + node.nodeSize,
            closeLinkView,
          });
          setIsOpen(true);
        }
      } catch (error) {
        console.error("Error handling link hover:", error);
      }
    },
    [
      editor,
      editorState.linkExtensionStorage,
      getReferenceProps,
      isOpen,
      linkViewProps,
      clearHoverTimeout,
      closeLinkView,
    ]
  );

  const handleLinkHover = useCallback(
    (event: MouseEvent) => {
      // A touch tap synthesizes mouseover. Ignore it so the tooltip does not swallow the tap.
      if (suppressHoverRef.current) return;
      const target = findLinkAnchor(event.target, containerRef.current);
      if (!target) return;
      presentLinkPreview(target, "hover");
    },
    [containerRef, presentLinkPreview]
  );

  // Handle mouse enter on floating element (cancel close timeout)
  const handleFloatingMouseEnter = useCallback(() => {
    clearHoverTimeout();
  }, [clearHoverTimeout]);

  // Handle mouse leave from floating element (start close timeout)
  const handleFloatingMouseLeave = useCallback(() => {
    if (openedFromTouchRef.current) return;
    setCloseTimeout();
  }, [setCloseTimeout]);

  const handleContainerMouseEnter = useCallback(() => {
    // Cancel any pending close timeout when mouse enters container
    clearHoverTimeout();
  }, [clearHoverTimeout]);

  const handleContainerMouseLeave = useCallback(
    (event: MouseEvent) => {
      if (!editor || !isOpen || openedFromTouchRef.current) return;

      // Check if mouse is truly leaving the container area
      const relatedTarget = event.relatedTarget as HTMLElement;
      const container = containerRef.current;
      const floatingElement = refs.floating;

      // Only start close timeout if mouse is not moving to the floating element
      // and is actually leaving the container
      if (
        container &&
        relatedTarget &&
        !container.contains(relatedTarget) &&
        (!floatingElement || !floatingElement.current?.contains(relatedTarget))
      ) {
        setCloseTimeout();
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [editor, isOpen, setCloseTimeout, refs.floating]
  );

  // Set up event listeners
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener("mouseover", handleLinkHover);
    container.addEventListener("mouseenter", handleContainerMouseEnter);
    container.addEventListener("mouseleave", handleContainerMouseLeave);

    return () => {
      container.removeEventListener("mouseover", handleLinkHover);
      container.removeEventListener("mouseenter", handleContainerMouseEnter);
      container.removeEventListener("mouseleave", handleContainerMouseLeave);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [handleLinkHover, handleContainerMouseEnter, handleContainerMouseLeave]);

  // Touch taps follow the link. A long-press opens the same preview so Edit stays reachable.
  useEffect(() => {
    const container = containerRef.current;
    if (!container || !editor) return;

    const clearLongPress = () => {
      const state = touchStateRef.current;
      if (state.longPressTimer === null) return;
      window.clearTimeout(state.longPressTimer);
      state.longPressTimer = null;
    };

    const armConsumeNextClick = () => {
      const storage = editor.storage.link;
      if (!storage) return;
      const token = consumeClickTokenRef.current + 1;
      consumeClickTokenRef.current = token;
      storage.consumeNextLinkClick = true;
      window.setTimeout(() => {
        if (consumeClickTokenRef.current !== token) return;
        storage.consumeNextLinkClick = false;
      }, 700);
    };

    const releaseHoverSuppression = () => {
      window.setTimeout(() => {
        suppressHoverRef.current = false;
      }, 500);
    };

    const onPointerDown = (event: PointerEvent) => {
      if (event.pointerType !== "touch") {
        suppressHoverRef.current = false;
        return;
      }

      suppressHoverRef.current = true;
      const state = touchStateRef.current;
      clearLongPress();
      state.pointerId = event.pointerId;
      state.startX = event.clientX;
      state.startY = event.clientY;
      state.longPressFired = false;
      state.moved = false;
      const anchor = findLinkAnchor(event.target, container);
      // A node view's own anchor (a mention) is not a link mark; the pointerup path must not navigate it.
      state.anchor = anchor && !isNodeViewChrome(anchor) ? anchor : null;
      if (!state.anchor) return;

      state.longPressTimer = window.setTimeout(() => {
        state.longPressFired = true;
      }, TOUCH_LONG_PRESS_MS);
    };

    const onPointerMove = (event: PointerEvent) => {
      if (event.pointerType !== "touch") return;
      const state = touchStateRef.current;
      if (event.pointerId !== state.pointerId) return;
      const dx = event.clientX - state.startX;
      const dy = event.clientY - state.startY;
      if (dx * dx + dy * dy <= TOUCH_MOVE_TOLERANCE_PX * TOUCH_MOVE_TOLERANCE_PX) return;
      state.moved = true;
      clearLongPress();
    };

    const onPointerUp = (event: PointerEvent) => {
      if (event.pointerType !== "touch") return;
      const state = touchStateRef.current;
      if (state.pointerId !== -1 && event.pointerId !== state.pointerId) return;

      clearLongPress();
      const anchor = state.anchor;
      const shouldEdit = state.longPressFired && !state.moved;
      const moved = state.moved;
      state.anchor = null;
      state.pointerId = -1;
      state.longPressFired = false;
      releaseHoverSuppression();

      if (!anchor) return;
      if (moved) {
        armConsumeNextClick();
        return;
      }

      if (shouldEdit) {
        armConsumeNextClick();
        event.preventDefault();
        presentLinkPreview(anchor, "touch");
        return;
      }

      const href = anchor.getAttribute("href");
      if (!href || event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) return;

      armConsumeNextClick();
      event.preventDefault();
      followEditorLink({
        href,
        navigateInternalLink: editor.storage.link?.navigateInternalLink,
      });
    };

    const onPointerCancel = (event: PointerEvent) => {
      if (event.pointerType !== "touch") return;
      clearLongPress();
      const state = touchStateRef.current;
      state.anchor = null;
      state.pointerId = -1;
      state.longPressFired = false;
      state.moved = false;
      releaseHoverSuppression();
    };

    container.addEventListener("pointerdown", onPointerDown, true);
    container.addEventListener("pointermove", onPointerMove, true);
    container.addEventListener("pointerup", onPointerUp, true);
    container.addEventListener("pointercancel", onPointerCancel, true);

    return () => {
      clearLongPress();
      container.removeEventListener("pointerdown", onPointerDown, true);
      container.removeEventListener("pointermove", onPointerMove, true);
      container.removeEventListener("pointerup", onPointerUp, true);
      container.removeEventListener("pointercancel", onPointerCancel, true);
    };
  }, [containerRef, editor, presentLinkPreview]);

  // Cleanup timeout on unmount
  useEffect(() => () => clearHoverTimeout(), [clearHoverTimeout]);

  // Close link view when bubble menu opens
  useEffect(() => {
    if (editorState.linkExtensionStorage?.isBubbleMenuOpen && isOpen) {
      openedFromTouchRef.current = false;
      setIsOpen(false);
    }
  }, [editorState.linkExtensionStorage, isOpen]);

  return (
    <>
      {isOpen && linkViewProps && virtualElement && (
        <div
          ref={refs.setFloating}
          style={{ ...floatingStyles, zIndex: 100 }}
          {...getFloatingProps()}
          onMouseEnter={handleFloatingMouseEnter}
          onMouseLeave={handleFloatingMouseLeave}
        >
          <LinkView {...linkViewProps} style={floatingStyles} />
        </div>
      )}
    </>
  );
}
