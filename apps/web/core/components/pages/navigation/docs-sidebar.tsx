/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { useEffect, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import { observer } from "mobx-react";
import { useParams } from "next/navigation";
import useSWR from "swr";
// plane imports
import { EPageAccess } from "@plane/constants";
import { useLocalStorage } from "@plane/hooks";
import { CloseIcon, PlusIcon, SearchIcon } from "@plane/propel/icons";
import { cn, mergeExpandedPageIds } from "@plane/utils";
// components
import { CreatePageModal } from "@/components/pages/modals/create-page-modal";
// plane web hooks
import { EPageStoreType, usePageStore } from "@/plane-web/hooks/store";
// local imports
import { DOCS_SIDEBAR_MAX_WIDTH, DOCS_SIDEBAR_MIN_WIDTH, useDocsSidebar } from "./docs-sidebar-context";
import { DocsSidebarRow } from "./docs-sidebar-row";

const storeType = EPageStoreType.PROJECT;

const expandedStorageKey = (projectId: string) => `pages_docs_sidebar_expanded:${projectId}`;

function DocsSidebarSkeleton() {
  return (
    <div className="flex flex-col gap-2 px-2 py-1" aria-hidden>
      {["w-3/4", "w-2/3", "w-4/5", "w-1/2", "w-3/5"].map((width) => (
        <div key={width} className={cn("h-6 animate-pulse rounded-md bg-layer-1", width)} />
      ))}
    </div>
  );
}

export const DocsSidebar = observer(function DocsSidebar() {
  const sidebar = useDocsSidebar();
  const { workspaceSlug, projectId, pageId } = useParams();
  const projectIdString = projectId?.toString() ?? "";
  const workspaceSlugString = workspaceSlug?.toString() ?? "";
  const currentPageId = pageId?.toString() ?? "";
  const {
    fetchPagesList,
    getDocsNavigationTree,
    getPageAncestry,
    getPageById,
    canCurrentUserCreatePage,
    loader,
    error,
  } = usePageStore(storeType);
  const { storedValue: storedExpanded, setValue: setStoredExpanded } = useLocalStorage<string[]>(
    expandedStorageKey(projectIdString || "none"),
    []
  );
  const [query, setQuery] = useState("");
  const [searchExpanded, setSearchExpanded] = useState<Record<string, boolean>>({});
  const [createParentId, setCreateParentId] = useState<string | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [dragWidth, setDragWidth] = useState<number | null>(null);
  const persistedRef = useRef<string[]>(storedExpanded ?? []);
  persistedRef.current = storedExpanded ?? [];
  const setMobileOpenRef = useRef(sidebar?.setMobileOpen);
  setMobileOpenRef.current = sidebar?.setMobileOpen;

  useSWR(workspaceSlugString && projectIdString ? `PROJECT_PAGES_${projectIdString}` : null, () =>
    fetchPagesList(workspaceSlugString, projectIdString)
  );

  const tree = projectIdString ? getDocsNavigationTree(projectIdString, query) : { rootIds: [], childIdsByParent: {} };
  const searching = query.trim().length > 0;
  const ancestorIds = currentPageId ? getPageAncestry(currentPageId).ancestorIds : [];
  const ancestorKey = ancestorIds.join("\n");

  useEffect(() => {
    if (!ancestorKey) return;
    const merged = mergeExpandedPageIds(persistedRef.current, ancestorKey.split("\n"));
    const current = persistedRef.current;
    if (merged.length === current.length && merged.every((id, index) => id === current[index])) return;
    setStoredExpanded(merged);
  }, [ancestorKey, setStoredExpanded]);

  useEffect(() => {
    setMobileOpenRef.current?.(false);
  }, [currentPageId]);

  if (!sidebar || !projectIdString || !workspaceSlugString) return null;

  const { isDesktopOpen, isMobile, isMobileOpen, setMobileOpen, setWidth, width } = sidebar;
  const panelWidth = dragWidth ?? width;
  const persisted = storedExpanded ?? [];
  const isExpanded = (id: string) => {
    if (searching) {
      if (searchExpanded[id] !== undefined) return searchExpanded[id];
      return true;
    }
    return persisted.includes(id);
  };
  const onToggle = (id: string) => {
    if (searching) {
      setSearchExpanded((previous) => {
        const currently = previous[id] !== undefined ? previous[id] : true;
        return { ...previous, [id]: !currently };
      });
      return;
    }
    const next = new Set(persisted);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setStoredExpanded([...next]);
  };
  const openCreate = (parentId: string | null) => {
    setCreateParentId(parentId);
    setIsCreateOpen(true);
  };
  const showPanel = isMobileOpen || (!isMobile && isDesktopOpen);
  const isLoading = loader === "init-loader" && tree.rootIds.length === 0;
  const parentPage = createParentId ? getPageById(createParentId) : undefined;

  const onResizeStart = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (isMobile) return;
    event.preventDefault();
    const startX = event.clientX;
    const startWidth = panelWidth;
    const previousUserSelect = document.body.style.userSelect;
    document.body.style.userSelect = "none";

    const onMove = (moveEvent: PointerEvent) => {
      const next = Math.min(
        DOCS_SIDEBAR_MAX_WIDTH,
        Math.max(DOCS_SIDEBAR_MIN_WIDTH, startWidth + moveEvent.clientX - startX)
      );
      setDragWidth(next);
    };
    const onUp = (upEvent: PointerEvent) => {
      document.body.style.userSelect = previousUserSelect;
      const next = Math.min(
        DOCS_SIDEBAR_MAX_WIDTH,
        Math.max(DOCS_SIDEBAR_MIN_WIDTH, startWidth + upEvent.clientX - startX)
      );
      setDragWidth(null);
      setWidth(next);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };

  return (
    <>
      {isMobileOpen && (
        <button
          type="button"
          aria-label="Close pages sidebar"
          className="fixed inset-0 z-30 bg-backdrop md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}
      {showPanel && (
        <aside
          aria-label="Pages"
          className={cn(
            "relative flex h-full shrink-0 flex-col border-r border-subtle bg-surface-1",
            isMobileOpen
              ? "shadow-lg fixed inset-y-0 left-0 z-40 w-[min(100%,20rem)] md:static md:z-auto md:shadow-none"
              : "relative"
          )}
          style={isMobileOpen && isMobile ? undefined : { width: panelWidth }}
        >
          <div className="flex h-11 shrink-0 items-center justify-between gap-2 border-b border-subtle px-3">
            <h2 className="text-13 font-semibold text-primary">Pages</h2>
            <div className="flex items-center gap-1">
              {canCurrentUserCreatePage && (
                <button
                  type="button"
                  className="flex items-center gap-1 rounded-md px-1.5 py-1 text-11 font-medium text-tertiary hover:bg-layer-transparent-hover hover:text-primary"
                  onClick={() => openCreate(null)}
                >
                  <PlusIcon className="size-3.5" />
                  New page
                </button>
              )}
              {isMobileOpen && (
                <button
                  type="button"
                  aria-label="Close pages sidebar"
                  className="grid size-6 place-items-center rounded-md text-tertiary hover:bg-layer-transparent-hover md:hidden"
                  onClick={() => setMobileOpen(false)}
                >
                  <CloseIcon className="size-3.5" />
                </button>
              )}
            </div>
          </div>
          <div className="px-3 pb-2">
            <label className="flex items-center gap-2 rounded-md border border-subtle px-2 py-1.5">
              <SearchIcon className="size-3.5 shrink-0 text-placeholder" />
              <input
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setSearchExpanded({});
                }}
                placeholder="Search pages"
                aria-label="Search pages"
                className="w-full border-none bg-transparent text-13 text-primary placeholder:text-placeholder focus:outline-none"
              />
            </label>
          </div>
          <div className="vertical-scrollbar scrollbar-sm flex-1 overflow-y-auto px-1.5 pb-4">
            {isLoading && <DocsSidebarSkeleton />}
            {!isLoading && error && tree.rootIds.length === 0 && (
              <p className="px-2 py-3 text-13 text-tertiary">{error.description}</p>
            )}
            {!isLoading && !error && tree.rootIds.length === 0 && (
              <p className="px-2 py-3 text-13 text-tertiary">{searching ? "No matching pages" : "No pages yet"}</p>
            )}
            {!isLoading &&
              tree.rootIds.map((rootId) => (
                <DocsSidebarRow
                  key={rootId}
                  childIdsByParent={tree.childIdsByParent}
                  depth={0}
                  isCurrent={(id) => id === currentPageId}
                  isExpanded={isExpanded}
                  onAddChild={(id) => openCreate(id)}
                  onNavigate={() => setMobileOpen(false)}
                  onToggle={onToggle}
                  pageId={rootId}
                  projectId={projectIdString}
                  storeType={storeType}
                  workspaceSlug={workspaceSlugString}
                />
              ))}
          </div>
          {!isMobile && (
            <div
              role="separator"
              aria-orientation="vertical"
              aria-label="Resize pages sidebar"
              aria-valuemin={DOCS_SIDEBAR_MIN_WIDTH}
              aria-valuemax={DOCS_SIDEBAR_MAX_WIDTH}
              aria-valuenow={panelWidth}
              tabIndex={0}
              className="absolute top-0 right-0 z-10 h-full w-1 cursor-col-resize hover:bg-accent-primary focus:bg-accent-primary"
              onPointerDown={onResizeStart}
              onKeyDown={(event) => {
                if (event.key === "ArrowLeft") setWidth(panelWidth - 16);
                if (event.key === "ArrowRight") setWidth(panelWidth + 16);
              }}
            />
          )}
          <CreatePageModal
            handleModalClose={() => {
              setIsCreateOpen(false);
              setCreateParentId(null);
            }}
            isModalOpen={isCreateOpen}
            pageAccess={parentPage?.access ?? EPageAccess.PUBLIC}
            parentId={createParentId ?? undefined}
            projectId={projectIdString}
            redirectionEnabled
            storeType={storeType}
            workspaceSlug={workspaceSlugString}
          />
        </aside>
      )}
    </>
  );
});
