import type { ReactNode } from 'react';
import './EmptyState.css';

export interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  children?: ReactNode;
  action?: ReactNode;
}

/**
 * Empty state that teaches the interface rather than reporting absence. Muted
 * icon, strong title, supporting text, optional action.
 */
export function EmptyState({ icon, title, children, action }: EmptyStateProps) {
  return (
    <div className="wd-empty">
      {icon != null && (
        <div className="wd-empty__icon" aria-hidden="true">
          {icon}
        </div>
      )}
      <h3 className="wd-empty__title">{title}</h3>
      {children != null && <div className="wd-empty__body">{children}</div>}
      {action != null && <div className="wd-empty__action">{action}</div>}
    </div>
  );
}
