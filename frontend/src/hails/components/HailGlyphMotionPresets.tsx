import type { ReactNode } from "react";
import type { ComposerGlyphSpec } from "../hailGlyphComposer";

type HailGlyphMotionPresetsProps = {
  spec: ComposerGlyphSpec;
  onSpecChange: (next: ComposerGlyphSpec) => void;
};

function chipClass(selected: boolean): string {
  return (
    "ca-focusable rounded-full border px-3 py-1.5 text-ca-xs font-medium transition " +
    (selected
      ? "border-[color:var(--ca-brand-600)] bg-[color:var(--ca-brand-600)]/10 text-[color:var(--ca-brand-600)]"
      : "border-[color:var(--ca-surface-border)] bg-[color:var(--ca-surface)] text-[color:var(--ca-text-secondary)] hover:border-[color:var(--ca-brand-600)]/40")
  );
}

function MotionRow({ label, dimension, children }: { label: string; dimension: string; children: ReactNode }) {
  return (
    <div className="space-y-2" data-hail-loadout-row={dimension}>
      <p className="text-ca-2xs font-medium uppercase tracking-wide text-[color:var(--ca-text-muted)]">{label}</p>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </div>
  );
}

const SPEED_OPTIONS: Array<{ id: ComposerGlyphSpec["speed_tier"]; label: string }> = [
  { id: "slow", label: "Slow" },
  { id: "normal", label: "Normal" },
  { id: "fast", label: "Fast" },
];

const TRANSITION_OPTIONS: Array<{ id: ComposerGlyphSpec["transition_style"]; label: string }> = [
  { id: "fade", label: "Fade" },
  { id: "slide_up", label: "Slide up" },
  { id: "pulse", label: "Pulse" },
  { id: "beam", label: "Beam" },
];

/** Glyph motion tuning — lives in the loadout column beside preview (not preview chips). */
export function HailGlyphMotionPresets({ spec, onSpecChange }: HailGlyphMotionPresetsProps) {
  return (
    <div className="space-y-4 border-t border-[color:var(--ca-surface-border)] pt-4" data-hail-glyph-motion-presets>
      <p className="text-ca-2xs text-[color:var(--ca-text-muted)]">
        Motion applies to how this Glyph enters and loops in preview and delivery.
      </p>

      <MotionRow label="Animation" dimension="animation">
        <button
          type="button"
          className={chipClass(spec.animation_enabled !== false)}
          aria-pressed={spec.animation_enabled !== false}
          onClick={() => onSpecChange({ ...spec, animation_enabled: true })}
          data-hail-glyph-motion-animation="on"
        >
          On
        </button>
        <button
          type="button"
          className={chipClass(spec.animation_enabled === false)}
          aria-pressed={spec.animation_enabled === false}
          onClick={() => onSpecChange({ ...spec, animation_enabled: false })}
          data-hail-glyph-motion-animation="off"
        >
          Off
        </button>
      </MotionRow>

      <MotionRow label="Speed" dimension="speed">
        {SPEED_OPTIONS.map((option) => (
          <button
            key={option.id}
            type="button"
            className={chipClass(spec.speed_tier === option.id)}
            aria-pressed={spec.speed_tier === option.id}
            onClick={() => onSpecChange({ ...spec, speed_tier: option.id })}
            data-hail-glyph-motion-speed={option.id}
          >
            {option.label}
          </button>
        ))}
      </MotionRow>

      <MotionRow label="Transition" dimension="transition">
        {TRANSITION_OPTIONS.map((option) => (
          <button
            key={option.id}
            type="button"
            className={chipClass(spec.transition_style === option.id)}
            aria-pressed={spec.transition_style === option.id}
            onClick={() => onSpecChange({ ...spec, transition_style: option.id })}
            data-hail-glyph-motion-transition={option.id}
          >
            {option.label}
          </button>
        ))}
      </MotionRow>
    </div>
  );
}
