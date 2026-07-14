import { lazy, Suspense } from "react";
import type { HailRegistryAuthoringPreviewStackProps } from "../HailRegistryAuthoringPreviewStack";

const HailRegistryAuthoringPreviewStack = lazy(() =>
  import("../HailRegistryAuthoringPreviewStack").then((module) => ({
    default: module.HailRegistryAuthoringPreviewStack,
  })),
);

/** Defer paintbox chunk until Forge workspace mounts — avoids production bundle TDZ blank screens. */
export function HailForgeAuthoringPreviewStack(props: HailRegistryAuthoringPreviewStackProps) {
  return (
    <Suspense
      fallback={
        <div
          className="rounded-lg border border-dashed border-[color:var(--ca-surface-border)] bg-[color:var(--ca-surface-panel)]/40"
          style={{ width: "18rem", height: "16rem" }}
          data-hail-forge-preview-loading
        />
      }
    >
      <HailRegistryAuthoringPreviewStack {...props} />
    </Suspense>
  );
}
