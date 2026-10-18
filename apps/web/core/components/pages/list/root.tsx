/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { useEffect, useState } from "react";
import { observer } from "mobx-react";
// types
import type { TPageNavigationTabs } from "@plane/types";
import { calculateTotalFilters } from "@plane/utils";
// components
import { ListLayout } from "@/components/core/list";
// plane web hooks
import type { EPageStoreType } from "@/plane-web/hooks/store";
import { usePageStore } from "@/plane-web/hooks/store";
// local imports
import { PageListTreeItem } from "./tree-item";

type TPagesListRoot = {
  pageType: TPageNavigationTabs;
  storeType: EPageStoreType;
};

export const PagesListRoot = observer(function PagesListRoot(props: TPagesListRoot) {
  const { pageType, storeType } = props;
  // store hooks
  const { filters, getPageTreeByTab } = usePageStore(storeType);
  const [expandedMap, setExpandedMap] = useState<Record<string, boolean>>({});
  // derived values
  const tree = getPageTreeByTab(pageType);
  const isSearching = filters.searchQuery.trim().length > 0;
  // Filters narrow the tree like search does, so a matching child must be revealed under its path.
  const isNarrowed = isSearching || calculateTotalFilters(filters?.filters ?? {}) !== 0;
  const isFlat = pageType === "archived";

  useEffect(() => {
    setExpandedMap({});
  }, [pageType]);

  const isExpanded = (pageId: string) => {
    const manual = expandedMap[pageId];
    if (manual !== undefined) return manual;
    // Search and filters should reveal the match under its path without an extra click.
    return isNarrowed;
  };

  const onToggle = (pageId: string) => {
    setExpandedMap((previous) => {
      const currently = previous[pageId] !== undefined ? previous[pageId] : isNarrowed;
      return { ...previous, [pageId]: !currently };
    });
  };

  if (tree.rootIds.length === 0) return <></>;

  return (
    <ListLayout>
      {tree.rootIds.map((pageId) => (
        <PageListTreeItem
          key={pageId}
          childIdsByParent={tree.childIdsByParent}
          depth={0}
          flat={isFlat}
          isExpanded={isExpanded}
          onToggle={onToggle}
          pageId={pageId}
          storeType={storeType}
        />
      ))}
    </ListLayout>
  );
});
