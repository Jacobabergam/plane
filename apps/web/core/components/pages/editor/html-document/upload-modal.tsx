/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { useEffect, useRef, useState } from "react";
import { observer } from "mobx-react";
import { FileCode2 } from "lucide-react";
// plane imports
import { Button } from "@plane/propel/button";
import { TOAST_TYPE, setToast } from "@plane/propel/toast";
import { EModalPosition, EModalWidth, Input, ModalCore } from "@plane/ui";
import {
  HTML_DOCUMENT_ACCEPT,
  cn,
  convertBytesToSize,
  isHtmlDocumentFile,
  normalizeHtmlDocumentSourceUrl,
} from "@plane/utils";
// plane web hooks
import { useFileSize } from "@/plane-web/hooks/use-file-size";
// services
import { ProjectPageService } from "@/services/page";
// store
import type { TPageInstance } from "@/store/pages/base-page";
// local imports
import { cacheHtmlDocument } from "./html-document";

const projectPageService = new ProjectPageService();

type Props = {
  isOpen: boolean;
  onClose: () => void;
  page: TPageInstance;
  projectId: string;
  workspaceSlug: string;
};

export const PageHtmlDocumentModal = observer(function PageHtmlDocumentModal(props: Props) {
  const { isOpen, onClose, page, projectId, workspaceSlug } = props;
  // refs
  const fileInputRef = useRef<HTMLInputElement>(null);
  // states
  const [file, setFile] = useState<File | null>(null);
  const [sourceUrl, setSourceUrl] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  // plane web hooks
  const { maxFileSize } = useFileSize();
  // derived values
  const { id: pageId, setHtmlDocument, view_props } = page;
  const existing = view_props?.html_document;
  const maxFileSizeInMB = Math.round(maxFileSize / (1024 * 1024));
  const normalizedSourceUrl = normalizeHtmlDocumentSourceUrl(sourceUrl);

  // start from the stored link each time the modal opens
  useEffect(() => {
    if (!isOpen) return;
    setFile(null);
    setSourceUrl(existing?.source_url ?? "");
    setIsDragging(false);
  }, [isOpen, existing?.source_url]);

  const handleClose = () => {
    if (isSaving) return;
    onClose();
  };

  const pickFile = (candidate: File | undefined) => {
    if (!candidate) return;
    if (!isHtmlDocumentFile(candidate)) {
      setToast({ type: TOAST_TYPE.ERROR, title: "Unsupported file", message: "Choose an .html file." });
      return;
    }
    if (candidate.size > maxFileSize) {
      setToast({
        type: TOAST_TYPE.ERROR,
        title: "File too large",
        message: `The HTML file must be ${maxFileSizeInMB} MB or smaller.`,
      });
      return;
    }
    setFile(candidate);
  };

  const handleSubmit = async () => {
    if (!file || !pageId || normalizedSourceUrl === null) return;
    setIsSaving(true);
    try {
      const { html, ...document } = await projectPageService.uploadHtmlDocument(
        workspaceSlug,
        projectId,
        pageId,
        file,
        normalizedSourceUrl
      );
      cacheHtmlDocument(document.asset_id, html);
      setHtmlDocument(document);
      onClose();
    } catch (error) {
      const message =
        error && typeof error === "object" && "error" in error && typeof error.error === "string"
          ? error.error
          : "The HTML could not be uploaded. Please try again.";
      setToast({ type: TOAST_TYPE.ERROR, title: "HTML not uploaded", message });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <ModalCore isOpen={isOpen} handleClose={handleClose} position={EModalPosition.CENTER} width={EModalWidth.XL}>
      <div className="flex flex-col gap-4 p-5">
        <div>
          <h3 className="text-18 font-medium text-secondary">{existing ? "Replace HTML design" : "Add HTML design"}</h3>
          <p className="mt-1 text-13 text-tertiary">
            The HTML shows at the top of this page in a sandboxed frame, and Plane search matches its text. A Claude
            artifact works as is: download it as HTML, or publish it with <code>design_page.py</code>.
          </p>
        </div>
        <div
          className={cn(
            "flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed border-subtle px-6 py-8 text-center transition-colors",
            { "border-accent-strong bg-layer-1": isDragging }
          )}
          onDragOver={(event) => {
            event.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(event) => {
            event.preventDefault();
            setIsDragging(false);
            pickFile(event.dataTransfer.files?.[0]);
          }}
        >
          <FileCode2 className="size-8 text-placeholder" />
          {file ? (
            <p className="text-13 text-secondary">
              <span className="font-medium">{file.name}</span> · {convertBytesToSize(file.size)}
            </p>
          ) : (
            <p className="text-13 text-secondary">Drop an .html file here, up to {maxFileSizeInMB} MB.</p>
          )}
          <Button variant="secondary" size="lg" onClick={() => fileInputRef.current?.click()} disabled={isSaving}>
            {file ? "Choose another file" : "Choose file"}
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept={HTML_DOCUMENT_ACCEPT}
            className="hidden"
            onChange={(event) => {
              pickFile(event.target.files?.[0]);
              // reset so picking the same file again still fires a change
              event.target.value = "";
            }}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="page-html-source-url" className="text-13 font-medium text-secondary">
            Source link <span className="font-normal text-placeholder">(optional)</span>
          </label>
          <Input
            id="page-html-source-url"
            type="url"
            value={sourceUrl}
            onChange={(event) => setSourceUrl(event.target.value)}
            placeholder="https://claude.ai/artifact/…"
            className="w-full text-13"
            hasError={normalizedSourceUrl === null}
          />
          {normalizedSourceUrl === null && (
            <p className="text-11 text-danger-primary">Enter an http(s) link, or leave it empty.</p>
          )}
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" size="lg" onClick={handleClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button
            variant="primary"
            size="lg"
            onClick={() => void handleSubmit()}
            loading={isSaving}
            disabled={!file || normalizedSourceUrl === null}
          >
            {isSaving ? "Uploading" : existing ? "Replace" : "Add design"}
          </Button>
        </div>
      </div>
    </ModalCore>
  );
});
