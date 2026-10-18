/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
// plane imports
import { useLocalStorage } from "@plane/hooks";

const OPEN_STORAGE_KEY = "pages_docs_sidebar_open";
const WIDTH_STORAGE_KEY = "pages_docs_sidebar_width";

export const DOCS_SIDEBAR_DEFAULT_WIDTH = 260;
export const DOCS_SIDEBAR_MIN_WIDTH = 200;
export const DOCS_SIDEBAR_MAX_WIDTH = 420;

type DocsSidebarContextValue = {
  isDesktopOpen: boolean;
  setDesktopOpen: (open: boolean) => void;
  isMobile: boolean;
  isMobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
  width: number;
  setWidth: (width: number) => void;
};

const DocsSidebarContext = createContext<DocsSidebarContextValue | null>(null);

const clampWidth = (width: number) => Math.min(DOCS_SIDEBAR_MAX_WIDTH, Math.max(DOCS_SIDEBAR_MIN_WIDTH, width));

const useIsMobileWidth = () => {
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(max-width: 767px)").matches
  );

  useEffect(() => {
    const media = window.matchMedia("(max-width: 767px)");
    const onChange = () => setIsMobile(media.matches);
    onChange();
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  return isMobile;
};

export function DocsSidebarProvider(props: { children: ReactNode }) {
  const { children } = props;
  const { storedValue: storedOpen, setValue: setStoredOpen } = useLocalStorage(OPEN_STORAGE_KEY, true);
  const { storedValue: storedWidth, setValue: setStoredWidth } = useLocalStorage(
    WIDTH_STORAGE_KEY,
    DOCS_SIDEBAR_DEFAULT_WIDTH
  );
  const [isMobileOpen, setMobileOpen] = useState(false);
  const isMobile = useIsMobileWidth();

  useEffect(() => {
    if (!isMobile) setMobileOpen(false);
  }, [isMobile]);

  const value = useMemo<DocsSidebarContextValue>(
    () => ({
      isDesktopOpen: storedOpen ?? true,
      setDesktopOpen: setStoredOpen,
      isMobile,
      isMobileOpen,
      setMobileOpen,
      width: clampWidth(storedWidth ?? DOCS_SIDEBAR_DEFAULT_WIDTH),
      setWidth: (next) => setStoredWidth(clampWidth(next)),
    }),
    [isMobile, isMobileOpen, setStoredOpen, setStoredWidth, storedOpen, storedWidth]
  );

  return <DocsSidebarContext.Provider value={value}>{children}</DocsSidebarContext.Provider>;
}

export const useDocsSidebar = () => useContext(DocsSidebarContext);
