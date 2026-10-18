/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { Logo } from "@plane/propel/emoji-icon-picker";
import { PageIcon } from "@plane/propel/icons";
import type { TLogoProps } from "@plane/types";
import { cn } from "@plane/utils";

type TPageLogoProps = {
  className?: string;
  logo?: TLogoProps;
  size?: number;
};

export function PageLogo(props: TPageLogoProps) {
  const { className, logo, size = 16 } = props;

  if (logo?.in_use) return <Logo logo={logo} size={size} type="lucide" />;

  return <PageIcon className={cn("text-tertiary", className)} height={size} width={size} />;
}
