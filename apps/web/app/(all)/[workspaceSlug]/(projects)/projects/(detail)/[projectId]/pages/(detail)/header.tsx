/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { useEffect, useState } from "react";
import { observer } from "mobx-react";
import { useParams } from "next/navigation";
// plane imports
import { PageIcon } from "@plane/propel/icons";
import { Tooltip } from "@plane/propel/tooltip";
import type { ICustomSearchSelectOption } from "@plane/types";
import { BreadcrumbItemLoader, Breadcrumbs, Header, BreadcrumbNavigationSearchDropdown } from "@plane/ui";
import { collapseBreadcrumbMiddle, getPageName } from "@plane/utils";
// components
import { BreadcrumbLink } from "@/components/common/breadcrumb-link";
import { DocsSidebarToggle } from "@/components/pages/navigation/docs-sidebar-toggle";
import { PageAccessIcon } from "@/components/common/page-access-icon";
import { SwitcherIcon, SwitcherLabel } from "@/components/common/switcher-label";
import { PageHeaderActions } from "@/components/pages/header/actions";
import { PageSyncingBadge } from "@/components/pages/header/syncing-badge";
import { PageLogo } from "@/components/pages/page-logo";
// hooks
import { useProject } from "@/hooks/store/use-project";
import { useAppRouter } from "@/hooks/use-app-router";
// plane web imports
import { CommonProjectBreadcrumbs } from "@/plane-web/components/breadcrumbs/common";
import { PageDetailsHeaderExtraActions } from "@/plane-web/components/pages";
import { EPageStoreType, usePage, usePageStore } from "@/plane-web/hooks/store";

export interface IPagesHeaderProps {
  showButton?: boolean;
}

const storeType = EPageStoreType.PROJECT;

export const PageDetailsHeader = observer(function PageDetailsHeader() {
  // router
  const router = useAppRouter();
  const { workspaceSlug, pageId, projectId } = useParams();
  const pageIdString = pageId?.toString() ?? "";
  // store hooks
  const { loader } = useProject();
  const { fetchPageDetails, getPageAncestry, getPageById, getCurrentProjectPageIds } = usePageStore(storeType);
  const page = usePage({
    pageId: pageIdString,
    storeType,
  });
  const [isChainExpanded, setIsChainExpanded] = useState(false);
  const [failedAncestorId, setFailedAncestorId] = useState<string | null>(null);
  // derived values
  const projectPageIds = getCurrentProjectPageIds(projectId?.toString());
  const ancestry = pageIdString ? getPageAncestry(pageIdString) : { ancestorIds: [] as string[] };
  const missingParentId = ancestry.missingParentId;
  const isLoadingAncestor = !!missingParentId && failedAncestorId !== missingParentId;

  useEffect(() => {
    setIsChainExpanded(false);
    setFailedAncestorId(null);
  }, [pageIdString]);

  useEffect(() => {
    if (!missingParentId || !workspaceSlug || !projectId) return;
    if (failedAncestorId === missingParentId) return;

    let cancelled = false;
    fetchPageDetails(workspaceSlug.toString(), projectId.toString(), missingParentId, {
      trackVisit: false,
      silent: true,
    }).catch(() => {
      if (!cancelled) setFailedAncestorId(missingParentId);
    });

    return () => {
      cancelled = true;
    };
  }, [failedAncestorId, fetchPageDetails, missingParentId, projectId, workspaceSlug]);

  const ancestorPages = ancestry.ancestorIds
    .map((ancestorId) => getPageById(ancestorId))
    .filter((ancestor): ancestor is NonNullable<typeof ancestor> => ancestor !== undefined);
  const ancestorSegments = isChainExpanded
    ? ancestorPages.map((ancestor) => ({ kind: "item" as const, item: ancestor }))
    : collapseBreadcrumbMiddle(ancestorPages);

  const switcherOptions = projectPageIds
    .map((id) => {
      const _page = id === pageId ? page : getPageById(id);
      if (!_page) return;
      return {
        value: _page.id,
        query: _page.name,
        content: (
          <div className="flex items-center justify-between gap-2">
            <SwitcherLabel logo_props={_page.logo_props} name={getPageName(_page.name)} LabelIcon={PageIcon} />
            <PageAccessIcon {..._page} />
          </div>
        ),
      };
    })
    .filter((option) => option !== undefined) as ICustomSearchSelectOption[];

  if (!page) return null;

  return (
    <Header>
      <Header.LeftItem>
        <div className="flex min-w-0 items-center gap-1">
          <DocsSidebarToggle />
          <div className="min-w-0">
            <Breadcrumbs isLoading={loader === "init-loader"}>
              <CommonProjectBreadcrumbs workspaceSlug={workspaceSlug?.toString()} projectId={projectId?.toString()} />
              <Breadcrumbs.Item
                component={
                  <BreadcrumbLink
                    label="Pages"
                    href={`/${workspaceSlug}/projects/${projectId}/pages/`}
                    icon={<PageIcon className="h-4 w-4 text-tertiary" />}
                  />
                }
              />
              {ancestorSegments.map((segment) => {
                switch (segment.kind) {
                  case "item":
                    return (
                      <Breadcrumbs.Item
                        key={segment.item.id}
                        component={
                          <BreadcrumbLink
                            label={getPageName(segment.item.name)}
                            href={`/${workspaceSlug}/projects/${projectId}/pages/${segment.item.id}`}
                            icon={<PageLogo logo={segment.item.logo_props} size={16} />}
                          />
                        }
                      />
                    );
                  case "ellipsis": {
                    const hiddenLabel = segment.hidden.map((hiddenPage) => getPageName(hiddenPage.name)).join(" / ");
                    return (
                      <Breadcrumbs.Item
                        key="collapsed-ancestors"
                        component={
                          <Tooltip tooltipContent={hiddenLabel} position="bottom">
                            <button
                              type="button"
                              aria-label={`Show ${segment.hidden.length} hidden pages`}
                              className="rounded-sm px-1.5 py-1 text-13 font-medium text-tertiary hover:bg-layer-transparent-hover hover:text-primary"
                              onClick={() => setIsChainExpanded(true)}
                            >
                              …
                            </button>
                          </Tooltip>
                        }
                      />
                    );
                  }
                  default: {
                    const _exhaustive: never = segment;
                    return _exhaustive;
                  }
                }
              })}
              {isLoadingAncestor && <Breadcrumbs.Item component={<BreadcrumbItemLoader />} />}

              <Breadcrumbs.Item
                component={
                  <BreadcrumbNavigationSearchDropdown
                    selectedItem={pageId?.toString() ?? ""}
                    navigationItems={switcherOptions}
                    onChange={(value: string) => {
                      router.push(`/${workspaceSlug}/projects/${projectId}/pages/${value}`);
                    }}
                    title={getPageName(page?.name)}
                    icon={
                      <Breadcrumbs.Icon>
                        <SwitcherIcon logo_props={page.logo_props} LabelIcon={PageIcon} size={16} />
                      </Breadcrumbs.Icon>
                    }
                    isLast
                  />
                }
              />
            </Breadcrumbs>
          </div>
        </div>
      </Header.LeftItem>
      <Header.RightItem>
        <PageSyncingBadge syncStatus={page.isSyncingWithServer} />
        <PageDetailsHeaderExtraActions page={page} storeType={storeType} />
        <PageHeaderActions page={page} storeType={storeType} />
      </Header.RightItem>
    </Header>
  );
});
