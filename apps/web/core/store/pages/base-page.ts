/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { set } from "lodash-es";
import { action, computed, makeObservable, observable, reaction, runInAction } from "mobx";
// plane imports
import { EPageAccess } from "@plane/constants";
import type { TChangeHandlerProps } from "@plane/propel/emoji-icon-picker";
import type { TDocumentPayload, TLogoProps, TNameDescriptionLoader, TPage, TPageViewProps } from "@plane/types";
import { isAllowedPageParent } from "@plane/utils";
// plane web store
import { ExtendedBasePage } from "@/plane-web/store/pages/extended-base-page";
import type { RootStore } from "@/plane-web/store/root.store";
// local imports
import { PageEditorInstance } from "./page-editor-info";

export type TBasePage = TPage & {
  // observables
  isSubmitting: TNameDescriptionLoader;
  isSyncingWithServer: "syncing" | "synced" | "error";
  // computed
  asJSON: TPage | undefined;
  isCurrentUserOwner: boolean;
  // helpers
  oldName: string;
  setIsSubmitting: (value: TNameDescriptionLoader) => void;
  cleanup: () => void;
  // actions
  update: (pageData: Partial<TPage>) => Promise<Partial<TPage> | undefined>;
  updateTitle: (title: string) => void;
  updateDescription: (document: TDocumentPayload) => Promise<void>;
  makePublic: (params: { shouldSync?: boolean }) => Promise<void>;
  makePrivate: (params: { shouldSync?: boolean }) => Promise<void>;
  lock: (params: { shouldSync?: boolean; recursive?: boolean }) => Promise<void>;
  unlock: (params: { shouldSync?: boolean; recursive?: boolean }) => Promise<void>;
  archive: (params: { shouldSync?: boolean; archived_at?: string | null }) => Promise<void>;
  restore: (params: { shouldSync?: boolean }) => Promise<void>;
  updatePageLogo: (value: TChangeHandlerProps) => Promise<void>;
  setCoverImage: (coverImage: string | null) => Promise<void>;
  addToFavorites: () => Promise<void>;
  removePageFromFavorites: () => Promise<void>;
  duplicate: () => Promise<TPage | undefined>;
  updateParent: (parentId: string | null) => Promise<void>;
  mutateProperties: (data: Partial<TPage>, shouldUpdateName?: boolean) => void;
  setSyncingStatus: (status: "syncing" | "synced" | "error") => void;
  // sub-store
  editor: PageEditorInstance;
};

export type TBasePagePermissions = {
  canCurrentUserAccessPage: boolean;
  canCurrentUserEditPage: boolean;
  canCurrentUserDuplicatePage: boolean;
  canCurrentUserLockPage: boolean;
  canCurrentUserChangeAccess: boolean;
  canCurrentUserArchivePage: boolean;
  canCurrentUserDeletePage: boolean;
  canCurrentUserFavoritePage: boolean;
  canCurrentUserMovePage: boolean;
  isContentEditable: boolean;
};

export type TBasePageServices = {
  update: (payload: Partial<TPage>) => Promise<Partial<TPage>>;
  updateDescription: (document: TDocumentPayload) => Promise<void>;
  updateAccess: (payload: Pick<TPage, "access">) => Promise<void>;
  lock: () => Promise<void>;
  unlock: () => Promise<void>;
  archive: () => Promise<{
    archived_at: string;
  }>;
  restore: () => Promise<void>;
  duplicate: () => Promise<TPage>;
};

export type TPageInstance = TBasePage &
  TBasePagePermissions & {
    getRedirectionLink: () => string;
  };

export class BasePage extends ExtendedBasePage implements TBasePage {
  // loaders
  isSubmitting: TNameDescriptionLoader = "saved";
  isSyncingWithServer: "syncing" | "synced" | "error" = "syncing";
  // page properties
  id: string | undefined;
  name: string | undefined;
  logo_props: TLogoProps | undefined;
  view_props: TPageViewProps | undefined;
  description_json: object | undefined;
  description_html: string | undefined;
  color: string | undefined;
  label_ids: string[] | undefined;
  owned_by: string | undefined;
  parent: string | null;
  access: EPageAccess | undefined;
  is_favorite: boolean;
  is_locked: boolean;
  archived_at: string | null | undefined;
  workspace: string | undefined;
  project_ids?: string[] | undefined;
  created_by: string | undefined;
  updated_by: string | undefined;
  created_at: Date | undefined;
  updated_at: Date | undefined;
  deleted_at: Date | undefined;
  // helpers
  oldName: string = "";
  // services
  services: TBasePageServices;
  // reactions
  disposers: Array<() => void> = [];
  // root store
  rootStore: RootStore;
  // sub-store
  editor: PageEditorInstance;

