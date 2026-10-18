/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import type { ReactNode } from "react";
// components
import { AppHeader } from "@/components/core/app-header";
import { ContentWrapper } from "@/components/core/content-wrapper";
// local imports
import { DocsSidebar } from "./docs-sidebar";
import { DocsSidebarProvider } from "./docs-sidebar-context";

type TPagesSectionFrameProps = {
  children: ReactNode;
  header: ReactNode;
};

/**
 * Project pages sit beside the main project sidebar.
 * This frame adds the docs tree as a second left panel, then the page header and body.
 */
export function PagesSectionFrame(props: TPagesSectionFrameProps) {
  const { children, header } = props;

  return (
    <DocsSidebarProvider>
      <div className="flex h-full w-full overflow-hidden">
        <DocsSidebar />
        <div className="flex h-full min-w-0 flex-1 flex-col overflow-hidden">
          <AppHeader header={header} />
          <div className="min-h-0 flex-1">
            <ContentWrapper>{children}</ContentWrapper>
          </div>
        </div>
      </div>
    </DocsSidebarProvider>
  );
}
