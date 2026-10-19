/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { useState } from "react";
import { observer } from "mobx-react";
import { SmilePlus } from "lucide-react";
// plane imports
import { EmojiPicker, EmojiIconPickerTypes } from "@plane/propel/emoji-icon-picker";
import { cn } from "@plane/utils";
// store
import type { TPageInstance } from "@/store/pages/base-page";
// local imports
import { PageAddCoverButton } from "../cover";
import { PageEditorHeaderLogoPicker } from "./logo-picker";

type Props = {
  /** Opens the cover picker. Omit it where covers are not supported (no "Add cover" button then). */
  onAddCover?: () => void;
  page: TPageInstance;
  projectId?: string;
};

export const PageEditorHeaderRoot = observer(function PageEditorHeaderRoot(props: Props) {
  const { onAddCover, page } = props;
  // states
  const [isLogoPickerOpen, setIsLogoPickerOpen] = useState(false);
  // derived values
  const { isContentEditable, logo_props, name, updatePageLogo } = page;
  const isLogoSelected = !!logo_props?.in_use;
  const isTitleEmpty = !name || name.trim() === "";
  const hoverRevealClassName = cn("opacity-0 transition-all duration-200 group-hover/page-header:opacity-100", {
    "opacity-100": isTitleEmpty,
  });

  return (
    <>
      <div className="flex h-[48px] items-end gap-1 text-left">
        {!isLogoSelected && (
          <div className={hoverRevealClassName}>
            <EmojiPicker
              isOpen={isLogoPickerOpen}
              handleToggle={(val) => setIsLogoPickerOpen(val)}
              className="flex items-center justify-center"
              buttonClassName="flex items-center justify-center"
              label={
                <button
                  type="button"
                  className={cn(
                    "flex items-center gap-1 rounded-sm p-1 text-13 font-medium text-tertiary transition-colors outline-none hover:bg-layer-1",
                    {
                      "bg-layer-1": isLogoPickerOpen,
                    }
                  )}
                >
                  <SmilePlus className="size-4 flex-shrink-0" />
                  Icon
                </button>
              }
              onChange={updatePageLogo}
              defaultIconColor={
                logo_props?.in_use && logo_props.in_use === "icon" ? logo_props?.icon?.color : undefined
              }
              defaultOpen={
                logo_props?.in_use && logo_props?.in_use === "emoji"
                  ? EmojiIconPickerTypes.EMOJI
                  : EmojiIconPickerTypes.ICON
              }
              disabled={!isContentEditable}
            />
          </div>
        )}
        {onAddCover && (
          <PageAddCoverButton
            className={cn(hoverRevealClassName, "focus-within:opacity-100 pointer-coarse:opacity-100")}
            onAddCover={onAddCover}
            page={page}
          />
        )}
      </div>
      <PageEditorHeaderLogoPicker className="mt-2 flex w-full flex-shrink-0" page={page} />
    </>
  );
});
