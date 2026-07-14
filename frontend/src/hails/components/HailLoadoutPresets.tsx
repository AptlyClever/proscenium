import { useState, type ReactNode } from "react";
import type { EffectRegistryPayload, EffectTuningVariable } from "../../api";
import { defaultVariationForEffect } from "../hailEffectVariations";
import {
  patchEffectTuning,
  registryEntryForEffectId,
  selectEffectWithRegistryDefaults,
  selectVariationWithRegistryDefaults,
  tuningDefaultsForEffect,
  tuningVariablesForVisual,
} from "../hailEffectTuning";
import {
  displayEffectId,
  displayPaletteId,
  displaySizeTier,
  loadoutPaletteIds,
} from "../hailComposerLabels";
import type { HailVisualFields } from "../hailVisualContract";
import type { ComposerGlyphSpec } from "../hailGlyphComposer";
import { HailEffectFootprintPresets } from "./HailEffectFootprintPresets";
import { HailGlyphMotionPresets } from "./HailGlyphMotionPresets";
import { HailMessageSidekickPresets } from "./HailMessageSidekickPresets";
import { HailPriorityPresets } from "./HailPriorityPresets";
import type { MessageRegistryPayload } from "../../api";

type HailLoadoutPresetsProps = {
  visual: HailVisualFields;
  knownEffects: string[];
  knownPaletteIds: string[];
  knownSizeTiers: string[];
  effectRegistry?: EffectRegistryPayload | null;
  messageRegistry?: MessageRegistryPayload | null;
  /** Effect fine-tune sliders — Hail Forge only; off on Hails loadout (doctrine: hail-forge-v001). */
  effectCustomization?: boolean;
  /** Glyph motion — Forge glyph workspace only. */
  glyphMotion?: {
    spec: ComposerGlyphSpec;
    onSpecChange: (next: ComposerGlyphSpec) => void;
  };
  onVisualChange: (next: HailVisualFields) => void;
};

type LoadoutRowProps = {
  label: string;
  dimension: string;
  hint?: string;
  children: ReactNode;
};

function LoadoutRow({ label, dimension, hint, children }: LoadoutRowProps) {
  return (
    <div className="space-y-2" data-hail-loadout-row={dimension}>
      <div className="space-y-0.5">
        <p className="text-ca-2xs font-medium uppercase tracking-wide text-[color:var(--ca-text-muted)]">{label}</p>
        {hint ? <p className="text-ca-2xs text-[color:var(--ca-text-muted)]">{hint}</p> : null}
      </div>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </div>
  );
}

function chipClass(selected: boolean): string {
  return (
    "ca-focusable rounded-full border px-3 py-1.5 text-ca-xs font-medium transition " +
    (selected
      ? "border-[color:var(--ca-brand-600)] bg-[color:var(--ca-brand-600)]/10 text-[color:var(--ca-brand-600)]"
      : "border-[color:var(--ca-surface-border)] bg-[color:var(--ca-surface)] text-[color:var(--ca-text-secondary)] hover:border-[color:var(--ca-brand-600)]/40")
  );
}

function formatTuningValue(value: unknown, variable: EffectTuningVariable): string {
  if (variable.type === "enum") {
    return String(value ?? variable.default ?? "");
  }
  const num = Number(value);
  if (!Number.isFinite(num)) {
    return String(variable.default ?? "");
  }
  const step = Number(variable.step ?? 0.01);
  if (step >= 1) {
    return String(Math.round(num));
  }
  return num.toFixed(2).replace(/\.?0+$/, "");
}

