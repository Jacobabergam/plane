/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { observer } from "mobx-react";
import { getPageName } from "@plane/utils";
// plane web hooks
import type { EPageStoreType } from "@/plane-web/hooks/store";
import { usePage, usePageStore } from "@/plane-web/hooks/store";
// local imports
import { PageListBlock } from "./block";

type TPageListTreeItemProps = {
  childIdsByParent: Record<string, string[]>;
  depth: number;
  flat: boolean;
  isExpanded: (pageId: string) => boolean;
  onToggle: (pageId: string) => void;
  pageId: string;
  storeType: EPageStoreType;
};

export const PageListTreeItem = observer(function PageListTreeItem(props: TPageListTreeItemProps) {
  const { childIdsByParent, depth, flat, isExpanded, onToggle, pageId, storeType } = props;
  const { getPageAncestry, getPageById } = usePageStore(storeType);
  const page = usePage({ pageId, storeType });

  if (!page) return null;

  const childIds = flat ? [] : (childIdsByParent[pageId] ?? []);
  const hasChildren = childIds.length > 0;
  const expanded = hasChildren && isExpanded(pageId);
  // A root that still has a parent is shown outside the tree (other tab, or the archived flat list).
  const showPath = depth === 0 && !!page.parent;
  const pathLabel = showPath
    ? getPageAncestry(pageId)
        .ancestorIds.map((ancestorId) => getPageName(getPageById(ancestorId)?.name))
        .filter((name) => name.length > 0)
        .join(" / ")
    : undefined;

  return (
    <>
      <PageListBlock
        depth={depth}
        hasChildren={hasChildren}
        isExpanded={expanded}
        onToggleExpand={() => onToggle(pageId)}
        pageId={pageId}
        pathLabel={pathLabel || undefined}
        showExpandControl={!flat}
        storeType={storeType}
      />
      {expanded &&
        childIds.map((childId) => (
          <PageListTreeItem
            key={childId}
            childIdsByParent={childIdsByParent}
            depth={depth + 1}
            flat={flat}
            isExpanded={isExpanded}
            onToggle={onToggle}
            pageId={childId}
            storeType={storeType}
          />
        ))}
    </>
  );
});
