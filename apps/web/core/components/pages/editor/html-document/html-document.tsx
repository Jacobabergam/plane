/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { useCallback, useEffect, useState } from "react";
import { observer } from "mobx-react";
import { createPortal } from "react-dom";
import {
  ChevronDown,
  Download,
  ExternalLink,
  FileCode2,
  Maximize2,
  Minimize2,
  Monitor,
  RefreshCw,
  Smartphone,
  Tablet,
  Trash2,
} from "lucide-react";
// plane imports
import { Button } from "@plane/propel/button";
import { TOAST_TYPE, setToast } from "@plane/propel/toast";
import { Tooltip } from "@plane/propel/tooltip";
import type { TPageHtmlDocument } from "@plane/types";
import { AlertModalCore } from "@plane/ui";
import type { THtmlDocumentViewport } from "@plane/utils";
import {
  HTML_DOCUMENT_SANDBOX,
  HTML_DOCUMENT_VIEWPORT_WIDTHS,
  cn,
  convertBytesToSize,
  getHtmlDocumentLabel,
  isClaudeArtifactUrl,
} from "@plane/utils";
// services
import { ProjectPageService } from "@/services/page";
// store
import type { TPageInstance } from "@/store/pages/base-page";

const projectPageService = new ProjectPageService();

/** HTML by asset id. A replace gets a new asset id, so an entry never goes stale. */
const htmlDocumentCache = new Map<string, string>();

export const cacheHtmlDocument = (assetId: string, html: string) => {
  htmlDocumentCache.set(assetId, html);
};

const COLLAPSED_STORAGE_KEY = (pageId: string) => `page_html_document_collapsed_${pageId}`;

const readCollapsed = (pageId: string | undefined): boolean => {
  if (!pageId) return false;
  try {
    return window.localStorage.getItem(COLLAPSED_STORAGE_KEY(pageId)) === "1";
  } catch {
    return false;
  }
};

const writeCollapsed = (pageId: string | undefined, collapsed: boolean) => {
  if (!pageId) return;
  try {
    if (collapsed) window.localStorage.setItem(COLLAPSED_STORAGE_KEY(pageId), "1");
    else window.localStorage.removeItem(COLLAPSED_STORAGE_KEY(pageId));
  } catch {
    // storage blocked (private mode): the panel just starts expanded next time
  }
};

const VIEWPORTS: { key: THtmlDocumentViewport; label: string; icon: typeof Monitor }[] = [
  { key: "desktop", label: "Full width", icon: Monitor },
  { key: "tablet", label: "Tablet (820px)", icon: Tablet },
  { key: "phone", label: "Phone (390px)", icon: Smartphone },
];

type FrameProps = {
  document: TPageHtmlDocument;
  html: string;
  viewport: THtmlDocumentViewport;
};

/** The document in an opaque-origin sandbox (see HTML_DOCUMENT_SANDBOX), centred at the chosen width. */
function HtmlDocumentFrame(props: FrameProps) {
  const { document, html, viewport } = props;
  const width = HTML_DOCUMENT_VIEWPORT_WIDTHS[viewport];

  return (
    <div className="flex size-full justify-center overflow-x-auto bg-layer-1">
      <iframe
        key={document.asset_id}
        title={getHtmlDocumentLabel(document)}
        srcDoc={html}
        sandbox={HTML_DOCUMENT_SANDBOX}
        referrerPolicy="no-referrer"
        className={cn("block h-full flex-shrink-0 border-0 bg-white", { "border-x border-subtle": !!width })}
        style={{ width: width ? `${width}px` : "100%" }}
      />
    </div>
  );
}

type ToolbarButtonProps = {
  label: string;
  icon: React.ReactNode;
  onClick?: () => void;
  href?: string;
  isActive?: boolean;
  className?: string;
};

function ToolbarIconButton(props: ToolbarButtonProps) {
  const { label, icon, onClick, href, isActive, className } = props;
  const classNames = cn(
    "grid size-7 flex-shrink-0 place-items-center rounded-sm text-tertiary transition-colors outline-none hover:bg-layer-1 hover:text-secondary focus-visible:ring-2 focus-visible:ring-accent-strong",
    { "bg-layer-1 text-primary": isActive },
    className
  );
  return (
    <Tooltip tooltipContent={label}>
      {href ? (
        <a href={href} target="_blank" rel="noopener noreferrer" className={classNames} aria-label={label}>
          {icon}
        </a>
      ) : (
        <button type="button" className={classNames} onClick={onClick} aria-label={label} aria-pressed={isActive}>
          {icon}
        </button>
      )}
    </Tooltip>
  );
}