function TuningControl({
  variable,
  value,
  onChange,
}: {
  variable: EffectTuningVariable;
  value: unknown;
  onChange: (next: unknown) => void;
}) {
  if (variable.type === "enum") {
    const options = variable.options ?? [];
    return (
      <select
        className="ca-focusable w-full rounded-md border border-[color:var(--ca-surface-border)] bg-[color:var(--ca-surface)] px-2 py-1.5 text-ca-xs text-[color:var(--ca-text-primary)]"
        value={String(value ?? variable.default ?? options[0] ?? "")}
        onChange={(e) => onChange(e.target.value)}
        data-hail-effect-tuning-control={variable.key}
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    );
  }

  const min = Number(variable.min ?? 0);
  const max = Number(variable.max ?? 1);
  const step = Number(variable.step ?? 0.05);
  const numeric = Number(value ?? variable.default ?? min);

  return (
    <div className="space-y-1">
      <input
        type="range"
        className="ca-focusable w-full accent-[color:var(--ca-brand-600)]"
        min={min}
        max={max}
        step={step}
        value={numeric}
        onChange={(e) => onChange(Number(e.target.value))}
        data-hail-effect-tuning-control={variable.key}
      />
      <p className="text-ca-2xs text-[color:var(--ca-text-muted)]" data-hail-effect-tuning-value={variable.key}>
        {formatTuningValue(numeric, variable)}
      </p>
    </div>
  );
}

