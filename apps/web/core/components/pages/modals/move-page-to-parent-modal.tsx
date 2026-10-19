/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { useMemo, useState } from "react";
import { observer } from "mobx-react";
import { useParams } from "next/navigation";
import { Combobox } from "@headlessui/react";
import { CornerLeftUp } from "lucide-react";
// plane imports
import { ChevronRightIcon, SearchIcon } from "@plane/propel/icons";
import { TOAST_TYPE, setToast } from "@plane/propel/toast";
import type { TPageTree } from "@plane/utils";
import { EModalPosition, EModalWidth, ModalCore } from "@plane/ui";
import { cn, collectPageDescendantIds, getPageName } from "@plane/utils";
// components
import { PageLogo } from "@/components/pages/page-logo";
// plane web hooks
import type { EPageStoreType } from "@/plane-web/hooks/store";
import { usePage, usePageStore } from "@/plane-web/hooks/store";
// store
import type { TPageInstance } from "@/store/pages/base-page";

const TOP_LEVEL = "__top_level__";
const EMPTY_TREE: TPageTree = { rootIds: [], childIdsByParent: {} };

type TMovePageToParentModalProps = {
  isOpen: boolean;
  onClose: () => void;
  page: TPageInstance;
  storeType: EPageStoreType;
};

type TMoveTargetRowProps = {
  childIdsByParent: Record<string, string[]>;
  currentParentId: string | null;
  depth: number;
  excludedIds: ReadonlySet<string>;
  isCollapsed: (pageId: string) => boolean;
  onToggle: (pageId: string) => void;
  pageId: string;
  storeType: EPageStoreType;
};

const optionClassName = ({ active, selected }: { active: boolean; selected: boolean }) =>
  cn("flex w-full cursor-pointer items-center gap-1.5 rounded-md px-2 py-1.5 text-13 text-secondary select-none", {
    "bg-layer-1 text-primary": active || selected,
  });

const MoveTargetRow = observer(function MoveTargetRow(props: TMoveTargetRowProps) {
  const { childIdsByParent, currentParentId, depth, excludedIds, isCollapsed, onToggle, pageId, storeType } = props;
  const page = usePage({ pageId, storeType });

  // The page being moved and everything below it are not destinations. Their subtrees go with them.
  if (!page || page.archived_at || excludedIds.has(pageId)) return null;

  const childIds = (childIdsByParent[pageId] ?? []).filter((childId) => !excludedIds.has(childId));
  const hasChildren = childIds.length > 0;
  const expanded = hasChildren && !isCollapsed(pageId);
  const isCurrent = pageId === currentParentId;

  return (
    <>
      <Combobox.Option as="div" value={pageId} className={optionClassName}>
        <span style={{ paddingLeft: depth * 12 }} className="flex shrink-0 items-center">
          {hasChildren ? (
            <button
              type="button"
              aria-expanded={expanded}
              aria-label={expanded ? `Collapse ${getPageName(page.name)}` : `Expand ${getPageName(page.name)}`}
              className="grid size-5 shrink-0 place-items-center rounded-sm text-tertiary hover:bg-layer-transparent-hover hover:text-primary"
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                onToggle(pageId);
              }}
            >
              <ChevronRightIcon
                className={cn("size-3.5 transition-transform duration-150", { "rotate-90": expanded })}
              />
            </button>
          ) : (
            <span className="inline-block size-5 shrink-0" />
          )}
        </span>
        <PageLogo className="shrink-0" logo={page.logo_props} size={16} />
        <span className="truncate">{getPageName(page.name)}</span>
        {isCurrent && <span className="ml-auto shrink-0 text-11 text-tertiary">Current</span>}
      </Combobox.Option>
      {expanded &&
        childIds.map((childId) => (
          <MoveTargetRow
            key={childId}
            childIdsByParent={childIdsByParent}
            currentParentId={currentParentId}
            depth={depth + 1}
            excludedIds={excludedIds}
            isCollapsed={isCollapsed}
            onToggle={onToggle}
            pageId={childId}
            storeType={storeType}
          />
        ))}
    </>
  );
});

/**
 * Move to…: pick a new parent for a page, or the top level. The choices are the project's
 * non-archived pages as a searchable tree, without the page itself and its sub-pages.
 */
