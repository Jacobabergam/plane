/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { observer } from "mobx-react";
import { FileCode2 } from "lucide-react";
// store
import type { TPageInstance } from "@/store/pages/base-page";

type Props = {
  className?: string;
  onAddHtml: () => void;
  page: TPageInstance;
};

export const PageAddHtmlButton = observer(function PageAddHtmlButton(props: Props) {
  const { className, onAddHtml, page } = props;
  // derived values
  const { isContentEditable, view_props } = page;

  if (!isContentEditable || view_props?.html_document) return null;

  return (
    <div className={className}>
      <button
        type="button"
        className="flex items-center gap-1 rounded-sm p-1 text-13 font-medium text-tertiary transition-colors outline-none hover:bg-layer-1"
        onClick={onAddHtml}
      >
        <FileCode2 className="size-4 flex-shrink-0" />
        Add HTML
      </button>
    </div>
  );
});
