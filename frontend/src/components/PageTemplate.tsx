import type { ElementType, FC, ReactNode } from "react";

export function PageTemplate({
  templateId,
  state,
  className,
  children,
  ...rest
}: {
  templateId: string;
  state: string;
  className?: string;
  children: ReactNode;
} & Record<string, unknown>) {
  return (
    <div className={className} data-page-template-id={templateId} data-page-template-state={state} {...rest}>
      {children}
    </div>
  );
}

type RegionProps<T extends string> = {
  regionId: T;
  as?: ElementType;
  children?: ReactNode;
} & Record<string, unknown>;

export function createTemplateRegion<T extends string>(): FC<RegionProps<T>> {
  return function TemplateRegion({ regionId, as: Tag = "div", children, ...rest }) {
    return <Tag data-page-template-region={regionId} {...rest}>{children}</Tag>;
  };
}
