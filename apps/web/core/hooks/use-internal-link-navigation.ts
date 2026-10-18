/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { useCallback } from "react";
// hooks
import { useAppRouter } from "@/hooks/use-app-router";

/**
 * Router callback for the rich text editor.
 * The editor package cannot import the app router, so the page passes this in.
 * `push` updates the current tab without a document reload.
 */
export const useInternalLinkNavigation = (): ((path: string) => void) => {
  const router = useAppRouter();

  return useCallback(
    (path: string) => {
      router.push(path);
    },
    [router]
  );
};
