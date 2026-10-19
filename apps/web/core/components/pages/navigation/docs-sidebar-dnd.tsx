/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { useEffect, useRef, useState } from "react";
import { dropTargetForElements } from "@atlaskit/pragmatic-drag-and-drop/element/adapter";
import { observer } from "mobx-react";
// plane imports
import type { TLogoProps } from "@plane/types";
import type { TPageDropValidity } from "@plane/utils";
import { cn } from "@plane/utils";
// components
import { PageLogo } from "@/components/pages/page-logo";

export const DOCS_SIDEBAR_DRAG_TYPE = "DOCS_SIDEBAR_PAGE";

/** Hovering a collapsed page this long while dragging opens it. */
export const DOCS_SIDEBAR_HOVER_EXPAND_MS = 600;

export type TDocsSidebarDragData = {
  type: typeof DOCS_SIDEBAR_DRAG_TYPE;
  pageId: string;
  projectId: string;
};

export const isDocsSidebarDragData = (data: Record<string, unknown>): data is TDocsSidebarDragData =>
  data.type === DOCS_SIDEBAR_DRAG_TYPE && typeof data.pageId === "string" && typeof data.projectId === "string";

export type TDocsSidebarDnd = {
  /** False on touch devices and in the mobile drawer. */
  isEnabled: boolean;
  /** The page being dragged from this sidebar, if any. */
  draggingPageId: string | null;
  /** `targetParentId` null means top level. */
  getDropValidity: (draggedId: string, targetParentId: string | null) => TPageDropValidity;
  onExpand: (pageId: string) => void;
  onMove: (pageId: string, parentId: string | null) => void;
};

export function DocsSidebarDragPreview(props: { logo: TLogoProps | undefined; name: string }) {
  const { logo, name } = props;
  return (
    <div className="flex max-w-60 items-center gap-1.5 rounded-md border border-subtle bg-surface-1 px-2 py-1 text-13 text-primary shadow-raised-200">
      <PageLogo className="shrink-0" logo={logo} size={16} />
      <span className="truncate">{name}</span>
    </div>
  );
}

type TDocsSidebarRootDropZoneProps = {
  dnd: TDocsSidebarDnd;
  projectId: string;
};

/**
 * Fills the empty space under the tree. While a nested page is dragged it shows a "Move to top level"
 * bar; dropping anywhere in the zone clears the page's parent.
 */
export const DocsSidebarRootDropZone = observer(function DocsSidebarRootDropZone(props: TDocsSidebarRootDropZoneProps) {
  const { dnd, projectId } = props;
  const elementRef = useRef<HTMLDivElement | null>(null);
  const dndRef = useRef(dnd);
  dndRef.current = dnd;
  const [isOver, setIsOver] = useState(false);
  const { isEnabled } = dnd;

  useEffect(() => {
    const element = elementRef.current;
    if (!element || !isEnabled) return;

    return dropTargetForElements({
      element,
      canDrop: ({ source }) =>
        isDocsSidebarDragData(source.data) &&
        source.data.projectId === projectId &&
        dndRef.current.getDropValidity(source.data.pageId, null) === "valid",
      getData: () => ({ type: DOCS_SIDEBAR_DRAG_TYPE, parentId: null }),
      onDragEnter: () => setIsOver(true),
      onDragLeave: () => setIsOver(false),
      onDrop: ({ source }) => {
        setIsOver(false);
        if (isDocsSidebarDragData(source.data)) dndRef.current.onMove(source.data.pageId, null);
      },
    });
  }, [isEnabled, projectId]);

  const isVisible = dnd.draggingPageId !== null && dnd.getDropValidity(dnd.draggingPageId, null) === "valid";

  return (
    <div ref={elementRef} className="flex min-h-10 flex-1 flex-col pt-1">
      {isVisible && (
        <div
          className={cn(
            "rounded-md border border-dashed border-subtle px-2 py-1.5 text-11 font-medium text-tertiary transition-colors",
            { "border-accent-strong bg-accent-subtle text-accent-primary": isOver }
          )}
        >
          Move to top level
        </div>
      )}
    </div>
  );
});
