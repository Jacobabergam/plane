/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import type { Editor } from "@tiptap/core";
import type { MarkType } from "@tiptap/pm/model";
import { Plugin, PluginKey } from "@tiptap/pm/state";
// constants
import { CORE_EXTENSIONS } from "@/constants/extension";
// local imports
import { findLinkAnchor, followEditorLink } from "./link-navigation";

type ClickHandlerOptions = {
  type: MarkType;
  editor: Editor;
};

const hasModifiedClick = (event: MouseEvent): boolean =>
  event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0;

export function clickHandler(options: ClickHandlerOptions): Plugin {
  return new Plugin({
    key: new PluginKey("handleClickLink"),
    props: {
      handleClick: (view, _pos, event) => {
        if (hasModifiedClick(event)) return false;

        const anchor = findLinkAnchor(event.target, view.dom);
        if (!anchor) return false;

        const storage = options.editor.storage[CORE_EXTENSIONS.CUSTOM_LINK];
        // A touch long-press opens the edit tooltip and must not also navigate.
        if (storage?.consumeNextLinkClick) {
          storage.consumeNextLinkClick = false;
          event.preventDefault();
          return true;
        }

        const href = anchor.getAttribute("href");
        if (!href) return false;

        const result = followEditorLink({
          href,
          navigateInternalLink: storage?.navigateInternalLink,
        });
        if (result === "ignored") return false;

        event.preventDefault();
        return true;
      },
    },
  });
}
