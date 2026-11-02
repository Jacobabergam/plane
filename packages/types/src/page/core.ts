/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import type { TLogoProps } from "../common";
import type { EPageAccess } from "../enums";
import type { TPageExtended } from "./extended";

/**
 * Per-page view settings stored in the page's `view_props` JSON column.
 * The API replaces the whole object on PATCH, so writers must merge.
 */
export type TPageViewProps = {
  full_width?: boolean;
  /** Cover image: an uploaded page asset URL or a bundled gallery image URL. Null or omitted means no cover. */
  cover_image?: string | null;
  /**
   * HTML document shown at the top of the page (a design mockup, e.g. a Claude artifact). Written only by the
   * page's `/html/` route (homelab backend 1.3.1-h10); a page PATCH keeps the stored value.
   */
  html_document?: TPageHtmlDocument;
};

/** Metadata of a page's HTML document. The HTML itself comes from `GET .../pages/<id>/html/`. */
export type TPageHtmlDocument = {
  asset_id: string;
  /** File name, used for downloads. */
  name: string;
  /** Size in bytes. */
  size: number;
  /** Where the design lives (e.g. the claude.ai artifact link), "" for none. */
  source_url: string;
  /** The document's <title> (or first <h1>), "" for none. */
  title: string;
  updated_at: string;
  updated_by: string | null;
};

export type TPageHtmlDocumentResponse = TPageHtmlDocument & { html: string };

export type TPage = {
  access: EPageAccess | undefined;
  archived_at: string | null | undefined;
  color: string | undefined;
  created_at: Date | undefined;
  created_by: string | undefined;
  description_json: object | undefined;
  description_html: string | undefined;
  id: string | undefined;
  is_favorite: boolean;
  is_locked: boolean;
  label_ids: string[] | undefined;
  name: string | undefined;
  /** Parent page id. Null or omitted means a top-level page. */
  parent?: string | null | undefined;
  owned_by: string | undefined;
  project_ids?: string[] | undefined;
  updated_at: Date | undefined;
  updated_by: string | undefined;
  workspace: string | undefined;
  logo_props: TLogoProps | undefined;
  view_props?: TPageViewProps | undefined;
  deleted_at: Date | undefined;
} & TPageExtended;

// page filters
export type TPageNavigationTabs = "public" | "private" | "archived";

export type TPageFiltersSortKey = "name" | "created_at" | "updated_at" | "opened_at";

export type TPageFiltersSortBy = "asc" | "desc";

export type TPageFilterProps = {
  created_at?: string[] | null;
  created_by?: string[] | null;
  favorites?: boolean;
  labels?: string[] | null;
};

export type TPageFilters = {
  searchQuery: string;
  sortKey: TPageFiltersSortKey;
  sortBy: TPageFiltersSortBy;
  filters?: TPageFilterProps;
};

export type TPageEmbedType = "mention" | "issue";

export type TPageVersion = {
  created_at: string;
  created_by: string;
  deleted_at: string | null;
  description_binary?: string | null;
  description_html?: string | null;
  description_json?: object;
  id: string;
  last_saved_at: string;
  owned_by: string;
  page: string;
  updated_at: string;
  updated_by: string;
  workspace: string;
};

export type TDocumentPayload = {
  description_binary: string;
  description_html: string;
  description_json: object;
};

export type TWebhookConnectionQueryParams = {
  documentType: "project_page" | "team_page" | "workspace_page";
  projectId?: string;
  teamId?: string;
  workspaceSlug: string;
};
