/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { Outlet } from "react-router";
// components
import { PagesSectionFrame } from "@/components/pages/navigation/pages-section-frame";
// local components
import { PagesListHeader } from "./header";

export default function ProjectPagesListLayout() {
  return (
    <PagesSectionFrame header={<PagesListHeader />}>
      <Outlet />
    </PagesSectionFrame>
  );
}
