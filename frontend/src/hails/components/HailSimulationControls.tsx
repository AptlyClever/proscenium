import type { RegistrySimulationState } from "../hailRegistryPreviewRenderer";
import { previewChipClass } from "./HailAuthoringPreviewControls";

type HailSimulationControlsProps = {
  simulation: RegistrySimulationState;
};

export function HailSimulationControls({ simulation }: HailSimulationControlsProps) {
  const { paused, pause, resume, holdFrame } = simulation;

  return (
    <div
      className="flex flex-wrap items-center gap-1.5"
      role="group"
      aria-label="Simulation"
      data-hail-simulation-controls
    >
      <span className="text-ca-2xs font-medium uppercase tracking-wide text-[color:var(--ca-text-muted)]">
        Simulation
      </span>
      {paused ? (
        <button
          type="button"
          className={previewChipClass(true)}
          onClick={resume}
          data-hail-simulation-resume
        >
          Resume
        </button>
      ) : (
        <button
          type="button"
          className={previewChipClass(false)}
          onClick={pause}
          data-hail-simulation-pause
        >
          Pause
        </button>
      )}
      <button
        type="button"
        className={previewChipClass(false)}
        onClick={() => holdFrame("ingress")}
        data-hail-simulation-hold="ingress"
      >
        Hold ingress
      </button>
      <button
        type="button"
        className={previewChipClass(false)}
        onClick={() => holdFrame("suspend")}
        data-hail-simulation-hold="suspend"
      >
        Hold suspend
      </button>
      <button
        type="button"
        className={previewChipClass(false)}
        onClick={() => holdFrame("egress")}
        data-hail-simulation-hold="egress"
      >
        Hold egress
      </button>
    </div>
  );
}
