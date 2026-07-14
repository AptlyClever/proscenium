import type { ReactNode } from "react";

export function RouteSurfaceHeader({
  fallbackTitle,
  fallbackLead,
  actions,
  regionId,
}: {
  hash: string;
  fallbackTitle: string;
  fallbackLead?: string;
  actions?: ReactNode;
  regionId?: string;
}) {
  return (
    <header
      className="flex flex-wrap items-start justify-between gap-3"
      data-page-template-region={regionId}
    >
      <div className="max-w-2xl space-y-2">
        <span className="ca-page-chip">{fallbackTitle}</span>
        {fallbackLead ? <p className="text-ca-sm text-[color:var(--ca-text-secondary)]">{fallbackLead}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </header>
  );
}
