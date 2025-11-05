'use client';

import NextLink, { LinkProps } from 'next/link';
import { forwardRef } from 'react';
import type { AnchorHTMLAttributes, MouseEvent } from 'react';
import { usePathname } from 'next/navigation';
import { broadcastLoadingEvent } from '@/lib/ui-events';

type AppLinkProps = LinkProps &
  Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> & {
    loadingMessage?: string;
    enableGlobalLoading?: boolean;
  };

const AppLink = forwardRef<HTMLAnchorElement, AppLinkProps>(
  ({ loadingMessage, enableGlobalLoading = true, onClick, target, ...rest }, ref) => {
    const pathname = usePathname();

    const normalizePath = (value: string) => {
      const withoutQuery = value.split('?')[0];
      if (withoutQuery.length > 1 && withoutQuery.endsWith('/')) {
        return withoutQuery.slice(0, -1);
      }
      return withoutQuery;
    };

    const currentPath = pathname ? normalizePath(pathname) : null;

    const isSameRoute = () => {
      if (!currentPath) {
        return false;
      }

      if (typeof rest.href === 'string') {
        return normalizePath(rest.href) === currentPath;
      }

      if (typeof rest.href === 'object' && rest.href !== null) {
        const targetPath = 'pathname' in rest.href ? rest.href.pathname : undefined;
        if (typeof targetPath === 'string') {
          return normalizePath(targetPath) === currentPath;
        }
      }

      return false;
    };
    const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
      if (onClick) {
        onClick(event);
      }

      if (
        !enableGlobalLoading ||
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.altKey ||
        event.ctrlKey ||
        event.shiftKey ||
        (target && target !== '_self') ||
        isSameRoute()
      ) {
        return;
      }

      broadcastLoadingEvent({
        active: true,
        message: loadingMessage,
      });
    };

    return <NextLink {...rest} ref={ref} onClick={handleClick} target={target} />;
  }
);

AppLink.displayName = 'AppLink';

export default AppLink;