  constructor(
    private store: RootStore,
    page: TPage,
    services: TBasePageServices
  ) {
    super(store, page, services);

    this.id = page?.id || undefined;
    this.name = page?.name;
    this.logo_props = page?.logo_props || undefined;
    this.view_props = page?.view_props || undefined;
    this.description_json = page?.description_json || undefined;
    this.description_html = page?.description_html || undefined;
    this.color = page?.color || undefined;
    this.label_ids = page?.label_ids || undefined;
    this.owned_by = page?.owned_by || undefined;
    this.parent = page?.parent || null;
    this.access = page?.access || EPageAccess.PUBLIC;
    this.is_favorite = page?.is_favorite || false;
    this.is_locked = page?.is_locked || false;
    this.archived_at = page?.archived_at || undefined;
    this.workspace = page?.workspace || undefined;
    this.project_ids = page?.project_ids || undefined;
    this.created_by = page?.created_by || undefined;
    this.updated_by = page?.updated_by || undefined;
    this.created_at = page?.created_at || undefined;
    this.updated_at = page?.updated_at || undefined;
    this.oldName = page?.name || "";
    this.deleted_at = page?.deleted_at || undefined;

    makeObservable(this, {
      // loaders
      isSubmitting: observable.ref,
      // page properties
      id: observable.ref,
      name: observable.ref,
      logo_props: observable.ref,
      view_props: observable.ref,
      description_json: observable.ref,
      description_html: observable.ref,
      color: observable.ref,
      label_ids: observable,
      owned_by: observable.ref,
      parent: observable.ref,
      access: observable.ref,
      is_favorite: observable.ref,
      is_locked: observable.ref,
      archived_at: observable.ref,
      workspace: observable.ref,
      project_ids: observable,
      created_by: observable.ref,
      updated_by: observable.ref,
      created_at: observable.ref,
      updated_at: observable.ref,
      deleted_at: observable.ref,
      isSyncingWithServer: observable.ref,
      // helpers
      oldName: observable.ref,
      setIsSubmitting: action,
      cleanup: action,
      // computed
      asJSON: computed,
      isCurrentUserOwner: computed,
      // actions
      update: action,
      updateTitle: action,
      updateDescription: action,
      makePublic: action,
      makePrivate: action,
      lock: action,
      unlock: action,
      archive: action,
      restore: action,
      updatePageLogo: action,
      setCoverImage: action,
      addToFavorites: action,
      removePageFromFavorites: action,
      duplicate: action,
      updateParent: action,
      mutateProperties: action,
    });

    // init
    this.services = services;
    this.rootStore = store;
    this.editor = new PageEditorInstance();

    const titleDisposer = reaction(
      () => this.name,
      (name) => {
        this.isSubmitting = "submitting";
        this.services
          .update({
            name,
          })
          .catch(() =>
            runInAction(() => {
              this.name = this.oldName;
            })
          )
          .finally(() =>
            runInAction(() => {
              this.isSubmitting = "submitted";
            })
          );
      },
      { delay: 2000 }
    );
    this.disposers.push(titleDisposer);
  }

  // computed
  get asJSON() {
    return {
      id: this.id,
      name: this.name,
      description_json: this.description_json,
      description_html: this.description_html,
      color: this.color,
      label_ids: this.label_ids,
      owned_by: this.owned_by,
      parent: this.parent,
      access: this.access,
      logo_props: this.logo_props,
      is_favorite: this.is_favorite,
      is_locked: this.is_locked,
      archived_at: this.archived_at,
      workspace: this.workspace,
      project_ids: this.project_ids,
      created_by: this.created_by,
      updated_by: this.updated_by,
      created_at: this.created_at,
      updated_at: this.updated_at,
      deleted_at: this.deleted_at,
      ...this.asJSONExtended,
    };
  }

  get isCurrentUserOwner() {
    const currentUserId = this.store.user.data?.id;
    if (!currentUserId) return false;
    return this.owned_by === currentUserId;
  }

  /**
   * @description update the submitting state
   * @param value
   */
  setIsSubmitting = (value: TNameDescriptionLoader) => {
    runInAction(() => {
      this.isSubmitting = value;
    });
  };

  cleanup = () => {
    this.disposers.forEach((disposer) => {
      disposer();
    });
  };

