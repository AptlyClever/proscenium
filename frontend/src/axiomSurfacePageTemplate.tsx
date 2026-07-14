import type { ReactNode } from "react";
import { PageTemplate, createTemplateRegion } from "./components/PageTemplate";

export const SurfaceRegion = createTemplateRegion<string>();

export function AxiomSurfacePage({
  state,
  className,
  children,
}: {
  state: "ready" | "loading" | "load-error";
  className?: string;
  children: ReactNode;
}) {
  return (
    <PageTemplate className={className} templateId="proscenium.surface.v001" state={state}>
      {children}
    </PageTemplate>
  );
}
