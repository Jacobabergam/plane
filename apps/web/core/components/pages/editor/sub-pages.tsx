/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { useState } from "react";
import { observer } from "mobx-react";
import Link from "next/link";
import { PlusIcon } from "@plane/propel/icons";
import { getPageName } from "@plane/utils";
// components
import { CreatePageModal } from "@/components/pages/modals/create-page-modal";
import { PageLogo } from "@/components/pages/page-logo";
// plane web hooks
import type { EPageStoreType } from "@/plane-web/hooks/store";
import { usePage, usePageStore } from "@/plane-web/hooks/store";
// store
import type { TPageInstance } from "@/store/pages/base-page";

type TPageSubPagesProps = {
  page: TPageInstance;
  projectId: string;
  storeType: EPageStoreType;
  workspaceSlug: string;
};

const SubPageLink = observer(function SubPageLink(props: { href: string; pageId: string; storeType: EPageStoreType }) {
  const { href, pageId, storeType } = props;
  const page = usePage({ pageId, storeType });
  if (!page) return null;

  return (
    <Link href={href} className="flex items-center gap-2 rounded-md px-2 py-1.5 text-13 text-primary hover:bg-layer-1">
      <PageLogo logo={page.logo_props} size={16} />
      <span className="truncate">{getPageName(page.name)}</span>
    </Link>
  );
});

export const PageSubPages = observer(function PageSubPages(props: TPageSubPagesProps) {
  const { page, projectId, storeType, workspaceSlug } = props;
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { canCurrentUserCreatePage, getChildPageIds } = usePageStore(storeType);
  const childIds = page.id ? getChildPageIds(page.id) : [];
  const canAdd = canCurrentUserCreatePage && !page.archived_at && !!page.id;

  if (childIds.length === 0 && !canAdd) return null;

  return (
    <section className="mt-2 flex flex-col pb-4" aria-label="Sub-pages">
      <h3 className="px-2 pt-4 pb-1 text-13 font-medium text-tertiary">Sub-pages</h3>
      {page.id &&
        childIds.map((childId) => (
          <SubPageLink
            key={childId}
            href={`/${workspaceSlug}/projects/${projectId}/pages/${childId}`}
            pageId={childId}
            storeType={storeType}
          />
        ))}
      {canAdd && (
        <button
          type="button"
          className="flex items-center gap-2 rounded-md px-2 py-1.5 text-left text-13 text-tertiary hover:bg-layer-1 hover:text-primary"
          onClick={() => setIsModalOpen(true)}
        >
          <PlusIcon className="size-4" />
          Add sub-page
        </button>
      )}
      {page.id && (
        <CreatePageModal
          handleModalClose={() => setIsModalOpen(false)}
          isModalOpen={isModalOpen}
          pageAccess={page.access}
          parentId={page.id}
          projectId={projectId}
          redirectionEnabled
          storeType={storeType}
          workspaceSlug={workspaceSlug}
        />
      )}
    </section>
  );
});