export const MovePageToParentModal = observer(function MovePageToParentModal(props: TMovePageToParentModalProps) {
  const { isOpen, onClose, page, storeType } = props;
  // params
  const { projectId: routeProjectId } = useParams();
  // store hooks
  const { getCurrentProjectPageIds, getDocsNavigationTree, getPageById } = usePageStore(storeType);
  // states
  const [query, setQuery] = useState("");
  const [collapsedMap, setCollapsedMap] = useState<Record<string, boolean>>({});
  const [isMoving, setIsMoving] = useState(false);
  // derived values
  const pageId = page.id;
  const currentParentId = page.parent || null;
  const projectId = page.project_ids?.[0] ?? routeProjectId?.toString() ?? "";
  const tree = projectId ? getDocsNavigationTree(projectId, query) : EMPTY_TREE;
  const searching = query.trim().length > 0;
  const projectPageIds = projectId ? getCurrentProjectPageIds(projectId) : [];
  const excludedIds = useMemo(() => {
    if (!pageId) return new Set<string>();
    const pages = projectPageIds.flatMap((id) => {
      const stored = getPageById(id);
      return stored?.id ? [{ id: stored.id, parent: stored.parent }] : [];
    });
    const excluded = collectPageDescendantIds(pageId, pages);
    excluded.add(pageId);
    return excluded;
  }, [getPageById, pageId, projectPageIds]);
  const visibleRootIds = tree.rootIds.filter((rootId) => !excludedIds.has(rootId));

  const handleClose = () => {
    if (isMoving) return;
    onClose();
    setQuery("");
    setCollapsedMap({});
  };

  const handleSelect = async (value: string | null) => {
    if (!value || isMoving) return;
    const nextParentId = value === TOP_LEVEL ? null : value;
    if (nextParentId === currentParentId) {
      handleClose();
      return;
    }
    const destination = nextParentId ? getPageName(getPageById(nextParentId)?.name) : "the top level";
    setIsMoving(true);
    try {
      await page.updateParent(nextParentId);
      setToast({
        type: TOAST_TYPE.SUCCESS,
        title: "Page moved",
        message: `${getPageName(page.name)} is now under ${destination}.`,
      });
      setIsMoving(false);
      handleClose();
    } catch (error) {
      setIsMoving(false);
      const detail =
        typeof error === "object" && error !== null && "error" in error && typeof error.error === "string"
          ? error.error
          : error instanceof Error
            ? error.message
            : undefined;
      setToast({
        type: TOAST_TYPE.ERROR,
        title: "Page could not be moved",
        message: detail ?? "Please try again.",
      });
    }
  };

  if (!pageId) return null;

  return (
    <ModalCore isOpen={isOpen} handleClose={handleClose} position={EModalPosition.CENTER} width={EModalWidth.LG}>
      <Combobox value={currentParentId ?? TOP_LEVEL} onChange={handleSelect}>
        <div className="border-b border-subtle px-4 pt-4 pb-3">
          <h3 className="text-16 font-medium text-primary">
            Move <span className="break-words">{getPageName(page.name)}</span> to…
          </h3>
          <label className="mt-3 flex items-center gap-2 rounded-md border border-subtle px-2 py-1.5">
            <SearchIcon className="size-3.5 shrink-0 text-placeholder" aria-hidden="true" />
            <Combobox.Input
              value={query}
              autoFocus
              className="w-full border-none bg-transparent text-13 text-primary placeholder:text-placeholder focus:outline-none"
              placeholder="Search pages"
              aria-label="Search pages"
              displayValue={() => query}
              onChange={(event) => {
                setQuery(event.target.value);
                setCollapsedMap({});
              }}
            />
          </label>
        </div>
        <Combobox.Options static className="vertical-scrollbar scrollbar-sm max-h-80 overflow-y-auto p-2">
          <Combobox.Option as="div" value={TOP_LEVEL} className={optionClassName}>
            <span className="grid size-5 shrink-0 place-items-center text-tertiary">
              <CornerLeftUp className="size-3.5" />
            </span>
            <span className="truncate font-medium">Top level</span>
            {currentParentId === null && <span className="ml-auto shrink-0 text-11 text-tertiary">Current</span>}
          </Combobox.Option>
          {visibleRootIds.length === 0 ? (
            <p className="px-2 py-3 text-13 text-tertiary">
              {searching ? "No matching pages" : "No other pages to move under"}
            </p>
          ) : (
            visibleRootIds.map((rootId) => (
              <MoveTargetRow
                key={rootId}
                childIdsByParent={tree.childIdsByParent}
                currentParentId={currentParentId}
                depth={0}
                excludedIds={excludedIds}
                isCollapsed={(id) => !!collapsedMap[id]}
                onToggle={(id) => setCollapsedMap((previous) => ({ ...previous, [id]: !previous[id] }))}
                pageId={rootId}
                storeType={storeType}
              />
            ))
          )}
        </Combobox.Options>
        <div className="flex items-center justify-between border-t border-subtle px-4 py-2 text-11 text-tertiary">
          <span>{isMoving ? "Moving…" : "Pick a page, or Top level"}</span>
          <button
            type="button"
            className="rounded-md px-2 py-1 text-11 font-medium text-secondary hover:bg-layer-transparent-hover hover:text-primary"
            onClick={handleClose}
            disabled={isMoving}
          >
            Cancel
          </button>
        </div>
      </Combobox>
    </ModalCore>
  );
});
