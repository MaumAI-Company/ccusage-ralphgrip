import type { ReactNode } from 'react';
import { Link } from '@/i18n/navigation';
import { UserMenu } from './UserMenu';
import { LocaleSwitcher } from './LocaleSwitcher';

interface AppHeaderProps {
  maxWidthClassName?: string;
  meta?: ReactNode;
  actions?: ReactNode;
}

export function AppHeader({
  maxWidthClassName = 'max-w-6xl',
  meta,
  actions,
}: AppHeaderProps) {
  return (
    <header className="app-header animate-fade-in">
      <div className={`app-header-inner ${maxWidthClassName}`}>
        <div className="flex items-center gap-3 min-w-0">
          <Link
            href="/"
            className="app-header-brand"
            aria-label="ccusage-worv dashboard"
          >
            <div className="app-header-brand-mark" aria-hidden="true">
              ◆
            </div>
            <div className="app-header-brand-text">
              <span className="app-header-brand-name">ccusage</span>
              <span className="app-header-brand-suffix">-worv</span>
            </div>
          </Link>

          {meta ? (
            <>
              <div className="app-header-divider" aria-hidden="true" />
              <div className="app-header-meta">{meta}</div>
            </>
          ) : null}
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {actions}
          <LocaleSwitcher />
          <UserMenu />
        </div>
      </div>
    </header>
  );
}

export function HeaderDivider() {
  return <div className="app-header-divider" aria-hidden="true" />;
}

export function HeaderLabel({ children }: { children: ReactNode }) {
  return <span className="app-header-label">{children}</span>;
}

interface HeaderLinkProps {
  href: string;
  children: ReactNode;
  active?: boolean;
}

export function HeaderLink({ href, children, active = false }: HeaderLinkProps) {
  if (active) {
    return (
      <span className="app-header-link app-header-link-active" aria-current="page">
        {children}
      </span>
    );
  }

  return (
    <Link href={href} className="app-header-link">
      {children}
    </Link>
  );
}
