/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { observer } from "mobx-react";
import Link from "next/link";
import { ChevronRightIcon, PlusIcon } from "@plane/propel/icons";
import { cn, getPageName } from "@plane/utils";
// components
import { PageLogo } from "@/components/pages/page-logo";
// plane web hooks
import type { EPageStoreType } from "@/plane-web/hooks/store";
import { usePage, usePageStore } from "@/plane-web/hooks/store";

type TDocsSidebarRowProps = {
  childIdsByParent: Record<string, string[]>;
  depth: number;
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

export const DocsSidebarRow = observer(function DocsSidebarRow(props: TDocsSidebarRowProps) {
  const {
    childIdsByParent,
    depth,
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

  if (!page || page.archived_at) return null;

  const childIds = childIdsByParent[pageId] ?? [];
  const hasChildren = childIds.length > 0;
  const expanded = hasChildren && isExpanded(pageId);
  const current = isCurrent(pageId);

  return (
    <>
      <div className="group flex items-center gap-0.5" style={{ paddingLeft: depth * 12 }}>
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
        <Link
          href={`/${workspaceSlug}/projects/${projectId}/pages/${pageId}`}
          aria-current={current ? "page" : undefined}
          className={cn(
            "flex min-w-0 flex-1 items-center gap-1.5 rounded-md px-1 py-1 text-left text-13 text-secondary hover:bg-layer-transparent-hover",
            { "bg-layer-transparent-selected font-medium text-primary": current }
          )}
          onClick={onNavigate}
        >
          <PageLogo className="shrink-0" logo={page.logo_props} size={16} />
          <span className="truncate">{getPageName(page.name)}</span>
        </Link>
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
