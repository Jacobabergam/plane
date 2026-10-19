/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import type { MouseEvent as ReactMouseEvent } from "react";
import { observer } from "mobx-react";
import { createPortal } from "react-dom";
import { usePopper } from "react-popper";
// plane imports
import { ArchiveIcon } from "@plane/propel/icons";
import type { TPage } from "@plane/types";
import type { TPageAncestry } from "@plane/utils";
import { cn, collapseBreadcrumbMiddle, getPageName, htmlToExcerpt } from "@plane/utils";
// components
import { PageLogo } from "@/components/pages/page-logo";
// hooks
import { useProject } from "@/hooks/store/use-project";
import { useAppRouter } from "@/hooks/use-app-router";
import type { TPageLinkQuickView, TPageQuickViewTarget } from "@/hooks/use-page-link-quick-view";
// plane web hooks
import { EPageStoreType, usePageStore } from "@/plane-web/hooks/store";
// store
import type { IProjectPageStore } from "@/store/pages/project-page.store";

const storeType = EPageStoreType.PROJECT;

const EXCERPT_LENGTH = 280;

/** Excerpts from detail fetches, so a page with an empty body is not fetched on every hover. */
const excerptCache = new Map<string, string>();
/** In-flight detail requests, shared by every card. */
const detailRequests = new Map<string, Promise<TPage | undefined>>();
/** Pages whose detail fetch failed; not retried until reload. */
const failedPageIds = new Set<string>();

const loadPageDetails = (
  fetchPageDetails: IProjectPageStore["fetchPageDetails"],
  workspaceSlug: string,
  projectId: string,
  pageId: string
): Promise<TPage | undefined> => {
  const pending = detailRequests.get(pageId);
  if (pending) return pending;
  // Same options as the breadcrumb: no recent-visit entry and no page loader.
  const request = fetchPageDetails(workspaceSlug, projectId, pageId, { trackVisit: false, silent: true })
    .then((page) => {
      excerptCache.set(pageId, htmlToExcerpt(page?.description_html, EXCERPT_LENGTH));
      return page;
    })
    .catch((error: unknown) => {
      failedPageIds.add(pageId);
      throw error;
    })
    .finally(() => {
      detailRequests.delete(pageId);
    });
  detailRequests.set(pageId, request);
  return request;
};

function ExcerptSkeleton() {
  return (
    <div className="mt-2 flex flex-col gap-1.5" aria-hidden>
      {["w-full", "w-11/12", "w-2/3"].map((width) => (
        <div key={width} className={cn("h-3 animate-pulse rounded-sm bg-layer-1", width)} />
      ))}
    </div>
  );
}

type TCardProps = {
  controller: TPageLinkQuickView;
  target: TPageQuickViewTarget;
};

