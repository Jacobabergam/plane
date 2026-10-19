/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { useEffect, useRef, useState } from "react";
import { combine } from "@atlaskit/pragmatic-drag-and-drop/combine";
import { draggable, dropTargetForElements } from "@atlaskit/pragmatic-drag-and-drop/element/adapter";
import { pointerOutsideOfPreview } from "@atlaskit/pragmatic-drag-and-drop/element/pointer-outside-of-preview";
import { setCustomNativeDragPreview } from "@atlaskit/pragmatic-drag-and-drop/element/set-custom-native-drag-preview";
import { observer } from "mobx-react";
import Link from "next/link";
import { createRoot } from "react-dom/client";
import { ChevronRightIcon, PlusIcon } from "@plane/propel/icons";
import { cn, getPageName } from "@plane/utils";
// components
import { PageLogo } from "@/components/pages/page-logo";
// plane web hooks
import type { EPageStoreType } from "@/plane-web/hooks/store";
import { usePage, usePageStore } from "@/plane-web/hooks/store";
// local imports
import type { TDocsSidebarDnd, TDocsSidebarDragData } from "./docs-sidebar-dnd";
import {
  DOCS_SIDEBAR_DRAG_TYPE,
  DOCS_SIDEBAR_HOVER_EXPAND_MS,
  DocsSidebarDragPreview,
  isDocsSidebarDragData,
} from "./docs-sidebar-dnd";

type TDocsSidebarRowProps = {
  childIdsByParent: Record<string, string[]>;
  depth: number;
  dnd: TDocsSidebarDnd;
  isCurrent: (pageId: string) => boolean;
  isExpanded: (pageId: string) => boolean;
  onAddChild: (pageId: string) => void;
  onNavigate: () => void;
  onToggle: (pageId: string) => void;
  pageId: string;
  projectId: string;
  storeType: EPageStoreType;
  workspaceSlug: string;
};

export const docsSidebarRowDomId = (pageId: string) => `docs-sidebar-row-${pageId}`;

