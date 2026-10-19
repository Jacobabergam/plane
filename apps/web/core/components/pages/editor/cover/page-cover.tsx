/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { useState } from "react";
import { observer } from "mobx-react";
import { ImageIcon, Trash2 } from "lucide-react";
// plane imports
import { Button } from "@plane/propel/button";
import { TOAST_TYPE, setToast } from "@plane/propel/toast";
import { cn } from "@plane/utils";
// helpers
import { getCoverImageDisplayURL } from "@/helpers/cover-image.helper";
// store
import type { TPageInstance } from "@/store/pages/base-page";

type Props = {
  className?: string;
  onChangeCover: () => void;
  page: TPageInstance;
};

export const PageCover = observer(function PageCover(props: Props) {
  const { className, onChangeCover, page } = props;
  // states
  const [isRemoving, setIsRemoving] = useState(false);
  // derived values
  const { isContentEditable, setCoverImage, view_props } = page;
  const coverImageURL = getCoverImageDisplayURL(view_props?.cover_image, null);

  if (!coverImageURL) return null;

  const handleRemove = async () => {
    setIsRemoving(true);
    try {
      await setCoverImage(null);
    } catch {
      setToast({
        type: TOAST_TYPE.ERROR,
        title: "Cover not removed",
        message: "The cover image could not be removed. Please try again.",
      });
    } finally {
      setIsRemoving(false);
    }
  };

  return (
    <div
      className={cn(
        "group/page-cover relative h-[140px] w-full flex-shrink-0 overflow-hidden bg-layer-1 md:h-[220px]",
        className
      )}
    >
      <img src={coverImageURL} alt="Page cover" className="size-full object-cover" draggable={false} />
      {isContentEditable && (
        <div
          className={cn(
            "absolute right-3 bottom-3 flex items-center gap-1 transition-opacity duration-200",
            // always visible on touch screens, revealed on hover where a pointer can hover
            "pointer-fine:opacity-0 pointer-fine:group-hover/page-cover:opacity-100 pointer-fine:focus-within:opacity-100"
          )}
        >
          <Button variant="secondary" size="base" prependIcon={<ImageIcon />} onClick={onChangeCover}>
            Change cover
          </Button>
          <Button
            variant="secondary"
            size="base"
            prependIcon={<Trash2 />}
            onClick={() => void handleRemove()}
            loading={isRemoving}
          >
            Remove
          </Button>
        </div>
      )}
    </div>
  );
});
