/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { useRef } from "react";
import { observer } from "mobx-react";
import { ChevronRightIcon } from "@plane/propel/icons";
import { cn, getPageName } from "@plane/utils";
// components
import { ListItem } from "@/components/core/list";
import { PageLogo } from "@/components/pages/page-logo";
import { BlockItemAction } from "@/components/pages/list/block-item-action";
// hooks
import { usePlatformOS } from "@/hooks/use-platform-os";
// plane web hooks
import type { EPageStoreType } from "@/plane-web/hooks/store";
import { usePage } from "@/plane-web/hooks/store";

function PageListExpandControl(props: {
  depth: number;
  hasChildren: boolean;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const { depth, hasChildren, isExpanded, onToggle } = props;

  return (
    <div className="flex flex-shrink-0 items-center" style={{ paddingLeft: depth * 16 }}>
      {hasChildren ? (
        <button
          type="button"
          aria-expanded={isExpanded}
          aria-label={isExpanded ? "Collapse sub-pages" : "Expand sub-pages"}
          className="grid size-5 place-items-center rounded-sm text-tertiary hover:bg-layer-transparent-hover hover:text-primary"
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            onToggle();
          }}
        >
          <ChevronRightIcon
            className={cn("size-3.5 transition-transform duration-150", {
              "rotate-90": isExpanded,
            })}
          />
        </button>
      ) : (
        <span className="inline-block size-5" />
      )}
    </div>
  );
}

type TPageListBlock = {
  depth?: number;
  hasChildren?: boolean;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
  pageId: string;
  pathLabel?: string;
  showExpandControl?: boolean;
  storeType: EPageStoreType;
};

export const PageListBlock = observer(function PageListBlock(props: TPageListBlock) {
  const {
    depth = 0,
    hasChildren = false,
    isExpanded = false,
    onToggleExpand,
    pageId,
    pathLabel,
    showExpandControl = false,
    storeType,
  } = props;
  // refs
  const parentRef = useRef(null);
  // hooks
  const page = usePage({
    pageId,
    storeType,
  });
  const { isMobile } = usePlatformOS();
  // handle page check
  if (!page) return null;
  // derived values
  const { name, logo_props, getRedirectionLink } = page;

  return (
    <ListItem
      leadingElement={
        showExpandControl && onToggleExpand ? (
          <PageListExpandControl
            depth={depth}
            hasChildren={hasChildren}
            isExpanded={isExpanded}
            onToggle={onToggleExpand}
          />
        ) : undefined
      }
      prependTitleElement={
        <span className="flex items-center gap-2">
          <PageLogo logo={logo_props} size={16} />
          {pathLabel ? <span className="truncate text-11 text-tertiary">{pathLabel} /</span> : null}
        </span>
      }
      title={getPageName(name)}
      itemLink={getRedirectionLink()}
      actionableItems={<BlockItemAction page={page} parentRef={parentRef} storeType={storeType} />}
      isMobile={isMobile}
      parentRef={parentRef}
    />
  );
});