  /**
   * @description update the page
   * @param {Partial<TPage>} pageData
   */
  update = async (pageData: Partial<TPage>) => {
    const currentPage = this.asJSON;
    try {
      runInAction(() => {
        Object.keys(pageData).forEach((key) => {
          const currentPageKey = key as keyof TPage;
          // Keep `null` (e.g. `parent: null` for a top-level page) instead of turning it into undefined.
          set(this, key, pageData[currentPageKey] ?? null);
        });
      });

      // Send only the changed fields: the old snapshot would PATCH the previous values back.
      return await this.services.update(pageData);
    } catch (error) {
      runInAction(() => {
        Object.keys(pageData).forEach((key) => {
          const currentPageKey = key as keyof TPage;
          set(this, key, currentPage?.[currentPageKey] ?? null);
        });
      });
      throw error;
    }
  };

  /**
   * @description update the page title
   * @param title
   */
  updateTitle = (title: string) => {
    this.oldName = this.name ?? "";
    this.name = title;
  };

  /**
   * @description update the page description
   * @param {TDocumentPayload} document
   */
  updateDescription = async (document: TDocumentPayload) => {
    const currentDescription = this.description_html;
    runInAction(() => {
      this.description_html = document.description_html;
    });

    try {
      await this.services.updateDescription(document);
    } catch (error) {
      runInAction(() => {
        this.description_html = currentDescription;
      });
      throw error;
    }
  };

  /**
   * @description make the page public
   */
  makePublic = async ({ shouldSync = true }) => {
    const pageAccess = this.access;
    runInAction(() => {
      this.access = EPageAccess.PUBLIC;
    });

    if (shouldSync) {
      try {
        await this.services.updateAccess({
          access: EPageAccess.PUBLIC,
        });
      } catch (error) {
        runInAction(() => {
          this.access = pageAccess;
        });
        throw error;
      }
    }
  };

  /**
   * @description make the page private
   */
  makePrivate = async ({ shouldSync = true }) => {
    const pageAccess = this.access;
    runInAction(() => {
      this.access = EPageAccess.PRIVATE;
    });

    if (shouldSync) {
      try {
        await this.services.updateAccess({
          access: EPageAccess.PRIVATE,
        });
      } catch (error) {
        runInAction(() => {
          this.access = pageAccess;
        });
        throw error;
      }
    }
  };

  /**
   * @description lock the page
   */
  lock = async ({ shouldSync = true }) => {
    const pageIsLocked = this.is_locked;
    runInAction(() => (this.is_locked = true));

    if (shouldSync) {
      await this.services.lock().catch((error) => {
        runInAction(() => {
          this.is_locked = pageIsLocked;
        });
        throw error;
      });
    }
  };

  /**
   * @description unlock the page
   */
  unlock = async ({ shouldSync = true }) => {
    const pageIsLocked = this.is_locked;
    runInAction(() => (this.is_locked = false));

    if (shouldSync) {
      await this.services.unlock().catch((error) => {
        runInAction(() => {
          this.is_locked = pageIsLocked;
        });
        throw error;
      });
    }
  };

  /**
   * @description archive the page
   */
  archive = async ({ shouldSync = true, archived_at }: { shouldSync?: boolean; archived_at?: string | null }) => {
    if (!this.id) return undefined;

    try {
      runInAction(() => {
        this.archived_at = archived_at ?? new Date().toISOString();
      });

      if (this.rootStore.favorite.entityMap[this.id]) this.rootStore.favorite.removeFavoriteFromStore(this.id);

      if (shouldSync) {
        const response = await this.services.archive();
        runInAction(() => {
          this.archived_at = response.archived_at;
        });
      }

      // The API archives the whole subtree. Mirror that so children leave the tree with their parent.
      const archivedAt = this.archived_at;
      runInAction(() => {
        for (const page of this.getDescendantPages()) {
          page.archived_at = archivedAt;
        }
      });
    } catch (error) {
      console.error(error);
      runInAction(() => {
        this.archived_at = null;
      });
    }
  };

  /**
   * @description every page below this one in the store, archived ones included
   */
  private getDescendantPages = (): TBasePage[] => {
    const pages = Object.values(this.rootStore.projectPages.data ?? {});
    const descendants: TBasePage[] = [];
    const queue: (string | undefined)[] = [this.id];
    while (queue.length > 0) {
      const parentId = queue.shift();
      if (!parentId) continue;
      for (const page of pages) {
        if (page.parent === parentId && page.id && !descendants.includes(page)) {
          descendants.push(page);
          queue.push(page.id);
        }
      }
    }
    return descendants;
  };

  /**
   * @description restore the page
   */
  restore = async ({ shouldSync = true }: { shouldSync?: boolean }) => {
    const archivedAtBeforeRestore = this.archived_at;

    try {
      runInAction(() => {
        this.archived_at = null;
      });

      if (shouldSync) {
        await this.services.restore();
      }

      // The API restores the subtree and detaches the page when its parent stays archived.
      runInAction(() => {
        for (const page of this.getDescendantPages()) {
          page.archived_at = null;
        }
        const parentPage = this.parent ? this.rootStore.projectPages.getPageById(this.parent) : undefined;
        if (parentPage?.archived_at) this.parent = null;
      });
    } catch (error) {
      console.error(error);
      runInAction(() => {
        this.archived_at = archivedAtBeforeRestore;
      });
      throw error;
    }
  };