type Props = {
  className?: string;
  /** Opens the upload modal to replace the document. */
  onReplace: () => void;
  page: TPageInstance;
  projectId: string;
  workspaceSlug: string;
};

export const PageHtmlDocument = observer(function PageHtmlDocument(props: Props) {
  const { className, onReplace, page, projectId, workspaceSlug } = props;
  // derived values
  const { id: pageId, isContentEditable, setHtmlDocument, view_props } = page;
  const document = view_props?.html_document;
  const assetId = document?.asset_id;
  // states
  const [html, setHtml] = useState<string | null>(() => (assetId ? (htmlDocumentCache.get(assetId) ?? null) : null));
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [viewport, setViewport] = useState<THtmlDocumentViewport>("desktop");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(() => readCollapsed(pageId));
  const [isRemoveModalOpen, setIsRemoveModalOpen] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);

  useEffect(() => {
    if (!assetId || !pageId) return;
    const cached = htmlDocumentCache.get(assetId);
    if (cached !== undefined) {
      setHtml(cached);
      setLoadError(null);
      return;
    }
    let isCancelled = false;
    setHtml(null);
    setLoadError(null);
    projectPageService
      .fetchHtmlDocument(workspaceSlug, projectId, pageId)
      .then((response) => {
        if (isCancelled) return;
        htmlDocumentCache.set(assetId, response.html);
        setHtml(response.html);
      })
      .catch((error: unknown) => {
        if (isCancelled) return;
        const message =
          error && typeof error === "object" && "error" in error && typeof error.error === "string"
            ? error.error
            : "The design could not be loaded.";
        setLoadError(message);
      });
    return () => {
      isCancelled = true;
    };
  }, [assetId, pageId, projectId, workspaceSlug, reloadKey]);

  // Escape leaves full screen
  useEffect(() => {
    if (!isFullscreen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsFullscreen(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isFullscreen]);

  const toggleCollapsed = useCallback(() => {
    setIsCollapsed((current) => {
      writeCollapsed(pageId, !current);
      return !current;
    });
  }, [pageId]);

  if (!document || !pageId) return null;

  const label = getHtmlDocumentLabel(document);
  const sourceUrl = document.source_url;

  const handleDownload = () => {
    if (html === null) return;
    const url = URL.createObjectURL(new Blob([html], { type: "text/html;charset=utf-8" }));
    const anchor = window.document.createElement("a");
    anchor.href = url;
    anchor.download = document.name || "design.html";
    anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const handleRemove = async () => {
    setIsRemoving(true);
    try {
      await projectPageService.removeHtmlDocument(workspaceSlug, projectId, pageId);
      setHtmlDocument(null);
      setIsRemoveModalOpen(false);
    } catch {
      setToast({
        type: TOAST_TYPE.ERROR,
        title: "Design not removed",
        message: "The HTML design could not be removed. Please try again.",
      });
    } finally {
      setIsRemoving(false);
    }
  };

  const viewportButtons = (
    <div className="hidden items-center gap-0.5 md:flex">
      {VIEWPORTS.map(({ key, label: viewportLabel, icon: Icon }) => (
        <ToolbarIconButton
          key={key}
          label={viewportLabel}
          icon={<Icon className="size-4" />}
          isActive={viewport === key}
          onClick={() => setViewport(key)}
        />
      ))}
    </div>
  );

  const actionButtons = (
    <>
      {sourceUrl && (
        <ToolbarIconButton
          label={isClaudeArtifactUrl(sourceUrl) ? "Open in Claude" : "Open source"}
          icon={<ExternalLink className="size-4" />}
          href={sourceUrl}
        />
      )}
      <ToolbarIconButton label="Download HTML" icon={<Download className="size-4" />} onClick={handleDownload} />
      {isContentEditable && (
        <>
          <ToolbarIconButton label="Replace HTML" icon={<RefreshCw className="size-4" />} onClick={onReplace} />
          <ToolbarIconButton
            label="Remove HTML"
            icon={<Trash2 className="size-4" />}
            onClick={() => setIsRemoveModalOpen(true)}
          />
        </>
      )}
    </>
  );

  const body = (frameClassName: string) => {
    if (loadError)
      return (
        <div className="flex flex-col items-center justify-center gap-3 px-6 py-12 text-center">
          <p className="text-13 text-secondary">{loadError}</p>
          <Button variant="secondary" size="base" onClick={() => setReloadKey((key) => key + 1)}>
            Try again
          </Button>
        </div>
      );
    if (html === null)
      return <div className={cn("animate-pulse bg-layer-1", frameClassName)} aria-label="Loading design" />;
    return (
      <div className={frameClassName}>
        <HtmlDocumentFrame document={document} html={html} viewport={viewport} />
      </div>
    );
  };

  return (
    <div className={className} data-page-html-document>
      <div className="overflow-hidden rounded-lg border border-subtle bg-surface-1">
        <div className="flex items-center gap-2 border-b border-subtle px-2 py-1.5">
          <button
            type="button"
            className="flex min-w-0 flex-1 items-center gap-2 rounded-sm px-1 py-0.5 text-left outline-none focus-visible:ring-2 focus-visible:ring-accent-strong"
            onClick={toggleCollapsed}
            aria-expanded={!isCollapsed}
          >
            <ChevronDown
              className={cn("size-4 flex-shrink-0 text-tertiary transition-transform", { "-rotate-90": isCollapsed })}
            />
            <FileCode2 className="size-4 flex-shrink-0 text-tertiary" />
            <span className="truncate text-13 font-medium text-secondary">{label}</span>
            <span className="flex-shrink-0 text-11 text-placeholder">
              HTML · {convertBytesToSize(document.size || 0)}
            </span>
          </button>
          {!isCollapsed && viewportButtons}
          <div className="flex items-center gap-0.5">
            {actionButtons}
            {!isCollapsed && (
              <ToolbarIconButton
                label="Full screen"
                icon={<Maximize2 className="size-4" />}
                onClick={() => setIsFullscreen(true)}
              />
            )}
          </div>
        </div>
        {/* resize-y: drag the bottom edge to make the frame taller or shorter */}
        {!isCollapsed &&
          (isFullscreen ? (
            // keep the space while the full-screen copy runs, so only one frame executes the document
            <div className="h-[70vh] min-h-[320px] bg-layer-1" />
          ) : (
            body("h-[70vh] min-h-[320px] max-h-[2400px] resize-y overflow-hidden")
          ))}
      </div>
      {isFullscreen &&
        createPortal(
          <div
            className="fixed inset-0 z-[30] flex flex-col bg-surface-1"
            role="dialog"
            aria-modal="true"
            aria-label={label}
          >
            <div className="flex items-center gap-2 border-b border-subtle px-3 py-2">
              <FileCode2 className="size-4 flex-shrink-0 text-tertiary" />
              <span className="min-w-0 flex-1 truncate text-13 font-medium text-secondary">{label}</span>
              {viewportButtons}
              <div className="flex items-center gap-0.5">
                {sourceUrl && (
                  <ToolbarIconButton
                    label={isClaudeArtifactUrl(sourceUrl) ? "Open in Claude" : "Open source"}
                    icon={<ExternalLink className="size-4" />}
                    href={sourceUrl}
                  />
                )}
                <ToolbarIconButton
                  label="Exit full screen (Esc)"
                  icon={<Minimize2 className="size-4" />}
                  onClick={() => setIsFullscreen(false)}
                />
              </div>
            </div>
            {body("min-h-0 flex-1")}
          </div>,
          window.document.body
        )}
      <AlertModalCore
        handleClose={() => setIsRemoveModalOpen(false)}
        handleSubmit={() => void handleRemove()}
        isSubmitting={isRemoving}
        isOpen={isRemoveModalOpen}
        title="Remove HTML design"
        content={
          <>
            Remove <span className="font-medium break-words text-primary">{label}</span> from this page? The page and
            its notes stay. Publish or upload the HTML again to bring the design back.
          </>
        }
      />
    </div>
  );
});