export const DocsSidebarRow = observer(function DocsSidebarRow(props: TDocsSidebarRowProps) {
  const {
    childIdsByParent,
    depth,
    dnd,
    isCurrent,
    isExpanded,
    onAddChild,
    onNavigate,
    onToggle,
    pageId,
    projectId,
    storeType,
    workspaceSlug,
  } = props;
  const { canCurrentUserCreatePage } = usePageStore(storeType);
  const page = usePage({ pageId, storeType });
  const rowRef = useRef<HTMLDivElement | null>(null);
  const handleRef = useRef<HTMLDivElement | null>(null);
  const [isDropTarget, setIsDropTarget] = useState(false);

  const childIds = childIdsByParent[pageId] ?? [];
  const hasChildren = childIds.length > 0;
  const expanded = hasChildren && isExpanded(pageId);
  // A locked page is read-only on the API (PATCH answers "Page is locked"), so it cannot be moved.
  const canDrag = dnd.isEnabled && !!page && !page.archived_at && !page.is_locked && page.canCurrentUserEditPage;
  // Read from the drag callbacks, which are bound once per page and must still see the current values.
  const latestRef = useRef({ canDrag, dnd, expanded, hasChildren, page });
  latestRef.current = { canDrag, dnd, expanded, hasChildren, page };
  const { isEnabled: isDndEnabled } = dnd;
  const isRendered = !!page && !page.archived_at;

  useEffect(() => {
    const element = rowRef.current;
    const dragHandle = handleRef.current;
    if (!element || !dragHandle || !isDndEnabled) return;

    let expandTimer: number | undefined;
    const clearExpandTimer = () => {
      if (expandTimer !== undefined) window.clearTimeout(expandTimer);
      expandTimer = undefined;
    };
    const dragData: TDocsSidebarDragData = { type: DOCS_SIDEBAR_DRAG_TYPE, pageId, projectId };

    return combine(
      draggable({
        element,
        // Only the link (icon + title) starts a drag, so the chevron and "+" keep working as buttons.
        dragHandle,
        canDrag: () => latestRef.current.canDrag,
        getInitialData: () => dragData,
        onGenerateDragPreview: ({ nativeSetDragImage }) => {
          const current = latestRef.current.page;
          setCustomNativeDragPreview({
            getOffset: pointerOutsideOfPreview({ x: "12px", y: "8px" }),
            render: ({ container }) => {
              const root = createRoot(container);
              root.render(<DocsSidebarDragPreview logo={current?.logo_props} name={getPageName(current?.name)} />);
              return () => root.unmount();
            },
            nativeSetDragImage,
          });
        },
      }),
      dropTargetForElements({
        element,
        canDrop: ({ source }) => {
          const { dnd: currentDnd, page: currentPage } = latestRef.current;
          if (!isDocsSidebarDragData(source.data) || source.data.projectId !== projectId) return false;
          if (!currentPage || currentPage.archived_at) return false;
          if (!currentPage.project_ids?.includes(projectId)) return false;
          return currentDnd.getDropValidity(source.data.pageId, pageId) === "valid";
        },
        getData: () => ({ type: DOCS_SIDEBAR_DRAG_TYPE, parentId: pageId }),
        onDragEnter: () => {
          setIsDropTarget(true);
          clearExpandTimer();
          const { expanded: isOpen, hasChildren: canOpen } = latestRef.current;
          if (!canOpen || isOpen) return;
          expandTimer = window.setTimeout(() => {
            expandTimer = undefined;
            latestRef.current.dnd.onExpand(pageId);
          }, DOCS_SIDEBAR_HOVER_EXPAND_MS);
        },
        onDragLeave: () => {
          setIsDropTarget(false);
          clearExpandTimer();
        },
        onDrop: ({ source }) => {
          setIsDropTarget(false);
          clearExpandTimer();
          if (isDocsSidebarDragData(source.data)) latestRef.current.dnd.onMove(source.data.pageId, pageId);
        },
      }),
      clearExpandTimer
    );
  }, [isDndEnabled, isRendered, pageId, projectId]);

  if (!page || page.archived_at) return null;

  const current = isCurrent(pageId);
  const dropValidity = dnd.draggingPageId ? dnd.getDropValidity(dnd.draggingPageId, pageId) : null;
  // The dragged page and its own subtree cannot take the page, so they fade while it is in the air.
  const isInvalidTarget = dropValidity === "self" || dropValidity === "descendant";

  return (
    <>
      <div
        ref={rowRef}
        id={docsSidebarRowDomId(pageId)}
        className={cn("group flex items-center gap-0.5 rounded-md transition-opacity", {
          "bg-accent-subtle ring-1 ring-accent-strong ring-inset": isDropTarget,
          "opacity-50": isInvalidTarget,
        })}
        style={{ paddingLeft: depth * 12 }}
      >
        {hasChildren ? (
          <button
            type="button"
            aria-expanded={expanded}
            aria-label={expanded ? `Collapse ${getPageName(page.name)}` : `Expand ${getPageName(page.name)}`}
            className="grid size-5 shrink-0 place-items-center rounded-sm text-tertiary hover:bg-layer-transparent-hover hover:text-primary"
            onClick={() => onToggle(pageId)}
          >
            <ChevronRightIcon className={cn("size-3.5 transition-transform duration-150", { "rotate-90": expanded })} />
          </button>
        ) : (
          <span className="inline-block size-5 shrink-0" />
        )}
        {/* Drag handle. A wrapper because the `next/link` shim is a function component and drops refs. */}
        <div ref={handleRef} className="flex min-w-0 flex-1">
          <Link
            href={`/${workspaceSlug}/projects/${projectId}/pages/${pageId}`}
            aria-current={current ? "page" : undefined}
            // The row is the drag source; a natively draggable link would start a URL drag instead.
            draggable={false}
            className={cn(
              "flex min-w-0 flex-1 items-center gap-1.5 rounded-md px-1 py-1 text-left text-13 text-secondary hover:bg-layer-transparent-hover",
              { "bg-layer-transparent-selected font-medium text-primary": current }
            )}
            onClick={onNavigate}
          >
            <PageLogo className="shrink-0" logo={page.logo_props} size={16} />
            <span className="truncate">{getPageName(page.name)}</span>
          </Link>
        </div>
        {canCurrentUserCreatePage && (
          <button
            type="button"
            aria-label={`Add a sub-page under ${getPageName(page.name)}`}
            className="grid size-5 shrink-0 place-items-center rounded-sm text-tertiary opacity-100 hover:bg-layer-transparent-hover hover:text-primary md:opacity-0 md:group-focus-within:opacity-100 md:group-hover:opacity-100"
            onClick={() => onAddChild(pageId)}
          >
            <PlusIcon className="size-3.5" />
          </button>
        )}
      </div>
      {expanded &&
        childIds.map((childId) => (
          <DocsSidebarRow
            key={childId}
            childIdsByParent={childIdsByParent}
            depth={depth + 1}
            dnd={dnd}
            isCurrent={isCurrent}
            isExpanded={isExpanded}
            onAddChild={onAddChild}
            onNavigate={onNavigate}
            onToggle={onToggle}
            pageId={childId}
            projectId={projectId}
            storeType={storeType}
            workspaceSlug={workspaceSlug}
          />
        ))}
    </>
  );
});
