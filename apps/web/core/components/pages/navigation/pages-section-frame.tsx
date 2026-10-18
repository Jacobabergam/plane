/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import type { ReactNode } from "react";
import { observer } from "mobx-react";
import { useParams } from "next/navigation";
// components
import { AppHeader } from "@/components/core/app-header";
import { ContentWrapper } from "@/components/core/content-wrapper";
// hooks
import { useProject } from "@/hooks/store/use-project";
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
export const PagesSectionFrame = observer(function PagesSectionFrame(props: TPagesSectionFrameProps) {
  const { children, header } = props;
  const { projectId } = useParams();
  const { currentProjectDetails } = useProject();
  // The sidebar fetches pages; skip it entirely when the project has pages disabled.
  const isPagesEnabled = currentProjectDetails?.page_view !== false;

  return (
    <DocsSidebarProvider>
      <div className="flex h-full w-full overflow-hidden">
        {isPagesEnabled && <DocsSidebar key={projectId?.toString()} />}
        <div className="flex h-full min-w-0 flex-1 flex-col overflow-hidden">
          <AppHeader header={header} />
          <div className="min-h-0 flex-1">
            <ContentWrapper>{children}</ContentWrapper>
          </div>
        </div>
      </div>
    </DocsSidebarProvider>
  );
});
