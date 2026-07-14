import type { ComposerGlyphSpec } from "../hailGlyphComposer";
import { HailGlyphMotionPresets } from "./HailGlyphMotionPresets";

type HailGlyphCreatorPanelProps = {
  spec: ComposerGlyphSpec;
  onSpecChange: (next: ComposerGlyphSpec) => void;
  onReEncode: () => void;
  busy?: boolean;
};

/** Dialog-only glyph authoring helpers — Forge workspace uses preview chips + loadout motion instead. */
export function HailGlyphCreatorPanel({
  spec,
  onSpecChange,
  onReEncode,
  busy,
}: HailGlyphCreatorPanelProps) {
  return (
    <div className="space-y-4" data-hail-glyph-creator>
      <h4 className="text-ca-sm font-semibold text-[color:var(--ca-text-primary)]">Create Glyph</h4>
      <p className="text-ca-2xs text-[color:var(--ca-text-muted)]">
        Re-encode until the mark feels right. Size, color, effect, and motion loadout live beside the preview on the
        Forge page.
      </p>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="ca-focusable rounded-md border border-[color:var(--ca-brand-600)] px-3 py-1.5 text-ca-2xs text-[color:var(--ca-brand-600)] disabled:opacity-50"
          disabled={busy}
          onClick={onReEncode}
          data-hail-glyph-re-encode
        >
          Re-encode Glyph
        </button>
      </div>
      <HailGlyphMotionPresets spec={spec} onSpecChange={onSpecChange} />
    </div>
  );
}
