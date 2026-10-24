/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

// homelab: an Open / Done filter for the to-do lists on a page. The counts come
// from the editor's DOM (one MutationObserver), the hiding is CSS keyed on the
// data-checklist-filter attribute of the wrapper around the editor
// (apps/web/styles/globals.css). Recipe: plane/web-patches/README.md, "Checklist filter".

import { useCallback, useEffect, useState } from "react";
import { ListChecks } from "lucide-react";
// plane imports
import { cn } from "@plane/utils";

export type TChecklistFilter = "all" | "open" | "done";

export type TChecklistCounts = {
  total: number;
  done: number;
};

const CHECKLIST_FILTERS: readonly TChecklistFilter[] = ["all", "open", "done"];
const STORAGE_PREFIX = "page_checklist_filter_";
// The task-item node view renders its <li> with data-checked but without the
// data-type="taskItem" the exported HTML carries, so match on the list instead.
const TASK_ITEM_SELECTOR = 'ul[data-type="taskList"] > li';
const NO_ITEMS: TChecklistCounts = { total: 0, done: 0 };

export const isChecklistFilter = (value: unknown): value is TChecklistFilter =>
  typeof value === "string" && (CHECKLIST_FILTERS as readonly string[]).includes(value);

/** The to-do items under a DOM node, and how many of them are ticked. */
export const countTaskItems = (root: ParentNode | null | undefined): TChecklistCounts => {
  if (!root) return NO_ITEMS;
  const items = root.querySelectorAll(TASK_ITEM_SELECTOR);
  let done = 0;
  items.forEach((item) => {
    if (item.getAttribute("data-checked") === "true") done += 1;
  });
  return { total: items.length, done };
};

const readStoredFilter = (pageId: string | undefined): TChecklistFilter => {
  if (!pageId || typeof window === "undefined") return "all";
  try {
    const stored = window.localStorage.getItem(STORAGE_PREFIX + pageId);
    return isChecklistFilter(stored) ? stored : "all";
  } catch {
    return "all";
  }
};

const storeFilter = (pageId: string | undefined, filter: TChecklistFilter) => {
  if (!pageId || typeof window === "undefined") return;
  try {
    if (filter === "all") window.localStorage.removeItem(STORAGE_PREFIX + pageId);
    else window.localStorage.setItem(STORAGE_PREFIX + pageId, filter);
  } catch {
    // storage unavailable: the choice lasts for this view only
  }
};

/** The filter of a page, remembered per page in localStorage ("all" is never stored). */
export const useChecklistFilter = (
  pageId: string | undefined
): [TChecklistFilter, (filter: TChecklistFilter) => void] => {
  const [state, setState] = useState<{ pageId: string | undefined; filter: TChecklistFilter }>(() => ({
    pageId,
    filter: readStoredFilter(pageId),
  }));
  // a different page than the one the state was set for reads its own stored choice
  const filter = state.pageId === pageId ? state.filter : readStoredFilter(pageId);
  const setFilter = useCallback(
    (next: TChecklistFilter) => {
      storeFilter(pageId, next);
      setState({ pageId, filter: next });
    },
    [pageId]
  );
  return [filter, setFilter];
};

/**
 * Watches the editor's DOM under `containerRef` for to-do items and keeps their
 * counts current. `enabled` should flip to true once the container is rendered.
 */
export const useChecklistCounts = (
  containerRef: React.RefObject<HTMLElement | null>,
  enabled: boolean
): TChecklistCounts => {
  const [counts, setCounts] = useState<TChecklistCounts>(NO_ITEMS);

  useEffect(() => {
    const container = containerRef.current;
    if (!enabled || !container) return;
    let frame = 0;
    const update = () => {
      frame = 0;
      const next = countTaskItems(container);
      setCounts((prev) => (prev.total === next.total && prev.done === next.done ? prev : next));
    };
    const schedule = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(update);
    };
    update();
    const observer = new MutationObserver(schedule);
    observer.observe(container, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["data-checked"],
    });
    return () => {
      observer.disconnect();
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [containerRef, enabled]);

  return counts;
};

type TPageChecklistFilterProps = {
  className?: string;
  counts: TChecklistCounts;
  filter: TChecklistFilter;
  onChange: (filter: TChecklistFilter) => void;
};

/** The filter bar: All / Open / Done with counts, and a progress line. Renders nothing without to-do items. */
export function PageChecklistFilter(props: TPageChecklistFilterProps) {
  const { className, counts, filter, onChange } = props;
  if (counts.total === 0) return null;
  const open = counts.total - counts.done;
  const options: { key: TChecklistFilter; label: string; count: number }[] = [
    { key: "all", label: "All", count: counts.total },
    { key: "open", label: "Open", count: open },
    { key: "done", label: "Done", count: counts.done },
  ];
  const percent = Math.round((counts.done / counts.total) * 100);

  return (
    <div className={cn("flex flex-wrap items-center gap-x-3 gap-y-1.5 py-2", className)} data-page-checklist-filter>
      <div className="flex items-center gap-1.5">
        <ListChecks className="size-3.5 flex-shrink-0 text-tertiary" aria-hidden="true" />
        <div
          role="radiogroup"
          aria-label="Show to-do items"
          className="flex items-center gap-0.5 rounded-md border border-subtle bg-layer-1 p-0.5"
        >
          {options.map((option) => {
            const isActive = filter === option.key;
            return (
              <button
                key={option.key}
                type="button"
                role="radio"
                aria-checked={isActive}
                onClick={() => onChange(option.key)}
                className={cn("flex items-center gap-1 rounded-sm px-2 py-0.5 text-11 font-medium transition-colors", {
                  "bg-surface-1 text-primary": isActive,
                  "text-tertiary hover:text-secondary": !isActive,
                })}
              >
                {option.label}
                <span className="tabular-nums">{option.count}</span>
              </button>
            );
          })}
        </div>
      </div>
      <div
        className="flex min-w-[140px] flex-1 items-center gap-2"
        aria-label={`${counts.done} of ${counts.total} done`}
      >
        <div className="h-1 flex-1 overflow-hidden rounded-full bg-layer-1">
          <div
            className="h-full rounded-full bg-accent-primary transition-[width] duration-300"
            style={{ width: `${percent}%` }}
          />
        </div>
        <span className="text-11 whitespace-nowrap text-tertiary tabular-nums">
          {counts.done} of {counts.total} done
        </span>
      </div>
    </div>
  );
}
