/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import type { Editor } from "@tiptap/core";
import type { MarkType } from "@tiptap/pm/model";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import type { EditorView } from "@tiptap/pm/view";
// constants
import { CORE_EXTENSIONS } from "@/constants/extension";
// local imports
import { findLinkAnchor, followEditorLink, isNodeViewChrome } from "./link-navigation";

type ClickHandlerOptions = {
  type: MarkType;
  editor: Editor;
};

// Shift-click extends the text selection while editing, so it only means "new tab" on a read-only view.
const wantsNewTab = (view: EditorView, event: MouseEvent): boolean =>
  event.metaKey || event.ctrlKey || (!view.editable && event.shiftKey);

export function clickHandler(options: ClickHandlerOptions): Plugin {
  return new Plugin({
    key: new PluginKey("handleClickLink"),
    props: {
      // The DOM click event, not ProseMirror's handleClick (which fires on mouseup and cannot
      // cancel the anchor's native navigation). This also runs when the editor is not editable,
      // so locked and archived pages navigate in-app instead of reloading the document.
      handleDOMEvents: {
        click: (view, event) => {
          if (event.button !== 0) return false;
          // A drag-select that starts and ends inside one link also fires a click.
          if (view.editable && !view.dom.ownerDocument.getSelection()?.isCollapsed) return false;

          const anchor = findLinkAnchor(event.target, view.dom);
          if (!anchor) return false;

          const storage = options.editor.storage[CORE_EXTENSIONS.CUSTOM_LINK];
          // A touch long-press opens the edit tooltip and must not also navigate.
          if (storage?.consumeNextLinkClick) {
            storage.consumeNextLinkClick = false;
            event.preventDefault();
            return true;
          }

          // Anchors that are a node view's own chrome (user mentions, embeds) are not link marks.
          if (isNodeViewChrome(anchor)) return false;

          const href = anchor.getAttribute("href");
          if (!href) return false;

          if (wantsNewTab(view, event)) {
            let destination: URL;
            try {
              destination = new URL(href, window.location.href);
            } catch {
              return false;
            }
            if (destination.protocol !== "http:" && destination.protocol !== "https:") return false;
            window.open(destination.href, "_blank", "noopener,noreferrer");
            event.preventDefault();
            return true;
          }

          const result = followEditorLink({
            href,
            navigateInternalLink: storage?.navigateInternalLink,
          });
          if (result === "ignored") return false;

          event.preventDefault();
          return true;
        },
      },
    },
  });
}
