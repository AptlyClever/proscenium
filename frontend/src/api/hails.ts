import type { ProceduralGraph } from "../hails/hailProceduralGlyphs";
import { fetchJSON as j } from "./client";

export type {
  ComposerGlyphImageAsset,
  ComposerGlyphSpec,
} from "../hails/hailGlyphComposer";
import type { ComposerGlyphImageAsset, ComposerGlyphSpec } from "../hails/hailGlyphComposer";

export type EffectTuningVariable = {
  key: string;
  label: string;
  type: "range" | "enum";
  min?: number;
  max?: number;
  step?: number;
  default?: number | string;
  options?: string[];
};

export type EffectRegistryPreviewIdentity = {
  glyphResolveStyle?: string;
  fieldStyle?: string;
  particleStyle?: string;
  messageRevealStyle?: string;
  choreographyAnchors?: Record<string, number>;
  lifecycleTiming?: {
    entrance_animation_ms?: number;
    exit_animation_ms?: number;
  };
  stableResidual?: string;
};

export type EffectRegistryVariation = {
  id: string;
  label: string;
  status: string;
  default?: boolean;
  reference?: string;
  recommended_palette_id?: string;
  preview?: { module?: string; profile?: string };
  preview_identity?: EffectRegistryPreviewIdentity;
  tuning_variables: EffectTuningVariable[];
  tuning_defaults: Record<string, unknown>;
};

export type EffectRegistryEntry = {
  id: string;
  label: string;
  status: string;
  default?: boolean;
  default_variation_id?: string | null;
  variations?: EffectRegistryVariation[];
  capabilities: Record<string, string>;
  quality?: Record<string, string>;
  templates?: string[];
  tuning_variables: EffectTuningVariable[];
  tuning_defaults: Record<string, unknown>;
  preview_identity?: EffectRegistryPreviewIdentity;
};

export type EffectRegistryPayload = {
  default_effect_id: string;
  active_effect_ids: string[];
  entries: EffectRegistryEntry[];
};

export type MessageRegistrySpeedTier = {
  label: string;
  entrance_ms: number;
  exit_ms: number;
};

export type MessageRegistryEntry = {
  id: string;
  label: string;
  status: string;
  default?: boolean;
  identity?: Record<string, unknown>;
  tuning_variables: EffectTuningVariable[];
  tuning_defaults: Record<string, unknown>;
  capabilities?: Record<string, unknown>;
};

export type MessageRegistryPayload = {
  default_sidekick_id: string;
  speed_tiers: Record<string, MessageRegistrySpeedTier>;
  lifecycle_model?: Record<string, unknown>;
  entries: MessageRegistryEntry[];
};

export type HailsListPayload = {
  hails: Record<string, unknown>[];
  source: "domain" | "legacy-app-settings" | "seed";
  known_rooms: string[];
  known_glyphs: string[];
  known_categories: string[];
  known_effects?: string[];
  effect_registry?: EffectRegistryPayload;
  message_registry?: MessageRegistryPayload;
  known_size_tiers?: string[];
  known_palette_ids?: string[];
  known_placement_ids?: string[];
  render_contract?: Record<string, unknown>;
  glyph_registry?: Record<string, unknown>;
  glyph_catalog?: GlyphCatalogEntry[];
  custom_glyphs?: Record<string, unknown>[];
  effects_gallery?: Record<string, unknown>;
  effect_presets?: Record<string, unknown>[];
};

export type GlyphCatalogEntry = {
  glyph_id: string;
  label: string;
  status: string;
  category?: string;
  fallback_emoji?: string;
  semantic_intent?: string;
  description?: string;
};

export type HailDerivePreviewResponse = {
  render_payload: Record<string, unknown>;
  placement_summary: Record<string, unknown>;
  renderer_readiness: { status?: string; lines?: string[] };
  validation: {
    errors: { path?: string; message?: string }[];
    warnings: { path?: string; message?: string }[];
    valid: boolean;
  };
};

export function fetchHails() {
  return j<HailsListPayload>(fetch("/api/hails"));
}

