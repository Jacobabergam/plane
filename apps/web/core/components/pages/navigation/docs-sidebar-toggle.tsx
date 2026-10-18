/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { ListTree } from "lucide-react";
// plane imports
import { IconButton } from "@plane/propel/icon-button";
// local imports
import { useDocsSidebar } from "./docs-sidebar-context";

export function DocsSidebarToggle() {
  const sidebar = useDocsSidebar();
  if (!sidebar) return null;

  const { isDesktopOpen, isMobile, isMobileOpen, setDesktopOpen, setMobileOpen } = sidebar;
  const isOpen = isMobile ? isMobileOpen : isDesktopOpen;

  return (
    <IconButton
      size="base"
      variant="ghost"
      icon={ListTree}
      aria-pressed={isOpen}
      aria-label={isOpen ? "Hide pages sidebar" : "Show pages sidebar"}
      onClick={() => {
        if (isMobile) setMobileOpen(!isMobileOpen);
        else setDesktopOpen(!isDesktopOpen);
      }}
    />
  );
}
