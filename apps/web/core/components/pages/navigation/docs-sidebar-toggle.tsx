/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { ListTree } from "lucide-react";
import { observer } from "mobx-react";
// plane imports
import { IconButton } from "@plane/propel/icon-button";
// hooks
import { useProject } from "@/hooks/store/use-project";
// local imports
import { useDocsSidebar } from "./docs-sidebar-context";

export const DocsSidebarToggle = observer(function DocsSidebarToggle() {
  const sidebar = useDocsSidebar();
  const { currentProjectDetails } = useProject();
  // The sidebar is not rendered when the project has pages disabled, so neither is its toggle.
  if (!sidebar || currentProjectDetails?.page_view === false) return null;

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
});