const PageQuickViewCard = observer(function PageQuickViewCard(props: TCardProps) {
  const { controller, target } = props;
  const { anchor, pageId, projectId, workspaceSlug } = target;
  // states
  const [popperElement, setPopperElement] = useState<HTMLDivElement | null>(null);
  const [, setFetchVersion] = useState(0);
  // router
  const router = useAppRouter();
  // store hooks
  const { fetchPageDetails, getPageAncestry, getPageById } = usePageStore(storeType);
  const { getProjectById } = useProject();
  // derived values
  const page = getPageById(pageId);
  const storedHtml = page?.description_html;
  // Memoized: popper re-renders the card on every scroll frame.
  const storedExcerpt = useMemo(
    () => (storedHtml ? htmlToExcerpt(storedHtml, EXCERPT_LENGTH) : undefined),
    [storedHtml]
  );
  const excerpt = storedExcerpt ?? excerptCache.get(pageId);
  const pageFailed = failedPageIds.has(pageId);
  const needsDetails = excerpt === undefined && !pageFailed;
  const ancestry: TPageAncestry = page ? getPageAncestry(pageId) : { ancestorIds: [] };
  const missingParentId =
    ancestry.missingParentId && !failedPageIds.has(ancestry.missingParentId) ? ancestry.missingParentId : undefined;
  const pagePath = `/${workspaceSlug}/projects/${projectId}/pages/${pageId}`;

  const { styles, attributes } = usePopper(anchor, popperElement, {
    placement: "bottom-start",
    strategy: "fixed",
    modifiers: [
      { name: "offset", options: { offset: [0, 6] } },
      { name: "flip", options: { fallbackPlacements: ["top-start", "bottom-end", "top-end"], padding: 8 } },
      { name: "preventOverflow", options: { padding: 8, altAxis: true, tether: false } },
    ],
  });

  // Body for the excerpt. A page that is not in the store and cannot be fetched is ignored.
  useEffect(() => {
    if (!needsDetails) return;
    let cancelled = false;
    loadPageDetails(fetchPageDetails, workspaceSlug, projectId, pageId)
      .then(() => {
        if (!cancelled) setFetchVersion((version) => version + 1);
      })
      .catch(() => {
        if (cancelled) return;
        setFetchVersion((version) => version + 1);
      });
    return () => {
      cancelled = true;
    };
  }, [fetchPageDetails, needsDetails, pageId, projectId, workspaceSlug]);

  // Ancestors for the path line, fetched silently like the breadcrumb does.
  useEffect(() => {
    if (!missingParentId) return;
    let cancelled = false;
    loadPageDetails(fetchPageDetails, workspaceSlug, projectId, missingParentId).catch(() => {
      if (!cancelled) setFetchVersion((version) => version + 1);
    });
    return () => {
      cancelled = true;
    };
  }, [fetchPageDetails, missingParentId, projectId, workspaceSlug]);

  const { cardRef, close } = controller;
  const setCardElement = useCallback(
    (node: HTMLDivElement | null) => {
      setPopperElement(node);
      cardRef.current = node;
    },
    [cardRef]
  );
  const isUnavailable = !page && pageFailed;
  useEffect(() => {
    if (isUnavailable) close();
  }, [close, isUnavailable]);

  if (isUnavailable) return null;

  const projectName = getProjectById(projectId)?.name;
  const ancestorNames = ancestry.ancestorIds.map((ancestorId) => getPageName(getPageById(ancestorId)?.name));
  const pathSegments = [
    ...(projectName ? [projectName] : []),
    ...collapseBreadcrumbMiddle(ancestorNames, 3).map((segment) => (segment.kind === "item" ? segment.item : "…")),
  ];
  // A link re-rendered away (collaborative edit, sidebar refresh) leaves nothing to point at.
  const referenceHidden = !anchor.isConnected || String(attributes.popper?.["data-popper-reference-hidden"]) === "true";

  const handleClick = (event: ReactMouseEvent<HTMLAnchorElement>) => {
    // Modified clicks keep the browser's own behaviour, such as opening a new tab.
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    close();
    router.push(pagePath);
  };

  return createPortal(
    <div
      ref={setCardElement}
      style={{ ...styles.popper, zIndex: 100 }}
      {...attributes.popper}
      className={cn("w-[360px] max-w-[calc(100vw-16px)]", { invisible: referenceHidden })}
      onMouseEnter={controller.onCardMouseEnter}
      onMouseLeave={controller.onCardMouseLeave}
    >
      <a
        href={pagePath}
        tabIndex={-1}
        aria-label={page ? `Open ${getPageName(page.name)}` : "Open page"}
        className="block rounded-lg border border-subtle bg-surface-1 p-3 text-left shadow-raised-200 transition-colors hover:border-strong"
        // Keep focus and the selection where they are.
        onMouseDown={(event) => event.preventDefault()}
        onClick={handleClick}
      >
        <div className="flex min-w-0 items-center gap-2">
          <span className="grid size-6 shrink-0 place-items-center">
            <PageLogo logo={page?.logo_props} size={20} />
          </span>
          {pathSegments.length > 0 && (
            <span className="min-w-0 flex-1 truncate text-11 text-tertiary">{pathSegments.join(" / ")}</span>
          )}
          {page?.archived_at && (
            <span className="ml-auto flex h-5 shrink-0 items-center gap-1 rounded-sm bg-accent-primary/20 px-1.5 text-11 font-medium text-accent-primary">
              <ArchiveIcon className="size-3 shrink-0" />
              Archived
            </span>
          )}
        </div>
        {page ? (
          <p className="mt-2 line-clamp-2 text-14 font-semibold break-words text-primary">{getPageName(page.name)}</p>
        ) : (
          <div className="mt-2 h-4 w-1/2 animate-pulse rounded-sm bg-layer-1" aria-hidden />
        )}
        {excerpt === undefined ? (
          !pageFailed && <ExcerptSkeleton />
        ) : excerpt ? (
          <p className="mt-1.5 line-clamp-5 text-13 break-words text-secondary">{excerpt}</p>
        ) : (
          <p className="mt-1.5 text-13 text-placeholder">Empty page</p>
        )}
      </a>
    </div>,
    document.body
  );
});

type TPageQuickViewProps = {
  controller: TPageLinkQuickView;
};

/** Hover card for a page link. Render once per `usePageLinkQuickView` container. */
export function PageQuickView(props: TPageQuickViewProps) {
  const { controller } = props;
  const { target } = controller;
  if (!target || typeof document === "undefined") return null;
  return <PageQuickViewCard key={target.pageId} controller={controller} target={target} />;
}