export function deriveHailPreview(body: {
  hail_id?: string;
  record: Record<string, unknown>;
  custom_glyphs?: Record<string, unknown> | unknown[];
}) {
  return j<HailDerivePreviewResponse>(
    fetch("/api/hails/derive-preview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
  );
}

export function composerSeedGlyph(body: {
  glyph_name: string;
  hail_name?: string;
  seed?: number;
  scale?: string;
  palette_id?: string;
  effect_id?: string;
  glyph_family_id?: string;
  variation_only?: boolean;
  remix?: boolean;
  glyph_id?: string;
}) {
  return j<ComposerGlyphSpec>(
    fetch("/api/hails/composer/seed-glyph", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
  );
}

export function composerValidateGlyphHero(
  body: ComposerGlyphSpec & { peer_glyphs?: ComposerGlyphSpec[] },
) {
  return j<{ valid: boolean; errors: { path: string; message: string }[] }>(
    fetch("/api/hails/composer/validate-glyph-hero", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
  );
}

export function composerRegisterGlyph(body: ComposerGlyphSpec) {
  return j<ComposerGlyphSpec>(
    fetch("/api/hails/composer/register-glyph", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
  );
}

export type CustomGlyphPatchBody = {
  label?: string;
  archived?: boolean;
  visual?: Record<string, unknown>;
  animation_enabled?: boolean;
  speed_tier?: string;
  transition_style?: string;
  procedural_motif_id?: string;
  procedural_graph?: ProceduralGraph;
  representation_kind?: "procedural" | "image";
  image_asset?: ComposerGlyphImageAsset;
  fallback_emoji?: string;
  semantic_bucket?: string;
  glyph_family_id?: string;
  source?: string;
  seed?: number;
};

export function patchCustomGlyph(glyphId: string, body: CustomGlyphPatchBody) {
  return j<ComposerGlyphSpec>(
    fetch(`/api/hails/composer/custom-glyphs/${encodeURIComponent(glyphId)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
  );
}

export function registerEffectPreset(body: Record<string, unknown>) {
  return j<Record<string, unknown>>(
    fetch("/api/hails/composer/effect-presets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
  );
}

export function saveEffectPreset(presetId: string, body: Record<string, unknown>) {
  return j<Record<string, unknown>>(
    fetch(`/api/hails/composer/effect-presets/${encodeURIComponent(presetId)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
  );
}

export function deleteEffectPreset(presetId: string) {
  return j<{ deleted: string }>(
    fetch(`/api/hails/composer/effect-presets/${encodeURIComponent(presetId)}`, {
      method: "DELETE",
    }),
  );
}

export function resetEffectPreset(presetId: string) {
  return j<Record<string, unknown>>(
    fetch(`/api/hails/composer/effect-presets/${encodeURIComponent(presetId)}/reset`, {
      method: "POST",
    }),
  );
}

export type GlyphWorkbenchCandidateSlot = {
  candidate_id: string;
  status: string;
  asset_ref?: string | null;
  asset_kind?: string | null;
  source?: string | null;
  created_at?: string | null;
  notes?: string;
  preview_only?: boolean;
};

export type GlyphStagedPromotion = {
  glyph_id: string;
  brief_id: string;
  candidate_id: string;
  asset_ref: string;
  asset_kind?: string | null;
  source?: string | null;
  promoted_at: string;
  preview_url: string;
  notes?: string | null;
};

export type GlyphWorkbenchBrief = {
  brief_id: string;
  glyph_id: string;
  status: string;
  created_at?: string;
  source_registry_version?: string;
  registry_glyph_status?: string;
  generation_prompt?: string;
  negative_prompt?: string;
  visual_constraints?: Record<string, unknown>;
  target_surfaces?: string[];
  candidate_slots: GlyphWorkbenchCandidateSlot[];
  review_notes?: string;
  promotion_target?: GlyphStagedPromotion | null;
  archived?: boolean;
};

export type GlyphWorkbenchPayload = {
  summary: Record<string, unknown>;
  source: string;
  briefs: GlyphWorkbenchBrief[];
  staged_promotions?: Record<string, GlyphStagedPromotion>;
  registry_summary: Record<string, unknown>;
  registry_glyphs: Record<string, unknown>[];
  seed_validation_errors: string[];
  safety_notice: string;
};

export function fetchGlyphGenerationWorkbench() {
  return j<GlyphWorkbenchPayload>(fetch("/api/hails/glyph-generation-workbench"));
}

export type GlyphPlotFixtureSummary = {
  plot_id: string;
  glyph_id?: string;
  label?: string;
  subject_phrase?: string;
  proof_mode: boolean;
  generator_id?: string;
  path_count?: number;
  verify: {
    valid: boolean;
    heuristic_errors: string[];
    metric_errors: string[];
    longest_edge_dp: number;
    tv_path_count: number;
  };
};

export type GlyphPlotFixtureDetail = GlyphPlotFixtureSummary & {
  procedural_graph: Record<string, unknown>;
  reference_asset?: string | null;
  reference_url?: string | null;
  traced_svg?: string | null;
  recipe_id?: string | null;
  glyph_render_canonical?: Record<string, unknown> | null;
  glyph_render_tv?: Record<string, unknown> | null;
};

export type GlyphPlotFixturesPayload = {
  fixtures: GlyphPlotFixtureSummary[];
  plot_surface: string;
};

export function fetchGlyphPlotFixtures() {
  return j<GlyphPlotFixturesPayload>(fetch("/api/hails/glyph-plot/fixtures"));
}

export function fetchGlyphPlotFixture(plotId: string) {
  return j<GlyphPlotFixtureDetail>(fetch(`/api/hails/glyph-plot/fixtures/${encodeURIComponent(plotId)}`));
}

export function putGlyphPlotFixture(plotId: string, body: Record<string, unknown>) {
  return j<GlyphPlotFixtureDetail>(
    fetch(`/api/hails/glyph-plot/fixtures/${encodeURIComponent(plotId)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
  );
}

export function postGlyphPlotImportSvg(plotId: string, file: File, normalize = true) {
  const form = new FormData();
  form.append("file", file);
  form.append("normalize", normalize ? "true" : "false");
  return j<GlyphPlotFixtureDetail>(
    fetch(`/api/hails/glyph-plot/fixtures/${encodeURIComponent(plotId)}/import-svg`, {
      method: "POST",
      body: form,
    }),
  );
}

export function postGlyphPlotRetraceReference(plotId: string) {
  return j<GlyphPlotFixtureDetail>(
    fetch(`/api/hails/glyph-plot/fixtures/${encodeURIComponent(plotId)}/retrace-reference`, {
      method: "POST",
    }),
  );
}

export function promoteStagedGlyphAsset(body: {
  asset_ref: string;
  recipe_id: string;
  plot_id?: string;
}) {
  return j<{ plot_id: string; fixture: GlyphPlotFixtureDetail }>(
    fetch("/api/hails/glyph-generation-workbench/promote-staged-glyph", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
  );
}

export function createGlyphWorkbenchBrief(body: { glyph_id: string; brief_id?: string }) {
  return j<GlyphWorkbenchBrief>(
    fetch("/api/hails/glyph-generation-workbench/briefs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
  );
}

export function putGlyphWorkbenchBrief(briefId: string, body: GlyphWorkbenchBrief) {
  return j<GlyphWorkbenchBrief>(
    fetch(`/api/hails/glyph-generation-workbench/briefs/${encodeURIComponent(briefId)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
  );
}

export function archiveGlyphWorkbenchBrief(briefId: string) {
  return j<{ ok: boolean; brief: GlyphWorkbenchBrief }>(
    fetch(`/api/hails/glyph-generation-workbench/briefs/${encodeURIComponent(briefId)}/archive`, {
      method: "POST",
    }),
  );
}

export function putGlyphWorkbenchCandidate(
  briefId: string,
  candidateId: string,
  body: Partial<GlyphWorkbenchCandidateSlot>,
) {
  return j<GlyphWorkbenchBrief>(
    fetch(
      `/api/hails/glyph-generation-workbench/briefs/${encodeURIComponent(briefId)}/candidates/${encodeURIComponent(candidateId)}`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      },
    ),
  );
}

export function clearGlyphWorkbenchCandidate(briefId: string, candidateId: string) {
  return j<GlyphWorkbenchBrief>(
    fetch(
      `/api/hails/glyph-generation-workbench/briefs/${encodeURIComponent(briefId)}/candidates/${encodeURIComponent(candidateId)}/clear`,
      { method: "POST" },
    ),
  );
}

export function acceptGlyphWorkbenchCandidate(briefId: string, candidateId: string, notes?: string) {
  return j<GlyphWorkbenchBrief>(
    fetch(
      `/api/hails/glyph-generation-workbench/briefs/${encodeURIComponent(briefId)}/candidates/${encodeURIComponent(candidateId)}/accept`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(notes != null ? { notes } : {}),
      },
    ),
  );
}

export function rejectGlyphWorkbenchCandidate(briefId: string, candidateId: string, notes?: string) {
  return j<GlyphWorkbenchBrief>(
    fetch(
      `/api/hails/glyph-generation-workbench/briefs/${encodeURIComponent(briefId)}/candidates/${encodeURIComponent(candidateId)}/reject`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(notes != null ? { notes } : {}),
      },
    ),
  );
}

export function promoteGlyphWorkbenchCandidate(briefId: string, candidateId: string) {
  return j<{ brief: GlyphWorkbenchBrief; promotion: GlyphStagedPromotion }>(
    fetch(
      `/api/hails/glyph-generation-workbench/briefs/${encodeURIComponent(briefId)}/candidates/${encodeURIComponent(candidateId)}/promote`,
      { method: "POST" },
    ),
  );
}

export function postHail(body: Record<string, unknown>) {
  return j<Record<string, unknown>>(
    fetch("/api/hails", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
  );
}

export function putHail(hailId: string, body: Record<string, unknown>) {
  return j<Record<string, unknown>>(
    fetch(`/api/hails/${encodeURIComponent(hailId)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
  );
}

export function archiveHail(hailId: string) {
  return j<{ ok: boolean; hail: Record<string, unknown> }>(
    fetch(`/api/hails/${encodeURIComponent(hailId)}/archive`, { method: "POST" })
  );
}

export function restoreHail(hailId: string) {
  return j<{ ok: boolean; hail: Record<string, unknown> }>(
    fetch(`/api/hails/${encodeURIComponent(hailId)}/restore`, { method: "POST" })
  );
}

export function deleteHail(hailId: string) {
  return j<{ ok: boolean; deleted_id: string }>(
    fetch(`/api/hails/${encodeURIComponent(hailId)}`, { method: "DELETE" })
  );
}

export function sendHail(
  hailId: string,
  body: { delivery_target_id?: string; source?: string } = {},
) {
  return j<Record<string, unknown>>(
    fetch(`/api/hails/${encodeURIComponent(hailId)}/send`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
  );
}