  updatePageLogo = async (value: TChangeHandlerProps) => {
    const originalLogoProps = { ...this.logo_props };
    try {
      let logoValue = {};
      if (value?.type === "emoji")
        logoValue = {
          value: value.value,
          url: undefined,
        };
      else if (value?.type === "icon") logoValue = value.value;

      const logoProps: TLogoProps = {
        in_use: value?.type,
        [value?.type]: logoValue,
      };

      runInAction(() => {
        this.logo_props = logoProps;
      });
      await this.services.update({
        logo_props: logoProps,
      });
    } catch (error) {
      console.error("Error in updating page logo", error);
      runInAction(() => {
        this.logo_props = originalLogoProps as TLogoProps;
      });
      throw error;
    }
  };

  /**
   * @description set or clear the page cover image. view_props is replaced whole by the API,
   * so the current value is merged in (full_width and any other key survive). Only view_props
   * is sent, so the description fields are never touched.
   * @param {string | null} coverImage asset URL or gallery image URL, null to remove
   */
  setCoverImage = async (coverImage: string | null) => {
    const originalViewProps = this.view_props;
    const viewProps: TPageViewProps = {
      ...originalViewProps,
      cover_image: coverImage,
    };
    runInAction(() => {
      this.view_props = viewProps;
    });
    try {
      await this.services.update({
        view_props: viewProps,
      });
    } catch (error) {
      console.error("Error in updating page cover image", error);
      runInAction(() => {
        this.view_props = originalViewProps;
      });
      throw error;
    }
  };

  /**
   * @description add the page to favorites
   */
  addToFavorites = async () => {
    const { workspaceSlug } = this.store.router;
    const projectId = this.project_ids?.[0] ?? null;
    if (!workspaceSlug || !this.id) return undefined;

    const pageIsFavorite = this.is_favorite;
    runInAction(() => {
      this.is_favorite = true;
    });
    await this.rootStore.favorite
      .addFavorite(workspaceSlug.toString(), {
        entity_type: "page",
        entity_identifier: this.id,
        project_id: projectId,
        entity_data: { name: this.name || "" },
      })
      .catch((error) => {
        runInAction(() => {
          this.is_favorite = pageIsFavorite;
        });
        throw error;
      });
  };

  /**
   * @description remove the page from favorites
   */
  removePageFromFavorites = async () => {
    const { workspaceSlug } = this.store.router;
    if (!workspaceSlug || !this.id) return undefined;

    const pageIsFavorite = this.is_favorite;
    runInAction(() => {
      this.is_favorite = false;
    });

    await this.rootStore.favorite.removeFavoriteEntity(workspaceSlug, this.id).catch((error) => {
      runInAction(() => {
        this.is_favorite = pageIsFavorite;
      });
      throw error;
    });
  };

  /**
   * @description duplicate the page
   */
  duplicate = async () => await this.services.duplicate();

  /**
   * @description move the page under another page, or to the top level with `null` (Move to…).
   * Refuses the page itself and its own sub-pages, so the tree cannot cycle. Reverts on a failed save.
   */
  updateParent = async (parentId: string | null) => {
    if (!this.id) return;
    const nextParent = parentId || null;
    const currentParent = this.parent || null;
    if (nextParent === currentParent) return;

    if (nextParent) {
      const pages = Object.values(this.rootStore.projectPages.data ?? {}).flatMap((page) =>
        page.id ? [{ id: page.id, parent: page.parent }] : []
      );
      if (!isAllowedPageParent(this.id, nextParent, pages)) {
        throw new Error("A page cannot be moved under itself or one of its sub-pages.");
      }
    }

    runInAction(() => {
      this.parent = nextParent;
    });
    try {
      await this.services.update({ parent: nextParent });
    } catch (error) {
      runInAction(() => {
        this.parent = currentParent;
      });
      throw error;
    }
  };

  /**
   * @description mutate multiple properties at once
   * @param data Partial<TPage>
   */
  mutateProperties = (data: Partial<TPage>, shouldUpdateName: boolean = true) => {
    Object.keys(data).forEach((key) => {
      const value = data[key as keyof TPage];
      if (key === "name" && !shouldUpdateName) return;
      set(this, key, value);
    });
  };

  setSyncingStatus = (status: "syncing" | "synced" | "error") => {
    runInAction(() => {
      this.isSyncingWithServer = status;
    });
  };
}
