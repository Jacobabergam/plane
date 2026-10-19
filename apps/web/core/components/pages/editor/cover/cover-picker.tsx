/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { useRef, useState } from "react";
import { observer } from "mobx-react";
import { ImageIcon } from "lucide-react";
// plane imports
import { Button } from "@plane/propel/button";
import { Tabs } from "@plane/propel/tabs";
import { TOAST_TYPE, setToast } from "@plane/propel/toast";
import { EFileAssetType } from "@plane/types";
import { EModalPosition, EModalWidth, ModalCore } from "@plane/ui";
import { cn } from "@plane/utils";
// helpers
import { STATIC_COVER_IMAGES } from "@/helpers/cover-image.helper";
// hooks
import { useEditorAsset } from "@/hooks/store/use-editor-asset";
// plane web hooks
import { useFileSize } from "@/plane-web/hooks/use-file-size";
// store
import type { TPageInstance } from "@/store/pages/base-page";

// the image types the asset upload endpoint accepts
const ACCEPTED_COVER_MIME_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"];

const GALLERY_IMAGES: string[] = Object.values(STATIC_COVER_IMAGES);

type Props = {
  isOpen: boolean;
  onClose: () => void;
  page: TPageInstance;
  projectId: string;
  workspaceSlug: string;
};

export const PageCoverPicker = observer(function PageCoverPicker(props: Props) {
  const { isOpen, onClose, page, projectId, workspaceSlug } = props;
  // states
  const [isSaving, setIsSaving] = useState(false);
  // refs
  const fileInputRef = useRef<HTMLInputElement>(null);
  // store hooks
  const { uploadEditorAsset } = useEditorAsset();
  const { maxFileSize } = useFileSize();
  // derived values
  const { id: pageId, setCoverImage, view_props } = page;
  const currentCover = view_props?.cover_image ?? null;
  const maxFileSizeInMB = Math.round((maxFileSize / (1024 * 1024)) * 10) / 10;

  const handleClose = () => {
    if (isSaving) return;
    onClose();
  };

  const applyCover = async (url: string) => {
    try {
      await setCoverImage(url);
      onClose();
    } catch {
      setToast({
        type: TOAST_TYPE.ERROR,
        title: "Cover not saved",
        message: "The cover image could not be saved. Please try again.",
      });
    }
  };

  const handleGallerySelect = async (url: string) => {
    if (isSaving) return;
    setIsSaving(true);
    await applyCover(url);
    setIsSaving(false);
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    // reset so picking the same file again still fires a change
    event.target.value = "";
    if (!file || !pageId) return;

    if (!ACCEPTED_COVER_MIME_TYPES.includes(file.type)) {
      setToast({
        type: TOAST_TYPE.ERROR,
        title: "Unsupported file",
        message: "Choose a JPEG, PNG, WebP or GIF image.",
      });
      return;
    }
    if (file.size > maxFileSize) {
      setToast({
        type: TOAST_TYPE.ERROR,
        title: "Image too large",
        message: `The image must be ${maxFileSizeInMB} MB or smaller.`,
      });
      return;
    }

    setIsSaving(true);
    try {
      // same path the page editor uses for inline images: a PAGE_DESCRIPTION asset owned by this page
      const { asset_url } = await uploadEditorAsset({
        blockId: `page-cover-${pageId}`,
        data: {
          entity_identifier: pageId,
          entity_type: EFileAssetType.PAGE_DESCRIPTION,
        },
        file,
        projectId,
        workspaceSlug,
      });
      await applyCover(asset_url);
    } catch (error) {
      const message =
        error && typeof error === "object" && "error" in error && typeof error.error === "string"
          ? error.error
          : "The image could not be uploaded. Please try again.";
      setToast({
        type: TOAST_TYPE.ERROR,
        title: "Image not uploaded",
        message,
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <ModalCore isOpen={isOpen} handleClose={handleClose} position={EModalPosition.CENTER} width={EModalWidth.XXL}>
      <div className="flex max-h-[80vh] flex-col p-5">
        <h3 className="text-18 font-medium text-secondary">Cover image</h3>
        <Tabs defaultValue="gallery" className="mt-4 flex min-h-0 flex-1 flex-col">
          <Tabs.List className="flex rounded-sm bg-layer-3 p-1">
            <Tabs.Trigger value="gallery" size="md">
              Gallery
            </Tabs.Trigger>
            <Tabs.Trigger value="upload" size="md">
              Upload
            </Tabs.Trigger>
            <Tabs.Indicator />
          </Tabs.List>
          <Tabs.Content
            value="gallery"
            className="vertical-scrollbar mt-3 scrollbar-sm min-h-0 flex-1 overflow-x-hidden overflow-y-auto"
          >
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {GALLERY_IMAGES.map((imageUrl, index) => (
                <button
                  key={imageUrl}
                  type="button"
                  className={cn(
                    "relative aspect-video overflow-hidden rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-accent-strong disabled:cursor-not-allowed",
                    {
                      "ring-2 ring-accent-strong": currentCover === imageUrl,
                    }
                  )}
                  onClick={() => void handleGallerySelect(imageUrl)}
                  disabled={isSaving}
                  aria-label={`Use cover image ${index + 1}`}
                >
                  <img
                    src={imageUrl}
                    alt=""
                    loading="lazy"
                    className="size-full object-cover transition-opacity hover:opacity-80"
                  />
                </button>
              ))}
            </div>
          </Tabs.Content>
          <Tabs.Content value="upload" className="mt-3">
            <div className="flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed border-subtle px-6 py-10 text-center">
              <ImageIcon className="size-8 text-placeholder" />
              <p className="text-13 text-secondary">
                JPEG, PNG, WebP or GIF, up to {maxFileSizeInMB} MB. Wide images work best.
              </p>
              <Button
                variant="primary"
                size="lg"
                onClick={() => fileInputRef.current?.click()}
                loading={isSaving}
                disabled={!pageId}
              >
                {isSaving ? "Uploading" : "Choose image"}
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept={ACCEPTED_COVER_MIME_TYPES.join(",")}
                className="hidden"
                onChange={(event) => void handleFileChange(event)}
              />
            </div>
          </Tabs.Content>
        </Tabs>
        <div className="mt-4 flex justify-end">
          <Button variant="secondary" size="lg" onClick={handleClose} disabled={isSaving}>
            Cancel
          </Button>
        </div>
      </div>
    </ModalCore>
  );
});