export function HailLoadoutPresets({
  visual,
  knownEffects,
  knownPaletteIds,
  knownSizeTiers,
  effectRegistry = null,
  messageRegistry = null,
  effectCustomization = false,
  glyphMotion,
  onVisualChange,
}: HailLoadoutPresetsProps) {
  const [moreOpen, setMoreOpen] = useState(false);
  const [customizeOpen, setCustomizeOpen] = useState(false);
  const patch = (partial: Partial<HailVisualFields>) => onVisualChange({ ...visual, ...partial });
  const registryEntry = registryEntryForEffectId(effectRegistry, visual.effectId);
  const activeVariations = (registryEntry?.variations ?? []).filter((row) => row.status === "active");
  const resolvedVariationId =
    visual.effectVariationId || defaultVariationForEffect(effectRegistry, visual.effectId);
  const tuningVariables = tuningVariablesForVisual(effectRegistry, {
    ...visual,
    effectVariationId: resolvedVariationId,
  });
  const showCustomize = effectCustomization && tuningVariables.length > 0;
  const tuningDefaults = tuningDefaultsForEffect(effectRegistry, visual.effectId, resolvedVariationId);
  const colorPaletteIds = loadoutPaletteIds(knownPaletteIds);

  // Real fix, not a relabel: this used to expose all ten control categories
  // at once on a page whose own job description is "see how it looks, edit
  // when you're ready" -- a quick-glance tool, not a form wizard. Grouping
  // them into two labeled clusters (2026-07-13, first pass) didn't reduce
  // what's on screen, just labeled the same ten things. Core = the choices
  // that define what a Hail fundamentally looks/behaves like (Size, Glyph
  // color, Effect, Alert level). Everything else is fine-tuning of an
  // already-made choice (Variation and Effect footprint only refine the
  // chosen Effect; Message style/Opacity/Fade only refine how the message
  // appears) and now sits behind one "More options" disclosure, the same
  // pattern this file already used correctly for effect tuning sliders
  // (showCustomize below) -- extended to cover the rest instead of living
  // as a one-off.
  return (
    <section className="space-y-4" data-hail-loadout-presets>
      <LoadoutRow label="Size" dimension="size">
        {knownSizeTiers.map((tier) => (
          <button
            key={tier}
            type="button"
            className={chipClass(visual.scale === tier)}
            onClick={() => patch({ scale: tier })}
            data-hail-loadout-size={tier}
            data-hail-loadout-selected={visual.scale === tier ? "true" : "false"}
          >
            {displaySizeTier(tier)}
          </button>
        ))}
      </LoadoutRow>

      <LoadoutRow
        label="Glyph color"
        dimension="color"
        hint="Glyph color — icon and hero mark. Effects keep their designed colors until Effect Kit ships."
      >
        {colorPaletteIds.map((paletteId) => (
          <button
            key={paletteId}
            type="button"
            className={chipClass(visual.paletteId === paletteId)}
            onClick={() => patch({ paletteId })}
            data-hail-loadout-palette={paletteId}
            data-hail-loadout-selected={visual.paletteId === paletteId ? "true" : "false"}
          >
            {displayPaletteId(paletteId)}
          </button>
        ))}
      </LoadoutRow>

      <LoadoutRow label="Effect" dimension="effect">
        {knownEffects.map((effectId) => (
          <button
            key={effectId}
            type="button"
            className={chipClass(visual.effectId === effectId)}
            onClick={() => onVisualChange(selectEffectWithRegistryDefaults(visual, effectId, effectRegistry))}
            data-hail-loadout-effect={effectId}
            data-hail-loadout-selected={visual.effectId === effectId ? "true" : "false"}
          >
            {displayEffectId(effectId)}
          </button>
        ))}
      </LoadoutRow>

      <HailPriorityPresets visual={visual} onVisualChange={onVisualChange} />

      <div className="space-y-3 border-t border-[color:var(--ca-surface-border)] pt-3" data-hail-loadout-more>
        <button
          type="button"
          className="ca-focusable flex items-center gap-1.5 text-ca-xs font-medium text-[color:var(--ca-text-secondary)] hover:text-[color:var(--ca-text-primary)]"
          aria-expanded={moreOpen}
          onClick={() => setMoreOpen((open) => !open)}
          data-hail-loadout-more-toggle
        >
          <span aria-hidden className={`transition-transform ${moreOpen ? "rotate-90" : ""}`}>
            ▸
          </span>
          {moreOpen ? "Fewer options" : "More options"}
          {!moreOpen ? (
            <span className="text-ca-2xs text-[color:var(--ca-text-muted)]">
              (variation, footprint, message timing)
            </span>
          ) : null}
        </button>

        {moreOpen ? (
          <div className="space-y-4 pl-4" data-hail-loadout-more-body>
            {activeVariations.length > 0 ? (
              <LoadoutRow
                label="Variation"
                dimension="variation"
                hint="Transporter choreography and beam profile. Independent from Color."
              >
                {activeVariations.map((variation) => (
                  <button
                    key={variation.id}
                    type="button"
                    className={chipClass(resolvedVariationId === variation.id)}
                    onClick={() => onVisualChange(selectVariationWithRegistryDefaults(visual, variation.id, effectRegistry))}
                    data-hail-loadout-variation={variation.id}
                    data-hail-loadout-selected={resolvedVariationId === variation.id ? "true" : "false"}
                    title={variation.reference ?? undefined}
                  >
                    {variation.label}
                  </button>
                ))}
              </LoadoutRow>
            ) : null}

            <HailEffectFootprintPresets visual={visual} onVisualChange={onVisualChange} />

            <HailMessageSidekickPresets
              visual={visual}
              messageRegistry={messageRegistry}
              onVisualChange={onVisualChange}
            />

            {showCustomize ? (
              <div className="space-y-2" data-hail-loadout-customize>
                <button
                  type="button"
                  className="ca-focusable rounded-md border border-[color:var(--ca-surface-border)] px-3 py-1.5 text-ca-xs font-medium text-[color:var(--ca-text-primary)]"
                  aria-expanded={customizeOpen}
                  onClick={() => setCustomizeOpen((open) => !open)}
                  data-hail-loadout-customize-toggle
                >
                  {customizeOpen ? "Hide customize" : "Customize effect"}
                </button>
                {customizeOpen ? (
                  <div className="space-y-3 rounded-lg border border-[color:var(--ca-surface-border)] bg-[color:var(--ca-surface-inset)]/40 p-3">
                    {tuningVariables.map((variable) => (
                      <label
                        key={variable.key}
                        className="block space-y-1.5 text-ca-xs text-[color:var(--ca-text-secondary)]"
                        data-hail-effect-tuning-row={variable.key}
                      >
                        <span className="font-medium text-[color:var(--ca-text-primary)]">{variable.label}</span>
                        <TuningControl
                          variable={variable}
                          value={visual.effectTuning?.[variable.key] ?? tuningDefaults[variable.key]}
                          onChange={(next) => onVisualChange(patchEffectTuning(visual, variable.key, next))}
                        />
                      </label>
                    ))}
                  </div>
                ) : null}
              </div>
            ) : null}

            {glyphMotion ? (
              <HailGlyphMotionPresets spec={glyphMotion.spec} onSpecChange={glyphMotion.onSpecChange} />
            ) : null}
          </div>
        ) : null}
      </div>
    </section>
  );
}
